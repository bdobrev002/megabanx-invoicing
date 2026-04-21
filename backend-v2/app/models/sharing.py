"""Company sharing model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CompanyShare(Base):
    __tablename__ = "company_shares"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    owner_user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), default="")
    company_eik: Mapped[str] = mapped_column(String(20), default="")
    shared_with_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    shared_with_user_id: Mapped[str] = mapped_column(String(36), default="")
    can_upload: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
