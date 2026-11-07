// mothership:dev-only
//
// The cinematic library's three pilots (design/cinematic/; docs/design/cinematic/): their frame
// functions, compositions, catalogue and cue sheets. These test the proposal's own modules: none
// of them is a rule, a server contract or a measurement of a phone; they hold the pilots to the
// approved films under them (S5, S2), to the server's timing and to what an audience may see.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fourRescueFrame } from '../../../design/board-v2/fx/medical-four.mjs';
import { slotsOf as fourSlotsOf } from '../../../design/board-v2/scenes/slots-four.mjs';
import { SCENES } from '../../../design/board-motion/scenes/index.mjs';
import { CAPSULE_FILM } from '../../../design/board-v2/films/capsule.mjs';
import { AUDIO as HOSPITAL_AUDIO, PILOT, VARIANTS as HOSPITAL_VARIANTS, cameraFrame, pilotEnd, releasePath, rescueCinematicFrame } from '../../../design/cinematic/pilots/hospital-rescue/film.mjs';
import { PASS_Z, WARD_LAYERS, WARD_SLOTS, displaySvg, filmItems, passItems, releaseItems } from '../../../design/cinematic/pilots/hospital-rescue/compose.mjs';
import { pulseAccentsSvg } from '../../../design/cinematic/pilots/hospital-rescue/art.mjs';
import { CASES as RESCUE_CASES, reviewOutcome } from '../../../design/cinematic/pilots/hospital-rescue/stage.mjs';
import { slotsOf } from '../../../design/board-v2/scenes/slots.mjs';
import { fourBerthKit } from '../../../design/board-v2/fx/medical-four.mjs';
import { skeletonOf } from '../../../design/board-motion/figures/gestures.mjs';
import { figureItems } from '../../../design/cinematic/lib/scene.mjs';
import { AUDIO as BLACKHOLE_AUDIO, BEATS, boardFrame, displayFrame, filmEnd } from '../../../design/cinematic/pilots/blackhole/film.mjs';
import { insertSvg, overlaySvg } from '../../../design/cinematic/pilots/blackhole/compose.mjs';
import { AUDIO as TALK_AUDIO, CASES as TALK_CASES, PAGE, exitEnd, pageEnd, pageFrame } from '../../../design/cinematic/pilots/private-talk/film.mjs';
import { capsuleEnd } from '../../../design/board-v2/films/capsule.mjs';
import { COVER_PHASES, DECISION_PHASES, NO_RUNTIME_COVER, PRESENTATION_STAGES, mayCover, presentationIn, stageKindOf } from '../../../design/cinematic/lib/visibility.mjs';
import { pageSvg } from '../../../design/cinematic/pilots/private-talk/compose.mjs';
import { CATALOGUE, REQUESTS } from '../../../design/cinematic/catalogue/catalogue.mjs';
import { CUES, mix } from '../../../design/cinematic/lib/audio.mjs';

const BERTHS = ['H1', 'H2', 'H3', 'H4'];
const OCCUPANTS = [{ seat: 8, character: 'c8', slot: 'H2', health: 'Injured' }, { seat: 9, character: 'c9', slot: 'H4', health: 'Eliminated' }];
const step = (end, ms = 40) => Array.from({ length: Math.ceil(end / ms) + 1 }, (_, i) => Math.min(end, i * ms));
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test('Pilot 1 is a pure function of t, the berth and the variant: the same frame every time, and nothing about a person', () => {
  assert.equal(rescueCinematicFrame.length, 2);
  for (const variant of HOSPITAL_VARIANTS) {
    for (const t of [0, 950, 2600, 3550, 4500]) {
      const a = JSON.stringify(rescueCinematicFrame(t, 'H1', { variant, surface: 'display' }));
      assert.equal(a, JSON.stringify(rescueCinematicFrame(t, 'H1', { variant, surface: 'display' })));
      assert.doesNotMatch(a, /"(seat|character|role|faction|doctor|actor)"/i);
    }
  }
});

