/* =====================================================================
   certificates.js — public Certificates page.
   Loaded by: certificates.html
   Handles: warped headline, menu overlay, certificate list, filters,
            lightbox zoom.
   Depends on: config.js (constants), api.js (el, safeUrl, listOf, api,
               getProfile, initReveal)
   ===================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Warped headline — reads the word from data-word on the <h1>
     --------------------------------------------------------------------- */
  function initHeadline() {
    const node = document.getElementById("word");
    if (!node) return;

    const WORD = node.dataset.word || "CERTIFICATES";
    const letters = [];

    ["ghost", "solid"].forEach(kind => {
      const line = window.el("span", { class: "line " + kind, "aria-hidden": "true" });
      WORD.split("").forEach(ch => {
        const s = window.el("span", { text: ch });
        line.append(s);
        letters.push({ s, ghost: kind === "ghost" });
      });
      node.append(line);
    });

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function warp(t) {
      letters.forEach((l, k) => {
        const i  = k % WORD.length;
        const sk = Math.sin(i * .75 + .5 + t * .0007) * 14;
        const sy = 1 + .2 * Math.cos(i * .9 + t * .0005);
        const ty = Math.sin(i * 1.1 + t * .0006) * 6;
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
     Profile — header meta + footer
     --------------------------------------------------------------------- */
  function initProfile() {
    window.getProfile().then(p => {
      const who    = document.getElementById("who");
      const role   = document.getElementById("role");
      const footer = document.getElementById("footer-text");

      if (who  && p.full_name)          who.textContent  = p.full_name;
      if (role && p.professional_title) role.textContent = p.professional_title;
      if (footer && p.full_name) {
        footer.textContent = "© " + new Date().getFullYear() + " " + p.full_name;
      }
      document.title = "Certificates | " + (p.full_name || "Portfolio");
    }).catch(() => { /* keep defaults */ });
  }

  /* ---------------------------------------------------------------------
     Certificates — list, filters, lightbox
     --------------------------------------------------------------------- */
  function initCertificates() {
    const grid       = document.getElementById("grid");
    const filtersBox = document.getElementById("filters");
    const countEl    = document.getElementById("count");
    const lb         = document.getElementById("lightbox");

    if (!grid) return;

    let certs = [];
    let category = "";

    const initials = s => (s || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const fmt = d => d ? new Date(d + "T00:00:00").toLocaleDateString([], { month: "short", year: "numeric" }) : "";
    const isExpired = c => c.expiry_date && new Date(c.expiry_date + "T23:59:59") < new Date();

    /* Lightbox */
    if (lb) lb.addEventListener("click", () => lb.close());
    function zoom(src, cap) {
      if (!lb) return;
      const img  = document.getElementById("lbImg");
      const capt = document.getElementById("lbCap");
      if (img)  img.src = src;
      if (capt) capt.textContent = cap;
      lb.showModal();
    }

    /* Card builder */
    function card(c) {
      const img    = window.safeUrl(c.image_url);
      const verify = window.safeUrl(c.credential_url);
      const pdf    = window.safeUrl(c.pdf_url);

      const thumb = img
        ? window.el("button", {
            class: "thumb zoom",
            type: "button",
            "aria-label": "View " + c.title,
            onclick: () => zoom(img, c.title),
          })
        : window.el("div", { class: "thumb" },
            window.el("span", { class: "mono", text: initials(c.issuer) })
          );
      if (img) thumb.style.backgroundImage = 'url("' + img + '")';
      if (c.is_featured) thumb.append(window.el("span", { class: "star", text: "Featured" }));

      const when = [
        c.issue_date  && "Issued " + fmt(c.issue_date),
        c.expiry_date && (isExpired(c) ? "Expired " : "Expires ") + fmt(c.expiry_date),
      ].filter(Boolean);

      return window.el("article", { class: "cert reveal" },
        thumb,
        window.el("div", { class: "body" },
          window.el("h3", { text: c.title }),
          window.el("p", { class: "issuer", text: [c.issuer, ...when].join(" · ") }),
          (c.category || isExpired(c)) && window.el("div", { class: "tags" },
            c.category   && window.el("span", { class: "tag",     text: c.category }),
            isExpired(c) && window.el("span", { class: "tag exp", text: "Expired" })
          ),
          c.description   && window.el("p", { class: "desc", text: c.description }),
          c.credential_id && window.el("p", { class: "cid", text: "ID: " + c.credential_id }),
          (verify || pdf) && window.el("div", { class: "actions" },
            verify && window.el("a", {
              class: "pill solid",
              href: verify,
              target: "_blank",
              rel: "noopener noreferrer",
              text: "Verify",
            }),
            pdf && window.el("a", {
              class: "pill",
              href: pdf,
              target: "_blank",
              rel: "noopener noreferrer",
              text: "PDF",
            })
          )
        )
      );
    }

    /* Render */
    function render() {
      const list = certs.filter(c => !category || c.category === category);
      if (countEl) countEl.textContent = list.length + (list.length === 1 ? " certificate" : " certificates");
      grid.replaceChildren(...(list.length
        ? list.map(card)
        : [window.el("p", { class: "empty", text: certs.length
            ? "No certificates in this category."
            : "No certificates yet." })]));
      window.initReveal(grid);
    }

    /* Filter pills */
    function renderFilters() {
      if (!filtersBox) return;
      const cats = [...new Set(certs.map(c => c.category).filter(Boolean))].sort();
      if (cats.length < 2) {
        filtersBox.replaceChildren();
        return;
      }
      filtersBox.replaceChildren(...["", ...cats].map(c =>
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

    /* Fetch */
    (async () => {
      try {
        certs = window.listOf(await window.api.get("/api/certificates"), "certificates")
          .sort((a, b) =>
            (a.display_order ?? 0) - (b.display_order ?? 0) ||
            String(b.issue_date || "").localeCompare(String(a.issue_date || ""))
          );
        renderFilters();
        render();
      } catch (e) {
        grid.replaceChildren(
          window.el("p", { class: "notice", text: e.message || "Could not load certificates." })
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
    initCertificates();
    window.initReveal();
  });
})();