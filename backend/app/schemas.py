from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ----------------- AI Structured Output Schemas -----------------

class AICategorizationOutput(BaseModel):
    category: str = Field(description="One of: Documents, Education, Finance, Work, Images, Receipts, Other")
    suggested_filename: str = Field(description="Clean, sanitized, descriptive filename preserving original extension")
    reasoning: str = Field(description="One sentence explaining why this category and name were chosen")
    confidence: float = Field(default=0.8, description="Confidence score from 0.0 to 1.0")

class AIDeadlineItem(BaseModel):
    title: str = Field(description="Actionable description of the deadline or event")
    due_date: Optional[str] = Field(default=None, description="ISO Date string YYYY-MM-DD if found, otherwise relative phrase")
    due_time: Optional[str] = Field(default=None, description="Time e.g. 17:00 or 11:59 PM if found")
    priority: str = Field(default="Medium", description="High, Medium, or Low")
    context: str = Field(default="", description="Snippet or context around the deadline")

class AISummarizationOutput(BaseModel):
    suggested_title: str = Field(description="Descriptive, concise title for this document")
    summary: str = Field(description="2-4 sentence executive summary of the document contents")
    action_items: List[str] = Field(default_factory=list, description="List of immediate action items or to-dos")
    deadlines: List[AIDeadlineItem] = Field(default_factory=list, description="List of extracted deadlines")

class AIBriefingOutput(BaseModel):
    top_priorities: List[str] = Field(description="Top 3 priorities for today")
    suggested_actions: List[str] = Field(description="2-3 calm, steady next actions")
    sloth_quote: str = Field(description="A warm, encouraging productivity thought about steady progress")

# ----------------- Document Schemas -----------------

class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    file_path: str
    file_size: int
    mime_type: str
    category: str
    suggested_filename: Optional[str] = None
    char_count: int
    is_scanned: bool
    ocr_needed_reason: Optional[str] = None
    summary: Optional[str] = None
    suggested_title: Optional[str] = None
    action_items: List[str] = []
    deadlines: List[Dict[str, Any]] = []
    is_ai_processed: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentSummarizeResponse(BaseModel):
    document_id: str
    suggested_title: str
    summary: str
    action_items: List[str]
    deadlines: List[Dict[str, Any]]
    is_ai_generated: bool
    source: str

# ----------------- Task Schemas -----------------

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: str = "Medium"
    source_document_id: Optional[str] = None
    source_document_title: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: str
    source_document_id: Optional[str] = None
    source_document_title: Optional[str] = None
    completed: bool
    completed_at: Optional[datetime] = None
    content_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Organization Schemas -----------------

class OrganizationProposalItem(BaseModel):
    document_id: str
    current_path: str
    current_filename: str
    suggested_category: str
    suggested_filename: str
    target_relative_path: str
    reasoning: str
    selected: bool = True

class OrganizationPlanRequest(BaseModel):
    folder_path: Optional[str] = None
    document_ids: Optional[List[str]] = None

class OrganizationPlanResponse(BaseModel):
    batch_id: str
    source_directory: str
    items: List[OrganizationProposalItem]
    total_files: int
    is_ai_powered: bool
    model_name: str

class OrganizationExecuteItem(BaseModel):
    document_id: str
    current_path: str
    target_relative_path: str
    approved: bool

class OrganizationExecuteRequest(BaseModel):
    batch_id: str
    items: List[OrganizationExecuteItem]

class OrganizationExecuteItemResult(BaseModel):
    document_id: str
    status: str  # success, skipped, error
    original_path: str
    new_path: str
    message: str

class OrganizationExecuteResponse(BaseModel):
    batch_id: str
    executed_count: int
    failed_count: int
    skipped_count: int
    results: List[OrganizationExecuteItemResult]
    can_undo: bool

class OrganizationUndoRequest(BaseModel):
    batch_id: str

class OrganizationUndoResponse(BaseModel):
    batch_id: str
    undone_count: int
    failed_count: int
    message: str

# ----------------- Morning Briefing Schemas -----------------

class BriefingResponse(BaseModel):
    id: str
    date: str
    top_priorities: List[str]
    tasks_due_today: List[Dict[str, Any]]
    upcoming_deadlines: List[Dict[str, Any]]
    recently_summarized: List[Dict[str, Any]]
    suggested_actions: List[str]
    sloth_quote: str
    is_ai_generated: bool
    created_at: datetime

# ----------------- Activity History Schemas -----------------

class ActivityResponse(BaseModel):
    id: str
    action_type: str
    title: str
    details: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Stats & System Schemas -----------------

class StatsResponse(BaseModel):
    files_organized: int
    documents_summarized: int
    deadlines_detected: int
    tasks_completed: int
    total_tasks: int
    pending_tasks: int
    ai_model: str
    ai_status: str  # "active" or "unavailable"

class AIStatusResponse(BaseModel):
    available: bool
    provider: str
    model: str
    details: str
    setup_instructions: List[str]

class SettingsResponse(BaseModel):
    ai_provider: str
    ai_model: str
    ai_available: bool
    data_storage_path: str
    app_version: str
    theme: str
    privacy_mode: str

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