test('Pilot 1 ends on its end in every variant on the snapshot\'s placement, and draws nothing before its start', () => {
  for (const berth of BERTHS) {
    for (const variant of HOSPITAL_VARIANTS) {
      const end = pilotEnd(variant);
      // The snapshot places the patient outside the Hospital: released, gone from the berth (arrive: the cut's closing panel settles).
      const out = rescueCinematicFrame(end, berth, { variant });
      assert.equal(out.done, true);
      assert.equal(out.release.phase, 'gone');
      assert.equal(out.arrive, 1);
      assert.equal(rescueCinematicFrame(end - 1, berth, { variant }).done, false);
      assert.equal(rescueCinematicFrame(end - 1, berth, { variant }).release.offBed, true, `${berth} ${variant}: off the bed before the end`);
      // Only if the snapshot still has the patient at this berth does the film end there, sitting up.
      const stays = rescueCinematicFrame(end, berth, { variant, leaves: false });
      assert.equal(stays.release, null);
      assert.equal(stays.patient.blend, 1);
      for (const t of step(end - 1)) assert.equal(rescueCinematicFrame(t, berth, { variant, leaves: false }).release, null);
      const before = rescueCinematicFrame(-1, berth, { variant });
      assert.equal(before.hatch, 0);
      assert.equal(before.rings.length, 0);
    }
  }
  assert.equal(pilotEnd('full'), 6200);
  assert.equal(pilotEnd('short'), 1600);
  assert.equal(pilotEnd('reduced'), 1760);
});

test('Pilot 1 releases the patient to the snapshot\'s place: off the bed, out of the ward, the berth empty, never left in a bed', () => {
  for (const berth of BERTHS) {
    const path = releasePath(berth);
    const { bed } = fourBerthKit(berth);
    for (const variant of HOSPITAL_VARIANTS) {
      for (const t of step(pilotEnd(variant) - 1, 20)) {
        const frame = rescueCinematicFrame(t, berth, { variant, surface: 'display' });
        if (!frame.release?.offBed) continue;
        // The berth is empty, as the board draws it: no screen, no lamp of its own.
        assert.equal(frame.base.inset.kind, 'off', `${berth} ${variant} ${t}`);
        assert.equal(frame.base.lamp.state, 'none', `${berth} ${variant} ${t}`);
        // The patient is never drawn in the bed again: only the walker, beside or beyond it, or nothing.
        const items = filmItems(frame, { berthId: berth, character: 'c2', surface: 'display', prefix: 't' });
        const walker = releaseItems(frame, { berthId: berth, character: 'c2', prefix: 'tr' });
        const figures = items.filter(item => item.kind === 'figure');
        assert.deepEqual(figures.map(item => item.svg), walker.filter(item => item.kind === 'figure').map(item => item.svg), `${berth} ${variant} ${t}`);
        if (frame.release.phase === 'walk') {
          const x = path.stand[0] + (path.exit[0] - path.stand[0]) * frame.release.walk;
          assert.ok(x <= bed.x || x >= bed.x + bed.w, `${berth} ${t}: the walker is beside or past the bed`);
        }
      }
    }
    // The walk leaves by the nearer edge and ends past the panel.
    assert.ok(path.exit[0] < 0 || path.exit[0] > 1024);
    assert.equal(path.side, bed.x + bed.w / 2 < 512 ? 'left' : 'right');
  }
});

