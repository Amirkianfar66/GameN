// mothership:dev-only
//
// The successor's four-berth Hospital (the owner's four-bed decision of 18 October 2026, issue
// #155; design/board-v2/scenes/hospital-ward-four.mjs, scenes/slots-four.mjs, js/fit-four.mjs,
// js/turns-four.mjs, fx/medical-four.mjs, fx/overflow.mjs, films/overflow.mjs;
// docs/design/hospital-four.md): four berths whatever the roster, the current board panel for
// panel, #158's films on the four berths, and the overflow victim's beat. These test the proposal's
// own modules: none of them is a rule, a server contract or a measurement of a phone.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FOUR_BACK, FOUR_BEDS, FOUR_BERTHS, FOUR_FRONT, FOUR_ROSTERS, fourBerths, wardFourScene } from '../../../design/board-v2/scenes/hospital-ward-four.mjs';
import * as slotsFour from '../../../design/board-v2/scenes/slots-four.mjs';
import { slotsOf } from '../../../design/board-v2/scenes/slots.mjs';
import * as fit from '../../../design/board-v2/js/fit.mjs';
import * as fitFour from '../../../design/board-v2/js/fit-four.mjs';
import { turnsLayout } from '../../../design/board-v2/js/turns.mjs';
import * as turnsFour from '../../../design/board-v2/js/turns-four.mjs';
import { DOCK, hoverAt } from '../../../design/board-v2/fx/medical.mjs';
import { RESCUE, rescueEnd, rescueFrame } from '../../../design/board-v2/films/medical.mjs';
import { fourBerthKit, fourClinicalBerth, fourDronePosition, fourFilmBerth, fourRescueFrame } from '../../../design/board-v2/fx/medical-four.mjs';
import { fullStampBox, overflowWay, spinePlaqueBox } from '../../../design/board-v2/fx/overflow.mjs';
import { OVERFLOW_FILM, overflowContract, overflowEnd, overflowFrame } from '../../../design/board-v2/films/overflow.mjs';
import { OVERFLOW_OCCURRENCE, overflowOutcome } from '../../../design/board-v2/js/overflow-fixtures.mjs';
import { offBoardCards } from '../../../design/board-v2/fx/captain.mjs';

const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const PHONES = [[320, 568], [360, 740], [390, 844], [430, 932]];

test('four berths, H1 to H4, for 7, 8 and 9 players alike; every other room the current table\'s own', () => {
  assert.equal(FOUR_BEDS, 4);
  for (const roster of FOUR_ROSTERS) {
    assert.deepEqual(slotsFour.slotsOf('hospital', roster).map(slot => slot.id), ['H1', 'H2', 'H3', 'H4']);
    assert.equal(fourBerths(roster).length, 4);
    assert.deepEqual(slotsFour.slotProblems(roster), []);
    for (const room of ['command-room', 'room-a', 'room-b', 'jail']) assert.equal(slotsFour.slotsOf(room, roster), slotsOf(room, roster));
    assert.deepEqual(wardFourScene(roster).slots.map(slot => slot.at), wardFourScene(7).slots.map(slot => slot.at));
  }
  assert.equal(slotsFour.slotCount('hospital', 9), 4);
  assert.equal(slotsFour.slotCount('room-a', 9), 5);
  assert.throws(() => fourBerths(4));
  assert.throws(() => slotsFour.sceneOf('hospital', 4));
});

test('the berths: larger in front, the front row\'s headboards between the back row and their own patients', () => {
  assert.ok(FOUR_FRONT.k > FOUR_BACK.k && FOUR_BACK.k > 1);
  const scene = wardFourScene(9);
  for (const slot of scene.slots) {
    assert.ok(scene.layers[slot.front].depth > slot.depth, `${slot.id}'s blanket over its patient`);
    if (slot.row === 'front') {
      const head = scene.layers[`${slot.front}-head`];
      assert.ok(head.depth < slot.depth);
      for (const back of scene.slots.filter(other => other.row === 'back')) assert.ok(head.depth > scene.layers[back.front].depth);
    }
  }
  for (const berth of FOUR_BERTHS) assert.ok(['bedLying', 'bedSitting'].includes(berth.gesture));
});

