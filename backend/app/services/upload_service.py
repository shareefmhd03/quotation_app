"""Shared image-upload handling for product images and company logos.

Files are stored under data/uploads/ and served at /uploads/. (Product images
and logos are persisted intentionally — unlike generated PDFs, which are never
written to disk.)
"""
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile

from ..config import UPLOAD_DIR

ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


async def save_image(file: UploadFile) -> str:
    """Persist an uploaded image and return its public path (/uploads/…)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {ext or '(none)'}")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5 MB)")
    fname = f"{secrets.token_hex(8)}{ext}"
    (UPLOAD_DIR / fname).write_bytes(data)
    return f"/uploads/{fname}"
