/* =====================================================================
   contact.js — public Contact page.
   Loaded by: contact.html
   Handles: warped headline, menu overlay, contact info from profile,
            form validation + submission.
   Depends on: config.js (constants), api.js (el, safeUrl, getProfile,
               initReveal, api)
   ===================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Warped headline — reads the word from data-word on the <h1>
     --------------------------------------------------------------------- */
  function initHeadline() {
    const el = document.getElementById("word");
    if (!el) return;

    const WORD = el.dataset.word || "CONTACT";
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
        const sk = Math.sin(i * .8 + .5 + t * .0007) * 15;
        const sy = 1 + .2 * Math.cos(i * 1 + t * .0005);
        const ty = Math.sin(i * 1.2 + t * .0006) * 6;
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
     Profile — header meta, footer, and the left-hand info cards
     --------------------------------------------------------------------- */
  function initProfile() {
    const row = (k, v) =>
      v ? window.el("div", { class: "row" }, window.el("span", { text: k }), v) : null;

    (async () => {
      const box = document.getElementById("info");
      if (!box) return;

      let p;
      try {
        p = await window.getProfile();
      } catch {
        return;
      }

      const who  = document.getElementById("who");
      const role = document.getElementById("role");
      const footer = document.getElementById("footer-text");
      if (who)  who.textContent  = p.full_name || "";
      if (role) role.textContent = p.professional_title || "";
      if (footer) footer.textContent = "© " + new Date().getFullYear() + " " + (p.full_name || "");

      const digits = (p.whatsapp_number || "").replace(/\D/g, "");
      const phone  = (p.phone || "").replace(/[^\d+]/g, "");
      const social = [
        ["GitHub",    window.safeUrl(p.github_url)],
        ["LinkedIn",  window.safeUrl(p.linkedin_url)],
        ["Instagram", window.safeUrl(p.instagram_url)],
        ["WhatsApp",  digits && "https://wa.me/" + digits],
      ].filter(s => s[1]);

      box.replaceChildren(
        window.el("section", { class: "card reveal" },
          window.el("h2", { text: "Let's work together" }),
          p.availability_status && window.el("span", { class: "badge", text: p.availability_status }),
          window.el("p", {
            class: "lead",
            text: p.availability_message || "Have a project or an opportunity in mind? Send me a message and I'll get back to you.",
          })
        ),
        (p.email || phone || p.location) && window.el("section", { class: "card reveal" },
          window.el("h2", { text: "Details" }),
          row("Email",    p.email && window.el("a", { href: "mailto:" + p.email, text: p.email })),
          row("Phone",    phone && window.el("a", { href: "tel:" + phone, text: p.phone })),
          row("Location", p.location && window.el("span", { text: p.location }))
        ),
        social.length && window.el("section", { class: "card reveal" },
          window.el("h2", { text: "Elsewhere" }),
          window.el("div", { class: "links" },
            social.map(([label, href]) =>
              window.el("a", {
                class: "pill",
                href,
                target: "_blank",
                rel: "noopener noreferrer",
                text: label,
              })
            )
          )
        )
      );

      window.initReveal(box);
    })();
  }

  /* ---------------------------------------------------------------------
     Contact form
     --------------------------------------------------------------------- */
  function initForm() {
    const form      = document.getElementById("contact-form");
    const sendBtn   = document.getElementById("sendBtn");
    const formError = document.getElementById("form-error");
    const counter   = document.getElementById("counter");
    if (!form) return;

    const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    const fieldErr = (name, msg) => {
      const errEl = document.getElementById("err-" + name);
      const field = form.elements[name].closest(".field");
      if (errEl) errEl.textContent = msg || "";
      if (field) field.classList.toggle("bad", !!msg);
      form.elements[name].setAttribute("aria-invalid", msg ? "true" : "false");
    };

    function validate() {
      const v = n => form.elements[n].value.trim();
      const errs = {
        name:    !v("name")    ? "Please enter your name."      : "",
        email:   !v("email")   ? "Please enter your email."     :
                 !EMAIL_RE.test(v("email")) ? "That email doesn't look right." : "",
        subject: v("subject").length > 200  ? "Keep the subject under 200 characters." : "",
        message: !v("message") ? "Please write a message."      :
                 v("message").length > 5000 ? "That's over 5000 characters." : "",
      };
      Object.entries(errs).forEach(([n, m]) => fieldErr(n, m));
      return !Object.values(errs).some(Boolean);
    }

    form.addEventListener("input", e => {
      if (counter) counter.textContent = form.message.value.length + " / 5000";
      const watched = ["name", "email", "subject", "message"];
      if (watched.includes(e.target.name)) {
        const field = e.target.closest(".field");
        if (field && field.classList.contains("bad")) validate();
      }
    });

    function success() {
      const card = document.getElementById("formCard");
      if (!card) return;
      card.replaceChildren(
        window.el("div", { class: "done" },
          window.el("div", { class: "tick", text: "✓" }),
          window.el("h3", { text: "Message sent" }),
          window.el("p",  { text: "Thank you. I'll reply to your email as soon as I can." }),
          window.el("button", {
            class: "pill",
            type: "button",
            text: "Send another",
            onclick: () => location.reload(),
          })
        )
      );
    }

    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (formError) formError.replaceChildren();

      /* Honeypot — bots fill hidden fields, humans don't */
      if (form.website.value) return success();

      if (!validate()) return;

      sendBtn.disabled = true;
      sendBtn.firstChild.textContent = "Sending… ";

      try {
        const body = {
          name:    form.elements.name.value.trim(),
          email:   form.email.value.trim(),
          message: form.message.value.trim(),
        };
        const subj = form.subject.value.trim();
        if (subj) body.subject = subj;

        await window.api.post("/api/contact", body);
        success();
      } catch (e) {
        if (formError) {
          formError.replaceChildren(
            window.el("p", {
              class: "notice",
              text: e.message || "Something went wrong. Please try again.",
            })
          );
        }
        sendBtn.disabled = false;
        sendBtn.firstChild.textContent = "Send message ";
      }
    });
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initHeadline();
    initMenu();
    initProfile();
    initForm();
    window.initReveal();
  });
})();