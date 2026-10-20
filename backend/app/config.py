import os
from pathlib import Path
from pydantic import BaseModel, Field

class Settings(BaseModel):
    APP_NAME: str = "SlothDesk AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent / "data")
    STORAGE_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent / "data" / "storage")
    SAMPLE_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "sample_files")
    
    # SQLite
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", 
            f"sqlite:///{Path(__file__).resolve().parent.parent / 'data' / 'slothdesk.db'}"
        )
    )
    
    # Ollama / Gemma 3 4B configuration
    OLLAMA_BASE_URL: str = Field(default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
    OLLAMA_MODEL: str = Field(default_factory=lambda: os.getenv("OLLAMA_MODEL", "gemma3:4b"))
    OLLAMA_TIMEOUT_SECONDS: float = Field(default_factory=lambda: float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "30.0")))
    
    # Limits & safety
    MAX_DOCUMENT_SIZE_MB: int = Field(default_factory=lambda: int(os.getenv("MAX_DOCUMENT_SIZE_MB", "15")))
    MAX_DOCUMENT_CHARS: int = Field(default_factory=lambda: int(os.getenv("MAX_DOCUMENT_CHARS", "40000")))
    
    # Demo & Privacy
    DEMO_MODE: bool = Field(default_factory=lambda: os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes"))
    ALLOW_FALLBACK: bool = True

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
