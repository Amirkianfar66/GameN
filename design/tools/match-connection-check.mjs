// mothership:dev-only
//
// Release 3's check (docs/design/components/match-connection.md): the Planet app's match screens drawn by
// Designer's components in the phone shell, the owner's plan of 16 November 2026. Its first step is Actions
// (design/phone-ui/components/actions): the tiles, choosing a person or a position, the list, the check, After
// Register, "Outcome unknown", Pass, Move and the Disabler's position. Its next is the Panels tab
// (design/phone-ui/components/panels, #296): Panels, Players and Round order. It bundles Frontend's phone harness
// (apps/game/dev/phone: the real Planet app, controller and renderer over its synthetic connection) from this
// tree, with the art it takes from a clean worktree of origin/main, as shell-connection-check.mjs does, and serves
// it with the hosted game's production response headers (scripts/hosted-preview-policy.mjs, the Content Security
// Policy included). It drives the real app at 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels:
//   tiles                       the Hacker's tiles: the server's offers usable, Private talk and Shoot "Not available now"
//   rescue, rescue-check        the Doctor's Rescue: the target bar and the person offered; the check, Cancel to the tiles
//   rescue-after                Register, then After Register's REGISTERED; Done closes it
//   unknown                     no answer: "Outcome unknown" naming the Rescue; Retry the same resends the same command
//   list, other-rooms           Rescue offered in three rooms: the board's List and its check; the room's "Other rooms · 2"
//   suppress, blackhole         actions with no person: the Engineer's CAPTURED; the Alien's Blackhole, a toast and its tile
//   move, move-check, moved     Move in the viewer's own room, its check (Cancel back to choosing), "Moved to B5" once the board has you there
//   move-board                  Move on the board, and another room's position from its caption
//   pass                        "Pass your turn?", then "Turn passed" with the next turn
//   blackout, blackout-fixed    the Disabler's positions in the dark, fixed with one tap; "Position A3 fixed", no Cancel
//   reconnecting, concealed     nothing of this viewer's action stays: the sheet closes; a hidden page keeps no name
//   panels                      the Panels tab: its five rows with their lines, this room's windows; Windows opens, Back returns
//   players                     Players: the nine seats' public facts, the Captain and Officer, injured, in Jail, eliminated
//   round-order                 Round order: the game's steps for the tuple, in its order and words, each with its icon
//   panels-food, players-away   the frozen Food release while players are away on its Task: the Panels tab from the Task's
//                               own tabs, with its Tasks button after the list; Players, the game's own lines alone
//   promises … promise-confirm  Promises (#297) in the 60 s talk: the list, the six kinds, Jail Vote's player, the terms
//   promise-refused             the controller's own check refuses the offer: its words in the sheet's inline error (R2)
//   promise-refused-back        Back clears them; they come back neither in the status line nor with the terms
//   promise-sent, -waiting      Meet in Room B: one OFFER_PROMISE, its receipt's toast; the next view has it waiting
//   promise-incoming, -accepted the partner's offer, accepted: one ACCEPT_PROMISE, and Received shows it
//   refused-next-view           a refusal's words go with the next view; the terms stay
//   refused-elsewhere           and with a tap out of the sheet (the top bar's Promises)
//   refused-blur                and with a blur: the sheet closes; the app's own blur interrupts the connection
//   refused-concealed           and with a hidden page: nothing of them stays, nor when the page shows again
//   refused-phase-closed        and with the talk: the sheet closes with its phase, and no words are left
//   promise-draft-closed        a draft open when the talk's time runs out: the shell's phase-closed toast, once
//   promise-results             after the talk: Received and Given with their status
//   windows                     Windows (#299) at a station: its window, the drawings by name, the box and the inks
//   windows-drawn, -shown, -done  two strokes drawn, no focus ring; Show sends one SHOW_WINDOW with them; SHOWN once the view has it; Done
//   windows-view, windows-none  away from a station, the room's windows; in the Command Room, the game's own sentence
//   windows-keyboard-show       Show by Enter: once Done takes its place, the focus is on Done (#307's focus rule)
//   panels-back-focus           Players' Back by Enter: the Panels list, the focus on the sheet's Close (the same rule)
// And at 320 × 568 with the Largest text (the Lead's and the Bars & Icons builder's ask with shell 0.3.3):
//   promise-incoming-largest    the partner's offer, the first game sheet the shell squeezes: its head and room
//   promise-incoming-largest-accept   scrolled to Accept, which a tap at its place on the screen sends
// A capture passes with no unexpected policy report, no failed request and no page error; the shell mounted with
// the stage in it and none of the old chrome; and the state's own facts. It writes
// design/phone-ui/review/match-connection/: one JPEG per state and size, and check.json (the headers and their
// SHA-256, the candidate and art commits, what each capture saw and its SHA-256). States are drawn at both phones
// unless they name their sizes; the two Largest-text states are drawn at 320 × 568 alone.
//   GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/match-connection-check.mjs [--only a,b] [--keep]
// One browser draws every capture, one page at a time. --only draws some states (a state another continues from
// is drawn with it); a run with --only adds its captures to check.json when that record names the same candidate,
// art and headers, so a record can be made in batches. Any other run starts a new record.
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size, with no safe areas:
// not a phone, not Safari, not a live match, not multiplayer. The harness answers a command at once, so the
// check's "Registering…" is not drawn here; the component's own check (actions-check.mjs) draws it.

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
const REVIEW = join(REPO, 'design/phone-ui/review/match-connection');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };
/** The two phones every state is drawn at, unless it names its sizes. */
const PHONES = ['390x844', '430x932'];
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
  return { name: 'match-check-food-candidates', generateBundle() {
    for (const output of manifest.outputs) {
      const bytes = readFileSync(join(REPO, output.source));
      if (sha256(bytes) !== output.sha256 || bytes.length !== output.bytes) throw new Error(`Food static candidate differs: ${output.source}`);
      this.emitFile({ type: 'asset', fileName: `art/food-supply/${output.source.split('/assets/')[1]}`, source: bytes });
    }
  } };
}

