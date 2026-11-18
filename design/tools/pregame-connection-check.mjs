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
/**
 * A fresh match at Round 1's Before turns, begun `ago` ms before the server's now: the harness's running board,
 * at Round 1 (the board finalized through round 0, its shared checkpoint the match's first), as a phone meets it after
 * boarding. Its game is new, so the
 * controller's first view is Round 1 (it refuses a round that goes back).
 */
const roundOne = ago => `(async () => { const h = ${H}, now = h.now(), next = h.fixture('board'), p = next.playerView; p.round = 1; p.board.finalizedRound = 0; p.navigation.lastMovedRound = 0; if (p.board.checkpoint !== undefined) p.board.checkpoint = 'INITIAL';
  p.phase = { id: 'planet-phase-round-1', kind: 'PRE_TURN', startedAt: now - ${ago}, endsAt: now - ${ago} + 15000 }; next.publicView = h.publicPlanet(p); await h.replace(next); })()`;
/** The next round's Before turns, as the server moves on. */
const roundTwo = serve$("const p=v.playerView;p.round=2;p.board.finalizedRound=1;p.navigation.lastMovedRound=1;if(p.board.checkpoint!==undefined)p.board.checkpoint='ROUND_FINALIZED';p.phase={id:'planet-phase-round-2',kind:'PRE_TURN',startedAt:now-150,endsAt:now-150+15000};p.viewRevision+=1;v.publicView=h.publicPlanet(p)");
const SCREEN = name => `document.querySelector('.planet-pregame-host')?.dataset.screen===${JSON.stringify(name)}`;
const BOARDING_SETUP = "v.status='boarding';v.privateRole=v.playerView=v.publicView=null;v.members=v.members.map(m=>({...m,ready:true}));v.setup={id:'phone-boarding',startedAt:now-1000,endsAt:now+9000}";
const BOARDING_VIEW = name => `document.querySelector('.ms-boarding-stage')?.dataset.view===${JSON.stringify(name)}`;
const BOARDING_PLAYING = BOARDING_VIEW('film') + "&&!!document.querySelector('.ms-bst-picture svg')";
const BOARDING = `(() => {
  const stage = document.querySelector('.ms-boarding-stage'), session = ${SESSION}.getModel();
  const skip = stage?.querySelector('[data-intent=skip]');
  const picture = stage?.querySelector('.ms-bst-picture');
  const svg = picture?.querySelectorAll(':scope > svg, :scope > .pregame-picture > svg');
  return {
    view: stage?.dataset.view, status: stage?.dataset.status, motion: stage?.dataset.motion,
    svg: svg?.length ?? 0, heldPicture: !!picture?.querySelector(':scope > .pregame-picture > svg'),
    pictureHiddenFromReaders: picture?.getAttribute('aria-hidden') === 'true',
    overlay: !!document.querySelector('.pregame-overlay'), inert: document.querySelector('#planet-root').inert,
    offeredSkip: !!skip && !skip.hidden && skip.getAttribute('aria-disabled') !== 'true', focused: document.activeElement === stage,
    skipVisible: !!skip?.getClientRects().length,
    display: ${H}.value.admission?.kind === 'display' && ${H}.value.admission.status === 'admitted'
      && !session.selfSeatId && !session.pendingAdmission && session.status === 'boarding',
    elapsed: session.setup && session.setupClock.status === 'synced' ? session.setupClock.serverNowMs - session.setup.startedAt : null,
    endsAt: session.setup?.endsAt ?? null, game: !!${H}.app.game, privateRole: !!session.ownRole,
    dismissed: sessionStorage.getItem('mothership:planet:films-seen'),
  };
})()`;

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
    // The library art switched on for the match's pins (art.mjs), and each portrait on the screen drawing a picture.
    art: document.documentElement.dataset.art ?? '',
    portraits: host ? [...host.querySelectorAll('.ms-k-pt:not(.ms-k-pt-empty)')].filter(n => n.getClientRects().length).map(n => getComputedStyle(n).backgroundImage !== 'none') : [],
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

