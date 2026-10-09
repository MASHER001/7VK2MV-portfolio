"""
Schema: Project
Location: backend/app/schemas/project.py

Defines the shapes the API accepts and returns for /api/projects.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, field_validator


# ---------- Shared base ----------

class ProjectBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    short_description: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = Field(None, max_length=5000)
    problem: Optional[str] = Field(None, max_length=2000)
    solution: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=80)
    status: str = Field("In Progress", max_length=40)
    technologies: List[str] = Field(default_factory=list)
    github_url: Optional[HttpUrl] = None
    live_url: Optional[HttpUrl] = None
    featured_image_url: Optional[str] = None
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    is_featured: bool = False
    display_order: int = 0

    @field_validator("technologies")
    @classmethod
    def clean_technologies(cls, v: List[str]) -> List[str]:
        """Strip blanks, trim whitespace, dedupe (preserve order)."""
        seen = set()
        cleaned = []
        for tech in v:
            t = tech.strip()
            if t and t.lower() not in seen:
                seen.add(t.lower())
                cleaned.append(t)
        return cleaned


# ---------- Create (admin) ----------

class ProjectCreate(ProjectBase):
    """
    POST /api/projects payload.
    `slug` is optional — the service generates one from `title` if missing.
    """
    slug: Optional[str] = Field(None, max_length=180)


# ---------- Update (admin, partial) ----------

class ProjectUpdate(BaseModel):
    """
    PUT /api/projects/{id} payload.
    All fields optional — only what's sent is updated.
    """
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    slug: Optional[str] = Field(None, max_length=180)
    short_description: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = Field(None, max_length=5000)
    problem: Optional[str] = Field(None, max_length=2000)
    solution: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=80)
    status: Optional[str] = Field(None, max_length=40)
    technologies: Optional[List[str]] = None
    github_url: Optional[HttpUrl] = None
    live_url: Optional[HttpUrl] = None
    featured_image_url: Optional[str] = None
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None

    @field_validator("technologies")
    @classmethod
    def clean_technologies(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        seen = set()
        cleaned = []
        for tech in v:
            t = tech.strip()
            if t and t.lower() not in seen:
                seen.add(t.lower())
                cleaned.append(t)
        return cleaned


# ---------- Response (public, list view) ----------

class ProjectCard(BaseModel):
    """
    Used by GET /api/projects and GET /api/projects/featured.
    Lightweight — just what a project card needs.
    """
    id: str                                    # ← added
    title: str
    slug: str
    short_description: Optional[str] = None
    category: Optional[str] = None
    status: str
    technologies: List[str] = []
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    featured_image_url: Optional[str] = None
    is_featured: bool = False

    class Config:
        from_attributes = True


# ---------- Response (public, detail view) ----------

class ProjectDetail(ProjectCard):
    """
    Used by GET /api/projects/{slug}.
    Everything a project-details.html page needs.
    """
    description: Optional[str] = None
    problem: Optional[str] = None
    solution: Optional[str] = None
    start_date: Optional[date] = None
    completion_date: Optional[date] = None

    class Config:
        from_attributes = True