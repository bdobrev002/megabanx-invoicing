"""Stripe integration service (Stage 9).

Central async-safe wrapper around the `stripe` SDK. Keeps billing-router
endpoints thin and centralises:

* Product/Price bootstrap (lazy — prices are created on first `/checkout`).
* Customer provisioning per user (one Stripe customer per account).
* Checkout Session + Customer Portal helpers.
* Subscription cancel/reactivate helpers.
* Webhook event → `Billing` row reconciliation.

Stripe calls are synchronous in the SDK; we fan them out through
`asyncio.to_thread` so the FastAPI event loop stays responsive.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, cast

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.billing import Billing
from app.models.user import User
from app.services.plans import get_plan

logger = logging.getLogger("megabanx.stripe")


# ---------------------------------------------------------------------------
# Module-level Stripe state
# ---------------------------------------------------------------------------

stripe.api_key = settings.STRIPE_SECRET_KEY or None

# In-memory cache of lazily-created Stripe Price IDs, keyed by plan id.
# Prices are billed monthly in BGN; amount_minor = price * 100.
_price_cache: dict[str, str] = {}
_product_cache: str | None = None
_price_lock = asyncio.Lock()

# Paid plans we expose via Checkout. `free` never hits Stripe.
PAID_PLANS = ("starter", "pro", "business")


def is_configured() -> bool:
    """Whether Stripe can be used (secret key present)."""
    return bool(settings.STRIPE_SECRET_KEY)


# ---------------------------------------------------------------------------
# Product + Price bootstrap (lazy, idempotent)
# ---------------------------------------------------------------------------


async def _ensure_product() -> str:
    global _product_cache
    if _product_cache:
        return _product_cache

    def _create() -> str:
        product = stripe.Product.create(
            name="MegaBanx v2 Абонамент",
            description="Месечен абонамент за MegaBanx v2 — управление на фактури, AI класификация, кросс-копиране.",
        )
        return str(product.id)

    _product_cache = await asyncio.to_thread(_create)
    return _product_cache


async def ensure_prices() -> dict[str, str]:
    """Return `{plan_id: stripe_price_id}` for every paid plan.

    Creates missing Stripe Products/Prices on first call. Cached in-process;
    Stripe itself is the source of truth across process restarts but we only
    create a fresh Price when the cache is empty *and* the env var lookup
    misses, which is the common path on cold start. Concurrent first-call
    callers are serialized by `_price_lock`.
    """
    if not is_configured():
        raise RuntimeError("Stripe is not configured (missing STRIPE_SECRET_KEY)")

    async with _price_lock:
        missing = [p for p in PAID_PLANS if p not in _price_cache]
        if not missing:
            return dict(_price_cache)

        product_id = await _ensure_product()

        def _create_prices() -> dict[str, str]:
            out: dict[str, str] = {}
            for plan_id in missing:
                plan = get_plan(plan_id)
                amount_minor = int(round(float(plan.get("price", 0.0)) * 100))
                currency = str(plan.get("currency", "BGN")).lower()
                price = stripe.Price.create(
                    product=product_id,
                    unit_amount=amount_minor,
                    currency=currency,
                    recurring={"interval": "month"},
                    nickname=str(plan.get("name", plan_id)),
                    lookup_key=f"megabanx_v2_{plan_id}_monthly",
                )
                out[plan_id] = str(price.id)
            return out

        created = await asyncio.to_thread(_create_prices)
        _price_cache.update(created)
        return dict(_price_cache)


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------


async def get_or_create_customer(user: User, billing: Billing, db: AsyncSession) -> str:
    """Return Stripe customer id for `user`, creating one on first use."""
    if billing.stripe_customer_id:
        return billing.stripe_customer_id

    def _create() -> str:
        cust = stripe.Customer.create(
            email=user.email,
            name=getattr(user, "name", None) or user.email,
            metadata={"user_id": user.id},
        )
        return str(cust.id)

    customer_id = await asyncio.to_thread(_create)
    billing.stripe_customer_id = customer_id
    await db.flush()
    return customer_id


# ---------------------------------------------------------------------------
# Checkout + Portal
# ---------------------------------------------------------------------------


async def create_checkout_session(
    user: User,
    billing: Billing,
    plan_id: str,
    origin: str,
    db: AsyncSession,
) -> str:
    """Create a Stripe Checkout session and return its URL."""
    if plan_id not in PAID_PLANS:
        raise ValueError(f"Plan '{plan_id}' is not billable via Stripe")

    prices = await ensure_prices()
    price_id = prices.get(plan_id)
    if not price_id:
        raise RuntimeError(f"No Stripe price configured for plan '{plan_id}'")

    customer_id = await get_or_create_customer(user, billing, db)

    base = origin.rstrip("/") or settings.BASE_URL.rstrip("/")
    success_url = f"{base}/dashboard/subscription?billing=success"
    cancel_url = f"{base}/dashboard/subscription?billing=cancel"

    plan = get_plan(plan_id)
    trial_days = int(plan.get("trial_days", 0) or 0)
    sub_data: dict[str, Any] = {"metadata": {"user_id": user.id, "plan": plan_id}}
    if trial_days > 0:
        sub_data["trial_period_days"] = trial_days

    def _create() -> str:
        session_ = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user.id, "plan": plan_id},
            subscription_data=cast(Any, sub_data),
            allow_promotion_codes=True,
        )
        return str(session_.url or "")

    return await asyncio.to_thread(_create)


async def create_portal_session(customer_id: str, return_url: str) -> str:
    def _create() -> str:
        portal = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
        return str(portal.url)

    return await asyncio.to_thread(_create)


# ---------------------------------------------------------------------------
# Subscription lifecycle
# ---------------------------------------------------------------------------


async def cancel_subscription(subscription_id: str) -> dict[str, Any]:
    def _cancel() -> dict[str, Any]:
        sub = stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
        return dict(sub)

    return await asyncio.to_thread(_cancel)


async def reactivate_subscription(subscription_id: str) -> dict[str, Any]:
    def _resume() -> dict[str, Any]:
        sub = stripe.Subscription.modify(subscription_id, cancel_at_period_end=False)
        return dict(sub)

    return await asyncio.to_thread(_resume)


async def list_invoices(customer_id: str, limit: int = 24) -> list[dict[str, Any]]:
    def _list() -> list[dict[str, Any]]:
        resp = stripe.Invoice.list(customer=customer_id, limit=limit)
        out: list[dict[str, Any]] = []
        for inv in resp.auto_paging_iter():
            # Amounts are returned in minor units (cents/stotinki) so the
            # frontend `StripePayment.total / 100` formatter keeps working.
            out.append(
                {
                    "id": inv.id,
                    "number": inv.number or inv.id,
                    "amount_paid": int(inv.amount_paid or 0),
                    "subtotal": int(inv.subtotal or 0),
                    "tax": int(inv.tax or 0),
                    "total": int(inv.total or 0),
                    "currency": (inv.currency or "bgn").upper(),
                    "status": inv.status or "",
                    "created": int(inv.created or 0),
                    "period_start": int(inv.period_start or 0),
                    "period_end": int(inv.period_end or 0),
                    "invoice_pdf": inv.invoice_pdf or "",
                    "hosted_invoice_url": inv.hosted_invoice_url or "",
                }
            )
            if len(out) >= limit:
                break
        return out

    return await asyncio.to_thread(_list)


# ---------------------------------------------------------------------------
# Webhook handling
# ---------------------------------------------------------------------------


def verify_webhook(payload: bytes, signature: str) -> dict[str, Any]:
    """Verify the webhook signature and return the parsed event."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET not configured")
    event = stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)
    return dict(event)


