from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings

logger = logging.getLogger(__name__)


def _send_email_smtp(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        logger.error("SMTP credentials are not configured. Cannot send email.")
        raise RuntimeError("Email service is not configured on the server.")

    from_email = settings.smtp_from_email or settings.smtp_username
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.app_name} <{from_email}>"
    msg["To"] = to_email

    part1 = MIMEText(text_body, "plain", "utf-8")
    part2 = MIMEText(html_body, "html", "utf-8")
    msg.attach(part1)
    msg.attach(part2)

    # Auto-detect SSL (465) vs STARTTLS (587 / 25)
    use_ssl = settings.smtp_use_ssl or settings.smtp_port == 465

    if use_ssl:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(from_email, [to_email], msg.as_string())
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls or settings.smtp_port == 587:
                server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(from_email, [to_email], msg.as_string())

    logger.info(f"Successfully sent email to {to_email}")


def send_verification_email(*, recipient: str, name: str, otp: str) -> None:
    subject = f"{otp} is your {settings.app_name} verification code"
    text_body = (
        f"Hello {name},\n\n"
        f"Welcome to InsightAI! Your 6-digit verification code is: {otp}\n\n"
        f"This code will expire in {settings.otp_expire_minutes} minutes.\n\n"
        "If you did not request this, please ignore this email."
    )
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; padding: 20px; }}
            .card {{ max-width: 500px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; text-align: center; }}
            .brand {{ font-size: 24px; font-weight: 700; color: #58a6ff; margin-bottom: 20px; }}
            .title {{ font-size: 20px; font-weight: 600; color: #f0f6fc; margin-bottom: 12px; }}
            .desc {{ font-size: 14px; color: #8b949e; line-height: 1.6; margin-bottom: 28px; }}
            .otp-box {{ display: inline-block; background: #21262d; border: 2px solid #388bfd; border-radius: 10px; padding: 16px 32px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #58a6ff; margin-bottom: 28px; }}
            .footer {{ font-size: 12px; color: #6e7681; margin-top: 24px; border-top: 1px solid #21262d; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="brand">✨ InsightAI</div>
            <div class="title">Verify Your Account</div>
            <div class="desc">Hello <strong>{name}</strong>,<br>Use the 6-digit verification code below to activate your InsightAI account:</div>
            <div class="otp-box">{otp}</div>
            <div class="desc">This code expires in <strong>{settings.otp_expire_minutes} minutes</strong>. Do not share this code with anyone.</div>
            <div class="footer">Autonomous Data Intelligence & ML Platform &bull; InsightAI</div>
        </div>
    </body>
    </html>
    """
    _send_email_smtp(recipient, subject, text_body, html_body)


def send_reset_email(*, recipient: str, name: str, otp: str) -> None:
    subject = f"{otp} is your {settings.app_name} password reset code"
    text_body = (
        f"Hello {name},\n\n"
        f"We received a request to reset your InsightAI password. Your reset code is: {otp}\n\n"
        f"This code will expire in {settings.otp_expire_minutes} minutes.\n\n"
        "If you did not request this, please ignore this email — your password will not change."
    )
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; padding: 20px; }}
            .card {{ max-width: 500px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; text-align: center; }}
            .brand {{ font-size: 24px; font-weight: 700; color: #f778ba; margin-bottom: 20px; }}
            .title {{ font-size: 20px; font-weight: 600; color: #f0f6fc; margin-bottom: 12px; }}
            .desc {{ font-size: 14px; color: #8b949e; line-height: 1.6; margin-bottom: 28px; }}
            .otp-box {{ display: inline-block; background: #21262d; border: 2px solid #f778ba; border-radius: 10px; padding: 16px 32px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ff7b72; margin-bottom: 28px; }}
            .footer {{ font-size: 12px; color: #6e7681; margin-top: 24px; border-top: 1px solid #21262d; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="brand">🔒 InsightAI Security</div>
            <div class="title">Password Reset Request</div>
            <div class="desc">Hello <strong>{name}</strong>,<br>We received a request to reset your password. Use the code below:</div>
            <div class="otp-box">{otp}</div>
            <div class="desc">This code expires in <strong>{settings.otp_expire_minutes} minutes</strong>. If you did not make this request, you can safely ignore this email.</div>
            <div class="footer">Autonomous Data Intelligence & ML Platform &bull; InsightAI</div>
        </div>
    </body>
    </html>
    """
    _send_email_smtp(recipient, subject, text_body, html_body)
