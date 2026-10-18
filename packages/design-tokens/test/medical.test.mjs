// mothership:dev-only
//
// The Hospital's medical films (design/board-v2/films/medical.mjs, fx/medical.mjs,
// js/medical-fixtures.mjs, js/medical-view.mjs; docs/design/hospital-films.md): what a berth shows
// from the server's values, the films' beats and reduced variants, where their parts go in the
// panel, where a film may play, and the review page's synthetic outcomes. These test the proposal's
// own modules: none of them is a rule, a server contract or a measurement of a phone.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CRITICAL, FLATLINE, RESCUE, berthState, clinicalBerth, criticalFrame, dronePosition, filmBerth, flatlineEnd, flatlineFrame, medicalContracts, rescueEnd, rescueFrame, rescueTag } from '../../../design/board-v2/films/medical.mjs';
import { DOCK, DRONE, DRONE_MIN_FIT, DRONE_SCENE, INSET, INSET_MIN_WIDTH, LAMP_STATES, MIN_ACCENT_DISTANCE, RESCUE_TONES, TRACE_KINDS, berthKit, droneFit, droneSvg, hoverAt, insetBox, lampSvg, medicalColorDistances, pulseSvg, rescueCrossSvg, tagBox, vitalsInsetSvg } from '../../../design/board-v2/fx/medical.mjs';
import { fitBoardV2, slotRects } from '../../../design/board-v2/js/fit.mjs';
import { medicalOutcome, medicalSeats, serverMedical } from '../../../design/board-v2/js/medical-fixtures.mjs';
import { outcomeWords } from '../../../design/board-v2/js/medical-view.mjs';
import { WARD_BERTHS } from '../../../design/board-v2/scenes/hospital-ward.mjs';

const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const meets = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

test('the rescue tag reads the server\'s values alone and promises nothing', () => {
  assert.deepEqual(rescueTag({ rescueOpportunity: 'NEXT_NORMAL_ROUND', rescueDueAfterRound: 3 }), { tone: 'next', text: 'R3', label: 'Rescue possible until the end of round 3' });
  assert.deepEqual(rescueTag({ rescueOpportunity: 'CURRENT_NORMAL_ROUND', rescueDueAfterRound: 4 }), { tone: 'current', text: 'R4', label: 'Rescue possible this round, round 4' });
  assert.deepEqual(rescueTag({ rescueOpportunity: 'NO_ADDITIONAL_ROUND', rescueDueAfterRound: null }), { tone: 'none', text: '', label: 'No Rescue round left' });
  assert.equal(rescueTag({ rescueOpportunity: 'CLOSED', rescueDueAfterRound: null }), null);
  assert.equal(rescueTag(null), null);
  assert.throws(() => rescueTag({ rescueOpportunity: 'NO_ADDITIONAL_ROUND', rescueDueAfterRound: 5 }));
  assert.throws(() => rescueTag({ rescueOpportunity: 'NEXT_NORMAL_ROUND', rescueDueAfterRound: null }));
  assert.throws(() => rescueTag({ rescueOpportunity: 'LATER', rescueDueAfterRound: 2 }));
});

test('a berth shows its occupant\'s public facts: the lamp red in the due round, the detention tag, a body\'s equipment off', () => {
  const injured = due => ({ location: 'Hospital', health: 'Injured', jailed: false, medical: serverMedical(2, due) });
  assert.equal(berthState(injured(3)).lamp, 'red');
  assert.equal(berthState(injured(2)).lamp, 'amber');
  assert.equal(berthState({ ...injured(2), jailed: true }).detention, true);
  assert.deepEqual(berthState({ location: 'Hospital', health: 'Eliminated', jailed: false, medical: null }), { monitor: 'off', lamp: 'off', bedLight: 'off', tag: null, detention: false });
  assert.equal(berthState({ location: 'Room A', health: 'Healthy' }).monitor, null);
  assert.throws(() => berthState({ location: 'Hospital', health: 'Healthy' }));
});

test('the critical state\'s loops count nothing; its reduced variant is still; an admission boots the monitor first', () => {
  // Every loop repeats within the least common multiple of their periods: nothing in them counts down.
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const period = [CRITICAL.sweepMs, CRITICAL.lampMs, CRITICAL.breathMs].reduce((a, b) => (a * b) / gcd(a, b));
  for (const t of [0, 300, 1999, 7777]) assert.deepEqual(criticalFrame(t), criticalFrame(t + 3 * period));
  for (const t of [0, 750, 3999]) assert.deepEqual(criticalFrame(t, { reduced: true }), criticalFrame(0, { reduced: true }));
  assert.equal(criticalFrame(100, { entryT: 100 }).monitor.kind, 'boot');
  assert.equal(criticalFrame(0, { entryT: 0 }).figure.opacity, 0);
  assert.equal(criticalFrame(240, { entryT: 240 }).figure.opacity, 1);
  assert.equal(criticalFrame(100, { entryT: 100 }).lamp.on, false);
  assert.equal(criticalFrame(400, { entryT: 400 }).tag.opacity, 1);
  assert.equal(criticalFrame(40, { reduced: true, entryT: 40 }).tag.opacity, 0.5);
});

