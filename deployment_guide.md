# Nexus SaaS — Production Deployment & Configuration Guide

This guide describes the end-to-end setup of the Nexus project on production cloud providers: Vercel (Frontend), Railway (FastAPI Backend), Supabase (PostgreSQL & Storage), Cloudinary (Alternative Asset Storage), Resend (Transactional Email), and n8n (Workflow Automation).

---

## 1. Supabase Setup (PostgreSQL & Storage)

### PostgreSQL Database
1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Retrieve your connection string:
   - Navigate to **Project Settings** → **Database**.
   - Copy the **Connection URI** under **Connection string** (ensure you choose the transaction/session pooler or direct connection as appropriate).
   - The connection string format is usually: `postgresql://postgres.[username]:[password]@[host]:6543/postgres?sslmode=require`.

### Storage Bucket Configuration
1. Navigate to **Storage** in the Supabase sidebar.
2. Click **New bucket**.
3. Name the bucket `nexus` (must match your `SUPABASE_BUCKET` environment variable).
4. Toggle **Public** (required to allow unauthenticated/authenticated links to resolve in the UI).
5. Under **Allowed MIME types** (optional), you can restrict uploads or leave it open. The default is open.

> [!IMPORTANT]
> **Why We Need This:**
> * **Persistence**: SQLite is file-based and ephemeral. Containers on platforms like Railway rebuild and reset, which would delete your database. Supabase provides a dedicated, remote PostgreSQL database.
> * **Asset Sharing**: The `Public` policy on the storage bucket is required so that file shares and user avatars uploaded during a session can be fetched by other participants' browsers.

---

## 2. Railway Setup (FastAPI Backend)

