import os
import shutil
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException

import pymupdf
from app.config import settings

class DocumentExtractionResult:
    def __init__(
        self,
        text: str,
        char_count: int,
        is_scanned: bool,
        ocr_needed_reason: str = None
    ):
        self.text = text
        self.char_count = char_count
        self.is_scanned = is_scanned
        self.ocr_needed_reason = ocr_needed_reason

class DocumentService:
    @staticmethod
    def validate_file_size(file_size_bytes: int):
        max_bytes = settings.MAX_DOCUMENT_SIZE_MB * 1024 * 1024
        if file_size_bytes > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {settings.MAX_DOCUMENT_SIZE_MB}MB."
            )

    @staticmethod
    def extract_text_from_pdf(file_path: Path) -> DocumentExtractionResult:
        try:
            doc = pymupdf.open(str(file_path))
            total_pages = len(doc)
            extracted_pages = []

            for page_num in range(total_pages):
                page = doc.load_page(page_num)
                page_text = page.get_text("text")
                if page_text:
                    extracted_pages.append(page_text.strip())

            full_text = "\n\n".join(extracted_pages).strip()
            char_count = len(full_text)

            # Check if this PDF is scanned (has pages, but virtually no extractable text)
            if total_pages > 0 and char_count < 40:
                return DocumentExtractionResult(
                    text="",
                    char_count=0,
                    is_scanned=True,
                    ocr_needed_reason="This PDF contains scanned pages or images without an embedded text layer. OCR processing is required to extract textual content."
                )

            # Enforce max character limit
            if char_count > settings.MAX_DOCUMENT_CHARS:
                full_text = full_text[:settings.MAX_DOCUMENT_CHARS] + "\n\n[Text truncated for processing limit]"
                char_count = len(full_text)

            return DocumentExtractionResult(
                text=full_text,
                char_count=char_count,
                is_scanned=False
            )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to read or parse PDF file: {str(e)}"
            )

    @staticmethod
    def extract_text_from_txt(file_path: Path) -> DocumentExtractionResult:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, "r", encoding="latin-1") as f:
                    content = f.read()
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported text file encoding: {str(e)}"
                )

        char_count = len(content)
        if char_count > settings.MAX_DOCUMENT_CHARS:
            content = content[:settings.MAX_DOCUMENT_CHARS] + "\n\n[Text truncated for processing limit]"
            char_count = len(content)

        return DocumentExtractionResult(
            text=content,
            char_count=char_count,
            is_scanned=False
        )

    @staticmethod
    def extract_text(file_path: Path, filename: str) -> DocumentExtractionResult:
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        if ext == "pdf":
            return DocumentService.extract_text_from_pdf(file_path)
        elif ext in ("txt", "md", "csv", "log", "json"):
            return DocumentService.extract_text_from_txt(file_path)
        else:
            # Basic fallback for other text or unsupported formats
            try:
                return DocumentService.extract_text_from_txt(file_path)
            except Exception:
                return DocumentExtractionResult(
                    text="",
                    char_count=0,
                    is_scanned=False,
                    ocr_needed_reason="File format is not directly parseable as text or PDF."
                )

    @staticmethod
    async def save_uploaded_file(upload_file: UploadFile) -> Tuple[Path, int]:
        # Validate safe filename
        safe_name = Path(upload_file.filename).name
        # Sanitize filename
        safe_name = "".join(c for c in safe_name if c.isalnum() or c in "._- ")
        if not safe_name:
            safe_name = "uploaded_document.txt"

        destination = settings.STORAGE_DIR / safe_name
        
        # Handle collision in storage dir
        base_stem = destination.stem
        ext = destination.suffix
        counter = 1
        while destination.exists():
            destination = settings.STORAGE_DIR / f"{base_stem}_{counter}{ext}"
            counter += 1

        with open(destination, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        file_size = os.path.getsize(destination)
        DocumentService.validate_file_size(file_size)

        return destination, file_size

document_service = DocumentService()
