from datetime import date, datetime
from typing import Optional


class Certificate:
    """
    Certificate model for the portfolio.

    Represents certificates, awards, courses, and other
    professional/academic credentials displayed on the portfolio.
    """

    def __init__(
        self,
        id: Optional[str] = None,
        title: str = "",
        issuer: str = "",
        category: Optional[str] = None,
        description: Optional[str] = None,
        issue_date: Optional[date] = None,
        expiry_date: Optional[date] = None,
        credential_id: Optional[str] = None,
        credential_url: Optional[str] = None,
        image_url: Optional[str] = None,
        pdf_url: Optional[str] = None,
        is_featured: bool = False,
        display_order: int = 0,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ):
        self.id = id
        self.title = title
        self.issuer = issuer
        self.category = category
        self.description = description
        self.issue_date = issue_date
        self.expiry_date = expiry_date
        self.credential_id = credential_id
        self.credential_url = credential_url
        self.image_url = image_url
        self.pdf_url = pdf_url
        self.is_featured = is_featured
        self.display_order = display_order
        self.created_at = created_at
        self.updated_at = updated_at