async function bundle(art) {
  const out = await mkdtemp(join(tmpdir(), 'match-connection-check-'));
  // The harnesses' own entries with their art plugins over the baseline's art; the candidate's code is this tree.
  await build({
    root: join(REPO, 'apps/game/dev/phone'), configFile: false, publicDir: false, logLevel: 'warn',
    plugins: [comicAssetsPlugin(art.root), planetLibraryAssetsPlugin(art.root), crewDrawingAssetsPlugin(art.root), pregameAssetsPlugin(art.root), foodCandidates()],
    build: { target: 'es2022', cssMinify: false, outDir: out, emptyOutDir: true, sourcemap: false,
      rollupOptions: { input: { phone: join(REPO, 'apps/game/dev/phone/index.html'), food: join(REPO, 'apps/game/dev/phone/food/app.html') } } },
  });
  // What phone-ui-native-compare.mjs reads to name the build it compares (as the harness's own build writes it).
  await writeFile(join(out, 'review-provenance.json'), `${JSON.stringify({
    scope: 'The phone and Food harnesses built by design/tools/match-connection-check.mjs: the candidate\'s native modules, with art from a clean worktree of origin/main',
    candidate: { root: REPO, head: git(REPO, 'rev-parse', 'HEAD'), dirty: !!git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/match-connection') },
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

const ACTIONS = '.ms-ps-sheet .ms-ps-sheet-body > .ms-actions';
const TILE = type => `${ACTIONS} [data-intent="tile"][data-value="${type}"]`;
const FOOT = id => `.ms-ps-sheet-foot [data-value="${id}"]`;
const PRESS = seat => `.planet-stage .ms-rs-press[data-value="${seat}"]`;
const SLOT = id => `.planet-stage .ms-rs-slot[data-value="${id}"]`;
const SHEET = id => `document.querySelector('.ms-ps-sheet')?.dataset.sheet===${JSON.stringify(id)}`;
const PART = name => `document.querySelector(${JSON.stringify(ACTIONS)})?.dataset.part===${JSON.stringify(name)}`;
const PANELS = '.ms-ps-sheet .ms-ps-sheet-body > .ms-panels';
const OPEN = value => `${PANELS} [data-intent="open"][data-value="${value}"]`;
const VIEW = view => `document.querySelector(${JSON.stringify(PANELS)})?.dataset.view===${JSON.stringify(view)}`;
const PROMISES = '.ms-ps-sheet .ms-ps-sheet-body > .ms-promises';
const WINDOWS = '.ms-ps-sheet .ms-ps-sheet-body > .ms-windows';
const PVIEW = view => `document.querySelector(${JSON.stringify(PROMISES)})?.dataset.view===${JSON.stringify(view)}`;
const PROW = intent => `${PROMISES} .ms-k-row[data-intent="${intent}"]`;
const KIND = kind => `${PROMISES} [data-intent="kind"][data-value="${kind}"]`;
const PICK = seat => `${PROMISES} [data-intent="target"][data-value="${seat}"]`;
const PRESSED = selector => `document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-pressed')==='true'`;
const TOP_PROMISES = '.ms-ps-tb [data-intent="promises"]';
const SHEET_BACK = '.ms-ps-sheet [data-intent="sheet-back"]';
/** How many times the session has read the view: it reads it every 2 s, changed or not (session.ts). */
const READS = "window.planetHarness.requests.filter(r=>r.operation==='read').length";
/** A refused command's words in Promises' part (R2): the kit's inline error. */
const NOTE = `document.querySelector(${JSON.stringify('.ms-ps-sheet .ms-ps-sheet-body > .ms-promises .ms-k-error')})`;
const REFUSED_WORDS = 'That choice is no longer offered.';
/** The Largest text (200 %), chosen as a player does: ⋮, Settings, Text size; then Settings is closed (as #307's check). */
const largestText = async page => {
  await page.evaluate(tap('.ms-ps-tb [data-intent="menu"]'));
  await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='settings'&&document.querySelector('.ms-ps-sheet select[aria-label=\"Text size\"]')", 'Settings');
  await page.evaluate("(()=>{const s=document.querySelector('.ms-ps-sheet select[aria-label=\"Text size\"]');s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await page.waitFor("document.documentElement.style.fontSize==='200%'", 'the Largest text');
  await page.evaluate(tap('.ms-ps-sheet [data-intent="sheet-close"]'));
  await page.waitFor("!document.querySelector('.ms-ps-sheet')", 'Settings closed');
};
/**
 * How the open sheet is laid out (shell 0.3.3, as #307's check reads it): a stacked head, a footer that scrolls with
 * the body, the title's lines, the scroller's content and room, whether the sheet and its parts are on the screen,
 * and where Accept is: inside the scroller's visible box, and the control a finger at its centre would touch.
 */
const FIT = `(() => {
  const sheet = document.querySelector('.ms-ps-sheet'); if (!sheet) return null;
  const head = sheet.querySelector('.ms-ps-sheet-head'), h2 = head.querySelector('h2'), squeezed = sheet.hasAttribute('data-foot-scrolls');
  const scroller = squeezed ? sheet.querySelector('.ms-ps-sheet-scroll') : sheet.querySelector('.ms-ps-sheet-body'), foot = sheet.querySelector('.ms-ps-sheet-foot');
  const r = n => n.getBoundingClientRect(), s = r(sheet), box = r(scroller), tabs = document.querySelector('.ms-ps-tabs');
  const accept = sheet.querySelector('.ms-ps-sheet-foot [data-value="accept"]'), a = accept ? r(accept) : null;
  const hit = a ? document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2) : null;
  return { text: document.documentElement.style.fontSize, stacked: head.hasAttribute('data-stacked'), footScrolls: squeezed,
    titleLines: Math.round(h2.offsetHeight / parseFloat(getComputedStyle(h2).lineHeight)), titleWhole: h2.scrollWidth <= h2.clientWidth + 1 && h2.scrollHeight <= h2.clientHeight + 1,
    sheet: Math.round(s.height), head: Math.round(r(head).height), content: scroller.scrollHeight, room: scroller.clientHeight, scrolled: Math.round(scroller.scrollTop),
    inView: s.top >= 0 && s.bottom <= window.innerHeight + 0.5, aboveTabs: !tabs || tabs.hidden || s.bottom <= r(tabs).top + 0.5,
    footInScroller: !!foot && scroller.contains(foot),
    accept: a ? { inView: a.top >= box.top - 0.5 && a.bottom <= box.bottom + 0.5, x: a.left + a.width / 2, y: a.top + a.height / 2, touched: !!hit && (hit === accept || accept.contains(hit)) } : null };
})()`;
const SHEET_CLOSE = '.ms-ps-sheet [data-intent="sheet-close"]';
/** The phone's own turn, in a board scenario: the offers of a scenario, as its view has them, with more. */
const offers = list => edit(`p.offers=${JSON.stringify(list)}`);
const offer = (type, targets = [], slots = []) => ({ type, targetSeatIds: targets, slotIds: slots, windowIds: [], promiseTargetSeatIds: [] });

/** What the phone shows now: the shell's parts, Actions' part in the sheet's body, the stage, and the app's model. */
const LOOK = `(() => {
  const shell = document.querySelector('.ms-phone-shell');
  const q = (s, r = shell) => r ? r.querySelector(s) : null, all = (s, r = shell) => r ? [...r.querySelectorAll(s)] : [];
  const box = n => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100, width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 }; };
  const text = n => n ? n.textContent.replace(/\\s+/g, ' ').trim() : null;
  const control = b => ({ intent: b.dataset.intent, value: b.dataset.value ?? null, label: b.getAttribute('aria-label') ?? text(b), expanded: b.getAttribute('aria-expanded'), disabled: b.getAttribute('aria-disabled') === 'true', busy: b.getAttribute('aria-busy') === 'true', box: box(b) });
  const bar = q('.ms-ps-tb'), tabs = q('.ms-ps-tabs'), hero = q('.ms-ps-hero'), sheet = q('.ms-ps-sheet'), target = q('.ms-ps-target'), banner = q('.ms-ps-banner');
  const part = document.querySelector(${JSON.stringify(ACTIONS)}), body = q('.ms-ps-sheet-body', sheet);
  const harness = window.planetHarness ?? window.foodAppHarness, model = harness?.app.game?.getModel() ?? null;
  return {
    shell: shell ? { status: shell.dataset.status, tabs: shell.dataset.tabs, box: box(shell) } : null,
    bar: bar ? { kind: bar.dataset.kind, tone: bar.getAttribute('data-tone'), name: text(q('.ms-ps-name', bar)), sub: text(q('.ms-ps-sub', bar)), clock: text(q('.ms-ps-timer', bar)), controls: all('button', bar).length } : null,
    tabs: tabs ? { buttons: all('button[data-intent]', tabs).map(control) } : null,
    hero: hero ? { mode: hero.dataset.mode, ...control(hero) } : null,
    target: target ? { title: text(q('.ms-ps-text b', target)), sub: text(q('.ms-ps-text span', target)), cancel: q('[data-intent="cancel-target"]', target) ? control(q('[data-intent="cancel-target"]', target)) : null } : null,
    chip: q('.ms-ps-chip') ? control(q('.ms-ps-chip button')) : null,
    banner: banner ? { kind: banner.dataset.kind, title: text(q('.ms-ps-text b', banner)) } : null,
    toast: text(q('.ms-ps-toast')),
    sheet: sheet ? { id: sheet.dataset.sheet, title: text(q('.ms-ps-sheet-title h2', sheet)), sub: q('.ms-ps-sheet-title p', sheet)?.hidden ? null : text(q('.ms-ps-sheet-title p', sheet)),
      back: !!q('[data-intent="sheet-back"]', sheet), close: !!q('[data-intent="sheet-close"]', sheet), foot: all('.ms-ps-sheet-foot button', sheet).map(control),
      game: (() => { const g = q('.ms-ps-sheet-body > .planet-sheet-body', sheet); return g ? { text: text(g).slice(0, 200), buttons: [...g.querySelectorAll('button')].map(b => b.id || text(b)), lines: [...g.querySelectorAll('p')].map(text) } : null; })(),
      children: body ? [...body.children].map(n => n.dataset.part ?? n.className.split(' ')[0]) : [], box: box(sheet) } : null,
    actions: part ? { part: part.dataset.part, status: part.dataset.status, first: body?.firstElementChild === part,
      head: part.querySelector('.ms-k-section-head') ? [text(part.querySelector('.ms-k-section-title')), text(part.querySelector('.ms-k-section-aside'))].join('|') : null,
      tiles: [...part.querySelectorAll('.ms-k-tile')].map(n => ({ type: n.dataset.value, state: n.dataset.state, note: text(n.querySelector('.ms-k-tile-note')), label: n.getAttribute('aria-label'), off: n.getAttribute('aria-disabled') === 'true' })),
      who: part.querySelector('.ms-k-who') ? [text(part.querySelector('.ms-k-who-title')), text(part.querySelector('.ms-k-who-sub'))].join('|') : null,
      portraits: part.querySelectorAll('.ms-k-who-lead .ms-k-pt').length,
      facts: [...part.querySelectorAll('.ms-k-facts li')].map(text),
      stamp: text(part.querySelector('.ms-ac-after-head .ms-k-stamp')), headline: text(part.querySelector('.ms-ac-after-head h3')), steps: part.querySelectorAll('.ms-pp-steps li').length,
      detail: part.querySelector('.ms-ac-after-detail:not([hidden])') ? text(part.querySelector('.ms-ac-after-detail')) : null,
      timeline: [...part.querySelectorAll('.ms-pp-steps li')].map(li => [text(li.querySelector(':scope > div > b')), text(li.querySelector(':scope > div > span'))].filter(Boolean).join(' · ')),
      notice: [...part.querySelectorAll('.ms-k-notice p')].map(text),
      groups: [...part.querySelectorAll('.ms-ac-list .ms-k-group-label')].map(text), rows: [...part.querySelectorAll('.ms-ac-list .ms-k-row-title')].map(text),
      picked: [...part.querySelectorAll('.ms-ac-list .ms-k-row[data-picked] .ms-k-row-title')].map(text) } : null,
    // The Panels tab's part (design/phone-ui/components/panels) in the sheet's body: its view and rows.
    panels: (p => p ? { view: p.dataset.view, label: p.getAttribute('aria-label'), first: body?.firstElementChild === p, motion: p.dataset.motion,
      rows: [...p.querySelectorAll('.ms-k-row')].filter(n => !n.closest('[hidden]')).map(n => ({ value: n.dataset.value ?? null, seat: n.dataset.seat ?? null, kind: n.dataset.kind ?? null,
        title: text(n.querySelector('.ms-k-row-title')), sub: n.querySelector('.ms-k-row-sub')?.hidden ? null : text(n.querySelector('.ms-k-row-sub')),
        icon: (n.querySelector('.ms-k-row-icon')?.dataset.icon ?? '').split(':')[0] || null, portrait: n.querySelector('.ms-k-row-lead:not([hidden]) .ms-k-pt')?.className ?? null,
        badges: [...n.querySelectorAll('.ms-pn-badges .ms-k-pill')].map(text), off: n.getAttribute('aria-disabled') === 'true', chevron: !!n.querySelector('.ms-k-row-chev:not([hidden]) svg'), box: box(n) })),
      note: text(p.querySelector('.ms-k-group-note')), text: text(p) } : null)(document.querySelector(${JSON.stringify(PANELS)})),
    // Promises' part (design/phone-ui/components/promises) in the sheet's body: its view, rows, labels, tiles, card and facts, as shown.
    promises: (p => p ? { view: p.dataset.view, first: body?.firstElementChild === p, label: p.getAttribute('aria-label'),
      rows: [...p.querySelectorAll('.ms-k-row')].filter(n => !n.closest('[hidden]')).map(n => ({ intent: n.dataset.intent ?? null, value: n.dataset.value ?? null,
        title: text(n.querySelector('.ms-k-row-title')), sub: n.querySelector('.ms-k-row-sub')?.hidden ? null : text(n.querySelector('.ms-k-row-sub')),
        end: text(n.querySelector('.ms-k-row-value')) || null, pressed: n.getAttribute('aria-pressed'), off: n.getAttribute('aria-disabled') === 'true',
        portrait: !!n.querySelector('.ms-k-row-lead:not([hidden]) .ms-k-pt'), chevron: !!n.querySelector('.ms-k-row-chev:not([hidden]) svg'), mark: n.querySelector('.ms-pr-chosen') ? !n.querySelector('.ms-pr-chosen').hidden : null })),
      labels: [...p.querySelectorAll('.ms-k-group-label')].filter(n => !n.hidden && !n.closest('[hidden]')).map(text),
      notes: [...p.querySelectorAll('.ms-k-group-note')].filter(n => !n.hidden && !n.closest('[hidden]')).map(text),
      tiles: [...p.querySelectorAll('.ms-k-tile')].map(n => ({ value: n.dataset.value, state: n.dataset.state, pressed: n.getAttribute('aria-pressed'), name: text(n.querySelector('.ms-k-tile-name')) })),
      card: (c => c && !c.hidden ? { name: text(c.querySelector('.ms-pr-card-name')), terms: c.querySelector('.ms-pr-card-terms')?.hidden ? null : text(c.querySelector('.ms-pr-card-terms')), portrait: !!c.querySelector('.ms-k-pt') } : null)(p.querySelector('.ms-pr-card')),
      facts: [...p.querySelectorAll('.ms-k-facts li')].map(text),
      // A refused command's words (R2): the kit's inline error, its role, whether it is the body's last part (only the
      // component's screen-reader text may follow it) and whether it is whole in the sheet's body as it shows.
      error: (e => e ? { text: text(e.querySelector('.ms-k-error-text')), role: e.getAttribute('role'),
        last: (() => { let n = e.nextElementSibling; while (n?.classList.contains('ms-k-vh')) n = n.nextElementSibling; return n === null; })(),
        whole: (() => { const r = e.getBoundingClientRect(), b = body?.getBoundingClientRect(); return !!b && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5; })() } : null)(p.querySelector('.ms-k-error')),
      text: text(p) } : null)(document.querySelector(${JSON.stringify(PROMISES)})),
    // The Windows sheet's part (design/phone-ui/components/windows): each window's head, the drawings' lines, the
    // drawing box and its strokes, the inks, Undo, the stamp, and the no-window block.
    windows: (w => w ? { first: body?.firstElementChild === w, label: w.getAttribute('aria-label'),
      heads: [...w.querySelectorAll('.ms-k-section-head')].filter(n => !n.closest('[hidden]')).map(h => [...h.children].map(text).filter(Boolean).join('|')),
      metas: [...w.querySelectorAll('.ms-wn-meta')].filter(n => !n.closest('[hidden]')).map(m => [...m.children].map(text).join('|')),
      labels: [...w.querySelectorAll('.ms-k-group-label')].filter(n => !n.hidden && !n.closest('[hidden]')).map(text),
      drawings: [...w.querySelectorAll('.ms-wn-drawing')].filter(n => !n.closest('[hidden]')).length,
      pad: (b => b ? { label: b.getAttribute('aria-label'), strokes: b.querySelectorAll('.ms-wn-stroke').length } : null)(w.querySelector('.ms-wn-pad')),
      inks: [...w.querySelectorAll('.ms-wn-swatch')].map(b => b.getAttribute('aria-label') + ':' + b.getAttribute('aria-checked')),
      undoOff: w.querySelector('[data-intent="undo"]')?.hasAttribute('data-off') ?? null,
      stamp: text(w.querySelector('.ms-wn-stamp .ms-k-stamp')) || null,
      wait: (n => n ? [text(n.querySelector('.ms-k-wait-title')), text(n.querySelector('.ms-k-wait-line'))].filter(Boolean).join('|') : null)(w.querySelector('.ms-k-wait')),
      text: text(w) } : null)(document.querySelector(${JSON.stringify(WINDOWS)})),
    // Every inline error on the phone: a refusal's words show in one place at most.
    notes: all('.ms-k-error').length,
    stage: { inShell: !!document.querySelector('.ms-ps-stage > .planet-stage'), scene: document.querySelector('.planet-stage .ms-room-scene')?.dataset.room ?? null, view: document.querySelector('.planet-stage')?.dataset.view ?? null,
      lighting: document.querySelector('.planet-stage .ms-room-scene')?.dataset.lighting ?? null,
      presses: [...document.querySelectorAll('.planet-stage .ms-rs-press')].map(p => p.dataset.value + (p.hasAttribute('data-picked') ? '*' : '')),
      slots: [...document.querySelectorAll('.planet-stage .ms-rs-slot')].map(p => p.dataset.value + (p.hasAttribute('data-picked') ? '*' : '')),
      boardSlots: [...document.querySelectorAll('.planet-targets .bv2-slot-target')].map(p => p.dataset.value),
      captions: [...document.querySelectorAll('.planet-stage button[data-move-room]')].filter(b => !b.disabled).map(b => b.dataset.moveRoom) },
    old: document.querySelectorAll('.planet-header:not(.planet-bar-measure), .planet-nav, #planet-pass, .planet-sheet, .planet-target-bar, #planet-check').length,
    status: (() => { const s = document.querySelector('.planet-status'); return s && !s.hidden ? text(s) : null; })(),
    // What the phone shows (the shell, without what is hidden or only for screen readers), and what the screen-reader
    // facts keep: the current step (#ms-action-step) and the checkpoint, the shell connection's.
    shown: (() => { const s = document.querySelector('.ms-phone-shell'); if (!s) return ''; const c = s.cloneNode(true); c.querySelectorAll('.ms-visually-hidden, [hidden]').forEach(n => n.remove()); return text(c); })(),
    hiddenStep: document.getElementById('ms-action-step')?.textContent ?? null,
    hiddenCheckpoint: document.querySelector('.planet-shared-checkpoint')?.textContent ?? null,
    // What a state's steps noted on the way (the moved state: before the view that moves the viewer).
    before: window.__matchBefore ?? null,
    model: model ? { connection: model.connection, concealed: model.concealed, phase: model.phase?.kind ?? null, panel: model.panel, ownSeatId: model.ownSeatId, round: model.round, message: model.message, revision: model.revision ?? null,
      own: (seat => seat ? seat.location + ' ' + seat.slotId : null)(model.board?.seats?.find(x => x.seatId === model.ownSeatId)),
      action: model.action ? { type: model.action.type, step: model.action.step, selected: model.action.selected } : null, recovery: model.recovery,
      food: model.food?.step ? { step: model.food.step.kind, away: model.food.step.awaySeatIds ?? null } : null } : null,
    commands: (window.planetHarness?.requests ?? window.foodAppHarness?.sent ?? []).filter(r => r.operation === 'command').map(r => ({ type: r.request.command.type, ...r.request.command })),
    page: document.body.innerText,
    violations: window.__policy,
  };
})()`;

const names = s => (s.actions?.tiles ?? []).map(t => `${t.type}:${t.state}`).join(',');
const rows = (s, key) => (s.panels?.rows ?? []).map(r => r[key] ?? '').join('|');
/** The words of a role or a faction, which the Panels tab never shows (the board scenario's phone is the Hacker's, who knows the Undercover). */
const PRIVATE_WORDS = /\b(Hacker|Undercover|Insider|Doctor|Supplier|Alien|Engineer|Disabler|Red|Blue)\b/;
const prow = (s, intent) => s.promises?.rows.find(r => r.intent === intent) ?? null;
const promiseRows = s => (s.promises?.rows ?? []).map(r => [r.title, r.sub, r.end].filter(Boolean).join(' / ')).join('|');
const foot = s => (s.sheet?.foot ?? []).map(b => `${b.value}:${b.label}${b.disabled ? ':off' : ''}${b.busy ? ':busy' : ''}`).join('|');
/** Nothing of this viewer's own action is left in the page: no part, no person picked, no words of the check. */
const gone = (s, words = []) => s.actions === null && words.every(w => !s.page.includes(w));

/** Steps that more than one state starts with: the Doctor's Rescue of Crew 3, and the Hacker's Move with two rooms. */
/** A stroke drawn in the drawing box as a finger would: pressed, moved in eight steps, released (real input events). */
/** The check plays the server for Show: the next view has the drawing just sent, by this player, at its window. */
const SHOW_SERVED = "const c=h.requests.filter(r=>r.operation==='command').at(-1).request.command;p.windows.find(w=>w.windowId===c.windowId).drawings.push({id:'shown-3',windowId:c.windowId,authorSeatId:p.self.seatId,round:p.round,order:2,drawing:c.drawing})";
/** A key as the keyboard gives it (Chrome's own input, not the page's events). */
async function pressKey(page, key, code, vk, text) {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
}
/** The focused control, as its intent and value ("sheet-action:done"), or its tag. */
const FOCUSED = "(e=>e&&e!==document.body?[e.dataset?.intent??e.tagName.toLowerCase(),e.dataset?.value??''].join(':'):null)(document.activeElement)";
/** Whether the drawing box draws its focus ring now. */
const RING = `(p=>{if(!p)return null;const st=getComputedStyle(p);return st.outlineStyle!=='none'&&parseFloat(st.outlineWidth)>0;})(document.querySelector(${JSON.stringify('.ms-ps-sheet .ms-ps-sheet-body > .ms-windows .ms-wn-pad')}))`;
async function drawStroke(page, [x0, y0], [x1, y1]) {
  const pad = `${WINDOWS} .ms-wn-pad`;
  await page.evaluate(`document.querySelector(${JSON.stringify(pad)}).scrollIntoView({block:'center'})`);
  await sleep(150);
  const box = await page.evaluate(`(r => ({ x: r.x, y: r.y, w: r.width, h: r.height }))(document.querySelector(${JSON.stringify(pad)}).getBoundingClientRect())`);
  const at = (u, v) => ({ x: box.x + u * box.w, y: box.y + v * box.h });
  const a = at(x0, y0), b = at(x1, y1);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 8; i++) {
    const q = at(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8);
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.x, y: q.y, button: 'left', buttons: 1 });
  }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 });
}