test('Pilot 1\'s closing panel draws the patient where the snapshot places them: Room A in crew clothes, or the Jail in prison clothes', () => {
  for (const [which, name] of Object.entries(RESCUE_CASES)) {
    const { film, occupants, subject, destination } = reviewOutcome(9, name);
    const slot = slotsOf(destination.room, 9).find(entry => entry.id === destination.slotId);
    const outfit = destination.room === 'jail' ? 'prison' : 'crew';
    assert.equal(subject.detained, which === 'detained');
    const late = displaySvg(6100, { berthId: film.berth, subject, occupants, assets: 'A', roomAssets: 'R', destination }).svg;
    assert.ok(late.includes(`R/${destination.room}.back.svg`), which);
    const expected = figureItems({ character: subject.character, sk: skeletonOf(slot.gesture), outfit, at: slot.at, scale: slot.scale, mirror: slot.mirror, depth: slot.depth, prefix: `hdd${subject.seat}` });
    assert.ok(late.includes(expected[0].svg), `${which}: the patient at ${destination.slotId} in ${outfit} clothes`);
    const early = displaySvg(5000, { berthId: film.berth, subject, occupants, assets: 'A', roomAssets: 'R', destination }).svg;
    assert.ok(!early.includes(`R/${destination.room}.back.svg`), `${which}: no panel before the release`);
  }
  assert.deepEqual(reviewOutcome(9, RESCUE_CASES.free).destination.room, 'room-a');
  assert.deepEqual(reviewOutcome(9, RESCUE_CASES.detained).destination.room, 'jail');
});

