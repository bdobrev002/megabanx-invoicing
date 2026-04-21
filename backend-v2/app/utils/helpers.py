"""Common helper utilities."""

import re


def sanitize_filename(name: str) -> str:
    """Remove unsafe characters from filename, keeping Cyrillic."""
    sanitized = re.sub(r"[^\w\s.\-\u0430-\u044f\u0410-\u042f\u0451\u0401]", "", name, flags=re.UNICODE)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized
