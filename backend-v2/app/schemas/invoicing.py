"""Invoicing module Pydantic schemas (clients, items, stubs, invoices, settings, sync)."""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


# --- Client ---
class ClientCreate(BaseModel):
    company_id: str
    profile_id: str
    name: str
    eik: Optional[str] = None
    egn: Optional[str] = None
    vat_number: Optional[str] = None
    is_vat_registered: bool = False
    is_individual: bool = False
    mol: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    eik: Optional[str] = None
    egn: Optional[str] = None
    vat_number: Optional[str] = None
    is_vat_registered: Optional[bool] = None
    is_individual: Optional[bool] = None
    mol: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ClientOut(BaseModel):
    id: str
    company_id: str
    profile_id: str
    name: str
    eik: Optional[str]
    egn: Optional[str]
    vat_number: Optional[str]
    is_vat_registered: bool
    is_individual: bool
    mol: Optional[str]
    city: Optional[str]
    address: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Item ---
class ItemCreate(BaseModel):
    company_id: str
    profile_id: str
    name: str
    unit: str = "\u0431\u0440."
    default_price: float = 0.00
    vat_rate: float = 20.00
    description: Optional[str] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    default_price: Optional[float] = None
    vat_rate: Optional[float] = None
    description: Optional[str] = None


class ItemOut(BaseModel):
    id: str
    company_id: str
    profile_id: str
    name: str
    unit: str
    default_price: Decimal
    vat_rate: Decimal
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Stub ---
class StubCreate(BaseModel):
    company_id: str
    profile_id: str
    name: str
    start_number: int = 1
    end_number: int = 1000000
    next_number: Optional[int] = None


class StubUpdate(BaseModel):
    name: Optional[str] = None
    start_number: Optional[int] = None
    end_number: Optional[int] = None
    next_number: Optional[int] = None


class StubOut(BaseModel):
    id: str
    company_id: str
    profile_id: str
    name: str
    start_number: int
    end_number: int
    next_number: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Invoice Meta ---
class InvoiceLineCreateSchema(BaseModel):
    item_id: Optional[str] = None
    position: Optional[int] = None
    description: str
    quantity: float = 1.0
    unit: str = "\u0431\u0440."
    unit_price: float = 0.00
    vat_rate: float = 20.00


class InvoiceCreateSchema(BaseModel):
    company_id: str
    profile_id: str
    client_id: str
    document_type: str = "invoice"
    invoice_number: Optional[int] = None
    stub_id: Optional[str] = None
    issue_date: Optional[str] = None
    tax_event_date: Optional[str] = None
    due_date: Optional[str] = None
    vat_rate: float = 20.00
    no_vat: bool = False
    no_vat_reason: Optional[str] = None
    discount: float = 0.00
    discount_type: str = "EUR"
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    currency: str = "EUR"
    status: str = "issued"
    composed_by: Optional[str] = None
    lines: list[InvoiceLineCreateSchema] = []


class InvoiceMetaOut(BaseModel):
    id: str
    invoice_id: str
    company_id: str
    profile_id: str
    client_id: Optional[str]
    document_type: str
    invoice_number: Optional[int]
    issue_date: Optional[date]
    tax_event_date: Optional[date]
    due_date: Optional[date]
    subtotal: Decimal
    discount: Decimal
    vat_amount: Decimal
    total: Decimal
    vat_rate: Decimal
    no_vat: bool
    no_vat_reason: Optional[str]
    payment_method: Optional[str]
    notes: Optional[str]
    internal_notes: Optional[str]
    currency: str
    pdf_path: Optional[str]
    sync_status: str
    status: str
    composed_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Company Settings ---
class CompanySettingsUpdate(BaseModel):
    iban: Optional[str] = None
    bank_name: Optional[str] = None
    bic: Optional[str] = None
    default_vat_rate: Optional[float] = None


class CompanySettingsOut(BaseModel):
    id: str
    company_id: str
    profile_id: str
    iban: Optional[str]
    bank_name: Optional[str]
    bic: Optional[str]
    default_vat_rate: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Sync Settings ---
class SyncSettingsUpdate(BaseModel):
    sync_mode: str = "manual"
    delay_minutes: int = 0


class SyncSettingsOut(BaseModel):
    id: str
    company_id: str
    profile_id: str
    sync_mode: str
    delay_minutes: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
