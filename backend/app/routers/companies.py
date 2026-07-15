"""Company endpoints + logo upload."""
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.company import CompanyCreate, CompanyOut, CompanyUpdate
from ..services import company_service, upload_service

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...)):
    """Return the logo as an inline data URI, stored in the company row so it
    persists across redeploys without a disk."""
    return {"logo_path": await upload_service.to_data_uri(file)}


@router.get("", response_model=list[CompanyOut])
def list_companies(db: Session = Depends(get_db)):
    return company_service.list_companies(db)


@router.post("", response_model=CompanyOut, status_code=201)
def create_company(data: CompanyCreate, db: Session = Depends(get_db)):
    return company_service.create_company(db, data)


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: int, db: Session = Depends(get_db)):
    return company_service.get_company(db, company_id)


@router.put("/{company_id}", response_model=CompanyOut)
def update_company(company_id: int, data: CompanyUpdate, db: Session = Depends(get_db)):
    return company_service.update_company(db, company_id, data)


@router.delete("/{company_id}", status_code=204)
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company_service.delete_company(db, company_id)
