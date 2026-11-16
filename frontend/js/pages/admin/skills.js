// Admin skills: list, search/filter, create, edit, delete.
// The New/Edit form lives in a <template>. It is added to the page only while it is open
// and removed again as soon as it is closed (Cancel, X, Esc, click outside, or after saving).
const rowsBox = document.getElementById("rows");
const search = document.getElementById("search");
const catFilter = document.getElementById("catFilter");
const toastEl = document.getElementById("toast");
const tpl = document.getElementById("dlgTpl");

// name, kind (text | bool | num), required
const FIELDS = [
  ["name", "text", true], ["category", "text", true], ["description", "text"], ["icon", "text"],
  ["proficiency", "num"], ["is_learning", "bool"], ["is_featured", "bool"], ["display_order", "num"],
];
const LABELS = { name: "Name", category: "Category" };

// Fail early with a readable message if this script is paired with a page that has different ids / field names.
(function checkPage() {
  const missing = ["rows", "search", "catFilter", "newBtn", "toast", "page-error", "dlgTpl"].filter(id => !document.getElementById(id));
  if (tpl) {
    ["sform", "closeBtn", "cancelBtn", "saveBtn", "dlgTitle", "form-error"]
      .forEach(id => { if (!tpl.content.getElementById(id)) missing.push("form element “" + id + "”"); });
    FIELDS.forEach(([n]) => { if (!tpl.content.querySelector('[name="' + n + '"]')) missing.push("field “" + n + "”"); });
  }
  if (!missing.length) return;
  const msg = "This page doesn’t match the skills script. Missing: " + missing.join(", ") + ". Use the skills.html that comes with this script.";
  document.body.prepend(el("p", { class: "notice err", text: msg }));
  throw new Error(msg);
})();

let skills = [];
let editing = null;
let dlg = null, form = null, formError = null, saveBtn = null; // set while the form is open

function toast(msg, isErr) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}

/* ---------- list ---------- */
function fillCategories() {
  const keep = catFilter.value;
  const cats = [...new Set(skills.map(s => s.category).filter(Boolean))].sort();
  catFilter.replaceChildren(el("option", { value: "", text: "All categories" }), ...cats.map(c => el("option", { value: c, text: c })));
  catFilter.value = cats.includes(keep) ? keep : "";
}
function render() {
  const q = search.value.trim().toLowerCase(), cat = catFilter.value;
  const list = skills.filter(s =>
    (!cat || s.category === cat) &&
    (!q || [s.name, s.category, s.description].some(v => (v || "").toLowerCase().includes(q))));
  rowsBox.replaceChildren(...(list.length ? list.map(row) :
    [el("tr", {}, el("td", { colspan: 6, class: "empty", text: skills.length ? "No skills match your filters." : "No skills yet. Click “New skill” to add one." }))]));
}
// Proficiency bar with inline styles, so it doesn't depend on admin.css
function bar(v) {
  const pct = Math.min(100, Math.max(0, Number(v) || 0));
  const fill = el("span", {});
  fill.style.cssText = "display:block;height:100%;border-radius:inherit;background:var(--accent,#6d4aff);width:" + pct + "%";
  const track = el("span", {}, fill);
  track.style.cssText = "display:inline-block;vertical-align:middle;width:80px;height:6px;border-radius:6px;background:rgba(128,128,128,.3);overflow:hidden";
  return track;
}
function row(s) {
  const status = [];
  if (s.is_learning) status.push(el("span", { class: "badge b-none", text: "Learning" }));
  if (s.is_featured) status.push(el("span", { class: "badge b-ok", text: "Featured" }));
  if (!status.length) status.push(el("span", { class: "badge b-none", text: "–" }));
  return el("tr", {},
    el("td", {}, el("b", {}, (s.icon ? s.icon + " " : "") + s.name), s.description && el("small", { text: s.description })),
    el("td", { text: s.category || "–" }),
    el("td", {}, s.proficiency == null ? "–" : [bar(s.proficiency), " " + s.proficiency + "%"]),
    el("td", {}, el("div", { class: "row-actions" }, ...status)),
    el("td", { text: s.display_order ?? 0 }),
    el("td", {}, el("div", { class: "row-actions" },
      el("button", { class: "btn secondary sm", type: "button", text: "Edit", onclick: () => openForm(s) }),
      el("button", { class: "btn sm danger", type: "button", text: "Delete", onclick: () => remove(s) }))));
}
async function load() {
  try {
    skills = listOf(await api.get("/api/skills"), "skills")
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || String(a.name).localeCompare(String(b.name)));
    document.getElementById("page-error").replaceChildren();
    fillCategories(); render();
  } catch (e) {
    document.getElementById("page-error").replaceChildren(el("p", { class: "notice err", text: e.message }));
    rowsBox.replaceChildren(el("tr", {}, el("td", { colspan: 6, class: "empty", text: "Could not load skills." })));
  }
}
search.addEventListener("input", render);
catFilter.addEventListener("change", render);

