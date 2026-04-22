"""Companies router: CRUD + EIK lookup + logo upload/download."""

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.profile import Profile
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate
from app.services.eik_lookup import lookup_eik as _lookup_eik
from app.services.file_manager import create_company_folders, sanitize_path_component

_LOGO_ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
_LOGO_MAX_BYTES = 2 * 1024 * 1024  # 2 MB

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
    result = await db.execute(select(Company).where(Company.profile_id == profile_id).order_by(Company.name))
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
        city=req.city.strip(),
        country=req.country.strip() or "България",
        phone=req.phone.strip(),
        email=req.email.strip(),
        drive_purchases_folder_id=req.drive_purchases_folder_id,
        drive_purchases_folder_path=req.drive_purchases_folder_path,
        drive_sales_folder_id=req.drive_sales_folder_id,
        drive_sales_folder_path=req.drive_sales_folder_path,
        invoice_template=req.invoice_template or "modern",
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

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
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

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    await db.delete(company)
    return {"message": "Фирмата е изтрита"}


def _logo_dir(profile_id: str) -> str:
    return os.path.join(settings.DATA_DIR, profile_id, "_assets")


@router.post("/{company_id}/logo")
async def upload_company_logo(
    profile_id: str,
    company_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload/replace the company logo. Stored on disk and exposed via GET logo."""
    await _verify_profile(profile_id, user, db)

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in _LOGO_ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Поддържаме PNG, JPG, GIF или WEBP")

    data = await file.read()
    if len(data) > _LOGO_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Файлът е над 2 MB")
    if not data:
        raise HTTPException(status_code=400, detail="Празен файл")

    os.makedirs(_logo_dir(profile_id), exist_ok=True)
    out_path = os.path.join(_logo_dir(profile_id), f"{company_id}{ext}")

    # remove any old logo with a different extension so we don't orphan files
    for old_ext in _LOGO_ALLOWED_EXT:
        if old_ext == ext:
            continue
        stale = os.path.join(_logo_dir(profile_id), f"{company_id}{old_ext}")
        if os.path.exists(stale):
            try:
                os.remove(stale)
            except OSError:
                pass

    with open(out_path, "wb") as fh:
        fh.write(data)

    company.logo_path = out_path
    await db.flush()
    return {"logo_path": out_path}


@router.delete("/{company_id}/logo")
async def delete_company_logo(
    profile_id: str,
    company_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the company logo."""
    await _verify_profile(profile_id, user, db)

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    if company.logo_path and os.path.exists(company.logo_path):
        try:
            os.remove(company.logo_path)
        except OSError:
            pass

    company.logo_path = ""
    await db.flush()
    return {"message": "Логото е изтрито"}


@router.get("/{company_id}/logo")
async def get_company_logo(
    profile_id: str,
    company_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve the company logo image (owner only)."""
    await _verify_profile(profile_id, user, db)

    result = await db.execute(select(Company).where(Company.id == company_id, Company.profile_id == profile_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    if not company.logo_path or not os.path.exists(company.logo_path):
        raise HTTPException(status_code=404, detail="Няма лого")

    return FileResponse(company.logo_path)


# EIK lookup (standalone endpoint)
eik_router = APIRouter(prefix="/api", tags=["eik"])


@eik_router.get("/lookup-eik/{eik}")
async def lookup_eik_endpoint(eik: str, user: User = Depends(get_current_user)):
    """Look up a company by EIK in the Bulgarian Trade Registry."""
    return await _lookup_eik(eik)
