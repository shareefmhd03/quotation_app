"""Template data access."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import QuotationTemplate


def get(db: Session, template_id: int) -> QuotationTemplate | None:
    return db.get(QuotationTemplate, template_id)


def get_default(db: Session) -> QuotationTemplate | None:
    stmt = select(QuotationTemplate).where(QuotationTemplate.is_default.is_(True))
    return db.scalars(stmt).first()


def list_(db: Session) -> list[QuotationTemplate]:
    return list(db.scalars(select(QuotationTemplate).order_by(QuotationTemplate.name)).all())


def create(db: Session, data: dict) -> QuotationTemplate:
    template = QuotationTemplate(**data)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def update(db: Session, template: QuotationTemplate, data: dict) -> QuotationTemplate:
    for key, value in data.items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return template


def delete(db: Session, template: QuotationTemplate) -> None:
    db.delete(template)
    db.commit()


def clear_default(db: Session) -> None:
    """Unset is_default on every template (before setting a new one)."""
    for tmpl in db.scalars(select(QuotationTemplate).where(QuotationTemplate.is_default.is_(True))):
        tmpl.is_default = False
    db.commit()
