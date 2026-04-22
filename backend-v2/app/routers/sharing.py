"""Company sharing router: share, list, update, revoke, and leave."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.notification import Notification
from app.models.sharing import CompanyShare
from app.models.user import User
from app.schemas.sharing import ShareCompanyRequest, UpdateShareRequest
from app.services.email_service import send_share_invitation_email, send_share_notification_email

router = APIRouter(
    prefix="/api/profiles/{profile_id}/companies/{company_id}/shares",
    tags=["sharing"],
)


def _serialise_share(share: CompanyShare) -> dict:
    return {
        "id": share.id,
        "company_id": share.company_id,
        "company_name": share.company_name,
        "company_eik": share.company_eik,
        "owner_profile_id": share.owner_profile_id,
        "owner_user_id": share.owner_user_id,
        "shared_with_email": share.shared_with_email,
        "shared_with_user_id": share.shared_with_user_id,
        "can_upload": share.can_upload,
        "created_at": share.created_at.isoformat(),
    }


@router.get("")
async def list_shares(
    profile_id: str,
    company_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all shares for a company (owner only)."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    result = await db.execute(select(CompanyShare).where(CompanyShare.company_id == company_id))
    return [_serialise_share(s) for s in result.scalars().all()]


@router.post("")
async def share_company(
    profile_id: str,
    company_id: str,
    req: ShareCompanyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Share a company with another user by email (owner only)."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    target_email = req.email.strip().lower()
    if target_email == user.email:
        raise HTTPException(status_code=400, detail="Не можете да споделяте с вашия имейл")

    result = await db.execute(
        select(CompanyShare).where(
            CompanyShare.company_id == company_id,
            CompanyShare.shared_with_email == target_email,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Фирмата вече е споделена с този потребител")

    target = (await db.execute(select(User).where(User.email == target_email))).scalar_one_or_none()

    share = CompanyShare(
        id=str(uuid.uuid4()),
        company_id=company_id,
        owner_profile_id=profile_id,
        owner_user_id=user.id,
        company_name=company.name,
        company_eik=company.eik,
        shared_with_email=target_email,
        shared_with_user_id=target.id if target else "",
        can_upload=req.can_upload,
    )
    db.add(share)

    if target:
        db.add(
            Notification(
                profile_id=target.profile_id,
                type="company_shared",
                title="Нова споделена фирма",
                message=f"{user.name} сподели фирма {company.name} с вас.",
                filename="",
                source="sharing",
            )
        )

    await db.flush()

    if target:
        await send_share_notification_email(target_email, user.name, company.name)
    else:
        await send_share_invitation_email(target_email, user.name, company.name)

    return _serialise_share(share)


@router.put("/{share_id}")
async def update_share(
    profile_id: str,
    company_id: str,
    share_id: str,
    req: UpdateShareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update share permissions (owner only)."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

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
    return _serialise_share(share)


@router.delete("/{share_id}")
async def revoke_share(
    profile_id: str,
    company_id: str,
    share_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a company share (owner only)."""
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп")

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

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


# ──────────────────── Shared-with-me side ────────────────────

shared_router = APIRouter(prefix="/api/shared-companies", tags=["sharing"])


@shared_router.get("")
async def get_shared_companies(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return every company shared with the current user (by email).

    Shape matches the frontend ``SharedCompanyInfo`` type: each entry has a
    nested ``company`` object plus owner metadata for display.
    """
    shares = (await db.execute(select(CompanyShare).where(CompanyShare.shared_with_email == user.email))).scalars().all()

    if not shares:
        return []

    company_ids = [s.company_id for s in shares]
    owner_user_ids = [s.owner_user_id for s in shares if s.owner_user_id]

    companies_by_id = {c.id: c for c in (await db.execute(select(Company).where(Company.id.in_(company_ids)))).scalars().all()}
    owners_by_id = (
        {u.id: u for u in (await db.execute(select(User).where(User.id.in_(owner_user_ids)))).scalars().all()} if owner_user_ids else {}
    )

    out = []
    for share in shares:
        company = companies_by_id.get(share.company_id)
        if company is None:
            continue
        owner = owners_by_id.get(share.owner_user_id)
        out.append(
            {
                "share_id": share.id,
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "eik": company.eik,
                    "vat_number": company.vat_number or "",
                    "address": company.address or "",
                    "mol": company.mol or "",
                },
                "owner_profile_id": share.owner_profile_id,
                "owner_name": owner.name if owner else "",
                "owner_email": owner.email if owner else "",
                "can_upload": share.can_upload,
                "shared_at": share.created_at.isoformat(),
            }
        )
    return out


@shared_router.delete("/{share_id}")
async def leave_shared_company(
    share_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove oneself from a company share (shared-with user only)."""
    share = (await db.execute(select(CompanyShare).where(CompanyShare.id == share_id))).scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Споделянето не е намерено")

    if share.shared_with_email != user.email:
        raise HTTPException(status_code=403, detail="Нямате достъп до това споделяне")

    await db.delete(share)
    return {"message": "Напуснахте споделената фирма"}
