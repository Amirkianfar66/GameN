// The Food component (design/phone-ui/components/food): a runtime source the game imports as it is. Checked here: its
// module graph; that every copied file is its pinned source in the frozen native port with only the recorded
// differences; its styles' reach; its inputs and how the audiences stay apart; that the design's words are in it; and
// that Frontend's packet is carried unchanged and stays out of the runtime. Its drawing, its lifecycle and its
// agreement with the frozen port, the approved package's pages and #290's native captures are checked in a browser
// under the production headers by design/tools/food-component-check.mjs, whose record is checked last. This test reads
// only what is committed: it never needs #290's commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FOOD_ANSWERS, FOOD_CAN, FOOD_DEFAULTS, FOOD_NAVIGATION_TARGETS, FOOD_NOTICE_DEFAULTS, FOOD_PRESSES, FOOD_STATUSES, FOOD_VERSION, FOOD_VIEW_KEYS,
  foodIdentities, foodModel, foodNoticeModel, foodNow, foodOrdinary, nextFoodInput, nextFoodNoticeInput,
} from '../../../design/phone-ui/components/food/food-input.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/food';
const PORT = 'apps/game/hosted/planet';
const PINS = 'docs/integration/food-consumer-source-2026-11-13.json';
const read = path => readFileSync(join(REPO, path), 'utf8');
const bytes = path => readFileSync(join(REPO, path));
const sha256 = value => createHash('sha256').update(value).digest('hex');

/** The component's own runtime files: fifteen copies of the port's, and the two written for it. */
const COPIES = ['food-geometry.mjs', 'food-machine.mjs', 'food-scene.mjs', 'food-pose.mjs', 'food-display.mjs', 'food-ui.mjs', 'food-icons.mjs', 'food-gauge.mjs', 'food-tags.mjs', 'food-kit.css', 'food.css',
  'food-ink.mjs', 'food-render.mjs', 'food-notice.mjs', 'food-surface.css'];
const WRITTEN = ['food.mjs', 'food-input.mjs'];
/** The nine pure Food functions the component imports from @mothership/presentation's existing named exports (Frontend's answer on #4). */
const PRESENTATION = ['foodClamp', 'foodCrateAt', 'foodEase', 'foodGaugeLabel', 'foodGaugeLevel', 'foodPackageCount', 'foodPackagesText', 'foodPanelAt', 'foodTrajectoryAt'];
/** Frontend's packet of five preview inputs, as committed on #290 at 3247fc3d. */
const PACKET = Object.freeze({ file: `${COMPONENT}/preview/food-component-preview-inputs.json`, sha256: 'f381f0e2f9bab8c937a8febb93a54aa750227ed77ac6d397a8deff1fb1525751', bytes: 41134,
  commit: '3247fc3d52fc4b4561987a018a153cc5329348ef', parts: ['food-panel-03', 'food-panel-04', 'food-winch-03', 'food-winch-12', 'food-panel-18'] });
/** lib/component-check.mjs is #265's, carried byte for byte (git blob 951963ef at its head 0e5a0b8a, unchanged since b4673ad2). It is not edited on this branch. */
const SHARED_CHECK_SHA256 = '618a0fa8525ba31ff3302a3a297c7bb77a3fbcd5cbb45473f0c7c740aefc9532';

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*'([^']+)'|^\s*import\s*'([^']+)'|@import\s+(?:url\()?["']([^"']+)["']/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}
const packetInput = frame => { const { clock, ...rest } = structuredClone(frame.input); return { ...rest, clock: { now: () => clock.nowMs } }; };
/** A selector list's selectors: split at the commas outside every bracket. */
function selectorsOf(list) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === '(' || list[i] === '[') depth += 1;
    else if (list[i] === ')' || list[i] === ']') depth -= 1;
    else if (list[i] === ',' && depth === 0) { out.push(list.slice(start, i).trim()); start = i + 1; }
  }
  out.push(list.slice(start).trim());
  return out.filter(Boolean);
}

