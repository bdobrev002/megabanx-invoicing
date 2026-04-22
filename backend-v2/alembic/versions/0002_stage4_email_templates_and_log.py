"""stage 4: email templates + email log

Revision ID: 2a6f1e9d3c4b
Revises: 41b033cfed1b
Create Date: 2026-04-22 16:40:00.000000+00:00

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2a6f1e9d3c4b"
down_revision: str | None = "41b033cfed1b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "inv_email_templates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("attach_pdf", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_inv_email_templates_company_id"),
        "inv_email_templates",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inv_email_templates_profile_id"),
        "inv_email_templates",
        ["profile_id"],
        unique=False,
    )

    op.create_table(
        "inv_email_log",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("invoice_id", sa.String(length=36), nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=False),
        sa.Column("template_id", sa.String(length=36), nullable=True),
        sa.Column("to_email", sa.String(length=500), nullable=False),
        sa.Column("cc_emails", sa.Text(), nullable=True),
        sa.Column("bcc_emails", sa.Text(), nullable=True),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("attached_pdf", sa.Boolean(), nullable=False),
        sa.Column("message_id", sa.String(length=500), nullable=True),
        sa.Column("delivery_status", sa.String(length=20), nullable=False),
        sa.Column("delivery_error", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("opened_at", sa.DateTime(), nullable=True),
        sa.Column("open_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_inv_email_log_invoice_id"),
        "inv_email_log",
        ["invoice_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inv_email_log_profile_id"),
        "inv_email_log",
        ["profile_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inv_email_log_company_id"),
        "inv_email_log",
        ["company_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inv_email_log_company_id"), table_name="inv_email_log")
    op.drop_index(op.f("ix_inv_email_log_profile_id"), table_name="inv_email_log")
    op.drop_index(op.f("ix_inv_email_log_invoice_id"), table_name="inv_email_log")
    op.drop_table("inv_email_log")
    op.drop_index(
        op.f("ix_inv_email_templates_profile_id"), table_name="inv_email_templates"
    )
    op.drop_index(
        op.f("ix_inv_email_templates_company_id"), table_name="inv_email_templates"
    )
    op.drop_table("inv_email_templates")
