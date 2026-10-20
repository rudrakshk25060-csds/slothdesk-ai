import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document
from app.schemas import (
    DocumentResponse,
    DocumentSummarizeResponse,
)
from app.services.document_service import document_service
from app.services.summarization_service import summarization_service
from app.services.deadline_service import deadline_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/documents", tags=["Documents"])

def doc_to_response(doc: Document) -> DocumentResponse:
    action_items = []
    deadlines = []
    try:
        if doc.action_items_json:
            action_items = json.loads(doc.action_items_json)
    except Exception:
        pass

    try:
        if doc.deadlines_json:
            deadlines = json.loads(doc.deadlines_json)
    except Exception:
        pass

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_name=doc.original_name,
        file_path=doc.file_path,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        category=doc.category or "Other",
        suggested_filename=doc.suggested_filename,
        char_count=doc.char_count,
        is_scanned=doc.is_scanned,
        ocr_needed_reason=doc.ocr_needed_reason,
        summary=doc.summary,
        suggested_title=doc.suggested_title,
        action_items=action_items,
        deadlines=deadlines,
        is_ai_processed=doc.is_ai_processed,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )

@router.get("", response_model=List[DocumentResponse])
def get_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    if category:
        query = query.filter(Document.category.ilike(category))
    if search:
        query = query.filter(
            (Document.filename.ilike(f"%{search}%")) |
            (Document.original_name.ilike(f"%{search}%")) |
            (Document.suggested_title.ilike(f"%{search}%"))
        )
    docs = query.order_by(Document.created_at.desc()).all()
    return [doc_to_response(d) for d in docs]

@router.post("/import", response_model=List[DocumentResponse])
async def import_documents(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    imported_docs = []

    for upload in files:
        saved_path, file_size = await document_service.save_uploaded_file(upload)
        extraction = document_service.extract_text(saved_path, upload.filename)

        doc = Document(
            filename=saved_path.name,
            original_name=upload.filename,
            file_path=str(saved_path),
            file_size=file_size,
            mime_type=upload.content_type or "application/octet-stream",
            category="Other",
            extracted_text=extraction.text,
            char_count=extraction.char_count,
            is_scanned=extraction.is_scanned,
            ocr_needed_reason=extraction.ocr_needed_reason,
            is_ai_processed=False
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        imported_docs.append(doc)

    audit_service.log(
        db=db,
        action_type="import",
        title=f"Imported {len(imported_docs)} document(s)",
        details=f"Files: {', '.join([d.filename for d in imported_docs[:3]])}" + ("..." if len(imported_docs) > 3 else ""),
        status="success"
    )

    return [doc_to_response(d) for d in imported_docs]

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc_to_response(doc)

@router.post("/{document_id}/summarize", response_model=DocumentSummarizeResponse)
async def summarize_document(document_id: str, db: Session = Depends(get_db)):
    return await summarization_service.summarize_document(db, document_id)

@router.post("/{document_id}/extract-deadlines")
async def extract_deadlines(document_id: str, db: Session = Depends(get_db)):
    deadlines, new_tasks, is_ai, source = await deadline_service.extract_and_sync_deadlines(db, document_id, create_tasks=True)
    return {
        "document_id": document_id,
        "deadlines": deadlines,
        "new_tasks_created": new_tasks,
        "is_ai_generated": is_ai,
        "source": source
    }

@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_p = Path(doc.file_path)
    if file_p.exists():
        try:
            file_p.unlink()
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"status": "success", "message": f"Deleted document {document_id}"}
