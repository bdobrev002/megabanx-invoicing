"""Pydantic v2 request/response schemas."""

from app.schemas.auth import RegisterRequest, LoginRequest, VerifyCodeRequest
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileOut
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyOut
from app.schemas.invoice import (
    BatchDownloadRequest, ResolveDuplicatesRequest, ApproveInvoicesRequest,
    InvoiceOut,
)
from app.schemas.sharing import ShareCompanyRequest, UpdateShareRequest
from app.schemas.contact import ContactFormRequest
from app.schemas.invoicing import (
    ClientCreate, ClientUpdate, ClientOut,
    ItemCreate, ItemUpdate, ItemOut,
    StubCreate, StubUpdate, StubOut,
    InvoiceCreateSchema, InvoiceLineCreateSchema, InvoiceMetaOut,
    CompanySettingsUpdate, CompanySettingsOut,
    SyncSettingsUpdate, SyncSettingsOut,
)

__all__ = [
    "RegisterRequest", "LoginRequest", "VerifyCodeRequest",
    "ProfileCreate", "ProfileUpdate", "ProfileOut",
    "CompanyCreate", "CompanyUpdate", "CompanyOut",
    "BatchDownloadRequest", "ResolveDuplicatesRequest", "ApproveInvoicesRequest", "InvoiceOut",
    "ShareCompanyRequest", "UpdateShareRequest",
    "ContactFormRequest",
    "ClientCreate", "ClientUpdate", "ClientOut",
    "ItemCreate", "ItemUpdate", "ItemOut",
    "StubCreate", "StubUpdate", "StubOut",
    "InvoiceCreateSchema", "InvoiceLineCreateSchema", "InvoiceMetaOut",
    "CompanySettingsUpdate", "CompanySettingsOut",
    "SyncSettingsUpdate", "SyncSettingsOut",
]
