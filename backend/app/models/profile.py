"""
Model: Profile
Location: backend/app/models/profile.py

Represents Victor's primary portfolio/profile information.
This is a singleton record — the portfolio only ever has one profile.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, HttpUrl


class Profile(BaseModel):
    """
    Full profile record as stored in the Supabase `profile` table.
    Used for internal typing and as the base for response schemas.
    """

    id: Optional[str] = None  # UUID, but singleton — usually hidden from public API

    # Identity
    full_name: str
    professional_title: str
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None

    # Contact
    email: EmailStr
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    location: Optional[str] = None

    # Social links
    instagram_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None

    # Availability
    availability_status: Optional[str] = None      # e.g. "Open to Opportunities"
    availability_message: Optional[str] = None

    # Documents
    cv_url: Optional[str] = None

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # allows ORM/dict → model conversion