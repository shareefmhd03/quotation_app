"""Quotation template model.

A template owns two things:
  * `columns` — the ordered list of columns shown in the line-item grid AND the
    PDF, e.g. [{"key": "description", "label": "Description", "source": "field"},
    {"key": "width", "label": "Width (mm)", "source": "attribute"}, ...].
  * `styling` — branding/layout knobs consumed by the PDF renderer (company
    info, colours, header/footer text, whether to show tax, etc.).

Keeping these as JSON keeps the schema tiny while letting each template define a
completely different quotation shape.
"""
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class QuotationTemplate(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    columns: Mapped[list] = mapped_column(JSON, default=list)
    styling: Mapped[dict] = mapped_column(JSON, default=dict)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
