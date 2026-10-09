"""
Service: Skill
Location: backend/app/services/skill_service.py

Business logic for skills: list, filter by category, CRUD.
"""

from typing import List, Optional

from supabase import Client

from app.schemas.skill import SkillCreate, SkillUpdate


class SkillService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # ---------- Reads ----------

    async def list_skills(self, category: Optional[str] = None) -> List[dict]:
        """Return all skills ordered for display."""
        query = (
            self.supabase
            .table("skills")
            .select("*")
            .order("category", desc=False)
            .order("display_order", desc=False)
            .order("name", desc=False)
        )
        if category:
            query = query.eq("category", category)

        response = query.execute()
        return response.data or []

    async def list_featured(self) -> List[dict]:
        """Return only skills flagged as featured (for the Home page)."""
        response = (
            self.supabase
            .table("skills")
            .select("*")
            .eq("is_featured", True)
            .order("display_order", desc=False)
            .execute()
        )
        return response.data or []

    async def get_by_id(self, skill_id: str) -> Optional[dict]:
        """Fetch a single skill by its id (admin use)."""
        response = (
            self.supabase
            .table("skills")
            .select("*")
            .eq("id", skill_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def name_exists(
        self,
        name: str,
        category: str,
        exclude_id: Optional[str] = None,
    ) -> bool:
        """Check whether the same (name, category) pair already exists."""
        query = (
            self.supabase
            .table("skills")
            .select("id")
            .eq("name", name)
            .eq("category", category)
        )
        if exclude_id:
            query = query.neq("id", exclude_id)
        response = query.limit(1).execute()
        return bool(response.data)

    # ---------- Writes ----------

    async def create(self, payload: SkillCreate) -> dict:
        """Create a skill. Rejects duplicates within the same category."""
        data = payload.model_dump(mode="json", exclude_unset=True)

        if await self.name_exists(data["name"], data["category"]):
            raise ValueError(
                f"Skill '{data['name']}' already exists in '{data['category']}'"
            )

        response = self.supabase.table("skills").insert(data).execute()
        return response.data[0]

    async def update(self, skill_id: str, payload: SkillUpdate) -> Optional[dict]:
        """Update only the fields the admin sent."""
        updates = payload.model_dump(mode="json", exclude_unset=True)

        if not updates:
            return await self.get_by_id(skill_id)

        current = await self.get_by_id(skill_id)
        if not current:
            return None

        new_name = updates.get("name", current["name"])
        new_category = updates.get("category", current["category"])

        if ("name" in updates or "category" in updates) and await self.name_exists(
            new_name, new_category, exclude_id=skill_id
        ):
            raise ValueError(
                f"Skill '{new_name}' already exists in '{new_category}'"
            )

        response = (
            self.supabase.table("skills")
            .update(updates)
            .eq("id", skill_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def delete(self, skill_id: str) -> bool:
        """Delete a skill. Returns True if a row was removed."""
        response = (
            self.supabase
            .table("skills")
            .delete()
            .eq("id", skill_id)
            .execute()
        )
        return bool(response.data)