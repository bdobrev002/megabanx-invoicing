import uuid
from datetime import datetime
from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    eik: str
    vat_number: str | None = None
    is_vat_registered: bool = False
    mol: str | None = None
    city: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    iban: str | None = None
    bank_name: str | None = None
    bic: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = None
    eik: str | None = None
    vat_number: str | None = None
    is_vat_registered: bool | None = None
    mol: str | None = None
    city: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    iban: str | None = None
    bank_name: str | None = None
    bic: str | None = None


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    eik: str
    vat_number: str | None = None
    is_vat_registered: bool
    mol: str | None = None
    city: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    iban: str | None = None
    bank_name: str | None = None
    bic: str | None = None
    logo_path: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
