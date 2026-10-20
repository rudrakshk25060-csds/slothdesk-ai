import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import Document
from app.ai.provider import ai_provider
from app.schemas import TaskCreate, AIDeadlineItem
from app.services.task_service import task_service
from app.services.audit_service import audit_service

class DeadlineExtractionService:
    @staticmethod
    async def extract_and_sync_deadlines(
        db: Session,
        document_id: str,
        create_tasks: bool = True
    ) -> Tuple[List[Dict[str, Any]], int, bool, str]:
        """
        Extracts deadlines from document text and optionally registers them as tasks with duplicate prevention.
        Returns (deadlines_list, new_tasks_created_count, is_ai, source).
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        text = doc.extracted_text or ""
        if not text:
            return [], 0, False, "no_text"

        deadlines, is_ai, source = await ai_provider.extract_deadlines(text)
        
        # Save to document record
        deadlines_dicts = [d.model_dump() for d in deadlines]
        doc.deadlines_json = json.dumps(deadlines_dicts)
        db.commit()

        new_tasks_count = 0
        if create_tasks:
            for d in deadlines:
                task_in = TaskCreate(
                    title=d.title,
                    description=d.context or f"Extracted from {doc.original_name or doc.filename}",
                    due_date=d.due_date,
                    due_time=d.due_time,
                    priority=d.priority,
                    source_document_id=doc.id,
                    source_document_title=doc.suggested_title or doc.filename
                )
                _, created = task_service.create_task(db, task_in)
                if created:
                    new_tasks_count += 1

        audit_service.log(
            db=db,
            action_type="deadline_extract",
            title=f"Extracted deadlines from {doc.filename}",
            details=f"Found {len(deadlines)} deadlines, Created {new_tasks_count} new tasks",
            status="success"
        )

        return deadlines_dicts, new_tasks_count, is_ai, source

deadline_service = DeadlineExtractionService()
