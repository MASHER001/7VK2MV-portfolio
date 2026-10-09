(async () => {
  const box = document.getElementById("stats");
  const defs = [
    ["Projects", "/api/projects", "projects"],
    ["Skills", "/api/skills", "skills"],
    ["Certificates", "/api/certificates", "certificates"],
    ["Unread messages", "/api/contact/messages", "messages"],
  ];
  const res = await Promise.allSettled(defs.map(d => api.get(d[1], d[2] === "messages")));
  box.replaceChildren(...defs.map((d, i) => {
    const r = res[i];
    const list = r.status === "fulfilled" ? listOf(r.value, d[2]) : null;
    const n = list ? (d[2] === "messages" ? list.filter(m => !m.is_read).length : list.length) : "–";
    return el("div", { class: "card stat" }, el("b", { text: n }), el("span", { class: "muted", text: d[0] }));
  }));
})();