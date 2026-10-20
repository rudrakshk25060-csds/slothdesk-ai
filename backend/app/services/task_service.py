import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import Task, utc_now
from app.schemas import TaskCreate, TaskUpdate
from app.services.audit_service import audit_service

class TaskService:
    @staticmethod
    def compute_content_hash(title: str, due_date: Optional[str] = None, doc_id: Optional[str] = None) -> str:
        raw = f"{doc_id or ''}|{title.strip().lower()}|{due_date or ''}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def create_task(db: Session, task_in: TaskCreate) -> Tuple[Task, bool]:
        """
        Creates a task. Prevents duplicates by checking content_hash.
        Returns (task, is_created) where is_created is False if duplicate was detected.
        """
        c_hash = TaskService.compute_content_hash(
            title=task_in.title,
            due_date=task_in.due_date,
            doc_id=task_in.source_document_id
        )

        existing = db.query(Task).filter(Task.content_hash == c_hash).first()
        if existing:
            # Duplicate found: do not create another task
            return existing, False

        task = Task(
            title=task_in.title.strip(),
            description=task_in.description or "",
            due_date=task_in.due_date,
            due_time=task_in.due_time,
            priority=task_in.priority or "Medium",
            source_document_id=task_in.source_document_id,
            source_document_title=task_in.source_document_title,
            completed=False,
            content_hash=c_hash
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        audit_service.log(
            db=db,
            action_type="task_create",
            title=f"Created task: {task.title[:50]}",
            details=f"Priority: {task.priority}, Due: {task.due_date or 'None'}",
            status="success"
        )

        return task, True

    @staticmethod
    def list_tasks(
        db: Session,
        status: Optional[str] = None,  # "completed", "pending", or None (all)
        priority: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Task]:
        query = db.query(Task)

        if status == "completed":
            query = query.filter(Task.completed == True)
        elif status == "pending":
            query = query.filter(Task.completed == False)

        if priority:
            query = query.filter(Task.priority.ilike(priority))

        if search:
            query = query.filter(
                (Task.title.ilike(f"%{search}%")) | (Task.description.ilike(f"%{search}%"))
            )

        # Sort: pending first, then by due_date nulls last, then created_at desc
        return query.order_by(Task.completed.asc(), Task.due_date.asc().nullslast(), Task.created_at.desc()).all()

    @staticmethod
    def update_task(db: Session, task_id: str, task_update: TaskUpdate) -> Task:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        update_data = task_update.model_dump(exclude_unset=True)
        
        if "completed" in update_data:
            was_completed = task.completed
            is_completed = update_data["completed"]
            task.completed = is_completed
            task.completed_at = utc_now() if is_completed else None
            
            if not was_completed and is_completed:
                audit_service.log(
                    db=db,
                    action_type="task_complete",
                    title=f"Completed task: {task.title[:50]}",
                    status="success"
                )

        for field, value in update_data.items():
            if field != "completed":
                setattr(task, field, value)

        # Recompute content hash if title or due_date changed
        task.content_hash = TaskService.compute_content_hash(
            title=task.title,
            due_date=task.due_date,
            doc_id=task.source_document_id
        )

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def delete_task(db: Session, task_id: str) -> bool:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        db.delete(task)
        db.commit()
        return True

task_service = TaskService()
