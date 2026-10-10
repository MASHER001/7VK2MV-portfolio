// Shared helpers: fetch wrapper, DOM builder, cards, nav, scroll reveal.

async function request(method, path, body, auth) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && typeof Auth !== "undefined" && Auth.token()) headers.Authorization = "Bearer " + Auth.token();
  const res = await fetch(window.API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Expired / invalid token → clear session and bounce to login.
  if (res.status === 401 && auth && typeof Auth !== "undefined") Auth.logout(true);

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const d = data && data.detail;
    throw new Error(
      typeof d === "string"
        ? d
        : Array.isArray(d)
          ? d.map(x => x.msg).join("; ")
          : "Request failed (" + res.status + ")"
    );
  }
  return data;
}

const api = {
  get: (p, a) => request("GET", p, undefined, a),
  post: (p, b, a) => request("POST", p, b, a),
  put: (p, b, a) => request("PUT", p, b, a),
  patch: (p, b, a) => request("PATCH", p, b, a),
  del: (p, a) => request("DELETE", p, undefined, a),
};

// Safe DOM builder: text is always set as text (never innerHTML).
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  kids.flat().forEach(c => {
    if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return n;
}

function safeUrl(v) {
  try {
    const u = new URL(v);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

const listOf = (d, key) => Array.isArray(d) ? d : (d && (d[key] || d.items || d.data)) || [];

const showError = (box, e) =>
  box.replaceChildren(el("p", { class: "notice err", text: e.message || "Something went wrong" }));

let _profile;
const getProfile = () => _profile || (_profile = api.get("/api/profile"));

async function fill(id, path, key, build) {
  const box = document.getElementById(id);
  if (!box) return;
  try {
    const items = listOf(await api.get(path), key);
    box.replaceChildren(
      ...(items.length
        ? items.map(build)
        : [el("p", { class: "muted", text: "Nothing here yet." })])
    );
    initReveal(box);
  } catch (e) {
    showError(box, e);
  }
}

function tags(list) {
  return (list || []).map(t => el("span", { class: "tag", text: t }));
}

function projectCard(p) {
  const img = safeUrl(p.featured_image_url);
  return el("article", { class: "card reveal" },
    img && el("img", { src: img, alt: p.title, loading: "lazy" }),
    el("h3", {}, el("a", { href: "project-details.html?slug=" + encodeURIComponent(p.slug), text: p.title })),
    el("p", { class: "muted", text: p.short_description || "" }),
    el("div", {}, tags(p.technologies)),
    p.status && el("p", {}, el("span", { class: "badge", text: p.status }))
  );
}

function certCard(c) {
  const link = safeUrl(c.credential_url);
  return el("article", { class: "card reveal" },
    el("h3", { text: c.title }),
    el("p", { class: "muted", text: [c.issuer, c.issue_date].filter(Boolean).join(" · ") }),
    el("p", { text: c.description || "" }),
    link && el("a", { href: link, target: "_blank", rel: "noopener noreferrer", text: "Verify credential" })
  );
}

function initReveal(root = document) {
  const items = root.querySelectorAll(".reveal:not(.visible)");
  if (!("IntersectionObserver" in window)) return items.forEach(i => i.classList.add("visible"));
  const io = new IntersectionObserver(
    es => es.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    }),
    { threshold: .12 }
  );
  items.forEach(i => io.observe(i));
}

document.addEventListener("DOMContentLoaded", () => {
  const t = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (t && nav) t.addEventListener("click", () => nav.classList.toggle("open"));

  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a, .sidebar a").forEach(a => {
    if (a.getAttribute("href") === here) a.classList.add("active");
  });

  initReveal();

  const f = document.getElementById("footer-text");
  if (f) {
    getProfile()
      .then(p => { f.textContent = "© " + new Date().getFullYear() + " " + p.full_name; })
      .catch(() => {});
  }
});
/* =====================================================================
   Expose helpers on `window` so page scripts can use them via window.X
   (Functions declared with `function` are auto-attached; const/let are not.)
   ===================================================================== */
window.request    = request;
window.api        = api;
window.el         = el;
window.safeUrl    = safeUrl;
window.listOf     = listOf;
window.showError  = showError;
window.getProfile = getProfile;
window.initReveal = initReveal;