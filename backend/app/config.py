"""Application configuration, loaded from environment variables.

DATABASE_URL is required — we deploy straight to Supabase and develop against it
too, so there is deliberately no SQLite fallback. If it's missing we fail fast at
startup with a clear message rather than silently limping along.
"""

from __future__ import annotations

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Postgres connection string. Supabase hands this out starting with
    # "postgresql://" (or sometimes "postgres://"); we normalize the scheme to
    # "postgresql+psycopg://" at runtime in db.py, so it can be pasted verbatim.
    database_url: str

    # Comma-separated list of allowed CORS origins for the browser frontend.
    # Always includes localhost:3000 for local dev via the default below.
    frontend_origin: str = "http://localhost:3000"

    # Secret required (as the X-Admin-Key header) to create friends via POST /users.
    # Empty by default, which means the admin endpoint is disabled until you set it.
    admin_key: str = ""

    # IANA timezone name. "Today"/"this week"/"this month" are computed here, since
    # step counts belong to a local calendar day. Week starts Monday.
    timezone: str = "Asia/Kolkata"

    # Daily step goal used for streaks / "goal hit" badges. The frontend has its own
    # NEXT_PUBLIC_DAILY_GOAL; this is exposed so clients can read the server default.
    daily_goal: int = 8000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        """FRONTEND_ORIGIN split into a clean list of origins."""
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]


def load_settings() -> Settings:
    try:
        return Settings()  # type: ignore[call-arg]  # values come from the environment
    except ValidationError as exc:
        # Almost always a missing DATABASE_URL. Make that obvious.
        raise RuntimeError(
            "Invalid configuration. DATABASE_URL is required (point it at your "
            "Supabase Session-pooler connection string). See backend/.env.example.\n"
            f"Details: {exc}"
        ) from exc


settings = load_settings()
