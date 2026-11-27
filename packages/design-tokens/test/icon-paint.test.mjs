// The painted form of the icon family (design/phone-ui/components/icon-paint.mjs, phone-ui-icons-1.2.0): the
// owner's bottom bar of 18 November 2026, where every game tab's icon is a painted tile like the character's
// portrait and the round button's icon is painted.
//
// What is checked here, without a browser: the tile's frame is the crew portrait's own; every icon paints, as a
// decorative drawing that carries its own ids and nothing a strict page would refuse; a tile's ground is one
// fixed colour and its paints are the two named ones; and the painted shapes live in the one source.
// How the tiles sit in the bar is the phone shell's check (design/tools/phone-shell-check.mjs, probe `tiles`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS, ICON_FAMILY_VERSION, ICON_NAMES, ICON_PAINTED, iconSvg } from '../../../design/phone-ui/components/icons.mjs';
import { ICON_PAINTS, TILE, TILE_FRAME_PATH, iconPaintedSvg, iconTileSvg } from '../../../design/phone-ui/components/icon-paint.mjs';
import { PORTRAIT } from '../../../design/crew-drawing/source/portrait.mjs';
import { pathOfPoly, squircle } from '../../../design/crew-drawing/source/ink.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const read = path => readFileSync(join(REPO, path), 'utf8');
const PAINT = 'design/phone-ui/components/icon-paint.mjs';
/** The game's tab bar and round button: the icons the shell paints. */
const PAINTED_IN_THE_BAR = ['board', 'room', 'actions', 'panels', 'card', 'pass', 'vote'];
/** Every colour a painted drawing may hold: the tile's ground, its rim and shadow, and the two paints. */
const GROUND = ['#F19E5A', '#EE8B3A', '#82522F', '#AD6933'];
const FRAME = ['#FFFFFF', '#151923'];
const CREAM = ['#FFF6E0', '#F8DFAE', '#E6AE66', '#4A2913'];
const EMBER = ['#F9BE6C', '#EC8A36', '#C5601B', '#52290F'];
const colours = svg => [...new Set(svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? [])];

test('the family is phone-ui-icons-1.2.0: the painted forms are added and no icon is changed', () => {
  assert.equal(ICON_FAMILY_VERSION, 'phone-ui-icons-1.2.0');
  assert.equal(ICON_NAMES.length, 79, 'the same 79 icons');
  // The pinned pack holds the family as it was; an icon drawn differently there would be an icon changed here.
  const pack = read('design/phone-ui/prototype/icons.mjs');
  for (const name of PAINTED_IN_THE_BAR) {
    for (const part of ICONS[name].parts) if (part.d) assert.ok(pack.includes(`'${part.d}'`), `${name}: its line drawing is the pack's`);
  }
  assert.deepEqual(ICON_PAINTS, ['cream', 'ember']);
});

test('the tile\'s frame is the crew portrait\'s own: the same box, half-size and path', () => {
  assert.deepEqual(TILE.box, PORTRAIT.box, 'the portrait\'s box');
  assert.equal(TILE.half, PORTRAIT.half, 'the portrait\'s half-size');
  assert.equal(TILE_FRAME_PATH, pathOfPoly(squircle(0, 0, PORTRAIT.half)), 'the path the crew drawing builds from its own numbers');
  // And the path as shipped in a portrait, so the tile and the picture beside it have one outline.
  for (const id of ['c1', 'c5', 'c9']) {
    const svg = read(`design/crew-drawing/assets/portraits/portrait-${id}.svg`);
    assert.match(svg, /viewBox="-64 -64 128 128"/, `${id}: the box`);
    assert.ok(svg.includes(`<clipPath id="crew-${id}-portrait-frame2"><path d="${TILE_FRAME_PATH}"/></clipPath>`), `${id}: its frame is the tile's`);
    // The rim, the shadow and the vignette, by the same numbers.
    assert.ok(svg.includes(`<path d="${TILE_FRAME_PATH}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${TILE.rim}" stroke-linejoin="round"/>`), `${id}: the white rim`);
    assert.ok(svg.includes(`<path d="${TILE_FRAME_PATH}" transform="translate(1.6 3.2) scale(1.02)" fill="#151923" opacity="0.2"/>`), `${id}: the shadow`);
  }
  const tile = iconTileSvg('board', { id: 't' });
  assert.ok(tile.includes(`<path d="${TILE_FRAME_PATH}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round"/>`), 'the tile\'s rim');
  assert.ok(tile.includes(`<path d="${TILE_FRAME_PATH}" transform="translate(1.6 3.2) scale(1.02)" fill="#151923" opacity="0.2"/>`), 'the tile\'s shadow');
  assert.ok(tile.includes(`<path d="${TILE_FRAME_PATH}" fill="none" stroke="#151923" stroke-width="20" opacity="0.14"/>`), 'the tile\'s vignette');
  assert.match(tile, /viewBox="-64 -64 128 128"/);
});

