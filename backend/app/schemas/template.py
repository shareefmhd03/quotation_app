from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TemplateColumn(BaseModel):
    """One column in the line-item grid / PDF table."""

    key: str  # e.g. "description", "width", "quantity"
    label: str  # header text shown to the user
    # Where the value comes from:
    #   "field"     -> a built-in line field (name/description/unit/quantity/
    #                  unit_price/line_total)
    #   "attribute" -> looked up in the item's attributes map by `key`
    source: str = "attribute"
    width: str | None = None  # optional CSS width hint for the PDF, e.g. "15%"
    align: str = "left"  # left | center | right


class TemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    columns: list[TemplateColumn] = Field(default_factory=list)
    styling: dict = Field(default_factory=dict)
    is_default: bool = False


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    columns: list[TemplateColumn] | None = None
    styling: dict | None = None
    is_default: bool | None = None


class TemplateOut(TemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
