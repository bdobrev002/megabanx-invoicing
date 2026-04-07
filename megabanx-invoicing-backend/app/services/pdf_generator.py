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


def num_to_bg_words(number: float) -> str:
    """Convert number to Bulgarian words for invoice total."""
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
        result += f" евро и {dec_part:02d} цент."
    else:
        result += " евро."
    return result


async def generate_invoice_pdf(invoice) -> str:
    """Generate PDF for an invoice and return the file path."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("invoice_pdf.html")

    doc_type_label = "ФАКТУРА" if invoice.document_type == "invoice" else "ПРОФОРМА"
    doc_type_label_lower = "Фактура" if invoice.document_type == "invoice" else "Проформа"

    logo_b64 = get_logo_base64(invoice.company.logo_path if invoice.company else None)

    html_content = template.render(
        invoice=invoice,
        company=invoice.company,
        client=invoice.client,
        lines=invoice.lines,
        doc_type_label=doc_type_label,
        doc_type_label_lower=doc_type_label_lower,
        logo_b64=logo_b64,
        total_words=num_to_bg_words(float(invoice.total)),
    )

    os.makedirs(PDF_DIR, exist_ok=True)
    pdf_filename = f"{doc_type_label_lower}_{invoice.invoice_number}_{invoice.id}.pdf"
    pdf_path = os.path.join(PDF_DIR, pdf_filename)

    HTML(string=html_content).write_pdf(pdf_path)
    return pdf_path
