"""Template endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.template import TemplateCreate, TemplateOut, TemplateUpdate
from ..services import template_service

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)):
    return template_service.list_templates(db)


@router.post("", response_model=TemplateOut, status_code=201)
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):
    return template_service.create_template(db, data)


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: int, db: Session = Depends(get_db)):
    return template_service.get_template(db, template_id)


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: int, data: TemplateUpdate, db: Session = Depends(get_db)):
    return template_service.update_template(db, template_id, data)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template_service.delete_template(db, template_id)
