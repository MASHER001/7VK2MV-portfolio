"""
Routes: Achievements
Location: backend/app/routes/achievements.py

GET is public. POST / PUT / DELETE need an admin (get_current_admin).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from supabase import Client

from app.dependencies import get_current_admin, get_supabase
from app.schemas.achievement import (
    AchievementCreate,
    AchievementResponse,
    AchievementUpdate,
)
from app.services import achievements as service

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])


@router.get("", response_model=list[AchievementResponse])
def list_achievements(
    featured: bool = Query(False, description="Only featured achievements"),
    supabase: Client = Depends(get_supabase),
):
    return service.list_achievements(supabase, featured_only=featured)


@router.post("", response_model=AchievementResponse, status_code=status.HTTP_201_CREATED)
def create_achievement(
    payload: AchievementCreate,
    supabase: Client = Depends(get_supabase),
    _admin: dict = Depends(get_current_admin),
):
    return service.create_achievement(supabase, payload)


@router.put("/{achievement_id}", response_model=AchievementResponse)
def update_achievement(
    achievement_id: UUID,
    payload: AchievementUpdate,
    supabase: Client = Depends(get_supabase),
    _admin: dict = Depends(get_current_admin),
):
    return service.update_achievement(supabase, str(achievement_id), payload)


@router.delete("/{achievement_id}")
def delete_achievement(
    achievement_id: UUID,
    supabase: Client = Depends(get_supabase),
    _admin: dict = Depends(get_current_admin),
):
    service.delete_achievement(supabase, str(achievement_id))
    return {"message": "Achievement deleted"}  # JSON body, so fetch(...).json() never fails
