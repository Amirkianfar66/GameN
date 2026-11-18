// mothership:dev-only
//
// The shell connection's check (docs/design/components/shell-connection.md): the Planet app's match frame
// drawn by Designer's phone shell (design/phone-ui/components/phone-shell), release 2 of the owner's plan of
// 16 November 2026. It bundles Frontend's two harnesses from this tree, with the art they take from a clean
// worktree of origin/main, as room-connection-check.mjs does:
//   index.html      the phone harness (apps/game/dev/phone): the real Planet app, controller and renderer
//   food/app.html   the Food harness (apps/game/dev/phone/food): the same app on the frozen Food release's packets
// and serves them with the hosted game's production response headers (scripts/hosted-preview-policy.mjs,
// the Content Security Policy included). It drives the real app at 390 × 844 and 430 × 932, in desktop
// Chromium at 2× pixels:
//   turn, own                another player's turn; your turn, Pass ready
//   pass                     "Pass your turn?" (then Pass sends PASS_TURN and its registration shows once)
//   actions                  the Actions sheet: the game's own body in the shell's frame (with release 3, #310, Actions' part)
//   target                   the target bar with Cancel (the Officer's block)
//   closed                   a phase that closed under an open choice: the toast at 0:00 (then no second one)
//   reconnecting, eliminated the two banners (Retry reads the session again)
//   vote, ballot, voted      the round button as Vote; the ballot's sheet; then Voted
//   result                   the 5 s result: the ring, no Promises, the round button as Vote, unavailable, and the
//                            game's result window in the shell's cover, under a sheet opened from ⋮
//   talk                     a private talk: the pair bar and the talk's two buttons
//   food-gauge, food-surface the Food release's gauge beside the clock; Food's own surface over the shell
//   blackout                 the Blackout's dark bar
//   before, appointment,     the phase bars (shell 0.2.10, phase-bars.mjs): before turns; the Officer's appointment,
//   course                   everyone's bar and then the Captain's own; setting course, everyone's and then an office's own
//   display, concealed       a shared display (no tabs or Promises; ⋮ opens Settings); a hidden page
// A capture passes with no unexpected policy report, no failed request and no page error; the shell mounted with
// the stage in it and none of the old header, nav, sheet or target bar left; and the state's own facts. It writes
// design/phone-ui/review/shell-connection/: one JPEG per state and size, and check.json (the headers and their
// SHA-256, the candidate and art commits, what each capture saw and its SHA-256).
//   GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/shell-connection-check.mjs [--only a,b] [--keep]
// One browser draws every capture, one page at a time. --only draws some states (a state another continues from
// is drawn with it); a run with --only adds its captures to check.json when that record names the same candidate,
// art and headers, so a record can be made in batches. Any other run starts a new record.
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size, with no safe areas:
// not a phone, not Safari, not a live match, not multiplayer.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
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
const REVIEW = join(REPO, 'design/phone-ui/review/shell-connection');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
const PROJECT = 'gamen-mothership-staging';
const HEADERS = createHostedPreviewHeaders(PROJECT);
// The asset tooling the harnesses serve their art with: it must be main's, so the art is main's too.
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

/** The Food harness's own static candidates (apps/game/dev/phone/food-vite.config.mjs), checked against their adoption record. */
function foodCandidates() {
  const manifest = JSON.parse(readFileSync(join(REPO, 'docs/frontend/food-supply-art-adoption.json'), 'utf8'));
  return { name: 'shell-check-food-candidates', generateBundle() {
    for (const output of manifest.outputs) {
      const bytes = readFileSync(join(REPO, output.source));
      if (sha256(bytes) !== output.sha256 || bytes.length !== output.bytes) throw new Error(`Food static candidate differs: ${output.source}`);
      this.emitFile({ type: 'asset', fileName: `art/food-supply/${output.source.split('/assets/')[1]}`, source: bytes });
    }
  } };
}

