# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime Environment
FROM python:3.13-slim
WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ ./backend

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy sample files
COPY sample_files/ ./sample_files

WORKDIR /app/backend

ENV ENVIRONMENT=production
ENV PORT=8000
ENV HOST=0.0.0.0
ENV DATABASE_URL=sqlite:////app/backend/data/slothdesk.db

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
