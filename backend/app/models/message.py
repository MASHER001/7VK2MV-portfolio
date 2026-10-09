from datetime import datetime
from typing import Optional


class ContactMessage:
    """
    Model representing a message submitted through
    the portfolio contact form.
    """

    def __init__(
        self,
        id: Optional[str] = None,
        name: str = "",
        email: str = "",
        subject: Optional[str] = None,
        message: str = "",
        is_read: bool = False,
        is_replied: bool = False,
        created_at: Optional[datetime] = None,
    ):
        self.id = id
        self.name = name
        self.email = email
        self.subject = subject
        self.message = message
        self.is_read = is_read
        self.is_replied = is_replied
        self.created_at = created_at