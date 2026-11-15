// mothership:dev-only
//
// The role stage's check (design/phone-ui/components/role-stage). It bundles the component's preview the
// way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted
// game's production response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and captures every state of sheets 17 and
// 18 at the two development phone sizes, 390 × 844 and 430 × 932, and the card alone as sheet 31's Card
// sheet holds it, in desktop Chromium at 2× pixels. The film's view shows the approved role film's own
// still (Motion & Cinematics', dev-only in the preview), where the game mounts the film's player.
// A capture passes with no policy violation, no failed or refused request and no page error, with the
// stage and the card drawn as the state asks, and the card's pictures loaded where it is face up.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: focus, refused taps, privacy, the clock, the film's element, layout, dispose, motion;
//   the agreement (preview/agree.mjs): the stage beside the frozen pack's role screen, the same words,
//   states and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/role-stage/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its
// SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/role-stage-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { createHostedPreviewCsp } from '../../scripts/hosted-preview-policy.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/role-stage');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], card: [358, 440] };
/** Each stage state at the two development sizes (preview.mjs STAGE_STATES); sheet 31's card alone (CARD_STATES). */
const STATES = { t01: 2, t12: 2, t20: 2, t26: 2, t30: 2, concealed: 2, reduced: 2, missing: 2, late: 2, waiting: 2, skipped: 2, stale: 2, 'card-sheet': ['card'], 'card-sheet-down': ['card'] };

/** The hosted game's response headers, as scripts/prepare-hosted-preview.mjs writes them for staging. */
export const PRODUCTION_HEADERS = Object.freeze([
  ['Cache-Control', 'no-store'],
  ['Content-Security-Policy', createHostedPreviewCsp('gamen-mothership-staging')],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Robots-Tag', 'noindex, nofollow'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
]);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/**
 * One report is known and not the component's: zod's eval feature probe (node_modules/zod/v4/core/util.js
 * allowsEval: `try { return Function(""), true } catch { return false }`), which zod catches before
 * falling back to its ordinary parser. The game's own bundle has the same probe (in its crew-runtime
 * chunk, through @mothership/contracts), so the live game reports it too. A report is that one only when
 * the bundled code at the reported place is the probe; every other report fails the capture.
 */
async function classify(out, violation) {
  if (violation.directive !== 'script-src' || violation.blocked !== 'eval' || !violation.source) return 'unexpected';
  const code = (await readFile(join(out, violation.source), 'utf8').catch(() => '')).split('\n')[violation.line - 1] ?? '';
  const near = code.slice(Math.max(0, violation.column - 160), violation.column + 60);
  return /Cloudflare[\s\S]*try\{return Function\(``\),!0\}catch\{return!1\}/.test(near) ? 'known: zod eval probe, caught; the live game bundle has it too' : 'unexpected';
}

async function bundle() {
  const out = await mkdtemp(join(tmpdir(), 'role-stage-check-'));
  await build({
    root: join(COMPONENT, 'preview'), base: './', logLevel: 'warn', configFile: false, publicDir: false,
    // Bundled, the game's package imports resolve from node_modules: the preview's import map is for
    // the unbundled page only, and an inline script would be refused by the production policy anyway.
    plugins: [{ name: 'role-stage-check-no-import-map', transformIndexHtml: html => html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '') }],
    build: { outDir: out, emptyOutDir: true, target: 'es2022', assetsInlineLimit: 0, sourcemap: false, cssMinify: false },
  });
  // The preview and the agreement find the card's pictures (and the pack's own) from their own place at
  // run time (design/crew-drawing/assets/), which no bundle carries; they are copied to where they look
  // from the bundle, as the pack's own pages serve them. In the game, the art bundles' CSS properties
  // carry them.
  for (const folder of ['cards', 'roles', 'portraits']) {
    await cp(join(REPO, `design/crew-drawing/assets/${folder}`), join(out, `crew-drawing/assets/${folder}`), { recursive: true });
  }
  return out;
}

