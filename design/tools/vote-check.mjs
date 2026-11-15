// mothership:dev-only
//
// The ballot's and the result window's check (design/phone-ui/components/vote). It bundles the component's
// preview the way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with
// the hosted game's production response headers (scripts/prepare-hosted-preview.mjs: the Content Security
// Policy of scripts/hosted-preview-policy.mjs and the six other headers), and captures every
// preview state at the two development phone sizes, 390 × 844 and 430 × 932, and sheet 56's states at
// 320 × 568 with the Largest text (200%), in desktop Chromium at 2× pixels. The component sits in the
// phone shell, with the room scene in the shell's stage, as in the game.
// A capture passes with no policy violation, no failed or refused request and no page error, with each
// seat's cell in the state the fixture gives it, the sheet's words or the result's headline as the pack
// writes them, and the room's crew drawn behind.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: select, refused taps, reconnecting, focus, privacy, the result, the words, the
//   compact form, dispose and motion;
//   the agreement (preview/agree.mjs): the component beside the pinned pack's own drawing of each vote
//   and result frame, the same words, cell states and boxes to within half a pixel.
// It writes design/phone-ui/components/vote/review/: one JPEG per state and size, and check.json (the
// headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each probe
// and agreement check with what it saw). It exits non-zero when any check fails, and says which.
//   node design/tools/vote-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { createHostedPreviewCsp } from '../../scripts/hosted-preview-policy.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/vote');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };
// The moment of the voyage the captures hold, as the shell's do (2:10).
const AT = 130;

/**
 * Each state's cells, seat 1 to 9, from its fixture (preview/states.mjs): a available, s selected,
 * c your vote, f faded, i not available, e an empty seat, w the chosen or tied. '' is no roster drawn.
 */
