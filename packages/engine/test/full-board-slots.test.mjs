import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BOARD_MEDICAL_FULL_GAME_VERSION_PINS, PUBLIC_HACK_FULL_GAME_VERSION_PINS, createFullGame,
} from '../dist/index.js';
import {
  slotIdsFor, initializeBoardSlots, moveBoardSeat, assignMissingBoardSlots, assertBoardSlots,
} from '../dist/full-game/slots.js';

// Issue #142: logical slot primitives, not medical effect/episode or cloud proof.
// Start with a legal explicit engine setup. Changed placement/status rosters below
// are labeled synthetic slot fixtures; they do not claim canonical medical histories.
const ASSET = 'board-slots-test-v1';
const copy = value => JSON.parse(JSON.stringify(value));
const byId = (state, id) => state.seats.find(seat => seat.seatId === id);
const numbered = (prefix, count) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
const slotMap = state => Object.fromEntries(state.seats.map(seat => [seat.seatId, seat.slotId]));

function fixture(count, pins = BOARD_MEDICAL_FULL_GAME_VERSION_PINS) {
  const roleOrder = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien',
    ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  return createFullGame({ matchId: 'board-slots-test', now: 1_800_000_000_000,
    phaseId: 'initial-phase', deadlineToken: 'initial-token', assetManifestVersion: ASSET,
    versions: { ...pins, assetManifestVersion: ASSET },
    setup: { playerCount: count, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
      initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < 5 ? 'Room A' : 'Room B'])),
      roundOrders: Array.from({ length: 5 }, () => [...ids]) } });
}
function clearSlots(state) {
  for (const seat of state.seats) delete seat.slotId;
  return state;
}
function failsWithoutMutation(state, operation) {
  const before = copy(state);
  assert.throws(() => operation(state));
  assert.deepEqual(state, before, 'Rejected slot operation must not partly change the board');
}

