"""Invoices router: upload, AI analysis, list, download, delete, batch operations."""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
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
from app.services.matching import (
    build_invoice_filename,
    match_company,
    unique_destination_path,
)
from app.services.ws_manager import ws_manager

logger = logging.getLogger("megabanx.invoices")

router = APIRouter(prefix="/api/profiles/{profile_id}", tags=["invoices"])


# --- Parallel processing (v1 parity) ---
# v1 runs up to 10 concurrent Gemini calls per profile during batch processing.
# Each profile gets its own ``asyncio.Semaphore`` so one user's big batch does
# not starve another user, but DB writes + filesystem moves remain serialized
# on the request's shared session.
GEMINI_MAX_PARALLEL_PER_PROFILE = 10
_profile_gemini_semaphores: dict[str, asyncio.Semaphore] = {}


def _profile_semaphore(profile_id: str) -> asyncio.Semaphore:
    sem = _profile_gemini_semaphores.get(profile_id)
    if sem is None:
        sem = asyncio.Semaphore(GEMINI_MAX_PARALLEL_PER_PROFILE)
        _profile_gemini_semaphores[profile_id] = sem
    return sem


async def _analyze_with_semaphore(profile_id: str, inbox_path: str, inbox_filename: str) -> dict:
    """Run Gemini analysis under the profile's concurrency limit.

    Returns the parsed analysis dict, or ``{}`` if the call failed (caller
    treats an empty analysis as 'AI не успя').
    """
    sem = _profile_semaphore(profile_id)
    async with sem:
        try:
            return await analyze_invoice_with_gemini(inbox_path)
        except Exception as e:
            logger.warning(f"AI analysis failed for {inbox_filename}: {e}")
            return {}


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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save an uploaded invoice to the profile inbox (no AI, no quota).

    v1 parity: upload is a pure file-staging step. Call ``POST /process``
    afterwards to run Gemini analysis + matching + classification across
    every file currently in the inbox.
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

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Файлът е празен")
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файлът е твърде голям (макс. 20MB)")

    inbox_dir = get_inbox_dir(profile_id)
    os.makedirs(inbox_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex[:8]}_{sanitize_path_component(file.filename)}"
    inbox_path = os.path.join(inbox_dir, safe_name)
    write_encrypted_file(inbox_path, content)

    await ws_manager.notify_profile(
        profile_id,
        {"type": "refresh", "reason": "inbox_uploaded"},
    )
    return {
        "original_filename": file.filename,
        "inbox_filename": safe_name,
        "size": len(content),
    }