test('the successor board is the current one panel for panel; the four berths fit every Hospital panel it draws', () => {
  assert.equal(fitFour.fitBoardV2, fit.fitBoardV2);
  assert.ok(!('needHeight' in fitFour));
  for (const name of ['slotRects', 'slotsFit', 'boardRects', 'passClearance']) assert.equal(String(fitFour[name]), String(fit[name]));
  for (const [width, height] of PHONES) for (const capsule of [false, true]) for (const roster of FOUR_ROSTERS) {
    const board = fit.fitBoardV2({ width, height }, roster, { capsule });
    assert.ok(fitFour.slotsFit('hospital', roster, board.panels.hospital), `${width}x${height}: the four berths fit`);
    for (const rect of fitFour.slotRects('hospital', roster, board.panels.hospital)) assert.ok(rect.side >= 44 && rect.top >= board.panels.hospital.cap);
    for (const slot of fitFour.passClearance({ width, height }, roster, { capsule })) assert.ok(slot.clearance > 0, `${slot.id} under the Pass`);
  }
});

test('the controls take turns on the successor board exactly as on the current one; the Hospital\'s targets are its four berths', () => {
  for (const [width, height] of PHONES) {
    const one = turnsLayout({ width, height }, 9), four = turnsFour.turnsLayout({ width, height }, 9);
    assert.deepEqual(four.sheet, one.sheet);
    assert.deepEqual(four.choosing, one.choosing);
    if (four.fits) assert.deepEqual(turnsFour.boardTargets(four.board, 9).filter(target => target.room === 'hospital').map(target => target.id), ['H1', 'H2', 'H3', 'H4']);
  }
});

test('#158\'s rescue plays on the four berths frame for frame; only the drone\'s hover is the berth\'s', () => {
  for (const reduced of [false, true]) for (const berth of FOUR_BERTHS) for (let t = -100; t <= rescueEnd(reduced) + 100; t += 50) {
    const a = rescueFrame(t, 'H1', { reduced }), b = fourRescueFrame(t, berth.id, { reduced });
    assert.deepEqual({ ...b, drone: { ...b.drone, at: b.drone.at === null } }, { ...a, drone: { ...a.drone, at: a.drone.at === null } });
  }
  for (const berth of FOUR_BERTHS) {
    const kit = fourBerthKit(berth.id);
    assert.deepEqual(fourDronePosition(RESCUE.arrive[0], berth.id), [...DOCK]);
    const at = fourDronePosition(RESCUE.scan[0], berth.id);
    assert.equal(at[0], kit.chest[0]);
    assert.ok(Math.abs(at[1] - hoverAt(kit)[1]) <= 1.6);
    assert.deepEqual(kit.hover, hoverAt(kit));
  }
});

test('an anchor names one of the four beds; a film plays there unless another seat holds it', () => {
  assert.equal(fourClinicalBerth('HV3'), 'H3');
  assert.equal(fourClinicalBerth({ kind: 'CLINICAL_VIGNETTE', anchorId: 'HV4' }), 'H4');
  for (const bad of ['HV5', 'HV9', 'H1', '']) assert.throws(() => fourClinicalBerth(bad));
  assert.deepEqual(fourFilmBerth('HV2', [{ seat: 6, slotId: 'H2' }], 6), { berth: 'H2', plays: true, holder: null });
  assert.deepEqual(fourFilmBerth('HV2', [{ seat: 6, slotId: null }, { seat: 1, slotId: 'H2' }], 6), { berth: 'H2', plays: false, holder: 1 });
});

test('the overflow beat: FULL, the grey cut-out, the lift to the plaque and the count, in 2.8 s; words once; nothing outside it', () => {
  assert.equal(overflowEnd(false), OVERFLOW_FILM.end);
  assert.equal(overflowEnd(false), 2800);
  assert.equal(overflowFrame(-1).stage, 'before');
  assert.deepEqual([150, 700, 1600, 2350, 2600].map(t => overflowFrame(t).stage), ['full', 'grey', 'lift', 'counted', 'settle']);
  assert.equal(overflowFrame(2800).done, true);
  assert.equal(overflowFrame(2200).plaque.counted, true);
  assert.equal(overflowFrame(2199).plaque.counted, false);
  let said = false;
  for (let t = 0; t < 2800; t += 10) {
    const frame = overflowFrame(t);
    if (said) assert.ok(frame.announce);
    said ||= frame.announce;
    // A cross-fade, each at the hundredth: their sum one, to the rounding.
    assert.ok(Math.abs(frame.figure.opacity + frame.figure.grey - (frame.figure.grey > 0 || frame.figure.opacity > 0 ? 1 : 0)) <= 0.011);
    if (frame.flyer) assert.ok(frame.flyer.scale <= 1 && frame.flyer.scale >= OVERFLOW_FILM.scale[1] - 0.001);
  }
  for (const t of [-1, 2800, 4000]) { const frame = overflowFrame(t); assert.ok(frame.full.opacity === 0 && !frame.flyer && frame.figure.grey === 0); }
  assert.deepEqual(overflowFrame(900, { cause: 'shot', attacker: 3, bed: 'H5' }), overflowFrame(900));
});

