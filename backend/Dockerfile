# Backend image for Railway/Render. Based on the official uv image so the build
# matches local dev exactly (same uv, same Python 3.12, same locked deps).
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Install dependencies first, in their own layer, from the committed lockfile.
# Copying only the manifests means this layer is cached until deps change.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev

# App code (changes often — kept after the deps layer for better caching).
COPY app ./app

# Railway/Render inject $PORT at runtime; default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

# Run the venv's uvicorn directly (no uv at runtime). Shell form so $PORT expands.
CMD .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
