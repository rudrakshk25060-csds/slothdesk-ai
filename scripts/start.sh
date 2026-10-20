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

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

cd "$PROJECT_ROOT/backend"
if [ -d "$PROJECT_ROOT/../.venv" ]; then
  UVICORN="$PROJECT_ROOT/../.venv/bin/uvicorn"
elif [ -d "$PROJECT_ROOT/.venv" ]; then
  UVICORN="$PROJECT_ROOT/.venv/bin/uvicorn"
else
  UVICORN="uvicorn"
fi

echo "🦥 Starting SlothDesk AI Server on http://$HOST:$PORT ..."
exec $UVICORN app.main:app --host "$HOST" --port "$PORT" --reload
