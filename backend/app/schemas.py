"""Request/response models for the API (separate from the DB tables)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Source = Literal["manual", "shortcut", "android", "app"]

DATE_RE = r"^\d{4}-\d{2}-\d{2}$"


class StepIn(BaseModel):
    """Body of POST /steps."""

    # Shape is checked by the regex; validity ("is this a real calendar day") is
    # checked below so 2026-13-45 is rejected even though it matches the pattern.
    date: str = Field(pattern=DATE_RE)
    # Basic anti-cheat sanity cap: nobody walks 200k+ steps in a day.
    steps: int = Field(ge=0, le=200_000)
    source: Source = "manual"

    @field_validator("date")
    @classmethod
    def _real_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("date must be a real calendar day in YYYY-MM-DD form") from exc
        return v


class StepOut(BaseModel):
    """The stored entry, returned from POST /steps and GET /me."""

    id: int
    date: str
    steps: int
    source: str
    updated_at: datetime


class TodayOut(BaseModel):
    """The backend's configured local date."""

    date: str
    timezone: str


class NewUserIn(BaseModel):
    """Body of POST /users (admin only)."""

    name: str = Field(min_length=1, max_length=80)


class NewUserOut(BaseModel):
    id: int
    name: str
    token: str  # returned exactly once, on creation — hand it to the friend
    created_at: datetime


class LeaderRow(BaseModel):
    rank: int
    name: str
    steps: int
