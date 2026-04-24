"""Google Gemini AI invoice analysis service."""

import asyncio
import json
import logging
import os
import random
import time

from fastapi import HTTPException
from google import genai
from google.genai import types

from app.config import settings
from app.services.encryption import read_decrypted_file

logger = logging.getLogger("megabanx.gemini")

# Gemini model. `gemini-2.5-flash` was overloaded at Google infra level —
# 3-5/10 parallel calls returned 503 UNAVAILABLE even with Tier 1 Postpay
# quota available. `gemini-2.5-flash-lite` returns 10/10 on the same
# parallel burst (tested with VPS key). Same multi-modal input (PDF+image)
# and structured JSON output, ~3x cheaper, optimised for throughput.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")

# Retry configuration for transient Gemini API failures (429, 500, 503).
# Matches v1 behaviour — Gemini is often overloaded ("high demand"),
# and the processing pipeline must survive a burst of 503 responses
# rather than silently marking 9/10 files as "unmatched".
GEMINI_MAX_RETRIES = 10
GEMINI_RETRY_STATUSES = ("429", "500", "503", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "INTERNAL")

# v1 parity — stagger successive Gemini calls so 10 parallel workers don't
# send a burst of 10 requests within the same millisecond. Without this,
# Gemini's edge rate-limiter quickly returns 503 UNAVAILABLE ("overloaded"),
# which — combined with no retry logic — caused 9/10 files to be flagged
# "Без съвпадение". v1 uses 0.1s, which spreads 10 calls across ~1s.
GEMINI_MIN_CALL_INTERVAL = float(os.environ.get("GEMINI_MIN_CALL_INTERVAL", "0.1"))
_gemini_call_lock = asyncio.Lock()
_gemini_last_call_time: float = 0.0


async def _throttle_gemini_call() -> None:
    """Ensure at least GEMINI_MIN_CALL_INTERVAL between call starts (process-wide)."""
    global _gemini_last_call_time
    async with _gemini_call_lock:
        now = time.monotonic()
        elapsed = now - _gemini_last_call_time
        if elapsed < GEMINI_MIN_CALL_INTERVAL:
            await asyncio.sleep(GEMINI_MIN_CALL_INTERVAL - elapsed)
        _gemini_last_call_time = time.monotonic()


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
    "subtotal": "сума без ДДС (данъчна основа)",
    "vat_amount": "сума на ДДС ако има",
    "total_amount": "обща сума (с ДДС)",
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
            model=GEMINI_MODEL,
            contents=parts,
        )
        return resp.text.strip() if resp.text else ""

    response_text = ""
    last_error: Exception | None = None
    for attempt in range(GEMINI_MAX_RETRIES):
        try:
            await _throttle_gemini_call()
            response_text = await asyncio.to_thread(_sync_generate)

            # Strip markdown code fences if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                response_text = "\n".join(lines)

            return json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {response_text}")
            raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
        except Exception as e:
            err = str(e)
            last_error = e
            is_transient = any(code in err for code in GEMINI_RETRY_STATUSES)
            if is_transient and attempt < GEMINI_MAX_RETRIES - 1:
                # Exponential backoff that starts fast: 1s, 2s, 4s, 8s, 16s, 30s...
                # Google's gemini-2.5-flash currently returns 503 UNAVAILABLE
                # transiently even for sequential calls, so a short first retry
                # recovers most files in <3s. Cap at 30s to avoid runaway waits
                # when the entire service is genuinely down.
                wait_time = min(2**attempt + random.uniform(0, 1), 30)
                logger.warning(
                    f"Gemini transient error (attempt {attempt + 1}/{GEMINI_MAX_RETRIES}), waiting {wait_time:.1f}s: {err[:200]}"
                )
                await asyncio.sleep(wait_time)
                continue
            logger.error(f"Gemini API error: {err}")
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {err}")

    raise HTTPException(
        status_code=500,
        detail=f"AI analysis failed after {GEMINI_MAX_RETRIES} retries: {last_error}",
    )
