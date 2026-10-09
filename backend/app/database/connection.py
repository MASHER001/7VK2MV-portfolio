"""
Database connection
Location: backend/app/database/connection.py

Creates and caches the Supabase client.
"""

from functools import lru_cache

from supabase import create_client, Client

from app.database.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    """
    Return a cached Supabase client using the service-role key.
    Cached so we don't create a new client on every request.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )