"""Billing plan catalog and limit helpers.

Central source of truth for plan metadata (name, price, limits, features)
consumed by `GET /api/billing/plans` and by the `subscription` object on
`GET /api/auth/me`. Pricing + plan catalog mirror v1 (EUR, monthly).
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


# v1 parity: 6 plans (free, starter, pro, business, corporate, personal).
# `max_*` uses 999_999 as the "unlimited" sentinel so that
# SubscriptionStatus.tsx renders ∞ (it formats any value ≥ 999_999 as ∞).
PLANS: list[Plan] = [
    {
        "id": "free",
        "name": "Безплатен",
        "price": 0.0,
        "currency": "EUR",
        "interval": None,
        "max_companies": 1,
        "max_invoices": 10,
        "features": [
            "1 фирма",
            "До 10 фактури/мес",
            "AI обработка",
            "Имейл известия",
        ],
    },
    {
        "id": "starter",
        "name": "Стартов",
        "price": 29.99,
        "currency": "EUR",
        "interval": "month",
        "promo": "3 месеца БЕЗПЛАТНО",
        "trial_days": 90,
        "max_companies": 3,
        "max_invoices": 50,
        "features": [
            "До 3 фирми",
            "До 50 фактури/мес",
            "AI обработка",
            "Имейл известия",
            "Сваляне на фактури",
        ],
    },
    {
        "id": "pro",
        "name": "Професионален",
        "price": 49.99,
        "currency": "EUR",
        "interval": "month",
        "promo": "3 месеца БЕЗПЛАТНО",
        "trial_days": 90,
        "max_companies": 3,
        "max_invoices": 1500,
        "features": [
            "До 3 фирми",
            "До 1 500 фактури/мес",
            "AI обработка",
            "Имейл известия",
            "Паралелна обработка",
            "Сваляне на фактури",
        ],
    },
    {
        "id": "business",
        "name": "Бизнес",
        "price": 99.99,
        "currency": "EUR",
        "interval": "month",
        "popular": True,
        "max_companies": 5,
        "max_invoices": 3500,
        "features": [
            "До 5 фирми",
            "До 3 500 фактури/мес",
            "AI обработка",
            "Паралелна обработка",
            "Приоритетна поддръжка",
            "Имейл нотификации",
        ],
    },
    {
        "id": "corporate",
        "name": "Корпоративен",
        "price": 249.99,
        "currency": "EUR",
        "interval": "month",
        "max_companies": 10,
        "max_invoices": 15000,
        "features": [
            "До 10 фирми",
            "До 15 000 фактури/мес",
            "AI обработка",
            "Паралелна обработка",
            "Приоритетна поддръжка",
            "Имейл нотификации",
            "Персонален мениджър",
        ],
    },
    {
        "id": "personal",
        "name": "Персонален",
        "price": 0.0,
        "currency": "EUR",
        "interval": None,
        "contact_us": True,
        "max_companies": 999_999,
        "max_invoices": 999_999,
        "features": [
            "Индивидуален брой фирми",
            "Индивидуален брой фактури",
            "AI обработка",
            "Паралелна обработка",
            "Приоритетна поддръжка",
            "Имейл нотификации",
            "Персонален мениджър",
            "Индивидуално ценообразуване",
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
        # No explicit subscription window: free is always active; paid plans
        # without trial/subscription dates are treated as never-activated.
        status = "active" if plan_id == "free" else "expired"
        expires = ""

    # Stage 9: Stripe status overrides the trial/subscription_end heuristic.
    # `expires` must be recomputed from `current_period_end` (or cleared) — the
    # heuristic above may have populated it from a stale trial_ends_at.
    if billing and billing.subscription_status:
        status = billing.subscription_status
        expires = billing.current_period_end.isoformat() if billing.current_period_end else ""

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
        "cancel_at_period_end": bool(getattr(billing, "cancel_at_period_end", False)) if billing else False,
        "stripe_customer_id": getattr(billing, "stripe_customer_id", None) if billing else None,
        "stripe_subscription_id": getattr(billing, "stripe_subscription_id", None) if billing else None,
    }