test('Pilot 1\'s board treatment covers nothing a player selects or reads: its layers under the name tags, masked off the other berths and the label, no lettering', () => {
  const keepClear = [{ x: 620, y: 300, w: 300, h: 280 }, { x: 4, y: 4, w: 120, h: 30 }];
  // Under every name tag (3500), marker, press area (4000), slot hit (4200), room label (5000) and bar (6400).
  for (const z of Object.values(PASS_Z.board)) assert.ok(z < 3500, `board z ${z}`);
  // The board's grade tints only the room's art: over the back picture, under every berth layer and figure.
  assert.ok(PASS_Z.board.grade < Math.min(...Object.values(WARD_LAYERS)) * 2 + 1);
  for (const berth of BERTHS) {
    for (const variant of HOSPITAL_VARIANTS) {
      for (const t of step(pilotEnd(variant) - 1, 50)) {
        const frame = rescueCinematicFrame(t, berth, { variant, surface: 'board' });
        const items = passItems(frame, { berthId: berth, surface: 'board', prefix: 'tb', keepClear });
        assert.equal(items.filter(item => item.kind === 'keep-mask').length, 1);
        for (const item of items) {
          assert.ok(item.z < 3500, `${berth} ${variant} ${t} ${item.kind} z ${item.z}`);
          if (!['iris', 'keep-mask'].includes(item.kind)) assert.ok(item.svg.startsWith('<g mask="url(#tb-keep)">'), `${berth} ${variant} ${t} ${item.kind}: masked`);
        }
      }
    }
  }
  // The mask cuts every keep-clear rect out of the pass.
  const mask = passItems(rescueCinematicFrame(3550, 'H1', { surface: 'board' }), { berthId: 'H1', surface: 'board', prefix: 'tb', keepClear }).find(item => item.kind === 'keep-mask').svg;
  for (const r of keepClear) assert.ok(mask.includes(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#000"/>`));
  // THUMP and BEEP are the display cut's: on the board the accents are the same with or without the lettering.
  const pulse = rescueCinematicFrame(PILOT.full.thump[0] + 200, 'H1', { surface: 'board' });
  assert.ok(pulse.sfx.opacity > 0);
  const { chest, scale } = fourBerthKit('H1');
  const silent = { ...pulse, sfx: { opacity: 0 } };
  assert.equal(pulseAccentsSvg('tb', pulse, { chest, scale, surface: 'board' }), pulseAccentsSvg('tb', silent, { chest, scale, surface: 'board' }));
  assert.notEqual(pulseAccentsSvg('tb', pulse, { chest, scale, surface: 'display' }), pulseAccentsSvg('tb', silent, { chest, scale, surface: 'display' }));
  // The display cut keeps its own order and draws no mask.
  const cut = passItems(pulse, { berthId: 'H1', surface: 'display', prefix: 'tc', keepClear });
  assert.ok(cut.every(item => item.kind !== 'keep-mask' && !item.svg.startsWith('<g mask=')));
});

test('Pilot 1 keeps the approved S5 under it: its inset, lamp, scan, hologram, pulse and the patient\'s pose switch are S5\'s at every moment', () => {
  for (const berth of BERTHS) {
    for (const t of step(5560)) {
      const s5 = fourRescueFrame(t, berth);
      // S5's berth devices are S5's until the patient is off the bed (then the berth is empty);
      // with the patient staying (the snapshot keeps them at the berth), S5's to its own end.
      const leaves = t < PILOT.full.release.stand[1];
      const { base } = rescueCinematicFrame(t, berth, { variant: 'full', leaves });
      for (const key of ['stage', 'inset', 'lamp', 'scan', 'hologram', 'pulse', 'patient', 'announce']) assert.deepEqual(base[key], s5[key], `${berth} ${t} ${key}`);
      assert.equal(base.drone.frame, s5.drone.frame);
      // The drone only rises off the recovering patient (the lift), never sideways and never lower than S5's.
      if (s5.drone.at) {
        assert.equal(base.drone.at[0], s5.drone.at[0]);
        assert.ok(base.drone.at[1] <= s5.drone.at[1] + 1e-9);
      } else assert.equal(base.drone.at, null);
    }
  }
});

test('Pilot 1\'s reduced variant has three still states and no travel, camera, shake, flash, particle or lettering', () => {
  for (const berth of BERTHS) {
    for (const t of step(1760)) {
      const frame = rescueCinematicFrame(t, berth, { variant: 'reduced', surface: 'display' });
      assert.ok(frame.patient.blend === 0 || frame.patient.blend === 1);
      assert.equal(frame.patient.blend, t >= PILOT.reduced.switchAt ? 1 : 0);
      // The third still: the berth empty, the patient faded out over 80 ms, never walking.
      if (t >= PILOT.reduced.releaseAt && !frame.done) {
        assert.equal(frame.release.walk, 0);
        assert.equal(frame.release.opacity, t >= PILOT.reduced.releaseAt + PILOT.reduced.fade ? 0 : frame.release.opacity);
        assert.equal(frame.base.lamp.state, 'none');
      } else if (!frame.done) assert.equal(frame.release, null);
      assert.equal(frame.camera, null);
      assert.equal(frame.letterbox, 0);
      assert.equal(frame.rings.length, 0);
      for (const key of ['burst', 'speed', 'sfx', 'searchlight', 'scanFan', 'trail']) assert.equal(frame[key].opacity, 0, key);
      assert.equal(frame.sparks, 0);
      assert.equal(frame.charge, 0);
    }
  }
});

test('Pilot 1\'s short variant is over in 1.6 s and has no camera; the full display cut\'s camera never leaves the scene', () => {
  for (const t of step(1600)) assert.equal(rescueCinematicFrame(t, 'H2', { variant: 'short', surface: 'display' }).camera, null);
  for (const berth of BERTHS) {
    for (const t of step(6200, 20)) {
      const { camera } = rescueCinematicFrame(t, berth, { variant: 'full', surface: 'display' });
      if (!camera) continue;
      const { k, center } = cameraFrame(camera);
      assert.ok(k >= 1920 / 1024 - 1e-9);
      assert.ok(center[0] - 960 / k >= -1e-6 && center[0] + 960 / k <= 1024 + 1e-6, `${berth} ${t} x`);
      assert.ok(center[1] - 540 / k >= -1e-6 && center[1] + 540 / k <= 768 + 1e-6, `${berth} ${t} y`);
    }
  }
});

test('Pilot 1\'s ward slots and layers are the successor table\'s (slots-four.mjs) for 7, 8 and 9 players', () => {
  for (const roster of [7, 8, 9]) {
    for (const slot of fourSlotsOf('hospital', roster)) {
      const copy = WARD_SLOTS[slot.id];
      for (const key of ['at', 'pressAt', 'depth', 'scale', 'mirror', 'gesture', 'down']) assert.deepEqual(copy[key], slot[key], `${roster} ${slot.id} ${key}`);
    }
  }
  assert.deepEqual(Object.keys(WARD_LAYERS).sort(), ['berth-four-h1', 'berth-four-h1-head', 'berth-four-h2', 'berth-four-h2-head', 'berth-four-h3', 'berth-four-h4']);
});

test('Pilot 1\'s display composition is one 1920 x 1080 SVG with no repeated id and no baked words', () => {
  for (const berth of BERTHS) {
    const destination = { room: 'room-a', slotId: 'A2', seats: [{ seat: 2, character: 'c2', slot: 'A2', health: 'Healthy' }, { seat: 1, character: 'c1', slot: 'A1', health: 'Healthy' }], subjectSeat: 2 };
    for (const t of [0, 800, 1500, 2600, 3300, 3550, 3800, 4500, 5000, 5300, 5600, 5900, 6150]) {
      const { svg } = displaySvg(t, { berthId: berth, subject: { seat: 2, character: 'c2' }, occupants: OCCUPANTS.filter(o => o.slot !== berth), assets: 'assets', destination });
      assert.match(svg, /^<svg [^>]*viewBox="0 0 1920 1080"/);
      const all = ids(svg);
      assert.equal(new Set(all).size, all.length, `${berth} ${t}: ${all.filter((id, i) => all.indexOf(id) !== i).slice(0, 3)}`);
      assert.doesNotMatch(svg, /<text\b/);
    }
  }
});

test('Pilot 2 plays behind the crew by default: 2.4 s from the Sync on every surface, the stage cut only as its own variant', () => {
  for (const t of step(BEATS.board.end, 20)) {
    const f = boardFrame(t);
    assert.ok(f.space >= 0 && f.space <= BEATS.board.peak, `${t}: the rooms' own art always faintly there`);
    if (t < BEATS.board.ship[0] || t >= BEATS.board.ship[1]) assert.equal(f.ship, null, `${t}`);
    assert.ok(!('title' in f), 'no title behind the crew');
  }
  assert.equal(boardFrame(BEATS.board.end).done, true);
  assert.equal(boardFrame(BEATS.board.end - 1).done, false);
  for (const t of step(BEATS.reduced.end - 1, 20)) {
    const f = boardFrame(t, { reduced: true });
    assert.equal(f.ship, null);
    assert.deepEqual(f.hole, { r: 0.17, spin: 0.6, glow: 1, flare: 0 }, `${t}: the still blackhole, no spin or flare`);
  }
  assert.equal(boardFrame(BEATS.reduced.end, { reduced: true }).done, true);
  // The stage cut keeps its own beats, for the owner's decision on a presentation stage (R1).
  for (const t of step(5200, 20)) {
    const f = displayFrame(t);
    if (t < BEATS.display.shipIn[0]) assert.equal(f.ship, null);
    if (t < BEATS.display.title[0]) assert.equal(f.title.opacity, 0);
    assert.ok(f.dim >= 0 && f.dim <= 0.75);
  }
  assert.equal(displayFrame(5200).done, true);
  // No extra time is assumed: the default and the reduced still are the same length on the display and a phone.
  for (const surface of ['display', 'phone']) {
    assert.equal(filmEnd(surface, 'full'), 2400);
    assert.equal(filmEnd(surface, 'reduced'), 1440);
  }
  assert.equal(filmEnd('display', 'stage'), 5200);
  assert.equal(filmEnd('insert', 'full'), 3600);
});

test('Pilot 2 covers nothing by default: no layer over the board on any surface, its space only in the rooms\' art, no word', () => {
  const phone = { width: 390, height: 844, board: { x: 0, y: 60, w: 390, h: 700 }, rooms: [{ x: 0, y: 60, w: 390, h: 200 }] };
  const display = { width: 1920, height: 1080, board: { x: 0, y: 50, w: 1920, h: 960 }, rooms: [{ x: 0, y: 50, w: 640, h: 480 }, { x: 640, y: 50, w: 640, h: 480 }] };
  for (const [surface, layout] of [['phone', phone], ['display', display]]) {
    for (const variant of ['full', 'reduced']) {
      const end = filmEnd(surface, variant);
      let drawn = 0;
      for (const t of step(end - 1, 40)) {
        const { svg, art } = overlaySvg(t, layout, { surface, variant });
        assert.equal(svg, '', `${surface} ${variant} ${t}: nothing over the board`);
        assert.doesNotMatch(art, /<text\b|<image\b|<foreignObject\b/);
        const all = ids(art);
        assert.equal(new Set(all).size, all.length, `${surface} ${variant} ${t}`);
        if (art) drawn += 1;
      }
      assert.ok(drawn > 0, `${surface} ${variant}: the art plays`);
      assert.deepEqual(overlaySvg(end, layout, { surface, variant }).art, '', `${surface} ${variant}: the board alone at the end`);
    }
  }
  // The stage cut is the one covering form: the display only, and lettered as paths, never as text.
  for (const t of step(5200, 200)) {
    const out = overlaySvg(t, display, { surface: 'display', variant: 'stage' });
    assert.equal(out.art, '');
    assert.doesNotMatch(out.svg, /<text\b/);
  }
  for (const t of step(3600, 300)) {
    for (const titled of [true, false]) {
      const { svg } = insertSvg(t, { titled });
      assert.doesNotMatch(svg, /<text\b|<image\b/);
    }
  }
});

test('Pilot 3\'s entrance is over inside the five-second result stage and plays S2\'s own clock, untouched', () => {
  assert.ok(PAGE.entrance.end <= 5000);
  assert.ok(PAGE.reduced.entrance.end <= 5000);
  assert.equal(PAGE.entrance.s2End, CAPSULE_FILM.entrance.settledAt);
  for (const t of step(4900, 50)) {
    const page = pageFrame('entrance', t);
    assert.equal(page.s2.stage, 'result');
    assert.equal(page.s2.t, t);
  }
  assert.equal(pageFrame('entrance', 4900).done, true);
  assert.equal(pageFrame('talk', 0).panels.capsule, 1);
  // The exit is the live game's: S2's own on the board, on every surface. The page has no exit case.
  assert.deepEqual([...TALK_CASES], ['entrance', 'talk']);
  assert.equal(PAGE.exit, undefined);
  assert.equal(PAGE.reduced.exit, undefined);
  assert.equal(exitEnd('full'), capsuleEnd('exit') + 300);
  assert.equal(exitEnd('reduced'), 700);
});

test('Pilot 3\'s page draws the public pair by S2\'s functions and nothing of the conversation', () => {
  const seats = [
    { seat: 1, character: 'c1', room: 'room-a', slot: 'A1', health: 'Healthy', jailed: false },
    { seat: 3, character: 'c3', room: 'room-a', slot: 'A3', health: 'Healthy', jailed: false },
    { seat: 5, character: 'c5', room: 'room-b', slot: 'B2', health: 'Healthy', jailed: false },
    { seat: 6, character: 'c6', room: 'room-b', slot: 'B4', health: 'Healthy', jailed: false },
  ];
  const ctx = { pair: [seats[0], seats[2]], seats, slotsOf: room => fourSlotsOf(room, 9), location: room => ({ 'room-a': 'Room A', 'room-b': 'Room B' })[room], scenes: SCENES, exchangeId: 'x-test', reduced: false };
  for (const caseName of TALK_CASES) {
    for (const t of step(pageEnd(caseName, 'full') - 1, 250)) {
      const { svg } = pageSvg(caseName, t, ctx);
      if (!svg) continue;
      assert.doesNotMatch(svg, /declar|claim|side|speak|Blue|Red/i);
      const all = ids(svg);
      assert.equal(new Set(all).size, all.length, `${caseName} ${t}`);
    }
  }
});

test('the catalogue covers every scene of the brief\'s coverage table, each fully specified', () => {
  // The brief's coverage table, with issue #188's two openings in the match's order (the brand intro
  // before the lobby, the boarding after the role reveal).
  const scenes = ['Game N brand intro', 'Lobby and identity', 'Role reveal and private card', 'Crew boarding before Round 1', 'Core board and movement', 'Turn and contextual action', 'Captain and Officer', 'Captain RELEASE', 'Captain EJECT', 'Ordinary shot and injury', 'Blackout Strike', 'Protection and Phantom Clone', 'Doctor Rescue', 'Hospital panel and death', 'Supplier and weapons', 'Insider investigation', 'Hacker investigation', 'Hack Spaceship', 'Engineer', 'Private Talk capsule', 'Blackhole and Sync', 'Navigation', 'Promises', 'Windows and drawing', 'Arrival, no survivors and recovery'];
  assert.deepEqual(CATALOGUE.map(s => s.scene), scenes);
  for (const s of CATALOGUE) {
    for (const key of ['trigger', 'audience', 'fields', 'beats', 'durations', 'final', 'cancel', 'precedence', 'audio', 'reduced', 'rosters', 'concurrency', 'assets', 'gaps']) assert.ok(s[key] !== undefined && s[key] !== '', `${s.id} ${key}`);
    // A scene names one request or several; each must be in the request table.
    if (s.request) for (const id of [s.request].flat()) assert.ok(REQUESTS.some(r => r.id === id), `${s.id} ${id}`);
  }
});

test('every cue sheet uses known synthesized cues, mixes to finite samples at -3 dBFS, and the conversation has none', () => {
  const sheets = [...Object.values(HOSPITAL_AUDIO), ...Object.values(BLACKHOLE_AUDIO), ...Object.values(TALK_AUDIO)];
  for (const sheet of sheets) for (const entry of sheet) assert.ok(CUES[entry.cue], entry.cue);
  assert.deepEqual(TALK_AUDIO.talk, []);
  const samples = mix(HOSPITAL_AUDIO.full, pilotEnd('full'));
  let peak = 0;
  for (const v of samples) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); }
  assert.ok(Math.abs(20 * Math.log10(peak) + 3) < 0.01);
});

