"""Megabanx 2.0 — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
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
from app.services.ws_manager import ws_manager

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


# --- WebSocket endpoint for real-time notifications ---
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    """WebSocket endpoint for real-time updates.

    The client connects with ?token=<session_token> and the server
    resolves the profile_id from the session.  All events for that
    profile are pushed over this connection.
    """
    # Accept the WebSocket handshake first so close codes reach the client.
    # Without accept(), uvicorn responds with HTTP 403 and the browser sees
    # code 1006 (abnormal closure) instead of our custom 4001.
    await websocket.accept()

    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    # Resolve profile_id from session token
    from app.database import async_session_factory
    from sqlalchemy import select
    from app.models.user import User, Session

    async with async_session_factory() as db:
        result = await db.execute(select(Session).where(Session.token == token))
        session = result.scalar_one_or_none()
        if not session:
            await websocket.close(code=4001, reason="Invalid token")
            return
        if datetime.utcnow() > session.expires_at:
            await websocket.close(code=4001, reason="Token expired")
            return
        result = await db.execute(select(User).where(User.id == session.user_id))
        user = result.scalar_one_or_none()
        if not user or not user.profile_id:
            await websocket.close(code=4001, reason="No profile")
            return
        profile_id = user.profile_id

    # Register connection (already accepted above, so skip accept in connect)
    if profile_id not in ws_manager.active_connections:
        ws_manager.active_connections[profile_id] = []
    ws_manager.active_connections[profile_id].append(websocket)
    logger.info(
        "[WS] Profile %s connected. Total: %d",
        profile_id,
        len(ws_manager.active_connections[profile_id]),
    )
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(profile_id, websocket)
    except Exception:
        ws_manager.disconnect(profile_id, websocket)


@app.get("/")
async def root():
    return {"app": settings.APP_NAME, "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
