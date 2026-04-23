"""Invoice-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BatchDownloadRequest(BaseModel):
    files: list[dict]


class ResolveDuplicatesRequest(BaseModel):
    remove_ids: list[str]


class ApproveInvoicesRequest(BaseModel):
    invoice_ids: list[str]


class InvoiceOut(BaseModel):
    id: str
    profile_id: str
    original_filename: str
    new_filename: str
    invoice_type: str
    company_id: str
    company_name: str
    date: str
    issuer_name: str
    issuer_eik: str
    issuer_vat: str
    recipient_name: str
    recipient_eik: str
    recipient_vat: str
    invoice_number: str
    subtotal: str
    total_amount: str
    vat_amount: str
    status: str
    error_message: Optional[str]
    cross_copy_status: str
    cross_copied_from: str
    source_invoice_id: str
    is_credit_note: bool
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}
