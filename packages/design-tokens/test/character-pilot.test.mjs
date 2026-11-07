// The character pilot and the crew (docs/design/character-pilot.md): the owner's redesign of the
// nine crew members, drawn on the approved rig's skeletons in the new style (noir light, comic ink,
// a hand-drawn line), their faces traced from the owner's own art. Mira, Nova and Atlas came first
// as the pilot, which the owner approved; the other six followed on the owner's go-ahead. These
// tests hold the owner's decisions of 7 November 2026, the palette rule, the traced faces and what
// the rig moves on them, that every gesture of the rig still draws, determinism, the icon frame and
// the review renders' record. A proposal: nothing here is adopted, and the rig's own sources are
// not changed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GESTURES, STAND } from '../../../design/board-motion/figures/gestures.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { blinkAt, idle, stridePose, walk, wave } from '../../../design/character-pilot/anim.mjs';
import { BUILDS, COLOUR_PROPOSALS, CREW_ORDER, PILOT_CAST, PILOT_ORDER, SUIT } from '../../../design/character-pilot/cast.mjs';
import { pilotFigureSvg } from '../../../design/character-pilot/figure.mjs';
import { TRACED_HEADS } from '../../../design/character-pilot/head.mjs';
import { squircle } from '../../../design/character-pilot/ink.mjs';
import { portraitSvg } from '../../../design/character-pilot/portrait.mjs';

const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const refs = svg => [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);
const colours = svg => new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()));
const nearest = hex => Math.min(...Object.values(FACTION_ACCENTS).map(accent => cie76(hex, accent)));

/** The box round a traced head's paths (an absolute moveto, then relative linetos, per outline). */
function pathBox(paths) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [, d] of paths) {
    let cmd = 'M', x = 0, y = 0, pending = [];
    for (const token of d.match(/[MlzZ]|-?(?:\d+\.?\d*|\.\d+)/g)) {
      if (/^[MlzZ]$/.test(token)) { cmd = token; pending = []; continue; }
      pending.push(Number(token));
      if (pending.length < 2) continue;
      const [a, b] = pending;
      pending = [];
      if (cmd === 'M') { x = a; y = b; } else { x += a; y += b; }
      box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y);
    }
  }
  return box;
}

function wellFormed(svg, label) {
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${label}: one SVG`);
  assert.ok(!/NaN|undefined|Infinity/.test(svg), `${label}: every number is a number`);
  assert.ok(!/<text[\s>]/.test(svg), `${label}: no words drawn as text`);
  const all = ids(svg);
  assert.equal(new Set(all).size, all.length, `${label}: an id twice`);
  for (const ref of refs(svg)) assert.ok(all.includes(ref), `${label}: #${ref} has no target`);
}

