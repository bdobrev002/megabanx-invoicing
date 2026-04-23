"""Google Gemini AI invoice analysis service."""

import asyncio
import json
import logging
import os

from fastapi import HTTPException
from google import genai
from google.genai import types

from app.config import settings
from app.services.encryption import read_decrypted_file

logger = logging.getLogger("megabanx.gemini")

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is not None:
        return _client
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API ключът не е конфигуриран.")
    _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


ANALYSIS_PROMPT = """Анализирай тази фактура и извлечи следната информация в JSON формат.
Върни САМО валиден JSON без markdown форматиране, без ```json блокове.

{
    "date": "YYYY.MM.DD формат на датата на издаване",
    "invoice_number": "номер на фактурата",
    "issuer_name": "име на фирмата издател (доставчик)",
    "issuer_eik": "ЕИК на издателя",
    "issuer_vat": "ДДС номер на издателя ако има",
    "recipient_name": "име на фирмата получател (купувач)",
    "recipient_eik": "ЕИК на получателя",
    "recipient_vat": "ДДС номер на получателя ако има",
    "total_amount": "обща сума",
    "vat_amount": "сума на ДДС ако има",
    "is_credit_note": true или false
}

Ако не можеш да намериш дадена стойност, постави null.
Датата ТРЯБВА да е във формат YYYY.MM.DD.
Полето is_credit_note трябва да е true ако документът е кредитно известие (Credit Note),
а не обикновена фактура. Провери заглавието на документа — ако пише "Кредитно известие"
или "Credit Note", постави true. В противен случай постави false.
"""


async def analyze_invoice_with_gemini(file_path: str, extracted_text: str = "") -> dict:
    """Analyze an invoice file using Gemini AI and return structured data."""
    client = _get_client()

    parts: list[types.Part | str] = []

    file_ext = os.path.splitext(file_path)[1].lower()
    if file_ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".tif"]:
        image_bytes = read_decrypted_file(file_path)
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".bmp": "image/bmp",
            ".webp": "image/webp",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
        }
        mime_type = mime_map.get(file_ext, "image/jpeg")
        parts.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
        parts.append(ANALYSIS_PROMPT)
    elif file_ext == ".pdf":
        if extracted_text and len(extracted_text.strip()) > 50:
            parts.append(f"Текст от фактура:\n\n{extracted_text}\n\n{ANALYSIS_PROMPT}")
        else:
            pdf_bytes = read_decrypted_file(file_path)
            parts.append(types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"))
            parts.append(ANALYSIS_PROMPT)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {file_ext}")

    def _sync_generate() -> str:
        """Run the synchronous Gemini SDK call in a thread."""
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=parts,
        )
        return resp.text.strip() if resp.text else ""

    try:
        response_text = await asyncio.to_thread(_sync_generate)

        # Strip markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            response_text = "\n".join(lines)

        result = json.loads(response_text)
        return result
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {response_text}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
