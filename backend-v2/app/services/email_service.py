"""Email sending service (OTP codes, share invitations, notifications)."""

import uuid
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger("megabanx.email")


def _send_email(to_email: str, subject: str, html: str, text: str) -> bool:
    """Send an email via SMTP."""
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


def send_otp_email(to_email: str, code: str) -> bool:
    """Send OTP code via email."""
    html = f"""\
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #4f46e5; margin: 0;">{settings.APP_NAME}</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0437\u0430 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0430 \u0444\u0430\u043a\u0442\u0443\u0440\u0438</p>
    </div>
    <p style="color: #374151;">\u0417\u0434\u0440\u0430\u0432\u0435\u0439\u0442\u0435,</p>
    <p style="color: #374151;">\u0412\u0438\u0435 \u0437\u0430\u044f\u0432\u0438\u0445\u0442\u0435 \u043a\u043e\u0434 \u0437\u0430 \u0432\u0445\u043e\u0434 \u0432 {settings.APP_NAME}. \u041c\u043e\u043b\u044f, \u0432\u044a\u0432\u0435\u0434\u0435\u0442\u0435 \u0441\u043b\u0435\u0434\u043d\u0438\u044f \u043a\u043e\u0434:</p>
    <div style="text-align: center; margin: 28px 0;">
      <div style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4f46e5; background: #eef2ff; padding: 16px 32px; border-radius: 10px; border: 2px solid #c7d2fe;">{code}</div>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">\u041a\u043e\u0434\u044a\u0442 \u0435 \u0432\u0430\u043b\u0438\u0434\u0435\u043d <strong>10 \u043c\u0438\u043d\u0443\u0442\u0438</strong>.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">\u0410\u043a\u043e \u043d\u0435 \u0441\u0442\u0435 \u0437\u0430\u044f\u0432\u0438\u043b\u0438 \u0442\u043e\u0437\u0438 \u043a\u043e\u0434, \u043f\u0440\u043e\u0441\u0442\u043e \u0438\u0433\u043d\u043e\u0440\u0438\u0440\u0430\u0439\u0442\u0435 \u0442\u043e\u0437\u0438 \u0438\u043c\u0435\u0439\u043b.<br>\u041d\u0438\u043a\u043e\u0439 \u043d\u0435 \u043c\u043e\u0436\u0435 \u0434\u0430 \u043f\u043e\u043b\u0443\u0447\u0438 \u0434\u043e\u0441\u0442\u044a\u043f \u0434\u043e \u0430\u043a\u0430\u0443\u043d\u0442\u0430 \u0432\u0438 \u0431\u0435\u0437 \u0442\u043e\u0437\u0438 \u043a\u043e\u0434.</p>
  </div>
  <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">&copy; 2026 {settings.APP_NAME} | megabanx.com</p>
</body>
</html>"""

    text = (
        f"{settings.APP_NAME} - \u041a\u043e\u0434 \u0437\u0430 \u0432\u0445\u043e\u0434\n\n"
        f"\u0412\u0430\u0448\u0438\u044f\u0442 \u043a\u043e\u0434 \u0437\u0430 \u0432\u0445\u043e\u0434 \u0435: {code}\n\n"
        f"\u041a\u043e\u0434\u044a\u0442 \u0435 \u0432\u0430\u043b\u0438\u0434\u0435\u043d 10 \u043c\u0438\u043d\u0443\u0442\u0438.\n\n"
        f"\u0410\u043a\u043e \u043d\u0435 \u0441\u0442\u0435 \u0437\u0430\u044f\u0432\u0438\u043b\u0438 \u0442\u043e\u0437\u0438 \u043a\u043e\u0434, \u043f\u0440\u043e\u0441\u0442\u043e \u0438\u0433\u043d\u043e\u0440\u0438\u0440\u0430\u0439\u0442\u0435 \u0442\u043e\u0437\u0438 \u0438\u043c\u0435\u0439\u043b.\n\n"
        f"---\n{settings.APP_NAME} | megabanx.com"
    )

    return _send_email(to_email, f"{settings.APP_NAME} - \u041a\u043e\u0434 \u0437\u0430 \u0432\u0445\u043e\u0434 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0430\u0442\u0430", html, text)


