"""Quotation endpoints, including PDF + HTML preview + ZIP export."""
from datetime import date

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.quotation import QuotationCreate, QuotationOut, QuotationUpdate
from ..services import pdf_service, quotation_service, template_service

router = APIRouter(prefix="/api/quotations", tags=["quotations"])


@router.get("", response_model=list[QuotationOut])
def list_quotations(
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    return quotation_service.list_quotations(
        db, search=search, date_from=date_from, date_to=date_to, status=status
    )


# Declared before "/{quotation_id}" so the literal path isn't parsed as an id.
@router.get("/export")
def export_quotations(ids: str = Query(..., description="Comma-separated quotation IDs"),
                      db: Session = Depends(get_db)):
    id_list = [int(x) for x in ids.split(",") if x.strip().isdigit()]
    zip_bytes = quotation_service.export_zip(db, id_list)
    filename = f"quotations_{date.today().isoformat()}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=QuotationOut, status_code=201)
def create_quotation(data: QuotationCreate, db: Session = Depends(get_db)):
    return quotation_service.create_quotation(db, data)


@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    return quotation_service.get_quotation(db, quotation_id)


@router.put("/{quotation_id}", response_model=QuotationOut)
def update_quotation(quotation_id: int, data: QuotationUpdate, db: Session = Depends(get_db)):
    return quotation_service.update_quotation(db, quotation_id, data)


@router.delete("/{quotation_id}", status_code=204)
def delete_quotation(quotation_id: int, db: Session = Depends(get_db)):
    quotation_service.delete_quotation(db, quotation_id)


@router.get("/{quotation_id}/preview", response_class=HTMLResponse)
def preview_quotation(quotation_id: int, hide_prices: bool = False, db: Session = Depends(get_db)):
    quotation = quotation_service.get_quotation(db, quotation_id)
    template = template_service.resolve_template(db, quotation.template_id)
    return HTMLResponse(pdf_service.render_html(quotation, template, hide_prices=hide_prices))


@router.get("/{quotation_id}/pdf")
def download_pdf(quotation_id: int, hide_prices: bool = False, db: Session = Depends(get_db)):
    quotation = quotation_service.get_quotation(db, quotation_id)
    template = template_service.resolve_template(db, quotation.template_id)
    pdf_bytes = pdf_service.render_pdf(quotation, template, hide_prices=hide_prices)
    filename = f"{quotation.number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
