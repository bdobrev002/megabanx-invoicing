"""invoices: add duplicate_of_id for 3-choice duplicate resolution (v1 parity)

Revision ID: 9b3d7e0f2c56
Revises: 8a2c6d9e1b45
Create Date: 2026-04-24 13:00:00.000000+00:00

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9b3d7e0f2c56"
down_revision: str | None = "8a2c6d9e1b45"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("duplicate_of_id", sa.String(length=36), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("invoices", "duplicate_of_id")
