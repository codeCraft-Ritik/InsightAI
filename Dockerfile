# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements & install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV DATABASE_PATH=/app/backend/database/insightai.sqlite3
ENV UPLOADS_DIR=/app/backend/uploads
ENV REPORTS_DIR=/app/backend/reports
ENV VECTORSTORE_DIR=/app/backend/vectorstores
ENV MODELS_DIR=/app/backend/models_saved

# Expose port
EXPOSE 8000

# Run FastAPI with Uvicorn
WORKDIR /app/backend
CMD ["sh", "-c", "python -m uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
