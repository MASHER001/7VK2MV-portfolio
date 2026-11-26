// Admin achievements: list, search/filter, create, edit, delete, image upload.
// The New/Edit form lives in a <template>. It is added to the page only while it is open
// and removed again as soon as it is closed (Cancel, X, Esc, click outside, or after saving).
const rowsBox = document.getElementById("rows");
const search = document.getElementById("search");
const catFilter = document.getElementById("catFilter");
const toastEl = document.getElementById("toast");
const tpl = document.getElementById("dlgTpl");

// name, kind (text | bool | num), required
const FIELDS = [
  ["title", "text", true], ["category", "text"], ["description", "text"], ["achievement_date", "text"],
  ["evidence_url", "text"], ["image_url", "text"], ["is_featured", "bool"], ["display_order", "num"],
];
const LABELS = { title: "Title" };

// Fail early with a readable message if this script is paired with a page that has different ids / field names.
(function checkPage() {
  const missing = ["rows", "search", "catFilter", "newBtn", "toast", "page-error", "dlgTpl"].filter(id => !document.getElementById(id));
  if (tpl) {
    ["aform", "closeBtn", "cancelBtn", "saveBtn", "dlgTitle", "form-error", "preview", "imgBtn", "imgFile"]
      .forEach(id => { if (!tpl.content.getElementById(id)) missing.push("form element “" + id + "”"); });
    FIELDS.forEach(([n]) => { if (!tpl.content.querySelector('[name="' + n + '"]')) missing.push("field “" + n + "”"); });
  }
  if (!missing.length) return;
  const msg = "This page doesn’t match the achievements script. Missing: " + missing.join(", ") + ". Use the achievements.html that comes with this script.";
  document.body.prepend(el("p", { class: "notice err", text: msg }));
  throw new Error(msg);
})();

let items = [];
let editing = null;
let dlg = null, form = null, formError = null, saveBtn = null, preview = null; // set while the form is open

function toast(msg, isErr) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}
const fmt = d => d ? new Date(d + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "–";

/* ---------- list ---------- */
function fillCategories() {
  const keep = catFilter.value;
  const cats = [...new Set(items.map(a => a.category).filter(Boolean))].sort();
  catFilter.replaceChildren(el("option", { value: "", text: "All categories" }), ...cats.map(c => el("option", { value: c, text: c })));
  catFilter.value = cats.includes(keep) ? keep : "";
}
function render() {
  const q = search.value.trim().toLowerCase(), cat = catFilter.value;
  const list = items.filter(a =>
    (!cat || a.category === cat) &&
    (!q || [a.title, a.category, a.description].some(v => (v || "").toLowerCase().includes(q))));
  rowsBox.replaceChildren(...(list.length ? list.map(row) :
    [el("tr", {}, el("td", { colspan: 5, class: "empty", text: items.length ? "No achievements match your filters." : "No achievements yet. Click “New achievement” to add one." }))]));
}
function row(a) {
  const img = safeUrl(a.image_url);
  const thumb = el("div", { class: "thumb" });
  if (img) thumb.style.backgroundImage = 'url("' + img + '")';
  return el("tr", {},
    el("td", {}, el("div", { class: "cert" }, thumb,
      el("div", {}, el("b", {}, a.title, a.is_featured && el("span", { class: "star", title: "Featured", text: " ★" })), a.description && el("small", { text: a.description })))),
    el("td", { text: a.category || "–" }),
    el("td", { text: fmt(a.achievement_date) }),
    el("td", { text: a.display_order ?? 0 }),
    el("td", {}, el("div", { class: "row-actions" },
      el("button", { class: "btn secondary sm", type: "button", text: "Edit", onclick: () => openForm(a) }),
      el("button", { class: "btn sm danger", type: "button", text: "Delete", onclick: () => remove(a) }))));
}
async function load() {
  try {
    items = listOf(await api.get("/api/achievements"), "achievements")
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || String(b.achievement_date || "").localeCompare(String(a.achievement_date || "")));
    document.getElementById("page-error").replaceChildren();
    fillCategories(); render();
  } catch (e) {
    document.getElementById("page-error").replaceChildren(el("p", { class: "notice err", text: e.message }));
    rowsBox.replaceChildren(el("tr", {}, el("td", { colspan: 5, class: "empty", text: "Could not load achievements." })));
  }
}
search.addEventListener("input", render);
catFilter.addEventListener("change", render);

