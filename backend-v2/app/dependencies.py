"""FastAPI dependencies: DB session, current user."""

from datetime import datetime

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import Session, User


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Extract session token from cookie or Authorization header and return the user."""
    token = request.cookies.get("session_token", "")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Не сте влезли в системата")

    result = await db.execute(select(Session).where(Session.token == token))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Не сте влезли в системата")

    # Check session expiry — commit deletion independently so the rollback
    # triggered by HTTPException does not undo it.
    if datetime.utcnow() > session.expires_at:
        try:
            await db.delete(session)
            await db.commit()
        except Exception:
            await db.rollback()
        raise HTTPException(status_code=401, detail="Сесията ви е изтекла. Моля, влезте отново.")

    result = await db.execute(select(User).where(User.id == session.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Не сте влезли в системата")

    return user
