import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://invoicing:invoicing@localhost:5432/invoicing"
)
DATABASE_URL_SYNC = os.getenv(
    "DATABASE_URL_SYNC",
    "postgresql+psycopg://invoicing:invoicing@localhost:5432/invoicing"
)

SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@megabanx.com")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "false").lower() == "true"

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/invoicing-uploads")
PDF_DIR = os.getenv("PDF_DIR", "/tmp/invoicing-pdfs")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PDF_DIR, exist_ok=True)
