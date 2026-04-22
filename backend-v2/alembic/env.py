"""Alembic environment for MegaBanx v2.

Runs migrations against the same async SQLAlchemy engine the app uses at
runtime. ``Base.metadata`` is the single source of truth for the schema;
``alembic revision --autogenerate`` compares it against the live database.

The DB URL is loaded from ``app.config.settings.DATABASE_URL`` so there is no
second place that needs updating when credentials change.
"""

from __future__ import annotations

import asyncio
import os

# Ensure ``app`` is importable regardless of which directory alembic was invoked from.
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

HERE = Path(__file__).resolve().parent
BACKEND_ROOT = HERE.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings  # noqa: E402

# Import every model module so SQLAlchemy registers all tables on Base.metadata.
from app.models import (  # noqa: E402,F401
    admin,
    billing,
    company,
    contact,
    drive,
    email_link,
    invoice,
    invoicing,
    notification,
    profile,
    sharing,
    user,
)
from app.models.base import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Feed the live DB URL into Alembic's config so engine_from_config picks it up.
_url_override = os.environ.get("ALEMBIC_DATABASE_URL") or settings.DATABASE_URL
config.set_main_option("sqlalchemy.url", _url_override)

target_metadata = Base.metadata


def _include_object(obj, name, type_, reflected, compare_to):
    # Skip tables that are not owned by the app (defensive — in case PgBouncer
    # or an extension creates tables in the same schema).
    if type_ == "table" and name.startswith("pg_"):
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (emits SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_object=_include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        include_object=_include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations with a live async DB connection."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )

    async with connectable.connect() as connection:
        await connection.run_sync(_do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
