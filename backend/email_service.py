import os
import smtplib
import urllib.request
import json as _json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from backend.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, N8N_WEBHOOK_URL


def _dispatch_n8n(payload: dict) -> bool:
    """
    Send email via n8n Webhook.
    Set N8N_WEBHOOK_URL in .env.local to enable:
      e.g. http://localhost:5678/webhook/nexus-email
    Payload shape:
      { "type": "welcome|forgot_password|password_changed",
        "to": "email", "name": "Full Name", "otp": "123456" }
    """
    if not N8N_WEBHOOK_URL:
        return False
    try:
        data = _json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            N8N_WEBHOOK_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            ok = resp.status in (200, 201, 202)
            if ok:
                print(f"[EMAIL ENGINE] n8n webhook delivered → {payload.get('to')}")
            return ok
    except Exception as e:
        print(f"[EMAIL ENGINE] n8n webhook failed: {e}")
        return False


# Responsive premium dark theme CSS template
EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      background-color: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #09090b;
      padding: 40px 0;
    }}
    .container {{
      max-width: 580px;
      margin: 0 auto;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }}
    .header {{
      background-color: #09090b;
      padding: 30px 40px;
      border-bottom: 1px solid #27272a;
      text-align: center;
    }}
    .logo-text {{
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 4px;
      color: #fafafa;
      margin: 0;
      text-transform: uppercase;
    }}
    .logo-accent {{
      color: #06b6d4;
    }}
    .content {{
      padding: 40px;
      line-height: 1.6;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 20px;
      color: #fafafa;
    }}
    p {{
      font-size: 14px;
      color: #a1a1aa;
      margin-top: 0;
      margin-bottom: 24px;
    }}
    .otp-card {{
      background: rgba(6, 182, 212, 0.05);
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 28px;
    }}
    .otp-code {{
      font-family: "Courier New", Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #06b6d4;
      margin: 0;
      text-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
    }}
    .btn {{
      display: inline-block;
      background-color: #fafafa;
      color: #09090b;
      text-decoration: none;
      padding: 12px 28px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      margin-bottom: 28px;
      text-align: center;
    }}
    .btn:hover {{
      opacity: 0.9;
    }}
    .footer {{
      background-color: #09090b;
      padding: 28px 40px;
      border-top: 1px solid #27272a;
      text-align: center;
    }}
    .footer-text {{
      font-size: 11px;
      color: #71717a;
      line-height: 1.5;
      margin: 0;
    }}
    .footer-link {{
      color: #06b6d4;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h2 class="logo-text">NEX<span class="logo-accent">US</span></h2>
      </div>
      <div class="content">
        {body_content}
      </div>
      <div class="footer">
        <p class="footer-text">
          This is an automated transmission from the Nexus Conference Matrix. <br />
          If you did not initiate this handshake, please ignore this signal.
        </p>
        <p class="footer-text" style="margin-top: 12px;">
          Need assistance? Link with our operators at <a href="mailto:support@nexus.app" class="footer-link">support@nexus.app</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
"""

def send_email(to_email: str, subject: str, title: str, html_body: str) -> bool:
    """
    Sends an HTML email to the specified user. 
    If SMTP host credentials are not configured, it fallback logs the details to stdout.
    """
    html_content = EMAIL_TEMPLATE.format(title=title, body_content=html_body)

    # Logging fallback for debugging
    print(f"====== [NEXUS EMAIL DISPATCH] ======")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Title: {title}")
    # Extract clean text from HTML body elements for summary printing
    clean_print = html_body.replace("<br />", "\n").replace("</p>", "\n").replace("<p>", "").replace("<strong>", "").replace("</strong>", "")
    print(f"Body:\n{clean_print}")
    print(f"=====================================")

    # If configuration is missing, consider successful simulation print
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print("[EMAIL ENGINE] SMTP host details missing in environment. Logged details above.")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        msg.attach(MIMEText(html_content, "html"))

        # Setup SMTP Server
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())
        server.quit()
        print("[EMAIL ENGINE] Email dispatched successfully via SMTP.")
        return True
    except Exception as e:
        print(f"[EMAIL ENGINE] Failed to deliver email via SMTP: {e}")
        return False

def send_welcome_email(to_email: str, name: str, otp: str) -> bool:
    # Try n8n webhook first (fastest for development with n8n running locally)
    if _dispatch_n8n({"type": "welcome", "to": to_email, "name": name, "otp": otp}):
        return True
    # Fallback to SMTP / stdout
    body = f"""
    <h1>Welcome to Nexus, {name}</h1>
    <p>Your communication node setup is almost complete. To verify your email and activate your access privileges, enter the following 6-digit verification code:</p>
    <div class="otp-card">
      <h3 class="otp-code">{otp}</h3>
    </div>
    <p>This verification link is active for <strong>10 minutes</strong>. If the countdown expires before verification is complete, you can request a new signal code directly from the registration portal.</p>
    """
    return send_email(
        to_email=to_email,
        subject="Activate Your Nexus Node",
        title="Activate Your Nexus Node",
        html_body=body
    )

def send_forgot_password_email(to_email: str, name: str, otp: str) -> bool:
    if _dispatch_n8n({"type": "forgot_password", "to": to_email, "name": name, "otp": otp}):
        return True
    body = f"""
    <h1>Password Reset Request</h1>
    <p>A signal handshake was received requesting a password override on your Nexus profile. Enter the recovery key below to unlock the credential editor:</p>
    <div class="otp-card">
      <h3 class="otp-code">{otp}</h3>
    </div>
    <p>This recovery channel is open for <strong>10 minutes</strong>. If you did not trigger this request, please link immediately with support and adjust your node parameters.</p>
    """
    return send_email(
        to_email=to_email,
        subject="Nexus Password Recovery Signal",
        title="Nexus Password Recovery",
        html_body=body
    )

def send_password_changed_email(to_email: str, name: str) -> bool:
    if _dispatch_n8n({"type": "password_changed", "to": to_email, "name": name}):
        return True
    body = f"""
    <h1>Security Alert: Credentials Modified</h1>
    <p>Hello {name},</p>
    <p>This is to confirm that the security keys/password for your Nexus account have been updated successfully.</p>
    <p>Any previous active browser session tokens and authorization handshakes have been invalidated globally for your account.</p>
    <p>If you did not authorize this key change, please lock your node settings and contact support immediately.</p>
    """
    return send_email(
        to_email=to_email,
        subject="Security Notice: Nexus Password Updated",
        title="Nexus Credentials Updated",
        html_body=body
    )

from backend.config import APP_URL

def send_meeting_invitation_email(to_email: str, invitee_name: str, host_name: str, room_code: str, meeting_time: str) -> bool:
    if _dispatch_n8n({
        "type": "meeting_invitation",
        "to": to_email,
        "inviteeName": invitee_name,
        "hostName": host_name,
        "roomCode": room_code,
        "meetingTime": meeting_time
    }):
        return True
    body = f"""
    <h1>Meeting Invitation</h1>
    <p>Hello {invitee_name},</p>
    <p><strong>{host_name}</strong> has invited you to join a secure Nexus meeting room.</p>
    <div class="otp-card">
      <h3 class="otp-code" style="font-size:24px; letter-spacing: 2px;">{room_code}</h3>
    </div>
    <p>Scheduled Time: <strong>{meeting_time}</strong></p>
    <p>To join the conference matrix, navigate to your dashboard or use the link below:</p>
    <p><a href="{APP_URL}/meeting/{room_code}" class="btn" style="color:#09090b;">Join Meeting</a></p>
    """
    return send_email(
        to_email=to_email,
        subject=f"Nexus Meeting Invitation from {host_name}",
        title="Meeting Invitation",
        html_body=body
    )

def send_meeting_reminder_email(to_email: str, name: str, room_code: str, meeting_time: str) -> bool:
    if _dispatch_n8n({
        "type": "meeting_reminder",
        "to": to_email,
        "name": name,
        "roomCode": room_code,
        "meetingTime": meeting_time
    }):
        return True
    body = f"""
    <h1>Meeting Reminder</h1>
    <p>Hello {name},</p>
    <p>This is a reminder that your scheduled Nexus conference session is starting soon.</p>
    <div class="otp-card">
      <h3 class="otp-code" style="font-size:24px; letter-spacing: 2px;">{room_code}</h3>
    </div>
    <p>Scheduled Time: <strong>{meeting_time}</strong></p>
    <p><a href="{APP_URL}/meeting/{room_code}" class="btn" style="color:#09090b;">Join Session</a></p>
    """
    return send_email(
        to_email=to_email,
        subject="Reminder: Nexus Meeting Starting Soon",
        title="Meeting Reminder",
        html_body=body
    )

def send_recording_ready_email(to_email: str, name: str, room_code: str, recording_url: str) -> bool:
    if _dispatch_n8n({
        "type": "recording_ready",
        "to": to_email,
        "name": name,
        "roomCode": room_code,
        "recordingUrl": f"{APP_URL}{recording_url}" if recording_url.startswith("/") else recording_url
    }):
        return True
    full_url = f"{APP_URL}{recording_url}" if recording_url.startswith("/") else recording_url
    body = f"""
    <h1>Recording Ready</h1>
    <p>Hello {name},</p>
    <p>The audio/video stream capture for meeting room <strong>{room_code}</strong> has been successfully processed and is ready for playback.</p>
    <p><a href="{full_url}" class="btn" style="color:#09090b;">Access Recording</a></p>
    <p>Alternatively, copy this link to your browser: <br /><code>{full_url}</code></p>
    """
    return send_email(
        to_email=to_email,
        subject=f"Recording Ready: Room {room_code}",
        title="Recording Processed",
        html_body=body
    )

def send_ai_summary_email(to_email: str, name: str, room_code: str, summary: str, action_items: list) -> bool:
    if _dispatch_n8n({
        "type": "ai_summary",
        "to": to_email,
        "name": name,
        "roomCode": room_code,
        "summary": summary,
        "actionItems": action_items
    }):
        return True
    
    items_html = ""
    if action_items:
        items_html = "<h3>Action Items:</h3><ul>"
        for item in action_items:
            text = item.get("text", "")
            assignee = item.get("assignee", "Unassigned")
            items_html += f"<li><strong>{assignee}</strong>: {text}</li>"
        items_html += "</ul>"
        
    body = f"""
    <h1>AI Meeting Summary</h1>
    <p>Hello {name},</p>
    <p>Your AI Copilot has compiled a structured summary and action roadmap for meeting <strong>{room_code}</strong>:</p>
    <div style="background: rgba(255,255,255,0.03); border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin-top:0; color:#fafafa;"><strong>Summary:</strong></p>
      <p style="color:#a1a1aa; font-size:13px; line-height:1.6;">{summary}</p>
      {items_html}
    </div>
    <p><a href="{APP_URL}/history" class="btn" style="color:#09090b;">View History Panel</a></p>
    """
    return send_email(
        to_email=to_email,
        subject=f"AI Meeting Summary: Room {room_code}",
        title="AI Copilot Report",
        html_body=body
    )

def send_contact_form_email(name: str, email: str, subject: str, message: str) -> bool:
    if _dispatch_n8n({
        "type": "contact_form",
        "to": SMTP_FROM,
        "name": name,
        "email": email,
        "subject": subject,
        "message": message
    }):
        return True
    body = f"""
    <h1>New Contact Form Submission</h1>
    <p><strong>Name:</strong> {name}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Subject:</strong> {subject}</p>
    <p><strong>Message:</strong></p>
    <div style="background: rgba(255,255,255,0.03); border: 1px solid #27272a; border-radius: 8px; padding: 20px;">
      <p style="margin:0; color:#a1a1aa; font-size:13px; line-height:1.6; white-space: pre-wrap;">{message}</p>
    </div>
    """
    return send_email(
        to_email=SMTP_FROM,
        subject=f"Contact Form: {subject}",
        title="Contact Form Submission",
        html_body=body
    )

def send_security_alert_email(to_email: str, name: str, alert_type: str, alert_details: str) -> bool:
    if _dispatch_n8n({
        "type": "security_alert",
        "to": to_email,
        "name": name,
        "alertType": alert_type,
        "alertDetails": alert_details
    }):
        return True
    
    subject = "Security Notice: Nexus Node Alert"
    if alert_type == "new_login":
        subject = "Security Notice: New Login Detected"
    elif alert_type == "password_changed":
        subject = "Security Notice: Password Override Completed"
        
    body = f"""
    <h1>Security Alert</h1>
    <p>Hello {name},</p>
    <p>This is an automated transmission regarding security developments on your Nexus node:</p>
    <div class="otp-card" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); text-align: left; padding: 18px;">
      <p style="color:#ef4444; font-weight:bold; margin-top:0;">Alert: {alert_type.replace('_', ' ').upper()}</p>
      <p style="color:#a1a1aa; font-size:13px; margin-bottom:0;">{alert_details}</p>
    </div>
    <p>If you did not execute this handshake, link immediately with support and adjust your credentials settings.</p>
    """
    return send_email(
        to_email=to_email,
        subject=subject,
        title="Security Alert",
        html_body=body
    )

