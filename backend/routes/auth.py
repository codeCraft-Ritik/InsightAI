from __future__ import annotations

import logging
from typing import Any

from config import settings

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database.mongo_users import (
    create_or_refresh_pending_user,
    generate_otp,
    get_user_by_email,
    get_user_by_id,
    resend_verification_code,
    reset_user_password,
    serialize_user,
    store_reset_otp,
    update_last_login,
    verify_user_account,
    verify_reset_otp as _verify_reset_otp_logic,
)
from models.user import (
    EmailRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    OtpVerificationRequest,
    ResetPasswordRequest,
    SignupRequest,
    SignupResponse,
    TokenResponse,
    UserResponse,
    VerifyResetOtpRequest,
)
from services.mailer import send_reset_email, send_verification_email
from services.security import create_access_token, decode_access_token, hash_password, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


def _require_user_record(email: str) -> dict[str, Any]:
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return user


def _build_user_response(record: dict[str, Any] | None) -> UserResponse:
    user = serialize_user(record)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(**user)


def _issue_token(record: dict[str, Any]) -> TokenResponse:
    user = serialize_user(record)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    token = create_access_token({"sub": user["id"], "email": user["email"], "name": user["name"]})
    return TokenResponse(access_token=token, user=UserResponse(**user))


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication payload")
    user = get_user_by_id(str(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user_data = serialize_user(user)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user_data


def verify_access_token(token: str) -> dict[str, Any]:
    """Verify a raw JWT string (used when token is passed as a query param)."""
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = get_user_by_id(str(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user_data = serialize_user(user)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user_data


@router.post("/signup", response_model=SignupResponse)
def signup(payload: SignupRequest) -> SignupResponse:
    try:
        otp = generate_otp()
        record = create_or_refresh_pending_user(
            name=payload.name,
            age=payload.age,
            gender=payload.gender,
            email=payload.email,
            location=payload.location,
            password_hash=hash_password(payload.password),
            otp=otp,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    email_sent = False
    try:
        send_verification_email(recipient=payload.email.strip(), name=payload.name.strip(), otp=otp)
        email_sent = True
    except Exception as exc:
        logger.error(f"Email delivery error to {payload.email}: {exc}")
        email_sent = False

    return SignupResponse(
        message="Verification code ready! Enter the code below or click Auto-Fill to activate your account.",
        email=payload.email.strip().lower(),
        otp_code=otp,
    )


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: OtpVerificationRequest) -> TokenResponse:
    try:
        record = verify_user_account(payload.email, payload.otp)
    except ValueError as exc:
        message = str(exc)
        code = status.HTTP_400_BAD_REQUEST if "expired" in message.lower() or "invalid" in message.lower() else status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=code, detail=message) from exc
    return _issue_token(record)


@router.post("/resend-otp", response_model=SignupResponse)
def resend_otp(payload: EmailRequest) -> SignupResponse:
    record = _require_user_record(payload.email)
    if bool(record.get("verified")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is already verified")
    otp = generate_otp()
    try:
        resend_verification_code(payload.email, otp)
        send_verification_email(recipient=payload.email.strip(), name=str(record.get("name", "there")), otp=otp)
    except Exception as exc:
        logger.error(f"Resend email error to {payload.email}: {exc}")

    return SignupResponse(
        message="A new 6-digit verification code has been generated.",
        email=payload.email.strip().lower(),
        otp_code=otp,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = get_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not bool(user.get("verified")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your account with the OTP sent to your email.")
    if not verify_password(payload.password, str(user["password_hash"])):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    update_last_login(str(user["_id"]))
    return _issue_token(get_user_by_email(payload.email) or user)


@router.get("/me", response_model=UserResponse)
def me(current_user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    return UserResponse(**current_user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest) -> MessageResponse:
    """Step 1: Request a password-reset OTP — always returns 200 to prevent email enumeration."""
    user = get_user_by_email(payload.email)
    if user and user.get("verified"):
        otp = generate_otp()
        try:
            store_reset_otp(payload.email, otp)
            name = str(user.get("name", "there"))
            send_reset_email(recipient=payload.email.strip(), name=name, otp=otp)
        except Exception as exc:
            logger.error(f"Failed to send reset email to {payload.email}: {exc}")
    return MessageResponse(message="If an account with that email exists, a password-reset code has been sent.")


@router.post("/verify-reset-otp", response_model=MessageResponse)
def verify_reset_otp_endpoint(payload: VerifyResetOtpRequest) -> MessageResponse:
    """Step 2: Validate the reset OTP (without changing password yet)."""
    try:
        _verify_reset_otp_logic(payload.email, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Code verified. You may now set a new password.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    """Step 3: Set a new password after OTP verification."""
    try:
        reset_user_password(payload.email, payload.otp, hash_password(payload.new_password))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password updated successfully. You can now sign in with your new password.")
