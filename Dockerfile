# Quotation App — single container serving the FastAPI API + static frontend.
FROM python:3.12-slim

# System libraries required by WeasyPrint (PDF rendering) + fonts.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz-subset0 \
        libgdk-pixbuf-2.0-0 \
        libffi8 \
        shared-mime-info \
        fonts-dejavu-core \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    QUOTE_DATA_DIR=/data

WORKDIR /app

# Install Python deps first for better layer caching.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# App code (frontend + backend). See .dockerignore for exclusions.
COPY . .

# Persistent data (SQLite DB + uploads) lives here; mount a disk at /data in prod.
RUN mkdir -p /data
VOLUME ["/data"]

WORKDIR /app/backend
EXPOSE 8000

# Seed default company/templates/products (idempotent), then start the server.
# Render/host injects $PORT; default to 8000 for local runs.
CMD ["sh", "-c", "python seed.py || true; exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
