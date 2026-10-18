const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}

const PORT = Number(process.env.PORT || 4173);
const DB_HOST = process.env.FALKORDB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.FALKORDB_PORT || 6379);
const DB_PASSWORD = process.env.FALKORDB_PASSWORD || '';
const GRAPH = process.env.FALKORDB_GRAPH || 'antiinterns_support';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const ROOT = __dirname;

function parseResp(buf, pos = 0) {
  if (pos >= buf.length) return null;
  const type = String.fromCharCode(buf[pos]);
  const end = buf.indexOf('\r\n', pos);
  if (end < 0) return null;
  const head = buf.toString('utf8', pos + 1, end);
  if (type === '+' || type === '-' || type === ':') {
    const value = type === ':' ? Number(head) : head;
    return { value: type === '-' ? new Error(head) : value, next: end + 2 };
  }
  if (type === '$') {
    const size = Number(head);
    if (size === -1) return { value: null, next: end + 2 };
    if (buf.length < end + 2 + size + 2) return null;
    return { value: buf.toString('utf8', end + 2, end + 2 + size), next: end + 2 + size + 2 };
  }
  if (type === '*') {
    const count = Number(head);
    if (count === -1) return { value: null, next: end + 2 };
    const items = [];
    let next = end + 2;
    for (let i = 0; i < count; i++) {
      const item = parseResp(buf, next);
      if (!item) return null;
      items.push(item.value);
      next = item.next;
    }
    return { value: items, next };
  }
  throw new Error(`Unsupported Redis response type ${type}`);
}

function redisCommand(parts) {
  return new Promise((resolve, reject) => {
    const args = parts.map((part) => Buffer.from(String(part)));
    const header = Buffer.from(`*${args.length}\r\n`);
    const body = Buffer.concat(args.flatMap((arg) => [Buffer.from(`$${arg.length}\r\n`), arg, Buffer.from('\r\n')]));
    const socket = net.createConnection({ host: DB_HOST, port: DB_PORT });
    let buffer = Buffer.alloc(0);
    let authenticated = !DB_PASSWORD;
    let authSent = false;
    let settled = false;
    const fail = (err) => { if (!settled) { settled = true; socket.destroy(); reject(err); } };
    socket.setTimeout(6000, () => fail(new Error('FalkorDB connection timed out')));
    socket.on('error', fail);
    socket.on('connect', () => {
      if (DB_PASSWORD) {
        authSent = true;
        const auth = [Buffer.from('*2\r\n$4\r\nAUTH\r\n'), Buffer.from(`$${Buffer.byteLength(DB_PASSWORD)}\r\n${DB_PASSWORD}\r\n`)];
        socket.write(Buffer.concat(auth));
      } else socket.write(Buffer.concat([header, body]));
    });
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const reply = parseResp(buffer);
      if (!reply) return;
      if (reply.value instanceof Error) return fail(reply.value);
      if (authSent && !authenticated) {
        authenticated = true;
        authSent = false;
        buffer = buffer.subarray(reply.next);
        socket.write(Buffer.concat([header, body]));
        return;
      }
      settled = true;
      socket.end();
      resolve(reply.value);
    });
  });
}

function cypher(value) { return JSON.stringify(String(value)); }
function asBoolean(value) { return value === true || value === 1 || String(value).toLowerCase() === 'true'; }
async function query(text) {
  const result = await redisCommand(['GRAPH.QUERY', GRAPH, text]);
  if (!Array.isArray(result)) throw new Error('Unexpected FalkorDB reply');
  return result[1] || [];
}

