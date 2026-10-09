"""
Service: Certificate
Location: backend/app/services/certificate_service.py

Business logic for certificates: list, featured, CRUD.
"""

from datetime import date
from typing import List, Optional

from supabase import Client

from app.schemas.certificate import CertificateCreate, CertificateUpdate


class CertificateService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # ---------- Reads ----------

    async def list_certificates(
        self,
        category: Optional[str] = None,
    ) -> List[dict]:
        """
        Return all certificates, newest first.
        Optionally filter by category.
        """
        query = (
            self.supabase
            .table("certificates")
            .select("*")
            .order("issue_date", desc=True, nullsfirst=False)
            .order("display_order", desc=False)
        )
        if category:
            query = query.eq("category", category)

        response = query.execute()
        return response.data or []

    async def list_featured(self) -> List[dict]:
        """Return only certificates flagged as featured (for the Home page)."""
        response = (
            self.supabase
            .table("certificates")
            .select("*")
            .eq("is_featured", True)
            .order("issue_date", desc=True, nullsfirst=False)
            .order("display_order", desc=False)
            .execute()
        )
        return response.data or []

    async def get_by_id(self, cert_id: str) -> Optional[dict]:
        """Fetch a single certificate by id (admin use)."""
        response = (
            self.supabase
            .table("certificates")
            .select("*")
            .eq("id", cert_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    # ---------- Writes ----------

    async def create(self, payload: CertificateCreate) -> dict:
        """Create a certificate. Date validation already ran in the schema."""
        data = payload.model_dump(mode="json", exclude_unset=True)
        response = self.supabase.table("certificates").insert(data).execute()
        return response.data[0]

    async def update(
        self,
        cert_id: str,
        payload: CertificateUpdate,
    ) -> Optional[dict]:
        """
        Update only the fields the admin sent.
        Re-validates issue_date/expiry_date ordering against the merged row.
        """
        updates = payload.model_dump(mode="json", exclude_unset=True)

        if not updates:
            return await self.get_by_id(cert_id)

        # Fetch current row to validate dates against merged state
        current = await self.get_by_id(cert_id)
        if not current:
            return None

        # Merge: existing row, then overlay updates
        merged_issue = updates.get("issue_date", current.get("issue_date"))
        merged_expiry = updates.get("expiry_date", current.get("expiry_date"))

        if merged_issue and merged_expiry:
            # Both arrive as ISO strings from model_dump(mode="json")
            issue = date.fromisoformat(merged_issue) if isinstance(merged_issue, str) else merged_issue
            expiry = date.fromisoformat(merged_expiry) if isinstance(merged_expiry, str) else merged_expiry
            if expiry < issue:
                raise ValueError("expiry_date must be on or after issue_date")

        response = (
            self.supabase.table("certificates")
            .update(updates)
            .eq("id", cert_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def delete(self, cert_id: str) -> bool:
        """Delete a certificate. Returns True if a row was removed."""
        response = (
            self.supabase.table("certificates")
            .delete()
            .eq("id", cert_id)
            .execute()
        )
        return bool(response.data)