const CELLS = {
  'jail-open': 'aaaaaiaai', 'jail-selected': 'saaaaiaai', 'jail-submitted': 'cffffiffi', 'jail-abstained': 'fffffiffi', 'jail-closed': 'fffffiffi',
  'captain-open': 'aaaaiiaai', 'captain-runoff': 'aaiiiiiii', 'captain-8-selected': 'saaaiiaae', 'jail-7': 'aaaaaiaee', 'jail-cannot': 'fffffiffi',
  'result-elected': 'awaaiiaai', 'result-runoff': 'wwaaiiaai', 'result-no-captain': 'aaaaiiaai', 'result-jailed': 'aaaaaiwai', 'result-jail-full': 'aaaaaiwai',
  'result-no-one': 'aaaaaiaai', 'result-jailed-8': 'aaaaaiwae',
  'large-result-jailed': 'aaaaaiwai', 'large-result-elected': 'awaaiiaai', 'large-result-runoff': 'wwaaiiaai',
  'large-jail-selected': 'saaaaiaai', 'large-captain': 'aaaaiiaai', 'large-runoff': 'aaiiiiiii',
  'jail-stale': 'saaaaiaai', 'jail-concealed': '', 'result-concealed': '',
};
const LETTER = { available: 'a', selected: 's', confirmed: 'c', faded: 'f', ineligible: 'i', empty: 'e', winner: 'w' };
/** What else a state must show: the sheet's title and footer, or the result's headline and line. */
const WORDS = {
  'jail-open': { sheet: 'Jail vote', foot: 'Abstain|Vote' }, 'jail-selected': { sheet: 'Jail vote', foot: 'Abstain|Vote for Ava' },
  'jail-submitted': { sheet: 'Jail vote', foot: 'Ballot registered' }, 'jail-abstained': { sheet: 'Jail vote', foot: 'Abstained', note: 'You abstained' },
  'jail-closed': { sheet: 'Jail vote', foot: 'Voting closed', note: 'Closed · result next' },
  'captain-open': { sheet: 'Captain election', foot: 'Abstain|Vote' }, 'captain-runoff': { sheet: 'Captain runoff', foot: 'Abstain|Vote' },
  'captain-8-selected': { sheet: 'Captain election', sub: '8 players', foot: 'Abstain|Vote for Ava' }, 'jail-7': { sheet: 'Jail vote', sub: '7 players', foot: 'Abstain|Vote' },
  'jail-cannot': { sheet: 'Jail vote', foot: 'You can’t vote', note: 'Eliminated players don’t vote. You can still watch.' },
  'result-elected': { title: 'BEN IS CAPTAIN', line: '8 votes · 8 could vote' }, 'result-runoff': { title: 'TIE · RUNOFF', line: '8 votes · 8 could vote' },
  'result-no-captain': { title: 'NO CAPTAIN', line: '0 votes · 8 could vote' }, 'result-jailed': { title: 'GUS GOES TO JAIL', line: '7 votes · 4 needed of 8' },
  'result-jail-full': { title: 'GUS CHOSEN · JAIL FULL', line: 'Chosen, but every Jail place is taken. Gus stays.' },
  'result-no-one': { title: 'NO ONE GOES TO JAIL', line: 'No one reached 4 votes.' }, 'result-jailed-8': { title: 'GUS GOES TO JAIL', line: '7 votes · 4 needed of 8' },
  'large-result-jailed': { title: 'GUS GOES TO JAIL', line: '7 votes · 4 needed of 8' }, 'large-result-elected': { title: 'BEN IS CAPTAIN', line: '8 votes · 8 could vote' },
  'large-result-runoff': { title: 'TIE · RUNOFF', line: '8 votes · 8 could vote' },
  'large-jail-selected': { sheet: 'Jail vote', foot: 'Abstain|Vote for Ava' }, 'large-captain': { sheet: 'Captain election', foot: 'Abstain|Vote' },
  'large-runoff': { sheet: 'Captain runoff', foot: 'Abstain|Vote' },
  'jail-stale': { sheet: 'Jail vote', foot: 'Abstain|Vote for Ava', banner: 'Connection lost' }, 'jail-concealed': {}, 'result-concealed': {},
};
/** The hosted game's response headers, as scripts/prepare-hosted-preview.mjs writes them for staging (the same list as the room scene's and the shell's checks). */
export const PRODUCTION_HEADERS = Object.freeze([
  ['Cache-Control', 'no-store'],
  ['Content-Security-Policy', createHostedPreviewCsp('gamen-mothership-staging')],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Robots-Tag', 'noindex, nofollow'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
]);
const LARGE = new Set(Object.keys(CELLS).filter(k => k.startsWith('large-')));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/**
 * One report is known and not the component's: zod's eval feature probe, which zod catches before falling
 * back to its ordinary parser; the game's own bundle has the same probe (the shell's check says more). A
 * report is that one only when the bundled code at the reported place is the probe; every other report
 * fails the capture.
 */
async function classify(out, violation) {
  if (violation.directive !== 'script-src' || violation.blocked !== 'eval' || !violation.source) return 'unexpected';
  const code = (await readFile(join(out, violation.source), 'utf8').catch(() => '')).split('\n')[violation.line - 1] ?? '';
  const near = code.slice(Math.max(0, violation.column - 160), violation.column + 60);
  return /Cloudflare[\s\S]*try\{return Function\(``\),!0\}catch\{return!1\}/.test(near) ? 'known: zod eval probe, caught; the live game bundle has it too' : 'unexpected';
}

async function bundle() {
  const out = await mkdtemp(join(tmpdir(), 'vote-check-'));
  await build({
    root: join(COMPONENT, 'preview'), base: './', logLevel: 'warn', configFile: false, publicDir: false,
    // Bundled, the game's package imports resolve from node_modules: the preview's import map is for the
    // unbundled page only, and an inline script would be refused by the production policy anyway.
    plugins: [{ name: 'vote-check-no-import-map', transformIndexHtml: html => html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '') }],
    build: { outDir: out, emptyOutDir: true, target: 'es2022', assetsInlineLimit: 0, sourcemap: false, cssMinify: false },
  });
  // The agreement draws the pinned pack beside the component. The pack's art.mjs finds the crew's portraits
  // and the rooms' pictures from its own place at run time (design/crew-drawing/assets/portraits/ and
  // design/board-v2/assets/), which no bundle carries; they are copied to where it looks from the bundle,
  // as the pack's own pages serve them. The component's own pictures come through the bundle, as in the game.
  await cp(join(REPO, 'design/crew-drawing/assets/portraits'), join(out, 'crew-drawing/assets/portraits'), { recursive: true });
  await cp(join(REPO, 'design/board-v2/assets'), join(out, 'board-v2/assets'), { recursive: true });
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

