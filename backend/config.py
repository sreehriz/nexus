import os
from dotenv import load_dotenv

# Load `.env.local` from the workspace root (parent folder of backend)
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
env_path = os.path.join(workspace_root, ".env.local")
load_dotenv(env_path)

# ── Core ──────────────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "nexus-super-secret-key-change-in-production-2026")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

# ── Environment detection ─────────────────────────────────────────────────────
# Set NODE_ENV=production or IS_PRODUCTION=true in .env.local for production
IS_PRODUCTION = os.getenv("IS_PRODUCTION", "false").lower() in ("true", "1", "yes")
IS_PRODUCTION = IS_PRODUCTION or os.getenv("NODE_ENV", "development") == "production"

# Cookie security: must be False on http://localhost, True on https:// production
COOKIE_SECURE = IS_PRODUCTION

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(workspace_root, 'nexus.db')}")

# ── Upload directory ──────────────────────────────────────────────────────────
UPLOAD_DIR = os.path.join(workspace_root, "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── App URL ───────────────────────────────────────────────────────────────────
APP_URL = os.getenv("APP_URL", "http://localhost:3000")

# ── AI ────────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── OAuth ─────────────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID", "")
APPLE_TEAM_ID = os.getenv("APPLE_TEAM_ID", "")
APPLE_KEY_ID = os.getenv("APPLE_KEY_ID", "")
APPLE_PRIVATE_KEY = os.getenv("APPLE_PRIVATE_KEY", "").replace("\\n", "\n")

# ── Email / SMTP ──────────────────────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@nexus.app")

# ── n8n Webhook ───────────────────────────────────────────────────────────────
# Set this to enable n8n email automation (preferred over SMTP in development)
# Example: http://localhost:5678/webhook/nexus-email
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "")

# ── Resend ────────────────────────────────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

# ── Cloudinary ────────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

# ── Sentry DSN ────────────────────────────────────────────────────────────────
SENTRY_DSN = os.getenv("SENTRY_DSN", "")

# ── Startup validation ────────────────────────────────────────────────────────
_warnings = []
if JWT_SECRET == "nexus-super-secret-key-change-in-production-2026" and IS_PRODUCTION:
    _warnings.append("⚠️  JWT_SECRET is using the default value. Set a strong secret in production.")
if IS_PRODUCTION and not COOKIE_SECURE:
    _warnings.append("⚠️  COOKIE_SECURE is False but IS_PRODUCTION=true. Cookies won't work over HTTPS.")

if _warnings:
    for w in _warnings:
        print(w)
