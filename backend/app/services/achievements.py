"""
Service: Achievements
Location: backend/app/services/achievement_service.py

All database access for the `achievements` table.
"""

from typing import Optional

from fastapi import HTTPException, status
from supabase import Client

from app.schemas.achievement import AchievementCreate, AchievementUpdate

TABLE = "achievements"


def list_achievements(supabase: Client, featured_only: bool = False) -> list[dict]:
    query = supabase.table(TABLE).select("*")
    if featured_only:
        query = query.eq("is_featured", True)
    result = (
        query.order("display_order")
        .order("achievement_date", desc=True)
        .execute()
    )
    return result.data or []


def create_achievement(supabase: Client, payload: AchievementCreate) -> dict:
    # mode="json" turns dates and HttpUrl into plain strings the client can send
    data = payload.model_dump(mode="json")
    result = supabase.table(TABLE).insert(data).execute()
    if not result.data:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create achievement")
    return result.data[0]


def update_achievement(supabase: Client, achievement_id: str, payload: AchievementUpdate) -> dict:
    data = payload.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = supabase.table(TABLE).update(data).eq("id", achievement_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Achievement not found")
    return result.data[0]


def delete_achievement(supabase: Client, achievement_id: str) -> None:
    result = supabase.table(TABLE).delete().eq("id", achievement_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Achievement not found")