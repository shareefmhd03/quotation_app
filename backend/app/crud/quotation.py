"""Quotation data access."""
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..models import Quotation, QuotationItem


def _with_relations(stmt):
    return stmt.options(
        selectinload(Quotation.items),
        selectinload(Quotation.template),
        selectinload(Quotation.company),
    )


def get(db: Session, quotation_id: int) -> Quotation | None:
    stmt = _with_relations(select(Quotation).where(Quotation.id == quotation_id))
    return db.scalars(stmt).first()


def list_(
    db: Session,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
) -> list[Quotation]:
    stmt = select(Quotation)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Quotation.number.ilike(like),
                Quotation.title.ilike(like),
                Quotation.customer_name.ilike(like),
                Quotation.customer_company.ilike(like),
            )
        )
    # quote_date is stored as ISO strings (YYYY-MM-DD), so string comparison is
    # equivalent to date comparison for range filtering.
    if date_from:
        stmt = stmt.where(Quotation.quote_date >= date_from)
    if date_to:
        stmt = stmt.where(Quotation.quote_date <= date_to)
    if status:
        stmt = stmt.where(Quotation.status == status)
    stmt = _with_relations(stmt.order_by(Quotation.created_at.desc()))
    return list(db.scalars(stmt).all())


def count(db: Session) -> int:
    return db.scalar(select(func.count(Quotation.id))) or 0


def max_sequence(db: Session, prefix: str) -> int:
    """Highest numeric suffix among quotations whose number starts with prefix.

    Used to generate the next number without colliding after deletions.
    """
    numbers = db.scalars(
        select(Quotation.number).where(Quotation.number.like(f"{prefix}%"))
    ).all()
    best = 0
    for num in numbers:
        tail = num.rsplit("-", 1)[-1]
        if tail.isdigit():
            best = max(best, int(tail))
    return best


def create(db: Session, quotation: Quotation) -> Quotation:
    db.add(quotation)
    db.commit()
    db.refresh(quotation)
    return quotation


def save(db: Session) -> None:
    db.commit()


def delete(db: Session, quotation: Quotation) -> None:
    db.delete(quotation)
    db.commit()


def replace_items(db: Session, quotation: Quotation, items: list[QuotationItem]) -> None:
    """Swap the full line-item set (used on update)."""
    quotation.items.clear()
    db.flush()
    for item in items:
        quotation.items.append(item)