// The source the captures show, read before anything is written: the components' files, the room pictures
// and the result art, without the review folder this check writes.
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim();
const sourceClean = execFileSync('git', ['status', '--porcelain', '--', 'design/phone-ui/components', ':!design/phone-ui/components/vote/review',
  'design/room-drawing/assets', 'apps/game/hosted/scene-drawing/phone-kit-art.mjs'], { cwd: REPO, encoding: 'utf8' }).trim() === '';
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
const POLICY_LISTENER = 'window.__policy = []; document.addEventListener("securitypolicyviolation", e => window.__policy.push({ directive: e.violatedDirective, blocked: String(e.blockedURI), source: String(e.sourceFile).replace(location.origin + "/", ""), line: e.lineNumber, column: e.columnNumber }));';
try {
  await mkdir(REVIEW, { recursive: true });
  // A clean review folder: captures of states that no longer exist do not linger.
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));
  for (const state of Object.keys(CELLS)) {
    for (const sizeKey of LARGE.has(state) ? ['320x568'] : ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}&at=${AT}`, 'window.__vote !== undefined');
      await page.evaluate('window.__vote.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const shell = document.querySelector('.ms-phone-shell'), q = s => document.querySelector(s);
        const shown = n => !!n && n.getClientRects().length > 0;
        const t = s => { const n = q(s); return shown(n) ? n.innerText.replace(/\\s+/g, ' ').trim() : null; };
        const grid = q('.ms-vote-grid') ?? q('.ms-vote-result:not([hidden]) .ms-k-grid9');
        const cells = grid ? [...grid.children].map(c => c.dataset.state) : [];
        const room = document.querySelector('.ms-room-scene');
        return { violations: window.__policy, status: shell?.dataset.status ?? null, cells,
          refused: grid ? [...grid.querySelectorAll('button.ms-k-cell')].every(b => b.getAttribute('aria-disabled') === 'true') : null,
          columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
          sheet: t('.ms-ps-sheet-title h2'), sub: t('.ms-ps-sheet-title p'), foot: [...document.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')].map(b => b.innerText.trim()).join('|'),
          note: t('.ms-ballot-notes'), title: t('.ms-result-title'), line: t('.ms-result-line'), banner: t('.ms-ps-banner b'),
          window: shown(q('.ms-vote-result')), names: (document.querySelector('.ms-vote-ballot, .ms-vote-result')?.textContent ?? '').trim().length,
          figures: room ? room.querySelectorAll('.ms-rs-fig svg').length : 0 };
      })()`);
      const art = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const want = WORDS[state];
      const drawn = seen.cells.map(s => LETTER[s] ?? '?').join('') === CELLS[state]
        && (!want.sheet || seen.sheet === want.sheet) && (!want.sub || seen.sub === want.sub) && (!want.foot || seen.foot === want.foot)
        && (!want.note || seen.note === want.note) && (!want.title || seen.title === want.title) && (!want.line || seen.line === want.line)
        && (!want.banner || (seen.banner === want.banner && seen.refused))
        && (!LARGE.has(state) || seen.columns === 1)
        && (state.endsWith('concealed') ? seen.cells.length === 0 && !seen.window && seen.sheet === null && seen.figures === 0 : seen.figures > 0);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, ...seen, art, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: cells ${seen.cells.map(s => LETTER[s] ?? '?').join('') || '—'}, ${seen.sheet ?? seen.title ?? '—'}, crew ${seen.figures}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__vote !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__vote.agree' : 'window.__vote.probe');
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
    if (problems.length) console.log(`FAIL ${mode}: problems ${JSON.stringify(problems).slice(0, 1500)}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const headers = PRODUCTION_HEADERS.map(([key, value]) => ({ key, value }));
const record = {
  tool: 'design/tools/vote-check.mjs',
  component: 'design/phone-ui/components/vote',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  headers, headersSha256: sha256(JSON.stringify(headers)),
  voyageAt: AT,
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
