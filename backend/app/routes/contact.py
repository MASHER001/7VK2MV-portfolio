"""
Route: Contact
Location: backend/app/routes/contact.py

Endpoints:
    POST   /api/contact                    → public, submit a message
    GET    /api/contact/messages           → admin, inbox list
    GET    /api/contact/messages/{id}      → admin, single message
    PATCH  /api/contact/messages/{id}      → admin, update flags
    DELETE /api/contact/messages/{id}      → admin, delete
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.dependencies import get_supabase, get_current_admin
from app.schemas.contact import (
    ContactCreate,
    ContactSubmitResponse,
    MessageResponse,
    MessageUpdate,
)
from app.services.contact_service import ContactService

router = APIRouter(prefix="/api/contact", tags=["Contact"])


# Rate limit: max 3 submissions per hour per IP
RATE_LIMIT_MAX = 3
RATE_LIMIT_WINDOW_SECONDS = 3600


def _client_ip(request: Request) -> Optional[str]:
    """
    Extract the client IP, preferring the proxy header when behind
    Vercel/Cloudflare/a reverse proxy.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First entry is the original client
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# ---------- Public ----------

@router.post(
    "",
    response_model=ContactSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact message",
    description="Public endpoint. Rate-limited and honeypot-protected.",
)
async def submit_contact(
    payload: ContactCreate,
    request: Request,
    supabase=Depends(get_supabase),
):
    """
    Accept a contact form submission.

    Anti-spam:
    - Honeypot field `website` — if filled, silently succeed without storing.
    - Rate limit: max 3 submissions per hour per IP.
    """
    service = ContactService(supabase)

    # 1. Honeypot — bots fill every field they see.
    # Return success so the bot doesn't retry, but don't store anything.
    if payload.website:
        return ContactSubmitResponse()

    # 2. Rate limit by IP
    ip = _client_ip(request)
    if ip:
        recent = await service.recent_submission_count(
            ip, since_seconds=RATE_LIMIT_WINDOW_SECONDS
        )
        if recent >= RATE_LIMIT_MAX:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many messages. Please try again later.",
            )

    # 3. Store
    user_agent = request.headers.get("user-agent")
    await service.submit_message(payload, ip_address=ip, user_agent=user_agent)

    return ContactSubmitResponse()


# ---------- Admin ----------

@router.get(
    "/messages",
    response_model=List[MessageResponse],
    summary="List contact messages (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def list_messages(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_replied: Optional[bool] = Query(None, description="Filter by replied status"),
    supabase=Depends(get_supabase),
):
    service = ContactService(supabase)
    return await service.list_messages(is_read=is_read, is_replied=is_replied)


@router.get(
    "/messages/{message_id}",
    response_model=MessageResponse,
    summary="Get a contact message (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def get_message(
    message_id: str,
    supabase=Depends(get_supabase),
):
    service = ContactService(supabase)
    msg = await service.get_message(message_id)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )
    return msg


@router.patch(
    "/messages/{message_id}",
    response_model=MessageResponse,
    summary="Update message flags (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def update_message(
    message_id: str,
    payload: MessageUpdate,
    supabase=Depends(get_supabase),
):
    service = ContactService(supabase)
    updated = await service.update_message(message_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )
    return updated


@router.delete(
    "/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a message (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def delete_message(
    message_id: str,
    supabase=Depends(get_supabase),
):
    service = ContactService(supabase)
    deleted = await service.delete_message(message_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )
    return None