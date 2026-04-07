import uuid
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel

from app.models.invoice import DocumentType, InvoiceStatus


class InvoiceLineCreate(BaseModel):
    item_id: uuid.UUID | None = None
    position: int = 0
    description: str
    quantity: Decimal = Decimal("1.000")
    unit: str = "бр."
    unit_price: Decimal = Decimal("0.00")
    vat_rate: Decimal = Decimal("20.00")


class InvoiceLineResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    item_id: uuid.UUID | None = None
    position: int
    description: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    vat_rate: Decimal
    line_total: Decimal

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    company_id: uuid.UUID
    client_id: uuid.UUID
    document_type: DocumentType = DocumentType.INVOICE
    invoice_number: int | None = None  # auto-generated if not provided
    issue_date: date | None = None
    tax_event_date: date | None = None
    due_date: date | None = None
    status: InvoiceStatus = InvoiceStatus.ISSUED
    vat_rate: Decimal = Decimal("20.00")
    no_vat: bool = False
    no_vat_reason: str | None = None
    payment_method: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    currency: str = "EUR"
    lines: list[InvoiceLineCreate] = []


class InvoiceUpdate(BaseModel):
    client_id: uuid.UUID | None = None
    document_type: DocumentType | None = None
    invoice_number: int | None = None
    issue_date: date | None = None
    tax_event_date: date | None = None
    due_date: date | None = None
    status: InvoiceStatus | None = None
    vat_rate: Decimal | None = None
    no_vat: bool | None = None
    no_vat_reason: str | None = None
    payment_method: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    currency: str | None = None
    lines: list[InvoiceLineCreate] | None = None


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    client_id: uuid.UUID
    document_type: str
    invoice_number: int
    issue_date: date
    tax_event_date: date
    due_date: date | None = None
    status: str
    subtotal: Decimal
    vat_amount: Decimal
    total: Decimal
    vat_rate: Decimal
    no_vat: bool
    no_vat_reason: str | None = None
    payment_method: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    currency: str
    pdf_path: str | None = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    lines: list[InvoiceLineResponse] = []
    client_name: str | None = None
    company_name: str | None = None

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    invoices: list[InvoiceResponse]
    total: int
    page: int
    page_size: int


class InvoiceSendEmail(BaseModel):
    recipient_email: str
    subject: str | None = None
    message: str | None = None
