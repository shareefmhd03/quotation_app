"""PDF rendering.

We render a data-driven HTML document with Jinja2 (columns + styling come from
the quotation's template) and convert it to PDF with WeasyPrint. Keeping the PDF
as HTML/CSS means matching future sample designs is a CSS exercise, not code.
"""
import base64
import mimetypes
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from ..config import UPLOAD_DIR, settings
from ..models import Quotation, QuotationTemplate

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "pdf_templates"


def _logo_data_uri(logo_path: str | None) -> str:
    """Embed an uploaded logo as a base64 data URI.

    Using a data URI (rather than a URL/file path) means the logo renders in the
    in-memory PDF and the HTML preview without depending on server file paths or
    the request origin.
    """
    if not logo_path:
        return ""
    # logo_path looks like "/uploads/<name>"; map it back to the upload dir.
    name = Path(logo_path).name
    file = UPLOAD_DIR / name
    if not file.is_file():
        return ""
    mime = mimetypes.guess_type(str(file))[0] or "image/png"
    encoded = base64.b64encode(file.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def _default_columns() -> list[dict]:
    return [
        {"key": "sno", "label": "#", "source": "index", "width": "5%", "align": "center"},
        {"key": "name", "label": "Item", "source": "field", "width": "30%", "align": "left"},
        {"key": "description", "label": "Description", "source": "field", "align": "left"},
        {"key": "quantity", "label": "Qty", "source": "field", "width": "8%", "align": "center"},
        {"key": "unit_price", "label": "Unit Price", "source": "field", "width": "14%", "align": "right"},
        {"key": "line_total", "label": "Total", "source": "field", "width": "14%", "align": "right"},
    ]


def _cell_value(item: Quotation, column: dict, index: int, symbol: str) -> str:
    source = column.get("source", "attribute")
    key = column.get("key")
    if source == "index":
        return str(index)
    if source == "field":
        value = getattr(item, key, "")
        if key in {"unit_price", "line_total"}:
            return f"{symbol}{float(value or 0):,.2f}"
        if key == "quantity":
            qty = float(value or 0)
            return f"{qty:g} {item.unit or ''}".strip()
        return "" if value is None else str(value)
    # attribute source
    return str((item.attributes or {}).get(key, ""))


def build_context(quotation: Quotation, template: QuotationTemplate | None) -> dict:
    columns = (template.columns if template and template.columns else None) or _default_columns()
    styling = (template.styling if template else {}) or {}
    symbol = styling.get("currency_symbol", settings.currency_symbol)

    rows = []
    for i, item in enumerate(quotation.items, start=1):
        rows.append([_cell_value(item, col, i, symbol) for col in columns])

    # Company info: prefer the quotation's selected company; fall back to any
    # company embedded in older template styling.
    if quotation.company is not None:
        c = quotation.company
        company = {
            "name": c.name,
            "address": c.address,
            "phone": c.phone,
            "email": c.email,
            "website": c.website,
            "tax_number": c.tax_number,
        }
        logo = _logo_data_uri(c.logo_path)
    else:
        company = styling.get("company", {})
        logo = ""

    return {
        "q": quotation,
        "columns": columns,
        "rows": rows,
        "styling": styling,
        "symbol": symbol,
        "company": company,
        "logo": logo,
    }


def render_html(quotation: Quotation, template: QuotationTemplate | None) -> str:
    context = build_context(quotation, template)
    return _env.get_template("quotation.html").render(**context)


def render_pdf(quotation: Quotation, template: QuotationTemplate | None) -> bytes:
    # Imported lazily so the rest of the app can boot even if WeasyPrint's
    # native libs are missing on a given machine.
    from weasyprint import HTML

    html = render_html(quotation, template)
    return HTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf()