test('the rescue: its beats in order, the drone from the Hospital\'s dock and back, one pulse, words once, 5 to 6 seconds', () => {
  assert.ok(rescueEnd() >= 5000 && rescueEnd() <= 6000);
  const order = ['before', 'alert', 'arrive', 'unfold', 'scan', 'charge', 'pulse', 'recover', 'depart', 'done'];
  let last = 0, said = false, pulses = 0;
  for (let t = -100; t <= rescueEnd() + 100; t += 10) {
    const frame = rescueFrame(t, 'H1');
    assert.ok(order.indexOf(frame.stage) >= last, `${t}: ${frame.stage}`);
    last = order.indexOf(frame.stage);
    if (said) assert.ok(frame.announce || frame.done, `${t}: the words withdrawn`);
    said = said || frame.announce;
    if (frame.pulse.frame === 1) pulses += 1;
    assert.deepEqual(rescueFrame(t, 'H1', { healer: 4, cause: 'x', role: 'y' }), frame);
  }
  assert.ok(said && pulses > 0 && pulses <= (RESCUE.pulse[1] - RESCUE.pulse[0]) / 10);
  assert.deepEqual(dronePosition(RESCUE.arrive[0], 'H5'), [...DOCK]);
  assert.equal(dronePosition(RESCUE.arrive[0] - 1, 'H5'), null);
  assert.equal(dronePosition(RESCUE.depart[1], 'H5'), null);
  assert.equal(rescueFrame(4500, 'H1').patient.pose, 'healthy');
  assert.equal(rescueFrame(rescueEnd(), 'H1').done, true);
});

test('the rescue\'s reduced variant: no travel, flash or jolt; it switches once at 800 ms; the fit moves the drone alone', () => {
  for (let t = 0; t < rescueEnd(true); t += 20) {
    const frame = rescueFrame(t, 'H2', { reduced: true });
    assert.deepEqual(frame.drone.at, berthKit('H2').hover);
    assert.equal(frame.pulse.frame, 0);
    assert.deepEqual(frame.patient.jolt, [0, 0]);
    assert.equal(frame.patient.pose, t >= RESCUE.reduced.switchAt ? 'healthy' : 'injured');
  }
  const full = rescueFrame(2600, 'H8'), small = rescueFrame(2600, 'H8', { fit: 0.6 });
  assert.deepEqual({ ...small, drone: null }, { ...full, drone: null });
  assert.ok(small.drone.at[1] > full.drone.at[1]);
});

test('the flatline: slowing, flat, shut down; the light dips to 0.72 and back, never dark; reduced has no dip', () => {
  const stages = new Set();
  for (let t = 0; t < flatlineEnd(); t += 10) {
    const frame = flatlineFrame(t);
    stages.add(frame.stage);
    assert.ok(frame.room >= FLATLINE.dim.level - 0.001 && frame.room <= 1);
    assert.equal(frame.announce, t >= FLATLINE.flat[0]);
  }
  assert.deepEqual([...stages], ['fail', 'flat', 'shutdown', 'settle']);
  assert.equal(flatlineFrame(2000).inset.kind, 'flat');
  assert.equal(flatlineFrame(3000).lamp.state, 'off');
  assert.equal(flatlineFrame(3000).patient.pose, 'still');
  assert.ok(Math.abs(flatlineFrame(1000).patient.offset[1]) <= CRITICAL.breathPx);
  for (const t of [1600, 2000, 3000]) assert.deepEqual(flatlineFrame(t).patient.offset, [0, 0]);
  for (let t = 0; t < flatlineEnd(true); t += 20) assert.equal(flatlineFrame(t, { reduced: true }).room, 1);
  assert.equal(flatlineFrame(flatlineEnd()).done, true);
});

test('a film plays at the berth its anchor names, never over another seat\'s', () => {
  assert.equal(clinicalBerth({ anchorId: 'HV4', slotCount: 8 }, 8), 'H4');
  assert.throws(() => clinicalBerth({ anchorId: 'HV9', slotCount: 8 }, 8));
  assert.throws(() => clinicalBerth({ anchorId: 'HV2', slotCount: 9 }, 7));
  assert.deepEqual(filmBerth({ anchorId: 'HV1', slotCount: 9 }, 9, [{ seat: 3, slotId: 'H1' }], 2), { berth: 'H1', plays: false, holder: 3 });
  assert.deepEqual(filmBerth({ anchorId: 'HV1', slotCount: 9 }, 9, [{ seat: 2, slotId: 'H1' }], 2), { berth: 'H1', plays: true, holder: null });
});

