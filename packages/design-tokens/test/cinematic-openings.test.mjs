// The two openings (issue #188; docs/design/cinematic/openings.md): the 2 s Game N brand intro on the
// app's first entry, and the 10 s crew boarding after everyone is Ready and before Round 1. These
// tests hold what the brief fixes: the exact lengths, the exact brand words (as page text, never drawn
// as text), the boarding's one input (the public roster: seat and character, 7, 8 or 9) and that
// nothing else can reach its order, poses, light or camera, nobody singled out, reduced motion's held
// pictures, one palette, unique ids and determinism. They test the proposal's own modules: nothing
// here is a game rule, and no stage for the boarding exists yet (R17).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CREW } from '../../../design/board-motion/figures/crew.mjs';
import { skeletonOf } from '../../../design/board-motion/figures/gestures.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { CATALOGUE, REQUESTS } from '../../../design/cinematic/catalogue/catalogue.mjs';
import { figureItems } from '../../../design/cinematic/lib/scene.mjs';
import { PILOTS } from '../../../design/cinematic/pilots/index.mjs';
import { FIGURE_BOX, LAYERS, boardingSvg, cameraOf, isNarrow } from '../../../design/cinematic/pilots/openings/boarding.mjs';
import { brandSvg } from '../../../design/cinematic/pilots/openings/brand.mjs';
import { GROUP, boardingWalk, crewInside, crewOutside, footAt, groupSpots } from '../../../design/cinematic/pilots/openings/crew.mjs';
import { BOARDING_BEATS, BOARDING_END, BOARDING_STILLS, BRAND_BEATS, BRAND_END, CAMERA, CLIMB_MS, ENTRANCE, PAIRS_AT, STEP_IN_MS, STILL_FADE_MS, TITLE, VARIANTS, boardingFrame, brandFrame } from '../../../design/cinematic/pilots/openings/film.mjs';
import { PLAYER_COUNTS, REVIEW_ROSTERS, publicRoster, reviewRoster, rosterFromCrew } from '../../../design/cinematic/pilots/openings/roster.mjs';
import { BRAND, handoverWipe } from '../../../design/cinematic/pilots/openings/wordmark.mjs';

const SURFACES = Object.freeze([[390, 844], [320, 568], [1920, 1080]]);
/** More phones and screens, for the checks that are cheap enough to run on every one. */
const MORE_SURFACES = Object.freeze([...SURFACES, [360, 800], [412, 915], [430, 932], [1280, 720], [2560, 1080]]);
const BRAND_SAMPLES = [0, 30, 60, 160, 260, 420, 460, 700, 880, 1200, 1380, 1600, 1780, 1960, 1999, 2000];
const BOARD_SAMPLES = [0, 120, 600, 1400, 1999, 2000, 2400, 3300, 4300, 4800, 5200, 6100, 6380, 6560, 6720, 6860, 6899, 6900, 7050, 7400, 7600, 8150, 8700, 8900, 9000, 9280, 9500, 9600, 9780, 9960, 9999, 10000];
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const refs = svg => [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);
const colours = svg => new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()));
const nearAccents = hex => Object.entries(FACTION_ACCENTS).filter(([, accent]) => cie76(hex, accent) < MIN_ACCENT_DISTANCE).map(([faction]) => faction);
/** Every colour any crew character can be drawn in (their public appearance, any pose): exempt from the palette rule. */
const CREW_COLOURS = new Set(Object.keys(CREW).flatMap(character => ['stand', 'standFolded', 'standBack'].map(g => skeletonOf(g)).concat([boardingWalk(0.3)])
  .flatMap(sk => [...colours(figureItems({ character, sk, at: [0, 0], scale: 1, depth: 2, prefix: 'x' }).map(item => item.svg).join(''))])));

function wellFormed(svg, label) {
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), label);
  assert.ok(!/<text[\s>]/.test(svg), `${label}: no words drawn as text`);
  const all = ids(svg);
  assert.equal(new Set(all).size, all.length, `${label}: an id twice`);
  for (const ref of refs(svg)) assert.ok(all.includes(ref), `${label}: url(#${ref}) has no target`);
  assert.ok(!/NaN|undefined|Infinity/.test(svg), `${label}: a broken number`);
}

