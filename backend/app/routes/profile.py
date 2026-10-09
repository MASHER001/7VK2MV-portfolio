"""
Route: Profile
Location: backend/app/routes/profile.py

Endpoints:
    GET  /api/profile   → public, returns profile info
    PUT  /api/profile   → admin only, updates profile
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_supabase, get_current_admin
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get(
    "",
    response_model=ProfileResponse,
    summary="Get portfolio profile",
    description="Returns Victor's public profile information.",
)
async def get_profile(supabase=Depends(get_supabase)):
    service = ProfileService(supabase)
    profile = await service.get_profile()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return profile


@router.put(
    "",
    response_model=ProfileResponse,
    summary="Update portfolio profile (admin)",
    description="Updates the profile. Requires administrator authentication.",
    dependencies=[Depends(get_current_admin)],
)
async def update_profile(
    payload: ProfileUpdate,
    supabase=Depends(get_supabase),
):
    service = ProfileService(supabase)
    updated = await service.update_profile(payload)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return updated