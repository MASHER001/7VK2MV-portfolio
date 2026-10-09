"""
Model: Skill
Location: backend/app/models/skill.py

Represents a technical or professional skill stored in the Supabase
`skills` table.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class Skill(BaseModel):
    """
    Full skill record as stored in Supabase.
    Used for internal typing.
    """

    id: Optional[str] = None

    # Core
    name: str
    category: str                            # "Programming", "Frontend", etc.
    description: Optional[str] = None
    icon: Optional[str] = None               # icon slug or URL

    # Proficiency
    proficiency: Optional[int] = None        # 0–100, null for non-rated skills
    is_learning: bool = False                # currently learning
    is_featured: bool = False                # show on Home page

    # Ordering
    display_order: int = 0

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True