async def _process_single_inbox_file(
    *,
    profile_id: str,
    user: User,
    db: AsyncSession,
    inbox_path: str,
    inbox_filename: str,
    companies: list[Company],
    analysis: dict | None = None,
) -> dict:
    """Run Gemini analysis + matching + classification for a single inbox file.

    Shared by the legacy single-file path and the new batch processor. If
    ``analysis`` is provided the Gemini call is skipped (used by the SSE
    streaming path, which runs analysis in parallel upfront).

    Returns a dict describing the outcome (processed / unmatched / duplicate /
    over_limit / error) plus the Invoice row (if one was created).
    """
    original_filename = inbox_filename.split("_", 1)[1] if "_" in inbox_filename else inbox_filename
    ext = os.path.splitext(inbox_filename)[1].lower()

    if analysis is None:
        analysis = {}
        try:
            analysis = await analyze_invoice_with_gemini(inbox_path)
        except Exception as e:
            logger.warning(f"AI analysis failed for {inbox_filename}: {e}")

    issuer_eik = (analysis.get("issuer_eik") or "").strip()
    issuer_vat = (analysis.get("issuer_vat") or "").strip()
    issuer_name = (analysis.get("issuer_name") or "").strip()
    recipient_eik = (analysis.get("recipient_eik") or "").strip()
    recipient_vat = (analysis.get("recipient_vat") or "").strip()
    recipient_name = (analysis.get("recipient_name") or "").strip()
    is_credit_note = bool(analysis.get("is_credit_note"))

    # v1 parity: try issuer first (profile issued it → sale), then recipient
    # (profile received it → purchase). Each tier uses EIK → VAT → VAT-digits
    # fallback → fuzzy name, via ``match_company``.
    issuer_match = match_company(companies, issuer_eik, issuer_vat, issuer_name)
    recipient_match = match_company(companies, recipient_eik, recipient_vat, recipient_name)

    matched_company: Company | None = None
    invoice_type = ""
    if issuer_match is not None:
        matched_company = issuer_match
        invoice_type = "sale"
    elif recipient_match is not None:
        matched_company = recipient_match
        invoice_type = "purchase"

    # Duplicate detection (only meaningful when we have an issuer EIK + number)
    inv_number = str(analysis.get("invoice_number") or "").strip()
    inv_date = str(analysis.get("date") or "").strip()
    if inv_number and issuer_eik:
        # Only treat a real, matched invoice as a duplicate. Unmatched rows are
        # placeholders for files still sitting in the inbox — reprocessing them
        # must not flag the same file as a duplicate of its own prior pass.
        dup_result = await db.execute(
            select(Invoice).where(
                Invoice.profile_id == profile_id,
                Invoice.issuer_eik == issuer_eik,
                Invoice.invoice_number == inv_number,
                Invoice.status != "unmatched",
            )
        )
        duplicate_of = dup_result.scalars().first()
        if duplicate_of is not None:
            try:
                os.remove(inbox_path)
            except OSError as err:
                logger.warning(f"Failed to remove duplicate temp file {inbox_path}: {err}")
            return {
                "status": "duplicate",
                "original_filename": original_filename,
                "invoice": InvoiceOut.model_validate(duplicate_of),
                "analysis": analysis,
            }

    # Clean up any stale unmatched Invoice rows for this same inbox file from
    # prior processing runs. Without this, reprocessing accumulates duplicate
    # unmatched rows, and stale rows remain after a file finally gets matched.
    stale_unmatched = await db.execute(
        select(Invoice).where(
            Invoice.profile_id == profile_id,
            Invoice.destination_path == inbox_path,
            Invoice.status == "unmatched",
        )
    )
    for old_inv in stale_unmatched.scalars().all():
        await db.delete(old_inv)

    if matched_company is None:
        # v1 parity: unmatched files stay in the inbox directory; we create an
        # Invoice row (status="unmatched") so the frontend can render a
        # reclassify list with the AI-extracted details. No quota is consumed.
        reason_parts: list[str] = []
        if not issuer_eik and not issuer_vat and not issuer_name and not recipient_eik and not recipient_vat and not recipient_name:
            reason_parts.append("AI не извлече данни за фирмите")
        elif not analysis:
            reason_parts.append("AI анализът не успя")
        else:
            reason_parts.append("Няма съвпадение с регистрирана фирма")
        reason = "; ".join(reason_parts)

        invoice = Invoice(
            id=str(uuid.uuid4()),
            profile_id=profile_id,
            original_filename=original_filename,
            new_filename=original_filename,
            invoice_type="unknown",
            company_id="",
            company_name="",
            date=inv_date,
            issuer_name=issuer_name,
            issuer_eik=issuer_eik,
            issuer_vat=issuer_vat,
            recipient_name=recipient_name,
            recipient_eik=recipient_eik,
            recipient_vat=recipient_vat,
            invoice_number=inv_number,
            subtotal=str(analysis.get("subtotal") or ""),
            total_amount=str(analysis.get("total_amount") or ""),
            vat_amount=str(analysis.get("vat_amount") or ""),
            destination_path=inbox_path,
            status="unmatched",
            error_message=reason,
            is_credit_note=is_credit_note,
            source="scan",
        )
        db.add(invoice)
        db.add(
            Notification(
                profile_id=profile_id,
                type="unmatched_invoice",
                title="Без съвпадение",
                message=f"Файл {original_filename}: {reason}. Отворете 'Качване' за ръчно разпределение.",
                filename=original_filename,
                source="upload",
            )
        )
        await db.flush()
        return {
            "status": "unmatched",
            "original_filename": original_filename,
            "invoice": InvoiceOut.model_validate(invoice),
            "analysis": analysis,
            "reason": reason,
        }

    # Matched — consume quota, then move the file into the company folder.
    try:
        await _check_and_increment_usage(user.id, db)
    except HTTPException as err:
        logger.info(f"Over quota while processing {original_filename}: {err.detail}")
        return {
            "status": "over_limit",
            "original_filename": original_filename,
            "analysis": analysis,
            "reason": err.detail,
        }

    new_filename = build_invoice_filename(
        invoice_type=invoice_type,
        date=inv_date or "без_дата",
        invoice_number=inv_number,
        issuer_name=issuer_name,
        recipient_name=recipient_name,
        is_credit_note=is_credit_note,
        ext=ext,
    )
    dest_subdir = "Фактури покупки" if invoice_type == "purchase" else "Фактури продажби"
    dest_dir = os.path.join(
        get_profile_dir(profile_id),
        sanitize_path_component(matched_company.name),
        dest_subdir,
    )
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = unique_destination_path(dest_dir, new_filename)
    try:
        os.rename(inbox_path, dest_path)
    except OSError as err:
        logger.warning(f"Failed to move {inbox_path} -> {dest_path}: {err}")
        return {
            "status": "error",
            "original_filename": original_filename,
            "reason": f"Неуспешно преместване: {err}",
        }

    # Keep new_filename in sync with the actual on-disk name (unique_destination_path
    # may have added a " (1)"-style suffix to avoid collisions).
    new_filename = os.path.basename(dest_path)

    invoice = Invoice(
        id=str(uuid.uuid4()),
        profile_id=profile_id,
        original_filename=original_filename,
        new_filename=new_filename,
        invoice_type=invoice_type,
        company_id=matched_company.id,
        company_name=matched_company.name,
        date=inv_date,
        issuer_name=issuer_name,
        issuer_eik=issuer_eik,
        issuer_vat=issuer_vat,
        recipient_name=recipient_name,
        recipient_eik=recipient_eik,
        recipient_vat=recipient_vat,
        invoice_number=inv_number,
        subtotal=str(analysis.get("subtotal") or ""),
        total_amount=str(analysis.get("total_amount") or ""),
        vat_amount=str(analysis.get("vat_amount") or ""),
        destination_path=dest_path,
        status="processed",
        is_credit_note=is_credit_note,
        source="scan",
    )
    db.add(invoice)
    await db.flush()
    return {
        "status": "processed",
        "original_filename": original_filename,
        "invoice": InvoiceOut.model_validate(invoice),
        "analysis": analysis,
    }


