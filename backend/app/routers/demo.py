from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.demo_service import demo_service

router = APIRouter(prefix="/api/demo", tags=["Demo Mode"])

@router.post("/load")
def load_demo(db: Session = Depends(get_db)):
    return demo_service.load_demo_workspace(db)

@router.get("/samples")
def get_sample_info():
    return {
        "description": "Fictional academic, financial, contractual, and receipt sample documents.",
        "sample_files": [
            "CS101_Fall2026_Syllabus.txt",
            "AcmeCorp_Invoice_INV-2026-881.txt",
            "Freelance_Design_Agreement.txt",
            "BlueBottleCoffee_Receipt_Oct2026.txt",
            "Scanned_Archived_Memo_Sample.txt"
        ]
    }
