// Public projects list: search, category + status filters, sorting, shareable URL state.
const grid = document.getElementById("grid");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const catBox = document.getElementById("catFilters");
const statusBox = document.getElementById("statusFilters");
const countEl = document.getElementById("count");
const STATUS_ORDER = ["In Progress", "Completed", "Coming Soon", "Maintenance", "Archived"];
const SORTS = ["default", "newest", "az"];

let all = [];
const sp = new URLSearchParams(location.search);
const state = {
  q: sp.get("q") || "",
  cat: sp.get("category") || "",
  status: sp.get("status") || "",
  sort: SORTS.includes(sp.get("sort")) ? sp.get("sort") : "default",
};
searchEl.value = state.q;
sortEl.value = state.sort;

/* ---------- warped headline ---------- */
const WORD = "PROJECTS", word = document.getElementById("word"), letters = [];
["ghost", "solid"].forEach(kind => {
  const line = el("span", { class: "line " + kind, "aria-hidden": "true" });
  WORD.split("").forEach(ch => { const s = el("span", { text: ch }); line.append(s); letters.push({ s, ghost: kind === "ghost" }); });
  word.append(line);
});
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function warp(t) {
  letters.forEach((l, k) => {
    const i = k % WORD.length, sk = Math.sin(i * .8 + .5 + t * .0007) * 15, sy = 1 + .2 * Math.cos(i * 1 + t * .0005), ty = Math.sin(i * 1.2 + t * .0006) * 6;
    l.s.style.transform = "translateY(" + ty + "%) skewX(" + (l.ghost ? -sk * 1.3 : sk) + "deg) scaleY(" + (l.ghost ? -sy : sy) + ")";
  });
  if (!reduce) requestAnimationFrame(warp);
}
requestAnimationFrame(warp);

/* ---------- menu ---------- */
const menu = document.getElementById("menu"), menuBtn = document.getElementById("menuBtn");
const toggleMenu = o => { menu.classList.toggle("open", o); menuBtn.setAttribute("aria-expanded", o); };
menuBtn.onclick = () => toggleMenu(true);
document.getElementById("menuClose").onclick = () => toggleMenu(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") toggleMenu(false); });

/* ---------- filtering / sorting ---------- */
const initials = s => (s || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
function visible() {
  const q = state.q.trim().toLowerCase();
  const list = all.filter(p =>
    (!state.cat || p.category === state.cat) &&
    (!state.status || p.status === state.status) &&
    (!q || [p.title, p.short_description, p.category, ...(p.technologies || [])].some(v => (v || "").toLowerCase().includes(q))));
  const when = p => String(p.start_date || p.created_at || "");
  if (state.sort === "newest") list.sort((a, b) => when(b).localeCompare(when(a)));
  else if (state.sort === "az") list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  else list.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  return list;
}
function syncUrl() {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set("q", state.q.trim());
  if (state.cat) p.set("category", state.cat);
  if (state.status) p.set("status", state.status);
  if (state.sort !== "default") p.set("sort", state.sort);
  history.replaceState(null, "", p.toString() ? "?" + p : location.pathname);
}

/* ---------- rendering ---------- */
function card(p) {
  const img = safeUrl(p.featured_image_url), live = safeUrl(p.live_url), code = safeUrl(p.github_url);
  const techs = p.technologies || [];
  const thumb = el("div", { class: "thumb" },
    p.is_featured && el("span", { class: "flag", text: "Featured" }),
    img ? el("div", { class: "zoom", style: 'background-image:url("' + img + '")' }) : el("span", { class: "mono", text: initials(p.title) }));
  return el("article", { class: "proj reveal" }, thumb,
    el("div", { class: "body" },
      el("div", { class: "row" }, el("span", { class: "cat", text: p.category || "Project" }), p.status && el("span", { class: "badge", text: p.status })),
      el("h3", {}, el("a", { href: "project-details.html?slug=" + encodeURIComponent(p.slug), text: p.title })),
      p.short_description && el("p", { class: "desc", text: p.short_description }),
      techs.length > 0 && el("div", { class: "chips" }, techs.slice(0, 4).map(t => el("span", { class: "chip", text: t })), techs.length > 4 && el("span", { class: "chip", text: "+" + (techs.length - 4) })),
      (live || code) && el("div", { class: "actions" },
        live && el("a", { class: "pill sm solid", href: live, target: "_blank", rel: "noopener noreferrer", text: "Live ↗" }),
        code && el("a", { class: "pill sm", href: code, target: "_blank", rel: "noopener noreferrer", text: "Code ↗" }))));
}
function pills(box, values, current, label, onPick) {
  if (values.length < 2) return box.replaceChildren();
  box.replaceChildren(...["", ...values].map(v => el("button", { class: "pill", type: "button", "aria-pressed": String(v === current), text: v || label, onclick: () => onPick(v) })));
}
function renderFilters() {
  const cats = [...new Set(all.map(p => p.category).filter(Boolean))].sort();
  const statuses = STATUS_ORDER.filter(s => all.some(p => p.status === s));
  pills(catBox, cats, state.cat, "All categories", v => { state.cat = v; update(); });
  pills(statusBox, statuses, state.status, "Any status", v => { state.status = v; update(); });
}
function render() {
  const list = visible();
  const filtered = state.q.trim() || state.cat || state.status;
  countEl.textContent = filtered ? list.length + " of " + all.length + " projects" : all.length + (all.length === 1 ? " project" : " projects");
  grid.replaceChildren(...(list.length ? list.map(card)
    : [el("p", { class: "empty", text: all.length ? "No projects match your filters." : "No projects yet. Check back soon." })]));
  initReveal(grid);
}
function update() { renderFilters(); render(); syncUrl(); }

searchEl.addEventListener("input", () => { state.q = searchEl.value; render(); syncUrl(); });
sortEl.addEventListener("change", () => { state.sort = sortEl.value; render(); syncUrl(); });

/* ---------- start ---------- */
getProfile().then(p => {
  document.getElementById("who").textContent = p.full_name;
  document.getElementById("role").textContent = p.professional_title || "";
}).catch(() => {});
(async () => {
  try {
    all = listOf(await api.get("/api/projects"), "projects");
    renderFilters(); render();
  } catch (e) {
    countEl.textContent = "";
    grid.replaceChildren(el("p", { class: "notice", text: e.message || "Could not load projects." }));
  }
})();