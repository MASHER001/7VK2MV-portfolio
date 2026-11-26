"""
Schema: Achievement
Location: backend/app/schemas/achievement.py

Shapes for /api/achievements.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class AchievementCreate(BaseModel):
    """POST /api/achievements payload."""

    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=80)
    achievement_date: Optional[date] = None

    image_url: Optional[str] = None
    evidence_url: Optional[HttpUrl] = None

    is_featured: bool = False
    display_order: int = 0


class AchievementUpdate(BaseModel):
    """PUT /api/achievements/{id} payload. All fields optional."""

    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=80)
    achievement_date: Optional[date] = None

    image_url: Optional[str] = None
    evidence_url: Optional[HttpUrl] = None

    is_featured: Optional[bool] = None
    display_order: Optional[int] = None


class AchievementResponse(BaseModel):
    """Returned by every achievements endpoint. Includes id so the admin panel can edit/delete."""

    id: UUID
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    achievement_date: Optional[date] = None

    image_url: Optional[str] = None
    evidence_url: Optional[str] = None

    is_featured: bool = False
    display_order: int = 0

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}