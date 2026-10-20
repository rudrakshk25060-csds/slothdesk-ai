#!/bin/bash
set -e

echo "🦥 Seeding SlothDesk AI Demo Workspace with sample fictional documents..."
cd "$(dirname "$0")/../backend"
if [ -d "../../.venv" ]; then
  PYTHON="../../.venv/bin/python"
  UVICORN="../../.venv/bin/uvicorn"
else
  PYTHON="python3"
  UVICORN="uvicorn"
fi

$PYTHON -c "
from app.database import init_db, SessionLocal
from app.services.demo_service import demo_service
init_db()
db = SessionLocal()
res = demo_service.load_demo_workspace(db)
db.close()
print('Demo workspace seeded successfully:', res)
"

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

echo ""
echo "🚀 Starting SlothDesk AI at http://localhost:$PORT ..."
exec $UVICORN app.main:app --host "$HOST" --port "$PORT"
