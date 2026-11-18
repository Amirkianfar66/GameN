// mothership:dev-only
// Pack-side supplements for #314's five reviewed parts at both phone sizes.
// The integrated captures are reused separately; this renders the frozen pack only.
// node design/tools/pregame-screen-pack-check.mjs --out <directory outside checkout>
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { POLICY_LISTENER, PRODUCTION_HEADERS, TYPES, recordedHeaders, sha256 } from './lib/component-check.mjs';

const repo = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const at = process.argv.indexOf('--out');
if (at < 0 || !process.argv[at + 1]) throw new Error('Use --out <directory outside checkout>.');
const output = resolve(process.argv[at + 1]);
if (output === repo || output.startsWith(repo + sep)) throw new Error('Capture outside the checkout.');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
if (git('status', '--porcelain')) throw new Error('Capture from a clean commit.');
const head = git('rev-parse', 'HEAD');
const states = {
  recover: { query: 's=recover&state=success', sheet: '14', note: 'Seat recovered, the pack fixture seat.' },
  characters: { query: 's=choose&state=open', sheet: '16', note: 'Open grid. The pack has no server-refusal fixture; the integrated toast is additional receipt feedback.' },
  'role-ready': { query: 's=role&t=30000&state=concealed', sheet: '17, 18', note: 'Existing concealed card after the interval. The pack has no Ready-pending fixture; the integrated busy button is additional request feedback.' },
  settings: { query: 's=settings&host=1', sheet: '32', note: 'Settings with the host-only row.' },
  'host-controls': { query: 's=host-controls&state=code', sheet: '15', note: 'Code hidden. The accepted 0.1.2 group wrapping and G4 absent expiry differ from this historical pack.' },
};
const server = createServer(async (request, response) => {
  const headers = Object.fromEntries(PRODUCTION_HEADERS);
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const path = normalize(join(repo, pathname));
    if (!path.startsWith(repo + sep)) { response.writeHead(403, headers).end(); return; }
    const bytes = await readFile(path);
    response.writeHead(200, { ...headers, 'Content-Type': extname(path) === '.mjs' ? 'text/javascript; charset=utf-8' : TYPES[extname(path)] ?? 'application/octet-stream' });
    response.end(bytes);
  } catch { response.writeHead(404, headers).end('Not found'); }
});
let chrome, browser;
try {
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = recordedHeaders();
  const response = await fetch(`${origin}/design/phone-ui/prototype/index.html`);
  const responseHeaders = headers.headers.map(({ key }) => ({ key, value: response.headers.get(key) }));
  if (!response.ok || JSON.stringify(responseHeaders) !== JSON.stringify(headers.headers)) throw new Error('Response headers differ from production.');
  chrome = await launchBrowser();
  browser = await connect(chrome.endpoint);
  await mkdir(output, { recursive: true });
  const captures = {};
  for (const [width, height] of [[390, 844], [430, 932]]) for (const [id, state] of Object.entries(states)) {
    const page = await openPage(browser, { width, height, scale: 1 });
    try {
      const url = `${origin}/design/phone-ui/prototype/index.html?${state.query}&safe=47%2C34`;
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(url, 'window.__phoneReady === true');
      const violations = await page.evaluate('window.__policy');
      const problems = page.problems().filter(p => !/favicon/.test(p));
      const seen = await page.evaluate(`({ screen: document.querySelector('.ph').dataset.screen, words: document.querySelector('.ph').textContent, horizontalOverflow: document.documentElement.scrollWidth > innerWidth })`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 87, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64'), file = `${width}x${height}-${id}-pack.jpg`;
      await writeFile(join(output, file), bytes);
      const ok = violations.length === 0 && problems.length === 0 && !seen.horizontalOverflow;
      captures[`${width}x${height}/${id}`] = { ...state, url, file, viewport: { width, height }, pixels: [width, height], sha256: sha256(bytes), ok, violations, problems, seen };
      console.log(`${ok ? 'ok' : 'FAIL'} ${width}x${height} ${id}`);
    } finally { await page.close(); }
  }
  if (git('rev-parse', 'HEAD') !== head || git('status', '--porcelain')) throw new Error('Checkout changed during capture.');
  await writeFile(join(output, 'pack-check.json'), `${JSON.stringify({
    tool: 'design/tools/pregame-screen-pack-check.mjs', toolSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
    createdAt: new Date().toISOString(), sourceCommit: head, sourceClean: true,
    sourceTrees: Object.fromEntries(['design/phone-ui/prototype', 'design/crew-drawing/assets', 'design/room-drawing/assets'].map(path => [path, git('rev-parse', `${head}:${path}`)])),
    browser: chrome.version, ...headers, responseHeaders, captures,
    scope: 'Frozen pack references only, desktop Chromium at 1x pixels, safe areas 47px/34px. No synthetic pending/refusal state was added to the pack. See each state note; these are not runtime screenshots or Lead acceptance.',
  }, null, 2)}\n`);
  if (Object.values(captures).some(c => !c.ok)) process.exitCode = 1;
} finally {
  browser?.close(); await chrome?.close();
  await new Promise(done => server.listening ? server.close(done) : done());
}
