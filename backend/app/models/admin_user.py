from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AdminUser(BaseModel):
    """
    An authenticated user who is also listed in the `admin_users` table.

    - user_id / role / created_at come from `admin_users`
    - email comes from the Supabase Auth user (not stored in admin_users)
    """

    user_id: UUID
    role: str = "admin"
    email: str | None = None
    created_at: datetime | None = None