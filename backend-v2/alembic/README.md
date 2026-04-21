# Alembic migrations — MegaBanx v2

All schema changes go through Alembic. This is the **only** way to evolve the
database (see `.agents/RULES.md` §1.1, §1.6).

## Layout

```
backend-v2/
├── alembic.ini
└── alembic/
    ├── env.py           ← async env, loads DB URL from app.config.settings
    ├── script.py.mako   ← template for new revisions
    └── versions/        ← revision files, committed to git
        └── YYYYMMDD_HHMM_<id>_<slug>.py
```

## Workflow

### Change a model

1. Edit a file under `backend-v2/app/models/`.
2. From `backend-v2/`, generate a revision:

   ```bash
   poetry run alembic revision --autogenerate -m "describe the change"
   ```

3. Review the generated file — delete `pass`/empty ops, reorder where needed.
4. Apply it locally:

   ```bash
   poetry run alembic upgrade head
   ```

5. Commit the migration **in the same PR** as the model change. Every PR that
   touches `app/models/` must include its accompanying revision.

### Apply migrations to a fresh database

```bash
poetry run alembic upgrade head
```

This walks the full chain from `base` → `head`, so Stage 11 (cutover) works
identically to local dev.

### Stamp an existing database

Only useful if a production DB already matches `head` but has no
`alembic_version` row (e.g. legacy `create_all` setup). Never use this as a
shortcut to skip migrations.

```bash
poetry run alembic stamp head
```

## DB URL

`env.py` reads `app.config.settings.DATABASE_URL`, so the URL comes from
`backend-v2/.env` (same file FastAPI uses). You can override it for a one-off
run with `ALEMBIC_DATABASE_URL=... alembic upgrade head`.

## Forbidden

- Editing a committed revision after it has been applied anywhere. Add a new
  revision instead.
- `ALTER TABLE ...` over SSH without a corresponding revision file.
- Calling `Base.metadata.create_all()` in application code. `main.py` must rely
  on Alembic having been run at deploy time.
