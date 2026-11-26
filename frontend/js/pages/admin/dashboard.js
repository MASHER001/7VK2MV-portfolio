(async () => {
  const box = document.getElementById("stats");
  const errorBox = document.getElementById("dashboard-error");
  const defs = [
    { label: "Projects", path: "/api/projects", key: "projects", href: "projects.html", action: "Manage projects" },
    { label: "Skills", path: "/api/skills", key: "skills", href: "skills.html", action: "Manage skills" },
    { label: "Certificates", path: "/api/certificates", key: "certificates", href: "certificates.html", action: "Manage certificates" },
    { label: "Experiences", path: "/api/achievements", key: "achievements", href: "achievements.html", action: "Manage experiences" },
    { label: "Unread messages", path: "/api/contact/messages", key: "messages", href: "messages.html", action: "Open inbox", authenticated: true },
  ];

  const results = await Promise.allSettled(defs.map(d => api.get(d.path, !!d.authenticated)));
  const errors = [];
  const cards = defs.map((d, i) => {
    const result = results[i];
    let count = "–";
    let unavailable = false;

    try {
      if (result.status === "rejected") throw result.reason;
      const payload = result.value;
      const list = Array.isArray(payload)
        ? payload
        : payload && (payload[d.key] || payload.items || payload.data);
      if (!Array.isArray(list)) throw new TypeError("Unexpected response format");
      count = d.key === "messages" ? list.filter(m => !m.is_read).length : list.length;
    } catch (e) {
      unavailable = true;
      errors.push(d.label);
      console.error("[dashboard] Could not load " + d.label.toLowerCase() + " count:", e);
    }

    const description = unavailable ? "Count unavailable" : d.action;
    return el("a", {
      class: "card stat" + (unavailable ? " unavailable" : ""),
      href: d.href,
      "aria-label": d.label + ": " + count + ". " + description + ".",
    },
      el("span", { class: "stat-label", text: d.label }),
      el("strong", { text: count }),
      el("span", { class: "stat-action", text: description }),
      el("span", { class: "stat-arrow", "aria-hidden": "true", text: "↗" }));
  });

  box.replaceChildren(...cards);
  errorBox.replaceChildren(...(errors.length
    ? [el("p", { class: "notice err", text: "Some dashboard counts could not be loaded. Open a section to try again." })]
    : []));
})();
