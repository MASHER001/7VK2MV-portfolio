/* =====================================================================
   skills.js — public Skills page.
   Loaded by: skills.html
   Handles: warped headline, menu overlay, search + category filter,
            "currently learning" toggle, grouped skill grid with meters.
   Depends on: config.js (constants), api.js (el, listOf, api,
               getProfile, initReveal)
   ===================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Warped headline — reads word from data-word
     --------------------------------------------------------------------- */
  function initHeadline() {
    const el = document.getElementById("word");
    if (!el) return;

    const WORD = el.dataset.word || "SKILLS";
    const letters = [];

    ["ghost", "solid"].forEach(kind => {
      const line = window.el("span", { class: "line " + kind, "aria-hidden": "true" });
      WORD.split("").forEach(ch => {
        const s = window.el("span", { text: ch });
        line.append(s);
        letters.push({ s, ghost: kind === "ghost" });
      });
      el.append(line);
    });

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function warp(t) {
      letters.forEach((l, k) => {
        const i  = k % WORD.length;
        const sk = Math.sin(i * .9 + .5 + t * .0007) * 15;
        const sy = 1 + .2 * Math.cos(i * 1.1 + t * .0005);
        const ty = Math.sin(i * 1.3 + t * .0006) * 6;
        l.s.style.transform =
          "translateY(" + ty + "%) " +
          "skewX(" + (l.ghost ? -sk * 1.3 : sk) + "deg) " +
          "scaleY(" + (l.ghost ? -sy : sy) + ")";
      });
      if (!reduce) requestAnimationFrame(warp);
    }
    requestAnimationFrame(warp);
  }

  /* ---------------------------------------------------------------------
     Menu overlay
     --------------------------------------------------------------------- */
  function initMenu() {
    const menu = document.getElementById("menu");
    const btn  = document.getElementById("menuBtn");
    if (!menu || !btn) return;

    const toggle = open => {
      menu.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    };
    btn.onclick = () => toggle(true);
    const close = document.getElementById("menuClose");
    if (close) close.onclick = () => toggle(false);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") toggle(false);
    });
  }

  /* ---------------------------------------------------------------------
     Profile — role subtitle + footer
     --------------------------------------------------------------------- */
  function initProfile() {
    window.getProfile().then(p => {
      const role   = document.getElementById("role");
      const footer = document.getElementById("footer-name");
      const year   = document.getElementById("year");
      if (role   && p.professional_title) role.textContent = p.professional_title;
      if (footer && p.full_name)          footer.textContent = p.full_name;
      if (year)   year.textContent = new Date().getFullYear();
      document.title = "Skills | " + (p.full_name || "Portfolio");
    }).catch(() => {
      /* keep defaults */
    });
  }

  /* ---------------------------------------------------------------------
     Skills grid
     --------------------------------------------------------------------- */
  function initSkills() {
    const groupsBox  = document.getElementById("groups");
    const filtersBox = document.getElementById("filters");
    const countEl    = document.getElementById("count");
    const searchEl   = document.getElementById("search");
    if (!groupsBox) return;

    let all = [];
    let category = "";
    let learningOnly = false;
    let query = "";

    /* Badge letter or short icon text */
    const badgeText = s => {
      const g = [...(s.icon || "")];
      return g.length > 0 && g.length <= 3
        ? s.icon
        : (s.name || "?")[0].toUpperCase();
    };

    /* One card */
    function card(s) {
      const pct = s.proficiency == null
        ? null
        : Math.min(100, Math.max(0, Math.round(Number(s.proficiency) || 0)));

      return window.el("article", { class: "card skill reveal" },
        window.el("div", { class: "skill-top" },
          window.el("span", { class: "ico", text: badgeText(s), "aria-hidden": "true" }),
          window.el("div", {},
            window.el("h3", { text: s.name }),
            s.is_learning && window.el("span", { class: "badge-red", text: "Learning" })
          )
        ),
        s.description && window.el("p", { class: "desc", text: s.description }),
        pct !== null && window.el("div", { class: "meter-row" },
          window.el("div", {
            class: "meter",
            role: "progressbar",
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": pct,
            "aria-label": s.name + " proficiency",
          }, window.el("span", { class: "fill", style: "--p:" + pct + "%" })),
          window.el("b", { text: pct + "%" })
        )
      );
    }

    /* Filter pills — category + "learning" toggle */
    function renderFilters() {
      const cats = [...new Set(all.map(s => s.category).filter(Boolean))].sort();
      const hasLearning = all.some(s => s.is_learning);

      if (cats.length < 2 && !hasLearning) {
        filtersBox.replaceChildren();
        return;
      }

      const pills = [];

      if (cats.length > 1) {
        pills.push(...["", ...cats].map(c =>
          window.el("button", {
            class: "pill",
            type: "button",
            "aria-pressed": String(c === category),
            text: c || "All",
            onclick: () => {
              category = c;
              renderFilters();
              render();
            },
          })
        ));
      }

      if (hasLearning) {
        pills.push(
          window.el("button", {
            class: "pill solid",
            type: "button",
            "aria-pressed": String(learningOnly),
            text: "Currently learning",
            onclick: () => {
              learningOnly = !learningOnly;
              renderFilters();
              render();
            },
          })
        );
      }

      filtersBox.replaceChildren(...pills);
    }

    /* Render grouped grid */
    function render() {
      const q = query.trim().toLowerCase();

      const list = all.filter(s =>
        (!category || s.category === category) &&
        (!learningOnly || s.is_learning) &&
        (!q || [s.name, s.category, s.description].some(v =>
          (v || "").toLowerCase().includes(q)
        ))
      );

      const cats = new Set(list.map(s => s.category)).size;
      countEl.textContent =
        list.length +
        (list.length === 1 ? " skill" : " skills") +
        (cats > 1 ? " · " + cats + " categories" : "");

      if (!list.length) {
        groupsBox.replaceChildren(
          window.el("p", {
            class: "empty",
            text: all.length
              ? "No skills match this filter."
              : "No skills yet. Check back soon.",
          })
        );
        return;
      }

      /* Group by category */
      const groups = {};
      list.forEach(s => {
        const key = s.category || "Other";
        (groups[key] = groups[key] || []).push(s);
      });

      /* Sort groups by minimum display_order, then alphabetically */
      const order = c => Math.min(...groups[c].map(s => s.display_order ?? 0));

      groupsBox.replaceChildren(
        ...Object.keys(groups)
          .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
          .map(c =>
            window.el("section", { class: "group" },
              window.el("h2", { text: c }),
              window.el("div", { class: "grid" },
                groups[c]
                  .sort((a, b) =>
                    (a.display_order ?? 0) - (b.display_order ?? 0) ||
                    String(a.name).localeCompare(String(b.name))
                  )
                  .map(card)
              )
            )
          )
      );

      window.initReveal(groupsBox);
    }

    /* Search input */
    if (searchEl) {
      searchEl.addEventListener("input", () => {
        query = searchEl.value;
        render();
      });
    }

    /* Fetch */
    (async () => {
      try {
        all = window.listOf(await window.api.get("/api/skills"), "skills");
        renderFilters();
        render();
      } catch (e) {
        countEl.textContent = "";
        groupsBox.replaceChildren(
          window.el("p", { class: "notice", text: e.message || "Could not load skills." })
        );
      }
    })();
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initHeadline();
    initMenu();
    initProfile();
    initSkills();
    window.initReveal();
  });
})();