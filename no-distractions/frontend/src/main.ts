import "./style.css";

type User = { id: string; username: string };
type Group = { id: string; name: string; slug: string };
type Message = { id: string; body: string; sender_name: string; created_at: string };
type Session = { user: User; token: string };

const app = document.querySelector<HTMLDivElement>("#app")!;
let session: Session | null = JSON.parse(localStorage.getItem("nd-session") ?? "null");
let group: Group | null = JSON.parse(localStorage.getItem("nd-group") ?? "null");
let messages: Message[] = [];

async function api<T>(path: string, body: object, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && session) headers.Authorization = `Bearer ${session.token}`;
  const response = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}
function status(message = "") { const el = document.querySelector<HTMLElement>("#status"); if (el) el.textContent = message; }
function render() {
  if (!session) { renderRegister(); return; }
  if (!group) { renderGroups(); return; }
  renderChat(); void loadMessages();
}
function renderRegister() {
  app.innerHTML = `<section class="card narrow"><p class="eyebrow">NoDistractions</p><h1>A calmer group chat.</h1><p>Start with a username and password. This is a prototype, so your account resets when the API restarts.</p><form id="register"><label>Username<input name="username" autocomplete="username" required minlength="3" maxlength="32" /></label><label>Password<input name="password" type="password" autocomplete="new-password" required minlength="10" /></label><button>Create account</button><p id="status" class="status"></p></form></section>`;
  document.querySelector<HTMLFormElement>("#register")!.onsubmit = async (event) => { event.preventDefault(); const values = new FormData(event.currentTarget as HTMLFormElement); status("Creating account…"); try { session = await api<Session>("/api/register", { username: values.get("username"), password: values.get("password") }, false); localStorage.setItem("nd-session", JSON.stringify(session)); render(); } catch (e) { status((e as Error).message); } };
}
function renderGroups() {
  app.innerHTML = `<header><div><p class="eyebrow">Signed in as ${escapeHTML(session!.user.username)}</p><h1>Choose a room</h1></div><button class="quiet" id="signout">Sign out</button></header><section class="grid"><form class="card" id="create"><h2>Create a group</h2><label>Group name<input name="name" required minlength="3" maxlength="64" placeholder="Sunday study club" /></label><label>Invite code<input name="inviteCode" required minlength="4" maxlength="64" placeholder="A code members will enter" /></label><button>Create group</button></form><form class="card" id="join"><h2>Enter a group</h2><label>Group name<input name="name" required placeholder="Sunday study club" /></label><label>Invite code<input name="inviteCode" required placeholder="Enter the code" /></label><button>Enter group</button><p id="status" class="status"></p></form></section>`;
  document.querySelector<HTMLButtonElement>("#signout")!.onclick = () => { session = null; group = null; localStorage.removeItem("nd-session"); localStorage.removeItem("nd-group"); render(); };
  document.querySelector<HTMLFormElement>("#create")!.onsubmit = async (event) => { event.preventDefault(); const f = new FormData(event.currentTarget as HTMLFormElement); status("Creating group…"); try { const result = await api<{ group: Group }>("/api/create-group", { name: f.get("name"), entry_details_config: { invite_code: f.get("inviteCode") } }); group = result.group; localStorage.setItem("nd-group", JSON.stringify(group)); render(); } catch(e) { status((e as Error).message); } };
  document.querySelector<HTMLFormElement>("#join")!.onsubmit = async (event) => { event.preventDefault(); const f = new FormData(event.currentTarget as HTMLFormElement); status("Checking entry details…"); try { const result = await api<{ group: Group }>("/api/get-group", { name: f.get("name"), entry_details: { invite_code: f.get("inviteCode") } }); group = result.group; localStorage.setItem("nd-group", JSON.stringify(group)); render(); } catch(e) { status((e as Error).message); } };
}
function renderChat() {
  app.innerHTML = `<header><div><p class="eyebrow"># ${escapeHTML(group!.slug)}</p><h1>${escapeHTML(group!.name)}</h1></div><button class="quiet" id="leave">Change group</button></header><section class="chat card"><div id="messages" class="messages"><p class="muted">Loading messages…</p></div><form id="send" class="composer"><input name="body" maxlength="2000" required placeholder="Write a message" autocomplete="off" /><button>Send</button></form><p id="status" class="status"></p></section>`;
  document.querySelector<HTMLButtonElement>("#leave")!.onclick = () => { group = null; localStorage.removeItem("nd-group"); render(); };
  document.querySelector<HTMLFormElement>("#send")!.onsubmit = async (event) => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const input = form.elements.namedItem("body") as HTMLInputElement; try { const result = await api<{ message: Message }>("/api/send-chats", { group_id: group!.id, message_body: input.value }); messages.push(result.message); input.value = ""; drawMessages(); } catch(e) { status((e as Error).message); } };
}
async function loadMessages() { try { const result = await api<{ messages: Message[] }>("/api/get-chats", { group_id: group!.id }); messages = result.messages.reverse(); drawMessages(); } catch(e) { status((e as Error).message); } }
function drawMessages() { const target = document.querySelector<HTMLDivElement>("#messages"); if (!target) return; target.innerHTML = messages.length ? messages.map(message => `<article><strong>${escapeHTML(message.sender_name)}</strong><p>${escapeHTML(message.body)}</p></article>`).join("") : `<p class="muted">No messages yet. Say hello.</p>`; target.scrollTop = target.scrollHeight; }
function escapeHTML(value: string) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
render();