async function seed() {
  await query(`MERGE (:Workspace {id:'antiinterns-demo', name:'Sample Support Workspace'})`);
  await query(`UNWIND [
      {id:'demo-maya',name:'Maya Sample',email:'maya@example.test'},
      {id:'demo-noah',name:'Noah Sample',email:'noah@example.test'},
      {id:'demo-ari',name:'Ari Sample',email:'ari@example.test'}
    ] AS row
    MATCH (w:Workspace {id:'antiinterns-demo'})
    MERGE (u:Customer {id:row.id}) SET u.name=row.name,u.email=row.email,u.synthetic=true
    MERGE (w)-[:HAS_CUSTOMER]->(u)`);
  await query(`UNWIND [
      {id:'shipping',name:'Delivery problem',route:'Logistics',reply:'I can help check this. Please send your order number so the team can look into the delivery.',policy:'Delivery support',guidance:'Ask for the order number. Route delayed or missing deliveries to Logistics.',requiresHuman:false,terms:['delivery','tracking','late','delayed','shipping','order']},
      {id:'returns',name:'Return or refund',route:'Returns',reply:'I can help with a return or refund. Please share your order number and a team member can check the next step.',policy:'Returns policy',guidance:'Collect the order number and route refund or return questions to Returns.',requiresHuman:true,terms:['return','refund','returned','money back']},
      {id:'human-help',name:'Human assistance',route:'Support',reply:'I’ve routed this conversation to the Support team so a person can follow up.',policy:'Human handoff',guidance:'Create a support ticket and assign it to Support when the customer asks for a person or agent.',requiresHuman:true,terms:['human','person','agent','representative','speak to a person']}
    ] AS row
    MERGE (i:Intent {id:row.id}) SET i.name=row.name,i.route=row.route,i.reply=row.reply,i.requiresHuman=row.requiresHuman
    MERGE (p:Policy {id:row.id+'-policy'}) SET p.title=row.policy,p.guidance=row.guidance
    MERGE (t:Team {name:row.route})
    MERGE (i)-[:GOVERNED_BY]->(p)
    MERGE (i)-[:ROUTES_TO]->(t)
    FOREACH (term IN row.terms | MERGE (k:Keyword {term:term}) MERGE (i)-[:MATCHES]->(k))`);
  await query(`UNWIND [
      {conv:'conv-maya',customer:'demo-maya',message:'Hi, I need help with my delivery.'},
      {conv:'conv-noah',customer:'demo-noah',message:'Can you explain your return process?'},
      {conv:'conv-ari',customer:'demo-ari',message:'Hello, can someone help me?'}
    ] AS row
    MATCH (u:Customer {id:row.customer})
    MERGE (c:Conversation {id:row.conv}) SET c.status='open',c.synthetic=true,c.updatedAt=timestamp()
    MERGE (u)-[:HAS_CONVERSATION]->(c)
    MERGE (c)-[:FOR_CUSTOMER]->(u)
    MERGE (m:Message {id:'seed-'+row.conv}) SET m.text=row.message,m.direction='in',m.createdAt=timestamp(),m.synthetic=true
    MERGE (c)-[:HAS_MESSAGE]->(m)`);
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(data), 'access-control-allow-origin': '*' });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 100_000) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

async function getState() {
  const rows = await query(`MATCH (c:Conversation)-[:FOR_CUSTOMER]->(u:Customer) OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message) RETURN c.id,u.id,u.name,c.status,c.updatedAt,m.id,m.text,m.direction,m.createdAt ORDER BY c.updatedAt DESC,m.createdAt DESC`);
  const conversations = new Map();
  for (const row of rows) {
    const [id, customerId, customer, status, updatedAt, messageId, text, direction, createdAt] = row;
    if (!conversations.has(id)) conversations.set(id, { id, customerId, customer, status, updatedAt, messages: [] });
    if (messageId) conversations.get(id).messages.push({ id: messageId, text, direction, createdAt });
  }
  for (const conversation of conversations.values()) conversation.messages.reverse();
  const kinds = ['Customer','Conversation','Message','Intent','Keyword','Policy','Team','Ticket'];
  const counts = {};
  for (const kind of kinds) counts[kind] = Number((await query(`MATCH (n:${kind}) RETURN count(n)`))[0]?.[0] || 0);
  return { conversations: [...conversations.values()], counts, graph: GRAPH, synthetic: true };
}

async function createConversation(customerName) {
  const name = String(customerName || 'New sample customer').trim().slice(0, 80) || 'New sample customer';
  const matchingCustomer = await query(`MATCH (u:Customer) WHERE toLower(u.name)=toLower(${cypher(name)}) RETURN u.id LIMIT 1`);
  const id = matchingCustomer[0]?.[0] || `customer-${crypto.randomUUID()}`;
  const conv = `conversation-${crypto.randomUUID()}`;
  await query(`MATCH (w:Workspace {id:'antiinterns-demo'}) MERGE (u:Customer {id:${cypher(id)}}) ON CREATE SET u.name=${cypher(name)},u.email='',u.synthetic=true MERGE (w)-[:HAS_CUSTOMER]->(u) MERGE (c:Conversation {id:${cypher(conv)}}) SET c.status='open',c.synthetic=true,c.updatedAt=timestamp() MERGE (u)-[:HAS_CONVERSATION]->(c) MERGE (c)-[:FOR_CUSTOMER]->(u)`);
  return { id: conv };
}

