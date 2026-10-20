import uuid
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.config import settings
from app.models import Document
from app.ai.provider import ai_provider
from app.services.file_operation_service import file_operation_service
from app.services.audit_service import audit_service
from app.schemas import (
    OrganizationPlanResponse,
    OrganizationProposalItem,
)

class FileOrganizationService:
    @staticmethod
    async def generate_plan(
        db: Session,
        document_ids: Optional[List[str]] = None,
        folder_path_str: Optional[str] = None
    ) -> OrganizationPlanResponse:
        batch_id = str(uuid.uuid4())
        docs_to_process: List[Document] = []

        if document_ids:
            docs_to_process = db.query(Document).filter(Document.id.in_(document_ids)).all()
        else:
            # By default process all unorganized documents in database or folder
            docs_to_process = db.query(Document).all()

        if not docs_to_process and folder_path_str:
            # If user provided a folder path, validate safe access
            folder = file_operation_service.validate_safe_path(folder_path_str)
            if not folder.is_dir():
                raise HTTPException(status_code=400, detail="Provided folder path is not a directory.")
        
        proposals: List[OrganizationProposalItem] = []
        is_ai_powered = False
        model_name = "Rule-based engine"

        for doc in docs_to_process:
            file_p = Path(doc.file_path)
            sample_text = (doc.extracted_text or "")[:1500]

            cat_result, was_ai, src = await ai_provider.categorize(
                filename=doc.original_name or doc.filename,
                sample_text=sample_text
            )
            if was_ai:
                is_ai_powered = True
                model_name = src

            # Sanitize category
            valid_cats = ["Documents", "Education", "Finance", "Work", "Images", "Receipts", "Other"]
            chosen_cat = cat_result.category if cat_result.category in valid_cats else "Other"

            # Sanitize suggested filename
            suggested_name = Path(cat_result.suggested_filename).name
            if not suggested_name or ".." in suggested_name:
                suggested_name = doc.filename

            # Preserve extension
            orig_suffix = Path(doc.filename).suffix
            if orig_suffix and not suggested_name.lower().endswith(orig_suffix.lower()):
                suggested_name = Path(suggested_name).stem + orig_suffix

            target_rel = f"{chosen_cat}/{suggested_name}"

            proposals.append(OrganizationProposalItem(
                document_id=doc.id,
                current_path=doc.file_path,
                current_filename=doc.filename,
                suggested_category=chosen_cat,
                suggested_filename=suggested_name,
                target_relative_path=target_rel,
                reasoning=cat_result.reasoning,
                selected=True
            ))

        audit_service.log(
            db=db,
            action_type="organize_plan",
            title=f"Generated organization plan for {len(proposals)} files",
            details=f"Batch: {batch_id[:8]}, Engine: {model_name}",
            status="success"
        )

        return OrganizationPlanResponse(
            batch_id=batch_id,
            source_directory=str(settings.STORAGE_DIR),
            items=proposals,
            total_files=len(proposals),
            is_ai_powered=is_ai_powered,
            model_name=model_name
        )

file_organization_service = FileOrganizationService()
