import json
import shutil
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Document, Task, Activity, FileOperation, Briefing, Setting
from app.schemas import SettingsResponse, SettingsUpdate
from app.ai.provider import ai_provider

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    ai_status = await ai_provider.check_status()
    theme_setting = db.query(Setting).filter(Setting.key == "theme").first()
    theme = theme_setting.value if theme_setting else "system"

    return SettingsResponse(
        ai_provider="Ollama (Local Gemma 3 4B)",
        ai_model=ai_status.model,
        ai_available=ai_status.available,
        data_storage_path=str(settings.STORAGE_DIR),
        app_version=settings.APP_VERSION,
        theme=theme,
        privacy_mode="Strictly Local (Offline-first, Zero telemetry)"
    )

@router.patch("")
def update_settings(update_in: SettingsUpdate, db: Session = Depends(get_db)):
    if update_in.theme:
        setting = db.query(Setting).filter(Setting.key == "theme").first()
        if not setting:
            setting = Setting(key="theme", value=update_in.theme)
            db.add(setting)
        else:
            setting.value = update_in.theme
        db.commit()

    return {"status": "success", "message": "Settings updated."}

@router.post("/export")
def export_application_data(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Exports full database snapshot as downloadable JSON."""
    docs = db.query(Document).all()
    tasks = db.query(Task).all()
    acts = db.query(Activity).all()
    briefings = db.query(Briefing).all()

    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "exported_at": str(settings.STORAGE_DIR),
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "original_name": d.original_name,
                "category": d.category,
                "summary": d.summary,
                "suggested_title": d.suggested_title,
                "char_count": d.char_count,
                "is_scanned": d.is_scanned
            }
            for d in docs
        ],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "due_date": t.due_date,
                "due_time": t.due_time,
                "priority": t.priority,
                "completed": t.completed
            }
            for t in tasks
        ],
        "activities": [
            {
                "id": a.id,
                "action_type": a.action_type,
                "title": a.title,
                "details": a.details,
                "status": a.status,
                "created_at": str(a.created_at)
            }
            for a in acts
        ],
        "briefings_count": len(briefings)
    }

@router.post("/clear")
def clear_application_data(
    confirm: bool = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required to clear application data.")

    db.query(Task).delete()
    db.query(Document).delete()
    db.query(Activity).delete()
    db.query(FileOperation).delete()
    db.query(Briefing).delete()
    db.commit()

    # Clear storage directory
    if settings.STORAGE_DIR.exists():
        for item in settings.STORAGE_DIR.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)

    return {"status": "success", "message": "All application data and files have been safely wiped."}
