"""Profiles router: CRUD operations for user profiles."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileCreate, ProfileOut, ProfileUpdate
from app.services.file_manager import ensure_profile_dirs

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("")
async def get_profiles(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get the profile associated with the current user."""
    result = await db.execute(select(Profile).where(Profile.id == user.profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        return []
    return [ProfileOut.model_validate(profile)]


@router.post("")
async def create_profile(
    req: ProfileCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new profile. V2 supports one profile per user (set on registration)."""
    # In v2, the user already has a profile from registration
    result = await db.execute(select(Profile).where(Profile.id == user.profile_id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Вече имате профил")

    profile_id = str(uuid.uuid4())
    profile = Profile(id=profile_id, name=req.name.strip())
    db.add(profile)

    user.profile_id = profile_id
    ensure_profile_dirs(profile_id)

    await db.flush()
    return ProfileOut.model_validate(profile)


@router.put("/{profile_id}")
async def update_profile(
    profile_id: str,
    req: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile name."""
    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Профилът не е намерен")

    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп до този профил")

    profile.name = req.name.strip()
    await db.flush()
    return ProfileOut.model_validate(profile)


@router.delete("/{profile_id}")
async def delete_profile(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a profile.

    V2 uses one profile per user.  Deleting the profile would orphan all
    associated data (companies, invoices, notifications, shares, billing)
    and leave the User.profile_id pointing at a non-existent row.  Instead
    of allowing that, we reject the request and direct the user to contact
    support for full account deletion.
    """
    raise HTTPException(
        status_code=400,
        detail="Изтриването на профил не е поддържано. Моля, свържете се с нас за изтриване на акаунт.",
    )