function serve(root) {
  const server = createServer(async (request, response) => {
    const path = normalize(join(root, decodeURIComponent(new URL(request.url, 'http://check').pathname)));
    if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403).end(); return; }
    try {
      const body = await readFile(path.endsWith(sep) ? join(path, 'index.html') : path);
      response.writeHead(200, Object.fromEntries([['Content-Type', TYPES[extname(path)] ?? 'application/octet-stream'], ...PRODUCTION_HEADERS]));
      response.end(body);
    } catch {
      response.writeHead(404, Object.fromEntries(PRODUCTION_HEADERS)).end('Not found');
    }
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

// The source the captures show, read before anything is written: the components' files and the room
// pictures, without the review folder this check writes.
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim();
const sourceClean = execFileSync('git', ['status', '--porcelain', '--', 'design/phone-ui/components', ':!design/phone-ui/components/role-stage/review', 'design/crew-drawing/assets', 'design/pregame-films'],
  { cwd: REPO, encoding: 'utf8' }).trim() === '';
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
const POLICY_LISTENER = 'window.__policy = []; document.addEventListener("securitypolicyviolation", e => window.__policy.push({ directive: e.violatedDirective, blocked: String(e.blockedURI), source: String(e.sourceFile).replace(location.origin + "/", ""), line: e.lineNumber, column: e.columnNumber }));';
/** What a state must show, from the stage's own DOM. */
const cardUp = s => s.name === 'Doctor' && s.team === 'Blue team' && s.facts === 2;
const EXPECT = {
  t01: s => s.view === 'card' && cardUp(s) && s.note === 'Your film starts in 0:19' && s.timer === '0:29' && s.readyOff && s.strip === '1',
  t12: s => s.view === 'card' && cardUp(s) && s.note === 'Your film starts in 0:08' && s.timer === '0:18' && s.readyOff,
  t20: s => s.view === 'film' && s.chip === '0:10' && s.film > 0 && s.skip,
  t26: s => s.view === 'film' && s.chip === '0:04' && s.film > 0 && s.skip,
  t30: s => s.view === 'after' && cardUp(s) && s.note === 'Hide your phone, then tap Ready' && !s.readyOff && s.timer === null && s.strip === null,
  concealed: s => s.view === 'card' && s.back === 'Role hidden' && s.name === null && s.timer === '0:21' && s.note === 'Your film starts in 0:11',
  reduced: s => s.view === 'film' && s.chip === '0:07' && s.film > 0 && s.motion === 'reduced',
  missing: s => s.view === 'card' && s.missing && s.name === 'Doctor' && s.note === 'Film unavailable · your card stays up until Ready',
  late: s => s.view === 'film' && s.chip === '0:05' && s.toast === 'Rejoined · the stage carried on' && s.toastOnTop,
  waiting: s => s.view === 'after' && cardUp(s) && s.stamp === 'Ready' && s.note === '6 of 9 ready' && s.readyMode === 'done',
  skipped: s => s.view === 'card' && cardUp(s) && s.note === 'Film skipped on this phone · the stage keeps time',
  stale: s => s.banner === 'Connection lost' && s.status === 'stale' && cardUp(s),
  'card-sheet': s => cardUp(s),
  'card-sheet-down': s => s.back === 'Hidden' && s.name === null,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const [state, where] of Object.entries(STATES)) {
    for (const sizeKey of where === 2 ? ['390x844', '430x932'] : where) {
      const [width, height] = SIZES[sizeKey];
      const query = sizeKey === 'card' ? `state=${state}` : `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__roleStage !== undefined');
      await page.evaluate('window.__roleStage.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-role-stage') ?? document.querySelector('.ms-own-card').parentNode, q = s => root.querySelector(s), t = s => q(s)?.textContent ?? null;
        const shown = s => { const n = q(s); return n && !n.hidden && n.getClientRects().length > 0 ? n.textContent : null; };
        const pictures = [...root.querySelectorAll('.ms-rc-person, .ms-rc-device')].map(n => getComputedStyle(n).backgroundImage);
        return { violations: window.__policy, status: root.dataset.status ?? null, view: root.dataset.view ?? null, motion: root.dataset.motion ?? null,
          name: t('.ms-rc-name'), team: t('.ms-rc-team'), facts: root.querySelectorAll('.ms-rc-facts li').length, missing: !!q('.ms-rc-missing'),
          back: t('.ms-rc-back p'), stamp: t('.ms-rc-stamp'), note: shown('.ms-rst-note'), timer: q('.ms-ps-timer')?.lastChild?.textContent ?? null,
          chip: shown('.ms-rst-chip') && q('.ms-rst-chip').lastChild.textContent, strip: q('.ms-rst-strip:not([hidden])')?.getAttribute('aria-valuenow') ?? null,
          skip: !!q('.ms-rst-film[data-shown=""] .ms-rst-skip'), film: q('.ms-rst-picture')?.childElementCount ?? 0,
          readyOff: !!q('.ms-rst-ready[data-off]'), readyMode: q('.ms-rst-ready')?.dataset.mode ?? null,
          toast: t('.ms-ps-toast > span:last-child'), banner: t('.ms-ps-banner b'), pictures,
          // A toast counts only where it is on top, not hidden under the film.
          toastOnTop: (() => { const n = q('.ms-ps-toast'); if (!n) return false; const r = n.getBoundingClientRect(); return n.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })(),
          picturesDrawn: pictures.every(p => p.startsWith('url(')), layout: window.__roleStage.mounted[0]?.layout?.() ?? null };
      })()`);
      const requests = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const drawn = EXPECT[state](seen);
      // Face up with the picture, the person and the device are drawn from the bundles' properties.
      const art = seen.name === null || seen.missing || (seen.pictures.length === 2 && seen.picturesDrawn);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn && art;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: view ${seen.view}, card "${seen.name ?? seen.back}", note "${seen.note}", clock ${seen.timer ?? seen.chip}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}${art ? '' : ', PICTURES MISSING'}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__roleStage !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__roleStage.agree' : 'window.__roleStage.probe');
    const violations = await page.evaluate('window.__policy');
    for (const v of violations) v.kind = await classify(out, v);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    // The run's own verdict last, so the page's (outcome.ok) never stands in for it.
    const entry = { emulated: media ?? {}, ...outcome, ok, violations, problems };
    if (mode === 'agree') agreement = entry; else probes[mode] = entry;
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${mode === 'agree' ? '' : `probe ${mode} · `}${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 1500)}`}`);
    if (outcome.error) console.log(`FAIL ${mode}: ${outcome.error}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const headers = PRODUCTION_HEADERS.map(([key, value]) => ({ key, value }));
const record = {
  tool: 'design/tools/role-stage-check.mjs',
  component: 'design/phone-ui/components/role-stage',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  headers, headersSha256: sha256(JSON.stringify(headers)),
  captures: results,
  probe: probes,
  agree: agreement,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passedCaptures = Object.values(results).filter(r => r.ok).length;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []);
const agreeChecks = agreement?.checks ?? [];
console.log(`${passedCaptures} of ${Object.keys(results).length} captures passed; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; agreement ${agreeChecks.filter(c => c.ok).length} of ${agreeChecks.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
