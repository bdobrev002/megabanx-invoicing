"""stage 6b: invoice_template on companies + template_id on inv_invoice_meta

Revision ID: 5d9c2f3b6a7e
Revises: 4c8a1f2e5d6b
Create Date: 2026-04-22 20:00:00.000000+00:00

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5d9c2f3b6a7e"
down_revision: str | None = "4c8a1f2e5d6b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column(
            "invoice_template",
            sa.String(length=32),
            nullable=False,
            server_default="modern",
        ),
    )
    # Drop the server_default once existing rows are backfilled so future
    # inserts rely on the ORM default (keeps parity with other string columns).
    op.alter_column("companies", "invoice_template", server_default=None)

    # Per-invoice override; NULL means "use the company default".
    op.add_column(
        "inv_invoice_meta",
        sa.Column("template_id", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inv_invoice_meta", "template_id")
    op.drop_column("companies", "invoice_template")
