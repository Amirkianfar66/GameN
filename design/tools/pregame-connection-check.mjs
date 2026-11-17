// mothership:dev-only
//
// The pre-game connection's check (docs/design/components/pregame-connection.md): the Planet app's screens before
// the match drawn by Designer's pre-game components, release 4 of the owner's plan of 16 November 2026. It bundles
// Frontend's phone harness (apps/game/dev/phone: the real Planet app and its session on a synthetic connection) from
// this tree, with the art it takes from a clean worktree of origin/main, as shell-connection-check.mjs does, and
// serves it with the hosted game's production response headers (scripts/hosted-preview-policy.mjs, the Content
// Security Policy included). It drives the real app at 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels.
// Each state below names what it draws. A capture passes with no unexpected policy report, no failed request and no
// page error; the screen's component mounted with none of the app's old pre-game view left; and the state's facts.
// It writes design/phone-ui/review/pregame-connection/: one JPEG per state and size, and check.json (the headers and
// their SHA-256, the candidate and art commits, what each capture saw and its SHA-256).
//   GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/pregame-connection-check.mjs [--only a,b] [--keep]
// --only draws some states (a state another continues from is drawn with it); a run with --only adds its captures to
// check.json when that record names the same candidate, art and headers. Any other run starts a new record.
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size, with no safe areas: not a
// phone, not Safari, not a live match, not multiplayer.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { createHostedPreviewHeaders } from '../../scripts/hosted-preview-policy.mjs';
import { comicAssetsPlugin } from '../../apps/game/hosted/comic-assets.mjs';
import { planetLibraryAssetsPlugin } from '../../apps/game/hosted/build/planet-library-art.mjs';
import { crewDrawingAssetsPlugin } from '../../scripts/crew-drawing-art.mjs';
import { pregameAssetsPlugin } from '../../scripts/pregame-art-release.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const REVIEW = join(REPO, 'design/phone-ui/review/pregame-connection');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
const PROJECT = 'gamen-mothership-staging';
const HEADERS = createHostedPreviewHeaders(PROJECT);
// The asset tooling the harness serves its art with: it must be main's, so the art is main's too.
const TOOLING = ['apps/game/hosted/comic-assets.mjs', 'apps/game/hosted/build', 'scripts', 'apps/game/dev/phone', 'apps/game/dev/planet/scenarios.mjs'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const only = (() => { const at = process.argv.indexOf('--only'); return at === -1 ? null : new Set(process.argv[at + 1].split(',')); })();

/** The art baseline, as room-connection-check.mjs requires it: a clean worktree of origin/main's history, with this tree's tooling. */
function artBase() {
  const dir = process.env.GAMEN_PHONE_ART_BASE;
  if (!dir) throw new Error('Set GAMEN_PHONE_ART_BASE to a clean worktree of fetched origin/main.');
  const root = realpathSync(dir);
  if (realpathSync(git(root, 'rev-parse', '--show-toplevel')) !== root) throw new Error('The art baseline must be a worktree root');
  if (git(root, 'status', '--porcelain')) throw new Error('The art baseline must be clean');
  const head = git(root, 'rev-parse', 'HEAD'), main = git(REPO, 'rev-parse', '--verify', 'refs/remotes/origin/main^{commit}');
  git(REPO, 'merge-base', '--is-ancestor', head, main);
  const toolingSame = (() => { try { git(REPO, 'diff', '--quiet', head, '--', ...TOOLING); return true; } catch { return false; } })();
  if (!toolingSame) throw new Error(`The harness or its asset tooling differs from the art baseline ${head}`);
  return { root, head, main };
}

/** One known report that is not the app's: zod's eval feature probe, which zod catches (see room-scene-check.mjs). */
async function classify(out, violation) {
  if (violation.directive !== 'script-src' || violation.blocked !== 'eval' || !violation.source) return 'unexpected';
  const code = (await readFile(join(out, violation.source), 'utf8').catch(() => '')).split('\n')[violation.line - 1] ?? '';
  const near = code.slice(Math.max(0, violation.column - 160), violation.column + 60);
  return /Cloudflare[\s\S]*try\{return Function\(``\),!0\}catch\{return!1\}/.test(near) ? 'known: zod eval probe, caught; the live game bundle has it too' : 'unexpected';
}

async function bundle(art) {
  const out = await mkdtemp(join(tmpdir(), 'pregame-connection-check-'));
  // The harness's own entry with its art plugins over the baseline's art; the candidate's code is this tree.
  await build({
    root: join(REPO, 'apps/game/dev/phone'), configFile: false, publicDir: false, logLevel: 'warn',
    plugins: [comicAssetsPlugin(art.root), planetLibraryAssetsPlugin(art.root), crewDrawingAssetsPlugin(art.root), pregameAssetsPlugin(art.root)],
    build: { target: 'es2022', cssMinify: false, outDir: out, emptyOutDir: true, sourcemap: false,
      rollupOptions: { input: { phone: join(REPO, 'apps/game/dev/phone/index.html') } } },
  });
  // What phone-ui-native-compare.mjs reads to name the build it compares (as the harness's own build writes it).
  await writeFile(join(out, 'review-provenance.json'), `${JSON.stringify({
    scope: 'The phone harness built by design/tools/pregame-connection-check.mjs: the candidate\'s native modules, with art from a clean worktree of origin/main',
    candidate: { root: REPO, head: git(REPO, 'rev-parse', 'HEAD'), dirty: !!git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/pregame-connection') },
    artwork: { root: art.root, head: art.head, mainHead: art.main },
  }, null, 2)}\n`);
  return out;
}

function serve(root) {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://check').pathname);
    const path = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
    if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const headers = Object.fromEntries(HEADERS.map(({ key, value }) => [key, value]));
    try {
      const body = await readFile(path);
      response.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', ...headers });
      response.end(body);
    } catch {
      response.writeHead(404, headers).end('Not found');
    }
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

// Each page starts with this phone's stored preferences cleared (a state may then set them before the app loads).
const POLICY = 'window.__policy = []; document.addEventListener("securitypolicyviolation", e => window.__policy.push({ directive: e.violatedDirective, blocked: String(e.blockedURI), source: String(e.sourceFile).replace(location.origin + "/", ""), line: e.lineNumber, column: e.columnNumber }));';
const H = 'window.planetHarness';
const SESSION = `${H}.app.session`;
const tap = selector => `(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) throw new Error('nothing to tap: ' + ${JSON.stringify(selector)}); n.click(); return true; })()`;
/** Types into a text box as a person does: the value, then the input event the component listens to. */
const type = (selector, text) => `(() => { const n = document.querySelector(${JSON.stringify(selector)}); n.focus(); n.value = ${JSON.stringify(text)}; n.dispatchEvent(new InputEvent('input', { bubbles: true })); return true; })()`;
/** Replaces the harness's session value (the server's answer), then reads it. */
const serve$ = body => `(async () => { const h = ${H}, v = structuredClone(h.value), now = h.now(); ${body}; await h.replace(v); })()`;
const SCREEN = name => `document.querySelector('.planet-pregame-host')?.dataset.screen===${JSON.stringify(name)}`;

/** What the phone shows now: the pre-game screen, its words and controls, what is left of the old view, and the session. */
const LOOK = `(() => {
  const host = document.querySelector('.planet-pregame-host');
  const box = n => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100, width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 }; };
  const text = n => n ? n.textContent.replace(/\\s+/g, ' ').trim() : null;
  const control = b => ({ label: b.getAttribute('aria-label') ?? text(b), intent: b.dataset.intent ?? null, value: b.dataset.value ?? null, disabled: b.getAttribute('aria-disabled') === 'true' || b.disabled,
    busy: b.getAttribute('aria-busy') === 'true', pressed: b.getAttribute('aria-pressed') ?? b.getAttribute('aria-checked'),
    reason: (id => id ? text(document.getElementById(id)) : null)(b.getAttribute('aria-describedby')), box: box(b) });
  const root = host?.firstElementChild ?? null, model = window.planetHarness?.app.session.getModel() ?? null;
  const shell = host?.querySelector('.ms-phone-shell');
  return {
    screen: host?.dataset.screen ?? null, component: root ? [...root.classList].filter(c => c.startsWith('ms-')).join(' ') : null, box: box(host),
    rootClass: document.getElementById('planet-root')?.className ?? null,
    title: text(host?.querySelector('h1, .ms-ep-large, .ms-ep-nav-title, .ms-ps-name')),
    words: (text(host) ?? '').slice(0, 400),
    buttons: host ? [...host.querySelectorAll('button')].filter(b => b.getClientRects().length).map(control) : [],
    inputs: host ? [...host.querySelectorAll('input')].map(i => ({ type: i.type, value: i.type === 'password' ? (i.value ? '•' : '') : i.value, label: i.getAttribute('aria-label') ?? (i.labels?.[0] ? text(i.labels[0]) : null) })) : [],
    shell: shell ? { status: shell.dataset.status, bar: shell.dataset.bar ?? null, banner: text(shell.querySelector('.ms-ps-banner')), toast: text(shell.querySelector('.ms-ps-toast')) } : null,
    toast: text(document.querySelector('.ms-k-toast')),
    hero: (() => { const h = host?.querySelector('.ms-mm-hero, .ms-mm-heroframe'); const svg = host?.querySelector('.planet-pregame-hero'); return h ? { svg: !!svg, box: box(svg ?? h) } : null; })(),
    old: document.querySelectorAll('.planet-setup, .planet-entry-tabs, #planet-create, #planet-join, #planet-recovery-code, .planet-crew, #planet-ready, #planet-role-reveal, #planet-check-admission').length,
    film: document.querySelector('.pregame-overlay')?.dataset.pregame ?? null,
    model: model ? { connection: model.connection, matchId: model.matchId, status: model.status, isHost: model.isHost, selfSeatId: model.selfSeatId, busy: model.busy, message: model.message,
      pending: model.pendingAdmission?.status ?? (model.pendingAdmission ? 'pending' : null), canChoose: model.canChoose, canReady: model.canReady, role: model.ownRole?.role ?? null,
      fontSize: getComputedStyle(document.documentElement).fontSize, motion: document.documentElement.dataset.motion } : null,
    sent: (window.planetHarness?.requests ?? []).filter(r => r.operation !== 'read' && r.operation !== 'receipt').map(r => r.operation),
    reads: (window.planetHarness?.requests ?? []).filter(r => r.operation === 'read').length,
    violations: window.__policy,
  };
})()`;

const labels = s => s.buttons.map(b => b.label);
const button = (s, label) => s.buttons.find(b => b.label === label || b.label?.startsWith(label));

/**
 * Each state: the address it starts from (or `from`, the state it continues), the steps that reach it before the
 * capture, its own facts, and `after`: steps after the capture whose facts join its checks.
 */
const STATES = {
  menu: { url: 'scenario=join', steps: async page => { await page.waitFor(SCREEN('menu'), 'the main menu');
      // The brand intro plays first on the app's first entry (today's, unchanged); the menu is under it.
      await page.waitFor("!document.querySelector('.pregame-overlay')", 'the brand intro over', 8000); await page.waitFor("document.querySelector('.planet-pregame-hero')", 'the hero\'s still'); },
    facts: s => ({ menu: /ms-main-menu/.test(s.component), choices: ['Host', 'Join', 'Recover my seat', 'Display settings'].every(label => !!button(s, label) && !button(s, label).disabled),
      hero: s.hero?.svg && s.hero.box.height > 100, noFilm: s.film === null, noNotice: !/No connection/.test(s.words), nothingSent: s.sent.length === 0 }) },
  display: { from: 'menu', steps: async page => { await page.evaluate(tap('.planet-pregame-host [data-intent="settings"]')); await page.waitFor(SCREEN('display'), 'the Display page'); },
    facts: s => ({ page: /ms-display-page|ms-display-settings/.test(s.component) && /Display/.test(s.words), back: !!button(s, 'Menu'), motion: /Reduce motion/.test(s.words), sizes: ['Standard', 'Large', 'Largest'].every(l => !!button(s, l)) }),
    after: async page => {
      // The text size is this phone's: Largest sets the root's size; the menu comes back with Menu.
      await page.evaluate(tap('.planet-pregame-host [data-intent="text-size"][data-value="2"]'));
      await page.waitFor("getComputedStyle(document.documentElement).fontSize==='32px'", 'the Largest text applied');
      const large = await page.evaluate(LOOK);
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Menu/.test(b.textContent)).click()");
      await page.waitFor(SCREEN('menu'), 'back to the menu');
      return { largest: large.model.fontSize === '32px', stored: await page.evaluate("JSON.parse(localStorage.getItem('mothership:planet:presentation-preferences')).textScale===2"), backToMenu: true };
    } },
  join: { url: 'scenario=join', steps: async page => {
      await page.waitFor(SCREEN('menu') + "&&!document.querySelector('.pregame-overlay')", 'the menu, after the brand intro', 8000);
      await page.evaluate(tap('.planet-pregame-host [data-intent="join"]'));
      await page.waitFor(SCREEN('join'), 'the Join form');
      // Typed as a person types: the draft takes the room code's capitals, and the name's count follows.
      await page.evaluate(type('.planet-pregame-host input:not([type="password"])', 'planet'));
      await page.evaluate(type('.planet-pregame-host input[autocomplete="nickname"]', 'Dev'));
      await page.waitFor("[...document.querySelectorAll('.planet-pregame-host input')].some(i=>i.value==='Dev')", 'the name typed');
    },
    facts: s => ({ form: /ms-join-form/.test(s.component) && /Join a room/.test(s.words), code: s.inputs.some(i => i.value === 'PLANET'), count: /3\/12/.test(s.words),
      ask: !!button(s, 'Ask to join') && !button(s, 'Ask to join').disabled, device: /Player phone/.test(s.words) && /Shared display/.test(s.words), nothingSent: s.sent.length === 0 }) },
  'join-wait': { from: 'join', steps: async page => {
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Ask to join/.test(b.textContent)).click()");
      await page.waitFor(SCREEN('join-wait'), 'waiting for the host');
    },
    facts: s => ({ wait: /ms-join-wait/.test(s.component) && /Waiting for the host/.test(s.words) && /Room PLANET · as Dev/.test(s.words), sent: s.sent.join() === 'requestAdmission',
      pending: s.model?.pending === 'pending' || s.model?.pending === null, check: !!button(s, 'Check again'),
      // G6: no command to withdraw a request, so Cancel is drawn unavailable with the connection's words.
      cancelOff: button(s, 'Cancel')?.disabled === true && button(s, 'Cancel')?.reason === 'Not available in this test' }),
    after: async (page, seen) => {
      // Check again reads the session at once, as today's "Check admission".
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Check again/.test(b.textContent)).click()");
      await sleep(400);
      const now = await page.evaluate(LOOK);
      return { checkReads: now.reads > seen.reads };
    } },
  'join-admitted': { from: 'join-wait', steps: async page => {
      // The server admits the request: this phone's seat, and the room as it fills.
      await page.evaluate(serve$("v.admission={...v.admission,status:'admitted'};v.selfSeatId='seat-4';v.isHost=false;v.status='lobby';v.playerCount=9;v.members=[1,2,3,4,5].map(n=>({seatId:`seat-${n}`,displayName:n===4?'Dev':`Crew ${n}`,characterId:null,controller:n===2?'bot':'human',ready:false}))"));
      await page.waitFor(SCREEN('join-wait') + "&&/Seat 4/.test(document.querySelector('.planet-pregame-host').textContent)", 'admitted, Seat 4');
    },
    facts: s => ({ admitted: /You’re in · Seat 4/.test(s.words) && /Players · 5 of 9/.test(s.words) && /Dev \(you\)/.test(s.words), leaveOff: button(s, 'Leave')?.disabled === true && button(s, 'Leave')?.reason === 'Not available in this test' }) },
  recover: { url: 'scenario=join', steps: async page => {
      await page.waitFor(SCREEN('menu') + "&&!document.querySelector('.pregame-overlay')", 'the menu, after the brand intro', 8000);
      await page.evaluate(tap('.planet-pregame-host [data-intent="recover"]'));
      await page.waitFor(SCREEN('recover'), 'Recover');
      await page.evaluate(type('.planet-pregame-host input:not([type="password"])', 'planet-local'));
      await page.evaluate(type('.planet-pregame-host input[type="password"]', 'SYNTHETIC-RECOVERY-CODE-0123456789'));
      await page.waitFor("[...document.querySelectorAll('.planet-pregame-host button')].some(b=>/Recover seat/.test(b.textContent)&&b.getAttribute('aria-disabled')!=='true')", 'Recover seat offered');
    },
    facts: s => ({ form: /ms-recover/.test(s.component) && /Recover your seat/.test(s.words), secret: s.inputs.some(i => i.type === 'password' && i.value === '•'), offered: !button(s, 'Recover seat')?.disabled,
      noCodeHint: !/\d+ characters/.test(s.words) }),
    after: async page => {
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Recover seat/.test(b.textContent)).click()");
      await page.waitFor(SCREEN('recover') + "&&/is yours again/.test(document.querySelector('.planet-pregame-host').textContent)", 'the seat recovered');
      const done = await page.evaluate(LOOK), file = done;
      // The code went straight into the command: the box is emptied, and no stored request names it.
      const kept = await page.evaluate("[...document.querySelectorAll('input')].some(i=>i.value.includes('SYNTHETIC'))||Object.keys(sessionStorage).some(k=>String(sessionStorage.getItem(k)).includes('SYNTHETIC'))");
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Continue/.test(b.textContent)).click()");
      await page.waitFor("document.querySelector('.planet-container .ms-phone-shell')", 'the match, in the shell');
      return { recovered: /Seat 6 is yours again/.test(file.words) && file.sent.includes('redeemRecovery'), codeNotKept: !kept, continueToMatch: true };
    } },
  'host-setup': { url: 'scenario=join', steps: async page => {
      await page.waitFor(SCREEN('menu') + "&&!document.querySelector('.pregame-overlay')", 'the menu, after the brand intro', 8000);
      await page.evaluate(tap('.planet-pregame-host [data-intent="host"]'));
      await page.waitFor(SCREEN('host-setup'), 'host setup');
    },
    // G1 (a), the Lead's decision of 17 November: the game gives no team mix yet, so no line is drawn under 7/8/9.
    facts: s => ({ setup: /ms-host-setup/.test(s.component), counts: s.buttons.filter(b => b.intent === 'count').map(b => b.label).join() === '7,8,9',
      chosen: s.buttons.find(b => b.intent === 'count' && b.pressed === 'true')?.label === '7', open: !!button(s, 'Open room') && !button(s, 'Open room').disabled, nothingSent: s.sent.length === 0 }),
    after: async page => {
      const noMix = await page.evaluate("(() => { const b = document.querySelector('.planet-pregame-host [data-intent=\"count\"]'), n = b?.parentElement?.nextElementSibling; return !!n && (n.hidden || n.textContent.trim() === ''); })()");
      await page.evaluate(tap('.planet-pregame-host [data-intent="count"][data-value="8"]'));
      await page.waitFor("document.querySelector('.planet-pregame-host [data-intent=\"count\"][data-value=\"8\"]')?.getAttribute('aria-checked')==='true'", 'eight chosen');
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Open room/.test(b.textContent)).click()");
      await page.waitFor(SCREEN('host-lobby'), 'the room open, the host\'s lobby', 8000);
      const sent = await page.evaluate("window.planetHarness.requests.filter(r=>r.operation==='create').map(r=>r.playerCount)");
      return { noMix, createdWithEight: sent.join() === '8', lobby: true };
    } },
  'host-lobby': { url: 'scenario=host', steps: async page => {
      await page.waitFor(SCREEN('host-lobby'), 'the host\'s lobby');
      // Five of nine seats, and one phone asking to join.
      await page.evaluate(serve$("v.members=v.members.slice(0,5);v.pendingAdmissions=[{id:'admission-1',kind:'player',displayName:'Dev'}]"));
      await page.waitFor("/Asking to join · 1/.test(document.querySelector('.planet-pregame-host').textContent)", 'a request');
    },
    facts: s => ({ lobby: /ms-host-lobby/.test(s.component) && /PLANET/.test(s.words.replace(/\s/g, '')), seats: /5 of 9/.test(s.words), request: !!button(s, 'Admit') && !button(s, 'Admit').disabled,
      startOff: button(s, 'Start character selection')?.disabled === true && /4 more seats to fill/.test(s.words), bots: /Up to 9/.test(s.words),
      // G6: no command to leave a lobby, so Leave is drawn unavailable with the connection's words.
      leaveOff: button(s, 'Leave')?.disabled === true && button(s, 'Leave')?.reason === 'Not available in this test' }),
    after: async page => {
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Copy/.test(b.textContent)).click()");
      await page.waitFor("document.querySelector('.ms-k-toast')", 'the copy toast');
      const copied = await page.evaluate(LOOK);
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>b.textContent.trim()==='Admit').click()");
      await page.waitFor("window.planetHarness.requests.some(r=>r.operation==='approveAdmission')", 'Admit sent');
      return { copyToast: copied.toast === 'Copied' || copied.toast === 'Select the room code to copy.', admitSent: true };
    } },
  characters: { url: 'scenario=choosing', steps: async page => {
      await page.waitFor(SCREEN('characters'), 'character selection');
      await page.waitFor(`${SESSION}.getModel().canChoose`, 'choosing offered');
    },
    facts: s => ({ select: /ms-char-select/.test(s.component) && s.shell?.status === 'live', grid: s.buttons.filter(b => b.intent === 'choose').length === 9,
      offered: s.buttons.some(b => b.intent === 'choose' && !b.disabled), clock: /\d:\d\d/.test(s.words) }),
    after: async page => {
      await page.evaluate("document.querySelector('.planet-pregame-host [data-intent=\"choose\"][data-value=\"c6\"]').click()");
      await page.waitFor("window.planetHarness.requests.some(r=>r.operation==='chooseCharacter'&&r.characterId==='c6')", 'the choice sent');
      await page.waitFor("/Yours/.test(document.querySelector('.planet-pregame-host').textContent)", 'Nova is yours');
      return { chosen: true };
    } },
  stale: { from: 'characters', steps: async page => {
      await page.evaluate(`${H}.setReadFailure(true);${SESSION}.refresh()`);
      await page.waitFor(`${SESSION}.getModel().connection!=='live'&&document.querySelector('.planet-pregame-host .ms-phone-shell')?.dataset.status==='stale'`, 'reconnecting, as last seen');
    },
    facts: s => ({ stale: s.shell?.status === 'stale' && /Connection lost/.test(s.shell.banner ?? ''), keptGrid: s.buttons.filter(b => b.intent === 'choose').length === 9 && /Nova/.test(s.words) }),
    after: async (page, seen) => {
      await page.evaluate(`${H}.setReadFailure(false)`);
      await page.evaluate("document.querySelector('.planet-pregame-host [data-intent=\"retry\"]').click()");
      await page.waitFor("document.querySelector('.planet-pregame-host .ms-phone-shell')?.dataset.status==='live'", 'live again');
      const now = await page.evaluate(LOOK);
      return { retryReads: now.reads > seen.reads };
    } },
  role: { url: 'scenario=reading&flow=3&elapsed=5000', steps: async page => {
      await page.waitFor(SCREEN('role'), 'the role stage');
      await page.waitFor(`${SESSION}.getModel().ownRole&&/Hacker/.test(document.querySelector('.planet-pregame-host').textContent)`, 'the card face up');
    },
    facts: s => ({ stage: /ms-role-stage/.test(s.component), card: /Hacker/.test(s.words) && /Red team/.test(s.words) && s.shell?.status === 'live', film: /Your film starts in 0:1\d/.test(s.words),
      readyOff: s.buttons.some(b => /^Ready/.test(b.label ?? '') && b.disabled), noKnowledge: !/Unmapped trio|Undercover:/.test(s.words) }) },
  concealed: { from: 'role', steps: async page => {
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))");
      // The role stage's concealed state (sheet 18): the card's back with Show role; the public clock runs on.
      await page.waitFor("/Role hidden/.test(document.querySelector('.planet-pregame-host').textContent)&&!/Hacker/.test(document.querySelector('.planet-pregame-host').textContent)", 'concealed');
    },
    facts: s => ({ concealed: /Role hidden/.test(s.words) && !/Hacker|Red team/.test(s.words), clockRuns: /0:\d\d/.test(s.words), noRole: s.model?.role === null }),
    after: async page => {
      // Back on the phone, the session shows the role again by itself (today's), and the card turns face up.
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor(`${SESSION}.getModel().ownRole&&/Hacker/.test(document.querySelector('.planet-pregame-host').textContent)`, 'the card face up again');
      return { cardBack: true };
    } },
  'role-ready': { url: 'scenario=reading&flow=3&elapsed=31000', steps: async page => {
      await page.waitFor(SCREEN('role'), 'the role stage');
      await page.waitFor(`${SESSION}.getModel().canReady`, 'Ready offered');
    },
    facts: s => ({ ready: !!button(s, 'Ready') && !button(s, 'Ready').disabled }),
    after: async page => {
      await page.evaluate("[...document.querySelectorAll('.planet-pregame-host button')].find(b=>(b.getAttribute('aria-label')??b.textContent).trim().startsWith('Ready')).click()");
      await page.waitFor("window.planetHarness.requests.some(r=>r.operation==='ready')", 'Ready sent');
      await page.waitFor("/of 9 ready/.test(document.querySelector('.planet-pregame-host').textContent)", 'the count once ready');
      const now = await page.evaluate(LOOK);
      return { readySent: true, count: /9 of 9 ready/.test(now.words) };
    } },
  boarding: { url: 'scenario=reading&flow=3&elapsed=31000', steps: async page => {
      // The contract's boarding: every seat ready, and its exact ten-second interval.
      await page.evaluate(serve$("v.status='boarding';v.privateRole=null;v.members=v.members.map(m=>({...m,ready:true}));v.setup={id:'phone-boarding',startedAt:now-1000,endsAt:now+9000}"));
      await page.waitFor(SCREEN('boarding'), 'the boarding stage');
      // Today's boarding film plays over it; a local skip shows the holding screen with the server's countdown (sheet 19).
      await page.waitFor("document.querySelector('.pregame-overlay .pregame-skip')", 'today\'s boarding film');
      await page.evaluate(tap('.pregame-overlay .pregame-skip'));
      await page.waitFor("!document.querySelector('.pregame-overlay')", 'the film skipped');
    },
    facts: s => ({ stage: /ms-boarding-stage/.test(s.component) && s.shell?.status === 'live', holding: /Round 1 in 0:0\d/.test(s.words), noSkip: !button(s, 'Skip') }) },
  'boarding-waiting': { from: 'boarding', steps: async page => {
      await page.evaluate(`${H}.advanceClock(9000)`);
      await page.waitFor("/Waiting for the ship/.test(document.querySelector('.planet-pregame-host').textContent)", 'the interval over');
    },
    facts: s => ({ waiting: /Starting Round 1/.test(s.words) && /Waiting for the ship/.test(s.words) }) },
};

