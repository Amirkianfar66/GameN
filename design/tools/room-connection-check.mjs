// mothership:dev-only
//
// The room connection's check (docs/design/components/room-connection.md): the Planet app's room view
// drawn by Designer's room scene, as the owner decided on 15 November 2026 for all five rooms.
// It bundles Frontend's phone harness (apps/game/dev/phone: the real Planet app, controller and renderer
// over the harness's synthetic connection) from this tree, with the art the harness takes from a clean
// worktree of origin/main, and serves it with the hosted game's production response headers
// (scripts/hosted-preview-policy.mjs). It drives the real app at 390 × 844 and 430 × 932, in desktop
// Chromium at 2× pixels:
//   room-a, room-b, command-room, hospital, jail   each room lit, as its occupant sees it
//   blackout-lit, blackout-dark                    Room A through one Blackout window: the frame held
//   blackout-slots                                 the Blackout's fixed positions offered in the dark
//   seats                                          people offered (the Officer's block), one tapped
//   slots                                          an empty position offered (a move), tapped
//   stale, concealed, reduced                      reconnecting; hidden; the device's Reduce motion
//   blocked, hospital-films                        "ATTACK BLOCKED" and the Hospital's films with the scene
// A capture passes with no unexpected policy report, no failed request and no page error; the room scene
// mounted in the expected room with none of the board renderer's rooms, people or targets left in the
// room view; the windows' motion running while live and still otherwise; and the state's own facts (the
// offers and what a tap sent, the held frame, where an effect landed). It writes
// design/phone-ui/review/room-connection/: one JPEG per state and size, and check.json (the headers and
// their SHA-256, the candidate and art commits, what each capture saw and its SHA-256).
//   GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/room-connection-check.mjs [--only a,b] [--keep]
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a live match, not multiplayer.

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
const REVIEW = join(REPO, 'design/phone-ui/review/room-connection');
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

