// Windows (design/phone-ui/components/windows): a runtime source the game imports as it is, so its module graph, its
// styles' scope, its inputs, the contract's limits, the sheet it gives the shell, the draft's privacy and its words are
// checked here; its drawing and lifecycle in a browser under the production headers by design/tools/windows-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DRAWING_BOX, DRAWING_LIMITS, INKS, PEN_WIDTH, WINDOWS_DEFAULTS, WINDOWS_SHEET_ID, WINDOWS_VERSION, WINDOWS_WORDS, checkStrokes, nextWindowsInput, windowsSheet,
} from '../../../design/phone-ui/components/windows/windows.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/windows';
const read = path => readFileSync(join(REPO, path), 'utf8');

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}
function split(list) {
  const out = [''];
  let depth = 0;
  for (const ch of list) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch;
  }
  return out.map(s => s.trim());
}
function selectors(path) {
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  return [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@')).flatMap(split);
}

const GOLD = INKS[0].color;
const stroke = (points = [[0.1, 0.2], [0.3, 0.4]], extra = {}) => ({ color: GOLD, width: PEN_WIDTH, points, ...extra });
const HANA = { seat: 8, name: 'Hana' }, DEV = { seat: 4, name: 'Dev' };
const drawingBy = (id, author, order = 0) => ({ id, order, round: 3, author, drawing: { strokes: [stroke()] } });
const windowsAt = (station = null, extra = []) => [
  { windowId: 'A_B', rooms: ['Room A', 'Room B'], station: null, drawings: [drawingBy('d1', HANA)] },
  { windowId: 'A_HOSPITAL', rooms: ['Room A', 'Hospital'], station, drawings: [drawingBy('d2', { seat: 5, name: 'Eli' }), ...extra] },
];
const draft = (strokes = [stroke()]) => ({ windowId: 'A_HOSPITAL', ink: GOLD, strokes });
const live = (extra = {}) => nextWindowsInput(WINDOWS_DEFAULTS, { viewer: 4, windows: windowsAt('A2'), draft: draft(), show: { enabled: true }, ...extra });

test('the component is a runtime source: its whole graph is runtime-safe, and it sends nothing', () => {
  const files = new Map(['windows.mjs', 'windows.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  const own = graph(join(REPO, COMPONENT, 'windows.mjs')).get(join(REPO, COMPONENT, 'windows.mjs'));
  assert.deepEqual(own, ['../kit/kit.mjs'], 'the kit only: no runtime import of the contracts (the limits are kept here), and the sheet\'s frame is the shell\'s');
  const source = read(`${COMPONENT}/windows.mjs`).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
  assert.doesNotMatch(source, /fetch\(|navigator|localStorage|sessionStorage|Date\.now|setInterval|setTimeout|console\./, 'it sends, stores, counts and logs nothing');
  // The strokes are made element by element with checked numbers: never markup.
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|DOMParser|createContextualFragment|xlink:href|href/, 'no markup and no link in what it draws');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/windows-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside its root, and restyle no kit part', () => {
  const file = `${COMPONENT}/windows.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length >= 18, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-windows(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|char-select|cs-|display-settings|settings-sheet|ds-|host-controls|hc-|panels|pn-|pp-|promises|pr-|room-scene)/, `"${selector}" reaches no other component`);
    // A kit part is only hidden with the component's own.
    if (/\.ms-k-/.test(selector)) assert.match(selector, /^\.ms-windows :is\(/, `"${selector}": a kit part only hidden`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own');
  assert.doesNotMatch(css, /transition|animation/, 'no transition or animation');
  assert.match(read(file), /^@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit\'s stylesheet');
  // Decision 1: each window's head is the kit's section head (0.7.0), not a copy.
  assert.match(read(`${COMPONENT}/windows.mjs`), /kit\.sectionHead\(/, 'the kit\'s section head');
  assert.doesNotMatch(read(`${COMPONENT}/windows.mjs`) + css, /ms-wn-head/, 'no head of its own');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no custom properties of its own');
  // The pack's values (screens.css .canvas-box, .swatch, .drawing-meta).
  for (const value of ['aspect-ratio: 512 / 280', 'border-radius: 14px', 'background: #0E1420', 'width: 34px; height: 34px', 'margin: 12px 0 4px', 'margin: 6px 2px 0', 'touch-action: none']) assert.ok(css.includes(value), `windows.css: ${value}`);
  for (const ink of INKS) assert.ok(css.includes(`[data-ink="${ink.name.toLowerCase()}"] { background: ${ink.color}; }`), `the ${ink.name} swatch`);
});

test('its words, inks and pen are the pack\'s (sheet 34); why there is no window is Frontend\'s', () => {
  const more = read('design/phone-ui/prototype/screens-more.mjs');
  const W = WINDOWS_WORDS;
  for (const words of [W.title, W.ends, W.station('A2'), W.meta(0, 'Hana', 3), W.meta(1, 'Dev', 3), W.unverified, W.fixed, W.shownThisRound, W.shownStamp, W.ink, W.undo, W.clear, W.show, W.done,
    W.head(['Room A', 'Room B']), W.head(['Room A', 'Hospital'])]) {
    assert.ok(more.includes(`'${words}'`), `screens-more.mjs: ${words}`);
  }
  assert.ok(more.includes(`[${INKS.map(i => `'${i.color}'`).join(', ')}]`), 'the pack\'s four inks, in its order');
  assert.ok(more.includes(`[${INKS.map(i => `'${i.name}'`).join(', ')}]`), 'their names');
  assert.equal(INKS[0].name, 'Gold', 'Gold first (decision 5)');
  assert.ok(more.includes(`stroke-width="${PEN_WIDTH}"`) && more.includes(`viewBox="0 0 ${DRAWING_BOX.width} ${DRAWING_BOX.height}"`), 'the pack\'s pen (6 in 512) and box');
  // Decision 3: "No window here" and its line are Frontend's.
  const source = read(`${COMPONENT}/windows.mjs`);
  for (const words of ['No window here', 'Command Room', 'has no window', 'closed']) assert.ok(!source.replace(/^\s*\/\/.*$/gm, '').includes(words), `no words of its own for none: ${words}`);
  // Decision 6: the box's name and keys, the Lead's (not drawn).
  assert.equal(W.box(['Room A', 'Hospital']), 'Drawing for Room A ↔ Hospital');
  assert.equal(W.keys, 'Arrow keys move the pen. Shift with an arrow draws. Space makes a dot.');
  assert.equal(WINDOWS_VERSION, 'windows-0.1.0');
});

test('the limits are the contract\'s (PlanetDrawingSchema), kept here and read from the contract\'s source', () => {
  const ts = read('packages/contracts/src/planet-game.ts');
  const schema = ts.slice(ts.indexOf('export const PlanetDrawingSchema'), ts.indexOf('export type PlanetDrawing ='));
  assert.ok(schema.length > 100, 'found PlanetDrawingSchema');
  const strokes = schema.match(/\}\)\)\.min\((\d+)\)\.max\((\d+)\)/);
  const points = schema.match(/points:\s*z\.array\(z\.tuple\(\[z\.number\(\)\.min\((\d+)\)\.max\((\d+)\),\s*z\.number\(\)\.min\((\d+)\)\.max\((\d+)\)\]\)\)\.min\((\d+)\)\.max\((\d+)\)/);
  const width = schema.match(/width:\s*z\.number\(\)\.min\((\d+)\)\.max\((\d+)\)/);
  const total = schema.match(/<=\s*(\d+)/);
  const color = schema.match(/color:\s*z\.string\(\)\.regex\(\/(.+?)\/\)/);
  assert.ok(strokes && points && width && total && color, 'each limit found in the contract');
  assert.deepEqual(DRAWING_LIMITS, { strokes: Number(strokes[2]), points: Number(points[6]), total: Number(total[1]), widthMin: Number(width[1]), widthMax: Number(width[2]) }, 'the same numbers as the contract');
  assert.deepEqual([strokes[1], points.slice(1, 6)].flat().map(Number), [1, 0, 1, 0, 1, 1], 'at least one stroke of at least one point, each from 0 to 1');
  assert.equal(color[1], '^#[0-9a-fA-F]{6}$', 'colours as #rrggbb');
  assert.ok(PEN_WIDTH >= DRAWING_LIMITS.widthMin && PEN_WIDTH <= DRAWING_LIMITS.widthMax);
  // Within them a drawing is taken; one past any of them, or not the contract's, is refused.
  const many = (n, k) => Array.from({ length: n }, () => stroke(Array.from({ length: k }, () => [0.5, 0.5])));
  assert.equal(checkStrokes(many(128, 32)).length, 128);
  assert.equal(checkStrokes([...many(7, 512), ...many(1, 512)]).length, 8, '4096 points in all');
  assert.throws(() => checkStrokes(many(129, 1)), /1 to 128 strokes/);
  assert.throws(() => checkStrokes(many(1, 513)), /1 to 512 points/);
  assert.throws(() => checkStrokes([...many(8, 512), ...many(1, 1)]), /at most 4096 points/);
  assert.throws(() => checkStrokes([]), /1 to 128 strokes/, 'a shown drawing has a stroke');
  assert.deepEqual(checkStrokes([], { draft: true }), [], 'a draft may be empty');
  assert.throws(() => checkStrokes([stroke(undefined, { color: 'red' })]), /#rrggbb/);
  assert.throws(() => checkStrokes([stroke(undefined, { color: '#fff"/><script>' })]), /#rrggbb/);
  assert.throws(() => checkStrokes([stroke(undefined, { width: 25 })]), /width is 1 to 24/);
  assert.throws(() => checkStrokes([stroke([[1.01, 0]])]), /from 0 to 1/);
  assert.throws(() => checkStrokes([stroke([['0.5', 0.5]])]), /from 0 to 1/);
  assert.throws(() => checkStrokes([stroke([[Number.NaN, 0.5]])]), /from 0 to 1/);
  assert.throws(() => checkStrokes([stroke([])]), /1 to 512 points/);
});

test('its inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextWindowsInput(WINDOWS_DEFAULTS, { viewer: 4, ...input }), pattern);
  refuses({ view: 'draw' }, /view is windows, shown/);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ windows: [{ rooms: ['Room A', 'Room B'], drawings: [] }] }, /needs its windowId/);
  refuses({ windows: [...windowsAt(), windowsAt()[0]] }, /A_B is given twice/);
  refuses({ windows: [{ ...windowsAt()[0], rooms: ['Room A'] }] }, /two rooms' names/);
  refuses({ windows: windowsAt().map(w => ({ ...w, station: 'A2' })) }, /one station at most/);
  refuses({ windows: [{ ...windowsAt()[0], drawings: [drawingBy('d1', HANA), drawingBy('d1', HANA)] }] }, /d1 is given twice/);
  refuses({ windows: [{ ...windowsAt()[0], drawings: [{ ...drawingBy('d1', HANA), order: -1 }] }] }, /order is 0 or more/);
  refuses({ windows: [{ ...windowsAt()[0], drawings: [{ ...drawingBy('d1', HANA), round: 0 }] }] }, /round is 1 or more/);
  refuses({ windows: [{ ...windowsAt()[0], drawings: [{ ...drawingBy('d1', HANA), author: { seat: 8 } }] }] }, /author is \{ seat, name \}/);
  refuses({ windows: [{ ...windowsAt()[0], drawings: [{ ...drawingBy('d1', HANA), drawing: { strokes: [stroke(undefined, { color: 'url(#x)' })] } }] }] }, /#rrggbb/);
  refuses({ none: { line: 'No window' } }, /none is \{ title, line \}/);
  refuses({ draft: { windowId: 'A_HOSPITAL', ink: '#000000', strokes: [] } }, /ink is one of #F7D886/);
  refuses({ show: 'yes' }, /show is \{ enabled, busy, reason \}/);
  const d = nextWindowsInput(WINDOWS_DEFAULTS, {});
  assert.deepEqual([d.view, d.windows, d.none, d.draft, d.show.enabled, d.shown], ['windows', [], null, null, false, null], 'nothing to draw or show until Frontend gives it');
  // Drawings in order, then by id; this player's own marked.
  const ordered = nextWindowsInput(WINDOWS_DEFAULTS, { viewer: 4, windows: [{ ...windowsAt()[0], drawings: [drawingBy('b', DEV, 1), drawingBy('c', HANA, 0), drawingBy('a', HANA, 1)] }] });
  assert.deepEqual(ordered.windows[0].drawings.map(x => `${x.id}:${x.own}`), ['c:false', 'a:false', 'b:true']);
  assert.equal(nextWindowsInput(WINDOWS_DEFAULTS, { draft: { windowId: 'A_B', strokes: [] } }).draft.ink, GOLD, 'a draft\'s ink is Gold until chosen');
  const once = live({ none: { title: 'No window here', line: 'The Command Room has no window' } });
  assert.deepEqual(nextWindowsInput(once, {}), once, 'the checked form is stable: an update that gives nothing changes nothing');
  assert.deepEqual(nextWindowsInput(once, { show: { enabled: true, busy: true } }).windows, once.windows, 'and the windows are checked again as they are');
});

test('the drawing just shown is this player\'s own, at their station', () => {
  const shown = (extra = {}) => nextWindowsInput(WINDOWS_DEFAULTS, { viewer: 4, view: 'shown', windows: windowsAt('A2', [drawingBy('d3', DEV, 1)]), shown: 'd3', ...extra });
  assert.equal(shown().shown, 'd3');
  assert.throws(() => shown({ windows: windowsAt(null, [drawingBy('d3', DEV, 1)]) }), /at a station/);
  assert.throws(() => shown({ shown: 'd9' }), /one of the station window's drawings/);
  assert.throws(() => shown({ shown: 'd2' }), /this player's own/);
  assert.throws(() => shown({ viewer: null }), /this player's own/, 'with no viewer, no drawing is this player\'s');
});

test('the draft\'s privacy (decision 4): the windows, the draft and the shown drawing leave with the viewer or when concealed', () => {
  const s = nextWindowsInput(WINDOWS_DEFAULTS, { viewer: 4, view: 'shown', windows: windowsAt('A2', [drawingBy('d3', DEV, 1)]), shown: 'd3', draft: draft() });
  const moved = nextWindowsInput(s, { viewer: 5 });
  assert.deepEqual([moved.windows, moved.draft, moved.shown, moved.view], [[], null, null, 'windows'], 'a new viewer: everything of the last viewer\'s is dropped, and the shown view with it');
  assert.equal(nextWindowsInput(s, { viewer: 5, view: 'shown' }).view, 'windows', 'the shown view leaves with its drawing, even when the update names it');
  assert.equal(windowsSheet({ viewer: 5, view: 'shown', windows: [], draft: null, shown: null }).actions.length, 0, 'and the sheet for a whole input is drawn, not refused');
  assert.throws(() => nextWindowsInput(s, { viewer: 5, view: 'draw' }), /view is windows, shown/, 'an unknown view is still refused');
  const given = nextWindowsInput(s, { viewer: 5, windows: windowsAt() });
  assert.equal(given.windows.length, 2, 'what the same update gives the new viewer is kept');
  assert.equal(given.draft, null);
  assert.equal(nextWindowsInput(s, { viewer: 4 }).draft.strokes.length, 1, 'the same viewer again drops nothing');
  const hidden = nextWindowsInput(s, { status: 'concealed' });
  assert.deepEqual([hidden.windows, hidden.draft, hidden.shown, hidden.view], [[], null, null, 'windows'], 'concealed: dropped');
  assert.deepEqual(nextWindowsInput(hidden, { draft: draft() }).draft, null, 'refused while concealed');
  assert.deepEqual(nextWindowsInput(hidden, { status: 'live' }).windows, [], 'nothing comes back by itself');
  assert.deepEqual(windowsSheet({ ...s, status: 'concealed', view: 'windows', shown: null }).actions, [], 'no footer while concealed');
});

test('the sheet it gives the shell: "Windows", Back, ✕, large; Show the command at a station, Done this phone\'s own', () => {
  const frame = { id: WINDOWS_SHEET_ID, title: 'Windows', back: true, close: true, detent: 'large' };
  assert.deepEqual(windowsSheet(live({ windows: windowsAt() })), { ...frame, actions: [] }, 'the room\'s windows: no footer');
  assert.deepEqual(windowsSheet(live({ windows: [], none: { title: 'No window here', line: 'x' } })), { ...frame, actions: [] });
  assert.deepEqual(windowsSheet(live()), { ...frame, actions: [{ id: 'show', label: 'Show', kind: 'primary', icon: 'show', enabled: true, busy: false, reason: null }] }, 'Show, the command');
  assert.equal(windowsSheet(live({ draft: null })).actions[0].enabled, false, 'off for an empty draft: the form\'s own state');
  assert.equal(windowsSheet(live({ draft: { ...draft(), windowId: 'A_B' } })).actions[0].enabled, false, 'a draft for another window is not this one\'s');
  assert.deepEqual(windowsSheet(live({ show: { enabled: false, reason: 'Not available now' } })).actions[0], { id: 'show', label: 'Show', kind: 'primary', icon: 'show', enabled: false, busy: false, reason: 'Not available now' }, 'Frontend\'s reason, as given');
  assert.equal(windowsSheet(live({ show: { enabled: true, busy: true } })).actions[0].busy, true);
  assert.deepEqual(windowsSheet(live({ view: 'shown', windows: windowsAt('A2', [drawingBy('d3', DEV, 1)]), shown: 'd3' })), { ...frame, actions: [{ id: 'done', label: 'Done', kind: 'secondary', local: true }] }, 'Done, this phone\'s own');
  assert.ok(!JSON.stringify(windowsSheet(live())).includes('points'), 'the draft is never in the sheet\'s frame');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/windows-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 18, 'sheet 34\'s four states, nothing drawn yet, Show in flight, the keyboard\'s pen, reconnecting and the Largest text, at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.deepEqual(c.cut, [], `${key}: every word whole`);
    assert.equal(c.openTab, 'panels', `${key}: the Panels tab open`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/stale`].showWaits, 'Controls return when the match is current', `${size}: reconnecting, Show waits with the banner's words`);
    assert.ok(record.captures[`${size}/keyboard`].pen && !record.captures[`${size}/draw`].pen, `${size}: the pen's mark only while the keyboard draws`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const ids = record.probe.full.checks.map(c => c.id);
  for (const group of ['draw', 'inks', 'undo', 'keyboard', 'limits', 'footer', 'views', 'privacy', 'stroke', 'reconnect', 'focus', 'layout', 'dispose', 'motion']) assert.ok(ids.some(id => id.startsWith(`${group}:`)), `probe group ${group}`);
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 9 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the sheet agrees with the frozen pack\'s windows screen in each state');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
});
