"""Megabanx 2.0 — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.models.base import Base

# Import all models so they're registered with Base.metadata
from app.models import (  # noqa: F401
    user, profile, company, invoice, notification,
    sharing, billing, invoicing, drive, email_link,
    contact, admin,
)

# Import routers
from app.routers import auth, profiles, companies, invoices
from app.routers import notifications, sharing as sharing_router, billing as billing_router
from app.routers import contact, admin as admin_router, invoicing as invoicing_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("megabanx")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup (dev mode). Use Alembic for production migrations."""
    logger.info(f"Starting {settings.APP_NAME} v2 backend...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured.")
    yield
    await engine.dispose()
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="Megabanx 2.0 — Система за управление на фактури",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://new.megabanx.com",
        "https://megabanx.com",
        "https://megabanx.duckdns.org",
        settings.BASE_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(companies.router)
app.include_router(companies.eik_router)
app.include_router(invoices.router)
app.include_router(notifications.router)
app.include_router(sharing_router.router)
app.include_router(sharing_router.shared_router)
app.include_router(billing_router.router)
app.include_router(contact.router)
app.include_router(admin_router.router)
app.include_router(invoicing_router.router)


@app.get("/")
async def root():
    return {"app": settings.APP_NAME, "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
