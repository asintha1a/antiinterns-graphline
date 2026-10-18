// Records continuous browser footage of the real app and live, read-only graph evidence.
// Install playwright, or set PLAYWRIGHT_MODULE to an existing installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {spawn, execFileSync} = require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const VIDEO=path.join(ROOT,'videos/graphline-full-demo');
const GRAPH='antiinterns_recording_demo';
const PORT=4174;
const evidencePort=4175;
const timing=JSON.parse(fs.readFileSync(path.join(VIDEO,'timing.json')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const querySets={
  routing:{title:'Intent, policy and team',query:'MATCH (i:Intent)-[:GOVERNED_BY]->(p:Policy), (i)-[:ROUTES_TO]->(t:Team) RETURN i.name AS intent,p.title AS policy,t.name AS team,i.requiresHuman AS human ORDER BY i.name'},
  tickets:{title:'Tickets created in this recording',query:'MATCH (c:Conversation)-[:HAS_TICKET]->(ticket:Ticket)-[:ASSIGNED_TO]->(t:Team) RETURN ticket.id AS ticketId,c.id AS conversation,t.name AS assignedTeam,ticket.status AS status ORDER BY ticket.createdAt'},
  memory:{title:'Customer memory across conversations',query:"MATCH (u:Customer {name:'Maya Sample'})-[:HAS_CONVERSATION]->(c:Conversation)-[:HAS_MESSAGE]->(m:Message) RETURN u.name AS customer,c.id AS conversation,m.direction AS direction,m.text AS message ORDER BY m.createdAt"},
  summary:{title:'Live graph entity counts',query:'MATCH (n) RETURN labels(n)[0] AS nodeType,count(n) AS records ORDER BY nodeType'},
  relations:{title:'Actual graph relationships',query:'MATCH ()-[r]->() RETURN type(r) AS relationship,count(r) AS records ORDER BY relationship'}
};
function db(q){return JSON.parse(execFileSync('docker',['exec','antiinterns-graph-hacks-db','redis-cli','--json','GRAPH.QUERY',GRAPH,q],{encoding:'utf8'}));}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const presenter=`<!doctype html><html><head><meta charset="utf-8"><title>Graphline | Live query evidence</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#162137;font:20px -apple-system,BlinkMacSystemFont,sans-serif}header{background:#162137;color:white;padding:27px 40px;display:flex;justify-content:space-between;align-items:center}header b{font-size:24px}header span{font-size:14px;color:#b5c6e8}.layout{padding:30px 42px}.eyebrow{font-size:12px;letter-spacing:2px;color:#486287;font-weight:700;margin:0 0 12px}h1{font-size:32px;margin:0 0 22px;letter-spacing:-.8px}.tabs{display:flex;gap:8px;margin:0 0 24px}button{padding:12px 18px;background:white;border:1px solid #dce2ed;border-radius:8px;font:600 15px sans-serif;color:#24344f;cursor:pointer}button.active{background:#1f63ef;color:white;border-color:#1f63ef}.surface{padding:24px;background:white;border:1px solid #dce2ed;border-radius:12px}pre{margin:0 0 20px;padding:22px;background:#162137;color:#edf4ff;border-radius:8px;font:18px/1.6 Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:17px}th{text-align:left;color:#486287;font-size:13px;text-transform:uppercase;letter-spacing:.7px;background:#eef3fb}td,th{padding:13px 14px;border-bottom:1px solid #e6ebf3}td{line-height:1.5;vertical-align:top}td:first-child{font-weight:600}.status{font-size:13px;color:#49627d;margin-top:15px}.source{font-size:17px;line-height:1.7}.source p{margin:0 0 14px}.scope-grid{display:grid;grid-template-columns:1fr 1fr;gap:25px}.scope-grid h3{font-size:20px;margin:0 0 14px}.pill{display:inline-block;background:#e9f2ff;color:#2258be;border-radius:7px;padding:5px 10px;font-size:13px}.link{color:#1f63ef;font-size:22px;font-weight:600}.repo{margin-top:22px;padding-top:18px;border-top:1px solid #e6ebf3;font-size:16px}#result{max-height:470px;overflow:auto}.source-code{max-height:390px;overflow:auto;font-size:17px}footer{position:fixed;bottom:0;left:0;right:0;padding:18px 42px;background:#eaf0f9;color:#526681;font-size:13px}
</style></head><body><header><b>GRAPHLINE / QUERY EVIDENCE</b><span>Presenter view · read-only Cypher · real local database</span></header><main class="layout"><p class="eyebrow">SYNTHETIC DEMONSTRATION GRAPH</p><h1 id="heading">Inspect the graph behind the agent</h1><nav class="tabs">${Object.entries(querySets).map(([k,v])=>`<button data-key="${k}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}<button data-key="scope">AI + scope</button><button data-key="setup">Run locally</button></nav><section class="surface"><pre id="query">Choose a query to inspect its actual result.</pre><div id="result"></div><div class="status" id="status">No query executed.</div></section></main><footer>Recording aid, not an additional product module. All results below come from the running prototype or its source files.</footer><script>
const $=s=>document.querySelector(s);let current='';const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function run(key){current=key;document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.key===key));$('#status').textContent='Reading source...';let d=await fetch('/evidence/'+key).then(r=>r.json());$('#heading').textContent=d.title;$('#query').textContent=d.query||d.command||'';$('#result').scrollTop=0;if(d.html){$('#result').innerHTML=d.html;}else{const headers=d.result[0],rows=d.result[1]||[];$('#result').innerHTML='<table><thead><tr>'+headers.map(h=>'<th>'+esc(Array.isArray(h)?h[h.length-1]:h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}$('#status').textContent=d.status||('Source: FalkorDB GRAPH.QUERY | '+d.result[1].length+' rows | '+d.result[2].join(' | '));}
document.querySelectorAll('button').forEach(b=>b.onclick=()=>run(b.dataset.key));window.runEvidence=run;
</script></body></html>`;
const evidence=http.createServer((req,res)=>{
 if(req.url.startsWith('/evidence/')){let key=req.url.split('/').pop();let value;
 if(querySets[key])value={...querySets[key],result:db(querySets[key].query)};
 else if(key==='scope'){
 const src=fs.readFileSync(path.join(ROOT,'server.js'),'utf8');const at=src.indexOf('async function draft');const match=src.match(/async function[^\n]*[Rr]eply[^\n]*/);
 const excerpt=src.slice(src.indexOf('async function draft')>=0?src.indexOf('async function draft'):src.indexOf('async function openRouter'),src.indexOf('async function draft')>=0?src.indexOf('async function draft')+2200:src.indexOf('async function openRouter')+2200);
 value={title:'Optional AI drafting and current scope',command:'Source: README.md + server.js',html:'<div class="source scope-grid"><div><h3>Working in this recording</h3><p>Graph keyword matching, policy retrieval, routing, ticket creation and persistent customer history.</p><p><span class="pill">Reply source: graph policy</span></p><p>OpenRouter drafting is optional. It is not exercised in this recording.</p></div><div><h3>Integration boundary</h3><p>This standalone prototype does not connect to WhatsApp or send external messages.</p><p>Authentication, a real channel adapter, delivery retries and production controls are future work.</p><p>Codex assisted implementation and documentation.</p></div></div>',status:'Source: documented scope in this repository. No unverified API response is shown.'};
 }else if(key==='setup')value={title:'Run the submitted project locally',command:'docker compose up -d\nnpm start\n\n# Then open http://localhost:4173',html:'<div class="source"><p>Requirements: Docker with Compose and Node.js 20 or newer.</p><p>The server waits for FalkorDB and seeds the synthetic workspace. No model key is needed for the graph-policy path.</p><p>The README includes the graph model, Cypher queries, data scope and AI coding disclosure.</p><div class="repo">Public repository<p class="link">github.com/asintha1a/antiinterns-graphline</p></div></div>',status:'Commands and requirements are from the actual repository README.'};
 else {res.writeHead(404);return res.end();}
 res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify(value));}
 res.writeHead(200,{'content-type':'text/html'});res.end(presenter);
});
async function main(){
 fs.mkdirSync(path.join(VIDEO,'assets/raw'),{recursive:true});
 try {db('MATCH (n) DETACH DELETE n')}catch{}
 const app=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,OPENROUTER_API_KEY:'',PORT:String(PORT),FALKORDB_GRAPH:GRAPH},stdio:'ignore'});
 evidence.listen(evidencePort,'127.0.0.1');let browser,context;
 try{
 for(let i=0;i<50;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok)break}catch{}await wait(200)}
 for(const spec of Object.values(querySets)) db(spec.query);
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--disable-extensions']});
 context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1,recordVideo:{dir:path.join(VIDEO,'assets/raw'),size:{width:1600,height:900}}});
 await context.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent='#recording-pointer{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:23px;height:29px;filter:drop-shadow(0 2px 3px #001a);transform:translate(-50px,-50px)}#recording-pointer svg{width:100%;height:100%}';document.head.append(st);const c=document.createElement('div');c.id='recording-pointer';c.innerHTML='<svg viewBox="0 0 24 30"><path d="M2 1L21 17L12 18L8 27L2 1Z" fill="#fff" stroke="#162137" stroke-width="2"/></svg>';document.body.append(c);document.addEventListener('mousemove',e=>{c.style.transform=`translate(${e.clientX}px,${e.clientY}px)`});document.addEventListener('mousedown',e=>{const r=document.createElement('div');r.style.cssText=`position:fixed;left:${e.clientX-20}px;top:${e.clientY-20}px;width:40px;height:40px;border:3px solid #1f63ef;border-radius:50%;z-index:2147483646;pointer-events:none`;document.body.append(r);r.animate([{transform:'scale(.3)',opacity:1},{transform:'scale(1.6)',opacity:0}],{duration:650}).onfinish=()=>r.remove()});});});
 const page=await context.newPage();const video=page.video();const created=Date.now();await page.goto(`http://127.0.0.1:${PORT}`);await page.waitForSelector('.conversation-item');await wait(800);
 page.on('dialog',d=>d.accept('Maya Sample'));
 const start=Date.now();const log=[];
 async function moveTo(sel){let b=await page.locator(sel).first().boundingBox();if(!b)throw Error('No box: '+sel);await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:35});await wait(220);return b;}
 async function click(sel){await moveTo(sel);await page.locator(sel).first().click();}
 async function send(text){await click('#messageInput');await page.locator('#messageInput').pressSequentially(text,{delay:37});await wait(300);await click('#sendButton');await page.waitForFunction(()=>!document.querySelector('#sendButton').disabled);await wait(500);}
 async function hover(sel){const b=await moveTo(sel);log.push({at:(Date.now()-start)/1000,focus:sel,rect:b});}
 async function ev(key){await click(`[data-key="${key}"]`);await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Reading source...');}
 for(const chapter of timing){const remain=chapter.start*1000-(Date.now()-start);if(remain>0)await wait(remain);log.push({at:(Date.now()-start)/1000,chapter:chapter.id});console.log('Recording',chapter.id);
 if(chapter.id==='intro'){await hover('.intro h1');await wait(3000);await hover('#dbStatus');}
 if(chapter.id==='inbox'){await click('#search');await page.locator('#search').pressSequentially('Maya',{delay:180});await wait(1500);await click('.conversation-item');await wait(1500);await page.locator('#search').fill('');await hover('.context-panel');}
 if(chapter.id==='delivery'){await send('My delivery is late and tracking has not changed');await wait(1500);await hover('#graphPath');await wait(1500);await hover('#decisionCard');}
 if(chapter.id==='refund'){await send('I returned my item and need a refund');await wait(1300);await hover('.ticket-badge');await wait(1700);await hover('#counts');}
 if(chapter.id==='human'){await page.locator('.conversation-item').filter({hasText:'Ari Sample'}).click();await send('Please connect me with a human agent');await wait(1000);await hover('.ticket-badge');await send('Can you explain this invoice?');await hover('#decisionCard');}
 if(chapter.id==='memory'){await click('#newConversation');await page.waitForFunction(()=>document.querySelectorAll('.conversation-item').length===4);await wait(1000);await send('My delivery is delayed again');await wait(1700);await hover('#memory');}
 if(chapter.id==='persistence'){await hover('#refresh');await page.reload();await page.waitForSelector('.conversation-item');await wait(1000);await hover('#counts');await page.locator('.conversation-item').filter({hasText:'Maya Sample'}).first().click();await hover('#messages');}
 if(chapter.id==='queries'){await page.goto(`http://127.0.0.1:${evidencePort}`);await ev('routing');await wait(4500);await hover('#result');await ev('tickets');await wait(1800);await hover('#result');}
 if(chapter.id==='graphmemory'){await ev('memory');await wait(2200);await hover('#result');await page.locator('#result').evaluate(el=>el.scrollTo({top:el.scrollHeight,behavior:'smooth'}));await wait(1800);await ev('summary');await wait(2300);await ev('relations');}
 if(chapter.id==='scope'){await ev('scope');await wait(3000);await hover('.scope-grid');}
 if(chapter.id==='setup'){await ev('setup');await wait(3000);await hover('#query');await wait(2500);await hover('.link');}
 const target=(chapter.start+chapter.duration)*1000-(Date.now()-start);if(target<0)console.warn('Chapter overran:',chapter.id,-target);else await wait(target);
 }
 const stop=Date.now();fs.writeFileSync(path.join(VIDEO,'capture-events.json'),JSON.stringify({offset:(start-created)/1000,duration:(stop-start)/1000,events:log},null,2));
 await context.close();context=null;const recorded=await video.path();fs.copyFileSync(recorded,path.join(VIDEO,'assets/capture.webm'));console.log('Saved continuous capture',recorded);
 }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close();app.kill('SIGTERM');evidence.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