test('the brand intro lasts exactly 2,000 ms, its beats inside it, and ends on the app\'s night', () => {
  assert.equal(BRAND_END, 2000);
  for (const [name, [from, to]] of Object.entries(BRAND_BEATS)) assert.ok(from >= 0 && to <= BRAND_END && from < to, name);
  for (const variant of VARIANTS) {
    assert.equal(brandFrame(1999, { variant }).done, false);
    assert.equal(brandFrame(2000, { variant }).done, true);
    // The night at the end: the wipe through (full) or the fade out (reduced), well before the last frame.
    const last = brandFrame(1966, { variant });
    if (variant === 'full') assert.equal(last.handover, 1);
    else assert.equal(last.fade, 0);
  }
  // Reduced motion: the finished mark fades in and out; nothing slams, draws on or sweeps.
  for (const t of BRAND_SAMPLES) {
    const f = brandFrame(t, { variant: 'reduced' });
    assert.deepEqual([f.slam, f.draw, f.fill, f.credit, f.sweep, f.handover], [1, 1, 1, 1, 0, 0], `t ${t}`);
  }
});

test('the brand\'s words are exactly "Game N" and "by Plan B", set as page text and never drawn as text', () => {
  assert.equal(BRAND.name, 'Game N');
  assert.equal(BRAND.credit, 'by Plan B');
  for (const [w, h] of SURFACES) for (const variant of VARIANTS) for (const t of BRAND_SAMPLES) {
    const out = brandSvg(t, { variant, width: w, height: h });
    wellFormed(out.svg, `brand ${w}x${h} ${variant} ${t}`);
    assert.equal(out.words.name, 'Game N');
    assert.equal(out.words.credit, 'by Plan B');
  }
  // The mark is on screen to be read for most of the intro, in both variants.
  for (const variant of VARIANTS) {
    const shown = Array.from({ length: 60 }, (_, i) => brandSvg((i * 1000) / 30, { variant }).words.visible).filter(Boolean).length;
    assert.ok(shown >= 30, `${variant}: shown in ${shown} of 60 frames`);
  }
  assert.deepEqual(PILOTS['brand-intro'].variants, VARIANTS);
});

test('the boarding lasts exactly 10,000 ms; the brief\'s beats are kept and the cut inside falls in the dark', () => {
  assert.equal(BOARDING_END, 10000);
  assert.deepEqual(Object.values(BOARDING_BEATS).map(([a, b]) => [a, b]), [[0, 2000], [2000, 4800], [4800, 6900], [6900, 9000], [9000, 10000]]);
  for (const variant of VARIANTS) {
    assert.equal(boardingFrame(9999, { variant }).done, false);
    assert.equal(boardingFrame(10000, { variant }).done, true);
  }
  // The last aboard before the door comes down; the door shut and the light out before the cut.
  const lastAboard = PAIRS_AT[1] + CLIMB_MS + STEP_IN_MS;
  assert.ok(lastAboard <= ENTRANCE.door[0] + 40 && ENTRANCE.door[1] < BOARDING_BEATS.interior[0], `last aboard at ${lastAboard}`);
  const before = boardingFrame(6899), after = boardingFrame(6900);
  assert.deepEqual([before.world, after.world], ['outside', 'inside']);
  assert.equal(before.door, 1); assert.equal(before.light, 0); assert.equal(after.lights, 0);
  // The mark, then the hand-over, through by the last encoded frame (9,966.7 ms at 30 fps).
  assert.ok(TITLE.stamp[0] >= 9000 && TITLE.handover[1] <= 9966);
  assert.equal(boardingFrame(9966).handover, 1);
});

