"""Authentication dependencies: user bearer tokens and the admin key."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlmodel import Session, select

from .config import settings
from .db import get_session
from .models import User


def get_current_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    """Resolve the user from an `Authorization: Bearer <token>` header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header (expected 'Bearer <token>').",
        )
    token = authorization[len("Bearer "):].strip()
    user = session.exec(select(User).where(User.token == token)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
    return user


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    """Guard admin-only endpoints with the X-Admin-Key header.

    If ADMIN_KEY is unset the admin surface is disabled entirely — we never treat
    an empty configured key as "match anything".
    """
    if not settings.admin_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin endpoints are disabled (ADMIN_KEY is not configured).",
        )
    if x_admin_key != settings.admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key."
        )
