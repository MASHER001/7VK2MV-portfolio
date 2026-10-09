"""
Route: Certificates
Location: backend/app/routes/certificates.py

Endpoints:
    GET    /api/certificates                 → public, list all (filter ?category=)
    GET    /api/certificates/featured        → public, featured only
    GET    /api/certificates/{id}            → admin, single cert (for edit form)
    POST   /api/certificates                 → admin, create
    PUT    /api/certificates/{id}            → admin, update
    DELETE /api/certificates/{id}            → admin, delete
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_supabase, get_current_admin
from app.schemas.certificate import (
    CertificateCreate,
    CertificateResponse,
    CertificateUpdate,
)
from app.services.certificate_service import CertificateService

router = APIRouter(prefix="/api/certificates", tags=["Certificates"])


# ---------- Public ----------

@router.get(
    "",
    response_model=List[CertificateResponse],
    summary="List all certificates",
)
async def list_certificates(
    category: Optional[str] = Query(None, description="Filter by category"),
    supabase=Depends(get_supabase),
):
    service = CertificateService(supabase)
    return await service.list_certificates(category=category)


@router.get(
    "/featured",
    response_model=List[CertificateResponse],
    summary="List featured certificates",
)
async def list_featured(supabase=Depends(get_supabase)):
    service = CertificateService(supabase)
    return await service.list_featured()


# ---------- Admin ----------

@router.get(
    "/{cert_id}",
    response_model=CertificateResponse,
    summary="Get a certificate by id (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def get_certificate(cert_id: str, supabase=Depends(get_supabase)):
    service = CertificateService(supabase)
    cert = await service.get_by_id(cert_id)
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )
    return cert


@router.post(
    "",
    response_model=CertificateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a certificate (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def create_certificate(
    payload: CertificateCreate,
    supabase=Depends(get_supabase),
):
    service = CertificateService(supabase)
    return await service.create(payload)


@router.put(
    "/{cert_id}",
    response_model=CertificateResponse,
    summary="Update a certificate (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def update_certificate(
    cert_id: str,
    payload: CertificateUpdate,
    supabase=Depends(get_supabase),
):
    service = CertificateService(supabase)
    try:
        updated = await service.update(cert_id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )
    return updated


@router.delete(
    "/{cert_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a certificate (admin)",
    dependencies=[Depends(get_current_admin)],
)
async def delete_certificate(
    cert_id: str,
    supabase=Depends(get_supabase),
):
    service = CertificateService(supabase)
    deleted = await service.delete(cert_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )
    return None