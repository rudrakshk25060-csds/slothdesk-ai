import io
import os
import pytest
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pymupdf

from app.config import settings
from app.models import Document, Task, Activity, FileOperation
from app.schemas import (
    TaskCreate,
    TaskUpdate,
    AICategorizationOutput,
    AISummarizationOutput,
    AIDeadlineItem,
    AIBriefingOutput,
    AIStatusResponse
)
from app.services.document_service import document_service
from app.services.task_service import task_service
from app.services.file_operation_service import file_operation_service
from app.ai.provider import ai_provider

# 1. Health and readiness endpoints
def test_01_health_and_readiness(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "SlothDesk" in data["app"]

    ready_res = client.get("/api/ready")
    assert ready_res.status_code == 200
    ready_data = ready_res.json()
    assert ready_data["ready"] is True
    assert ready_data["database"] == "connected"

# 2. AI provider unavailable returns honest status and fallback
@pytest.mark.asyncio
async def test_02_ai_provider_unavailable():
    with patch("httpx.AsyncClient.get", side_effect=Exception("Connection refused")):
        status = await ai_provider.check_status()
        assert status.available is False
        assert "unreachable" in status.details.lower() or "not installed" in status.details.lower()
        assert len(status.setup_instructions) > 0

# 3. Valid PDF extraction
def test_03_valid_pdf_extraction(tmp_path):
    pdf_path = tmp_path / "valid_test.pdf"
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "CS101 Final Exam is scheduled on 2026-11-15. Please review chapter 4.")
    doc.save(str(pdf_path))
    doc.close()

    res = document_service.extract_text_from_pdf(pdf_path)
    assert res.is_scanned is False
    assert "CS101 Final Exam" in res.text
    assert res.char_count > 0

# 4. Malformed PDF handling
def test_04_malformed_pdf_handling(tmp_path):
    bad_pdf = tmp_path / "corrupted.pdf"
    bad_pdf.write_bytes(b"%PDF-1.4 garbage invalid binary content not a real pdf")

    with pytest.raises(Exception):
        document_service.extract_text_from_pdf(bad_pdf)

# 5. TXT extraction
def test_05_txt_extraction(tmp_path):
    txt_path = tmp_path / "notes.txt"
    txt_path.write_text("Acme Corp invoice payment due on 2026-10-31. Amount: $450.00", encoding="utf-8")

    res = document_service.extract_text_from_txt(txt_path)
    assert res.is_scanned is False
    assert "$450.00" in res.text
    assert res.char_count > 0

# 6. Summary response validation
@pytest.mark.asyncio
async def test_06_summary_response_validation():
    sample_text = "The team concluded the sprint on Friday. All unit tests passed. Action: Prepare release notes."
    
    # Mocking Gemma 3 4B response
    mock_ai_output = {
        "suggested_title": "Sprint Conclusion Report",
        "summary": "The team successfully wrapped up the sprint with passing tests.",
        "action_items": ["Prepare release notes"],
        "deadlines": []
    }
    with patch.object(ai_provider, "_call_ollama", AsyncMock(return_value=str(mock_ai_output).replace("'", '"'))):
        res, is_ai, src = await ai_provider.summarize("Sprint_Notes.txt", sample_text)
        assert res.suggested_title == "Sprint Conclusion Report"
        assert len(res.action_items) == 1
        assert is_ai is True

# 7. Deadline extraction validation
@pytest.mark.asyncio
async def test_07_deadline_extraction_validation():
    text = "The application proposal must be submitted by 2026-10-25 at 17:00."
    deadlines = ai_provider._fallback_extract_deadlines(text)
    assert len(deadlines) >= 1
    assert deadlines[0].due_date == "2026-10-25"

# 8. Task creation and completion
def test_08_task_creation_and_completion(client, db_session):
    create_payload = {
        "title": "Review Quarterly Financials",
        "description": "Cross-check expense receipts",
        "due_date": "2026-10-28",
        "priority": "High"
    }
    res = client.post("/api/tasks", json=create_payload)
    assert res.status_code == 200
    task_data = res.json()
    task_id = task_data["id"]
    assert task_data["completed"] is False
    assert task_data["priority"] == "High"

    # Mark complete
    patch_res = client.patch(f"/api/tasks/{task_id}", json={"completed": True})
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["completed"] is True
    assert updated["completed_at"] is not None

# 9. Duplicate task prevention
def test_09_duplicate_task_prevention(db_session):
    t_in = TaskCreate(
        title="Pay Cloud Hosting Bill",
        due_date="2026-10-30",
        source_document_id="doc-123"
    )
    t1, created1 = task_service.create_task(db_session, t_in)
    assert created1 is True

    # Same task again
    t2, created2 = task_service.create_task(db_session, t_in)
    assert created2 is False
    assert t1.id == t2.id

# 10. File classification
@pytest.mark.asyncio
async def test_10_file_classification():
    res = ai_provider._fallback_categorize("invoice_acme_2026.pdf", "Invoice total due $500")
    assert res.category == "Finance"

    res_edu = ai_provider._fallback_categorize("syllabus_fall2026.txt", "Course curriculum and homework grading")
    assert res_edu.category == "Education"

