"""Google Drive link model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DriveLink(Base):
    __tablename__ = "drive_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    folder_type: Mapped[str] = mapped_column(String(50), nullable=False)  # purchases, sales
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    drive_file_id: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
