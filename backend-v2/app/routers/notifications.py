"""Notifications router: list, mark read, delete."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all notifications for the current user."""
    result = await db.execute(
        select(Notification)
        .where(Notification.profile_id == user.profile_id)
        .order_by(Notification.timestamp.desc())
    )
    notifications = result.scalars().all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "filename": n.filename,
            "source": n.source,
            "is_read": n.read,
            "created_at": n.timestamp.isoformat(),
        }
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get count of unread notifications."""
    result = await db.execute(
        select(Notification).where(
            Notification.profile_id == user.profile_id,
            Notification.read == False,
        )
    )
    notifications = result.scalars().all()
    return {"count": len(notifications)}


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.profile_id == user.profile_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Известието не е намерено")

    notification.read = True
    await db.flush()
    return {"message": "Маркирано като прочетено"}


@router.put("/read-all")
async def mark_all_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(Notification.profile_id == user.profile_id, Notification.read == False)
        .values(read=True)
    )
    return {"message": "Всички известия са маркирани като прочетени"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.profile_id == user.profile_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Известието не е намерено")

    await db.delete(notification)
    return {"message": "Известието е изтрито"}
