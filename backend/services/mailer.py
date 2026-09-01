from __future__ import annotations

import smtplib
from email.message import EmailMessage

from config import settings


def send_verification_email(*, recipient: str, name: str, otp: str) -> None:
    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")

    message = EmailMessage()
    message["Subject"] = f"{settings.app_name} verification code"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        f"Hello {name},\n\nYour InsightAI verification code is: {otp}\n\nIt expires in {settings.otp_expire_minutes} minutes.\n"
    )

    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    with smtp_class(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def send_reset_email(*, recipient: str, name: str, otp: str) -> None:
    """Send a password-reset OTP email."""
    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")

    message = EmailMessage()
    message["Subject"] = f"{settings.app_name} — password reset code"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        f"Hello {name},\n\n"
        f"We received a request to reset your InsightAI password.\n\n"
        f"Your password-reset code is: {otp}\n\n"
        f"It expires in {settings.otp_expire_minutes} minutes.\n\n"
        f"If you did not request this, please ignore this email — your password will not change.\n"
    )

    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    with smtp_class(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)

