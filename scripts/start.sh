#!/bin/bash
set -e

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

cd "$(dirname "$0")/../backend"
if [ -d "../../.venv" ]; then
  UVICORN="../../.venv/bin/uvicorn"
else
  UVICORN="uvicorn"
fi

echo "🦥 Starting SlothDesk AI Server on http://$HOST:$PORT ..."
exec $UVICORN app.main:app --host "$HOST" --port "$PORT" --reload
