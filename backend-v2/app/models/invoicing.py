"""Invoicing module models (clients, items, stubs, invoices, settings, sync)."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InvClient(Base):
    __tablename__ = "inv_clients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    eik: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    egn: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vat_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_vat_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    is_individual: Mapped[bool] = mapped_column(Boolean, default=False)
    mol: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvItem(Base):
    __tablename__ = "inv_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), default="\u0431\u0440.")
    default_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("20.00"))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvStub(Base):
    __tablename__ = "inv_stubs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_number: Mapped[int] = mapped_column(Integer, default=1)
    end_number: Mapped[int] = mapped_column(Integer, default=1000000)
    next_number: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvCompanySettings(Base):
    __tablename__ = "inv_company_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False)
    iban: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bic: Mapped[str | None] = mapped_column(String(20), nullable=True)
    default_vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("20.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvInvoiceMeta(Base):
    __tablename__ = "inv_invoice_meta"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    client_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    document_type: Mapped[str] = mapped_column(String(20), default="invoice")  # invoice, credit_note, debit_note, proforma
    invoice_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tax_event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    vat_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("20.00"))
    no_vat: Mapped[bool] = mapped_column(Boolean, default=False)
    no_vat_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="EUR")
    pdf_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    sync_status: Mapped[str] = mapped_column(String(20), default="pending")
    status: Mapped[str] = mapped_column(String(20), default="issued")  # draft, issued
    # cross_copy_status values: none, pending, approved, no_subscriber, deleted_by_recipient
    cross_copy_status: Mapped[str] = mapped_column(String(30), default="none")
    # tracks cross-copy link back to the source issued invoice
    source_invoice_id: Mapped[str] = mapped_column(String(36), default="")
    composed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Stage 6B: optional per-invoice template override (NULL = use company default).
    template_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvInvoiceLine(Base):
    __tablename__ = "inv_invoice_lines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    item_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=Decimal("1.000"))
    unit: Mapped[str] = mapped_column(String(50), default="\u0431\u0440.")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("20.00"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InvEmailTemplate(Base):
    """Per-company email template used when sending invoices to clients.

    ``body`` supports merge fields interpolated via :func:`str.format_map`:
    ``{invoice_number}``, ``{issue_date}``, ``{due_date}``, ``{total}``,
    ``{currency}``, ``{client_name}``, ``{company_name}``, ``{issuer_name}``.
    """

    __tablename__ = "inv_email_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    attach_pdf: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvEmailLog(Base):
    """Audit row for every invoice email dispatched through the system."""

    __tablename__ = "inv_email_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    template_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    to_email: Mapped[str] = mapped_column(String(500), nullable=False)
    cc_emails: Mapped[str | None] = mapped_column(Text, nullable=True)
    bcc_emails: Mapped[str | None] = mapped_column(Text, nullable=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    attached_pdf: Mapped[bool] = mapped_column(Boolean, default=False)
    message_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # delivery_status values: queued, sent, failed
    delivery_status: Mapped[str] = mapped_column(String(20), default="queued")
    delivery_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    open_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InvBankAccount(Base):
    """One of many bank accounts a company can expose on invoices."""

    __tablename__ = "inv_bank_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    iban: Mapped[str] = mapped_column(String(50), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(255), default="")
    bic: Mapped[str] = mapped_column(String(20), default="")
    currency: Mapped[str] = mapped_column(String(10), default="BGN")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvSyncSettings(Base):
    __tablename__ = "inv_sync_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    profile_id: Mapped[str] = mapped_column(String(36), nullable=False)
    sync_mode: Mapped[str] = mapped_column(String(20), default="manual")  # immediate, delayed, manual
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
