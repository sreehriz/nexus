import os
import shutil
import uuid
import datetime
import httpx
import json
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
import socketio

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from backend.config import (
    GEMINI_API_KEY, APP_URL, UPLOAD_DIR, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, APPLE_CLIENT_ID, APPLE_TEAM_ID,
    APPLE_KEY_ID, APPLE_PRIVATE_KEY, COOKIE_SECURE, N8N_WEBHOOK_URL,
    CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, SENTRY_DSN
)

# Initialize Sentry
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

from backend.database import init_db, get_db, User, Meeting, Participant, Message, File, Recording, Attendance, OTPCode, RefreshToken, UserSettings, Notification
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    get_current_user_id,
    generate_otp,
    hash_otp
)
from backend.email_service import send_welcome_email, send_forgot_password_email, send_password_changed_email
from backend.sockets import sio

# Initialize Database
init_db()

app = FastAPI(
    title="Nexus Online Meeting Engine",
    version="1.0.0",
    description="Production-ready real-time meeting platform with AI features",
)

# ── Health, Version & Status Check Endpoints ─────────────────────────────────
@app.get("/health")
@app.head("/health")
def health_root():
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat()}

@app.get("/api/health")
@app.head("/api/health")
def health_check():
    """Lightweight health probe used by the frontend wait-on script."""
    return {"status": "ok", "service": "nexus-backend", "timestamp": datetime.datetime.utcnow().isoformat()}

@app.get("/version")
def version_root():
    return {"version": "1.0.0", "service": "nexus-backend"}

@app.get("/status")
def status_root(db: Session = Depends(get_db)):
    # Perform database connection test query
    db_ok = False
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print("[STATUS CHECK] DB Connection test failed:", e)
        
    return {
        "status": "healthy" if db_ok else "unhealthy",
        "database": "connected" if db_ok else "disconnected",
        "service": "nexus-backend",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }


# Setup CORS middleware — allow configured APP_URL or local origins
_allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if APP_URL:
    clean_app_url = APP_URL.rstrip("/")
    if clean_app_url not in _allowed_origins:
        _allowed_origins.append(clean_app_url)

_allow_origin_regex = r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for downloads
public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
os.makedirs(public_dir, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Cloudinary Configuration & Helper ─────────────────────────────────────────
if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )

def upload_to_cloudinary(file: UploadFile, folder: str = "nexus") -> Optional[str]:
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        return None
    try:
        file.file.seek(0)
        res = cloudinary.uploader.upload(
            file.file,
            folder=folder,
            resource_type="auto"
        )
        return res.get("secure_url")
    except Exception as e:
        print("[CLOUDINARY] Upload failed:", e)
        return None


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

import re

def is_strong_password(p: str) -> bool:
    if len(p) < 8:
        return False
    if not re.search("[A-Z]", p):
        return False
    if not re.search("[a-z]", p):
        return False
    if not re.search("[0-9]", p):
        return False
    if not re.search("[!@#$%^&*(),.?\":{}|<>]", p):
        return False
    return True

