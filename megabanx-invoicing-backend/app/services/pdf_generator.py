import asyncio
import os
import base64
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.config import PDF_DIR

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def get_logo_base64(logo_path: str | None) -> str | None:
    if not logo_path or not os.path.exists(logo_path):
        return None
    with open(logo_path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(logo_path)[1].lower()
    mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".gif": "image/gif",
    }.get(ext, "image/png")
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


CURRENCY_WORDS = {
    "EUR": ("евро", "цент."),
    "BGN": ("лев", "стотинки"),
    "USD": ("долар", "цент."),
    "GBP": ("паунд", "пени"),
}


def num_to_bg_words(number: float, currency: str = "EUR") -> str:
    """Convert number to Bulgarian words for invoice total."""
    main_unit, sub_unit = CURRENCY_WORDS.get(currency, CURRENCY_WORDS["EUR"])
    int_part = int(number)
    dec_part = round((number - int_part) * 100)

    ones = ["", "един", "два", "три", "четири", "пет", "шест", "седем", "осем", "девет"]
    teens = ["десет", "единадесет", "дванадесет", "тринадесет", "четиринадесет",
             "петнадесет", "шестнадесет", "седемнадесет", "осемнадесет", "деветнадесет"]
    tens = ["", "", "двадесет", "тридесет", "четиридесет", "петдесет",
            "шестдесет", "седемдесет", "осемдесет", "деветдесет"]
    hundreds = ["", "сто", "двеста", "триста", "четиристотин", "петстотин",
                "шестстотин", "седемстотин", "осемстотин", "деветстотин"]

    def convert_chunk(n: int) -> str:
        if n == 0:
            return "нула"
        parts = []
        if n >= 1000:
            th = n // 1000
            if th == 1:
                parts.append("хиляда")
            elif th == 2:
                parts.append("две хиляди")
            else:
                parts.append(f"{convert_chunk(th)} хиляди")
            n = n % 1000
        if n >= 100:
            parts.append(hundreds[n // 100])
            n = n % 100
        if n >= 20:
            parts.append(tens[n // 10])
            n = n % 10
            if n > 0:
                parts.append("и " + ones[n])
        elif n >= 10:
            parts.append(teens[n - 10])
        elif n > 0:
            if parts:
                parts.append("и " + ones[n])
            else:
                parts.append(ones[n])
        return " ".join(parts)

    result = convert_chunk(int_part)
    if dec_part > 0:
        result += f" {main_unit} и {dec_part:02d} {sub_unit}"
    else:
        result += f" {main_unit}."
    return result


def _generate_invoice_pdf_sync(invoice) -> str:
    """Synchronous PDF generation (CPU-bound, run in thread pool)."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)
    template = env.get_template("invoice_pdf.html")

    doc_type_labels = {
        "invoice": ("ФАКТУРА", "Фактура"),
        "proforma": ("ПРОФОРМА", "Проформа"),
        "debit_note": ("ДЕБИТНО ИЗВЕСТИЕ", "Дебитно известие"),
        "credit_note": ("КРЕДИТНО ИЗВЕСТИЕ", "Кредитно известие"),
    }
    doc_type_label, doc_type_label_lower = doc_type_labels.get(
        invoice.document_type, ("ФАКТУРА", "Фактура")
    )

    logo_b64 = get_logo_base64(invoice.company.logo_path if invoice.company else None)

    html_content = template.render(
        invoice=invoice,
        company=invoice.company,
        client=invoice.client,
        lines=invoice.lines,
        doc_type_label=doc_type_label,
        doc_type_label_lower=doc_type_label_lower,
        logo_b64=logo_b64,
        total_words=num_to_bg_words(float(invoice.total), invoice.currency),
    )

    os.makedirs(PDF_DIR, exist_ok=True)
    pdf_filename = f"{doc_type_label_lower}_{invoice.invoice_number}_{invoice.id}.pdf"
    pdf_path = os.path.join(PDF_DIR, pdf_filename)

    HTML(string=html_content).write_pdf(pdf_path)
    return pdf_path


async def generate_invoice_pdf(invoice) -> str:
    """Generate PDF for an invoice without blocking the event loop."""
    return await asyncio.to_thread(_generate_invoice_pdf_sync, invoice)
