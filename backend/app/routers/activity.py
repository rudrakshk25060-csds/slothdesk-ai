from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Activity
from app.schemas import ActivityResponse

router = APIRouter(prefix="/api/activity", tags=["Activity History"])

@router.get("", response_model=List[ActivityResponse])
def get_activities(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Activity).order_by(Activity.created_at.desc()).limit(limit).all()

@router.delete("")
def clear_activities(db: Session = Depends(get_db)):
    db.query(Activity).delete()
    db.commit()
    return {"status": "success", "message": "Cleared activity history."}
