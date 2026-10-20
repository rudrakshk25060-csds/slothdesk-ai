#!/bin/bash
set -e

# Resolve target of symlink if called through symlink
TARGET_SCRIPT="$0"
while [ -L "$TARGET_SCRIPT" ]; do
  TARGET_DIR="$(cd "$(dirname "$TARGET_SCRIPT")" && pwd -P)"
  TARGET_SCRIPT="$(readlink "$TARGET_SCRIPT")"
  [[ $TARGET_SCRIPT != /* ]] && TARGET_SCRIPT="$TARGET_DIR/$TARGET_SCRIPT"
done
SCRIPT_DIR="$(cd "$(dirname "$TARGET_SCRIPT")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

echo "=== Running Backend Tests (pytest) ==="
cd "$PROJECT_ROOT/backend"
if [ -d "$PROJECT_ROOT/../.venv" ]; then
  PYTEST="$PROJECT_ROOT/../.venv/bin/pytest"
elif [ -d "$PROJECT_ROOT/.venv" ]; then
  PYTEST="$PROJECT_ROOT/.venv/bin/pytest"
else
  PYTEST="pytest"
fi

$PYTEST tests -v

echo ""
echo "=== Running Frontend Tests (vitest) ==="
cd "$PROJECT_ROOT/frontend"
npm run test

echo ""
echo "✅ All Backend & Frontend Tests Passed Successfully!"
