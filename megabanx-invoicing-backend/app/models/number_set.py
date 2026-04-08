import uuid
from datetime import datetime

from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NumberSet(Base):
    __tablename__ = "number_sets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    range_from: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    range_to: Mapped[int] = mapped_column(Integer, nullable=False, default=1000000000)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    company: Mapped["Company"] = relationship("Company", lazy="selectin")  # noqa: F821
