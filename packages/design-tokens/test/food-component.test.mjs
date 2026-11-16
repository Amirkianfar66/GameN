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
  FOOD_ANSWERS, FOOD_CAN, FOOD_CLOSURE_KEYS, FOOD_DEFAULTS, FOOD_NAVIGATION_TARGETS, FOOD_NOTICE_DEFAULTS, FOOD_PRESSES, FOOD_PRIVATE_INPUTS, FOOD_STATUSES, FOOD_VERSION, FOOD_VIEW_KEYS,
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
  const kinds = {}, fixes = {};
  for (const entry of record.files) {
    const source = bytes(entry.source);
    assert.ok(entry.source.startsWith(`${PORT}/`), `${entry.file}: copied from the port`);
    assert.equal(sha256(source), entry.sourceSha256, `${entry.source} is the recorded source`);
    assert.equal(pins[entry.source]?.sha256, entry.sourceSha256, `${entry.source} is its pin in ${PINS}`);
    assert.equal(source.length, entry.sourceBytes);
    let text = source.toString('utf8');
    for (const difference of entry.differences) {
      assert.ok(['import-path', 'connector-seam', 'host-rule', 'component-mark', 'correction'].includes(difference.kind), `${entry.file}: a difference is an import path, a connector seam, a host rule, the component's mark or a correction`);
      assert.equal('fix' in difference, difference.kind === 'correction', `${entry.file}: a correction, and nothing else, names the fix it belongs to`);
      if (difference.kind === 'correction') {
        assert.ok([1, 2, 3, 4, 5, 6, 7].includes(difference.fix), `${entry.file}: a correction is one of the seven`);
        assert.ok(difference.why.length > 60, `${entry.file}: a correction says what the port did and what it does now`);
        fixes[difference.fix] = (fixes[difference.fix] ?? 0) + 1;
      }
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
  assert.deepEqual(changed, [['food.css', 2], ['food-ink.mjs', 2], ['food-render.mjs', 21], ['food-notice.mjs', 5], ['food-surface.css', 2]], 'five files differ from their source; ten are byte for byte');
  assert.deepEqual(kinds, { 'import-path': 4, 'connector-seam': 11, 'host-rule': 2, 'component-mark': 2, correction: 13 });
  // The corrections are the only differences that change what is drawn or done: seven, each by its number. They are
  // in the renderer and its styles, and the check's record holds what each one shows.
  assert.deepEqual(fixes, { 1: 1, 2: 1, 3: 1, 4: 4, 5: 1, 6: 3, 7: 2 }, 'the portraits, the dock, the role row, the outcome card (its limit, its words\' scroller, the words\' place in the Tab order, and no card faded as a whole), the request card, the focus (the top bar, and a sheet or card: remembered, then given back), and the stamp of a request card and of Too late to join');
  // Correction 7 is the same room on the two cards that have answers under their words, set on the scroller itself: it is no style rule.
  const stamps = record.files.flatMap(f => f.differences.filter(d => d.fix === 7).map(d => [f.file, d.now.includes("{style:{margin:'-16px -16px 0',padding:'16px 16px 0',outlineOffset:'-5px'}},"), /'Partner request'|'Too late'/.exec(d.now)?.[0]]));
  assert.deepEqual(stamps, [['food-render.mjs', true, "'Partner request'"], ['food-render.mjs', true, "'Too late'"]]);
  assert.deepEqual(record.files.filter(f => f.differences.some(d => d.kind === 'correction')).map(f => f.file), ['food.css', 'food-render.mjs']);
  // The component's mark: each of the two roots the component draws says it is the component's, and nothing else does.
  const marks = record.files.flatMap(f => f.differences.filter(d => d.kind === 'component-mark').map(d => [f.file, d.was, d.now]));
  assert.deepEqual(marks, [['food-render.mjs', "const frame=h('div.planet-food.ph');", "const frame=h('div.planet-food.ph',{'data-food-component':''});"], ['food-notice.mjs', "frame=ui.h('div.planet-food.ph');", "frame=ui.h('div.planet-food.ph',{'data-food-component':''});"]]);
  // The seams do not draw: they are imports, the contact adapter, the app's own listeners, the handle, the connector,
  // and the notice's reach into the app's page.
  const seams = record.files.flatMap(f => f.differences.filter(d => d.kind === 'connector-seam').map(d => `${d.was}\n${d.now}`)).join('\n');
  assert.doesNotMatch(seams.replace(/\/\*\* Bind both Food surfaces[\s\S]*?\n}\n/, ''), /\bh\(|ui\.|replace\(|\.style\b|innerHTML|className|textContent/, 'no seam touches a line that draws');
  // The three window listeners that follow a release stay, one set per mount; the app's own four are gone.
  const render = read(`${COMPONENT}/food-render.mjs`);
  for (const type of ['pointerup', 'pointercancel', 'keyup']) assert.equal(render.split(`win.addEventListener('${type}'`).length, 2, `one ${type} listener on the window`);
  for (const type of ['blur', 'focus', 'visibilitychange', 'mothership:preferences-change']) assert.ok(!render.includes(`'${type}'`), `the ${type} listener stays Frontend's`);
  assert.match(render, /const hold=contacts;/);
});

test('every corrected style rule is under the component\'s mark: the frozen port\'s surface can take none, whatever sheets a page holds', () => {
  // A page that keeps the frozen port for its pinned matches may hold the port's sheets and the component's together.
  // Their class names are the same. So whatever the component's sheets say that the port's do not is written under
  // data-food-component, which only a root the component draws carries: the port's surface cannot match it, and with
  // the mark's own weight such a rule outweighs the port's rule for the same element whichever sheet comes last.
  const rules = css => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => `${m[1].trim()} { ${m[2].trim()} }`);
  const pairs = [['food-kit.css', 'food-kit.css'], ['food.css', 'food.css'], ['food-surface.css', 'food-host.css']];
  const theirs = new Set(pairs.flatMap(([, source]) => rules(read(`${PORT}/${source}`))));
  const added = pairs.flatMap(([file]) => rules(read(`${COMPONENT}/${file}`))).filter(rule => !theirs.has(rule));
  assert.deepEqual(added.map(rule => rule.slice(0, rule.indexOf(' {'))), ['.planet-food[data-food-component] :is(.fs-card[data-scrolls])', '.planet-food[data-food-component] :is(.fs-role)', '.planet-food[data-food-component] :is(.fs-who)'],
    'no card faded as a whole, and the role row\'s two rules: no other');
  for (const rule of added) assert.match(rule, /^\.planet-food\[data-food-component\] :is\(\.[\w-]+(?:\[data-scrolls\])?\) \{/, `${rule.slice(0, 60)}… is under the mark`);
  // The port's own rules for the same elements weigh less by the mark: (0,2,0) against (0,3,0) for the row, (0,3,0) against (0,4,0) for a card that scrolls.
  const port = read(`${PORT}/food.css`);
  assert.match(port, /\.planet-food:is\(\.fs-role\), \.planet-food :is\(\.fs-role\) \{/);
  assert.match(port, /\.planet-food :is\(\.fs-who\)/);
  assert.match(port, /\.planet-food:is\(\.fs-card\[data-scrolls\]\), \.planet-food :is\(\.fs-card\[data-scrolls\]\) \{ -webkit-mask-image: linear-gradient/);
  assert.match(added[0], /\{ -webkit-mask-image: none; mask-image: none; \}$/, 'the component takes the port\'s whole-card fade away, and adds none of its own');
  // The mark is on the two roots the component draws, and nowhere in the frozen port.
  for (const file of ['food-render.mjs', 'food-notice.mjs']) assert.equal(read(`${COMPONENT}/${file}`).split("'data-food-component':''").length, 2, `${file}: the root it draws carries the mark`);
  for (const file of readdirSync(join(REPO, PORT))) assert.ok(!read(`${PORT}/${file}`).includes('data-food-component'), `${PORT}/${file}: the frozen port knows nothing of the mark`);
  // Every other correction is in the renderer or set on the element itself, and cannot reach another surface either way.
  const sources = JSON.parse(read(`${COMPONENT}/sources.json`));
  assert.deepEqual(sources.files.filter(f => f.file.endsWith('.css')).flatMap(f => f.differences.filter(d => d.kind === 'correction').map(d => [f.file, d.fix])), [['food.css', 4], ['food.css', 3]], 'of the corrections two are style rules: no card faded as a whole, and the role row');
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
  // Of the contract's Food player view (packages/contracts/src/planet-food-task.ts) the surface takes twelve keys. The
  // other ten are refused by name: the binding and envelope, the roster, the turn ends, and the viewer's cursor and meals.
  const contractView = ['schemaVersion', 'versions', 'matchId', 'round', 'phaseId', 'viewRevision', 'serverNowMs', 'playerCount', 'rosterSeatIds', 'turnEnds', 'audience', 'seatId',
    'step', 'stock', 'ownAvailability', 'partnerChoices', 'requestClosures', 'invitation', 'participantTask', 'offers', 'privateCursor', 'ownMeals'];
  const schema = read('packages/contracts/src/planet-food-task.ts');
  for (const key of contractView) assert.match(schema, new RegExp(`\\b${key}:`), `${key} is a key of the contract's view`);
  const notTaken = contractView.filter(key => !FOOD_VIEW_KEYS.includes(key));
  assert.deepEqual(notTaken, ['schemaVersion', 'matchId', 'phaseId', 'serverNowMs', 'playerCount', 'rosterSeatIds', 'turnEnds', 'audience', 'privateCursor', 'ownMeals']);
  for (const key of notTaken) assert.throws(() => nextFoodInput(base, { view: { ...view, [key]: 1 } }), { name: 'TypeError', message: `Food: view takes no "${key}"` }, `the view's ${key}`);
  // Of a refused press's closure, the six fields the request cards read; of an accepted press's request, its two.
  assert.deepEqual(FOOD_CLOSURE_KEYS, ['requestId', 'state', 'round', 'foodStepId', 'volunteerSeatId', 'partnerSeatId']);
  const closure = { requestId: 'r', state: 'EXPIRED', round: 3, foodStepId: 's', volunteerSeatId: 'seat-1', partnerSeatId: 'seat-2' };
  const feedback = more => ({ sending: { ...sending, feedback: { key: 'k', name: 'request', recovered: false, ...more } } });
  assert.deepEqual(nextFoodInput(base, feedback({ status: 'rejected', closure })).sending.feedback.closure, closure, 'the six are taken');
  assert.deepEqual(nextFoodInput(base, feedback({ status: 'accepted', request: { requestId: 'r', state: 'JOINED' } })).sending.feedback.request, { requestId: 'r', state: 'JOINED' });
  for (const key of ['requestRevision', 'askedAt', 'answerEndsAt', 'closedAt', 'commandId', 'receipt']) {
    assert.throws(() => nextFoodInput(base, feedback({ status: 'rejected', closure: { ...closure, [key]: 1 } })), { name: 'TypeError', message: `Food: sending.feedback.closure takes no "${key}"` }, `a closure's ${key}`);
  }
  for (const key of ['commandId', 'receipt', 'partnerSeatId']) {
    assert.throws(() => nextFoodInput(base, feedback({ status: 'accepted', request: { requestId: 'r', state: 'PENDING', [key]: 1 } })), { name: 'TypeError', message: `Food: sending.feedback.request takes no "${key}"` }, `a request's ${key}`);
  }
  const notice = nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, { step: { kind: 'AWAY', stepId: 's', awaySeatIds: ['seat-3', 'seat-8'] }, stock: { doses: 2 }, bars: { top: 103 } });
  assert.deepEqual(notice.step, { kind: 'AWAY' }, 'of the published step the notice keeps its kind, and not who is away');
  for (const [what, changes] of Object.entries({ 'a view': { view }, 'a seat': { seatId: 'seat-3' }, 'the viewer': { viewer: { promiseOfferCount: 1 } }, 'the people': { people: [] }, 'more than the doses': { stock: { doses: 2, ownMeals: 1 } }, 'a bottom bar': { bars: { top: 0, bottom: 0 } } })) {
    assert.throws(() => nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, changes), { name: 'TypeError', message: /^Food: / }, `the notice takes no ${what}`);
  }
  // The entry's own names: what it gives the adapter, and the phone surface's handle. One meaning per call:
  // update({ reducedMotion }) changes motion, and relayout() lays the surface out again.
  const entry = read(`${COMPONENT}/food.mjs`);
  const reexported = /export \{([^}]+)\} from '\.\/food-input\.mjs';/.exec(entry)[1].split(',').map(name => name.trim()).filter(Boolean);
  assert.deepEqual(reexported, ['FOOD_ANSWERS', 'FOOD_CAN', 'FOOD_CLOSURE_KEYS', 'FOOD_DEFAULTS', 'FOOD_NAVIGATION_TARGETS', 'FOOD_NOTICE_DEFAULTS', 'FOOD_PRESSES', 'FOOD_PRIVATE_INPUTS', 'FOOD_STATUSES', 'FOOD_VERSION', 'FOOD_VIEW_KEYS', 'nextFoodInput', 'nextFoodNoticeInput']);
  assert.deepEqual([...entry.matchAll(/^export (?:const|function) (\w+)/gm)].map(m => m[1]), ['FOOD_HANDLERS', 'mountFood', 'mountFoodNotice', 'foodGauge']);
  const phone = entry.slice(entry.indexOf('export function mountFood('), entry.indexOf('export function mountFoodNotice(')), handle = phone.slice(phone.indexOf('return Object.freeze({'));
  assert.deepEqual([...handle.matchAll(/^    (\w+)\(/gm)].map(m => m[1]), ['update', 'suspend', 'resume', 'relayout', 'openTasks', 'close', 'dispose'], 'the phone surface\'s handle');
  assert.doesNotMatch(handle.slice(handle.indexOf('    update('), handle.indexOf('    suspend(')), /layoutDue|relayout/, 'update lays nothing out');
  assert.match(phone, /crewSurfaceOf\(host, current\);/, 'the host is checked at mount');
  assert.match(handle, /const before = current, next = nextFoodInput\(current, changes\);\n\s+crewSurfaceOf\(host, next\);\n/, 'and by update, before anything changes');
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

test('concealed, nothing of the viewer is kept: a change of status alone shows nothing again', () => {
  // Integration's review of #303 at 5623c0a0: concealed, the inputs kept the viewer's view, offers, presses and
  // Promises count, and update({ status: 'live' }) alone drew them again. They are dropped, and stay dropped.
  const packet = JSON.parse(read(PACKET.file));
  const frame = part => packet.frames.find(f => f.part === part);
  const NOTHING = { view: null, can: FOOD_DEFAULTS.can, sending: FOOD_DEFAULTS.sending, viewer: FOOD_DEFAULTS.viewer };
  const privateOf = input => Object.fromEntries(FOOD_PRIVATE_INPUTS.map(key => [key, input[key]]));
  const offers = model => ['canAsk', 'canAnswer', 'canWithdraw', 'canHold', 'canPanelRelease', 'canPanelLock', 'canKey'].filter(key => model[key]);
  assert.deepEqual(FOOD_PRIVATE_INPUTS, ['view', 'can', 'sending', 'viewer'], 'the inputs that are this viewer\'s, or tell of this viewer\'s own presses');
  assert.deepEqual(Object.keys(FOOD_DEFAULTS).filter(key => !FOOD_PRIVATE_INPUTS.includes(key)), ['status', 'clock', 'people', 'board', 'navigation', 'assets', 'reducedMotion', 'bars'], 'the rest are public, or this phone\'s own');

  // A Task that holds a view, an offer (LOCK), this phone's press on its way, a hold owed, and the viewer's Promises count.
  const given = { ...packetInput(frame('food-panel-04')), viewer: { promiseOfferCount: 3 },
    sending: { feedback: { key: 'press-1', name: 'LOCK', status: 'sending', recovered: false }, pendingCount: 1, physicalHolding: true, needsContactOff: true } };
  const shown = nextFoodInput(FOOD_DEFAULTS, given);
  assert.ok(shown.view !== null && shown.can.panelLock && shown.sending.feedback !== null && shown.viewer.promiseOfferCount === 3, 'the surface holds them while it is shown');

  // 1. Concealed by a change of status alone: none of them is kept. What is public, and this phone's own, stays.
  const concealed = nextFoodInput(shown, { status: 'concealed' });
  assert.deepEqual(privateOf(concealed), NOTHING, 'concealed, the stored view, offers, presses and viewer facts are the defaults');
  for (const key of ['clock', 'people', 'board', 'navigation', 'assets', 'reducedMotion', 'bars']) assert.equal(concealed[key], shown[key], `${key} stays`);
  // 2. Woken by status alone: there is nothing to show again, nothing is offered, and no press or count comes back.
  const woken = nextFoodInput(concealed, { status: 'live' });
  assert.deepEqual(privateOf(woken), NOTHING, 'a change of status alone gives nothing back');
  const wokenModel = foodModel(woken);
  assert.ok(wokenModel.visible && wokenModel.fresh && wokenModel.view === null && wokenModel.feedback === null && wokenModel.pendingCount === 0 && !wokenModel.physicalHolding && !wokenModel.needsContactOff);
  assert.deepEqual(offers(wokenModel), [], 'no offer is brought back or inferred');
  assert.equal(foodOrdinary(woken).promiseOfferCount, 0, 'nor the viewer\'s Promises count');
  for (const status of ['stale', 'live']) assert.equal(foodModel(nextFoodInput(concealed, { status })).view, null, `woken as ${status}, it stays empty`);
  // 3. Mounted concealed with a view: the same. The values are still checked, then dropped.
  const mountedConcealed = nextFoodInput(FOOD_DEFAULTS, { ...given, status: 'concealed' });
  assert.deepEqual(privateOf(mountedConcealed), NOTHING, 'an input that starts concealed keeps nothing of the viewer');
  assert.deepEqual(privateOf(nextFoodInput(mountedConcealed, { status: 'live' })), NOTHING, 'and a change of status alone then shows nothing');
  assert.throws(() => nextFoodInput(FOOD_DEFAULTS, { ...given, status: 'concealed', view: { ...given.view, privateCursor: 1 } }), { name: 'TypeError', message: 'Food: view takes no "privateCursor"' }, 'a concealed input is still checked');
  // 4. A concealed change that carries the viewer's inputs with it keeps none of them either.
  assert.deepEqual(privateOf(nextFoodInput(shown, { ...given, status: 'concealed' })), NOTHING);
  // 5. Fresh authorized inputs restore it, and only what they give: a fresh view alone brings no offer, press or count.
  const viewOnly = nextFoodInput(concealed, { status: 'live', view: given.view });
  assert.deepEqual(viewOnly.view, given.view);
  assert.deepEqual([viewOnly.can, viewOnly.sending, viewOnly.viewer], [FOOD_DEFAULTS.can, FOOD_DEFAULTS.sending, FOOD_DEFAULTS.viewer], 'a fresh view alone brings nothing else back');
  assert.deepEqual(offers(foodModel(viewOnly)), []);
  const restored = nextFoodInput(concealed, { ...given, status: 'live' });
  assert.deepEqual(privateOf(restored), privateOf(shown), 'the whole of a fresh authorized input restores it');
  assert.deepEqual(foodModel(restored), foodModel(shown));
  // 6. Stale is not concealed: the viewer is still authorized, and the view and this phone's presses stay.
  const stale = nextFoodInput(shown, { status: 'stale' });
  assert.deepEqual(privateOf(stale), privateOf(shown), 'stale keeps what it holds');
  assert.deepEqual(privateOf(nextFoodInput(stale, { status: 'live' })), privateOf(shown), 'and live again by status alone, it is as it was');
  assert.deepEqual(offers(foodModel(stale)), [], 'stale, nothing is offered');
  // The entry takes the surface down before it drops what it held, and drops it on dispose too.
  const entry = read(`${COMPONENT}/food.mjs`), phone = entry.slice(entry.indexOf('export function mountFood('), entry.indexOf('export function mountFoodNotice('));
  assert.match(phone, /if \(next\.status === 'concealed'\) unmount\(\);\n\s+current = next;/, 'update: everything is let go and the surface taken down first, then the cleared input is kept');
  assert.match(phone, /dispose\(\) \{\n\s+if \(disposed\) return;\n\s+unmount\(\);\n\s+disposed = true;\n\s+current = nextFoodInput\(current, \{ status: 'concealed' \}\);/, 'dispose keeps nothing of the viewer');
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
  for (const name of ['setAttribute', 'style', 'getBoundingClientRect']) reads.delete(name); // nodes.view, the scene's element, not the Food view
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
  assert.deepEqual(readdirSync(folder).sort(), ['both.html', 'both.mjs', 'compare.html', 'compare.mjs', 'food-component-preview-inputs.json', 'index.html', 'port.html', 'port.mjs', 'preview.css', 'preview.mjs', 'probe.mjs', 'provenance.json', 'stage.mjs']);
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
  // The page that holds both imports each renderer only when it is asked for, so that the page decides whose sheets come first.
  const both = read(`${COMPONENT}/preview/both.mjs`);
  assert.match(both, /component: \(\) => import\('\.\.\/food\.mjs'\)/);
  assert.match(both, /await import\('\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/apps\/game\/hosted\/planet\/food-render\.mjs'\)/);
  assert.doesNotMatch(both, /^import .*(?:food\.mjs|food-render\.mjs)';$/m, 'neither renderer is imported before the page says in which order');
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
  // Each picture is of a page at rest: it is taken again, 150 ms apart, until two in a row are the same.
  assert.equal(record.rest.ms, 150);
  assert.ok(record.rest.pictures >= 400 && record.rest.retaken <= record.rest.pictures / 10, 'every picture was taken at rest, and few had to be taken again');
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
    assert.ok(Object.values(c.port.equal).every(Boolean), `${key}: the frozen port draws the same, the corrections that apply aside`);
    // The component's root carries its mark, so its DOM is never the port's byte for byte: the check reads the port's with the mark.
    assert.notEqual(c.port.htmlSha256, c.htmlSha256, `${key}: the DOM is the port's with the root's mark${c.port.corrections.length ? ` and corrections ${c.port.corrections.join(', ')}` : ''}, not as it is`);
    if (c.port.corrections.length === 0) assert.ok(c.port.pngSha256 === c.pngSha256 && c.port.touched.length === 0, `${key}: no correction applies: the frozen port's pixels, byte for byte`);
    assert.match(c.synthetic, /Frontend's|invented/, `${key}: its state says where it comes from`);
    if (c.file) assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  assert.equal(captures.filter(([, c]) => c.file).length, 48, 'a picture of every state at 390 × 844 in full motion, and of the five parts at both sizes in both motions');
  // Larger text: the port's own support, drawn the same by the component, with the corrections.
  const larger = Object.entries(record.largerText.drawn);
  assert.deepEqual(record.largerText.texts, [1.5, 2]);
  assert.equal(larger.length, 48, 'twelve states at two sizes, at the Large and the Largest text');
  assert.deepEqual(record.largerText.states.slice(5), ['case-food-winch-01', 'case-food-flow-02', 'case-food-flow-04', 'case-food-panel-16', 'case-food-winch-14', 'case-food-winch-17', 'case-food-panel-17'], 'the five parts, then a briefing, a sheet, a request and the four outcomes');
  for (const [key, l] of larger) {
    assert.ok(l.ok && Object.values(l.equal).every(Boolean), `${key}: the frozen port draws the same, the corrections that apply aside: ${l.notes.join('; ')}`);
    assert.equal(l.bars.top, { 24: 117, 32: 141 }[l.rootPx], `${key}: the text is larger: the surface's own bar has grown`);
    assert.deepEqual(l.problems, [], `${key}: no page problem`);
    if (l.file) assert.ok(existsSync(join(REPO, l.file)), `${key}: ${l.file}`);
  }
  // Kept for review at the Largest text: two Task screens, the briefing at both sizes (it is left over the hint), and the three outcomes that are not pictured before and after.
  assert.deepEqual(larger.filter(([, l]) => l.file).map(([key]) => key).sort(), ['390x844/case-food-panel-17/200%', '390x844/case-food-winch-01/200%', '390x844/case-food-winch-14/200%', '390x844/case-food-winch-17/200%', '390x844/food-panel-04/200%', '390x844/food-winch-03/200%', '430x932/case-food-winch-01/200%']);
  // At the larger text the corrections to the role row, the outcome card and the request card show.
  assert.deepEqual([record.largerText.port.states, record.largerText.port.equal, record.largerText.port.identical], [48, 48, 0]);
  assert.deepEqual(record.largerText.port.corrected, { 1: 40, 2: 20, 3: 13, 4: 16, 5: 4, 6: 4 });
  for (const [key, l] of larger) {
    const [size, state, text] = key.split('/'), task = !state.includes('flow');
    assert.equal(l.corrections.includes(1), task, `${key}: a Task's bar holds the portraits`);
    // The port breaks the Partner's label at the Large text on the narrower phone, and with "· Out" or "· Offline" on both.
    assert.equal(l.corrections.includes(3), task && text === '150%' && (size === '390x844' || ['case-food-panel-16', 'case-food-winch-17', 'case-food-panel-17'].includes(state)), `${key}: correction 3 applies where the port breaks the label`);
    // A card's limit shows wherever the port's card is taller: then the place it touches is named. Every outcome is held so at the larger text.
    const outcome = ['case-food-panel-16', 'case-food-winch-14', 'case-food-winch-17', 'case-food-panel-17'].includes(state);
    assert.equal(l.corrections.includes(4), outcome, `${key}: correction 4 applies to an outcome card`);
    if (outcome) assert.equal(l.touched.length, l.corrections.includes(3) ? 3 : 2, `${key}: the outcome card is held by its limit: the bar's portraits, the card${l.corrections.includes(3) ? ' and the role row' : ''} are the places touched`);
    if (state === 'case-food-flow-04') assert.equal(l.touched.length, { '390x844/150%': 1, '390x844/200%': 1, '430x932/150%': 0, '430x932/200%': 1 }[`${size}/${text}`], `${key}: the request card is held by its limit where the port's ran over the tab bar`);
  }
  // Laid out again after a text-size change: relayout() draws what a new mount draws and, the focus aside, what the port draws on the app's preferences event.
  assert.deepEqual([record.relayout.text, record.relayout.portEvent, record.relayout.states], [1.5, 'mothership:preferences-change', { 'case-food-flow-09': 'banner', 'case-food-flow-04': 'card', 'case-food-flow-01': 'sheet' }]);
  assert.deepEqual(Object.keys(record.relayout.drawn), ['390x844', '430x932'].flatMap(size => ['case-food-flow-09', 'case-food-flow-04', 'case-food-flow-01'].map(state => `${size}/${state}`)));
  for (const [key, r] of Object.entries(record.relayout.drawn)) {
    assert.ok(r.ok && Object.values(r.equal).every(Boolean), `laid out again, ${key}: the port, on its preferences event, draws the same, the corrections that apply aside: ${r.notes.join('; ')}`);
    assert.equal(r.bars.top, 117, `laid out again, ${key}: the bar has grown`);
    assert.deepEqual(r.problems, [], `laid out again, ${key}: no page problem`);
    assert.ok(r.asNew.html && r.asNew.pixels, `${key}: it is what a new mount draws, DOM and pixels`);
    if (r.kind === 'banner') {
      assert.deepEqual(r.corrections, [], `${key}: no correction applies`);
      assert.deepEqual(r.banner, { told: '161px', port: '161px', untold: '143px' }, `${key}: told, the banner sits under the taller bar; not told, it stays where it was built`);
    } else {
      // Correction 6: the card or sheet that is built again takes the focus back. The port's leaves it to the page: the control.
      const dialog = { card: 'fs-card', sheet: 'sheet' }[r.kind];
      assert.ok(r.corrections.includes(6), `${key}: correction 6 applies`);
      assert.deepEqual(r.focus, { newMount: dialog, notTold: dialog, told: dialog, port: null }, `${key}: the ${r.kind} built again has the focus, where the port's left it to the page`);
    }
  }
  // The corrections to the port, each pictured before and after, with its numbers.
  assert.deepEqual(Object.keys(record.corrections.list), ['1', '2', '3', '4', '5', '6']);
  assert.deepEqual([record.corrections.portrait, record.corrections.slotGap], [{ kit: 32, port: 36 }, 10]);
  const pictured = record.corrections.beforeAfter;
  assert.deepEqual(Object.keys(pictured), ['1/390x844/food-panel-04/100%', '1/430x932/food-panel-04/100%', '2/390x844/food-winch-12/100%', '3/390x844/food-panel-04/150%', '3/390x844/food-winch-03/150%',
    '4/390x844/case-food-panel-16/150%', '4/430x932/case-food-panel-16/150%', '4/390x844/case-food-panel-16/200%', '4/430x932/case-food-panel-16/200%', '5/390x844/case-food-flow-04/150%', '5/390x844/case-food-flow-04/200%', '5/430x932/case-food-flow-04/200%']);
  for (const [key, p] of Object.entries(pictured)) {
    assert.ok(p.ok, `before and after, ${key}: the numbers show the correction`);
    assert.ok(existsSync(join(REPO, p.file)), `before and after, ${key}: ${p.file}`);
  }
  assert.deepEqual([pictured['1/390x844/food-panel-04/100%'].before, pictured['1/390x844/food-panel-04/100%'].after], [{ portraits: ['36 × 36', '36 × 36'], titleStartsAt: 80 }, { portraits: ['32 × 32', '32 × 32'], titleStartsAt: 72 }], 'correction 1: the portraits, and the title 8 px further back');
  assert.deepEqual([pictured['2/390x844/food-winch-12/100%'].before.dock, pictured['2/390x844/food-winch-12/100%'].after.dock, pictured['2/390x844/food-winch-12/100%'].after.controls], [[16, 708, 358, 86], [16, 718, 358, 76], [16, 718, 358, 76]], 'correction 2: the dock is its controls');
  assert.deepEqual([pictured['3/390x844/food-panel-04/150%'].before.pieces, pictured['3/390x844/food-panel-04/150%'].after.pieces], [[{ text: '8 Hana', lines: 2 }, { text: '· Winch', lines: 3 }], [{ text: '8 Hana', lines: 1 }, { text: '· Winch', lines: 1 }]], 'correction 3: the label\'s two pieces, broken and whole');
  for (const key of Object.keys(pictured).filter(key => key.startsWith('4/'))) {
    const { before, after } = pictured[key];
    assert.ok(before.cardEndsAt > before.nextRowStartsAt && after.cardEndsAt <= after.viewEndsAt - 12 + record.limits.box && after.wordsScroll && !before.wordsScroll, `correction 4, ${key}: the card ran over the row under the view, and now ends inside the view with its words scrolling`);
    assert.deepEqual([before.fades, after.fades], [null, 'words'], `correction 4, ${key}: only the card's words fade, never the card`);
  }
  for (const key of Object.keys(pictured).filter(key => key.startsWith('5/'))) {
    const { before, after } = pictured[key];
    assert.ok(before.cardEndsAt > before.tabBarStartsAt && after.cardEndsAt <= after.passStartsAt - 8 + record.limits.box && after.answersEndAt < after.cardEndsAt && after.wordsNeed > after.wordsShown && after.wordsShown >= 300, `correction 5, ${key}: the card ran over the tab bar, and now ends above the Pass button with its answers whole and its words scrolling`);
  }
  assert.match(record.captures['390x844/food-panel-18/full'].synthetic, /a synthetic equivalent \(a retained RELEASE-capable view marked stale\), not a connected payload/);
  for (const part of PACKET.parts) {
    for (const size of ['390x844', '430x932']) {
      const c = record.captures[`${size}/${part}/full`];
      assert.ok(c.packetExpects && c.controls[0].act === c.packetExpects.control && c.controls[0].enabled === c.packetExpects.enabled && c.controls[0].busy === c.packetExpects.busy, `${size} ${part}: what Frontend's packet expects of the frame`);
      assert.equal(record.captures[`${size}/${part}/reduced`].motion, 'reduced', `${size} ${part}: reduced with the device's Reduce motion`);
    }
  }
  // 1. The frozen port.
  assert.deepEqual([record.agreement.port.states, record.agreement.port.equal, record.agreement.port.identical], [132, 132, 36], 'every capture is the port\'s, corrections aside; in 36 none applies and nothing differs');
  // Which correction applies where: the portraits on every Task screen and on the one turn bar; the dock where no instrument
  // is shown; an outcome card's limit and a request card's wherever one is shown; the focus on the sheet the port built again.
  assert.deepEqual(record.agreement.port.corrected, { 1: 88, 2: 28, 4: 16, 5: 4, 6: 4 });
  for (const [key, c] of captures) {
    const state = key.split('/')[1], task = c.screen === 'food-task';
    assert.equal(c.port.corrections.includes(1), task || state === 'case-food-states-14', `${key}: correction 1 applies to a bar with portraits`);
    assert.ok(!c.port.corrections.includes(3), `${key}: at the Standard text the port breaks no label`);
    assert.equal(c.port.corrections.includes(5), state === 'case-food-flow-04', `${key}: correction 5 applies to the request card`);
    assert.equal(c.port.corrections.includes(6), state === 'case-food-flow-02', `${key}: correction 6 applies to the sheet the port built again when a Partner was chosen`);
    // At the Standard text no card is held by its limit: only the bar's portraits and title are touched.
    assert.equal(c.port.touched.length, c.port.corrections.includes(1) ? 1 : 0, `${key}: only the bar's portraits and title differ in the picture`);
  }
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
    // Corrections 1 and 2 are held here: the dock lies where the package lays it with no instrument too, and the bar's portraits and title are the package's.
    for (const [selector, delta] of Object.entries(a.boxes)) assert.ok(delta <= record.limits.box, `${key}: ${selector} lies where the package lays it`);
    assert.ok('.fs-dock' in a.boxes && (part !== 'food-winch-12' || a.instrument === false), `${key}: the dock was measured, with no instrument on food-winch-12`);
    assert.deepEqual(a.portraits, { component: [32, 32], package: [32, 32] }, `${key}: the top bar's portraits are the package's size`);
    assert.ok(a.pixels.who.max <= record.limits.packageBar && a.pixels.who.moved3px.max > 100, `${key}: the bar's portraits and title are the package's, to the bar's glass; 3 px off would show`);
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
  // The frozen port and the component in one page, with both their stylesheets, loaded in each order.
  const SIZES = ['390x844', '430x932'], pairs = Object.entries(record.together.drawn);
  assert.deepEqual([record.together.orders, record.together.texts, record.together.states], [['port', 'component'], [1, 1.5, 2], record.largerText.states]);
  assert.deepEqual(pairs.map(([key]) => key), SIZES.flatMap(size => record.together.states.flatMap(state => ['100%', '150%', '200%'].flatMap(text => ['port', 'component'].map(first => `${size}/${state}/${text}/${first}-first`)))), 'twelve states, at three text sizes and two phone sizes, in both orders: 144');
  for (const [key, t] of pairs) {
    assert.ok(t.ok, `in one page, ${key}: ${t.notes.join('; ')}`);
    assert.deepEqual(t.sheets, t.first === 'port' ? ['port', 'component'] : ['component', 'port'], `${key}: the page holds both stylesheets, the ${t.first}'s first`);
    for (const who of ['port', 'component']) assert.deepEqual(t[who], { html: true, text: true, boxes: true, controls: true, covers: true, gauge: true, pixels: true }, `${key}: the ${who}'s surface is what it is alone, DOM, boxes and pixels`);
    assert.deepEqual(t.problems, [], `${key}: no page problem`);
    // What each surface draws there is the picture it draws alone, in either order of the sheets.
    const [size, state, text] = key.split('/'), own = text === '100%' ? record.captures[`${size}/${state}/full`] : record.largerText.drawn[`${size}/${state}/${text}`];
    assert.equal(t.pngSha256.component, own.pngSha256, `${key}: the component's picture is the one it draws alone`);
    if (text === '100%') assert.equal(t.pngSha256.port, own.port.pngSha256, `${key}: the port's picture is the one it draws alone`);
  }
  // Where the role row's correction shows, the port's label is still broken beside the component's whole one, whichever sheets come last.
  const rows = pairs.filter(([, t]) => t.roleRow === 'the port breaks its label; the component does not').map(([key]) => key);
  assert.deepEqual(rows, Object.entries(record.largerText.drawn).filter(([, l]) => l.corrections.includes(3)).flatMap(([key]) => ['port', 'component'].map(first => `${key}/${first}-first`)), 'the same captures where correction 3 applies, in both orders');
  assert.ok(rows.length >= 16, 'the role row\'s correction shows in at least sixteen of them');
  const unmarked = record.together.control;
  assert.ok(unmarked.ok && unmarked.labelBreaks && !unmarked.sameAsAlone.html && !unmarked.sameAsAlone.boxes && !unmarked.sameAsAlone.pixels && Object.values(unmarked.portSameAsAlone).every(Boolean), 'the control: without its mark the component\'s label breaks as the port\'s does, and the check can tell');
  assert.deepEqual(Object.keys(record.together.pictures), ['390x844/food-panel-04/150%/port-first', '390x844/food-panel-04/150%/component-first']);
  for (const picture of Object.values(record.together.pictures)) assert.ok(existsSync(join(REPO, picture.file)), picture.file);
  // Every card over what lies behind it: opaque to its edge.
  const cards = Object.entries(record.opaque.drawn);
  assert.deepEqual(record.opaque.states, ['case-food-winch-01', 'case-food-winch-14', 'case-food-winch-17', 'case-food-panel-01', 'case-food-panel-16', 'case-food-panel-17', 'case-food-flow-04'], 'the two briefings, the four outcomes and the request');
  assert.equal(cards.length, 42, 'seven states with a card, at three text sizes and two phone sizes');
  assert.deepEqual([...new Set(cards.map(([, c]) => c.kind))].sort(), ['briefing', 'outcome', 'request']);
  for (const [key, c] of cards) {
    assert.ok(c.ok, `a card over what lies behind it, ${key}: ${c.notes.join('; ')}`);
    assert.ok(c.inside.pixels > 20000 && c.inside.changed === 0, `${key}: with a loud backdrop under the card, no pixel inside it changed`);
    assert.ok(c.foot.pixels > 5000 && c.foot.changed === 0, `${key}: nor in its foot, the 28 px inside its lower edge`);
    assert.ok(c.around.changed >= c.around.pixels / 2, `${key}: around the card the backdrop shows: it was there`);
    assert.notEqual(c.fades, 'card', `${key}: the card is not faded as a whole`);
    assert.equal(c.fades, c.wordsScroll ? 'words' : null, `${key}: only words that scroll fade`);
    if (!c.wordsScroll) assert.deepEqual([c.rim.colours, c.rim.colour], [1, c.colour], `${key}: under its words the card's rim is its own colour and no other`);
  }
  // An outcome card's words scroll at the larger text on both phones; the briefing's never do.
  for (const [key, c] of cards) {
    const [, state, text] = key.split('/');
    if (c.kind === 'outcome') assert.equal(c.wordsScroll, text !== '100%', `${key}: an outcome card's words scroll at the larger text, and fit at the Standard`);
    if (c.kind === 'briefing') assert.equal(c.wordsScroll, false, `${key}: the briefing does not scroll (${state})`);
  }
  const whole = record.opaque.control;
  assert.ok(whole.ok && whole.fades === 'card' && whole.inside.changed > 0 && whole.foot.changed > 0 && !whole.passes, 'the control: a card faded as a whole lets the backdrop through its foot, and does not pass');
  // A card's words within reach of the keys, with real key presses.
  const pressed = Object.entries(record.keys.drawn);
  assert.deepEqual(pressed.map(([key]) => key), SIZES.flatMap(size => ['case-food-panel-16', 'case-food-flow-04'].flatMap(state => ['100%', '150%', '200%'].map(text => `${size}/${state}/${text}`))));
  for (const [key, k] of pressed) {
    assert.ok(k.ok, `the keys, ${key}: ${k.notes.join('; ')}`);
    assert.match(k.start.focus, /^fs-card/, `${key}: the card holds the focus`);
    if (k.wordsScroll) assert.ok(k.tab.onWords && /^solid /.test(k.tab.ring) && k.arrow.scrolled > 0 && Math.abs(k.end.scrolled - k.end.most) <= 1, `${key}: Tab goes to the words, which show the ring; the arrow scrolls them; End brings their last line`);
    else assert.ok(!k.tab.onWords && k.arrow.scrolled === 0, `${key}: the words fit, and Tab does not stop on them`);
  }
  assert.ok(pressed.filter(([, k]) => k.wordsScroll).length >= 7, 'the words scroll in at least seven of the twelve');
  // The lifecycle probe.
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length >= 70 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = new Set(record.probe.full.checks.map(c => c.id.split(':')[0]));
  for (const group of ['contacts', 'listeners', 'presses', 'offers', 'requests', 'stale', 'focus', 'lifecycle', 'quiet', 'exits', 'ownership', 'privacy', 'notice', 'gauge', 'host', 'motion', 'layout', 'corrections', 'pictures', 'handlers', 'adapter']) assert.ok(groups.has(group), `probe group ${group}`);
  // Frontend's four answers, each by its own check.
  const passed = id => record.probe.full.checks.some(c => c.ok && c.id.startsWith(id));
  for (const id of ['listeners: one set on the window per mount', 'contacts: Hold still reports the contact then', 'adapter: with a contact-off owed and no hold offered', 'stale: the tabs, Promises and Settings still report onNavigate',
    'focus: the same control stays focused across redraws', 'lifecycle: resume drew the current state at the current time', 'privacy: concealed, nothing of the surface is left in the page', 'ownership: a Task covers the whole screen, said once']) assert.ok(passed(id), `probe: ${id}`);
  // The Lead Designer's answers of 16 November on the interface, each by its own check.
  for (const id of ['contacts: a contact is plain data and nothing else', 'privacy: of the contract\'s view the surface takes twelve keys and refuses the other ten by name', 'pictures: the loader\'s signal is listened to once and let go on dispose',
    'layout: update({ reducedMotion }) changes motion and lays nothing out', 'layout: relayout() lays the surface out again', 'layout: suspended, relayout() waits, and resume draws the new layout',
    'host: outside the game\'s crew picture surface a view is refused at mount with a TypeError', 'host: with no view, or concealed, nothing is asked of the host', 'host: inside the surface the app marked']) assert.ok(passed(id), `probe: ${id}`);
  // Integration's review of #303: concealed, nothing of the viewer is kept or shown again.
  for (const id of ['privacy: concealed, then woken by status alone, the surface stays empty', 'privacy: given fresh authorized inputs it starts anew', 'privacy: the viewer\'s Promises count is not shown again by a status-only wake',
    'privacy: an offer is not brought back or inferred', 'privacy: the whole of a fresh authorized input restores it', 'privacy: stale is not concealed', 'privacy: a press that was on its way is not shown again unless it is given again',
    'privacy: mounted concealed with a view, then woken by status alone, it stays empty', 'privacy: and given fresh authorized inputs, it draws them']) assert.ok(passed(id), `probe: ${id}`);
  // The six corrections to the port, each by its own checks, as the Lead Designer asked on 16 November.
  for (const id of ['corrections: the top bar\'s portraits take the kit\'s 32 px', 'corrections: with no instrument the dock has no slot and no gap for one',
    'corrections: at the Standard and the Large text, on both phones and with the longest names, the Partner\'s label is two whole pieces', 'corrections: at the Largest text the role row is dropped, as in the port',
    'corrections: at every text size, on both phones, an outcome card ends 12 px above the view\'s lower edge or higher, over no row and no control', 'corrections: an outcome card\'s words are in a scroller that is the card\'s whole inside, with its stamp whole',
    'corrections: no card is faded as a whole, at any text size on either phone', 'corrections: where a card does scroll as a whole (the briefing at the Largest text, in a phone 320 px by 568 px) it is still not faded', 'corrections: a card\'s words that scroll take a place in the Tab order',
    'corrections: at every text size, on both phones, the request card ends 8 px above the Pass button or higher, clear of the tab bar', 'corrections: where the request\'s words need more room they scroll above the answers to their last line',
    'corrections: with a sheet open, the focus survives relayout()', 'corrections: with a request card open, the focus survives relayout()', 'corrections: at the Largest text, where a sheet or a card is built again by itself, the focus stays too',
    'corrections: a card built again does not take the focus from outside the surface', 'corrections: the top bar is drawn again a second later, and Promises keeps the focus']) assert.ok(passed(id), `probe: ${id}`);
  for (const run of Object.values(record.probe)) assert.equal(run.checks.length, 116, 'a hundred and sixteen checks in each mode');
});