const STEPS = {
  panels: async page => {
    await page.evaluate(tap(TAB('panels')));
    await page.waitFor(`${SHEET('panels')}&&${VIEW('list')}`, 'the Panels tab');
  },
  rescue: async page => {
    await page.evaluate(tap(TAB('actions')));
    await page.waitFor(PART('tiles'), 'the Doctor\'s tiles');
    await page.evaluate(tap(TILE('RESCUE')));
    await page.waitFor(`document.querySelector('.ms-ps-target')&&document.querySelector(${JSON.stringify(PRESS('seat-3'))})`, 'the target bar and Crew 3 offered');
  },
  promises: async page => {
    await page.evaluate(tap(TOP_PROMISES));
    await page.waitFor(`${SHEET('promises')}&&${PVIEW('list')}`, 'Promises');
  },
  /** Windows, from the Panels tab's row, as a player opens it. */
  windows: async page => {
    await STEPS.panels(page);
    await page.evaluate(tap(OPEN('windows')));
    await page.waitFor(`${SHEET('windows')}&&document.querySelector(${JSON.stringify(WINDOWS)})`, 'Windows');
  },
  /** The terms of a Jail Vote for Crew 3, drafted and not sent: the six kinds, Jail Vote, Next, Crew 3, Next. */
  terms: async page => {
    await STEPS.promises(page);
    await page.evaluate(tap(PROW('offer')));
    await page.waitFor(PVIEW('kinds'), 'the six kinds');
    await page.evaluate(tap(KIND('JAIL_VOTE')));
    await page.waitFor(PRESSED(KIND('JAIL_VOTE')), 'Jail Vote chosen');
    await page.evaluate(tap(FOOT('next')));
    await page.waitFor(PVIEW('target'), 'Jail Vote\'s player');
    await page.evaluate(tap(PICK(3)));
    await page.waitFor(PRESSED(PICK(3)), 'Crew 3 chosen');
    await page.evaluate(tap(FOOT('next')));
    await page.waitFor(PVIEW('confirm'), 'the terms');
  },
  /** Jail Vote with Crew 3, offered: the controller's own check refuses it, and its words show in the sheet. */
  refused: async page => {
    await STEPS.terms(page);
    await page.evaluate(tap(FOOT('offer')));
    await page.waitFor(NOTE, 'the refusal\'s words in the sheet');
  },
  move: async page => {
    await page.evaluate(offers([offer('PASS_TURN'), offer('MOVE', [], ['B5', 'C1']), offer('SCAN', ['seat-1', 'seat-2']), offer('SUBMIT_CODE', ['seat-1', 'seat-2'])]));
    await page.waitFor(`${game}.getModel().moveRooms.length===2`, 'two rooms with a position');
    await page.evaluate(tap(TAB('actions')));
    await page.waitFor(PART('tiles'), 'the tiles');
    await page.evaluate(tap(TILE('MOVE')));
    await page.waitFor(`document.querySelector(${JSON.stringify(SLOT('B5'))})`, 'B5 offered in the room');
  },
};

/**
 * Each state: the page and address it starts from (or `from`, the state it continues, which must be the one drawn
 * just before it), the steps that reach it before the capture, its own facts, and `after`: steps after the capture
 * whose facts join its checks.
 */
