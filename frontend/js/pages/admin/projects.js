// Admin projects: list, search/filter, create, edit, delete, image upload.
const rowsBox = document.getElementById("rows");
const search = document.getElementById("search");
const statusFilter = document.getElementById("statusFilter");
const dlg = document.getElementById("dlg");
const form = document.getElementById("pform");
const formError = document.getElementById("form-error");
const saveBtn = document.getElementById("saveBtn");
const preview = document.getElementById("preview");
const toastEl = document.getElementById("toast");

// name, kind (text | list | bool | num), required
const FIELDS = [
  ["title", "text", true], ["slug", "text", true], ["short_description", "text"], ["description", "text"],
  ["problem", "text"], ["solution", "text"], ["category", "text"], ["status", "text", true],
  ["technologies", "list"], ["github_url", "text"], ["live_url", "text"], ["featured_image_url", "text"],
  ["start_date", "text"], ["completion_date", "text"], ["is_featured", "bool"], ["display_order", "num"],
];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
let projects = [];
let editing = null;
let slugTouched = false;

function toast(msg, isErr) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ---------- list ---------- */
function render() {
  const q = search.value.trim().toLowerCase(), st = statusFilter.value;
  const list = projects.filter(p =>
    (!st || p.status === st) &&
    (!q || [p.title, p.slug, p.category, p.short_description].some(v => (v || "").toLowerCase().includes(q))));
  rowsBox.replaceChildren(...(list.length ? list.map(row) :
    [el("tr", {}, el("td", { colspan: 5, class: "empty", text: projects.length ? "No projects match your filters." : "No projects yet. Click “New project” to add one." }))]));
}
function row(p) {
  const img = safeUrl(p.featured_image_url);
  const thumb = el("div", { class: "thumb" });
  if (img) thumb.style.backgroundImage = 'url("' + img + '")';
  return el("tr", {},
    el("td", {}, el("div", { class: "proj" }, thumb,
      el("div", {}, el("b", {}, p.title, p.is_featured && el("span", { class: "star", title: "Featured", text: " ★" })), el("small", { text: "/" + p.slug })))),
    el("td", { text: p.category || "–" }),
    el("td", {}, el("span", { class: "badge b-" + String(p.status || "").replace(/\s/g, ""), text: p.status || "–" })),
    el("td", { text: p.display_order ?? 0 }),
    el("td", {}, el("div", { class: "row-actions" },
      el("button", { class: "btn sm", type: "button", text: "Edit", onclick: () => openForm(p) }),
      el("button", { class: "btn sm danger", type: "button", text: "Delete", onclick: () => remove(p) }))));
}
async function load() {
  try {
    projects = listOf(await api.get("/api/projects"), "projects")
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || String(b.created_at).localeCompare(String(a.created_at)));
    document.getElementById("page-error").replaceChildren();
    render();
  } catch (e) {
    document.getElementById("page-error").replaceChildren(el("p", { class: "notice err", text: e.message }));
    rowsBox.replaceChildren(el("tr", {}, el("td", { colspan: 5, class: "empty", text: "Could not load projects." })));
  }
}
search.addEventListener("input", render);
statusFilter.addEventListener("change", render);

/* ---------- form ---------- */
function showPreview() {
  const u = safeUrl(form.featured_image_url.value);
  preview.style.display = u ? "block" : "none";
  preview.style.backgroundImage = u ? 'url("' + u + '")' : "";
}
function openForm(p) {
  editing = p || null;
  slugTouched = !!p;
  formError.replaceChildren();
  document.getElementById("dlgTitle").textContent = p ? "Edit project" : "New project";
  FIELDS.forEach(([n, kind]) => {
    const i = form.elements[n], v = p ? p[n] : null;
    if (kind === "bool") i.checked = !!v;
    else if (kind === "list") i.value = (v || []).join(", ");
    else i.value = v ?? (n === "status" ? "In Progress" : "");
  });
  showPreview();
  dlg.showModal();
  form.title.focus();
}
function read() {
  const out = {};
  for (const [n, kind, req] of FIELDS) {
    const i = form.elements[n]; let v;
    if (kind === "bool") v = i.checked;
    else if (kind === "num") v = i.value === "" ? null : Number(i.value);
    else if (kind === "list") v = i.value.split(",").map(s => s.trim()).filter(Boolean);
    else v = i.value.trim() || null;
    if (req && !v) throw new Error((n === "title" ? "Title" : n === "slug" ? "Slug" : "Status") + " is required");
    if (v === null && (!editing || kind === "num")) continue; // omit empty optionals on create
    out[n] = v;
  }
  if (!SLUG_RE.test(out.slug)) throw new Error("Slug may only contain lowercase letters, numbers and single hyphens");
  return out;
}
form.title.addEventListener("input", () => { if (!slugTouched) form.slug.value = slugify(form.title.value); });
form.slug.addEventListener("input", () => { slugTouched = true; });
form.featured_image_url.addEventListener("input", showPreview);

form.addEventListener("submit", async ev => {
  ev.preventDefault();
  formError.replaceChildren();
  saveBtn.disabled = true;
  try {
    const payload = read();
    if (editing) await api.put("/api/projects/" + editing.id, payload, true);
    else await api.post("/api/projects", payload, true);
    dlg.close();
    toast(editing ? "Project updated" : "Project created");
    await load();
  } catch (e) { formError.replaceChildren(el("p", { class: "notice err", text: e.message })); }
  saveBtn.disabled = false;
});
document.getElementById("newBtn").addEventListener("click", () => openForm(null));
["closeBtn", "cancelBtn"].forEach(id => document.getElementById(id).addEventListener("click", () => dlg.close()));

async function remove(p) {
  if (!confirm("Delete “" + p.title + "”? This cannot be undone.")) return;
  try { await api.del("/api/projects/" + p.id, true); toast("Project deleted"); await load(); }
  catch (e) { toast(e.message, true); }
}

/* ---------- image upload (admin token + Storage policies) ---------- */
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
document.getElementById("imgBtn").addEventListener("click", () => document.getElementById("imgFile").click());
document.getElementById("imgFile").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  const btn = document.getElementById("imgBtn");
  try {
    if (!EXT[file.type]) throw new Error("Use a JPG, PNG, WebP or GIF image");
    if (file.size > 5 * 1048576) throw new Error("Image is larger than 5 MB");
    btn.disabled = true; btn.textContent = "Uploading…";
    const folder = "projects/" + (slugify(form.slug.value) || "misc");
    const path = folder + "/" + Date.now() + "." + EXT[file.type];
    const r = await fetch(SUPABASE_URL + "/storage/v1/object/portfolio-images/" + path, {
      method: "POST",
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + Auth.token(), "Content-Type": file.type },
      body: file,
    });
    if (!r.ok) { let m = "Upload failed"; try { const d = await r.json(); m = d.message || d.error || m; } catch {} throw new Error(m); }
    form.featured_image_url.value = SUPABASE_URL + "/storage/v1/object/public/portfolio-images/" + path;
    showPreview();
  } catch (err) { formError.replaceChildren(el("p", { class: "notice err", text: err.message })); }
  btn.disabled = false; btn.textContent = "Upload";
});

load();