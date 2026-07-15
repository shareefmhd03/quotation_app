"""Template business logic."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from .. import crud
from ..models import QuotationTemplate
from ..schemas.template import TemplateCreate, TemplateUpdate


def list_templates(db: Session) -> list[QuotationTemplate]:
    return crud.template.list_(db)


def get_template(db: Session, template_id: int) -> QuotationTemplate:
    template = crud.template.get(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


def resolve_template(db: Session, template_id: int | None) -> QuotationTemplate | None:
    """Pick the requested template, else the default one."""
    if template_id is not None:
        return get_template(db, template_id)
    return crud.template.get_default(db)


def create_template(db: Session, data: TemplateCreate) -> QuotationTemplate:
    payload = data.model_dump()
    if payload.get("is_default"):
        crud.template.clear_default(db)
    return crud.template.create(db, payload)


def update_template(db: Session, template_id: int, data: TemplateUpdate) -> QuotationTemplate:
    template = get_template(db, template_id)
    payload = data.model_dump(exclude_unset=True)
    if payload.get("is_default"):
        crud.template.clear_default(db)
    return crud.template.update(db, template, payload)


def delete_template(db: Session, template_id: int) -> None:
    template = get_template(db, template_id)
    crud.template.delete(db, template)
