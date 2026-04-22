"""Email sending service (OTP codes, share invitations, notifications)."""

import asyncio
import html as html_mod
import logging
import smtplib
import uuid
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from app.config import settings

logger = logging.getLogger("megabanx.email")


def _send_email_sync(to_email: str, subject: str, html: str, text: str) -> bool:
    """Send an email via SMTP (synchronous, internal)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.APP_NAME} <{settings.SMTP_FROM}>"
        msg["To"] = to_email
        msg["Reply-To"] = settings.SMTP_FROM
        msg["Message-ID"] = f"<{uuid.uuid4()}@megabanx.com>"
        msg["X-Mailer"] = settings.APP_NAME
        msg["Precedence"] = "bulk"
        msg["Auto-Submitted"] = "auto-generated"
        msg["MIME-Version"] = "1.0"

        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())

        logger.info(f"[EMAIL] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] Error sending to {to_email}: {e}")
        return False


async def send_email(to_email: str, subject: str, html: str, text: str) -> bool:
    """Send an email via SMTP in a thread pool to avoid blocking the event loop."""
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html, text)


async def send_otp_email(to_email: str, code: str) -> bool:
    """Send OTP code via email (async, non-blocking)."""
    safe_app = html_mod.escape(settings.APP_NAME)
    safe_code = html_mod.escape(code)

    html = f"""\
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #4f46e5; margin: 0;">{safe_app}</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Система за управление на фактури</p>
    </div>
    <p style="color: #374151;">Здравейте,</p>
    <p style="color: #374151;">Вие заявихте код за вход в {safe_app}. Моля, въведете следния код:</p>
    <div style="text-align: center; margin: 28px 0;">
      <div style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4f46e5; background: #eef2ff; padding: 16px 32px; border-radius: 10px; border: 2px solid #c7d2fe;">{safe_code}</div>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">Кодът е валиден <strong>10 минути</strong>.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">Ако не сте заявили този код, просто игнорирайте този имейл.<br>Никой не може да получи достъп до акаунта ви без този код.</p>
  </div>
  <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">&copy; 2026 {safe_app} | megabanx.com</p>
</body>
</html>"""

    text = (
        f"{settings.APP_NAME} - Код за вход\n\n"
        f"Вашият код за вход е: {code}\n\n"
        f"Кодът е валиден 10 минути.\n\n"
        f"Ако не сте заявили този код, просто игнорирайте този имейл.\n\n"
        f"---\n{settings.APP_NAME} | megabanx.com"
    )

    return await send_email(to_email, f"{settings.APP_NAME} - Код за вход в системата", html, text)


async def send_share_invitation_email(to_email: str, owner_name: str, company_name: str) -> bool:
    """Send share invitation to a non-registered user (async, non-blocking)."""
    safe_owner = html_mod.escape(owner_name)
    safe_company = html_mod.escape(company_name)
    safe_email = html_mod.escape(to_email)
    safe_app = html_mod.escape(settings.APP_NAME)
    safe_url = html_mod.escape(settings.BASE_URL)

    html = f"""<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #4f46e5; margin: 0;">{safe_app}</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Система за управление на фактури</p>
    </div>
    <p style="color: #374151;">Здравейте,</p>
    <p style="color: #374151;"><strong>{safe_owner}</strong> сподели фирма <strong>{safe_company}</strong> с вас в {safe_app}.</p>
    <p style="color: #374151;">За да видите споделените фактури, влезте в системата:</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{safe_url}" style="display: inline-block; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">Влезте в {safe_app}</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">Използвайте имейл: <strong>{safe_email}</strong></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">Ако не очаквате това съобщение, просто го игнорирайте.</p>
  </div>
</body>
</html>"""

    text = (
        f"{settings.APP_NAME}\n\n{owner_name} shared company {company_name} with you.\nLogin at {settings.BASE_URL} with email {to_email}"
    )
    return await send_email(to_email, f"{settings.APP_NAME} - {owner_name} сподели фирма с вас", html, text)


async def send_share_notification_email(to_email: str, owner_name: str, company_name: str) -> bool:
    """Send share notification to an existing user (async, non-blocking)."""
    safe_owner = html_mod.escape(owner_name)
    safe_company = html_mod.escape(company_name)
    safe_app = html_mod.escape(settings.APP_NAME)
    safe_url = html_mod.escape(settings.BASE_URL)

    html = f"""<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #4f46e5; margin: 0;">{safe_app}</h2>
    </div>
    <p style="color: #374151;">Здравейте,</p>
    <p style="color: #374151;"><strong>{safe_owner}</strong> сподели фирма <strong>{safe_company}</strong> с вас.</p>
    <p style="color: #374151;">Влезте в {safe_app} за да видите споделените фактури.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{safe_url}" style="display: inline-block; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">Влезте в {safe_app}</a>
    </div>
  </div>
</body>
</html>"""

    text = f"{owner_name} shared company {company_name} with you in {settings.APP_NAME}.\nLogin at {settings.BASE_URL}"
    return await send_email(to_email, f"{settings.APP_NAME} - New shared company from {owner_name}", html, text)


def _send_invoice_email_sync(
    to_email: str,
    cc: list[str],
    bcc: list[str],
    subject: str,
    html: str,
    text: str,
    attachment_path: str | None,
    attachment_name: str | None,
) -> tuple[bool, str | None, str | None]:
    """Send an invoice email with optional PDF attachment.

    Returns ``(ok, message_id, error)``. ``message_id`` is the RFC 5322
    ``Message-ID`` we set on the outgoing mail so the caller can store it in
    :class:`~app.models.invoicing.InvEmailLog` for later reconciliation.
    """
    message_id = f"<{uuid.uuid4()}@megabanx.com>"
    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"{settings.APP_NAME} <{settings.SMTP_FROM}>"
        msg["To"] = to_email
        if cc:
            msg["Cc"] = ", ".join(cc)
        msg["Reply-To"] = settings.SMTP_FROM
        msg["Message-ID"] = message_id
        msg["X-Mailer"] = settings.APP_NAME
        msg["MIME-Version"] = "1.0"

        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(text, "plain", "utf-8"))
        alt.attach(MIMEText(html, "html", "utf-8"))
        msg.attach(alt)

        if attachment_path:
            path = Path(attachment_path)
            if path.is_file():
                with path.open("rb") as fh:
                    part = MIMEBase("application", "pdf")
                    part.set_payload(fh.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{attachment_name or path.name}"',
                )
                msg.attach(part)

        recipients = [to_email, *cc, *bcc]
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.sendmail(settings.SMTP_FROM, recipients, msg.as_string())

        logger.info(f"[EMAIL][invoice] Sent to {recipients}: {subject}")
        return True, message_id, None
    except Exception as e:
        logger.error(f"[EMAIL][invoice] Error sending to {to_email}: {e}")
        return False, message_id, str(e)


async def send_invoice_email(
    to_email: str,
    subject: str,
    html: str,
    text: str,
    *,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    attachment_path: str | None = None,
    attachment_name: str | None = None,
) -> tuple[bool, str | None, str | None]:
    """Async wrapper around :func:`_send_invoice_email_sync`."""
    return await asyncio.to_thread(
        _send_invoice_email_sync,
        to_email,
        cc or [],
        bcc or [],
        subject,
        html,
        text,
        attachment_path,
        attachment_name,
    )
