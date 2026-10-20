import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.config import settings
from app.models import Document, Task, FileOperation
from app.schemas import StatsResponse, AIStatusResponse
from app.ai.provider import ai_provider

router = APIRouter(prefix="/api", tags=["Health & System"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    # Verify DB connectivity
    try:
        db.execute(func.now())
        db_ready = True
    except Exception:
        db_ready = False

    # Verify storage writable
    storage_writable = os.access(settings.STORAGE_DIR, os.W_OK)

    ready = db_ready and storage_writable
    return {
        "ready": ready,
        "database": "connected" if db_ready else "error",
        "storage": "writable" if storage_writable else "read_only"
    }

@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    # Calculate real persisted metrics
    files_organized = db.query(FileOperation).filter(FileOperation.executed == True, FileOperation.undone == False).count()
    documents_summarized = db.query(Document).filter(Document.summary.isnot(None)).count()
    
    # Calculate total deadlines detected
    docs_with_deadlines = db.query(Document).filter(Document.deadlines_json != "[]").all()
    deadlines_detected = 0
    import json
    for d in docs_with_deadlines:
        try:
            deadlines_detected += len(json.loads(d.deadlines_json or "[]"))
        except Exception:
            pass

    tasks_completed = db.query(Task).filter(Task.completed == True).count()
    total_tasks = db.query(Task).count()
    pending_tasks = db.query(Task).filter(Task.completed == False).count()

    ai_status = await ai_provider.check_status()

    return StatsResponse(
        files_organized=files_organized,
        documents_summarized=documents_summarized,
        deadlines_detected=deadlines_detected,
        tasks_completed=tasks_completed,
        total_tasks=total_tasks,
        pending_tasks=pending_tasks,
        ai_model=ai_status.model,
        ai_status="active" if ai_status.available else "unavailable"
    )

@router.get("/ai/status", response_model=AIStatusResponse)
async def get_ai_status():
    return await ai_provider.check_status()
