#!/usr/bin/env bash
set -e

# Configurable port: CLI argument > $PORT env var > default 8090
PORT="${1:-${PORT:-8090}}"

echo "🎬 Starting StripBoard Optimizer Application..."
echo "=================================================="

# Check if dist exists, if not build it
if [ ! -d "frontend/dist" ]; then
  echo "📦 Building frontend SPA assets..."
  cd frontend && npm run build && cd ..
fi

echo "🚀 Launching FastAPI Gateway & StripBoard Optimizer Server..."
echo "👉 Web Application: http://localhost:${PORT}"
echo "👉 REST API Docs:   http://localhost:${PORT}/docs"
echo "👉 Health Status:   http://localhost:${PORT}/health"
echo "=================================================="

PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT}"
