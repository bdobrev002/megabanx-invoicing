import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse

router = APIRouter(prefix="/api/items", tags=["items"])


@router.post("", response_model=ItemResponse)
async def create_item(data: ItemCreate, db: AsyncSession = Depends(get_db)):
    item = Item(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("", response_model=list[ItemResponse])
async def list_items(
    company_id: uuid.UUID | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Item)
    if company_id:
        query = query.where(Item.company_id == company_id)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Item.name.ilike(search_term),
                Item.description.ilike(search_term),
            )
        )
    query = query.order_by(Item.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: uuid.UUID, data: ItemUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}")
async def delete_item(item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return {"detail": "Item deleted"}
