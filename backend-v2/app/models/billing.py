"""Billing and invoice usage models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Billing(Base):
    __tablename__ = "billing"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(50), default="free")  # free, starter, professional, enterprise
    invoices_limit: Mapped[int] = mapped_column(Integer, default=30)
    invoices_used: Mapped[int] = mapped_column(Integer, default=0)
    is_trial: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    subscription_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    subscription_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvoiceMonthlyUsage(Base):
    __tablename__ = "invoice_monthly_usage"
    __table_args__ = (UniqueConstraint("user_id", "year", "month"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0)
