"""Invoices router: upload, AI analysis, list, download, delete, batch operations."""

import logging
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.billing import Billing, InvoiceMonthlyUsage
from app.models.company import Company
from app.models.invoice import Invoice
from app.models.invoicing import InvClient, InvInvoiceMeta
from app.models.notification import Notification
from app.models.profile import Profile
from app.models.sharing import CompanyShare
from app.models.user import User
from app.schemas.invoice import InvoiceOut
from app.services.encryption import read_decrypted_file, write_encrypted_file
from app.services.file_manager import (
    SUPPORTED_EXTENSIONS,
    get_inbox_dir,
    get_profile_dir,
    sanitize_path_component,
)
from app.services.gemini import analyze_invoice_with_gemini
from app.services.ws_manager import ws_manager
from app.utils.helpers import sanitize_filename

logger = logging.getLogger("megabanx.invoices")

router = APIRouter(prefix="/api/profiles/{profile_id}", tags=["invoices"])


async def _verify_profile_access(profile_id: str, user: User, db: AsyncSession) -> Profile:
    """Require ``user`` to own ``profile_id`` (write paths)."""
    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Профилът не е намерен")
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп до този профил")
    return profile


async def _accessible_company_ids(profile_id: str, user: User, db: AsyncSession) -> set[str] | None:
    """For read-only paths, resolve which companies the user may see.

    Returns ``None`` when the user owns the profile (meaning "no filter,
    show everything") and a possibly-empty set of company IDs otherwise.
    Raises 404/403 if the profile doesn't exist or the user has no share
    at all in it.
    """
    profile_row = await db.execute(select(Profile).where(Profile.id == profile_id))
    if not profile_row.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Профилът не е намерен")

    if profile_id == user.profile_id:
        return None

    shares = (
        await db.execute(
            select(CompanyShare.company_id).where(
                CompanyShare.owner_profile_id == profile_id,
                CompanyShare.shared_with_email == user.email,
            )
        )
    ).all()
    if not shares:
        raise HTTPException(status_code=403, detail="Нямате достъп до този профил")
    return {company_id for (company_id,) in shares}


async def _check_and_increment_usage(user_id: str, db: AsyncSession) -> None:
    """Atomically check billing limit and increment usage counter.

    Uses INSERT ... ON CONFLICT DO UPDATE (upsert) so that even when no
    row exists yet the operation is atomic and safe under concurrency.
    """
    result = await db.execute(select(Billing).where(Billing.user_id == user_id))
    billing = result.scalar_one_or_none()
    if not billing:
        return

    now = datetime.utcnow()

    # Atomic upsert: INSERT new row with count=1, or increment existing row.
    # RETURNING gives us the post-increment count so we can check the limit.
    stmt = (
        pg_insert(InvoiceMonthlyUsage)
        .values(
            id=str(uuid.uuid4()),
            user_id=user_id,
            year=now.year,
            month=now.month,
            count=1,
        )
        .on_conflict_do_update(
            index_elements=["user_id", "year", "month"],
            set_={"count": InvoiceMonthlyUsage.count + 1},
        )
        .returning(InvoiceMonthlyUsage.count)
    )
    result = await db.execute(stmt)
    new_count = result.scalar_one()

    # If the new count exceeds the limit, roll back the increment
    if billing.invoices_limit > 0 and new_count > billing.invoices_limit:
        # Decrement back since we already incremented
        await db.execute(
            select(InvoiceMonthlyUsage)
            .where(
                InvoiceMonthlyUsage.user_id == user_id,
                InvoiceMonthlyUsage.year == now.year,
                InvoiceMonthlyUsage.month == now.month,
            )
            .with_for_update()
        )
        usage_row = (
            await db.execute(
                select(InvoiceMonthlyUsage).where(
                    InvoiceMonthlyUsage.user_id == user_id,
                    InvoiceMonthlyUsage.year == now.year,
                    InvoiceMonthlyUsage.month == now.month,
                )
            )
        ).scalar_one()
        usage_row.count -= 1
        raise HTTPException(
            status_code=429,
            detail=f"Достигнат е лимитът от {billing.invoices_limit} фактури за месеца. Надградете плана си.",
        )


