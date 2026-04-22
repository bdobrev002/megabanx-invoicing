"""Bulgarian Trade Registry (Търговски регистър) EIK lookup service."""

import logging
import re

import httpx
from fastapi import HTTPException

logger = logging.getLogger("megabanx.eik")

TRADE_REGISTRY_API_URL = "https://portal.registryagency.bg/CR/api/Deeds"


def _extract_text_from_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _strip_address_prefix(text: str) -> str:
    """Strip everything before the street part; keep address from ул./ж.к./бул. onwards."""
    # Drop everything up to and including the last "п.к. NNNN[,]?" occurrence.
    m = re.search(r"п\.к\.\s*\d+[,.]?\s*", text)
    if m:
        text = text[m.end() :].strip()
    else:
        # Fallback: drop up to and including "Населено място: ... ," segment.
        m = re.search(r"Населено\s+място:\s*[^,]+,?\s*", text)
        if m:
            text = text[m.end() :].strip()
    # Drop any leftover "Държава:/Област:/Община:" prefix fragments.
    text = re.sub(r"^(?:Държава:|Област:|Община:)[^,]*,?\s*", "", text).strip()
    # Drop "р-н NNN" prefix (district) — the user wants address starting from ул./ж.к./бул.
    text = re.sub(r"^р-н\s+[^,]+,?\s*", "", text).strip()
    # TR sometimes prefixes fields with label hints like "ж.к. ж.к. Банишора" or
    # "бул./ул. ул. Скопие". Collapse these to a single prefix.
    text = re.sub(r"\bж\.к\.\s+ж\.к\.\s+", "ж.к. ", text)
    text = re.sub(r"\bбул\.\s+бул\.\s+", "бул. ", text)
    text = re.sub(r"\bул\.\s+ул\.\s+", "ул. ", text)
    text = re.sub(r"\bбул\./ул\.\s+ул\.\s+", "ул. ", text)
    text = re.sub(r"\bбул\./ул\.\s+бул\.\s+", "бул. ", text)
    text = re.sub(r"\bбул\./ул\.\s+ж\.к\.\s+", "ж.к. ", text)
    text = re.sub(r"\bбул\./ул\.\s+", "ул. ", text)
    # Truncate everything before first ж.к./ул./бул. if still anything noisy ahead.
    m = re.search(r"(ж\.к\.|ул\.|бул\.)", text)
    if m and m.start() > 0:
        text = text[m.start() :].strip()
    return text.lstrip(",").strip()


def _parse_address_from_field(html: str) -> str:
    text = _extract_text_from_html(html)
    for sep in ["Телефон:", "Тел.:", "Phone:", "Факс:", "Fax:", "Интернет стр", "Адрес на електронна поща:"]:
        idx = text.find(sep)
        if idx > 0:
            text = text[:idx].strip().rstrip(",").strip()
    text = _strip_address_prefix(text)
    return text


def _extract_city_from_address(text: str) -> str:
    match = re.search(r"Населено\s+място:\s*([^,]+)", text)
    if match:
        city = match.group(1).strip()
        city = re.sub(r"\s*п\.к\.\s*\d+", "", city).strip()
        city = re.sub(r"^(?:гр\.|с\.|гр |с )\s*", "", city).strip()
        return city
    return ""


def _extract_email_from_text(text: str) -> str:
    match = re.search(r"[\w.-]+@[\w.-]+\.\w+", text)
    return match.group(0).lower() if match else ""


def _extract_names_from_html(html: str) -> list[str]:
    """Extract person/company names from a TR field (managers/partners)."""
    text = _extract_text_from_html(html)
    if not text or "Заличено" in text:
        return []
    names: list[str] = []
    for line in re.split(r"[\n;]|\d+\.\s*", text):
        line = line.strip().strip(",").strip()
        if not line or len(line) < 2:
            continue
        name_part = re.split(r",\s*Държава:", line)[0].strip()
        name_part = re.split(r",\s*ЕИК", name_part)[0].strip()
        name_part = re.split(r",\s*Идентификация", name_part)[0].strip()
        if not name_part or len(name_part) < 2:
            continue
        skip = ["ул.", "бул.", "гр.", "п.к.", "р-н", "ет.", "ап.", "вх.", "Област", "Община", "Населено"]
        if any(s in name_part for s in skip):
            continue
        if name_part not in names:
            names.append(name_part)
    return names


# TR field codes (meanings depend on company type, but these are the ones we extract from):
#   CR_F_5_L  — Седалище и адрес на управление (registered office + address)
#   CR_F_7_L  — Управители / Представляващи (managers for EOOD/OOD)
#   CR_F_10_L — Едноличен собственик / Неограничено отг. съдружник (sole owner)
#   CR_F_23_L — Съдружници (partners, for OOD)
_TR_ADDRESS_CODE = "CR_F_5_L"
_TR_SOLE_OWNER_CODE = "CR_F_10_L"
_TR_MANAGERS_CODE = "CR_F_7_L"
_TR_PARTNERS_CODE = "CR_F_23_L"


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
    sole_owner = ""
    tr_email = ""
    managers: list[str] = []
    partners: list[str] = []

    for section in data.get("sections", []):
        for sub in section.get("subDeeds", []):
            for group in sub.get("groups", []):
                for field in group.get("fields", []):
                    code = field.get("nameCode", "")
                    html = field.get("htmlData", "")
                    if code == _TR_ADDRESS_CODE and not address:
                        full_addr_text = _extract_text_from_html(html)
                        if not tr_email:
                            tr_email = _extract_email_from_text(full_addr_text)
                        if not city:
                            city = _extract_city_from_address(full_addr_text)
                        address = _parse_address_from_field(html)
                    elif code == _TR_SOLE_OWNER_CODE and not sole_owner:
                        sole_owner = _extract_text_from_html(html)
                    elif code == _TR_MANAGERS_CODE:
                        for name in _extract_names_from_html(html):
                            if name not in managers:
                                managers.append(name)
                    elif code == _TR_PARTNERS_CODE:
                        for name in _extract_names_from_html(html):
                            if name not in partners:
                                partners.append(name)

    # МОЛ (Управител / Представляващ) — prefer actual manager name,
    # fall back to sole-owner text (which for KD/KDA companies is the managing entity).
    mol = managers[0] if managers else sole_owner
    if mol and ("Заличено" in mol):
        mol = managers[0] if managers else ""

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
        "managers": managers,
        "partners": partners,
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
        "managers": [],
        "partners": [],
        "source": "Търговски регистър (portal.registryagency.bg)",
    }


async def lookup_eik(eik: str) -> dict:
    """Look up a company by EIK in the Bulgarian Trade Registry."""
    clean_eik = re.sub(r"\s+", "", eik)
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
