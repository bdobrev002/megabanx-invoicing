import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os

from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_USE_TLS


async def send_invoice_email(
    recipient: str,
    subject: str,
    body: str,
    pdf_path: str,
    pdf_filename: str,
):
    """Send an email with the invoice PDF attached."""
    msg = MIMEMultipart()
    msg["From"] = SMTP_FROM
    msg["To"] = recipient
    msg["Subject"] = subject

    # Body
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # PDF attachment
    if os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            pdf_data = f.read()
        attachment = MIMEApplication(pdf_data, _subtype="pdf")
        attachment.add_header(
            "Content-Disposition", "attachment", filename=pdf_filename
        )
        msg.attach(attachment)

    # Send
    kwargs = {
        "hostname": SMTP_HOST,
        "port": SMTP_PORT,
    }
    if SMTP_USE_TLS:
        kwargs["use_tls"] = True
    if SMTP_USER:
        kwargs["username"] = SMTP_USER
    if SMTP_PASSWORD:
        kwargs["password"] = SMTP_PASSWORD

    await aiosmtplib.send(msg, **kwargs)
