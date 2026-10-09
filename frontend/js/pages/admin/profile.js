// Admin profile settings: load, edit, upload picture / CV to Supabase Storage, save via the API.
// Needs js/config.js, js/auth.js and js/api.js. Styled by css/admin.css.
const form = document.getElementById("profile-form");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");
const toastEl = document.getElementById("toast");

const FIELDS = ["full_name", "professional_title", "bio", "email", "phone", "whatsapp_number", "location",
  "github_url", "linkedin_url", "instagram_url", "profile_image_url", "cv_url", "availability_status", "availability_message"];
const REQUIRED = { full_name: "Name", availability_status: "Availability" };
const URL_FIELDS = { github_url: "GitHub", linkedin_url: "LinkedIn", instagram_url: "Instagram", cv_url: "CV" };
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
let saved = {};
let dirty = false;

/* ---------- small helpers ---------- */
const initials = n => { const w = (n || "?").trim().split(/\s+/); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
function toast(msg, isErr) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => toastEl.classList.remove("show"), 3200);
}
function setDirty(v) {
  dirty = v;
  statusEl.textContent = v ? "Unsaved changes" : "All changes saved";
  statusEl.classList.toggle("dirty", v);
}
function paintAvatar(node, url, name) {
  const safe = safeUrl(url);
  node.textContent = safe ? "" : initials(name);
  node.style.backgroundImage = safe ? 'url("' + safe + '")' : "";
}
function refreshAvatars() {
  const name = form.elements.full_name.value || "Admin";
  paintAvatar(document.getElementById("avatar"), form.elements.profile_image_url.value, name);
  paintAvatar(document.getElementById("userAvatar"), form.elements.profile_image_url.value, name);
  document.getElementById("userName").textContent = name;
}
const snapshot = () => Object.fromEntries(FIELDS.map(f => [f, form.elements[f].value]));

/* ---------- load / read / save ---------- */
function fillForm(p) {
  FIELDS.forEach(f => { form.elements[f].value = p[f] ?? (f === "availability_status" ? "Available" : ""); });
  saved = snapshot();
  refreshAvatars();
  setDirty(false);
}
function read() {
  const out = {};
  for (const f of FIELDS) {
    const v = form.elements[f].value.trim();
    if (!v && REQUIRED[f]) throw new Error(REQUIRED[f] + " is required");
    if (v && URL_FIELDS[f] && !safeUrl(v)) throw new Error(URL_FIELDS[f] + " link must start with http:// or https://");
    if (v && f === "email" && !EMAIL_RE.test(v)) throw new Error("That email address doesn’t look right");
    out[f] = v || null;
  }
  return out;
}
async function load() {
  try { fillForm(await api.get("/api/profile")); }
  catch (e) {
    document.getElementById("page-error").replaceChildren(el("p", { class: "notice err",
      text: /not found/i.test(e.message) ? "No profile row exists yet. In Supabase, run: insert into public.profiles (full_name) values ('Your Name');" : e.message }));
  }
}
form.addEventListener("input", () => { setDirty(true); refreshAvatars(); });
form.addEventListener("submit", async ev => {
  ev.preventDefault();
  saveBtn.disabled = true;
  try {
    await api.put("/api/profile", read(), true);
    saved = snapshot();
    setDirty(false);
    toast("Profile saved");
  } catch (e) { toast(e.message, true); }
  saveBtn.disabled = false;
});
document.getElementById("discard").addEventListener("click", () => {
  FIELDS.forEach(f => { form.elements[f].value = saved[f] ?? ""; });
  refreshAvatars();
  setDirty(false);
});
window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

/* ---------- uploads (admin token + Storage policies) ---------- */
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" };
async function upload(file, bucket, folder, allowed, maxMb) {
  if (!allowed.includes(file.type)) throw new Error("That file type is not allowed");
  if (file.size > maxMb * 1048576) throw new Error("File is larger than " + maxMb + " MB");
  const path = folder + "/" + Date.now() + "." + EXT[file.type];
  const r = await fetch(SUPABASE_URL + "/storage/v1/object/" + bucket + "/" + path, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + Auth.token(), "Content-Type": file.type },
    body: file,
  });
  if (!r.ok) {
    let m = "Upload failed";
    try { const d = await r.json(); m = d.message || d.error || m; } catch {}
    throw new Error(m);
  }
  return SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + path;
}
function wireUpload(buttons, input, field, bucket, folder, allowed, maxMb, label) {
  buttons.forEach(b => b.addEventListener("click", () => input.click()));
  input.addEventListener("change", async () => {
    const file = input.files[0]; input.value = "";
    if (!file) return;
    buttons.forEach(b => (b.disabled = true));
    try {
      form.elements[field].value = await upload(file, bucket, folder, allowed, maxMb);
      setDirty(true); refreshAvatars();
      toast(label + " uploaded. Click Save changes to keep it.");
    } catch (e) { toast(e.message, true); }
    buttons.forEach(b => (b.disabled = false));
  });
}
wireUpload([document.getElementById("camBtn"), document.getElementById("picBtn")], document.getElementById("picFile"),
  "profile_image_url", "portfolio-images", "profile", ["image/jpeg", "image/png", "image/webp", "image/gif"], 5, "Picture");
wireUpload([document.getElementById("cvBtn")], document.getElementById("cvFile"),
  "cv_url", "portfolio-documents", "cv", ["application/pdf"], 10, "CV");

/* ---------- user menu + session info ---------- */
const menuBtn = document.getElementById("userBtn"), menu = document.getElementById("userMenu");
menuBtn.addEventListener("click", e => { e.stopPropagation(); const o = menu.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); });
menu.addEventListener("click", e => e.stopPropagation());
document.addEventListener("click", () => { menu.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") menu.classList.remove("open"); });

(function session() {
  let claims = {};
  try { claims = JSON.parse(atob(Auth.token().split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch {}
  document.getElementById("sess-email").textContent = claims.email || "–";
  document.getElementById("sess-exp").textContent = claims.exp ? new Date(claims.exp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–";
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const phone = /Android|iPhone|iPad/.test(ua);
  const row = document.getElementById("sess-device");
  row.innerHTML = phone // static, trusted markup
    ? '<svg class="i" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>'
    : '<svg class="i" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 20h20"/></svg>';
  row.append(el("span", {}, os + " · " + br + " ", el("b", { text: "(this device)" })));
})();

load();