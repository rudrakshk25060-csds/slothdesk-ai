import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/octet-stream")
    category = Column(String(50), default="Other")
    suggested_filename = Column(String(255), nullable=True)
    extracted_text = Column(Text, nullable=True)
    char_count = Column(Integer, default=0)
    is_scanned = Column(Boolean, default=False)
    ocr_needed_reason = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    suggested_title = Column(String(255), nullable=True)
    action_items_json = Column(Text, default="[]")
    deadlines_json = Column(Text, default="[]")
    is_ai_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    due_date = Column(String(50), nullable=True)
    due_time = Column(String(20), nullable=True)
    priority = Column(String(20), default="Medium")  # High, Medium, Low
    source_document_id = Column(String(36), nullable=True)
    source_document_title = Column(String(255), nullable=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    content_hash = Column(String(64), index=True, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    action_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    details = Column(Text, default="")
    status = Column(String(20), default="success")  # success, warning, error
    created_at = Column(DateTime, default=utc_now)

class FileOperation(Base):
    __tablename__ = "file_operations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), index=True, nullable=False)
    original_path = Column(String(1024), nullable=False)
    target_path = Column(String(1024), nullable=False)
    operation_type = Column(String(50), default="move")
    executed = Column(Boolean, default=False)
    undone = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

class Briefing(Base):
    __tablename__ = "briefings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    briefing_date = Column(String(50), nullable=False)
    content_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
