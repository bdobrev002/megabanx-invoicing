"""Sharing-related Pydantic schemas."""

from pydantic import BaseModel, EmailStr


class ShareCompanyRequest(BaseModel):
    email: EmailStr
    can_upload: bool = False


class UpdateShareRequest(BaseModel):
    can_upload: bool