def _lookup_plan_from_price(price_id: str | None) -> str | None:
    if not price_id:
        return None
    for plan_id, cached_id in _price_cache.items():
        if cached_id == price_id:
            return plan_id
    return None


async def _find_billing(
    db: AsyncSession,
    *,
    user_id: str | None = None,
    customer_id: str | None = None,
    subscription_id: str | None = None,
) -> Billing | None:
    stmt = None
    if user_id:
        stmt = select(Billing).where(Billing.user_id == user_id)
    elif subscription_id:
        stmt = select(Billing).where(Billing.stripe_subscription_id == subscription_id)
    elif customer_id:
        stmt = select(Billing).where(Billing.stripe_customer_id == customer_id)
    if stmt is None:
        return None
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def handle_webhook_event(event: dict[str, Any], db: AsyncSession) -> None:
    """Reconcile local `Billing` state with a Stripe webhook event."""
    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})
    logger.info("[STRIPE] webhook %s id=%s", event_type, event.get("id"))

    if event_type == "checkout.session.completed":
        user_id = (data.get("metadata") or {}).get("user_id")
        plan_id = (data.get("metadata") or {}).get("plan")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")

        billing = await _find_billing(db, user_id=user_id) if user_id else None
        if billing is None and customer_id:
            billing = await _find_billing(db, customer_id=customer_id)
        if billing is None:
            logger.warning("[STRIPE] checkout.session.completed without matching Billing row: %s", data.get("id"))
            return

        if customer_id:
            billing.stripe_customer_id = customer_id
        if subscription_id:
            billing.stripe_subscription_id = subscription_id
        if plan_id:
            billing.plan = plan_id
            billing.invoices_limit = int(get_plan(plan_id).get("max_invoices", 30))
        billing.subscription_status = "active"
        billing.cancel_at_period_end = False
        billing.subscription_start = datetime.utcnow()
        await db.flush()

    elif event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
    ):
        subscription_id = data.get("id")
        customer_id = data.get("customer")
        status = data.get("status")
        cancel_flag = bool(data.get("cancel_at_period_end", False))
        cpe_ts = data.get("current_period_end")

        items = (data.get("items") or {}).get("data") or []
        price_id = items[0].get("price", {}).get("id") if items else None
        plan_id = _lookup_plan_from_price(price_id)

        billing = await _find_billing(db, subscription_id=subscription_id) if subscription_id else None
        if billing is None and customer_id:
            billing = await _find_billing(db, customer_id=customer_id)
        if billing is None:
            logger.warning("[STRIPE] subscription event without matching Billing row: %s", subscription_id)
            return

        if subscription_id:
            billing.stripe_subscription_id = subscription_id
        if plan_id:
            billing.plan = plan_id
            billing.invoices_limit = int(get_plan(plan_id).get("max_invoices", 30))
        if status:
            billing.subscription_status = status
        billing.cancel_at_period_end = cancel_flag
        if cpe_ts:
            billing.current_period_end = datetime.utcfromtimestamp(int(cpe_ts))
            billing.subscription_end = billing.current_period_end
        await db.flush()

    elif event_type in ("customer.subscription.deleted", "customer.subscription.canceled"):
        subscription_id = data.get("id")
        billing = await _find_billing(db, subscription_id=subscription_id) if subscription_id else None
        if billing is None:
            logger.warning("[STRIPE] subscription.deleted without matching Billing row: %s", subscription_id)
            return
        billing.subscription_status = "canceled"
        billing.cancel_at_period_end = False
        billing.plan = "free"
        billing.invoices_limit = int(get_plan("free").get("max_invoices", 30))
        billing.stripe_subscription_id = None
        await db.flush()

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        billing = await _find_billing(db, customer_id=customer_id) if customer_id else None
        if billing is not None:
            billing.subscription_status = "past_due"
            await db.flush()

    # Other event types are ignored by design.
