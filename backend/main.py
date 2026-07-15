import os
import shutil
import uuid
import datetime
import httpx
import json
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
import socketio

from backend.config import GEMINI_API_KEY, APP_URL, UPLOAD_DIR
from backend.database import init_db, get_db, User, Meeting, Participant, Message, File, Recording, Attendance
from backend.auth import get_password_hash, verify_password, create_access_token, decode_access_token, get_current_user_id
from backend.sockets import sio

# Initialize Database
init_db()

app = FastAPI(title="Nexus Online Meeting Engine", version="1.0.0")

# Setup CORS middleware — allow configured APP_URL or all origins in dev
_allowed_origins = ["*"]
if APP_URL and not APP_URL.startswith("http://localhost"):
    _allowed_origins = [APP_URL, "http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for downloads
public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
os.makedirs(public_dir, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- Simple In-Memory Rate Limiter (no external dep required) ---
# Structure: { ip: [(timestamp, ...), ...] }
_rate_limit_store: dict[str, list[float]] = {}
_RATE_LIMIT_WINDOW = 60  # seconds
_RATE_LIMIT_MAX = 5      # max attempts per window

def _check_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = datetime.datetime.utcnow().timestamp()
    # Purge old entries
    history = [t for t in _rate_limit_store.get(ip, []) if now - t < _RATE_LIMIT_WINDOW]
    if len(history) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Please wait {_RATE_LIMIT_WINDOW} seconds.",
            headers={"Retry-After": str(_RATE_LIMIT_WINDOW)},
        )
    history.append(now)
    _rate_limit_store[ip] = history

# --- JWT Authentication Endpoints ---

@app.post("/api/register")
def register(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    fullName: str = Form(...),
    avatarColor: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    _check_rate_limit(request)
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=email,
        password_hash=get_password_hash(password),
        full_name=fullName,
        avatar_color=avatarColor or "from-indigo-500 to-cyan-400"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
    return {"token": token, "user": {"id": user.id, "email": user.email, "fullName": user.full_name, "avatarColor": user.avatar_color}}

@app.post("/api/login")
def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    _check_rate_limit(request)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
    return {"token": token, "user": {"id": user.id, "email": user.email, "fullName": user.full_name, "avatarColor": user.avatar_color}}

@app.post("/api/refresh")
def refresh_token(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Issue a fresh JWT token. The old token must still be valid to call this."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
    return {"token": new_token}

# --- Core Meeting REST APIs ---

@app.post("/api/createMeeting")
def create_meeting(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # Generate a random room code like nex-794-slv
    import random
    room_code = "nex-" + str(random.randint(100, 999)) + "-" + "".join(random.choices("abcdefghijklmnopqrstuvwxyz", k=3))
    
    meeting = Meeting(
        id=room_code,
        host_id=user_id,
        is_locked=False,
        is_waiting_room_enabled=True,
        is_active=True,
        created_at=datetime.datetime.utcnow()
    )
    db.add(meeting)
    db.commit()
    
    return {"roomCode": room_code}

@app.post("/api/joinMeeting")
def join_meeting(roomCode: str = Form(...), displayName: str = Form(...), userId: Optional[str] = Form(None), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == roomCode, Meeting.is_active == True).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found or already ended")
    
    if meeting.is_locked:
        raise HTTPException(status_code=403, detail="This meeting has been locked by the host")

    # Generate a meeting-scoped token
    payload = {
        "sub": userId or str(uuid.uuid4()),
        "name": displayName,
        "roomCode": roomCode,
        "role": "Organizer" if userId == meeting.host_id else "Participant"
    }
    token = create_access_token(payload)
    return {"token": token, "roomCode": roomCode, "role": payload["role"]}

@app.post("/api/leaveMeeting")
def leave_meeting(roomCode: str = Form(...), connectionId: str = Form(...), db: Session = Depends(get_db)):
    # Record client leave in participant table and attendance table
    participant = db.query(Participant).filter(Participant.id == connectionId, Participant.meeting_id == roomCode).first()
    if participant:
        participant.left_at = datetime.datetime.utcnow()
        
        # Update attendance duration
        attendance = db.query(Attendance).filter(
            Attendance.meeting_id == roomCode,
            Attendance.name == participant.name,
            Attendance.left_at.is_(None)
        ).first()
        if attendance:
            attendance.left_at = datetime.datetime.utcnow()
            delta = attendance.left_at - attendance.joined_at
            attendance.duration_seconds = int(delta.total_seconds())
        
        db.commit()
    return {"status": "ok"}

@app.post("/api/endMeeting")
def end_meeting(roomCode: str = Form(...), user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == roomCode).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only host can end the meeting")
        
    meeting.is_active = False
    meeting.ended_at = datetime.datetime.utcnow()
    
    # Mark all active participants as left
    db.query(Participant).filter(Participant.meeting_id == roomCode, Participant.left_at.is_(None)).update({"left_at": datetime.datetime.utcnow()})
    db.commit()
    
    return {"status": "ok"}

@app.get("/api/participants")
def get_participants(roomCode: str, db: Session = Depends(get_db)):
    active = db.query(Participant).filter(Participant.meeting_id == roomCode, Participant.left_at.is_(None)).all()
    return [{"id": p.id, "name": p.name, "role": p.role, "isMuted": p.is_muted, "isVideoOff": p.is_camera_off} for p in active]

@app.post("/api/mute")
def update_mute(roomCode: str = Form(...), connectionId: str = Form(...), isMuted: bool = Form(...), db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == connectionId, Participant.meeting_id == roomCode).first()
    if participant:
        participant.is_muted = isMuted
        db.commit()
    return {"status": "ok"}

@app.post("/api/camera")
def update_camera(roomCode: str = Form(...), connectionId: str = Form(...), isVideoOff: bool = Form(...), db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == connectionId, Participant.meeting_id == roomCode).first()
    if participant:
        participant.is_camera_off = isVideoOff
        db.commit()
    return {"status": "ok"}

@app.post("/api/chat")
def post_chat(roomCode: str = Form(...), senderName: str = Form(...), text: str = Form(...), db: Session = Depends(get_db)):
    msg = Message(
        meeting_id=roomCode,
        sender_id="api",
        sender_name=senderName,
        text=text,
        time=datetime.datetime.utcnow().strftime("%H:%M")
    )
    db.add(msg)
    db.commit()
    return {"status": "ok"}

@app.post("/api/recording")
def update_recording(roomCode: str = Form(...), action: str = Form(...)):
    # Actions: start, pause, stop. Real sync managed over WebSockets, but we support endpoint too.
    return {"status": "ok", "action": action}

# --- File Sharing & Upload API ---

@app.post("/api/upload")
async def upload_file(
    roomCode: str = Form(...),
    senderName: str = Form(...),
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db)
):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    filename = f"{roomCode}_{file_id}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    size_in_mb = os.path.getsize(dest_path) / (1024 * 1024)
    size_str = f"{size_in_mb:.2f} MB" if size_in_mb >= 0.1 else f"{size_in_mb*1024:.1f} KB"
    
    file_url = f"/static/uploads/{filename}"
    
    db_file = File(
        meeting_id=roomCode,
        name=file.filename,
        size=size_str,
        sender_name=senderName,
        file_url=file_url
    )
    db.add(db_file)
    db.commit()
    
    # Notify room via Socket.IO
    await sio.emit("file-shared-broadcast", {
        "name": file.filename,
        "size": size_str,
        "sender": senderName,
        "time": datetime.datetime.utcnow().strftime("%H:%M"),
        "url": file_url
    }, room=roomCode)
    
    return {"status": "ok", "url": file_url, "name": file.filename, "size": size_str}

# --- Client-Side Composite Recording Upload API ---

@app.post("/api/recording/upload")
async def upload_recording(
    roomCode: str = Form(...),
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db)
):
    rec_id = str(uuid.uuid4())
    filename = f"rec_{roomCode}_{rec_id}.webm"
    dest_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_url = f"/static/uploads/{filename}"
    
    # Store recording log
    db_rec = Recording(
        meeting_id=roomCode,
        file_path=file_url
    )
    db.add(db_rec)
    db.commit()
    
    return {"status": "ok", "url": file_url, "recordingId": db_rec.id}

# --- Gemini AI Live Translation API ---

@app.post("/api/translate")
async def translate_text(
    text: str = Form(...),
    target_lang: str = Form(...)  # e.g., "ja", "es", "de", "hi", "en"
):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "MY_GEMINI_API_KEY":
        # Fallback local dictionary if API Key is not set
        return {"translatedText": f"[Translated to {target_lang}]: {text}"}
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    prompt = f"Translate the following text into language code '{target_lang}' (ja=Japanese, es=Spanish, de=German, hi=Hindi, en=English). Return ONLY the translated sentence, without comments or surrounding quotes.\n\nText: {text}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=10.0)
            if res.status_code == 200:
                result = res.json()
                translated = result['candidates'][0]['content']['parts'][0]['text'].strip()
                return {"translatedText": translated}
            else:
                return {"translatedText": f"[Translation error]: {text}"}
    except Exception as e:
        return {"translatedText": f"[Network error]: {text}"}

# --- Gemini AI Meeting Summary & Action Items API ---

@app.post("/api/ai/summary")
async def generate_summary(
    roomCode: str = Form(...),
    db: Session = Depends(get_db)
):
    # Fetch all messages in the room
    msgs = db.query(Message).filter(Message.meeting_id == roomCode).order_by(Message.created_at.asc()).all()
    
    # Fetch transcript snippets (if saved, or compile from messages)
    transcript_text = "\n".join([f"{m.sender_name}: {m.text}" for m in msgs])
    
    if not transcript_text.strip():
        return {
            "summary": "No meeting transcript available to analyze.",
            "actionItems": [],
            "decisions": []
        }
        
    if not GEMINI_API_KEY or GEMINI_API_KEY == "MY_GEMINI_API_KEY":
        # Return fallback mockup values
        return {
            "summary": f"This meeting (Room: {roomCode}) covered structural layout items. (Gemini key not configured)",
            "actionItems": [
                {"text": "Optimize WebRTC connections locally.", "assignee": "Tech Lead"},
                {"text": "Update database migrations.", "assignee": "Architect"}
            ],
            "decisions": [
                {"text": "Selected standard WebRTC peer-to-peer mesh configuration."}
            ]
        }
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    prompt = (
        "Analyze the following meeting transcript. Provide a summary of the meeting, "
        "a JSON list of key decisions, and a JSON list of action items with their suggested assignee.\n"
        "Return the response in JSON format matching this schema:\n"
        '{"summary": "text", "actionItems": [{"text": "action desc", "assignee": "name"}], "decisions": [{"text": "decision desc"}]}\n\n'
        f"Transcript:\n{transcript_text}"
    )
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=20.0)
            if res.status_code == 200:
                import json
                result = res.json()
                raw_json = result['candidates'][0]['content']['parts'][0]['text'].strip()
                ai_data = json.loads(raw_json)
                
                # If there's a recording entry, write it there
                rec = db.query(Recording).filter(Recording.meeting_id == roomCode).order_by(Recording.created_at.desc()).first()
                if rec:
                    rec.summary = ai_data.get("summary", "")
                    rec.action_items = json.dumps(ai_data.get("actionItems", []))
                    db.commit()
                    
                return ai_data
            else:
                raise HTTPException(status_code=500, detail="Gemini API returned error code")
    except Exception as e:
        print("Summary gen error:", e)
        raise HTTPException(status_code=500, detail=str(e))

# --- Meeting History API ---

@app.get("/api/meetings/history")
def get_meeting_history(
    limit: int = 20,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Return paginated list of meetings the authenticated user hosted or attended."""
    # Meetings hosted by user
    hosted = db.query(Meeting).filter(Meeting.host_id == user_id).all()
    hosted_ids = {m.id for m in hosted}

    # Meetings attended (from attendance log)
    attended_records = db.query(Attendance).filter(Attendance.user_id == user_id).all()
    attended_ids = {a.meeting_id for a in attended_records}

    all_meeting_ids = hosted_ids | attended_ids

    meetings_qs = (
        db.query(Meeting)
        .filter(Meeting.id.in_(all_meeting_ids))
        .order_by(Meeting.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    total_duration = 0
    total_participants = 0

    for m in meetings_qs:
        # Participant count
        pcount = db.query(Participant).filter(Participant.meeting_id == m.id).count()

        # Duration
        duration_secs = 0
        if m.ended_at and m.created_at:
            duration_secs = int((m.ended_at - m.created_at).total_seconds())
        elif m.is_active and m.created_at:
            duration_secs = int((datetime.datetime.utcnow() - m.created_at).total_seconds())

        total_duration += duration_secs
        total_participants += pcount

        result.append({
            "id": m.id,
            "host_id": m.host_id,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "ended_at": m.ended_at.isoformat() if m.ended_at else None,
            "is_active": m.is_active,
            "participant_count": pcount,
            "duration_seconds": duration_secs,
        })

    total_count = len(all_meeting_ids)
    avg_participants = round(total_participants / len(result), 1) if result else 0
    active_count = sum(1 for r in result if r["is_active"])

    return {
        "meetings": result,
        "total": total_count,
        "total_duration": total_duration,
        "avg_participants": avg_participants,
        "active_count": active_count,
    }


# --- User Profile API ---

@app.get("/api/user/profile")
def get_user_profile(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "avatarColor": user.avatar_color,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }


class ProfileUpdate(BaseModel):
    fullName: Optional[str] = None
    avatarColor: Optional[str] = None


@app.patch("/api/user/profile")
def update_user_profile(
    body: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.fullName is not None:
        user.full_name = body.fullName
    if body.avatarColor is not None:
        user.avatar_color = body.avatarColor

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "avatarColor": user.avatar_color,
    }


# --- Nexus Memory™ Search API ---

class MemorySearchRequest(BaseModel):
    query: str
    userId: Optional[str] = None


@app.post("/api/memory/search")
async def memory_search(
    body: MemorySearchRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Semantic search over the authenticated user's meeting messages using Gemini.
    Returns ranked results with an AI-generated summary.
    """
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # 1. Gather all messages from meetings the user attended / hosted
    hosted_ids = {m.id for m in db.query(Meeting).filter(Meeting.host_id == user_id).all()}
    attended_ids = {
        a.meeting_id
        for a in db.query(Attendance).filter(Attendance.user_id == user_id).all()
    }
    all_meeting_ids = list(hosted_ids | attended_ids)

    if not all_meeting_ids:
        return {"results": [], "summary": "You have no meeting history to search."}

    messages = (
        db.query(Message)
        .filter(Message.meeting_id.in_(all_meeting_ids))
        .order_by(Message.created_at.desc())
        .limit(200)
        .all()
    )

    if not messages:
        return {"results": [], "summary": "No meeting messages found in your history."}

    # 2. Build transcript for Gemini context
    transcript_lines = [
        f"[{m.meeting_id}|{m.created_at.isoformat() if m.created_at else ''}] {m.sender_name}: {m.text}"
        for m in messages
    ]
    transcript_text = "\n".join(transcript_lines)

    # 3. If no Gemini key, do simple keyword fallback
    if not GEMINI_API_KEY or GEMINI_API_KEY in ("MY_GEMINI_API_KEY", "your-gemini-api-key-here"):
        keyword = query.lower()
        matched = [
            m for m in messages
            if keyword in m.text.lower() or keyword in m.sender_name.lower()
        ][:10]
        results = [
            {
                "meeting_id": m.meeting_id,
                "timestamp": m.created_at.isoformat() if m.created_at else "",
                "content": m.text,
                "speaker": m.sender_name,
                "relevance": 0.7,
            }
            for m in matched
        ]
        summary = (
            f"Found {len(results)} message(s) containing '{query}'."
            if results
            else f"No messages matched '{query}'. (Gemini API key not configured for semantic search)"
        )
        return {"results": results, "summary": summary}

    # 4. Call Gemini for semantic ranking
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    prompt = (
        f"You are a meeting intelligence assistant. Given the user query and their meeting transcript below, "
        f"identify the most relevant messages and return a JSON response.\n\n"
        f"Query: \"{query}\"\n\n"
        f"Transcript (format: [meeting_id|timestamp] speaker: message):\n{transcript_text[:8000]}\n\n"
        f"Return JSON matching this schema exactly:\n"
        f'{{"summary": "1-2 sentence answer to the query", "results": [{{"meeting_id": "str", "timestamp": "ISO string", "content": "exact message text", "speaker": "name", "relevance": 0.0-1.0}}]}}\n'
        f"Include up to 8 most relevant results sorted by relevance descending."
    )

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                gemini_url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"},
                },
                timeout=20.0,
            )
            if res.status_code == 200:
                data = res.json()
                raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                parsed = json.loads(raw)
                return {
                    "results": parsed.get("results", []),
                    "summary": parsed.get("summary", ""),
                }
            else:
                raise HTTPException(status_code=500, detail="Gemini API error")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse Gemini response")
    except Exception as e:
        print("Memory search error:", e)
        raise HTTPException(status_code=500, detail=str(e))


# Mount Socket.IO as ASGI app inside FastAPI
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
app.mount("/", asgi_app) # Route root / to socketio app which falls back to fastapi
