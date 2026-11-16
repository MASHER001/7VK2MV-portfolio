import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import profile, projects, skills, certificates, contact


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Victor Machariah Portfolio API",
    description="Backend API for Victor Lewis Machariah's personal portfolio.",
    version="2.0.0",
)


# --------------------------------------------------
# CORS Configuration
# --------------------------------------------------
# Each origin must match exactly: https://, no trailing slash, no path.
# To add another address without editing code, set CORS_ORIGINS in Vercel
# (Settings -> Environment Variables) as a comma-separated list.

ALLOWED_ORIGINS = [
    # Local development
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    # Production — Vercel
    "https://victor-machariah.vercel.app",           # current address
    "https://7vk2mv-portfolio-frontend.vercel.app",  # old address
]

ALLOWED_ORIGINS += [
    o.strip().rstrip("/")
    for o in os.getenv("CORS_ORIGINS", "").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Also allow Vercel preview deployments (branch builds) of either project name
    allow_origin_regex=r"https://(victor-machariah|7vk2mv-portfolio-frontend)-.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Route Registration
# --------------------------------------------------

app.include_router(profile.router)
app.include_router(projects.router)
app.include_router(skills.router)
app.include_router(certificates.router)
app.include_router(contact.router)


# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Victor Machariah Portfolio API",
        "status": "online",
        "version": "2.0.0",
    }


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "portfolio-api",
    }


# --------------------------------------------------
# API Information
# --------------------------------------------------

@app.get("/api")
def api_info():
    return {
        "name": "Victor Machariah Portfolio API",
        "version": "2.0.0",
        "endpoints": {
            "profile": "/api/profile",
            "skills": "/api/skills",
            "projects": "/api/projects",
            "certificates": "/api/certificates",
            "contact": "/api/contact",
        },
        "documentation": "/docs",
    }