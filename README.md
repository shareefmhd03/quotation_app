# Quotation App

A CRUD product catalogue + template-driven quotation generator with styled PDF export.

- **Backend:** FastAPI, 3-layer architecture (`routers → services → crud → models`), SQLAlchemy, SQLite (swap to Postgres via one env var).
- **PDF:** Jinja2 → WeasyPrint (HTML/CSS templates, so matching a design sample is a CSS change).
- **Frontend:** vanilla HTML/CSS/JS, served by the same FastAPI process. Fully
  responsive — on phones the sidebar becomes a hamburger drawer, forms/modals go
  single-column full-width, and wide tables scroll inside their own container.

## Run

```bash
./run.sh
```

Then open **http://localhost:8000**. First run creates the virtualenv, installs
dependencies, and seeds two templates + three sample products (idempotent).

To run manually:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/python backend/seed.py
cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000
```

API docs (Swagger): http://localhost:8000/docs

## How it works

### Products
Fixed core fields (name, sku, unit, price, image) plus a **flexible `attributes`
JSON map** (width, height, material, …) so different product types carry
different specs without a schema migration.

### Companies
The sender/issuer details (name, address, phone, email, website, tax number) are
a **CRUD-managed entity**, not retyped per quotation. Mark one **default** and it's
preselected on every new quotation via the "From (Company)" dropdown. The selected
company's details render in the PDF header.

### Templates
Each template defines:
- **`columns`** — the ordered columns shown in the line-item grid *and* the PDF.
  A column's `source` is `field` (built-in: name/description/quantity/unit_price/
  line_total/unit), `attribute` (looked up in the item's attributes by `key`), or
  `index` (row number).
- **`styling`** — branding consumed by the PDF (company info, colour, doc title,
  currency symbol, footer note).

Selecting a template on the quotation page reshapes both the grid and the PDF.

### Quotations
- Pick the sender **company** from the dropdown (default preselected).
- Add line items three ways: **search & select** an existing product, **type a new
  name** and click Add, or **"＋ Custom line"** for a blank row to fill in manually.
- Custom (non-catalogue) lines show a **"catalogue" toggle** — on by default, they're
  added to the product catalogue on save; uncheck it for a true one-off that shouldn't
  pollute the product list.
- **Line items are snapshots.** Editing quantity, price, description, or any
  attribute on a quotation line **never** writes back to the product master
  record. This is enforced in `services/quotation_service.py` (each item carries
  its own copy of name/attributes/price/unit).
- Totals: subtotal → discount % → tax % → grand total, computed live and stored.
- Save, then **Preview** (HTML) or download **PDF**.

### Bulk export
On **Saved Quotations** you can filter by search (number/title/customer), date
range, and status, tick the ones you want (or select-all), and **Export selected**
as a `.zip` of PDFs. The ZIP is built entirely in memory and streamed — no PDF or
archive is ever written to the server disk.

## Layout

```
backend/app/
  models/      SQLAlchemy models        (persistence)
  crud/        data access              (no business logic)
  services/    business rules           (orchestration, PDF)
  routers/     FastAPI endpoints        (HTTP)
  schemas/     Pydantic request/response
  pdf_templates/quotation.html          (Jinja2 → WeasyPrint)
frontend/      index.html + css/ + js/  (static SPA)
```

## Scaling to Postgres

Set an env var and install the driver — no code change:

```bash
export QUOTE_DATABASE_URL="postgresql+psycopg://user:pass@host/dbname"
```

Then adopt Alembic for migrations (currently tables are auto-created on boot,
which is fine for SQLite / early development).

## Customising the PDF style

Edit `backend/app/pdf_templates/quotation.html` (plain HTML + CSS). When you
share sample designs, this file is where the layout/branding is implemented; per-
template colours and company details already come from each template's `styling`.
