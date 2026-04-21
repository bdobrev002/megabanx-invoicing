"""Contact form router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.contact import ContactInquiry
from app.schemas.contact import ContactFormRequest

router = APIRouter(prefix="/api/contact", tags=["contact"])


@router.post("")
async def submit_contact_form(req: ContactFormRequest, db: AsyncSession = Depends(get_db)):
    """Submit a contact form (no auth required)."""
    inquiry = ContactInquiry(
        name=req.name.strip(),
        email=req.email.strip().lower(),
        subject=req.subject.strip(),
        message=req.message.strip(),
    )
    db.add(inquiry)
    await db.flush()

    return {"message": "Вашето запитване е изпратено успешно. Ще се свържем с вас скоро."}
