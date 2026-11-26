
"""
Contact Service
Location: backend/app/services/contact_service.py

Handles contact message storage and administration using Supabase.
"""

from datetime import datetime, timedelta, timezone

from fastapi.concurrency import run_in_threadpool


class ContactService:
    """Manage contact messages in the Supabase database."""

    TABLE = "contact_messages"

    def __init__(self, supabase):
        self.supabase = supabase

    async def _execute(self, query):
        """Execute a synchronous Supabase query in a worker thread."""
        return await run_in_threadpool(query.execute)

    async def recent_submission_count(
        self,
        ip_address: str,
        since_seconds: int = 3600,
    ) -> int:
        """Count recent submissions from a particular IP address."""

        cutoff = datetime.now(timezone.utc) - timedelta(
            seconds=since_seconds
        )

        query = (
            self.supabase.table(self.TABLE)
            .select("id", count="exact")
            .eq("ip_address", ip_address)
            .gte("created_at", cutoff.isoformat())
        )

        response = await self._execute(query)

        if response.count is not None:
            return response.count

        return len(response.data or [])

    async def submit_message(
        self,
        payload,
        ip_address: str = None,
        user_agent: str = None,
    ):
        """Store a new contact message."""

        message_data = payload.model_dump(
            mode="json",
            exclude={"website"},
        )

        message_data["ip_address"] = ip_address
        message_data["user_agent"] = user_agent

        query = (
            self.supabase.table(self.TABLE)
            .insert(message_data)
            .select("*")
        )

        response = await self._execute(query)

        if not response.data:
            raise RuntimeError("Failed to save contact message.")

        return response.data[0]

    async def list_messages(
        self,
        is_read: bool = None,
        is_replied: bool = None,
    ):
        """Retrieve messages, with optional status filters."""

        query = (
            self.supabase.table(self.TABLE)
            .select("*")
            .order("created_at", desc=True)
        )

        if is_read is not None:
            query = query.eq("is_read", is_read)

        if is_replied is not None:
            query = query.eq("is_replied", is_replied)

        response = await self._execute(query)

        return response.data or []

    async def get_message(self, message_id: str):
        """Retrieve a single message by its ID."""

        query = (
            self.supabase.table(self.TABLE)
            .select("*")
            .eq("id", message_id)
            .limit(1)
        )

        response = await self._execute(query)

        if not response.data:
            return None

        return response.data[0]

    async def update_message(self, message_id: str, payload):
        """Update read and replied status flags."""

        update_data = payload.model_dump(
            exclude_unset=True,
            exclude_none=True,
        )

        if not update_data:
            return await self.get_message(message_id)

        if "is_replied" in update_data:
            if update_data["is_replied"]:
                update_data["replied_at"] = (
                    datetime.now(timezone.utc).isoformat()
                )
            else:
                update_data["replied_at"] = None

        query = (
            self.supabase.table(self.TABLE)
            .update(update_data)
            .eq("id", message_id)
            .select("*")
        )

        response = await self._execute(query)

        if not response.data:
            return None

        return response.data[0]

    async def delete_message(self, message_id: str):
        """Delete a message by its ID."""

        query = (
            self.supabase.table(self.TABLE)
            .delete()
            .eq("id", message_id)
            .select("id")
        )

        response = await self._execute(query)

        return bool(response.data)
