"""
Schema: Skill
Location: backend/app/schemas/skill.py

Defines the shapes the API accepts and returns for /api/skills.
"""

from typing import Optional

from pydantic import BaseModel, Field, field_validator


# Category whitelist — matches section 14 of the backend doc.
# Delete this and the validators below if you want free-form categories.
ALLOWED_CATEGORIES = {
    "Programming",
    "Frontend",
    "Backend",
    "Database",
    "Development Tools",
    "Design",
    "Currently Learning",
}


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

    @field_validator("name", "category")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str) -> str:
        if v not in ALLOWED_CATEGORIES:
            raise ValueError(
                f"Invalid category '{v}'. "
                f"Allowed: {sorted(ALLOWED_CATEGORIES)}"
            )
        return v


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

    @field_validator("name", "category")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v is not None else v

    @field_validator("category")
    @classmethod
    def check_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_CATEGORIES:
            raise ValueError(
                f"Invalid category '{v}'. "
                f"Allowed: {sorted(ALLOWED_CATEGORIES)}"
            )
        return v


# ---------- Response (public) ----------

class SkillResponse(BaseModel):
    """Used by GET /api/skills. No id, no timestamps."""

    name: str
    category: str
    description: Optional[str] = None
    icon: Optional[str] = None

    proficiency: Optional[int] = None
    is_learning: bool = False
    is_featured: bool = False
    display_order: int = 0

    class Config:
        from_attributes = True