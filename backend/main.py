import os
import shutil
import uuid
import datetime
import httpx
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import socketio

from backend.config import GEMINI_API_KEY, APP_URL, UPLOAD_DIR
from backend.database import init_db, get_db, User, Meeting, Participant, Message, File, Recording, Attendance
from backend.auth import get_password_hash, verify_password, create_access_token, decode_access_token, get_current_user_id
from backend.sockets import sio

# Initialize Database
init_db()

app = FastAPI(title="Nexus Online Meeting Engine", version="1.0.0")

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for downloads
public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
os.makedirs(public_dir, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- JWT Authentication Endpoints ---

@app.post("/api/register")
def register(email: str = Form(...), password: str = Form(...), fullName: str = Form(...), avatarColor: Optional[str] = Form(None), db: Session = Depends(get_db)):
    # Check if user already exists
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
    
    # Generate token
    token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
    return {"token": token, "user": {"id": user.id, "email": user.email, "fullName": user.full_name, "avatarColor": user.avatar_color}}

@app.post("/api/login")
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
    return {"token": token, "user": {"id": user.id, "email": user.email, "fullName": user.full_name, "avatarColor": user.avatar_color}}

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

# Mount Socket.IO as ASGI app inside FastAPI
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
app.mount("/", asgi_app) # Route root / to socketio app which falls back to fastapi
