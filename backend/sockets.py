import socketio
import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal, Participant, Meeting, Message, Attendance, File, User
from backend.config import GEMINI_API_KEY
import os

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# In-memory session store for runtime sockets and meeting room configs
# room_states structure:
# {
#   room_code: {
#       "lockMeeting": bool,
#       "waitingRoomEnabled": bool,
#       "allowChat": bool,
#       "allowScreenShare": bool,
#       "allowMic": bool,
#       "allowCamera": bool,
#       "notes": str,
#       "whiteboard": list,
#       "waitlist": list (socket_ids awaiting host approval),
#   }
# }
room_states = {}

def get_db():
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        print("Database session error in socket event:", e)
        return None

@sio.event
async def connect(sid, environ, auth=None):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    db = get_db()
    if not db:
        return

    try:
        # Find participant matching socket id
        participant = db.query(Participant).filter(Participant.id == sid, Participant.left_at.is_(None)).first()
        if participant:
            room_code = participant.meeting_id
            participant.left_at = datetime.datetime.utcnow()
            
            # Update attendance duration
            attendance = db.query(Attendance).filter(
                Attendance.meeting_id == room_code,
                Attendance.name == participant.name,
                Attendance.left_at.is_(None)
            ).first()
            if attendance:
                attendance.left_at = datetime.datetime.utcnow()
                delta = attendance.left_at - attendance.joined_at
                attendance.duration_seconds = int(delta.total_seconds())

            db.commit()
            
            # Leave socket room
            await sio.leave_room(sid, room_code)
            
            # Broadcast to other participants in room
            await sio.emit("participant-left", {"sid": sid, "id": participant.user_id or sid, "name": participant.name}, room=room_code)
            print(f"Participant {participant.name} left room {room_code}")
    except Exception as e:
        print("Error on disconnect handler:", e)
        db.rollback()
    finally:
        db.close()

