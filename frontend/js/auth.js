// Admin login + route guard. The real protection is the backend (401/403).
// Supabase URL and key come from config.js (window.SUPABASE_URL / window.SUPABASE_PUBLISHABLE_KEY).

const Auth = {
  key: "vp_admin_token",

  token() {
    return sessionStorage.getItem(this.key);
  },

  async login(email, password) {
    const r = await fetch(
      window.SUPABASE_URL + "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: {
          apikey: window.SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );
    const d = await r.json();
    if (!r.ok) throw new Error(d.error_description || d.msg || "Login failed");
    sessionStorage.setItem(this.key, d.access_token);
  },

  logout(expired) {
    sessionStorage.removeItem(this.key);
    location.href = "login.html" + (expired ? "?expired=1" : "");
  },

  requireAdmin() {
    if (!this.token()) location.replace("login.html");
  },
};

/* ---------------------------------------------------------------------
   Admin hamburger menu: turns the sidebar into a slide-in drawer.
   Runs on every admin page that loads auth.js and has a .sidebar.
   Styles live in css/admin.css (HAMBURGER MENU section).
   --------------------------------------------------------------------- */
function initAdminNav() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar || document.querySelector(".nav-toggle")) return; // no sidebar (login) or already set up

  if (!sidebar.id) sidebar.id = "adminSidebar";

  // Button: start of the top bar, or floating in the corner when the page has no top bar
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-toggle";
  btn.setAttribute("aria-label", "Open menu");
  btn.setAttribute("aria-controls", sidebar.id);
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>';

  const topbar = document.querySelector(".topbar");
  if (topbar) topbar.prepend(btn);
  else { btn.classList.add("floating"); document.body.prepend(btn); }

  // Dark layer behind the open drawer
  const backdrop = document.createElement("div");
  backdrop.className = "nav-backdrop";
  backdrop.hidden = true;
  document.body.append(backdrop);

  function setOpen(open) {
    document.body.classList.toggle("nav-open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    backdrop.hidden = !open;
    if (open) {
      const first = sidebar.querySelector("a, button");
      if (first) first.focus({ preventScroll: true });
    } else if (document.activeElement && sidebar.contains(document.activeElement)) {
      btn.focus({ preventScroll: true });
    }
  }

  btn.addEventListener("click", () => setOpen(!document.body.classList.contains("nav-open")));
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("nav-open")) setOpen(false);
  });
  sidebar.addEventListener("click", e => {
    if (e.target.closest("a")) setOpen(false); // close after choosing a page
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.admin !== undefined) Auth.requireAdmin();
  document.querySelectorAll("[data-logout]").forEach(b =>
    b.addEventListener("click", () => Auth.logout())
  );
  initAdminNav();
});