// Admin sign-in: Supabase Auth login, then confirm the user is an admin via the backend.
const form = document.getElementById("login-form");
const out = document.getElementById("login-result");
const submitBtn = document.getElementById("submitBtn");
const pw = document.getElementById("password");

// Already signed in? Go straight to the dashboard (an expired token is cleared there).
if (Auth.token()) location.replace("dashboard.html");

if (new URLSearchParams(location.search).get("expired")) {
  out.replaceChildren(el("p", { class: "notice err", text: "Your session expired. Please sign in again." }));
}

document.getElementById("togglePw").addEventListener("click", e => {
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  e.currentTarget.textContent = show ? "Hide" : "Show";
  e.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
});


// -----------------------------------------------------------------------------
// Error rendering helpers
// -----------------------------------------------------------------------------

/**
 * Render an error message in the #login-result element.
 * Always visible — no silent failures.
 */
function renderError(title, detail) {
  out.replaceChildren();
  const box = document.createElement("div");
  box.className = "notice err";

  const heading = document.createElement("p");
  heading.style.margin = "0 0 4px 0";
  heading.style.fontWeight = "bold";
  heading.textContent = title;
  box.appendChild(heading);

  if (detail) {
    const body = document.createElement("p");
    body.style.margin = "0";
    body.style.fontSize = "0.9em";
    body.textContent = detail;
    box.appendChild(body);
  }

  out.appendChild(box);
}

/**
 * Pull a human-readable message out of whatever was thrown.
 * Handles: Error, Response-like objects, Supabase error shapes, plain strings.
 */
function describeError(e) {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;

  // FastAPI-style { detail: "..." }
  if (e.detail) {
    return typeof e.detail === "string" ? e.detail : JSON.stringify(e.detail);
  }

  // Supabase errors often carry `message` and `status`
  if (e.message) {
    return e.status ? `${e.message} (HTTP ${e.status})` : e.message;
  }

  // Fetch NetworkError / TypeError
  if (e.name === "TypeError") {
    return "Network error — the backend may be offline or blocked by CORS.";
  }

  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}


// -----------------------------------------------------------------------------
// Submit handler
// -----------------------------------------------------------------------------

form.addEventListener("submit", async ev => {
  ev.preventDefault();
  out.replaceChildren();

  // ---- 1. Client-side validation ----
  const email = form.email.value.trim();
  const password = pw.value;

  if (!email || !password) {
    renderError("Missing credentials", "Enter both your email and password.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    renderError("Invalid email", `"${email}" doesn't look like a valid email address.`);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  // ---- 2. Supabase Auth login ----
  try {
    await Auth.login(email, password);
  } catch (e) {
    console.error("[login] Auth.login failed:", e);
    sessionStorage.removeItem(Auth.key);
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";

    // Supabase returns specific messages for common cases.
    const msg = describeError(e).toLowerCase();
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      renderError(
        "Incorrect email or password",
        "Double-check your credentials. If you recently created this user manually, make sure the password hash is valid."
      );
    } else if (msg.includes("email not confirmed")) {
      renderError(
        "Email not confirmed",
        "Confirm your email in the Supabase dashboard under Authentication → Users."
      );
    } else if (msg.includes("identity") || msg.includes("not found")) {
      renderError(
        "Auth identity missing",
        "This user exists in auth.users but has no matching row in auth.identities. Add the identity row in Supabase."
      );
    } else {
      renderError("Sign-in failed", describeError(e));
    }
    return;
  }

  // ---- 3. Verify the user is an admin via the backend ----
  try {
    await api.get("/api/contact/messages", true);
  } catch (e) {
    console.error("[login] Admin check failed:", e);
    sessionStorage.removeItem(Auth.key);
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";

    // api.get() may throw a Response, an Error, or an object with .status.
    const status = e?.status ?? e?.response?.status ?? null;
    const detail = describeError(e);

    if (status === 403 || /administrator access required/i.test(detail)) {
      renderError(
        "Not an administrator",
        "You're signed in, but your account isn't listed in admin_users. " +
        "Add a row with your user_id and role='admin' in Supabase."
      );
    } else if (status === 401) {
      renderError(
        "Session rejected by backend",
        "The backend couldn't verify your token. Check SUPABASE_SERVICE_ROLE_KEY in .env and restart the server."
      );
    } else if (status === 404) {
      renderError(
        "Admin check endpoint missing",
        "The backend returned 404 for /api/contact/messages. Is the contact router registered in main.py?"
      );
    } else if (e?.name === "TypeError" || /failed to fetch|networkerror/i.test(detail)) {
      renderError(
        "Cannot reach backend",
        "The FastAPI server isn't responding. Check that uvicorn is running on http://127.0.0.1:8000 " +
        "and that CORS allows your frontend origin."
      );
    } else if (status === 500) {
      renderError(
        "Backend error",
        "The server threw an internal error during the admin check. Check the uvicorn terminal for a traceback."
      );
    } else {
      renderError("Admin verification failed", detail || "Unexpected error during admin check.");
    }
    return;
  }

  // ---- 4. Success ----
  submitBtn.textContent = "Redirecting…";
  location.href = "dashboard.html";
});