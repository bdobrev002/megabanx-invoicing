"""stage 9: stripe subscription fields on billing

Revision ID: 6e0d4a7b9f12
Revises: 5d9c2f3b6a7e
Create Date: 2026-04-23 08:00:00.000000+00:00

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6e0d4a7b9f12"
down_revision: str | None = "5d9c2f3b6a7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("billing", sa.Column("stripe_customer_id", sa.String(length=64), nullable=True))
    op.add_column("billing", sa.Column("stripe_subscription_id", sa.String(length=64), nullable=True))
    op.add_column("billing", sa.Column("subscription_status", sa.String(length=32), nullable=True))
    op.add_column("billing", sa.Column("current_period_end", sa.DateTime(), nullable=True))
    op.add_column(
        "billing",
        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.alter_column("billing", "cancel_at_period_end", server_default=None)
    op.create_index("ix_billing_stripe_customer", "billing", ["stripe_customer_id"], unique=False)
    op.create_index("ix_billing_stripe_subscription", "billing", ["stripe_subscription_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_billing_stripe_subscription", table_name="billing")
    op.drop_index("ix_billing_stripe_customer", table_name="billing")
    op.drop_column("billing", "cancel_at_period_end")
    op.drop_column("billing", "current_period_end")
    op.drop_column("billing", "subscription_status")
    op.drop_column("billing", "stripe_subscription_id")
    op.drop_column("billing", "stripe_customer_id")
