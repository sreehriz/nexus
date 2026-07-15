import os
from dotenv import load_dotenv

# Load `.env.local` from the workspace root (parent folder of backend)
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
env_path = os.path.join(workspace_root, ".env.local")
load_dotenv(env_path)

JWT_SECRET = os.getenv("JWT_SECRET", "nexus-super-secret-key-signature-2026")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexus.db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")
UPLOAD_DIR = os.path.join(workspace_root, "public", "uploads")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