/** The art baseline, as the harness's review-base.mjs requires it: a clean worktree of origin/main's history. */
function artBase() {
  const dir = process.env.GAMEN_PHONE_ART_BASE;
  if (!dir) throw new Error('Set GAMEN_PHONE_ART_BASE to a clean worktree of fetched origin/main.');
  const root = realpathSync(dir);
  if (realpathSync(git(root, 'rev-parse', '--show-toplevel')) !== root) throw new Error('The art baseline must be a worktree root');
  if (git(root, 'status', '--porcelain')) throw new Error('The art baseline must be clean');
  const head = git(root, 'rev-parse', 'HEAD'), main = git(REPO, 'rev-parse', '--verify', 'refs/remotes/origin/main^{commit}');
  git(REPO, 'merge-base', '--is-ancestor', head, main);
  // The harness itself checks this by walking the tooling's imports; since 1abbd43 that walk refuses the
  // JSON file scripts/runtime-art-release.mjs imports, so the harness's own config cannot build on main.
  // The same guarantee here: the tooling is byte for byte the baseline's.
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
  const out = await mkdtemp(join(tmpdir(), 'room-connection-check-'));
  // The harness's own entry and its plugins over the baseline's art; the candidate's code is this tree.
  await build({
    root: join(REPO, 'apps/game/dev/phone'), configFile: false, publicDir: false, logLevel: 'warn',
    plugins: [comicAssetsPlugin(art.root), planetLibraryAssetsPlugin(art.root), crewDrawingAssetsPlugin(art.root), pregameAssetsPlugin(art.root)],
    build: { target: 'es2022', cssMinify: false, outDir: out, emptyOutDir: true, sourcemap: false },
  });
  // What phone-ui-native-compare.mjs reads to name the build it compares (as the harness's own build writes it).
  await writeFile(join(out, 'review-provenance.json'), `${JSON.stringify({
    scope: 'The phone harness built by design/tools/room-connection-check.mjs: the candidate\'s native modules, with art from a clean worktree of origin/main',
    candidate: { root: REPO, head: git(REPO, 'rev-parse', 'HEAD'), dirty: !!git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/room-connection') },
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
const LIVE = "window.planetHarness?.app.game?.getModel().connection==='live'&&window.planetHarness.app.game.getModel().phase?.trusted";
const SCENE = room => `document.querySelector('.planet-stage .ms-room-scene')?.dataset.room===${JSON.stringify(room)}`;
const game = 'window.planetHarness.app.game';
// Edits the harness's authoritative value: the player's view and its public view, one revision on.
const edit = body => `(async()=>{const h=window.planetHarness,v=structuredClone(h.value),p=v.playerView,now=h.now();p.viewRevision++;${body};v.publicView=h.publicPlanet(p);await h.replace(v);})()`;

/** What the room view shows now: the scene, what is left of the board renderer, and the app's model. */
const LOOK = `(() => {
  const stage = document.querySelector('.planet-stage'), scene = stage.querySelector('.ms-room-scene');
  const all = (root, s) => root ? [...root.querySelectorAll(s)] : [];
  const box = n => { const r = n.getBoundingClientRect(); return { x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100, width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 }; };
  const animations = all(scene, 'svg.amb').flatMap(svg => svg.getAnimations({ subtree: true }));
  const model = ${game}.getModel();
  const figures = all(scene, '.ms-rs-person').map(p => { const body = p.querySelector('.ms-rs-fig[data-part="body"]'), tag = p.querySelector('.ms-rs-tag');
    return { seat: p.dataset.seat, body: body ? box(body) : null, tag: tag ? box(tag) : null, standIn: !!body?.hasAttribute('data-stand-in'), recoil: body?.style.translate ?? '' }; });
  return {
    view: stage.dataset.view, hostHidden: document.querySelector('.planet-room-scene')?.hidden ?? null,
    scene: scene ? { room: scene.dataset.room ?? null, label: scene.getAttribute('aria-label'), status: scene.dataset.status, lighting: scene.dataset.lighting, motion: scene.dataset.motion, box: box(scene) } : null,
    back: all(scene, '.ms-rs-art[data-layer="back"]').map(box)[0] ?? null,
    figures, figureLayers: all(scene, '.ms-rs-fig svg').length,
    tags: all(scene, '.ms-rs-tag').map(t => t.textContent),
    presses: all(scene, '.ms-rs-press').map(p => ({ seat: p.dataset.value, label: p.getAttribute('aria-label'), picked: p.hasAttribute('data-picked'), disabled: p.getAttribute('aria-disabled') === 'true', box: box(p) })),
    slots: all(scene, '.ms-rs-slot').map(p => ({ slot: p.dataset.value, picked: p.hasAttribute('data-picked'), disabled: p.getAttribute('aria-disabled') === 'true', box: box(p) })),
    control: scene?.querySelector('.ms-rs-control')?.textContent ?? null, cover: all(scene, '.ms-rs-cover').length, veil: all(scene, '.ms-rs-veil').length, notice: all(scene, '.ms-rs-notice').length,
    ambient: { svgs: all(scene, 'svg.amb').length, animations: animations.length, running: animations.filter(a => a.playState === 'running').length },
    board: { rooms: all(stage, '.bv2-room').length, actors: all(stage, '.bv2-actor').length, seatTargets: all(stage, '.bv2-seat-target').length, slotTargets: all(stage, '.bv2-slot-target').length,
      night: all(stage, '[data-planet-night]').filter(n => !n.closest('.ms-room-scene')).length },
    // Today's films and effects, which the game paints in the scene's films container (room-scene 0.4.0).
    overlay: { block: all(stage, '.bv2-block-fx').map(g => ({ id: g.dataset.blockId, parts: [...g.children].map(box), label: g.querySelector('strong')?.textContent ?? null, inScene: !!g.closest('.ms-room-scene .ms-rs-films') })),
      films: all(stage, '.bv2-film').map(n => ({ part: n.dataset.filmPart, box: box(n), hidden: !!n.closest('[hidden]'), inScene: !!n.closest('.ms-room-scene .ms-rs-films') })),
      // The Blackout film in the shown room: its position markers and its darkness layer.
      markers: all(scene, '.ms-rs-films .planet-scene-room:not([hidden]) [data-planet-night="marker"]').length,
      darkness: all(scene, '.ms-rs-films .planet-scene-room:not([hidden]) [data-planet-night="dark"]').length,
      stations: all(scene, '.ms-rs-films .planet-window-station').length },
    model: { dark: model.dark, connection: model.connection, concealed: model.concealed, panel: model.panel, action: model.action ? { type: model.action.type, step: model.action.step, selected: model.action.selected } : null },
    violations: window.__policy,
  };
})()`;

const centre = b => [b.x + b.width / 2, b.y + b.height / 2];
// The person nearest a point, by their figure, or by their tag where a film stands in for the figure.
const nearest = (point, figures) => figures.filter(f => f.body || f.tag).map(f => ({ seat: f.seat, d: Math.hypot(...centre(f.body ?? f.tag).map((v, i) => v - point[i])) })).sort((a, b) => a.d - b.d)[0] ?? null;
/** A film stands in for one person: the scene leaves their figure out and keeps their tag, and the film's patient is drawn in the scene. */
const standIn = (s, seat, name) => {
  const who = s.figures.find(f => f.seat === seat);
  return { standIn: who?.standIn === true && s.figures.filter(f => f.standIn).length === 1, standInTag: s.tags.some(t => t.includes(name)),
    filmFigure: s.overlay.films.some(f => f.part.startsWith(`critical-${seat}-`) && !f.hidden && f.inScene), filmsInScene: s.overlay.films.every(f => f.inScene) };
};
const sameBox = (a, b) => !!a && !!b && ['x', 'y', 'width', 'height'].every(k => Math.abs(a[k] - b[k]) < 0.5);

/**
 * Each state: the address it starts from (or `from`, the state it continues), the steps that reach it
 * before the capture, its own facts, and `after`: steps after the capture whose facts join its checks.
 */
const tap = selector => `document.querySelector(${JSON.stringify(selector)}).click()`;
const STATES = {
  'room-b': { url: 'scenario=board', room: 'room-b', people: true, live: true,
    facts: s => ({ control: s.control === 'Windows' }) },
  'room-a': { url: 'scenario=doctor', room: 'room-a', people: true, live: true },
  'command-room': { url: 'scenario=alien', room: 'command-room', people: true, live: true },
  hospital: { url: 'scenario=hospital', room: 'hospital', people: true, live: true,
    facts: s => standIn(s, 'seat-6', 'You') },
  jail: { url: 'scenario=board', room: 'jail', people: true, live: true,
    steps: async page => {
      await page.evaluate(edit("for(const [id,slot] of [['seat-6','J1'],['seat-8','J2'],['seat-9','J3']])Object.assign(p.board.seats.find(s=>s.seatId===id),{location:'Jail',slotId:slot,jailed:true});p.offers=p.offers.filter(o=>o.type==='PASS_TURN')"));
      await page.waitFor(SCENE('jail'), 'the Jail in the room view');
    } },
  // Opened in the dark (the pack's fallback: every place as if occupied), then a new window whose lit
  // seconds are still to run, with one person fewer in Room A: the scene frames that lit room and holds it.
  'blackout-lit': { url: 'scenario=blackout', room: 'room-a', people: true, live: true,
    steps: async (page, looks) => {
      await page.waitFor(`${SCENE('room-a')}&&document.querySelector('.planet-stage .ms-room-scene').dataset.lighting==='dark'`, 'opened in the dark');
      looks.cold = await page.evaluate(LOOK);
      await page.evaluate(edit("p.phase={id:'check-blackout',kind:'BLACKOUT',startedAt:now-2500,endsAt:now+12500};p.activeSeatId=null;p.hackSession=null;p.blackout={windowId:p.phase.id,previewEndsAt:now+2500,endsAt:p.phase.endsAt};p.blackoutTargeting={windowId:p.phase.id,boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1','A2','A3','A4']};p.offers=[{type:'SELECT_BLACKOUT_SLOT',targetSeatIds:[],slotIds:p.blackoutTargeting.slotIds,windowIds:[],promiseTargetSeatIds:[]}];p.lastTally=null;Object.assign(p.board.seats.find(s=>s.seatId==='seat-5'),{location:'Room B',slotId:'B5'})"));
      await page.waitFor(`${game}.getModel().phase?.id==='check-blackout'&&!${game}.getModel().dark&&document.querySelector('.planet-stage .ms-room-scene').dataset.lighting==='lit'`, 'the lit seconds of the new window');
    },
    // Sheet 30: the lit seconds are the ordinary room, with the film's darkness layer (for its flicker) and no markers.
    facts: (s, looks) => ({ fourPeople: s.figures.length === 4, noMarkers: s.overlay.markers === 0, darknessLayer: s.overlay.darkness === 1, infoColdFrameDiffers: !sameBox(s.back, looks.cold?.back) }) },
  'blackout-dark': { from: 'blackout-lit', room: 'room-a', people: false, live: true,
    steps: async page => { await page.waitFor(`${game}.getModel().dark`, 'the authoritative dark', 8000); },
    // Sheet 30: the dark room for everyone, the scene's own picture, so its windows still move; no markers.
    facts: (s, looks) => ({ held: sameBox(s.back, looks['blackout-lit']?.back), lights: s.scene?.lighting === 'dark', noMarkers: s.overlay.markers === 0, noDarknessOver: s.overlay.darkness === 0, windowsMove: s.ambient.running > 0 }) },
  'blackout-slots': { from: 'blackout-dark', room: 'room-a', people: false, live: true,
    steps: async page => {
      await page.evaluate(`${game}.openPanel('actions');${game}.begin('SELECT_BLACKOUT_SLOT')`);
      await page.waitFor("document.querySelectorAll('.planet-stage .ms-rs-slot').length===4", 'four fixed positions offered');
    },
    facts: (s, looks) => ({ slots: s.slots.map(x => x.slot).join() === 'A1,A2,A3,A4', held: sameBox(s.back, looks['blackout-lit']?.back), noBoardTargets: s.board.slotTargets === 0, noMarkers: s.overlay.markers === 0 }),
    after: async page => {
      await page.evaluate(tap('.planet-stage .ms-rs-slot[data-value="A2"]'));
      await page.waitFor(`${game}.getModel().action?.step==='confirm'`, 'the tap chose A2');
      return { tapA2: /A2/.test(await page.evaluate(`${game}.getModel().action.confirmation`)) };
    } },
  seats: { url: 'scenario=block', room: 'room-a', people: true, live: true,
    steps: async page => {
      await page.evaluate(`${game}.openPanel('actions');${game}.begin('BLOCK_MOVE')`);
      await page.waitFor(`${SCENE('room-a')}&&document.querySelectorAll('.planet-stage .ms-rs-press').length===3`, 'three people offered in Room A');
    },
    facts: s => ({ offered: s.presses.map(p => p.seat).join() === 'seat-1,seat-2,seat-3', noBoardTargets: s.board.seatTargets === 0 }),
    after: async page => {
      await page.evaluate(tap('.planet-stage .ms-rs-press[data-value="seat-2"]'));
      await page.waitFor(`${game}.getModel().action?.step==='confirm'`, 'the tap chose Player 2');
      return { tapPlayer2: /Player 2\b/.test(await page.evaluate(`${game}.getModel().action.confirmation`)) };
    } },
  slots: { url: 'scenario=board', room: 'room-b', people: true, live: true,
    steps: async page => {
      await page.evaluate(`${game}.begin('MOVE');${game}.choose('Room B')`);
      await page.waitFor(`${game}.getModel().action?.step==='slots'`, 'the move asks for a position');
      // A move opens the board; the Room button brings the room view back with the position offered.
      if (await page.evaluate("document.querySelector('.planet-stage').dataset.view") !== 'room') await page.evaluate(tap('#planet-nav-board'));
      await page.waitFor(`${SCENE('room-b')}&&document.querySelectorAll('.planet-stage .ms-rs-slot').length===1`, 'B5 offered in Room B');
    },
    facts: s => ({ offered: s.slots.map(x => x.slot).join() === 'B5', noBoardTargets: s.board.slotTargets === 0 }),
    after: async page => {
      await page.evaluate(tap('.planet-stage .ms-rs-slot'));
      await page.waitFor(`${game}.getModel().action?.step==='confirm'`, 'the tap chose B5');
      return { tapB5: /B5/.test(await page.evaluate(`${game}.getModel().action.confirmation`)) };
    } },
  // The phase has run out and the server's next one has not come: the room stands, dimmed, taking no taps.
  expired: { url: 'scenario=block', room: 'room-a', people: true, live: false,
    steps: async page => {
      await page.evaluate(`${game}.openPanel('actions');${game}.begin('BLOCK_MOVE')`);
      await page.waitFor(`${SCENE('room-a')}&&document.querySelectorAll('.planet-stage .ms-rs-press').length===3`, 'three people offered');
      await page.evaluate(edit("p.phase={...p.phase,startedAt:now-14400,endsAt:now+600}"));
      await page.waitFor(`${game}.getModel().phase?.expired`, 'the phase ran out', 8000);
    },
    // The controller withdraws the action when the phase runs out: the scene's offers end with it.
    facts: s => ({ status: s.scene?.status === 'stale', veil: s.veil === 1, offersEnded: s.model.action === null && s.presses.length === 0 }) },
  // Reconnecting: the model withholds the room until it can verify a view again; the scene keeps the last
  // room, dimmed (the pack's sheet 45).
  reconnecting: { url: 'scenario=board', room: 'room-b', people: true, live: false,
    steps: async page => {
      await page.evaluate('window.planetHarness.setReadFailure(true);window.planetHarness.app.session.refresh()');
      await page.waitFor(`${game}.getModel().connection!=='live'`, 'reconnecting');
    },
    facts: s => ({ status: s.scene?.status === 'stale', veil: s.veil === 1, noControl: s.control === null }) },
  concealed: { url: 'scenario=board', room: null, people: false, live: false,
    steps: async page => {
      await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))");
      await page.waitFor(`${game}.getModel().concealed`, 'concealed');
    },
    facts: s => ({ hidden: s.scene?.label === 'Room hidden' && s.scene.room === null && s.cover === 1, nobody: s.figureLayers === 0 && s.tags.length === 0 && s.presses.length === 0 && s.control === null }) },
  reduced: { url: 'scenario=board', room: 'room-b', people: true, live: false, media: { 'prefers-reduced-motion': 'reduce' },
    facts: s => ({ reduced: s.scene?.motion === 'reduced', still: s.ambient.running === 0 }) },
  blocked: { url: 'scenario=hacker', room: 'room-b', people: true, live: true,
    steps: async page => {
      await page.evaluate(edit("p.events=[{id:'check-room-block',round:p.round,phaseId:p.phase.id,viewRevision:p.viewRevision,publishedAt:now-100,expiresAt:now+29900,audience:{kind:'player',seatId:'seat-6'},kind:'ATTACK_BLOCKED',seatIds:['seat-7'],actorSeatId:null,location:'Room B',slotId:'B2',clinicalAnchor:null}]"));
      await page.waitFor("document.querySelector('.planet-stage .bv2-block-fx strong')", 'ATTACK BLOCKED drawn');
      await sleep(350);
    },
    facts: s => {
      const parts = s.overlay.block[0]?.parts ?? [], at = parts[0] ? centre(parts[0]) : null;
      return { drawn: s.overlay.block.length === 1 && s.overlay.block[0].label === 'ATTACK BLOCKED', inScene: s.overlay.block[0]?.inScene === true,
        onSeat7: !!at && nearest(at, s.figures)?.seat === 'seat-7', infoRecoil: s.figures.find(f => f.seat === 'seat-7')?.recoil ?? '' };
    } },
  'hospital-films': { url: 'scenario=doctor', room: 'hospital', people: true, live: true,
    steps: async page => {
      await page.evaluate(`${game}.openPanel('actions');${game}.begin('RESCUE')`);
      await page.waitFor(`${SCENE('hospital')}&&document.querySelectorAll('.planet-stage .ms-rs-press').length===1`, 'seat-3 offered in the Hospital');
      await sleep(400);
    },
    facts: s => {
      const tag = s.overlay.films.find(f => f.part === 'tag-seat-3' && !f.hidden);
      return { offered: s.presses.map(p => p.seat).join() === 'seat-3', rescueTag: !!tag && nearest(centre(tag.box), s.figures)?.seat === 'seat-3',
        monitor: s.overlay.films.some(f => /-screen$/.test(f.part) && !f.hidden), ...standIn(s, 'seat-3', 'Crew 3') };
    } },
};

const art = artBase();
const sourceCommit = git(REPO, 'rev-parse', 'HEAD');
const dirty = git(REPO, 'status', '--porcelain', '--', ':!design/phone-ui/review/room-connection');
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
      if (only && !only.has(name) && ![...only].some(o => STATES[o]?.from === name || STATES[STATES[o]?.from]?.from === name)) continue;
      const result = { ok: false };
      try {
        if (!state.from) {
          if (page) await page.close();
          page = await openPage(browser, { width, height, scale: 2 });
          await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
          await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY });
          if (state.media) await page.media(state.media);
          await page.goto(`${origin}/index.html?${state.url}&count=9&tuple=blackout`, 'window.planetHarness');
          await page.evaluate('window.planetHarness.candidateReady');
          await page.waitFor(LIVE, 'a live, trusted match');
          await page.waitFor(`document.documentElement.dataset.artSettled==='true'`, 'the art settled');
          if (state.room && !state.steps) await page.waitFor(SCENE(state.room), `the room scene in ${state.room}`);
        }
        await state.steps?.(page, looks);
        await sleep(600);
        const seen = await page.evaluate(LOOK);
        looks[name] = seen;
        for (const v of seen.violations) v.kind = await classify(out, v);
        const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
        const own = state.facts?.(seen, looks) ?? {};
        const checks = {
          scene: state.room === null ? !!seen.scene && seen.scene.room === null : seen.scene?.room === state.room,
          noBoardRoom: seen.board.rooms === 0 && seen.board.actors === 0 && seen.board.seatTargets === 0 && seen.board.slotTargets === 0 && seen.board.night === 0,
          people: state.people ? seen.figureLayers > 0 && seen.tags.length > 0 : seen.figureLayers === 0 && seen.tags.length === 0,
          ambient: !state.room || seen.scene?.lighting === 'dark' || seen.ambient.svgs > 0,
          motion: state.live ? seen.ambient.animations === 0 || seen.ambient.running === seen.ambient.animations : seen.ambient.running === 0,
          policy: seen.violations.every(v => v.kind !== 'unexpected'),
          problems: problems.length === 0,
          ...Object.fromEntries(Object.entries(own).filter(([key]) => !key.startsWith('info'))),
        };
        const file = join(REVIEW, `${sizeKey}-${name}.jpg`);
        const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
        const bytes = Buffer.from(data, 'base64');
        await writeFile(file, bytes);
        Object.assign(checks, await state.after?.(page) ?? {});
        const info = Object.fromEntries(Object.entries(own).filter(([key]) => key.startsWith('info')));
        Object.assign(result, { ok: Object.values(checks).every(Boolean), checks, ...(Object.keys(info).length ? { info } : {}),
          file: file.slice(REPO.length + 1), sha256: sha256(bytes), seen, problems });
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
const record = {
  tool: 'design/tools/room-connection-check.mjs',
  what: 'The Planet app\'s room view drawn by the room scene (design/phone-ui/components/room-scene), in Frontend\'s phone harness (apps/game/dev/phone) built from the candidate below',
  candidate: { commit: sourceCommit, clean: dirty === '', dirty: dirty ? dirty.split('\n') : [] },
  art: { base: art.head, originMain: art.main, note: 'The harness\'s art plugins over a clean worktree of origin/main; the harness and its asset tooling are byte for byte that commit\'s' },
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels, focus emulated; the harness bundled by Vite and served with the production headers below. Not a phone, not Safari, not a live match.',
  headers: HEADERS, headersSha256: sha256(JSON.stringify(HEADERS)),
  captures: results,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passed = Object.values(results).filter(r => r.ok).length;
console.log(`${passed} of ${Object.keys(results).length} captures passed; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
