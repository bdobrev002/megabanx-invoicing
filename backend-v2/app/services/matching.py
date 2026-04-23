"""Company matching and invoice filename building (v1 parity).

Ported from v1 (``bginvoices``) so that uploaded documents get classified
with the same heuristics as the legacy system: EIK exact → VAT exact →
VAT-digits-vs-EIK → fuzzy name. The naming rules mirror v1 too, including
the "КИ" suffix on credit notes.
"""

from __future__ import annotations

import os
import re
from typing import Iterable

from app.models.company import Company
from app.utils.helpers import sanitize_filename


def _clean(value: str | None) -> str:
    return re.sub(r"\s+", "", str(value)) if value else ""


def _digits_only(value: str) -> str:
    return re.sub(r"[^0-9]", "", value)


def _normalize_name(name: str) -> str:
    n = name.strip().lower()
    # Strip straight and curly quotes so that "Акме" ЕООД == Акме ЕООД.
    for ch in ('"', "'", "\u201e", "\u201c", "\u201d", "\u00ab", "\u00bb"):
        n = n.replace(ch, "")
    n = re.sub(r"\s+", " ", n).strip()
    return n


def match_company(
    companies: Iterable[Company],
    eik: str | None,
    vat: str | None,
    name: str | None,
) -> Company | None:
    """Find the first company that matches by EIK, VAT, or name.

    Matching order (v1 parity):
      1. EIK exact (whitespace-insensitive)
      2. VAT exact (whitespace-insensitive)
      3. VAT digits vs EIK (Bulgarian VAT numbers embed the EIK)
      4. Fuzzy name (case/quote/whitespace-insensitive)
    """
    companies = list(companies)
    if not companies:
        return None

    if eik:
        clean_eik = _clean(eik)
        for company in companies:
            if _clean(company.eik) == clean_eik:
                return company

    if vat:
        clean_vat = _clean(vat)
        for company in companies:
            company_vat = _clean(company.vat_number or "")
            if company_vat and company_vat == clean_vat:
                return company
        vat_digits = _digits_only(clean_vat)
        if vat_digits:
            for company in companies:
                company_eik = _clean(company.eik)
                if company_eik and company_eik == vat_digits:
                    return company

    if name:
        clean_name = _normalize_name(name)
        if clean_name:
            for company in companies:
                company_name = _normalize_name(company.name or "")
                if company_name and company_name == clean_name:
                    return company

    return None


def build_invoice_filename(
    *,
    invoice_type: str,
    date: str,
    invoice_number: str,
    issuer_name: str,
    recipient_name: str,
    is_credit_note: bool,
    ext: str,
) -> str:
    """Build a v1-style filename for an invoice.

    Sale:     ``{date} {number} - {recipient}[ КИ]{ext}``
    Purchase: ``{date} {issuer} - {number}[ КИ]{ext}``

    Missing pieces fall back to ``без_номер`` / ``неизвестен`` (matching v1).
    """
    cn_suffix = " КИ" if is_credit_note else ""
    safe_number = sanitize_filename(invoice_number) if invoice_number else "без_номер"
    if invoice_type == "sale":
        safe_recipient = sanitize_filename(recipient_name) if recipient_name else "неизвестен"
        return f"{date} {safe_number} - {safe_recipient}{cn_suffix}{ext}"
    # purchase (and any other classification) uses the issuer-first pattern
    safe_issuer = sanitize_filename(issuer_name) if issuer_name else "неизвестен"
    return f"{date} {safe_issuer} - {safe_number}{cn_suffix}{ext}"


def unique_destination_path(dest_dir: str, filename: str) -> str:
    """Return a non-colliding path inside ``dest_dir`` for ``filename``.

    Mirrors v1: if the target exists, append ``(1)``, ``(2)``, … before the
    extension. Caller is responsible for ensuring ``dest_dir`` exists.
    """
    base, ext = os.path.splitext(filename)
    candidate = os.path.join(dest_dir, filename)
    counter = 1
    while os.path.exists(candidate):
        candidate = os.path.join(dest_dir, f"{base} ({counter}){ext}")
        counter += 1
    return candidate
