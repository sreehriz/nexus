from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Integer, ForeignKey, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import uuid
import os
from app.config import DATABASE_URL as CONFIG_DATABASE_URL

DATABASE_URL = CONFIG_DATABASE_URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{os.path.join(workspace_root, 'nexus.db')}"

# Production pool parameters for PostgreSQL
if "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=True
    )
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    avatar_color = Column(String, default="from-indigo-500 to-cyan-400")
    avatar = Column(String, nullable=True)
    provider = Column(String, default="local") # "local" | "google" | "github"
    email_verified = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

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

class OTPCode(Base):
    __tablename__ = "otps"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    otp_hash = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # "verify_email" | "reset_password"
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    token_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    if "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL:
        # Run Alembic migrations programmatically
        print("[DATABASE] PostgreSQL detected. Running database migrations...")
        try:
            from alembic.config import Config
            from alembic import command
            alembic_ini_path = os.path.join(workspace_root, "backend", "alembic.ini")
            if os.path.exists(alembic_ini_path):
                cfg = Config(alembic_ini_path)
                cfg.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))
                command.upgrade(cfg, "head")
                print("[DATABASE] Alembic migrations run successfully.")
            else:
                print("[DATABASE] WARNING: alembic.ini not found at", alembic_ini_path)
                # Fallback to create all
                Base.metadata.create_all(bind=engine)
        except Exception as e:
            print("[DATABASE] Alembic programmatic migration failed:", e)
            print("[DATABASE] Falling back to create_all...")
            try:
                Base.metadata.create_all(bind=engine)
            except Exception as e_fallback:
                print("[DATABASE] Fallback create_all failed:", e_fallback)
    else:
        # Local SQLite development
        Base.metadata.create_all(bind=engine)
        # Check if avatar column exists in users table (PRAGMA only works in SQLite)
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                result = conn.execute(text("PRAGMA table_info(users);")).fetchall()
                columns = [row[1] for row in result]
                if "avatar" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar VARCHAR;"))
                    conn.commit()
                    print("[DATABASE] Migrated SQLite users table: added avatar column.")
        except Exception as e:
            print("[DATABASE] Auto-migration warning (SQLite):", e)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
