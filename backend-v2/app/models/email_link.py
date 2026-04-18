"""Invoice email link model."""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InvoiceEmailLink(Base):
    __tablename__ = "invoice_email_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    pdf_path: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
