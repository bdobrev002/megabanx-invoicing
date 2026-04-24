"""Invoice, PendingInvoice, ApprovalToken, DuplicateRequest models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(500), default="")
    new_filename: Mapped[str] = mapped_column(String(500), default="")
    invoice_type: Mapped[str] = mapped_column(String(20), default="unknown")  # sale, purchase, unknown
    company_id: Mapped[str] = mapped_column(String(36), default="")
    company_name: Mapped[str] = mapped_column(String(255), default="")
    date: Mapped[str] = mapped_column(String(20), default="")
    issuer_name: Mapped[str] = mapped_column(String(255), default="")
    issuer_eik: Mapped[str] = mapped_column(String(20), default="")
    issuer_vat: Mapped[str] = mapped_column(String(20), default="")
    recipient_name: Mapped[str] = mapped_column(String(255), default="")
    recipient_eik: Mapped[str] = mapped_column(String(20), default="")
    recipient_vat: Mapped[str] = mapped_column(String(20), default="")
    invoice_number: Mapped[str] = mapped_column(String(50), default="")
    subtotal: Mapped[str] = mapped_column(String(50), default="")
    total_amount: Mapped[str] = mapped_column(String(50), default="")
    vat_amount: Mapped[str] = mapped_column(String(50), default="")
    destination_path: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="processed")
    # processed, unmatched, error, duplicate_pending
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # For status=duplicate_pending: the existing Invoice this one duplicates.
    # Resolution endpoint uses this to replace / keep_both / keep_existing.
    duplicate_of_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    cross_copy_status: Mapped[str] = mapped_column(String(30), default="none")
    # Possible values: none, no_subscriber, pending, approved, deleted_by_recipient
    cross_copied_from: Mapped[str] = mapped_column(String(255), default="")
    source_invoice_id: Mapped[str] = mapped_column(String(36), default="")  # Links cross-copied invoice back to source
    is_credit_note: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(20), default="scan")  # scan, software
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PendingInvoice(Base):
    __tablename__ = "pending_invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), default="")
    company_name: Mapped[str] = mapped_column(String(255), default="")
    original_filename: Mapped[str] = mapped_column(String(500), default="")
    new_filename: Mapped[str] = mapped_column(String(500), default="")
    invoice_type: Mapped[str] = mapped_column(String(20), default="unknown")
    date: Mapped[str] = mapped_column(String(20), default="")
    issuer_name: Mapped[str] = mapped_column(String(255), default="")
    recipient_name: Mapped[str] = mapped_column(String(255), default="")
    invoice_number: Mapped[str] = mapped_column(String(50), default="")
    pending_path: Mapped[str] = mapped_column(Text, default="")
    source_profile_id: Mapped[str] = mapped_column(String(36), default="")
    source_invoice_id: Mapped[str] = mapped_column(String(36), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApprovalToken(Base):
    __tablename__ = "approval_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pending_invoice_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DuplicateRequest(Base):
    __tablename__ = "duplicate_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), default="")
    keep_ids: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    remove_ids: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
