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

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.admin !== undefined) Auth.requireAdmin();
  document.querySelectorAll("[data-logout]").forEach(b =>
    b.addEventListener("click", () => Auth.logout())
  );
});