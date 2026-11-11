// mothership:dev-only
//
// The room pilot (docs/design/room-pilot.md): the five rooms redrawn to match the approved crew,
// Room A by hand and the other four shape for shape from today's pictures, a proposal for the
// owner. These tests hold what the pilot promises:
//  - each room redraws the scene the board shows, unchanged: the four reviewed scenes as they are,
//    and the Hospital's four-berth ward as the runtime port draws it;
//  - every shape of today's pictures is drawn again (a pool or a cone of light as a pool or a
//    shaft), and each picture is one well-formed, deterministic SVG whose ids no other shares;
//  - Room A's frame is drawn behind its props;
//  - the colours are each room's family as tokens 0.5.0 gives it, the shared ink and paper, the
//    crew's rim and those darkened toward ink; outside the family none comes near a team's accent;
//    and every room is printed about as dark as Room A;
//  - the review files are what the tools write, and nothing in the game's code refers to it.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { SCENES } from '../../../design/board-motion/scenes/index.mjs';
import { BOARD_ROOMS } from '../../../design/board-v2/scenes/slots.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { INK, shade } from '../../../design/crew-drawing/source/ink.mjs';
import { PAPER, REFERENCE, SPACE, inkRoomSvg, luminance, matchedTone } from '../../../design/room-pilot/ink-room.mjs';
import { FAMILY, roomAPilotSvg } from '../../../design/room-pilot/room-a.mjs';
import { FAMILIES, REVIEW, ROOMS, redrawRoom } from '../../../design/room-pilot/rooms.mjs';
import { WARD_FOUR } from '../../../design/room-pilot/ward-four.mjs';
import { FOUR_ROSTERS, wardFourScene } from '../../../apps/game/hosted/board-v2-drawing/hospital-ward-four.mjs';

const root = new URL('../../../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const text = path => read(path).toString('utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const refs = svg => [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);
const colours = svg => new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()));
const RIM = '#D8E0E8';
const drawn = new Map(ROOMS.map(r => [r.id, redrawRoom(r, text)]));
const pictures = r => [['back', drawn.get(r.id).back], ...Object.entries(drawn.get(r.id).layers)];

test('each room redraws the scene the board shows, its places, focus, frame and layers unchanged', () => {
  assert.deepEqual(ROOMS.map(r => r.id), BOARD_ROOMS);
  for (const r of ROOMS.filter(r => r.id !== 'hospital')) assert.equal(r.scene, SCENES[r.id], r.id);
  // The Hospital the board shows today is the four-berth ward: its places and layers as the runtime port has them.
  for (const roster of FOUR_ROSTERS) {
    const runtime = wardFourScene(roster);
    assert.deepEqual(WARD_FOUR.slots.map(({ about, ...slot }) => slot), runtime.slots.map(({ about, rosters, ...slot }) => slot));
    assert.deepEqual(Object.fromEntries(Object.entries(WARD_FOUR.layers).map(([id, layer]) => [id, layer.depth])), Object.fromEntries(Object.entries(runtime.layers).map(([id, layer]) => [id, layer.depth])));
    assert.deepEqual([WARD_FOUR.inner, WARD_FOUR.focus], [runtime.inner, runtime.focus]);
  }
  for (const r of ROOMS) {
    assert.deepEqual(Object.keys(r.today.layers), Object.keys(r.scene.layers ?? {}), r.id);
    assert.deepEqual(Object.keys(r.cast), r.scene.slots.map(slot => slot.id), r.id);
  }
  // The ward's pictures, from its release snapshot, are the runtime's, header aside.
  const hospital = ROOMS.find(r => r.id === 'hospital');
  for (const path of [hospital.today.back, ...Object.values(hospital.today.layers)]) {
    const snapshot = text(path), runtime = text(`apps/game/hosted/board-v2-film-art/scenes/${path.split('/').at(-1)}`);
    assert.equal(snapshot.slice(snapshot.indexOf('<svg')), runtime.slice(runtime.indexOf('<svg')), path);
  }
});

test('every shape of today\'s pictures is drawn again: a pool as a pool, a cone of light as a shaft', () => {
  const expected = { 'command-room': [1, 1], 'room-b': [2, 2], hospital: [1, 2], jail: [1, 1] };
  for (const r of ROOMS.filter(r => r.id !== 'room-a')) {
    for (const [name, path] of [['back', r.today.back], ...Object.entries(r.today.layers)]) {
      const stats = {};
      inkRoomSvg(text(path), r.family, { prefix: 'x', layer: name !== 'back', stats });
      assert.equal(stats.empty, 0, `${r.id} ${name}`);
      assert.equal(stats.shape + stats.pool + stats.shaft + stats.rim, stats.source, `${r.id} ${name}`);
      // Each pool's dotted rim is left out because the pool is drawn whole.
      assert.equal(stats.rim, stats.pool, `${r.id} ${name}`);
      assert.deepEqual([stats.pool, stats.shaft], name === 'back' ? expected[r.id] : [0, 0], `${r.id} ${name}`);
    }
  }
});

test('every picture is one well-formed, deterministic SVG of the scene\'s size; no two share an id', () => {
  const seen = new Set();
  for (const r of ROOMS) {
    const again = redrawRoom(r, text);
    for (const [name, svg] of pictures(r)) {
      const label = `${r.id} ${name}`;
      assert.match(svg, /^<svg [^>]*viewBox="0 0 1024 768" width="1024" height="768"/, label);
      assert.ok(svg.endsWith('</svg>'), label);
      assert.ok(!/NaN|undefined|Infinity/.test(svg), `${label}: every number is a number`);
      assert.ok(!/<text[\s>]|<script|<foreignObject|<image/.test(svg), `${label}: no text, script, foreign object or image`);
      const all = ids(svg);
      assert.equal(new Set(all).size, all.length, `${label}: an id twice`);
      for (const ref of refs(svg)) assert.ok(all.includes(ref), `${label}: #${ref} has no target`);
      for (const id of all) { assert.ok(!seen.has(id), `${label}: ${id} is another picture's`); seen.add(id); }
      assert.equal(name === 'back' ? again.back : again.layers[name], svg, `${label}: drawn twice, the same`);
    }
  }
});

