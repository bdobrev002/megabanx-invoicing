"""Billing router: plan catalog + usage stats.

Per plan § 6.5.7, this router exposes two read-only endpoints:

* `GET /api/billing/plans` — static plan catalog for the Абонамент page.
* `GET /api/billing/`      — current plan + monthly usage for the Качване banner.

Stripe checkout, webhooks, trial activation, subscribe/cancel/resume and
payment history are deferred to Stage 9.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.billing import Billing, InvoiceMonthlyUsage
from app.models.user import User
from app.services.plans import PLANS

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
    result = await db.execute(
        select(InvoiceMonthlyUsage).where(
            InvoiceMonthlyUsage.user_id == user.id,
            InvoiceMonthlyUsage.year == now.year,
            InvoiceMonthlyUsage.month == now.month,
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


@router.get("/plans")
async def list_plans():
    """Return the static plan catalog consumed by the Абонамент page."""
    return PLANS