test('the reduced beat is two still panels, each faded in over 80 ms: no travel, no pop', () => {
  assert.equal(overflowEnd(true), 2 * 700 + 2 * 80);
  for (let t = 0; t < overflowEnd(true); t += 10) {
    const frame = overflowFrame(t, { reduced: true });
    assert.equal(frame.flyer, null);
    assert.equal(frame.full.scale, 1);
    assert.equal(frame.plaque.scale, 1);
    assert.ok(frame.announce);
  }
  assert.equal(overflowFrame(300, { reduced: true }).stage, 'grey');
  assert.equal(overflowFrame(900, { reduced: true }).stage, 'counted');
});

test('the plaque sits in the spine between the Hospital and the Jail; the FULL stamp in the Hospital\'s caption band', () => {
  for (const [width, height] of PHONES) {
    const board = fit.fitBoardV2({ width, height }, 9, { capsule: true });
    const at = spinePlaqueBox({ hospital: board.boxes.hospital, jail: board.boxes.jail, border: board.shell.border, cap: board.panels.hospital.cap, size: [18, 30] });
    assert.ok(at, `${width}x${height}: room for the plaque`);
    assert.ok(at.left >= board.boxes.hospital.left + board.boxes.hospital.width && at.left + at.width <= board.boxes.jail.left);
    const presses = fitFour.slotRects('hospital', 9, board.panels.hospital).map(rect => ({ left: rect.left, top: rect.top, width: rect.side, height: rect.side }));
    const stamp = fullStampBox({ caption: { left: 2, top: 2, width: 104, height: 28 }, size: [42, 19], panel: board.panels.hospital, keepClear: presses });
    assert.ok(stamp, `${width}x${height}: room for the FULL stamp`);
    const box = { left: stamp.left, top: stamp.top, width: 42, height: 19 };
    if (stamp.place === 'band') assert.ok(box.left >= 104 && box.top + 19 <= board.panels.hospital.cap);
    else assert.ok(box.top >= board.panels.hospital.cap);
    for (const press of presses) assert.ok(!(box.left < press.left + press.width && press.left < box.left + box.width && box.top < press.top + press.height && press.top < box.top + box.height), `${width}x${height}: the stamp over a bed`);
  }
  assert.equal(spinePlaqueBox({ hospital: { left: 0, top: 0, width: 100, height: 100 }, jail: { left: 110, top: 0, width: 100, height: 100 }, border: 2, cap: 32, size: [18, 30] }), null);
  assert.deepEqual(overflowWay([10, 100], [200, 20], 0), [10, 100]);
  assert.deepEqual(overflowWay([10, 100], [200, 20], 1), [200, 20]);
  assert.ok(overflowWay([10, 100], [200, 100], 0.5)[1] < 100);
});

test('off the board: an EJECT\'s five and overflow victims still get a 44 px card each in the sheet, up to eight', () => {
  for (const [width, height] of PHONES) {
    const { sheet } = turnsFour.turnsLayout({ width, height }, 9);
    if (!sheet) continue;
    const body = { left: sheet.body.left - sheet.left, top: sheet.body.top - sheet.top, width: sheet.body.width, height: sheet.body.height };
    for (let count = 1; count <= 5; count += 1) assert.ok(offBoardCards(body, count)?.every(card => card.width >= 44), `${width}x${height}: ${count} cards`);
  }
});

test('the review page\'s example: the four beds full, an incoming Healthy player off the board afterwards, nobody else moved', () => {
  assert.equal(OVERFLOW_OCCURRENCE.illustrative, true);
  for (const roster of FOUR_ROSTERS) {
    const { subject, before, after } = overflowOutcome(roster);
    assert.equal(before.filter(seat => seat.room === 'hospital').length, 4);
    assert.equal(subject.health, 'Healthy');
    assert.notEqual(subject.room, 'hospital');
    const victim = after.find(seat => seat.seat === subject.seat);
    assert.deepEqual([victim.room, victim.slot, victim.health], [null, null, 'Eliminated']);
    for (const seat of after.filter(entry => entry.seat !== subject.seat)) assert.deepEqual(seat, before.find(entry => entry.seat === seat.seat));
  }
});

test('the beat\'s contract: public, a proposal on an unallocated occurrence, no bed or clinical anchor, no role named', () => {
  const contract = overflowContract();
  assert.equal(contract.id, 'hospital-overflow');
  assert.match(contract.status, /unallocated/);
  assert.match(contract.audience, /^public/);
  assert.ok(contract.notInputs.some(entry => /clinical anchor/.test(entry)));
  for (const word of ROLE_WORDS) assert.ok(!JSON.stringify(contract).includes(word), word);
});
