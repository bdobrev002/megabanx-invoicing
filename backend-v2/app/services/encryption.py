"""File encryption/decryption using Fernet (AES-256)."""

import logging
import os

from cryptography.fernet import Fernet

from app.config import settings

logger = logging.getLogger("megabanx.encryption")

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    key = settings.ENCRYPTION_KEY
    if key:
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
        return _fernet

    # Try reading from file (backward compat with v1)
    key_file = os.path.join(settings.DATA_DIR, ".encryption_key")
    if os.path.exists(key_file):
        with open(key_file, "rb") as f:
            raw = f.read().strip()
        _fernet = Fernet(raw)
        return _fernet

    # Generate a new key
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    new_key = Fernet.generate_key()
    with open(key_file, "wb") as f:
        f.write(new_key)
    os.chmod(key_file, 0o600)
    logger.info("Generated new file encryption key")
    _fernet = Fernet(new_key)
    return _fernet


def encrypt_file_data(data: bytes) -> bytes:
    """Encrypt file data using AES (Fernet)."""
    return _get_fernet().encrypt(data)


def decrypt_file_data(data: bytes) -> bytes:
    """Decrypt file data. Returns original data if not encrypted (backward compat)."""
    try:
        return _get_fernet().decrypt(data)
    except Exception:
        return data


def write_encrypted_file(path: str, data: bytes) -> None:
    """Write encrypted data to file."""
    with open(path, "wb") as f:
        f.write(encrypt_file_data(data))


def read_decrypted_file(path: str) -> bytes:
    """Read and decrypt file data."""
    with open(path, "rb") as f:
        return decrypt_file_data(f.read())