def send_share_invitation_email(to_email: str, owner_name: str, company_name: str) -> bool:
    """Send share invitation to a non-registered user."""
    html = f"""<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #4f46e5; margin: 0;">{settings.APP_NAME}</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0437\u0430 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0430 \u0444\u0430\u043a\u0442\u0443\u0440\u0438</p>
    </div>
    <p style="color: #374151;">\u0417\u0434\u0440\u0430\u0432\u0435\u0439\u0442\u0435,</p>
    <p style="color: #374151;"><strong>{owner_name}</strong> \u0441\u043f\u043e\u0434\u0435\u043b\u0438 \u0444\u0438\u0440\u043c\u0430 <strong>{company_name}</strong> \u0441 \u0432\u0430\u0441 \u0432 {settings.APP_NAME}.</p>
    <p style="color: #374151;">\u0417\u0430 \u0434\u0430 \u0432\u0438\u0434\u0438\u0442\u0435 \u0441\u043f\u043e\u0434\u0435\u043b\u0435\u043d\u0438\u0442\u0435 \u0444\u0430\u043a\u0442\u0443\u0440\u0438, \u0432\u043b\u0435\u0437\u0442\u0435 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0430\u0442\u0430:</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{settings.BASE_URL}" style="display: inline-block; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">\u0412\u043b\u0435\u0437\u0442\u0435 \u0432 {settings.APP_NAME}</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">\u0418\u0437\u043f\u043e\u043b\u0437\u0432\u0430\u0439\u0442\u0435 \u0438\u043c\u0435\u0439\u043b: <strong>{to_email}</strong></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">\u0410\u043a\u043e \u043d\u0435 \u043e\u0447\u0430\u043a\u0432\u0430\u0442\u0435 \u0442\u043e\u0432\u0430 \u0441\u044a\u043e\u0431\u0449\u0435\u043d\u0438\u0435, \u043f\u0440\u043e\u0441\u0442\u043e \u0433\u043e \u0438\u0433\u043d\u043e\u0440\u0438\u0440\u0430\u0439\u0442\u0435.</p>
  </div>
</body>
</html>"""

    text = f"{settings.APP_NAME}\n\n{owner_name} shared company {company_name} with you.\nLogin at {settings.BASE_URL} with email {to_email}"
    return _send_email(to_email, f"{settings.APP_NAME} - {owner_name} \u0441\u043f\u043e\u0434\u0435\u043b\u0438 \u0444\u0438\u0440\u043c\u0430 \u0441 \u0432\u0430\u0441", html, text)


def send_share_notification_email(to_email: str, owner_name: str, company_name: str) -> bool:
    """Send share notification to an existing user."""
    html = f"""<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #4f46e5; margin: 0;">{settings.APP_NAME}</h2>
    </div>
    <p style="color: #374151;">\u0417\u0434\u0440\u0430\u0432\u0435\u0439\u0442\u0435,</p>
    <p style="color: #374151;"><strong>{owner_name}</strong> \u0441\u043f\u043e\u0434\u0435\u043b\u0438 \u0444\u0438\u0440\u043c\u0430 <strong>{company_name}</strong> \u0441 \u0432\u0430\u0441.</p>
    <p style="color: #374151;">\u0412\u043b\u0435\u0437\u0442\u0435 \u0432 {settings.APP_NAME} \u0437\u0430 \u0434\u0430 \u0432\u0438\u0434\u0438\u0442\u0435 \u0441\u043f\u043e\u0434\u0435\u043b\u0435\u043d\u0438\u0442\u0435 \u0444\u0430\u043a\u0442\u0443\u0440\u0438.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{settings.BASE_URL}" style="display: inline-block; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">\u0412\u043b\u0435\u0437\u0442\u0435 \u0432 {settings.APP_NAME}</a>
    </div>
  </div>
</body>
</html>"""

    text = f"{owner_name} shared company {company_name} with you in {settings.APP_NAME}.\nLogin at {settings.BASE_URL}"
    return _send_email(to_email, f"{settings.APP_NAME} - New shared company from {owner_name}", html, text)
