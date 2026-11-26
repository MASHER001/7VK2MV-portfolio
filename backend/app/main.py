
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    profile,
    projects,
    skills,
    certificates,
    contact,
    achievements,
)

app = FastAPI(
    title="Victor Machariah Portfolio API",
    description="Backend API for Victor Lewis Machariah's personal portfolio.",
    version="2.0.0",
)

# CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://victor-machariah.vercel.app",
    "https://7vk2mv-portfolio-frontend.vercel.app",
]

ALLOWED_ORIGINS += [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=(
        r"https://(victor-machariah|7vk2mv-portfolio-frontend)"
        r"-.*\.vercel\.app"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(profile.router)
app.include_router(projects.router)
app.include_router(skills.router)
app.include_router(certificates.router)
app.include_router(contact.router)
app.include_router(achievements.router)


@app.get("/")
def root():
    return {
        "message": "Victor Machariah Portfolio API",
        "status": "online",
        "version": "2.0.0",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "portfolio-api",
    }


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
            "achievements": "/api/achievements",
            "contact": "/api/contact",
        },
        "documentation": "/docs",
    }
