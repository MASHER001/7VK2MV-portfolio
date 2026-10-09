"""
Schema: Certificate
Location: backend/app/schemas/certificate.py

Defines the shapes the API accepts and returns for /api/certificates.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl, model_validator


# ---------- Create (admin) ----------

class CertificateCreate(BaseModel):
    """
    POST /api/certificates payload.
    """

    title: str = Field(..., min_length=2, max_length=200)
    issuer: str = Field(..., min_length=2, max_length=150)
    category: Optional[str] = Field(None, max_length=80)
    description: Optional[str] = Field(None, max_length=1000)

    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

    credential_id: Optional[str] = Field(None, max_length=120)
    credential_url: Optional[HttpUrl] = None

    image_url: Optional[str] = None
    pdf_url: Optional[str] = None

    is_featured: bool = False
    display_order: int = 0

    @model_validator(mode="after")
    def check_dates(self):
        """Expiry must be on or after issue date, when both are present."""
        if self.issue_date and self.expiry_date:
            if self.expiry_date < self.issue_date:
                raise ValueError("expiry_date must be on or after issue_date")
        return self


# ---------- Update (admin, partial) ----------

class CertificateUpdate(BaseModel):
    """
    PUT /api/certificates/{id} payload.
    All fields optional — only what's sent is updated.
    """

    title: Optional[str] = Field(None, min_length=2, max_length=200)
    issuer: Optional[str] = Field(None, min_length=2, max_length=150)
    category: Optional[str] = Field(None, max_length=80)
    description: Optional[str] = Field(None, max_length=1000)

    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

    credential_id: Optional[str] = Field(None, max_length=120)
    credential_url: Optional[HttpUrl] = None

    image_url: Optional[str] = None
    pdf_url: Optional[str] = None

    is_featured: Optional[bool] = None
    display_order: Optional[int] = None


# ---------- Response (public) ----------

class CertificateResponse(BaseModel):
    """
    Used by GET /api/certificates and GET /api/certificates/featured.
    No id, no timestamps.
    """

    title: str
    issuer: str
    category: Optional[str] = None
    description: Optional[str] = None

    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

    image_url: Optional[str] = None
    pdf_url: Optional[str] = None

    is_featured: bool = False
    display_order: int = 0

    class Config:
        from_attributes = True