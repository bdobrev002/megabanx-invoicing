"""Company-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    eik: str
    vat_number: str = ""
    address: str = ""
    mol: str = ""
    city: str = ""
    country: str = "България"
    phone: str = ""
    email: str = ""
    invoice_template: str = "modern"
    drive_purchases_folder_id: str = ""
    drive_purchases_folder_path: str = ""
    drive_sales_folder_id: str = ""
    drive_sales_folder_path: str = ""


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    eik: Optional[str] = None
    vat_number: Optional[str] = None
    address: Optional[str] = None
    mol: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    invoice_template: Optional[str] = None
    drive_purchases_folder_id: Optional[str] = None
    drive_purchases_folder_path: Optional[str] = None
    drive_sales_folder_id: Optional[str] = None
    drive_sales_folder_path: Optional[str] = None


class CompanyOut(BaseModel):
    id: str
    profile_id: str
    name: str
    eik: str
    vat_number: str
    address: str
    mol: str
    city: str = ""
    country: str = "България"
    phone: str = ""
    email: str = ""
    logo_path: str = ""
    invoice_template: str = "modern"
    drive_purchases_folder_id: str
    drive_purchases_folder_path: str
    drive_sales_folder_id: str
    drive_sales_folder_path: str
    created_at: datetime

    model_config = {"from_attributes": True}