const STATES = {
  // ── The tiles (sheet 28): the Hacker's board, the server offering Scan, the final Code, Move and Pass ──
  tiles: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(`${SHEET('actions')}&&${PART('tiles')}`, 'the Actions sheet with its tiles');
    },
    facts: s => ({ frame: s.sheet?.title === 'Actions' && s.sheet.sub === 'Room B' && s.sheet.close && !s.sheet.back,
      tiles: names(s) === 'SCAN:available,SUBMIT_CODE:available,MOVE:available,REQUEST_HACK:unavailable,REGISTER_SHOT:unavailable',
      notAvailable: s.actions?.tiles.filter(t => t.state === 'unavailable').every(t => t.off && t.note === 'Not available now'),
      head: s.actions?.head === 'Your turn|Round 6', partFirst: !!s.actions?.first, noGameBody: s.sheet?.game === null, tabOpen: s.tabs?.buttons.find(b => b.value === 'actions')?.expanded === 'true' }),
    after: async page => {
      // An unavailable tile takes no tap: nothing begins.
      await page.evaluate(tap(TILE('REGISTER_SHOT')));
      await sleep(200);
      const seen = await page.evaluate(LOOK);
      return { unavailableRefused: seen.model?.action === null && seen.sheet?.id === 'actions' };
    } },
  // ── A person (sheets 27.2, 29, 29.1): the Doctor's Rescue of Crew 3 in the Hospital ──
  rescue: { page: 'phone', url: 'scenario=doctor', steps: STEPS.rescue,
    facts: s => ({ targetBar: s.target?.title === 'Rescue' && s.target.sub === 'Choose a player' && !!s.target.cancel, noSheet: s.sheet === null, offered: s.stage.presses.join() === 'seat-3',
      inHospital: s.stage.scene === 'hospital', noChip: s.chip === null, heroStays: s.hero?.mode === 'pass' }) },
  'rescue-check': { from: 'rescue', steps: async page => {
      await page.evaluate(tap(PRESS('seat-3')));
      await page.waitFor(`${SHEET('action-check')}&&${PART('check')}`, 'the check');
    },
    facts: s => ({ frame: s.sheet?.title === 'Check and register' && !s.sheet.close && foot(s) === 'cancel:Cancel|register:Register Rescue', who: s.actions?.who === 'Rescue Crew 3|Player 3 · Hospital',
      portrait: s.actions?.portraits === 1, picked: s.stage.presses.join() === 'seat-3*', confirmStep: s.model?.action?.step === 'confirm', noCommandYet: s.commands.length === 0 }),
    after: async page => {
      // Cancel returns to the tiles and sends nothing.
      await page.evaluate(tap(FOOT('cancel')));
      await page.waitFor(`${SHEET('actions')}&&${PART('tiles')}`, 'Cancel returned to the tiles');
      const seen = await page.evaluate(LOOK);
      return { cancelToTiles: seen.model?.action === null && seen.commands.length === 0 && !seen.page.includes('Rescue Crew 3') };
    } },
  'rescue-after': { page: 'phone', url: 'scenario=doctor', steps: async page => {
      await STEPS.rescue(page);
      await page.evaluate(tap(PRESS('seat-3')));
      await page.waitFor(SHEET('action-check'), 'the check');
      await page.evaluate(tap(FOOT('register')));
      await page.waitFor(`${SHEET('action-after')}&&${PART('after')}`, 'After Register');
    },
    // The handoff's words (the Lead, 17 November): Frontend's line for Rescue, with this phone's pick, and the
    // component's time line from the round the server reports; never the model's generic prompt.
    facts: s => ({ frame: s.sheet?.title === 'Rescue' && foot(s) === 'done:Done', stamp: s.actions?.stamp === 'REGISTERED', headline: s.actions?.headline === 'Rescue of Crew 3 registered.',
      detail: s.actions?.detail === 'This is not a result. Registered actions are resolved at the end of the round.',
      timeLine: JSON.stringify(s.actions?.timeline) === JSON.stringify([`Registered · Round ${s.model?.round} · your turn`, `End of Round ${s.model?.round} · Rescue is resolved, after the attacks`]),
      sent: s.commands.length === 1 && s.commands[0].type === 'RESCUE' && s.commands[0].targetSeatId === 'seat-3', nothingOnTarget: !s.stage.presses.length,
      noGenericLine: s.shown.length > 0 && !s.shown.includes('Resolution is pending'),
      // A16 (the Lead's option 1): a screen reader hears the headline drawn, not the model's generic prompt.
      heard: s.hiddenStep === 'Rescue of Crew 3 registered.' && s.hiddenCheckpoint?.startsWith('Rescue of Crew 3 registered.') }),
    after: async page => {
      await page.evaluate(tap(FOOT('done')));
      await page.waitFor("!document.querySelector('.ms-ps-sheet')", 'Done closed it');
      const seen = await page.evaluate(LOOK);
      return { doneCloses: seen.actions === null && seen.model?.panel === 'board' };
    } },
  // ── Sheet 45: no answer came back ──
  unknown: { page: 'phone', url: 'scenario=doctor', steps: async page => {
      await page.evaluate('window.planetHarness.setLost(true)');
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(PART('tiles'), 'the tiles');
      await page.evaluate(tap(TILE('RESCUE')));
      await page.waitFor(`document.querySelector(${JSON.stringify(PRESS('seat-3'))})`, 'Crew 3 offered');
      await page.evaluate(tap(PRESS('seat-3')));
      await page.waitFor(SHEET('action-check'), 'the check');
      await page.evaluate(tap(FOOT('register')));
      await page.waitFor(`${SHEET('action-unknown')}&&${PART('unknown')}`, 'Outcome unknown', 12000);
    },
    facts: s => ({ frame: s.sheet?.title === 'Outcome unknown' && !s.sheet.close && foot(s) === 'retry:Retry the same|check:Check receipt',
      notice: s.actions?.notice.join('|') === 'Rescue Crew 3 was sent, but no answer came back.|Check before doing anything else.', recovery: s.model?.recovery?.status === 'unknown',
      // One message, not two (the Lead, 17 November): the game's own status line hides while Actions' notice is open.
      oneMessage: s.status === null }),
    after: async page => {
      // Retry the same: the same command again; this time the server answers.
      await page.evaluate('window.planetHarness.setLost(false)');
      await page.evaluate(tap(FOOT('retry')));
      await page.waitFor(SHEET('action-after'), 'the retry registered');
      const seen = await page.evaluate(LOOK), ids = (await page.evaluate("window.planetHarness.requests.filter(r=>r.operation==='command').map(r=>r.request.commandId)"));
      return { retrySame: ids.length === 2 && ids[0] === ids[1], afterRetry: seen.actions?.stamp === 'REGISTERED' };
    } },
  // ── The List (sheet 29) and Other rooms: Rescue offered in three rooms ──
  list: { page: 'phone', url: 'scenario=doctor', steps: async page => {
      await page.evaluate(offers([offer('PASS_TURN'), offer('MOVE', [], ['B5']), offer('RESCUE', ['seat-1', 'seat-3', 'seat-7'])]));
      await page.waitFor(`${game}.getModel().round===6`, 'the offers');
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(PART('tiles'), 'the tiles');
      await page.evaluate(tap(TILE('RESCUE')));
      await page.waitFor("document.querySelector('.ms-ps-chip')", 'the List chip on the board');
      await page.evaluate(tap('.ms-ps-chip button'));
      await page.waitFor(`${SHEET('action-list')}&&${PART('list')}`, 'the List');
    },
    facts: s => ({ frame: s.sheet?.title === 'Choose from a list' && s.sheet.sub === 'Rescue · everyone you can reach' && s.sheet.back && !s.sheet.close,
      groups: s.actions?.groups.join('|') === 'Room A|Room B|Hospital', rows: s.actions?.rows.join('|') === 'Crew 1|Crew 7|Crew 3', onBoard: s.stage.view === 'board' }),
    after: async page => {
      await page.evaluate(tap(`${ACTIONS} [data-intent="pick"][data-value="7"]`));
      await page.waitFor(`${SHEET('action-check')}&&${PART('check')}`, 'the check from a row');
      const seen = await page.evaluate(LOOK);
      return { rowToCheck: seen.actions?.who === 'Rescue Crew 7|Player 7 · Room B' };
    } },
  'other-rooms': { page: 'phone', url: 'scenario=doctor', steps: async page => {
      await page.evaluate(offers([offer('PASS_TURN'), offer('MOVE', [], ['B5']), offer('RESCUE', ['seat-1', 'seat-3', 'seat-7'])]));
      await page.waitFor(`${game}.getModel().round===6`, 'the offers');
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(PART('tiles'), 'the tiles');
      await page.evaluate(tap(TILE('RESCUE')));
      await page.waitFor("document.querySelector('.ms-ps-target')", 'the target bar');
      // The view switch: the room, where the others are counted.
      await page.evaluate(tap(TAB('switch')));
      await page.waitFor("document.querySelector('.planet-stage')?.dataset.view==='room'&&document.querySelector('.ms-ps-chip')", 'the room view and its chip');
    },
    facts: s => ({ chip: s.chip?.label === 'Other rooms · 2' && s.chip.value === 'other-rooms', bar: s.target?.title === 'Rescue' && s.target.sub === 'Choose a player', offeredHere: s.stage.presses.join() === 'seat-1' }),
    after: async page => {
      await page.evaluate(tap('.ms-ps-chip button'));
      await page.waitFor("document.querySelector('.planet-stage')?.dataset.view==='board'", 'the chip went to the board');
      const seen = await page.evaluate(LOOK);
      return { chipToBoard: seen.target?.sub === 'Choose a player · every room' && seen.chip?.label === 'List' };
    } },
  // ── An action with no person (29.2): the Engineer's Suppress navigation ──
  suppress: { page: 'phone', url: 'scenario=engineer', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(PART('tiles'), 'the Engineer\'s tiles');
      await page.evaluate(tap(TILE('ENGINEER_SUPPRESS')));
      await page.waitFor(`${SHEET('action-check')}&&${PART('check')}`, 'the check');
    },
    facts: s => ({ who: s.actions?.who === 'Suppress navigation|Only you see this', noPortrait: s.actions?.portraits === 0, foot: foot(s) === 'cancel:Cancel|register:Suppress navigation', noTarget: s.target === null }),
    after: async page => {
      await page.evaluate(tap(FOOT('register')));
      await page.waitFor(`${SHEET('action-after')}&&${PART('after')}`, 'After Register');
      const seen = await page.evaluate(LOOK);
      // The pack's words (afterWords()), without the capture the Actions panel's model does not carry (A15).
      return { captured: seen.actions?.stamp === 'CAPTURED' && seen.actions.headline === 'Navigation suppressed.'
        && seen.actions.detail === 'Captured now: the players in the other room. Their navigation weight is removed this round. Only you are told.'
        && seen.actions.timeline.length === 2 && seen.actions.timeline[1] === 'This round’s navigation · Their weight is removed', sent: seen.commands.map(c => c.type).join() === 'ENGINEER_SUPPRESS',
        heard: seen.hiddenStep === 'Navigation suppressed.' && !!seen.hiddenCheckpoint?.startsWith('Navigation suppressed.') };
    } },
  // ── Blackhole: no After Register (L7); the toast and the tile say it ──
  blackhole: { page: 'phone', url: 'scenario=alien', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(PART('tiles'), 'the Alien\'s tiles');
      await page.evaluate(tap(TILE('ACTIVATE_BLACKHOLE')));
      await page.waitFor(`${SHEET('action-check')}&&${PART('check')}`, 'the check');
    },
    facts: s => ({ who: s.actions?.who === 'Activate Blackhole|Only you see this', fact: s.actions?.facts.join('|') === 'This spends its global lifetime use and this round’s Role Action.', foot: foot(s) === 'cancel:Cancel|register:Activate Blackhole' }),
    after: async page => {
      await page.evaluate(tap(FOOT('register')));
      await page.waitFor(`document.querySelector('.ms-ps-toast')&&${SHEET('actions')}`, 'the toast over the tiles');
      const seen = await page.evaluate(LOOK);
      return { toast: seen.toast === 'Blackhole registered', registeredTile: (seen.actions?.tiles ?? []).some(t => t.type === 'ACTIVATE_BLACKHOLE' && t.state === 'registered'), noAfter: seen.sheet?.id === 'actions' };
    } },
  // ── Move (sheets 20 and 27.1; the Lead's Q1–Q4) ──
  move: { page: 'phone', url: 'scenario=board', steps: STEPS.move,
    facts: s => ({ bar: s.target?.title === 'Move within Room B' && s.target.sub === 'Choose an empty position · or another room on the Board', chip: s.chip?.label === 'Other rooms on the Board' && s.chip.value === 'move-board',
      slots: s.stage.slots.join() === 'B5', room: s.stage.scene === 'room-b' && s.stage.view === 'room', noSheet: s.sheet === null, roomChosen: s.model?.action?.step === 'slots' }) },
  'move-check': { from: 'move', steps: async page => {
      await page.evaluate(tap(SLOT('B5')));
      await page.waitFor(`${SHEET('action-check')}&&${PART('check')}`, 'the check');
    },
    facts: s => ({ who: s.actions?.who === 'Move to B5|Room B', fact: s.actions?.facts.join('|') === 'Entering or repositioning spends this round’s movement.', foot: foot(s) === 'cancel:Cancel|register:Register move',
      marked: s.stage.slots.join() === 'B5*', noBar: s.target === null }),
    after: async page => {
      // Cancel in the check returns to choosing, with the bar back and nothing picked (Q1).
      await page.evaluate(tap(FOOT('cancel')));
      await page.waitFor(`document.querySelector('.ms-ps-target')&&!document.querySelector('.ms-ps-sheet')`, 'back to choosing');
      const seen = await page.evaluate(LOOK);
      return { cancelToChoosing: seen.target?.title === 'Move within Room B' && seen.stage.slots.join() === 'B5' && seen.commands.length === 0 };
    } },
  // "Moved to B5" (Q2) with, or after, the view that has the viewer there, never before it (the Lead, 17 November). The
  // harness answers a command with an accepted receipt and moves no one, so here it plays the server's part: first the
  // receipt over the old board, which gives no toast; then the view with the viewer at B5, which does.
  moved: { from: 'move-check', steps: async page => {
      await page.evaluate(tap(SLOT('B5')));
      await page.waitFor(SHEET('action-check'), 'the check');
      await page.evaluate(tap(FOOT('register')));
      await page.waitFor(`${game}.getModel().action?.type==='MOVE'&&${game}.getModel().action.step==='accepted'`, 'the receipt, over the old board');
      await sleep(600);
      await page.evaluate(`window.__matchBefore={toast:!!document.querySelector('.ms-ps-toast'),own:(seat=>seat?seat.location+' '+seat.slotId:null)(${game}.getModel().board?.seats?.find(x=>x.seatId===${game}.getModel().ownSeatId))}`);
      await page.evaluate(edit("Object.assign(p.board.seats.find(s=>s.seatId===p.self.seatId),{location:'Room B',slotId:'B5'})"));
      await page.waitFor("document.querySelector('.ms-ps-toast')", 'the toast, with the view that moves the viewer');
    },
    facts: s => ({ toast: s.toast === 'Moved to B5', noSheet: s.sheet === null, sent: s.commands.length === 1 && s.commands[0].type === 'MOVE' && s.commands[0].destination === 'Room B' && s.commands[0].slotId === 'B5',
      notBefore: s.before?.toast === false && !!s.before.own && s.before.own !== 'Room B B5', youThere: s.model?.own === 'Room B B5' }) },
  'move-board': { page: 'phone', url: 'scenario=board', steps: async page => {
      await STEPS.move(page);
      await page.evaluate(tap('.ms-ps-chip button'));
      await page.waitFor("document.querySelector('.planet-stage')?.dataset.view==='board'", 'the board');
    },
    facts: s => ({ bar: s.target?.title === 'Move' && s.target.sub === 'Choose an empty position · uses this round’s move', noChip: s.chip === null, boardSlots: s.stage.boardSlots.join() === 'B5', captions: s.stage.captions.includes('Command Room') }),
    after: async page => {
      // The Command Room's caption: the move begins again on that room; its position is chosen on the board.
      await page.evaluate("document.querySelector('.planet-stage button[data-move-room=\"Command Room\"]').click()");
      await page.waitFor("document.querySelector('.planet-targets .bv2-slot-target[data-value=\"C1\"]')", 'C1 on the board');
      await page.evaluate("document.querySelector('.planet-targets .bv2-slot-target[data-value=\"C1\"]').click()");
      await page.waitFor(SHEET('action-check'), 'the check');
      const seen = await page.evaluate(LOOK);
      return { otherRoom: seen.actions?.who === 'Move to C1|Command Room' };
    } },
  // ── Pass (27.3) ──
  pass: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate(tap(HERO));
      await page.waitFor(`${SHEET('pass')}&&${PART('pass')}`, 'Pass your turn?');
    },
    facts: s => ({ sheet: s.sheet?.title === 'Pass your turn?' && !s.sheet.close && foot(s) === 'cancel:Cancel|pass:Pass', confirmStep: s.model?.action?.type === 'PASS_TURN' && s.model.action.step === 'confirm', noCommandYet: s.commands.length === 0 }),
    // "Turn passed" with, or after, the view that moves the turn on (the Lead, 17 November). The harness answers with an
    // accepted receipt and moves nothing, so it plays the server's part: the receipt alone gives no toast; then the next
    // turn, another seat's, does.
    after: async page => {
      await page.evaluate(tap(FOOT('pass')));
      await page.waitFor(`${game}.getModel().action?.type==='PASS_TURN'&&${game}.getModel().action.step==='accepted'`, 'the receipt, while it is still your turn');
      await sleep(600);
      const before = await page.evaluate(LOOK);
      await page.evaluate(edit("p.phase={id:p.phase.id+'-next',kind:'ORDINARY_TURN',startedAt:now,endsAt:now+60000};p.activeSeatId=p.board.seats.find(s=>s.seatId!==p.self.seatId&&s.health!=='Eliminated').seatId;p.offers=p.offers.filter(o=>o.type!=='PASS_TURN')"));
      await page.waitFor("document.querySelector('.ms-ps-toast')", 'the toast, with the next turn');
      const seen = await page.evaluate(LOOK);
      return { passSent: seen.commands.map(c => c.type).join() === 'PASS_TURN', notBefore: before.toast === null, toast: seen.toast === 'Turn passed',
        turnMoved: seen.bar?.kind === 'turn' && seen.bar.name !== 'Your turn', sheetClosed: seen.sheet === null };
    } },
  // ── The Disabler's position during a Blackout (sheet 30; 0.2.2) ──
  blackout: { page: 'phone', url: 'scenario=blackout', steps: async page => {
      await page.waitFor(`${game}.getModel().dark`, 'the dark');
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor("document.querySelector('.ms-ps-sheet')?.dataset.sheet==='dark:actions'&&document.querySelector('#planet-action-SELECT_BLACKOUT_SLOT')", 'the dark sheet and its position');
      await page.evaluate(tap('#planet-action-SELECT_BLACKOUT_SLOT'));
      await page.waitFor(`document.querySelector('.ms-ps-target')&&document.querySelector(${JSON.stringify(SLOT('A3'))})`, 'the positions');
    },
    facts: s => ({ bar: s.target?.title === 'Choose a position' && s.target.sub === 'Room A · any position, even empty', cancel: !!s.target?.cancel, slots: s.stage.slots.join() === 'A1,A2,A3,A4,A5', dark: s.stage.lighting === 'dark', noSheet: s.sheet === null, noChip: s.chip === null }),
    after: async page => {
      // One tap fixes it, as sheet 30 draws it: choose, then the controller's confirm.
      await page.evaluate(tap(SLOT('A3')));
      await page.waitFor(`${game}.getModel().action?.step==='accepted'`, 'the position registered');
      const seen = await page.evaluate(LOOK);
      return { oneTap: seen.commands.length === 1 && seen.commands[0].type === 'SELECT_BLACKOUT_SLOT' && seen.commands[0].slotId === 'A3', barKept: seen.target?.title === 'Choose a position', noSheetSending: seen.sheet === null };
    } },
  'blackout-fixed': { from: 'blackout', steps: async page => {
      await page.evaluate(tap(SLOT('A3')));
      await page.waitFor(`${game}.getModel().action?.step==='accepted'`, 'the position registered');
      await page.evaluate(edit("p.blackoutTargeting={...p.blackoutTargeting,selectable:false,selectedSlotId:'A3'};p.offers=[]"));
      await page.waitFor("document.querySelector('.ms-ps-target b')?.textContent==='Position A3 fixed'", 'Position A3 fixed');
    },
    // The fixed bar is final, with no Cancel (actions-0.2.4: the owner's approval of 17 November, #280 at f0066a7c).
    facts: s => ({ bar: s.target?.title === 'Position A3 fixed' && s.target.sub === 'Resolves after the window · no effect shown now', noCancel: !!s.target && s.target.cancel === null, marked: s.stage.slots.includes('A3*'), noSheet: s.sheet === null }) },
  // ── Reconnecting and hidden: nothing of this viewer's action stays ──
  reconnecting: { page: 'phone', url: 'scenario=doctor', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(PART('tiles'), 'the tiles');
      await page.evaluate('window.planetHarness.setReadFailure(true);window.planetHarness.app.session.refresh()');
      await page.waitFor(`${game}.getModel().connection!=='live'&&document.querySelector('.ms-ps-banner')`, 'reconnecting');
    },
    facts: s => ({ banner: s.banner?.kind === 'reconnecting', sheetClosed: s.sheet === null && s.actions === null, noTiles: !s.page.includes('Not available now') }) },
  concealed: { page: 'phone', url: 'scenario=doctor', steps: async page => {
      await page.evaluate(tap(TAB('actions')));
      await page.waitFor(PART('tiles'), 'the tiles');
      await page.evaluate(tap(TILE('RESCUE')));
      await page.waitFor(`document.querySelector(${JSON.stringify(PRESS('seat-3'))})`, 'Crew 3 offered');
      await page.evaluate(tap(PRESS('seat-3')));
      await page.waitFor(PART('check'), 'the check');
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor(`${game}.getModel().concealed&&document.querySelector('.ms-phone-shell')?.dataset.status==='concealed'`, 'concealed');
    },
    facts: s => ({ nothingLeft: gone(s, ['Rescue Crew 3', 'Check and register', 'Register Rescue']), noTarget: s.target === null && !s.stage.presses.length }) },
  // ── The Panels tab (sheet 32; #296, the Lead's answers 1–7): the Hacker's phone, in Room B ──
  panels: { page: 'phone', url: 'scenario=board', steps: STEPS.panels,
    facts: s => ({ frame: s.sheet?.id === 'panels' && s.sheet.title === 'Panels' && s.sheet.sub === null && s.sheet.close && !s.sheet.back && !s.sheet.foot.length,
      partOnly: !!s.panels?.first && s.sheet.children.join() === 'ms-panels' && s.sheet.game === null, view: s.panels?.view === 'list' && s.panels.label === 'Panels',
      rows: rows(s, 'value') === 'windows|navigation|hospital|players|round-order', titles: rows(s, 'title') === 'Windows|Navigation|Hospital panel|Players|Round order',
      // This room's windows (Room B: to Room A and to the Jail), then item 29's owner-approved words; the game gives no
      // timings, so Round order's line is the Lead's "The phases, in order" (panels-0.1.1).
      lines: rows(s, 'sub') === 'Room A ↔ Room B · Room B ↔ Jail|Captain and Officer only|Patients only|Seats, rooms and public status|The phases, in order',
      icons: rows(s, 'icon') === 'window|course|panel|players|rules', open: s.panels?.rows.every(r => !r.off && r.chevron),
      tabOpen: s.tabs?.buttons.find(b => b.value === 'panels')?.expanded === 'true', noCommand: s.commands.length === 0 }),
    after: async page => {
      // Windows opens the game's own Windows panel; its Back returns to the Panels tab, the component again.
      await page.evaluate(tap(OPEN('windows')));
      await page.waitFor(SHEET('windows'), 'the Windows panel');
      const windows = await page.evaluate(LOOK);
      await page.evaluate(tap(SHEET_BACK));
      await page.waitFor(`${SHEET('panels')}&&${VIEW('list')}`, 'back to the Panels tab');
      const back = await page.evaluate(LOOK);
      return { windowsOpens: windows.sheet?.title === 'Windows' && windows.sheet.back && windows.panels === null && windows.model?.panel === 'windows',
        backToPanels: back.panels?.view === 'list' && back.model?.panel === 'panels' && back.commands.length === 0 };
    } },
  // Players (sheet 32): the board as the server gives it, with the Captain and the Officer, an injured player in the
  // Hospital, one in the Jail and one eliminated.
  players: { page: 'phone', url: 'scenario=board', steps: async page => {
      await page.evaluate(edit("const at=id=>p.board.seats.find(s=>s.seatId===id);p.offices.captainSeatId='seat-1';p.offices.officerSeatId='seat-7';at('seat-1').captain=true;at('seat-7').officer=true;"
        + "Object.assign(at('seat-3'),{health:'Injured',location:'Hospital',slotId:'H1',rescueDueAfterRound:6,medical:{admittedRound:5,rescueDueAfterRound:6,rescueOpportunity:'CURRENT_NORMAL_ROUND'}});"
        + "Object.assign(at('seat-8'),{location:'Jail',slotId:'J1',jailed:true});Object.assign(at('seat-9'),{health:'Eliminated',location:null,slotId:null})"));
      await page.waitFor(`${game}.getModel().offices?.captainSeatId==='seat-1'`, 'the offices');
      await STEPS.panels(page);
      await page.evaluate(tap(OPEN('players')));
      await page.waitFor(`${SHEET('panels')}&&${VIEW('players')}`, 'Players');
    },
    facts: s => ({ frame: s.sheet?.id === 'panels' && s.sheet.title === 'Players' && s.sheet.back && s.sheet.close, view: s.panels?.view === 'players' && s.panels.label === 'Players',
      seats: rows(s, 'seat') === '1|2|3|4|5|6|7|8|9', you: s.panels?.rows[5]?.title === '6 · Crew 6 (you)' && s.panels.rows.filter(r => r.title.includes('(you)')).length === 1,
      names: s.panels?.rows.every(r => r.title === `${r.seat} · Crew ${r.seat}${r.seat === '6' ? ' (you)' : ''}`),
      lines: rows(s, 'sub') === 'Room A|Room A|Hospital · Injured|Room A|Room A|Room B|Room B|In Jail|Eliminated',
      badges: s.panels?.rows.map(r => r.badges.join('+')).join('|') === 'Captain||||||Officer||', portraits: s.panels?.rows.every(r => r.portrait === 'ms-k-pt'),
      note: s.panels?.note === 'Public facts only: seats, rooms, health and offices.', noChevron: s.panels?.rows.every(r => !r.chevron),
      publicOnly: !!s.panels && !PRIVATE_WORDS.test(s.panels.text) }),
    after: async page => {
      // Back returns to the Panels tab's list, the same sheet.
      await page.evaluate(tap(SHEET_BACK));
      await page.waitFor(VIEW('list'), 'back to the list');
      const seen = await page.evaluate(LOOK);
      return { backToList: seen.sheet?.id === 'panels' && seen.sheet.title === 'Panels' && seen.model?.panel === 'panels' && rows(seen, 'value') === 'windows|navigation|hospital|players|round-order' };
    } },
  // Round order (sheet 32): the steps of this tuple (the Blackout rules, Blackout before the vote) in the game's words.
  'round-order': { page: 'phone', url: 'scenario=board', steps: async page => {
      await STEPS.panels(page);
      await page.evaluate(tap(OPEN('round-order')));
      await page.waitFor(`${SHEET('panels')}&&${VIEW('round-order')}`, 'Round order');
    },
    facts: s => ({ frame: s.sheet?.id === 'panels' && s.sheet.title === 'Round order' && s.sheet.back && s.sheet.close, view: s.panels?.view === 'round-order' && s.panels.label === 'Round order',
      steps: rows(s, 'title') === 'Player turns|Private talk|Sync when applicable|Blackout|Damage and Hospital placement|Jail vote|Result|Remaining resolution and Rescue|Navigation',
      kinds: rows(s, 'kind') === 'turns|private-talk|sync|blackout|hospital|jail-vote|result|resolution|navigation',
      icons: rows(s, 'icon') === 'actions|talk|blackhole|dark|hospital|vote|vote|rescue|course',
      // The game has no words for a step's timing, so none is drawn (#222), and no note (answer 5).
      noTimings: s.panels?.rows.every(r => r.sub === null), noNote: s.panels?.note === null }),
    after: async page => {
      // ✕ closes the sheet.
      await page.evaluate(tap(SHEET_CLOSE));
      await page.waitFor("!document.querySelector('.ms-ps-sheet')", '✕ closed it');
      const seen = await page.evaluate(LOOK);
      return { closes: seen.panels === null && seen.model?.panel === 'board' };
    } },
  // ── The frozen Food release while players are away on its Task (answers 4 and 7; the Lead, 18 November): the
  // viewer (Fay) stays aboard while Cleo and Hana are away, and opens Panels from the Task's own tabs ──
  'panels-food': { page: 'food', url: 'case=food-flow-09&safe=0,0', steps: async page => {
      await page.waitFor("document.querySelector('.planet-app')?.dataset.foodChrome==='true'&&document.querySelector('[data-tab=\"panels\"]')", 'the Food Task\'s own tabs');
      await page.evaluate(tap('[data-tab="panels"]'));
      await page.waitFor(`${SHEET('panels')}&&${VIEW('list')}`, 'the game\'s Panels tab');
    },
    facts: s => ({ frame: s.sheet?.title === 'Panels' && !s.sheet.back, away: s.model?.food?.step === 'AWAY' && s.model.food.away?.join() === 'seat-3,seat-8',
      // The component's list first, then the Food release's own Tasks button (answer 7).
      partThenTasks: !!s.panels?.first && s.sheet.children.join() === 'ms-panels,planet-sheet-body' && s.sheet.game?.buttons.join() === 'Tasks',
      rows: rows(s, 'value') === 'windows|navigation|hospital|players|round-order', order: s.panels?.rows.at(-1)?.sub === 'The phases, in order' }) },
  'players-away': { from: 'panels-food', steps: async page => {
      await page.evaluate(tap(OPEN('players')));
      await page.waitFor(`${SHEET('panels')}&&document.querySelector('.ms-ps-sheet-title h2')?.textContent==='Players'&&!document.querySelector(${JSON.stringify(PANELS)})`, 'Players, the game\'s own lines');
    },
    // Exactly one list (the Lead's check before the push): the component is not mounted, and the game's own line for
    // each seat says who is away.
    facts: s => {
      const lines = s.sheet?.game?.lines ?? [];
      return { frame: s.sheet?.id === 'panels' && s.sheet.title === 'Players' && s.sheet.back, noPart: s.panels === null && s.sheet.children.join() === 'planet-sheet-body',
        oneList: lines.length === 9 && [1, 2, 3, 4, 5, 6, 7, 8, 9].every(n => lines.filter(l => l.startsWith(`Player ${n} ·`)).length === 1),
        away: lines.filter(l => l.endsWith('Away on the Food Supply Task')).map(l => l.split(' · ')[0]).join() === 'Player 3,Player 8',
        noComponentWords: !s.page.includes('Public facts only') && !s.page.includes('(you)') };
    },
    after: async page => {
      // Back returns to the list, the component again.
      await page.evaluate(tap(SHEET_BACK));
      await page.waitFor(VIEW('list'), 'back to the list');
      const seen = await page.evaluate(LOOK);
      return { backToList: seen.sheet?.title === 'Panels' && seen.panels?.view === 'list' && seen.sheet.game?.buttons.join() === 'Tasks' };
    } },
  // ── Promises (sheets 33 and 33.1): the Hacker (Crew 6) in a private talk with Crew 1, who has offered Meet in Room A ──
  promises: { page: 'phone', url: 'scenario=promises', steps: STEPS.promises,
    facts: s => ({ frame: s.sheet?.id === 'promises' && s.sheet.title === 'Promises' && s.sheet.sub === null && s.sheet.close && !s.sheet.back && !s.sheet.foot.length,
      partOnly: !!s.promises?.first && s.sheet.children.join() === 'ms-promises' && s.sheet.game === null, view: s.promises?.view === 'list',
      // The quota, then the talk's group: Offer a Promise, and Crew 1's offer. In a talk, Received and Given only for an accepted Promise (answer 5).
      rows: promiseRows(s) === 'Your quota / Given 0/1 · Received 0/1|Offer a Promise / Six kinds · exact terms|Crew 1 offered you one / Meet in Room A',
      labels: s.promises?.labels.join('|') === 'With Crew 1 · talking now', offerOn: !prow(s, 'offer')?.off && !!prow(s, 'offer')?.chevron && !!prow(s, 'incoming')?.chevron,
      noCommand: s.commands.length === 0, infoScene: s.stage.scene }) },
  'promise-kinds': { from: 'promises', steps: async page => {
      await page.evaluate(tap(PROW('offer')));
      await page.waitFor(PVIEW('kinds'), 'the six kinds');
    },
    facts: s => ({ frame: s.sheet?.id === 'promises' && s.sheet.title === 'Offer to Crew 1' && s.sheet.back && s.sheet.close, next: foot(s) === 'next:Next:off',
      note: s.promises?.notes.join('|') === 'Only during your private talk. It counts once Crew 1 accepts.',
      tiles: s.promises?.tiles.map(t => `${t.value}:${t.state}:${t.pressed}`).join() === ['CAPTAIN_SUPPORT', 'OFFICER_SELECTION', 'JAIL_VOTE', 'NO_JAIL_VOTE', 'MEET_A', 'MEET_B'].map(k => `${k}:available:false`).join(),
      names: s.promises?.tiles.map(t => t.name).join('|') === 'Captain Support|Officer Selection|Jail Vote|No Jail Vote|Meet in Room A|Meet in Room B',
      noTarget: s.target === null && s.chip === null, noCommand: s.commands.length === 0 }),
    after: async page => {
      // A kind is this phone's own choice: amber and pressed, and Next waits for it. Nothing is sent.
      await page.evaluate(tap(KIND('CAPTAIN_SUPPORT')));
      await page.waitFor(PRESSED(KIND('CAPTAIN_SUPPORT')), 'Captain Support chosen');
      const seen = await page.evaluate(LOOK);
      return { kindChosen: seen.promises?.tiles.find(t => t.value === 'CAPTAIN_SUPPORT')?.state === 'selected' && foot(seen) === 'next:Next', kindLocal: seen.commands.length === 0 && seen.model?.action === null };
    } },
  'promise-target': { from: 'promise-kinds', steps: async page => {
      await page.evaluate(tap(KIND('JAIL_VOTE')));
      await page.waitFor(PRESSED(KIND('JAIL_VOTE')), 'Jail Vote chosen');
      await page.evaluate(tap(FOOT('next')));
      await page.waitFor(PVIEW('target'), 'Jail Vote\'s player');
      await page.evaluate(tap(PICK(3)));
      await page.waitFor(PRESSED(PICK(3)), 'Crew 3 chosen');
    },
    // Exactly the offer's promiseTargetSeatIds (answer 4): here every seat, this phone's own among them.
    facts: s => ({ frame: s.sheet?.id === 'promises' && s.sheet.title === 'Who will you vote to jail?' && s.sheet.back && s.sheet.close, next: foot(s) === 'next:Next',
      rows: s.promises?.rows.map(r => r.title).join('|') === [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n} · Crew ${n}`).join('|'),
      chosen: s.promises?.rows.filter(r => r.pressed === 'true').map(r => r.value).join() === '3' && s.promises.rows.filter(r => r.mark).length === 1,
      portraits: s.promises?.rows.every(r => r.portrait), noTarget: s.target === null && s.chip === null, noCommand: s.commands.length === 0 }) },
  'promise-confirm': { from: 'promise-target', steps: async page => {
      await page.evaluate(tap(FOOT('next')));
      await page.waitFor(PVIEW('confirm'), 'the terms');
    },
    facts: s => ({ frame: s.sheet?.id === 'promises' && s.sheet.title === 'Check the terms' && s.sheet.back && s.sheet.close, foot: foot(s) === 'back:Back|offer:Offer',
      // Frontend's exact terms, as the controller's own check words them (planetPromiseTerms).
      card: s.promises?.card?.name === 'Jail Vote' && s.promises.card.terms === 'Player 6 votes for Player 3 at the next Jail vote of Round 6; admission is not required.' && !s.promises.card.portrait,
      facts: s.promises?.facts.join('|') === 'Uses your one given Promise only if Crew 1 accepts|Only you and Crew 1 see it', noCommand: s.commands.length === 0 && s.model?.action === null }),
    after: async page => {
      // The footer's Back returns to Jail Vote's player, still chosen; Next comes back to the terms.
      await page.evaluate(tap(FOOT('back')));
      await page.waitFor(`${PVIEW('target')}&&${PRESSED(PICK(3))}`, 'back to Crew 3, chosen');
      await page.evaluate(tap(FOOT('next')));
      await page.waitFor(PVIEW('confirm'), 'the terms again');
      const seen = await page.evaluate(LOOK);
      return { backKeeps: seen.promises?.card?.terms?.includes('Player 3') && seen.commands.length === 0 };
    } },
  // Offer, with Jail Vote and Crew 3: the controller makes its own draft (the partner, the kind, the player) and
  // its own check refuses it ("That choice is no longer offered."): it looks for the Jail Vote's player among the
  // offer's recipients (apps/game/src/planet/controller.ts commandAllowed), so nothing is sent. Frontend's, recorded
  // as a gap; the sheet keeps the terms, and no draft or target bar is left behind. R2 with A3 (the Lead's approval
  // of 18 November): the model's words, verbatim, in the kit's inline error, the body's last part, whole above Back
  // and Offer; the game's status line hides while they show, so they are said once. They hold for the view they came
  // in: the session reads it again within 2 s (session.ts), where the controller clears its message, and they stay.
  'promise-refused': { from: 'promise-confirm', steps: async page => {
      await page.evaluate(tap(FOOT('offer')));
      await page.waitFor(`${game}.getModel().message!==null&&${game}.getModel().action===null&&${NOTE}`, 'the controller\'s answer, in the sheet');
      await page.evaluate(`window.__matchBefore={message:${game}.getModel().message,revision:${game}.getModel().revision}`);
    },
    facts: (s, looks) => ({ terms: s.promises?.view === 'confirm' && s.sheet?.title === 'Check the terms' && foot(s) === 'back:Back|offer:Offer',
      words: s.promises?.error?.text === REFUSED_WORDS && s.before?.message === REFUSED_WORDS, alert: s.promises?.error?.role === 'alert',
      last: s.promises?.error?.last === true, whole: s.promises?.error?.whole === true, oneNote: s.notes === 1, statusHidden: s.status === null,
      noCommand: s.commands.length === 0, noDraft: s.model?.action === null, noTarget: s.target === null && s.chip === null,
      sameRoom: s.stage.scene === looks.promises?.stage.scene }),
    after: async (page, seen) => {
      const reads = await page.evaluate(READS);
      await page.waitFor(`${READS}>${reads}&&${game}.getModel().message===null`, 'the next read of the same view', 6000);
      await sleep(300);
      const again = await page.evaluate(LOOK);
      return { rereadKeeps: again.promises?.error?.text === REFUSED_WORDS && again.notes === 1 && again.model?.message === null && again.model?.revision === seen.before?.revision,
        rereadStatusHidden: again.status === null };
    } },
  // The player's next tap clears the words. Offer again is refused again, with the same words; the footer's Back at
  // once, before the session's next read clears the controller's message, takes them, and they are not said again:
  // the status line keeps still while the model's message is the one the sheet showed. Next back to the terms
  // shows them without the words.
  'promise-refused-back': { from: 'promise-refused', steps: async page => {
      await page.evaluate(`(async () => {
        const frame = () => new Promise(done => requestAnimationFrame(() => done())), view = () => document.querySelector(${JSON.stringify(PROMISES)})?.dataset.view;
        for (let attempt = 1; attempt <= 3; attempt++) {
          document.querySelector(${JSON.stringify(FOOT('offer'))}).click();
          for (let i = 0; i < 60 && !${NOTE}; i++) await frame();
          const words = ${NOTE}?.querySelector('.ms-k-error-text')?.textContent ?? null;
          document.querySelector(${JSON.stringify(FOOT('back'))}).click();
          await frame(); await frame();
          const status = document.querySelector('.planet-status');
          const seen = { words, messageAtBack: ${game}.getModel().message, statusAtBack: status && !status.hidden ? status.textContent.trim() : null, notesAtBack: document.querySelectorAll('.ms-phone-shell .ms-k-error').length, attempt };
          // A read of the view between the two taps clears the message first: then once more, from the terms.
          if (seen.messageAtBack === seen.words || attempt === 3) { window.__matchBefore = seen; return; }
          document.querySelector(${JSON.stringify(FOOT('next'))}).click();
          for (let i = 0; i < 60 && view() !== 'confirm'; i++) await frame();
        }
      })()`);
      await page.waitFor(`${PVIEW('target')}&&${PRESSED(PICK(3))}`, 'back to Crew 3, chosen');
    },
    facts: s => ({ target: s.sheet?.title === 'Who will you vote to jail?' && foot(s) === 'next:Next', refusedAgain: s.before?.words === REFUSED_WORDS && s.commands.length === 0,
      quiet: s.before?.messageAtBack === REFUSED_WORDS && s.before.statusAtBack === null && s.before.notesAtBack === 0,
      noNote: s.notes === 0 && !s.page.includes(REFUSED_WORDS), statusHidden: s.status === null, infoAttempt: s.before?.attempt }),
    after: async page => {
      await page.evaluate(tap(FOOT('next')));
      await page.waitFor(PVIEW('confirm'), 'the terms again');
      const seen = await page.evaluate(LOOK);
      return { termsAgain: seen.promises?.card?.terms?.includes('Player 3') && foot(seen) === 'back:Back|offer:Offer', termsNoNote: seen.notes === 0 && !seen.page.includes(REFUSED_WORDS),
        termsStatusHidden: seen.status === null };
    } },
  'promise-sent': { from: 'promise-refused-back', steps: async page => {
      // Back to the kinds (the footer's Back, then the head's), Meet in Room B, Next, Offer.
      await page.evaluate(tap(FOOT('back')));
      await page.waitFor(PVIEW('target'), 'Jail Vote\'s player');
      await page.evaluate(tap(SHEET_BACK));
      await page.waitFor(PVIEW('kinds'), 'the kinds');
      await page.evaluate(tap(KIND('MEET_B')));
      await page.waitFor(PRESSED(KIND('MEET_B')), 'Meet in Room B chosen');
      await page.evaluate(tap(FOOT('next')));
      await page.waitFor(`${PVIEW('confirm')}&&document.querySelector(${JSON.stringify(PROMISES)})?.textContent.includes('Room B')`, 'its terms');
      await page.evaluate(tap(FOOT('offer')));
      await page.waitFor(`document.querySelector('.ms-ps-toast')&&${PVIEW('list')}`, 'the receipt and the list');
    },
    // One OFFER_PROMISE, the controller's own, with the talk's partner and the kind; its receipt in the toast in
    // Frontend's words, once (the status line hides under it). Nothing chose on the scene: no target bar, and the room
    // stays the talk's.
    facts: (s, looks) => ({ command: JSON.stringify(s.commands) === JSON.stringify([{ type: 'OFFER_PROMISE', recipientSeatId: 'seat-1', kind: 'MEET_B', targetSeatId: null }]),
      toast: s.toast === 'Registered. Waiting for the authoritative view.' && s.status === null, list: s.promises?.view === 'list' && s.sheet?.title === 'Promises',
      noTarget: s.target === null && s.chip === null, sameRoom: s.stage.scene === looks.promises?.stage.scene }) },
  'promise-waiting': { from: 'promise-sent', steps: async page => {
      await page.evaluate(edit("p.promises.push({id:'given-offer',giverSeatId:'seat-6',recipientSeatId:'seat-1',kind:'MEET_B',targetSeatId:null,round:6,electionId:null,accepted:false,status:'Pending',offerStatus:'offered'})"));
      await page.waitFor(`document.querySelector(${JSON.stringify(PROMISES)})?.textContent.includes('Waiting for Crew 1')`, 'the offer waiting');
    },
    // The next view has the offer: "Waiting for Crew 1" (sheet 33's offered list), not counted yet.
    facts: s => ({ labels: s.promises?.labels.join('|') === 'Waiting for Crew 1|With Crew 1 · talking now',
      rows: promiseRows(s) === 'Your quota / Given 0/1 · Received 0/1|Meet in Room B / Offered to Crew 1 · not counted yet / Offered|Offer a Promise / Six kinds · exact terms|Crew 1 offered you one / Meet in Room A',
      portrait: !!s.promises?.rows[1]?.portrait, oneCommand: s.commands.length === 1 }) },
  'promise-incoming': { page: 'phone', url: 'scenario=promises', steps: async page => {
      await STEPS.promises(page);
      await page.evaluate(tap(PROW('incoming')));
      await page.waitFor(PVIEW('incoming'), 'Crew 1\'s offer');
    },
    facts: s => ({ frame: s.sheet?.id === 'promises' && s.sheet.title === 'Offer from Crew 1' && !s.sheet.back && s.sheet.close, foot: foot(s) === 'decline:Decline|accept:Accept',
      card: s.promises?.card?.name === 'Meet in Room A' && s.promises.card.terms === 'Player 1 will be in Room A when Round 6\'s voting begins, after Sync.' && s.promises.card.portrait,
      facts: s.promises?.facts.join('|') === 'Accepting uses your one received Promise|A Promise is never forced: it is checked against real ballots', noCommand: s.commands.length === 0 }) },
  'promise-accepted': { from: 'promise-incoming', steps: async page => {
      await page.evaluate(tap(FOOT('accept')));
      await page.waitFor(`document.querySelector('.ms-ps-toast')&&${PVIEW('list')}`, 'the receipt and the list');
      await page.evaluate("window.__matchBefore={toast:document.querySelector('.ms-ps-toast')?.textContent.trim()??null}");
      await page.evaluate(edit("const x=p.promises.find(x=>x.id==='incoming-promise');Object.assign(x,{accepted:true,offerStatus:'accepted'});p.promiseQuota={given:false,received:true};p.offers=p.offers.filter(o=>o.type==='OFFER_PROMISE')"));
      await page.waitFor(`document.querySelector(${JSON.stringify(PROMISES)})?.textContent.includes('Received')`, 'the Promise received');
    },
    // One ACCEPT_PROMISE for that offer, its receipt in the toast; then the view has it accepted: in the talk, Received
    // shows it (answer 5), with Crew 1's portrait and its status.
    facts: s => ({ command: JSON.stringify(s.commands) === JSON.stringify([{ type: 'ACCEPT_PROMISE', promiseId: 'incoming-promise' }]),
      toast: s.before?.toast === 'Registered. Waiting for the authoritative view.', labels: s.promises?.labels.join('|') === 'With Crew 1 · talking now|Received',
      rows: promiseRows(s) === 'Your quota / Given 0/1 · Received 1/1|Offer a Promise / Six kinds · exact terms|Meet in Room A / From Crew 1 / Pending',
      note: s.promises?.notes.at(-1) === '“Not fulfilled” is a fact about ballots or rooms. It is not proof of lying.' }) },
  // A refusal's words go at the next model change: the next view clears the controller's message (R2).
  'refused-next-view': { page: 'phone', url: 'scenario=promises', steps: async page => {
      await STEPS.refused(page);
      await page.evaluate(edit(''));
      await page.waitFor(`${game}.getModel().message===null&&!${NOTE}`, 'the next view');
    },
    facts: s => ({ terms: s.promises?.view === 'confirm' && s.promises.card?.terms?.includes('Player 3') && foot(s) === 'back:Back|offer:Offer',
      noNote: s.notes === 0 && !s.page.includes(REFUSED_WORDS), statusClear: s.status === null, noCommand: s.commands.length === 0 }) },
  // A tap out of the sheet takes them too: the top bar's Promises (render.mjs's calm()).
  'refused-elsewhere': { page: 'phone', url: 'scenario=promises', steps: async page => {
      await STEPS.refused(page);
      await page.evaluate(tap(TOP_PROMISES));
      await page.waitFor(`!${NOTE}`, 'the words gone');
    },
    facts: s => ({ noNote: s.notes === 0 && !s.page.includes(REFUSED_WORDS), statusHidden: s.status === null, noCommand: s.commands.length === 0,
      infoSheet: s.sheet?.id ?? null, infoView: s.promises?.view ?? null }) },
  // A blur (not the player's intent: a notification can blur the window) closes the sheet with the words
  // (render.mjs onBlur: calm(), the Bars & Icons builder's review). Frontend's app also hides its session on a blur
  // (app.mjs concealRole), so the connection is interrupted at once: the controller's message is its own
  // "Connection interrupted…", under the reconnecting banner, and the words are dropped as when the phone is put away.
  // onBlur's said=null would let the status line say them once, were the message still them. Measured at the blur.
  'refused-blur': { page: 'phone', url: 'scenario=promises', steps: async page => {
      await STEPS.refused(page);
      await page.evaluate(`(async () => {
        const frame = () => new Promise(done => requestAnimationFrame(() => done())), reads = () => ${READS};
        const n = reads(); for (let i = 0; i < 300 && reads() === n; i++) await frame();
        document.querySelector(${JSON.stringify(FOOT('offer'))}).click();
        for (let i = 0; i < 60 && !${NOTE}; i++) await frame();
        const noted = !!${NOTE};
        window.dispatchEvent(new Event('blur'));
        await frame(); await frame();
        const status = document.querySelector('.planet-status');
        window.__matchBefore = { noted, messageAtBlur: ${game}.getModel().message, statusAtBlur: status && !status.hidden ? status.textContent.trim() : null,
          sheetAtBlur: document.querySelector('.ms-ps-sheet')?.dataset.sheet ?? null, notesAtBlur: document.querySelectorAll('.ms-phone-shell .ms-k-error').length };
      })()`);
    },
    facts: s => ({ notedFirst: s.before?.noted === true, noSheet: s.before?.sheetAtBlur === null && s.sheet === null, noNote: s.before?.notesAtBlur === 0 && s.notes === 0,
      interrupted: s.before?.messageAtBlur === 'Connection interrupted. Your command recovery is retained.' && s.before.statusAtBlur === null && s.banner?.kind === 'reconnecting',
      noWords: !s.page.includes(REFUSED_WORDS), noCommand: s.commands.length === 0 }),
    after: async page => {
      await page.evaluate("window.dispatchEvent(new Event('focus'))");
      await page.waitFor(`${game}.getModel().connection==='live'&&document.querySelector('.ms-phone-shell')?.dataset.status==='live'`, 'live again');
      const seen = await page.evaluate(LOOK);
      return { backNoNote: seen.notes === 0 && !seen.page.includes(REFUSED_WORDS), backClear: seen.status === null, infoBackSheet: seen.sheet?.id ?? null };
    } },
  // A hidden page keeps nothing of them, and they do not come back when the page shows again.
  'refused-concealed': { page: 'phone', url: 'scenario=promises', steps: async page => {
      await STEPS.refused(page);
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor(`${game}.getModel().concealed&&document.querySelector('.ms-phone-shell')?.dataset.status==='concealed'`, 'concealed');
    },
    facts: s => ({ nothingLeft: s.notes === 0 && !s.page.includes(REFUSED_WORDS) && s.promises === null, noCommand: s.commands.length === 0 }),
    after: async page => {
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor(`!${game}.getModel().concealed&&${game}.getModel().connection==='live'&&document.querySelector('.ms-phone-shell')?.dataset.status==='live'`, 'shown again');
      const seen = await page.evaluate(LOOK);
      return { shownNoNote: seen.notes === 0 && !seen.page.includes(REFUSED_WORDS), shownStatusClear: seen.status === null, infoShownSheet: seen.sheet?.id ?? null };
    } },
  // The talk's phase ends under the words: the sheet closes with it (the controller clears the panel at a new phase),
  // and nothing of them is left. The harness answers every command, so the server's own "The server closed that
  // phase." cannot be drawn here: the connection never shows those words in a sheet (refusal-words.mjs, and
  // apps/game/test/planet-refusals.test.mjs on the real controller). No phase-closed toast here: the refused offer
  // left no choice in the controller, and a draft showing a refusal's words is not one (promisesDrafting()).
  'refused-phase-closed': { page: 'phone', url: 'scenario=promises', steps: async page => {
      await STEPS.refused(page);
      await page.evaluate(edit("p.phase={id:'after-talk',kind:'ORDINARY_TURN',startedAt:now,endsAt:now+60000};p.hackSession=null;p.activeSeatId='seat-2'"));
      await page.waitFor(`${game}.getModel().phase?.kind==='ORDINARY_TURN'&&!${NOTE}`, 'the turn after the talk');
    },
    facts: s => ({ sheetClosed: s.sheet === null && s.promises === null, noNote: s.notes === 0 && !s.page.includes(REFUSED_WORDS), statusClear: s.status === null,
      noCommand: s.commands.length === 0, noToast: s.toast === null }) },
  // A Promise being drafted when the talk's time runs out (the Lead, 18 November): the terms open and unsent, and the
  // talk's 60 s moved so that it ends 1.2 s on. At 0:00 the sheet closes under the player's thumb, and the shell's
  // toast says why, once (shell-input.mjs phaseClosed(), told of the draft by promises-input.mjs promisesDrafting());
  // nothing is sent. Then the turn after the talk arrives: the same closed phase gives no second toast.
  'promise-draft-closed': { page: 'phone', url: 'scenario=promises', steps: async page => {
      await STEPS.terms(page);
      await page.evaluate(edit("const length=p.phase.endsAt-p.phase.startedAt;p.phase={...p.phase,startedAt:now+1200-length,endsAt:now+1200}"));
      await page.waitFor("document.querySelector('.ms-ps-toast')", 'the toast when the time is up', 8000);
      await page.evaluate(`window.__matchBefore={expired:${game}.getModel().phase?.expired===true,phase:${game}.getModel().phase?.id??null}`);
    },
    facts: s => ({ toast: s.toast === 'That phase closed · choices cleared', sheetClosed: s.sheet === null && s.promises === null, timeUp: s.before?.expired === true && s.before.phase === 'planet-phase-HACK',
      noDraft: s.model?.action === null, statusClear: s.status === null, noCommand: s.commands.length === 0 }),
    after: async page => {
      await page.waitFor("!document.querySelector('.ms-ps-toast')", 'the toast gone after its time', 6000);
      await page.evaluate(edit("p.phase={id:'after-talk',kind:'ORDINARY_TURN',startedAt:now,endsAt:now+60000};p.hackSession=null;p.activeSeatId='seat-2'"));
      await page.waitFor(`${game}.getModel().phase?.id==='after-talk'&&${game}.getModel().phase.trusted&&!${game}.getModel().phase.expired`, 'the turn after the talk');
      await sleep(500);
      const seen = await page.evaluate(LOOK);
      return { notAgain: seen.toast === null && seen.commands.length === 0, nextTurn: seen.model?.phase === 'ORDINARY_TURN' };
    } },
  // The results (sheet 33.1), after the talk: Received and Given with their status, names and portraits.
  'promise-results': { page: 'phone', url: 'scenario=promise-results', steps: async page => {
      await page.evaluate(edit("p.phase={id:'after-talk',kind:'ORDINARY_TURN',startedAt:now,endsAt:now+60000};p.hackSession=null;p.activeSeatId='seat-2'"));
      await page.waitFor(`${game}.getModel().phase?.kind==='ORDINARY_TURN'&&${game}.getModel().phase.trusted`, 'the turn after the talk');
      await STEPS.promises(page);
    },
    facts: s => ({ frame: s.sheet?.title === 'Promises' && !s.sheet.back, labels: s.promises?.labels.join('|') === 'Received|Given',
      rows: promiseRows(s) === 'Your quota / Given 1/1 · Received 1/1|Jail Vote / From Crew 3 / Not fulfilled|Meet in Room B / To Crew 1 / Pending',
      portraits: s.promises?.rows.slice(1).every(r => r.portrait), note: s.promises?.notes.join('|') === '“Not fulfilled” is a fact about ballots or rooms. It is not proof of lying.',
      noTalk: !s.promises?.text.includes('talking now'), noCommand: s.commands.length === 0 }) },
  // ── Windows (#299, release 3 step 3; sheet 34) ──
  // At a station (B1, Room A ↔ Room B's): the sheet shows that window only (the component's decision 2), with this
  // round's drawings by name, the drawing box, the four inks, and Show off while nothing is drawn.
  windows: { page: 'phone', url: 'scenario=windows', steps: STEPS.windows,
    facts: s => ({ frame: s.sheet?.id === 'windows' && s.sheet.title === 'Windows' && s.sheet.back && s.sheet.close && s.sheet.sub === null,
      part: s.windows?.first === true, showOff: foot(s) === 'show:Show:off', noCommand: s.commands.length === 0, statusClear: s.status === null,
      // This player's room first: Room B, at B1; each drawing's author by name, this player's own "Can't be changed".
      head: s.windows?.heads.join('||') === 'Room B ↔ Room A|Your station · B1', drawings: s.windows?.drawings === 2,
      metas: s.windows?.metas.join('||') === '1 · Crew 1 · Round 6|Unverified||2 · Crew 6 · Round 6|Can’t be changed', label: s.windows?.labels.join('|') === 'Shown this round',
      box: s.windows?.pad?.label === 'Drawing for Room B ↔ Room A' && s.windows.pad.strokes === 0,
      inks: s.windows?.inks.join('|') === 'Gold:true|Paper:false|Teal:false|Pink:false', undoOff: s.windows?.undoOff === true }) },
  // Two strokes, the second in Teal, drawn with real input in the box: the draft is this phone's own, nothing is sent.
  'windows-drawn': { from: 'windows', steps: async page => {
      await drawStroke(page, [0.15, 0.3], [0.45, 0.7]);
      await page.evaluate(tap(`${WINDOWS} .ms-wn-swatch[aria-label="Teal"]`));
      await drawStroke(page, [0.55, 0.7], [0.85, 0.3]);
      await page.waitFor(`document.querySelectorAll(${JSON.stringify(WINDOWS + ' .ms-wn-pad .ms-wn-stroke')}).length===2`, 'two strokes in the box');
    },
    extra: async page => ({ ring: await page.evaluate(RING), focused: await page.evaluate(FOCUSED) }),
    facts: (s, looks, { ring, focused }) => ({ strokes: s.windows?.pad?.strokes === 2, showOn: foot(s) === 'show:Show', noCommand: s.commands.length === 0,
      teal: s.windows?.inks.join('|') === 'Gold:false|Paper:false|Teal:true|Pink:false', undoOn: s.windows?.undoOff === false,
      // The box's focus ring is the keyboard's: none after strokes drawn with a pointer (windows-0.1.1, the Lead's rule).
      noRing: ring === false, infoFocused: focused }) },
  // Show: the controller's own draft of the drawing, then confirm; one SHOW_WINDOW with the two strokes. The harness
  // answers every command and changes nothing, so the check plays the server: the next view has the drawing, by this
  // player, at Room A ↔ Room B. Then the shown view: the drawing with its SHOWN stamp, and Done.
  'windows-shown': { from: 'windows-drawn', steps: async page => {
      await page.evaluate(tap(FOOT('show')));
      await page.waitFor(`(window.planetHarness?.requests??[]).some(r=>r.operation==='command'&&r.request.command.type==='SHOW_WINDOW')`, 'Show sent');
      await page.evaluate(edit(SHOW_SERVED));
      await page.waitFor(`document.querySelector(${JSON.stringify(WINDOWS + ' .ms-wn-stamp')})&&document.querySelector('.ms-ps-sheet-foot [data-value="done"]')`, 'the shown view');
    },
    facts: s => ({ sent: s.commands.length === 1 && s.commands[0].type === 'SHOW_WINDOW' && s.commands[0].windowId === 'A_B' && s.commands[0].drawing?.strokes?.length === 2,
      // The pack's pen: Gold first, then Teal, each 6 wide in 512; every point the finger passed.
      strokes: s.commands[0]?.drawing?.strokes?.map(x => `${x.color}/${x.width}/${x.points.length}`).join(' ') === '#F7D886/6/9 #57BBA8/6/9',
      stamp: s.windows?.stamp === 'SHOWN', done: foot(s) === 'done:Done', noPad: s.windows?.pad === null,
      shownFirst: s.windows?.metas[0] === '3 · Crew 6 · Round 6|Can’t be changed' && s.windows.metas.length === 3,
      // The shown view is the receipt: no toast, and no status line.
      quiet: s.toast === null && s.status === null }) },
  // Done: the station's view again, with a blank box and Show off; the drawing is among this round's.
  'windows-done': { from: 'windows-shown', steps: async page => {
      await page.evaluate(tap(FOOT('done')));
      await page.waitFor(`document.querySelector(${JSON.stringify(WINDOWS + ' .ms-wn-pad')})`, 'the box again');
    },
    facts: s => ({ blank: s.windows?.pad?.strokes === 0, showOff: foot(s) === 'show:Show:off', oneCommand: s.commands.length === 1, noStamp: s.windows?.stamp === null,
      shownAmong: s.windows?.metas.join('||') === '1 · Crew 1 · Round 6|Unverified||2 · Crew 6 · Round 6|Can’t be changed||3 · Crew 6 · Round 6|Can’t be changed' }) },
  // Away from a station (B5): the view, the room's windows, each with its drawings, and no footer.
  'windows-view': { page: 'phone', url: 'scenario=windows', steps: async page => {
      await page.evaluate(edit("p.board.seats.find(x=>x.seatId===p.self.seatId).slotId='B5';for(const w of p.windows)w.canDraw=false;p.offers=p.offers.filter(o=>o.type!=='SHOW_WINDOW')"));
      await page.waitFor(`${game}.getModel().board?.seats?.find(x=>x.seatId===${game}.getModel().ownSeatId)?.slotId==='B5'`, 'at B5');
      await STEPS.windows(page);
    },
    facts: s => ({ noPad: s.windows?.pad === null, noFoot: s.sheet?.foot.length === 0, noCommand: s.commands.length === 0,
      heads: s.windows?.heads.join('||') === 'Room B ↔ Room A|Ends with the round||Room B ↔ Jail|Ends with the round',
      metas: s.windows?.metas.join('||') === '1 · Crew 1 · Round 6|Unverified||2 · Crew 6 · Round 6|Can’t be changed' && s.windows.drawings === 2 }) },
  // In the Command Room, which has no window: the game's own sentence, the one it has for no window and windows
  // closed now alike (W1), in the component's waiting block.
  'windows-none': { page: 'phone', url: 'scenario=windows', steps: async page => {
      await page.evaluate(edit("Object.assign(p.board.seats.find(x=>x.seatId===p.self.seatId),{location:'Command Room',slotId:'C1'});p.windows=[];p.offers=p.offers.filter(o=>o.type!=='SHOW_WINDOW')"));
      await page.waitFor(`${game}.getModel().board?.seats?.find(x=>x.seatId===${game}.getModel().ownSeatId)?.location==='Command Room'`, 'in the Command Room');
      await STEPS.windows(page);
    },
    facts: s => ({ wait: s.windows?.wait === 'No window is visible from your current location.', noPad: s.windows?.pad === null, noFoot: s.sheet?.foot.length === 0,
      noCommand: s.commands.length === 0, noHead: s.windows?.heads.length === 0 }) },
  // Show by the keyboard (the Bars & Icons builder's focus rule, #307's 680237e4): Enter on the focused Show sends it;
  // when Show gives way to Done in the same open sheet, the focus goes to Done, not to the Panels tab behind it.
  'windows-keyboard-show': { page: 'phone', url: 'scenario=windows', steps: async page => {
      await STEPS.windows(page);
      await drawStroke(page, [0.2, 0.3], [0.7, 0.6]);
      await page.waitFor(`document.querySelectorAll(${JSON.stringify(WINDOWS + ' .ms-wn-pad .ms-wn-stroke')}).length===1`, 'a stroke in the box');
      await page.evaluate(`document.querySelector(${JSON.stringify(FOOT('show'))}).focus()`);
      await pressKey(page, 'Enter', 'Enter', 13, '\r');
      await page.waitFor(`(window.planetHarness?.requests??[]).some(r=>r.operation==='command'&&r.request.command.type==='SHOW_WINDOW')`, 'Show sent by Enter');
      await page.evaluate(edit(SHOW_SERVED));
      await page.waitFor(`document.querySelector(${JSON.stringify(WINDOWS + ' .ms-wn-stamp')})&&document.querySelector('.ms-ps-sheet-foot [data-value="done"]')`, 'the shown view');
      // Done is this phone's own (the component's local action), which the shell draws as `sheet-local`.
      await page.waitFor(`${FOCUSED}==='sheet-local:done'`, 'the focus on Done');
    },
    extra: async page => ({ focused: await page.evaluate(FOCUSED) }),
    facts: (s, looks, { focused }) => ({ sent: s.commands.length === 1 && s.commands[0].type === 'SHOW_WINDOW' && s.commands[0].drawing?.strokes?.length === 1,
      stamp: s.windows?.stamp === 'SHOWN', done: foot(s) === 'done:Done', focusOnDone: focused === 'sheet-local:done' }) },
  // A panel page's Back by the keyboard (the same rule): Players' Back returns to the Panels list in the same sheet,
  // and the focus goes to the Panels sheet's Close, not to the tab behind it.
  'panels-back-focus': { page: 'phone', url: 'scenario=board', steps: async page => {
      await STEPS.panels(page);
      await page.evaluate(tap(OPEN('players')));
      await page.waitFor(`${SHEET('panels')}&&${VIEW('players')}`, 'Players');
      await page.evaluate(`document.querySelector(${JSON.stringify(SHEET_BACK)}).focus()`);
      await pressKey(page, 'Enter', 'Enter', 13, '\r');
      await page.waitFor(VIEW('list'), 'back to the list');
      await page.waitFor(`${FOCUSED}==='sheet-close:'`, 'the focus on the sheet\'s Close');
    },
    extra: async page => ({ focused: await page.evaluate(FOCUSED) }),
    facts: (s, looks, { focused }) => ({ list: s.sheet?.id === 'panels' && s.sheet.title === 'Panels' && s.panels?.view === 'list' && s.model?.panel === 'panels',
      focusOnClose: focused === 'sheet-close:', noCommand: s.commands.length === 0 }) },
  // Shell 0.3.3 in the game (the Lead's and the Bars & Icons builder's ask, 18 November): the partner's offer, on the
  // smallest phone at the Largest text, the first game sheet the shell squeezes. Its head, its content's room, then
  // Accept reached by scrolling, and its tap, at its place on the screen, sending the one ACCEPT_PROMISE.
  'promise-incoming-largest': { page: 'phone', url: 'scenario=promises', sizes: ['320x568'], steps: async page => {
      await largestText(page);
      await STEPS.promises(page);
      await page.evaluate(tap(PROW('incoming')));
      await page.waitFor(PVIEW('incoming'), 'Crew 1\'s offer');
    },
    extra: async page => ({ fit: await page.evaluate(FIT) }),
    facts: (s, looks, { fit }) => ({ frame: s.sheet?.id === 'promises' && s.sheet.title === 'Offer from Crew 1' && foot(s) === 'decline:Decline|accept:Accept',
      largest: fit?.text === '200%', titleWhole: fit?.titleWhole === true, onScreen: fit?.inView === true && fit.aboveTabs === true,
      card: s.promises?.card?.name === 'Meet in Room A' && s.promises.card.terms === 'Player 1 will be in Room A when Round 6\'s voting begins, after Sync.',
      noCommand: s.commands.length === 0, infoStacked: fit?.stacked, infoFootScrolls: fit?.footScrolls, infoTitleLines: fit?.titleLines,
      infoRoom: fit ? { content: fit.content, room: fit.room, sheet: fit.sheet, head: fit.head } : null, infoAcceptAtFirst: fit?.accept?.inView ?? null }) },
  'promise-incoming-largest-accept': { from: 'promise-incoming-largest', sizes: ['320x568'], steps: async page => {
      // As a thumb would: the sheet's scroller (the body and footer's wrapper, when the footer scrolls) to its end.
      await page.evaluate(`(() => { const sheet = document.querySelector('.ms-ps-sheet'); const scroller = sheet.hasAttribute('data-foot-scrolls') ? sheet.querySelector('.ms-ps-sheet-scroll') : sheet.querySelector('.ms-ps-sheet-body'); scroller.scrollTop = scroller.scrollHeight; })()`);
      await page.waitFor(`(${FIT})?.accept?.inView`, 'Accept in view');
    },
    extra: async page => ({ fit: await page.evaluate(FIT) }),
    facts: (s, looks, { fit }) => ({ reached: fit?.accept?.inView === true && fit.accept.touched === true, noCommand: s.commands.length === 0, infoScrolled: fit?.scrolled }),
    after: async (page, seen) => {
      const fit = await page.evaluate(FIT);
      // A tap at Accept's place on the screen: the pointer goes where a finger would, so a cover would take it.
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fit.accept.x, y: fit.accept.y, button: 'left', clickCount: 1 });
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fit.accept.x, y: fit.accept.y, button: 'left', clickCount: 1 });
      await page.waitFor(`document.querySelector('.ms-ps-toast')&&${PVIEW('list')}`, 'the receipt and the list');
      const after = await page.evaluate(LOOK);
      return { acceptSent: JSON.stringify(after.commands) === JSON.stringify([{ type: 'ACCEPT_PROMISE', promiseId: 'incoming-promise' }]),
        receipt: after.toast === 'Registered. Waiting for the authoritative view.' };
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
const dirty = git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/match-connection');
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
      if (!(state.sizes ?? PHONES).includes(sizeKey)) continue;
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
  tool: 'design/tools/match-connection-check.mjs',
  what: 'The Planet app\'s match screens drawn by Designer\'s components (release 3: Actions, design/phone-ui/components/actions; the Panels tab, design/phone-ui/components/panels; Promises, design/phone-ui/components/promises) in the phone shell, in Frontend\'s phone harness (apps/game/dev/phone) built from the candidate below',
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
