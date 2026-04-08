import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    eik: Mapped[str | None] = mapped_column(String(13), nullable=True)
    egn: Mapped[str | None] = mapped_column(String(10), nullable=True)
    vat_number: Mapped[str | None] = mapped_column(String(15), nullable=True)
    is_vat_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    is_individual: Mapped[bool] = mapped_column(Boolean, default=False)
    mol: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company: Mapped["Company"] = relationship("Company", back_populates="clients")  # noqa: F821
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="client", lazy="selectin")  # noqa: F821
