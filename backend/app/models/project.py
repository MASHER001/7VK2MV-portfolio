"""
Model: Project
Location: backend/app/models/project.py

Represents a portfolio project as stored in the Supabase `projects` table.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class Project(BaseModel):
    """
    Full project record as stored in Supabase.
    Used for internal typing.
    """

    id: Optional[str] = None

    # Core
    title: str
    slug: str
    short_description: Optional[str] = None
    description: Optional[str] = None

    # Narrative
    problem: Optional[str] = None
    solution: Optional[str] = None

    # Classification
    category: Optional[str] = None          # e.g. "Full Stack"
    status: str = "In Progress"             # "Planned" | "In Progress" | "Completed"
    technologies: List[str] = []

    # Links
    github_url: Optional[str] = None
    live_url: Optional[str] = None

    # Media
    featured_image_url: Optional[str] = None

    # Dates
    start_date: Optional[date] = None
    completion_date: Optional[date] = None

    # Ordering / flags
    is_featured: bool = False
    display_order: int = 0

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True