async function draftReply(customerMessage, policyTitle, guidance, fallbackReply, memory) {
  if (!OPENROUTER_API_KEY) return { text: fallbackReply, source: 'graph policy' };
  try {
    const history = memory.map((item) => `${item.direction === 'in' ? 'Customer' : 'Agent'}: ${item.text}`).join('\n');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'content-type': 'application/json',
        'http-referer': 'https://www.antiinterns.com/',
        'x-title': 'ANTIINTERNS Graphline',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.2,
        max_tokens: 150,
        messages: [
          { role: 'system', content: `Write a brief, helpful customer-support reply. Follow this approved policy only: ${policyTitle}. ${guidance}. Do not invent order status, prices, promises, or actions. If required information is missing, ask for it. Return only the reply text.` },
          { role: 'user', content: `${history ? `Earlier customer context:\n${history}\n\n` : ''}Current customer message: ${customerMessage}\nApproved fallback wording: ${fallbackReply}` },
        ],
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error(`OpenRouter returned HTTP ${response.status}`);
    const body = await response.json();
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text || typeof text !== 'string') throw new Error('OpenRouter returned an empty reply');
    return { text: text.slice(0, 1000), source: 'OpenRouter' };
  } catch (err) {
    console.warn(`OpenRouter reply unavailable; using graph policy wording (${err.message}).`);
    return { text: fallbackReply, source: 'graph policy fallback' };
  }
}

