"""
Schema: Profile
Location: backend/app/schemas/profile.py

Defines what the API accepts and returns for /api/profile.
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, HttpUrl


# ---------- Response (public) ----------

class ProfileResponse(BaseModel):
    """What GET /api/profile returns to the frontend."""

    full_name: str
    professional_title: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None

    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    location: Optional[str] = None

    instagram_url: Optional[HttpUrl] = None
    linkedin_url: Optional[HttpUrl] = None
    github_url: Optional[HttpUrl] = None

    availability_status: Optional[str] = None
    availability_message: Optional[str] = None

    cv_url: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Update (admin only) ----------

class ProfileUpdate(BaseModel):
    """
    PUT /api/profile payload.
    All fields optional so the admin can update only what changed.
    """

    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    professional_title: Optional[str] = Field(None, max_length=120)
    bio: Optional[str] = Field(None, max_length=2000)
    profile_image_url: Optional[str] = None

    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    whatsapp_number: Optional[str] = Field(None, max_length=30)
    location: Optional[str] = Field(None, max_length=120)

    instagram_url: Optional[HttpUrl] = None
    linkedin_url: Optional[HttpUrl] = None
    github_url: Optional[HttpUrl] = None

    availability_status: Optional[str] = Field(None, max_length=80)
    availability_message: Optional[str] = Field(None, max_length=300)

    cv_url: Optional[str] = None

    class Config:
        from_attributes = True