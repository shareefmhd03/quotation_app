"""Company data access."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Company


def get(db: Session, company_id: int) -> Company | None:
    return db.get(Company, company_id)


def get_default(db: Session) -> Company | None:
    return db.scalars(select(Company).where(Company.is_default.is_(True))).first()


def list_(db: Session) -> list[Company]:
    return list(db.scalars(select(Company).order_by(Company.name)).all())


def create(db: Session, data: dict) -> Company:
    company = Company(**data)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def update(db: Session, company: Company, data: dict) -> Company:
    for key, value in data.items():
        setattr(company, key, value)
    db.commit()
    db.refresh(company)
    return company


def delete(db: Session, company: Company) -> None:
    db.delete(company)
    db.commit()


def clear_default(db: Session) -> None:
    for c in db.scalars(select(Company).where(Company.is_default.is_(True))):
        c.is_default = False
    db.commit()
