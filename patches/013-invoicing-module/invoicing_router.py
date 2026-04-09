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
from fastapi import APIRouter, HTTPException, Query
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

def get_db():
    conn = psycopg2.connect(**_db_config)
    conn.autocommit = False
    return conn


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
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    currency: str = "EUR"
    lines: list[InvoiceLineCreate] = []

class SyncSettingsUpdate(BaseModel):
    sync_mode: str = "manual"  # "immediate", "delayed", "manual"
    delay_minutes: int = 0


# ── Trade Registry Lookup ─────────────────────────────────────────────────

TR_API_BASE = "https://portal.registryagency.bg/CR/api/Deeds"

@invoicing_router.get("/registry/lookup/{eik}")
async def registry_lookup(eik: str):
    """Lookup company data in Bulgarian Trade Registry by EIK."""
    eik = eik.strip()
    if not eik or len(eik) < 9:
        raise HTTPException(status_code=400, detail="ЕИК трябва да е поне 9 цифри")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Search for the company
            search_url = f"{TR_API_BASE}?eik={eik}"
            resp = await client.get(search_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=404, detail="Фирмата не е намерена в Търговски регистър")

            data = resp.json()
            if not data:
                raise HTTPException(status_code=404, detail="Фирмата не е намерена в Търговски регистър")

            # Parse the response - TR API returns a list of deeds
            deeds = data if isinstance(data, list) else [data]
            if not deeds:
                raise HTTPException(status_code=404, detail="Фирмата не е намерена")

            deed = deeds[0]

            # Extract company info from deed
            company_name = ""
            mol = ""
            city = ""
            address = ""
            legal_form = ""
            email_addr = ""

            # Try different field structures
            if isinstance(deed, dict):
                company_name = deed.get("companyName", "") or deed.get("name", "") or ""
                # Try to get subdeeds for detailed info
                subdeed_groups = deed.get("subdeedGroups", []) or []
                for group in subdeed_groups:
                    subdeeds = group.get("subdeeds", []) or []
                    for subdeed in subdeeds:
                        field_ident = subdeed.get("fieldIdent", "")
                        records = subdeed.get("records", []) or []
                        for record in records:
                            if field_ident in ("00010", "00011"):  # Company name fields
                                company_name = company_name or record.get("value", "")
                            elif field_ident in ("00040", "000401"):  # Seat/address
                                addr_text = record.get("value", "")
                                if addr_text:
                                    if not city and ("гр." in addr_text or "с." in addr_text):
                                        parts = addr_text.split(",")
                                        for p in parts:
                                            p = p.strip()
                                            if p.startswith("гр.") or p.startswith("с."):
                                                city = p
                                                break
                                    address = addr_text
                            elif field_ident in ("000500", "00050", "00051"):  # Manager/MOL
                                mol_text = record.get("value", "")
                                if mol_text and not mol:
                                    mol = mol_text
                            elif field_ident == "00003":  # Legal form
                                legal_form = record.get("value", "")

            # Determine VAT number
            vat_number = f"BG{eik}" if len(eik) >= 9 else ""

            result = {
                "name": company_name.strip(),
                "eik": eik,
                "vat_number": vat_number,
                "is_vat_registered": bool(vat_number),
                "mol": mol.strip(),
                "city": city.strip(),
                "address": address.strip(),
                "email": email_addr.strip(),
                "legal_form": legal_form.strip(),
                "phone": "",
            }

            return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TR] Error looking up EIK {eik}: {e}")
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
    Uses SELECT FOR UPDATE to serialize concurrent access."""
    cur.execute(
        """SELECT COALESCE(MAX(invoice_number), 0) + 1 FROM inv_invoice_meta
           WHERE company_id = %s AND document_type = %s
           FOR UPDATE""",
        (company_id, document_type)
    )
    row = cur.fetchone()
    return row[0] if row and row[0] else 1


@invoicing_router.get("/next-number")
async def get_next_number(
    company_id: str = Query(...),
    profile_id: str = Query(...),
    document_type: str = Query("invoice")
):
    number = _get_next_invoice_number(company_id, profile_id, document_type)
    return {"next_number": number}


@invoicing_router.post("/invoices")
async def create_invoice(data: InvoiceCreate):
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

    discount = Decimal(str(data.discount))
    tax_base = max(Decimal("0.00"), subtotal - discount)

    if data.no_vat:
        vat_amount = Decimal("0.00")
    else:
        vat_rate = Decimal(str(data.vat_rate))
        vat_amount = (tax_base * vat_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

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
                     "processed", "software")
                )

            conn.commit()

        # Generate PDF in the background (don't block the response)
        _generate_and_save_pdf(invoice_id, data, lines_data, company_name, client_name,
                               float(subtotal), float(discount), float(vat_amount), float(total))

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
        try:
            with get_db() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM companies WHERE id = %s", (data.company_id,))
                    row = cur.fetchone()
                    if row:
                        company_data = dict(row)
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
                "city": "",
                "iban": company_data.get("iban", ""),
                "bank_name": company_data.get("bank_name", ""),
                "bic": company_data.get("bic", ""),
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
                    """SELECT m.*, c.name as client_name
                       FROM inv_invoice_meta m
                       LEFT JOIN inv_clients c ON m.client_id = c.id
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
