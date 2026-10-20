from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import BriefingResponse
from app.services.briefing_service import briefing_service

router = APIRouter(prefix="/api/briefing", tags=["Morning Briefing"])

@router.post("/generate", response_model=BriefingResponse)
async def generate_briefing(db: Session = Depends(get_db)):
    return await briefing_service.generate_daily_briefing(db)

@router.get("/latest", response_model=BriefingResponse)
def get_latest_briefing(db: Session = Depends(get_db)):
    briefing = briefing_service.get_latest_briefing(db)
    if not briefing:
        raise HTTPException(
            status_code=404,
            detail="No briefing generated yet. Click 'Generate morning briefing' to build one from your active documents and tasks."
        )
    return briefing
