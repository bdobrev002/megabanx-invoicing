"""Billing router: plan info, usage stats."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.billing import Billing, InvoiceMonthlyUsage

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("")
async def get_billing(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's billing info and usage."""
    result = await db.execute(select(Billing).where(Billing.user_id == user.id))
    billing = result.scalar_one_or_none()

    if not billing:
        return {
            "plan": "free",
            "invoices_limit": 30,
            "current_usage": 0,
            "remaining": 30,
        }

    now = datetime.utcnow()
    month_key = f"{now.year}-{now.month:02d}"

    result = await db.execute(
        select(InvoiceMonthlyUsage).where(
            InvoiceMonthlyUsage.user_id == user.id,
            InvoiceMonthlyUsage.month == month_key,
        )
    )
    usage = result.scalar_one_or_none()
    current_count = usage.count if usage else 0

    return {
        "plan": billing.plan,
        "invoices_limit": billing.invoices_limit,
        "current_usage": current_count,
        "remaining": max(0, billing.invoices_limit - current_count),
        "started_at": billing.created_at.isoformat() if billing.created_at else None,
    }
