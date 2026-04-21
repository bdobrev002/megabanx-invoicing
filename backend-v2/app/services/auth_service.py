"""Auth service: OTP generation, session management."""

import logging
import secrets
from datetime import datetime, timedelta

logger = logging.getLogger("megabanx.auth")

# In-memory OTP store (per-process, matches v1 behavior)
OTP_STORE: dict[str, dict] = {}


def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return "{:06d}".format(secrets.randbelow(1000000))


def store_otp(email: str, code: str) -> None:
    """Store an OTP code for an email with 10-minute expiry."""
    OTP_STORE[email] = {
        "code": code,
        "expires": (datetime.now() + timedelta(minutes=10)).isoformat(),
        "attempts": 0,
    }
    logger.info(f"[OTP] Code sent to {email}")


def verify_otp(email: str, code: str) -> bool:
    """Verify OTP code. Returns True if valid, raises ValueError with message on failure."""
    otp_data = OTP_STORE.get(email)
    if not otp_data:
        raise ValueError("Няма изпратен код за този имейл. Моля, поискайте нов код.")

    if datetime.now() > datetime.fromisoformat(otp_data["expires"]):
        del OTP_STORE[email]
        raise ValueError("Кодът е изтекъл. Моля, поискайте нов код.")

    if otp_data["attempts"] >= 5:
        del OTP_STORE[email]
        raise ValueError("Твърде много грешни опити. Моля, поискайте нов код.")

    if otp_data["code"] != code:
        otp_data["attempts"] += 1
        raise ValueError("Грешен код")

    # Valid — clean up
    del OTP_STORE[email]
    return True


def generate_session_token() -> str:
    """Generate a cryptographically secure session token."""
    return secrets.token_urlsafe(48)