test('the component is a runtime source: its whole graph is runtime-safe, and takes nothing of Frontend\'s connector', () => {
  const files = graph(join(REPO, COMPONENT, 'food.mjs'));
  const local = [...files.keys()].map(f => relative(REPO, f)).sort();
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))].sort();
  for (const path of local) {
    assert.ok(path.startsWith(`${COMPONENT}/`) || path.startsWith('apps/game/hosted/'), `${path}: only the component's own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|review)(?:\/|\.)/, `${path}: nothing development-only`);
    assert.doesNotMatch(path, /\.json$/, `${path}: no data file, and so not the preview's packet`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(local.filter(p => p.startsWith(COMPONENT)), [...COPIES, ...WRITTEN].map(f => `${COMPONENT}/${f}`).sort(), 'the entry reaches every runtime file of the folder, and no other');
  assert.deepEqual(readdirSync(join(REPO, COMPONENT)).sort(), [...COPIES, ...WRITTEN, 'sources.json', 'preview', 'review'].sort(), 'the folder holds the runtime files, their record, the preview and the review');
  assert.deepEqual(packages, ['@mothership/contracts', '@mothership/presentation'], 'two package imports: the game\'s contracts, and the presentation package for the nine pure Food functions');
  // The nine, by name, from the package's existing entry: no subpath, no copy.
  const named = new Set();
  for (const file of files.keys()) {
    for (const m of readFileSync(file, 'utf8').matchAll(/^\s*import\s*\{([^}]+)\}\s*from\s*'(@mothership\/presentation[^']*)'/gm)) {
      assert.equal(m[2], '@mothership/presentation', 'the package\'s own entry, no subpath');
      for (const name of m[1].split(',')) named.add(name.trim().split(/\s+as\s+/)[0]);
    }
  }
  assert.deepEqual([...named].sort(), PRESENTATION, 'the nine pure Food functions, and nothing else of the package');
  // What stays Frontend's is not in the graph: the client package (the controller and createFoodHoldInput), the connector, the loader.
  for (const path of local) assert.doesNotMatch(read(path), /@mothership\/game\b/, `${path}: nothing of the game's client package`);
  for (const name of ['food-app.mjs', 'food-assets.mjs', 'app.mjs', 'render.mjs']) assert.ok(!local.includes(`${PORT}/${name}`), `${name} stays Frontend's`);
  assert.ok(local.includes('apps/game/hosted/crew-runtime.mjs') && local.includes('apps/game/hosted/crew-drawing/ink.mjs'), 'from the hosted game: the public crew portraits and the admitted crew ink');
  // The component sends nothing and keeps nothing: no request, no storage, no timer of its own.
  for (const file of WRITTEN) {
    const code = read(`${COMPONENT}/${file}`).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(code, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|setTimeout|setInterval|document\.cookie/, `${file}: no request, storage or timer`);
  }
  assert.doesNotMatch(read(`${COMPONENT}/food-input.mjs`), /^\s*import\s/m, 'the inputs module imports nothing');
});

