// The boarding film, version 2 (design/phone-ui/components/boarding-film, pregame-boarding-2.0.0): a runtime source
// the game imports as it is, so its module graph, its styles' scope, its clock (version 1's length, cuts and close),
// its acting on the approved crew drawing, its inputs and what its sources may and may not do are checked here; its
// drawing, lifecycle, memory and frame rate in a browser under the production headers by
// design/tools/boarding-film-check.mjs, and its review videos by design/tools/boarding-film-render.mjs, whose records
// are checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREW, CREW_DRAWING_VERSION } from '../../../apps/game/hosted/crew-drawing/crew.mjs';
import * as released from '../../../apps/game/hosted/pregame-films/boarding/boarding.mjs';
import * as releasedClock from '../../../apps/game/hosted/pregame-films/boarding/clock.mjs';
import {
  BOARDING_FILM_VERSION, BOARDING_MS, BOARDING_TEXT, COAST_MS, DOOR_BEATS, HULL_WAKE, INSIDE, LATE_FRAME_MS, MEMORY_BUDGET, QUALITY, SHOTS, SLOW_FRAMES, SLOW_FRAME_MS, STILLS, STILL_FADE_MS, STILL_OUT, TITLE, VARIANTS,
  boardingFrame, shotOf,
} from '../../../design/phone-ui/components/boarding-film/boarding-film.mjs';
import { ANCHOR, CREW_HEAD_SCALE, HELD, LOOKS, backPose, bodyArt, bodyBox, climbPose, headArt, headBox, partBox, stridePose } from '../../../design/phone-ui/components/boarding-film/cast.mjs';
import { HALL, LAMPS, lampAt, lampOver } from '../../../design/phone-ui/components/boarding-film/corridor.mjs';
import { SET, WALL_BOX, rampY, wallArt } from '../../../design/phone-ui/components/boarding-film/doorway.mjs';
import { grainAt, lens, plane, seen, svgOf, within } from '../../../design/phone-ui/components/boarding-film/engine.mjs';
import { DEPTH, DOOR, GROUND, RAMP, SHIP_BOX, shipArt } from '../../../design/phone-ui/components/boarding-film/exterior.mjs';
import { markSize } from '../../../design/phone-ui/components/boarding-film/mark.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/boarding-film';
const RUNTIME = ['boarding-film.mjs', 'cast.mjs', 'corridor.mjs', 'doorway.mjs', 'engine.mjs', 'exterior.mjs', 'mark.mjs'];
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
/** A source without its comments: what it does, not what it says. */
const code = path => read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seenFiles = new Map();
  const visit = file => {
    if (seenFiles.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seenFiles.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seenFiles;
}

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'boarding-film.mjs')), ...graph(join(REPO, COMPONENT, 'boarding-film.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  for (const path of local) {
    assert.ok(path.startsWith(`${COMPONENT}/`) || path.startsWith('apps/game/hosted/'), `${path}: only the film's own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|review)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual([...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))], [], 'no package import: the film is its own files and the hosted game\'s drawing');
  for (const file of [...RUNTIME, 'boarding-film.css']) assert.ok(local.includes(`${COMPONENT}/${file}`), `${file} is in the graph`);
  assert.deepEqual(readdirSync(join(REPO, COMPONENT)).filter(name => /\.(?:mjs|css)$/.test(name)).sort(), [...RUNTIME, 'boarding-film.css'].sort(), 'every source in the folder is one of the film\'s');
  // What it draws with: the approved crew drawing, the scene drawing's skeletons and the films' own kit and roster.
  for (const path of ['apps/game/hosted/crew-drawing/figure.mjs', 'apps/game/hosted/crew-drawing/head.mjs', 'apps/game/hosted/crew-drawing/ink.mjs', 'apps/game/hosted/crew-drawing/crew.mjs',
    'apps/game/hosted/scene-drawing/gestures.mjs', 'apps/game/hosted/pregame-films/kit/letters.mjs', 'apps/game/hosted/pregame-films/kit/fx.mjs', 'apps/game/hosted/pregame-films/kit/math.mjs',
    'apps/game/hosted/pregame-films/boarding/roster.mjs']) assert.ok(local.includes(path), `${path} is in the graph`);
  // It is beside the released film, never in it: version 1's film and player are not in its graph.
  assert.ok(!local.includes('apps/game/hosted/pregame-films/boarding/boarding.mjs') && !local.some(p => p.startsWith('apps/game/hosted/planet/')), 'the released film and the live player are not imported');
  assert.ok(!local.some(p => /\/(?:kit|phone-shell|room-scene)\//.test(p) && p.startsWith('design/')), 'it needs neither the kit, the shell nor the room scene');
  for (const path of ['preview/index.html', 'preview/baseline.html', 'preview/compare.html', 'preview/preview.css', 'preview/compare.css', 'preview/preview.mjs', 'preview/baseline.mjs', 'preview/compare.mjs', 'preview/probe.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  for (const tool of ['design/tools/boarding-film-check.mjs', 'design/tools/boarding-film-render.mjs']) assert.match(read(tool), /^\/\/ mothership:dev-only/);
  // The preview draws the same files.
  assert.match(read(`${COMPONENT}/preview/preview.mjs`), /from '\.\.\/boarding-film\.mjs'/);
  assert.match(read(`${COMPONENT}/preview/index.html`), /href="\.\.\/boarding-film\.css"/);
});

test('what its sources may do: no clock but the scene\'s own, no chance, no network, no evaluated code, no worker, no filter while it runs', () => {
  for (const file of RUNTIME) {
    const source = code(`${COMPONENT}/${file}`);
    assert.doesNotMatch(source, /Math\.random|Date\.now|new Date\b|setInterval\b/, `${file}: no chance and no wall clock`);
    assert.doesNotMatch(source, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(|\beval\(|new Function\b|Worker\(|OffscreenCanvas|createImageBitmap/, `${file}: no network, no evaluated code, no worker`);
    assert.doesNotMatch(source, /\.filter\s*=\s*['"`]|shadowBlur/, `${file}: no canvas filter or blurred shadow while the film runs`);
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/, `${file}: nothing is stored`);
    assert.doesNotMatch(source, /addEventListener|dispatchEvent|postMessage\((?!0\))|onclick|\.click\(/, `${file}: it listens for nothing and tells no one`);
  }
  // The page's clock is read only where the scene keeps time between paints and where drawing is timed.
  for (const file of RUNTIME) {
    const uses = (code(`${COMPONENT}/${file}`).match(/performance\.now\(\)/g) ?? []).length;
    assert.equal(uses > 0, ['boarding-film.mjs', 'engine.mjs'].includes(file), `${file}: ${uses} reads of the page's clock`);
  }
  assert.doesNotMatch(code(`${COMPONENT}/boarding-film.mjs`), /setTimeout/, 'the scene sets no timer');
  // Frames are asked for only by the scene, and only one loop.
  for (const file of RUNTIME) assert.equal(/requestAnimationFrame/.test(code(`${COMPONENT}/${file}`)), file === 'boarding-film.mjs', `${file}`);
  // Pictures come only from the film's own SVG text, through a blob: image (img-src allows it); the grain's tile as a data: image.
  const engine = code(`${COMPONENT}/engine.mjs`);
  assert.match(engine, /new win\.Blob\(\[svg\], \{ type: 'image\/svg\+xml' \}\)/);
  assert.match(engine, /revokeObjectURL/);
  assert.doesNotMatch(RUNTIME.map(file => code(`${COMPONENT}/${file}`)).join('\n'), /https?:\/\/(?!www\.w3\.org\/2000\/svg)/, 'nothing external is named');
});

