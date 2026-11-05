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
import { AUDIO as HOSPITAL_AUDIO, PILOT, VARIANTS as HOSPITAL_VARIANTS, cameraFrame, pilotEnd, rescueCinematicFrame } from '../../../design/cinematic/pilots/hospital-rescue/film.mjs';
import { WARD_LAYERS, WARD_SLOTS, displaySvg } from '../../../design/cinematic/pilots/hospital-rescue/compose.mjs';
import { AUDIO as BLACKHOLE_AUDIO, BEATS, displayFrame, filmEnd, phoneFrame, reducedFrame } from '../../../design/cinematic/pilots/blackhole/film.mjs';
import { insertSvg, overlaySvg } from '../../../design/cinematic/pilots/blackhole/compose.mjs';
import { AUDIO as TALK_AUDIO, PAGE, pageEnd, pageFrame } from '../../../design/cinematic/pilots/private-talk/film.mjs';
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

test('Pilot 1 ends on its end in every variant, the patient sat up, and draws nothing before its start', () => {
  for (const berth of BERTHS) {
    for (const variant of HOSPITAL_VARIANTS) {
      const end = pilotEnd(variant);
      assert.equal(rescueCinematicFrame(end, berth, { variant }).done, true);
      assert.equal(rescueCinematicFrame(end, berth, { variant }).patient.blend, 1);
      assert.equal(rescueCinematicFrame(end - 1, berth, { variant }).done, false);
      const before = rescueCinematicFrame(-1, berth, { variant });
      assert.equal(before.hatch, 0);
      assert.equal(before.rings.length, 0);
    }
  }
  assert.equal(pilotEnd('full'), 5600);
  assert.equal(pilotEnd('short'), 1600);
  assert.equal(pilotEnd('reduced'), 1760);
});

test('Pilot 1 keeps the approved S5 under it: its inset, lamp, scan, hologram, pulse and the patient\'s pose switch are S5\'s at every moment', () => {
  for (const berth of BERTHS) {
    for (const t of step(5560)) {
      const s5 = fourRescueFrame(t, berth);
      const { base } = rescueCinematicFrame(t, berth, { variant: 'full' });
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

test('Pilot 1\'s reduced variant has two still states and no travel, camera, shake, flash, particle or lettering', () => {
  for (const berth of BERTHS) {
    for (const t of step(1760)) {
      const frame = rescueCinematicFrame(t, berth, { variant: 'reduced', surface: 'display' });
      assert.ok(frame.patient.blend === 0 || frame.patient.blend === 1);
      assert.equal(frame.patient.blend, t >= PILOT.reduced.switchAt ? 1 : 0);
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
    for (const t of step(5600, 20)) {
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
    for (const t of [0, 800, 1500, 2600, 3300, 3550, 3800, 4500, 5300, 5600]) {
      const { svg } = displaySvg(t, { berthId: berth, subject: { seat: 2, character: 'c2' }, occupants: OCCUPANTS.filter(o => o.slot !== berth), assets: 'assets' });
      assert.match(svg, /^<svg [^>]*viewBox="0 0 1920 1080"/);
      const all = ids(svg);
      assert.equal(new Set(all).size, all.length, `${berth} ${t}: ${all.filter((id, i) => all.indexOf(id) !== i).slice(0, 3)}`);
      assert.doesNotMatch(svg, /<text\b/);
    }
  }
});

test('Pilot 2 plays only its own beats: no ship before its passage, no title before its stamp, and every surface ends', () => {
  for (const t of step(5200, 20)) {
    const f = displayFrame(t);
    if (t < BEATS.display.shipIn[0]) assert.equal(f.ship, null);
    if (t < BEATS.display.title[0]) assert.equal(f.title.opacity, 0);
    assert.ok(f.dim >= 0 && f.dim <= 0.75);
  }
  assert.equal(displayFrame(5200).done, true);
  assert.equal(phoneFrame(2400).done, true);
  assert.equal(reducedFrame(1640, 'display').done, true);
  assert.equal(reducedFrame(1440, 'phone').done, true);
  assert.equal(filmEnd('display', 'full'), 5200);
  assert.equal(filmEnd('phone', 'full'), 2400);
  assert.equal(filmEnd('insert', 'full'), 3600);
});

test('Pilot 2 bakes no word but its title and draws nothing outside the board\'s rooms on a phone', () => {
  const layout = { width: 390, height: 844, board: { x: 0, y: 60, w: 390, h: 700 }, rooms: [{ x: 0, y: 60, w: 390, h: 200 }] };
  for (const t of step(2400, 100)) {
    const { svg } = overlaySvg(t, layout, { surface: 'phone', variant: 'full' });
    assert.doesNotMatch(svg, /<text\b/);
    const all = ids(svg);
    assert.equal(new Set(all).size, all.length);
  }
  for (const t of step(5200, 200)) assert.doesNotMatch(overlaySvg(t, { ...layout, width: 1920, height: 1080, board: { x: 0, y: 50, w: 1920, h: 960 } }, { surface: 'display', variant: 'full' }).svg, /<text\b/);
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
  assert.equal(pageFrame('exit', pageEnd('exit', 'full')).done, true);
  assert.equal(pageFrame('talk', 0).panels.capsule, 1);
});

test('Pilot 3\'s page draws the public pair by S2\'s functions and nothing of the conversation', () => {
  const seats = [
    { seat: 1, character: 'c1', room: 'room-a', slot: 'A1', health: 'Healthy', jailed: false },
    { seat: 3, character: 'c3', room: 'room-a', slot: 'A3', health: 'Healthy', jailed: false },
    { seat: 5, character: 'c5', room: 'room-b', slot: 'B2', health: 'Healthy', jailed: false },
    { seat: 6, character: 'c6', room: 'room-b', slot: 'B4', health: 'Healthy', jailed: false },
  ];
  const ctx = { pair: [seats[0], seats[2]], seats, slotsOf: room => fourSlotsOf(room, 9), location: room => ({ 'room-a': 'Room A', 'room-b': 'Room B' })[room], scenes: SCENES, exchangeId: 'x-test', reduced: false };
  for (const caseName of ['entrance', 'talk', 'exit']) {
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
  const scenes = ['Lobby and identity', 'Role reveal and private card', 'Core board and movement', 'Turn and contextual action', 'Captain and Officer', 'Captain RELEASE', 'Captain EJECT', 'Ordinary shot and injury', 'Blackout Strike', 'Protection and Phantom Clone', 'Doctor Rescue', 'Hospital panel and death', 'Supplier and weapons', 'Insider investigation', 'Hacker investigation', 'Hack Spaceship', 'Engineer', 'Private Talk capsule', 'Blackhole and Sync', 'Navigation', 'Promises', 'Windows and drawing', 'Arrival, no survivors and recovery'];
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
  const samples = mix(HOSPITAL_AUDIO.full, 6000);
  let peak = 0;
  for (const v of samples) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); }
  assert.ok(Math.abs(20 * Math.log10(peak) + 3) < 0.01);
});
