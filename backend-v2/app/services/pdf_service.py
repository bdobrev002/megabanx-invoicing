"""Invoice PDF generation service (WeasyPrint + Jinja2).

Templates live in ``backend-v2/app/templates/``; rendered PDFs are written
under ``settings.DATA_DIR/{profile_id}/{company_name}/Фактури продажби/``.
The service is intentionally side-effectful — callers schedule it via
``BackgroundTasks`` after an invoice row has been persisted, and the
function updates ``inv_invoice_meta.pdf_path`` when rendering succeeds.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import text

from app.config import settings
from app.database import async_session_factory
from app.services.file_manager import sanitize_path_component

logger = logging.getLogger("megabanx.invoicing.pdf")

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

DOC_TYPE_LABELS: dict[str, tuple[str, str, str]] = {
    # (UPPER header, Title case, template file)
    "invoice": ("ФАКТУРА", "Фактура", "invoice_pdf.html"),
    "proforma": ("ПРОФОРМА", "Проформа", "proforma_pdf.html"),
    "debit_note": ("ДЕБИТНО ИЗВЕСТИЕ", "Дебитно известие", "invoice_pdf.html"),
    "credit_note": ("КРЕДИТНО ИЗВЕСТИЕ", "Кредитно известие", "invoice_pdf.html"),
}

CURRENCY_LABELS: dict[str, str] = {
    "BGN": "лв.",
    "EUR": "EUR",
    "USD": "USD",
}


@dataclass
class InvoicePdfSnapshot:
    """Immutable snapshot passed from request context to the background task."""

    invoice_id: str
    profile_id: str
    document_type: str
    invoice_number: int
    issue_date: date
    tax_event_date: date | None
    due_date: date | None
    company_folder_name: str
    client_display_name: str
    company: dict[str, Any]
    client: dict[str, Any]
    lines: list[dict[str, Any]] = field(default_factory=list)
    subtotal: Decimal = Decimal("0.00")
    discount: Decimal = Decimal("0.00")
    vat_amount: Decimal = Decimal("0.00")
    total: Decimal = Decimal("0.00")
    vat_rate: Decimal = Decimal("20.00")
    no_vat: bool = False
    no_vat_reason: str = ""
    payment_method: str = ""
    notes: str = ""
    currency: str = "BGN"
    composed_by: str = ""
    old_pdf_path: str = ""


def _format_date(d: date | None) -> str:
    return d.strftime("%d.%m.%Y") if d else ""


def _build_context(snap: InvoicePdfSnapshot) -> tuple[dict[str, Any], str]:
    label_upper, label_title, template_name = DOC_TYPE_LABELS.get(snap.document_type, DOC_TYPE_LABELS["invoice"])
    currency_label = CURRENCY_LABELS.get(snap.currency.upper(), snap.currency)

    tax_base = max(Decimal("0.00"), snap.subtotal - snap.discount)

    context = {
        "doc_type_label": label_upper,
        "doc_type_lower": label_title,
        "doc_copy_label": "Оригинал",
        "invoice_number": str(snap.invoice_number).zfill(10),
        "issue_date": snap.issue_date.isoformat(),
        "tax_event_date": (snap.tax_event_date or snap.issue_date).isoformat(),
        "due_date": snap.due_date.isoformat() if snap.due_date else "",
        "issue_date_formatted": _format_date(snap.issue_date),
        "tax_event_date_formatted": _format_date(snap.tax_event_date or snap.issue_date),
        "due_date_formatted": _format_date(snap.due_date),
        "company": snap.company,
        "client": snap.client,
        "lines": snap.lines,
        "subtotal": f"{snap.subtotal:.2f}",
        "discount": f"{snap.discount:.2f}",
        "tax_base": f"{tax_base:.2f}",
        "vat_amount": f"{snap.vat_amount:.2f}",
        "vat_rate": f"{snap.vat_rate:.0f}",
        "total": f"{snap.total:.2f}",
        "no_vat": snap.no_vat,
        "no_vat_reason": snap.no_vat_reason,
        "payment_method": snap.payment_method,
        "notes": snap.notes,
        "currency": snap.currency,
        "currency_label": currency_label,
        "composed_by": snap.composed_by,
        "logo_base64": None,
        "total_words": "",
    }
    return context, template_name


def _resolve_pdf_path(snap: InvoicePdfSnapshot) -> Path:
    sales_dir = (
        Path(settings.DATA_DIR)
        / sanitize_path_component(snap.profile_id)
        / sanitize_path_component(snap.company_folder_name)
        / "Фактури продажби"
    )
    sales_dir.mkdir(parents=True, exist_ok=True)
    invoice_number_str = str(snap.invoice_number).zfill(10)
    date_formatted = snap.issue_date.strftime("%Y.%m.%d")
    filename = f"{date_formatted} {invoice_number_str} - {sanitize_path_component(snap.client_display_name)}.pdf"
    return sales_dir / filename


async def _persist_pdf_path(invoice_id: str, pdf_path: str) -> None:
    async with async_session_factory() as session:
        await session.execute(
            text("UPDATE inv_invoice_meta SET pdf_path = :p WHERE invoice_id = :id"),
            {"p": pdf_path, "id": invoice_id},
        )
        await session.commit()


def _render_pdf_sync(snap: InvoicePdfSnapshot) -> str | None:
    """Synchronous WeasyPrint rendering; safe to run in a worker thread."""
    try:
        context, template_name = _build_context(snap)
        env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )
        template = env.get_template(template_name)
        html_content = template.render(**context)

        pdf_path = _resolve_pdf_path(snap)

        # Import WeasyPrint lazily so import errors do not break module loading
        # on minimal dev environments without its native dependencies.
        from weasyprint import HTML  # type: ignore[import-not-found]

        HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf(str(pdf_path))
        logger.info("Invoice PDF written: %s", pdf_path)

        if snap.old_pdf_path and snap.old_pdf_path != str(pdf_path):
            try:
                if os.path.exists(snap.old_pdf_path):
                    os.remove(snap.old_pdf_path)
                    logger.info("Old PDF removed: %s", snap.old_pdf_path)
            except OSError:
                logger.warning("Could not remove stale PDF %s", snap.old_pdf_path)

        return str(pdf_path)
    except ImportError:
        logger.warning("WeasyPrint not installed — skipping PDF for %s", snap.invoice_id)
        return None
    except Exception:
        logger.exception("PDF generation failed for invoice %s", snap.invoice_id)
        return None


async def render_invoice_pdf(snap: InvoicePdfSnapshot) -> str | None:
    """Render the invoice PDF and persist ``pdf_path``.

    Runs as a FastAPI ``BackgroundTasks`` callback, i.e. after the response
    (and the owning DB transaction) has committed. Errors are logged but
    never raised — a failed render must not break the invoice that exists.
    """
    pdf_path = await asyncio.to_thread(_render_pdf_sync, snap)
    if pdf_path is None:
        return None
    try:
        await _persist_pdf_path(snap.invoice_id, pdf_path)
    except Exception:
        logger.exception("Could not persist pdf_path for invoice %s", snap.invoice_id)
    return pdf_path
