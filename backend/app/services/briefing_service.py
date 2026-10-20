import json
from datetime import datetime, date, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import Task, Document, Briefing, utc_now
from app.ai.provider import ai_provider
from app.services.audit_service import audit_service
from app.schemas import BriefingResponse

class BriefingService:
    @staticmethod
    async def generate_daily_briefing(db: Session) -> BriefingResponse:
        today_str = date.today().isoformat()

        # 1. Fetch tasks due today (or overdue and pending)
        tasks = db.query(Task).filter(
            Task.completed == False
        ).order_by(Task.due_date.asc().nullslast()).all()

        tasks_due_today = []
        upcoming_deadlines = []

        for t in tasks:
            t_dict = {
                "id": t.id,
                "title": t.title,
                "due_date": t.due_date,
                "priority": t.priority,
                "source": t.source_document_title
            }
            if t.due_date and t.due_date <= today_str:
                tasks_due_today.append(t_dict)
            elif t.due_date and t.due_date > today_str:
                upcoming_deadlines.append(t_dict)

        # 2. Fetch recently summarized documents
        recent_docs = db.query(Document).filter(
            Document.summary.isnot(None)
        ).order_by(Document.updated_at.desc()).limit(5).all()

        recent_docs_dicts = [
            {
                "id": d.id,
                "filename": d.filename,
                "suggested_title": d.suggested_title or d.filename,
                "category": d.category,
                "summary": d.summary[:200] if d.summary else ""
            }
            for d in recent_docs
        ]

        # 3. Call AI provider
        ai_brief, is_ai, source = await ai_provider.generate_briefing(
            tasks_today=tasks_due_today,
            upcoming_deadlines=upcoming_deadlines,
            recent_docs=recent_docs_dicts
        )

        content = {
            "top_priorities": ai_brief.top_priorities,
            "tasks_due_today": tasks_due_today,
            "upcoming_deadlines": upcoming_deadlines[:5],
            "recently_summarized": recent_docs_dicts,
            "suggested_actions": ai_brief.suggested_actions,
            "sloth_quote": ai_brief.sloth_quote,
            "is_ai_generated": is_ai,
            "source": source
        }

        # 4. Persist briefing
        briefing_record = Briefing(
            briefing_date=today_str,
            content_json=json.dumps(content)
        )
        db.add(briefing_record)
        db.commit()
        db.refresh(briefing_record)

        audit_service.log(
            db=db,
            action_type="briefing_generate",
            title=f"Generated morning briefing for {today_str}",
            details=f"Engine: {source}, Priorities: {len(ai_brief.top_priorities)}",
            status="success"
        )

        return BriefingResponse(
            id=briefing_record.id,
            date=today_str,
            top_priorities=ai_brief.top_priorities,
            tasks_due_today=tasks_due_today,
            upcoming_deadlines=upcoming_deadlines[:5],
            recently_summarized=recent_docs_dicts,
            suggested_actions=ai_brief.suggested_actions,
            sloth_quote=ai_brief.sloth_quote,
            is_ai_generated=is_ai,
            created_at=briefing_record.created_at
        )

    @staticmethod
    def get_latest_briefing(db: Session) -> Optional[BriefingResponse]:
        record = db.query(Briefing).order_by(Briefing.created_at.desc()).first()
        if not record:
            return None
        data = json.loads(record.content_json)
        return BriefingResponse(
            id=record.id,
            date=record.briefing_date,
            top_priorities=data.get("top_priorities", []),
            tasks_due_today=data.get("tasks_due_today", []),
            upcoming_deadlines=data.get("upcoming_deadlines", []),
            recently_summarized=data.get("recently_summarized", []),
            suggested_actions=data.get("suggested_actions", []),
            sloth_quote=data.get("sloth_quote", ""),
            is_ai_generated=data.get("is_ai_generated", False),
            created_at=record.created_at
        )

briefing_service = BriefingService()