test('every copy is its pinned source in the frozen port, with only the recorded differences', () => {
  const record = JSON.parse(read(`${COMPONENT}/sources.json`)), pins = JSON.parse(read(PINS)).files;
  assert.equal(record.schema, 'mothership.designer-component-sources/1');
  assert.equal(record.baseline.commit, '68000faa1fa6f508d2a6cfe766f88eff9cf4ab3d');
  assert.equal(record.baseline.pins, PINS);
  assert.deepEqual(record.files.map(f => f.file), COPIES, 'one entry per copied file');
  const kinds = {};
  for (const entry of record.files) {
    const source = bytes(entry.source);
    assert.ok(entry.source.startsWith(`${PORT}/`), `${entry.file}: copied from the port`);
    assert.equal(sha256(source), entry.sourceSha256, `${entry.source} is the recorded source`);
    assert.equal(pins[entry.source]?.sha256, entry.sourceSha256, `${entry.source} is its pin in ${PINS}`);
    assert.equal(source.length, entry.sourceBytes);
    let text = source.toString('utf8');
    for (const difference of entry.differences) {
      assert.ok(['import-path', 'connector-seam', 'host-rule'].includes(difference.kind), `${entry.file}: a difference is an import path, a connector seam or a host rule`);
      assert.ok(typeof difference.why === 'string' && difference.why.length > 10, `${entry.file}: each difference says why`);
      assert.equal(text.split(difference.was).length, 2, `${entry.file}: "${difference.was.slice(0, 50)}…" occurs exactly once in the source`);
      text = text.replace(difference.was, () => difference.now);
      kinds[difference.kind] = (kinds[difference.kind] ?? 0) + 1;
    }
    const copy = bytes(`${COMPONENT}/${entry.file}`);
    assert.ok(Buffer.from(text, 'utf8').equals(copy), `${entry.file} is its source with the recorded differences, and no other byte differs`);
    assert.equal(sha256(copy), entry.sha256);
    assert.equal(copy.length, entry.bytes);
  }
  const changed = record.files.filter(f => f.differences.length).map(f => [f.file, f.differences.length]);
  assert.deepEqual(changed, [['food-ink.mjs', 2], ['food-render.mjs', 9], ['food-notice.mjs', 4], ['food-surface.css', 2]], 'four files differ from their source; eleven are byte for byte');
  assert.deepEqual(kinds, { 'import-path': 4, 'connector-seam': 11, 'host-rule': 2 });
  // The drawing bytes are unchanged: the seams are imports, the contact adapter, the app's own listeners, the handle,
  // the connector, and the notice's reach into the app's page. None of them draws.
  const seams = record.files.flatMap(f => f.differences.filter(d => d.kind === 'connector-seam').map(d => `${d.was}\n${d.now}`)).join('\n');
  assert.doesNotMatch(seams.replace(/\/\*\* Bind both Food surfaces[\s\S]*?\n}\n/, ''), /\bh\(|ui\.|replace\(|\.style\b|innerHTML|className|textContent/, 'no seam touches a line that draws');
  // The three window listeners that follow a release stay, one set per mount; the app's own four are gone.
  const render = read(`${COMPONENT}/food-render.mjs`);
  for (const type of ['pointerup', 'pointercancel', 'keyup']) assert.equal(render.split(`win.addEventListener('${type}'`).length, 2, `one ${type} listener on the window`);
  for (const type of ['blur', 'focus', 'visibilitychange', 'mothership:preferences-change']) assert.ok(!render.includes(`'${type}'`), `the ${type} listener stays Frontend's`);
  assert.match(render, /const hold=contacts;/);
});

test('its styles reach nothing outside the surface: the port\'s scoped sheets, and none of the ordinary app\'s rules', () => {
  const surface = read(`${COMPONENT}/food-surface.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...surface.matchAll(/([^{}]+)\{[^}]*\}/g)].map(m => m[1].trim());
  assert.equal(selectors.length, 10, 'the surface\'s ten rules of food-host.css');
  for (const selector of selectors) assert.match(selector, /^\.planet-food(?:-host)?\b/, `${selector} is the surface's own`);
  assert.doesNotMatch(surface, /\.planet-app|\.planet-header|\.planet-nav/, 'the three rules for the ordinary app stay Frontend\'s');
  for (const file of ['food-kit.css', 'food.css']) {
    const css = read(`${COMPONENT}/${file}`).replace(/\/\*[\s\S]*?\*\//g, '');
    const outside = [...css.matchAll(/(?:^|[{}])\s*([^{}@]+)\{/g)].map(m => m[1].trim()).filter(s => s && !/^(?:from|to|\d+%)/.test(s)).flatMap(selectorsOf).filter(s => !s.startsWith('.planet-food'));
    assert.deepEqual(outside, [], `${file}: every rule is under .planet-food`);
    for (const name of [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1])) assert.match(name, /^food-/, `${file}: keyframes ${name} carry the surface's name`);
  }
  assert.match(read(`${COMPONENT}/food-render.mjs`), /import '\.\/food-kit\.css';\nimport '\.\/food\.css';\nimport '\.\/food-surface\.css';/, 'the drawing imports its three sheets, as the port imports its own');
});

test('inputs: each key given replaces that key, and anything the surface does not know is refused', () => {
  assert.equal(FOOD_VERSION, 'food-0.1.0');
  assert.deepEqual(FOOD_STATUSES, ['live', 'stale', 'concealed']);
  assert.deepEqual(FOOD_CAN, ['ask', 'answer', 'withdraw', 'hold', 'panelRelease', 'panelLock', 'key']);
  assert.deepEqual(FOOD_PRESSES, ['PANEL_RELEASE', 'PANEL_LOCK', 'KEY']);
  assert.deepEqual(FOOD_ANSWERS, ['JOIN', 'DECLINE']);
  assert.deepEqual(FOOD_NAVIGATION_TARGETS, ['settings', 'promises', 'switch', 'card', 'panels']);
  assert.deepEqual(Object.keys(FOOD_DEFAULTS), ['view', 'can', 'sending', 'status', 'clock', 'people', 'board', 'viewer', 'navigation', 'assets', 'reducedMotion', 'bars']);
  assert.deepEqual(Object.keys(FOOD_NOTICE_DEFAULTS), ['step', 'stock', 'status', 'bars']);
  const packet = JSON.parse(read(PACKET.file));
  for (const frame of packet.frames) {
    assert.deepEqual(Object.keys(frame.input.view).sort(), [...FOOD_VIEW_KEYS].sort(), `${frame.part}: the view's keys are the twelve the surface takes`);
    const input = nextFoodInput(FOOD_DEFAULTS, packetInput(frame));
    assert.deepEqual(input.view, frame.input.view, `${frame.part}: the view is taken whole`);
    assert.notEqual(input.view, frame.input.view, `${frame.part}: and copied, so that a later change to the caller's object changes nothing`);
    assert.equal(foodNow(input), frame.input.clock.nowMs);
  }
  const base = nextFoodInput(FOOD_DEFAULTS, packetInput(packet.frames[1]));
  const next = nextFoodInput(base, { can: { panelLock: false } });
  assert.equal(next.view, base.view, 'a key not given stays, the same object');
  assert.deepEqual(next.can, { ask: false, answer: false, withdraw: false, hold: false, panelRelease: false, panelLock: false, key: false });
  assert.ok(Object.isFrozen(next) && Object.isFrozen(next.can) && Object.isFrozen(next.sending) && Object.isFrozen(next.board));
  const view = packet.frames[1].input.view, sending = packet.frames[1].input.sending;
  const refused = {
    'a role': { role: 'ALIEN' },
    'the identities under another name': { identities: [] },
    'the view\'s private cursor': { view: { ...view, privateCursor: 'x' } },
    'the viewer\'s own meals': { view: { ...view, ownMeals: 1 } },
    'the match binding': { view: { ...view, matchId: 'm' } },
    'the viewer\'s Promises count in the public board': { board: { seats: [], activeSeatId: null, phase: null, promiseOfferCount: 2 } },
    'a seat\'s health on the board': { board: { seats: [{ seatId: 'seat-1', location: 'Room A', health: 'Healthy' }], activeSeatId: null, phase: null } },
    'a role in the viewer': { viewer: { promiseOfferCount: 0, role: 'ALIEN' } },
    'a receipt in the sending state': { sending: { ...sending, receipt: {} } },
    'a receipt in the feedback': { sending: { ...sending, feedback: { key: 'k', name: 'LOCK', status: 'accepted', recovered: false, receipt: {} } } },
    'a command id under its wire name': { sending: { ...sending, feedback: { commandId: 'k', name: 'LOCK', status: 'accepted', recovered: false } } },
    'an offer the controller does not make': { can: { vote: true } },
    'a person\'s role': { people: [{ seatId: 'seat-1', name: 'Ava', character: 'c1', role: 'ALIEN' }] },
    'a panel under another key': { navigation: { openPanel: 'board', boardMode: 'room', sheet: 'tasks' } },
    'a status it does not know': { status: 'offline' },
    'a board mode it does not know': { navigation: { openPanel: 'board', boardMode: 'map' } },
    'a request on a press that was not accepted': { sending: { ...sending, feedback: { key: 'k', name: 'request', status: 'sending', recovered: false, request: { requestId: 'r', state: 'PENDING' } } } },
    'a closure on a press that was not refused': { sending: { ...sending, feedback: { key: 'k', name: 'Join', status: 'accepted', recovered: false, closure: { requestId: 'r', state: 'EXPIRED', round: 3, foodStepId: 's', volunteerSeatId: 'seat-1', partnerSeatId: 'seat-2' } } } },
    'a clock that is not one': { clock: { nowMs: 5 } },
    'a negative bar': { bars: { top: -1, bottom: 0 } },
  };
  for (const [what, changes] of Object.entries(refused)) assert.throws(() => nextFoodInput(base, changes), { name: 'TypeError', message: /^Food: / }, what);
  const notice = nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, { step: { kind: 'AWAY', stepId: 's', awaySeatIds: ['seat-3', 'seat-8'] }, stock: { doses: 2 }, bars: { top: 103 } });
  assert.deepEqual(notice.step, { kind: 'AWAY' }, 'of the published step the notice keeps its kind, and not who is away');
  for (const [what, changes] of Object.entries({ 'a view': { view }, 'a seat': { seatId: 'seat-3' }, 'the viewer': { viewer: { promiseOfferCount: 1 } }, 'the people': { people: [] }, 'more than the doses': { stock: { doses: 2, ownMeals: 1 } }, 'a bottom bar': { bars: { top: 0, bottom: 0 } } })) {
    assert.throws(() => nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, changes), { name: 'TypeError', message: /^Food: / }, `the notice takes no ${what}`);
  }
});

test('audiences: what the drawing reads is built from the inputs alone, and live, stale and concealed keep to their words', () => {
  const packet = JSON.parse(read(PACKET.file));
  const frame = part => packet.frames.find(f => f.part === part);
  const lock = nextFoodInput(FOOD_DEFAULTS, packetInput(frame('food-panel-04')));
  const live = foodModel(lock);
  assert.deepEqual(Object.keys(live), ['visible', 'fresh', 'message', 'view', 'clock', 'feedback', 'pendingCount', 'canAsk', 'canAnswer', 'canWithdraw', 'canHold', 'canPanelRelease', 'canPanelLock', 'canKey', 'physicalHolding', 'needsContactOff']);
  assert.ok(live.visible && live.fresh && live.canPanelLock && !live.canPanelRelease && !live.canHold && !live.canKey);
  assert.deepEqual(live.clock, { status: 'synced', serverNowMs: 106650 });
  assert.deepEqual(live.feedback, { commandId: 'fixture-feedback-food-panel-04', name: 'RELEASE', status: 'accepted', receipt: { status: 'accepted', result: { kind: 'INPUT' } }, recovered: false });
  // Each offer alone enables only its own flag, and only while live.
  for (const offer of FOOD_CAN) {
    const model = foodModel(nextFoodInput(lock, { can: { [offer]: true } }));
    const on = ['canAsk', 'canAnswer', 'canWithdraw', 'canHold', 'canPanelRelease', 'canPanelLock', 'canKey'].filter(key => model[key]);
    assert.deepEqual(on, [`can${offer[0].toUpperCase()}${offer.slice(1)}`], `can.${offer} alone`);
    const stale = foodModel(nextFoodInput(lock, { can: { [offer]: true }, status: 'stale' }));
    assert.ok(['canAsk', 'canAnswer', 'canWithdraw', 'canHold', 'canPanelRelease', 'canPanelLock', 'canKey'].every(key => stale[key] === false), `stale, can.${offer} enables nothing`);
  }
  // Stale: the view stays (it is still authorized), nothing is offered, and a hold still held or owed is still told.
  const owed = nextFoodInput(FOOD_DEFAULTS, { ...packetInput(frame('food-winch-03')), status: 'stale' });
  const stale = foodModel(owed);
  assert.ok(stale.visible && !stale.fresh && stale.view !== null && stale.needsContactOff === true && stale.canHold === false);
  // Concealed: nothing of the viewer.
  const concealed = foodModel(nextFoodInput(owed, { status: 'concealed' }));
  assert.deepEqual(concealed, { visible: false, fresh: false, message: null, view: null, clock: { status: 'unsynced' }, feedback: null, pendingCount: 0,
    canAsk: false, canAnswer: false, canWithdraw: false, canHold: false, canPanelRelease: false, canPanelLock: false, canKey: false, physicalHolding: false, needsContactOff: false });
  assert.equal(foodOrdinary(nextFoodInput(owed, { status: 'concealed' })), null);
  // No clock, no time: the port's drawing then shows no Task.
  assert.deepEqual(foodModel(nextFoodInput(lock, { clock: null })).clock, { status: 'unsynced' });
  assert.deepEqual(foodModel(nextFoodInput(lock, { clock: { now: () => null } })).clock, { status: 'unsynced' });
  // A recovered press is told on the original press's own feedback: its key and its name stay.
  const recovered = foodModel(nextFoodInput(lock, { sending: { ...lock.sending, feedback: { key: 'the-original-press', name: 'RELEASE', status: 'accepted', recovered: true } } })).feedback;
  assert.deepEqual([recovered.commandId, recovered.name, recovered.status, recovered.recovered], ['the-original-press', 'RELEASE', 'accepted', true]);
  // A request's answer and a refused press's closure reach the drawing as the fields it reads, and no envelope.
  const asked = foodModel(nextFoodInput(lock, { sending: { ...lock.sending, feedback: { key: 'k', name: 'Join', status: 'accepted', recovered: false, request: { requestId: 'r1', state: 'JOINED' } } } })).feedback.receipt;
  assert.deepEqual(asked, { status: 'accepted', result: { kind: 'REQUEST', requestId: 'r1', state: 'JOINED' } });
  const closure = { requestId: 'r1', state: 'EXPIRED', round: 3, foodStepId: 's1', volunteerSeatId: 'seat-8', partnerSeatId: 'seat-3' };
  const late = foodModel(nextFoodInput(lock, { sending: { ...lock.sending, feedback: { key: 'k', name: 'Join', status: 'rejected', recovered: false, closure } } })).feedback.receipt;
  assert.deepEqual(late, { status: 'rejected', requestClosure: closure });
  // The ordinary board: public facts, the viewer's own badge, the app's open panel, each from its own input.
  assert.deepEqual(foodOrdinary(nextFoodInput(lock, { viewer: { promiseOfferCount: 2 }, navigation: { openPanel: 'card', boardMode: 'board' } })),
    { board: { seats: lock.board.seats }, phase: { kind: 'FOOD_SUPPLY', remainingMs: 25850 }, activeSeatId: null, promiseOfferCount: 2, panel: 'card' });
  assert.deepEqual(foodIdentities(lock)[2], { seatId: 'seat-3', displayName: 'Cleo', characterId: 'c6' });
  // The shared display's notice: public facts and this screen's status.
  assert.deepEqual(foodNoticeModel(nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, { step: { kind: 'AWAY' }, stock: { doses: 2 } })), { food: { step: { kind: 'AWAY' }, stock: { doses: 2 } }, concealed: false, connection: 'live' });
  assert.deepEqual(foodNoticeModel(nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, { stock: { doses: 2 }, status: 'stale' })).connection, 'stale');
  assert.deepEqual(foodNoticeModel(FOOD_NOTICE_DEFAULTS), { food: null, concealed: false, connection: 'live' });
  assert.equal(foodNoticeModel(nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, { status: 'concealed' })).concealed, true);
});