test('the boarding\'s one input is the public roster: 7, 8 or 9 members, seat and character only, in seat order', () => {
  assert.deepEqual(PLAYER_COUNTS, [7, 8, 9]);
  for (const n of PLAYER_COUNTS) assert.equal(reviewRoster(n).length, n);
  const nine = REVIEW_ROSTERS[9].map(m => ({ ...m }));
  // Anything else given with a member is dropped, so it cannot reach the picture.
  const secret = nine.map((m, i) => ({ ...m, role: i % 2 ? 'Alien' : 'Doctor', faction: i % 3 ? 'red' : 'blue', code: true, ability: 'Rescue' }));
  assert.deepEqual(publicRoster(secret), publicRoster(nine));
  for (const t of [1400, 4300, 8600]) for (const [w, h] of SURFACES) {
    assert.equal(boardingSvg(t, { roster: secret, width: w, height: h }).svg, boardingSvg(t, { roster: nine, width: w, height: h }).svg, `t ${t} ${w}`);
  }
  // Seat order, whatever order the roster arrives in.
  const shuffled = [...nine].reverse();
  assert.deepEqual(publicRoster(shuffled).map(m => m.seat), nine.map(m => m.seat));
  assert.equal(boardingSvg(4300, { roster: shuffled }).svg, boardingSvg(4300, { roster: nine }).svg);
  // What is not a roster is refused.
  assert.throws(() => publicRoster(nine.slice(0, 6)));
  assert.throws(() => publicRoster([...nine, { seat: 9, character: 'c1' }]));
  assert.throws(() => publicRoster(nine.map((m, i) => (i ? m : { ...m, character: 'c10' }))));
  assert.throws(() => publicRoster(nine.map((m, i) => (i ? m : { ...m, seat: nine[1].seat }))));
  assert.deepEqual(rosterFromCrew('c3,c7,c1,c9,c5,c2,c8'), REVIEW_ROSTERS[7]);
  // Every character appears across the review rosters.
  assert.deepEqual(new Set(Object.values(REVIEW_ROSTERS).flat().map(m => m.character)), new Set(Object.keys(CREW)));
});

test('nobody is singled out: the schedule, places, poses and light belong to seat order alone, never to a character', () => {
  for (const n of PLAYER_COUNTS) {
    // The crew layer's schedule takes no character at all; places are the same whoever stands in them.
    for (const t of [0, 1500, 3000, 4500, 6000]) {
      const out = crewOutside(n, t);
      for (const m of out) assert.deepEqual(Object.keys(m).sort(), ['i', 'light', 'mirror', 'opacity', 'scale', 'sk', 'state', 'x', 'y', 'z'].sort());
    }
    for (const narrow of [false, true]) {
      const spots = groupSpots(n, { narrow });
      assert.equal(spots.length, n);
      // Every member stands in one of the same three standing poses and takes the light of its place.
      for (const s of spots) assert.ok(['stand', 'standFolded', 'standBack'].includes(s.gesture));
      const lit = crewInside(n, { lights: 1, narrow });
      for (const m of lit) assert.ok(m.light > 0.99, 'everyone is lit once the lights are up');
    }
    // Swapping two members' characters swaps only who is drawn where: the crew's places are the same.
    const roster = REVIEW_ROSTERS[n].map(m => ({ ...m }));
    const swapped = roster.map((m, i) => (i === 0 ? { ...m, character: roster[1].character } : i === 1 ? { ...m, character: roster[0].character } : m));
    for (const t of [2400, 8600]) {
      const a = boardingSvg(t, { roster }).crew, b = boardingSvg(t, { roster: swapped }).crew;
      assert.deepEqual(a.map(({ character, ...rest }) => rest), b.map(({ character, ...rest }) => rest), `t ${t}`);
    }
    // Pairs in seat order reach the ramp's foot one after another; an odd last member walks alone.
    const feet = Array.from({ length: n }, (_, i) => footAt(i, n));
    for (let i = 2; i < n; i += 1) assert.ok(feet[i] > feet[i - 2], `${n}: member ${i}`);
  }
});

