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
//  - the private-talk capsule is redrawn with the rooms, its badge left as it is;
//  - the films' code: drop-ins with the board's exports, geometry and every other piece of art,
//    whose Jail door at rest is the redrawn Jail's, ported by dropping a line and rewriting imports;
//  - the review record covers every export, and the release stays within its size.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { NIGHT, nightFill, nightSpace } from '../../../design/board-v2/scenes/lighting.mjs';
import { pathShapes } from '../../../design/room-pilot/ink-room.mjs';
import { ROOMS } from '../../../design/room-pilot/rooms.mjs';
import { TOLERANCE } from '../../../design/room-pilot/trim.mjs';
import { OUT, PORTS, RELEASE, build, filmModules, manifestOf, portOf, releaseCandidate } from '../../../design/tools/room-drawing-export.mjs';
import * as captain from '../../../design/room-drawing/source/captain.mjs';
import * as medical from '../../../design/room-drawing/source/medical.mjs';
import { JAIL_DOOR_ART } from '../../../design/room-drawing/source/jail-door-art.mjs';
import * as captainToday from '../../../apps/game/hosted/board-v2-drawing/captain-fx.mjs';
import * as medicalToday from '../../../apps/game/hosted/board-v2-drawing/medical-fx.mjs';

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
  for (const [path, body] of Object.entries(filmModules())) assert.equal(text(path), body, path);
});

test('every room has its back, its layers and its lights-out picture, each replacing what the board reads today', () => {
  assert.equal(exports.length, 25);
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
  // The capsule: its cabin, door, light and lights-out picture, in the board-v2 art; its badge stays.
  const capsule = exports.filter(item => item.entry.room === 'capsule').map(item => item.entry);
  assert.deepEqual(capsule.map(entry => entry.layer).sort(), ['back', 'busy', 'dark', 'door-0', 'door-1', 'door-2', 'door-3']);
  for (const entry of capsule) {
    assert.equal(entry.replaces.bundle, 'board-v2-art');
    assert.equal(entry.replaces.cssVariable, `--board-v2-art-capsule-${entry.layer}`);
    assert.equal(sha(read(entry.replaces.path)), entry.replaces.sha256);
    assert.ok(JSON.parse(text(entry.replaces.catalog)).assets.some(asset => asset.cssVariable === entry.replaces.cssVariable && asset.source === entry.replaces.path && asset.sha256 === entry.replaces.sha256));
  }
  const properties = exports.map(item => item.entry.replaces.cssVariable);
  assert.equal(new Set(properties).size, properties.length);
  assert.ok(!properties.includes('--board-v2-art-capsule-badge'));
  // The two-bed sick bay and the roster-sized ward are not the board's Hospital now, and stay as they are.
  assert.ok(properties.every(property => !/^--bm-scene-hospital-|^--board-v2-art-ward-|^--board-v2-motion-hospital-ward-/.test(property)));
});

