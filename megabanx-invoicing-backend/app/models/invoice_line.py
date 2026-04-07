import uuid
from decimal import Decimal

from sqlalchemy import String, Integer, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=Decimal("1.000"))
    unit: Mapped[str] = mapped_column(String(20), default="бр.")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("20.00"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="lines")  # noqa: F821
