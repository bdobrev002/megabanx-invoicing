"""File system operations for profiles, companies, and invoices."""

import logging
import os
import re

from app.config import settings

logger = logging.getLogger("megabanx.files")


def sanitize_path_component(name: str) -> str:
    """Sanitize a string for safe use as a single directory/file name component.

    Strips path separators, '..' sequences, null bytes, and leading/trailing
    dots and spaces to prevent directory traversal attacks.
    """
    # Remove null bytes
    name = name.replace("\x00", "")
    # Remove path separators
    name = name.replace("/", "_").replace("\\", "_")
    # Remove '..' sequences
    name = re.sub(r"\.{2,}", "_", name)
    # Strip leading/trailing dots and spaces
    name = name.strip(". ")
    # Fallback if name is empty after sanitization
    if not name:
        name = "_unnamed"
    return name


def get_profile_dir(profile_id: str) -> str:
    return os.path.join(settings.DATA_DIR, profile_id)


def get_inbox_dir(profile_id: str) -> str:
    return os.path.join(get_profile_dir(profile_id), "Входяща папка")


def ensure_profile_dirs(profile_id: str) -> None:
    os.makedirs(get_profile_dir(profile_id), exist_ok=True)
    os.makedirs(get_inbox_dir(profile_id), exist_ok=True)


def create_company_folders(profile_id: str, company_name: str) -> None:
    safe_name = sanitize_path_component(company_name)
    company_dir = os.path.join(get_profile_dir(profile_id), safe_name)
    os.makedirs(os.path.join(company_dir, "Фактури покупки"), exist_ok=True)
    os.makedirs(os.path.join(company_dir, "Фактури продажби"), exist_ok=True)
    os.makedirs(os.path.join(company_dir, "Фактури за одобрение"), exist_ok=True)


SUPPORTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".tif"]
