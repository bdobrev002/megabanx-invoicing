"""stage 6a: company contact fields + inv_bank_accounts

Revision ID: 4c8a1f2e5d6b
Revises: 2a6f1e9d3c4b
Create Date: 2026-04-22 19:00:00.000000+00:00

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4c8a1f2e5d6b"
down_revision: str | None = "2a6f1e9d3c4b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # companies: add contact + branding fields (all default empty for backwards compat)
    op.add_column("companies", sa.Column("city", sa.String(length=255), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("country", sa.String(length=100), nullable=False, server_default="България"))
    op.add_column("companies", sa.Column("phone", sa.String(length=50), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("email", sa.String(length=255), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("logo_path", sa.Text(), nullable=False, server_default=""))

    # inv_bank_accounts: multiple IBAN per company
    op.create_table(
        "inv_bank_accounts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("iban", sa.String(length=50), nullable=False),
        sa.Column("bank_name", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("bic", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="BGN"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_inv_bank_accounts_company_id"),
        "inv_bank_accounts",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inv_bank_accounts_profile_id"),
        "inv_bank_accounts",
        ["profile_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inv_bank_accounts_profile_id"), table_name="inv_bank_accounts")
    op.drop_index(op.f("ix_inv_bank_accounts_company_id"), table_name="inv_bank_accounts")
    op.drop_table("inv_bank_accounts")
    op.drop_column("companies", "logo_path")
    op.drop_column("companies", "email")
    op.drop_column("companies", "phone")
    op.drop_column("companies", "country")
    op.drop_column("companies", "city")
