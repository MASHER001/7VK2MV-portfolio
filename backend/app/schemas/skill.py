"""
Schema: Skill
Location: backend/app/schemas/skill.py

Defines the shapes the API accepts and returns for /api/skills.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# Category whitelist — matches section 14 of the backend doc.
# Delete ALLOWED_CATEGORIES and the check_category validators below
# if you want free-form categories.
ALLOWED_CATEGORIES = {
    "Programming",
    "Frontend",
    "Backend",
    "Database",
    "Cybersecurity",
    "Development Tools",
    "Design",
    "Currently Learning",
}


def _validate_category(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in ALLOWED_CATEGORIES:
        raise ValueError(
            f"Invalid category '{v}'. Allowed: {sorted(ALLOWED_CATEGORIES)}"
        )
    return v


# ---------- Create (admin) ----------

class SkillCreate(BaseModel):
    """POST /api/skills payload."""

    name: str = Field(..., min_length=1, max_length=80)
    category: str = Field(..., max_length=80)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=200)

    proficiency: Optional[int] = Field(None, ge=0, le=100)
    is_learning: bool = False
    is_featured: bool = False
    display_order: int = 0

    # mode="before" so whitespace is stripped BEFORE length/whitelist checks
    @field_validator("name", "category", mode="before")
    @classmethod
    def strip_whitespace(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str) -> str:
        return _validate_category(v)


# ---------- Update (admin, partial) ----------

class SkillUpdate(BaseModel):
    """PUT /api/skills/{id} payload. All fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=80)
    category: Optional[str] = Field(None, max_length=80)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=200)

    proficiency: Optional[int] = Field(None, ge=0, le=100)
    is_learning: Optional[bool] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None

    @field_validator("name", "category", mode="before")
    @classmethod
    def strip_whitespace(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("category")
    @classmethod
    def check_category(cls, v: Optional[str]) -> Optional[str]:
        return _validate_category(v)


# ---------- Response ----------

class SkillResponse(BaseModel):
    """
    Used by GET /api/skills and returned after create/update.

    Includes id (and timestamps) so the admin panel can edit and delete.
    The id is a random UUID, not a secret; writes are still admin-only.
    """

    id: UUID

    name: str
    category: str
    description: Optional[str] = None
    icon: Optional[str] = None

    proficiency: Optional[int] = None
    is_learning: bool = False
    is_featured: bool = False
    display_order: int = 0

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}