/* ---------- the form: added to the page when needed, removed when closed ---------- */
function mountForm() {
  dlg = tpl.content.firstElementChild.cloneNode(true);
  document.body.append(dlg);
  form = dlg.querySelector("#aform");
  formError = dlg.querySelector("#form-error");
  saveBtn = dlg.querySelector("#saveBtn");
  preview = dlg.querySelector("#preview");

  dlg.querySelector("#closeBtn").addEventListener("click", closeForm);
  dlg.querySelector("#cancelBtn").addEventListener("click", closeForm);
  dlg.addEventListener("click", e => { if (e.target === dlg) closeForm(); }); // click on the dark area outside the form
  dlg.addEventListener("close", unmountForm);                                  // also covers the Esc key
  form.elements.image_url.addEventListener("input", showPreview);
  form.addEventListener("submit", onSubmit);
  wireUpload("imgBtn", "imgFile", "image_url", "portfolio-images", "achievements", ["image/jpeg", "image/png", "image/webp", "image/gif"], 5, "Upload");
}
function unmountForm() {
  if (!dlg) return;
  const d = dlg;
  dlg = form = formError = saveBtn = preview = null;
  d.remove();
}
function closeForm() {
  if (!dlg) return;
  if (dlg.close) dlg.close(); else unmountForm();
}
function openForm(a) {
  if (dlg) return;
  editing = a || null;
  mountForm();
  dlg.querySelector("#dlgTitle").textContent = a ? "Edit achievement" : "New achievement";
  FIELDS.forEach(([n, kind]) => {
    const i = form.elements[n], v = a ? a[n] : null;
    if (kind === "bool") i.checked = !!v; else i.value = v ?? "";
  });
  if (!a) form.elements.display_order.value = 0;
  showPreview();
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  form.elements.title.focus();
}
function showPreview() {
  if (!form) return;
  const u = safeUrl(form.elements.image_url.value);
  preview.style.display = u ? "block" : "none";
  preview.style.backgroundImage = u ? 'url("' + u + '")' : "";
  preview.style.backgroundSize = "contain";
}
function read() {
  const out = {};
  for (const [n, kind, req] of FIELDS) {
    const i = form.elements[n]; let v;
    if (kind === "bool") v = i.checked;
    else if (kind === "num") v = i.value === "" ? null : Number(i.value);
    else v = i.value.trim() || null;
    if (req && !v) throw new Error(LABELS[n] + " is required");
    if (v === null && (!editing || kind === "num")) continue; // omit empty optionals on create
    out[n] = v;
  }
  return out;
}
async function onSubmit(ev) {
  ev.preventDefault();
  const wasEditing = !!editing;
  formError.replaceChildren();
  saveBtn.disabled = true;
  try {
    const payload = read();
    if (wasEditing && !editing.id) throw new Error("This achievement has no id in the API response, so it can't be updated. The backend response schema must include id.");
    if (wasEditing) await api.put("/api/achievements/" + editing.id, payload, true);
    else await api.post("/api/achievements", payload, true);
    closeForm();
    toast(wasEditing ? "Achievement updated" : "Achievement created");
    await load();
  } catch (e) {
    if (formError) formError.replaceChildren(el("p", { class: "notice err", text: e.message }));
  }
  if (saveBtn) saveBtn.disabled = false;
}
document.getElementById("newBtn").addEventListener("click", () => openForm(null));

async function remove(a) {
  if (!a.id) { toast("This achievement has no id in the API response, so it can't be deleted.", true); return; }
  if (!confirm("Delete “" + a.title + "”? This cannot be undone.")) return;
  try { await api.del("/api/achievements/" + a.id, true); toast("Achievement deleted"); await load(); }
  catch (e) { toast(e.message, true); }
}

/* ---------- image upload (admin token + Storage policies) ---------- */
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
async function upload(file, bucket, folder, allowed, maxMb) {
  if (!allowed.includes(file.type)) throw new Error("That file type is not allowed");
  if (file.size > maxMb * 1048576) throw new Error("File is larger than " + maxMb + " MB");
  const path = folder + "/" + Date.now() + "." + EXT[file.type];
  const r = await fetch(SUPABASE_URL + "/storage/v1/object/" + bucket + "/" + path, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + Auth.token(), "Content-Type": file.type },
    body: file,
  });
  if (!r.ok) { let m = "Upload failed"; try { const d = await r.json(); m = d.message || d.error || m; } catch {} throw new Error(m); }
  return SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + path;
}
function wireUpload(btnId, fileId, field, bucket, folder, allowed, maxMb, idle) {
  const btn = dlg.querySelector("#" + btnId), input = dlg.querySelector("#" + fileId), target = form.elements[field];
  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files[0]; input.value = "";
    if (!file) return;
    formError.replaceChildren();
    btn.disabled = true; btn.textContent = "Uploading…";
    try { target.value = await upload(file, bucket, folder, allowed, maxMb); showPreview(); }
    catch (e) { if (formError.isConnected) formError.replaceChildren(el("p", { class: "notice err", text: e.message })); }
    if (btn.isConnected) { btn.disabled = false; btn.textContent = idle; }
  });
}

load();