/* ---------- the form: added to the page when needed, removed when closed ---------- */
function mountForm() {
  dlg = tpl.content.firstElementChild.cloneNode(true);
  document.body.append(dlg);
  form = dlg.querySelector("#sform");
  formError = dlg.querySelector("#form-error");
  saveBtn = dlg.querySelector("#saveBtn");

  dlg.querySelector("#closeBtn").addEventListener("click", closeForm);
  dlg.querySelector("#cancelBtn").addEventListener("click", closeForm);
  dlg.addEventListener("click", e => { if (e.target === dlg) closeForm(); }); // click on the dark area outside the form
  dlg.addEventListener("close", unmountForm);                                  // also covers the Esc key
  form.addEventListener("submit", onSubmit);
}
function unmountForm() {
  if (!dlg) return;
  const d = dlg;
  dlg = form = formError = saveBtn = null;
  d.remove();                                  // the form is gone from the page again
}
function closeForm() {
  if (!dlg) return;
  if (dlg.close) dlg.close(); else unmountForm();
}
function openForm(s) {
  if (dlg) return;                             // already open
  editing = s || null;
  mountForm();
  dlg.querySelector("#dlgTitle").textContent = s ? "Edit skill" : "New skill";
  FIELDS.forEach(([n, kind]) => {
    const i = form.elements[n], v = s ? s[n] : null;
    if (kind === "bool") i.checked = !!v; else i.value = v ?? "";
  });
  if (!s) form.elements.display_order.value = 0;
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  form.elements.name.focus();
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
  if (out.proficiency != null && (!Number.isInteger(out.proficiency) || out.proficiency < 0 || out.proficiency > 100))
    throw new Error("Proficiency must be a whole number from 0 to 100");
  return out;
}
async function onSubmit(ev) {
  ev.preventDefault();
  const wasEditing = !!editing;
  formError.replaceChildren();
  saveBtn.disabled = true;
  try {
    const payload = read();
    if (wasEditing && !editing.id) throw new Error("This skill has no id in the API response, so it can't be updated. The backend response schema must include id.");
    if (wasEditing) await api.put("/api/skills/" + editing.id, payload, true);
    else await api.post("/api/skills", payload, true);
    closeForm();
    toast(wasEditing ? "Skill updated" : "Skill created");
    await load();
  } catch (e) {
    if (formError) formError.replaceChildren(el("p", { class: "notice err", text: e.message }));
  }
  if (saveBtn) saveBtn.disabled = false;
}
document.getElementById("newBtn").addEventListener("click", () => openForm(null));

async function remove(s) {
  if (!s.id) { toast("This skill has no id in the API response, so it can't be deleted.", true); return; }
  if (!confirm("Delete “" + s.name + "”? This cannot be undone.")) return;
  try { await api.del("/api/skills/" + s.id, true); toast("Skill deleted"); await load(); }
  catch (e) { toast(e.message, true); }
}

load();