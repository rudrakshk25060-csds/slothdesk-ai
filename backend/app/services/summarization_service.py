import json
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import Document
from app.ai.provider import ai_provider
from app.services.document_service import document_service
from app.services.audit_service import audit_service
from app.schemas import DocumentSummarizeResponse

class SummarizationService:
    @staticmethod
    async def summarize_document(db: Session, document_id: str) -> DocumentSummarizeResponse:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Handle scanned PDF without OCR text
        if doc.is_scanned and (not doc.extracted_text or len(doc.extracted_text.strip()) == 0):
            return DocumentSummarizeResponse(
                document_id=doc.id,
                suggested_title=doc.original_name or doc.filename,
                summary="Scanned document detected: No embedded text could be extracted. An Optical Character Recognition (OCR) pipeline is needed to read scanned pages.",
                action_items=["Scan with OCR software or provide an editable text/PDF file."],
                deadlines=[],
                is_ai_generated=False,
                source="ocr_detector"
            )

        # Ensure text is present
        text = doc.extracted_text
        if not text:
            file_p = Path(doc.file_path)
            if file_p.exists():
                res = document_service.extract_text(file_p, doc.filename)
                text = res.text
                doc.extracted_text = text
                doc.char_count = res.char_count
                doc.is_scanned = res.is_scanned
                doc.ocr_needed_reason = res.ocr_needed_reason

        if not text or len(text.strip()) == 0:
            return DocumentSummarizeResponse(
                document_id=doc.id,
                suggested_title=doc.original_name or doc.filename,
                summary="This document contains no readable text content.",
                action_items=[],
                deadlines=[],
                is_ai_generated=False,
                source="empty_document_handler"
            )

        # Call AI provider
        ai_res, is_ai, source = await ai_provider.summarize(
            title=doc.original_name or doc.filename,
            text=text
        )

        # Persist results in Document record
        doc.summary = ai_res.summary
        doc.suggested_title = ai_res.suggested_title
        doc.action_items_json = json.dumps(ai_res.action_items)
        doc.deadlines_json = json.dumps([d.model_dump() for d in ai_res.deadlines])
        doc.is_ai_processed = True
        db.commit()
        db.refresh(doc)

        audit_service.log(
            db=db,
            action_type="summarize",
            title=f"Summarized: {doc.filename}",
            details=f"Engine: {source}, Extracted {len(ai_res.deadlines)} deadlines and {len(ai_res.action_items)} actions",
            status="success"
        )

        return DocumentSummarizeResponse(
            document_id=doc.id,
            suggested_title=ai_res.suggested_title,
            summary=ai_res.summary,
            action_items=ai_res.action_items,
            deadlines=[d.model_dump() for d in ai_res.deadlines],
            is_ai_generated=is_ai,
            source=source
        )

summarization_service = SummarizationService()
