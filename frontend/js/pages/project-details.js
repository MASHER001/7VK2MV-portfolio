// Project details: loads one project by ?slug=, renders it, gallery lightbox, previous/next links.
const content = document.getElementById("content");
const lb = document.getElementById("lightbox");
const lbImg = document.getElementById("lbImg");
const lbCap = document.getElementById("lbCap");
const lbPrev = document.getElementById("lbPrev");
const lbNext = document.getElementById("lbNext");
let images = [];
let lbIndex = 0;

/* ---------- menu ---------- */
const menu = document.getElementById("menu"), menuBtn = document.getElementById("menuBtn");
const toggleMenu = open => { menu.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", open); };
menuBtn.onclick = () => toggleMenu(true);
document.getElementById("menuClose").onclick = () => toggleMenu(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") toggleMenu(false); });

/* ---------- lightbox ---------- */
function showLightbox() {
  const it = images[lbIndex];
  lbImg.src = it.src;
  lbImg.alt = it.caption || "";
  lbCap.textContent = it.caption || "";
  lbPrev.hidden = lbNext.hidden = images.length < 2;
}
function openLightbox(i) { lbIndex = i; showLightbox(); lb.showModal(); }
function stepLightbox(d) { lbIndex = (lbIndex + d + images.length) % images.length; showLightbox(); }
lbPrev.onclick = () => stepLightbox(-1);
lbNext.onclick = () => stepLightbox(1);
document.getElementById("lbClose").onclick = () => lb.close();
lb.addEventListener("click", e => { if (e.target === lb) lb.close(); }); // click on the dark backdrop
document.addEventListener("keydown", e => {
  if (!lb.open || images.length < 2) return;
  if (e.key === "ArrowLeft") stepLightbox(-1);
  if (e.key === "ArrowRight") stepLightbox(1);
});

/* ---------- rendering helpers ---------- */
const fmt = d => d ? new Date(d + "T00:00:00").toLocaleDateString([], { month: "long", year: "numeric" }) : "";
const fact = (k, v) => v ? el("div", { class: "fact" }, el("span", { text: k }), el("span", { text: v })) : null;
const textCard = (title, text, cls) => text
  ? el("section", { class: "card reveal" + (cls ? " " + cls : "") }, el("h2", { text: title }), el("p", { class: "text", text }))
  : null;

function renderMissing(message, notFound) {
  document.title = (notFound ? "Project not found" : "Error") + " | Portfolio";
  content.replaceChildren(el("div", { class: "missing" },
    el("h1", { text: notFound ? "Project not found" : "Something went wrong" }),
    notFound ? el("p", { class: "text", text: "This project doesn’t exist or may have been removed." }) : el("p", { class: "notice", text: message }),
    el("p", {}, el("a", { class: "pill solid", href: "projects.html", text: "Back to all projects" }))));
}

function render(p) {
  document.title = p.title + " | Portfolio";
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) { meta = el("meta", { name: "description" }); document.head.append(meta); }
  meta.setAttribute("content", p.short_description || p.title);

  const cover = safeUrl(p.featured_image_url);
  const shots = (p.screenshots || []).filter(s => safeUrl(s.image_url))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  images = [
    ...(cover ? [{ src: cover, caption: p.title }] : []),
    ...shots.map(s => ({ src: safeUrl(s.image_url), caption: [s.title, s.description].filter(Boolean).join(" — ") })),
  ];
  const offset = cover ? 1 : 0;
  const live = safeUrl(p.live_url), code = safeUrl(p.github_url);
  const dates = p.start_date && p.completion_date ? fmt(p.start_date) + " – " + fmt(p.completion_date) : null;

  content.replaceChildren(
    el("article", { class: "hero" },
      el("p", { class: "label crumbs" }, el("a", { href: "projects.html", text: "Projects" }), p.category ? " / " + p.category : ""),
      el("div", { class: "titlewrap" }, el("span", { class: "bar" }), el("h1", { class: "title", text: p.title })),
      p.short_description && el("p", { class: "sub", text: p.short_description }),
      el("div", { class: "btns" },
        p.status && el("span", { class: "badge", text: p.status }),
        live && el("a", { class: "pill solid", href: live, target: "_blank", rel: "noopener noreferrer", text: "Live site ↗" }),
        code && el("a", { class: "pill", href: code, target: "_blank", rel: "noopener noreferrer", text: "Source code ↗" })),
      cover && el("button", { class: "cover", type: "button", "aria-label": "View image of " + p.title, onclick: () => openLightbox(0) },
        el("img", { src: cover, alt: p.title }))),

    el("div", { class: "layout" },
      el("div", { class: "stack" },
        textCard("Overview", p.description),
        textCard("The problem", p.problem),
        textCard("The solution", p.solution, "dark")),
      el("aside", { class: "stack" },
        el("section", { class: "card reveal" }, el("h2", { text: "Project facts" }),
          el("div", { class: "facts" },
            fact("Status", p.status), fact("Category", p.category),
            dates ? fact("Timeline", dates) : [fact("Started", fmt(p.start_date)), fact("Completed", fmt(p.completion_date))])),
        (p.technologies || []).length > 0 && el("section", { class: "card reveal" }, el("h2", { text: "Built with" }),
          el("div", { class: "chips" }, p.technologies.map(t => el("span", { class: "chip", text: t })))))),

    shots.length > 0 && el("section", { class: "gallery" },
      el("h2", { text: "Screenshots" }),
      el("div", { class: "shots" }, shots.map((s, i) => el("button", { class: "shot reveal", type: "button", "aria-label": "View " + (s.title || "screenshot " + (i + 1)), onclick: () => openLightbox(offset + i) },
        el("img", { src: safeUrl(s.image_url), alt: s.title || p.title, loading: "lazy" }),
        s.title && el("span", { text: s.title }))))),

    el("nav", { class: "pager", id: "pager", "aria-label": "More projects" }));
  initReveal(content);
}

/* ---------- previous / next ---------- */
async function loadPager(slug) {
  const nav = document.getElementById("pager");
  try {
    const list = listOf(await api.get("/api/projects"), "projects");
    const i = list.findIndex(x => x.slug === slug);
    const link = (p, label, cls) => el("a", { class: cls, href: "project-details.html?slug=" + encodeURIComponent(p.slug) }, el("small", { text: label }), el("b", { text: p.title }));
    const prev = i > 0 ? list[i - 1] : null, next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
    if (!prev && !next) return nav.remove();
    nav.replaceChildren(...[prev && link(prev, "← Previous project", "prev"), next && link(next, "Next project →", "next")].filter(Boolean));
  } catch (e) { nav.remove(); }
}

/* ---------- start ---------- */
(async () => {
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) return renderMissing("", true);
  try {
    render(await api.get("/api/projects/" + encodeURIComponent(slug)));
    loadPager(slug);
  } catch (e) {
    renderMissing(e.message, /not found|404/i.test(e.message));
  }
})();