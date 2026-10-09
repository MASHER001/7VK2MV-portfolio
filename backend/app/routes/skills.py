"""
Route: Skills
Location: backend/app/routes/skills.py

Endpoints:
    GET    /api/skills                 → public, list all (filter by ?category=)
    GET    /api/skills/featured        → public, featured only
    GET    /api/skills/{id}            → admin, single skill (for edit form)
    POST   /api/skills                 → admin, create
    PUT    /api/skills/{id}            → admin, update
    DELETE /api/skills/{id}            → admin, delete
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_supabase, get_current_admin
from app.schemas.skill import SkillCreate, SkillResponse, SkillUpdate
from app.services.skill_service import SkillService

router = APIRouter(prefix="/api/skills", tags=["Skills"])


# ---------- Public ----------

@router.get(
    "",
    response_model=List[SkillResponse],
    summary="List all skills",
)
async def list_skills(
    category: Optional[str] = Query(None, description="Filter by category"),
    supabase=Depends(get_supabase),
):
    service = SkillService(supabase)
    return await service.list_skills(category=category)


@router.get(
    "/featured",
    response_model=List[SkillResponse],
    summary="List featured skills",
)
async def list_featured(supabase=Depends(get_supabase)):
    service = SkillService(supabase)
    return await service.list_featured()


# ---------- Admin ----------

@router.get(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Get a skill by id (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def get_skill(skill_id: str, supabase=Depends(get_supabase)):
    service = SkillService(supabase)
    skill = await service.get_by_id(skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )
    return skill


@router.post(
    "",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a skill (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def create_skill(
    payload: SkillCreate,
    supabase=Depends(get_supabase),
):
    service = SkillService(supabase)
    try:
        return await service.create(payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Update a skill (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def update_skill(
    skill_id: str,
    payload: SkillUpdate,
    supabase=Depends(get_supabase),
):
    service = SkillService(supabase)
    try:
        updated = await service.update(skill_id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )
    return updated


@router.delete(
    "/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a skill (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def delete_skill(
    skill_id: str,
    supabase=Depends(get_supabase),
):
    service = SkillService(supabase)
    deleted = await service.delete(skill_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )
    return None