@app.post("/api/register")
def register(
    request: Request,
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    fullName: str = Form(...),
    avatarColor: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    _check_rate_limit(request)
    
    # Validation
    if not is_strong_password(password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters."
        )
        
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    existing_user = db.query(User).filter(User.username == username.lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username is already taken")
        
    # Create User (unverified)
    user = User(
        email=email,
        username=username.lower(),
        password_hash=get_password_hash(password),
        full_name=fullName,
        avatar_color=avatarColor or "from-indigo-500 to-cyan-400",
        email_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate OTP
    otp = generate_otp()
    hashed = hash_otp(otp)
    expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    
    otp_record = OTPCode(
        user_id=user.id,
        otp_hash=hashed,
        purpose="verify_email",
        expires_at=expiry
    )
    db.add(otp_record)
    db.commit()
    
    # Send Welcome Email
    send_welcome_email(user.email, user.full_name, otp)
    
    return {
        "status": "verification_required",
        "userId": user.id,
        "email": user.email
    }

@app.post("/api/login")
def login(
    request: Request,
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    _check_rate_limit(request)
    user = db.query(User).filter(User.email == email).first()
    
    # Check Lockout status
    if user and user.locked_until:
        if datetime.datetime.utcnow() < user.locked_until:
            wait_time = int((user.locked_until - datetime.datetime.utcnow()).total_seconds() / 60)
            raise HTTPException(
                status_code=401, 
                detail=f"Account is locked due to multiple failed login attempts. Try again in {wait_time} minutes."
            )
        else:
            # Lock has expired, reset counter
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    if not user or not verify_password(password, user.password_hash):
        # Handle failed login tracking
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
                db.commit()
                raise HTTPException(
                    status_code=401, 
                    detail="Account is locked due to multiple failed login attempts. Try again in 15 minutes."
                )
            db.commit()
        # Always output generic message to prevent enumeration
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # Check if Email is Verified
    if not user.email_verified:
        # Generate new verification code
        otp = generate_otp()
        hashed = hash_otp(otp)
        expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        
        # Deactivate old verify codes
        db.query(OTPCode).filter(OTPCode.user_id == user.id, OTPCode.purpose == "verify_email").update({"used": True})
        
        otp_record = OTPCode(
            user_id=user.id,
            otp_hash=hashed,
            purpose="verify_email",
            expires_at=expiry
        )
        db.add(otp_record)
        db.commit()
        
        send_welcome_email(user.email, user.full_name, otp)
        
        return {
            "status": "verification_required",
            "userId": user.id,
            "email": user.email
        }
        
    # Successful Login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.datetime.utcnow()
    db.commit()
    
    # Send login security alert
    try:
        from backend.email_service import send_security_alert_email
        send_security_alert_email(
            user.email,
            user.full_name,
            alert_type="new_login",
            alert_details=f"New login detected from IP {request.client.host if request.client else 'unknown'} at {user.last_login.isoformat()} UTC."
        )
    except Exception as e:
        print("[SECURITY ALERT ERROR]:", e)
    
    # Tokens
    access_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name, "avatarColor": user.avatar_color, "avatar": getattr(user, "avatar", None)})
    refresh_token = create_refresh_token({"sub": user.id})
    
    # Store Refresh Token
    token_hash = hash_otp(refresh_token) # use SHA-256 for refresh token storage
    rt_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(rt_record)
    db.commit()
    
    # Set Secure HttpOnly cookie
    response.set_cookie(
        key="nexus_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=7*24*60*60
    )
    
    return {
        "token": access_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": user.full_name,
            "avatarColor": user.avatar_color,
            "avatar": getattr(user, "avatar", None)
        }
    }

@app.post("/api/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """Silent token rotation using Secure HTTPOnly cookies"""
    refresh_token = request.cookies.get("nexus_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id = payload.get("sub")
    token_hash = hash_otp(refresh_token)
    
    # Validate in database
    rt = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.datetime.utcnow()
    ).first()
    
    if not rt:
        raise HTTPException(status_code=401, detail="Revoked or expired refresh token")
        
    # Rotate refresh token (revoke old one, create new one)
    rt.revoked = True
    db.commit()
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    new_access_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name, "avatarColor": user.avatar_color, "avatar": getattr(user, "avatar", None)})
    new_refresh_token = create_refresh_token({"sub": user.id})
    
    # Store rotated refresh token
    new_token_hash = hash_otp(new_refresh_token)
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(new_rt)
    db.commit()
    
    # Write rotated cookie
    response.set_cookie(
        key="nexus_refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=7*24*60*60
    )
    
    return {"token": new_access_token}

@app.post("/api/auth/verify-otp")
def verify_otp(
    response: Response,
    userId: str = Form(...),
    otp: str = Form(...),
    purpose: str = Form(...), # "verify_email" | "reset_password"
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed = hash_otp(otp)
    
    # Find unused unexpired code
    otp_record = db.query(OTPCode).filter(
        OTPCode.user_id == userId,
        OTPCode.purpose == purpose,
        OTPCode.used == False,
        OTPCode.expires_at > datetime.datetime.utcnow()
    ).order_by(OTPCode.created_at.desc()).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Verification code has expired or is invalid.")
        
    otp_record.attempts += 1
    if otp_record.attempts >= 5:
        otp_record.used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Too many incorrect attempts. Code invalidated.")
        
    if otp_record.otp_hash != hashed:
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect verification code.")
        
    # Mark OTP as verified/used
    otp_record.used = True
    
    if purpose == "verify_email":
        user.email_verified = True
        db.commit()
        
        # Log user in
        access_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name, "avatarColor": user.avatar_color, "avatar": getattr(user, "avatar", None)})
        refresh_token = create_refresh_token({"sub": user.id})
        
        rt_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_otp(refresh_token),
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
        )
        db.add(rt_record)
        db.commit()
        
        response.set_cookie(
            key="nexus_refresh_token",
            value=refresh_token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="lax",
            max_age=7*24*60*60
        )
        
        return {
            "status": "success",
            "token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "fullName": user.full_name,
                "avatarColor": user.avatar_color,
                "avatar": getattr(user, "avatar", None)
            }
        }
        
    db.commit()
    return {"status": "otp_verified"}

@app.post("/api/auth/forgot-password")
def forgot_password(request: Request, email: str = Form(...), db: Session = Depends(get_db)):
    _check_rate_limit(request)
    user = db.query(User).filter(User.email == email).first()
    
    # To prevent enumeration, ALWAYS print success feedback
    response_msg = {"detail": "If an account exists, we've sent a verification code."}
    
    if not user:
        return response_msg
        
    # Invalidate previous unexpired resets
    db.query(OTPCode).filter(OTPCode.user_id == user.id, OTPCode.purpose == "reset_password").update({"used": True})
    
    otp = generate_otp()
    hashed = hash_otp(otp)
    expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    
    otp_record = OTPCode(
        user_id=user.id,
        otp_hash=hashed,
        purpose="reset_password",
        expires_at=expiry
    )
    db.add(otp_record)
    db.commit()
    
    send_forgot_password_email(user.email, user.full_name, otp)
    return {"detail": "If an account exists, we've sent a verification code.", "userId": user.id}

@app.post("/api/auth/reset-password")
def reset_password(
    userId: str = Form(...),
    otp: str = Form(...),
    newPassword: str = Form(...),
    confirmPassword: str = Form(...),
    db: Session = Depends(get_db)
):
    if newPassword != confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
        
    if not is_strong_password(newPassword):
        raise HTTPException(
            status_code=400,
            detail="Password must contain uppercase, lowercase, numbers, and special characters."
        )
        
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed_otp = hash_otp(otp)
    
    # Confirm OTP code has been verified and not expired
    otp_record = db.query(OTPCode).filter(
        OTPCode.user_id == userId,
        OTPCode.purpose == "reset_password",
        OTPCode.otp_hash == hashed_otp,
        OTPCode.used == True # OTP verify endpoint already marked it as True
    ).order_by(OTPCode.created_at.desc()).first()
    
    if not otp_record:
         raise HTTPException(status_code=400, detail="Unauthorized reset attempt. Code missing or invalid.")
         
    # Update Password and revoke sessions
    user.password_hash = get_password_hash(newPassword)
    db.query(RefreshToken).filter(RefreshToken.user_id == userId).update({"revoked": True})
    # Permanently delete reset OTP to prevent reuse
    db.delete(otp_record)
    db.commit()
    
    send_password_changed_email(user.email, user.full_name)
    return {"status": "success", "detail": "Password updated successfully."}

@app.post("/api/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("nexus_refresh_token")
    if refresh_token:
        token_hash = hash_otp(refresh_token)
        db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).update({"revoked": True})
        db.commit()
        
    response.delete_cookie("nexus_refresh_token")
    return {"status": "ok"}

# --- OAuth 2.0 Redirections and Callbacks ---

from fastapi.responses import RedirectResponse, HTMLResponse

@app.get("/api/auth/google")
def google_auth(request: Request):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google client credentials are not configured in environment.")
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/auth/google/callback"
    scope = "openid email profile"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"state=google-auth-state"
    )
    return RedirectResponse(url)

@app.get("/api/auth/google/callback")
async def google_callback(code: str, request: Request, response: Response, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google client credentials are not configured.")
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/auth/google/callback"
    
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    
    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, data=data)
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code with Google.")
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        userinfo_res = await client.get(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
        if userinfo_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google.")
        user_info = userinfo_res.json()
        
    email = user_info.get("email")
    full_name = user_info.get("name") or email.split("@")[0]
    avatar = user_info.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="No email returned from Google.")
        
    user = db.query(User).filter(User.email == email).first()
    import random
    if not user:
        user = User(
            email=email,
            username=email.split("@")[0] + "_" + str(random.randint(100, 999)),
            password_hash=get_password_hash(str(uuid.uuid4())),
            full_name=full_name,
            provider="google",
            avatar=avatar,
            email_verified=True,
            last_login=datetime.datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = datetime.datetime.utcnow()
        user.avatar = avatar
        if user.provider == "local":
            user.provider = "google"
        user.email_verified = True
        db.commit()
        
    acc_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name, "avatarColor": user.avatar_color, "avatar": getattr(user, "avatar", None)})
    ref_token = create_refresh_token({"sub": user.id})
    
    rt_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_otp(ref_token),
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(rt_record)
    db.commit()
    
    redir = RedirectResponse(f"{APP_URL}/dashboard?token={acc_token}")
    redir.set_cookie(
        key="nexus_refresh_token",
        value=ref_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=7*24*60*60
    )
    return redir

@app.get("/api/auth/github")
def github_auth(request: Request):
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=400, detail="GitHub client credentials are not configured in environment.")
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/auth/github/callback"
    url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={GITHUB_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope=user:email&"
        f"state=github-auth-state"
    )
    return RedirectResponse(url)

@app.get("/api/auth/github/callback")
async def github_callback(code: str, request: Request, response: Response, db: Session = Depends(get_db)):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="GitHub client credentials are not configured.")
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/auth/github/callback"
    
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "code": code,
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
    }
    
    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, data=data, headers=headers)
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code with GitHub.")
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        
        user_res = await client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access_token}"})
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user profile from GitHub.")
        user_info = user_res.json()
        
        emails_res = await client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access_token}"})
        email = None
        if emails_res.status_code == 200:
            emails = emails_res.json()
            for e in emails:
                if e.get("primary") and e.get("verified"):
                    email = e.get("email")
                    break
            if not email and emails:
                email = emails[0].get("email")
                
    if not email:
        email = user_info.get("email") or f"{user_info.get('login')}@users.noreply.github.com"
        
    full_name = user_info.get("name") or user_info.get("login") or email.split("@")[0]
    username = user_info.get("login") or email.split("@")[0]
    
    user = db.query(User).filter(User.email == email).first()
    import random
    avatar = user_info.get("avatar_url")
    if not user:
        user = User(
            email=email,
            username=username.lower(),
            password_hash=get_password_hash(str(uuid.uuid4())),
            full_name=full_name,
            provider="github",
            avatar=avatar,
            email_verified=True,
            last_login=datetime.datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = datetime.datetime.utcnow()
        user.avatar = avatar
        if user.provider == "local":
            user.provider = "github"
        user.email_verified = True
        db.commit()
        
    acc_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name, "avatarColor": user.avatar_color, "avatar": getattr(user, "avatar", None)})
    ref_token = create_refresh_token({"sub": user.id})
    
    rt_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_otp(ref_token),
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(rt_record)
    db.commit()
    
    redir = RedirectResponse(f"{APP_URL}/dashboard?token={acc_token}")
    redir.set_cookie(
        key="nexus_refresh_token",
        value=ref_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=7*24*60*60
    )
    return redir

@app.get("/api/auth/apple")
def apple_auth(request: Request):
    # Check if credentials are fully configured for real Apple Sign-In
    is_apple_configured = all([APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY])
    
    if is_apple_configured:
        base_url = str(request.base_url).rstrip("/")
        redirect_uri = f"{base_url}/api/auth/apple/callback"
        scope = "name email"
        url = (
            f"https://appleid.apple.com/auth/authorize?"
            f"client_id={APPLE_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope={scope}&"
            f"response_mode=form_post&"
            f"state=apple-auth-state"
        )
        return RedirectResponse(url)
    else:
        # Return a beautiful mockup sandbox login UI
        mock_id = str(uuid.uuid4())[:8]
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in with Apple ID</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {{
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #09090b;
            background-image: radial-gradient(circle at 50% 50%, #17153b 0%, #09090b 100%);
            min-height: 100vh;
            color: #f4f4f5;
        }}
        .glass-panel {{
            background: rgba(15, 15, 20, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
        }}
        .apple-btn {{
            background: #ffffff;
            color: #000000;
            transition: all 0.2s ease-in-out;
        }}
        .apple-btn:hover {{
            background: #e4e4e7;
            transform: translateY(-1px);
        }}
        .input-glow:focus {{
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.05);
        }}
        @keyframes float {{
            0% {{ transform: translateY(0px) rotate(0deg); }}
            50% {{ transform: translateY(-15px) rotate(3deg); }}
            100% {{ transform: translateY(0px) rotate(0deg); }}
        }}
        .floating-element {{
            animation: float 8s ease-in-out infinite;
        }}
    </style>
</head>
<body class="flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Floating background accents -->
    <div class="absolute w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl -top-20 -left-20 pointer-events-none floating-element"></div>
    <div class="absolute w-96 h-96 rounded-full bg-purple-500/5 blur-3xl -bottom-20 -right-20 pointer-events-none floating-element" style="animation-delay: -3s;"></div>

    <div class="w-full max-w-md glass-panel rounded-3xl p-8 relative z-10 text-center">
        <!-- Apple SVG Logo -->
        <div class="flex justify-center mb-6">
            <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner floating-element">
                <svg class="w-8 h-8 fill-current text-white" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.39.13-9.13-1.85-14.24-5.96-3.74-3.07-7.61-7.79-11.62-14.15-9.14-14.37-13.71-29.87-13.71-46.5 0-14.88 4.12-27.1 12.35-36.63 8.24-9.53 18.06-14.36 29.47-14.48 4.8.12 10.05 1.62 15.75 4.5 5.71 2.87 9.5 4.3 11.37 4.3 1.5 0 5.48-1.5 11.97-4.5 6.48-3 11.89-4.37 16.23-4.12 15.84.75 27.69 6.84 35.53 18.25-13.84 8.35-20.65 19.5-20.4 33.45.25 10.72 4.17 19.78 11.72 27.18 7.55 7.4 16.3 11.19 26.24 11.38-2.12 6.13-4.56 12.04-7.3 17.75zM119.22 33.74c0-7.73 2.76-14.88 8.29-21.43 5.53-6.55 12.27-10.47 20.21-11.75.13 1 .2 1.87.2 2.62 0 7.36-2.85 14.42-8.54 21.18-5.69 6.77-12.63 10.9-20.83 12.39-.12-1-.18-2-.18-3.01z" />
                </svg>
            </div>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">Sign in with Apple ID</h2>
        <p class="text-xs text-zinc-400 mb-8 font-mono uppercase tracking-wider">Simulated Authorization Sandbox</p>

        <form action="/api/auth/apple/callback" method="POST" class="space-y-4 text-left">
            <input type="hidden" name="state" value="apple-auth-state">
            <input type="hidden" name="code" value="mock_apple_auth_code_{mock_id}">

            <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Full Name</label>
                <input
                    type="text"
                    name="name"
                    value="Operator Nexus"
                    required
                    class="bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors input-glow"
                    placeholder="e.g. Operator Nexus"
                >
            </div>

            <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Email Address</label>
                <input
                    type="email"
                    id="email-input"
                    name="email"
                    value="operator@nexus.app"
                    required
                    class="bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors input-glow"
                    placeholder="e.g. operator@nexus.app"
                >
            </div>

            <div class="flex items-center gap-2 pt-2">
                <input
                    type="checkbox"
                    id="private-relay"
                    class="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-zinc-700 focus:ring-opacity-25"
                    onchange="togglePrivateRelay()"
                >
                <label for="private-relay" class="text-xs text-zinc-400 select-none cursor-pointer">Simulate Apple Private Relay Email</label>
            </div>

            <div class="pt-4 space-y-2">
                <button
                    type="submit"
                    class="w-full cursor-pointer py-3.5 text-xs font-semibold uppercase tracking-wider apple-btn rounded-xl flex items-center justify-center gap-1.5 shadow-lg outline-none"
                >
                    <span>Continue as Mock User</span>
                </button>
                
                <a
                    href="{APP_URL}/login"
                    class="block w-full text-center py-3.5 text-xs font-semibold uppercase tracking-wider border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all outline-none"
                >
                    Cancel
                </a>
            </div>
        </form>
    </div>

    <script>
        function togglePrivateRelay() {{
            const checkbox = document.getElementById('private-relay');
            const emailInput = document.getElementById('email-input');
            if (checkbox.checked) {{
                const randomId = Math.random().toString(36).substring(2, 10);
                emailInput.value = randomId + '@privaterelay.appleid.com';
            }} else {{
                emailInput.value = 'operator@nexus.app';
            }}
        }}
    </script>
</body>
</html>"""
        return HTMLResponse(content=html_content, status_code=200)

@app.api_route("/api/auth/apple/callback", methods=["GET", "POST"])
async def apple_callback(request: Request, db: Session = Depends(get_db)):
    form_data = {}
    if request.method == "POST":
        try:
            form_data = await request.form()
        except Exception:
            pass
            
    code = form_data.get("code") or request.query_params.get("code")
    id_token = form_data.get("id_token") or request.query_params.get("id_token")
    state = form_data.get("state") or request.query_params.get("state")
    user_str = form_data.get("user") or request.query_params.get("user")
    
    # Check if this is a mock callback
    is_mock = False
    if not all([APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY]):
        is_mock = True
    elif code and str(code).startswith("mock_apple_auth_code_"):
        is_mock = True
        
    email = None
    full_name = None
    
    if is_mock:
        email = form_data.get("email") or request.query_params.get("email") or "operator@nexus.app"
        name_val = form_data.get("name") or request.query_params.get("name") or "Operator Nexus"
        full_name = name_val
    else:
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code from Apple.")
            
        token_url = "https://appleid.apple.com/auth/token"
        import jwt
        import time
        
        # Generate client secret dynamically
        headers = {
            "alg": "ES256",
            "kid": APPLE_KEY_ID
        }
        payload = {
            "iss": APPLE_TEAM_ID,
            "iat": int(time.time()),
            "exp": int(time.time()) + 600, # 10 minutes
            "aud": "https://appleid.apple.com",
            "sub": APPLE_CLIENT_ID
        }
        
        try:
            client_secret = jwt.encode(
                payload,
                APPLE_PRIVATE_KEY,
                algorithm="ES256",
                headers=headers
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to generate Apple client secret: {str(e)}")
            
        data = {
            "client_id": APPLE_CLIENT_ID,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": f"{str(request.base_url).rstrip('/')}/api/auth/apple/callback"
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(token_url, data=data)
            if res.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Apple token exchange failed: {res.text}")
            tokens = res.json()
            
        id_token_jwt = tokens.get("id_token")
        try:
            decoded = jwt.decode(id_token_jwt, options={"verify_signature": False})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ID token from Apple.")
            
        email = decoded.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="No email returned in Apple ID token.")
            
        if user_str:
            try:
                user_data = json.loads(user_str)
                name_info = user_data.get("name", {})
                first = name_info.get("firstName") or ""
                last = name_info.get("lastName") or ""
                full_name = f"{first} {last}".strip() or None
            except Exception:
                pass
                
        if not full_name:
            full_name = email.split("@")[0]
            
    # Process user in database
    import random
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            username=email.split("@")[0] + "_" + str(random.randint(100, 999)),
            password_hash=get_password_hash(str(uuid.uuid4())),
            full_name=full_name,
            provider="apple",
            avatar=None,
            email_verified=True,
            last_login=datetime.datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = datetime.datetime.utcnow()
        if user.provider == "local":
            user.provider = "apple"
        user.email_verified = True
        db.commit()
        
    acc_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name, "avatarColor": user.avatar_color, "avatar": getattr(user, "avatar", None)})
    ref_token = create_refresh_token({"sub": user.id})
    
    rt_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_otp(ref_token),
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(rt_record)
    db.commit()
    
    redir = RedirectResponse(f"{APP_URL}/dashboard?token={acc_token}")
    redir.set_cookie(
        key="nexus_refresh_token",
        value=ref_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=7*24*60*60
    )
    return redir

@app.post("/api/auth/disconnect/{provider}")
def disconnect_provider(provider: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if provider not in ["google", "github", "apple"]:

        raise HTTPException(status_code=400, detail="Invalid provider")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.provider == provider:
        user.provider = "local"
        db.commit()
        return {"status": "ok", "detail": f"Disconnected {provider.capitalize()} account successfully."}
    else:
        raise HTTPException(status_code=400, detail="Provider not connected")

@app.post("/api/user/change-password")
def change_password(
    currentPassword: str = Form(...),
    newPassword: str = Form(...),
    confirmPassword: str = Form(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    if newPassword != confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if not is_strong_password(newPassword):
        raise HTTPException(status_code=400, detail="New password does not meet complexity rules.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not verify_password(currentPassword, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid current password.")
        
    user.password_hash = get_password_hash(newPassword)
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).update({"revoked": True})
    db.commit()
    send_password_changed_email(user.email, user.full_name)
    try:
        from backend.email_service import send_security_alert_email
        send_security_alert_email(
            user.email,
            user.full_name,
            alert_type="password_changed",
            alert_details="Your account password was updated successfully. All other active sessions have been revoked."
        )
    except Exception as e:
        print("[SECURITY ALERT ERROR]:", e)
    return {"status": "ok", "detail": "Password updated successfully."}

@app.post("/api/user/delete-account")
def delete_account(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
    db.query(OTPCode).filter(OTPCode.user_id == user_id).delete()
    from backend.database import UserSettings
    db.query(UserSettings).filter(UserSettings.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()
    return {"status": "ok", "detail": "Account and all associated credentials removed successfully."}

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
    
    # Calculate size from stream
    try:
        file.file.seek(0, 2)
        size_in_bytes = file.file.tell()
        file.file.seek(0)
        size_in_mb = size_in_bytes / (1024 * 1024)
        size_str = f"{size_in_mb:.2f} MB" if size_in_mb >= 0.1 else f"{size_in_mb*1024:.1f} KB"
    except Exception:
        size_str = "0.0 KB"

    # Try uploading to Cloudinary
    cloudinary_url = upload_to_cloudinary(file, folder=f"nexus/{roomCode}")
    
    if cloudinary_url:
        file_url = cloudinary_url
    else:
        # Fallback to local upload
        file.file.seek(0)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
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
    
    # Try uploading to Cloudinary
    cloudinary_url = upload_to_cloudinary(file, folder=f"nexus/{roomCode}/recordings")
    
    if cloudinary_url:
        file_url = cloudinary_url
    else:
        # Fallback to local upload
        file.file.seek(0)
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
    
    # Send recording ready alert to meeting host
    try:
        meeting = db.query(Meeting).filter(Meeting.id == roomCode).first()
        if meeting and meeting.host_id:
            host = db.query(User).filter(User.id == meeting.host_id).first()
            if host:
                from backend.email_service import send_recording_ready_email
                send_recording_ready_email(host.email, host.full_name, roomCode, file_url)
    except Exception as e:
        print("[RECORDING ALERT ERROR]:", e)
        
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
                    
                # Send AI summary email to host
                try:
                    meeting = db.query(Meeting).filter(Meeting.id == roomCode).first()
                    if meeting and meeting.host_id:
                        host = db.query(User).filter(User.id == meeting.host_id).first()
                        if host:
                            from backend.email_service import send_ai_summary_email
                            send_ai_summary_email(
                                host.email,
                                host.full_name,
                                roomCode,
                                ai_data.get("summary", ""),
                                ai_data.get("actionItems", [])
                            )
                except Exception as e:
                    print("[AI SUMMARY ALERT ERROR]:", e)
                    
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
        "username": user.username,
        "fullName": user.full_name,
        "avatarColor": user.avatar_color,
        "avatar": getattr(user, "avatar", None),
        "provider": user.provider,
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

@app.post("/api/user/avatar")
async def upload_user_avatar(
    file: UploadFile = FastAPIFile(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    cloudinary_url = upload_to_cloudinary(file, folder="nexus/avatars")
    
    if cloudinary_url:
        file_url = cloudinary_url
    else:
        # Fallback to local
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1]
        filename = f"avatar_{user_id}_{file_id}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, filename)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/static/uploads/{filename}"
        
    user.avatar = file_url
    db.commit()
    db.refresh(user)
    
    # Regenerate access token with updated avatar URL
    acc_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.full_name,
        "avatarColor": user.avatar_color,
        "avatar": user.avatar
    })
    
    return {"status": "ok", "avatar": file_url, "token": acc_token}



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


# ── User Settings API ─────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None             # "dark" | "light"
    language: Optional[str] = None          # ISO 639-1 code
    auto_mute: Optional[bool] = None
    auto_video_off: Optional[bool] = None
    captions_enabled: Optional[bool] = None
    notify_on_join: Optional[bool] = None
    notify_on_chat: Optional[bool] = None


@app.get("/api/user/settings")
def get_user_settings(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Return user preference settings. Creates defaults on first call."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        # Auto-create defaults on first access
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return {
        "theme": settings.theme,
        "language": settings.language,
        "auto_mute": settings.auto_mute,
        "auto_video_off": settings.auto_video_off,
        "captions_enabled": settings.captions_enabled,
        "notify_on_join": settings.notify_on_join,
        "notify_on_chat": settings.notify_on_chat,
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
    }


@app.patch("/api/user/settings")
def update_user_settings(
    body: SettingsUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update user preference settings. Returns updated record."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)

    if body.theme is not None:
        if body.theme not in ("dark", "light"):
            raise HTTPException(status_code=400, detail="Theme must be 'dark' or 'light'")
        settings.theme = body.theme
    if body.language is not None:
        settings.language = body.language
    if body.auto_mute is not None:
        settings.auto_mute = body.auto_mute
    if body.auto_video_off is not None:
        settings.auto_video_off = body.auto_video_off
    if body.captions_enabled is not None:
        settings.captions_enabled = body.captions_enabled
    if body.notify_on_join is not None:
        settings.notify_on_join = body.notify_on_join
    if body.notify_on_chat is not None:
        settings.notify_on_chat = body.notify_on_chat

    settings.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(settings)

    return {
        "status": "ok",
        "theme": settings.theme,
        "language": settings.language,
        "auto_mute": settings.auto_mute,
        "auto_video_off": settings.auto_video_off,
        "captions_enabled": settings.captions_enabled,
        "notify_on_join": settings.notify_on_join,
        "notify_on_chat": settings.notify_on_chat,
    }


# ── Notifications API ─────────────────────────────────────────────────────────

@app.get("/api/notifications")
def get_notifications(
    limit: int = 30,
    unread_only: bool = False,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Return paginated notification feed for the authenticated user."""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "body": n.body,
                "type": n.type,
                "is_read": n.is_read,
                "action_url": n.action_url,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
        "unread_count": unread_count,
    }


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Mark a single notification as read."""
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"status": "ok"}


@app.patch("/api/notifications/read-all")
def mark_all_notifications_read(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the authenticated user."""
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok", "detail": "All notifications marked as read."}


@app.delete("/api/notifications/{notification_id}")
def delete_notification(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a specific notification."""
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()
    return {"status": "ok"}


@app.post("/api/notifications")
def create_notification(
    title: str = Form(...),
    body: Optional[str] = Form(None),
    type: str = Form("info"),
    action_url: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a notification for the current user (e.g., from meeting-end event)."""
    if type not in ("info", "success", "warning", "error"):
        type = "info"
    n = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=type,
        action_url=action_url,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return {"status": "ok", "id": n.id}


class MeetingInviteRequest(BaseModel):
    roomCode: str
    inviteeEmail: str
    inviteeName: str
    meetingTime: str

@app.post("/api/meetings/invite")
def invite_to_meeting(
    body: MeetingInviteRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    host = db.query(User).filter(User.id == user_id).first()
    if not host:
        raise HTTPException(status_code=404, detail="User not found")
        
    from backend.email_service import send_meeting_invitation_email
    ok = send_meeting_invitation_email(
        to_email=body.inviteeEmail,
        invitee_name=body.inviteeName,
        host_name=host.full_name,
        room_code=body.roomCode,
        meeting_time=body.meetingTime
    )
    if ok:
        return {"status": "ok", "detail": "Invitation sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send invitation")

class MeetingReminderRequest(BaseModel):
    roomCode: str
    recipientEmail: str
    recipientName: str
    meetingTime: str

@app.post("/api/meetings/reminder")
def remind_meeting(
    body: MeetingReminderRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    from backend.email_service import send_meeting_reminder_email
    ok = send_meeting_reminder_email(
        to_email=body.recipientEmail,
        name=body.recipientName,
        room_code=body.roomCode,
        meeting_time=body.meetingTime
    )
    if ok:
        return {"status": "ok", "detail": "Reminder sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send reminder")

class ContactFormRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str

@app.post("/api/contact")
def submit_contact_form(body: ContactFormRequest):
    if not body.name or not body.email or not body.subject or not body.message:
        raise HTTPException(status_code=400, detail="All fields are required")
        
    from backend.email_service import send_contact_form_email
    ok = send_contact_form_email(
        name=body.name,
        email=body.email,
        subject=body.subject,
        message=body.message
    )
    if ok:
        return {"status": "ok", "detail": "Contact form submitted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to submit form")


# Mount Socket.IO as ASGI app inside FastAPI
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
