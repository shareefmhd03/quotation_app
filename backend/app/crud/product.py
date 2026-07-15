"""Product data access."""
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..models import Product


def get(db: Session, product_id: int) -> Product | None:
    return db.get(Product, product_id)


def get_by_name(db: Session, name: str) -> Product | None:
    stmt = select(Product).where(func.lower(Product.name) == name.strip().lower())
    return db.scalars(stmt).first()


def list_(db: Session, search: str | None = None, active_only: bool = False) -> list[Product]:
    stmt = select(Product)
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    stmt = stmt.order_by(Product.name)
    return list(db.scalars(stmt).all())


def create(db: Session, data: dict) -> Product:
    product = Product(**data)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update(db: Session, product: Product, data: dict) -> Product:
    for key, value in data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


def delete(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()
