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

# During development, allow the frontend to communicate
# with the FastAPI backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Route Registration
# --------------------------------------------------

# Each route module defines its own prefix and tags
# inside the router (e.g. APIRouter(prefix="/api/profile")).
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