test('every export is a static SVG of the scene\'s box', () => {
  for (const { path, content, entry } of exports) {
    assert.ok(content.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${entry.width} ${entry.height}" width="${entry.width}" height="${entry.height}"`), path);
    assert.deepEqual([entry.width, entry.height], entry.room === 'capsule' ? [512, 768] : [1024, 768]);
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
  for (const r of [...ROOMS, { id: 'capsule' }]) {
    const dark = byPath.get(`${OUT}/assets/${r.id}.dark.svg`).content;
    assert.ok(!dark.includes('data-light') && !/<(?:linear|radial)Gradient/.test(dark), `${r.id}: no light left`);
    const lit = exports.filter(item => item.entry.room === r.id && item.entry.kind !== 'dark' && (r.id !== 'capsule' || ['back', 'door-0'].includes(item.entry.layer))).map(item => item.content).join('');
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
  // The Jail door's overlay at rest, over the Jail, against the Jail alone: the room itself, but for edge pixels.
  assert.ok(record.doorAtRest.over32Share <= 0.002, `the door at rest differs in ${record.doorAtRest.over32Share} of pixels`);
  const manifest = JSON.parse(manifestText);
  const total = manifest.assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
  assert.ok(total <= 330 * 1024, `the release is ${total} bytes gzipped`);
  // Each picture of any size is trimmed to at most two fifths (the open capsule door draws almost nothing).
  for (const asset of manifest.assets.filter(entry => entry.drawn.gzipBytes >= 4096)) assert.ok(asset.gzipBytes * 2.5 <= asset.drawn.gzipBytes, `${asset.path}: trimmed to ${asset.gzipBytes} of ${asset.drawn.gzipBytes}`);
});

test('the release\'s own files are development files, and nothing in the game imports the rooms\' drawing', () => {
  for (const path of ['design/room-pilot/night.mjs', 'design/room-pilot/trim.mjs', 'design/tools/room-drawing-export.mjs', 'design/tools/room-drawing-render.mjs', 'design/room-drawing/review.mjs']) {
    assert.ok(text(path).startsWith('// mothership:dev-only\n'), path);
  }
  assert.match(text('design/room-drawing/review.html').split('\n')[1], /^<!-- mothership:dev-only\./);
});

/** A module's exports: functions by name, everything else by value. */
const exportsOf = module => Object.fromEntries(Object.entries(module).map(([name, value]) => [name, typeof value === 'function' ? 'function' : value]));

test('the films\' code: drop-ins with the board\'s exports and geometry, and only the named pieces drawn again', () => {
  for (const [mine, today, redrawn] of [[captain, captainToday, ['jailDoorSvg', 'airlockSvg']], [medical, medicalToday, ['droneSvg', 'berthScreenSvg', 'lampSvg']]]) {
    // The same exports, and every constant (boxes, beats, colours, geometry) the same.
    assert.deepEqual(exportsOf(mine), exportsOf(today));
    for (const name of redrawn) assert.equal(typeof mine[name], 'function', name);
  }
  // Every other piece of art draws exactly as today's.
  const same = (name, ...args) => assert.equal(captain[name](...args), captainToday[name](...args), `${name}(${args.join(', ')})`);
  for (const kind of captain.COMMANDS) for (const state of captain.PLATE_STATES) same('plateSvg', kind, state);
  for (const frame of captain.COVER.frames) same('coverSvg', frame);
  for (const name of ['gloveSvg', 'clickSvg', 'ringSvg', 'consoleSvg', 'emergencySvg', 'exteriorSvg', 'plaqueSvg']) same(name);
  for (const kind of captain.COMMANDS) same('pulseHeadSvg', kind);
  for (const frame of [1, 2, 3]) same('suctionSvg', frame);
  for (const kind of captain.DEBRIS) same('debrisSvg', kind);
  const sameMedical = (name, ...args) => assert.equal(medical[name](...args), medicalToday[name](...args), `${name}(${args.join(', ')})`);
  for (const kind of medical.TRACE_KINDS) sameMedical('vitalsInsetSvg', kind);
  for (const tone of medical.RESCUE_TONES) sameMedical('rescueCrossSvg', tone);
  for (const name of ['detentionTagSvg', 'scanLineSvg', 'hologramSvg']) sameMedical(name);
  for (const frame of [1, 2]) sameMedical('pulseSvg', frame);
  // The redrawn pieces keep their boxes: the drone hangs by its lens in the same 160 x 132.
  for (const frame of medical.DRONE.frames) assert.match(medical.droneSvg(frame), /^<svg [^>]*viewBox="0 0 160 132" width="160" height="132"/);
  for (const kind of medical.TRACE_KINDS) assert.match(medical.berthScreenSvg(kind), /viewBox="0 0 40 24"/);
  for (const state of medical.LAMP_STATES) assert.match(medical.lampSvg(state), /viewBox="0 0 40 40"/);
  assert.match(captain.jailDoorSvg(), new RegExp(`viewBox="${captain.JAIL_DOOR.box.join(' ')}"`));
  assert.match(captain.airlockSvg(), new RegExp(`viewBox="${captain.AIRLOCK.box.join(' ')}"`));
});

test('at rest, the Jail door is the redrawn Jail: its every outline and fill is the room\'s own', () => {
  const room = text(`${OUT}/assets/jail.back.svg`);
  const paths = svg => [...svg.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
  const A = JAIL_DOOR_ART;
  for (const [name, part] of [['shut', A.shut], ['cross', A.cross], ['rivets', A.rivets], ['lamp', A.lamp.normal], ['screen', A.screen.normal], ['light', A.light]]) {
    const own = paths(part.defs + part.body);
    assert.ok(own.length > 0, name);
    for (const d of own) assert.ok(room.includes(` d="${d}"`), `${name}: a path the room does not draw`);
  }
  // The overlay at rest draws those pieces, in the room's order, and nothing of the open door.
  const rest = captain.jailDoorSvg({ prefix: 'jd' });
  assert.ok(rest.includes(A.shut.body) && rest.includes(A.lamp.normal.body) && rest.includes(A.screen.normal.body));
  assert.ok(!rest.includes(A.corridor.body));
  // Every overlay's ids are its own.
  const two = captain.jailDoorSvg({ prefix: 'one', open: 0.5 }) + captain.jailDoorSvg({ prefix: 'two', open: 0.5 });
  const all = ids(two);
  assert.equal(new Set(all).size, all.length);
});

test('the films\' code is ported by dropping its first line and rewriting its imports, into its own runtime directory', () => {
  const record = JSON.parse(text(`${OUT}/release-candidate.json`));
  assert.equal(record.ports.length, PORTS.length);
  for (const { source, runtime, imports } of PORTS) {
    const body = text(source);
    assert.ok(body.startsWith('// mothership:dev-only\n'), source);
    const port = portOf(body, imports);
    assert.equal(record.ports.find(entry => entry.source === source).portSha256, sha(port), source);
    // Every import of the port resolves beside it in the runtime, and none reaches into design/.
    for (const [, spec] of port.matchAll(/^import [^;]+ from '([^']+)';$/gm)) {
      assert.ok(!spec.includes('design/'), `${runtime} imports ${spec}`);
      const target = new URL(spec, new URL(runtime, root));
      const inRelease = PORTS.some(entry => new URL(entry.runtime, root).href === target.href);
      assert.ok(inRelease || readdirSync(new URL('./', target)).includes(target.pathname.split('/').at(-1)), `${runtime}: ${spec} resolves to nothing`);
    }
  }
});
