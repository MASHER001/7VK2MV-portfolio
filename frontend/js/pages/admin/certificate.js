// Admin certificates: list, search/filter, create, edit, delete, image + PDF upload.
const rowsBox = document.getElementById("rows");
const search = document.getElementById("search");
const catFilter = document.getElementById("catFilter");
const dlg = document.getElementById("dlg");
const form = document.getElementById("cform");
const formError = document.getElementById("form-error");
const saveBtn = document.getElementById("saveBtn");
const preview = document.getElementById("preview");
const toastEl = document.getElementById("toast");

// name, kind (text | bool | num), required
const FIELDS = [
  ["title", "text", true], ["issuer", "text", true], ["category", "text"], ["description", "text"],
  ["issue_date", "text"], ["expiry_date", "text"], ["credential_id", "text"], ["credential_url", "text"],
  ["image_url", "text"], ["pdf_url", "text"], ["is_featured", "bool"], ["display_order", "num"],
];
const LABELS = { title: "Title", issuer: "Issuer" };

// Fail early with a readable message if this script is paired with a page that has different ids / field names.
(function checkPage() {
  const ids = ["rows", "search", "catFilter", "dlg", "cform", "form-error", "saveBtn", "preview", "toast", "newBtn",
    "closeBtn", "cancelBtn", "dlgTitle", "imgBtn", "imgFile", "pdfBtn", "pdfFile", "page-error"];
  const missing = ids.filter(id => !document.getElementById(id));
  if (form) FIELDS.forEach(([n]) => { if (!form.elements[n]) missing.push("field “" + n + "”"); });
  if (!missing.length) return;
  const msg = "This page doesn’t match the certificates script. Missing: " + missing.join(", ") + ". Use the certificates.html that comes with this script.";
  document.body.prepend(el("p", { class: "notice err", text: msg }));
  throw new Error(msg);
})();
let certs = [];
let editing = null;

function toast(msg, isErr) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}
const fmt = d => d ? new Date(d + "T00:00:00").toLocaleDateString([], { month: "short", year: "numeric" }) : "–";
const expired = c => c.expiry_date && new Date(c.expiry_date + "T23:59:59") < new Date();

/* ---------- list ---------- */
function fillCategories() {
  const keep = catFilter.value;
  const cats = [...new Set(certs.map(c => c.category).filter(Boolean))].sort();
  catFilter.replaceChildren(el("option", { value: "", text: "All categories" }), ...cats.map(c => el("option", { value: c, text: c })));
  catFilter.value = cats.includes(keep) ? keep : "";
}
function render() {
  const q = search.value.trim().toLowerCase(), cat = catFilter.value;
  const list = certs.filter(c =>
    (!cat || c.category === cat) &&
    (!q || [c.title, c.issuer, c.category, c.credential_id].some(v => (v || "").toLowerCase().includes(q))));
  rowsBox.replaceChildren(...(list.length ? list.map(row) :
    [el("tr", {}, el("td", { colspan: 6, class: "empty", text: certs.length ? "No certificates match your filters." : "No certificates yet. Click “New certificate” to add one." }))]));
}
function row(c) {
  const img = safeUrl(c.image_url);
  const thumb = el("div", { class: "thumb" });
  if (img) thumb.style.backgroundImage = 'url("' + img + '")';
  const validity = !c.expiry_date ? el("span", { class: "badge b-none", text: "No expiry" })
    : expired(c) ? el("span", { class: "badge b-exp", text: "Expired " + fmt(c.expiry_date) })
    : el("span", { class: "badge b-ok", text: "Until " + fmt(c.expiry_date) });
  return el("tr", {},
    el("td", {}, el("div", { class: "cert" }, thumb,
      el("div", {}, el("b", {}, c.title, c.is_featured && el("span", { class: "star", title: "Featured", text: " ★" })), el("small", { text: c.issuer })))),
    el("td", { text: c.category || "–" }),
    el("td", { text: fmt(c.issue_date) }),
    el("td", {}, validity),
    el("td", { text: c.display_order ?? 0 }),
    el("td", {}, el("div", { class: "row-actions" },
      el("button", { class: "btn secondary sm", type: "button", text: "Edit", onclick: () => openForm(c) }),
      el("button", { class: "btn sm danger", type: "button", text: "Delete", onclick: () => remove(c) }))));
}
async function load() {
  try {
    certs = listOf(await api.get("/api/certificates"), "certificates")
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || String(b.issue_date || "").localeCompare(String(a.issue_date || "")));
    document.getElementById("page-error").replaceChildren();
    fillCategories(); render();
  } catch (e) {
    document.getElementById("page-error").replaceChildren(el("p", { class: "notice err", text: e.message }));
    rowsBox.replaceChildren(el("tr", {}, el("td", { colspan: 6, class: "empty", text: "Could not load certificates." })));
  }
}
search.addEventListener("input", render);
catFilter.addEventListener("change", render);

