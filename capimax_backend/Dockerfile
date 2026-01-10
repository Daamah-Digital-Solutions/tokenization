# =============================================================================
# CAPIMAX BACKEND PRODUCTION DOCKERFILE
# =============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=capimax_backend.settings.production

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        curl \
        netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash capimax \
    && chown -R capimax:capimax /app
USER capimax

# Copy requirements and install Python dependencies
COPY --chown=capimax:capimax requirements.txt requirements-prod.txt ./
RUN pip install --user --no-cache-dir -r requirements-prod.txt

# Add user's pip to PATH
ENV PATH=/home/capimax/.local/bin:$PATH

# Copy project files
COPY --chown=capimax:capimax . .

# Create necessary directories
RUN mkdir -p staticfiles media logs

# Collect static files (will run again at container start with env vars)
RUN python manage.py collectstatic --noinput --settings=capimax_backend.settings.development 2>/dev/null || true

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Start server
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "gevent", "--worker-connections", "1000", "--timeout", "30", "--keep-alive", "2", "--max-requests", "1000", "--max-requests-jitter", "100", "capimax_backend.wsgi:application"]