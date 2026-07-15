"""Seed the database with a default template and a few sample products.

Idempotent: safe to run multiple times.
Run:  .venv/bin/python backend/seed.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import Base, SessionLocal, engine, ensure_columns  # noqa: E402
from app.models import Company, Product, QuotationTemplate  # noqa: E402

ensure_columns()
Base.metadata.create_all(bind=engine)

DEFAULT_COMPANY = {
    "name": "Your Company Ltd.",
    "address": "123 Business Ave\nCity, Country",
    "phone": "+1 000 000 0000",
    "email": "sales@yourcompany.com",
    "website": "www.yourcompany.com",
    "default_terms": (
        "1. This quotation is valid for 30 days from the date of issue.\n"
        "2. Prices are exclusive of applicable taxes unless stated otherwise.\n"
        "3. Payment terms: 50% advance, balance on delivery.\n"
        "4. Delivery schedule will be confirmed upon order confirmation."
    ),
    "is_default": True,
}

DEFAULT_TEMPLATE = {
    "name": "Standard",
    "description": "Clean default quotation layout.",
    "is_default": True,
    "columns": [
        {"key": "sno", "label": "#", "source": "index", "width": "5%", "align": "center"},
        {"key": "name", "label": "Item", "source": "field", "width": "26%", "align": "left"},
        {"key": "description", "label": "Description", "source": "field", "align": "left"},
        {"key": "quantity", "label": "Qty", "source": "field", "width": "9%", "align": "center"},
        {"key": "unit_price", "label": "Unit Price", "source": "field", "width": "14%", "align": "right"},
        {"key": "line_total", "label": "Total", "source": "field", "width": "14%", "align": "right"},
    ],
    "styling": {
        "primary_color": "#2563eb",
        "doc_title": "Quotation",
        "currency_symbol": "$",
        "footer_note": "Thank you for your business.",
    },
}

FURNITURE_TEMPLATE = {
    "name": "Dimensioned (W×H×D)",
    "description": "Layout with dimension columns for made-to-measure items.",
    "is_default": False,
    "columns": [
        {"key": "sno", "label": "#", "source": "index", "width": "5%", "align": "center"},
        {"key": "name", "label": "Item", "source": "field", "width": "20%", "align": "left"},
        {"key": "width", "label": "W (mm)", "source": "attribute", "width": "10%", "align": "center"},
        {"key": "height", "label": "H (mm)", "source": "attribute", "width": "10%", "align": "center"},
        {"key": "depth", "label": "D (mm)", "source": "attribute", "width": "10%", "align": "center"},
        {"key": "material", "label": "Material", "source": "attribute", "align": "left"},
        {"key": "quantity", "label": "Qty", "source": "field", "width": "8%", "align": "center"},
        {"key": "unit_price", "label": "Unit Price", "source": "field", "width": "13%", "align": "right"},
        {"key": "line_total", "label": "Total", "source": "field", "width": "13%", "align": "right"},
    ],
    "styling": {
        "primary_color": "#0f766e",
        "doc_title": "Quotation",
        "currency_symbol": "$",
        "footer_note": "Prices valid for 30 days.",
    },
}

SAMPLE_PRODUCTS = [
    {
        "name": "Executive Desk",
        "sku": "DSK-001",
        "unit": "pcs",
        "price": 450.0,
        "description": "Solid oak executive desk.",
        "attributes": {"width": "1600", "height": "750", "depth": "800", "material": "Oak"},
    },
    {
        "name": "Ergonomic Office Chair",
        "sku": "CHR-002",
        "unit": "pcs",
        "price": 180.0,
        "description": "Mesh-back ergonomic chair with lumbar support.",
        "attributes": {"width": "650", "height": "1150", "depth": "650", "material": "Mesh/Nylon"},
    },
    {
        "name": "Filing Cabinet",
        "sku": "CAB-003",
        "unit": "pcs",
        "price": 220.0,
        "description": "3-drawer lockable filing cabinet.",
        "attributes": {"width": "450", "height": "1000", "depth": "600", "material": "Steel"},
    },
]


def run() -> None:
    db = SessionLocal()
    try:
        company = db.query(Company).filter_by(name=DEFAULT_COMPANY["name"]).first()
        if not company:
            db.add(Company(**DEFAULT_COMPANY))
            print(f"+ company: {DEFAULT_COMPANY['name']}")
        elif not company.default_terms:
            # backfill the new default_terms field on an already-seeded company
            company.default_terms = DEFAULT_COMPANY["default_terms"]
            print(f"~ company: backfilled default terms for {company.name}")
        for tmpl in (DEFAULT_TEMPLATE, FURNITURE_TEMPLATE):
            exists = db.query(QuotationTemplate).filter_by(name=tmpl["name"]).first()
            if not exists:
                db.add(QuotationTemplate(**tmpl))
                print(f"+ template: {tmpl['name']}")
        for prod in SAMPLE_PRODUCTS:
            exists = db.query(Product).filter_by(name=prod["name"]).first()
            if not exists:
                db.add(Product(**prod))
                print(f"+ product: {prod['name']}")
        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
