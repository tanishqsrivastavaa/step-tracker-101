"""Timezone-aware period boundaries for the leaderboard.

Step counts belong to a local calendar day, so "today" / "this week" / "this
month" are computed in the configured TIMEZONE, not the server's clock. Because
entry dates are stored as ISO "YYYY-MM-DD" strings (which sort chronologically),
the leaderboard can filter with plain string comparisons against these bounds.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from .config import settings

Period = str  # "day" | "week" | "month" | "all"


def today_local(tz: str | None = None) -> date:
    return datetime.now(ZoneInfo(tz or settings.timezone)).date()


def period_bounds(period: Period, tz: str | None = None) -> tuple[str | None, str | None]:
    """Return (start, end) inclusive ISO-date bounds for the period.

    "all" returns (None, None) meaning no date filtering. The upper bound is
    always today, so future-dated rows can't inflate the current period.
    """
    today = today_local(tz)
    end = today.isoformat()

    if period == "all":
        return (None, None)
    if period == "day":
        start = today
    elif period == "week":
        # Monday-start week: weekday() is 0 on Monday.
        start = today - timedelta(days=today.weekday())
    elif period == "month":
        start = today.replace(day=1)
    else:
        raise ValueError(f"unknown period: {period!r}")

    return (start.isoformat(), end)
