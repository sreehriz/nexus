from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Integer, ForeignKey, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import uuid
from backend.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    avatar_color = Column(String, default="from-indigo-500 to-cyan-400")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserSettings(Base):
    """Per-user preference store — created on first save."""
    __tablename__ = "user_settings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    theme = Column(String, default="dark")           # "dark" | "light"
    language = Column(String, default="en")          # ISO 639-1 code
    auto_mute = Column(Boolean, default=False)
    auto_video_off = Column(Boolean, default=False)
    captions_enabled = Column(Boolean, default=False)
    notify_on_join = Column(Boolean, default=True)
    notify_on_chat = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(String, primary_key=True)  # Room code, e.g., nex-794-slv
    host_id = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=True)            # Optional user-provided title
    is_locked = Column(Boolean, default=False)
    is_waiting_room_enabled = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

class Participant(Base):
    __tablename__ = "participants"
    id = Column(String, primary_key=True)  # Socket ID
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    role = Column(String, default="Participant")  # Organizer, Co-Host, Participant
    is_muted = Column(Boolean, default=False)
    is_camera_off = Column(Boolean, default=False)
    is_hand_raised = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    sender_id = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    is_code = Column(Boolean, default=False)
    time = Column(String, nullable=False)  # HH:MM string format
    file_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class File(Base):
    __tablename__ = "files"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    name = Column(String, nullable=False)
    size = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

class Recording(Base):
    __tablename__ = "recordings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    file_path = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    action_items = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    user_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)

class MeetingMemory(Base):
    """
    Stores AI-processed transcript segments for the Nexus Memory™ search feature.
    Each row is a meaningful segment (e.g., a decision, action item, topic summary)
    extracted from a meeting's chat/transcript by Gemini.
    """
    __tablename__ = "meeting_memory"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)  # The user who "owns" this memory
    speaker = Column(String, nullable=True)
    content = Column(Text, nullable=False)          # The verbatim or summarized segment
    segment_type = Column(String, default="message") # "message" | "decision" | "action_item" | "summary"
    relevance_score = Column(Float, default=0.0)     # Pre-computed relevance for common queries
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    """In-app notification feed — e.g., 'Meeting ended', 'Summary ready'."""
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    type = Column(String, default="info")             # "info" | "success" | "warning" | "error"
    is_read = Column(Boolean, default=False)
    action_url = Column(String, nullable=True)        # Optional deep-link (e.g., /history/nex-794-slv)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
