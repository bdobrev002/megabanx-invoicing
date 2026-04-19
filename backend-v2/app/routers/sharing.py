"""Company sharing router: share, list, update, revoke shares."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.company import Company
from app.models.sharing import CompanyShare
from app.models.notification import Notification
from app.schemas.sharing import ShareCompanyRequest, UpdateShareRequest
from app.services.email_service import send_share_invitation_email, send_share_notification_email

router = APIRouter(prefix="/api/profiles/{profile_id}/companies/{company_id}/shares", tags=["sharing"])


@router.get("")
async def list_shares(
    profile_id: str,
    company_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all shares for a company."""
    # Verify ownership
    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.profile_id == profile_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    result = await db.execute(
        select(CompanyShare).where(CompanyShare.company_id == company_id)
    )
    shares = result.scalars().all()
    return [
        {
            "id": s.id,
            "company_id": s.company_id,
            "shared_with_email": s.shared_with_email,
            "shared_with_user_id": s.shared_with_user_id,
            "owner_user_id": s.owner_user_id,
            "can_upload": s.can_upload,
            "created_at": s.created_at.isoformat(),
        }
        for s in shares
    ]


@router.post("")
async def share_company(
    profile_id: str,
    company_id: str,
    req: ShareCompanyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Share a company with another user by email."""
    # Verify ownership
    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.profile_id == profile_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    target_email = req.email.strip().lower()

    # Can't share with yourself
    if target_email == user.email:
        raise HTTPException(status_code=400, detail="Не можете да споделяте с вашия имейл")

    # Check if already shared
    result = await db.execute(
        select(CompanyShare).where(
            CompanyShare.company_id == company_id,
            CompanyShare.shared_with_email == target_email,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Фирмата вече е споделена с този потребител")

    # Find target user
    result = await db.execute(select(User).where(User.email == target_email))
    target_user = result.scalar_one_or_none()

    share = CompanyShare(
        id=str(uuid.uuid4()),
        company_id=company_id,
        owner_profile_id=profile_id,
        shared_with_email=target_email,
        shared_with_user_id=target_user.id if target_user else "",
        owner_user_id=user.id,
        company_name=company.name,
        company_eik=company.eik,
        can_upload=req.can_upload,
    )
    db.add(share)

    # Add in-app notification for existing users
    if target_user:
        db.add(Notification(
            profile_id=target_user.profile_id,
            type="company_shared",
            title="Нова споделена фирма",
            message=f"{user.name} сподели фирма {company.name} с вас.",
            filename="",
            source="sharing",
        ))

    # Flush DB first so share + notification are persisted before sending email
    await db.flush()

    # Send email AFTER successful flush to avoid notifying about a failed share
    if target_user:
        await send_share_notification_email(target_email, user.name, company.name)
    else:
        await send_share_invitation_email(target_email, user.name, company.name)

    return {"message": f"Фирмата е споделена с {target_email}", "share_id": share.id}


@router.put("/{share_id}")
async def update_share(
    profile_id: str,
    company_id: str,
    share_id: str,
    req: UpdateShareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update share permissions."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    result = await db.execute(
        select(CompanyShare).where(
            CompanyShare.id == share_id,
            CompanyShare.company_id == company_id,
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Споделянето не е намерено")

    share.can_upload = req.can_upload
    await db.flush()
    return {"message": "Разрешенията са обновени"}


@router.delete("/{share_id}")
async def revoke_share(
    profile_id: str,
    company_id: str,
    share_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a company share."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    result = await db.execute(
        select(CompanyShare).where(
            CompanyShare.id == share_id,
            CompanyShare.company_id == company_id,
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Споделянето не е намерено")

    await db.delete(share)
    return {"message": "Споделянето е премахнато"}


# Shared companies endpoint (for the shared-with user)
shared_router = APIRouter(prefix="/api/shared-companies", tags=["sharing"])


@shared_router.get("")
async def get_shared_companies(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all companies shared with the current user."""
    result = await db.execute(
        select(CompanyShare).where(
            CompanyShare.shared_with_email == user.email,
        )
    )
    shares = result.scalars().all()

    companies = []
    for share in shares:
        result = await db.execute(select(Company).where(Company.id == share.company_id))
        company = result.scalar_one_or_none()
        if company:
            companies.append({
                "share_id": share.id,
                "company_id": company.id,
                "company_name": company.name,
                "company_eik": company.eik,
                "owner_profile_id": share.owner_profile_id,
                "can_upload": share.can_upload,
                "shared_at": share.created_at.isoformat(),
            })

    return companies