test('the drawing reads of the view only the keys the surface takes', () => {
  const render = read(`${COMPONENT}/food-render.mjs`), display = read(`${COMPONENT}/food-display.mjs`);
  const flow = render.slice(render.indexOf('function buildFoodFlow'));
  assert.match(flow, /^function buildFoodFlow\([^)]*\)\{\n const \{[^}]*\}=ui,v=model\.view,/, 'in the sheets, v is the view');
  const reads = new Set([
    ...[...`${render}\n${display}`.matchAll(/\bmodel\.view\??\.(\w+)/g)].map(m => m[1]),
    ...[...render.slice(0, render.indexOf('function buildFoodFlow')).matchAll(/\bview\??\.(\w+)/g)].map(m => m[1]),
    ...[...flow.matchAll(/\bv\.(\w+)/g)].map(m => m[1]),
  ]);
  for (const name of ['setAttribute', 'style']) reads.delete(name); // nodes.view, the scene's element, not the Food view
  assert.deepEqual([...reads].sort(), ['invitation', 'offers', 'ownAvailability', 'participantTask', 'partnerChoices', 'requestClosures', 'round', 'seatId', 'step', 'stock', 'versions']);
  for (const name of reads) assert.ok(FOOD_VIEW_KEYS.includes(name), `${name} is a key the surface takes`);
  assert.deepEqual(FOOD_VIEW_KEYS.filter(key => !reads.has(key)), ['viewRevision'], 'one more key is taken, the revision, which only tells a new view from the last');
});

