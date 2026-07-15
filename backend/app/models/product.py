"""Product model.

Core fields are fixed columns; everything variable (width, height, material,
finish, ...) lives in the flexible `attributes` JSON map so different product
types can carry different specs without a schema change.
"""
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    sku: Mapped[str | None] = mapped_column(String(100), index=True, default=None)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    unit: Mapped[str] = mapped_column(String(50), default="pcs")
    price: Mapped[float] = mapped_column(Float, default=0.0)
    image_path: Mapped[str | None] = mapped_column(String(500), default=None)
    # Flexible spec map, e.g. {"width": "1200", "height": "800", "material": "Oak"}.
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
