"""Google Drive integration service (placeholder — adapted from v1)."""

import logging

from app.config import settings

logger = logging.getLogger("megabanx.drive")


async def upload_to_drive(file_path: str, folder_id: str, filename: str) -> str | None:
    """Upload a file to Google Drive. Returns the drive file ID or None."""
    if not settings.GOOGLE_DRIVE_CREDENTIALS_JSON:
        logger.warning("[DRIVE] Google Drive credentials not configured")
        return None

    # TODO: Implement full Google Drive upload using service account
    # This will be adapted from v1's google_drive.py module
    logger.info(f"[DRIVE] Upload requested: {filename} -> folder {folder_id}")
    return None
