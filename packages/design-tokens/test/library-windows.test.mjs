// mothership:dev-only
//
// Library group 5 (design/library/windows/; docs/design/library/windows.md): the three windows,
// the four drawing stations, the pad and the feed. These test the proposal's own modules: the
// state maps from a player view, the drawing renderer's limits, the words, the art's palette and
// the generated assets, and the motion. None of them is a rule or a server answer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { INKS, LINTEL_FILES, W, WINDOW_ART_VERSION, drawingPaths, drawingSvg, windowAssets } from '../../../design/library/windows/art.mjs';
import { WINDOW_COPY } from '../../../design/library/windows/copy.mjs';
import { FRAMES, MOTION, motionEnd } from '../../../design/library/windows/motion.mjs';
import { ENDPOINTS, LIMITS, STATIONS, budget, darkChange, drawingValid, newDrawings, otherEnd, padState, windowsFor } from '../../../design/library/windows/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

const dot = (x = 0.5, y = 0.5) => ({ color: '#151923', width: 7, points: [[x, y]] });
const d = (id, windowId, author, order, round = 4) => ({ id, windowId, authorSeatId: author, round, order, drawing: { strokes: [dot()] } });
function view({ location = 'Room A', slotId = 'A1', phase = 'ORDINARY_TURN', round = 4, windows = null, show = null }) {
  const ws = windows ?? Object.keys(ENDPOINTS).filter(id => ENDPOINTS[id].includes(location)).map(id => ({ windowId: id, canDraw: STATIONS[slotId] === id, drawings: [] }));
  const showable = show ?? ws.filter(w => w.canDraw).map(w => w.windowId);
  return { round, phase: { id: `r${round}-${phase}`, kind: phase }, self: { seatId: 2 }, board: { seats: [{ seatId: 2, location, slotId }] }, windows: ws, offers: showable.length ? [{ type: 'SHOW_WINDOW', targetSeatIds: [], slotIds: [], windowIds: showable }] : [] };
}

test('three windows, two ends each, never transitive; four stations, none in the Hospital or the Jail', () => {
  assert.deepEqual(Object.keys(ENDPOINTS), ['A_B', 'A_HOSPITAL', 'B_JAIL']);
  assert.deepEqual(STATIONS, { A1: 'A_B', B1: 'A_B', A2: 'A_HOSPITAL', B2: 'B_JAIL' });
  assert.equal(otherEnd('A_B', 'Room A'), 'Room B'); assert.equal(otherEnd('A_B', 'Room B'), 'Room A');
  assert.equal(otherEnd('A_HOSPITAL', 'Hospital'), 'Room A'); assert.equal(otherEnd('B_JAIL', 'Jail'), 'Room B');
  assert.equal(otherEnd('A_HOSPITAL', 'Room B'), null, 'no window from Room B to the Hospital');
  assert.equal(otherEnd('B_JAIL', 'Hospital'), null, 'no window between the Hospital and the Jail');
  for (const slot of ['H1', 'H2', 'J1', 'J5', 'C1', 'A3', 'B5']) assert.equal(STATIONS[slot], undefined, slot);
  const a1 = windowsFor(view({}));
  assert.deepEqual(a1.map(w => [w.windowId, w.facing, w.station, w.canShow]), [['A_B', 'Room B', true, true], ['A_HOSPITAL', 'Hospital', false, false]]);
  const jail = windowsFor(view({ location: 'Jail', slotId: 'J1' }));
  assert.deepEqual(jail.map(w => [w.windowId, w.facing, w.station]), [['B_JAIL', 'Room B', false]]);
});