@router.post("/process")
async def process_inbox(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Batch-process every file currently in the profile's inbox.

    Runs Gemini analysis + v1-style matching + naming on each file.
    Matched files are moved into the correct company folder and get a
    ``processed`` Invoice row (consuming monthly quota); unmatched files
    stay in the inbox with a ``unmatched`` Invoice row so the UI can
    surface them for manual reclassification. Returns a summary + per-file
    result list.
    """
    await _verify_profile_access(profile_id, user, db)

    inbox_dir = get_inbox_dir(profile_id)
    if not os.path.isdir(inbox_dir):
        return {"processed": 0, "unmatched": 0, "duplicate": 0, "over_limit": 0, "errors": 0, "results": []}

    companies_result = await db.execute(select(Company).where(Company.profile_id == profile_id))
    companies = list(companies_result.scalars().all())

    filenames = sorted(
        f
        for f in os.listdir(inbox_dir)
        if os.path.isfile(os.path.join(inbox_dir, f)) and os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    )

    results: list[dict] = []
    counts = {"processed": 0, "unmatched": 0, "duplicate": 0, "over_limit": 0, "errors": 0}
    for fname in filenames:
        fpath = os.path.join(inbox_dir, fname)
        try:
            res = await _process_single_inbox_file(
                profile_id=profile_id,
                user=user,
                db=db,
                inbox_path=fpath,
                inbox_filename=fname,
                companies=companies,
            )
        except Exception as e:
            logger.exception(f"Error processing inbox file {fname}: {e}")
            res = {"status": "error", "original_filename": fname, "reason": str(e)}
        status = res.get("status", "error")
        counts[status if status in counts else "errors"] = counts.get(status if status in counts else "errors", 0) + 1
        # Strip non-serializable bits (analysis dict is fine; keep small)
        results.append(
            {
                "status": status,
                "original_filename": res.get("original_filename", fname),
                "reason": res.get("reason"),
                "invoice": res.get("invoice"),
            }
        )

    await ws_manager.notify_profile(
        profile_id,
        {"type": "refresh", "reason": "inbox_processed"},
    )
    return {**counts, "results": results}


@router.get("/process-stream")
async def process_inbox_stream(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE variant of ``POST /process`` with v1-style parallel Gemini calls.

    The server runs up to ``GEMINI_MAX_PARALLEL_PER_PROFILE`` Gemini analyses
    at once and streams per-file progress so the frontend can mark each file
    as pending → processing → done/error with a live spinner.

    Events (``data: <json>``, SSE):
      - ``{"type": "init"}`` — stream opened, doing setup
      - ``{"type": "start", "total": N, "parallel": 10}`` — starting batch
      - ``{"type": "file_processing", "filename": "..."}`` — Gemini call began
      - ``{"type": "progress", "filename": "...", "status": "processed|unmatched|duplicate|over_limit|error", "current": i, "total": N}``
      - ``{"type": "complete", "counts": {...}, "results": [...]}``
      - ``{"type": "error", "message": "..."}`` — fatal (setup) error
    """
    await _verify_profile_access(profile_id, user, db)
    profile_id_local = profile_id
    user_local = user
    db_local = db

    async def event_generator():
        def sse(payload: dict) -> str:
            return f"data: {json.dumps(jsonable_encoder(payload), ensure_ascii=False)}\n\n"

        yield sse({"type": "init", "message": "Подготовка..."})

        empty_counts = {
            "processed": 0,
            "unmatched": 0,
            "duplicate": 0,
            "over_limit": 0,
            "errors": 0,
        }
        inbox_dir = get_inbox_dir(profile_id_local)
        if not os.path.isdir(inbox_dir):
            yield sse({"type": "complete", "counts": empty_counts, "results": []})
            return

        companies_result = await db_local.execute(select(Company).where(Company.profile_id == profile_id_local))
        companies = list(companies_result.scalars().all())

        filenames = sorted(
            f
            for f in os.listdir(inbox_dir)
            if os.path.isfile(os.path.join(inbox_dir, f)) and os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
        )
        total = len(filenames)

        if total == 0:
            yield sse({"type": "complete", "counts": empty_counts, "results": []})
            return

        yield sse({"type": "start", "total": total, "parallel": GEMINI_MAX_PARALLEL_PER_PROFILE})

        # Fan out: spawn one analysis task per file. ``_analyze_with_semaphore``
        # serializes to at most GEMINI_MAX_PARALLEL_PER_PROFILE concurrent calls.
        # We use an ``asyncio.Queue`` so the main loop can yield ``file_processing``
        # events the moment a task acquires the semaphore (before Gemini returns)
        # and ``progress`` events when it finishes.
        started_queue: asyncio.Queue = asyncio.Queue()
        finished_queue: asyncio.Queue = asyncio.Queue()

        async def analyze_task(fname: str):
            fpath = os.path.join(inbox_dir, fname)
            sem = _profile_semaphore(profile_id_local)
            async with sem:
                await started_queue.put(fname)
                try:
                    analysis = await analyze_invoice_with_gemini(fpath)
                except Exception as e:
                    logger.warning(f"AI analysis failed for {fname}: {e}")
                    analysis = {}
            await finished_queue.put((fname, analysis))

        tasks = [asyncio.create_task(analyze_task(f)) for f in filenames]

        counts = {"processed": 0, "unmatched": 0, "duplicate": 0, "over_limit": 0, "errors": 0}
        results: list[dict] = []
        processed = 0

        try:
            while processed < total:
                # Drain any already-started notifications first so UI can show
                # spinners as soon as Gemini calls begin.
                while not started_queue.empty():
                    started = started_queue.get_nowait()
                    yield sse({"type": "file_processing", "filename": started})

                fname, analysis = await finished_queue.get()
                # Drain started queue once more (started may have fired in between)
                while not started_queue.empty():
                    started = started_queue.get_nowait()
                    yield sse({"type": "file_processing", "filename": started})

                fpath = os.path.join(inbox_dir, fname)
                try:
                    res = await _process_single_inbox_file(
                        profile_id=profile_id_local,
                        user=user_local,
                        db=db_local,
                        inbox_path=fpath,
                        inbox_filename=fname,
                        companies=companies,
                        analysis=analysis,
                    )
                    await db_local.commit()
                except Exception as e:
                    logger.exception(f"Error processing inbox file {fname}: {e}")
                    await db_local.rollback()
                    res = {"status": "error", "original_filename": fname, "reason": str(e)}

                status = res.get("status", "error")
                counts_key = status if status in counts else "errors"
                counts[counts_key] = counts.get(counts_key, 0) + 1
                results.append(
                    {
                        "status": status,
                        "original_filename": res.get("original_filename", fname),
                        "reason": res.get("reason"),
                        "invoice": res.get("invoice"),
                    }
                )
                processed += 1
                yield sse(
                    {
                        "type": "progress",
                        "filename": fname,
                        "status": status,
                        "current": processed,
                        "total": total,
                    }
                )
        finally:
            for t in tasks:
                if not t.done():
                    t.cancel()
            # Let cancellations settle.
            await asyncio.gather(*tasks, return_exceptions=True)

        await ws_manager.notify_profile(
            profile_id_local,
            {"type": "refresh", "reason": "inbox_processed"},
        )
        yield sse({"type": "complete", "counts": counts, "results": results})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/inbox-files")
async def clear_inbox_files(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear the inbox (v1 "Изчисти" button).

    Removes every file currently in the inbox directory AND every
    ``unmatched`` Invoice row for this profile (and its on-disk file,
    which also lives in the inbox). Matched invoices in company folders
    are untouched.
    """
    await _verify_profile_access(profile_id, user, db)

    inbox_dir = get_inbox_dir(profile_id)
    removed_files = 0
    if os.path.isdir(inbox_dir):
        for fname in os.listdir(inbox_dir):
            fpath = os.path.join(inbox_dir, fname)
            if os.path.isfile(fpath):
                try:
                    os.remove(fpath)
                    removed_files += 1
                except OSError as err:
                    logger.warning(f"Failed to remove inbox file {fpath}: {err}")

    unmatched_result = await db.execute(select(Invoice).where(Invoice.profile_id == profile_id, Invoice.status == "unmatched"))
    unmatched_invoices = list(unmatched_result.scalars().all())
    for inv in unmatched_invoices:
        if inv.destination_path and os.path.exists(inv.destination_path):
            try:
                os.remove(inv.destination_path)
            except OSError as err:
                logger.warning(f"Failed to remove unmatched invoice file {inv.destination_path}: {err}")
        await db.delete(inv)

    await db.flush()
    await ws_manager.notify_profile(
        profile_id,
        {"type": "refresh", "reason": "inbox_cleared"},
    )
    return {"cleared_files": removed_files, "cleared_invoices": len(unmatched_invoices)}


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


@router.get("/inbox-files")
async def list_inbox_files(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List raw (unprocessed) files currently staged in the profile inbox.

    These are files uploaded via ``POST /upload`` but not yet processed
    through Gemini via ``POST /process``. Frontend uses this to render
    the "awaiting AI processing" list when the user re-opens the page.
    """
    await _verify_profile_access(profile_id, user, db)
    inbox_dir = get_inbox_dir(profile_id)
    if not os.path.isdir(inbox_dir):
        return {"files": []}
    entries: list[dict] = []
    for fname in sorted(os.listdir(inbox_dir)):
        fpath = os.path.join(inbox_dir, fname)
        if not os.path.isfile(fpath):
            continue
        if os.path.splitext(fname)[1].lower() not in SUPPORTED_EXTENSIONS:
            continue
        try:
            stat = os.stat(fpath)
        except OSError:
            continue
        # Strip the 8-char uuid prefix added by POST /upload so the UI can
        # show the user-friendly original filename.
        display = fname.split("_", 1)[1] if "_" in fname else fname
        entries.append(
            {
                "inbox_filename": fname,
                "original_filename": display,
                "size": stat.st_size,
            }
        )
    return {"files": entries}


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