test('every member is drawn: walking toward the ship, standing in the corridor, and nobody left outside', () => {
  for (const n of PLAYER_COUNTS) for (const [w, h] of SURFACES) {
    const roster = REVIEW_ROSTERS[n];
    const walking = boardingSvg(1400, { roster, width: w, height: h });
    assert.equal(walking.crew.length, n, `${n} ${w}: all walking at 1.4 s`);
    assert.ok(walking.crew.every(m => m.state === 'ground'));
    // Listed in drawing order (the far lane first); every seat once.
    assert.deepEqual(walking.crew.map(m => m.seat).sort((a, b) => a - b), roster.map(m => m.seat));
    assert.equal(boardingSvg(6700, { roster, width: w, height: h }).crew.length, 0, `${n} ${w}: all aboard at 6.7 s`);
    const inside = boardingSvg(8600, { roster, width: w, height: h });
    assert.equal(inside.crew.length, n);
    assert.deepEqual(new Set(inside.crew.map(m => m.character)), new Set(roster.map(m => m.character)));
  }
  // In the corridor every member stands wholly in the frame, from the cut inside to the end of the push-in, on every phone and screen.
  for (const n of PLAYER_COUNTS) for (const [w, h] of MORE_SURFACES) for (const t of [6900, 8600, 9960]) {
    const out = boardingSvg(t, { roster: REVIEW_ROSTERS[n], width: w, height: h });
    assert.equal(out.crew.length, n);
    const cam = out.camera, k = h / cam.vh;
    assert.deepEqual(cam, cameraOf(boardingFrame(t), isNarrow(w, h)));
    for (const m of out.crew) {
      const [l, r, top, bottom] = FIGURE_BOX.map(v => v * m.scale);
      const label = `${n} ${w}x${h} ${t}: seat ${m.seat}`;
      assert.ok(w / 2 + (m.x + l - cam.cx) * k >= 0 && w / 2 + (m.x + r - cam.cx) * k <= w, `${label} across`);
      assert.ok(h / 2 + (m.y + top - cam.cy) * k >= 0 && h / 2 + (m.y + bottom - cam.cy) * k <= h, `${label} down`);
    }
  }
  // The group's rows stand between each other's places, so every face shows (no one directly behind another in the next row).
  for (const layout of [GROUP.wide, GROUP.narrow]) for (const n of PLAYER_COUNTS) {
    const rows = layout.rows[n];
    assert.equal(rows.flat().length, n);
    for (let r = 1; r < rows.length; r += 1) for (const x of rows[r]) for (const back of rows[r - 1]) assert.ok(Math.abs(x - back) >= 40, `${n}: row ${r} at ${x}`);
  }
});

test('reduced motion: five held pictures fading in from the night, nothing moving in them, the same 10 s', () => {
  assert.equal(BOARDING_STILLS.length, 5);
  assert.equal(BOARDING_STILLS[0].at, 0);
  for (const [w, h] of SURFACES) {
    for (const [i, still] of BOARDING_STILLS.entries()) {
      const next = BOARDING_STILLS[i + 1]?.at ?? 9700;
      const settled = still.at + STILL_FADE_MS;
      const a = boardingSvg(settled, { variant: 'reduced', roster: REVIEW_ROSTERS[8], width: w, height: h }).svg;
      const b = boardingSvg(next - 1, { variant: 'reduced', roster: REVIEW_ROSTERS[8], width: w, height: h }).svg;
      assert.equal(a, b, `still ${i + 1} on ${w}x${h} holds still`);
      assert.equal(boardingFrame(settled, { variant: 'reduced' }).still, i);
    }
    // It fades to the night by the end.
    assert.equal(boardingFrame(9966, { variant: 'reduced' }).fade, 0);
  }
  const f = boardingFrame(4000, { variant: 'reduced' });
  assert.equal(f.handover, 0);
});

test('reduced motion\'s pictures show nobody half there: no figure held mid-fade or cut by the frame, and everyone inside', () => {
  for (const [w, h] of MORE_SURFACES) for (const n of PLAYER_COUNTS) {
    for (const [i, still] of BOARDING_STILLS.entries()) {
      const out = boardingSvg(still.at + STILL_FADE_MS, { variant: 'reduced', roster: REVIEW_ROSTERS[n], width: w, height: h });
      const cam = out.camera, k = h / cam.vh;
      for (const m of out.crew) {
        const label = `${w}x${h} ${n} still ${i + 1} seat ${m.seat}`;
        assert.equal(m.opacity, 1, `${label}: held whole`);
        const [l, r, top, bottom] = FIGURE_BOX.map(v => v * m.scale);
        assert.ok(w / 2 + (m.x + l - cam.cx) * k >= 0 && w / 2 + (m.x + r - cam.cx) * k <= w, `${label}: inside the frame across`);
        assert.ok(h / 2 + (m.y + top - cam.cy) * k >= 0 && h / 2 + (m.y + bottom - cam.cy) * k <= h, `${label}: inside the frame down`);
      }
      if (out.frame.world === 'inside') assert.equal(out.crew.length, n, `${w}x${h} ${n} still ${i + 1}: everyone inside`);
    }
  }
  // Full motion keeps its walk in across the frame's edge and its fade into the door's light.
  assert.ok(boardingSvg(4300, { roster: REVIEW_ROSTERS[9] }).crew.some(m => m.opacity < 1));
});