@router.post("/upload")
async def upload_invoice(
    profile_id: str,
    file: UploadFile = File(...),
    company_id: str = Query(default=""),
    invoice_type: str = Query(default="auto"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an invoice file, analyze with AI, auto-classify by EIK match, and store.

    ``invoice_type`` accepts ``auto`` (default), ``purchase``, or ``sale``. When
    ``auto``, the type is derived from which EIK in the extracted analysis matches
    one of the profile's registered companies — issuer match → ``sale`` (the
    profile issued it), recipient match → ``purchase``. If no EIK matches and no
    company_id is supplied, the invoice is stored as ``unmatched`` in the inbox.
    """
    await _verify_profile_access(profile_id, user, db)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Не е предоставен файл")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдържан формат: {ext}. Поддържани: {', '.join(SUPPORTED_EXTENSIONS)}",
        )

    # Read file content
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Файлът е празен")
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файлът е твърде голям (макс. 20MB)")

    # Save to inbox (encrypted)
    inbox_dir = get_inbox_dir(profile_id)
    os.makedirs(inbox_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex[:8]}_{sanitize_path_component(file.filename)}"
    inbox_path = os.path.join(inbox_dir, safe_name)
    write_encrypted_file(inbox_path, content)

    # Analyze with AI
    analysis = {}
    try:
        analysis = await analyze_invoice_with_gemini(inbox_path)
    except Exception as e:
        logger.warning(f"AI analysis failed: {e}")

    # Determine company + invoice_type by matching EIK against profile's companies.
    matched_company_id = company_id
    matched_company_name = ""
    resolved_type = invoice_type if invoice_type in ("purchase", "sale") else ""

    issuer_eik = (analysis.get("issuer_eik") or "").strip()
    recipient_eik = (analysis.get("recipient_eik") or "").strip()

    if not matched_company_id and (issuer_eik or recipient_eik):
        candidate_eiks = [e for e in (issuer_eik, recipient_eik) if e]
        result = await db.execute(
            select(Company).where(
                Company.profile_id == profile_id,
                Company.eik.in_(candidate_eiks),
            )
        )
        matches = result.scalars().all()
        # Prefer issuer match (profile issued the invoice → sale) over recipient
        # match; this keeps classification deterministic when both EIKs belong
        # to companies registered under the same profile.
        chosen = next((c for c in matches if issuer_eik and c.eik == issuer_eik), None) or next(
            (c for c in matches if recipient_eik and c.eik == recipient_eik), None
        )
        if chosen is not None:
            matched_company_id = chosen.id
            matched_company_name = chosen.name
            if chosen.eik == issuer_eik:
                resolved_type = "sale"
            elif chosen.eik == recipient_eik:
                resolved_type = "purchase"

    if matched_company_id and not matched_company_name:
        result = await db.execute(select(Company).where(Company.id == matched_company_id))
        comp = result.scalar_one_or_none()
        if comp:
            matched_company_name = comp.name
            if not resolved_type:
                if issuer_eik and comp.eik == issuer_eik:
                    resolved_type = "sale"
                elif recipient_eik and comp.eik == recipient_eik:
                    resolved_type = "purchase"

    if not resolved_type:
        resolved_type = "purchase"

    invoice_type = resolved_type

    # Duplicate detection: same profile + issuer_eik + invoice_number already exists
    inv_number_raw = str(analysis.get("invoice_number") or "")
    duplicate_of: Invoice | None = None
    if inv_number_raw and issuer_eik:
        dup_result = await db.execute(
            select(Invoice).where(
                Invoice.profile_id == profile_id,
                Invoice.issuer_eik == issuer_eik,
                Invoice.invoice_number == inv_number_raw,
            )
        )
        duplicate_of = dup_result.scalars().first()

    if duplicate_of is not None:
        # Remove the freshly-uploaded temp file; existing invoice takes precedence.
        # No quota is consumed because `_check_and_increment_usage` runs only for
        # genuinely new invoices (below).
        try:
            os.remove(inbox_path)
        except OSError as err:
            logger.warning(f"Failed to remove duplicate temp file {inbox_path}: {err}")
        return {
            "invoice": InvoiceOut.model_validate(duplicate_of),
            "analysis": analysis,
            "duplicate": True,
        }

    # New invoice is going to be stored — consume monthly quota now. If the
    # user is over limit, clean up the inbox file so we don't leak disk space.
    try:
        await _check_and_increment_usage(user.id, db)
    except HTTPException:
        try:
            os.remove(inbox_path)
        except OSError as err:
            logger.warning(f"Failed to remove over-quota temp file {inbox_path}: {err}")
        raise

    # Build new filename from analysis
    inv_date = analysis.get("date", "")
    inv_number = analysis.get("invoice_number", "")
    inv_issuer = analysis.get("issuer_name", "") if invoice_type == "purchase" else analysis.get("recipient_name", "")
    new_filename = sanitize_filename(f"{inv_date}_{inv_number}_{inv_issuer}") + ext if inv_date else safe_name

    # Determine destination path
    dest_subdir = "Фактури покупки" if invoice_type == "purchase" else "Фактури продажби"
    if matched_company_name:
        dest_path = os.path.join(get_profile_dir(profile_id), sanitize_path_component(matched_company_name), dest_subdir, new_filename)
    else:
        dest_path = os.path.join(inbox_dir, new_filename)

    # Move file to destination
    dest_dir = os.path.dirname(dest_path)
    os.makedirs(dest_dir, exist_ok=True)
    if inbox_path != dest_path:
        os.rename(inbox_path, dest_path)

    # Create invoice record
    invoice = Invoice(
        id=str(uuid.uuid4()),
        profile_id=profile_id,
        original_filename=file.filename,
        new_filename=new_filename,
        invoice_type=invoice_type,
        company_id=matched_company_id,
        company_name=matched_company_name,
        date=inv_date,
        issuer_name=analysis.get("issuer_name") or "",
        issuer_eik=analysis.get("issuer_eik") or "",
        issuer_vat=analysis.get("issuer_vat") or "",
        recipient_name=analysis.get("recipient_name") or "",
        recipient_eik=analysis.get("recipient_eik") or "",
        recipient_vat=analysis.get("recipient_vat") or "",
        invoice_number=str(analysis.get("invoice_number") or ""),
        total_amount=str(analysis.get("total_amount") or ""),
        vat_amount=str(analysis.get("vat_amount") or ""),
        destination_path=dest_path,
        status="processed" if matched_company_id else "unmatched",
        source="scan",
    )
    db.add(invoice)

    # Notify if unmatched
    if not matched_company_id:
        db.add(
            Notification(
                profile_id=profile_id,
                type="unmatched_invoice",
                title="Несъответстваща фактура",
                message=f"Фактура {file.filename} не може да бъде съпоставена с фирма.",
                filename=file.filename,
                source="upload",
            )
        )

    await db.flush()

    # Real-time notification via WebSocket
    await ws_manager.notify_profile(
        profile_id,
        {"type": "refresh", "reason": "invoice_uploaded"},
    )

    return {
        "invoice": InvoiceOut.model_validate(invoice),
        "analysis": analysis,
    }


@router.get("/invoices")
async def list_invoices(
    profile_id: str,
    company_id: str = Query(default=""),
    invoice_type: str = Query(default=""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List invoices for a profile, optionally filtered by company and type.

    Owners see every invoice under their profile; users with a company
    share see only the invoices tied to the companies shared with them.
    """
    allowed = await _accessible_company_ids(profile_id, user, db)

    query = select(Invoice).where(Invoice.profile_id == profile_id)
    if company_id:
        if allowed is not None and company_id not in allowed:
            raise HTTPException(status_code=403, detail="Нямате достъп до тази фирма")
        query = query.where(Invoice.company_id == company_id)
    elif allowed is not None:
        if not allowed:
            return []
        query = query.where(Invoice.company_id.in_(allowed))
    if invoice_type:
        query = query.where(Invoice.invoice_type == invoice_type)

    query = query.order_by(Invoice.created_at.desc())
    result = await db.execute(query)
    invoices = result.scalars().all()
    return [InvoiceOut.model_validate(inv) for inv in invoices]


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    profile_id: str,
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single invoice by ID."""
    allowed = await _accessible_company_ids(profile_id, user, db)

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.profile_id == profile_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    if allowed is not None and invoice.company_id not in allowed:
        raise HTTPException(status_code=403, detail="Нямате достъп до тази фактура")

    return InvoiceOut.model_validate(invoice)


@router.get("/invoices/{invoice_id}/download")
async def download_invoice(
    profile_id: str,
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download an invoice file (decrypted)."""
    allowed = await _accessible_company_ids(profile_id, user, db)

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.profile_id == profile_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")
    if allowed is not None and invoice.company_id not in allowed:
        raise HTTPException(status_code=403, detail="Нямате достъп до тази фактура")

    if not invoice.destination_path or not os.path.exists(invoice.destination_path):
        raise HTTPException(status_code=404, detail="Файлът не е намерен на диска")

    content = read_decrypted_file(invoice.destination_path)
    ext = os.path.splitext(invoice.new_filename)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".webp": "image/webp",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    def iterfile():
        yield content

    safe_filename = invoice.new_filename.replace(chr(34), "_").replace(chr(10), "").replace(chr(13), "")
    return StreamingResponse(
        iterfile(),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    profile_id: str,
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an invoice and its file.

    If this invoice was cross-copied from another profile, update the
    source invoice's cross_copy_status to 'deleted_by_recipient' and
    notify the source profile via WebSocket so the resync button
    becomes active.
    """
    await _verify_profile_access(profile_id, user, db)

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.profile_id == profile_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")

    # If this invoice was cross-copied, notify the source profile
    source_invoice_id = invoice.source_invoice_id
    source_profile_id: str | None = None
    if source_invoice_id:
        src_result = await db.execute(select(Invoice).where(Invoice.id == source_invoice_id))
        src_invoice = src_result.scalar_one_or_none()
        if src_invoice:
            src_invoice.cross_copy_status = "deleted_by_recipient"
            source_profile_id = src_invoice.profile_id
            # Add notification to source profile
            db.add(
                Notification(
                    profile_id=src_invoice.profile_id,
                    type="cross_copy_deleted",
                    title="Контрагентът изтри фактура",
                    message=(f"Контрагентът изтри копието на фактура {invoice.new_filename}. Можете да я синхронизирате наново."),
                    filename=src_invoice.new_filename,
                    source="cross-copy",
                )
            )

    # Delete file from disk
    if invoice.destination_path and os.path.exists(invoice.destination_path):
        try:
            os.remove(invoice.destination_path)
        except Exception as e:
            logger.warning(f"Failed to delete file {invoice.destination_path}: {e}")

    await db.delete(invoice)
    await db.flush()

    # Notify via WebSocket (sent before transaction commit; low risk of commit failure)
    if source_profile_id:
        await ws_manager.notify_profile(
            source_profile_id,
            {"type": "refresh", "reason": "cross_copy_deleted"},
        )
    # Notify current profile too
    await ws_manager.notify_profile(
        profile_id,
        {"type": "refresh", "reason": "invoice_deleted"},
    )

    return {"message": "Фактурата е изтрита"}


@router.post("/invoices/{invoice_id}/resync")
async def resync_invoice(
    profile_id: str,
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-sync an invoice whose cross-copy was deleted by the recipient.

    Resets cross_copy_status back to 'none' so the auto-sync process
    will pick it up again and re-create the cross-copy.
    """
    await _verify_profile_access(profile_id, user, db)

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.profile_id == profile_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")

    if invoice.cross_copy_status != "deleted_by_recipient":
        raise HTTPException(
            status_code=400,
            detail="Фактурата не може да бъде ресинхронизирана — статусът не е 'изтрита от контрагента'.",
        )

    # Reset status so auto-sync picks it up
    invoice.cross_copy_status = "none"
    await db.flush()

    await ws_manager.notify_profile(
        profile_id,
        {"type": "refresh", "reason": "invoice_resync"},
    )

    return {"message": "Фактурата е маркирана за повторна синхронизация", "invoice": InvoiceOut.model_validate(invoice)}


@router.post("/invoices/{invoice_id}/reclassify")
async def reclassify_invoice(
    profile_id: str,
    invoice_id: str,
    company_id: str = Query(...),
    invoice_type: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually assign an unmatched invoice to a company and type.

    Moves the file from inbox into the target company's purchase/sale folder,
    updates metadata, and flips status to ``processed``.
    """
    await _verify_profile_access(profile_id, user, db)

    if invoice_type not in ("purchase", "sale"):
        raise HTTPException(status_code=400, detail="invoice_type трябва да е 'purchase' или 'sale'")

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.profile_id == profile_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")

    comp_result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    company = comp_result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    dest_subdir = "Фактури покупки" if invoice_type == "purchase" else "Фактури продажби"
    dest_dir = os.path.join(get_profile_dir(profile_id), sanitize_path_component(company.name), dest_subdir)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, invoice.new_filename or os.path.basename(invoice.destination_path))

    if invoice.destination_path and os.path.exists(invoice.destination_path) and invoice.destination_path != dest_path:
        try:
            os.rename(invoice.destination_path, dest_path)
        except OSError as err:
            logger.warning(f"Failed to move {invoice.destination_path} -> {dest_path}: {err}")
            raise HTTPException(status_code=500, detail="Неуспешно преместване на файла")

    invoice.company_id = company.id
    invoice.company_name = company.name
    invoice.invoice_type = invoice_type
    invoice.destination_path = dest_path
    invoice.status = "processed"
    await db.flush()

    await ws_manager.notify_profile(
        profile_id,
        {"type": "refresh", "reason": "invoice_reclassified"},
    )

    return {"message": "Фактурата е прекласифицирана", "invoice": InvoiceOut.model_validate(invoice)}


@router.get("/inbox")
async def list_inbox(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List unmatched invoices in inbox."""
    await _verify_profile_access(profile_id, user, db)

    result = await db.execute(
        select(Invoice)
        .where(
            Invoice.profile_id == profile_id,
            Invoice.status == "unmatched",
        )
        .order_by(Invoice.created_at.desc())
    )
    invoices = result.scalars().all()
    return [InvoiceOut.model_validate(inv) for inv in invoices]


@router.get("/folder-structure")
async def get_folder_structure(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the folder structure for a profile.

    Each folder corresponds to a company. Includes company_id so that the
    frontend can navigate to per-company actions (new invoice, clients,
    items, sync, settings) without a second name→id lookup. Companies that
    don't yet have a folder on disk are still returned (with empty counts)
    so the UI can show every registered company.
    """
    allowed = await _accessible_company_ids(profile_id, user, db)

    # Load every registered company in the profile to attach ids and include
    # companies that haven't had any files yet. Shared users see only the
    # subset of companies they have a CompanyShare for.
    company_query = select(Company).where(Company.profile_id == profile_id)
    if allowed is not None:
        if not allowed:
            return []
        company_query = company_query.where(Company.id.in_(allowed))
    company_result = await db.execute(company_query)
    companies = company_result.scalars().all()
    # Directory names on disk are sanitized via sanitize_path_component, so
    # the lookup key must be the sanitized name too. Two companies in the
    # same profile can collide on the sanitized key (there's no DB uniqueness
    # constraint), so we store a list per key and render each entry once.
    company_by_dir: dict[str, list[Company]] = {}
    for c in companies:
        company_by_dir.setdefault(sanitize_path_component(c.name), []).append(c)

    # Proforma counts per own company: InvInvoiceMeta rows on this profile
    # with document_type='proforma' and status='issued'. v1 surfaces this
    # inline in the folder header ("X покупки, Y продажби, Z проформи"), so
    # the count flows through alongside the on-disk purchases/sales counts.
    proforma_count_by_company: dict[str, int] = {}
    my_company_ids = [c.id for c in companies]
    if my_company_ids:
        proforma_rows = (
            (
                await db.execute(
                    select(InvInvoiceMeta.company_id).where(
                        InvInvoiceMeta.company_id.in_(my_company_ids),
                        InvInvoiceMeta.document_type == "proforma",
                        InvInvoiceMeta.status == "issued",
                    )
                )
            )
            .scalars()
            .all()
        )
        for cid in proforma_rows:
            if cid:
                proforma_count_by_company[cid] = proforma_count_by_company.get(cid, 0) + 1

    # Pending cross-copy counts per company EIK: invoices issued by *other*
    # profiles to a client whose EIK matches one of our companies and which
    # are still awaiting this profile's approval. These live in
    # inv_invoice_meta (not on disk), so the count is DB-driven and only
    # non-zero while an approval is outstanding — exactly when the UI should
    # reveal the "Чакащи одобрение" subfolder.
    pending_count_by_eik: dict[str, int] = {}
    my_eiks = [c.eik for c in companies if c.eik]
    if my_eiks:
        client_rows = (await db.execute(select(InvClient.id, InvClient.eik).where(InvClient.eik.in_(my_eiks)))).all()
        eik_by_client_id = {row.id: row.eik for row in client_rows}
        if eik_by_client_id:
            pending_client_ids = (
                (
                    await db.execute(
                        select(InvInvoiceMeta.client_id).where(
                            InvInvoiceMeta.client_id.in_(list(eik_by_client_id.keys())),
                            InvInvoiceMeta.cross_copy_status == "pending",
                            InvInvoiceMeta.status == "issued",
                            InvInvoiceMeta.profile_id != profile_id,
                        )
                    )
                )
                .scalars()
                .all()
            )
            for cid in pending_client_ids:
                eik = eik_by_client_id.get(cid)
                if eik:
                    pending_count_by_eik[eik] = pending_count_by_eik.get(eik, 0) + 1

    # Map on-disk (Bulgarian) subfolder names to stable English slugs so the
    # frontend doesn't couple to filesystem labels.
    SUB_SLUG = {
        "Фактури покупки": "purchases",
        "Фактури продажби": "sales",
        "Фактури за одобрение": "pending",
    }

    def _with_pending(subfolders: list[dict], eik: str) -> list[dict]:
        """Append the DB-driven pending subfolder entry when there's work."""
        count = pending_count_by_eik.get(eik, 0)
        if count <= 0:
            return subfolders
        return [*subfolders, {"name": "pending", "display_name": "Чакащи одобрение", "file_count": count}]

    profile_dir = get_profile_dir(profile_id)
    folders: list[dict] = []
    rendered_company_ids: set[str] = set()

    if os.path.exists(profile_dir):
        for item in sorted(os.listdir(profile_dir)):
            item_path = os.path.join(profile_dir, item)
            if not os.path.isdir(item_path):
                continue
            subfolders = []
            for sub in sorted(os.listdir(item_path)):
                sub_path = os.path.join(item_path, sub)
                if os.path.isdir(sub_path):
                    slug = SUB_SLUG.get(sub, sub)
                    # The on-disk "Фактури за одобрение" directory is created
                    # by ensure_company_dirs but never populated — the real
                    # pending count comes from inv_invoice_meta below.
                    if slug == "pending":
                        continue
                    file_count = len([f for f in os.listdir(sub_path) if os.path.isfile(os.path.join(sub_path, f))])
                    subfolders.append(
                        {
                            "name": slug,
                            "display_name": sub,
                            "file_count": file_count,
                        }
                    )
            matches = company_by_dir.get(item, [])
            if matches:
                # Emit one row per company sharing this sanitized directory
                # name so none are silently dropped.
                for comp in matches:
                    folders.append(
                        {
                            "name": comp.name,
                            "company_id": comp.id,
                            "eik": comp.eik,
                            "proforma_count": proforma_count_by_company.get(comp.id, 0),
                            "subfolders": _with_pending(subfolders, comp.eik or ""),
                        }
                    )
                    rendered_company_ids.add(comp.id)
            elif allowed is None:
                # Orphan directories (no matching DB company) only leak to the
                # profile owner; shared users must never see them.
                folders.append(
                    {
                        "name": item,
                        "company_id": None,
                        "eik": "",
                        "proforma_count": 0,
                        "subfolders": subfolders,
                    }
                )

    # Append companies with no folder yet (freshly added, no uploads).
    for comp in companies:
        if comp.id in rendered_company_ids:
            continue
        folders.append(
            {
                "name": comp.name,
                "company_id": comp.id,
                "eik": comp.eik,
                "proforma_count": proforma_count_by_company.get(comp.id, 0),
                "subfolders": _with_pending([], comp.eik or ""),
            }
        )

    folders.sort(key=lambda f: f["name"].lower())
    return {"folders": folders}
