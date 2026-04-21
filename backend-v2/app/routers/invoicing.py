"""Invoicing module router: clients, items, stubs, invoices, settings, sync."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.invoicing import (
    InvClient,
    InvCompanySettings,
    InvInvoiceLine,
    InvInvoiceMeta,
    InvItem,
    InvStub,
    InvSyncSettings,
)
from app.models.user import User
from app.schemas.invoicing import (
    ClientCreate,
    ClientOut,
    ClientUpdate,
    CompanySettingsOut,
    CompanySettingsUpdate,
    InvoiceCreateSchema,
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

router = APIRouter(prefix="/api/invoicing", tags=["invoicing"])


def _verify_ownership(profile_id: str, user: User) -> None:
    """Verify the authenticated user owns the given profile_id."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")


async def _verify_company_access(company_id: str, profile_id: str, db: AsyncSession) -> None:
    """Verify that company_id belongs to the given profile."""
    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")


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
    )
    db.add(meta)

    for line in lines_to_create:
        db.add(line)

    await db.flush()
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
            detail="Фактурата е одобрена от контрагента и не може да бъде изтрита. " "Контрагентът трябва първо да я изтрие.",
        )

    # Delete lines
    result = await db.execute(select(InvInvoiceLine).where(InvInvoiceLine.invoice_id == invoice_id))
    lines = result.scalars().all()
    for line in lines:
        await db.delete(line)

    await db.delete(meta)
    return {"message": "Фактурата е изтрита"}


@router.put("/invoices/{invoice_id}")
async def update_issued_invoice(
    invoice_id: str,
    req: InvoiceCreateSchema,
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
            detail="Фактурата е одобрена от контрагента и не може да бъде редактирана. " "Контрагентът трябва първо да я изтрие.",
        )

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
