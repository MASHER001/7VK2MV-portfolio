/* =====================================================================
   achievements.js — public Experiences page.
   Loaded by: achievements.html
   Handles: warped headline, menu overlay, search + category filter,
            cards grouped by year (newest first).
   Depends on: config.js, api.js (el, listOf, api, getProfile, initReveal, safeUrl)
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- warped headline (reads the word from data-word) ---------- */
  function initHeadline() {
    const headline = document.getElementById("word");
    if (!headline) return;
    const WORD = headline.dataset.word || "EXPERIENCES";
    const letters = [];
    ["ghost", "solid"].forEach(kind => {
      const line = el("span", { class: "line " + kind, "aria-hidden": "true" });
      WORD.split("").forEach(ch => {
        const s = el("span", { text: ch });
        line.append(s);
        letters.push({ s, ghost: kind === "ghost" });
      });
      headline.append(line);
    });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function warp(t) {
      letters.forEach((l, k) => {
        const i = k % WORD.length;
        const sk = Math.sin(i * .9 + .5 + t * .0007) * 15;
        const sy = 1 + .2 * Math.cos(i * 1.1 + t * .0005);
        const ty = Math.sin(i * 1.3 + t * .0006) * 6;
        l.s.style.transform = "translateY(" + ty + "%) skewX(" + (l.ghost ? -sk * 1.3 : sk) + "deg) scaleY(" + (l.ghost ? -sy : sy) + ")";
      });
      if (!reduce) requestAnimationFrame(warp);
    }
    requestAnimationFrame(warp);
  }

  /* ---------- menu overlay (only if the page has an opener) ---------- */
  function initMenu() {
    const menu = document.getElementById("menu");
    const btn = document.getElementById("menuBtn");
    if (!menu) return;
    const toggle = open => {
      menu.classList.toggle("open", open);
      if (btn) btn.setAttribute("aria-expanded", String(open));
    };
    if (btn) btn.onclick = () => toggle(true);
    const close = document.getElementById("menuClose");
    if (close) close.onclick = () => toggle(false);
    document.addEventListener("keydown", e => { if (e.key === "Escape") toggle(false); });
  }

  /* ---------- profile: role subtitle + footer ---------- */
  function initProfile() {
    getProfile().then(p => {
      const role = document.getElementById("role");
      const footer = document.getElementById("footer-name");
      const year = document.getElementById("year");
      if (role && p.professional_title) role.textContent = p.professional_title;
      if (footer && p.full_name) footer.textContent = p.full_name;
      if (year) year.textContent = new Date().getFullYear();
      document.title = "Experiences | " + (p.full_name || "Portfolio");
    }).catch(() => { /* keep defaults */ });
  }

  /* ---------- achievements ---------- */
  function initAchievements() {
    const groupsBox = document.getElementById("groups");
    const filtersBox = document.getElementById("filters");
    const countEl = document.getElementById("count");
    const searchEl = document.getElementById("search");
    if (!groupsBox) return;

    let all = [];
    let category = "";
    let query = "";

    const yearOf = a => (a.achievement_date ? String(a.achievement_date).slice(0, 4) : "Other");
    const fmt = d => d ? new Date(d + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "";

    function card(a) {
      const img = safeUrl(a.image_url);
      const link = safeUrl(a.evidence_url);
      return el("article", { class: "card ach reveal" },
        img && el("img", { class: "ach-img", src: img, alt: a.title, loading: "lazy" }),
        el("div", { class: "ach-body" },
          el("div", { class: "ach-meta" },
            a.achievement_date && el("span", { class: "label", text: fmt(a.achievement_date) }),
            a.category && el("span", { class: "chip", text: a.category }),
            a.is_featured && el("span", { class: "badge-red ach-star", text: "Featured" })),
          el("h3", { text: a.title }),
          a.description && el("p", { class: "desc", text: a.description }),
          link && el("a", { class: "pill", href: link, target: "_blank", rel: "noopener noreferrer", text: "View proof" })));
    }

    function renderFilters() {
      if (!filtersBox) return;
      const cats = [...new Set(all.map(a => a.category).filter(Boolean))].sort();
      if (cats.length < 2) { filtersBox.replaceChildren(); return; }
      filtersBox.replaceChildren(...["", ...cats].map(c =>
        el("button", {
          class: "pill", type: "button", "aria-pressed": String(c === category), text: c || "All",
          onclick: () => { category = c; renderFilters(); render(); },
        })));
    }

    function render() {
      const q = query.trim().toLowerCase();
      const list = all.filter(a =>
        (!category || a.category === category) &&
        (!q || [a.title, a.category, a.description].some(v => (v || "").toLowerCase().includes(q))));

      if (countEl) countEl.textContent = list.length + (list.length === 1 ? " experience" : " experiences");

      if (!list.length) {
        groupsBox.replaceChildren(el("p", { class: "empty", text: all.length ? "Nothing matches your search." : "No experiences yet. Check back soon." }));
        return;
      }

      const groups = {};
      list.forEach(a => (groups[yearOf(a)] = groups[yearOf(a)] || []).push(a));
      // newest year first, undated ("Other") last
      const years = Object.keys(groups).sort((a, b) => a === "Other" ? 1 : b === "Other" ? -1 : b.localeCompare(a));

      groupsBox.replaceChildren(...years.map(y =>
        el("section", { class: "ach-year" },
          el("h2", { text: y }),
          el("div", { class: "ach-list" },
            groups[y]
              .sort((a, b) => String(b.achievement_date || "").localeCompare(String(a.achievement_date || "")) || (a.display_order ?? 0) - (b.display_order ?? 0))
              .map(card)))));
      initReveal(groupsBox);
    }

    if (searchEl) searchEl.addEventListener("input", () => { query = searchEl.value; render(); });

    (async () => {
      try {
        all = listOf(await api.get("/api/achievements"), "achievements");
        renderFilters();
        render();
      } catch (e) {
        if (countEl) countEl.textContent = "";
        groupsBox.replaceChildren(el("p", { class: "notice", text: e.message || "Could not load experiences." }));
      }
    })();
  }

  /* ---------- boot: one failing part must not stop the others ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    [initAchievements, initHeadline, initMenu, initProfile].forEach(fn => {
      try { fn(); } catch (e) { console.error("[achievements] " + fn.name + " failed:", e); }
    });
    try { initReveal(); } catch (e) { console.error("[achievements] initReveal failed:", e); }
  });
})();