test('a covering film plays only where nobody decides; in every other phase the board treatment plays, covering nothing', () => {
  for (const kind of DECISION_PHASES) {
    assert.equal(mayCover(kind), false, kind);
    assert.equal(presentationIn(kind), 'board', kind);
  }
  for (const kind of COVER_PHASES) {
    assert.equal(mayCover(kind), true, kind);
    assert.equal(presentationIn(kind), 'cover', kind);
    assert.equal(presentationIn(kind, { hasCover: false }), 'board', kind);
  }
  // A phase this module does not know, or none, never lets a film cover the board.
  for (const kind of [undefined, null, '', 'LOBBY', 'PRESENTATION', 'BLACKHOLE_STAGE']) assert.equal(presentationIn(kind), 'board', String(kind));
  // The two lists are disjoint: the contract candidate's 15 phase kinds at 79418e7.
  const all = [...DECISION_PHASES, ...COVER_PHASES];
  assert.equal(new Set(all).size, 15);
  // The pilots' covering forms fit inside the stage they may cover: the capsule page inside the five-second result stage.
  assert.ok(mayCover('HACK_RESULT'));
  assert.ok(PAGE.entrance.end <= 5000 && PAGE.reduced.entrance.end <= 5000);
  // The Rescue arrives as a decision opens (the round's resolution), so its default everywhere is the board treatment.
  for (const kind of ['JAIL_VOTE', 'NAV_CAPTAIN_CONFIRM', 'NAV_OFFICER_CONFIRM', 'NAV_TIE', 'CAPTAIN_ELECTION', 'PRE_TURN', 'ORDINARY_TURN']) assert.equal(presentationIn(kind), 'board', kind);
});

