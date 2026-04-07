import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    eik: Mapped[str] = mapped_column(String(13), nullable=False)
    vat_number: Mapped[str | None] = mapped_column(String(15), nullable=True)
    is_vat_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    mol: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bic: Mapped[str | None] = mapped_column(String(11), nullable=True)
    logo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    clients: Mapped[list["Client"]] = relationship("Client", back_populates="company", lazy="selectin")  # noqa: F821
    items: Mapped[list["Item"]] = relationship("Item", back_populates="company", lazy="selectin")  # noqa: F821
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="company", lazy="selectin")  # noqa: F821
