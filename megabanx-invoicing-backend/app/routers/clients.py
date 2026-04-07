import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.post("", response_model=ClientResponse)
async def create_client(data: ClientCreate, db: AsyncSession = Depends(get_db)):
    client = Client(**data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    company_id: uuid.UUID | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Client)
    if company_id:
        query = query.where(Client.company_id == company_id)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Client.name.ilike(search_term),
                Client.eik.ilike(search_term),
                Client.email.ilike(search_term),
            )
        )
    query = query.order_by(Client.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(client_id: uuid.UUID, data: ClientUpdate, db: AsyncSession = Depends(get_db)):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}")
async def delete_client(client_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    return {"detail": "Client deleted"}
