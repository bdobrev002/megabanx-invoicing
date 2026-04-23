"""stage 8: add subtotal column to invoices

Revision ID: 7f1e5b8c0a34
Revises: 6e0d4a7b9f12
Create Date: 2026-04-21 16:00:00.000000+00:00

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f1e5b8c0a34"
down_revision: str | None = "6e0d4a7b9f12"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("subtotal", sa.String(length=50), nullable=False, server_default=""),
    )
    op.alter_column("invoices", "subtotal", server_default=None)


def downgrade() -> None:
    op.drop_column("invoices", "subtotal")
