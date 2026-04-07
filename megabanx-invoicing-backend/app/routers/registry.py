"""
Trade Registry (Търговски регистър) lookup via CompanyBook.bg API.
Free tier: 300 requests/day.
"""
import os
import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/registry", tags=["registry"])

COMPANYBOOK_API_URL = "https://api.companybook.bg/api"
COMPANYBOOK_API_KEY = os.getenv("COMPANYBOOK_API_KEY", "")


@router.get("/lookup/{eik}")
async def lookup_eik(eik: str):
    """Lookup company data from Bulgarian Trade Registry by EIK."""
    eik = eik.strip().replace("BG", "").replace("bg", "")
    if not eik.isdigit() or len(eik) < 9:
        raise HTTPException(status_code=400, detail="Невалиден ЕИК — трябва да е поне 9 цифри")

    if not COMPANYBOOK_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="API ключ за CompanyBook.bg не е конфигуриран. Задайте COMPANYBOOK_API_KEY.",
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{COMPANYBOOK_API_URL}/companies/{eik}",
                params={"with_data": "true"},
                headers={"X-API-Key": COMPANYBOOK_API_KEY},
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Търговският регистър не отговаря. Опитайте отново.")

        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Не е намерена фирма с ЕИК {eik}")
        if resp.status_code == 429:
            raise HTTPException(status_code=429, detail="Достигнат е дневният лимит за заявки (300/ден)")
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Грешка от Търговски регистър: {resp.status_code}")

        data = resp.json()

    company_data = data.get("company", data)

    # Extract address from seat
    seat = company_data.get("seat", {})
    address_parts = []
    if seat.get("street"):
        addr = seat["street"]
        if seat.get("streetNumber"):
            addr += f" {seat['streetNumber']}"
        address_parts.append(addr)
    if seat.get("block"):
        address_parts.append(f"бл. {seat['block']}")
    if seat.get("entrance"):
        address_parts.append(f"вх. {seat['entrance']}")
    if seat.get("floor"):
        address_parts.append(f"ет. {seat['floor']}")
    if seat.get("apartment"):
        address_parts.append(f"ап. {seat['apartment']}")
    address = ", ".join(address_parts)

    city = seat.get("settlement", "")

    # Extract manager (MOL)
    managers = company_data.get("managers", [])
    mol = managers[0].get("name", "") if managers else ""

    # Extract VAT info
    register_info = company_data.get("registerInfo", {})
    vat_number = register_info.get("vat", "")
    is_vat_registered = bool(vat_number)

    # Extract contacts
    contacts = company_data.get("contacts", {})

    result = {
        "name": company_data.get("companyName", {}).get("name", ""),
        "eik": eik,
        "vat_number": vat_number,
        "is_vat_registered": is_vat_registered,
        "mol": mol,
        "city": city,
        "address": address,
        "phone": contacts.get("phone", ""),
        "email": contacts.get("email", ""),
        "legal_form": company_data.get("legalForm", ""),
        "transliteration": company_data.get("companyNameTransliteration", {}).get("name", ""),
        "status": company_data.get("status", ""),
    }

    return result