/** In the match (part 8): the shell's open sheet, its words and controls, the code's card, the toast and the focus. */
const SHEET = `(() => {
  const sheet = document.querySelector('.ms-phone-shell .ms-ps-sheet');
  const text = n => n ? n.textContent.replace(/\\s+/g, ' ').trim() : null;
  const reason = n => (id => id ? text(document.getElementById(id)) : null)(n.getAttribute('aria-describedby'));
  const control = n => ({ label: n.getAttribute('aria-label') ?? text(n), intent: n.dataset.intent ?? null, value: n.dataset.value ?? null,
    disabled: n.getAttribute('aria-disabled') === 'true' || !!n.disabled, busy: n.getAttribute('aria-busy') === 'true', reason: reason(n) });
  const title = sheet?.querySelector('.ms-ps-sheet-title');
  return {
    open: !!sheet, title: text(title?.firstChild), sub: text(title?.lastChild) || null, words: (text(sheet?.querySelector('.ms-ps-sheet-body')) ?? '').slice(0, 500),
    controls: sheet ? [...sheet.querySelectorAll('[data-intent]')].filter(n => n.getClientRects().length).map(control) : [],
    settings: !!sheet?.querySelector('.ms-settings-sheet'), host: !!sheet?.querySelector('.ms-host-controls'),
    card: text(sheet?.querySelector('.ms-hc-card-label')), matchId: text(sheet?.querySelector('.ms-hc-match-id')), code: text(sheet?.querySelector('.ms-hc-code')),
    revealed: sheet?.querySelector('.ms-hc-code')?.hasAttribute('data-revealed') ?? null,
    toast: text(document.querySelector('.ms-phone-shell .ms-ps-toast')),
    focus: document.activeElement?.dataset?.intent ?? null, focusValue: document.activeElement?.dataset?.value ?? null,
    // In the markup or the text: since host-controls 0.1.2 the code is drawn in groups, whole only in the text.
    secretInPage: document.documentElement.outerHTML.includes('SYNTHETIC-RECOVERY-CODE') || document.body.textContent.includes('SYNTHETIC-RECOVERY-CODE'),
    // host-controls 0.1.2: the code's and the Match ID's groups, the lines they take, a group over two lines, a line past its box.
    wrap: [['code', '.ms-hc-code'], ['matchId', '.ms-hc-match-id']].reduce((o, [key, sel]) => { const n = sheet?.querySelector(sel);
      if (!n || !n.getClientRects().length) { o[key] = null; return o; }
      const g = [...n.querySelectorAll(':scope > .ms-hc-group')];
      o[key] = { groups: g.map(e => e.textContent), lines: new Set(g.map(e => Math.round(e.getBoundingClientRect().top))).size,
        split: g.filter(e => e.getClientRects().length !== 1).length, overflow: n.scrollWidth > n.clientWidth + 0.5 }; return o; }, {}),
    old: document.querySelectorAll('.planet-display-settings, .planet-recovery-secret, #planet-issued-match-id, #planet-issued-recovery-code').length
      + [...document.querySelectorAll('button')].filter(b => /^(Issue recovery for|Check server deadline|Run eligible bots|Confirm abort|Reveal recovery code|Retry original session)/.test(b.textContent)).length,
    sent: (window.planetHarness?.requests ?? []).filter(r => !['read', 'receipt', 'command'].includes(r.operation)).map(r => r.operation + (r.seatId ? ':' + r.seatId : '')),
    fontSize: getComputedStyle(document.documentElement).fontSize, matchIdOfSession: window.planetHarness?.app.session.getModel().matchId ?? null,
  };
})()`;
/** host-controls 0.1.2: the code and the Match ID drawn in their groups, each whole, nothing past the card. */
const wholeGroups = x => ['code', 'matchId'].every(k => x.wrap?.[k] && x.wrap[k].groups.length > 0 && x.wrap[k].split === 0 && !x.wrap[k].overflow);
const sheetSays = (x, intent, value = null) => x.controls.find(c => c.intent === intent && (value === null || c.value === String(value)));
const offered = (x, intent, value = null) => !!sheetSays(x, intent, value) && !sheetSays(x, intent, value).disabled;
const MASK = '•••••• •••••• •••••• •••••• ••••••';
/** The host in the running match: the harness's board, this phone the host, with three human seats for a code. */
const asHost = serve$("v.isHost=true;for(const n of [0,2])v.members[n].controller='human'");
/** A redraw of the renderer's sheet: the server's next view of the same phase. */
const redraw = serve$("v.playerView.viewRevision+=1;v.publicView=h.publicPlanet(v.playerView)");

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
      // Sheet 12's Empty state: Ask to join is unavailable until the draft makes a request.
      await page.evaluate("window.__askEmpty=[...document.querySelectorAll('.planet-pregame-host button')].find(b=>/Ask to join/.test(b.textContent))?.getAttribute('aria-disabled')==='true'");
      // Typed as a person types: the draft takes the room code's capitals, and the name's count follows.
      await page.evaluate(type('.planet-pregame-host input:not([type="password"])', 'planet'));
      await page.evaluate(type('.planet-pregame-host input[autocomplete="nickname"]', 'Dev'));
      await page.waitFor("[...document.querySelectorAll('.planet-pregame-host input')].some(i=>i.value==='Dev')", 'the name typed');
    },
    facts: s => ({ form: /ms-join-form/.test(s.component) && /Join a room/.test(s.words), code: s.inputs.some(i => i.value === 'PLANET'), count: /3\/12/.test(s.words),
      ask: !!button(s, 'Ask to join') && !button(s, 'Ask to join').disabled, device: /Player phone/.test(s.words) && /Shared display/.test(s.words), nothingSent: s.sent.length === 0 }),
    after: async page => ({ askUnavailableWhenEmpty: await page.evaluate('window.__askEmpty===true') }) },
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
      offered: s.buttons.some(b => b.intent === 'choose' && !b.disabled), clock: /\d:\d\d/.test(s.words),
      portraits: s.portraits.length >= 9 && s.portraits.every(Boolean), art: s.art.length > 0 }),
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
    // As last seen: the grid, and its pictures. The session withholds the match's data, so the art stays on the last
    // pins this app saw for the same match (the Lead, 17 November): the nine cells' and the foot's portraits draw.
    facts: (s, looks) => ({ stale: s.shell?.status === 'stale' && /Connection lost/.test(s.shell.banner ?? ''), keptGrid: s.buttons.filter(b => b.intent === 'choose').length === 9 && /Nova/.test(s.words),
      portraitsKept: s.portraits.length === 10 && s.portraits.every(Boolean), artKept: s.art.length > 0 && s.art === looks.characters?.art }),
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
      await page.evaluate(serve$(BOARDING_SETUP));
      await page.waitFor(BOARDING_PLAYING, 'the released boarding SVG in the stage');
    },
    extra: page => page.evaluate(BOARDING),
    facts: (s, looks, x) => ({ stage: x.status === 'live' && x.view === 'film' && x.svg === 1 && x.pictureHiddenFromReaders,
      oneSkip: x.offeredSkip && s.buttons.filter(b => b.intent === 'skip').length === 1, singleSurface: !x.overlay && !x.inert, publicFilm: !x.privateRole }),
    after: async page => {
      const retainedSkip = await page.evaluate(`(() => {
        const skip = document.querySelector('.ms-boarding-stage [data-intent=skip]');
        skip.focus(); return document.activeElement === skip;
      })()`);
      return { keyboardCanFocusSkip: retainedSkip };
    } },
  'boarding-skipped': { from: 'boarding', steps: async page => {
      const point = await page.evaluate(`(() => {
        const skip = document.querySelector('.ms-boarding-stage [data-intent=skip]');
        const r = skip.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
        if (!skip.contains(document.elementFromPoint(x, y))) throw Error('The stage Skip is covered');
        return { x, y };
      })()`);
      await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitFor(BOARDING_VIEW('holding') + "&&!document.querySelector('.ms-bst-picture svg')", 'local Skip returns to holding');
      await page.evaluate(`${SESSION}.refresh()`);
    },
    extra: page => page.evaluate(BOARDING),
    facts: (s, looks, x) => ({ holding: /Round 1 in 0:0\d/.test(s.words), noSkip: !x.skipVisible,
      localOnly: s.model?.status === 'boarding' && s.sent.length === 0 && !x.game && !!x.dismissed,
      focusReturned: x.focused && !x.overlay }) },
  'boarding-waiting': { from: 'boarding-skipped', steps: async page => {
      await page.evaluate(`${H}.advanceClock(11000)`);
      await page.waitFor("/Waiting for the ship/.test(document.querySelector('.planet-pregame-host').textContent)", 'the interval over');
    },
    extra: page => page.evaluate(BOARDING),
    facts: (s, looks, x) => ({ waiting: x.view === 'waiting' && /Starting Round 1/.test(s.words) && /Waiting for the ship/.test(s.words), serverStillBoarding: !x.game }),
    after: async page => {
      await page.evaluate(roundOne(150));
      await page.waitFor(`!document.querySelector('.ms-boarding-stage')&&${H}.app.game?.getModel().surface==='player'&&${H}.app.game?.getModel().connection==='live'`, 'the player shell after the server starts');
      return { disposedOnStart: true };
    } },
  'boarding-display': { url: 'scenario=join&flow=3', steps: async page => {
      await page.waitFor(SCREEN('menu') + "&&!document.querySelector('.pregame-overlay')", 'the menu after intro');
      await page.evaluate(tap('.planet-pregame-host [data-intent="join"]'));
      await page.waitFor(SCREEN('join'), 'the Join form');
      await page.evaluate(type('.planet-pregame-host input:not([autocomplete="nickname"])', 'PLANET'));
      await page.evaluate(type('.planet-pregame-host input[autocomplete="nickname"]', 'Table view'));
      await page.evaluate(tap('.planet-pregame-host [data-intent=device][data-value=display]'));
      await page.evaluate(tap('.planet-pregame-host [data-intent=ask]'));
      await page.waitFor(`${SESSION}.getModel().pendingAdmission?.kind==='display'`, 'a real display admission intent');
      await page.evaluate(serve$("v.admission={...v.admission,status:'admitted'};v.members=h.fixture('display').members;" + BOARDING_SETUP));
      await page.waitFor(BOARDING_PLAYING, 'the admitted display plays in the canonical slot');
    },
    extra: page => page.evaluate(BOARDING),
    facts: (s, looks, x) => ({ admittedDisplay: x.display, singleSurface: x.svg === 1 && !x.overlay && !x.inert,
      noSkip: !x.offeredSkip && !x.skipVisible, publicFilm: !x.privateRole && !x.game }),
    after: async (page, seen) => {
      const before = await page.evaluate(BOARDING);
      await page.evaluate(tap('.ms-boarding-stage [data-intent=skip]'));
      const afterTap = await page.evaluate(BOARDING);
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor("document.querySelector('.ms-boarding-stage')?.dataset.status==='concealed'&&!document.querySelector('.ms-bst-picture svg')", 'concealed clears the picture');
      await page.evaluate(`${H}.setReadFailure(true);${H}.advanceClock(1500)`);
      await page.evaluate("delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor(`${SESSION}.getModel().connection==='stale'&&document.querySelector('.ms-phone-shell')?.dataset.status==='stale'&&!document.querySelector('.ms-bst-picture svg')`, 'reconnecting with no stale picture');
      await page.evaluate(`${H}.setReadFailure(false)`);
      await page.evaluate(tap('.ms-boarding-stage [data-intent=retry]'));
      await page.waitFor(BOARDING_PLAYING, 'the fresh display resumes boarding');
      const resumed = await page.evaluate(BOARDING);
      const after = await page.evaluate(LOOK);
      return { hiddenSkipRefused: afterTap.view === 'film' && afterTap.dismissed === before.dismissed,
        concealedCleared: true, staleCleared: true, retryRead: after.reads > seen.reads,
        sameServerWindow: resumed.endsAt === before.endsAt && resumed.elapsed > before.elapsed + 1200, stillPublic: resumed.display && !resumed.offeredSkip && !resumed.overlay };
    } },
  'boarding-display-waiting': { from: 'boarding-display', steps: async page => {
      await page.evaluate(`${H}.advanceClock(11000)`);
      await page.waitFor(BOARDING_VIEW('waiting') + "&&!document.querySelector('.ms-bst-picture svg')", 'display waits for the server');
    },
    extra: page => page.evaluate(BOARDING),
    facts: (s, looks, x) => ({ waited: x.display && !x.game && !x.skipVisible && /Waiting for the ship/.test(s.words) }),
    after: async page => {
      await page.evaluate(`(async()=>{const h=${H},next=h.fixture('display');next.admission=h.value.admission;await h.replace(next)})()`);
      await page.waitFor(`!document.querySelector('.ms-boarding-stage')&&${H}.app.game?.getModel().surface==='display'&&${H}.app.game?.getModel().connection==='live'`, 'the shared display after the server starts');
      return { disposedOnStart: await page.evaluate(`${H}.app.game.getModel().privateArea===null`) };
    } },
  'boarding-reduced': { url: 'scenario=reading&flow=2', prefs: { reduced: true, textScale: 1 }, steps: async page => {
      await page.evaluate(serve$(BOARDING_SETUP));
      await page.waitFor(BOARDING_PLAYING, 'the saved flow plays its released reduced still');
    },
    extra: page => page.evaluate(BOARDING),
    facts: (s, looks, x) => ({ savedFlow: x.view === 'film' && x.motion === 'reduced' && x.svg === 1 && x.heldPicture && !x.overlay,
      playerSkip: x.offeredSkip }) },
  'boarding-film-unavailable': { url: 'scenario=reading&flow=2&tuple=current', steps: async page => {
      await page.evaluate(serve$(BOARDING_SETUP));
      await page.waitFor(SCREEN('boarding') + '&&' + BOARDING_VIEW('holding'), 'saved artwork without boarding film');
    },
    extra: page => page.evaluate(BOARDING),
    facts: (s, looks, x) => ({ holding: x.view === 'holding' && /Round 1 in 0:0\d/.test(s.words), gated: x.svg === 0 && !x.overlay && !x.skipVisible }) },
  // Part 9: the round stamp (#288) on the shell's cover as Round 1's Before turns begins, by the shell connection's
  // moment and server clock (G18). From the role stage, the match starts at Round 1 begun 150 ms ago; the stamp is
  // caught running on the server's window, then held at 600 ms (standing) for the capture, as its own check holds it.
  'round-stamp': { url: 'scenario=reading', inMatch: true, steps: async page => {
      await page.waitFor(SCREEN('role'), 'the role stage, before the match');
      await page.evaluate(roundOne(150));
      try { await page.waitFor("(()=>{const a=document.querySelector('.ms-phone-shell .ms-round-stamp .ms-rs-mark')?.getAnimations()[0];return !!a&&a.playState==='running'})()", 'the stamp landing', 4000); }
      catch (error) { console.log('DIAG', JSON.stringify(await page.evaluate("(()=>{const g=window.planetHarness.app.game?.getModel?.();return {game:!!window.planetHarness.app.game,round:g?.round,phase:g?.phase?.kind,connection:g?.connection,message:window.planetHarness.app.session.getModel().message,stamp:document.querySelectorAll('.ms-round-stamp').length}})()"))); throw error; }
      await page.evaluate("(()=>{const a=document.querySelector('.ms-phone-shell .ms-round-stamp .ms-rs-mark').getAnimations()[0];window.__stamp={t:Number(a.currentTime),state:a.playState};a.pause();a.currentTime=600;return true;})()");
    },
    facts: s => ({ running: s.model?.status === 'running' && s.model.connection === 'live' }),
    after: async page => {
      const held = await page.evaluate(`(() => { const root = document.querySelector('.ms-phone-shell .ms-round-stamp'), mark = root?.querySelector('.ms-rs-mark');
        return { words: root?.textContent.replace(/\\s+/g, ' ').trim() ?? null, hidden: root?.getAttribute('aria-hidden'), taps: root ? getComputedStyle(root).pointerEvents : null,
          status: root?.dataset.status ?? null, opacity: mark ? Number(getComputedStyle(mark).opacity) : null, atMount: window.__stamp, count: document.querySelectorAll('.ms-round-stamp').length }; })()`);
      // Let it run on from 600 ms: it fades and goes by itself at 1,400 ms, and stays mounted while the window lasts.
      await page.evaluate("(()=>{const a=document.querySelector('.ms-round-stamp .ms-rs-mark').getAnimations()[0];a.play();return true;})()");
      await page.waitFor("document.querySelector('.ms-round-stamp .ms-rs-mark')?.getAnimations().length===0", 'the stamp gone by itself', 4000);
      const gone = await page.evaluate("(() => { const mark = document.querySelector('.ms-round-stamp .ms-rs-mark'); return { mounted: !!mark, opacity: Number(getComputedStyle(mark).opacity) }; })()");
      // Round 2: no moment, so the stamp is disposed.
      await page.evaluate(roundTwo);
      await page.waitFor("!document.querySelector('.ms-round-stamp')&&window.planetHarness.app.game?.getModel().round===2", 'the stamp disposed in Round 2', 4000);
      return { words: held.words === 'Round 1', ariaHidden: held.hidden === 'true', noTaps: held.taps === 'none', live: held.status === 'live', standing: held.opacity === 1, one: held.count === 1,
        onTheServersWindow: held.atMount?.state === 'running' && held.atMount.t >= 150 && held.atMount.t < 1400, atMountMs: Math.round(held.atMount?.t ?? -1),
        goneByItself: gone.mounted && gone.opacity < 0.05, disposedInRound2: true };
    } },
  // Reduce motion on (this phone's Display settings, stored): the stamp's Reduce motion form (round-stamp 0.1.0,
  // ROUND_STAMP_REDUCED): an 80 ms fade in, standing at its size with no scale or travel, an 80 ms fade out, gone at
  // 1,400 ms as the full form. Held at 600 ms for the capture; let go, it goes by itself; disposed in Round 2.
  'round-stamp-reduced': { url: 'scenario=reading', inMatch: true, prefs: { reduced: true, textScale: 1 }, steps: async page => {
      await page.waitFor(SCREEN('role'), 'the role stage, before the match');
      await page.evaluate(roundOne(150));
      await page.waitFor("(()=>{const a=document.querySelector('.ms-phone-shell .ms-round-stamp .ms-rs-mark')?.getAnimations()[0];return !!a&&a.playState==='running'})()", 'the stamp fading in', 4000);
      await page.evaluate("(()=>{const a=document.querySelector('.ms-phone-shell .ms-round-stamp .ms-rs-mark').getAnimations()[0];window.__stamp={t:Number(a.currentTime),state:a.playState,frames:a.effect.getKeyframes().map(k=>({offset:k.offset,opacity:k.opacity,transform:k.transform??null}))};a.pause();a.currentTime=600;return true;})()");
    },
    facts: s => ({ running: s.model?.status === 'running' && s.model.connection === 'live' }),
    after: async page => {
      const held = await page.evaluate(`(() => { const root = document.querySelector('.ms-phone-shell .ms-round-stamp'), mark = root?.querySelector('.ms-rs-mark');
        return { words: root?.textContent.replace(/\\s+/g, ' ').trim() ?? null, motion: root?.dataset.motion ?? null, html: document.documentElement.dataset.motion ?? null,
          opacity: mark ? Number(getComputedStyle(mark).opacity) : null, transform: mark ? getComputedStyle(mark).transform : null, atMount: window.__stamp, count: document.querySelectorAll('.ms-round-stamp').length }; })()`);
      await page.evaluate("(()=>{const a=document.querySelector('.ms-round-stamp .ms-rs-mark').getAnimations()[0];a.play();return true;})()");
      await page.waitFor("document.querySelector('.ms-round-stamp .ms-rs-mark')?.getAnimations().length===0", 'the stamp gone by itself', 4000);
      const gone = await page.evaluate("(() => { const mark = document.querySelector('.ms-round-stamp .ms-rs-mark'); return { mounted: !!mark, opacity: Number(getComputedStyle(mark).opacity) }; })()");
      await page.evaluate(roundTwo);
      await page.waitFor("!document.querySelector('.ms-round-stamp')&&window.planetHarness.app.game?.getModel().round===2", 'the stamp disposed in Round 2', 4000);
      const frames = held.atMount?.frames ?? [];
      return { words: held.words === 'Round 1', reduced: held.motion === 'reduced' && held.html === 'reduced', one: held.count === 1,
        // Its form: opacity only (no scale, no travel), whole between the fade in and the fade out.
        noScaleOrTravel: frames.length > 0 && frames.every(k => k.transform === null || k.transform === 'none') && (held.transform === 'none' || held.transform === 'matrix(1, 0, 0, 1, 0, 0)'),
        fades: frames[0]?.opacity === '0' && frames.at(-1)?.opacity === '0' && frames.some(k => k.opacity === '1' && Math.abs(k.offset - 80 / 1400) < 0.001),
        standing: held.opacity === 1, onTheServersWindow: held.atMount?.state === 'running' && held.atMount.t >= 150 && held.atMount.t < 1400, atMountMs: Math.round(held.atMount?.t ?? -1),
        goneByItself: gone.mounted && gone.opacity < 0.05, disposedInRound2: true };
    } },
  // A phone that arrives (or comes back, from Food's surface or a lock) after the stamp's length: Round 1's Before
  // turns began 5 s ago. The stamp is mounted for the window and draws nothing, and nothing runs.
  'round-stamp-late': { url: 'scenario=reading', inMatch: true, steps: async page => {
      await page.waitFor(SCREEN('role'), 'the role stage, before the match');
      await page.evaluate(roundOne(5000));
      await page.waitFor("!!document.querySelector('.ms-phone-shell .ms-round-stamp')&&window.planetHarness.app.game?.getModel().round===1", 'the late window mounted', 4000);
    },
    facts: s => ({ running: s.model?.status === 'running' && s.model.connection === 'live' }),
    after: async page => {
      const late = await page.evaluate("(() => { const mark = document.querySelector('.ms-round-stamp .ms-rs-mark'); return { animations: mark.getAnimations().length, opacity: Number(getComputedStyle(mark).opacity), count: document.querySelectorAll('.ms-round-stamp').length }; })()");
      return { mounted: late.count === 1, nothingDrawn: late.animations === 0 && late.opacity < 0.05 };
    } },
  // In the match (part 8): ⋮ opens Settings, Display settings' sheet content in the shell's sheet, with the host's row.
  settings: { url: 'scenario=board', inMatch: true, steps: async page => {
      await page.waitFor(`${H}.app.game?.getModel().connection==='live'&&!!document.querySelector('.ms-phone-shell .ms-ps-tb')`, 'the match\'s shell');
      await page.evaluate(asHost);
      await page.waitFor(`${SESSION}.getModel().isHost`, 'this phone the host');
      await page.evaluate(tap('.ms-ps-tb [data-intent="menu"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-settings-sheet')", 'the Settings sheet');
    },
    extra: page => page.evaluate(SHEET),
    facts: (s, looks, x) => ({ title: x.title === 'Settings', sheet: x.settings && !x.host, display: /Display/.test(x.words) && /Reduce motion/.test(x.words) && /Films become stills/.test(x.words),
      sizes: [1, 1.5, 2].every(v => !!sheetSays(x, 'text-size', v)), note: /These stay on this phone\. They never change the match\./.test(x.words),
      hostRow: /Host/.test(x.words) && offered(x, 'host-controls') && /Bots, deadlines, recovery, abort/.test(x.words), noOldControls: x.old === 0, nothingSent: x.sent.length === 0 }),
    after: async page => {
      // The text size is this phone's; a redraw of the sheet keeps the same element and the focus on Largest.
      await page.evaluate("(()=>{const r=document.querySelector('.ms-settings-sheet');r.dataset.checkMark='1';const b=r.querySelector('[data-intent=\"text-size\"][data-value=\"2\"]');b.focus();b.click();return true;})()");
      await page.waitFor("getComputedStyle(document.documentElement).fontSize==='32px'", 'the Largest text applied');
      await page.evaluate(redraw);
      await sleep(400);
      const kept = await page.evaluate(SHEET);
      const same = await page.evaluate("document.querySelectorAll('.ms-settings-sheet').length===1&&document.querySelector('.ms-settings-sheet').dataset.checkMark==='1'");
      await page.evaluate(tap('.ms-settings-sheet [data-intent="text-size"][data-value="1"]'));
      await page.waitFor("getComputedStyle(document.documentElement).fontSize==='16px'", 'the Standard text again');
      return { largest: kept.fontSize === '32px', stored: await page.evaluate("JSON.parse(localStorage.getItem('mothership:planet:presentation-preferences')).textScale===1"),
        oneInstance: same, focusKept: kept.focus === 'text-size' && kept.focusValue === '2' };
    } },
  'host-controls': { from: 'settings', inMatch: true, steps: async page => {
      await page.evaluate(tap('.ms-settings-sheet [data-intent="host-controls"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-host-controls')", 'Host controls');
    },
    extra: page => page.evaluate(SHEET),
    facts: (s, looks, x) => ({ title: x.title === 'Host controls', back: !!sheetSays(x, 'sheet-back'), close: !!sheetSays(x, 'sheet-close'),
      commands: offered(x, 'deadline') && offered(x, 'bots') && offered(x, 'abort-ask') && /Check the deadline/.test(x.words) && /Run bots/.test(x.words) && /Abort match/.test(x.words),
      seats: x.controls.filter(c => c.intent === 'issue-recovery').map(c => c.value).join() === '1,3,6' && /1 · Crew 1/.test(x.words) && /6 · Crew 6/.test(x.words) && /New code/.test(x.words),
      noCode: x.code === null && !x.secretInPage, noOldControls: x.old === 0 }),
    after: async page => {
      // Check the deadline: the session's advance, and its receipt in the shell's toast, in the session's words.
      await page.evaluate(tap('.ms-host-controls [data-intent="deadline"]'));
      await page.waitFor("!!document.querySelector('.ms-phone-shell .ms-ps-toast')&&/Request registered/.test(document.querySelector('.ms-phone-shell .ms-ps-toast').textContent)", 'the receipt', 4000);
      const x = await page.evaluate(SHEET);
      // The toast goes by itself before the next state, so it doesn't lie over that state's title.
      await page.waitFor("!document.querySelector('.ms-phone-shell .ms-ps-toast')", 'the toast gone', 6000);
      return { deadlineSent: x.sent.includes('advance'), receipt: x.toast === 'Request registered.' };
    } },
  'host-code': { from: 'host-controls', inMatch: true, steps: async page => {
      await page.evaluate(tap('.ms-host-controls [data-intent="issue-recovery"][data-value="6"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-hc-code')&&!document.querySelector('.ms-ps-sheet .ms-hc-card').hidden", 'the issued code\'s card', 4000);
    },
    extra: page => page.evaluate(SHEET),
    facts: (s, looks, x) => ({ title: x.title === 'Recovery code' && x.sub === 'Private to this phone', issued: x.sent.includes('issueRecovery:seat-6'),
      card: x.card === 'Recovery for Player 6 · Crew 6' && x.matchId === x.matchIdOfSession, masked: x.code === MASK && x.revealed === false && !x.secretInPage,
      note: /Show it only to Player 6\. It never appears on the shared display\./.test(x.words), noMinutes: !/Works once/.test(x.words),
      footer: offered(x, 'sheet-local', 'reveal') && offered(x, 'sheet-local', 'copy'),
      groups: wholeGroups(x) && x.wrap.code.groups.join(' ') === MASK, infoWrap: x.wrap }) },
  'host-code-revealed': { from: 'host-code', inMatch: true, steps: async page => {
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-local"][data-value="reveal"]'));
      await page.waitFor("document.querySelector('.ms-ps-sheet .ms-hc-code')?.hasAttribute('data-revealed')", 'the code revealed');
    },
    extra: page => page.evaluate(SHEET),
    facts: (s, looks, x) => ({ revealed: x.code === 'SYNTHETIC-RECOVERY-CODE' && x.revealed === true, footer: offered(x, 'sheet-local', 'hide') && offered(x, 'sheet-local', 'copy'),
      groups: wholeGroups(x) && x.wrap.code.groups.join('') === 'SYNTHETIC-RECOVERY-CODE', infoWrap: x.wrap }),
    after: async page => {
      // Copy: this phone's clipboard (the check's stand-in records it), and the pack's "Copied" in the shell's toast.
      await page.evaluate("(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copied=t;}}});return true;})()");
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-local"][data-value="copy"]'));
      await page.waitFor("document.querySelector('.ms-phone-shell .ms-ps-toast')?.textContent.trim()==='Copied'", 'Copied', 4000);
      const copied = await page.evaluate("window.__copied==='SYNTHETIC-RECOVERY-CODE'");
      await page.evaluate("delete window.__copied");
      // A copy the clipboard refuses: the code stays selectable while revealed, and the toast says so (the Lead, 17 November).
      await page.waitFor("!document.querySelector('.ms-phone-shell .ms-ps-toast')", 'the toast gone', 6000);
      await page.evaluate("(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('refused');}}});return true;})()");
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-local"][data-value="copy"]'));
      await page.waitFor("document.querySelector('.ms-phone-shell .ms-ps-toast')?.textContent.trim()==='Select the code to copy.'", 'the refused copy\'s words', 4000);
      const refusedCopy = await page.evaluate("document.querySelector('.ms-ps-sheet .ms-hc-code')?.hasAttribute('data-revealed')&&getComputedStyle(document.querySelector('.ms-ps-sheet .ms-hc-code')).userSelect!=='none'");
      await page.waitFor("!document.querySelector('.ms-phone-shell .ms-ps-toast')", 'the toast gone', 6000);
      // Hide: the dots again, and the code leaves the page; Back: the list, with no card.
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-local"][data-value="hide"]'));
      await page.waitFor("!document.querySelector('.ms-ps-sheet .ms-hc-code')?.hasAttribute('data-revealed')", 'the code hidden');
      const hidden = await page.evaluate(SHEET);
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-back"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-host-controls [data-intent=\"deadline\"]')", 'back to the list');
      const list = await page.evaluate(SHEET);
      // Keep the old body long enough to check that dismissal erases it as well as removing it from the page.
      async function checkDismissal(dismiss, resume) {
        await page.evaluate(tap('.ms-host-controls [data-intent="issue-recovery"][data-value="6"]'));
        await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-hc-card:not([hidden])')", 'a new code card');
        await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-local"][data-value="reveal"]'));
        await page.waitFor("document.querySelector('.ms-ps-sheet .ms-hc-code')?.textContent==='SYNTHETIC-RECOVERY-CODE'", 'the new code revealed');
        await page.evaluate("window.__hostBodyToCheck=document.querySelector('.ms-ps-sheet .ms-host-controls')");
        await dismiss();
        await page.waitFor("!document.querySelector('.ms-ps-sheet .ms-host-controls')", 'Host controls dismissed');
        const cleared = await page.evaluate("!window.__hostBodyToCheck.isConnected&&!window.__hostBodyToCheck.textContent.includes('SYNTHETIC-RECOVERY-CODE')");
        await resume?.();
        await page.evaluate(tap('.ms-ps-tb [data-intent="menu"]'));
        await page.evaluate(tap('.ms-settings-sheet [data-intent="host-controls"]'));
        await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-host-controls [data-intent=deadline]')", 'the reopened Host controls list');
        const remounted = await page.evaluate(`(() => {
          const next = document.querySelector('.ms-ps-sheet .ms-host-controls');
          const fresh = next !== window.__hostBodyToCheck && !next.textContent.includes('SYNTHETIC-RECOVERY-CODE');
          delete window.__hostBodyToCheck;
          return fresh;
        })()`);
        return cleared && remounted;
      }
      const closedCodeCleared = await checkDismissal(() => page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-close"]')));
      const concealedCodeCleared = await checkDismissal(
        () => page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))"),
        async () => {
          await page.evaluate("delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))");
          await page.waitFor(`${SESSION}.getModel().status==='running'&&${H}.app.game?.getModel().connection==='live'`, 'the fresh host view');
        });
      return { copied, toast: true, refusedCopy, hidden: hidden.code === MASK && !hidden.secretInPage,
        backToList: list.title === 'Host controls' && list.code === null && !list.secretInPage, closedCodeCleared, concealedCodeCleared };
    } },
  'host-abort': { from: 'host-code-revealed', inMatch: true, steps: async page => {
      await page.evaluate(tap('.ms-host-controls [data-intent="abort-ask"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-hc-confirm')", 'the abort\'s confirm');
    },
    extra: page => page.evaluate(SHEET),
    facts: (s, looks, x) => ({ title: x.title === 'Host controls', confirm: /Abort the match\?/.test(x.words) && /It ends now for everyone, with no winner\./.test(x.words),
      footer: offered(x, 'sheet-local', 'keep') && offered(x, 'sheet-action', 'abort'), notSent: !x.sent.includes('abort') }),
    after: async page => {
      // Keep playing goes back to the list; the confirm's Abort match sends the session's abort.
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-local"][data-value="keep"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-host-controls [data-intent=\"deadline\"]')", 'the list again');
      const kept = await page.evaluate(SHEET);
      await page.evaluate(tap('.ms-host-controls [data-intent="abort-ask"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-hc-confirm')", 'the confirm again');
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-action"][data-value="abort"]'));
      await page.waitFor(`${H}.requests.some(r=>r.operation==='abort')`, 'the abort sent', 4000);
      // Close: the sheet closes; ⋮ opens Settings again, not Host controls.
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-close"]'));
      await page.waitFor("!document.querySelector('.ms-ps-sheet .ms-host-controls')", 'the sheet closed');
      await page.evaluate(tap('.ms-ps-tb [data-intent="menu"]'));
      await page.waitFor("!!document.querySelector('.ms-ps-sheet .ms-settings-sheet')", 'Settings again');
      const again = await page.evaluate(SHEET);
      return { keepBack: !kept.sent.includes('abort') && kept.title === 'Host controls', abortSent: true, reopensSettings: again.settings && !again.host && again.title === 'Settings' };
    } },
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
          // A pre-game state shows one of the connection's screens; an in-match state (the round stamp) none, the match's own.
          screen: state.inMatch ? seen.screen === null && seen.rootClass === 'planet-container' : !!seen.screen && seen.rootClass === 'planet-pregame' && !!seen.component,
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
