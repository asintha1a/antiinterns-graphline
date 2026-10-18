const $ = (selector) => document.querySelector(selector);
let state = { conversations: [] };
let activeId = null;
let toastTimer;

function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
}
async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const data = await res.json(); if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`); return data;
}
function escapeText(value) { return String(value ?? ''); }
function initials(name) { return String(name || '?').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(); }
function latest(conv) { return conv.messages?.[conv.messages.length - 1]; }
function renderList() {
  const term = $('#search').value.trim().toLowerCase();
  const list = $('#conversationList'); list.replaceChildren();
  const items = state.conversations.filter((c) => `${c.customer} ${latest(c)?.text || ''}`.toLowerCase().includes(term));
  $('#inboxCount').textContent = state.conversations.length;
  $('#conversationSub').textContent = `${state.conversations.length} graph-linked threads`;
  if (!items.length) { const empty = document.createElement('div'); empty.className = 'trace-placeholder'; empty.textContent = 'No conversations match this search.'; list.append(empty); }
  for (const conv of items) {
    const row = document.createElement('button'); row.className = `conversation-item${conv.id === activeId ? ' selected' : ''}`; row.type = 'button';
    const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.textContent = initials(conv.customer);
    const info = document.createElement('span'); info.className = 'conversation-info';
    const top = document.createElement('span'); top.className = 'conversation-top';
    const name = document.createElement('b'); name.textContent = conv.customer;
    const time = document.createElement('small'); time.textContent = conv.messages?.length ? 'Active' : 'New';
    top.append(name, time);
    const preview = document.createElement('span'); preview.className = 'conversation-preview'; preview.textContent = latest(conv)?.text || 'New conversation';
    const tag = document.createElement('span'); tag.className = 'intent-tag'; tag.textContent = conv.status === 'open' ? 'OPEN' : conv.status.toUpperCase();
    info.append(top, preview, tag); row.append(avatar, info);
    row.addEventListener('click', () => { activeId = conv.id; renderList(); renderConversation(); clearTrace(); });
    list.append(row);
  }
}
function renderConversation() {
  const conv = state.conversations.find((item) => item.id === activeId);
  const header = $('#chatHeader'); const messages = $('#messages'); messages.replaceChildren();
  if (!conv) { header.innerHTML = '<div class="avatar">G</div><div class="chat-person"><b>Select a conversation</b><small>Connected customer memory</small></div><span class="open-status">OPEN</span>'; messages.innerHTML = '<div class="empty-chat"><div class="empty-symbol">↗</div><h3>Choose a conversation</h3><p>Send a message to see the graph agent resolve context, create a reply and route work.</p></div>'; return; }
  header.innerHTML = '';
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = initials(conv.customer);
  const person = document.createElement('div'); person.className = 'chat-person';
  const name = document.createElement('b'); name.textContent = conv.customer;
  const sub = document.createElement('small'); sub.textContent = `${conv.id} · customer record linked in graph`;
  person.append(name, sub); const status = document.createElement('span'); status.className = 'open-status'; status.textContent = conv.status.toUpperCase(); header.append(avatar, person, status);
  for (const message of conv.messages || []) appendMessage(message.text, message.direction, message.direction === 'in' ? conv.customer : 'Graphline agent');
  messages.scrollTop = messages.scrollHeight;
}
function appendMessage(text, direction, label) {
  const messages = $('#messages'); const row = document.createElement('div'); row.className = `message-row ${direction === 'out' ? 'out' : ''}`;
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = escapeText(text);
  const meta = document.createElement('span'); meta.className = 'message-meta'; meta.textContent = label;
  row.append(bubble, meta); messages.append(row); messages.scrollTop = messages.scrollHeight;
}
function clearTrace() {
  $('#graphPath').innerHTML = '<div class="trace-placeholder">Send a message to inspect the graph path the agent followed.</div>';
  $('#decisionCard').classList.add('hidden'); $('#decisionCard').replaceChildren(); renderMemory([]);
}
function renderMemory(memory) {
  const el = $('#memory'); el.replaceChildren();
  if (!memory?.length) { el.className = 'memory-empty'; el.textContent = 'No earlier conversation is connected to this customer yet. New messages will become persistent graph memory.'; return; }
  el.className = '';
  for (const item of memory) { const card = document.createElement('div'); card.className = 'memory-item'; const meta = document.createElement('small'); meta.textContent = `${item.conversationId} · ${item.direction === 'in' ? 'Customer' : 'Agent'}`; const p = document.createElement('p'); p.textContent = item.text; card.append(meta, p); el.append(card); }
}
function showTrace(result) {
  const path = $('#graphPath'); path.replaceChildren();
  for (const step of result.path || []) {
    const row = document.createElement('div'); row.className = 'path-step'; const dot = document.createElement('i'); dot.className = 'path-dot'; const text = document.createElement('div'); text.className = 'path-text'; const label = document.createElement('b'); label.textContent = step.label; const value = document.createElement('span'); value.textContent = step.value; text.append(label, value); row.append(dot, text); path.append(row);
  }
  const card = $('#decisionCard'); card.replaceChildren(); card.classList.remove('hidden'); const title = document.createElement('div'); title.className = 'decision-title'; title.textContent = result.decision.handoff ? 'HUMAN HANDOFF CREATED' : 'AUTOMATED RESPONSE'; const p = document.createElement('p'); p.textContent = `${result.decision.intent} · ${result.decision.policy}. ${result.decision.guidance}`; card.append(title, p); const source = document.createElement('div'); source.className = 'decision-title'; source.style.marginTop = '7px'; source.textContent = `REPLY SOURCE · ${result.decision.replySource || 'graph policy'}`; card.append(source);
  if (result.decision.ticketId) { const badge = document.createElement('span'); badge.className = 'ticket-badge'; badge.textContent = `Assigned to ${result.decision.team} · ${result.decision.ticketId}`; card.append(badge); }
  renderMemory(result.memory);
}
async function refresh(preferId = activeId) {
  const health = await api('/api/health'); $('#dbStatus').textContent = health.ok ? 'Connected · live graph' : 'Not connected';
  state = await api('/api/state');
  if (!state.conversations.some((c) => c.id === preferId)) preferId = state.conversations[0]?.id || null;
  activeId = preferId; renderList(); renderConversation();
  $('#counts').innerHTML = '';
  for (const [key, label] of [['Customer','Customers'],['Intent','Intents'],['Ticket','Tickets']]) { const cell = document.createElement('div'); const n = document.createElement('b'); n.textContent = state.counts[key] ?? '0'; const caption = document.createElement('span'); caption.textContent = label; cell.append(n, caption); $('#counts').append(cell); }
}
async function send(text) {
  const content = text.trim(); if (!content || !activeId) return;
  $('#sendButton').disabled = true; $('#messageInput').value = '';
  appendMessage(content, 'in', state.conversations.find((c) => c.id === activeId)?.customer || 'Customer');
  try { const result = await api(`/api/conversations/${encodeURIComponent(activeId)}/messages`, { method: 'POST', body: JSON.stringify({ text: content }) }); appendMessage(result.reply, 'out', 'Graphline agent'); showTrace(result); await refresh(activeId); }
  catch (err) { toast(err.message); await refresh(activeId).catch(() => {}); }
  finally { $('#sendButton').disabled = false; $('#messageInput').focus(); }
}

$('#composer').addEventListener('submit', (event) => { event.preventDefault(); send($('#messageInput').value); });
$('#messageInput').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('#composer').requestSubmit(); } });
$('#search').addEventListener('input', renderList);
$('#refresh').addEventListener('click', () => refresh().catch((err) => toast(err.message)));
$('#newConversation').addEventListener('click', async () => {
  const name = window.prompt('Sample customer name', 'New Sample Customer'); if (name === null) return;
  try { const result = await api('/api/conversations', { method: 'POST', body: JSON.stringify({ customerName: name }) }); await refresh(result.id); clearTrace(); $('#messageInput').focus(); }
  catch (err) { toast(err.message); }
});
document.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => { if (!activeId) { toast('Choose a conversation first.'); return; } $('#messageInput').value = button.dataset.text; $('#composer').requestSubmit(); }));
refresh().then(() => { if (state.conversations[0]) { renderConversation(); } }).catch((err) => { $('#dbStatus').textContent = 'Unavailable'; toast(`FalkorDB unavailable: ${err.message}`); });
