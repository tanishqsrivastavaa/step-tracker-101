"""Database engine, connection-string normalization, and session helper."""

from __future__ import annotations

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import settings


def normalize_db_url(url: str) -> str:
    """Rewrite a Supabase-style URL to the driver SQLAlchemy expects.

    Supabase gives you `postgresql://...` (and some tools emit `postgres://...`).
    SQLAlchemy needs the driver spelled out, so we rewrite the scheme to
    `postgresql+psycopg://...` (psycopg v3). Any already-correct URL is returned
    unchanged so this is safe to run every time.
    """
    if url.startswith("postgresql+psycopg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    return url


# pool_pre_ping guards against Supabase free-tier pausing / dropping idle
# connections: a stale connection is detected and replaced instead of erroring.
engine = create_engine(
    normalize_db_url(settings.database_url),
    pool_pre_ping=True,
)


def create_db_and_tables() -> None:
    """Create tables from the SQLModel metadata if they don't exist.

    Good enough for a hobby project. The README notes Alembic as the upgrade path
    once the schema starts changing in ways create_all can't handle.
    """
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a database session."""
    with Session(engine) as session:
        yield session