test('P27: the Blackhole\'s stage cut plays only in its own six-second stage, and never before Backend names that stage', () => {
  const stage = PRESENTATION_STAGES.blackhole;
  assert.equal(stage.decision, 'P27');
  assert.equal(stage.durationMs, 6000);
  assert.equal(stage.kind, null, 'missing contract field (R16): no phase kind yet');
  assert.ok(!DECISION_PHASES.includes(stage.proposedKind) && !COVER_PHASES.includes(stage.proposedKind), 'the proposed name is a request, not a known phase');
  // Missing field: without Backend's name nothing reaches the stage; the board treatment plays, in every phase.
  for (const kind of [...DECISION_PHASES, ...COVER_PHASES, stage.proposedKind, null]) assert.equal(presentationIn(kind, { film: 'blackhole', surface: 'display' }), 'board', String(kind));
  // With the name Backend publishes (whatever it is), only that phase is the stage, and only on the display.
  const named = 'SOME_PUBLISHED_KIND';
  assert.equal(stageKindOf('blackhole', named), named);
  assert.deepEqual([...stage.surfaces], ['display']);
  assert.equal(presentationIn(named, { film: 'blackhole', stageKind: named, surface: 'display' }), 'stage');
  assert.equal(presentationIn(named, { film: 'blackhole', stageKind: named, surface: 'phone' }), 'board', 'phones play the board treatment in the stage');
  assert.equal(presentationIn(named, { film: 'blackhole', stageKind: named }), 'board', 'no surface named: board (fail closed)');
  for (const kind of [...DECISION_PHASES, ...COVER_PHASES]) assert.equal(presentationIn(kind, { film: 'blackhole', stageKind: named, surface: 'display' }), 'board', `the Blackhole covers in no other phase: ${kind}`);
  // The stage cut fits inside the stage: it ends before the full 60-second Jail vote starts, and takes no time from it.
  assert.ok(filmEnd('display', 'stage') <= stage.durationMs, `${filmEnd('display', 'stage')} ms`);
  assert.ok(filmEnd('display', 'reduced') <= stage.durationMs && filmEnd('phone', 'full') <= stage.durationMs);
  // No other film has a stage of its own.
  assert.deepEqual(Object.keys(PRESENTATION_STAGES), ['blackhole']);
  assert.equal(stageKindOf('eject', named), null);
});

