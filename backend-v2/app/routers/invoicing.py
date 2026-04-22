"""Invoicing module router: clients, items, stubs, invoices, settings, sync."""

import os
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.invoicing import (
    InvBankAccount,
    InvClient,
    InvCompanySettings,
    InvEmailLog,
    InvEmailTemplate,
    InvInvoiceLine,
    InvInvoiceMeta,
    InvItem,
    InvStub,
    InvSyncSettings,
)
from app.models.notification import Notification
from app.models.user import User
from app.schemas.invoicing import (
    BankAccountCreate,
    BankAccountOut,
    BankAccountUpdate,
    ClientCreate,
    ClientOut,
    ClientUpdate,
    CompanySettingsOut,
    CompanySettingsUpdate,
    EmailTemplateCreate,
    EmailTemplateOut,
    EmailTemplateUpdate,
    InvoiceCreateSchema,
    InvoiceEmailLogOut,
    InvoiceEmailSendRequest,
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
from app.services.eik_lookup import lookup_eik
from app.services.email_service import send_invoice_email
from app.services.pdf_service import (
    VALID_TEMPLATE_KEYS,
    InvoicePdfSnapshot,
    _encode_logo,
    render_invoice_pdf,
    render_preview_pdf_bytes,
)
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/api/invoicing", tags=["invoicing"])


async def _schedule_cross_copy(db: AsyncSession, meta: InvInvoiceMeta) -> None:
    """Set cross_copy_status based on whether the client's EIK matches a MegaBanx company in another profile.

    When a match is found, the recipient profile is notified via WebSocket and a
    persistent Notification row is stored so the incoming invoice shows up in
    their inbox. No mirror row is created — the recipient reads the source meta
    directly through ``GET /invoicing/incoming`` (guarded by EIK match).
    """
    if not meta.client_id or meta.status != "issued":
        return

    client = (await db.execute(select(InvClient).where(InvClient.id == meta.client_id))).scalar_one_or_none()
    if not client or not client.eik:
        meta.cross_copy_status = "no_subscriber"
        return

    matches = (await db.execute(select(Company).where(Company.eik == client.eik, Company.profile_id != meta.profile_id))).scalars().all()

    if not matches:
        meta.cross_copy_status = "no_subscriber"
        return

    # Preserve pre-transition status so edits to an already-pending invoice
    # don't duplicate the recipient notifications on every save.
    was_pending = meta.cross_copy_status == "pending"
    meta.cross_copy_status = "pending"
    if was_pending:
        return

    issuer_company = (await db.execute(select(Company).where(Company.id == meta.company_id))).scalar_one_or_none()
    issuer_name = issuer_company.name if issuer_company else "неизвестен"

    for match in matches:
        db.add(
            Notification(
                profile_id=match.profile_id,
                type="cross_copy_incoming",
                title="Нова входяща фактура от контрагент",
                message=(
                    f"{issuer_name} издаде фактура № {meta.invoice_number or '—'} към {match.name}. Прегледайте и одобрете във Входящи."
                ),
                filename=str(meta.invoice_number or ""),
                source="cross-copy",
            )
        )


async def _notify_cross_copy_recipients(db: AsyncSession, meta: InvInvoiceMeta) -> None:
    """Send WS 'refresh' events to all recipient profiles after cross-copy is committed."""
    if meta.cross_copy_status != "pending" or not meta.client_id:
        return
    client = (await db.execute(select(InvClient).where(InvClient.id == meta.client_id))).scalar_one_or_none()
    if not client or not client.eik:
        return
    matches = (await db.execute(select(Company.profile_id).where(Company.eik == client.eik, Company.profile_id != meta.profile_id))).all()
    seen: set[str] = set()
    for row in matches:
        pid = row.profile_id
        if pid in seen:
            continue
        seen.add(pid)
        await ws_manager.notify_profile(pid, {"type": "refresh", "reason": "cross_copy_incoming"})


def _verify_ownership(profile_id: str, user: User) -> None:
    """Verify the authenticated user owns the given profile_id."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")


async def _verify_company_access(company_id: str, profile_id: str, db: AsyncSession) -> Company:
    """Verify that company_id belongs to the given profile and return it."""
    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")
    return company


async def _build_pdf_snapshot(
    db: AsyncSession,
    meta: InvInvoiceMeta,
    lines: list[InvInvoiceLine],
    *,
    old_pdf_path: str = "",
) -> InvoicePdfSnapshot | None:
    """Gather company/client/settings rows needed to render a PDF.

    Returns ``None`` when the invoice lacks the minimum data (company or
    invoice number); the caller should skip scheduling the render.
    """
    if not meta.invoice_number:
        return None

    company_row = (await db.execute(select(Company).where(Company.id == meta.company_id))).scalar_one_or_none()
    if not company_row:
        return None

    client_row: InvClient | None = None
    if meta.client_id:
        client_row = (await db.execute(select(InvClient).where(InvClient.id == meta.client_id))).scalar_one_or_none()

    settings_row = (
        await db.execute(select(InvCompanySettings).where(InvCompanySettings.company_id == meta.company_id))
    ).scalar_one_or_none()

    bank_rows = (
        (
            await db.execute(
                select(InvBankAccount)
                .where(InvBankAccount.company_id == meta.company_id)
                .order_by(InvBankAccount.is_default.desc(), InvBankAccount.created_at.asc())
            )
        )
        .scalars()
        .all()
    )
    bank_accounts_ctx: list[dict[str, Any]] = [
        {
            "iban": b.iban,
            "bank_name": b.bank_name or "",
            "bic": b.bic or "",
            "currency": b.currency or "BGN",
            "is_default": bool(b.is_default),
        }
        for b in bank_rows
    ]
    default_bank = bank_accounts_ctx[0] if bank_accounts_ctx else None

    company_ctx: dict[str, Any] = {
        "name": company_row.name,
        "eik": company_row.eik or "",
        "vat_number": company_row.vat_number or "",
        "address": company_row.address or "",
        "mol": company_row.mol or "",
        "city": company_row.city or "",
        "country": company_row.country or "",
        "phone": company_row.phone or "",
        "email": company_row.email or "",
        "iban": (default_bank or {}).get("iban", settings_row.iban if settings_row else ""),
        "bank_name": (default_bank or {}).get("bank_name", settings_row.bank_name if settings_row else ""),
        "bic": (default_bank or {}).get("bic", settings_row.bic if settings_row else ""),
    }
    client_ctx: dict[str, Any] = {
        "name": client_row.name if client_row else "",
        "eik": (client_row.eik if client_row else "") or "",
        "vat_number": (client_row.vat_number if client_row else "") or "",
        "address": (client_row.address if client_row else "") or "",
        "mol": (client_row.mol if client_row else "") or "",
        "city": (client_row.city if client_row else "") or "",
    }
    lines_ctx = [
        {
            "position": line.position,
            "description": line.description,
            "quantity": float(line.quantity),
            "unit": line.unit,
            "unit_price": float(line.unit_price),
            "vat_rate": float(line.vat_rate),
            "line_total": float(line.line_total),
        }
        for line in sorted(lines, key=lambda line: line.position)
    ]
    return InvoicePdfSnapshot(
        invoice_id=meta.invoice_id,
        profile_id=meta.profile_id,
        document_type=meta.document_type,
        invoice_number=meta.invoice_number,
        issue_date=meta.issue_date or date.today(),
        tax_event_date=meta.tax_event_date,
        due_date=meta.due_date,
        company_folder_name=company_row.name,
        client_display_name=client_row.name if client_row else "Клиент",
        company=company_ctx,
        client=client_ctx,
        lines=lines_ctx,
        subtotal=meta.subtotal,
        discount=meta.discount,
        vat_amount=meta.vat_amount,
        total=meta.total,
        vat_rate=meta.vat_rate,
        no_vat=meta.no_vat,
        no_vat_reason=meta.no_vat_reason or "",
        payment_method=meta.payment_method or "",
        notes=meta.notes or "",
        currency=meta.currency,
        composed_by=meta.composed_by or "",
        old_pdf_path=old_pdf_path,
        invoice_template=(meta.template_id or company_row.invoice_template or "modern"),
        logo_base64=_encode_logo(company_row.logo_path or ""),
        bank_accounts=bank_accounts_ctx,
    )


# ──────────────────── Utility endpoints ────────────────────


@router.get("/next-number")
async def get_next_number(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    document_type: str = Query("invoice"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Preview the next available invoice number for (company, document_type).

    Preview only — the race-safe increment happens inside ``POST /invoices``
    via ``SELECT ... FOR UPDATE`` on the stub row.
    """
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(func.max(InvInvoiceMeta.invoice_number)).where(
            InvInvoiceMeta.company_id == company_id,
            InvInvoiceMeta.document_type == document_type,
        )
    )
    max_number = result.scalar() or 0
    return {"next_number": max_number + 1}


