# Build Arguments for flexible configuration
ARG ENVIRONMENT=production
ARG DJANGO_PORT=8001
ARG DAPHNE_PORT=8003

# Frontend Build Stage
FROM node:22-slim AS frontend-build

# Set working directory
WORKDIR /app/frontend

# Set environment variables for build
ENV NODE_ENV=production \
    CI=false

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies with legacy peer deps for React 19 compatibility
RUN npm ci --include=dev --legacy-peer-deps

# Copy frontend application
COPY frontend/ ./

# Build frontend with production settings
RUN npm run build

# Backend Stage
FROM python:3-slim

# Build arguments passed to backend stage
ARG ENVIRONMENT
ARG DJANGO_PORT
ARG DAPHNE_PORT

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=${ENVIRONMENT} \
    DJANGO_PORT=${DJANGO_PORT} \
    DAPHNE_PORT=${DAPHNE_PORT}

# Install system dependencies including Chrome + Chromedriver (auto-detect version)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    wget \
    unzip \
    curl \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2t64 \
    libnss3 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm-dev \
    libxshmfence1 \
    libatk-bridge2.0-0t64 \
    libatk1.0-0 \
    libgtk-3-0t64 \
    # Add supervisor for process management
    gettext \
    netcat-traditional

# Upgrade pip and install Python dependencies
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Force uv to use the system Python and place venv outside /app
ENV UV_PYTHON=/usr/local/bin/python \
    UV_PROJECT_ENVIRONMENT=/opt/venv

# Copy project definition
COPY backend/pyproject.toml backend/uv.lock /app/

# Install Python dependencies
RUN uv sync --frozen

# Place executables in the environment at the front of the path
ENV PATH="/opt/venv/bin:$PATH"

# Copy backend application
COPY backend/ /app/

# Create frontend-build directory and copy built frontend files
RUN mkdir -p /app/frontend-build
COPY --from=frontend-build /app/frontend/dist/ /app/frontend-build/

# Create necessary directories with proper permissions
RUN mkdir -p /app/static /app/media /app/logs && \
    chmod -R 755 /app/frontend-build /app/static /app/media && \
    chmod 755 /app/logs

# Create non-root user for security
RUN groupadd -r django && useradd -r -g django django

# Change ownership of necessary directories to django user
RUN chown -R django:django /app/static /app/media /app/logs /app/frontend-build

# Switch to non-root user
USER django

# Expose port
EXPOSE ${DJANGO_PORT}

# Default command - can be overridden in docker-compose
CMD ["gunicorn", "--bind", "0.0.0.0:8001", "--workers", "2", "core.wsgi:application"]