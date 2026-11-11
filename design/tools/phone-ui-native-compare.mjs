// mothership:dev-only
//
// Sets the phone pack beside Frontend's native interface, part by part, for Designer's visual
// acceptance of a phone-interface pull request (the owner's decision of 11 November 2026 in
// docs/design/owner-decisions.md). Each part's state is drawn twice, at the same phone size and text
// size: in the pack's prototype, and in Frontend's review harness (apps/game/dev/phone) as built from
// the pull request. It writes, into the output folder:
//   index.html                 the pairs, stage by stage, each with Designer's last finding
//   compare.json               what was drawn, from which commits, and every problem met
//   img/<id>-pack.jpg, img/<id>-build.jpg
//   stages/NN-<stage>.jpg      one picture per stage, with --stage-sheets
//
//   node design/tools/phone-ui-native-compare.mjs --build <built harness folder> --out <folder>
//        [--only id,id] [--stage id] [--findings file.json] [--stage-sheets] [--count 9] [--list]
//
// Build the harness first, with its own Vite config, from the commit under review:
// docs/design/phone-ui-native-compare.md says how. Needs a Chromium-based browser (CHROME_PATH).
// Pictures of desktop Chromium with the harness's sample matches: not of a phone, a live match,
// VoiceOver or motion. Review output only: write it outside the repository.

import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, sleep } from './lib/chrome.mjs';
import { PARTS, STAGES, VERDICTS, buildAddress } from './lib/phone-ui-native-parts.mjs';
import { SIZES } from '../phone-ui/sheets/catalog.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const SCALE = 1.5;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const LABEL = { same: 'Same', close: 'Close', differs: 'Differs' };

export function parseArgs(argv) {
  const value = name => { const at = argv.indexOf(name); return at === -1 ? null : argv[at + 1] ?? null; };
  const options = {
    build: value('--build'), out: value('--out'), findings: value('--findings'), stage: value('--stage'),
    only: value('--only')?.split(',').map(id => id.trim()).filter(Boolean) ?? null,
    count: Number(value('--count') ?? 9), stageSheets: argv.includes('--stage-sheets'), list: argv.includes('--list'),
  };
  if (![7, 8, 9].includes(options.count)) throw new Error('--count is 7, 8 or 9');
  return options;
}

/** The parts a run draws: all of them, one stage's, or the ones named. */
export function selectParts(options, parts = PARTS) {
  const known = new Set(parts.map(p => p.id));
  for (const id of options.only ?? []) if (!known.has(id)) throw new Error(`No part ${id}. --list shows them`);
  if (options.stage && !STAGES.some(s => s.id === options.stage)) throw new Error(`No stage ${options.stage}`);
  return parts.filter(p => (!options.only || options.only.includes(p.id)) && (!options.stage || p.stage === options.stage));
}

/** The pack's prototype address for a part, with the review frames' safe areas for its phone size. */
export function designAddress(part) {
  const meta = SIZES[part.view.size];
  const q = new URLSearchParams(part.design);
  q.set('safe', meta.safe);
  if (meta.chrome) q.set('chrome', meta.chrome);
  if (part.view.text !== 1) q.set('text', String(part.view.text));
  return `/design/phone-ui/prototype/index.html?${q}`;
}

/** Designer's findings from a review: { date, parts: { id: { verdict, note } } }. */
export function readFindings(text) {
  const data = JSON.parse(text);
  if (typeof data?.date !== 'string' || typeof data?.parts !== 'object' || data.parts === null) throw new Error('Findings need a date and parts');
  for (const [id, finding] of Object.entries(data.parts)) {
    if (!VERDICTS.includes(finding?.verdict)) throw new Error(`${id}: the verdict is same, close or differs`);
    if (finding.note !== undefined && typeof finding.note !== 'string') throw new Error(`${id}: a note is text`);
  }
  return data;
}

const escape = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** 2026-11-11 as 11 November 2026; any other text as it is. */
export function dayName(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : String(date ?? '');
}

function finding(date, found, kind) {
  if (!found) return '';
  return `<p class="finding ${kind}"><span class="when">${escape(dayName(date))}:</span> <b data-v="${escape(found.verdict)}">${LABEL[found.verdict]}</b>${found.note ? ` <span class="note">${escape(found.note)}</span>` : ''}</p>`;
}