test('its styles reach nothing outside the film: every rule is scoped under .ms-boarding-film', () => {
  const css = read(`${COMPONENT}/boarding-film.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /@import|@keyframes|@font-face|url\(/, 'no import, no keyframes, no file');
  const selectors = [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(Boolean);
  assert.equal(selectors.length, 5, 'the film, its canvas, its light, its shade, its grain');
  for (const selector of selectors) {
    assert.match(selector, /^\.ms-boarding-film(?:\s*>\s*(?:canvas|\.ms-bf-[\w-]+))?$/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*/, `"${selector}": no universal selector`);
  }
  assert.doesNotMatch(css, /--[\w-]+\s*:/, 'no custom property is declared');
  assert.match(css, /\.ms-boarding-film \{[^}]*pointer-events: none/, 'nothing in the film can be tapped');
  assert.match(css, /\.ms-boarding-film \{[^}]*contain: strict/);
  // The classes the scene gives its layers are the ones styled.
  const scene = read(`${COMPONENT}/boarding-film.mjs`);
  for (const name of ['ms-boarding-film', 'ms-bf-light', 'ms-bf-shade', 'ms-bf-grain']) { assert.match(scene, new RegExp(`'${name}'`)); assert.match(css, new RegExp(`\\.${name}\\b`)); }
  assert.match(scene, /root\.setAttribute\('aria-hidden', 'true'\)/, 'the picture is hidden from a screen reader: the player says the film\'s words');
});

test('the clock: version 1\'s length, its two cuts, its close and its held pictures\' times; the shots end to end', () => {
  assert.equal(BOARDING_FILM_VERSION, 'pregame-boarding-2.0.0');
  assert.notEqual(BOARDING_FILM_VERSION, releasedClock.BOARDING_VERSION, 'a new version beside the released one');
  assert.equal(BOARDING_MS, 10000);
  assert.equal(BOARDING_MS, releasedClock.BOARDING_MS);
  assert.equal(BOARDING_TEXT, released.BOARDING_TEXT, 'the film\'s words for a screen reader are version 1\'s');
  assert.deepEqual([...VARIANTS], [...releasedClock.VARIANTS]);
  const shots = Object.entries(SHOTS);
  assert.deepEqual(shots.map(([id]) => id), ['dusk', 'foot', 'faces', 'door', 'wake', 'inside']);
  assert.equal(shots[0][1][0], 0);
  assert.equal(shots.at(-1)[1][1], BOARDING_MS);
  shots.forEach(([id, [a, b]], i) => { assert.ok(b > a, id); if (i) assert.equal(shots[i - 1][1][1], a, `${id} begins where the shot before ends`); });
  // Version 1's cuts: the crew reaches the ramp at 2,000 ms, and the film goes inside at 6,900 ms.
  assert.equal(SHOTS.dusk[1], releasedClock.SHOTS.dusk[1]);
  assert.equal(SHOTS.inside[0], releasedClock.SHOTS.inside[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(TITLE)), JSON.parse(JSON.stringify(releasedClock.TITLE)), 'the mark and the ink keep version 1\'s beats');
  assert.deepEqual(JSON.parse(JSON.stringify(INSIDE)), JSON.parse(JSON.stringify(releasedClock.INSIDE)), 'the lights and the consoles wake on version 1\'s beats');
  assert.deepEqual(STILLS.map(s => s.at), releasedClock.STILLS.map(s => s.at), 'the held pictures change when version 1\'s do');
  assert.equal(STILL_FADE_MS, releasedClock.STILL_FADE_MS);
  assert.deepEqual([...STILL_OUT], [...releasedClock.STILL_OUT]);
  // The door's beats in order, inside its shot; the hull wakes inside its own.
  const beats = [DOOR_BEATS.look[0], DOOR_BEATS.look[1], DOOR_BEATS.in[1], DOOR_BEATS.ramp[0], DOOR_BEATS.slab[0], DOOR_BEATS.slam, DOOR_BEATS.seal[0], DOOR_BEATS.seal[1]];
  assert.deepEqual(beats, [...beats].sort((a, b) => a - b));
  assert.ok(beats[0] > SHOTS.door[0] && beats.at(-1) <= SHOTS.door[1] && DOOR_BEATS.slab[1] === DOOR_BEATS.slam);
  assert.ok(DOOR_BEATS.ramp[0] - DOOR_BEATS.in[1] >= 0, 'a held breath on the empty doorway before the ramp moves');
  assert.ok(DOOR_BEATS.slab[0] - DOOR_BEATS.ramp[0] >= 60 && DOOR_BEATS.seal[0] > DOOR_BEATS.slam, 'each event has its build: the ramp, then the slab, then the seal');
  for (const [a, b] of Object.values(HULL_WAKE)) assert.ok(a >= SHOTS.wake[0] && b <= SHOTS.wake[1]);
  assert.ok(COAST_MS >= 250 && COAST_MS <= 1000);
});

test('time: a frame is the moment it is given; Reduce motion is five held pictures from the night and back to it', () => {
  for (const [id, [a, b]] of Object.entries(SHOTS)) { assert.equal(shotOf(a), id); assert.equal(shotOf(b - 1), id); }
  assert.deepEqual(boardingFrame(4321), { t: 4321, at: 4321, reduced: false, still: null, fade: 1, shot: 'faces', night: false });
  assert.equal(boardingFrame(-200).t, 0);
  assert.equal(boardingFrame(99999).t, BOARDING_MS);
  assert.equal(boardingFrame(Number.NaN).t, 0);
  assert.equal(boardingFrame(TITLE.night - 1).night, false);
  assert.equal(boardingFrame(TITLE.night).night, true);
  assert.throws(() => boardingFrame(0, { variant: 'slow' }), /No boarding variant/);
  STILLS.forEach((still, i) => {
    const until = i + 1 < STILLS.length ? STILLS[i + 1].at : STILL_OUT[0];
    assert.equal(boardingFrame(still.at, { variant: 'reduced' }).fade, 0, 'from the night');
    assert.equal(boardingFrame(still.at + STILL_FADE_MS / 2, { variant: 'reduced' }).fade, 0.5);
    for (const t of [still.at + STILL_FADE_MS, until - 1]) {
      const frame = boardingFrame(t, { variant: 'reduced' });
      assert.deepEqual([frame.at, frame.still, frame.fade, frame.reduced], [still.moment, i, 1, true], `held picture ${i + 1} at ${t}`);
    }
    // Each held picture is a moment of the film itself, in the stretch it stands for, and not one of its jolts.
    assert.ok(still.moment >= still.at - 600 && still.moment < (i + 1 < STILLS.length ? STILLS[i + 1].at + 700 : BOARDING_MS), `held picture ${i + 1}`);
    assert.ok(still.moment < DOOR_BEATS.slam - 20 || still.moment > DOOR_BEATS.slam + 240, 'never the slam');
    assert.ok(still.moment < 5150 || still.moment > SHOTS.faces[1], 'never the glare');
  });
  assert.equal(STILLS.at(-1).moment > TITLE.hit + 200, true, 'the last is the mark at rest');
  assert.equal(boardingFrame(STILL_OUT[1], { variant: 'reduced' }).fade, 0);
  assert.equal(boardingFrame(STILL_OUT[1], { variant: 'reduced' }).night, true);
  assert.deepEqual(STILLS.map(s => shotOf(s.moment)), ['dusk', 'foot', 'door', 'inside', 'inside']);
});

test('the place is the approved one: version 1\'s ground, entrance and ramp, in planes of depth', () => {
  assert.equal(GROUND, released.GROUND);
  assert.deepEqual({ ...DOOR }, { ...released.DOOR });
  assert.deepEqual([[...RAMP.sill], [...RAMP.foot]], [[...released.RAMP.sill], [...released.RAMP.foot]]);
  const depths = Object.values(DEPTH);
  assert.deepEqual(depths, [...depths].sort((a, b) => a - b), 'sky, giant, far range, near range, ship, foreground');
  assert.ok(new Set(depths).size >= 6 && DEPTH.sky < 0.05 && DEPTH.ship === 1 && DEPTH.front > 1.5, 'six planes, from all but infinity to in front of the ship');
  // The ship's picture: the crew's ink, whole inside its box, the entrance left dark for what is laid in it.
  const ship = shipArt();
  assert.match(ship, /bf-ship-hatch/);
  assert.match(ship, new RegExp(`<rect x="${DOOR.x}" y="${DOOR.y}" width="${DOOR.w}" height="${DOOR.h}" fill="#151A26"/>`));
  assert.equal((ship.match(/<circle /g) ?? []).length, 16, 'sixteen ports');
  assert.deepEqual(within([0, 0, 2000, 2000], SHIP_BOX), [...SHIP_BOX]);
  // A plane of depth: at the reference camera every plane agrees; a camera move shifts each by its depth; a dolly grows the near ones more.
  const view = { W: 780, H: 1688, k: 2 }, ref = [690, 470];
  for (const p of depths) assert.deepEqual(plane(view, ref, { x: 690, y: 470, dolly: 0 }, p), { s: 2, ox: 390 - 690 * 2, oy: 844 - 470 * 2 });
  const moved = p => plane(view, ref, { x: 790, y: 470, dolly: 0 }, p).ox - plane(view, ref, { x: 690, y: 470, dolly: 0 }, p).ox;
  assert.equal(moved(1), -200);
  assert.ok(Math.abs(moved(DEPTH.sky)) < 4 && Math.abs(moved(DEPTH.front)) > 370);
  assert.ok(plane(view, ref, { x: 690, y: 470, dolly: 0.3 }, 1.9).s > plane(view, ref, { x: 690, y: 470, dolly: 0.3 }, 1).s && plane(view, ref, { x: 690, y: 470, dolly: 0.3 }, 0.02).s < 2.02);
  const box = seen(view, ref, [{ x: 690, y: 470, dolly: 0 }], 1, 0);
  assert.deepEqual(box.rect.map(Math.round), [495, 48, 390, 844]);
  // The two sets in three dimensions: a point farther off is smaller and nearer the horizon.
  const at = lens({ W: 780, H: 1688, f: 1280 }, { x: 0, y: 70, z: 0 });
  assert.ok(at(0, SET.sill, SET.door)[2] < at(0, 0, SET.foot)[2]);
  assert.ok(at(0, 0, SET.door)[1] < at(0, 0, SET.foot)[1] && Math.abs(at(0, 0, 1e9)[1] - 844) < 0.01, 'the ground runs up to the horizon');
  assert.equal(rampY(SET.foot), 0);
  assert.equal(rampY(SET.door), SET.sill);
  assert.match(wallArt(), /bf-wall-hatch/);
  assert.equal(WALL_BOX.length, 4);
  assert.ok(LAMPS.every((z, i) => !i || z > LAMPS[i - 1]) && LAMPS.every(z => z > HALL.near && z < HALL.far));
  // The lights wake far to near, each from nothing to full; held, each is simply off or on.
  assert.equal(lampAt(LAMPS.length - 1, INSIDE.lights[0] - 1, INSIDE.lights), 0);
  assert.equal(lampAt(LAMPS.length - 1, INSIDE.lights[0] + 200, INSIDE.lights), 1);
  assert.equal(lampAt(0, INSIDE.lights[0] + 200, INSIDE.lights), 0);
  assert.equal(lampAt(0, INSIDE.lights[1] + 200, INSIDE.lights), 1);
  assert.equal(lampAt(0, INSIDE.lights[1] + 1, INSIDE.lights, true), 1);
  assert.equal(lampOver(LAMPS[2] + 10), 2);
});

test('the crew is the approved drawing, acted: every pose is a whole skeleton with its head drawn last, inside its box', () => {
  assert.equal(CREW_DRAWING_VERSION, 'crew-drawing-1.0.0');
  assert.deepEqual([...ANCHOR], [62, 233]);
  const JOINTS = ['head', 'neck', 'pelvis', 'sF', 'eF', 'wF', 'sN', 'eN', 'wN', 'hipF', 'kF', 'aF', 'hipN', 'kN', 'aN'];
  const poses = [
    ...Array.from({ length: 8 }, (_, j) => [`stride ${j}`, stridePose(j / 8)]), ...Array.from({ length: 8 }, (_, j) => [`stride up the ramp ${j}`, stridePose(j / 8, { slope: 0.5 })]),
    ...Array.from({ length: 8 }, (_, j) => [`climb ${j}`, climbPose(j / 8)]), ['back', backPose(0)], ['back, weight on a leg', backPose(0.7)], ...Object.entries(HELD),
  ];
  for (const [name, sk] of poses) {
    for (const joint of JOINTS) assert.ok(Array.isArray(sk[joint]) && sk[joint].every(Number.isFinite), `${name}: ${joint}`);
    assert.equal((sk.order ?? ['head']).at(-1), 'head', `${name}: the head is drawn last, so it can act by itself`);
    const [x, y, w, h] = bodyBox(sk);
    for (const joint of JOINTS.slice(1)) assert.ok(sk[joint][0] > x + 10 && sk[joint][0] < x + w - 10 && sk[joint][1] > y + 10 && sk[joint][1] < y + h - 10, `${name}: ${joint} inside its box`);
    assert.ok(w < 190 && h < 260, `${name}: a box no larger than a figure (${w} × ${h})`);
  }
  // A walk is a cycle; a climb is seen from behind; both feet never leave the ground together.
  assert.deepEqual(stridePose(0), stridePose(1));
  assert.deepEqual(climbPose(0.25), climbPose(1.25));
  for (let j = 0; j < 8; j += 1) {
    const walk = stridePose(j / 8), climb = climbPose(j / 8);
    assert.equal(walk.view, 'front');
    assert.ok(Math.max(walk.aF[1], walk.aN[1]) > 205, `stride ${j}: a foot on the ground`);
    assert.ok(climb.back && climb.view === 'back' && Math.max(climb.aF[1], climb.aN[1]) >= 214.9, `climb ${j}: from behind, a foot on the ground`);
  }
  assert.ok(stridePose(0, { slope: 0.5 }).aF[1] < stridePose(0).aF[1] - 8, 'up the ramp the leading foot lands higher');
  assert.ok(stridePose(0, { slope: 0.5 }).neck[0] < stridePose(0).neck[0], 'and the body leans into the climb');
  // The drawing is the crew's own: its ink, its suit, each member's head; the head left out of a body's picture.
  for (const id of Object.keys(CREW)) {
    const body = bodyArt(id, HELD.stand), head = headArt(id, 'front');
    assert.match(body, /bf-b-hatch/);
    assert.match(body, new RegExp(CREW[id].accent, 'i'), `${id}: its own accent`);
    assert.doesNotMatch(body, /data-crew-head|<image|<script|href="(?!#)/, `${id}: no head in the body, nothing loaded`);
    assert.ok(head.length > 20000, `${id}: the traced head`);
    assert.doesNotMatch(head, /<image|<script|href="(?!#)/);
    for (const view of ['front', 'down', 'back']) { const [x, y, w, h] = headBox(id, view); assert.ok(x < 0 && y < 0 && x + w > 0 && y + h > 0 && w < 70 && h < 75, `${id} ${view}: a box round the head's joint`); }
  }
  assert.throws(() => bodyArt('c10', HELD.stand), /Unknown crew member/);
  const whole = bodyArt('c4', stridePose(0.25, { slope: 0.5, swing: 0 })), arm = bodyArt('c4', stridePose(0.25, { slope: 0.5, swing: 0 }), { only: ['armN'] }), trunk = bodyArt('c4', stridePose(0.25, { slope: 0.5, swing: 0 }), { only: ['neck', 'torso'] });
  assert.ok(arm.length < whole.length / 3 && trunk.length < whole.length && trunk.length > arm.length, 'an arm alone, a trunk alone');
  assert.ok(partBox(stridePose(0.25), 'armN')[2] < partBox(stridePose(0.25), 'trunk')[2]);
  // Light is put on when a picture is drawn: the kit's recipe, as an SVG filter, cut to the figure's own shape.
  for (const [name, look] of Object.entries(LOOKS)) {
    const lit = bodyArt('c1', HELD.stand, { look });
    assert.match(lit, /<filter id="bf-look" filterUnits="userSpaceOnUse"/, name);
    assert.match(lit, /<g filter="url\(#bf-look\)">/, name);
    const base = lit.slice(lit.indexOf('<filter id="bf-look"'), lit.indexOf('</filter>'));
    assert.equal((base.match(/operator="out"/g) ?? []).length, look.rims?.length ?? 0, `${name}: an edge of light for each rim`);
    assert.equal(lit.includes('<filter id="bf-back"'), !!look.back, `${name}: a light behind the figure only where the look has one`);
    for (const rim of look.rims ?? []) assert.ok(Math.hypot(rim.dx, rim.dy) > 0.5 && /^#[0-9A-F]{6}$/.test(rim.color));
    assert.ok(look.ambient.strength > 0 && look.ambient.strength < 1);
  }
  assert.deepEqual(Object.keys(LOOKS), ['dusk', 'backlit', 'lookback', 'climbFar', 'climbNear', 'dark', 'lit']);
  assert.ok(LOOKS.backlit.ambient.strength > 0.85 && LOOKS.backlit.rims.length === 2, 'against the doorway: a dark shape, light on both edges');
  assert.ok(LOOKS.dark.ambient.strength > LOOKS.lit.ambient.strength + 0.3 && LOOKS.climbNear.key.gain > LOOKS.climbFar.key.gain, 'the dark and the light; far from the entrance and near it');
  // In the dark corridor the doorway behind the crew is the only light (the Lead's review of #285): a thin edge on the
  // outline where it faces up or to a side with nothing of the figure beyond; none facing down; gone by the knees.
  const back = LOOKS.dark.back, dark = bodyArt('c1', HELD.stand, { look: LOOKS.dark });
  assert.deepEqual(Object.keys(LOOKS).filter(name => LOOKS[name].back), ['dark'], 'only the dark corridor has a light behind the crew');
  assert.equal(LOOKS.dark.rims, undefined, 'and no even rim');
  assert.ok(back.width >= 0.8 && back.width <= 1.3 && back.side > 0.5 && back.side <= 1 && back.gain <= 1, 'thin: about 1 to 1.5 px on a phone at 1x');
  const from = dark.indexOf('<filter id="bf-back"'), backFilter = dark.slice(from, dark.indexOf('</filter>', from));
  const beyond = [...backFilter.matchAll(/<feOffset in="SourceAlpha" dx="(-?[\d.]+)" dy="(-?[\d.]+)" result="([a-z]+)\d+"\/>/g)].map(m => ({ side: m[3], dx: Number(m[1]), dy: Number(m[2]) }));
  assert.deepEqual([...new Set(beyond.map(o => o.side))], ['l', 'r', 't'], 'the left, the right and the top: nothing faces down');
  for (const side of ['l', 'r', 't']) {
    const own = beyond.filter(o => o.side === side), far = own.map(o => Math.hypot(o.dx, o.dy));
    assert.equal(own.length, back.reach.length + 1);
    assert.ok(own.every(o => (side === 'l' ? o.dx > 0 && o.dy === 0 : side === 'r' ? o.dx < 0 && o.dy === 0 : o.dx === 0 && o.dy > 0)), `${side}: the figure moved away from the light`);
    assert.equal(far[0], back.width, `${side}: the edge is the light's width`);
    assert.ok(far.every((d, i) => i === 0 || (d > far[i - 1] && d - far[i - 1] <= 7)) && far.at(-1) >= 24, `${side}: looked for beyond the edge closely enough to meet an arm, far enough to meet the other leg`);
  }
  assert.equal((backFilter.match(/operator="out"/g) ?? []).length, 3, 'an outer edge for each side');
  assert.match(backFilter, new RegExp(`<feOffset in="SourceAlpha" dy="-${back.under}" result="on"/>`), 'a side takes no light where the figure ends just below it');
  assert.match(backFilter, /<feComposite in="light" in2="SourceAlpha" operator="in"\/>$/, 'cut to the figure\'s own shape');
  assert.match(dark, new RegExp(`<linearGradient id="bf-fall" gradientUnits="userSpaceOnUse" x1="0" y1="${back.fade[0]}" x2="0" y2="${back.fade[1]}">`));
  assert.ok(back.fade[0] > HELD.stand.neck[1] && back.fade[0] < HELD.stand.eF[1] && back.fade[1] > HELD.stand.wF[1] && back.fade[1] < HELD.stand.kF[1], 'whole on the shoulders, falling down the arms, gone above the knees');
  assert.match(dark, /<g filter="url\(#bf-look\)"><g id="bf-figure">[\s\S]+<\/g><\/g><g mask="url\(#bf-fade\)"><g filter="url\(#bf-back\)"><use href="#bf-figure"\/><\/g><\/g>$/, 'its own layer over the figure, the figure drawn once');
  // A head is drawn in its own frame: the same light, in the head's units.
  const head = headArt('c1', 'down', 0, { look: LOOKS.dark });
  assert.match(head, new RegExp(`<feOffset in="SourceAlpha" dx="${Number((back.width / CREW_HEAD_SCALE).toFixed(2))}" dy="0" result="l0"/>`));
  assert.match(head, /<linearGradient id="bf-fall" gradientUnits="userSpaceOnUse" x1="0" y1="28.33" x2="0" y2="108.33">/, 'a head lies above where the light begins to fall away');
});

test('privacy: the film is drawn from seats and characters alone, and says nothing of a role, a team, a name or a status', () => {
  const sources = RUNTIME.map(file => code(`${COMPONENT}/${file}`)).join('\n');
  assert.doesNotMatch(sources, /\b(?:role|team|faction|alien|insider|doctor|disabler|supplier|engineer|undercover|hacker|captain|impostor|traitor|health|injured|alive|dead|vote|secret|private|playerId|userId|uid|token|nickname)\b/i);
  // The roster reaches the film only through the hosted game's own check.
  const scene = code(`${COMPONENT}/boarding-film.mjs`);
  assert.match(scene, /import \{ publicRoster \} from '\.\.\/\.\.\/\.\.\/\.\.\/apps\/game\/hosted\/pregame-films\/boarding\/roster\.mjs';/);
  assert.equal((scene.match(/publicRoster\(/g) ?? []).length, 2, 'a scene and a preparation each check their roster');
  assert.doesNotMatch(scene, /options\.(?!roster\b|prepared\b)\w+/, 'only the roster and what was prepared are read from the options');
  assert.doesNotMatch(scene, /member\.(?!character\b|seat\b)\w+/, 'of a member, only its seat and its character');
});

test('the frame: sharp at the screen\'s own pixels, a step less when a phone cannot hold it; the mark as version 1 sized it', () => {
  assert.deepEqual([...QUALITY], [1, 0.8, 0.64, 0.5]);
  // Slow with its pictures drawn: past 22 ms a frame, eight in a run. Late while it still draws them: past 50 ms, a
  // limit a healthy page's frames stay under even with a picture drawn between them (the probe drives both).
  assert.deepEqual([SLOW_FRAME_MS, SLOW_FRAMES, LATE_FRAME_MS], [22, 8, 50]);
  assert.ok(LATE_FRAME_MS > SLOW_FRAME_MS * 2);
  const film = code(`${COMPONENT}/boarding-film.mjs`);
  assert.match(film, /const drawing = assets\.busy\(\) \|\| assets\.stats\.done !== bakedSoFar;/);
  assert.match(film, /limit = drawing \? LATE_FRAME_MS : SLOW_FRAME_MS/);
  assert.match(film, /remembered = Math\.max\(remembered, step - stats\.lateSteps\);/, 'the page remembers only a step taken with the pictures drawn');
  assert.match(film, /if \(drawing\) soften\(\);/);
  assert.match(code(`${COMPONENT}/engine.mjs`), /swap\(jobs\) \{\s+for \(const job of jobs\) \{ const at = pending\.findIndex\(p => p\.key === job\.key\); if \(at >= 0\) pending\[at\] = \{ \.\.\.job \}; \}/, 'only pictures still waiting are drawn another way');
  assert.ok(MEMORY_BUDGET === 112 * 1024 * 1024);
  assert.equal(markSize({ W: 780, H: 1688 }), Math.min(780 * 0.16, 1688 * 0.095));
  // The grain's place changes 24 times a second and is the same for the same time.
  assert.deepEqual(grainAt(1000), grainAt(1000));
  assert.deepEqual(grainAt(1000), grainAt(1000 + 1000 / 24 - 1));
  assert.notDeepEqual(grainAt(1000), grainAt(1000 + 1000 / 24 + 1));
  const { svg, width, height } = svgOf([10, 20, 100, 50], 2, '<g/>');
  assert.equal(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 100 50" width="200" height="100" preserveAspectRatio="none"><g/></svg>');
  assert.deepEqual([width, height], [200, 100]);
});

test('the display\'s wide framing: a row of five stands inside the corridor\'s walls, and no wall light shows through the crew', () => {
  const film = code(`${COMPONENT}/boarding-film.mjs`);
  // Rows on the display: 4 + 3, 4 + 4, 5 + 4. The outermost of a row stands (count − 1) / 2 gaps from the middle.
  const rows = film.match(/wide: \{ 7: \[(\d), (\d)\], 8: \[(\d), (\d)\], 9: \[(\d), (\d)\] \}/).slice(1).map(Number);
  assert.deepEqual(rows, [4, 3, 4, 4, 5, 4]);
  const [, five, four] = film.match(/gap = wide \? \(rows\.some\(n => n > 4\) \? (\d+) : (\d+)\)/).map(Number);
  assert.deepEqual([five, four], [96, 132]);
  const shoulder = 36; // half a standing figure's width, in the corridor's units
  assert.ok(2 * five + shoulder < HALL.half && 1.5 * four + shoulder < HALL.half, 'everyone inside the walls');
  // The walls' lamps and consoles put their light on the layer over the picture: it is cut away where anyone stands,
  // before the ceiling lamps over the crew are added.
  const inside = film.slice(film.indexOf('function drawInside('), film.indexOf('// ── What each moment needs drawn beforehand'));
  const cut = inside.indexOf("L.globalCompositeOperation = 'destination-out';"), hall = inside.indexOf('paintHall('), lamps = inside.indexOf('paintCone(');
  assert.ok(hall >= 0 && cut > hall && lamps > cut, 'the hall, then the cut, then the lamps');
  assert.match(inside, /for \(const stand of crew\) caster\.figure\(L, stand\.figure, \{ \.\.\.stand\.where, mix: 0, frame: \[L\.canvas\.width \/ view\.W, L\.canvas\.height \/ view\.H\] \}\);/);
  assert.match(code(`${COMPONENT}/cast.mjs`), /ctx\.setTransform\(fx, 0, 0, fy, 0, 0\);/, 'a figure drawn on the light\'s smaller canvas leaves it as it found it');
});

test('the check\'s record: every capture and probe check passed under the production headers; memory in budget; faster than today\'s film', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/boarding-film-check.mjs');
  assert.equal(record.version, BOARDING_FILM_VERSION);
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.environment, /Not a phone, not Safari: no phone's frame rate or memory was measured/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data: blob:/);
  assert.doesNotMatch(csp, /worker-src|'unsafe-eval'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 52, 'twenty moments at two sizes in full motion, six of them again with the device\'s Reduce motion');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.faults.length === 0, `${key} showed what its moment asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.deepEqual(c.violations, [], `${key}: no policy report at all`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(sha256(readFileSync(join(REPO, c.file))), c.sha256, `${key}: the picture recorded`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.deepEqual(['dusk', 'foot', 'faces', 'look', 'wake', 'lit'].map(state => record.captures[`${size}-${state}`].shot), ['dusk', 'foot', 'faces', 'door', 'wake', 'inside'], `${size}: every shot`);
    assert.deepEqual([1, 2, 3, 4, 5].map(i => record.captures[`${size}-still${i}`].still), [0, 1, 2, 3, 4], `${size}: the five held pictures`);
    for (const state of ['dusk', 'foot', 'look', 'lit', 'mark']) assert.notEqual(record.captures[`${size}-${state}-device-reduced`].still, null, `${size} ${state}: the device's Reduce motion gives a held picture`);
    assert.ok(record.captures[`${size}-night`].brightness < 14 && record.captures[`${size}-lit`].brightness > 30, `${size}: the night is the night`);
    assert.equal(record.captures[`${size}-seven`].crew, 7);
    assert.equal(record.captures[`${size}-nine`].crew, 9);
  }
  // The shared display's wide framing, at one pixel a point: every moment at the table display's size, five at 1920 × 1080.
  const wide = Object.entries(record.display);
  assert.deepEqual(wide.map(([key]) => key), [
    ...['dusk', 'foot', 'faces', 'look', 'wake', 'dark', 'lit', 'mark', 'seven', 'nine'].map(state => `display-1280x720-${state}`),
    ...['dusk', 'faces', 'dark', 'lit', 'nine'].map(state => `display-1920x1080-${state}`),
  ]);
  for (const [key, c] of wide) {
    assert.ok(c.ok && c.faults.length === 0, `${key} showed what its moment asks`);
    assert.deepEqual([c.problems, c.violations], [[], []], `${key}: no page error, failed request or policy report`);
    assert.equal(sha256(readFileSync(join(REPO, c.file))), c.sha256, `${key}: the picture recorded`);
  }
  for (const size of ['1280x720', '1920x1080']) {
    assert.deepEqual(['dusk', 'faces', 'dark', 'lit'].map(state => record.display[`display-${size}-${state}`].shot), ['dusk', 'faces', 'inside', 'inside'], `${size}: its shots`);
    assert.equal(record.display[`display-${size}-nine`].crew, 9, `${size}: a row of five`);
  }
  assert.equal(record.display['display-1280x720-seven'].crew, 7);
  assert.deepEqual(Object.keys(record.probe).sort(), ['asThePageComes', 'deviceReduced']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length >= 28 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
    const groups = new Set(run.checks.map(c => c.name.split(':')[0]));
    for (const group of ['pictures', 'memory', 'time', 'reduced', 'motion', 'lifecycle', 'roster']) assert.ok(groups.has(group), `probe ${mode}: ${group}`);
  }
  // The frame's steps of sharpness are driven on the probe's own clock, in full motion only.
  assert.equal(record.probe.asThePageComes.checks.filter(c => c.name.startsWith('sharpness:')).length, 4);
  assert.equal(record.probe.asThePageComes.checks.length, 34);
  assert.equal(record.probe.deviceReduced.checks.length, 28);
  assert.equal(record.probe.deviceReduced.deviceReduced, true);
  // Memory: both phone sizes at 2 and 3 pixels a point, all pictures drawn at once, within the budget.
  assert.deepEqual(record.memory.map(m => `${m.size}@${m.devicePixelRatio}`), ['390x844@2', '390x844@3', '430x932@2', '430x932@3']);
  for (const m of record.memory) {
    assert.ok(m.ok && m.failed === 0 && m.bytes <= MEMORY_BUDGET && m.nine.bytes <= MEMORY_BUDGET, `${m.size} at ${m.devicePixelRatio}x: ${(m.bytes / 1048576).toFixed(1)} MB`);
    assert.ok(Math.abs(m.bytes - m.plannedBytes) <= m.plannedBytes * 0.06, `${m.size} at ${m.devicePixelRatio}x: held what was planned`);
  }
  // Both films, measured the same way: the pilot reaches more pictures a second at the browser's own speed and slowed four times.
  assert.equal(record.pilotFasterThanToday, true);
  const rate = (run, cpu) => record.measured.find(m => m.run === run && m.cpuSlowdown === cpu).picturesASecond;
  for (const cpu of [1, 4]) {
    assert.ok(rate('pilot, pictures drawn first', cpu) >= rate('today', cpu) * 2, `CPU ${cpu}x: at least twice today's film (${rate('today', cpu)} → ${rate('pilot, pictures drawn first', cpu)})`);
    assert.ok(rate('pilot, pictures drawn as it plays', cpu) > rate('today', cpu), `CPU ${cpu}x: and still more when its pictures are drawn as it plays`);
    assert.deepEqual(record.measured.filter(m => m.cpuSlowdown === cpu).flatMap(m => m.problems), []);
  }
  assert.equal(record.measured.find(m => m.run === 'today').film, releasedClock.BOARDING_VERSION);
});

test('the renders\' record: the pilot at both sizes, full and reduced, and beside today\'s film, each exactly ten seconds', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/renders.json`));
  assert.equal(record.tool, 'design/tools/boarding-film-render.mjs');
  assert.equal(record.version, BOARDING_FILM_VERSION);
  assert.ok(record.sourceClean, 'rendered from a clean source');
  const videos = ['pilot-390x844', 'pilot-390x844-reduced', 'pilot-430x932', 'pilot-430x932-reduced', 'pilot-display-1280x720', 'compare-as-drawn', 'compare-as-played'];
  assert.deepEqual(Object.keys(record.renders).sort(), [...videos, 'pilot-sheet'].sort());
  for (const name of videos) {
    const r = record.renders[name];
    assert.deepEqual([r.frames, r.fps, r.streams], [600, '60/1', 1], `${name}: 600 frames at 60 a second, no sound`);
    assert.ok(Math.abs(r.durationS - 10) < 0.001, `${name}: ten seconds`);
    assert.ok(existsSync(join(REPO, r.file)) && sha256(readFileSync(join(REPO, r.file))) === r.sha256, `${name}: ${r.file}`);
  }
  assert.deepEqual([record.renders['pilot-390x844'].width, record.renders['pilot-390x844'].height, record.renders['pilot-430x932'].width, record.renders['pilot-430x932'].height], [390, 844, 430, 932]);
  assert.deepEqual([record.renders['pilot-display-1280x720'].width, record.renders['pilot-display-1280x720'].height, record.renders['pilot-display-1280x720'].crew], [1280, 720, 9], 'the display\'s wide framing, the largest crew');
  assert.equal(sha256(readFileSync(join(REPO, record.renders['pilot-sheet'].file))), record.renders['pilot-sheet'].sha256);
  // As played: each side's timing is what was measured, and said to be a reconstruction.
  assert.equal(record.cadence.cpuSlowdown, 4);
  assert.ok(record.cadence.pilot.picturesASecond > record.cadence.today.picturesASecond * 2);
  assert.ok(record.cadence.today.drawnAt.length > 20 && record.cadence.pilot.drawnAt.length > record.cadence.today.drawnAt.length);
  assert.match(record.renders['compare-as-played'].note, /reconstruction of measured timing, not a screen recording, and not a phone/);
});
