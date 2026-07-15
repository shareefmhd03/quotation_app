"""Company business logic."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from .. import crud
from ..models import Company
from ..schemas.company import CompanyCreate, CompanyUpdate


def list_companies(db: Session) -> list[Company]:
    return crud.company.list_(db)


def get_company(db: Session, company_id: int) -> Company:
    company = crud.company.get(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


def create_company(db: Session, data: CompanyCreate) -> Company:
    payload = data.model_dump()
    if payload.get("is_default"):
        crud.company.clear_default(db)
    return crud.company.create(db, payload)


def update_company(db: Session, company_id: int, data: CompanyUpdate) -> Company:
    company = get_company(db, company_id)
    payload = data.model_dump(exclude_unset=True)
    if payload.get("is_default"):
        crud.company.clear_default(db)
    return crud.company.update(db, company, payload)


def delete_company(db: Session, company_id: int) -> None:
    company = get_company(db, company_id)
    crud.company.delete(db, company)
