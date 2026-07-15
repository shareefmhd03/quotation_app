"""Application configuration.

Central place for settings so switching SQLite -> Postgres later is a one-line
change (or an env var). Keep this small and boring on purpose.
"""
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/  (this file lives in backend/app/config.py)
BASE_DIR = Path(__file__).resolve().parent.parent
# DATA_DIR holds the SQLite DB + uploaded images. Override with QUOTE_DATA_DIR to
# point it at a mounted persistent disk in production (e.g. Render's /data).
DATA_DIR = Path(os.environ.get("QUOTE_DATA_DIR") or (BASE_DIR / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="QUOTE_", env_file=".env", extra="ignore")

    app_name: str = "Quotation App"
    # SQLite for now; set QUOTE_DATABASE_URL to a postgres URL to scale later.
    database_url: str = f"sqlite:///{DATA_DIR / 'quotation.db'}"
    # Currency + tax defaults surfaced to the frontend/PDF.
    currency: str = "INR"
    currency_symbol: str = "₹"


settings = Settings()

# Make sure runtime dirs exist before anything touches them.
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
