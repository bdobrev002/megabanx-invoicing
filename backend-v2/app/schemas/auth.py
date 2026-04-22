"""Auth-related Pydantic schemas."""

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    tos_accepted: bool = False


class LoginRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class ProfileUpdateRequest(BaseModel):
    """Update the current user's own name (editable without OTP)."""

    name: str