# 11. Rename proposals
@pytest.mark.asyncio
async def test_11_rename_proposals():
    res = ai_provider._fallback_categorize("messy receipt oct 19.txt", "Store receipt subtotal $12.50")
    assert res.suggested_filename.startswith("Receipt_")
    assert res.suggested_filename.endswith(".txt")

# 12. Filename collisions
def test_12_filename_collisions(tmp_path):
    target = tmp_path / "document.txt"
    target.write_text("original content")

    safe_path = file_operation_service.get_collision_safe_path(target)
    assert safe_path != target
    assert safe_path.name == "document_1.txt"

# 13. Path traversal prevention
def test_13_path_traversal_prevention():
    with pytest.raises(Exception):
        file_operation_service.validate_safe_path("../../../etc/passwd")

    with pytest.raises(Exception):
        file_operation_service.validate_safe_path("/var/root/secret.key")

# 14. Approval required before file operations
def test_14_approval_required(client, tmp_path, db_session):
    src_file = settings.STORAGE_DIR / "unapproved.txt"
    src_file.write_text("pending approval")

    exec_payload = {
        "batch_id": "test-batch-001",
        "items": [
            {
                "document_id": "dummy-id",
                "current_path": str(src_file),
                "target_relative_path": "Documents/unapproved.txt",
                "approved": False  # Not approved!
            }
        ]
    }
    res = client.post("/api/organization/execute", json=exec_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["executed_count"] == 0
    assert data["skipped_count"] == 1
    # File should remain at source
    assert src_file.exists()

# 15. File operation execution
def test_15_file_operation_execution(client, db_session):
    src_file = settings.STORAGE_DIR / "approved_doc.txt"
    src_file.write_text("ready to move")

    exec_payload = {
        "batch_id": "test-batch-002",
        "items": [
            {
                "document_id": "doc-002",
                "current_path": str(src_file),
                "target_relative_path": "Documents/approved_doc.txt",
                "approved": True
            }
        ]
    }
    res = client.post("/api/organization/execute", json=exec_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["executed_count"] == 1
    assert data["can_undo"] is True
    dest = settings.STORAGE_DIR / "Documents" / "approved_doc.txt"
    assert dest.exists()

# 16. File operation undo
def test_16_file_operation_undo(client, db_session):
    src_file = settings.STORAGE_DIR / "doc_to_undo.txt"
    src_file.write_text("content to be undone")

    batch_id = "test-batch-undo-001"
    exec_payload = {
        "batch_id": batch_id,
        "items": [
            {
                "document_id": "doc-undo-1",
                "current_path": str(src_file),
                "target_relative_path": "Documents/doc_to_undo.txt",
                "approved": True
            }
        ]
    }
    exec_res = client.post("/api/organization/execute", json=exec_payload)
    assert exec_res.status_code == 200

    undo_payload = {"batch_id": batch_id}
    res = client.post("/api/organization/undo", json=undo_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["undone_count"] == 1
    # Original file restored
    assert src_file.exists()

# 17. Unauthorized filesystem access rejection
def test_17_unauthorized_filesystem_access(client):
    exec_payload = {
        "batch_id": "evil-batch",
        "items": [
            {
                "document_id": "hack",
                "current_path": "/etc/shadow",
                "target_relative_path": "hacked.txt",
                "approved": True
            }
        ]
    }
    res = client.post("/api/organization/execute", json=exec_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["failed_count"] == 1
    assert "Access denied" in data["results"][0]["message"] or "outside permitted" in data["results"][0]["message"]

# 18. Activity logging
def test_18_activity_logging(client, db_session):
    res = client.get("/api/activity")
    assert res.status_code == 200
    activities = res.json()
    assert isinstance(activities, list)

# 19. Morning briefing generation
@pytest.mark.asyncio
async def test_19_morning_briefing_generation(client, db_session):
    # Add a sample task
    t_in = TaskCreate(
        title="Urgent Deliverable",
        due_date="2026-10-20",
        priority="High"
    )
    task_service.create_task(db_session, t_in)

    res = client.post("/api/briefing/generate")
    assert res.status_code == 200
    briefing = res.json()
    assert len(briefing["top_priorities"]) > 0
    assert len(briefing["suggested_actions"]) > 0
    assert "sloth_quote" in briefing

# 20. Empty-state behavior
def test_20_empty_state_behavior(client, db_session):
    db_session.query(Task).delete()
    db_session.query(Document).delete()
    db_session.commit()

    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_tasks"] == 0
    assert stats["pending_tasks"] == 0

    docs_res = client.get("/api/documents")
    assert docs_res.status_code == 200
    assert docs_res.json() == []

# 21. Export and data clearing
def test_21_export_and_data_clearing(client, db_session):
    # Create sample task
    task_service.create_task(db_session, TaskCreate(title="Sample Export Task"))

    # Test export
    exp_res = client.post("/api/settings/export")
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert "tasks" in exp_data
    assert "documents" in exp_data

    # Test clear
    clear_res = client.post("/api/settings/clear", json={"confirm": True})
    assert clear_res.status_code == 200
    assert clear_res.json()["status"] == "success"

    # Verify cleared
    assert client.get("/api/tasks").json() == []
