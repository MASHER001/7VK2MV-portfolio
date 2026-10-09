// Admin skills: list, search/filter, create, edit, delete.
const rowsBox = document.getElementById("rows");
const search = document.getElementById("search");
const catFilter = document.getElementById("catFilter");
const dlg = document.getElementById("dlg");
const form = document.getElementById("sform");
const formError = document.getElementById("form-error");
const saveBtn = document.getElementById("saveBtn");
const toastEl = document.getElementById("toast");

// name, kind (text | bool | num), required
const FIELDS = [
  ["name", "text", true], ["category", "text", true], ["description", "text"], ["icon", "text"],
  ["proficiency", "num"], ["is_learning", "bool"], ["is_featured", "bool"], ["display_order", "num"],
];
let skills = [];
let editing = null;

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
  const q = search.value.trim().toLowerCase(), c = catFilter.value;
  const list = skills.filter(s =>
    (!c || s.category === c) &&
    (!q || [s.name, s.category, s.description].some(v => (v || "").toLowerCase().includes(q))));
  rowsBox.replaceChildren(...(list.length ? list.map(row) :
    [el("tr", {}, el("td", { colspan: 5, class: "empty", text: skills.length ? "No skills match your filters." : "No skills yet. Click “New skill” to add one." }))]));
}
function row(s) {
  const pct = s.proficiency == null ? null : Math.min(100, Math.max(0, Number(s.proficiency) || 0));
  return el("tr", {},
    el("td", {}, el("div", { class: "skill" },
      el("b", {}, (s.icon ? s.icon + " " : "") + s.name, s.is_featured && el("span", { class: "star", title: "Featured", text: " ★" }),
        s.is_learning && [" ", el("span", { class: "badge", text: "Learning" })]),
      s.description && el("small", { text: s.description }))),
    el("td", { text: s.category || "–" }),
    el("td", {}, pct == null ? "–" : [el("span", { class: "bar" }, el("span", { style: "width:" + pct + "%" })), pct + "%"]),
    el("td", { text: s.display_order ?? 0 }),
    el("td", {}, el("div", { class: "row-actions" },
      el("button", { class: "btn sm", type: "button", text: "Edit", onclick: () => openForm(s) }),
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
    rowsBox.replaceChildren(el("tr", {}, el("td", { colspan: 5, class: "empty", text: "Could not load skills." })));
  }
}
search.addEventListener("input", render);
catFilter.addEventListener("change", render);

/* ---------- form ---------- */
function openForm(s) {
  editing = s || null;
  formError.replaceChildren();
  document.getElementById("dlgTitle").textContent = s ? "Edit skill" : "New skill";
  FIELDS.forEach(([n, kind]) => {
    const i = form.elements[n], v = s ? s[n] : null;
    if (kind === "bool") i.checked = !!v; else i.value = v ?? "";
  });
  dlg.showModal();
  form.elements.name.focus();
}
function read() {
  const out = {};
  for (const [n, kind, req] of FIELDS) {
    const i = form.elements[n]; let v;
    if (kind === "bool") v = i.checked;
    else if (kind === "num") v = i.value === "" ? null : Number(i.value);
    else v = i.value.trim() || null;
    if (req && !v) throw new Error((n === "name" ? "Name" : "Category") + " is required");
    if (n === "proficiency" && v !== null && (!Number.isInteger(v) || v < 0 || v > 100)) throw new Error("Proficiency must be a whole number from 0 to 100");
    if (v === null && (!editing || kind === "num")) continue; // omit empty optionals on create
    out[n] = v;
  }
  return out;
}
form.addEventListener("submit", async ev => {
  ev.preventDefault();
  formError.replaceChildren();
  saveBtn.disabled = true;
  try {
    const payload = read();
    if (editing) await api.put("/api/skills/" + editing.id, payload, true);
    else await api.post("/api/skills", payload, true);
    dlg.close();
    toast(editing ? "Skill updated" : "Skill created");
    await load();
  } catch (e) { formError.replaceChildren(el("p", { class: "notice err", text: e.message })); }
  saveBtn.disabled = false;
});
document.getElementById("newBtn").addEventListener("click", () => openForm(null));
["closeBtn", "cancelBtn"].forEach(id => document.getElementById(id).addEventListener("click", () => dlg.close()));

async function remove(s) {
  if (!confirm("Delete “" + s.name + "”? This cannot be undone.")) return;
  try { await api.del("/api/skills/" + s.id, true); toast("Skill deleted"); await load(); }
  catch (e) { toast(e.message, true); }
}

load();