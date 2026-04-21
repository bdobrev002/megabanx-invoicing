"""Pydantic v2 request/response schemas."""

from app.schemas.auth import LoginRequest, RegisterRequest, VerifyCodeRequest
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate
from app.schemas.contact import ContactFormRequest
from app.schemas.invoice import (
    ApproveInvoicesRequest,
    BatchDownloadRequest,
    InvoiceOut,
    ResolveDuplicatesRequest,
)
from app.schemas.invoicing import (
    ClientCreate,
    ClientOut,
    ClientUpdate,
    CompanySettingsOut,
    CompanySettingsUpdate,
    InvoiceCreateSchema,
    InvoiceLineCreateSchema,
    InvoiceMetaOut,
    ItemCreate,
    ItemOut,
    ItemUpdate,
    StubCreate,
    StubOut,
    StubUpdate,
    SyncSettingsOut,
    SyncSettingsUpdate,
)
from app.schemas.profile import ProfileCreate, ProfileOut, ProfileUpdate
from app.schemas.sharing import ShareCompanyRequest, UpdateShareRequest

__all__ = [
    "RegisterRequest",
    "LoginRequest",
    "VerifyCodeRequest",
    "ProfileCreate",
    "ProfileUpdate",
    "ProfileOut",
    "CompanyCreate",
    "CompanyUpdate",
    "CompanyOut",
    "BatchDownloadRequest",
    "ResolveDuplicatesRequest",
    "ApproveInvoicesRequest",
    "InvoiceOut",
    "ShareCompanyRequest",
    "UpdateShareRequest",
    "ContactFormRequest",
    "ClientCreate",
    "ClientUpdate",
    "ClientOut",
    "ItemCreate",
    "ItemUpdate",
    "ItemOut",
    "StubCreate",
    "StubUpdate",
    "StubOut",
    "InvoiceCreateSchema",
    "InvoiceLineCreateSchema",
    "InvoiceMetaOut",
    "CompanySettingsUpdate",
    "CompanySettingsOut",
    "SyncSettingsUpdate",
    "SyncSettingsOut",
]
