"""
Shared FastAPI dependencies.

Exposes the two names the route files import:
    from app.dependencies import get_supabase, get_current_admin
"""

import os
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

load_dotenv()

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache
def get_supabase() -> Client:
    """Create the Supabase client once and reuse it (uses the secret key)."""
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"],
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    supabase: Client = Depends(get_supabase),
):
    """Verify the bearer token with Supabase Auth and return the auth user."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        response = supabase.auth.get_user(credentials.credentials)
        user = response.user if response else None
    except Exception:
        user = None

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_admin(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Allow the request only if the user is listed in `admin_users`."""
    try:
        result = (
            supabase.table("admin_users")
            .select("user_id, role")
            .eq("user_id", str(user.id))
            .limit(1)
            .execute()
        )
        rows = result.data or []
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify administrator access",
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return {"user_id": rows[0]["user_id"], "role": rows[0]["role"], "email": user.email}