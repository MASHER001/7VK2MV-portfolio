"""
Service: Project
Location: backend/app/services/project_service.py

Business logic for projects: list, featured, detail, create, update, delete.
"""

import re
from typing import List, Optional

from supabase import Client

from app.schemas.project import ProjectCreate, ProjectUpdate


def slugify(text: str) -> str:
    """Turn a title into a URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


class ProjectService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # ---------- Reads ----------

    async def list_projects(self, category: Optional[str] = None) -> List[dict]:
        """Return all projects ordered for display."""
        query = (
            self.supabase
            .table("projects")
            .select("*")
            .order("display_order", desc=False)
            .order("created_at", desc=True)
        )
        if category:
            query = query.eq("category", category)

        response = query.execute()
        return response.data or []

    async def list_featured(self) -> List[dict]:
        """Return only projects flagged as featured (for the Home page)."""
        response = (
            self.supabase
            .table("projects")
            .select("*")
            .eq("is_featured", True)
            .order("display_order", desc=False)
            .execute()
        )
        return response.data or []

    async def get_by_slug(self, slug: str) -> Optional[dict]:
        """Fetch a single project by its slug."""
        response = (
            self.supabase
            .table("projects")
            .select("*")
            .eq("slug", slug)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def slug_exists(self, slug: str, exclude_id: Optional[str] = None) -> bool:
        """Check whether a slug is already taken (optionally ignoring one row)."""
        query = self.supabase.table("projects").select("id").eq("slug", slug)
        if exclude_id:
            query = query.neq("id", exclude_id)
        response = query.limit(1).execute()
        return bool(response.data)

    # ---------- Writes ----------

    async def create(self, payload: ProjectCreate) -> dict:
        """Create a project. Auto-generates a unique slug if none was sent."""
        data = payload.model_dump(mode="json", exclude_unset=True)

        # Generate a slug if missing
        base_slug = data.get("slug") or slugify(data["title"])
        slug = base_slug
        n = 2
        while await self.slug_exists(slug):
            slug = f"{base_slug}-{n}"
            n += 1
        data["slug"] = slug

        response = self.supabase.table("projects").insert(data).execute()
        return response.data[0]

    async def update(self, project_id: str, payload: ProjectUpdate) -> Optional[dict]:
        """Update only the fields the admin sent."""
        updates = payload.model_dump(mode="json", exclude_unset=True)

        # If the admin changed the slug, make sure it's still unique
        if "slug" in updates:
            if await self.slug_exists(updates["slug"], exclude_id=project_id):
                raise ValueError(f"Slug '{updates['slug']}' is already in use")

        if not updates:
            response = (
                self.supabase.table("projects")
                .select("*").eq("id", project_id).limit(1).execute()
            )
            return response.data[0] if response.data else None

        response = (
            self.supabase.table("projects")
            .update(updates)
            .eq("id", project_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def delete(self, project_id: str) -> bool:
        """Delete a project. Returns True if a row was removed."""
        response = (
            self.supabase.table("projects")
            .delete()
            .eq("id", project_id)
            .execute()
        )
        return bool(response.data)