"""Application settings loaded from environment variables."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/megabanx_v2"

    # Gemini AI
    GEMINI_API_KEY: str = ""

    # Encryption (Fernet key, base64-encoded 32 bytes)
    ENCRYPTION_KEY: str = ""

    # Email (SMTP)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 25
    SMTP_FROM: str = "noreply@megabanx.com"

    # App
    APP_NAME: str = "MegaBanx"
    BASE_URL: str = "https://megabanx.duckdns.org"
    DATA_DIR: str = "/data" if os.path.isdir("/data") else os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

    # Google Drive
    GOOGLE_DRIVE_CREDENTIALS_JSON: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
