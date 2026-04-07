import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class ItemCreate(BaseModel):
    company_id: uuid.UUID
    name: str
    unit: str = "бр."
    default_price: Decimal = Decimal("0.00")
    vat_rate: Decimal = Decimal("20.00")
    description: str | None = None


class ItemUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    default_price: Decimal | None = None
    vat_rate: Decimal | None = None
    description: str | None = None


class ItemResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    unit: str
    default_price: Decimal
    vat_rate: Decimal
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
