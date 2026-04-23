"""free plan: reduce invoices_limit 30 -> 10 (v1 parity)

Revision ID: 8a2c6d9e1b45
Revises: 7f1e5b8c0a34
Create Date: 2026-04-21 16:00:00.000000+00:00

"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8a2c6d9e1b45"
down_revision: str | None = "7f1e5b8c0a34"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Align existing free-tier billing rows with the new v1-parity catalog
    # (free = 10 invoices/month, was 30).
    op.execute("UPDATE billing SET invoices_limit = 10 WHERE plan = 'free' AND invoices_limit = 30")


def downgrade() -> None:
    op.execute("UPDATE billing SET invoices_limit = 30 WHERE plan = 'free' AND invoices_limit = 10")