test('the owner\'s decisions: the pilot of three, then all nine; Mira without a hijab, Atlas heavy and Juno slim, the proposed colours', () => {
  assert.deepEqual(PILOT_ORDER, ['c8', 'c6', 'c4']);
  assert.deepEqual(PILOT_ORDER.map(id => PILOT_CAST[id].sign), ['Mira', 'Nova', 'Atlas']);
  assert.deepEqual(CREW_ORDER, ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
  assert.deepEqual(CREW_ORDER.map(id => PILOT_CAST[id].sign), ['Vega', 'Rigel', 'Lyra', 'Atlas', 'Orion', 'Nova', 'Juno', 'Mira', 'Echo']);
  assert.deepEqual(Object.keys(PILOT_CAST).sort(), [...CREW_ORDER].sort());
  assert.equal(PILOT_CAST.c8.hairStyle, 'long');
  assert.ok(!Object.values(PILOT_CAST).some(c => c.hairStyle === 'hijab'));
  // Atlas and Juno are told apart by build.
  assert.equal(PILOT_CAST.c4.build, 'heavy');
  assert.equal(PILOT_CAST.c7.build, 'slim');
  assert.ok(BUILDS.heavy.torso > BUILDS.regular.torso && BUILDS.heavy.belly > 0 && BUILDS.heavy.arm > BUILDS.slim.arm);
  const proposed = (id, role) => COLOUR_PROPOSALS.find(p => p.id === id && p.role === role).proposed;
  for (const id of ['c6', 'c9']) {
    assert.equal(PILOT_CAST[id].field, proposed(id, 'field'));
    assert.equal(PILOT_CAST[id].accent, proposed(id, 'accent'));
  }
});

test('colours keep away from the team colours: every proposal at least 40 from each accent, everything drawn at least the minimum', () => {
  for (const p of COLOUR_PROPOSALS) assert.ok(nearest(p.proposed) >= 40, `${p.sign} ${p.role} ${p.proposed}: ${nearest(p.proposed).toFixed(1)}`);
  // Why they changed: the redesign sheet's pink and purple came too close to red and the Alien's colour.
  assert.ok(nearest(COLOUR_PROPOSALS.find(p => p.sign === 'Nova' && p.role === 'field').sheet) < MIN_ACCENT_DISTANCE);
  assert.ok(nearest(COLOUR_PROPOSALS.find(p => p.sign === 'Echo' && p.role === 'field').sheet) < MIN_ACCENT_DISTANCE);
  for (const id of CREW_ORDER) {
    const c = PILOT_CAST[id];
    const drawn = new Set([...colours(pilotFigureSvg(c, STAND, { prefix: 'pc' })), ...colours(pilotFigureSvg(c, GESTURES.doorBack, { prefix: 'pb' })), ...colours(portraitSvg(c, { prefix: 'pp' }))]);
    for (const hex of drawn) assert.ok(nearest(hex) >= MIN_ACCENT_DISTANCE, `${c.sign}: ${hex} is ${nearest(hex).toFixed(1)} from a team colour`);
  }
  for (const hex of Object.values(SUIT)) assert.ok(nearest(hex) >= MIN_ACCENT_DISTANCE, `suit ${hex}`);
});

test('the faces are the owner\'s own art: each head traced from a kept drawing and fitted to the rig\'s head frame', () => {
  const root = new URL('../../../', import.meta.url);
  for (const id of CREW_ORDER) {
    const head = TRACED_HEADS[id], name = PILOT_CAST[id].sign.toLowerCase();
    assert.equal(head.id, id);
    // The drawing it was traced from is kept beside it, and the module says how it was made.
    assert.equal(readFileSync(new URL(`design/character-pilot/faces/source/${name}.png`, root)).subarray(1, 4).toString('latin1'), 'PNG');
    assert.match(readFileSync(new URL(`design/character-pilot/faces/${name}.mjs`, root), 'utf8'), /Generated by design\/tools\/character-pilot-trace\.py/);
    // Fitted by the eyes and the chin: the far eye left of the near one, both about the face's middle
    // (Echo's are behind the visor, so there are none to close); the neck leaving the jaw; the hair
    // within reach of the frame.
    if (id === 'c9') assert.deepEqual(head.eyes, []);
    else {
      const [far, near] = head.eyes;
      assert.ok(far[0] < near[0] && Math.abs(far[1]) < 4 && Math.abs(near[1]) < 4, `${name}: eyes`);
    }
    assert.ok(head.neck[1] > 10 && head.neck[1] < 22 && head.neck[2] > 3, `${name}: neck`);
    const box = pathBox(head.paths);
    assert.ok(box.minY > -38 && box.maxY < 40 && box.minX > -30 && box.maxX < 50, `${name}: ${JSON.stringify(box)}`);
    assert.ok(head.paths.length > 50 && head.paths.every(([fill, d]) => /^#[0-9A-F]{6}$/.test(fill) && d.startsWith('M') && d.endsWith('z')), `${name}: paths`);
    // The neck and hands are the face's skin.
    assert.equal(PILOT_CAST[id].skin, head.skin);
  }
});

test('the rig moves the traced faces: lids close over the drawn eyes, looking down shuts them, and only Mira\'s hair and Echo\'s locs swing', () => {
  const lids = svg => [...svg.matchAll(/<clipPath id="[^"]+-lid\d+"><ellipse cx="([^"]+)" cy="([^"]+)" rx="([^"]+)" ry="([^"]+)"\/><\/clipPath>/g)].map(m => m.slice(1).map(Number));
  const down = Object.values(GESTURES).find(g => g.view === 'down');
  for (const id of CREW_ORDER) {
    const c = PILOT_CAST[id];
    assert.deepEqual(lids(pilotFigureSvg(c, STAND, { prefix: 'l' })), []);
    assert.deepEqual(lids(pilotFigureSvg(c, STAND, { prefix: 'l', motion: { blink: 0.5 } })), TRACED_HEADS[id].eyes);
    assert.deepEqual(lids(pilotFigureSvg(c, STAND, { prefix: 'l', motion: { blink: 1 } })), TRACED_HEADS[id].eyes);
    assert.deepEqual(lids(pilotFigureSvg(c, down, { prefix: 'l' })), TRACED_HEADS[id].eyes);
    const still = pilotFigureSvg(c, STAND, { prefix: 's' }), swung = pilotFigureSvg(c, STAND, { prefix: 's', motion: { sway: 3, lift: -1 } });
    if (id === 'c8' || id === 'c9') {
      assert.equal(TRACED_HEADS[id].sway > 16, true);
      assert.match(swung, /skewX\(7\.13\) scale\(1 0\.958\)/);
      assert.notEqual(still, swung);
    } else {
      assert.equal(TRACED_HEADS[id].sway, null);
      assert.equal(still, swung);
    }
  }
});

test('every gesture of the rig, the walk and the three actions draw for each character, in one well-formed SVG each', () => {
  const poses = { STAND, ...GESTURES };
  for (let i = 0; i < 8; i += 1) poses[`walk${i}`] = stridePose(i / 8);
  for (const id of CREW_ORDER) {
    const c = PILOT_CAST[id];
    for (const [name, sk] of Object.entries(poses)) {
      const body = pilotFigureSvg(c, sk, { prefix: `g${id}` });
      wellFormed(body, `${c.sign} ${name}`);
      if ((sk.front ?? []).length) wellFormed(pilotFigureSvg(c, sk, { prefix: `g${id}`, layer: 'front' }), `${c.sign} ${name} front`);
    }
    for (const [name, at] of [['idle', idle], ['walk', walk], ['wave', wave]]) {
      for (const t of [0, 400, 900, 1700, 2600, 3199]) {
        const f = at(t, { seed: 3 });
        wellFormed(pilotFigureSvg(c, f.sk, { prefix: `a${id}`, motion: f.motion }), `${c.sign} ${name} ${t}`);
      }
    }
    for (const view of [0, 0.5, 1]) wellFormed(portraitSvg(c, { prefix: `p${id}`, motion: { blink: view } }), `${c.sign} portrait ${view}`);
  }
});

test('drawing is deterministic: the same skeleton, character and motion draw the same bytes', () => {
  for (const id of CREW_ORDER) {
    const f = walk(1234, { seed: 5 });
    assert.equal(pilotFigureSvg(PILOT_CAST[id], f.sk, { motion: f.motion }), pilotFigureSvg(PILOT_CAST[id], f.sk, { motion: f.motion }));
    assert.equal(portraitSvg(PILOT_CAST[id]), portraitSvg(PILOT_CAST[id]));
  }
});

test('the animation: brief, irregular blinks; the walk loops; the wave settles back to standing', () => {
  for (const seed of [3, 7, 11]) {
    let blinks = 0, inBlink = false, run = 0, longest = 0;
    for (let t = 0; t < 20000; t += 5) {
      const b = blinkAt(t, seed);
      assert.ok(b >= 0 && b <= 1);
      if (b > 0 && !inBlink) blinks += 1;
      run = b > 0 ? run + 5 : 0;
      longest = Math.max(longest, run);
      inBlink = b > 0;
    }
    assert.ok(blinks >= 4 && blinks <= 9, `seed ${seed}: ${blinks} blinks in 20 s`);
    assert.ok(longest <= 180, `seed ${seed}: a blink of ${longest} ms`);
  }
  // The walk cycle repeats every 760 ms, and every frame is a function of t alone.
  const a = walk(300).sk, b = walk(300 + 760).sk;
  for (const joint of ['pelvis', 'neck', 'head', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF', 'hipN', 'kN', 'aN', 'hipF', 'kF', 'aF']) {
    assert.ok(Math.hypot(a[joint][0] - b[joint][0], a[joint][1] - b[joint][1]) < 1e-9, `walk loop: ${joint}`);
  }
  assert.deepEqual(idle(2222, { seed: 3 }), idle(2222, { seed: 3 }));
  // The wave ends where it began: standing.
  const end = wave(3199).sk;
  for (const joint of ['head', 'sN', 'eN', 'wN']) assert.ok(Math.hypot(end[joint][0] - STAND[joint][0], end[joint][1] - STAND[joint][1]) < 3, joint);
});

test('the portraits are framed as iOS app icons: a superellipse with continuous corners', () => {
  const r = 54;
  for (const [x, y] of squircle(0, 0, r)) assert.ok(Math.abs(Math.abs(x / r) ** 5 + Math.abs(y / r) ** 5 - 1) < 1e-9);
  const svg = portraitSvg(PILOT_CAST.c6);
  assert.ok(/<clipPath id="pp-icon">/.test(svg));
});

test('the review renders are recorded: each file\'s hash, and each video exactly 288 frames at 30 fps', () => {
  const root = new URL('../../../', import.meta.url);
  const record = JSON.parse(readFileSync(new URL('design/character-pilot/review/renders.json', root), 'utf8'));
  const files = Object.keys(record.outputs).sort();
  assert.deepEqual(files, ['crew-motion-poster.png', 'crew-motion.mp4', 'crew-sheet.png', 'motion-poster.png', 'motion.mp4', 'sheet.png'].map(f => `design/character-pilot/review/${f}`));
  for (const file of files) {
    const bytes = readFileSync(new URL(file, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.outputs[file].sha256, file);
    assert.equal(bytes.length, record.outputs[file].bytes, file);
  }
  for (const name of ['motion.mp4', 'crew-motion.mp4']) {
    const video = record.outputs[`design/character-pilot/review/${name}`];
    assert.deepEqual([video.frames, video.fps, video.durationMs], [288, 30, 9600], name);
  }
});
