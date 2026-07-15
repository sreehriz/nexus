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

from backend.config import GEMINI_API_KEY, APP_URL, UPLOAD_DIR, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, COOKIE_SECURE, N8N_WEBHOOK_URL
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

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    """Lightweight health probe used by the frontend wait-on script."""
    return {"status": "ok", "service": "nexus-backend", "timestamp": datetime.datetime.utcnow().isoformat()}

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
    
    # Tokens
    access_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
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
            "avatarColor": user.avatar_color
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
        
    new_access_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
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
        access_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
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
                "avatarColor": user.avatar_color
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

from fastapi.responses import RedirectResponse

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
            email_verified=True,
            last_login=datetime.datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = datetime.datetime.utcnow()
        if user.provider == "local":
            user.provider = "google"
        user.email_verified = True
        db.commit()
        
    acc_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
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
    if not user:
        user = User(
            email=email,
            username=username.lower(),
            password_hash=get_password_hash(str(uuid.uuid4())),
            full_name=full_name,
            provider="github",
            email_verified=True,
            last_login=datetime.datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = datetime.datetime.utcnow()
        if user.provider == "local":
            user.provider = "github"
        user.email_verified = True
        db.commit()
        
    acc_token = create_access_token({"sub": user.id, "email": user.email, "name": user.full_name})
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
    if provider not in ["google", "github"]:
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
        "username": user.username,
        "fullName": user.full_name,
        "avatarColor": user.avatar_color,
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


# Mount Socket.IO as ASGI app inside FastAPI
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
app.mount("/", asgi_app)  # Route root / to socketio app which falls back to fastapi
