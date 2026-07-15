from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    tax_number: str | None = None
    logo_path: str | None = None
    default_terms: str | None = None
    is_default: bool = False


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    tax_number: str | None = None
    logo_path: str | None = None
    default_terms: str | None = None
    is_default: bool | None = None


class CompanyOut(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
