// mothership:dev-only
//
// The room scene's check (design/phone-ui/components/room-scene). It bundles the component's preview the
// way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted
// game's production response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and captures every preview state at the two
// development phone sizes, 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the
// release's pictures requested and the crew drawn where the state shows people.
// It writes design/phone-ui/components/room-scene/review/: one JPEG per state and size, and check.json
// (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256).
//   node design/tools/room-scene-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { createHostedPreviewCsp } from '../../scripts/hosted-preview-policy.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/room-scene');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
const STATES = ['lit', 'own', 'targets', 'moves', 'dark', 'cold', 'stale', 'concealed', 'reduced', 'unavailable'];
// The moment of the voyage the captures hold, as the pack's sheet 55 does (2:10).
const AT = 130;

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
  const out = await mkdtemp(join(tmpdir(), 'room-scene-check-'));
  await build({
    root: join(COMPONENT, 'preview'), base: './', logLevel: 'warn', configFile: false, publicDir: false,
    // Bundled, the game's package imports resolve from node_modules: the preview's import map is for
    // the unbundled page only, and an inline script would be refused by the production policy anyway.
    plugins: [{ name: 'room-scene-check-no-import-map', transformIndexHtml: html => html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '') }],
    build: { outDir: out, emptyOutDir: true, target: 'es2022', assetsInlineLimit: 0, sourcemap: false, cssMinify: false },
  });
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

const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
let failed = 0;
try {
  await mkdir(REVIEW, { recursive: true });
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
    for (const state of STATES) {
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source:
        'window.__policy = []; document.addEventListener("securitypolicyviolation", e => window.__policy.push({ directive: e.violatedDirective, blocked: String(e.blockedURI), source: String(e.sourceFile).replace(location.origin + "/", ""), line: e.lineNumber, column: e.columnNumber }));' });
      await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}&at=${AT}`, 'window.__roomScene !== undefined');
      await page.evaluate('window.__roomScene.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-room-scene'), q = s => root.querySelectorAll(s).length;
        return { violations: window.__policy, figures: q('.ms-rs-fig svg'), tags: q('.ms-rs-tag'), presses: q('.ms-rs-press'), slots: q('.ms-rs-slot'),
          ambient: q('svg.amb'), layers: [...root.querySelectorAll('.ms-rs-art')].map(n => n.dataset.layer), cards: q('.ms-rs-card'),
          control: root.querySelector('.ms-rs-control')?.textContent ?? null, cover: q('.ms-rs-cover'), veil: q('.ms-rs-veil'),
          layout: window.__roomScene.scenes[0].layout().frame };
      })()`);
      const art = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const people = !['dark', 'cold', 'concealed', 'unavailable'].includes(state);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && (!people || seen.figures > 0) && (state === 'concealed' || state === 'unavailable' || art.length > 0);
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, ...seen, art, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: ${seen.figures} figure layers, ${seen.tags} tags, art ${art.length}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}`);
    }
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const headers = PRODUCTION_HEADERS.map(([key, value]) => ({ key, value }));
const record = {
  tool: 'design/tools/room-scene-check.mjs',
  component: 'design/phone-ui/components/room-scene',
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim(),
  sourceClean: execFileSync('git', ['status', '--porcelain', '--', 'design/phone-ui/components', 'design/room-drawing/assets'], { cwd: REPO, encoding: 'utf8' }).trim() === '',
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  headers, headersSha256: sha256(JSON.stringify(headers)),
  voyageAt: AT,
  captures: results,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(`${Object.keys(results).length - failed} of ${Object.keys(results).length} captures passed; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
