"""
Invoicing module router for megabanx.com backend.
Provides CRUD for clients, items, invoices + Trade Registry lookup + PDF generation.
All data stored in the existing bginvoices PostgreSQL database.

This file is deployed to /opt/bginvoices/backend/app/invoicing_router.py
and included in main.py via: from app.invoicing_router import invoicing_router
"""

import os
import uuid
import json
import logging
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from pathlib import Path

import httpx
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

logger = logging.getLogger("bginvoices.invoicing")

invoicing_router = APIRouter(prefix="/api/invoicing", tags=["invoicing"])

# ── Database helper (reuse main app's DB_CONFIG) ──────────────────────────
# These will be set by the main app when including this router
_db_config = None

def set_db_config(config: dict):
    global _db_config
    _db_config = config

from contextlib import contextmanager

@contextmanager
def get_db():
    conn = psycopg2.connect(**_db_config)
    conn.autocommit = False
    try:
        yield conn
    finally:
        conn.close()


# ── Database table creation ───────────────────────────────────────────────
def ensure_invoicing_tables():
    """Create invoicing tables if they don't exist."""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Clients table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inv_clients (
                        id TEXT PRIMARY KEY,
                        company_id TEXT NOT NULL,
                        profile_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        eik TEXT,
                        egn TEXT,
                        vat_number TEXT,
                        is_vat_registered BOOLEAN DEFAULT FALSE,
                        is_individual BOOLEAN DEFAULT FALSE,
                        mol TEXT,
                        city TEXT,
                        address TEXT,
                        email TEXT,
                        phone TEXT,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_clients_company ON inv_clients(company_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_clients_profile ON inv_clients(profile_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_clients_eik ON inv_clients(eik)")

                # Items table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inv_items (
                        id TEXT PRIMARY KEY,
                        company_id TEXT NOT NULL,
                        profile_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        unit TEXT DEFAULT 'бр.',
                        default_price NUMERIC(12,2) DEFAULT 0.00,
                        vat_rate NUMERIC(5,2) DEFAULT 20.00,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_items_company ON inv_items(company_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_items_profile ON inv_items(profile_id)")

                # Invoice lines table (for software-issued invoices)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inv_invoice_lines (
                        id TEXT PRIMARY KEY,
                        invoice_id TEXT NOT NULL,
                        item_id TEXT,
                        position INTEGER DEFAULT 0,
                        description TEXT NOT NULL,
                        quantity NUMERIC(12,3) DEFAULT 1.000,
                        unit TEXT DEFAULT 'бр.',
                        unit_price NUMERIC(12,2) DEFAULT 0.00,
                        vat_rate NUMERIC(5,2) DEFAULT 20.00,
                        line_total NUMERIC(12,2) DEFAULT 0.00,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_lines_invoice ON inv_invoice_lines(invoice_id)")

                # Sync settings table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inv_sync_settings (
                        id TEXT PRIMARY KEY,
                        company_id TEXT NOT NULL UNIQUE,
                        profile_id TEXT NOT NULL,
                        sync_mode TEXT DEFAULT 'manual',
                        delay_minutes INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_sync_company ON inv_sync_settings(company_id)")

                # Software invoice metadata (extra fields not in main invoices table)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inv_invoice_meta (
                        id TEXT PRIMARY KEY,
                        invoice_id TEXT NOT NULL UNIQUE,
                        company_id TEXT NOT NULL,
                        profile_id TEXT NOT NULL,
                        client_id TEXT,
                        document_type TEXT DEFAULT 'invoice',
                        invoice_number INTEGER,
                        issue_date DATE,
                        tax_event_date DATE,
                        due_date DATE,
                        subtotal NUMERIC(12,2) DEFAULT 0.00,
                        discount NUMERIC(12,2) DEFAULT 0.00,
                        vat_amount NUMERIC(12,2) DEFAULT 0.00,
                        total NUMERIC(12,2) DEFAULT 0.00,
                        vat_rate NUMERIC(5,2) DEFAULT 20.00,
                        no_vat BOOLEAN DEFAULT FALSE,
                        no_vat_reason TEXT,
                        payment_method TEXT,
                        notes TEXT,
                        internal_notes TEXT,
                        currency TEXT DEFAULT 'EUR',
                        pdf_path TEXT,
                        sync_status TEXT DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_meta_invoice ON inv_invoice_meta(invoice_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_meta_company ON inv_invoice_meta(company_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_meta_profile ON inv_invoice_meta(profile_id)")
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_meta_unique_number ON inv_invoice_meta(company_id, document_type, invoice_number)")

                # Company settings table (bank account, etc.)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inv_company_settings (
                        id TEXT PRIMARY KEY,
                        company_id TEXT NOT NULL UNIQUE,
                        profile_id TEXT NOT NULL,
                        iban TEXT,
                        bank_name TEXT,
                        bic TEXT,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_csettings_company ON inv_company_settings(company_id)")

                # Invoice stubs (кочани) table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inv_stubs (
                        id TEXT PRIMARY KEY,
                        company_id TEXT NOT NULL,
                        profile_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        start_number INTEGER NOT NULL DEFAULT 1,
                        end_number INTEGER NOT NULL DEFAULT 1000000,
                        next_number INTEGER DEFAULT 1,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_inv_stubs_company ON inv_stubs(company_id)")

                # Add source column to existing invoices table if not exists
                cur.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'invoices' AND column_name = 'source'
                        ) THEN
                            ALTER TABLE invoices ADD COLUMN source TEXT DEFAULT 'scan';
                        END IF;
                    END $$
                """)

            conn.commit()
        logger.info("[INVOICING] Tables ensured")
    except Exception as e:
        logger.error(f"[INVOICING] Error creating tables: {e}")


# ── Pydantic Schemas ──────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    company_id: str
    profile_id: str
    name: str
    eik: Optional[str] = None
    egn: Optional[str] = None
    vat_number: Optional[str] = None
    is_vat_registered: bool = False
    is_individual: bool = False
    mol: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    eik: Optional[str] = None
    egn: Optional[str] = None
    vat_number: Optional[str] = None
    is_vat_registered: Optional[bool] = None
    is_individual: Optional[bool] = None
    mol: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class ItemCreate(BaseModel):
    company_id: str
    profile_id: str
    name: str
    unit: str = "бр."
    default_price: float = 0.00
    vat_rate: float = 20.00
    description: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    default_price: Optional[float] = None
    vat_rate: Optional[float] = None
    description: Optional[str] = None

class InvoiceLineCreate(BaseModel):
    item_id: Optional[str] = None
    position: Optional[int] = None
    description: str
    quantity: float = 1.0
    unit: str = "бр."
    unit_price: float = 0.00
    vat_rate: float = 20.00

class InvoiceCreate(BaseModel):
    company_id: str
    profile_id: str
    client_id: str
    document_type: str = "invoice"
    invoice_number: Optional[int] = None
    issue_date: Optional[str] = None
    tax_event_date: Optional[str] = None
    due_date: Optional[str] = None
    vat_rate: float = 20.00
    no_vat: bool = False
    no_vat_reason: Optional[str] = None
    discount: float = 0.00
    discount_type: str = "EUR"  # "EUR" (absolute) or "%" (percentage of subtotal)
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    currency: str = "EUR"
    status: str = "issued"  # "draft" or "issued"
    lines: list[InvoiceLineCreate] = []

class SyncSettingsUpdate(BaseModel):
    sync_mode: str = "manual"  # "immediate", "delayed", "manual"
    delay_minutes: int = 0

class CompanySettingsUpdate(BaseModel):
    iban: Optional[str] = None
    bank_name: Optional[str] = None
    bic: Optional[str] = None

class StubCreate(BaseModel):
    company_id: str
    profile_id: str
    name: str
    start_number: int = 1
    end_number: int = 1000000
    next_number: Optional[int] = None

class StubUpdate(BaseModel):
    name: Optional[str] = None
    start_number: Optional[int] = None
    end_number: Optional[int] = None
    next_number: Optional[int] = None


# ── Trade Registry Lookup ─────────────────────────────────────────────────
# Ported from :8005 registry.py — uses Accept: application/json header
# and falls back to Summary endpoint when detail endpoint returns no data.

import re as _re

TR_API_BASE = "https://portal.registryagency.bg/CR/api/Deeds"


def _extract_text_from_html(html: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    text = _re.sub(r'<[^>]+>', ' ', html)
    text = _re.sub(r'\s+', ' ', text).strip()
    return text


def _parse_address_from_field(html: str) -> str:
    """Extract street/neighborhood part of address from TR HTML field."""
    text = _extract_text_from_html(html)
    for sep in ["Телефон:", "Тел.:", "Phone:", "Факс:", "Fax:", "Интернет стр", "Адрес на електронна поща:"]:
        idx = text.find(sep)
        if idx > 0:
            text = text[:idx].strip().rstrip(",").strip()
    rn_match = _re.search(r'р-н\s+[\wа-яА-ЯёЁ]+\s+(.*)', text, _re.IGNORECASE)
    if rn_match:
        return rn_match.group(1).strip().rstrip(",").strip()
    pk_match = _re.search(r'п\.к\.\s*\d+\s+(.*)', text, _re.IGNORECASE)
    if pk_match:
        addr = pk_match.group(1).strip().rstrip(",").strip()
        addr = _re.sub(r'^бул\./ул\.\s*', '', addr)
        addr = _re.sub(r'^ул\.\s*ул\.\s*', 'ул. ', addr)
        addr = _re.sub(r'^ул\.\s*', '', addr)
        addr = _re.sub(r'^бул\.\s*', '', addr)
        addr = addr.replace(' №', '').replace('№ ', '').replace('№', '')
        if addr == addr.upper():
            addr = addr.title()
        return addr.strip()
    return text


def _extract_city_from_address(text: str) -> str:
    """Extract city name from TR address text."""
    match = _re.search(r'Населено\s+място:\s*([^,]+)', text)
    if match:
        city = match.group(1).strip()
        city = _re.sub(r'\s*п\.к\.\s*\d+', '', city).strip()
        city = _re.sub(r'^(?:гр\.|с\.|гр |с )\s*', '', city).strip()
        return city
    return ""


def _extract_email_from_text(text: str) -> str:
    """Extract email address from text."""
    match = _re.search(r'[\w.-]+@[\w.-]+\.\w+', text)
    return match.group(0).lower() if match else ""


def _parse_trade_registry_response(data: dict) -> dict:
    """Parse detailed response from Trade Registry API (same as :8005)."""
    company_name = data.get("companyName", "").strip()
    full_name = data.get("fullName", "").strip()
    uic = data.get("uic", "").strip()

    legal_form = ""
    if full_name:
        parts = full_name.rsplit(" ", 1)
        if len(parts) == 2:
            legal_form = parts[1].strip()

    address = ""
    city = ""
    mol = ""
    tr_email = ""
    managers: list[str] = []

    for section in data.get("sections", []):
        for sub in section.get("subDeeds", []):
            for group in sub.get("groups", []):
                for field in group.get("fields", []):
                    code = field.get("nameCode", "")
                    html = field.get("htmlData", "")
                    if code == "CR_F_5_L" and not address:
                        full_addr_text = _extract_text_from_html(html)
                        if not tr_email:
                            tr_email = _extract_email_from_text(full_addr_text)
                        if not city:
                            city = _extract_city_from_address(full_addr_text)
                        address = _parse_address_from_field(html)
                    elif code == "CR_F_7_L" and not mol:
                        raw = _extract_text_from_html(html)
                        name_part = raw.split(",")[0].strip()
                        if name_part:
                            mol = name_part
                    elif code == "CR_F_10_L" and not mol:
                        mol = _extract_text_from_html(html)
                    elif code == "CR_F_23_L":
                        extracted_names = _extract_text_from_html(html)
                        if extracted_names and extracted_names not in managers:
                            managers.append(extracted_names)

    display_name = full_name if full_name else company_name
    if not mol and managers:
        mol = managers[0]

    return {
        "name": display_name,
        "eik": uic,
        "vat_number": f"BG{uic}" if uic else "",
        "is_vat_registered": False,
        "mol": mol,
        "city": city,
        "address": address,
        "phone": "",
        "email": tr_email,
        "legal_form": legal_form,
        "source": "Търговски регистър (portal.registryagency.bg)",
    }


def _parse_summary_response(items: list, eik: str) -> dict:
    """Parse summary response (fallback when detail endpoint has no data)."""
    if not items:
        return {}
    item = items[0]
    name = item.get("name", "").strip()
    full_name = item.get("companyFullName", "").strip()
    ident = item.get("ident", eik).strip()

    legal_form = ""
    display = full_name if full_name else name
    if display:
        parts = display.rsplit(" ", 1)
        if len(parts) == 2:
            legal_form = parts[1].strip()

    return {
        "name": display,
        "eik": ident,
        "vat_number": f"BG{ident}" if ident else "",
        "is_vat_registered": False,
        "mol": "",
        "city": "",
        "address": "",
        "phone": "",
        "email": "",
        "legal_form": legal_form,
        "source": "Търговски регистър (portal.registryagency.bg)",
    }


@invoicing_router.get("/registry/lookup/{eik}")
async def registry_lookup(eik: str):
    """Lookup company data from Bulgarian Trade Registry by EIK.
    Uses the same approach as :8005 — detail endpoint first, then summary fallback.
    """
    clean_eik = _re.sub(r'\s+', '', eik)
    if not clean_eik.isdigit() or len(clean_eik) not in (9, 10, 13):
        raise HTTPException(
            status_code=400,
            detail="Невалиден ЕИК. Трябва да е 9, 10 или 13 цифри.",
        )

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Try detailed lookup first (same as :8005)
            detail_resp = await client.get(
                f"{TR_API_BASE}/{clean_eik}",
                headers={"Accept": "application/json"},
            )

            if detail_resp.status_code == 200 and detail_resp.text.strip():
                try:
                    data = detail_resp.json()
                    if data.get("companyName") or data.get("fullName"):
                        return _parse_trade_registry_response(data)
                except Exception:
                    pass

            # Fallback to summary endpoint
            summary_resp = await client.get(
                f"{TR_API_BASE}/Summary",
                params={
                    "page": 1,
                    "pageSize": 1,
                    "count": 0,
                    "ident": clean_eik,
                    "selectedSearchFilter": 1,
                    "includeHistory": "true",
                },
                headers={"Accept": "application/json"},
            )

            if summary_resp.status_code == 200 and summary_resp.text.strip():
                try:
                    items = summary_resp.json()
                    if isinstance(items, list) and len(items) > 0:
                        result = _parse_summary_response(items, clean_eik)
                        if result:
                            return result
                except Exception:
                    pass

            if detail_resp.status_code == 429 or (summary_resp and summary_resp.status_code == 429):
                raise HTTPException(
                    status_code=429,
                    detail="Твърде много заявки към Търговския регистър. Моля, опитайте отново след малко.",
                )

        raise HTTPException(
            status_code=404,
            detail=f"Не е намерена фирма с ЕИК {clean_eik} в Търговския регистър.",
        )

    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Грешка при връзка с Търговския регистър: {str(e)}",
        )
    except Exception as e:
        logger.error(f"[TR] Error looking up EIK {clean_eik}: {e}")
        raise HTTPException(status_code=500, detail=f"Грешка при търсене: {str(e)}")


# ── Clients CRUD ──────────────────────────────────────────────────────────

@invoicing_router.get("/clients")
async def list_clients(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    search: Optional[str] = None
):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if search:
                    cur.execute(
                        """SELECT * FROM inv_clients
                           WHERE company_id = %s AND profile_id = %s
                           AND (name ILIKE %s OR eik ILIKE %s OR email ILIKE %s)
                           ORDER BY name""",
                        (company_id, profile_id, f"%{search}%", f"%{search}%", f"%{search}%")
                    )
                else:
                    cur.execute(
                        "SELECT * FROM inv_clients WHERE company_id = %s AND profile_id = %s ORDER BY name",
                        (company_id, profile_id)
                    )
                rows = cur.fetchall()
                return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"[INVOICING] Error listing clients: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.post("/clients")
async def create_client(data: ClientCreate):
    client_id = str(uuid.uuid4())
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO inv_clients
                       (id, company_id, profile_id, name, eik, egn, vat_number,
                        is_vat_registered, is_individual, mol, city, address, email, phone)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (client_id, data.company_id, data.profile_id, data.name,
                     data.eik, data.egn, data.vat_number,
                     data.is_vat_registered, data.is_individual,
                     data.mol, data.city, data.address, data.email, data.phone)
                )
            conn.commit()
        return {"id": client_id, "status": "created"}
    except Exception as e:
        logger.error(f"[INVOICING] Error creating client: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.get("/clients/{client_id}")
async def get_client(client_id: str):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM inv_clients WHERE id = %s", (client_id,))
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Client not found")
                return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INVOICING] Error getting client: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientUpdate):
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.now()

    set_clause = ", ".join(f"{k} = %s" for k in updates.keys())
    values = list(updates.values()) + [client_id]

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE inv_clients SET {set_clause} WHERE id = %s", values)
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Client not found")
            conn.commit()
        return {"status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INVOICING] Error updating client: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM inv_clients WHERE id = %s", (client_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Client not found")
            conn.commit()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INVOICING] Error deleting client: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Items CRUD ────────────────────────────────────────────────────────────

@invoicing_router.get("/items")
async def list_items(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    search: Optional[str] = None
):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if search:
                    cur.execute(
                        """SELECT * FROM inv_items
                           WHERE company_id = %s AND profile_id = %s
                           AND (name ILIKE %s OR description ILIKE %s)
                           ORDER BY name""",
                        (company_id, profile_id, f"%{search}%", f"%{search}%")
                    )
                else:
                    cur.execute(
                        "SELECT * FROM inv_items WHERE company_id = %s AND profile_id = %s ORDER BY name",
                        (company_id, profile_id)
                    )
                rows = cur.fetchall()
                return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"[INVOICING] Error listing items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.post("/items")
async def create_item(data: ItemCreate):
    item_id = str(uuid.uuid4())
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO inv_items
                       (id, company_id, profile_id, name, unit, default_price, vat_rate, description)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (item_id, data.company_id, data.profile_id, data.name,
                     data.unit, data.default_price, data.vat_rate, data.description)
                )
            conn.commit()
        return {"id": item_id, "status": "created"}
    except Exception as e:
        logger.error(f"[INVOICING] Error creating item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.get("/items/{item_id}")
async def get_item(item_id: str):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM inv_items WHERE id = %s", (item_id,))
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Item not found")
                return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INVOICING] Error getting item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.put("/items/{item_id}")
async def update_item(item_id: str, data: ItemUpdate):
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.now()

    set_clause = ", ".join(f"{k} = %s" for k in updates.keys())
    values = list(updates.values()) + [item_id]

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE inv_items SET {set_clause} WHERE id = %s", values)
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Item not found")
            conn.commit()
        return {"status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INVOICING] Error updating item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM inv_items WHERE id = %s", (item_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Item not found")
            conn.commit()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INVOICING] Error deleting item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Sync Settings ─────────────────────────────────────────────────────────

# ── Company Settings (bank account) ───────────────────────────────────────

@invoicing_router.get("/company-settings/{company_id}")
async def get_company_settings(company_id: str):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM inv_company_settings WHERE company_id = %s", (company_id,))
                row = cur.fetchone()
                if not row:
                    return {"company_id": company_id, "iban": "", "bank_name": "", "bic": ""}
                return dict(row)
    except Exception as e:
        logger.error(f"[INVOICING] Error getting company settings: {e}")
        return {"company_id": company_id, "iban": "", "bank_name": "", "bic": ""}


@invoicing_router.put("/company-settings/{company_id}")
async def update_company_settings(company_id: str, profile_id: str = Query(...), data: CompanySettingsUpdate = None):
    if data is None:
        raise HTTPException(status_code=400, detail="No data")
    setting_id = str(uuid.uuid4())
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO inv_company_settings (id, company_id, profile_id, iban, bank_name, bic)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       ON CONFLICT (company_id) DO UPDATE SET
                       iban = EXCLUDED.iban,
                       bank_name = EXCLUDED.bank_name,
                       bic = EXCLUDED.bic,
                       updated_at = NOW()""",
                    (setting_id, company_id, profile_id, data.iban, data.bank_name, data.bic)
                )
            conn.commit()
        return {"status": "updated"}
    except Exception as e:
        logger.error(f"[INVOICING] Error updating company settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Invoice Stubs (кочани) ────────────────────────────────────────────────

@invoicing_router.get("/stubs")
async def list_stubs(company_id: str = Query(...), profile_id: str = Query(...)):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM inv_stubs WHERE company_id = %s AND profile_id = %s ORDER BY created_at",
                    (company_id, profile_id)
                )
                return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        logger.error(f"[INVOICING] Error listing stubs: {e}")
        return []


@invoicing_router.post("/stubs")
async def create_stub(data: StubCreate):
    stub_id = str(uuid.uuid4())
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                next_num = data.next_number if data.next_number is not None else data.start_number
                cur.execute(
                    """INSERT INTO inv_stubs (id, company_id, profile_id, name, start_number, end_number, next_number)
                       VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (stub_id, data.company_id, data.profile_id, data.name,
                     data.start_number, data.end_number, next_num)
                )
            conn.commit()
        return {"id": stub_id, "status": "created"}
    except Exception as e:
        logger.error(f"[INVOICING] Error creating stub: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.put("/stubs/{stub_id}")
async def update_stub(stub_id: str, data: StubUpdate):
    try:
        updates = []
        values = []
        for field in ("name", "start_number", "end_number", "next_number"):
            val = getattr(data, field, None)
            if val is not None:
                updates.append(f"{field} = %s")
                values.append(val)
        if not updates:
            return {"status": "no changes"}
        updates.append("updated_at = NOW()")
        values.append(stub_id)
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE inv_stubs SET {', '.join(updates)} WHERE id = %s", values)
            conn.commit()
        return {"status": "updated"}
    except Exception as e:
        logger.error(f"[INVOICING] Error updating stub: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.delete("/stubs/{stub_id}")
async def delete_stub(stub_id: str):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM inv_stubs WHERE id = %s", (stub_id,))
            conn.commit()
        return {"status": "deleted"}
    except Exception as e:
        logger.error(f"[INVOICING] Error deleting stub: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Sync Settings ─────────────────────────────────────────────────────────

@invoicing_router.get("/sync-settings/{company_id}")
async def get_sync_settings(company_id: str):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM inv_sync_settings WHERE company_id = %s", (company_id,))
                row = cur.fetchone()
                if not row:
                    return {"company_id": company_id, "sync_mode": "manual", "delay_minutes": 0}
                return dict(row)
    except Exception as e:
        logger.error(f"[INVOICING] Error getting sync settings: {e}")
        return {"company_id": company_id, "sync_mode": "manual", "delay_minutes": 0}


@invoicing_router.put("/sync-settings/{company_id}")
async def update_sync_settings(company_id: str, profile_id: str = Query(...), data: SyncSettingsUpdate = None):
    if data is None:
        raise HTTPException(status_code=400, detail="No data")
    setting_id = str(uuid.uuid4())
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO inv_sync_settings (id, company_id, profile_id, sync_mode, delay_minutes)
                       VALUES (%s, %s, %s, %s, %s)
                       ON CONFLICT (company_id) DO UPDATE SET
                       sync_mode = EXCLUDED.sync_mode,
                       delay_minutes = EXCLUDED.delay_minutes,
                       updated_at = NOW()""",
                    (setting_id, company_id, profile_id, data.sync_mode, data.delay_minutes)
                )
            conn.commit()
        return {"status": "updated"}
    except Exception as e:
        logger.error(f"[INVOICING] Error updating sync settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Invoice Creation ──────────────────────────────────────────────────────

def _get_next_invoice_number(company_id: str, profile_id: str, document_type: str) -> int:
    """Get the next available invoice number for a company (preview only, not race-safe)."""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT COALESCE(MAX(invoice_number), 0) FROM inv_invoice_meta
                       WHERE company_id = %s AND document_type = %s""",
                    (company_id, document_type)
                )
                row = cur.fetchone()
                return (row[0] or 0) + 1
    except Exception:
        return 1


def _atomic_next_invoice_number(cur, company_id: str, document_type: str) -> int:
    """Atomically get the next invoice number within an existing transaction.
    Uses SELECT FOR UPDATE on individual rows to serialize concurrent access.
    The UNIQUE index on (company_id, document_type, invoice_number) is the
    ultimate safety net against duplicates."""
    # Lock all existing rows for this company+doc_type to prevent concurrent reads
    cur.execute(
        """SELECT invoice_number FROM inv_invoice_meta
           WHERE company_id = %s AND document_type = %s
           ORDER BY invoice_number DESC
           FOR UPDATE""",
        (company_id, document_type)
    )
    rows = cur.fetchall()
    if rows and rows[0][0] is not None:
        return rows[0][0] + 1
    return 1


@invoicing_router.get("/next-number")
async def get_next_number(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    document_type: str = Query("invoice")
):
    number = _get_next_invoice_number(company_id, profile_id, document_type)
    return {"next_number": number}


@invoicing_router.post("/invoices")
async def create_invoice(data: InvoiceCreate, background_tasks: BackgroundTasks):
    """Create a software-issued invoice. Saves to both inv_invoice_meta and main invoices table."""
    invoice_id = str(uuid.uuid4())
    meta_id = str(uuid.uuid4())

    # Default dates
    today = date.today().isoformat()
    issue_date = data.issue_date or today
    tax_event_date = data.tax_event_date or today

    # Calculate totals
    lines_data = []
    subtotal = Decimal("0.00")
    for i, line in enumerate(data.lines):
        qty = Decimal(str(line.quantity))
        price = Decimal(str(line.unit_price))
        line_total = (qty * price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        subtotal += line_total
        lines_data.append({
            "id": str(uuid.uuid4()),
            "invoice_id": invoice_id,
            "item_id": line.item_id,
            "position": line.position if line.position is not None else i,
            "description": line.description,
            "quantity": float(qty),
            "unit": line.unit,
            "unit_price": float(price),
            "vat_rate": line.vat_rate,
            "line_total": float(line_total),
        })

    # Calculate discount — percentage or absolute
    discount_input = Decimal(str(data.discount))
    if data.discount_type == "%":
        discount = (subtotal * discount_input / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        discount = discount_input
    tax_base = max(Decimal("0.00"), subtotal - discount)

    if data.no_vat:
        vat_amount = Decimal("0.00")
    else:
        # Calculate VAT per-line (each line may have a different rate)
        vat_amount = Decimal("0.00")
        for ld in lines_data:
            line_total_dec = Decimal(str(ld["line_total"]))
            line_share = (line_total_dec / subtotal * tax_base) if subtotal > 0 else Decimal("0.00")
            line_vat_rate = Decimal(str(ld["vat_rate"]))
            vat_amount += (line_share * line_vat_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    total = tax_base + vat_amount

    # Document type labels for filename
    doc_type_labels = {
        "invoice": "Фактура",
        "proforma": "Проформа",
        "debit_note": "Дебитно известие",
        "credit_note": "Кредитно известие",
    }
    doc_label = doc_type_labels.get(data.document_type, "Фактура")

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Atomically generate invoice number within this transaction
                if data.invoice_number is None:
                    data.invoice_number = _atomic_next_invoice_number(
                        cur, data.company_id, data.document_type
                    )

                # Get client name for the invoices table
                client_name = ""
                cur.execute("SELECT name, eik FROM inv_clients WHERE id = %s", (data.client_id,))
                row = cur.fetchone()
                if row:
                    client_name = row[0]

                # Get company name
                company_name = ""
                cur.execute("SELECT name FROM companies WHERE id = %s", (data.company_id,))
                row = cur.fetchone()
                if row:
                    company_name = row[0]

                # Generate filename following megabanx naming convention
                inv_num_str = str(data.invoice_number).zfill(10)
                date_str = issue_date.replace("-", "")
                new_filename = f"{doc_label} {inv_num_str} {client_name} {date_str}.pdf"

                # Determine sync settings
                sync_status = "pending"
                cur.execute("SELECT sync_mode FROM inv_sync_settings WHERE company_id = %s", (data.company_id,))
                row = cur.fetchone()
                if row and row[0] == "immediate":
                    sync_status = "synced"

                # Insert into inv_invoice_meta
                cur.execute(
                    """INSERT INTO inv_invoice_meta
                       (id, invoice_id, company_id, profile_id, client_id,
                        document_type, invoice_number, issue_date, tax_event_date, due_date,
                        subtotal, discount, vat_amount, total, vat_rate,
                        no_vat, no_vat_reason, payment_method, notes, internal_notes,
                        currency, sync_status)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (meta_id, invoice_id, data.company_id, data.profile_id, data.client_id,
                     data.document_type, data.invoice_number, issue_date, tax_event_date,
                     data.due_date, float(subtotal), float(discount), float(vat_amount),
                     float(total), data.vat_rate, data.no_vat, data.no_vat_reason,
                     data.payment_method, data.notes, data.internal_notes,
                     data.currency, sync_status)
                )

                # Insert invoice lines
                for line in lines_data:
                    cur.execute(
                        """INSERT INTO inv_invoice_lines
                           (id, invoice_id, item_id, position, description,
                            quantity, unit, unit_price, vat_rate, line_total)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                        (line["id"], invoice_id, line["item_id"], line["position"],
                         line["description"], line["quantity"], line["unit"],
                         line["unit_price"], line["vat_rate"], line["line_total"])
                    )

                # Insert into main invoices table (so it appears in Фактури продажби)
                cur.execute(
                    """INSERT INTO invoices
                       (id, profile_id, original_filename, new_filename, invoice_type,
                        company_id, company_name, date, issuer_name, recipient_name,
                        invoice_number, destination_path, status, source)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (invoice_id, data.profile_id, new_filename, new_filename,
                     "sales", data.company_id, company_name,
                     issue_date, company_name, client_name,
                     str(data.invoice_number), f"{company_name}/Фактури продажби/{new_filename}",
                     "draft" if data.status == "draft" else "processed", "software")
                )

            conn.commit()

        # Generate PDF in a background task (non-blocking)
        background_tasks.add_task(
            _generate_and_save_pdf, invoice_id, data, lines_data, company_name, client_name,
            float(subtotal), float(discount), float(vat_amount), float(total)
        )

        return {
            "id": invoice_id,
            "invoice_number": data.invoice_number,
            "new_filename": new_filename,
            "total": float(total),
            "status": "created",
            "sync_status": sync_status,
        }

    except Exception as e:
        logger.error(f"[INVOICING] Error creating invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _generate_and_save_pdf(invoice_id, data, lines_data, company_name, client_name,
                           subtotal, discount, vat_amount, total):
    """Generate invoice PDF and save to the correct location."""
    try:
        from jinja2 import Environment, FileSystemLoader
        from weasyprint import HTML

        templates_dir = "/opt/bginvoices/backend/app/templates"
        if not os.path.exists(os.path.join(templates_dir, "invoice_pdf.html")):
            logger.warning("[INVOICING] PDF template not found, skipping PDF generation")
            return

        env = Environment(loader=FileSystemLoader(templates_dir), autoescape=True)
        template = env.get_template("invoice_pdf.html")

        doc_type_labels = {
            "invoice": ("ФАКТУРА", "Фактура"),
            "proforma": ("ПРОФОРМА", "Проформа"),
            "debit_note": ("ДЕБИТНО ИЗВЕСТИЕ", "Дебитно известие"),
            "credit_note": ("КРЕДИТНО ИЗВЕСТИЕ", "Кредитно известие"),
        }
        doc_type_label, doc_type_lower = doc_type_labels.get(data.document_type, ("ФАКТУРА", "Фактура"))

        # Get company data
        company_data = {}
        client_data = {}
        company_settings = {}
        try:
            with get_db() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM companies WHERE id = %s", (data.company_id,))
                    row = cur.fetchone()
                    if row:
                        company_data = dict(row)
                    # Fetch bank details from inv_company_settings
                    cur.execute("SELECT * FROM inv_company_settings WHERE company_id = %s", (data.company_id,))
                    settings_row = cur.fetchone()
                    if settings_row:
                        company_settings = dict(settings_row)
                    else:
                        company_settings = {}
                    cur.execute("SELECT * FROM inv_clients WHERE id = %s", (data.client_id,))
                    row = cur.fetchone()
                    if row:
                        client_data = dict(row)
        except Exception as e:
            logger.error(f"[INVOICING] Error loading company/client for PDF: {e}")

        # Prepare template context
        issue_date = data.issue_date or date.today().isoformat()
        tax_event_date = data.tax_event_date or issue_date

        context = {
            "doc_type_label": doc_type_label,
            "doc_type_lower": doc_type_lower,
            "doc_copy_label": "Оригинал",
            "invoice_number": str(data.invoice_number).zfill(10),
            "issue_date": issue_date,
            "tax_event_date": tax_event_date,
            "due_date": data.due_date or "",
            "company": {
                "name": company_data.get("name", company_name),
                "eik": company_data.get("eik", ""),
                "vat_number": company_data.get("vat_number", ""),
                "address": company_data.get("address", ""),
                "mol": company_data.get("mol", ""),
                "city": company_data.get("city", ""),
                "iban": company_settings.get("iban", ""),
                "bank_name": company_settings.get("bank_name", ""),
                "bic": company_settings.get("bic", ""),
            },
            "client": {
                "name": client_data.get("name", client_name),
                "eik": client_data.get("eik", ""),
                "vat_number": client_data.get("vat_number", ""),
                "address": client_data.get("address", ""),
                "mol": client_data.get("mol", ""),
                "city": client_data.get("city", ""),
            },
            "lines": lines_data,
            "subtotal": f"{subtotal:.2f}",
            "discount": f"{discount:.2f}",
            "tax_base": f"{max(0, subtotal - discount):.2f}",
            "vat_amount": f"{vat_amount:.2f}",
            "vat_rate": f"{data.vat_rate:.0f}",
            "total": f"{total:.2f}",
            "no_vat": data.no_vat,
            "no_vat_reason": data.no_vat_reason or "",
            "payment_method": data.payment_method or "",
            "notes": data.notes or "",
            "currency": data.currency,
            "logo_base64": None,
            "total_words": "",
        }

        html_content = template.render(**context)

        # Save PDF to the company's sales folder
        profile_dir = f"/opt/bginvoices/data/profiles/{data.profile_id}"
        sales_dir = os.path.join(profile_dir, company_name, "Фактури продажби")
        os.makedirs(sales_dir, exist_ok=True)

        inv_num_str = str(data.invoice_number).zfill(10)
        date_str = issue_date.replace("-", "")
        pdf_filename = f"{doc_type_lower} {inv_num_str} {client_name} {date_str}.pdf"
        pdf_path = os.path.join(sales_dir, pdf_filename)

        HTML(string=html_content).write_pdf(pdf_path)
        logger.info(f"[INVOICING] PDF generated: {pdf_path}")

        # Update meta with PDF path
        try:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE inv_invoice_meta SET pdf_path = %s WHERE invoice_id = %s",
                        (pdf_path, invoice_id)
                    )
                conn.commit()
        except Exception as e:
            logger.error(f"[INVOICING] Error updating PDF path: {e}")

    except ImportError as e:
        logger.warning(f"[INVOICING] PDF generation dependencies not available: {e}")
    except Exception as e:
        logger.error(f"[INVOICING] Error generating PDF: {e}")


@invoicing_router.get("/invoices")
async def list_invoices(
    company_id: str = Query(...),
    profile_id: str = Query(...)
):
    """List software-issued invoices for a company."""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """SELECT m.*, c.name as client_name, c.eik as client_eik,
                              i.new_filename, i.original_filename, i.status as invoice_status
                       FROM inv_invoice_meta m
                       LEFT JOIN inv_clients c ON m.client_id = c.id
                       LEFT JOIN invoices i ON m.invoice_id = i.id
                       WHERE m.company_id = %s AND m.profile_id = %s
                       ORDER BY m.created_at DESC""",
                    (company_id, profile_id)
                )
                rows = cur.fetchall()
                result = []
                for r in rows:
                    inv = dict(r)
                    # Convert date objects to strings
                    for date_field in ("issue_date", "tax_event_date", "due_date", "created_at", "updated_at"):
                        if inv.get(date_field) and hasattr(inv[date_field], "isoformat"):
                            inv[date_field] = inv[date_field].isoformat()
                    # Convert Decimal to float
                    for num_field in ("subtotal", "discount", "vat_amount", "total", "vat_rate"):
                        if inv.get(num_field) is not None:
                            inv[num_field] = float(inv[num_field])
                    result.append(inv)
                return result
    except Exception as e:
        logger.error(f"[INVOICING] Error listing invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@invoicing_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get a specific software-issued invoice with its lines."""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """SELECT m.*, c.name as client_name
                       FROM inv_invoice_meta m
                       LEFT JOIN inv_clients c ON m.client_id = c.id
                       WHERE m.invoice_id = %s""",
                    (invoice_id,)
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Invoice not found")
                inv = dict(row)

                # Get lines
                cur.execute(
                    "SELECT * FROM inv_invoice_lines WHERE invoice_id = %s ORDER BY position",
                    (invoice_id,)
                )
                lines = [dict(r) for r in cur.fetchall()]

                # Convert types
                for date_field in ("issue_date", "tax_event_date", "due_date", "created_at", "updated_at"):
                    if inv.get(date_field) and hasattr(inv[date_field], "isoformat"):
                        inv[date_field] = inv[date_field].isoformat()
                for num_field in ("subtotal", "discount", "vat_amount", "total", "vat_rate"):
                    if inv.get(num_field) is not None:
                        inv[num_field] = float(inv[num_field])

                for line in lines:
                    for num_field in ("quantity", "unit_price", "vat_rate", "line_total"):
                        if line.get(num_field) is not None:
                            line[num_field] = float(line[num_field])
                    if line.get("created_at") and hasattr(line["created_at"], "isoformat"):
                        line["created_at"] = line["created_at"].isoformat()

                inv["lines"] = lines
                return inv
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INVOICING] Error getting invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Check if counterparty exists in megabanx ──────────────────────────────

@invoicing_router.get("/check-counterparty/{eik}")
async def check_counterparty(eik: str):
    """Check if a counterparty with this EIK exists as a company in megabanx."""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT id, name, profile_id FROM companies WHERE eik = %s", (eik,))
                rows = cur.fetchall()
                if rows:
                    return {"exists": True, "companies": [dict(r) for r in rows]}
                return {"exists": False, "companies": []}
    except Exception as e:
        logger.error(f"[INVOICING] Error checking counterparty: {e}")
        return {"exists": False, "companies": []}