test('every icon paints, as a decorative drawing a strict page accepts, with its own ids', () => {
  for (const name of ICON_NAMES) {
    for (const [what, svg] of [['tile', iconTileSvg(name, { id: 'x' })], ['painted', iconPaintedSvg(name, { id: 'x' })], ['painted in cream', iconPaintedSvg(name, { id: 'x', paint: 'cream' })], ['painted open', iconPaintedSvg(name, { id: 'x', open: true })]]) {
      const where = `${name}, ${what}`;
      assert.match(svg, /^<svg class="[a-z-]+" aria-hidden="true" focusable="false" xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+">/, `${where}: decorative, sized by its holder`);
      assert.match(svg, /<\/svg>$/, where);
      // The hosted game's policy: style-src 'self' and no script. A drawing carries neither, and reaches for nothing.
      assert.doesNotMatch(svg, /\sstyle=|<style|<script|\son[a-z]+=|href=|<image|<foreignObject|url\((?!#)/i, `${where}: no inline style, script, link or outside picture`);
      const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
      assert.ok(ids.length >= 1 && new Set(ids).size === ids.length && ids.every(id => id.startsWith('x-')), `${where}: its own ids`);
      for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref[1]), `${where}: ${ref[1]} is its own`);
    }
    assert.equal(iconTileSvg(name, { id: 'x' }), iconTileSvg(name, { id: 'x' }), `${name}: the same drawing each time`);
  }
  // Without an id each drawing takes a new one, so two in a page never share a gradient or a clip.
  const a = iconTileSvg('board'), b = iconTileSvg('board');
  assert.notEqual(a, b);
  assert.equal(a.replace(/ms-icp-\d+/g, 'id'), b.replace(/ms-icp-\d+/g, 'id'), 'the same drawing but for its ids');
  assert.throws(() => iconTileSvg('nothing'), /No icon "nothing"/);
  assert.throws(() => iconTileSvg('board', { paint: 'red' }), /No paint "red"/);
  assert.throws(() => iconPaintedSvg('pass', { paint: 'red' }), /No paint "red"/);
});

test('a tile\'s ground is one fixed colour and takes none from its caller; the paints are cream and ember', () => {
  // The function takes an icon, a class, an id and a paint: no colour, seat, character, role or team.
  assert.match(read(PAINT), /export function iconTileSvg\(name, \{ className = 'ic-tile', id = nextId\(\), paint = 'cream' \} = \{\}\)/);
  assert.match(read(PAINT), /export function iconPaintedSvg\(name, \{ className = 'ic-paint', id = nextId\(\), paint = 'ember', open = false \} = \{\}\)/);
  for (const name of ICON_NAMES) {
    const tile = iconTileSvg(name, { id: 'x' });
    assert.ok(GROUND.slice(0, 3).every(c => tile.includes(`stop-color="${c}"`)), `${name}: the one ground`);
    for (const c of colours(tile)) assert.ok([...GROUND, ...FRAME, ...CREAM].includes(c), `${name}: ${c} is the tile's ground, its frame or its cream`);
    for (const c of colours(iconPaintedSvg(name, { id: 'x' }))) assert.ok(EMBER.includes(c), `${name}: ${c} is ember`);
    for (const c of colours(iconPaintedSvg(name, { id: 'x', open: true }))) assert.ok(EMBER.includes(c), `${name}, open: ${c} is ember`);
  }
  // Nothing in the source reads a token or the page's colour: a painted icon is the same on every ground and phone.
  assert.doesNotMatch(read(PAINT), /currentColor|var\(--/);
});

// 1.2.0, the panels' icons. The owner, 19 November 2026: "I like painted icons but I dont want them to have any
// background"; on draft 2, "Still they  have a background"; on draft 3, "No background now, go ahead".
test('the open form paints the line drawing itself: nothing is filled but a dot, so no icon is a plate', () => {
  for (const name of ICON_NAMES) {
    const open = iconPaintedSvg(name, { id: 'x', open: true });
    for (const path of open.matchAll(/<path [^>]*>/g)) assert.match(path[0], / fill="none" /, `${name}: a line is painted, never an area`);
    // Every part of the family's line drawing is there, the ones the filled form knocks out included.
    for (const part of ICONS[name].parts) if (part.d) assert.ok(open.includes(` d="${part.d}"`), `${name}: ${part.d.slice(0, 16)} is drawn`);
    const dots = ICONS[name].parts.filter(part => part.c && part.dot).length, rings = ICONS[name].parts.filter(part => part.c && !part.dot).length;
    assert.equal([...open.matchAll(/<circle [^>]*fill="(?!none)[^"]+"/g)].length, dots * 3, `${name}: only its dots are filled (shadow, line and paint)`);
    assert.equal([...open.matchAll(/<circle [^>]*fill="none"/g)].length, rings * 3, `${name}: its rings are lines`);
  }
  // The round button's painted form is as it was: `open` is asked for, never the default.
  assert.notEqual(iconPaintedSvg('code', { id: 'x' }), iconPaintedSvg('code', { id: 'x', open: true }));
  assert.match(iconPaintedSvg('code', { id: 'x' }), /<path [^>]*fill="url\(#x-paint\)"/);
});

test('the painted shapes live in the one source; icon-paint.mjs draws no icon of its own and is a runtime source', () => {
  const source = read(PAINT);
  assert.doesNotMatch(source, /mothership:dev-only/, 'a runtime source');
  assert.deepEqual([...source.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]), ['./icons.mjs'], 'it imports the family and nothing else');
  // No path of an icon is written in it: the frame is computed, the bands are computed, the shapes are the family's.
  assert.deepEqual(source.split('\n').filter(line => /['"`]M\d[\d. ]*[A-Za-z]/.test(line) && !/\$\{/.test(line)), [], 'no path string of its own');
  for (const [name, shapes] of Object.entries(ICON_PAINTED)) {
    assert.ok(ICON_NAMES.includes(name), `${name} is an icon of the family`);
    assert.ok(shapes.length >= 2, `${name}: stacked shapes`);
    for (const shape of shapes) {
      assert.match(shape.d, /^M[\d. ]+z$/, `${name}: a closed shape on the 24 grid`);
      assert.ok(['light', 'main', 'deep'].includes(shape.tone), `${name}: ${shape.tone}`);
      assert.deepEqual(Object.keys(shape).sort(), ['d', 'tone']);
    }
    // The same silhouette: the family's own filled part is one of the painted shapes, and it is drawn last, on top.
    const filled = ICONS[name].parts.find(part => part.fill && part.d);
    assert.equal(shapes.at(-1).d, filled.d, `${name}: its top shape is the icon's own filled part`);
    assert.ok(iconSvg(name, { filled: true }).includes(`d="${filled.d}"`));
    for (const shape of shapes) assert.ok(iconTileSvg(name, { id: 'x' }).includes(`d="${shape.d}"`), `${name}: the tile draws it`);
  }
  assert.deepEqual(Object.keys(ICON_PAINTED), ['panels'], 'Panels is the one icon painted by hand');
});