1. Create a new service in [Railway](https://railway.app) from GitHub or CLI.
2. Railway will read `nixpacks.toml` automatically, enforcing the **Python provider** and executing the correct startup command:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
3. Set the required backend environment variables in the Railway dashboard (see [Environment Variables](#8-environment-variables-reference)).
4. Programmatic migrations will automatically execute on startup.

> [!IMPORTANT]
> **Why We Need This:**
> * **Production Server**: FastAPI requires an ASGI server like Uvicorn to handle concurrent WebSockets, signaling connections, and HTTP REST routes.
> * **Nixpacks Configuration**: Nixpacks builds the container automatically. Since the project root contains both a frontend (`package.json`) and backend, we explicitly tell Nixpacks in `nixpacks.toml` to prioritize Python dependencies so it builds the backend container correctly.
> * **Automatic Migrations**: The database tables are updated automatically upon starting the container. If changes are made to the database models, Alembic will safely update the schemas without manually connecting to the database shell.

---

## 3. Vercel Setup (React Frontend)

1. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New** → **Project**.
2. Import the Git repository containing your Nexus code.
3. Configure the Project Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (runs `vite build`)
   - **Output Directory**: `dist`
4. Set the Environment Variables:
   - `VITE_API_URL`: Your Railway backend domain (e.g., `https://nexus-backend.up.railway.app`).
   - `VITE_BACKEND_URL`: Match the above `VITE_API_URL`.
5. Deploy.
6. Vercel will automatically detect the [vercel.json](file:///c:/Users/sree6/.vscode/nexus%20(1)/vercel.json) file in your root to handle client-side routing.

> [!IMPORTANT]
> **Why We Need This:**
> * **Vite Framework Preset**: Configures Vercel to run the compiler and bundles the React components into static HTML/JS resources.
> * **Client-Side Routing Rewrite (vercel.json)**: Since React Router utilizes client-side routing, refreshing the web browser on `/dashboard` or `/room/id` will cause a Vercel 404 because those directories do not physically exist. The rewrite in `vercel.json` instructs Vercel to route all non-file paths to `index.html`.
> * **CORS Matching**: The backend maps cross-origin cookie policies based on `APP_URL`. Hence, your Vercel URL must be configured correctly on the backend.

---

## 4. Cloudinary Setup (Asset CDN Fallback)

1. Create a free account on [Cloudinary](https://cloudinary.com).
2. Copy the following credentials from your console dashboard:
   - **Cloud Name** (`CLOUDINARY_CLOUD_NAME`)
   - **API Key** (`CLOUDINARY_API_KEY`)
   - **API Secret** (`CLOUDINARY_API_SECRET`)
3. Set these variables in the Railway environment settings.

> [!IMPORTANT]
> **Why We Need This:**
> * **High-Speed CDN Delivery**: In addition to Supabase Storage, the backend has built-in integration to upload assets (avatars, sharing files, screenshots) to Cloudinary. It acts as an alternative/fallback cloud storage provider to deliver assets via an optimized content delivery network (CDN).

---

## 5. Resend Setup (Direct Emails)

1. Create an account on [Resend](https://resend.com).
2. Go to **API Keys** and click **Create API Key**. Copy this key as `RESEND_API_KEY`.
3. If using a sandbox key, configure your sending address as `onboarding@resend.dev` by setting the `SMTP_FROM=onboarding@resend.dev` variable.
4. For custom domains, add and verify your domain under **Domains** in Resend, then set `SMTP_FROM=no-reply@yourdomain.com`.

> [!IMPORTANT]
> **Why We Need This:**
> * **Secure OTP and Verification**: Modern email authentication (DMARC, DKIM, SPF) blocks standard server-sent mail as spam. Resend ensures that critical user security notices (OTPs, password reset tokens, verification emails) bypass spam filters and are successfully received in user inboxes.

---

## 6. n8n Setup (Email Webhooks)

1. In your [n8n](https://n8n.io) instance, create a new workflow.
2. Add a **Webhook node** set to `POST` with JSON path.
3. Hook up email dispatch nodes (e.g. Gmail, Outlook, SMTP, or Resend) to send customized HTML.
4. Set the webhook URL in the Railway environment variables as `N8N_WEBHOOK_URL`.
5. The payload format sent by the backend is:
   ```json
   {
     "type": "welcome | forgot_password | password_changed | meeting_invitation | meeting_reminder | recording_ready | ai_summary | contact_form | security_alert",
     "to": "recipient@email.com",
     "name": "User Full Name",
     "otp": "123456",
     "roomCode": "nex-abc-xyz",
     "meetingTime": "2026-07-17 14:00 UTC",
     "recordingUrl": "https://...",
     "summary": "AI summary details...",
     "actionItems": [ ... ]
   }
   ```

> [!IMPORTANT]
> **Why We Need This:**
> * **Flexible Automation**: Rather than hardcoding complex HTML templates or calendar syncing logic directly in Python, using an n8n webhook allows you to visually orchestrate how emails look, auto-post meeting summaries to Slack, and handle calendar invites via a modular flow.

---

## 7. OAuth Setup (Google, GitHub & Apple)

### Google OAuth
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Navigate to **APIs & Services** → **Credentials**.
3. Create an **OAuth 2.0 Client ID** as a Web Application.
4. Configure Authorized Redirect URIs:
   - `https://<your-backend-domain>.up.railway.app/api/auth/google/callback`
5. Map the Client ID and Secret to `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### GitHub OAuth
1. Go to **Settings** → **Developer Settings** → **OAuth Apps** in GitHub.
2. Click **Register a new application**.
3. Configure settings:
   - Homepage URL: `https://<your-frontend>.vercel.app`
   - Authorization callback URL: `https://<your-backend-domain>.up.railway.app/api/auth/github/callback`
4. Generate a Client Secret. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

### Apple Sign In
1. Go to [Apple Developer portal](https://developer.apple.com).
2. Register an **Identifier (App ID)** and create a **Service ID** for Sign In with Apple.
3. Configure the Redirect URI:
   - `https://<your-backend-domain>.up.railway.app/api/auth/apple/callback`
4. Download the private key (.p8) file.
5. Populate environment variables:
   - `APPLE_CLIENT_ID`: The Service ID identifier.
   - `APPLE_TEAM_ID`: Your Apple Developer Team ID.
   - `APPLE_KEY_ID`: The Key ID of the private key.
   - `APPLE_PRIVATE_KEY`: The contents of the `.p8` file (replace literal newlines with `\n` if pasting as a single line).
   *(If unconfigured, Apple Auth runs in a secure Mock sandbox automatically).*

> [!IMPORTANT]
> **Why We Need This:**
> * **Onboarding Simplicity**: Social logins allow quick single-click registrations for a better conversion rate.
> * **Callback Restrictions**: For security, OAuth servers will only return code redirects to pre-registered domains. If your callback endpoint is not configured exactly to match your production backend URL, authentication will fail with a redirect URI mismatch error.

---

## 8. Environment Variables Reference

Configure these variables on their respective platforms:

### Railway Backend Variables
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Supabase PostgreSQL Connection String |
| `JWT_SECRET` | Cryptographically secure random string (e.g. `openssl rand -hex 32`) |
| `IS_PRODUCTION` | `true` |
| `APP_URL` | The public URL of the React client (Vercel URL, e.g. `https://nexus.vercel.app`) |
| `GEMINI_API_KEY` | Google AI Studio Key (for transcript and summary generation) |
| `SUPABASE_URL` | The REST API endpoint of your Supabase project |
| `SUPABASE_KEY` | The Anon/Public or Service Role API key |
| `SUPABASE_BUCKET` | Name of the bucket (e.g., `nexus`) |
| `RESEND_API_KEY` | Resend API credential |
| `N8N_WEBHOOK_URL` | (Optional) n8n automation webhook URL |
| `SMTP_HOST` / `SMTP_PORT` | (Optional) Fallback SMTP details |
| `SMTP_USER` / `SMTP_PASSWORD`| (Optional) SMTP login details |
| `SMTP_FROM` | Sending sender address (e.g., `no-reply@yourdomain.com`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub Credentials |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | Apple Credentials |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary Credentials |
| `SENTRY_DSN` | Backend monitoring URL |

### Vercel Frontend Variables
| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | The public URL of the backend (e.g., `https://nexus-backend.up.railway.app`) |
| `VITE_BACKEND_URL` | Match `VITE_API_URL` |
| `VITE_SENTRY_DSN` | Frontend Sentry monitoring URL |

---

## 9. Health Check Guide

Monitor your backend service using these endpoints:

1. **Lightweight Health Check**: `/api/health`
   - Returns: `{"status": "ok", "service": "nexus-backend", "timestamp": "..."}`
   - Use this endpoint for Vercel `wait-on` scripts or CDN health checks.
2. **Deep System Probe**: `/status`
   - Performs a test query (`SELECT 1`) on PostgreSQL.
   - Returns: `{"status": "healthy", "database": "connected", "service": "nexus-backend", "timestamp": "..."}`
   - If PostgreSQL goes down, returns `"status": "unhealthy"` with `"database": "disconnected"`. Use for uptime alerts.

---

## 10. Troubleshooting Guide

### CORS Issues
- **Problem**: Frontend console logs `Access-Control-Allow-Origin` errors.
- **Solution**: Confirm that `APP_URL` on the Railway backend exactly matches your frontend Vercel URL (e.g. `https://nexus.vercel.app` without a trailing slash).

### OAuth HTTPS Failures
- **Problem**: Redirect URI errors or insecure protocol mismatch during OAuth.
- **Solution**: The backend automatically reads `x-forwarded-proto` and uses `https://` redirects. Ensure that the proxy load balancer headers are forwarded. Alternatively, explicitly set the `BACKEND_URL` environment variable on Railway to override headers (e.g. `BACKEND_URL=https://nexus-backend.up.railway.app`).

### Supabase Storage Upload Failures
- **Problem**: File uploads fail with 401 or 403.
- **Solution**: Ensure your Supabase bucket policy is set to **Public** and has **Select** and **Insert** permissions allowed for all users (or authenticated users depending on security guidelines). Ensure the `SUPABASE_KEY` provided is valid.
