"""Access-control helpers shared across routers.

The invoicing module is used both by the owner of a profile and by users
who received a ``CompanyShare`` for a specific company. These helpers
centralise the rule "can this user touch this (profile, company) pair?"
so routers don't need to repeat the same select/compare logic.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.sharing import CompanyShare
from app.models.user import User


@dataclass(slots=True, frozen=True)
class CompanyAccess:
    """Result of an access check: the company row and how it was reached."""

    company: Company
    is_owner: bool
    share: CompanyShare | None

    @property
    def can_write(self) -> bool:
        """True if the user may create/update invoices for this company."""
        return self.is_owner or (self.share is not None and self.share.can_upload)


async def resolve_company_access(
    db: AsyncSession,
    user: User,
    profile_id: str,
    company_id: str,
    *,
    require_write: bool = False,
) -> CompanyAccess:
    """Return a :class:`CompanyAccess` or raise 403/404.

    Access is granted when:
      - ``user`` owns ``profile_id`` AND ``company_id`` lives in it, OR
      - a ``CompanyShare`` links ``user.email`` to ``(profile_id, company_id)``.

    When ``require_write`` is ``True`` the share's ``can_upload`` flag must
    also be set; owners always have write access.
    """
    company_row = await db.execute(
        select(Company).where(Company.id == company_id, Company.profile_id == profile_id)
    )
    company = company_row.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Фирмата не е намерена")

    if profile_id == user.profile_id:
        return CompanyAccess(company=company, is_owner=True, share=None)

    share_row = await db.execute(
        select(CompanyShare).where(
            CompanyShare.company_id == company_id,
            CompanyShare.owner_profile_id == profile_id,
            CompanyShare.shared_with_email == user.email,
        )
    )
    share = share_row.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=403, detail="Нямате достъп до тази фирма")

    if require_write and not share.can_upload:
        raise HTTPException(status_code=403, detail="Нямате права за запис в тази фирма")

    return CompanyAccess(company=company, is_owner=False, share=share)


async def list_accessible_company_ids(db: AsyncSession, user: User, profile_id: str) -> set[str]:
    """Return the set of company IDs under ``profile_id`` the user can read.

    For the owner this is every company in the profile. For a shared user
    it is only the companies explicitly shared with them.
    """
    if profile_id == user.profile_id:
        rows = await db.execute(select(Company.id).where(Company.profile_id == profile_id))
        return {row for (row,) in rows.all()}

    rows = await db.execute(
        select(CompanyShare.company_id).where(
            CompanyShare.owner_profile_id == profile_id,
            CompanyShare.shared_with_email == user.email,
        )
    )
    return {row for (row,) in rows.all()}
