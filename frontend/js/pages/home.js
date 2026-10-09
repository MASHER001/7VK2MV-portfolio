// Home page: warped headline, one card per site page in a swayable fan, menu with pop-up label.
// Needs js/config.js and js/api.js (el, api, listOf, getProfile).
const stage = document.getElementById("stage");

/* static, trusted icon markup (24x24, stroked by CSS) */
const LOGO = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor"><circle cx="32" cy="32" r="28"/><path d="M32 8l24 24-24 24L8 32z"/><circle cx="32" cy="32" r="8" fill="currentColor"/></svg>';
const I = {
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  work: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/></svg>',
  award: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
};

/* one card per page, in the same order as the site menu (the red hub card opens the menu) */
const PAGES = [
  { key: "hub", title: "Portfolio", cap: "Explore the site", icon: LOGO, cls: "red", logo: true },
  { key: "about", title: "About", cap: "Who I am", href: "about.html", icon: I.user, cls: "light" },
  { key: "skills", title: "Skills", cap: "What I work with", href: "skills.html", icon: I.bolt, bg: "#10151d" },
  { key: "projects", title: "Projects", cap: "Selected work", href: "projects.html", icon: I.work, bg: "#1e2f4d" },
  { key: "certificates", title: "Certificates", cap: "Proof of learning", href: "certificates.html", icon: I.award, bg: "#0f3b32" },
  { key: "contact", title: "Contact", cap: "Say hello", href: "contact.html", icon: I.mail, cls: "light" },
];
let nodes = [], caps = {}, active = 0;

/* ---------- warped headline ---------- */
const WORD = "PORTFOLIO", word = document.getElementById("word"), letters = [];
["ghost", "solid"].forEach(kind => {
  const line = el("span", { class: "line " + kind, "aria-hidden": "true" });
  WORD.split("").forEach(ch => { const s = el("span", { text: ch }); line.append(s); letters.push({ s, ghost: kind === "ghost" }); });
  word.append(line);
});
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function warp(t) {
  letters.forEach((l, k) => {
    const i = k % WORD.length, sk = Math.sin(i * .75 + .5 + t * .0007) * 16, sy = 1 + .22 * Math.cos(i * .9 + t * .0005), ty = Math.sin(i * 1.1 + t * .0006) * 6;
    l.s.style.transform = "translateY(" + ty + "%) skewX(" + (l.ghost ? -sk * 1.3 : sk) + "deg) scaleY(" + (l.ghost ? -sy : sy) + ")";
  });
  if (!reduce) requestAnimationFrame(warp);
}
requestAnimationFrame(warp);

/* ---------- menu + pop-up label ---------- */
const menu = document.getElementById("menu"), btn = document.getElementById("menuBtn"), tip = document.getElementById("menuTip");
function toggleMenu(open) {
  menu.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", open);
  if (open) { tip.classList.remove("show"); btn.classList.remove("nudge"); }
}
btn.onclick = () => toggleMenu(true);
document.getElementById("menuClose").onclick = () => toggleMenu(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") toggleMenu(false); });
setTimeout(() => {            // little hint: the label pops out and the icon wiggles, then it hides again
  if (menu.classList.contains("open")) return;
  tip.classList.add("show"); btn.classList.add("nudge");
  setTimeout(() => { tip.classList.remove("show"); btn.classList.remove("nudge"); }, 3400);
}, 1500);

/* ---------- card fan ---------- */
function makeCard(p, i) {
  const small = el("small", { text: p.cap });
  caps[p.key] = small;
  const glyph = el("span", { class: "glyph" + (p.logo ? " logo" : ""), "aria-hidden": "true" });
  glyph.innerHTML = p.icon; // static markup defined above
  const c = el("button", { class: "fcard " + (p.cls || ""), type: "button", "aria-label": p.title, style: p.bg ? "background-color:" + p.bg : null },
    el("span", { class: "num", text: String(i + 1).padStart(2, "0") }),
    glyph,
    el("span", { class: "cap" }, el("b", { text: p.title }), small));
  c.addEventListener("click", () => {
    if (i !== active) { active = i; layout(); }
    else if (p.href) location.href = p.href;
    else toggleMenu(true);
  });
  return c;
}
function layout() {
  const n = nodes.length;
  nodes.forEach((c, i) => {
    let o = ((i - active) % n + n) % n; if (o > n / 2) o -= n;
    const a = Math.abs(o);
    c.style.setProperty("--o", o);
    c.classList.toggle("on", o === 0);
    c.style.opacity = a > 3 ? 0 : 1;
    c.style.pointerEvents = a > 3 ? "none" : "auto";
    c.style.zIndex = 10 - a;
    c.tabIndex = o === 0 ? 0 : -1;
  });
}
nodes = PAGES.map(makeCard);
stage.replaceChildren(...nodes);
layout();
requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add("ready")));

const step = d => { active = (active + d + nodes.length) % nodes.length; layout(); };
document.getElementById("prev").onclick = () => step(-1);
document.getElementById("next").onclick = () => step(1);
document.addEventListener("keydown", e => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); });
let x0 = null;
stage.addEventListener("pointerdown", e => { x0 = e.clientX; });
stage.addEventListener("pointerup", e => { if (x0 !== null && Math.abs(e.clientX - x0) > 45) step(e.clientX < x0 ? 1 : -1); x0 = null; });

/* ---------- live data for the captions (all optional) ---------- */
const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
getProfile().then(p => {
  document.getElementById("who").textContent = p.full_name;
  document.getElementById("role").textContent = p.professional_title || "";
  document.title = p.full_name + " | Portfolio";
  if (p.professional_title) caps.about.textContent = p.professional_title;
  if (p.availability_status) caps.contact.textContent = p.availability_status;
}).catch(() => {});
[["skills", "/api/skills", "skills", "skill"], ["projects", "/api/projects", "projects", "project"], ["certificates", "/api/certificates", "certificates", "certificate"]]
  .forEach(([key, path, k, noun]) => api.get(path).then(d => { caps[key].textContent = plural(listOf(d, k).length, noun); }).catch(() => {}));