from typing import Literal

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    email: str
    location: str
    verified: bool


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    age: int = Field(..., ge=13, le=120)
    gender: Literal["Male", "Female", "Other"]
    email: str = Field(..., min_length=3)
    location: str = Field(..., min_length=2)
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


class EmailRequest(BaseModel):
    email: str = Field(..., min_length=3)


class OtpVerificationRequest(BaseModel):
    email: str = Field(..., min_length=3)
    otp: str = Field(..., min_length=6, max_length=6)


class SignupResponse(BaseModel):
    message: str
    email: str
    verification_required: bool = True
    otp_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3)


class VerifyResetOtpRequest(BaseModel):
    email: str = Field(..., min_length=3)
    otp: str = Field(..., min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3)
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str
