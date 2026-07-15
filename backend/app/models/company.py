"""Company model — the sender/issuer of a quotation.

CRUD-managed so company details are entered once and reused via a dropdown on
each quotation, rather than retyped into every template.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    address: Mapped[str | None] = mapped_column(Text, default=None)
    phone: Mapped[str | None] = mapped_column(String(100), default=None)
    email: Mapped[str | None] = mapped_column(String(255), default=None)
    website: Mapped[str | None] = mapped_column(String(255), default=None)
    tax_number: Mapped[str | None] = mapped_column(String(100), default=None)
    # Holds a base64 data URI (the logo lives in the DB, not on disk).
    logo_path: Mapped[str | None] = mapped_column(Text, default=None)
    # Default terms & conditions pre-filled into new quotations for this company;
    # each quotation keeps its own editable copy (Quotation.terms).
    default_terms: Mapped[str | None] = mapped_column(Text, default=None)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
