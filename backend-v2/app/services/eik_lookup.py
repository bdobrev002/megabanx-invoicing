"""Bulgarian Trade Registry (Търговски регистър) EIK lookup service."""

import re
import logging

import httpx
from fastapi import HTTPException

logger = logging.getLogger("megabanx.eik")

TRADE_REGISTRY_API_URL = "https://portal.registryagency.bg/CR/api/Deeds"


def _extract_text_from_html(html: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _parse_address_from_field(html: str) -> str:
    text = _extract_text_from_html(html)
    for sep in ["Телефон:", "Тел.:", "Phone:", "Факс:", "Fax:", "Интернет стр", "Адрес на електронна поща:"]:
        idx = text.find(sep)
        if idx > 0:
            text = text[:idx].strip().rstrip(",").strip()
    return text


def _extract_city_from_address(text: str) -> str:
    match = re.search(r'Населено\s+място:\s*([^,]+)', text)
    if match:
        city = match.group(1).strip()
        city = re.sub(r'\s*п\.к\.\s*\d+', '', city).strip()
        city = re.sub(r'^(?:гр\.|с\.|гр |с )\s*', '', city).strip()
        return city
    return ""


def _extract_email_from_text(text: str) -> str:
    match = re.search(r'[\w.-]+@[\w.-]+\.\w+', text)
    return match.group(0).lower() if match else ""


def _parse_trade_registry_response(data: dict) -> dict:
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
                    elif code == "CR_F_10_L" and not mol:
                        mol = _extract_text_from_html(html)

    display_name = full_name if full_name else company_name

    return {
        "eik": uic,
        "name": display_name,
        "company_name": company_name,
        "legal_form": legal_form,
        "vat_number": f"BG{uic}" if uic else "",
        "address": address,
        "city": city,
        "mol": mol,
        "email": tr_email,
        "source": "Търговски регистър (portal.registryagency.bg)",
    }


def _parse_summary_response(items: list, eik: str) -> dict:
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
        "eik": ident,
        "name": display,
        "company_name": name,
        "legal_form": legal_form,
        "vat_number": f"BG{ident}" if ident else "",
        "address": "",
        "city": "",
        "mol": "",
        "email": "",
        "source": "Търговски регистър (portal.registryagency.bg)",
    }


async def lookup_eik(eik: str) -> dict:
    """Look up a company by EIK in the Bulgarian Trade Registry."""
    clean_eik = re.sub(r'\s+', '', eik)
    if not clean_eik.isdigit() or len(clean_eik) not in (9, 10, 13):
        raise HTTPException(status_code=400, detail="Невалиден ЕИК. Трябва да е 9, 10 или 13 цифри.")

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            detail_resp = await client.get(
                f"{TRADE_REGISTRY_API_URL}/{clean_eik}",
                headers={"Accept": "application/json"},
            )

            if detail_resp.status_code == 200 and detail_resp.text.strip():
                try:
                    data = detail_resp.json()
                    if data.get("companyName") or data.get("fullName"):
                        return _parse_trade_registry_response(data)
                except Exception:
                    pass

            summary_resp = await client.get(
                f"{TRADE_REGISTRY_API_URL}/Summary",
                params={
                    "page": 1, "pageSize": 1, "count": 0,
                    "ident": clean_eik, "selectedSearchFilter": 1,
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

            if detail_resp.status_code == 429 or summary_resp.status_code == 429:
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
        raise HTTPException(status_code=502, detail=f"Грешка при връзка с Търговския регистър: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Грешка при обработка на данните: {str(e)}")
