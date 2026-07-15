"""FastAPI application entrypoint.

Serves the JSON API under /api, uploaded images under /uploads, and the static
frontend at /. Single process, single command to run.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import UPLOAD_DIR, settings
from .database import Base, engine, ensure_columns
from .routers import companies, products, quotations, templates

# Create tables on boot (fine for SQLite / small app; use Alembic when scaling).
ensure_columns()  # additive migrations for pre-existing tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def revalidate_static_assets(request, call_next):
    """Ask browsers to revalidate the frontend (HTML/JS/CSS) on each load.

    Uses `no-cache` (revalidate via ETag, cheap 304s) rather than `no-store`, so
    users never run a stale bundle after the app is updated/redeployed.
    """
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith((".html", ".js", ".css")):
        response.headers["Cache-Control"] = "no-cache"
    return response


app.include_router(products.router)
app.include_router(templates.router)
app.include_router(companies.router)
app.include_router(quotations.router)


@app.get("/api/config")
def get_config():
    """Small bootstrap payload for the frontend."""
    return {"currency": settings.currency, "currency_symbol": settings.currency_symbol}


# Uploaded product images.
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Static frontend (mounted last so it doesn't shadow /api or /uploads).
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
