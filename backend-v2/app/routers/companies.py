"""Companies router: CRUD + EIK lookup."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.profile import Profile
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyOut
from app.services.file_manager import create_company_folders, sanitize_path_component
from app.services.eik_lookup import lookup_eik as _lookup_eik

router = APIRouter(prefix="/api/profiles/{profile_id}/companies", tags=["companies"])


async def _verify_profile(profile_id: str, user: User, db: AsyncSession) -> Profile:
    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Профилът не е намерен")
    if profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Нямате достъп до този профил")
    return profile


@router.get("")
async def get_companies(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all companies for a profile."""
    await _verify_profile(profile_id, user, db)
    result = await db.execute(
        select(Company).where(Company.profile_id == profile_id).order_by(Company.name)
    )
    companies = result.scalars().all()
    return [CompanyOut.model_validate(c) for c in companies]


@router.post("")
async def create_company(
    profile_id: str,
    req: CompanyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new company."""
    await _verify_profile(profile_id, user, db)

    safe_name = sanitize_path_component(req.name.strip())
    company = Company(
        id=str(uuid.uuid4()),
        profile_id=profile_id,
        name=safe_name,
        eik=req.eik.strip(),
        vat_number=req.vat_number.strip(),
        address=req.address.strip(),
        mol=req.mol.strip(),
        drive_purchases_folder_id=req.drive_purchases_folder_id,
        drive_purchases_folder_path=req.drive_purchases_folder_path,
        drive_sales_folder_id=req.drive_sales_folder_id,
        drive_sales_folder_path=req.drive_sales_folder_path,
    )
    db.add(company)

    # Create company folders on disk
    create_company_folders(profile_id, safe_name)

    await db.flush()
    return CompanyOut.model_validate(company)


@router.put("/{company_id}")
async def update_company(
    profile_id: str,
    company_id: str,
    req: CompanyUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a company."""
    await _verify_profile(profile_id, user, db)

    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.profile_id == profile_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    for field, value in req.model_dump(exclude_unset=True).items():
        if isinstance(value, str):
            value = value.strip()
            if field == "name":
                value = sanitize_path_component(value)
        setattr(company, field, value)

    await db.flush()
    return CompanyOut.model_validate(company)


@router.delete("/{company_id}")
async def delete_company(
    profile_id: str,
    company_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a company."""
    await _verify_profile(profile_id, user, db)

    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.profile_id == profile_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    await db.delete(company)
    return {"message": "Фирмата е изтрита"}


# EIK lookup (standalone endpoint)
eik_router = APIRouter(prefix="/api", tags=["eik"])


@eik_router.get("/lookup-eik/{eik}")
async def lookup_eik_endpoint(eik: str, user: User = Depends(get_current_user)):
    """Look up a company by EIK in the Bulgarian Trade Registry."""
    return await _lookup_eik(eik)
