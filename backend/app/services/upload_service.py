"""Shared image-upload handling.

Two strategies:
  * save_image() writes to disk under /uploads/ (used by product images).
  * to_data_uri() returns an inline base64 data URI — used for the company logo
    so it lives inside the database row and survives redeploys without a disk.
"""
import base64
import mimetypes
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile

from ..config import UPLOAD_DIR

ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB
LOGO_MAX_BYTES = 1024 * 1024  # 1 MB — kept small since it's stored in the DB/API


async def save_image(file: UploadFile) -> str:
    """Persist an uploaded image and return its public path (/uploads/…)."""
    ext = _check_ext(file)
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5 MB)")
    fname = f"{secrets.token_hex(8)}{ext}"
    (UPLOAD_DIR / fname).write_bytes(data)
    return f"/uploads/{fname}"


async def to_data_uri(file: UploadFile) -> str:
    """Return the upload as a base64 data URI (stored in the DB, no disk)."""
    ext = _check_ext(file)
    data = await file.read()
    if len(data) > LOGO_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Logo too large (max 1 MB)")
    mime = mimetypes.guess_type(f"x{ext}")[0] or "image/png"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _check_ext(file: UploadFile) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {ext or '(none)'}")
    return ext
