/* =====================================================================
   about.js — public About page.
   Loaded by: about.html
   Fetches the profile from /api/profile and renders everything on the
   page from that data. Also loads featured skills for the chip list.
   Depends on: config.js (constants), api.js (el, safeUrl, api, listOf,
               getProfile, initReveal)
   ===================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Warped headline — reads word from data-word on the <h1>
     --------------------------------------------------------------------- */
  function initHeadline() {
    const el = document.getElementById("word");
    if (!el) return;

    const WORD = el.dataset.word || "ABOUT";
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
     Helpers
     --------------------------------------------------------------------- */
  const initials = name => {
    const w = (name || "?").trim().split(/\s+/);
    return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
  };

  const section = (title, ...kids) =>
    window.el("section", { class: "card reveal" }, window.el("h2", { text: title }), ...kids);

  const fact = (label, value) =>
    value
      ? window.el("div", { class: "fact" },
          window.el("span", { text: label }),
          window.el("span", { text: value })
        )
      : null;

  /* ---------------------------------------------------------------------
     Main content — everything on the page comes from the profile
     --------------------------------------------------------------------- */
  async function renderProfile() {
    const box = document.getElementById("content");
    if (!box) return;

    let p;
    try {
      p = await window.getProfile();
    } catch (e) {
      box.replaceChildren(
        window.el("p", { class: "notice", text: e.message || "Could not load the profile." })
      );
      return;
    }

    /* Header meta + document title */
    const who  = document.getElementById("who");
    const role = document.getElementById("role");
    const footerName = document.getElementById("footer-name");
    const year = document.getElementById("year");

    if (who)  who.textContent  = p.full_name || "";
    if (role) role.textContent = p.professional_title || "";
    if (footerName) footerName.textContent = p.full_name || "";
    if (year) year.textContent = new Date().getFullYear();
    document.title = "About " + (p.full_name || "Portfolio") + " | Portfolio";

    /* Photo — image if set, otherwise initials on a red block */
    const img = window.safeUrl(p.profile_image_url);
    const photo = window.el("div",
      { class: "photo reveal", role: "img", "aria-label": p.full_name || "" },
      !img && window.el("span", { class: "mono", text: initials(p.full_name) })
    );
    if (img) photo.style.backgroundImage = 'url("' + img + '")';

    /* Links — only include the ones that have values */
    const digits = (p.whatsapp_number || "").replace(/\D/g, "");
    const phone  = (p.phone || "").replace(/[^\d+]/g, "");

    const links = [
      [p.email,                  "Email",     p.email && "mailto:" + p.email],
      [window.safeUrl(p.github_url),    "GitHub",    window.safeUrl(p.github_url)],
      [window.safeUrl(p.linkedin_url),  "LinkedIn",  window.safeUrl(p.linkedin_url)],
      [window.safeUrl(p.instagram_url), "Instagram", window.safeUrl(p.instagram_url)],
      [digits,                   "WhatsApp",  digits && "https://wa.me/" + digits],
      [phone,                    "Call",      phone && "tel:" + phone],
    ]
      .filter(([hasValue, , href]) => hasValue && href)
      .map(([, label, href]) => [label, href]);

    const cv = window.safeUrl(p.cv_url);

    /* Build the two-column layout */
    box.replaceChildren(
      window.el("div", { class: "grid" },
        window.el("div", {}, photo),
        window.el("div", { class: "stack" },
          /* Hello card — name, role, bio */
          window.el("section", { class: "card reveal" },
            window.el("h2", { text: "Hello" }),
            window.el("p", { class: "name", text: p.full_name || "" }),
            window.el("p", { class: "role", text: p.professional_title || "" }),
            window.el("p", { class: "bio",  text: p.bio || "" })
          ),

          /* Availability card */
          (p.availability_status || p.availability_message) && section(
            "Availability",
            p.availability_status  && window.el("span", { class: "badge", text: p.availability_status }),
            p.availability_message && window.el("p", { class: "avail-msg", text: p.availability_message })
          ),

          /* Details card — location and email */
          (p.location || p.email) && section(
            "Details",
            window.el("div", { class: "facts" },
              fact("Location", p.location),
              fact("Email",    p.email)
            )
          ),

          /* Find me card — CV + all socials */
          (links.length || cv) && section(
            "Find me",
            window.el("div", { class: "links" },
              cv && window.el("a", {
                class: "pill solid",
                href: cv,
                target: "_blank",
                rel: "noopener noreferrer",
                text: "Download CV",
              }),
              links.map(([label, href]) =>
                window.el("a", {
                  class: "pill",
                  href,
                  target: href.startsWith("http") ? "_blank" : null,
                  rel: "noopener noreferrer",
                  text: label,
                })
              )
            )
          ),

          /* Placeholder — filled by renderSkills() */
          window.el("div", { id: "skills-slot" })
        )
      )
    );

    window.initReveal(box);
    renderSkills(box);
  }

  /* ---------------------------------------------------------------------
     Skills chip list — featured first, capped at 18
     --------------------------------------------------------------------- */
  async function renderSkills(box) {
    const slot = document.getElementById("skills-slot");
    if (!slot) return;

    try {
      let skills = window.listOf(await window.api.get("/api/skills"), "skills");
      const featured = skills.filter(s => s.is_featured);
      skills = (featured.length ? featured : skills).slice(0, 18);

      if (!skills.length) return;

      slot.replaceWith(
        window.el("section", { class: "card reveal" },
          window.el("h2", { text: "Skills" }),
          window.el("div", { class: "chips" },
            skills.map(s =>
              window.el("span", {
                class: "chip" + (s.is_learning ? " learn" : ""),
                text: s.name + (s.is_learning ? " · learning" : ""),
              })
            )
          ),
          window.el("p", { style: "margin:1rem 0 0" },
            window.el("a", { class: "pill", href: "skills.html", text: "All skills" })
          )
        )
      );

      window.initReveal(box);
    } catch {
      /* Skills are optional — the page works without them */
    }
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initHeadline();
    initMenu();
    renderProfile();
    window.initReveal();
  });
})();