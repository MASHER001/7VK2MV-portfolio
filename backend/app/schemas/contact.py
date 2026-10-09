"""
Schema: Contact
Location: backend/app/schemas/contact.py

Defines the shapes the API accepts and returns for /api/contact.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------- Public: submit a message ----------

class ContactCreate(BaseModel):
    """
    POST /api/contact payload — what the contact form sends.
    """

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: Optional[str] = Field(None, max_length=150)
    message: str = Field(..., min_length=10, max_length=5000)

    # Honeypot field — real users leave this empty.
    # Bots fill every field they see. If this is non-empty, reject.
    website: Optional[str] = Field(None, max_length=200)

    @field_validator("name", "subject", "message")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if isinstance(v, str) else v

    @field_validator("message")
    @classmethod
    def reject_link_spam(cls, v: str) -> str:
        """
        Reject messages containing more than 3 URLs.
        Crude but effective against the most common form spam.
        """
        import re
        url_count = len(re.findall(r"https?://", v, flags=re.IGNORECASE))
        if url_count > 3:
            raise ValueError("Message contains too many links")
        return v


# ---------- Public: submit response ----------

class ContactSubmitResponse(BaseModel):
    """What POST /api/contact returns on success."""

    success: bool = True
    message: str = "Your message has been sent successfully."


# ---------- Admin: read a message ----------

class MessageResponse(BaseModel):
    """
    Used by GET /api/contact/messages.
    Exposes sender info + workflow flags, but not ip/user_agent
    (keep those for the DB admin, not the API).
    """

    id: str
    name: str
    email: EmailStr
    subject: Optional[str] = None
    message: str

    is_read: bool = False
    is_replied: bool = False
    replied_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Admin: update workflow flags ----------

class MessageUpdate(BaseModel):
    """
    PATCH /api/contact/messages/{id} payload.
    Only the workflow flags are settable — content is immutable.
    """

    is_read: Optional[bool] = None
    is_replied: Optional[bool] = None