for (const count of [7, 8, 9]) {
  test(`${count}: logical inventories are fixed, roster-sized in Hospital and independent of callers`, () => {
    for (const [location, prefix, size] of [['Room A', 'A', 5], ['Room B', 'B', 5], ['Jail', 'J', 5],
      ['Command Room', 'C', 1], ['Hospital', 'H', count]]) {
      assert.deepEqual(slotIdsFor(location, count), numbered(prefix, size));
      const changed = slotIdsFor(location, count); changed.pop();
      assert.deepEqual(slotIdsFor(location, count), numbered(prefix, size));
    }
    for (const location of ['Final Zone', 'Private Capsule', '', null, undefined])
      assert.throws(() => slotIdsFor(location, count));
    for (const size of [0, 6, 10, 7.5, null, undefined]) assert.throws(() => slotIdsFor('Hospital', size));
  });

  test(`${count}: legal initial setup has complete slots; initialization uses player number, not roster array order`, () => {
    const initial = fixture(count);
    assertBoardSlots(initial);
    const state = clearSlots(copy(initial)); state.seats.reverse();
    const order = state.seats.map(seat => seat.seatId);
    initializeBoardSlots(state);
    assert.deepEqual(state.seats.map(seat => seat.seatId), order, 'Allocation cannot sort the authoritative roster in place');
    for (let index = 1; index <= count; index++)
      assert.equal(byId(state, `seat-${index}`).slotId, index <= 5 ? `A${index}` : `B${index - 5}`);
    assertBoardSlots(state);
    const before = copy(state);
    initializeBoardSlots(state); assignMissingBoardSlots(state); assertBoardSlots(state);
    assert.deepEqual(state, before, 'Restoration never repacks compatible slots');
  });

  test(`${count}: partial working roster fills missing entrants in numeric order and preserves existing holes`, () => {
    const source = fixture(count), state = { ...source,
      seats: ['seat-5', 'seat-2', 'seat-1'].map(id => copy(byId(source, id))) };
    byId(state, 'seat-1').slotId = 'A3';
    delete byId(state, 'seat-5').slotId; delete byId(state, 'seat-2').slotId;
    const order = state.seats.map(seat => seat.seatId);
    assignMissingBoardSlots(state);
    assert.deepEqual(slotMap(state), { 'seat-5': 'A2', 'seat-2': 'A1', 'seat-1': 'A3' });
    assert.deepEqual(state.seats.map(seat => seat.seatId), order);
    failsWithoutMutation(state, assertBoardSlots);
    failsWithoutMutation(state, initializeBoardSlots);
    const empty = { ...source, seats: [] };
    assignMissingBoardSlots(empty);
    assert.deepEqual(empty.seats, []);
    failsWithoutMutation(empty, assertBoardSlots);
  });

  test(`${count}: departures leave holes, bodies keep places, and the next entrant takes the lowest free slot`, () => {
    const state = fixture(count);
    // Synthetic retained-body fixture: a body still consumes A3 and room capacity.
    byId(state, 'seat-3').health = 'Eliminated';
    const original = slotMap(state), source = copy(byId(state, 'seat-6'));
    failsWithoutMutation(state, value => moveBoardSeat(value, byId(value, 'seat-6'), 'Room A'));
    moveBoardSeat(state, byId(state, 'seat-1'), 'Room B');
    assert.equal(byId(state, 'seat-1').slotId, `B${count - 4}`);
    assert.equal(byId(state, 'seat-3').slotId, 'A3');
    for (const id of ['seat-2', 'seat-3', 'seat-4', 'seat-5']) assert.equal(byId(state, id).slotId, original[id]);
    moveBoardSeat(state, byId(state, 'seat-6'), 'Room A');
    assert.equal(byId(state, 'seat-6').slotId, 'A1');
    const { location: oldLocation, slotId: oldSlot, ...unchangedBefore } = source;
    const { location: newLocation, slotId: newSlot, ...unchangedAfter } = byId(state, 'seat-6');
    assert.equal(oldLocation, 'Room B'); assert.equal(newLocation, 'Room A');
    assert.equal(oldSlot, 'B1'); assert.equal(newSlot, 'A1');
    assert.deepEqual(unchangedAfter, unchangedBefore, 'No resources, remembered room, identity or medical state is changed');
    assertBoardSlots(state);
    const before = copy(state);
    initializeBoardSlots(state);
    moveBoardSeat(state, byId(state, 'seat-3'), 'Room A');
    assert.deepEqual(state, before, 'Initialization and same-room transfer preserve the hole in B1');
  });

  test(`${count}: sequential transfers reserve the last ordinary slot without shifting any occupant`, () => {
    const state = fixture(count), body = byId(state, 'seat-3');
    body.health = 'Eliminated';
    // Synthetic placement fixture: two B occupants compete for the one vacated A place.
    moveBoardSeat(state, byId(state, 'seat-1'), 'Hospital');
    moveBoardSeat(state, byId(state, 'seat-6'), 'Room A');
    assert.equal(byId(state, 'seat-6').slotId, 'A1');
    failsWithoutMutation(state, value => moveBoardSeat(value, byId(value, 'seat-7'), 'Room A'));
    assert.equal(body.slotId, 'A3');
    assert.equal(body.health, 'Eliminated');
    assertBoardSlots(state);
  });

  test(`${count}: Hospital can hold the complete roster including retained bodies and detainees`, () => {
    const state = clearSlots(fixture(count));
    // Synthetic full-ward slot fixture. Episode correctness belongs to medical tests.
    for (const value of state.seats) Object.assign(value, { location: 'Hospital', health: 'Injured', captain: false, jailed: false });
    byId(state, 'seat-2').jailed = true;
    byId(state, 'seat-1').health = 'Eliminated';
    state.seats.reverse();
    assignMissingBoardSlots(state);
    assertBoardSlots(state);
    for (let index = 1; index <= count; index++) assert.equal(byId(state, `seat-${index}`).slotId, `H${index}`);
    const before = copy(state);
    moveBoardSeat(state, byId(state, 'seat-2'), 'Hospital');
    initializeBoardSlots(state);
    assert.deepEqual(state, before);
    byId(state, 'seat-1').slotId = `H${count + 1}`;
    failsWithoutMutation(state, assertBoardSlots);
    failsWithoutMutation(state, assignMissingBoardSlots);
  });

  test(`${count}: last Hospital admission allocates H${count} after status changes without an ordinary detour`, () => {
    const state = clearSlots(fixture(count));
    // Synthetic n-1-patient roster plus one current A occupant; all positions are complete.
    for (const [index, value] of state.seats.entries()) {
      Object.assign(value, index < count - 1
        ? { location: 'Hospital', health: 'Injured', slotId: `H${index + 1}` }
        : { location: 'Room A', health: 'Healthy', slotId: 'A1' });
    }
    const patient = state.seats.at(-1), lastRoom = patient.lastRoom;
    patient.health = 'Injured';
    moveBoardSeat(state, patient, 'Hospital');
    assert.equal(patient.slotId, `H${count}`);
    assert.equal(patient.lastRoom, lastRoom);
    assertBoardSlots(state);
    failsWithoutMutation(state, value => moveBoardSeat(value, byId(value, patient.seatId), 'Room B'));
  });

  test(`${count}: Command entry requires a Healthy free Captain; a lost title does not prevent departure`, () => {
    const state = fixture(count), captain = byId(state, 'seat-1');
    failsWithoutMutation(state, value => moveBoardSeat(value, byId(value, 'seat-1'), 'Command Room'));
    captain.captain = true;
    moveBoardSeat(state, captain, 'Command Room');
    assert.equal(captain.slotId, 'C1');
    assertBoardSlots(state);
    const before = copy(state);
    moveBoardSeat(state, captain, 'Command Room');
    assert.deepEqual(state, before);
    captain.captain = false; // Immediate Jail/Captain-loss callers may clear this first.
    moveBoardSeat(state, captain, 'Jail');
    assert.equal(captain.slotId, 'J1');
    assert.equal(captain.captain, false);
    assertBoardSlots(state);
    for (const condition of ['injured', 'jailed']) {
      const invalid = fixture(count), target = byId(invalid, 'seat-1');
      target.captain = true;
      if (condition === 'injured') {
        target.health = 'Injured'; moveBoardSeat(invalid, target, 'Hospital');
      } else {
        target.jailed = true; moveBoardSeat(invalid, target, 'Jail');
      }
      failsWithoutMutation(invalid, value => moveBoardSeat(value, byId(value, 'seat-1'), 'Command Room'));
    }
  });

  test(`${count}: wrong, duplicate and malformed populated slots fail closed in every helper`, () => {
    for (const bad of ['A6', 'B1', 'A01', '', null, 1, 'C1', 'H1']) {
      const state = fixture(count); byId(state, 'seat-3').slotId = bad;
      for (const operation of [assertBoardSlots, initializeBoardSlots, assignMissingBoardSlots,
        value => moveBoardSeat(value, byId(value, 'seat-1'), 'Room B')]) failsWithoutMutation(state, operation);
    }
    const duplicate = fixture(count); byId(duplicate, 'seat-3').slotId = byId(duplicate, 'seat-2').slotId;
    for (const operation of [assertBoardSlots, initializeBoardSlots, assignMissingBoardSlots,
      value => moveBoardSeat(value, byId(value, 'seat-1'), 'Room B')]) failsWithoutMutation(duplicate, operation);
    const mixed = fixture(count); delete byId(mixed, 'seat-1').slotId; byId(mixed, 'seat-3').slotId = 'A99';
    failsWithoutMutation(mixed, assignMissingBoardSlots);
  });

  test(`${count}: missing slots are permitted only inside explicit assignment, never boundary or immediate transfer`, () => {
    const state = fixture(count); delete byId(state, 'seat-1').slotId;
    failsWithoutMutation(state, assertBoardSlots);
    failsWithoutMutation(state, value => moveBoardSeat(value, byId(value, 'seat-1'), 'Room B'));
    assignMissingBoardSlots(state);
    assert.equal(byId(state, 'seat-1').slotId, 'A1');
    assertBoardSlots(state);
    failsWithoutMutation(state, value => moveBoardSeat(value, copy(byId(value, 'seat-1')), 'Room B'));
    const before = copy(state);
    assert.throws(() => moveBoardSeat(state, byId(state, 'seat-1'), 'Final Zone'));
    assert.deepEqual(state, before);
  });

  test(`${count}: malformed rosters and over-capacity pending assignments never partially initialize`, () => {
    for (const invalid of [
      value => { value.seats.pop(); },
      value => { value.seats[0].seatId = value.seats[1].seatId; },
      value => { value.seats[0].seatId = `seat-${count + 1}`; },
      value => { value.playerCount = 6; },
      value => { value.seats[0].location = 'Final Zone'; },
    ]) {
      const state = fixture(count); invalid(state);
      failsWithoutMutation(state, initializeBoardSlots);
      failsWithoutMutation(state, assertBoardSlots);
    }
    const overfull = clearSlots(fixture(count));
    for (const value of overfull.seats.slice(0, 6)) value.location = 'Room A';
    failsWithoutMutation(overfull, initializeBoardSlots);
    failsWithoutMutation(overfull, assignMissingBoardSlots);
    assert.ok(overfull.seats.every(value => !Object.hasOwn(value, 'slotId')));
  });

  test(`${count}: boundary rejects injury outside Hospital and an ineligible Command occupant`, () => {
    const injury = fixture(count); byId(injury, 'seat-2').health = 'Injured';
    failsWithoutMutation(injury, assertBoardSlots);
    clearSlots(injury);
    failsWithoutMutation(injury, initializeBoardSlots);
    for (const change of [
      value => { value.captain = false; },
      value => { value.jailed = true; },
      value => { value.health = 'Eliminated'; },
      value => { value.health = 'Injured'; },
    ]) {
      const state = fixture(count), target = byId(state, 'seat-1');
      target.captain = true; moveBoardSeat(state, target, 'Command Room'); change(target);
      failsWithoutMutation(state, assertBoardSlots);
      clearSlots(state); failsWithoutMutation(state, initializeBoardSlots);
    }
  });

  test(`${count}: Jail bodies plus detained Hospital return obligations cannot exceed five`, () => {
    const state = fixture(count);
    // Synthetic detention-capacity boundary; no episode or voting-history claim.
    for (const [index, value] of state.seats.entries()) {
      if (index < 4) Object.assign(value, { location: 'Jail', slotId: `J${index + 1}`, jailed: true });
      else if (index === 4) Object.assign(value, { location: 'Hospital', slotId: 'H1', health: 'Injured', jailed: true });
      else Object.assign(value, { location: 'Room A', slotId: `A${index - 4}` });
    }
    byId(state, 'seat-1').health = 'Eliminated'; // A retained Jail body still consumes its place.
    assertBoardSlots(state);
    Object.assign(byId(state, 'seat-6'), { location: 'Hospital', slotId: 'H2', health: 'Injured', jailed: true });
    failsWithoutMutation(state, assertBoardSlots);
    failsWithoutMutation(state, initializeBoardSlots);
  });

  test(`${count}: slot-free historical 1.6 setup remains unchanged by new lifecycle initialization`, () => {
    const legacy = fixture(count, PUBLIC_HACK_FULL_GAME_VERSION_PINS);
    assert.equal(legacy.versions.engineVersion, 'full-game-1.6.0');
    assert.ok(legacy.seats.every(value => !Object.hasOwn(value, 'slotId')));
    const before = copy(legacy);
    slotIdsFor('Hospital', count);
    assert.deepEqual(legacy, before, 'Inventory lookup has no implicit legacy upgrade');
  });
}
