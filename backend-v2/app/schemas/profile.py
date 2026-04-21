"""Profile-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel


class ProfileCreate(BaseModel):
    name: str


class ProfileUpdate(BaseModel):
    name: str


class ProfileOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