test("Room A's frame is drawn behind its props, so no edge crosses a crate or the canister", () => {
  const svg = roomAPilotSvg();
  const frame = svg.indexOf('d="M120 70 H904 V372 H120 Z"');
  assert.ok(frame > 0);
  assert.ok(frame < svg.indexOf('<ellipse cx="842" cy="412"'), 'the frame before the canister');
  assert.ok(frame < svg.indexOf('points="242,414 258,398 306,406 288,428 150,428 150,414"'), 'the frame before the crates');
});

test("the colours: each room's family (tokens 0.5.0), ink, paper, the crew's rim, those darkened toward ink; as dark as Room A", () => {
  const tokens = JSON.parse(text('packages/design-tokens/src/tokens-0.5.0.json')).color.room;
  assert.deepEqual({ ...FAMILY }, tokens.roomA);
  assert.deepEqual({ ...REFERENCE }, tokens.roomA);
  for (const r of ROOMS) {
    assert.deepEqual({ ...FAMILIES[r.id] }, tokens[r.token], r.id);
    const family = Object.values(r.family);
    const approved = [...family, ...Object.values(PAPER), INK, SPACE, RIM];
    const darkened = new Set(approved.flatMap(base => Array.from({ length: 99 }, (_, i) => shade(base, (i + 1) / 100))));
    for (const [name, svg] of pictures(r)) {
      for (const hex of colours(svg)) {
        assert.ok(approved.includes(hex) || darkened.has(hex), `${r.id} ${name}: ${hex} is not an approved colour or one darkened toward ink`);
        if (family.includes(hex)) continue;
        // The family's own tones are as near a team's accent as today's room is (the tokens record
        // it); every other colour keeps the distance the crew's colours keep.
        const nearest = Math.min(...Object.values(FACTION_ACCENTS).map(accent => cie76(hex, accent)));
        assert.ok(nearest >= MIN_ACCENT_DISTANCE, `${r.id} ${name}: ${hex} is ${nearest.toFixed(1)} from a team's accent`);
      }
    }
    // The deck and the back wall as dark as Room A's: within a factor of two of its lightness.
    for (const name of ['shadow', 'mid', 'light']) {
      const ratio = luminance(matchedTone(r.family, name)) / luminance(REFERENCE[name]);
      assert.ok(ratio > 0.5 && ratio < 2, `${r.id}: ${name} is ${ratio.toFixed(2)} times Room A's lightness`);
    }
  }
  // Room A keeps its own tones: it is the reference.
  for (const name of ['deep', 'shadow', 'mid', 'light', 'pale']) assert.equal(matchedTone(FAMILY, name), FAMILY[name]);
});

test('the review files are what the tools write', () => {
  const record = JSON.parse(text(`${REVIEW}/renders.json`));
  assert.equal(record.tool, 'design/tools/room-pilot-render.mjs');
  const expected = [];
  for (const r of ROOMS) {
    const files = redrawRoom(r, text, { file: true });
    assert.ok(files.back.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  mothership:dev-only · room pilot'));
    assert.equal(text(r.redrawn.back), files.back, r.redrawn.back);
    for (const [layer, svg] of Object.entries(files.layers)) assert.equal(text(r.redrawn.layers[layer]), svg, r.redrawn.layers[layer]);
    expected.push(r.redrawn.back, ...Object.values(r.redrawn.layers), `${REVIEW}/compare-${r.id}.png`);
  }
  expected.push(`${REVIEW}/board.png`);
  assert.deepEqual(Object.keys(record.outputs), expected.sort());
  for (const [path, output] of Object.entries(record.outputs)) {
    const bytes = read(path);
    assert.equal(output.bytes, bytes.length, path);
    assert.equal(output.sha256, sha(bytes), path);
  }
  assert.deepEqual(readdirSync(new URL(`${REVIEW}/`, root)).sort(), [...expected.map(path => path.split('/').at(-1)), 'renders.json'].sort());
});

test('the pilot is development code: marked dev-only, and nothing in the game\'s code refers to it', () => {
  for (const path of ['design/room-pilot/room-a.mjs', 'design/room-pilot/ink-room.mjs', 'design/room-pilot/rooms.mjs', 'design/room-pilot/ward-four.mjs', 'design/room-pilot/night.mjs', 'design/room-pilot/trim.mjs', 'design/room-pilot/review.mjs', 'design/tools/room-pilot-render.mjs']) {
    assert.ok(text(path).startsWith('// mothership:dev-only\n'), path);
  }
  assert.match(text('design/room-pilot/review.html').split('\n')[1], /^<!-- mothership:dev-only\./);
  const walk = dir => readdirSync(new URL(dir, root)).flatMap(name => {
    const path = `${dir}${name}`;
    return statSync(new URL(path, root)).isDirectory() ? walk(`${path}/`) : [path];
  });
  // The game's code; a release record may name the pilot's files as the sources of its pictures.
  const shipped = ['apps/game/src/', 'apps/game/hosted/', 'packages/presentation/src/'].flatMap(walk)
    .filter(path => /\.(?:m?js|ts|tsx|json|html|css|svg)$/.test(path));
  assert.ok(shipped.length > 0);
  for (const path of shipped) assert.ok(!text(path).includes('room-pilot'), `${path} refers to the room pilot`);
});
