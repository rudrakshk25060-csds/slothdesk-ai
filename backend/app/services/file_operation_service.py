import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models import FileOperation, Document
from app.services.audit_service import audit_service

class FileOperationService:
    @staticmethod
    def get_allowed_roots() -> List[Path]:
        """Returns the list of validated directories safe for file operations."""
        return [
            settings.STORAGE_DIR.resolve(),
            settings.DATA_DIR.resolve(),
            settings.SAMPLE_DIR.resolve(),
        ]

    @staticmethod
    def validate_safe_path(target_path_str: str, allowed_roots: Optional[List[Path]] = None) -> Path:
        """
        Validates that a path does not attempt path traversal or access unauthorized locations.
        Throws HTTPException 403 or 400 on violations.
        """
        if not target_path_str or "\x00" in target_path_str:
            raise HTTPException(status_code=400, detail="Invalid file path provided.")

        try:
            target_path = Path(target_path_str).resolve()
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed file path.")

        if allowed_roots is None:
            allowed_roots = FileOperationService.get_allowed_roots()

        # Check if target_path is within any approved root
        is_allowed = any(
            target_path == root or root in target_path.parents
            for root in allowed_roots
        )

        if not is_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Path '{target_path_str}' is outside permitted application directories."
            )

        return target_path

    @staticmethod
    def get_collision_safe_path(target_path: Path) -> Path:
        """
        If target_path already exists, adds numeric suffix before extension:
        e.g., file.txt -> file_1.txt, file_2.txt.
        Never overwrites files silently.
        """
        if not target_path.exists():
            return target_path

        parent = target_path.parent
        stem = target_path.stem
        ext = target_path.suffix
        counter = 1

        while True:
            candidate = parent / f"{stem}_{counter}{ext}"
            if not candidate.exists():
                return candidate
            counter += 1

    @staticmethod
    def execute_organization_plan(
        db: Session,
        batch_id: str,
        items: List[Dict[str, Any]],
        base_dir: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Executes approved file move/rename operations.
        Requires explicit item['approved'] == True.
        """
        if base_dir is None:
            base_dir = settings.STORAGE_DIR.resolve()

        results = []
        executed_count = 0
        failed_count = 0
        skipped_count = 0

        for item in items:
            doc_id = item.get("document_id")
            current_path_str = item.get("current_path")
            target_relative_str = item.get("target_relative_path")
            approved = item.get("approved", False)

            if not approved:
                skipped_count += 1
                results.append({
                    "document_id": doc_id,
                    "status": "skipped",
                    "original_path": current_path_str,
                    "new_path": "",
                    "message": "User did not approve operation."
                })
                continue

            try:
                # Validate source path
                source_path = FileOperationService.validate_safe_path(current_path_str)
                if not source_path.exists() or not source_path.is_file():
                    failed_count += 1
                    results.append({
                        "document_id": doc_id,
                        "status": "error",
                        "original_path": current_path_str,
                        "new_path": "",
                        "message": "Source file does not exist on disk."
                    })
                    continue

                # Clean relative target path (prevent leading slashes or .. escapes)
                clean_rel = target_relative_str.lstrip("/\\")
                # Ensure no ../ inside relative path
                if ".." in clean_rel:
                    raise HTTPException(status_code=403, detail="Path traversal detected in target relative path.")

                target_destination = base_dir / clean_rel
                # Validate destination path is safe
                FileOperationService.validate_safe_path(str(target_destination))

                # Ensure target directory exists
                target_destination.parent.mkdir(parents=True, exist_ok=True)

                # Get collision-safe filename
                safe_destination = FileOperationService.get_collision_safe_path(target_destination)

                # Execute filesystem move
                shutil.move(str(source_path), str(safe_destination))

                # Record in database for audit and undo
                op = FileOperation(
                    batch_id=batch_id,
                    original_path=str(source_path),
                    target_path=str(safe_destination),
                    operation_type="move",
                    executed=True,
                    undone=False
                )
                db.add(op)

                # Update Document record if exists
                if doc_id:
                    doc = db.query(Document).filter(Document.id == doc_id).first()
                    if doc:
                        doc.file_path = str(safe_destination)
                        doc.filename = safe_destination.name
                        # update category if moved to a category folder
                        if safe_destination.parent != base_dir:
                            doc.category = safe_destination.parent.name

                executed_count += 1
                results.append({
                    "document_id": doc_id,
                    "status": "success",
                    "original_path": str(source_path),
                    "new_path": str(safe_destination),
                    "message": f"Moved successfully to {safe_destination.relative_to(base_dir)}"
                })

            except HTTPException as he:
                failed_count += 1
                results.append({
                    "document_id": doc_id,
                    "status": "error",
                    "original_path": current_path_str,
                    "new_path": "",
                    "message": he.detail
                })
            except Exception as e:
                failed_count += 1
                results.append({
                    "document_id": doc_id,
                    "status": "error",
                    "original_path": current_path_str,
                    "new_path": "",
                    "message": str(e)
                })

        db.commit()

        # Log activity
        audit_service.log(
            db=db,
            action_type="organize_execute",
            title=f"Organized {executed_count} files (Batch: {batch_id[:8]})",
            details=f"Executed: {executed_count}, Failed: {failed_count}, Skipped: {skipped_count}",
            status="success" if failed_count == 0 else "warning"
        )

        return {
            "batch_id": batch_id,
            "executed_count": executed_count,
            "failed_count": failed_count,
            "skipped_count": skipped_count,
            "results": results,
            "can_undo": executed_count > 0
        }

    @staticmethod
    def undo_organization_batch(db: Session, batch_id: str) -> Dict[str, Any]:
        """
        Reverses all operations in the given batch_id safely.
        """
        operations = db.query(FileOperation).filter(
            FileOperation.batch_id == batch_id,
            FileOperation.executed == True,
            FileOperation.undone == False
        ).all()

        if not operations:
            raise HTTPException(
                status_code=404,
                detail=f"No reversible file operations found for batch ID: {batch_id}"
            )

        undone_count = 0
        failed_count = 0

        for op in operations:
            try:
                target_path = Path(op.target_path)
                original_path = Path(op.original_path)

                if target_path.exists():
                    original_path.parent.mkdir(parents=True, exist_ok=True)
                    safe_restore_path = FileOperationService.get_collision_safe_path(original_path)
                    shutil.move(str(target_path), str(safe_restore_path))
                    
                    # Update document if found
                    doc = db.query(Document).filter(Document.file_path == str(target_path)).first()
                    if doc:
                        doc.file_path = str(safe_restore_path)
                        doc.filename = safe_restore_path.name

                op.undone = True
                undone_count += 1
            except Exception as e:
                failed_count += 1

        db.commit()

        audit_service.log(
            db=db,
            action_type="organize_undo",
            title=f"Reversed batch organization ({batch_id[:8]})",
            details=f"Restored: {undone_count}, Failed: {failed_count}",
            status="success" if failed_count == 0 else "error"
        )

        return {
            "batch_id": batch_id,
            "undone_count": undone_count,
            "failed_count": failed_count,
            "message": f"Successfully reversed {undone_count} file operations."
        }

file_operation_service = FileOperationService()