/** The review page: every part's pair, stage by stage. Plain HTML and CSS, nothing loaded from elsewhere. */
export function pageHtml(report) {
  const stages = STAGES.map(stage => ({ stage, parts: report.parts.filter(p => p.stage === stage.id) })).filter(s => s.parts.length);
  const counts = VERDICTS.map(v => `${report.parts.filter(p => (p.now ?? p.was).verdict === v).length} ${LABEL[v].toLowerCase()}`).join(' · ');
  const asFound = dayName(report.findingsDate ?? report.parts[0]?.was.date ?? '');
  const side = (label, shot) => shot.image
    ? `<figure><img src="${escape(shot.image)}" alt="${escape(label)}" width="${shot.width}" height="${shot.height}"><figcaption>${escape(label)}</figcaption></figure>`
    : `<figure class="missing"><div>${escape(shot.reason ?? 'Not drawn')}</div><figcaption>${escape(label)}</figcaption></figure>`;
  const cards = parts => parts.map(p => `
      <article class="pair" id="${escape(p.id)}">
        <h3>${escape(p.title)} <span class="sheet">sheet ${escape(p.sheet)}</span></h3>
        ${p.now ? finding(report.findingsDate, p.now, 'current') : finding(p.was.date, p.was, 'current')}
        <div class="sides">${side('The pack', p.pack)}${side('The build', p.build)}</div>
        ${p.build.error ? `<p class="failed">The build's side could not be drawn: ${escape(p.build.error)}</p>` : ''}
        ${p.now ? finding(p.was.date, p.was, 'earlier') : ''}
        <details><summary>How each side was drawn</summary>
          <p>The pack: <code>${escape(p.pack.address)}</code></p>
          <p>The build: <code>${escape(p.build.address ?? 'no harness state')}</code>${p.build.steps?.length ? `, then <code>${escape(JSON.stringify(p.build.steps))}</code>` : ''}</p>
          ${[...p.pack.problems, ...(p.build.problems ?? [])].map(text => `<p class="failed">${escape(text)}</p>`).join('')}
        </details>
      </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pack and build</title>
<style>
  :root { --bg: #0b0e14; --panel: #121722; --ink: #f4ebdd; --muted: #a9b1be; --amber: #f1b84b; --same: #7ed3a2; --close: #93b7e6; --differs: #ff9576; --line: #263042; }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  header, main { max-width: 1340px; margin: 0 auto; padding: 16px; }
  h1 { margin: 8px 0 4px; font-size: 22px; }
  header p { margin: 4px 0; color: var(--muted); }
  h2 { color: var(--amber); font-size: 18px; margin: 28px 0 12px; }
  .pairs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); gap: 22px; }
  .pair { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px; min-width: 0; }
  h3 { margin: 0 0 6px; font-size: 16px; }
  .sheet { color: var(--muted); font-weight: 400; font-size: 13px; }
  .sides { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  figure { margin: 0; min-width: 0; }
  img { display: block; width: 100%; height: auto; border-radius: 6px; background: #000; }
  figcaption { color: var(--muted); font-size: 12px; margin-top: 4px; }
  .missing div { aspect-ratio: 390 / 844; display: grid; place-items: center; padding: 12px; text-align: center; color: var(--muted); border: 1px dashed var(--line); border-radius: 6px; font-size: 13px; }
  .finding { margin: 8px 0 0; font-size: 13px; color: var(--muted); }
  .finding b { margin-right: 4px; }
  .when { color: var(--muted); }
  [data-v=same] { color: var(--same); } [data-v=close] { color: var(--close); } [data-v=differs] { color: var(--differs); }
  details { margin-top: 8px; font-size: 12px; color: var(--muted); }
  code { word-break: break-all; color: var(--ink); }
  .failed { color: var(--differs); }
  body.sheet-mode details, body.sheet-mode .earlier, body.sheet-mode .note { display: none; }
  section.stage { display: flow-root; }
  body.sheet-mode section.stage { padding: 4px 16px 16px; }
  body.sheet-mode .pairs { grid-template-columns: repeat(3, 1fr); }
</style>
</head>
<body>
<header>
  <h1>The pack beside the build</h1>
  <p>${report.parts.length} parts · ${escape(counts)}, as Designer found them on ${escape(asFound)}</p>
  <p>The pack: <code>${escape(report.pack.commit)}</code>${report.pack.dirty ? ' with uncommitted changes' : ''}. The build: <code>${escape(report.build.head ?? 'unknown commit')}</code>${report.build.dirty ? ' with uncommitted changes' : ''}. ${escape(report.view)}.</p>
  <p>Desktop Chromium with sample matches on both sides: not a phone, a live match, VoiceOver or motion.</p>
</header>
<main>${stages.map(({ stage, parts }) => `
  <section class="stage" data-stage="${escape(stage.id)}">
    <h2>${escape(stage.title)}</h2>
    <div class="pairs">${cards(parts)}
    </div>
  </section>`).join('')}
</main>
<script>if (new URLSearchParams(location.search).has('sheet')) document.body.classList.add('sheet-mode');</script>
</body>
</html>
`;
}

function git(args) {
  try { return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8' }).trim(); } catch { return null; }
}

function serveFolder(folder) {
  const root = resolve(folder);
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw new Error('not found');
      response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done({ origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(end => server.close(end)) })));
}

/** One tab that is a device of its own (own storage), with touch input, sized like the phone. */
async function openTab(browser, { width, height, scale }) {
  const { browserContextId } = await browser.send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const own = method => browser.events.filter(event => event.sessionId === sessionId && event.method === method);
  async function evaluate(expression) {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(`Page script failed: ${exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text}`);
    return result.value;
  }
  async function waitFor(expression, label, timeoutMs = 30_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(`Boolean(${expression})`).catch(() => false)) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${label}`);
  }
  return {
    send, evaluate, waitFor,
    async goto(url, ready) {
      await send('Page.navigate', { url });
      await waitFor(ready, `the page at ${url}`);
    },
    async tapAt(point) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },
    problems() {
      const scripts = own('Runtime.exceptionThrown').map(event => event.params.exceptionDetails?.exception?.description?.split('\n')[0] ?? event.params.exceptionDetails?.text ?? 'page error');
      const urls = new Map(own('Network.requestWillBeSent').map(event => [event.params.requestId, event.params.request.url]));
      const failed = own('Network.loadingFailed').filter(event => !event.params.canceled).map(event => `request failed (${event.params.errorText}): ${urls.get(event.params.requestId) ?? 'unknown'}`);
      const refused = own('Network.responseReceived').filter(event => event.params.response.status >= 400).map(event => `HTTP ${event.params.response.status}: ${event.params.response.url}`);
      return [...scripts, ...failed, ...refused].filter(text => !/favicon/.test(text));
    },
    async capture(file) {
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { x: 0, y: 0, width, height, scale: 1 } });
      writeFileSync(file, Buffer.from(data, 'base64'));
      return { width: Math.round(width * scale), height: Math.round(height * scale) };
    },
    async close() {
      await browser.send('Target.closeTarget', { targetId }).catch(() => {});
      await browser.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
    },
  };
}