async function handleMessage(conversationId, rawText) {
  const text = String(rawText || '').trim().slice(0, 2000);
  if (!text) throw new Error('Write a message first.');
  const exists = await query(`MATCH (c:Conversation {id:${cypher(conversationId)}}) RETURN c.id`);
  if (!exists.length) throw new Error('Conversation not found.');
  const incomingId = crypto.randomUUID();
  const createdAt = Date.now();
  await query(`MATCH (c:Conversation {id:${cypher(conversationId)}}) MERGE (m:Message {id:${cypher(incomingId)}}) SET m.text=${cypher(text)},m.direction='in',m.createdAt=${createdAt},m.synthetic=true MERGE (c)-[:HAS_MESSAGE]->(m) SET c.updatedAt=${createdAt}`);

  const matchRows = await query(`MATCH (i:Intent)-[:MATCHES]->(k:Keyword) WHERE toLower(${cypher(text)}) CONTAINS toLower(k.term) WITH i,count(k) AS score ORDER BY score DESC LIMIT 1 RETURN i.id,i.name,i.requiresHuman,i.reply,score`);
  let intent = matchRows[0];
  if (!intent) {
    const fallback = await query(`MATCH (i:Intent {id:'human-help'}) RETURN i.id,i.name,i.requiresHuman,i.reply,0`);
    intent = fallback[0];
  }
  const [intentId, intentName, requiresHuman, replyText, score] = intent;
  const contextRows = await query(`MATCH (i:Intent {id:${cypher(intentId)}})-[:GOVERNED_BY]->(p:Policy),(i)-[:ROUTES_TO]->(t:Team) RETURN i.name,p.title,p.guidance,t.name,i.reply,i.requiresHuman`);
  const [resolvedIntent, policyTitle, guidance, teamName, graphReply, graphRequiresHuman] = contextRows[0];
  const actualReply = graphReply || replyText;
  const handoff = asBoolean(graphRequiresHuman);
  const ticketId = handoff ? `ticket-${crypto.randomUUID()}` : null;
  if (ticketId) {
    await query(`MATCH (c:Conversation {id:${cypher(conversationId)}}),(t:Team {name:${cypher(teamName)}}),(i:Intent {id:${cypher(intentId)}}) MERGE (ticket:Ticket {id:${cypher(ticketId)}}) SET ticket.status='open',ticket.reason=${cypher(intentName)},ticket.createdAt=${Date.now()},ticket.synthetic=true MERGE (c)-[:HAS_TICKET]->(ticket) MERGE (ticket)-[:ASSIGNED_TO]->(t) MERGE (ticket)-[:ABOUT_INTENT]->(i)`);
  }
  const outgoingId = crypto.randomUUID();
  await query(`MATCH (c:Conversation {id:${cypher(conversationId)}}),(i:Intent {id:${cypher(intentId)}}) MERGE (m:Message {id:${cypher(outgoingId)}}) SET m.text=${cypher(actualReply)},m.direction='out',m.createdAt=${Date.now()},m.synthetic=true MERGE (c)-[:HAS_MESSAGE]->(m) SET c.updatedAt=${Date.now()} MERGE (c)-[:LAST_INTENT]->(i)`);
  const memoryRows = await query(`MATCH (current:Conversation {id:${cypher(conversationId)}})-[:FOR_CUSTOMER]->(u:Customer)-[:HAS_CONVERSATION]->(past:Conversation)-[:HAS_MESSAGE]->(m:Message) WHERE past.id <> current.id RETURN u.name,past.id,m.text,m.direction,m.createdAt ORDER BY m.createdAt DESC LIMIT 4`);
  const memory = memoryRows.map((row) => ({ customer: row[0], conversationId: row[1], text: row[2], direction: row[3] }));
  const generated = await draftReply(text, policyTitle, guidance, actualReply, memory);
  const finalReply = generated.text;
  if (generated.source !== 'graph policy') {
    await query(`MATCH (c:Conversation {id:${cypher(conversationId)}}),(i:Intent {id:${cypher(intentId)}}) MERGE (m:Message {id:${cypher(outgoingId)}}) SET m.text=${cypher(finalReply)},m.direction='out',m.createdAt=${Date.now()},m.synthetic=true MERGE (c)-[:HAS_MESSAGE]->(m) SET c.updatedAt=${Date.now()} MERGE (c)-[:LAST_INTENT]->(i)`);
  }
  return {
    reply: finalReply,
    decision: { intent: resolvedIntent, score: Number(score), policy: policyTitle, guidance, team: teamName, handoff, ticketId, replySource: generated.source },
    path: [
      { label: 'Message', value: text },
      { label: 'Keyword match', value: `${Number(score)} linked graph term${Number(score) === 1 ? '' : 's'}` },
      { label: 'Intent', value: resolvedIntent },
      { label: 'Policy', value: policyTitle },
      { label: handoff ? 'Ticket assigned to' : 'Routed team', value: teamName },
      ...(ticketId ? [{ label: 'Ticket recorded in FalkorDB', value: ticketId }] : []),
    ],
    memory,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); return res.end(); }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      const rows = await query('RETURN 1');
      return sendJson(res, 200, { ok: Number(rows?.[0]?.[0]) === 1, database: 'FalkorDB', graph: GRAPH });
    }
    if (req.method === 'GET' && url.pathname === '/api/state') return sendJson(res, 200, await getState());
    if (req.method === 'POST' && url.pathname === '/api/conversations') {
      const body = await readBody(req); return sendJson(res, 201, await createConversation(body.customerName));
    }
    const msgMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    if (req.method === 'POST' && msgMatch) {
      const body = await readBody(req); return sendJson(res, 200, await handleMessage(decodeURIComponent(msgMatch[1]), body.text));
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'API endpoint not found' });
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(ROOT, 'public', requested);
    if (!file.startsWith(path.resolve(ROOT, 'public') + path.sep)) return sendJson(res, 403, { error: 'Forbidden' });
    fs.readFile(file, (err, data) => {
      if (err) return sendJson(res, 404, { error: 'Not found' });
      const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
      res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }); res.end(data);
    });
  } catch (err) {
    console.error(err);
    sendJson(res, err.message === 'Conversation not found.' ? 404 : 500, { error: err.message || 'Unexpected error' });
  }
});

async function boot() {
  let last;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await query('RETURN 1'); last = null; break; }
    catch (err) { last = err; await new Promise((resolve) => setTimeout(resolve, 1000)); }
  }
  if (last) throw new Error(`Cannot reach FalkorDB at ${DB_HOST}:${DB_PORT}: ${last.message}`);
  await seed();
  server.listen(PORT, '127.0.0.1', () => console.log(`Graph support agent ready at http://localhost:${PORT} (FalkorDB graph: ${GRAPH})`));
}

boot().catch((err) => { console.error(err); process.exit(1); });