/* ---------- form ---------- */
function showPreview() {
  const u = safeUrl(form.elements.image_url.value);
  preview.style.display = u ? "block" : "none";
  preview.style.backgroundImage = u ? 'url("' + u + '")' : "";
  preview.style.backgroundSize = "contain";
}
function openForm(c) {
  editing = c || null;
  formError.replaceChildren();
  document.getElementById("dlgTitle").textContent = c ? "Edit certificate" : "New certificate";
  FIELDS.forEach(([n, kind]) => {
    const i = form.elements[n], v = c ? c[n] : null;
    if (kind === "bool") i.checked = !!v; else i.value = v ?? "";
  });
  showPreview();
  dlg.showModal();
  form.elements.title.focus();
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
  if (out.issue_date && out.expiry_date && out.expiry_date < out.issue_date) throw new Error("The expiry date can’t be before the issue date");
  return out;
}
form.elements.image_url.addEventListener("input", showPreview);
form.addEventListener("submit", async ev => {
  ev.preventDefault();
  formError.replaceChildren();
  saveBtn.disabled = true;
  try {
    const payload = read();
    if (editing) await api.put("/api/certificates/" + editing.id, payload, true);
    else await api.post("/api/certificates", payload, true);
    dlg.close();
    toast(editing ? "Certificate updated" : "Certificate created");
    await load();
  } catch (e) { formError.replaceChildren(el("p", { class: "notice err", text: e.message })); }
  saveBtn.disabled = false;
});
document.getElementById("newBtn").addEventListener("click", () => openForm(null));
["closeBtn", "cancelBtn"].forEach(id => document.getElementById(id).addEventListener("click", () => dlg.close()));

async function remove(c) {
  if (!confirm("Delete “" + c.title + "”? This cannot be undone.")) return;
  try { await api.del("/api/certificates/" + c.id, true); toast("Certificate deleted"); await load(); }
  catch (e) { toast(e.message, true); }
}

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
  if (!r.ok) { let m = "Upload failed"; try { const d = await r.json(); m = d.message || d.error || m; } catch {} throw new Error(m); }
  return SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + path;
}
function wireUpload(btnId, fileId, field, bucket, folder, allowed, maxMb, idle) {
  const btn = document.getElementById(btnId), input = document.getElementById(fileId);
  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files[0]; input.value = "";
    if (!file) return;
    formError.replaceChildren();
    btn.disabled = true; btn.textContent = "Uploading…";
    try { form.elements[field].value = await upload(file, bucket, folder, allowed, maxMb); showPreview(); }
    catch (e) { formError.replaceChildren(el("p", { class: "notice err", text: e.message })); }
    btn.disabled = false; btn.textContent = idle;
  });
}
wireUpload("imgBtn", "imgFile", "image_url", "portfolio-images", "certificates", ["image/jpeg", "image/png", "image/webp", "image/gif"], 5, "Upload");
wireUpload("pdfBtn", "pdfFile", "pdf_url", "portfolio-documents", "certificates", ["application/pdf"], 10, "Upload PDF");

load();