from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    OrganizationPlanRequest,
    OrganizationPlanResponse,
    OrganizationExecuteRequest,
    OrganizationExecuteResponse,
    OrganizationUndoRequest,
    OrganizationUndoResponse
)
from app.services.organization_service import file_organization_service
from app.services.file_operation_service import file_operation_service

router = APIRouter(prefix="/api/organization", tags=["File Organization"])

@router.post("/plan", response_model=OrganizationPlanResponse)
async def create_organization_plan(
    plan_req: OrganizationPlanRequest,
    db: Session = Depends(get_db)
):
    return await file_organization_service.generate_plan(
        db=db,
        document_ids=plan_req.document_ids,
        folder_path_str=plan_req.folder_path
    )

@router.post("/execute", response_model=OrganizationExecuteResponse)
def execute_organization_plan(
    exec_req: OrganizationExecuteRequest,
    db: Session = Depends(get_db)
):
    if not exec_req.items:
        raise HTTPException(status_code=400, detail="No operation items supplied.")

    items_dict = [item.model_dump() for item in exec_req.items]
    res = file_operation_service.execute_organization_plan(
        db=db,
        batch_id=exec_req.batch_id,
        items=items_dict
    )
    return OrganizationExecuteResponse(**res)

@router.post("/undo", response_model=OrganizationUndoResponse)
def undo_organization_plan(
    undo_req: OrganizationUndoRequest,
    db: Session = Depends(get_db)
):
    res = file_operation_service.undo_organization_batch(db, undo_req.batch_id)
    return OrganizationUndoResponse(**res)
