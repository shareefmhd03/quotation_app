#!/usr/bin/env bash
# Start the Quotation App (API + frontend on http://localhost:8000).
set -e
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "Creating virtualenv..."
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip -q
  .venv/bin/pip install -r backend/requirements.txt
fi

# Seed default template + samples on first run (idempotent).
.venv/bin/python backend/seed.py

cd backend
exec ../.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
