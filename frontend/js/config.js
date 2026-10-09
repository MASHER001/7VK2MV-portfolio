// config.js
// Single place to configure the frontend.

// -----------------------------------------------------------------------------
// Backend API
// -----------------------------------------------------------------------------

// Local development: FastAPI running on uvicorn
// Production: replace with your deployed backend URL (Render, Railway, Fly, etc.)
const IS_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);

window.API_BASE = IS_LOCAL
  ? "http://127.0.0.1:8000"
  : "http://127.0.0.1:8000"; // ← update this when you deploy the backend


// -----------------------------------------------------------------------------
// Supabase
// -----------------------------------------------------------------------------

// Project URL — from Supabase Dashboard → Settings → API → Project URL
window.SUPABASE_URL = "https://znwsinceeqaqievnedhb.supabase.co";

// Anon (publishable) key — legacy JWT format.
// This is PUBLIC and safe to embed in frontend code. RLS protects your data.
// NEVER put the service_role / secret key here.
window.SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpud3NpbmNlZXFhcWlldm5lZGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTg1NDYsImV4cCI6MjEwMDE5NDU0Nn0.Xlwu7h4acgNVjwdyqWL2LAe5tVuEy-gnO0-63lh3gas";