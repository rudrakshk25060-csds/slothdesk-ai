# SlothDesk AI API Reference

The SlothDesk AI backend exposes an interactive OpenAPI specification accessible at `http://localhost:8000/docs` and `http://localhost:8000/redoc`.

## Summary of Endpoints

### System & Health
- `GET /api/health` — Basic health check returning status, version, and environment.
- `GET /api/ready` — Verifies SQLite database read/write access and storage folder writeability.
- `GET /api/stats` — Real-time productivity statistics (files organized, documents summarized, deadlines detected, task completion rate).
- `GET /api/ai/status` — Checks local Ollama status and availability of model `gemma3:4b`.

### Documents
- `GET /api/documents` — List workspace documents with optional category and search filters.
- `POST /api/documents/import` — Multipart file upload (PDF, TXT, MD, CSV) with safe filesystem naming.
- `GET /api/documents/{id}` — Fetch document metadata, character count, and summary.
- `POST /api/documents/{id}/summarize` — Generate executive summary, action items, and title with Gemma 3 4B.
- `POST /api/documents/{id}/extract-deadlines` — Extract dates from text and optionally sync to tasks.
- `DELETE /api/documents/{id}` — Delete document record and purge disk file.

### File Organization
- `POST /api/organization/plan` — Generate proposed folder assignments and standardized clean filenames.
- `POST /api/organization/execute` — Execute user-approved file moves/renames with collision safety.
- `POST /api/organization/undo` — Reverse all file operations associated with a batch ID.

### Tasks & Deadlines
- `GET /api/tasks` — List tasks with status, priority, and search filters.
- `POST /api/tasks` — Create task with automatic content-hash deduplication.
- `PATCH /api/tasks/{id}` — Update task details or toggle completion status.
- `DELETE /api/tasks/{id}` — Remove task from database.

### Morning Briefing
- `POST /api/briefing/generate` — Synthesize top 3 priorities, tasks due today, upcoming deadlines, and encouraging sloth philosophy.
- `GET /api/briefing/latest` — Fetch latest generated daily briefing.

### Activity History & Settings
- `GET /api/activity` — Retrieve chronological audit log of all system events.
- `DELETE /api/activity` — Clear audit logs.
- `GET /api/settings` — Read configuration and privacy settings.
- `POST /api/settings/export` — Export complete JSON snapshot of all application data.
- `POST /api/settings/clear` — Wipe all data and files with required confirmation.
- `POST /api/demo/load` — 1-click seeding of fictional demo workspace.
