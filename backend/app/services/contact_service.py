"""
Service: Contact
Location: backend/app/services/contact_service.py

Business logic for contact messages: submit, list, flag, delete.
"""

from datetime import datetime, timezone
from typing import List, Optional

from supabase import Client

from app.schemas.contact import ContactCreate, MessageUpdate


class ContactService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # ---------- Public: submit ----------

    async def submit_message(
        self,
        payload: ContactCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> dict:
        """
        Store a contact message.
        Honeypot check happens in the route (silent success on trigger);
        this method just persists.
        """
        data = payload.model_dump(mode="json", exclude_unset=True)

        # Strip the honeypot field — never store it
        data.pop("website", None)

        # Attach server-captured metadata
        data["ip_address"] = ip_address
        data["user_agent"] = user_agent

        response = (
            self.supabase.table("contact_messages").insert(data).execute()
        )
        return response.data[0]

    async def recent_submission_count(
        self,
        ip_address: str,
        since_seconds: int = 3600,
    ) -> int:
        """
        Count submissions from an IP within a time window.
        Used by the route to enforce rate limiting.
        """
        cutoff = datetime.now(timezone.utc).timestamp() - since_seconds
        cutoff_iso = datetime.fromtimestamp(cutoff, tz=timezone.utc).isoformat()

        response = (
            self.supabase
            .table("contact_messages")
            .select("id", count="exact")
            .eq("ip_address", ip_address)
            .gte("created_at", cutoff_iso)
            .execute()
        )
        return response.count or 0

    # ---------- Admin: inbox ----------

    async def list_messages(
        self,
        is_read: Optional[bool] = None,
        is_replied: Optional[bool] = None,
    ) -> List[dict]:
        """Return messages, newest first, optionally filtered."""
        query = (
            self.supabase
            .table("contact_messages")
            .select("id, name, email, subject, message, "
                    "is_read, is_replied, replied_at, created_at")
            .order("created_at", desc=True)
        )
        if is_read is not None:
            query = query.eq("is_read", is_read)
        if is_replied is not None:
            query = query.eq("is_replied", is_replied)

        response = query.execute()
        return response.data or []

    async def get_message(self, message_id: str) -> Optional[dict]:
        """Fetch a single message by id."""
        response = (
            self.supabase
            .table("contact_messages")
            .select("id, name, email, subject, message, "
                    "is_read, is_replied, replied_at, created_at")
            .eq("id", message_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def mark_read(self, message_id: str) -> Optional[dict]:
        """Convenience: mark a single message as read."""
        return await self.update_message(message_id, MessageUpdate(is_read=True))

    async def update_message(
        self,
        message_id: str,
        payload: MessageUpdate,
    ) -> Optional[dict]:
        """
        Update workflow flags. If is_replied is being set to True,
        also stamp replied_at.
        """
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return await self.get_message(message_id)

        # Stamp replied_at when transitioning to replied
        if updates.get("is_replied") is True:
            updates["replied_at"] = datetime.now(timezone.utc).isoformat()

        response = (
            self.supabase
            .table("contact_messages")
            .update(updates)
            .eq("id", message_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def delete_message(self, message_id: str) -> bool:
        """Delete a message. Returns True if a row was removed."""
        response = (
            self.supabase
            .table("contact_messages")
            .delete()
            .eq("id", message_id)
            .execute()
        )
        return bool(response.data)