async function bundle(art) {
  const out = await mkdtemp(join(tmpdir(), 'shell-connection-check-'));
  // The harnesses' own entries with their art plugins over the baseline's art; the candidate's code is this tree.
  await build({
    root: join(REPO, 'apps/game/dev/phone'), configFile: false, publicDir: false, logLevel: 'warn',
    plugins: [comicAssetsPlugin(art.root), planetLibraryAssetsPlugin(art.root), crewDrawingAssetsPlugin(art.root), pregameAssetsPlugin(art.root), foodCandidates()],
    build: { target: 'es2022', cssMinify: false, outDir: out, emptyOutDir: true, sourcemap: false,
      rollupOptions: { input: { phone: join(REPO, 'apps/game/dev/phone/index.html'), food: join(REPO, 'apps/game/dev/phone/food/app.html') } } },
  });
  // What phone-ui-native-compare.mjs reads to name the build it compares (as the harness's own build writes it).
  await writeFile(join(out, 'review-provenance.json'), `${JSON.stringify({
    scope: 'The phone and Food harnesses built by design/tools/shell-connection-check.mjs: the candidate\'s native modules, with art from a clean worktree of origin/main',
    candidate: { root: REPO, head: git(REPO, 'rev-parse', 'HEAD'), dirty: !!git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/shell-connection') },
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

const POLICY = 'window.__policy = []; document.addEventListener("securitypolicyviolation", e => window.__policy.push({ directive: e.violatedDirective, blocked: String(e.blockedURI), source: String(e.sourceFile).replace(location.origin + "/", ""), line: e.lineNumber, column: e.columnNumber }));';
const APP = '(window.planetHarness ?? window.foodAppHarness)?.app';
const game = `${APP}.game`;
const LIVE = `${game}?.getModel().connection==='live'&&${game}.getModel().phase?.trusted`;
// Edits the phone harness's authoritative value: the player's view and its public view, one revision on.
const edit = body => `(async()=>{const h=window.planetHarness,v=structuredClone(h.value),p=v.playerView,now=h.now();p.viewRevision++;${body};v.publicView=h.publicPlanet(p);await h.replace(v);})()`;
const tap = selector => `document.querySelector(${JSON.stringify(selector)}).click()`;
const TAB = value => `.ms-ps-tabs [data-intent="tab"][data-value="${value}"]`;
const HERO = '.ms-ps-tabs [data-intent="hero"]';

/** What the phone shows now: the shell's parts, what is left of the old chrome, the stage, Food's surface and the app's model. */
const LOOK = `(() => {
  const shell = document.querySelector('.ms-phone-shell');
  const q = (s, r = shell) => r ? r.querySelector(s) : null, all = (s, r = shell) => r ? [...r.querySelectorAll(s)] : [];
  const box = n => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100, width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 }; };
  const text = n => n ? n.textContent.replace(/\\s+/g, ' ').trim() : null;
  const control = b => ({ intent: b.dataset.intent, value: b.dataset.value ?? null, label: b.getAttribute('aria-label') ?? text(b), expanded: b.getAttribute('aria-expanded'), disabled: b.getAttribute('aria-disabled') === 'true', busy: b.getAttribute('aria-busy') === 'true', box: box(b) });
  const bar = q('.ms-ps-tb'), tabs = q('.ms-ps-tabs'), talk = q('.ms-ps-talk'), hero = q('.ms-ps-hero'), sheet = q('.ms-ps-sheet'), target = q('.ms-ps-target'), banner = q('.ms-ps-banner');
  const harness = window.planetHarness ?? window.foodAppHarness, model = harness?.app.game?.getModel() ?? null;
  return {
    shell: shell ? { status: shell.dataset.status, tabs: shell.dataset.tabs, bar: shell.dataset.bar, focusInside: shell.contains(document.activeElement), box: box(shell) } : null,
    bar: bar ? { kind: bar.dataset.kind, tone: bar.getAttribute('data-tone'), hidden: bar.getAttribute('aria-hidden') === 'true', name: text(q('.ms-ps-name', bar)), sub: text(q('.ms-ps-sub', bar)),
      glyph: q('.ms-ps-glyph', bar)?.getAttribute('data-tone') ?? (q('.ms-ps-glyph', bar) ? 'plain' : null), portrait: !!q('.ms-ps-pt', bar), round: text(q('.ms-ps-round', bar)), clock: text(q('.ms-ps-timer', bar)),
      urgent: !!q('.ms-ps-timer[data-urgent]', bar), ring: !!q('.ms-ps-ring', bar), promises: q('.ms-ps-promises', bar)?.getAttribute('aria-label') ?? null, menu: !!q('.ms-ps-menu', bar),
      gauge: q('.ms-ps-slot .fs-food', bar)?.getAttribute('aria-label') ?? null, controls: all('button', bar).length, box: box(bar) } : null,
    tabs: tabs ? { hidden: tabs.getAttribute('aria-hidden') === 'true', buttons: all('button[data-intent]', tabs).map(control), box: box(tabs),
      // Shell 0.3.0: the Card tab's picture, this viewer's own crew portrait: whether it is drawn, with which picture, and its box.
      // Shell 0.3.2: the portrait is the tab's picture that is not a painted tile; with no portrait the tab draws the card's tile.
      card: (() => { const tab = q('[data-intent="tab"][data-value="card"]', tabs), pt = tab ? q('.ms-ps-tab-pt:not([data-tile])', tab) : null; return tab ? { tile: !!q('.ms-ps-tab-pt[data-tile] svg', tab), portrait: !!pt, picture: pt ? getComputedStyle(pt).backgroundImage !== 'none' : null, property: pt ? (/--ms-asset-[a-z0-9-]+/.exec(pt.style.backgroundImage)?.[0] ?? null) : null, size: pt ? [pt.getBoundingClientRect().width, pt.getBoundingClientRect().height] : null, icon: !!q('svg', tab), words: text(q('.ms-ps-tab-label', tab)), name: tab.getAttribute('aria-label') } : null; })(),
      // Shell 0.3.2: each game tab's painted tile (which icon, its box, whether the open tab's ring lies over it) and the round button's icon.
      tiles: all('.ms-ps-tab[data-intent="tab"]', tabs).map(tab => { const pt = q('.ms-ps-tab-pt[data-tile]', tab), r = pt ? pt.getBoundingClientRect() : null;
        return { tab: tab.dataset.value, icon: q('.ms-ps-tab-icon', tab)?.dataset.icon ?? null, tile: !!(pt && q('svg', pt)), size: r ? [r.width, r.height] : null, ring: pt ? getComputedStyle(pt, '::after').boxShadow !== 'none' : null }; }),
      heroIcon: q('.ms-ps-hero-icon', tabs)?.dataset.icon ?? null } : null,
    talk: talk ? all('button[data-intent]', talk).map(control) : null,
    hero: hero ? { mode: hero.dataset.mode, ...control(hero) } : null,
    target: target ? { title: text(q('.ms-ps-text b', target)), sub: text(q('.ms-ps-text span', target)), cancel: q('[data-intent="cancel-target"]', target) ? control(q('[data-intent="cancel-target"]', target)) : null, box: box(target) } : null,
    chip: q('.ms-ps-chip') ? control(q('.ms-ps-chip button')) : null,
    banner: banner ? { kind: banner.dataset.kind, title: text(q('.ms-ps-text b', banner)), sub: text(q('.ms-ps-text span', banner)), retry: q('[data-intent="retry"]', banner) ? control(q('[data-intent="retry"]', banner)) : null, box: box(banner) } : null,
    toast: text(q('.ms-ps-toast')),
    result: (() => { const r = document.querySelector('.planet-result'); return r && !r.hidden ? { inCover: !!r.closest('.ms-ps-cover'), text: text(r).slice(0, 160), box: box(r) } : null; })(),
    sheet: sheet ? { id: sheet.dataset.sheet, title: text(q('.ms-ps-sheet-title h2', sheet)), sub: q('.ms-ps-sheet-title p', sheet)?.hidden ? null : text(q('.ms-ps-sheet-title p', sheet)),
      back: !!q('[data-intent="sheet-back"]', sheet), close: !!q('[data-intent="sheet-close"]', sheet), foot: all('.ms-ps-sheet-foot button', sheet).map(control),
      body: { game: !!q('.ms-ps-sheet-body > .planet-sheet-body', sheet), part: !!q('.ms-ps-sheet-body > .ms-actions', sheet), buttons: all('.planet-sheet-body button', sheet).map(b => b.id || text(b)).slice(0, 12),
        tiles: all('.ms-ps-sheet-body > .ms-actions [data-intent="tile"]', sheet).map(b => b.dataset.value), text: (text(q('.planet-sheet-body', sheet)) ?? '').slice(0, 200) }, box: box(sheet) } : null,
    stage: { inShell: !!document.querySelector('.ms-ps-stage > .planet-stage'), scene: document.querySelector('.planet-stage .ms-room-scene')?.dataset.room ?? null, view: document.querySelector('.planet-stage')?.dataset.view ?? null, box: box(q('.ms-ps-stage')),
      presses: [...document.querySelectorAll('.planet-stage .ms-rs-press')].map(p => p.dataset.value) },
    old: document.querySelectorAll('.planet-header:not(.planet-bar-measure), .planet-nav, #planet-pass, .planet-sheet, .planet-target-bar, #planet-top-promises, #planet-top-settings').length,
    status: (() => { const s = document.querySelector('.planet-status'); return s && !s.hidden ? text(s) : null; })(),
    food: { chrome: document.querySelector('.planet-app')?.dataset.foodChrome ?? null, bar: box([...document.querySelectorAll('.planet-food .tb')].find(n => n.getClientRects().length)), tabs: box([...document.querySelectorAll('.planet-food .tabs')].find(n => n.getClientRects().length)),
      screens: [...document.querySelectorAll('.planet-food .sheet, .planet-food .fs-card')].filter(n => n.getClientRects().length).length },
    model: model ? { connection: model.connection, concealed: model.concealed, surface: model.surface, phase: model.phase?.kind ?? null, panel: model.panel, activeSeatId: model.activeSeatId, ownSeatId: model.ownSeatId,
      // How many public identities the model holds now: none in the dark and none without a current state (controller.ts).
      identities: model.identities?.length ?? null,
      canPass: model.canPass, canVote: model.canVote, round: model.round, action: model.action ? { type: model.action.type, step: model.action.step } : null, food: !!model.food } : null,
    commands: (window.planetHarness?.requests ?? window.foodAppHarness?.sent ?? []).filter(r => r.operation === 'command').map(r => r.request.command.type),
    reads: (window.planetHarness?.requests ?? []).filter(r => r.operation === 'read').length,
    violations: window.__policy,
  };
})()`;

/** What a tap at a point reaches: the element and whether it is the shell's, Food's or the stage's. */
const HIT = point => `(() => { const n = document.elementFromPoint(${point[0]}, ${point[1]}); return { tag: n?.tagName ?? null, shell: !!n?.closest('.ms-phone-shell') && !n.closest('.ms-ps-stage'), food: !!n?.closest('.planet-food'), stage: !!n?.closest('.ms-ps-stage') }; })()`;
const centre = b => [b.x + b.width / 2, b.y + b.height / 2];
const values = s => (s.tabs?.buttons ?? []).map(b => b.intent === 'hero' ? `hero:${b.value}` : b.value).join(',');
/** Shell 0.3.2: the game's tabs draw exactly these painted tiles, in order, each drawn in the portrait's 32 px box. */
const painted = (s, icons) => { const tiles = (s.tabs?.tiles ?? []).filter(t => t.tile); return tiles.map(t => t.icon).join() === icons.join() && tiles.every(t => t.size.join() === '32,32'); };

/**
 * Each state: the page and address it starts from (or `from`, the state it continues), the steps that reach it
 * before the capture, its own facts, and `after`: steps after the capture whose facts join its checks.
 */
const STATES = {
  turn: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate(edit("p.activeSeatId='seat-1';p.offers=p.offers.filter(o=>o.type!=='PASS_TURN')"));
      await page.waitFor(`${game}.getModel().activeSeatId==='seat-1'`, 'another player\'s turn');
    },
    facts: s => ({ turnBar: s.bar?.kind === 'turn' && s.bar.name === 'Crew 1' && s.bar.sub === 'Player 1 · Turn' && s.bar.portrait, clock: /^\d:\d\d$/.test(s.bar?.clock ?? ''), round: s.bar?.round === 'R6',
      promisesMenu: !!s.bar?.promises && s.bar.menu, tabs: values(s) === 'switch,actions,hero:pass,panels,card', passOff: s.hero?.mode === 'pass' && s.hero.disabled, live: s.shell?.status === 'live',
      // Shell 0.3.2 (the owner, 18 November 2026): Board, Actions and Panels are painted tiles in the portrait's 32 px box, with no ring at rest; the round button's icon is painted.
      tiles: painted(s, ['board:tile', 'actions:tile', 'panels:tile']) && s.tabs.tiles.every(t => !t.tile || t.ring === false) && s.tabs.heroIcon === 'pass:painted' }) },
  own: { page: 'phone', url: 'scenario=board',
    facts: s => ({ yourTurn: s.bar?.kind === 'turn' && s.bar.name === 'Your turn' && s.bar.sub === 'Player 6 · Crew 6', passOn: s.hero?.mode === 'pass' && !s.hero.disabled && s.model?.canPass === true,
      // Shell 0.3.0: Card is the last tab and draws this viewer's own portrait (Player 6's); the tab keeps its word.
      // Shell 0.3.1: at the top bar's 32 px.
      cardTab: values(s) === 'switch,actions,hero:pass,panels,card' && s.tabs.card?.portrait === true && s.tabs.card.picture === true && s.tabs.card.property === '--ms-asset-crew-portrait-c6' && s.tabs.card.size.join() === '32,32'
        && !s.tabs.card.icon && !s.tabs.card.tile && s.tabs.card.words === 'Card' && s.tabs.card.name === null,
      tiles: painted(s, ['board:tile', 'actions:tile', 'panels:tile']) && s.tabs.heroIcon === 'pass:painted',
      roomScene: s.stage.scene === 'room-b' && s.stage.view === 'room' }) },
  pass: { from: 'own', steps: async page => {
      await page.evaluate(tap(HERO));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='pass'", 'Pass your turn?');
    },
    facts: s => ({ sheet: s.sheet?.title === 'Pass your turn?' && !s.sheet.close && s.sheet.foot.map(b => b.label).join() === 'Cancel,Pass', confirmStep: s.model?.action?.type === 'PASS_TURN' && s.model.action.step === 'confirm',
      noCommandYet: s.commands.length === 0 }),
    after: async page => {
      // Both builds, #307's first: the game's Pass footer sends with confirm; release 3's (#310), Actions' Pass sheet, with its own pass.
      await page.evaluate(tap('.ms-ps-sheet-foot [data-value="confirm"], .ms-ps-sheet-foot [data-value="pass"]'));
      await page.waitFor(`${APP}.game.getModel().action?.step==='accepted'||document.querySelector('.ms-ps-toast')`, 'the pass registered', 8000);
      const seen = await page.evaluate(LOOK);
      return { passSent: seen.commands.join() === 'PASS_TURN', infoToast: seen.toast ?? '', sheetClosed: seen.sheet === null };
    } },
  actions: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='actions'", 'the Actions sheet');
    },
    // Both builds, #307's first: the game's own Actions body with its Scan button; release 3's (#310), Actions' part with its Scan tile.
    facts: s => ({ frame: s.sheet?.title === 'Actions' && s.sheet.close && (s.sheet.body.game || s.sheet.body.part),
      gameBody: s.sheet?.body.buttons.includes('planet-action-SCAN') || s.sheet?.body.tiles.includes('SCAN'),
      tabOpen: s.tabs?.buttons.find(b => b.value === 'actions')?.expanded === 'true', noControlUnder: !s.stage.presses.length }),
    after: async page => {
      // Escape from inside the sheet's body closes it, as today's; the shell hands the focus back, and it goes to the tab that opened it.
      await page.evaluate("document.querySelector('.ms-ps-sheet .planet-sheet-body button, .ms-ps-sheet .ms-actions button').focus()");
      for (const type of ['rawKeyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await page.waitFor("!document.querySelector('.ms-ps-sheet')", 'Escape closed Actions');
      await sleep(150);
      const focus = await page.evaluate('(() => { const a = document.activeElement; return a ? { intent: a.dataset?.intent ?? null, value: a.dataset?.value ?? null } : null; })()');
      return { escapeCloses: true, focusBack: focus?.intent === 'tab' && focus.value === 'actions' };
    } },
  target: { page: 'phone', url: 'scenario=block', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor("document.querySelector('#planet-action-BLOCK_MOVE')", 'the block offered in Actions');
      await page.evaluate(tap('#planet-action-BLOCK_MOVE'));
      await page.waitFor("document.querySelector('.ms-ps-target')&&document.querySelectorAll('.planet-stage .ms-rs-press').length===3", 'the target bar and three people offered');
    },
    facts: s => ({ targetBar: s.target?.title === 'Block movement' && !!s.target.sub && !!s.target.cancel && !s.target.cancel.disabled, noSheet: s.sheet === null, offered: s.stage.presses.join() === 'seat-1,seat-2,seat-3',
      heroStays: s.hero?.mode === 'pass',
      // The Officer's own bar while the block is open (sheet 40, phase-bars.mjs).
      ownBar: s.bar?.kind === 'phase' && s.bar.name === 'Block a move' && s.bar.sub === 'Before turns · Officer' }),
    after: async page => {
      await page.evaluate(tap('.ms-ps-target [data-intent="cancel-target"]'));
      await page.waitFor(`${game}.getModel().action===null`, 'Cancel ended the choosing');
      const seen = await page.evaluate(LOOK);
      return { cancelled: seen.target === null && seen.stage.presses.length === 0, everyonesBar: seen.bar?.name === 'Before turns' && seen.bar.sub === 'Officer block · Blackhole' };
    } },
  // A phase that closed under an open choice (sheet 45's stale frame; shell-input.mjs phaseClosed()). The harness's
  // own view, with the same 60 s turn moved so that it ends 1.2 s after the choice is open: the game's controller
  // clears the choice at 0:00, and the shell's toast says why.
  closed: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      // Both builds: the game's own Scan button; release 3's (#310), Actions' Scan tile.
      const scan = '#planet-action-SCAN, .ms-ps-sheet-body > .ms-actions [data-intent="tile"][data-value="SCAN"]';
      await page.waitFor(`document.querySelector(${JSON.stringify(scan)})`, 'Scan offered in Actions');
      await page.evaluate(tap(scan));
      await page.waitFor(`${game}.getModel().action?.type==='SCAN'&&!!document.querySelector('.ms-ps-target')`, 'the Scan choice open');
      await page.evaluate(edit("const length=p.phase.endsAt-p.phase.startedAt;p.phase={...p.phase,startedAt:now+1200-length,endsAt:now+1200}"));
      await page.waitFor("document.querySelector('.ms-ps-toast')", 'the toast when the time is up', 8000);
    },
    facts: s => ({ toast: s.toast === 'That phase closed · choices cleared', choiceCleared: s.model?.action === null && s.target === null && s.sheet === null && s.stage.presses.length === 0,
      atZero: s.bar?.clock === '0:00', ownBarStays: s.bar?.kind === 'turn' && s.bar.name === 'Your turn', passOff: s.hero?.mode === 'pass' && s.hero.disabled,
      live: s.shell?.status === 'live' && s.model?.connection === 'live', nothingSent: s.commands.length === 0 }),
    after: async page => {
      await page.waitFor("!document.querySelector('.ms-ps-toast')", 'the toast gone after its time', 6000);
      // The next phase arrives: the same closed phase gives no second toast.
      await page.evaluate(edit("p.phase={id:p.phase.id+'-next',kind:'ORDINARY_TURN',startedAt:now,endsAt:now+60000};p.activeSeatId='seat-1';p.offers=p.offers.filter(o=>o.type!=='PASS_TURN')"));
      await page.waitFor(`${game}.getModel().activeSeatId==='seat-1'&&${game}.getModel().phase.expired===false`, 'the next turn');
      await sleep(500);
      const seen = await page.evaluate(LOOK);
      return { notAgain: seen.toast === null, nextTurn: seen.bar?.kind === 'turn' && seen.bar.name === 'Crew 1' && /^\d:\d\d$/.test(seen.bar.clock ?? '') };
    } },
  reconnecting: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate('window.planetHarness.setReadFailure(true);window.planetHarness.app.session.refresh()');
      await page.waitFor(`${game}.getModel().connection!=='live'&&document.querySelector('.ms-ps-banner')`, 'reconnecting');
    },
    facts: s => ({ banner: s.banner?.kind === 'reconnecting' && s.banner.title === 'Connection lost' && !!s.banner.retry, bar: s.bar?.name === 'Reconnecting…' && s.bar.sub === 'Showing Round 6 as last seen',
      stale: s.shell?.status === 'stale', refused: s.tabs?.buttons.every(b => b.disabled) && s.hero?.disabled, noOldStatus: s.status === null,
      // The Card tab keeps this viewer's own portrait as last seen (Player 6's), as the bar keeps the round: the model has no identities now.
      // The same picture: the crew's portrait, not the older art the shell falls back to without the match's versions.
      ownAsLastSeen: s.tabs?.card?.portrait === true && s.tabs.card.property === '--ms-asset-crew-portrait-c6' && s.tabs.card.picture === true && s.model?.identities === 0 }),
    after: async (page, seen) => {
      await page.evaluate(tap('.ms-ps-banner [data-intent="retry"]'));
      await sleep(400);
      const now = await page.evaluate(LOOK);
      return { retryReads: now.reads > seen.reads };
    } },
  eliminated: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate(edit("Object.assign(p.board.seats.find(s=>s.seatId===p.self.seatId),{health:'Eliminated'});p.activeSeatId='seat-1';p.offers=[]"));
      await page.waitFor("document.querySelector('.ms-ps-banner')?.dataset.kind==='out'", 'the eliminated player\'s banner');
    },
    facts: s => ({ banner: s.banner?.title === 'You’re out' && s.banner.sub === 'You can watch. Your role stays private.' && s.banner.retry === null, passOff: s.hero?.disabled, live: s.shell?.status === 'live',
      actionsOff: s.tabs?.buttons.find(b => b.value === 'actions')?.disabled === true, othersOn: s.tabs?.buttons.filter(b => ['switch', 'card', 'panels'].includes(b.value)).every(b => !b.disabled) }) },
  vote: { page: 'phone', url: 'scenario=board', steps: async page => {
      // The harness's openJailVote(), with the shared checkpoint the Blackout release publishes for a Jail vote
      // (apps/game/dev/planet/scenarios.mjs): its openJailVote() keeps the board's, which that release's contract refuses.
      await page.evaluate(edit("const ids=p.board.seats.filter(s=>s.health!=='Eliminated').map(s=>s.seatId);p.phase={id:'phone-jail-vote',kind:'JAIL_VOTE',startedAt:now,endsAt:now+60000};p.activeSeatId=null;p.hackSession=null;p.ballot={eligibleVoters:ids,eligibleTargets:ids};p.offers=[{type:'VOTE',targetSeatIds:ids,slotIds:[],windowIds:[],promiseTargetSeatIds:[]}];p.board.checkpoint='AFTER_BLACKOUT';p.board.finalizedRound=p.round"));
      await page.waitFor(`${game}.getModel().phase?.kind==='JAIL_VOTE'&&document.querySelector('.ms-ps-hero')?.dataset.mode==='vote'`, 'the round button as Vote');
    },
    facts: s => ({ vote: s.hero?.mode === 'vote' && !s.hero.disabled && s.hero.label === 'Open the ballot', bar: s.bar?.kind === 'phase' && s.bar.name === 'Jail vote' }) },
  ballot: { from: 'vote', steps: async page => {
      await page.evaluate(tap(HERO));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='action:VOTE'&&document.querySelector('.ms-ps-sheet .planet-roster-grid')", 'the ballot');
    },
    facts: s => ({ sheet: s.sheet?.title === 'Jail vote' && s.sheet.close && s.sheet.body.game, roster: s.sheet?.body.buttons.includes('Abstain'), voteStep: s.model?.action?.type === 'VOTE' && s.model.action.step === 'targets',
      heroStays: s.hero?.mode === 'vote' }),
    after: async page => {
      // The sheet's Close leaves the ballot, as today's Close did.
      await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-close"]'));
      await page.waitFor(`${game}.getModel().action===null&&!document.querySelector('.ms-ps-sheet')`, 'the ballot closed');
      return { closed: true };
    } },
  voted: { from: 'ballot', steps: async page => {
      await page.evaluate(edit("p.ownBallot={phaseId:p.phase.id,targetSeatId:'seat-2'};p.offers=[]"));
      await page.waitFor("document.querySelector('.ms-ps-hero')?.dataset.mode==='voted'", 'the round button as Voted');
    },
    facts: s => ({ voted: s.hero?.mode === 'voted' && !s.hero.disabled && s.hero.label === 'Ballot registered' }) },
  result: { page: 'phone', url: 'scenario=vote', steps: async page => {
      await page.waitFor(`${game}.getModel().phase?.kind==='VOTE_RESULT'&&document.querySelector('.planet-result:not([hidden])')`, 'the 5 s result');
    },
    facts: s => ({ bar: s.bar?.name === 'Vote result' && s.bar.ring && !s.bar.urgent && s.bar.promises === null && s.bar.menu, hero: s.hero?.mode === 'vote' && s.hero.disabled,
      window: !!s.result?.inCover && s.result.box.y >= s.stage.box.y && s.result.box.y + s.result.box.height <= s.stage.box.y + s.stage.box.height + 0.5 }),
    after: async page => {
      // ⋮ opens Settings: the shell's sheet lies over the game's result window, as the pack layers a sheet over the cover.
      await page.evaluate(tap('.ms-ps-tb [data-intent="menu"]'));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='settings'", 'Settings over the result');
      await sleep(400);
      const seen = await page.evaluate(LOOK), head = seen.sheet?.box;
      const hit = head ? await page.evaluate(HIT([head.x + head.width / 2, head.y + 24])) : null;
      return { sheetOverResult: !!seen.result && !!hit?.shell };
    } },
  talk: { page: 'phone', url: 'scenario=promises',
    facts: s => ({ pair: s.bar?.kind === 'pair' && s.bar.name === 'Crew 6 + Crew 1' && s.bar.sub === 'Private talk', buttons: (s.talk ?? []).map(b => b.label).join() === 'Promises,My card', noGameTabs: s.tabs === null }) },
  'food-gauge': { page: 'food', url: 'case=food-flow-13&safe=0,0',
    facts: s => ({ gauge: !!s.bar?.gauge, clock: !!s.bar?.clock || !!s.bar?.gauge, live: s.shell?.status === 'live', foodChromeOff: s.food.chrome === 'false', foodMatch: s.model?.food === true }) },
  'food-surface': { page: 'food', url: 'case=food-flow-01&safe=0,0', steps: async page => {
      await page.waitFor("document.querySelector('.planet-app')?.dataset.foodChrome==='true'", 'Food\'s surface over the chrome');
    },
    facts: (s, _looks, extra) => ({ foodChrome: s.food.chrome === 'true' && !!s.food.bar && !!s.food.tabs, concealed: s.shell?.status === 'concealed' && s.bar?.hidden && !s.bar.name && !s.bar.clock && s.bar.controls === 0,
      noShellControls: (s.tabs?.buttons.length ?? 0) === 0 && !s.sheet && !s.target && !s.banner, sameBars: Math.abs(s.food.bar.height - s.bar.box.height) < 1 && Math.abs(s.food.tabs.height - (s.tabs?.box.height ?? 0)) < 1,
      unreachable: extra.hits.every(h => !h.shell), foodTakesTaps: extra.hits.some(h => h.food) }),
    extra: async (page, seen) => ({ hits: await Promise.all([seen.bar?.box, seen.tabs?.box].filter(Boolean).map(b => page.evaluate(HIT(centre(b))))) }) },
  blackout: { page: 'phone', url: 'scenario=blackout', steps: async page => {
      await page.waitFor(`${game}.getModel().dark&&document.querySelector('.ms-ps-tb')?.dataset.tone==='dark'`, 'the Blackout\'s dark');
    },
    // In the dark the model gives no identities, the viewer's own among them: the Card tab draws no portrait, and the
    // card's own icon in its place (its painted tile from shell 0.3.2, as the other three tabs draw theirs).
    facts: s => ({ dark: s.bar?.tone === 'dark' && s.bar.name === 'Blackout' && s.bar.glyph === 'dark', clock: !!s.bar?.clock, words: s.bar?.sub === 'Dark · positions fixed',
      cardIcon: s.tabs?.card?.portrait === false && s.tabs.card.icon === true && s.tabs.card.tile === true && s.model?.identities === 0,
      fourTiles: painted(s, ['board:tile', 'actions:tile', 'panels:tile', 'card:tile']) }) },
  // The phase bars (shell 0.2.10): Designer's words for a phase with no active player, from phase-bars.mjs, on the
  // harness's own scenarios. Each deciding player's phone shows everyone's bar until their own choice is open.
  before: { page: 'phone', url: 'scenario=block', steps: async page => {
      await page.waitFor(`${game}.getModel().phase?.kind==='PRE_TURN'&&document.querySelector('.ms-ps-tb')?.dataset.kind==='phase'`, 'before turns');
    },
    facts: s => ({ bar: s.bar?.kind === 'phase' && s.bar.name === 'Before turns' && s.bar.sub === 'Officer block · Blackhole' && s.bar.glyph === 'plain', clock: /^\d:\d\d$/.test(s.bar?.clock ?? ''),
      promisesMenu: !!s.bar?.promises && s.bar.menu, noTarget: s.target === null && s.sheet === null }) },
  appointment: { page: 'phone', url: 'scenario=appointment', steps: async page => {
      await page.waitFor(`${game}.getModel().phase?.kind==='OFFICER_APPOINTMENT'&&document.querySelector('.ms-ps-tb')?.dataset.kind==='phase'`, 'the Officer\'s appointment');
    },
    // The Captain's phone before the appointment is opened: everyone's bar, which names the Captain.
    facts: s => ({ bar: s.bar?.kind === 'phase' && s.bar.name === 'New Officer' && s.bar.sub === 'Crew 6 chooses', clock: /^\d:\d\d$/.test(s.bar?.clock ?? '') }),
    after: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor("document.querySelector('#planet-action-APPOINT_OFFICER')", 'the appointment offered in Actions');
      await page.evaluate(tap('#planet-action-APPOINT_OFFICER'));
      await page.waitFor(`${game}.getModel().action?.type==='APPOINT_OFFICER'&&document.querySelector('.ms-ps-name')?.textContent==='Appoint Officer'`, 'the Captain\'s own bar');
      const seen = await page.evaluate(LOOK);
      return { ownBar: seen.bar?.name === 'Appoint Officer' && seen.bar.sub === 'Random if time runs out' };
    } },
  course: { page: 'phone', url: 'scenario=tie', steps: async page => {
      await page.waitFor(`${game}.getModel().phase?.kind?.startsWith('NAV_')&&document.querySelector('.ms-ps-tb')?.dataset.kind==='phase'`, 'setting course');
    },
    // The Officer's phone with nothing of Navigation open: everyone's neutral bar, never amber.
    facts: s => ({ bar: s.bar?.kind === 'phase' && s.bar.name === 'Setting course' && s.bar.sub === 'The offices are setting it', clock: /^\d:\d\d$/.test(s.bar?.clock ?? '') }),
    after: async page => {
      await page.evaluate(tap(TAB('panels')));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='panels'", 'Panels');
      // The game's own Panels list, or (with release 3, #310) the Panels component's row.
      await page.evaluate(tap('.ms-ps-sheet [data-planet-action="panel"][data-value="navigation"], .ms-ps-sheet-body > .ms-panels [data-intent="open"][data-value="navigation"]'));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='navigation'&&document.querySelector('.ms-ps-sub')?.textContent==='Officer · private'", 'the Officer\'s own bar with Navigation open');
      const seen = await page.evaluate(LOOK);
      return { ownBar: seen.bar?.name === 'Setting course' && seen.bar.sub === 'Officer · private' && seen.sheet?.title === 'Navigation' };
    } },
  display: { page: 'phone', url: 'scenario=display', steps: async page => {
      await page.waitFor(`${game}.getModel().surface==='display'&&document.querySelector('.ms-phone-shell')?.dataset.tabs==='none'`, 'the shared display');
    },
    facts: s => ({ noTabs: s.tabs === null && s.talk === null && s.shell?.tabs === 'none', onlyMenu: !s.bar?.promises && s.bar?.menu && s.bar?.controls === 1, bar: s.bar?.kind === 'turn' && s.bar.name === 'Crew 6',
      noSheet: s.sheet === null }),
    after: async page => {
      // ⋮ opens Settings on a display too: the one panel the controller opens there, with the display's preferences.
      await page.evaluate(tap('.ms-ps-tb [data-intent="menu"]'));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='settings'", 'Settings on the display');
      const seen = await page.evaluate(LOOK);
      return { settings: seen.sheet?.title === 'Settings' && seen.sheet.body.game && seen.sheet.body.text.length > 0 && seen.tabs === null };
    } },
  concealed: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor(`${game}.getModel().concealed&&document.querySelector('.ms-phone-shell')?.dataset.status==='concealed'`, 'concealed');
    },
    facts: s => ({ empty: s.bar?.hidden && !s.bar.name && !s.bar.clock && s.bar.controls === 0 && (s.tabs?.buttons.length ?? 0) === 0 && s.tabs?.hidden, shape: s.shell?.tabs === 'game' }) },
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
const dirty = git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/shell-connection');
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
          await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY });
          const address = state.page === 'food' ? `${origin}/food/app.html?${state.url}` : `${origin}/index.html?${state.url}&count=9&tuple=blackout`;
          await page.goto(address, state.page === 'food' ? 'window.foodAppHarness?.ready' : 'window.planetHarness');
          await page.evaluate(`${APP}.artReady`);
          if (state.page === 'phone') await page.waitFor(LIVE, 'a live, trusted match');
          await page.waitFor("document.documentElement.dataset.artSettled==='true'&&document.querySelector('.ms-phone-shell')", 'the art settled and the shell mounted');
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
          shell: !!seen.shell && seen.stage.inShell,
          noOldChrome: seen.old === 0,
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
  tool: 'design/tools/shell-connection-check.mjs',
  what: 'The Planet app\'s match frame drawn by the phone shell (design/phone-ui/components/phone-shell), in Frontend\'s phone and Food harnesses (apps/game/dev/phone) built from the candidate below',
  candidate,
  art: { base: art.head, originMain: art.main, note: 'The harnesses\' art plugins over a clean worktree of origin/main; the harnesses and their asset tooling are byte for byte that commit\'s' },
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels, focus emulated, no safe areas; the harnesses bundled by Vite and served with the production headers below. Not a phone, not Safari, not a live match.',
  headers: HEADERS, headersSha256: sha256(JSON.stringify(HEADERS)),
  captures: Object.fromEntries(Object.entries({ ...before?.captures, ...results }).sort(([a], [b]) => a.localeCompare(b))),
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const all = Object.values(record.captures), passed = all.filter(r => r.ok).length;
console.log(`this run: ${Object.values(results).filter(r => r.ok).length} of ${Object.keys(results).length} passed; the record: ${passed} of ${all.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
