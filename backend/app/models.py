"""Database tables: users and step_entries."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    # Named "users" (not "user") because `user` is a reserved word in Postgres.
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    # Secret bearer token, auto-generated with secrets.token_urlsafe on creation.
    token: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=_utcnow)


class StepEntry(SQLModel, table=True):
    __tablename__ = "step_entries"
    # One row per person per local day — repeated submissions upsert this row.
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    # Local calendar day as "YYYY-MM-DD". Stored as a string so it's tied to the
    # user's day, independent of any server timezone. ISO strings also sort
    # chronologically, which the leaderboard range queries rely on.
    date: str = Field(index=True)
    steps: int
    source: str = Field(default="manual")  # manual | shortcut | android | app
    updated_at: datetime = Field(default_factory=_utcnow)
