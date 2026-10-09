"""
Route: Projects
Location: backend/app/routes/projects.py

Endpoints:
    GET    /api/projects                 → public, list all
    GET    /api/projects/featured        → public, featured only
    GET    /api/projects/{slug}          → public, single project
    POST   /api/projects                 → admin, create
    PUT    /api/projects/{id}            → admin, update
    DELETE /api/projects/{id}            → admin, delete
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_supabase, get_current_admin
from app.schemas.project import (
    ProjectCard,
    ProjectCreate,
    ProjectDetail,
    ProjectUpdate,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["Projects"])


# ---------- Public ----------

@router.get(
    "",
    response_model=List[ProjectCard],
    summary="List all projects",
)
async def list_projects(
    category: Optional[str] = Query(None, description="Filter by category"),
    supabase=Depends(get_supabase),
):
    service = ProjectService(supabase)
    return await service.list_projects(category=category)


@router.get(
    "/featured",
    response_model=List[ProjectCard],
    summary="List featured projects",
)
async def list_featured(supabase=Depends(get_supabase)):
    service = ProjectService(supabase)
    return await service.list_featured()


@router.get(
    "/{slug}",
    response_model=ProjectDetail,
    summary="Get a project by slug",
)
async def get_project(slug: str, supabase=Depends(get_supabase)):
    service = ProjectService(supabase)
    project = await service.get_by_slug(slug)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


# ---------- Admin ----------

@router.post(
    "",
    response_model=ProjectDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def create_project(
    payload: ProjectCreate,
    supabase=Depends(get_supabase),
):
    service = ProjectService(supabase)
    return await service.create(payload)


@router.put(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Update a project (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    supabase=Depends(get_supabase),
):
    service = ProjectService(supabase)
    try:
        updated = await service.update(project_id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return updated


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def delete_project(
    project_id: str,
    supabase=Depends(get_supabase),
):
    service = ProjectService(supabase)
    deleted = await service.delete(project_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return None