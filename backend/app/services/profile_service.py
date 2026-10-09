"""
Service: Profile
Location: backend/app/services/profile_service.py

Business logic for reading and updating the singleton profile record.
"""

from typing import Optional

from supabase import Client

from app.schemas.profile import ProfileUpdate


class ProfileService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def get_profile(self) -> Optional[dict]:
        """
        Return the single profile row, or None if the table is empty.
        The table is a singleton — we always fetch the first (only) row.
        """
        response = (
            self.supabase
            .table("profiles")
            .select("*")
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def update_profile(self, payload: ProfileUpdate) -> Optional[dict]:
        """
        Update the singleton profile row with only the fields that were sent.
        Returns the updated row, or None if the row doesn't exist.
        """
        # exclude_unset=True → only fields the admin actually sent
        updates = payload.model_dump(exclude_unset=True, mode="json")
        if not updates:
            # Nothing to update — return current state
            return await self.get_profile()

        # Fetch the current row so we know its id (no hardcoded UUID)
        current = await self.get_profile()
        if not current:
            return None

        response = (
            self.supabase
            .table("profiles")
            .update(updates)
            .eq("id", current["id"])
            .execute()
        )
        return response.data[0] if response.data else None