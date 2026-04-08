import uuid
from datetime import datetime
from pydantic import BaseModel


class ClientCreate(BaseModel):
    company_id: uuid.UUID
    name: str
    eik: str | None = None
    egn: str | None = None
    vat_number: str | None = None
    is_vat_registered: bool = False
    is_individual: bool = False
    mol: str | None = None
    city: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    eik: str | None = None
    egn: str | None = None
    vat_number: str | None = None
    is_vat_registered: bool | None = None
    is_individual: bool | None = None
    mol: str | None = None
    city: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    eik: str | None = None
    egn: str | None = None
    vat_number: str | None = None
    is_vat_registered: bool
    is_individual: bool
    mol: str | None = None
    city: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