test('the pad: only at the station; Show only with the offer; nothing sent until Show; the Blackout darkens everything', () => {
  const v = view({});
  const local = { strokes: [dot(), dot(0.2, 0.2)] };
  assert.equal(padState(v, 'A_HOSPITAL').state, 'view-only');
  assert.equal(padState(v, 'B_JAIL').state, 'none');
  assert.equal(padState(v, 'A_B').state, 'blank');
  assert.equal(padState(v, 'A_B', { local }).state, 'drawing');
  assert.equal(padState(v, 'A_B', { local, reviewing: true }).state, 'review');
  assert.equal(padState(view({ show: [] }), 'A_B', { local, reviewing: true }).state, 'closed', 'no offer, no review');
  assert.equal(padState(v, 'A_B', { local, pending: 'SHOW_WINDOW:A_B' }).state, 'sending');
  assert.equal(padState(v, 'A_B', { accepted: { A_B: 'r4-ORDINARY_TURN' } }).state, 'shown');
  assert.equal(padState(v, 'A_B', { local, rejected: { A_B: { phaseId: 'r4-ORDINARY_TURN', code: 'NOT_ALLOWED' } } }).state, 'refused');
  assert.equal(padState(v, 'A_B', { local, rejected: { A_B: { phaseId: 'r3-ORDINARY_TURN', code: 'NOT_ALLOWED' } } }).state, 'drawing', 'a refusal from another phase');
  for (const id of ['A_B', 'A_HOSPITAL']) assert.equal(padState(view({ phase: 'BLACKOUT' }), id, { local, reviewing: true }).state, 'dark');
  // An invalid local drawing never reaches review.
  assert.equal(padState(v, 'A_B', { local: { strokes: [{ color: 'red', width: 7, points: [[0.5, 0.5]] }] }, reviewing: true }).state, 'drawing');
});

test('the budget and validity mirror PlanetDrawingSchema exactly', () => {
  const full = { strokes: Array.from({ length: 8 }, () => ({ color: '#151923', width: 3, points: Array.from({ length: 512 }, (_, i) => [i / 511, 0.5]) })) };
  assert.equal(budget(full).points, LIMITS.points); assert.equal(budget(full).full, true);
  assert.equal(drawingValid(full), true);
  assert.equal(drawingValid({ strokes: [...full.strokes, dot()] }), false, '4,097 points');
  assert.equal(drawingValid({ strokes: Array.from({ length: 129 }, () => dot()) }), false, '129 strokes');
  assert.equal(drawingValid({ strokes: [{ color: '#151923', width: 3, points: Array.from({ length: 513 }, () => [0.5, 0.5]) }] }), false, '513 points in a stroke');
  for (const bad of [{ color: '#15192', width: 7 }, { color: 'url(x)', width: 7 }, { color: '#151923', width: 0.5 }, { color: '#151923', width: 25 }]) assert.equal(drawingValid({ strokes: [{ ...bad, points: [[0.5, 0.5]] }] }), false, JSON.stringify(bad));
  assert.equal(drawingValid({ strokes: [{ color: '#151923', width: 7, points: [[1.2, 0.5]] }] }), false);
  assert.equal(drawingValid({ strokes: [] }), false, 'an empty drawing is not shown');
});

test('the renderer emits numbers and a checked colour only: no markup, script or link can pass through', () => {
  const hostile = { strokes: [
    { color: '#FF0000"/><script>alert(1)</script>', width: 7, points: [[0.1, 0.1], [0.9, 0.9]] },
    { color: 'javascript:alert(1)', width: 7, points: [[0.5, 0.5]] },
    { color: '#151923', width: '7" onload="x', points: [[0.5, 0.5]] },
    { color: '#151923', width: 7, points: [[0.5, '0.5"/><a href="https://x">'], [NaN, 0.2], [Infinity, 0.3]] },
    { color: '#5fe0e8', width: 7, points: [[-1, 2], [0.5, 0.5]] },
  ] };
  const paths = drawingPaths(hostile);
  assert.equal(paths.length, 1, 'only the valid stroke survives');
  assert.equal(paths[0].color, '#5FE0E8');
  assert.match(paths[0].d, /^M0\.0 240\.0 L160\.0 120\.0$/, 'points clamped to the box');
  const svg = drawingSvg(hostile);
  assert.doesNotMatch(svg, /script|href|onload|javascript|alert/i);
  assert.equal(drawingPaths({ strokes: [dot()] })[0].d, 'M160.0 120.0 L160.0 120.0', 'a single point is a dot');
});

