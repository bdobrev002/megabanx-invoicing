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
from app.models.notification import Notification
from app.models.profile import Profile
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
    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Профилът не е намерен")
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп до този профил")
    return profile


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
    invoice_type: str = Query(default="purchase"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an invoice file, analyze with AI, and store."""
    await _verify_profile_access(profile_id, user, db)
    await _check_and_increment_usage(user.id, db)

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

    # Determine company by matching EIK
    matched_company_id = company_id
    matched_company_name = ""

    if not matched_company_id and analysis:
        recipient_eik = analysis.get("recipient_eik", "")
        issuer_eik = analysis.get("issuer_eik", "")
        target_eik = recipient_eik if invoice_type == "purchase" else issuer_eik

        if target_eik:
            result = await db.execute(
                select(Company).where(
                    Company.profile_id == profile_id,
                    Company.eik == target_eik,
                )
            )
            matched = result.scalar_one_or_none()
            if matched:
                matched_company_id = matched.id
                matched_company_name = matched.name

    if matched_company_id and not matched_company_name:
        result = await db.execute(select(Company).where(Company.id == matched_company_id))
        comp = result.scalar_one_or_none()
        if comp:
            matched_company_name = comp.name

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
    """List invoices for a profile, optionally filtered by company and type."""
    await _verify_profile_access(profile_id, user, db)

    query = select(Invoice).where(Invoice.profile_id == profile_id)
    if company_id:
        query = query.where(Invoice.company_id == company_id)
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
    await _verify_profile_access(profile_id, user, db)

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.profile_id == profile_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")

    return InvoiceOut.model_validate(invoice)


@router.get("/invoices/{invoice_id}/download")
async def download_invoice(
    profile_id: str,
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download an invoice file (decrypted)."""
    await _verify_profile_access(profile_id, user, db)

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.profile_id == profile_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Фактурата не е намерена")

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
                    message=(f"Контрагентът изтри копието на фактура {invoice.new_filename}. " f"Можете да я синхронизирате наново."),
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
    """Return the folder structure for a profile."""
    await _verify_profile_access(profile_id, user, db)

    profile_dir = get_profile_dir(profile_id)
    if not os.path.exists(profile_dir):
        return {"folders": []}

    folders = []
    for item in sorted(os.listdir(profile_dir)):
        item_path = os.path.join(profile_dir, item)
        if os.path.isdir(item_path):
            subfolders = []
            for sub in sorted(os.listdir(item_path)):
                sub_path = os.path.join(item_path, sub)
                if os.path.isdir(sub_path):
                    file_count = len([f for f in os.listdir(sub_path) if os.path.isfile(os.path.join(sub_path, f))])
                    subfolders.append({"name": sub, "file_count": file_count})
            folders.append({"name": item, "subfolders": subfolders})

    return {"folders": folders}