@router.get("/registry/lookup/{eik}")
async def registry_lookup(
    eik: str,
    user: User = Depends(get_current_user),
):
    """Look up a Bulgarian company by EIK in the Trade Registry."""
    _ = user  # auth only
    return await lookup_eik(eik)


@router.get("/check-counterparty/{eik}")
async def check_counterparty(
    eik: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check whether a company with this EIK already exists in MegaBanx."""
    _ = user  # auth only
    result = await db.execute(select(Company.id, Company.name, Company.profile_id).where(Company.eik == eik))
    rows = result.all()
    return {
        "exists": bool(rows),
        "companies": [{"id": row.id, "name": row.name, "profile_id": row.profile_id} for row in rows],
    }


@router.get("/incoming")
async def list_incoming_cross_copies(
    profile_id: str = Query(...),
    company_id: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List incoming cross-copy invoices awaiting my approval.

    Matching rule: invoices issued by another profile to a client whose EIK
    equals one of my verified companies' EIK, and whose cross_copy_status is
    ``pending``. Returns meta + line snapshot so the recipient can preview
    before approving.

    When ``company_id`` is supplied, the result is restricted to invoices
    addressed to that specific recipient company (by EIK match), which the
    Files page uses to render the "Чакащи одобрение" subfolder per company.
    """
    _verify_ownership(profile_id, user)

    eik_query = select(Company.eik).where(
        Company.profile_id == profile_id,
        Company.eik.isnot(None),
        Company.eik != "",
    )
    if company_id:
        eik_query = eik_query.where(Company.id == company_id)
    my_eiks = (await db.execute(eik_query)).scalars().all()
    if not my_eiks:
        return []

    matching_clients = (await db.execute(select(InvClient.id).where(InvClient.eik.in_(list(my_eiks))))).scalars().all()
    if not matching_clients:
        return []

    invoices = (
        (
            await db.execute(
                select(InvInvoiceMeta)
                .where(
                    InvInvoiceMeta.client_id.in_(list(matching_clients)),
                    InvInvoiceMeta.cross_copy_status == "pending",
                    InvInvoiceMeta.status == "issued",
                    InvInvoiceMeta.profile_id != profile_id,
                )
                .order_by(InvInvoiceMeta.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    out: list[dict[str, Any]] = []
    for meta in invoices:
        issuer_company = (await db.execute(select(Company).where(Company.id == meta.company_id))).scalar_one_or_none()
        client = (await db.execute(select(InvClient).where(InvClient.id == meta.client_id))).scalar_one_or_none()
        lines = (
            (await db.execute(select(InvInvoiceLine).where(InvInvoiceLine.invoice_id == meta.invoice_id).order_by(InvInvoiceLine.position)))
            .scalars()
            .all()
        )
        out.append(
            {
                "meta": InvoiceMetaOut.model_validate(meta).model_dump(mode="json"),
                "issuer": {
                    "company_id": issuer_company.id if issuer_company else "",
                    "name": issuer_company.name if issuer_company else "",
                    "eik": (issuer_company.eik if issuer_company else "") or "",
                },
                "recipient": {
                    "client_id": client.id if client else "",
                    "name": client.name if client else "",
                    "eik": (client.eik if client else "") or "",
                },
                "lines": [
                    {
                        "id": line.id,
                        "position": line.position,
                        "description": line.description,
                        "quantity": float(line.quantity),
                        "unit": line.unit,
                        "unit_price": float(line.unit_price),
                        "vat_rate": float(line.vat_rate),
                        "line_total": float(line.line_total),
                    }
                    for line in lines
                ],
            }
        )
    return out


async def _assert_recipient_of(meta: InvInvoiceMeta, user: User, db: AsyncSession) -> None:
    """Guard: verify the current user's profile owns a company whose EIK matches
    the invoice client's EIK and is not the issuer of the invoice (i.e. they
    are a legitimate cross-copy recipient)."""
    if meta.profile_id == user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")
    if not meta.client_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")
    client = (await db.execute(select(InvClient).where(InvClient.id == meta.client_id))).scalar_one_or_none()
    if not client or not client.eik:
        raise HTTPException(status_code=403, detail="Нямате достъп")
    owns_match = (
        await db.execute(select(Company.id).where(Company.profile_id == user.profile_id, Company.eik == client.eik))
    ).scalar_one_or_none()
    if not owns_match:
        raise HTTPException(status_code=403, detail="Нямате достъп")


@router.post("/incoming/{invoice_id}/approve")
async def approve_incoming_cross_copy(
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve an incoming cross-copy invoice. Locks the issuer from editing/deleting."""
    meta = (await db.execute(select(InvInvoiceMeta).where(InvInvoiceMeta.invoice_id == invoice_id))).scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    await _assert_recipient_of(meta, user, db)
    if meta.cross_copy_status != "pending":
        raise HTTPException(status_code=409, detail="Фактурата не е в очакване на одобрение.")
    meta.cross_copy_status = "approved"
    await db.commit()
    await ws_manager.notify_profile(meta.profile_id, {"type": "refresh", "reason": "cross_copy_approved"})
    await ws_manager.notify_profile(user.profile_id, {"type": "refresh", "reason": "cross_copy_approved"})
    return {"message": "Фактурата е одобрена"}


@router.post("/incoming/{invoice_id}/reject")
async def reject_incoming_cross_copy(
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject an incoming cross-copy invoice. Signals the issuer they can re-sync or fix it."""
    meta = (await db.execute(select(InvInvoiceMeta).where(InvInvoiceMeta.invoice_id == invoice_id))).scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    await _assert_recipient_of(meta, user, db)
    if meta.cross_copy_status not in ("pending", "approved"):
        raise HTTPException(status_code=409, detail="Фактурата не може да бъде отхвърлена в текущия ѝ статус.")
    meta.cross_copy_status = "deleted_by_recipient"
    db.add(
        Notification(
            profile_id=meta.profile_id,
            type="cross_copy_rejected",
            title="Контрагентът отхвърли фактура",
            message=(f"Контрагентът отхвърли фактура № {meta.invoice_number or '—'}. Можете да я редактирате и синхронизирате наново."),
            filename=str(meta.invoice_number or ""),
            source="cross-copy",
        )
    )
    await db.commit()
    await ws_manager.notify_profile(meta.profile_id, {"type": "refresh", "reason": "cross_copy_rejected"})
    await ws_manager.notify_profile(user.profile_id, {"type": "refresh", "reason": "cross_copy_rejected"})
    return {"message": "Фактурата е отхвърлена"}


@router.get("/client-emails/{client_id}")
async def list_client_emails(
    client_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the list of known emails for a client (used when sending invoices)."""
    result = await db.execute(select(InvClient).where(InvClient.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Клиентът не е намерен")
    _verify_ownership(client.profile_id, user)
    emails = [e.strip() for e in (client.email or "").split(",") if e.strip()]
    return {"client_id": client_id, "emails": emails}


# ──────────────────── Clients ────────────────────


@router.get("/clients")
async def list_clients(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List clients for a company."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvClient)
        .where(
            InvClient.company_id == company_id,
            InvClient.profile_id == profile_id,
        )
        .order_by(InvClient.name)
    )
    clients = result.scalars().all()
    return [ClientOut.model_validate(c) for c in clients]


@router.post("/clients")
async def create_client(
    req: ClientCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new client."""
    _verify_ownership(req.profile_id, user)
    await _verify_company_access(req.company_id, req.profile_id, db)
    client = InvClient(
        id=str(uuid.uuid4()),
        company_id=req.company_id,
        profile_id=req.profile_id,
        name=req.name.strip(),
        eik=req.eik or "",
        egn=req.egn or "",
        vat_number=req.vat_number or "",
        is_vat_registered=req.is_vat_registered,
        is_individual=req.is_individual,
        mol=req.mol or "",
        city=req.city or "",
        address=req.address or "",
        email=req.email or "",
        phone=req.phone or "",
    )
    db.add(client)
    await db.flush()
    return ClientOut.model_validate(client)


@router.put("/clients/{client_id}")
async def update_client(
    client_id: str,
    req: ClientUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a client."""
    result = await db.execute(select(InvClient).where(InvClient.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Клиентът не е намерен")
    _verify_ownership(client.profile_id, user)

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    client.updated_at = datetime.utcnow()

    await db.flush()
    return ClientOut.model_validate(client)


@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a client."""
    result = await db.execute(select(InvClient).where(InvClient.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Клиентът не е намерен")
    _verify_ownership(client.profile_id, user)

    await db.delete(client)
    return {"message": "Клиентът е изтрит"}


# ──────────────────── Items ────────────────────


@router.get("/items")
async def list_items(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List items for a company."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvItem)
        .where(
            InvItem.company_id == company_id,
            InvItem.profile_id == profile_id,
        )
        .order_by(InvItem.name)
    )
    items = result.scalars().all()
    return [ItemOut.model_validate(i) for i in items]


@router.post("/items")
async def create_item(
    req: ItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new item."""
    _verify_ownership(req.profile_id, user)
    await _verify_company_access(req.company_id, req.profile_id, db)
    item = InvItem(
        id=str(uuid.uuid4()),
        company_id=req.company_id,
        profile_id=req.profile_id,
        name=req.name.strip(),
        unit=req.unit,
        default_price=Decimal(str(req.default_price)),
        vat_rate=Decimal(str(req.vat_rate)),
        description=req.description or "",
    )
    db.add(item)
    await db.flush()
    return ItemOut.model_validate(item)


@router.put("/items/{item_id}")
async def update_item(
    item_id: str,
    req: ItemUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an item."""
    result = await db.execute(select(InvItem).where(InvItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Артикулът не е намерен")
    _verify_ownership(item.profile_id, user)

    for field, value in req.model_dump(exclude_unset=True).items():
        if field in ("default_price", "vat_rate") and value is not None:
            setattr(item, field, Decimal(str(value)))
        else:
            setattr(item, field, value)
    item.updated_at = datetime.utcnow()

    await db.flush()
    return ItemOut.model_validate(item)


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an item."""
    result = await db.execute(select(InvItem).where(InvItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Артикулът не е намерен")
    _verify_ownership(item.profile_id, user)

    await db.delete(item)
    return {"message": "Артикулът е изтрит"}


# ──────────────────── Stubs (Кочани) ────────────────────


@router.get("/stubs")
async def list_stubs(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List stubs for a company."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvStub)
        .where(
            InvStub.company_id == company_id,
            InvStub.profile_id == profile_id,
        )
        .order_by(InvStub.name)
    )
    stubs = result.scalars().all()
    return [StubOut.model_validate(s) for s in stubs]


@router.post("/stubs")
async def create_stub(
    req: StubCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new stub."""
    _verify_ownership(req.profile_id, user)
    await _verify_company_access(req.company_id, req.profile_id, db)
    stub = InvStub(
        id=str(uuid.uuid4()),
        company_id=req.company_id,
        profile_id=req.profile_id,
        name=req.name.strip(),
        start_number=req.start_number,
        end_number=req.end_number,
        next_number=req.next_number if req.next_number is not None else req.start_number,
    )
    db.add(stub)
    await db.flush()
    return StubOut.model_validate(stub)


@router.put("/stubs/{stub_id}")
async def update_stub(
    stub_id: str,
    req: StubUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a stub."""
    result = await db.execute(select(InvStub).where(InvStub.id == stub_id))
    stub = result.scalar_one_or_none()
    if not stub:
        raise HTTPException(status_code=404, detail="Кочанът не е намерен")
    _verify_ownership(stub.profile_id, user)

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(stub, field, value)
    stub.updated_at = datetime.utcnow()

    await db.flush()
    return StubOut.model_validate(stub)


@router.delete("/stubs/{stub_id}")
async def delete_stub(
    stub_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a stub."""
    result = await db.execute(select(InvStub).where(InvStub.id == stub_id))
    stub = result.scalar_one_or_none()
    if not stub:
        raise HTTPException(status_code=404, detail="Кочанът не е намерен")
    _verify_ownership(stub.profile_id, user)

    await db.delete(stub)
    return {"message": "Кочанът е изтрит"}


# ──────────────────── Invoices (issued) ────────────────────


@router.get("/invoices")
async def list_issued_invoices(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List issued invoices for a company."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvInvoiceMeta)
        .where(
            InvInvoiceMeta.company_id == company_id,
            InvInvoiceMeta.profile_id == profile_id,
        )
        .order_by(InvInvoiceMeta.created_at.desc())
    )
    invoices = result.scalars().all()
    return [InvoiceMetaOut.model_validate(inv) for inv in invoices]


@router.post("/invoices")
async def create_issued_invoice(
    req: InvoiceCreateSchema,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new issued invoice with lines."""
    _verify_ownership(req.profile_id, user)
    await _verify_company_access(req.company_id, req.profile_id, db)
    invoice_id = str(uuid.uuid4())

    # Handle invoice number from stub
    invoice_number = req.invoice_number
    if req.stub_id and not invoice_number:
        result = await db.execute(
            select(InvStub)
            .where(
                InvStub.id == req.stub_id,
                InvStub.profile_id == req.profile_id,
            )
            .with_for_update()
        )
        stub = result.scalar_one_or_none()
        if stub:
            if stub.next_number > stub.end_number:
                raise HTTPException(status_code=409, detail="Кочанът е изчерпан. Моля, създайте нов кочан.")
            invoice_number = stub.next_number
            stub.next_number += 1

    # Require at least one line
    if not req.lines:
        raise HTTPException(status_code=400, detail="Фактурата трябва да съдържа поне един ред.")

    # Calculate line subtotals first
    subtotal = Decimal("0")
    lines_data = []

    for idx, line in enumerate(req.lines):
        line_subtotal = Decimal(str(line.quantity)) * Decimal(str(line.unit_price))
        subtotal += line_subtotal
        lines_data.append((idx, line, line_subtotal))

    # Apply discount to get discounted base
    discount_val = Decimal(str(req.discount))
    if req.discount_type in ("%", "percent"):
        discount_val = subtotal * discount_val / Decimal("100")
    # Ensure discount does not exceed subtotal
    if discount_val > subtotal:
        raise HTTPException(status_code=400, detail="Отстъпката не може да надвишава междинната сума.")
    discounted_subtotal = subtotal - discount_val

    # Calculate VAT on discounted base
    vat_amount = Decimal("0")
    lines_to_create = []
    discount_ratio = discounted_subtotal / subtotal if subtotal else Decimal("1")

    for idx, line, line_subtotal in lines_data:
        discounted_line = line_subtotal * discount_ratio
        line_vat = discounted_line * Decimal(str(line.vat_rate)) / Decimal("100") if not req.no_vat else Decimal("0")
        line_total = discounted_line + line_vat
        vat_amount += line_vat

        lines_to_create.append(
            InvInvoiceLine(
                id=str(uuid.uuid4()),
                invoice_id=invoice_id,
                item_id=line.item_id or "",
                position=line.position if line.position is not None else idx + 1,
                description=line.description,
                quantity=Decimal(str(line.quantity)),
                unit=line.unit,
                unit_price=Decimal(str(line.unit_price)),
                vat_rate=Decimal(str(line.vat_rate)),
                line_total=line_total,
            )
        )

    total = discounted_subtotal + vat_amount

    # Parse dates
    def _parse_date(s: str | None) -> date | None:
        if not s:
            return None
        try:
            return datetime.strptime(s, "%Y-%m-%d").date()
        except ValueError:
            try:
                return datetime.strptime(s, "%Y.%m.%d").date()
            except ValueError:
                return None

    meta = InvInvoiceMeta(
        id=str(uuid.uuid4()),
        invoice_id=invoice_id,
        company_id=req.company_id,
        profile_id=req.profile_id,
        client_id=req.client_id,
        document_type=req.document_type,
        invoice_number=invoice_number,
        issue_date=_parse_date(req.issue_date) or date.today(),
        tax_event_date=_parse_date(req.tax_event_date),
        due_date=_parse_date(req.due_date),
        subtotal=subtotal,
        discount=discount_val,
        vat_amount=vat_amount,
        total=total,
        vat_rate=Decimal(str(req.vat_rate)),
        no_vat=req.no_vat,
        no_vat_reason=req.no_vat_reason or "",
        payment_method=req.payment_method or "",
        notes=req.notes or "",
        internal_notes=req.internal_notes or "",
        currency=req.currency,
        status=req.status,
        composed_by=req.composed_by or user.name,
        template_id=(req.template_id or None),
    )
    db.add(meta)

    for line in lines_to_create:
        db.add(line)

    await db.flush()

    # Stage 2: schedule cross-copy if the client's EIK matches a MegaBanx company
    # in another profile. Updates meta.cross_copy_status and inserts Notification
    # rows for recipients; WS notify fires after commit below.
    await _schedule_cross_copy(db, meta)

    snapshot = await _build_pdf_snapshot(db, meta, lines_to_create)
    # Commit before scheduling the task: FastAPI BackgroundTasks fire inside
    # ``await response(...)`` (see fastapi.routing.request_response), which runs
    # *before* generator-dependency cleanup — so ``get_db`` hasn't committed yet
    # when the task opens its own session. Committing here makes the row visible
    # and avoids a row-lock deadlock on updates.
    await db.commit()
    if snapshot is not None:
        background_tasks.add_task(render_invoice_pdf, snapshot)
    await _notify_cross_copy_recipients(db, meta)

    return InvoiceMetaOut.model_validate(meta)


@router.get("/invoices/{invoice_id}")
async def get_issued_invoice(
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get an issued invoice with its lines."""
    result = await db.execute(select(InvInvoiceMeta).where(InvInvoiceMeta.invoice_id == invoice_id))
    meta = result.scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    _verify_ownership(meta.profile_id, user)

    result = await db.execute(select(InvInvoiceLine).where(InvInvoiceLine.invoice_id == invoice_id).order_by(InvInvoiceLine.position))
    lines = result.scalars().all()

    return {
        "meta": InvoiceMetaOut.model_validate(meta),
        "lines": [
            {
                "id": line.id,
                "item_id": line.item_id,
                "position": line.position,
                "description": line.description,
                "quantity": str(line.quantity),
                "unit": line.unit,
                "unit_price": str(line.unit_price),
                "vat_rate": str(line.vat_rate),
                "line_total": str(line.line_total),
            }
            for line in lines
        ],
    }


@router.delete("/invoices/{invoice_id}")
async def delete_issued_invoice(
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an issued invoice and its lines."""
    result = await db.execute(select(InvInvoiceMeta).where(InvInvoiceMeta.invoice_id == invoice_id))
    meta = result.scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    _verify_ownership(meta.profile_id, user)

    # Phase 5.2: Block delete when counterparty has approved the invoice
    if meta.cross_copy_status == "approved":
        raise HTTPException(
            status_code=409,
            detail="Фактурата е одобрена от контрагента и не може да бъде изтрита. Контрагентът трябва първо да я изтрие.",
        )

    # Delete lines
    result = await db.execute(select(InvInvoiceLine).where(InvInvoiceLine.invoice_id == invoice_id))
    lines = result.scalars().all()
    for line in lines:
        await db.delete(line)

    pdf_path = meta.pdf_path or ""
    await db.delete(meta)

    if pdf_path:
        try:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
        except OSError:
            pass

    return {"message": "Фактурата е изтрита"}


@router.get("/invoices/{invoice_id}/editable")
async def get_editable_invoice(
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the invoice shaped for the edit form (meta + lines + guard flag).

    Frontend uses this to hydrate the invoice form. When ``editable`` is
    ``False`` the UI must switch to read-only — a counterparty-approved
    invoice cannot be edited (see PUT guard below).
    """
    result = await db.execute(select(InvInvoiceMeta).where(InvInvoiceMeta.invoice_id == invoice_id))
    meta = result.scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    _verify_ownership(meta.profile_id, user)

    lines_result = await db.execute(select(InvInvoiceLine).where(InvInvoiceLine.invoice_id == invoice_id).order_by(InvInvoiceLine.position))
    lines = lines_result.scalars().all()

    return {
        "editable": meta.cross_copy_status != "approved",
        "meta": InvoiceMetaOut.model_validate(meta),
        "lines": [
            {
                "id": line.id,
                "item_id": line.item_id,
                "position": line.position,
                "description": line.description,
                "quantity": float(line.quantity),
                "unit": line.unit,
                "unit_price": float(line.unit_price),
                "vat_rate": float(line.vat_rate),
                "line_total": float(line.line_total),
            }
            for line in lines
        ],
    }


@router.put("/invoices/{invoice_id}")
async def update_issued_invoice(
    invoice_id: str,
    req: InvoiceCreateSchema,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an issued invoice. Blocked when counterparty has approved."""
    result = await db.execute(select(InvInvoiceMeta).where(InvInvoiceMeta.invoice_id == invoice_id))
    meta = result.scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    _verify_ownership(meta.profile_id, user)

    # Phase 5.2: Block edit when counterparty has approved the invoice
    if meta.cross_copy_status == "approved":
        raise HTTPException(
            status_code=409,
            detail="Фактурата е одобрена от контрагента и не може да бъде редактирана. Контрагентът трябва първо да я изтрие.",
        )

    old_pdf_path = meta.pdf_path or ""

    # Update meta fields
    meta.client_id = req.client_id
    meta.document_type = req.document_type
    if req.invoice_number is not None:
        meta.invoice_number = req.invoice_number
    meta.no_vat = req.no_vat
    meta.no_vat_reason = req.no_vat_reason or ""
    meta.payment_method = req.payment_method or ""
    meta.notes = req.notes or ""
    meta.internal_notes = req.internal_notes or ""
    meta.currency = req.currency
    meta.status = req.status
    if req.composed_by:
        meta.composed_by = req.composed_by
    # Stage 6B: allow explicit per-invoice template override (None clears it).
    meta.template_id = req.template_id or None
    meta.updated_at = datetime.utcnow()

    # Parse dates
    def _parse_date(s: str | None) -> date | None:
        if not s:
            return None
        try:
            return datetime.strptime(s, "%Y-%m-%d").date()
        except ValueError:
            try:
                return datetime.strptime(s, "%Y.%m.%d").date()
            except ValueError:
                return None

    meta.issue_date = _parse_date(req.issue_date) or meta.issue_date
    meta.tax_event_date = _parse_date(req.tax_event_date) if req.tax_event_date else None
    meta.due_date = _parse_date(req.due_date) if req.due_date else None

    # Recalculate lines
    if req.lines:
        # Delete old lines
        old_lines_result = await db.execute(select(InvInvoiceLine).where(InvInvoiceLine.invoice_id == invoice_id))
        for old_line in old_lines_result.scalars().all():
            await db.delete(old_line)

        subtotal = Decimal("0")
        lines_data = []
        for idx, line in enumerate(req.lines):
            line_subtotal = Decimal(str(line.quantity)) * Decimal(str(line.unit_price))
            subtotal += line_subtotal
            lines_data.append((idx, line, line_subtotal))

        discount_val = Decimal(str(req.discount))
        if req.discount_type in ("%", "percent"):
            discount_val = subtotal * discount_val / Decimal("100")
        if discount_val > subtotal:
            raise HTTPException(status_code=400, detail="Отстъпката не може да надвишава междинната сума.")
        discounted_subtotal = subtotal - discount_val

        vat_amount = Decimal("0")
        discount_ratio = discounted_subtotal / subtotal if subtotal else Decimal("1")

        for idx, line, line_subtotal in lines_data:
            discounted_line = line_subtotal * discount_ratio
            line_vat = discounted_line * Decimal(str(line.vat_rate)) / Decimal("100") if not req.no_vat else Decimal("0")
            line_total = discounted_line + line_vat
            vat_amount += line_vat

            db.add(
                InvInvoiceLine(
                    id=str(uuid.uuid4()),
                    invoice_id=invoice_id,
                    item_id=line.item_id or "",
                    position=line.position if line.position is not None else idx + 1,
                    description=line.description,
                    quantity=Decimal(str(line.quantity)),
                    unit=line.unit,
                    unit_price=Decimal(str(line.unit_price)),
                    vat_rate=Decimal(str(line.vat_rate)),
                    line_total=line_total,
                )
            )

        meta.subtotal = subtotal
        meta.discount = discount_val
        meta.vat_amount = vat_amount
        meta.total = discounted_subtotal + vat_amount
        meta.vat_rate = Decimal(str(req.vat_rate))

    await db.flush()

    fresh_lines_result = await db.execute(
        select(InvInvoiceLine).where(InvInvoiceLine.invoice_id == invoice_id).order_by(InvInvoiceLine.position)
    )
    snapshot = await _build_pdf_snapshot(db, meta, list(fresh_lines_result.scalars().all()), old_pdf_path=old_pdf_path)

    # Stage 2: re-evaluate cross-copy status on edits (only when still editable —
    # approved invoices are blocked above). Does not disturb already-approved
    # statuses since we never reach this point for them.
    if meta.cross_copy_status in ("none", "pending", "no_subscriber", "deleted_by_recipient"):
        await _schedule_cross_copy(db, meta)

    # See POST /invoices for why we commit before scheduling the task.
    await db.commit()
    if snapshot is not None:
        background_tasks.add_task(render_invoice_pdf, snapshot)
    await _notify_cross_copy_recipients(db, meta)

    return InvoiceMetaOut.model_validate(meta)


# ──────────────────── Company Settings ────────────────────


@router.get("/company-settings")
async def get_company_settings(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get company invoicing settings."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvCompanySettings).where(
            InvCompanySettings.company_id == company_id,
            InvCompanySettings.profile_id == profile_id,
        )
    )
    settings = result.scalar_one_or_none()
    if not settings:
        return None
    return CompanySettingsOut.model_validate(settings)


@router.put("/company-settings")
async def update_company_settings(
    req: CompanySettingsUpdate,
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update company invoicing settings."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvCompanySettings).where(
            InvCompanySettings.company_id == company_id,
            InvCompanySettings.profile_id == profile_id,
        )
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = InvCompanySettings(
            id=str(uuid.uuid4()),
            company_id=company_id,
            profile_id=profile_id,
        )
        db.add(settings)

    for field, value in req.model_dump(exclude_unset=True).items():
        if field == "default_vat_rate" and value is not None:
            setattr(settings, field, Decimal(str(value)))
        else:
            setattr(settings, field, value)
    settings.updated_at = datetime.utcnow()

    await db.flush()
    return CompanySettingsOut.model_validate(settings)


# ──────────────────── Sync Settings ────────────────────


@router.get("/sync-settings")
async def get_sync_settings(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get company sync settings."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvSyncSettings).where(
            InvSyncSettings.company_id == company_id,
            InvSyncSettings.profile_id == profile_id,
        )
    )
    settings = result.scalar_one_or_none()
    if not settings:
        return None
    return SyncSettingsOut.model_validate(settings)


@router.put("/sync-settings")
async def update_sync_settings(
    req: SyncSettingsUpdate,
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update company sync settings."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvSyncSettings).where(
            InvSyncSettings.company_id == company_id,
            InvSyncSettings.profile_id == profile_id,
        )
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = InvSyncSettings(
            id=str(uuid.uuid4()),
            company_id=company_id,
            profile_id=profile_id,
        )
        db.add(settings)

    settings.sync_mode = req.sync_mode
    settings.delay_minutes = req.delay_minutes
    settings.updated_at = datetime.utcnow()

    await db.flush()
    return SyncSettingsOut.model_validate(settings)


# ──────────────────── Stage 6A: Bank Accounts ────────────────────


async def _load_bank_account(db: AsyncSession, account_id: str, company_id: str, profile_id: str) -> InvBankAccount:
    result = await db.execute(
        select(InvBankAccount).where(
            InvBankAccount.id == account_id,
            InvBankAccount.company_id == company_id,
            InvBankAccount.profile_id == profile_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Банковата сметка не е намерена")
    return account


async def _clear_other_defaults(db: AsyncSession, company_id: str, profile_id: str, keep_id: str | None = None) -> None:
    """Make sure only one account is `is_default=True` per company."""
    query = select(InvBankAccount).where(
        InvBankAccount.company_id == company_id,
        InvBankAccount.profile_id == profile_id,
        InvBankAccount.is_default.is_(True),
    )
    result = await db.execute(query)
    for acc in result.scalars().all():
        if keep_id and acc.id == keep_id:
            continue
        acc.is_default = False
        acc.updated_at = datetime.utcnow()


@router.get("/bank-accounts")
async def list_bank_accounts(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all bank accounts for a company."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    result = await db.execute(
        select(InvBankAccount)
        .where(
            InvBankAccount.company_id == company_id,
            InvBankAccount.profile_id == profile_id,
        )
        .order_by(InvBankAccount.is_default.desc(), InvBankAccount.created_at)
    )
    return [BankAccountOut.model_validate(a) for a in result.scalars().all()]


@router.post("/bank-accounts")
async def create_bank_account(
    req: BankAccountCreate,
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new bank account for a company."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)

    iban = (req.iban or "").replace(" ", "").strip().upper()
    if not iban:
        raise HTTPException(status_code=400, detail="IBAN е задължителен")

    account = InvBankAccount(
        id=str(uuid.uuid4()),
        company_id=company_id,
        profile_id=profile_id,
        iban=iban,
        bank_name=(req.bank_name or "").strip(),
        bic=(req.bic or "").strip().upper(),
        currency=(req.currency or "BGN").strip().upper() or "BGN",
        is_default=bool(req.is_default),
    )
    db.add(account)

    if account.is_default:
        await _clear_other_defaults(db, company_id, profile_id, keep_id=None)

    await db.flush()
    return BankAccountOut.model_validate(account)


@router.put("/bank-accounts/{account_id}")
async def update_bank_account(
    account_id: str,
    req: BankAccountUpdate,
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a bank account."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    account = await _load_bank_account(db, account_id, company_id, profile_id)

    data = req.model_dump(exclude_unset=True)
    if "iban" in data and data["iban"] is not None:
        iban = data["iban"].replace(" ", "").strip().upper()
        if not iban:
            raise HTTPException(status_code=400, detail="IBAN е задължителен")
        account.iban = iban
    if "bank_name" in data and data["bank_name"] is not None:
        account.bank_name = data["bank_name"].strip()
    if "bic" in data and data["bic"] is not None:
        account.bic = data["bic"].strip().upper()
    if "currency" in data and data["currency"] is not None:
        account.currency = data["currency"].strip().upper() or "BGN"
    if "is_default" in data and data["is_default"] is not None:
        account.is_default = bool(data["is_default"])
        if account.is_default:
            await _clear_other_defaults(db, company_id, profile_id, keep_id=account.id)

    account.updated_at = datetime.utcnow()
    await db.flush()
    return BankAccountOut.model_validate(account)


@router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(
    account_id: str,
    company_id: str = Query(...),
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a bank account."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    account = await _load_bank_account(db, account_id, company_id, profile_id)
    await db.delete(account)
    return {"message": "Банковата сметка е изтрита"}


# ──────────────────── Stage 6B: Invoice template gallery ────────────────────


_TEMPLATE_GALLERY = [
    {"key": "modern", "name": "Модерен корпоративен", "description": "Син акцент, градиентно заглавие, подходящ за корпоративни клиенти."},
    {"key": "classic", "name": "Класически минимален", "description": "Зелен акцент, чист и прост дизайн с ясни линии."},
    {"key": "branded", "name": "С лого акцент", "description": "Голяма зона за лого горе вляво, виолетов акцент за брандиране."},
    {"key": "standard", "name": "Стандартен бизнес", "description": "Класически черно-бял формат, консервативен и универсален."},
]


@router.get("/invoice-templates")
async def list_invoice_templates(user: User = Depends(get_current_user)):
    """Return the available invoice PDF template variants (auth-only)."""
    _ = user  # auth check
    return {"templates": _TEMPLATE_GALLERY}


@router.get("/invoice-templates/{template_key}/preview")
async def preview_invoice_template(
    template_key: str,
    document_type: str = Query("invoice"),
    user: User = Depends(get_current_user),
) -> Response:
    """Render a sample PDF for the given template to use as live preview."""
    _ = user
    if template_key not in VALID_TEMPLATE_KEYS:
        raise HTTPException(status_code=404, detail="Неизвестен шаблон")
    pdf_bytes = render_preview_pdf_bytes(template_key, document_type=document_type)
    if pdf_bytes is None:
        raise HTTPException(status_code=503, detail="PDF рендеризацията не е налична")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="preview-{template_key}.pdf"'},
    )


# ──────────────────── Stage 4: Email templates & send ────────────────────


DEFAULT_EMAIL_TEMPLATE_SUBJECT = "Фактура №{invoice_number} от {company_name}"
DEFAULT_EMAIL_TEMPLATE_BODY = (
    "Здравейте, {client_name}\n\n"
    "Изпращаме Ви фактура №{invoice_number} от {issue_date} на стойност "
    "{total} {currency}.\n\n"
    "Благодарим Ви за доверието!\n\n"
    "{company_name}"
)


def _render_merge_fields(
    template_text: str,
    *,
    meta: InvInvoiceMeta,
    company: Company,
    client: InvClient | None,
    issuer_name: str,
) -> str:
    """Fill in invoice merge fields, leaving unknown ``{placeholders}`` intact."""

    class _Lenient(dict[str, Any]):
        def __missing__(self, key: str) -> str:
            return "{" + key + "}"

    values = _Lenient(
        invoice_number=meta.invoice_number or "",
        issue_date=str(meta.issue_date) if meta.issue_date else "",
        due_date=str(meta.due_date) if meta.due_date else "",
        total=f"{meta.total:.2f}",
        currency=meta.currency,
        client_name=(client.name if client else "") or "",
        company_name=company.name,
        issuer_name=issuer_name or company.name,
    )
    try:
        return template_text.format_map(values)
    except (IndexError, KeyError, ValueError):
        return template_text


@router.get("/companies/{company_id}/email-templates")
async def list_email_templates(
    company_id: str,
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EmailTemplateOut]:
    """Return all email templates for a company (most recent first)."""
    _verify_ownership(profile_id, user)
    await _verify_company_access(company_id, profile_id, db)
    rows = (
        (
            await db.execute(
                select(InvEmailTemplate)
                .where(
                    InvEmailTemplate.company_id == company_id,
                    InvEmailTemplate.profile_id == profile_id,
                )
                .order_by(InvEmailTemplate.is_default.desc(), InvEmailTemplate.updated_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [EmailTemplateOut.model_validate(row) for row in rows]


@router.post("/email-templates")
async def create_email_template(
    req: EmailTemplateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailTemplateOut:
    """Create a new email template. Flips other defaults off when ``is_default=True``."""
    _verify_ownership(req.profile_id, user)
    await _verify_company_access(req.company_id, req.profile_id, db)

    if req.is_default:
        existing = (
            (
                await db.execute(
                    select(InvEmailTemplate).where(
                        InvEmailTemplate.company_id == req.company_id,
                        InvEmailTemplate.is_default.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )
        for row in existing:
            row.is_default = False

    row = InvEmailTemplate(
        id=str(uuid.uuid4()),
        company_id=req.company_id,
        profile_id=req.profile_id,
        name=req.name,
        subject=req.subject,
        body=req.body,
        is_default=req.is_default,
        attach_pdf=req.attach_pdf,
    )
    db.add(row)
    await db.flush()
    return EmailTemplateOut.model_validate(row)


@router.put("/email-templates/{template_id}")
async def update_email_template(
    template_id: str,
    req: EmailTemplateUpdate,
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailTemplateOut:
    """Partial update of an email template."""
    _verify_ownership(profile_id, user)
    row = (
        await db.execute(
            select(InvEmailTemplate).where(
                InvEmailTemplate.id == template_id,
                InvEmailTemplate.profile_id == profile_id,
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Шаблонът не е намерен")

    if req.is_default is True and not row.is_default:
        existing = (
            (
                await db.execute(
                    select(InvEmailTemplate).where(
                        InvEmailTemplate.company_id == row.company_id,
                        InvEmailTemplate.is_default.is_(True),
                        InvEmailTemplate.id != row.id,
                    )
                )
            )
            .scalars()
            .all()
        )
        for other in existing:
            other.is_default = False

    if req.name is not None:
        row.name = req.name
    if req.subject is not None:
        row.subject = req.subject
    if req.body is not None:
        row.body = req.body
    if req.is_default is not None:
        row.is_default = req.is_default
    if req.attach_pdf is not None:
        row.attach_pdf = req.attach_pdf
    row.updated_at = datetime.utcnow()

    await db.flush()
    return EmailTemplateOut.model_validate(row)


@router.delete("/email-templates/{template_id}")
async def delete_email_template(
    template_id: str,
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    _verify_ownership(profile_id, user)
    row = (
        await db.execute(
            select(InvEmailTemplate).where(
                InvEmailTemplate.id == template_id,
                InvEmailTemplate.profile_id == profile_id,
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Шаблонът не е намерен")
    await db.delete(row)
    return {"message": "deleted"}


@router.get("/invoices/{invoice_id}/email-log")
async def list_invoice_email_log(
    invoice_id: str,
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[InvoiceEmailLogOut]:
    """Return email log rows for a single invoice."""
    _verify_ownership(profile_id, user)
    rows = (
        (
            await db.execute(
                select(InvEmailLog)
                .where(
                    InvEmailLog.invoice_id == invoice_id,
                    InvEmailLog.profile_id == profile_id,
                )
                .order_by(InvEmailLog.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [InvoiceEmailLogOut.model_validate(row) for row in rows]


@router.post("/invoices/{invoice_id}/send-email")
async def send_invoice_email_endpoint(
    invoice_id: str,
    req: InvoiceEmailSendRequest,
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceEmailLogOut:
    """Send an issued invoice to a client by email, optionally with PDF attached.

    Supports an optional ``template_id`` — when provided (and belonging to the
    same company), the template's subject/body are used as defaults; explicit
    ``subject`` / ``body`` in the request override them. The resulting send is
    persisted in :class:`InvEmailLog` regardless of outcome.
    """
    _verify_ownership(profile_id, user)

    meta = (
        await db.execute(
            select(InvInvoiceMeta).where(
                InvInvoiceMeta.invoice_id == invoice_id,
                InvInvoiceMeta.profile_id == profile_id,
            )
        )
    ).scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")

    company = await _verify_company_access(meta.company_id, profile_id, db)
    client: InvClient | None = None
    if meta.client_id:
        client = (await db.execute(select(InvClient).where(InvClient.id == meta.client_id))).scalar_one_or_none()

    template: InvEmailTemplate | None = None
    if req.template_id:
        template = (
            await db.execute(
                select(InvEmailTemplate).where(
                    InvEmailTemplate.id == req.template_id,
                    InvEmailTemplate.company_id == meta.company_id,
                    InvEmailTemplate.profile_id == profile_id,
                )
            )
        ).scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Шаблонът не е намерен")

    raw_subject = req.subject or (template.subject if template else DEFAULT_EMAIL_TEMPLATE_SUBJECT)
    raw_body = req.body or (template.body if template else DEFAULT_EMAIL_TEMPLATE_BODY)
    issuer_name = user.email or company.name
    subject = _render_merge_fields(raw_subject, meta=meta, company=company, client=client, issuer_name=issuer_name)
    body_text = _render_merge_fields(raw_body, meta=meta, company=company, client=client, issuer_name=issuer_name)

    attach_pdf = req.attach_pdf if req.attach_pdf is not None else (template.attach_pdf if template else True)
    pdf_path = meta.pdf_path or ""
    attachment_path = pdf_path if attach_pdf and pdf_path and os.path.isfile(pdf_path) else None
    attachment_name = None
    if attachment_path:
        attachment_name = f"faktura_{meta.invoice_number}.pdf" if meta.invoice_number else os.path.basename(pdf_path)

    log = InvEmailLog(
        id=str(uuid.uuid4()),
        invoice_id=invoice_id,
        profile_id=profile_id,
        company_id=meta.company_id,
        template_id=template.id if template else None,
        to_email=req.to_email,
        cc_emails=",".join(req.cc_emails) if req.cc_emails else None,
        bcc_emails=",".join(req.bcc_emails) if req.bcc_emails else None,
        subject=subject,
        body=body_text,
        attached_pdf=bool(attachment_path),
        delivery_status="queued",
    )
    db.add(log)
    await db.flush()

    # Provide a minimal HTML rendering so the recipient's client has both
    # plain-text and HTML to choose from without us needing a templating engine.
    html_body = '<html><body><pre style="font-family: Arial, sans-serif; font-size: 14px">' + body_text + "</pre></body></html>"

    ok, message_id, err = await send_invoice_email(
        req.to_email,
        subject,
        html_body,
        body_text,
        cc=req.cc_emails,
        bcc=req.bcc_emails,
        attachment_path=attachment_path,
        attachment_name=attachment_name,
    )
    log.message_id = message_id
    log.delivery_status = "sent" if ok else "failed"
    log.delivery_error = err
    log.sent_at = datetime.utcnow() if ok else None
    await db.flush()
    return InvoiceEmailLogOut.model_validate(log)


# 1×1 transparent GIF served when the recipient opens an invoice email.
_TRACKING_PIXEL = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01"
    b"\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


@router.get("/email/track/{log_id}.gif")
async def track_email_open(
    log_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Public 1×1 GIF endpoint that records an email open.

    Intentionally unauthenticated — mail clients fetch the image without any
    session cookies. We swallow any DB error silently so image loads can't leak
    server-side state to the recipient.
    """
    try:
        row = (await db.execute(select(InvEmailLog).where(InvEmailLog.id == log_id))).scalar_one_or_none()
        if row:
            row.open_count = (row.open_count or 0) + 1
            if row.opened_at is None:
                row.opened_at = datetime.utcnow()
            await db.flush()
    except Exception:  # noqa: BLE001
        pass
    return Response(
        content=_TRACKING_PIXEL,
        media_type="image/gif",
        headers={"Cache-Control": "no-store, max-age=0"},
    )