test('the words are the design\'s: every sentence of the approved package\'s hint line is in the component', () => {
  const hints = read('design/food-supply/hints.mjs');
  const body = hints.slice(hints.indexOf('export function hintFor'), hints.indexOf('export function packagesText')).replace(/^\s*\/\/.*$/gm, '');
  const literals = [...body.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(m => (m[1] ?? m[2] ?? m[3]).replace(/\\(['"`])/g, '$1'));
  const sentences = literals.filter(s => / /.test(s) && /[.:…]$/.test(s));
  assert.equal(sentences.length, 44, 'the hint line\'s sentences');
  const component = ['food-display.mjs', 'food-render.mjs'].map(f => read(`${COMPONENT}/${f}`)).join('\n').replace(/\\(['"`])/g, '$1');
  for (const sentence of sentences) {
    for (const chunk of sentence.split(/\$\{[^}]*\}/).map(c => c.trim()).filter(c => c.length >= 6)) assert.ok(component.includes(chunk), `"${sentence}": "${chunk}"`);
  }
});

test('the preview is development-only, and Frontend\'s packet is carried unchanged with its provenance beside it', () => {
  const folder = join(REPO, COMPONENT, 'preview');
  assert.deepEqual(readdirSync(folder).sort(), ['compare.html', 'compare.mjs', 'food-component-preview-inputs.json', 'index.html', 'port.html', 'port.mjs', 'preview.css', 'preview.mjs', 'probe.mjs', 'provenance.json', 'stage.mjs']);
  for (const file of readdirSync(folder)) assert.match(read(`${COMPONENT}/preview/${file}`), /mothership:dev-only/, `${file} carries the development marker`);
  const packet = bytes(PACKET.file);
  assert.equal(sha256(packet), PACKET.sha256, 'the packet is Frontend\'s, byte for byte');
  assert.equal(packet.length, PACKET.bytes);
  const data = JSON.parse(packet);
  assert.equal(data.marker, 'mothership:dev-only');
  assert.deepEqual(data.frames.map(f => f.part), PACKET.parts);
  const provenance = JSON.parse(read(`${COMPONENT}/preview/provenance.json`));
  assert.deepEqual([provenance.packet.file, provenance.packet.sha256, provenance.packet.bytes, provenance.packet.source.commit], [PACKET.file, PACKET.sha256, PACKET.bytes, PACKET.commit]);
  assert.match(provenance.packet.what, /Frontend's development-only synthetic packet/);
  assert.match(provenance.packet.synthetic, /food-panel-18, is a synthetic equivalent \(a retained RELEASE-capable view marked stale\), not a connected payload/);
  // #290's ten native captures are named by hash and commit, and not copied.
  assert.equal(provenance.nativeCaptures.source.commit, PACKET.commit);
  const named = Object.entries(provenance.nativeCaptures.files).flatMap(([part, sizes]) => Object.entries(sizes).map(([size, file]) => [part, size, file]));
  assert.deepEqual(named.map(([part, size]) => `${part}/${size}`), PACKET.parts.flatMap(part => ['390x844', '430x932'].map(size => `${part}/${size}`)));
  for (const [part, size, file] of named) assert.match(file.sha256, /^[0-9a-f]{64}$/, `${part} ${size}: held by its SHA-256`);
  assert.deepEqual(readdirSync(join(REPO, COMPONENT, 'review')).filter(name => name.endsWith('.png')), [], 'no capture of #290 is copied into the review folder');
  // The preview's two pages draw from the same files: the component's entry, and the frozen port's own.
  assert.match(read(`${COMPONENT}/preview/preview.mjs`), /from '\.\.\/food\.mjs';/);
  assert.match(read(`${COMPONENT}/preview/probe.mjs`), /from '\.\.\/food\.mjs';/);
  assert.match(read(`${COMPONENT}/preview/port.mjs`), /from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/apps\/game\/hosted\/planet\/food-render\.mjs';/);
  assert.doesNotMatch(read(`${COMPONENT}/preview/port.mjs`), /from '\.\.\/food(?:-render|-notice|-ui|-gauge)?\.mjs'/, 'the port\'s page draws with nothing of the component');
  // The shared check helper is #265's, carried unchanged.
  assert.equal(sha256(bytes('design/tools/lib/component-check.mjs')), SHARED_CHECK_SHA256, 'lib/component-check.mjs is #265\'s blob, not edited here');
});

test('the check\'s record: every capture, comparison and probe check passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/food-component-check.mjs');
  assert.equal(record.version, FOOD_VERSION);
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data: blob:/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  // The pins it was made against.
  assert.ok(record.packet.ok && record.packet.sha256 === PACKET.sha256, 'Frontend\'s packet');
  const sources = JSON.parse(read(`${COMPONENT}/sources.json`));
  assert.ok(record.port.ok, 'the frozen port\'s files are the pinned ones');
  for (const entry of sources.files) assert.equal(record.port.files[entry.source]?.sha256, entry.sourceSha256, `${entry.source}: the port the component was compared with is the source it was copied from`);
  assert.ok(record.package.ok && Object.keys(record.package.files).length === 4, 'the approved package\'s files are the pinned ones');
  assert.ok(record.native.ok && record.native.source.commit === PACKET.commit, '#290\'s captures were read from its commit, each the pinned file');
  assert.ok(record.art.files === 49 && record.art.foodDrawings === 37, 'the hosted game\'s own art: its twelve bundles and the 37 Food drawings');
  // Every state, at both sizes, in both motions.
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 132, 'thirty-three states at two sizes, in full motion and with the device\'s Reduce motion');
  const states = [...new Set(captures.map(([key]) => key.split('/')[1]))];
  assert.deepEqual(states.slice(0, 5), PACKET.parts, 'Frontend\'s five parts first');
  assert.deepEqual([...new Set(captures.map(([, c]) => c.kind))], ['packet', 'variant', 'case', 'notice']);
  for (const [key, c] of captures) {
    assert.ok(c.ok, `${key} passed: ${c.notes.join('; ')}`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(Object.values(c.port.equal).every(Boolean) && c.port.htmlSha256 === c.htmlSha256 && c.port.pngSha256 === c.pngSha256, `${key}: the frozen port draws the same DOM and the same pixels`);
    assert.match(c.synthetic, /Frontend's|invented/, `${key}: its state says where it comes from`);
    if (c.file) assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  assert.equal(captures.filter(([, c]) => c.file).length, 48, 'a picture of every state at 390 × 844 in full motion, and of the five parts at both sizes in both motions');
  // Larger text: the port's own support, drawn the same by the component.
  const larger = Object.entries(record.largerText.drawn);
  assert.deepEqual(record.largerText.texts, [1.5, 2]);
  assert.equal(larger.length, 32, 'eight states at two sizes, at the Large and the Largest text');
  for (const [key, l] of larger) {
    assert.ok(l.ok && Object.values(l.equal).every(Boolean), `${key}: the frozen port draws the same DOM and the same pixels`);
    assert.equal(l.bars.top, { 24: 117, 32: 141 }[l.rootPx], `${key}: the text is larger: the surface's own bar has grown`);
    assert.deepEqual(l.problems, [], `${key}: no page problem`);
    if (l.file) assert.ok(existsSync(join(REPO, l.file)), `${key}: ${l.file}`);
  }
  assert.equal(larger.filter(([, l]) => l.file).length, 4, 'four larger-text pictures kept for review');
  assert.match(record.captures['390x844/food-panel-18/full'].synthetic, /a synthetic equivalent \(a retained RELEASE-capable view marked stale\), not a connected payload/);
  for (const part of PACKET.parts) {
    for (const size of ['390x844', '430x932']) {
      const c = record.captures[`${size}/${part}/full`];
      assert.ok(c.packetExpects && c.controls[0].act === c.packetExpects.control && c.controls[0].enabled === c.packetExpects.enabled && c.controls[0].busy === c.packetExpects.busy, `${size} ${part}: what Frontend's packet expects of the frame`);
      assert.equal(record.captures[`${size}/${part}/reduced`].motion, 'reduced', `${size} ${part}: reduced with the device's Reduce motion`);
    }
  }
  // 1. The frozen port.
  assert.deepEqual([record.agreement.port.states, record.agreement.port.equal], [132, 132]);
  assert.ok(record.agreement.port.control.ok && !record.agreement.port.control.html && !record.agreement.port.control.pixels, 'a clock one second off is told apart');
  // 2. The approved package's own pages, for the five parts.
  const WORDS = { 'food-panel-03': [['Sending…'], ['Starts the panel clicking']], 'food-panel-04': [[], []], 'food-winch-03': [['Checking your let-go…', 'The connection dropped on the way.'], []], 'food-winch-12': [[], []],
    'food-panel-18': [['0:25', 'Release the panel.', 'RELEASE'], ['0:18', 'The crate is over you.', 'LOCK']] };
  assert.deepEqual(Object.keys(record.agreement.package).sort(), PACKET.parts.flatMap(part => ['390x844', '430x932'].map(size => `${size}/${part}`)).sort());
  for (const [key, a] of Object.entries(record.agreement.package)) {
    const part = key.split('/')[1];
    assert.ok(a.ok, `${key}: ${a.notes.join('; ')}`);
    assert.deepEqual([a.words.onlyComponent, a.words.onlyPackage], WORDS[part], `${key}: the words differ only by the packet's own press state`);
    assert.ok(Object.keys(a.boxes).length >= 6, `${key}: the parts were measured`);
    // The dock is a wrapper: with no instrument (the crate landed), the port's dock holds the instrument's empty slot and its 10 px gap, and draws nothing there.
    for (const [selector, delta] of Object.entries(a.boxes)) assert.ok(delta <= record.limits.box || (selector === '.fs-dock' && a.instrument === false && part === 'food-winch-12' && delta === 10), `${key}: ${selector} lies where the package lays it`);
    assert.deepEqual(a.portraits, { component: [36, 36], package: [32, 32] }, `${key}: the top bar's portraits are the port's size`);
    if (a.held.scene) assert.ok(a.pixels.scene.mean <= record.limits.packageSceneMean && a.pixels.scene.far <= record.limits.packageSceneFar, `${key}: the scene outside the notices is the package's`);
    if (['food-panel-04', 'food-winch-12'].includes(part)) assert.equal(a.pixels.scene.differing, 0, `${key}: with nothing in motion, the scene is the package's pixel for pixel`);
    else if (a.held.scene) assert.ok(a.pixels.scene.differing > 0 && a.pixels.scene.differing < 0.02 * a.pixels.scene.pixels, `${key}: a few pixels differ, around what moves`);
    if (a.held.dock) assert.equal(a.pixels.dock.max, 0, `${key}: the instrument and control are the package's, pixel for pixel`);
    if (a.held.hint) assert.ok(a.pixels.hint.max <= record.limits.packageGlass, `${key}: the hint is the package's`);
    assert.ok(a.pixels.role.max <= record.limits.packageGlass, `${key}: the role row is the package's, to the glass`);
    assert.ok(a.pixels.scene.moved3px.mean > 1, `${key}: a scene 3 px off would show`);
    assert.ok(existsSync(join(REPO, a.sideBySide.file)), `${key}: ${a.sideBySide.file}`);
  }
  assert.deepEqual(Object.entries(record.agreement.package).filter(([, a]) => !a.held.scene).map(([key]) => key.split('/')[1]), ['food-panel-18', 'food-panel-18'], 'only the synthetic equivalent is another moment than the package\'s page');
  // 3. Frontend's ten native captures from #290.
  assert.equal(Object.keys(record.agreement.native).length, 10);
  for (const [key, a] of Object.entries(record.agreement.native)) {
    assert.ok(a.ok && a.sameSize, `${key}: ${a.notes.join('; ')}`);
    assert.equal(a.commit, PACKET.commit);
    if (a.comparable) {
      assert.ok(a.pixels.scene.mean <= record.limits.nativeSceneMean && a.pixels.scene.far <= record.limits.nativeSceneFar, `${key}: the scene is within the limit`);
      assert.ok(a.pixels.scene.moved3px.mean >= record.limits.controlFactor * a.pixels.scene.mean, `${key}: the same capture 3 px off is told apart`);
    } else assert.match(a.why, /connected match/, `${key}: recorded, not held, and why`);
  }
  assert.deepEqual(Object.entries(record.agreement.native).filter(([, a]) => !a.comparable).map(([key]) => key).sort(), ['390x844/food-panel-18', '430x932/food-panel-18']);
  assert.ok(record.agreement.controls.package.ok && record.agreement.controls.native.ok, 'another part\'s picture does not pass for this one');
  // The lifecycle probe.
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length >= 70 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = new Set(record.probe.full.checks.map(c => c.id.split(':')[0]));
  for (const group of ['contacts', 'listeners', 'presses', 'offers', 'requests', 'stale', 'focus', 'lifecycle', 'quiet', 'exits', 'ownership', 'privacy', 'notice', 'gauge', 'motion', 'pictures', 'handlers', 'adapter']) assert.ok(groups.has(group), `probe group ${group}`);
  // Frontend's four answers, each by its own check.
  const passed = id => record.probe.full.checks.some(c => c.ok && c.id.startsWith(id));
  for (const id of ['listeners: one set on the window per mount', 'contacts: Hold still reports the contact then', 'adapter: with a contact-off owed and no hold offered', 'stale: the tabs, Promises and Settings still report onNavigate',
    'focus: the same control stays focused across redraws', 'lifecycle: resume drew the current state at the current time', 'privacy: concealed, nothing of the surface is left in the page', 'ownership: a Task covers the whole screen, said once']) assert.ok(passed(id), `probe: ${id}`);
});
