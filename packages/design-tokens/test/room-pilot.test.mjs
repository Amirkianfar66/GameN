// mothership:dev-only
//
// The room pilot (docs/design/room-pilot.md): Room A redrawn to match the approved crew, a
// proposal for the owner. These tests hold what the pilot promises: the scene it redraws is
// today's, unchanged (places, focus, frame); its picture is one well-formed, deterministic SVG of
// the same size, whose ids a second copy on the page never shares; its colours are Room A's
// family as tokens 0.5.0 gives it, the shared ink and paper, the crew's rim light and those
// darkened toward ink, and none outside the family comes near a team's accent; the review
// files are what the tools write; and nothing outside the design review imports it.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { ROOM_A } from '../../../design/board-motion/scenes/room-a.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { INK, shade } from '../../../design/crew-drawing/source/ink.mjs';
import { FAMILY, PAPER, SCENE, SPACE, VIEWBOX, roomAPilotFile, roomAPilotSvg } from '../../../design/room-pilot/room-a.mjs';

const root = new URL('../../../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const text = path => read(path).toString('utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const refs = svg => [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);
const colours = svg => new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()));
const RIM = '#D8E0E8';

test('the pilot redraws Room A as the scene has it: the same places, focus and frame', () => {
  assert.equal(SCENE, ROOM_A);
  assert.deepEqual(SCENE.slots.map(slot => slot.id), ['A1', 'A2', 'A3', 'A4', 'A5']);
  const today = text('design/board-motion/assets/scenes/room-a.back.svg');
  assert.match(today, new RegExp(`viewBox="${VIEWBOX.join(' ')}" width="1024" height="768"`));
  assert.match(roomAPilotSvg(), new RegExp(`^<svg [^>]*viewBox="${VIEWBOX.join(' ')}" width="1024" height="768"`));
});

test('its picture is one well-formed, deterministic SVG; two copies share no id', () => {
  const svg = roomAPilotSvg();
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'one SVG');
  assert.ok(!/NaN|undefined|Infinity/.test(svg), 'every number is a number');
  assert.ok(!/<text[\s>]|<script|<foreignObject|<image/.test(svg), 'no text, script, foreign object or image');
  const all = ids(svg);
  assert.equal(new Set(all).size, all.length, 'an id twice');
  for (const ref of refs(svg)) assert.ok(all.includes(ref), `#${ref} has no target`);
  assert.equal(roomAPilotSvg(), svg, 'drawn twice, the same');
  const other = ids(roomAPilotSvg({ prefix: 'rb' }));
  assert.ok(all.every(id => id.startsWith('ra-')) && other.every(id => id.startsWith('rb-')));
  assert.equal(other.filter(id => all.includes(id)).length, 0);
});

test("its colours: Room A's family (tokens 0.5.0), the shared ink and paper, the crew's rim, and those darkened toward ink", () => {
  const tokens = JSON.parse(text('packages/design-tokens/src/tokens-0.5.0.json'));
  assert.deepEqual({ ...FAMILY }, tokens.color.room.roomA);
  const approved = [...Object.values(FAMILY), ...Object.values(PAPER), INK, SPACE, RIM];
  const darkened = new Set(approved.flatMap(base => Array.from({ length: 99 }, (_, i) => shade(base, (i + 1) / 100))));
  const used = colours(roomAPilotSvg());
  for (const hex of used) assert.ok(approved.includes(hex) || darkened.has(hex), `${hex} is not an approved colour or one darkened toward ink`);
  for (const hex of Object.values(FAMILY)) assert.ok(used.has(hex), `${hex} of the family is used`);
  // The family's own blues are as near a team's accent as today's room is (the tokens record it);
  // every other colour keeps the distance the crew's colours keep.
  for (const hex of used) {
    if (Object.values(FAMILY).includes(hex)) continue;
    const nearest = Math.min(...Object.values(FACTION_ACCENTS).map(accent => cie76(hex, accent)));
    assert.ok(nearest >= MIN_ACCENT_DISTANCE, `${hex} is ${nearest.toFixed(1)} from a team's accent`);
  }
});

test('the review files are what the tools write', () => {
  const file = roomAPilotFile();
  assert.ok(file.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  mothership:dev-only · room pilot'));
  assert.equal(text('design/room-pilot/review/room-a.svg'), file);
  const record = JSON.parse(text('design/room-pilot/review/renders.json'));
  assert.equal(record.tool, 'design/tools/room-pilot-render.mjs');
  assert.deepEqual(Object.keys(record.outputs), ['design/room-pilot/review/compare.png', 'design/room-pilot/review/room-a.png', 'design/room-pilot/review/room-a.svg']);
  for (const [path, output] of Object.entries(record.outputs)) {
    const bytes = read(path);
    assert.equal(output.bytes, bytes.length, path);
    assert.equal(output.sha256, sha(bytes), path);
  }
});

test('the pilot is a design review only: marked dev-only, and nothing in the game imports it', () => {
  for (const path of ['design/room-pilot/room-a.mjs', 'design/room-pilot/review.mjs', 'design/tools/room-pilot-render.mjs']) {
    assert.ok(text(path).startsWith('// mothership:dev-only\n'), path);
  }
  assert.match(text('design/room-pilot/review.html').split('\n')[1], /^<!-- mothership:dev-only\./);
  const walk = dir => readdirSync(new URL(dir, root)).flatMap(name => {
    const path = `${dir}${name}`;
    return statSync(new URL(path, root)).isDirectory() ? walk(`${path}/`) : [path];
  });
  const shipped = ['apps/game/src/', 'apps/game/hosted/', 'packages/presentation/src/', 'design/releases/'].flatMap(walk)
    .filter(path => /\.(?:m?js|ts|tsx|json|html|css|svg)$/.test(path));
  assert.ok(shipped.length > 0);
  for (const path of shipped) assert.ok(!text(path).includes('room-pilot'), `${path} refers to the room pilot`);
});
