"""Billing plan catalog and limit helpers.

Central source of truth for plan metadata (name, price, limits, features)
consumed by `GET /api/billing/plans` and by the `subscription` object on
`GET /api/auth/me`. Pricing follows the inv.bg reference (BGN, monthly).
"""

from __future__ import annotations

from typing import TypedDict


class PlanLimits(TypedDict):
    max_companies: int
    max_invoices: int


class Plan(TypedDict, total=False):
    id: str
    name: str
    price: float
    currency: str
    interval: str | None
    features: list[str]
    popular: bool
    contact_us: bool
    promo: str
    trial_days: int
    max_companies: int
    max_invoices: int


# `max_*` uses 999_999 as the "unlimited" sentinel so that
# SubscriptionStatus.tsx renders ∞ (it formats any value ≥ 999_999 as ∞).
PLANS: list[Plan] = [
    {
        "id": "free",
        "name": "Безплатен",
        "price": 0.0,
        "currency": "BGN",
        "interval": "monthly",
        "max_companies": 1,
        "max_invoices": 30,
        "features": [
            "1 фирма",
            "До 30 фактури/месец",
            "Качване и AI класификация",
            "PDF експорт",
        ],
    },
    {
        "id": "starter",
        "name": "Стандарт",
        "price": 6.0,
        "currency": "BGN",
        "interval": "monthly",
        "max_companies": 1,
        "max_invoices": 999_999,
        "features": [
            "1 фирма",
            "Неограничени фактури",
            "Email изпращане на фактури",
            "Кросс-копиране към контрагенти",
        ],
    },
    {
        "id": "pro",
        "name": "Про",
        "price": 12.0,
        "currency": "BGN",
        "interval": "monthly",
        "popular": True,
        "max_companies": 5,
        "max_invoices": 999_999,
        "features": [
            "До 5 фирми",
            "Неограничени фактури",
            "Споделяне със счетоводител",
            "4 дизайна на фактура",
            "Приоритетна поддръжка",
        ],
    },
    {
        "id": "business",
        "name": "Бизнес",
        "price": 24.0,
        "currency": "BGN",
        "interval": "monthly",
        "max_companies": 999_999,
        "max_invoices": 999_999,
        "features": [
            "Неограничени фирми",
            "Неограничени фактури",
            "Всички функции от Про",
            "Приоритетна поддръжка",
            "API достъп (скоро)",
        ],
    },
]


def get_plan(plan_id: str) -> Plan:
    """Return the plan definition for `plan_id`, falling back to free."""
    for p in PLANS:
        if p["id"] == plan_id:
            return p
    return PLANS[0]


def plan_limits(plan_id: str) -> PlanLimits:
    p = get_plan(plan_id)
    return PlanLimits(
        max_companies=p.get("max_companies", 1),
        max_invoices=p.get("max_invoices", 30),
    )


def build_subscription_info(
    billing,  # app.models.billing.Billing | None
    companies_count: int,
    invoices_count: int,
) -> dict:
    """Shape the `SubscriptionInfo` object expected by the frontend auth store.

    Contract matches `frontend-v2/src/types/auth.types.ts::SubscriptionInfo`.
    Stripe-specific fields (`stripe_subscription_id`, `stripe_customer_id`,
    `cancel_at_period_end`) are intentionally omitted until Stage 9 lands.
    """
    from datetime import datetime

    plan_id = billing.plan if billing else "free"
    plan = get_plan(plan_id)
    limits = plan_limits(plan_id)

    if billing and billing.is_trial and billing.trial_ends_at:
        status = "trial" if billing.trial_ends_at > datetime.utcnow() else "expired"
        expires = billing.trial_ends_at.isoformat()
    elif billing and billing.subscription_end:
        status = "active" if billing.subscription_end > datetime.utcnow() else "expired"
        expires = billing.subscription_end.isoformat()
    else:
        # No explicit subscription window — the free plan is always "active".
        status = "active" if plan_id == "free" else "active"
        expires = ""

    return {
        "status": status,
        "plan": plan_id,
        "expires": expires,
        "max_companies": limits["max_companies"],
        "max_invoices": limits["max_invoices"],
        "trial_days": plan.get("trial_days", 0),
        "prices": {
            "monthly": plan.get("price", 0.0),
            "yearly": round(plan.get("price", 0.0) * 12 * 0.9, 2),
            "currency": plan.get("currency", "BGN"),
        },
        "usage": {
            "companies": companies_count,
            "invoices": invoices_count,
        },
        "cancel_at_period_end": False,
    }
