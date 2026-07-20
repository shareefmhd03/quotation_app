"""Quotation + line-item models.

IMPORTANT DESIGN RULE: a QuotationItem stores a *snapshot* of the product's
name/attributes/price at the moment it was added. Editing a line item on the
quotation form mutates only the snapshot — it never writes back to the Product
master record. That is enforced at the service layer, but the model shape (the
item carries its own name/attributes/unit_price copies) is what makes it safe.
"""
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255), default=None)

    # Customer / recipient details.
    customer_name: Mapped[str | None] = mapped_column(String(255), default=None)
    customer_company: Mapped[str | None] = mapped_column(String(255), default=None)
    customer_email: Mapped[str | None] = mapped_column(String(255), default=None)
    customer_phone: Mapped[str | None] = mapped_column(String(100), default=None)
    customer_address: Mapped[str | None] = mapped_column(Text, default=None)

    template_id: Mapped[int | None] = mapped_column(ForeignKey("templates.id"), default=None)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), default=None)

    quote_date: Mapped[str | None] = mapped_column(String(20), default=None)
    valid_until: Mapped[str | None] = mapped_column(String(20), default=None)
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    terms: Mapped[str | None] = mapped_column(Text, default=None)

    # Money. Stored so a saved quote reproduces exactly even if prices change.
    discount: Mapped[float] = mapped_column(Float, default=0.0)  # percentage
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0)  # percentage
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[str] = mapped_column(String(30), default="draft")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    template: Mapped["QuotationTemplate"] = relationship()
    company: Mapped["Company"] = relationship()
    items: Mapped[list["QuotationItem"]] = relationship(
        back_populates="quotation",
        cascade="all, delete-orphan",
        order_by="QuotationItem.sort_order",
    )


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    quotation_id: Mapped[int] = mapped_column(ForeignKey("quotations.id", ondelete="CASCADE"))
    # Link back to source product for reference only; nullable so ad-hoc lines
    # work. ON DELETE SET NULL lets a product be deleted without blocking on
    # quotations that reference it — the line keeps its own snapshot below.
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), default=None
    )

    # Snapshot copies — editable per quotation, decoupled from the product master.
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    unit: Mapped[str] = mapped_column(String(50), default="pcs")
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)

    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    line_total: Mapped[float] = mapped_column(Float, default=0.0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    quotation: Mapped["Quotation"] = relationship(back_populates="items")
