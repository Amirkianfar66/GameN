// mothership:dev-only
//
// Release 3's check (docs/design/components/match-connection.md): the Planet app's match screens drawn by
// Designer's components in the phone shell, the owner's plan of 16 November 2026. Its first step is Actions
// (design/phone-ui/components/actions): the tiles, choosing a person or a position, the list, the check, After
// Register, "Outcome unknown", Pass, Move and the Disabler's position. It bundles Frontend's phone harness
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
// A capture passes with no unexpected policy report, no failed request and no page error; the shell mounted with
// the stage in it and none of the old chrome; and the state's own facts. It writes
// design/phone-ui/review/match-connection/: one JPEG per state and size, and check.json (the headers and their
// SHA-256, the candidate and art commits, what each capture saw and its SHA-256).
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
  const harness = window.planetHarness, model = harness?.app.game?.getModel() ?? null;
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
      game: (() => { const g = q('.ms-ps-sheet-body > .planet-sheet-body', sheet); return g ? { text: text(g).slice(0, 200), buttons: [...g.querySelectorAll('button')].map(b => b.id || text(b)) } : null; })(),
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
    model: model ? { connection: model.connection, concealed: model.concealed, phase: model.phase?.kind ?? null, panel: model.panel, ownSeatId: model.ownSeatId, round: model.round,
      own: (seat => seat ? seat.location + ' ' + seat.slotId : null)(model.board?.seats?.find(x => x.seatId === model.ownSeatId)),
      action: model.action ? { type: model.action.type, step: model.action.step, selected: model.action.selected } : null, recovery: model.recovery } : null,
    commands: (window.planetHarness?.requests ?? []).filter(r => r.operation === 'command').map(r => ({ type: r.request.command.type, ...r.request.command })),
    page: document.body.innerText,
    violations: window.__policy,
  };
})()`;

const names = s => (s.actions?.tiles ?? []).map(t => `${t.type}:${t.state}`).join(',');
const foot = s => (s.sheet?.foot ?? []).map(b => `${b.value}:${b.label}${b.disabled ? ':off' : ''}${b.busy ? ':busy' : ''}`).join('|');
/** Nothing of this viewer's own action is left in the page: no part, no person picked, no words of the check. */
const gone = (s, words = []) => s.actions === null && words.every(w => !s.page.includes(w));

/** Steps that more than one state starts with: the Doctor's Rescue of Crew 3, and the Hacker's Move with two rooms. */
const STEPS = {
  rescue: async page => {
    await page.evaluate(tap(TAB('actions')));
    await page.waitFor(PART('tiles'), 'the Doctor\'s tiles');
    await page.evaluate(tap(TILE('RESCUE')));
    await page.waitFor(`document.querySelector('.ms-ps-target')&&document.querySelector(${JSON.stringify(PRESS('seat-3'))})`, 'the target bar and Crew 3 offered');
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
  what: 'The Planet app\'s match screens drawn by Designer\'s components (release 3: Actions, design/phone-ui/components/actions) in the phone shell, in Frontend\'s phone harness (apps/game/dev/phone) built from the candidate below',
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