/** The record so far, when this run adds to it: the same candidate, art and headers. */
async function earlier(candidate, artHead) {
  if (!only) return null;
  const record = await readFile(join(REVIEW, 'check.json'), 'utf8').then(JSON.parse).catch(() => null);
  const same = record && record.candidate?.commit === candidate.commit && record.candidate?.clean === candidate.clean
    && JSON.stringify(record.candidate?.dirty) === JSON.stringify(candidate.dirty) && record.art?.base === artHead && record.headersSha256 === sha256(JSON.stringify(HEADERS));
  return same ? record : null;
}

/** The states a run draws: every one, or those named with each one they continue from. */
const wanted = only && (() => {
  const set = new Set();
  for (const name of only) { if (!STATES[name]) throw new Error(`No state ${name}`); for (let n = name; n; n = STATES[n].from) set.add(n); }
  return set;
})();

const art = artBase();
const sourceCommit = git(REPO, 'rev-parse', 'HEAD');
const dirty = git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/pregame-connection');
const out = await bundle(art);
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
let failed = 0;
try {
  await mkdir(REVIEW, { recursive: true });
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
    const looks = {};
    let page = null;
    for (const [name, state] of Object.entries(STATES)) {
      if (wanted && !wanted.has(name)) continue;
      const result = { ok: false };
      try {
        if (!state.from) {
          if (page) await page.close();
          page = await openPage(browser, { width, height, scale: 2 });
          await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
          // Each state starts with no stored preferences, unless it gives its own.
          await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `${POLICY}if(!sessionStorage.getItem('__check')){localStorage.clear();${state.prefs ? `localStorage.setItem('mothership:planet:presentation-preferences',${JSON.stringify(JSON.stringify(state.prefs))});` : ''}sessionStorage.setItem('__check','1');}` });
          await page.goto(`${origin}/index.html?${state.url}&count=9&tuple=blackout`, H);
          await page.evaluate(`${H}.app.artReady`);
          await page.waitFor("document.documentElement.dataset.artSettled==='true'", 'the art settled');
        }
        await state.steps?.(page, looks);
        await sleep(700);
        const seen = await page.evaluate(LOOK);
        looks[name] = seen;
        for (const v of seen.violations) v.kind = await classify(out, v);
        const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
        const extra = await state.extra?.(page, seen) ?? {};
        const own = state.facts?.(seen, looks, extra) ?? {};
        const checks = {
          screen: !!seen.screen && seen.rootClass === 'planet-pregame' && !!seen.component,
          noOldView: seen.old === 0,
          policy: seen.violations.every(v => v.kind !== 'unexpected'),
          problems: problems.length === 0,
          ...Object.fromEntries(Object.entries(own).filter(([key]) => !key.startsWith('info'))),
        };
        const file = join(REVIEW, `${sizeKey}-${name}.jpg`);
        const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
        const bytes = Buffer.from(data, 'base64');
        await writeFile(file, bytes);
        const after = await state.after?.(page, seen) ?? {};
        Object.assign(checks, Object.fromEntries(Object.entries(after).filter(([key]) => !key.startsWith('info'))));
        const info = Object.fromEntries([...Object.entries(own), ...Object.entries(after)].filter(([key]) => key.startsWith('info')));
        Object.assign(result, { ok: Object.values(checks).every(Boolean), checks, ...(Object.keys(info).length ? { info } : {}),
          file: file.slice(REPO.length + 1), sha256: sha256(bytes), seen, ...(Object.keys(extra).length ? { extra } : {}), problems });
      } catch (error) {
        Object.assign(result, { error: String(error.message ?? error) });
      }
      if (!result.ok) failed += 1;
      results[`${sizeKey}/${name}`] = result;
      const bad = Object.entries(result.checks ?? {}).filter(([, ok]) => !ok).map(([key]) => key);
      console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${name}${result.error ? `: ${result.error}` : bad.length ? `: ${bad.join(', ')}` : ''}`);
    }
    if (page) await page.close();
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const candidate = { commit: sourceCommit, clean: dirty === '', dirty: dirty ? dirty.split('\n') : [] };
const before = await earlier(candidate, art.head);
if (before) console.log(`added to the record of ${Object.keys(before.captures).length} captures on the same candidate`);
const record = {
  tool: 'design/tools/pregame-connection-check.mjs',
  what: 'The Planet app\'s screens before the match drawn by Designer\'s pre-game components, in Frontend\'s phone harness (apps/game/dev/phone) built from the candidate below',
  candidate,
  art: { base: art.head, originMain: art.main, note: 'The harness\'s art plugins over a clean worktree of origin/main; the harness and its asset tooling are byte for byte that commit\'s' },
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels, focus emulated, no safe areas; the harness bundled by Vite and served with the production headers below. Not a phone, not Safari, not a live match.',
  headers: HEADERS, headersSha256: sha256(JSON.stringify(HEADERS)),
  captures: Object.fromEntries(Object.entries({ ...before?.captures, ...results }).sort(([a], [b]) => a.localeCompare(b))),
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const all = Object.values(record.captures), passed = all.filter(r => r.ok).length;
console.log(`this run: ${Object.values(results).filter(r => r.ok).length} of ${Object.keys(results).length} passed; the record: ${passed} of ${all.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
