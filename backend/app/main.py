"""Steps Leaderboard API.

Step counts enter the system through one stable contract — POST /steps — called
by interchangeable clients (manual web form, Apple Shortcut, later a native app).
Everything else is built around that endpoint.
"""

from __future__ import annotations

import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from .auth import get_current_user, require_admin
from .config import settings
from .db import create_db_and_tables, get_session
from .models import StepEntry, User
from .schemas import LeaderRow, NewUserIn, NewUserOut, StepIn, StepOut, TodayOut
from .timeutil import period_bounds, today_local


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup. (Alembic is the upgrade path — see README.)
    create_db_and_tables()
    yield


app = FastAPI(title="Steps Leaderboard", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health() -> dict[str, bool]:
    """Health check — also used by the Supabase keep-alive heartbeat."""
    return {"ok": True}


@app.get("/today", response_model=TodayOut)
def today() -> TodayOut:
    """The canonical group date used by leaderboard period filters."""
    return TodayOut(date=today_local().isoformat(), timezone=settings.timezone)


@app.post("/steps", response_model=StepOut)
def submit_steps(
    body: StepIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StepEntry:
    """Upsert the caller's step count for a given local day.

    Repeated calls for the same (user, date) — e.g. an hourly Shortcut — overwrite
    the existing row rather than creating duplicates.
    """
    entry = session.exec(
        select(StepEntry).where(
            StepEntry.user_id == user.id, StepEntry.date == body.date
        )
    ).first()

    if entry is None:
        entry = StepEntry(
            user_id=user.id,
            date=body.date,
            steps=body.steps,
            source=body.source,
        )
        session.add(entry)
        try:
            session.commit()
        except IntegrityError:
            # A concurrent request inserted the same (user, date) first. Fall back
            # to updating that now-existing row so the last write wins.
            session.rollback()
            entry = session.exec(
                select(StepEntry).where(
                    StepEntry.user_id == user.id, StepEntry.date == body.date
                )
            ).one()
            _apply_update(entry, body)
            session.commit()
    else:
        _apply_update(entry, body)
        session.commit()

    session.refresh(entry)
    return entry


def _apply_update(entry: StepEntry, body: StepIn) -> None:
    entry.steps = body.steps
    entry.source = body.source
    entry.updated_at = datetime.now(timezone.utc)


@app.get("/me", response_model=list[StepOut])
def my_entries(
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[StepEntry]:
    """The caller's recent entries, most recent first (default last 30 days)."""
    cutoff = (today_local() - timedelta(days=days - 1)).isoformat()
    entries = session.exec(
        select(StepEntry)
        .where(StepEntry.user_id == user.id, StepEntry.date >= cutoff)
        .order_by(StepEntry.date.desc())  # type: ignore[attr-defined]
    ).all()
    return list(entries)


@app.get("/leaderboard", response_model=list[LeaderRow])
def leaderboard(
    period: str = Query(default="week", pattern="^(day|week|month|all)$"),
    session: Session = Depends(get_session),
) -> list[LeaderRow]:
    """Sum steps per user over the period, ranked descending. Public."""
    start, end = period_bounds(period)

    total = func.sum(StepEntry.steps)
    stmt = (
        select(User.name, total.label("steps"))
        .join(StepEntry, StepEntry.user_id == User.id)
        .group_by(User.id, User.name)
        .order_by(total.desc())
    )
    if start is not None:
        stmt = stmt.where(StepEntry.date >= start, StepEntry.date <= end)

    rows = session.exec(stmt).all()
    return [
        LeaderRow(rank=i + 1, name=name, steps=int(steps))
        for i, (name, steps) in enumerate(rows)
    ]


@app.post("/users", response_model=NewUserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: NewUserIn,
    session: Session = Depends(get_session),
    _: None = Depends(require_admin),
) -> User:
    """Admin only. Create a friend and return their freshly minted token."""
    user = User(name=body.name.strip(), token=secrets.token_urlsafe(24))
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user named {body.name!r} already exists.",
        ) from exc
    session.refresh(user)
    return user
