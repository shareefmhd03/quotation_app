"""Quotation business logic.

Responsibilities:
  * generate the quotation number
  * turn incoming line items into decoupled snapshots
  * persist typed-in products to the catalogue (get-or-create) WITHOUT ever
    writing quotation-side edits back onto existing products
  * compute money (line totals, subtotal, discount, tax, grand total)
"""
from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .. import crud
from ..models import Quotation, QuotationItem
from ..schemas.quotation import QuotationCreate, QuotationItemBase, QuotationUpdate
from . import product_service


def _generate_number(db: Session) -> str:
    year = date.today().year
    prefix = f"QT-{year}-"
    seq = crud.quotation.max_sequence(db, prefix) + 1
    return f"{prefix}{seq:04d}"


def _build_items(db: Session, item_data: list[QuotationItemBase]) -> list[QuotationItem]:
    """Convert request items into ORM line items (snapshots).

    Typed-in items (no product_id) are added to the product catalogue so they
    are selectable later. Existing products are NEVER mutated here — the line
    item carries its own editable copy of name/attributes/price/unit.
    """
    items: list[QuotationItem] = []
    for idx, data in enumerate(item_data):
        product_id = data.product_id
        if product_id is None and data.name.strip() and data.save_to_catalogue:
            # Persist a new catalogue entry seeded from this line (no overwrite
            # if a product with the same name already exists). Skipped when the
            # line is flagged as a one-off (save_to_catalogue=False).
            product = product_service.get_or_create_by_name(
                db,
                data.name,
                defaults={
                    "unit": data.unit,
                    "price": data.unit_price,
                    "attributes": dict(data.attributes),
                },
            )
            product_id = product.id

        quantity = data.quantity or 0.0
        unit_price = data.unit_price or 0.0
        items.append(
            QuotationItem(
                product_id=product_id,
                name=data.name.strip(),
                description=data.description,
                unit=data.unit,
                attributes=dict(data.attributes),  # snapshot copy
                quantity=quantity,
                unit_price=unit_price,
                line_total=round(quantity * unit_price, 2),
                sort_order=data.sort_order or idx,
            )
        )
    return items


def _apply_totals(quotation: Quotation) -> None:
    subtotal = round(sum(item.line_total for item in quotation.items), 2)
    discounted = subtotal * (1 - (quotation.discount or 0.0) / 100.0)
    total = discounted * (1 + (quotation.tax_rate or 0.0) / 100.0)
    quotation.subtotal = round(subtotal, 2)
    quotation.total = round(total, 2)


def list_quotations(
    db: Session,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
) -> list[Quotation]:
    return crud.quotation.list_(db, search=search, date_from=date_from, date_to=date_to, status=status)


def get_quotation(db: Session, quotation_id: int) -> Quotation:
    quotation = crud.quotation.get(db, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


def create_quotation(db: Session, data: QuotationCreate) -> Quotation:
    fields = data.model_dump(exclude={"items"})
    quotation = Quotation(number=_generate_number(db), **fields)
    quotation.quote_date = quotation.quote_date or date.today().isoformat()
    quotation.items = _build_items(db, data.items)
    _apply_totals(quotation)
    return crud.quotation.create(db, quotation)


def update_quotation(db: Session, quotation_id: int, data: QuotationUpdate) -> Quotation:
    quotation = get_quotation(db, quotation_id)
    payload = data.model_dump(exclude={"items"}, exclude_unset=True)
    for key, value in payload.items():
        setattr(quotation, key, value)

    if data.items is not None:
        crud.quotation.replace_items(db, quotation, _build_items(db, data.items))

    _apply_totals(quotation)
    crud.quotation.save(db)
    return get_quotation(db, quotation_id)


def delete_quotation(db: Session, quotation_id: int) -> None:
    quotation = get_quotation(db, quotation_id)
    crud.quotation.delete(db, quotation)


def export_zip(db: Session, ids: list[int]) -> bytes:
    """Render each requested quotation to PDF and bundle them into a ZIP.

    Everything is built in memory (BytesIO) and returned as bytes — no PDF or ZIP
    is ever written to the server disk.
    """
    import io
    import zipfile

    from . import pdf_service, template_service

    if not ids:
        raise HTTPException(status_code=400, detail="No quotations selected")

    buffer = io.BytesIO()
    used_names: set[str] = set()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for qid in ids:
            quotation = get_quotation(db, qid)  # 404 if any id is invalid
            template = template_service.resolve_template(db, quotation.template_id)
            pdf_bytes = pdf_service.render_pdf(quotation, template)
            # Guard against duplicate filenames within the archive.
            name = f"{quotation.number}.pdf"
            suffix = 1
            while name in used_names:
                suffix += 1
                name = f"{quotation.number}_{suffix}.pdf"
            used_names.add(name)
            zf.writestr(name, pdf_bytes)
    return buffer.getvalue()
