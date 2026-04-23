"""Billing router: plan catalog, usage, and Stripe subscription lifecycle.

Read-only endpoints (Stage 8 catalog):

* `GET /api/billing/plans` — static plan catalog for the Абонамент page.
* `GET /api/billing/`      — current plan + monthly usage for the Качване banner.

Stage 9 (Stripe integration):

* `POST /api/billing/subscribe`       — create a Stripe Checkout session.
* `POST /api/billing/cancel`          — cancel at period end.
* `POST /api/billing/resume`          — undo pending cancellation.
* `GET  /api/billing/portal`          — Stripe Customer Portal link.
* `GET  /api/billing/payments`        — past Stripe invoices.
* `POST /api/billing/trial`           — activate free 30-day trial (non-Stripe).
* `POST /api/billing/webhook`         — Stripe signed webhook receiver.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.billing import Billing, InvoiceMonthlyUsage
from app.models.user import User
from app.services import stripe_service
from app.services.plans import PLANS, get_plan

router = APIRouter(prefix="/api/billing", tags=["billing"])
logger = logging.getLogger("megabanx.billing")


async def _get_or_create_billing(user: User, db: AsyncSession) -> Billing:
    result = await db.execute(select(Billing).where(Billing.user_id == user.id))
    billing = result.scalar_one_or_none()
    if billing is None:
        billing = Billing(user_id=user.id, plan="free", invoices_limit=30)
        db.add(billing)
        await db.flush()
    return billing


# ---------------------------------------------------------------------------
# Read-only catalog + usage
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Subscribe / cancel / resume / portal
# ---------------------------------------------------------------------------


class SubscribeIn(BaseModel):
    plan_id: str
    interval: str | None = "monthly"


@router.post("/subscribe")
async def subscribe(
    body: SubscribeIn,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout session for `plan_id` and return its URL."""
    if not stripe_service.is_configured():
        raise HTTPException(status_code=503, detail="Плащанията не са активирани")
    if body.plan_id not in stripe_service.PAID_PLANS:
        raise HTTPException(status_code=400, detail="Невалиден план")

    billing = await _get_or_create_billing(user, db)
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    try:
        url = await stripe_service.create_checkout_session(user, billing, body.plan_id, origin, db)
    except Exception as e:  # noqa: BLE001 — Stripe errors vary
        logger.exception("[STRIPE] create_checkout_session failed: %s", e)
        raise HTTPException(status_code=500, detail="Грешка при създаване на абонамент")

    await db.commit()
    return {"checkout_url": url}


@router.post("/cancel")
async def cancel(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedule the active subscription for cancellation at period end."""
    billing = await _get_or_create_billing(user, db)
    if not billing.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="Няма активен абонамент")

    try:
        await stripe_service.cancel_subscription(billing.stripe_subscription_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("[STRIPE] cancel failed: %s", e)
        raise HTTPException(status_code=500, detail="Грешка при отмяна на абонамента")

    billing.cancel_at_period_end = True
    await db.commit()
    return {"ok": True}


@router.post("/resume")
async def resume(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Undo a pending cancellation (only valid before period end)."""
    billing = await _get_or_create_billing(user, db)
    if not billing.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="Няма активен абонамент")

    try:
        await stripe_service.reactivate_subscription(billing.stripe_subscription_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("[STRIPE] reactivate failed: %s", e)
        raise HTTPException(status_code=500, detail="Грешка при възстановяване на абонамента")

    billing.cancel_at_period_end = False
    await db.commit()
    return {"ok": True}


@router.get("/portal")
async def portal(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a Stripe Customer Portal URL for the current user."""
    if not stripe_service.is_configured():
        raise HTTPException(status_code=503, detail="Плащанията не са активирани")
    billing = await _get_or_create_billing(user, db)
    if not billing.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Няма Stripe профил")

    # Origin header only (Referer may include a full path; Stripe requires an
    # absolute URL, so fall back to settings.BASE_URL like /subscribe does).
    origin = request.headers.get("origin") or ""
    base = origin.rstrip("/") or settings.BASE_URL.rstrip("/")
    return_url = f"{base}/dashboard/subscription"
    try:
        url = await stripe_service.create_portal_session(billing.stripe_customer_id, return_url)
    except Exception as e:  # noqa: BLE001
        logger.exception("[STRIPE] portal failed: %s", e)
        raise HTTPException(status_code=500, detail="Грешка при отваряне на портала")
    return {"url": url}


@router.get("/payments")
async def payments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return past Stripe invoices for the current user (newest first)."""
    billing = await _get_or_create_billing(user, db)
    if not billing.stripe_customer_id:
        return []
    try:
        return await stripe_service.list_invoices(billing.stripe_customer_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("[STRIPE] list_invoices failed: %s", e)
        return []


# ---------------------------------------------------------------------------
# Trial (non-Stripe)
# ---------------------------------------------------------------------------


@router.post("/trial")
async def activate_trial(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Grant a 30-day `pro` trial without Stripe. Idempotent per user."""
    billing = await _get_or_create_billing(user, db)
    if billing.is_trial and billing.trial_ends_at and billing.trial_ends_at > datetime.utcnow():
        return {"message": "Триалът ви вече е активен"}
    if billing.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="Вече имате активен абонамент")

    billing.plan = "pro"
    billing.is_trial = True
    # Clear any stale Stripe status (e.g. "canceled" from a prior subscription)
    # so the frontend reliably shows the trial banner.
    billing.subscription_status = None
    billing.trial_ends_at = datetime.utcnow() + timedelta(days=30)
    billing.invoices_limit = int(get_plan("pro").get("max_invoices", 999_999))
    await db.commit()
    return {"message": "Триалът е активиран за 30 дни"}


# ---------------------------------------------------------------------------
# Stripe webhook (public, signature-verified)
# ---------------------------------------------------------------------------


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive signed Stripe webhook events and update `Billing` rows."""
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        event: dict[str, Any] = stripe_service.verify_webhook(payload, signature)
    except Exception as e:  # noqa: BLE001 — covers ValueError + SignatureVerificationError
        logger.warning("[STRIPE] webhook signature failed: %s", e)
        return JSONResponse(status_code=400, content={"error": "invalid_signature"})

    try:
        await stripe_service.handle_webhook_event(event, db)
        await db.commit()
    except Exception as e:  # noqa: BLE001
        logger.exception("[STRIPE] webhook handler failed: %s", e)
        await db.rollback()
        return JSONResponse(status_code=500, content={"error": "handler_failed"})

    return {"received": True}
