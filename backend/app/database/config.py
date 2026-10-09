"""
Database config
Location: backend/app/database/config.py

Loads Supabase credentials from environment variables.
"""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Reads from environment / .env.
    Field names map to env var names (case-insensitive).
    """

    supabase_url: str
    supabase_service_role_key: str
    app_env: str = "development"
    frontend_url: str = "http://localhost:5500"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings — .env is read once per process."""
    return Settings()