// Runs in the page: the first visible control that matches, scrolled to the middle, and where to tap it.
function locate({ css, pattern, scope, exclude }) {
  const shown = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const name = el => `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`.replace(/\s+/g, ' ').trim();
  const roots = scope ? [...document.querySelectorAll(scope)] : [document];
  const pool = roots.flatMap(root => [...root.querySelectorAll(css ?? 'button, [role=button], a')]);
  const re = pattern ? new RegExp(pattern, 'i') : null;
  const skip = exclude ? new RegExp(exclude, 'i') : null;
  const hit = pool.find(el => shown(el) && (!re || (re.test(name(el)) && !el.disabled)) && (!skip || !skip.test(el.id ?? '')));
  if (!hit) {
    const controls = [...document.querySelectorAll('button, [role=button], a, input, select, summary')].filter(shown).map(el => `${el.id ? `#${el.id}` : el.tagName.toLowerCase()} ${name(el).slice(0, 40)}`);
    return { found: false, controls };
  }
  hit.scrollIntoView({ block: 'center', inline: 'center' });
  const box = hit.getBoundingClientRect();
  return { found: true, x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2), name: name(hit).slice(0, 60) };
}

function clearField(css) {
  const field = [...document.querySelectorAll(css)].find(el => el.getClientRects().length > 0);
  if (!field) return false;
  field.focus();
  field.value = '';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

const KEYS = { Tab: { code: 'Tab', keyCode: 9 }, Enter: { code: 'Enter', keyCode: 13, text: '\r' }, Escape: { code: 'Escape', keyCode: 27 } };

async function runStep(tab, [op, a, b], log) {
  if (op === 'wait') return sleep(a);
  if (op === 'eval') return void log.push(await tab.evaluate(`Promise.resolve(${a}).then(v => (typeof v === 'object' && v !== null) || typeof v === 'function' ? typeof v : v ?? null)`));
  if (op === 'key') {
    const key = KEYS[a];
    if (!key) throw new Error(`No key ${a}`);
    const base = { key: a, code: key.code, windowsVirtualKeyCode: key.keyCode };
    await tab.send('Input.dispatchKeyEvent', { type: key.text ? 'keyDown' : 'rawKeyDown', ...base, ...(key.text ? { text: key.text } : {}) });
    return tab.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
  if (op === 'fill') {
    if (!(await tab.evaluate(`(${clearField})(${JSON.stringify(a)})`))) throw new Error(`No field ${a}`);
    return tab.send('Input.insertText', { text: b });
  }
  const query = op === 'tap' ? { css: a } : { pattern: a, scope: b?.scope ?? null, exclude: b?.exclude ?? null };
  const found = await tab.evaluate(`(${locate})(${JSON.stringify(query)})`);
  if (!found.found) throw Object.assign(new Error(`Nothing visible matches ${op === 'tap' ? a : `/${a}/`}`), { controls: found.controls });
  log.push(`${op}: ${found.name}`);
  if (op === 'reveal') return sleep(150);
  await sleep(120);
  return tab.tapAt({ x: found.x, y: found.y });
}

async function drawPack(browser, part, origin, folder) {
  const [width, height] = part.view.size.split('x').map(Number);
  const tab = await openTab(browser, { width, height, scale: SCALE });
  const address = designAddress(part);
  try {
    await tab.goto(origin + address, 'window.__phoneReady === true');
    await tab.evaluate('document.fonts.ready.then(() => new Promise(done => setTimeout(done, 450)))');
    const size = await tab.capture(join(folder, 'img', `${part.id}-pack.jpg`));
    return { address, image: `img/${part.id}-pack.jpg`, ...size, problems: tab.problems() };
  } catch (error) {
    return { address, image: null, reason: 'The pack could not be drawn', problems: [String(error.message), ...tab.problems()] };
  } finally {
    await tab.close();
  }
}

async function drawBuild(browser, part, origin, folder, count) {
  if (part.build === null) return { address: null, image: null, reason: 'The harness has no such state. Attach a capture from the build to the pull request.', problems: [] };
  const [width, height] = part.view.size.split('x').map(Number);
  const tab = await openTab(browser, { width, height, scale: SCALE });
  const address = buildAddress(part.build, count);
  const log = [];
  const file = join(folder, 'img', `${part.id}-build.jpg`);
  try {
    await tab.goto(origin + address, 'window.planetHarness');
    if (part.build.settle === undefined) await tab.evaluate('Promise.resolve(window.planetHarness.candidateReady).then(() => true)');
    if (part.view.text !== 1) {
      await tab.evaluate(`document.documentElement.style.fontSize = '${part.view.text * 100}%'; document.dispatchEvent(new CustomEvent('mothership:preferences-change')); true`);
    }
    await sleep(part.build.settle ?? 1800);
    for (const step of part.build.steps ?? []) await runStep(tab, step, log);
    const size = await tab.capture(file);
    return { address, steps: part.build.steps ?? [], image: `img/${part.id}-build.jpg`, ...size, log, problems: tab.problems() };
  } catch (error) {
    const size = await tab.capture(file).catch(() => null);
    return { address, steps: part.build.steps ?? [], image: size ? `img/${part.id}-build.jpg` : null, ...(size ?? {}), reason: 'Not drawn', error: error.message, controls: error.controls ?? [], log, problems: tab.problems() };
  } finally {
    await tab.close();
  }
}

/** One JPEG per stage, from the page itself, for a pull request or the evidence folder. */
async function stageSheets(browser, folder, stages) {
  const tab = await openTab(browser, { width: 1340, height: 900, scale: 1 });
  try {
    await tab.goto(`${pathToFileURL(join(folder, 'index.html')).href}?sheet=1`, "document.readyState === 'complete'");
    await tab.evaluate('Promise.all([...document.images].map(img => img.decode().catch(() => {})))');
    mkdirSync(join(folder, 'stages'), { recursive: true });
    const made = [];
    for (const [index, stage] of stages.entries()) {
      const box = await tab.evaluate(`(() => { const b = document.querySelector('[data-stage="${stage.id}"]').getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; })()`);
      const { data } = await tab.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, captureBeyondViewport: true, clip: { ...box, scale: 1 } });
      const name = `stages/${String(index + 1).padStart(2, '0')}-${stage.id}.jpg`;
      writeFileSync(join(folder, name), Buffer.from(data, 'base64'));
      made.push(name);
    }
    return made;
  } finally {
    await tab.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const parts = selectParts(options);
  if (options.list) {
    for (const p of parts) console.log(`${p.id.padEnd(18)} ${p.stage.padEnd(8)} sheet ${p.sheet.padEnd(7)} ${p.was.verdict.padEnd(8)} ${p.title}`);
    return;
  }
  if (!options.build || !options.out) throw new Error('Give --build <built harness folder> and --out <folder>. --list shows the parts');
  const buildFolder = resolve(options.build);
  if (!existsSync(join(buildFolder, 'index.html'))) throw new Error(`No built harness in ${buildFolder}: build apps/game/dev/phone first`);
  const out = resolve(options.out);
  if (out === REPO || out.startsWith(REPO + sep)) console.warn('Writing review output inside the repository: commit only what a review needs.');
  mkdirSync(join(out, 'img'), { recursive: true });
  const findings = options.findings ? readFindings(readFileSync(options.findings, 'utf8')) : null;
  const provenancePath = join(buildFolder, 'review-provenance.json');
  const provenance = existsSync(provenancePath) ? JSON.parse(readFileSync(provenancePath, 'utf8')) : null;
  const status = git(['status', '--porcelain', '--', 'design/phone-ui']);
  const { startServer } = await import('./phone-ui-render.mjs');
  const designServer = await startServer();
  const buildServer = await serveFolder(buildFolder);
  const chrome = await launchBrowser();
  const browser = await connect(chrome.endpoint);
  const report = {
    tool: 'design/tools/phone-ui-native-compare.mjs',
    createdAt: new Date().toISOString(),
    browser: chrome.version,
    view: `Drawn at each part's phone size, ${SCALE}× pixels`,
    pack: { commit: git(['rev-parse', 'HEAD']) ?? 'unknown', dirty: Boolean(status) },
    build: { folder: buildFolder, head: provenance?.candidate?.head ?? null, dirty: provenance?.candidate?.dirty ?? null, artwork: provenance?.artwork?.head ?? null },
    findingsDate: findings?.date ?? null,
    count: options.count,
    parts: [],
  };
  try {
    for (const part of parts) {
      const pack = await drawPack(browser, part, designServer.origin, out);
      const build = await drawBuild(browser, part, buildServer.origin, out, options.count);
      const now = findings?.parts?.[part.id] ?? null;
      report.parts.push({ id: part.id, stage: part.stage, title: part.title, sheet: part.sheet, view: part.view, pack, build, was: part.was, now });
      console.log(`${build.error ? 'FAIL' : 'ok  '} ${part.id}${build.error ? `: ${build.error}` : ''}`);
    }
    writeFileSync(join(out, 'index.html'), pageHtml(report));
    if (options.stageSheets) report.stageSheets = await stageSheets(browser, out, STAGES.filter(s => report.parts.some(p => p.stage === s.id)));
    writeFileSync(join(out, 'compare.json'), `${JSON.stringify(report, null, 2)}\n`);
  } finally {
    browser.close();
    await chrome.close();
    await designServer.close();
    await buildServer.close();
  }
  const failed = report.parts.filter(p => p.build.error || !p.pack.image);
  console.log(`${report.parts.length} parts drawn into ${out}${failed.length ? `; ${failed.length} could not be drawn` : ''}`);
  if (failed.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
