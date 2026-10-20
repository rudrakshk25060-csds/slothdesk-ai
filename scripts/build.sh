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

echo "=== Building SlothDesk AI Frontend ==="
cd "$PROJECT_ROOT/frontend"
npm run build

echo ""
echo "=== Verifying Backend Dependencies ==="
cd "$PROJECT_ROOT/backend"
if [ -d "$PROJECT_ROOT/../.venv" ]; then
  PYTHON="$PROJECT_ROOT/../.venv/bin/python"
elif [ -d "$PROJECT_ROOT/.venv" ]; then
  PYTHON="$PROJECT_ROOT/.venv/bin/python"
else
  PYTHON="python3"
fi

$PYTHON -c "from app.main import app; print('Backend loaded successfully!')"

echo ""
echo "✅ SlothDesk AI Build Completed!"
