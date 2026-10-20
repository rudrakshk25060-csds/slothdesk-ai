#!/bin/bash
set -e

echo "=== Running Backend Tests (pytest) ==="
cd "$(dirname "$0")/../backend"
if [ -d "../../.venv" ]; then
  PYTHON="../../.venv/bin/python"
  PYTEST="../../.venv/bin/pytest"
else
  PYTHON="python3"
  PYTEST="pytest"
fi

$PYTEST tests -v

echo ""
echo "=== Running Frontend Tests (vitest) ==="
cd "../frontend"
npm run test

echo ""
echo "✅ All Backend & Frontend Tests Passed Successfully!"
