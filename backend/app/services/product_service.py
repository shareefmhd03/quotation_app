"""Product business logic."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from .. import crud
from ..models import Product
from ..schemas.product import ProductCreate, ProductUpdate


def list_products(db: Session, search: str | None = None, active_only: bool = False) -> list[Product]:
    return crud.product.list_(db, search=search, active_only=active_only)


def get_product(db: Session, product_id: int) -> Product:
    product = crud.product.get(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def create_product(db: Session, data: ProductCreate) -> Product:
    if crud.product.get_by_name(db, data.name):
        raise HTTPException(status_code=409, detail=f"Product '{data.name}' already exists")
    return crud.product.create(db, data.model_dump())


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    payload = data.model_dump(exclude_unset=True)
    # Guard the unique-name constraint on rename.
    new_name = payload.get("name")
    if new_name and new_name.strip().lower() != product.name.lower():
        existing = crud.product.get_by_name(db, new_name)
        if existing and existing.id != product.id:
            raise HTTPException(status_code=409, detail=f"Product '{new_name}' already exists")
    return crud.product.update(db, product, payload)


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    crud.product.delete(db, product)


def get_or_create_by_name(db: Session, name: str, defaults: dict | None = None) -> Product:
    """Return an existing product by name, or create a bare one.

    This backs the quotation-form behaviour: typing a brand-new product name
    persists it to the catalogue so it appears in the dropdown next time.
    """
    existing = crud.product.get_by_name(db, name)
    if existing:
        return existing
    data = {"name": name.strip(), **(defaults or {})}
    return crud.product.create(db, data)
