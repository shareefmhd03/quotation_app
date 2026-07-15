from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .company import CompanyOut
from .template import TemplateOut


class QuotationItemBase(BaseModel):
    product_id: int | None = None
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    unit: str = "pcs"
    attributes: dict[str, str] = Field(default_factory=dict)
    quantity: float = 1.0
    unit_price: float = 0.0
    sort_order: int = 0
    # Transient hint (not persisted): create a catalogue product for this custom
    # line on save. Ignored when product_id is already set.
    save_to_catalogue: bool = True


class QuotationItemOut(QuotationItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    line_total: float


class QuotationBase(BaseModel):
    title: str | None = None
    customer_name: str | None = None
    customer_company: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    template_id: int | None = None
    company_id: int | None = None
    quote_date: str | None = None
    valid_until: str | None = None
    notes: str | None = None
    terms: str | None = None
    discount: float = 0.0
    tax_rate: float = 0.0
    status: str = "draft"


class QuotationCreate(QuotationBase):
    items: list[QuotationItemBase] = Field(default_factory=list)


class QuotationUpdate(QuotationBase):
    # All optional on update; items fully replace existing set when provided.
    title: str | None = None
    items: list[QuotationItemBase] | None = None


class QuotationOut(QuotationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    subtotal: float
    total: float
    items: list[QuotationItemOut]
    template: TemplateOut | None = None
    company: CompanyOut | None = None
    created_at: datetime
    updated_at: datetime
