import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.number_set import NumberSet

router = APIRouter(prefix="/api/number-sets", tags=["number_sets"])


class NumberSetCreate(BaseModel):
    company_id: uuid.UUID
    name: str | None = None
    range_from: int = 1
    range_to: int = 1000000000


class NumberSetResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str | None
    range_from: int
    range_to: int

    model_config = {"from_attributes": True}


@router.get("", response_model=list[NumberSetResponse])
async def list_number_sets(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NumberSet).where(NumberSet.company_id == company_id).order_by(NumberSet.range_from)
    )
    return result.scalars().all()


@router.post("", response_model=NumberSetResponse)
async def create_number_set(data: NumberSetCreate, db: AsyncSession = Depends(get_db)):
    ns = NumberSet(
        company_id=data.company_id,
        name=data.name,
        range_from=data.range_from,
        range_to=data.range_to,
    )
    db.add(ns)
    await db.commit()
    await db.refresh(ns)
    return ns


@router.delete("/{ns_id}")
async def delete_number_set(ns_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    ns = await db.get(NumberSet, ns_id)
    if not ns:
        raise HTTPException(status_code=404, detail="Number set not found")
    await db.delete(ns)
    await db.commit()
    return {"detail": "Deleted"}