@sio.event
async def join_room(sid, data):
    room_code = data.get("roomCode")
    user_name = data.get("userName", "Guest")
    user_id = data.get("userId")
    role = data.get("role", "Participant")
    is_muted = data.get("isMuted", False)
    is_camera_off = data.get("isVideoOff", False)
    
    if not room_code:
        await sio.emit("error", {"message": "Meeting room code required"}, to=sid)
        return

    db = get_db()
    if not db:
        await sio.emit("error", {"message": "Database access error"}, to=sid)
        return

    try:
        # Check if meeting exists and is active
        meeting = db.query(Meeting).filter(Meeting.id == room_code, Meeting.is_active == True).first()
        if not meeting:
            # If meeting doesn't exist, let's create a new active meeting with host_id
            meeting = Meeting(
                id=room_code,
                host_id=user_id,
                is_locked=False,
                is_waiting_room_enabled=True if role != "Organizer" else False,
                is_active=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(meeting)
            db.commit()

        # Initialize room state in memory if needed
        if room_code not in room_states:
            room_states[room_code] = {
                "lockMeeting": meeting.is_locked,
                "waitingRoomEnabled": meeting.is_waiting_room_enabled,
                "allowChat": True,
                "allowScreenShare": True,
                "allowMic": True,
                "allowCamera": True,
                "notes": "# Live Collaborative Notes\n- Add notes here...",
                "whiteboard": [],
                "waitlist": []
            }

        state = room_states[room_code]

        # Enforce Lock Meeting (unless Organizer/Host joins)
        if state["lockMeeting"] and role != "Organizer" and role != "Co-Host":
            await sio.emit("join-rejected", {"reason": "The meeting room has been locked by the host."}, to=sid)
            return

        # Enforce Waiting Room (unless Organizer/Host joins)
        if state["waitingRoomEnabled"] and role != "Organizer" and role != "Co-Host":
            # Add to waitlist
            state["waitlist"].append({
                "sid": sid,
                "userId": user_id,
                "userName": user_name,
                "isMuted": is_muted,
                "isVideoOff": is_camera_off
            })
            # Find the host's socket ID in room
            # Emit join request to host(s) in room
            await sio.emit("join-request", {"sid": sid, "name": user_name}, room=room_code)
            await sio.emit("waiting-room-status", {"status": "waiting"}, to=sid)
            return

        # Actually join the meeting
        await proceed_join(sid, room_code, user_name, user_id, role, is_muted, is_camera_off, db)
    except Exception as e:
        print("Error on join_room handler:", e)
        db.rollback()
    finally:
        db.close()

async def proceed_join(sid, room_code, user_name, user_id, role, is_muted, is_camera_off, db: Session):
    # Store participant record in db
    # Delete older inactive participant session with same sid or user_id
    db.query(Participant).filter(Participant.meeting_id == room_code, Participant.user_id == user_id, Participant.left_at.is_(None)).update({"left_at": datetime.datetime.utcnow()})
    db.commit()

    participant = Participant(
        id=sid,
        meeting_id=room_code,
        user_id=user_id,
        name=user_name,
        role=role,
        is_muted=is_muted,
        is_camera_off=is_camera_off,
        joined_at=datetime.datetime.utcnow()
    )
    db.add(participant)
    
    # Store Attendance Record
    attendance = Attendance(
        meeting_id=room_code,
        user_id=user_id,
        name=user_name,
        joined_at=datetime.datetime.utcnow()
    )
    db.add(attendance)
    db.commit()

    # Join the Socket.IO room
    await sio.enter_room(sid, room_code)

    state = room_states[room_code]

    # Fetch active participants list
    active_participants = db.query(Participant).filter(Participant.meeting_id == room_code, Participant.left_at.is_(None)).all()
    participants_list = []
    for p in active_participants:
        # Determine avatar color: try fetching user info from DB if user exists
        avatar = "from-indigo-500 to-cyan-400"
        if p.user_id:
            u = db.query(User).filter(User.id == p.user_id).first()
            if u:
                avatar = u.avatar_color
        
        participants_list.append({
            "id": p.id, # socket id as connection id
            "name": p.name,
            "role": p.role,
            "avatarColor": avatar,
            "isMuted": p.is_muted,
            "isVideoOff": p.is_camera_off,
            "isSharingScreen": False,
            "isHandRaised": p.is_hand_raised,
            "isPinned": False,
            "ping": 15,
            "audioLevel": 0,
            "language": "en"
        })

    # Send room metadata and current peers list to joining participant
    await sio.emit("join-success", {
        "sid": sid,
        "participants": participants_list,
        "roomSettings": {
            "lockMeeting": state["lockMeeting"],
            "waitingRoomEnabled": state["waitingRoomEnabled"],
            "allowChat": state["allowChat"],
            "allowScreenShare": state["allowScreenShare"],
            "allowMic": state["allowMic"],
            "allowCamera": state["allowCamera"]
        },
        "notes": state["notes"]
    }, to=sid)

    # Notify other participants
    avatar = "from-indigo-500 to-cyan-400"
    if user_id:
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            avatar = u.avatar_color

    await sio.emit("participant-joined", {
        "id": sid,
        "name": user_name,
        "role": role,
        "avatarColor": avatar,
        "isMuted": is_muted,
        "isVideoOff": is_camera_off,
        "isSharingScreen": False,
        "isHandRaised": False,
        "isPinned": False,
        "ping": 15,
        "audioLevel": 0,
        "language": "en"
    }, room=room_code, skip_sid=sid)

    print(f"Participant {user_name} joined room {room_code} (sid: {sid})")

@sio.event
async def approve_waiting_room(sid, data):
    target_sid = data.get("targetSid")
    room_code = data.get("roomCode")
    approved = data.get("approved", True)

    if room_code not in room_states:
        return

    state = room_states[room_code]
    waitlist_item = next((item for item in state["waitlist"] if item["sid"] == target_sid), None)
    
    if waitlist_item:
        state["waitlist"].remove(waitlist_item)
        if approved:
            db = get_db()
            if db:
                try:
                    await proceed_join(
                        target_sid,
                        room_code,
                        waitlist_item["userName"],
                        waitlist_item["userId"],
                        "Participant",
                        waitlist_item["isMuted"],
                        waitlist_item["isVideoOff"],
                        db
                    )
                finally:
                    db.close()
        else:
            await sio.emit("waiting-room-status", {"status": "rejected"}, to=target_sid)
            await sio.emit("join-rejected", {"reason": "The host did not approve your request to join."}, to=target_sid)

# --- WebRTC Peer-to-Peer Signaling Events ---

@sio.event
async def sdp_offer(sid, data):
    target = data.get("target")
    offer = data.get("offer")
    await sio.emit("sdp-offer", {"sender": sid, "offer": offer}, to=target)

@sio.event
async def sdp_answer(sid, data):
    target = data.get("target")
    answer = data.get("answer")
    await sio.emit("sdp-answer", {"sender": sid, "answer": answer}, to=target)

@sio.event
async def ice_candidate(sid, data):
    target = data.get("target")
    candidate = data.get("candidate")
    await sio.emit("ice-candidate", {"sender": sid, "candidate": candidate}, to=target)

# --- Media State Sync Events ---

@sio.event
async def mute_toggle(sid, data):
    is_muted = data.get("isMuted")
    room_code = data.get("roomCode")
    db = get_db()
    if db:
        try:
            db.query(Participant).filter(Participant.id == sid).update({"is_muted": is_muted})
            db.commit()
        finally:
            db.close()
    await sio.emit("participant-muted", {"sid": sid, "isMuted": is_muted}, room=room_code, skip_sid=sid)

@sio.event
async def camera_toggle(sid, data):
    is_camera_off = data.get("isVideoOff")
    room_code = data.get("roomCode")
    db = get_db()
    if db:
        try:
            db.query(Participant).filter(Participant.id == sid).update({"is_camera_off": is_camera_off})
            db.commit()
        finally:
            db.close()
    await sio.emit("participant-camera-toggled", {"sid": sid, "isVideoOff": is_camera_off}, room=room_code, skip_sid=sid)

@sio.event
async def hand_raise(sid, data):
    is_hand_raised = data.get("isHandRaised")
    room_code = data.get("roomCode")
    db = get_db()
    if db:
        try:
            db.query(Participant).filter(Participant.id == sid).update({"is_hand_raised": is_hand_raised})
            db.commit()
        finally:
            db.close()
    await sio.emit("participant-hand-raised", {"sid": sid, "isHandRaised": is_hand_raised}, room=room_code, skip_sid=sid)

@sio.event
async def screen_share_toggle(sid, data):
    is_sharing = data.get("isSharingScreen")
    room_code = data.get("roomCode")
    await sio.emit("participant-screen-shared", {"sid": sid, "isSharingScreen": is_sharing}, room=room_code, skip_sid=sid)

@sio.event
async def reaction(sid, data):
    emoji = data.get("emoji")
    room_code = data.get("roomCode")
    await sio.emit("reaction-received", {"sid": sid, "emoji": emoji}, room=room_code)

@sio.event
async def speaking_level(sid, data):
    level = data.get("level", 0)
    room_code = data.get("roomCode")
    await sio.emit("speaking-detected", {"sid": sid, "level": level}, room=room_code, skip_sid=sid)

# --- Real-time Chat Sync ---

@sio.event
async def chat_message(sid, data):
    room_code = data.get("roomCode")
    text = data.get("text")
    sender_name = data.get("senderName", "Guest")
    is_code = data.get("isCode", False)
    file_url = data.get("fileUrl")
    
    db = get_db()
    if db:
        try:
            now_time = datetime.datetime.utcnow().strftime("%H:%M")
            msg = Message(
                meeting_id=room_code,
                sender_id=sid,
                sender_name=sender_name,
                text=text,
                is_code=is_code,
                time=now_time,
                file_url=file_url
            )
            db.add(msg)
            db.commit()

            # Broadcast message
            await sio.emit("chat-message-received", {
                "id": msg.id,
                "sender": sender_name,
                "text": text,
                "time": now_time,
                "isCode": is_code,
                "fileUrl": file_url,
                "isMe": False
            }, room=room_code, skip_sid=sid)
        finally:
            db.close()

# --- Interactive Sidebar Workspace Synchronization ---

@sio.event
async def notes_update(sid, data):
    room_code = data.get("roomCode")
    notes = data.get("notes")
    if room_code in room_states:
        room_states[room_code]["notes"] = notes
        await sio.emit("notes-updated", {"notes": notes}, room=room_code, skip_sid=sid)

@sio.event
async def whiteboard_stroke(sid, data):
    room_code = data.get("roomCode")
    stroke = data.get("stroke") # coordinates / drawing object
    if room_code in room_states:
        room_states[room_code]["whiteboard"].append(stroke)
        await sio.emit("whiteboard-stroke-received", {"stroke": stroke}, room=room_code, skip_sid=sid)

@sio.event
async def whiteboard_clear(sid, data):
    room_code = data.get("roomCode")
    if room_code in room_states:
        room_states[room_code]["whiteboard"] = []
        await sio.emit("whiteboard-cleared", room=room_code)

# --- Live Captions & Translation ---

@sio.event
async def send_live_caption(sid, data):
    room_code = data.get("roomCode")
    speaker = data.get("speaker")
    text = data.get("text")
    detected_lang = data.get("language", "en")
    
    # Broadcast caption chunk
    await sio.emit("live-caption-received", {
        "sid": sid,
        "speaker": speaker,
        "text": text,
        "language": detected_lang
    }, room=room_code)

# --- Host Action Handlers ---

@sio.event
async def host_lock_meeting(sid, data):
    room_code = data.get("roomCode")
    locked = data.get("locked")
    
    db = get_db()
    if db:
        try:
            db.query(Meeting).filter(Meeting.id == room_code).update({"is_locked": locked})
            db.commit()
        finally:
            db.close()

    if room_code in room_states:
        room_states[room_code]["lockMeeting"] = locked
        await sio.emit("meeting-locked-toggled", {"locked": locked}, room=room_code)

@sio.event
async def host_waiting_room_toggle(sid, data):
    room_code = data.get("roomCode")
    enabled = data.get("enabled")
    
    db = get_db()
    if db:
        try:
            db.query(Meeting).filter(Meeting.id == room_code).update({"is_waiting_room_enabled": enabled})
            db.commit()
        finally:
            db.close()

    if room_code in room_states:
        room_states[room_code]["waitingRoomEnabled"] = enabled
        await sio.emit("waiting-room-toggled", {"enabled": enabled}, room=room_code)

@sio.event
async def host_mute_all(sid, data):
    room_code = data.get("roomCode")
    await sio.emit("force-mute-mic", room=room_code, skip_sid=sid)

@sio.event
async def host_mute_participant(sid, data):
    target_sid = data.get("targetSid")
    await sio.emit("force-mute-mic", to=target_sid)

@sio.event
async def host_remove_participant(sid, data):
    target_sid = data.get("targetSid")
    room_code = data.get("roomCode")
    await sio.emit("ejected", {"reason": "You were removed from the meeting by the host."}, to=target_sid)
    # Force disconnect socket
    await sio.disconnect(target_sid)

@sio.event
async def host_permission_toggle(sid, data):
    room_code = data.get("roomCode")
    permission = data.get("permission") # "allowChat", "allowScreenShare", "allowMic", "allowCamera"
    value = data.get("value")
    
    if room_code in room_states:
        room_states[room_code][permission] = value
        await sio.emit("permission-changed", {"permission": permission, "value": value}, room=room_code)

@sio.event
async def host_assign_co_host(sid, data):
    target_sid = data.get("targetSid")
    room_code = data.get("roomCode")
    
    db = get_db()
    if db:
        try:
            db.query(Participant).filter(Participant.id == target_sid).update({"role": "Co-Host"})
            db.commit()
        finally:
            db.close()

    await sio.emit("participant-role-changed", {"sid": target_sid, "role": "Co-Host"}, room=room_code)

@sio.event
async def host_end_meeting(sid, data):
    room_code = data.get("roomCode")
    db = get_db()
    if db:
        try:
            db.query(Meeting).filter(Meeting.id == room_code).update({"is_active": False, "ended_at": datetime.datetime.utcnow()})
            db.query(Participant).filter(Participant.meeting_id == room_code, Participant.left_at.is_(None)).update({"left_at": datetime.datetime.utcnow()})
            db.commit()
        finally:
            db.close()

    await sio.emit("meeting-ended", room=room_code)
    
    # Clean up states
    if room_code in room_states:
        del room_states[room_code]

@sio.event
async def recording_status_toggle(sid, data):
    room_code = data.get("roomCode")
    status = data.get("status") # "recording" | "paused" | "idle"
    await sio.emit("recording-status-changed", {"status": status}, room=room_code)
