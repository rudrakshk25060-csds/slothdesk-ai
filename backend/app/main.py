import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db
from app.services.demo_service import demo_service
from app.routers import (
    health,
    documents,
    organization,
    tasks,
    briefing,
    activity,
    settings as settings_router,
    demo,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    init_db()
    # Initialize sample files
    demo_service.initialize_sample_files()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SlothDesk AI — Do less busywork. Get more of your day back. Local-first personal productivity agent powered by Google Gemma 3 4B.",
    lifespan=lifespan
)

# CORS configuration for development with Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(documents.router)
app.include_router(organization.router)
app.include_router(tasks.router)
app.include_router(briefing.router)
app.include_router(activity.router)
app.include_router(settings_router.router)
app.include_router(demo.router)

# Mount frontend build static directory if present
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def index():
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "online",
            "docs": "/docs",
            "note": "Frontend dist not built yet. Run 'npm run build' inside frontend/ to serve the UI statically, or run 'npm run dev' for development."
        }
