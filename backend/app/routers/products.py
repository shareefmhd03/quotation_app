"""Product endpoints + image upload."""
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.product import ProductCreate, ProductOut, ProductUpdate
from ..services import product_service, upload_service

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(search: str | None = None, active_only: bool = False, db: Session = Depends(get_db)):
    return product_service.list_products(db, search=search, active_only=active_only)


@router.post("", response_model=ProductOut, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    return product_service.create_product(db, data)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return product_service.get_product(db, product_id)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    return product_service.update_product(db, product_id, data)


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product_service.delete_product(db, product_id)


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Store an uploaded product image and return its public path."""
    return {"image_path": await upload_service.save_image(file)}
