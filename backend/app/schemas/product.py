from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str | None = None
    description: str | None = None
    unit: str = "pcs"
    price: float = 0.0
    image_path: str | None = None
    attributes: dict[str, str] = Field(default_factory=dict)
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = None
    description: str | None = None
    unit: str | None = None
    price: float | None = None
    image_path: str | None = None
    attributes: dict[str, str] | None = None
    is_active: bool | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
