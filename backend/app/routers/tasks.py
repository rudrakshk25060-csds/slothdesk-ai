from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task
from app.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.services.task_service import task_service

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return task_service.list_tasks(db, status=status, priority=priority, search=search)

@router.post("", response_model=TaskResponse)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task, _ = task_service.create_task(db, task_in)
    return task

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, task_update: TaskUpdate, db: Session = Depends(get_db)):
    return task_service.update_task(db, task_id, task_update)

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task_service.delete_task(db, task_id)
    return {"status": "success", "message": f"Deleted task {task_id}"}
