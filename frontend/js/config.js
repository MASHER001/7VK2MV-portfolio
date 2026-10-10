/* =====================================================================
   config.js — frontend configuration
   Values are attached to `window` so any script can read them.
   ===================================================================== */

/* Detect whether we're running locally or in production */
const IS_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);

/* Backend API URL */
window.API_BASE = IS_LOCAL
  ? "http://127.0.0.1:8000"                            // local dev
  : "https://portfolio-machariah-api.fly.dev";         // production (Fly.io)

/* Supabase — publishable key only, never the secret key */
window.SUPABASE_URL = "https://znwsinceeqaqievnedhb.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";