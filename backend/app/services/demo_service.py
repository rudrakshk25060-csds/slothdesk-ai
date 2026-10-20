import os
import shutil
from pathlib import Path
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Document, Task, Activity, FileOperation, Briefing, Setting
from app.schemas import TaskCreate
from app.services.task_service import task_service
from app.services.audit_service import audit_service
from app.services.document_service import document_service

# Fictional sample files content
SAMPLE_FILES_DATA = {
    "CS101_Fall2026_Syllabus.txt": """COURSE SYLLABUS: CS101 - Introduction to Algorithms & Systems
Instructor: Dr. Maya Lin (Office: Turing Hall 304)
Term: Fall Semester 2026

Course Overview:
This course provides a comprehensive introduction to computational thinking, asymptotic runtime analysis, data structures, and safe concurrency.

Important Course Milestones & Deadlines:
1. Assignment 1: Runtime Complexity Analysis due on 2026-10-24 at 23:59.
2. Project Proposal: System Architecture Draft due on 2026-10-28 at 17:00.
3. Midterm Examination: In-person hall testing on 2026-11-04 at 10:00 AM.
4. Final Capstone Submission: Complete open-source project submission due on 2026-11-20.

Grading Policy:
Assignments 30%, Midterm 25%, Final Capstone 35%, Active Participation 10%.
Please submit all work via the student portal on time.
""",

    "AcmeCorp_Invoice_INV-2026-881.txt": """INVOICE #INV-2026-881
Acme Cloud Services LLC
100 Innovation Way, Suite 400
San Francisco, CA 94105

Billed To:
SlothDesk Demo Client
Project Code: HACKTOBER-W3

Invoice Date: October 18, 2026
Payment Due Date: 2026-10-27

Line Items:
1. High-Performance Compute Cluster (Gemma 3 local sandbox) - $120.00
2. Storage Allocation (Local encrypted volumes 50GB) - $15.00
3. Technical Advisory & Security Audit - $250.00

Subtotal: $385.00
Taxes (0%): $0.00
Total Due: $385.00 USD

Payment Instructions:
Please remit payment via ACH or corporate wire transfer by 2026-10-27.
Late payments will incur a 1.5% fee per billing cycle.
""",

    "Freelance_Design_Agreement.txt": """MUTUAL INDEPENDENT CONTRACTOR AGREEMENT
Date: October 15, 2026
Parties: Studio Sloth ("Client") and Alex Mercer ("Designer")

Scope of Work:
Designer agrees to deliver high-fidelity UI/UX mockups, design tokens, and SVG icon assets for the desktop application "SlothDesk AI".

Deliverables and Key Dates:
- Wireframes & Color Palette: Due by 2026-10-22
- Interactive Prototype & Component Library: Due by 2026-10-26
- Final Icon Set & Brand Package: Due by 2026-10-31

Compensation:
Total fee of $2,400 payable in three installments upon milestone completion.
All intellectual property rights transfer to Client upon final payment.
""",

    "BlueBottleCoffee_Receipt_Oct2026.txt": """BLUE BOTTLE COFFEE
Store #104 - Ferry Building
San Francisco, CA

Date: 2026-10-19 08:42 AM
Register: 02 | Cashier: Sam

1x Hayes Valley Espresso - $4.50
1x Oat Milk Cortado - $5.75
1x Organic Almond Croissant - $4.75

Subtotal: $15.00
Sales Tax (8.625%): $1.29
Total: $16.29 USD

Payment: Visa ending in 4082 (Contactless)
Auth Code: 894122
Thank you for visiting Blue Bottle!
""",

    "Scanned_Archived_Memo_Sample.txt": """[SCANNED DOCUMENT PREVIEW]
Header: Confidential Board Minutes (Physical Print Archive - 1998)
Notice: This document contains low-contrast rasterized scan artifacts.
Status: Physical page scan without optical character recognition layer.
"""
}

class DemoService:
    @staticmethod
    def initialize_sample_files():
        """Ensures sample files exist on disk in sample_files directory."""
        settings.SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
        for fname, content in SAMPLE_FILES_DATA.items():
            fpath = settings.SAMPLE_DIR / fname
            if not fpath.exists():
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(content)

    @staticmethod
    def load_demo_workspace(db: Session) -> Dict[str, Any]:
        """
        Clears and seeds a rich, clean demo workspace with sample documents, tasks, and history.
        Allows reviewers to test the entire application with 1 click.
        """
        DemoService.initialize_sample_files()

        # Clear existing demo records
        db.query(Task).delete()
        db.query(Document).delete()
        db.query(Activity).delete()
        db.query(FileOperation).delete()
        db.query(Briefing).delete()
        db.commit()

        # Clean storage dir
        if settings.STORAGE_DIR.exists():
            for item in settings.STORAGE_DIR.iterdir():
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)

        created_docs = []

        # Seed sample documents
        for fname, content in SAMPLE_FILES_DATA.items():
            dest = settings.STORAGE_DIR / fname
            with open(dest, "w", encoding="utf-8") as f:
                f.write(content)

            is_scanned = "Scanned" in fname
            doc = Document(
                filename=fname,
                original_name=fname,
                file_path=str(dest),
                file_size=len(content.encode("utf-8")),
                mime_type="text/plain",
                category="Other",
                extracted_text="" if is_scanned else content,
                char_count=0 if is_scanned else len(content),
                is_scanned=is_scanned,
                ocr_needed_reason="This PDF contains scanned pages or images without an embedded text layer. OCR processing is required." if is_scanned else None,
                is_ai_processed=False
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            created_docs.append(doc)

        # Seed some initial tasks
        sample_tasks = [
            TaskCreate(
                title="Submit Assignment 1: Runtime Complexity Analysis",
                description="CS101 Algorithm assignment due via student portal.",
                due_date="2026-10-24",
                due_time="23:59",
                priority="High",
                source_document_title="CS101_Fall2026_Syllabus.txt"
            ),
            TaskCreate(
                title="Review & Remit AcmeCorp Cloud Services Invoice",
                description="Wire transfer $385.00 USD before late fee applies.",
                due_date="2026-10-27",
                due_time="17:00",
                priority="High",
                source_document_title="AcmeCorp_Invoice_INV-2026-881.txt"
            ),
            TaskCreate(
                title="Approve Design Tokens & Component Library",
                description="Review interactive prototype from contractor Alex Mercer.",
                due_date="2026-10-26",
                due_time="18:00",
                priority="Medium",
                source_document_title="Freelance_Design_Agreement.txt"
            ),
            TaskCreate(
                title="File Ferry Building Coffee Expense Receipt",
                description="Submit Blue Bottle receipt $16.29 for weekly reimbursement.",
                due_date="2026-10-30",
                priority="Low",
                source_document_title="BlueBottleCoffee_Receipt_Oct2026.txt"
            )
        ]

        for st in sample_tasks:
            task_service.create_task(db, st)

        # Log initial demo audit
        audit_service.log(
            db=db,
            action_type="demo_load",
            title="Loaded SlothDesk Demo Workspace",
            details=f"Seeded {len(created_docs)} sample files and {len(sample_tasks)} initial tasks.",
            status="success"
        )

        return {
            "status": "success",
            "message": "Demo workspace loaded successfully with fictional sample documents and tasks.",
            "documents_count": len(created_docs),
            "tasks_count": len(sample_tasks)
        }

demo_service = DemoService()
