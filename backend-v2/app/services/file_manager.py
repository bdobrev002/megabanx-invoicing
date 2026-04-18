"""File system operations for profiles, companies, and invoices."""

import os
import logging

from app.config import settings

logger = logging.getLogger("megabanx.files")


def get_profile_dir(profile_id: str) -> str:
    return os.path.join(settings.DATA_DIR, profile_id)


def get_inbox_dir(profile_id: str) -> str:
    return os.path.join(get_profile_dir(profile_id), "Входяща папка")


def ensure_profile_dirs(profile_id: str) -> None:
    os.makedirs(get_profile_dir(profile_id), exist_ok=True)
    os.makedirs(get_inbox_dir(profile_id), exist_ok=True)


def create_company_folders(profile_id: str, company_name: str) -> None:
    company_dir = os.path.join(get_profile_dir(profile_id), company_name)
    os.makedirs(os.path.join(company_dir, "Фактури покупки"), exist_ok=True)
    os.makedirs(os.path.join(company_dir, "Фактури продажби"), exist_ok=True)
    os.makedirs(os.path.join(company_dir, "Фактури за одобрение"), exist_ok=True)


SUPPORTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif']