test('no covering EJECT: the cut is a review study that nothing mounts; S7 on the board in every phase', () => {
  assert.deepEqual([...NO_RUNTIME_COVER], ['eject']);
  for (const kind of [...DECISION_PHASES, ...COVER_PHASES, 'SOME_PUBLISHED_KIND']) {
    assert.equal(presentationIn(kind, { film: 'eject' }), 'board', kind);
    assert.equal(presentationIn(kind, { film: 'eject', stageKind: kind, surface: 'display' }), 'board', `${kind}: no stage either`);
  }
});

test('the Rescue never hides, greys or moves the patient\'s authoritative figure; at its own berth the film draws no second patient', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../../../design/cinematic/pilots/hospital-rescue/stage.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /classList\.toggle\('v2-fig--away'/, 'never marked away');
  assert.doesNotMatch(src, /visibility = playing/, 'never hidden while the film plays');
  assert.doesNotMatch(src, /translate = arriving/, 'never moved');
  for (const berth of BERTHS) {
    for (const t of [600, 2400, 3600, 4800]) {
      const frame = rescueCinematicFrame(t, berth, { variant: 'full', leaves: false });
      if (frame.done) continue;
      const own = filmItems(frame, { berthId: berth, character: 'c2', surface: 'board', prefix: 't', drawPatient: false });
      assert.equal(own.filter(item => item.kind === 'figure' || item.kind === 'figure-front').length, 0, `${berth} ${t}: no second patient`);
      const drawn = filmItems(frame, { berthId: berth, character: 'c2', surface: 'board', prefix: 't' });
      assert.ok(drawn.length > own.length, `${berth} ${t}: only the figure is left out`);
    }
  }
});
