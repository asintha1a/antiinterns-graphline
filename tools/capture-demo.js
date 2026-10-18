const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9334;
const output = path.join(__dirname, '..', 'screenshots');
const profile = '/tmp/antiinterns-graphline-recording-profile';
fs.mkdirSync(output, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-extensions',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--window-size=1440,1100', 'about:blank',
], { stdio: 'ignore' });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function untilReady() {
  for (let i = 0; i < 40; i++) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      if (pages.find((p) => p.type === 'page')) return pages.find((p) => p.type === 'page');
    } catch {}
    await wait(250);
  }
  throw new Error('Headless Chrome did not open its debugging port.');
}

async function main() {
  try {
    const page = await untilReady();
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let nextId = 1;
    let promptName = 'Maya Sample';
    const pending = new Map();
    ws.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Page.javascriptDialogOpening') {
        send('Page.handleJavaScriptDialog', { accept: true, promptText: promptName }).catch(() => {});
      }
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id); pending.delete(message.id);
        if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
      }
    });
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    function send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
    }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Page evaluation failed');
      return result.result?.value;
    }
    async function screenshot(filename) {
      await wait(900);
      const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(output, filename), Buffer.from(image.data, 'base64'));
    }
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate', { url: 'http://127.0.0.1:4173' });
    await wait(1800);
    await screenshot('01-inbox.png');
    await evaluate("[...document.querySelectorAll('.conversation-item')].find(el=>el.innerText.includes('Maya Sample'))?.click()");
    await evaluate("document.querySelector('#messageInput').value='My delivery is late and tracking has not changed'; document.querySelector('#composer').requestSubmit()");
    await wait(1400); await screenshot('02-graph-routed-delivery.png');
    await evaluate("document.querySelector('#messageInput').value='I returned my item and need a refund'; document.querySelector('#composer').requestSubmit()");
    await wait(1400); await screenshot('03-human-ticket-created.png');
    promptName = await evaluate("document.querySelector('.chat-person b')?.innerText || 'Sample Customer'");
    await evaluate("document.querySelector('#newConversation').click()");
    await wait(1400);
    await evaluate("document.querySelector('#messageInput').value='I have another question'; document.querySelector('#composer').requestSubmit()");
    await wait(1400); await screenshot('04-cross-conversation-memory.png');
    ws.close();
    console.log(`Captured real local app states to ${output}`);
  } finally {
    chrome.kill('SIGTERM');
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
