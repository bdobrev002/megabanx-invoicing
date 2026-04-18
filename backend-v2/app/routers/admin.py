"""Admin router: user management, settings, stats."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.profile import Profile
from app.models.company import Company
from app.models.invoice import Invoice
from app.models.billing import Billing
from app.models.admin import AdminSettings

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def _require_admin(user: User) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Нямате администраторски достъп")
    return user


@router.get("/stats")
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get system-wide statistics (admin only)."""
    await _require_admin(user)

    users_count = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    profiles_count = (await db.execute(select(func.count()).select_from(Profile))).scalar() or 0
    companies_count = (await db.execute(select(func.count()).select_from(Company))).scalar() or 0
    invoices_count = (await db.execute(select(func.count()).select_from(Invoice))).scalar() or 0

    return {
        "users": users_count,
        "profiles": profiles_count,
        "companies": companies_count,
        "invoices": invoices_count,
    }


@router.get("/users")
async def list_users(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    await _require_admin(user)

    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "profile_id": u.profile_id,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.get("/settings")
async def get_admin_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get admin settings (key-value store)."""
    await _require_admin(user)

    result = await db.execute(select(AdminSettings))
    settings_list = result.scalars().all()
    return {s.key: s.value for s in settings_list}


@router.put("/settings/{key}")
async def set_admin_setting(
    key: str,
    value: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set an admin setting."""
    await _require_admin(user)

    result = await db.execute(select(AdminSettings).where(AdminSettings.key == key))
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = value
    else:
        db.add(AdminSettings(key=key, value=value))

    await db.flush()
    return {"message": f"Настройка '{key}' е запазена"}