test('changes: a drawing stamps in on first sight only (R7); the shade moves only when the darkness starts or ends', () => {
  const before = view({ windows: [{ windowId: 'A_B', canDraw: true, drawings: [d('x1', 'A_B', 6, 1)] }] });
  const after = view({ windows: [{ windowId: 'A_B', canDraw: true, drawings: [d('x1', 'A_B', 6, 1), d('x2', 'A_B', 2, 2)] }] });
  assert.deepEqual(newDrawings(null, after), [], 'a reconnect draws everything at rest');
  assert.deepEqual(newDrawings(before, after), ['x2']);
  assert.deepEqual(newDrawings(after, after), []);
  // The feed is in shown order, whatever order the view lists it.
  const shuffled = view({ windows: [{ windowId: 'A_B', canDraw: false, drawings: [d('y3', 'A_B', 2, 3), d('y1', 'A_B', 6, 1), d('y2', 'A_B', 2, 2)] }] });
  assert.deepEqual(windowsFor(shuffled)[0].drawings.map(x => x.id), ['y1', 'y2', 'y3']);
  assert.equal(darkChange(view({}), view({ phase: 'BLACKOUT' })), 'dark');
  assert.equal(darkChange(view({ phase: 'BLACKOUT' }), view({})), 'light');
  assert.equal(darkChange(null, view({ phase: 'BLACKOUT' })), null);
});

test('the words: claims, never facts or views; no text channel; the Show warning names both rooms and no erasing', () => {
  const texts = Object.values(WINDOW_COPY).flatMap(v => (typeof v === 'function' ? [v('Room B', 'Room A and Room B'), v(4)] : typeof v === 'object' ? Object.values(v) : [v])).filter(x => typeof x === 'string');
  for (const text of texts) {
    assert.doesNotMatch(text, /\b(proof|evidence|verified|true|fact)\b/i, text);
    assert.doesNotMatch(text, /\b(see (into|inside)|watch|camera|live|type|message|chat)\b/i, text);
  }
  assert.match(WINDOW_COPY.claims, /claims/);
  assert.match(WINDOW_COPY.review('Room B', 'Room A and Room B'), /Room A and Room B.*cannot be erased or replaced/);
  assert.match(WINDOW_COPY.dark, /Blackout/);
});

test('the art: one palette off every faction accent, the pad\'s inks included; three distinct lintels; no words or links', () => {
  const assets = windowAssets();
  const palette = new Set(Object.values(W).map(c => c.toUpperCase()));
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 30 && about.endsWith('.'), name);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      assert.ok(palette.has(hex.toUpperCase()), `${name}: ${hex} is not the palette's`);
      for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${hex} near ${faction}`);
    }
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
  }
  for (const ink of INKS) for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(ink, accent) >= MIN_ACCENT_DISTANCE, `ink ${ink} near ${faction}`);
  for (const ink of INKS) assert.ok(WINDOW_COPY.colours[ink], `ink ${ink} has a name`);
  const body = name => assets[name].svg.replace(/<!--[\s\S]*?-->/, '');
  assert.equal(new Set(Object.values(LINTEL_FILES).map(body)).size, 3);
  assert.equal(Object.keys(assets).length, 7);
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build('windows');
  for (const [name, text] of Object.entries(files)) assert.equal(await readFile(new URL(`../../../design/library/windows/assets/${name}`, import.meta.url), 'utf8'), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, WINDOW_ART_VERSION);
  assert.equal(manifest.assets.length, 7);
});

test('the motion: once, bounded; reduced is fades only', () => {
  for (const kind of Object.keys(FRAMES)) {
    assert.ok(MOTION[kind].end <= 900, kind);
    assert.equal(FRAMES[kind](motionEnd(kind), {}).done, true, kind);
    for (let t = 0; t <= motionEnd(kind, true); t += 10) {
      const f = FRAMES[kind](t, { reduced: true });
      assert.equal(f.reduced, true);
      if (f.ghost) { assert.equal(f.ghost.lift, 0); assert.equal(f.ghost.scale, 1); }
      if (f.landed) assert.equal(f.landed.drop, 1);
      if (f.image) assert.equal(f.image.drop, 1);
      if (f.shade) assert.equal(f.shade.cover, 1);
      if (f.stamp) assert.equal(f.stamp.scale, 1);
    }
  }
  assert.equal(FRAMES.dark(MOTION.dark.end).shade.cover, 1);
  assert.equal(FRAMES.light(MOTION.light.end).shade.cover, 0);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await readFile(new URL('../../../design/library/windows/review/report.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(`../../../${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});