test('both openings end on the night alone: the ink cut\'s band has left the frame on any surface', () => {
  const xs = markup => markup.match(/points="([^"]+)"/)[1].split(' ').map(p => Number(p.split(',')[0]));
  for (const [w, h] of MORE_SURFACES) {
    assert.ok(Math.min(...xs(handoverWipe('t', { width: w, height: h, v: 1 }).band)) >= w, `${w}x${h}: the band has gone`);
    const mid = xs(handoverWipe('t', { width: w, height: h, v: 0.5 }).band);
    assert.ok(Math.min(...mid) < w && Math.max(...mid) > 0, `${w}x${h}: the band crosses the frame`);
  }
  // Each film's last frames draw that finished cut over the night (the brand at 1,966 ms, the boarding at 9,966 ms).
  for (const [w, h] of SURFACES) {
    assert.ok(brandSvg(1966, { width: w, height: h }).svg.includes(handoverWipe('gn', { width: w, height: h, v: 1 }).band), `brand ${w}x${h}`);
    assert.ok(boardingSvg(9966, { roster: REVIEW_ROSTERS[8], width: w, height: h }).svg.includes(handoverWipe('gb', { width: w, height: h, v: 1 }).band), `boarding ${w}x${h}`);
  }
});

test('every frame is one self-contained SVG: unique ids, every reference resolved, no words drawn, deterministic', () => {
  for (const [w, h] of SURFACES) for (const variant of VARIANTS) for (const n of PLAYER_COUNTS) for (const t of BOARD_SAMPLES) {
    const out = boardingSvg(t, { variant, roster: REVIEW_ROSTERS[n], width: w, height: h });
    wellFormed(out.svg, `boarding ${w}x${h} ${variant} ${n} ${t}`);
    assert.equal(out.words.title, 'Game N');
  }
  for (const layer of LAYERS) wellFormed(boardingSvg(4300, { roster: REVIEW_ROSTERS[9], layer }).svg, layer);
  // The environment alone draws no figure; the crew alone draws no world.
  assert.equal(boardingSvg(4300, { roster: REVIEW_ROSTERS[9], layer: 'environment' }).svg.includes('-p0'), false);
  assert.equal(boardingSvg(4300, { roster: REVIEW_ROSTERS[9], layer: 'crew' }).svg.includes('-sky'), false);
  for (const t of [777, 4321, 8642]) assert.equal(boardingSvg(t, { roster: REVIEW_ROSTERS[7] }).svg, boardingSvg(t, { roster: REVIEW_ROSTERS[7] }).svg);
  assert.equal(brandSvg(900).svg, brandSvg(900).svg);
});

test('one palette: no colour drawn comes within the accent distance of a faction accent, but the crew\'s own', () => {
  const drawn = new Set();
  for (const [w, h] of SURFACES) for (const variant of VARIANTS) {
    for (const t of BRAND_SAMPLES) for (const hex of colours(brandSvg(t, { variant, width: w, height: h }).svg)) drawn.add(hex);
    for (const t of BOARD_SAMPLES) for (const hex of colours(boardingSvg(t, { variant, roster: REVIEW_ROSTERS[9], width: w, height: h }).svg)) if (!CREW_COLOURS.has(hex)) drawn.add(hex);
  }
  assert.ok(drawn.size > 20);
  for (const hex of drawn) assert.deepEqual(nearAccents(hex), [], `${hex} is within ${MIN_ACCENT_DISTANCE} of a faction accent`);
});

test('the openings are on the stage, in the gallery\'s catalogue, and the boarding names its missing stage', () => {
  for (const id of ['brand-intro', 'boarding']) {
    assert.ok(PILOTS[id], id);
    assert.deepEqual(Object.keys(PILOTS[id].surfaces).sort(), ['display', 'phone']);
    assert.ok(CATALOGUE.some(s => s.id === id), id);
  }
  const boarding = CATALOGUE.find(s => s.id === 'boarding');
  assert.equal(boarding.request, 'R17');
  assert.ok(REQUESTS.some(r => r.id === 'R17' && r.scene === 'boarding'));
  // The camera's tracks stay inside the boarding and the cuts are where the film says.
  assert.equal(CAMERA.narrow.find(k => k.cut).t, BOARDING_BEATS.approach[0]);
  for (const track of [CAMERA.wide, CAMERA.narrow, CAMERA.inside.wide, CAMERA.inside.narrow]) for (const key of track) assert.ok(key.t >= 0 && key.t <= BOARDING_END);
});
