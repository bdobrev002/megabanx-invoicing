import uuid
import os
import shutil
import glob as globmod
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.config import UPLOAD_DIR

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.post("", response_model=CompanyResponse)
async def create_company(data: CompanyCreate, db: AsyncSession = Depends(get_db)):
    company = Company(**data.model_dump())
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("", response_model=list[CompanyResponse])
async def list_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).order_by(Company.created_at.desc()))
    return result.scalars().all()


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: uuid.UUID, data: CompanyUpdate, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(company, key, value)
    await db.commit()
    await db.refresh(company)
    return company


@router.post("/{company_id}/logo", response_model=CompanyResponse)
async def upload_logo(company_id: uuid.UUID, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    logo_dir = os.path.join(UPLOAD_DIR, "logos")
    os.makedirs(logo_dir, exist_ok=True)

    # Remove old logo files (handles extension changes)
    for old_file in globmod.glob(os.path.join(logo_dir, f"{company_id}.*")):
        try:
            os.remove(old_file)
        except OSError:
            pass

    ext = os.path.splitext(file.filename or "logo.png")[1]
    filename = f"{company_id}{ext}"
    filepath = os.path.join(logo_dir, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    company.logo_path = filepath
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/{company_id}/logo")
async def get_logo(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Serve company logo regardless of file extension."""
    company = await db.get(Company, company_id)
    if not company or not company.logo_path:
        raise HTTPException(status_code=404, detail="Logo not found")

    if os.path.isfile(company.logo_path):
        return FileResponse(company.logo_path)

    # Fallback: search for any file matching the company_id in logos dir
    logo_dir = os.path.join(UPLOAD_DIR, "logos")
    matches = globmod.glob(os.path.join(logo_dir, f"{company_id}.*"))
    if matches:
        return FileResponse(matches[0])

    raise HTTPException(status_code=404, detail="Logo file not found")
