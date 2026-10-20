#!/bin/bash
set -e

echo "=== Building SlothDesk AI Frontend ==="
cd "$(dirname "$0")/../frontend"
npm run build

echo ""
echo "=== Verifying Backend Dependencies ==="
cd "../backend"
if [ -d "../../.venv" ]; then
  PYTHON="../../.venv/bin/python"
else
  PYTHON="python3"
fi

$PYTHON -c "from app.main import app; print('Backend loaded successfully!')"

echo ""
echo "✅ SlothDesk AI Build Completed!"
