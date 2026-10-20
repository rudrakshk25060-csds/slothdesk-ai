#!/bin/bash
set -e

TARGET_SCRIPT="$0"
while [ -L "$TARGET_SCRIPT" ]; do
  TARGET_DIR="$(cd "$(dirname "$TARGET_SCRIPT")" && pwd -P)"
  TARGET_SCRIPT="$(readlink "$TARGET_SCRIPT")"
  [[ $TARGET_SCRIPT != /* ]] && TARGET_SCRIPT="$TARGET_DIR/$TARGET_SCRIPT"
done
SCRIPT_DIR="$(cd "$(dirname "$TARGET_SCRIPT")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

echo "🦥 Seeding SlothDesk AI Demo Workspace with sample fictional documents..."
cd "$PROJECT_ROOT/backend"
if [ -d "$PROJECT_ROOT/../.venv" ]; then
  PYTHON="$PROJECT_ROOT/../.venv/bin/python"
  UVICORN="$PROJECT_ROOT/../.venv/bin/uvicorn"
elif [ -d "$PROJECT_ROOT/.venv" ]; then
  PYTHON="$PROJECT_ROOT/.venv/bin/python"
  UVICORN="$PROJECT_ROOT/.venv/bin/uvicorn"
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
