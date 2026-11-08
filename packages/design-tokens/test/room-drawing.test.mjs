// mothership:dev-only
//
// The room drawing release (DSN-REQ-18, docs/design/room-drawing-release.md): the five rooms the
// owner approved, packaged for Integration. These tests hold what the handoff promises:
//  - the exports, their manifest and the release record are exactly what the tool writes;
//  - every room has its back, each of its layers and its lights-out picture, each replacing the
//    picture and property the board reads today, and nothing else is replaced;
//  - every export is a static SVG of the scene's box;
//  - the trim changes nothing but the ink's path data, and keeps every outline within its tolerance;
//  - the lights-out pictures follow the reviewed night rule, with the room's light taken away;
//  - the review record covers every export, and the release stays within its size.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { NIGHT, nightFill, nightSpace } from '../../../design/board-v2/scenes/lighting.mjs';
import { pathShapes } from '../../../design/room-pilot/ink-room.mjs';
import { ROOMS } from '../../../design/room-pilot/rooms.mjs';
import { TOLERANCE } from '../../../design/room-pilot/trim.mjs';
import { OUT, RELEASE, build, manifestOf, releaseCandidate } from '../../../design/tools/room-drawing-export.mjs';

const root = new URL('../../../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const text = path => read(path).toString('utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const refs = svg => [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);
const colours = svg => new Set([...svg.matchAll(/(?:fill|stroke|stop-color)="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1].toUpperCase()));
const exports = build();
const manifestText = `${JSON.stringify(manifestOf(exports), null, 2)}\n`;
const byPath = new Map(exports.map(item => [item.path, item]));

test('the exports, their manifest and the release record are exactly what the tool writes', () => {
  for (const item of exports) assert.equal(text(item.path), item.content, item.path);
  assert.equal(text(`${OUT}/assets/manifest.json`), manifestText);
  assert.equal(text(`${OUT}/release-candidate.json`), `${JSON.stringify(releaseCandidate(exports, manifestText), null, 2)}\n`);
  assert.deepEqual(readdirSync(new URL(`${OUT}/assets/`, root)).sort(), [...exports.map(item => item.path.split('/').at(-1)), 'manifest.json'].sort());
  const record = JSON.parse(text(`${OUT}/release-candidate.json`));
  assert.equal(record.release, RELEASE);
  assert.equal(record.assets.manifestSha256, sha(manifestText));
  for (const { path, sha256 } of [...record.sources, ...record.dependencies, ...record.inputs]) assert.equal(sha(read(path)), sha256, path);
});

test('every room has its back, its layers and its lights-out picture, each replacing what the board reads today', () => {
  assert.equal(exports.length, 18);
  for (const r of ROOMS) {
    const mine = exports.filter(item => item.entry.room === r.id).map(item => item.entry);
    assert.deepEqual(mine.map(entry => entry.layer).sort(), ['back', 'dark', ...Object.keys(r.scene.layers ?? {})].sort(), r.id);
    for (const entry of mine) {
      const { replaces } = entry;
      assert.equal(sha(read(replaces.path)), replaces.sha256, `${entry.path}: today's picture`);
      if (r.id === 'hospital') {
        assert.equal(replaces.bundle, 'board-v2-films-art');
        assert.equal(replaces.cssVariable, entry.layer === 'dark' ? '--board-v2-film-lighting-hospital-ward-four-dark' : `--board-v2-film-scenes-hospital-ward-four-${entry.layer}`);
        assert.ok(JSON.parse(text(replaces.catalog)).assets.some(asset => asset.cssVariable === replaces.cssVariable && asset.runtimePath === replaces.path));
      } else if (entry.layer === 'dark') {
        assert.equal(replaces.bundle, 'board-v2-motion-art');
        assert.equal(replaces.cssVariable, `--board-v2-motion-${r.id}-dark`);
        assert.ok(JSON.parse(text(replaces.catalog)).assets.some(asset => asset.cssVariable === replaces.cssVariable && asset.source === replaces.path && asset.sha256 === replaces.sha256));
      } else {
        assert.equal(replaces.bundle, 'scene-art');
        assert.equal(replaces.cssVariable, `--bm-scene-${r.id}-${entry.layer}`);
        assert.ok(text(replaces.stylesheet).includes(`${replaces.cssVariable}:`));
        assert.equal(replaces.path, entry.layer === 'back' ? r.today.back : r.today.layers[entry.layer]);
      }
      if (entry.kind === 'layer') assert.equal(entry.depth, r.scene.layers[entry.layer].depth);
    }
  }
  const properties = exports.map(item => item.entry.replaces.cssVariable);
  assert.equal(new Set(properties).size, properties.length);
  // The two-bed sick bay and the roster-sized ward are not the board's Hospital now, and stay as they are.
  assert.ok(properties.every(property => !/^--bm-scene-hospital-|^--board-v2-art-ward-|^--board-v2-motion-hospital-ward-/.test(property)));
});

test('every export is a static SVG of the scene\'s box', () => {
  for (const { path, content } of exports) {
    assert.ok(content.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" width="1024" height="768"'), path);
    assert.ok(content.endsWith('</svg>'), path);
    assert.ok(!/<\?xml|<!--/.test(content), `${path}: no declaration or comment`);
    assert.ok(!/<(?:script|style|foreignObject|image)\b/i.test(content) && !/\son[a-z]+\s*=/i.test(content), `${path}: static`);
    assert.ok(!/\b(?:href|xlink:href)\s*=\s*"(?!#)/i.test(content) && !/url\(\s*["']?(?!#)/i.test(content), `${path}: no external reference`);
    assert.ok(!/NaN|undefined|Infinity/.test(content), path);
    const all = ids(content);
    assert.equal(new Set(all).size, all.length, `${path}: an id twice`);
    for (const ref of refs(content)) assert.ok(all.includes(ref), `${path}: #${ref} has no target`);
  }
});

/** The farthest any point of a polyline lies from another polyline. */
function farthest(points, line) {
  let worst = 0;
  for (const p of points) {
    let best = Infinity;
    for (let i = 0; i < line.length; i += 1) {
      const a = line[i], b = line[(i + 1) % line.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t));
    }
    worst = Math.max(worst, best);
  }
  return worst;
}

test('the trim changes nothing but the ink\'s path data, and keeps every outline within its tolerance', () => {
  const blank = svg => svg.replace(/ d="[^"]*"/g, ' d=""');
  let checked = 0;
  for (const { path, content, drawn } of exports) {
    assert.equal(blank(content), blank(drawn), `${path}: only path data differs`);
    const before = [...drawn.matchAll(/ d="([^"]*)"/g)].map(m => m[1]), after = [...content.matchAll(/ d="([^"]*)"/g)].map(m => m[1]);
    assert.equal(after.length, before.length);
    // Every path the trim changed: each subpath within the tolerance and the rounding.
    for (let i = 0; i < before.length; i += 1) {
      if (before[i] === after[i]) continue;
      const [was, now] = [pathShapes(before[i]), pathShapes(after[i])];
      assert.equal(now.length, was.length, `${path}: a subpath lost`);
      was.forEach((shape, k) => {
        const distance = farthest(shape.points, now[k].points);
        assert.ok(distance <= TOLERANCE + Math.SQRT1_2 + 1e-6, `${path}: an outline moved ${distance.toFixed(2)} units`);
      });
      checked += 1;
    }
  }
  assert.ok(checked > 2000, `checked ${checked} paths`);
});

test('the lights-out pictures follow the reviewed night rule, the room\'s light taken away', () => {
  for (const r of ROOMS) {
    const dark = byPath.get(`${OUT}/assets/${r.id}.dark.svg`).content;
    assert.ok(!dark.includes('data-light') && !/<(?:linear|radial)Gradient/.test(dark), `${r.id}: no light left`);
    const lit = exports.filter(item => item.entry.room === r.id && item.entry.kind !== 'dark').map(item => item.content).join('');
    const allowed = new Set([NIGHT.line, ...[...colours(lit)].flatMap(hex => [nightFill(hex), nightSpace(hex)])]);
    for (const hex of colours(dark)) assert.ok(allowed.has(hex), `${r.id}: ${hex} is not the night rule's`);
    // Every outline the ink drew in the lit room is there in the dark (the light has none).
    const outlines = svg => (svg.match(/ fill="#[0-9A-Fa-f]{6}" fill-rule="evenodd"/g) ?? []).length;
    assert.equal(outlines(dark), outlines(lit), `${r.id}: every outline is there in the dark`);
  }
});

test('the review record covers every export, and the release stays within its size', () => {
  const record = JSON.parse(text(`${OUT}/review/renders.json`));
  for (const [path, output] of Object.entries(record.outputs)) assert.equal(sha(read(path)), output.sha256, path);
  assert.deepEqual(Object.keys(record.trim.exports).sort(), exports.map(item => item.path).sort());
  for (const [path, entry] of Object.entries(record.trim.exports)) assert.ok(entry.over32Share <= 0.02, `${path}: ${entry.over32Share} of pixels differ`);
  const manifest = JSON.parse(manifestText);
  const total = manifest.assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
  assert.ok(total <= 300 * 1024, `the release is ${total} bytes gzipped`);
  for (const asset of manifest.assets) assert.ok(asset.gzipBytes * 2.5 <= asset.drawn.gzipBytes, `${asset.path}: trimmed to ${asset.gzipBytes} of ${asset.drawn.gzipBytes}`);
});

test('the release\'s own files are development files, and nothing in the game imports the rooms\' drawing', () => {
  for (const path of ['design/room-pilot/night.mjs', 'design/room-pilot/trim.mjs', 'design/tools/room-drawing-export.mjs', 'design/tools/room-drawing-render.mjs', 'design/room-drawing/review.mjs']) {
    assert.ok(text(path).startsWith('// mothership:dev-only\n'), path);
  }
  assert.match(text('design/room-drawing/review.html').split('\n')[1], /^<!-- mothership:dev-only\./);
});
