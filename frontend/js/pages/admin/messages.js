// Chat-style inbox. All message text is set with textContent (never innerHTML).
const app = document.getElementById("app");
const listBox = document.getElementById("list");
const chatBox = document.getElementById("chat");
const search = document.getElementById("search");
const unreadBadge = document.getElementById("unread");
let msgs = [];
let selected = null;

// Static, trusted icon markup only.
const ICONS = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
};
const icon = n => { const s = el("span", { class: "ico" }); s.innerHTML = ICONS[n]; return s; };

const initials = name => (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const clock = d => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const short = iso => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? clock(d) : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

function renderList() {
  const q = search.value.trim().toLowerCase();
  const rows = msgs
    .filter(m => !q || [m.name, m.email, m.subject, m.message].some(v => (v || "").toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  unreadBadge.textContent = msgs.filter(m => !m.is_read).length;
  listBox.replaceChildren(...(rows.length ? rows.map(m =>
    el("button", { class: "item" + (selected && selected.id === m.id ? " active" : ""), type: "button", onclick: () => open(m) },
      el("div", { class: "avatar", text: initials(m.name) }),
      el("div", { class: "meta" }, el("strong", { text: m.name }), el("small", { text: m.subject || m.message })),
      el("div", { class: "side" },
        el("span", { class: "time" + (m.is_read ? "" : " hot"), text: short(m.created_at) }),
        !m.is_read && el("span", { class: "pill", text: "New" })))
  ) : [el("p", { class: "muted", style: "padding:1rem", text: msgs.length ? "No matches." : "No messages yet." })]));
}

function renderChat() {
  if (!selected) {
    chatBox.replaceChildren(el("div", { class: "empty", text: "Select a message to read it." }));
    return;
  }
  const m = selected, d = new Date(m.created_at);
  const mailto = "mailto:" + m.email + "?subject=" + encodeURIComponent("Re: " + (m.subject || "your message"));
  chatBox.replaceChildren(
    el("div", { class: "chat-head" },
      el("button", { class: "round back", type: "button", "aria-label": "Back", onclick: () => app.classList.remove("show-chat") }, icon("back")),
      el("div", { class: "avatar", text: initials(m.name) }),
      el("div", { class: "who" }, el("strong", { text: m.name }), el("small", { text: m.email })),
      el("a", { class: "round red", href: mailto, title: "Reply by email", "aria-label": "Reply by email" }, icon("mail"))),
    el("div", { class: "thread" },
      el("div", { class: "day", text: d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }),
      el("div", { class: "bubble in" }, m.subject && el("b", { text: m.subject }), m.message, el("time", { text: clock(d) })),
      m.is_replied && el("div", { class: "bubble out", text: "Marked as replied" })),
    el("div", { class: "actions" },
      el("div", { class: "bar" },
        el("span", { class: "hint", text: "Replies are sent from your email app" }),
        !m.is_read && el("button", { class: "chip", type: "button", text: "Mark read", onclick: () => update(m, { is_read: true }) }),
        !m.is_replied && el("button", { class: "chip", type: "button", text: "Mark replied", onclick: () => update(m, { is_replied: true }) })),
      el("button", { class: "round red", type: "button", title: "Delete message", "aria-label": "Delete message", onclick: () => remove(m) }, icon("trash"))));
}

async function update(m, body) {
  try {
    await api.patch("/api/contact/messages/" + m.id, body, true);
    Object.assign(m, body);
    renderList(); renderChat();
  } catch (e) { alert(e.message); }
}

function open(m) {
  selected = m;
  app.classList.add("show-chat");
  renderList(); renderChat();
  if (!m.is_read) update(m, { is_read: true });
}

async function remove(m) {
  if (!confirm("Delete this message permanently?")) return;
  try {
    await api.del("/api/contact/messages/" + m.id, true);
    msgs = msgs.filter(x => x.id !== m.id);
    selected = null;
    app.classList.remove("show-chat");
    renderList(); renderChat();
  } catch (e) { alert(e.message); }
}

async function load() {
  try {
    msgs = listOf(await api.get("/api/contact/messages", true), "messages");
    renderList(); renderChat();
  } catch (e) { showError(listBox, e); }
}

search.addEventListener("input", renderList);
load();