test('tags, the inset and the drone keep the caption\'s band, the name tags and every held press area clear', () => {
  for (const [width, height] of [[320, 568], [390, 844], [430, 932]]) {
    const board = fitBoardV2({ width, height }, 9);
    const panel = board.panels.hospital;
    const rects = slotRects('hospital', 9, panel);
    const caption = { left: 3, top: 3, width: 100, height: 26 };
    for (const rect of rects) {
      const names = rects.filter(other => other !== rect).map(other => ({ left: other.press[0] - 30, top: Math.min(panel.height - 16, other.top + other.side - 14), width: 60, height: 17 }));
      const tag = tagBox({ plate: rect.badge, size: [52, 13], panel, keepClear: names });
      assert.ok(tag.top >= panel.cap, `${rect.id}: in the caption's band`);
      assert.ok(!names.some(box => meets({ ...tag, width: 52, height: 13 }, box)), `${rect.id}: over a name tag`);
      const held = rects.filter(other => other !== rect).map(other => ({ left: other.left, top: other.top, width: other.side, height: other.side }));
      const inset = insetBox({ rect, panel, width: 74, caption, keepClear: held });
      if (inset) {
        assert.ok(inset.width >= INSET_MIN_WIDTH && Math.abs(inset.height / inset.width - INSET.h / INSET.w) < 0.001);
        for (const box of [caption, { left: rect.left, top: rect.top, width: rect.side, height: rect.side }, ...held]) assert.ok(!meets(inset, box), `${rect.id}: the inset meets a box`);
      }
      const frame = rect.frame;
      const fit = droneFit({ kit: berthKit(rect.id), frame, keepClear: held });
      assert.ok(fit >= DRONE_MIN_FIT && fit <= 1);
      assert.equal(droneFit({ kit: berthKit(rect.id), frame, keepClear: [] }), 1);
    }
  }
  // Nothing fits: no inset rather than one over a target.
  const panel = { width: 100, height: 100, cap: 10 };
  assert.equal(insetBox({ rect: { left: 28, top: 28, side: 44, press: [50, 50] }, panel, width: 60, keepClear: [{ left: 0, top: 0, width: 100, height: 100 }] }), null);
});

test('the drone hangs with its probes on the chest, at any fit', () => {
  for (const berth of WARD_BERTHS) {
    const kit = berthKit(berth.id);
    for (const fit of [1, 0.8, DRONE_MIN_FIT]) assert.ok(Math.abs(kit.chest[1] - hoverAt(kit, fit)[1] - DRONE_SCENE.reach * berth.scale * fit) < 0.01);
    assert.deepEqual(hoverAt(kit, 1), [...kit.hover]);
  }
});

test('the art: SVG in its own boxes, no words, colors apart from every faction accent', () => {
  for (const frame of DRONE.frames) assert.match(droneSvg(frame), new RegExp(`viewBox="0 0 ${DRONE.w} ${DRONE.h}"`));
  for (const kind of TRACE_KINDS) assert.match(vitalsInsetSvg(kind, { sweep: 0.5 }), /viewBox="0 0 168 72"/);
  for (const state of LAMP_STATES) assert.match(lampSvg(state), /viewBox="0 0 40 40"/);
  for (const tone of RESCUE_TONES) assert.match(rescueCrossSvg(tone), /viewBox="0 0 16 16"/);
  for (const svg of [droneSvg('open'), vitalsInsetSvg('unstable'), pulseSvg(1), pulseSvg(2)]) assert.doesNotMatch(svg, /<text\b|<image\b|<script\b/);
  for (const [name, { distance }] of Object.entries(medicalColorDistances())) assert.ok(distance >= MIN_ACCENT_DISTANCE, name);
});

test('the review page\'s outcomes: Backend\'s anchors, a healed subject out of the Hospital, the medical facts only while Injured', () => {
  const anchors = { rescue: 'HV1', 'rescue-detained': 'HV2', vignette: 'HV3', death: 'HV1', 'rescue-taken': 'HV1', 'rescue-ward': 'HV1', 'rescue-upper': 'HV8' };
  for (const [name, anchorId] of Object.entries(anchors)) {
    const outcome = medicalOutcome(name, 9);
    assert.equal(outcome.anchor.anchorId, anchorId, name);
    for (const seat of medicalSeats(outcome.after)) assert.equal(seat.medical !== null, seat.health === 'Injured');
  }
  assert.equal(medicalOutcome('vignette', 7).anchor.anchorId, 'HV2');
  assert.throws(() => medicalOutcome('rescue-detained', 7));
  assert.equal(outcomeWords(2, 'HEALED'), 'Player 2: Healed.');
  assert.equal(outcomeWords(2, 'DEATH'), 'Player 2: Eliminated.');
});

test('the contracts: three public films, the storyboards\' ids, no role named', () => {
  const contracts = medicalContracts();
  assert.deepEqual(contracts.map(film => film.storyboard), ['S9', 'S5', 'S10']);
  for (const film of contracts) assert.ok(film.audience.startsWith('public'));
  for (const word of ROLE_WORDS) assert.ok(!JSON.stringify(contracts).includes(word), word);
});
