import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPublicViewSchema, FullPlayerViewSchema, FullReceiptSchema, fullRoomCapacityForVersions } from '@mothership/contracts';
import {
  BOARD_MEDICAL_FULL_GAME_VERSION_PINS as PINS, PUBLIC_HACK_FULL_GAME_VERSION_PINS,
  DECLARED_HACK_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';

// Issue #142 provisional pure-engine/contract acceptance, not release activation,
// Firestore/Tasks, art adoption or human balance evidence. Unless a case explicitly
// says SYNTHETIC, every state follows a legal initial SETUP and actual commands /
// deadlines. Invalid schema samples and synthetic predecessors are not gameplay.
const START = 1_800_000_000_000, ASSETS = 'board-medical-engine-fixture-v1';
const BASE_ROLES = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const LEGACY = [LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS];
const copy = value => JSON.parse(JSON.stringify(value));
const own = (state, id) => state.seats.find(seat => seat.seatId === id);
const count = (state, room) => state.seats.filter(seat => seat.location === room).length;
const pubSeat = (state, id) => projectFullGame(state).public.seats.find(seat => seat.seatId === id);
const tuple17 = state => state.versions.engineVersion === 'full-game-1.7.0';

function views(state) {
  const projected = projectFullGame(state);
  FullPublicViewSchema.parse(projected.public);
  for (const view of Object.values(projected.players)) {
    FullPlayerViewSchema.parse(view); assert.deepEqual(view.seats, projected.public.seats);
  }
  if (!tuple17(state)) {
    for (const seat of [...state.seats, ...projected.public.seats]) {
      for (const field of ['slotId', 'medical', 'medicalEpisode', 'medicalEpisodeCount']) assert.equal(Object.hasOwn(seat, field), false);
    }
    return projected;
  }
  const slots = new Set();
  for (const seat of state.seats) {
    assert.equal(typeof seat.slotId, 'string'); assert.equal(slots.has(seat.slotId), false); slots.add(seat.slotId);
    const prefix = { 'Room A': 'A', 'Room B': 'B', Jail: 'J', Hospital: 'H', 'Command Room': 'C' }[seat.location];
    assert.ok(prefix, 'This inactive tuple has no Final Zone or off-board location');
    const maximum = prefix === 'H' ? state.playerCount : prefix === 'C' ? 1 : 5;
    assert.ok(Array.from({ length: maximum }, (_, i) => `${prefix}${i + 1}`).includes(seat.slotId));
    if (prefix === 'C') assert.equal(seat.captain, true);
    assert.ok(Number.isSafeInteger(seat.medicalEpisodeCount) && seat.medicalEpisodeCount >= 0);
    const published = projected.public.seats.find(value => value.seatId === seat.seatId);
    assert.equal(published.slotId, seat.slotId);
    assert.equal(Object.hasOwn(published, 'medicalEpisode'), false);
    assert.equal(Object.hasOwn(published, 'medicalEpisodeCount'), false);
    if (seat.health === 'Injured') {
      assert.equal(seat.location, 'Hospital'); assert.ok(seat.medicalEpisode);
      assert.equal(seat.medicalEpisode.number, seat.medicalEpisodeCount);
      assert.equal(published.medical.admittedRound, seat.medicalEpisode.admittedRound);
      assert.equal(published.medical.rescueDueAfterRound, seat.medicalEpisode.deathDueAfterRound);
    } else { assert.equal(seat.medicalEpisode, null); assert.equal(published.medical, null); }
  }
  for (const room of ['Room A', 'Room B', 'Jail']) assert.ok(count(state, room) <= 5);
  assert.ok(count(state, 'Command Room') <= 1); assert.ok(count(state, 'Hospital') <= state.playerCount);
  assert.ok(state.seats.filter(seat => seat.jailed).length <= 5, 'Physical Jail plus medical detainees retains the canonical five-place invariant');
  return projected;
}

function driver(playerCount, { pins = PINS, aCount = 5, orders, roleOrder: explicitRoles } = {}) {
  let serial = 0;
  const roleOrder = explicitRoles ?? [...BASE_ROLES, ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const setup = { playerCount, roleOrder, codeExtraSeatIds: ids.filter(id => !['Alien', 'Undercover'].includes(roleOrder[Number(id.slice(5)) - 1])).slice(0, 3),
    initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < aCount ? 'Room A' : 'Room B'])),
    roundOrders: orders ?? Array.from({ length: 5 }, () => [...ids]) };
  const args = { matchId: 'board-medical-fixture', setup, now: START, phaseId: 'phase-start', deadlineToken: 'token-start',
    assetManifestVersion: ASSETS, versions: { ...pins, assetManifestVersion: ASSETS } };
  const initial = createFullGame(args), history = [];
  views(initial);
  const context = now => ({ now, nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `token-${serial}` });
  const apply = (state, actor, command) => {
    const request = { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId: `command-${++serial}`, command };
    const ctx = context(state.phase.startedAt + 1), before = copy(state), result = executeFullGame(state, actor, request, ctx);
    FullReceiptSchema.parse(result.receipt); assert.deepEqual(state, before);
    assert.deepEqual(executeFullGame(copy(state), actor, request, ctx), result, 'Command replay is deterministic after JSON recovery');
    views(result.state); history.push({ kind: 'COMMAND', actor, request, context: ctx, receipt: result.receipt });
    return result;
  };
  const tick = state => {
    assert.notEqual(state.phase.endsAt, null, 'Do not advance an already terminal match');
    const ctx = { ...context(state.phase.endsAt), phaseId: state.phase.id, deadlineToken: state.deadlineToken };
    const before = copy(state), result = advanceFullGame(state, ctx);
    assert.equal(result.advanced, true); assert.deepEqual(state, before);
    assert.deepEqual(advanceFullGame(copy(state), ctx), result, 'Deadline replay is deterministic after JSON recovery');
    const duplicate = advanceFullGame(result.state, ctx);
    assert.equal(duplicate.advanced, false); assert.strictEqual(duplicate.state, result.state);
    views(result.state); history.push({ kind: 'DEADLINE', context: ctx }); return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let bound = 0; !predicate(current); bound++) { assert.ok(bound < 240, 'Canonical checkpoint must be reachable'); current = tick(current); }
    return current;
  };
  const replay = expected => {
    let state = createFullGame(copy(args));
    for (const record of history) {
      if (record.kind === 'COMMAND') {
        const result = executeFullGame(state, record.actor, copy(record.request), copy(record.context));
        assert.deepEqual(result.receipt, record.receipt); state = result.state;
      } else state = advanceFullGame(state, copy(record.context)).state;
      views(state);
    }
    assert.deepEqual(state, expected); assert.deepEqual(projectFullGame(state), projectFullGame(expected));
  };
  return { initial, apply, tick, until, replay, context };
}
function accepted(result) { assert.equal(result.receipt.status, 'accepted', JSON.stringify(result.receipt)); return result.state; }
function rejected(result, state, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected'); assert.equal(result.receipt.code, code); assert.strictEqual(result.state, state);
}
const turn = (d, state, round, actor) => d.until(state, value => value.round === round && value.phase.kind === 'ORDINARY_TURN' && value.activeSeatId === actor);
function vote(d, state, target) {
  let current = state;
  assert.ok(['JAIL_VOTE', 'CAPTAIN_ELECTION'].includes(current.phase.kind));
  if (target !== null) {
    assert.ok(current.eligibleTargets.includes(target));
    for (const actor of current.eligibleVoters.slice(0, Math.ceil(current.eligibleVoters.length / 2))) {
      current = accepted(d.apply(current, actor, { type: 'VOTE', targetSeatId: target }));
    }
  }
  return d.tick(current);
}
function closeRound(d, state, target = null) {
  const round = state.round, jail = d.until(state, value => value.round === round && value.phase.kind === 'JAIL_VOTE');
  let current = vote(d, jail, target);
  if (current.phase.kind === 'VOTE_RESULT') current = d.tick(current);
  return current;
}
function disable(d, state, round, target = 'seat-1') {
  return accepted(d.apply(turn(d, state, round, 'seat-3'), 'seat-3', { type: 'DISABLE', targetSeatId: target }));
}
function assertEpisode(state, id, number, admittedRound, due, opportunity) {
  const seat = own(state, id);
  assert.equal(seat.health, 'Injured'); assert.equal(seat.location, 'Hospital'); assert.equal(seat.medicalEpisodeCount, number);
  assert.deepEqual(seat.medicalEpisode, { number, admittedRound, deathDueAfterRound: due });
  assert.deepEqual(pubSeat(state, id).medical, { admittedRound, rescueDueAfterRound: due, rescueOpportunity: opportunity });
}
function elect(d, state, target = 'seat-4') {
  const election = d.until(state, value => value.phase.kind === 'CAPTAIN_ELECTION');
  let current = vote(d, election, target); assert.equal(own(current, target).captain, true);
  assert.equal(own(current, target).location, 'Command Room'); assert.equal(own(current, target).slotId, 'C1');
  if (current.phase.kind === 'VOTE_RESULT') current = d.tick(current);
  return current;
}

for (const mode of [7, 8, 9]) {
  test(`${mode} seats: every legal starting split allocates lowest numbered neutral slots with exact public/private shape`, () => {
    for (let aCount = mode - 5; aCount <= 5; aCount++) {
      const d = driver(mode, { aCount }), initial = d.initial;
      assert.deepEqual(initial.seats.map(seat => seat.slotId), initial.seats.map((_, i) => i < aCount ? `A${i + 1}` : `B${i - aCount + 1}`));
      for (const seat of initial.seats) { assert.equal(seat.medicalEpisodeCount, 0); assert.equal(seat.medicalEpisode, null); }
      assert.equal(fullRoomCapacityForVersions(initial.versions, 'Hospital', mode), mode);
      assert.equal(fullRoomCapacityForVersions(initial.versions, 'Hospital'), null, 'No starting-count input means no guessed five-bed label');
      assert.equal(fullRoomCapacityForVersions(initial.versions, 'Room A', mode), 5);
      assert.equal(fullRoomCapacityForVersions(initial.versions, 'Command Room', mode), 1);
      d.replay(initial);
    }
  });

  test(`${mode} seats: accepted movement leaves holes, preserves neighbours and lets the next entrant take the lowest free slot`, () => {
    const d = driver(mode), initial = d.initial, original = copy(initial.seats);
    let state = accepted(d.apply(initial, 'seat-2', { type: 'MOVE', destination: 'Room B' }));
    assert.equal(own(state, 'seat-2').slotId, `B${mode - 4}`);
    for (const seat of state.seats.filter(seat => seat.seatId !== 'seat-2')) assert.equal(seat.slotId, own(initial, seat.seatId).slotId);
    state = accepted(d.apply(state, 'seat-6', { type: 'MOVE', destination: 'Room A' }));
    assert.equal(own(state, 'seat-6').slotId, 'A2');
    assert.equal(own(state, 'seat-7').slotId, 'B2', 'The surviving B2 occupant does not shift into the B1 hole');
    for (const seat of state.seats.filter(seat => !['seat-2', 'seat-6'].includes(seat.seatId))) assert.equal(seat.slotId, original.find(value => value.seatId === seat.seatId).slotId);
    const recovered = copy(state); assert.deepEqual(views(recovered), views(state)); d.replay(state);
  });

  test(`${mode} seats: injury and Rescue in one batch re-enter the same ordinary room at its earlier vacant slot`, () => {
    const d = driver(mode);
    let state = accepted(d.apply(d.initial, 'seat-1', { type: 'MOVE', destination: 'Room B' }));
    assert.equal(own(state, 'seat-4').location, 'Room A'); assert.equal(own(state, 'seat-4').slotId, 'A4');
    assert.equal(state.seats.some(seat => seat.slotId === 'A1'), false);
    state = accepted(d.apply(turn(d, state, 1, 'seat-2'), 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' }));
    state = disable(d, state, 1, 'seat-4'); state = closeRound(d, state);
    assert.equal(own(state, 'seat-4').health, 'Healthy'); assert.equal(own(state, 'seat-4').location, 'Room A');
    assert.equal(own(state, 'seat-4').slotId, 'A1', 'The actual medical departure ends the old A4 occupancy even though the final room matches');
    assert.equal(own(state, 'seat-4').medicalEpisodeCount, 1); assert.equal(own(state, 'seat-4').medicalEpisode, null);
    assert.equal(pubSeat(state, 'seat-4').medical, null);
    assert.equal(own(state, 'seat-2').slotId, 'A2'); assert.equal(own(state, 'seat-3').slotId, 'A3'); assert.equal(own(state, 'seat-5').slotId, 'A5');
    assert.equal(state.seats.some(seat => seat.slotId === 'A4'), false);
    // The final healthy snapshot does not claim an injury/recovery animation;
    // authoritative outcome delivery belongs to the separate event companion.
    d.replay(state);
  });

  test(`${mode} seats: automatic due death follows the complete rescue opportunity and bypasses active Protection without consuming it`, () => {
    const d = driver(mode);
    let state = disable(d, d.initial, 1);
    state = accepted(d.apply(turn(d, state, 1, 'seat-5'), 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }));
    state = closeRound(d, state); assert.equal(state.round, 2);
    assertEpisode(state, 'seat-1', 1, 1, 2, 'CURRENT_NORMAL_ROUND');
    const slot = own(state, 'seat-1').slotId;
    state = turn(d, state, 2, 'seat-2');
    assert.equal(own(state, 'seat-1').protection.activeFromRound, 2);
    assert.equal(own(state, 'seat-1').protection.consumed, false);
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').health, 'Eliminated'); assert.equal(own(state, 'seat-1').slotId, slot);
    assert.equal(own(state, 'seat-1').location, 'Hospital'); assert.equal(own(state, 'seat-1').medicalEpisode, null);
    assert.equal(own(state, 'seat-1').medicalEpisodeCount, 1); assert.equal(pubSeat(state, 'seat-1').medical, null);
    assert.equal(own(state, 'seat-1').protection.consumed, false); d.replay(state);
  });

  test(`${mode} seats: a no-op Rescue spends its use, healing clears one episode, and a later R4 injury gets a new R5 deadline`, () => {
    const d = driver(mode);
    let state = accepted(d.apply(turn(d, d.initial, 1, 'seat-2'), 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-2').rescuesRemaining, 1); assert.equal(own(state, 'seat-1').medicalEpisodeCount, 0);
    state = closeRound(d, disable(d, state, 2));
    assertEpisode(state, 'seat-1', 1, 2, 3, 'CURRENT_NORMAL_ROUND');
    state = accepted(d.apply(turn(d, state, 3, 'seat-2'), 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    state = accepted(d.apply(turn(d, state, 3, 'seat-4'), 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-4', 'seat-5'] }));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').health, 'Healthy'); assert.equal(own(state, 'seat-1').medicalEpisode, null);
    assert.equal(own(state, 'seat-1').medicalEpisodeCount, 1); assert.equal(own(state, 'seat-2').rescuesRemaining, 0);
    assert.equal(own(state, 'seat-5').ordinaryWeapons, 2, 'Only the original Undercover weapon plus a real R3 grant is spent later');
    state = accepted(d.apply(turn(d, state, 4, 'seat-5'), 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }));
    state = closeRound(d, state);
    assertEpisode(state, 'seat-1', 2, 4, 5, 'CURRENT_NORMAL_ROUND');
    const recovered = copy(state); assert.deepEqual(views(recovered), views(state));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').health, 'Eliminated'); assert.equal(own(state, 'seat-1').medicalEpisodeCount, 2);
    assert.equal(own(state, 'seat-1').medicalEpisode, null); d.replay(state);
  });

  test(`${mode} seats: R3 Rescue precedes due death while real Supplier grants survive in both saved and unsaved outcomes`, () => {
    for (const rescue of [false, true]) {
      const d = driver(mode);
      let state = closeRound(d, disable(d, d.initial, 2));
      assertEpisode(state, 'seat-1', 1, 2, 3, 'CURRENT_NORMAL_ROUND');
      state = turn(d, state, 3, 'seat-2');
      if (rescue) state = accepted(d.apply(state, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
      state = accepted(d.apply(turn(d, state, 3, 'seat-4'), 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-2', 'seat-5'] }));
      state = closeRound(d, state);
      assert.equal(own(state, 'seat-1').health, rescue ? 'Healthy' : 'Eliminated');
      assert.equal(own(state, 'seat-1').medicalEpisode, null); assert.equal(own(state, 'seat-1').medicalEpisodeCount, 1);
      assert.equal(own(state, 'seat-2').ordinaryWeapons, 1); assert.equal(own(state, 'seat-5').ordinaryWeapons, 2);
      assert.equal(own(state, 'seat-2').rescuesRemaining, rescue ? 1 : 2);
      assert.deepEqual(state.supplierGrantResults[0].successfulRecipientSeatIds, ['seat-2', 'seat-5']); d.replay(state);
    }
  });

  test(`${mode} seats: two legally registered R4 hits eliminate before Rescue and keep a Hospital body in its bed`, () => {
    const d = driver(mode);
    let state = turn(d, d.initial, 4, 'seat-2');
    state = accepted(d.apply(state, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    state = disable(d, state, 4);
    state = accepted(d.apply(turn(d, state, 4, 'seat-5'), 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').health, 'Eliminated'); assert.equal(own(state, 'seat-1').location, 'Hospital');
    assert.equal(own(state, 'seat-1').slotId, 'H1'); assert.equal(own(state, 'seat-1').medicalEpisodeCount, 1);
    assert.equal(own(state, 'seat-1').medicalEpisode, null); assert.equal(own(state, 'seat-2').rescuesRemaining, 1);
    assert.equal(own(state, 'seat-5').ordinaryWeapons, 0);
    state = turn(d, state, 5, 'seat-2');
    rejected(d.apply(state, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }), state);
    assert.equal(own(state, 'seat-2').rescuesRemaining, 1, 'A rejected resurrection cannot spend another Rescue'); d.replay(state);
  });

  test(`${mode} seats: R4 admission receives R5 Rescue while a new R5 patient receives no accelerated death or additional round`, () => {
    const d = driver(mode); let state = closeRound(d, disable(d, d.initial, 4));
    assertEpisode(state, 'seat-1', 1, 4, 5, 'CURRENT_NORMAL_ROUND');
    state = accepted(d.apply(turn(d, state, 5, 'seat-2'), 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    state = accepted(d.apply(turn(d, state, 5, 'seat-5'), 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' }));
    state = closeRound(d, state);
    assert.equal(state.phase.kind, 'FINISHED'); assert.equal(state.round, 5);
    assert.equal(own(state, 'seat-1').health, 'Healthy'); assert.equal(own(state, 'seat-1').medicalEpisode, null);
    assert.equal(own(state, 'seat-1').medicalEpisodeCount, 1); assert.equal(own(state, 'seat-2').rescuesRemaining, 1);
    assertEpisode(state, 'seat-4', 1, 5, null, 'CLOSED');
    assert.equal(own(state, 'seat-4').slotId, 'H1', 'The healed departure frees its berth before the final Hospital entry'); d.replay(state);
  });

  test(`${mode} seats: a queued attack survives detention and admits the injured prisoner directly to Hospital`, () => {
    const d = driver(mode);
    let state = closeRound(d, disable(d, d.initial, 1), 'seat-1');
    assert.equal(own(state, 'seat-1').jailed, true);
    assertEpisode(state, 'seat-1', 1, 1, 2, 'CURRENT_NORMAL_ROUND');
    assert.equal(count(state, 'Jail'), 0); assert.equal(own(state, 'seat-1').slotId, 'H1');
    assert.deepEqual(views(state).players['seat-1'].self.movementDestinations, []);
    state = accepted(d.apply(turn(d, state, 2, 'seat-2'), 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').health, 'Healthy'); assert.equal(own(state, 'seat-1').jailed, true);
    assert.equal(own(state, 'seat-1').location, 'Jail'); assert.equal(own(state, 'seat-1').slotId, 'J1');
    assert.equal(own(state, 'seat-1').medicalEpisode, null); assert.equal(own(state, 'seat-1').movedInRound, false); d.replay(state);
  });

  test(`${mode} seats: a Jail vote against an existing patient preserves the Hospital slot until registered healing returns them to Jail`, () => {
    const d = driver(mode);
    let state = closeRound(d, disable(d, d.initial, 1));
    const slot = own(state, 'seat-1').slotId;
    state = accepted(d.apply(turn(d, state, 2, 'seat-2'), 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    state = d.until(state, value => value.phase.kind === 'JAIL_VOTE'); state = vote(d, state, 'seat-1');
    assert.equal(state.phase.kind, 'VOTE_RESULT'); assert.equal(own(state, 'seat-1').jailed, true);
    assert.equal(own(state, 'seat-1').slotId, slot); assert.equal(own(state, 'seat-1').location, 'Hospital');
    assertEpisode(state, 'seat-1', 1, 1, 2, 'CURRENT_NORMAL_ROUND');
    state = d.tick(state);
    assert.equal(own(state, 'seat-1').health, 'Healthy'); assert.equal(own(state, 'seat-1').location, 'Jail');
    assert.equal(own(state, 'seat-1').slotId, 'J1'); assert.equal(own(state, 'seat-1').jailed, true); d.replay(state);
  });

  test(`${mode} seats: a healed free patient falls back from a full remembered room and remembers the actual destination without spending a move`, () => {
    const d = driver(mode);
    let state = closeRound(d, disable(d, d.initial, 1));
    state = turn(d, state, 2, 'seat-2');
    state = accepted(d.apply(state, 'seat-6', { type: 'MOVE', destination: 'Room A' }));
    assert.equal(own(state, 'seat-6').slotId, 'A1'); assert.equal(count(state, 'Room A'), 5);
    state = accepted(d.apply(state, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    const neighbour = own(state, 'seat-7').slotId;
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').health, 'Healthy'); assert.equal(own(state, 'seat-1').location, 'Room B');
    assert.equal(own(state, 'seat-1').lastRoom, 'Room B'); assert.equal(own(state, 'seat-1').slotId, 'B1');
    assert.equal(own(state, 'seat-1').movedInRound, false); assert.equal(own(state, 'seat-7').slotId, neighbour); d.replay(state);
  });

  test(`${mode} seats: an attacked Captain goes directly from Command to medical placement, with healed full-room fallback planned atomically`, () => {
    for (const rescue of [false, true]) {
      const d = driver(mode);
      let state = elect(d, closeRound(d, d.initial), 'seat-1');
      state = accepted(d.apply(state, 'seat-1', { type: 'MOVE', destination: 'Room A' }));
      state = closeRound(d, state);
      state = turn(d, state, 3, 'seat-2');
      if (rescue) state = accepted(d.apply(state, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
      state = disable(d, state, 3);
      state = accepted(d.apply(state, 'seat-1', { type: 'MOVE', destination: 'Command Room' }));
      state = accepted(d.apply(state, 'seat-6', { type: 'MOVE', destination: 'Room A' }));
      assert.equal(count(state, 'Room A'), 5); assert.equal(own(state, 'seat-1').slotId, 'C1');
      state = closeRound(d, state);
      assert.equal(own(state, 'seat-1').captain, false); assert.equal(count(state, 'Command Room'), 0);
      if (rescue) {
        assert.equal(own(state, 'seat-1').health, 'Healthy'); assert.equal(own(state, 'seat-1').location, 'Room B');
        assert.equal(own(state, 'seat-1').slotId, 'B1'); assert.equal(own(state, 'seat-1').lastRoom, 'Room B');
        assert.equal(own(state, 'seat-1').medicalEpisode, null);
      } else assertEpisode(state, 'seat-1', 1, 3, 4, 'CURRENT_NORMAL_ROUND');
      assert.equal(own(state, 'seat-1').medicalEpisodeCount, 1); d.replay(state);
    }
  });
}

function reachShowdown(d, mode) {
  // Legal full-match history. Jail two Blue seats at 7/9 players, one at 8,
  // elect Supplier to Command, then injure Blue Disabler in R5. Healthy power
  // ties exactly: 2:2 at seven, 3:3 at eight and nine. No fake weapon grant,
  // injected winner, phase, health or queued special shot is used.
  let state = d.initial;
  for (let round = 1; round <= 5; round++) {
    if (round === 2) state = elect(d, state, 'seat-4');
    if (round === 5) state = accepted(d.apply(turn(d, state, 5, 'seat-5'), 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-3' }));
    const target = round === 1 ? 'seat-1' : round === 2 && mode !== 8 ? 'seat-2' : null;
    state = closeRound(d, state, target);
  }
  assert.equal(state.phase.kind, 'SHOWDOWN'); assert.equal(state.round, 5);
  assertEpisode(state, 'seat-3', 1, 5, null, 'NO_ADDITIONAL_ROUND');
  assert.equal(own(state, 'seat-4').location, 'Command Room'); assert.equal(own(state, 'seat-4').slotId, 'C1');
  assert.equal(own(state, 'seat-1').location, 'Jail'); assert.equal(own(state, 'seat-1').slotId, 'J1');
  assert.equal(state.seats.some(seat => seat.location === 'Final Zone'), false);
  for (const seat of state.seats) assert.equal(seat.specialShotAvailable, true);
  return state;
}

for (const mode of [7, 8, 9]) {
  test(`${mode} seats: legal R5 showdown keeps actual rooms, gives injured/jailed special shots and can fill the whole Hospital including its retained body`, () => {
    const d = driver(mode); let state = reachShowdown(d, mode);
    const before = copy(state.seats);
    for (let number = 1; number <= mode; number++) {
      const actor = `seat-${number}`, target = `seat-${number === mode ? 1 : number + 1}`;
      assert.ok(views(state).players[actor].legalTargets.SHOWDOWN_SHOT.includes(target));
      state = accepted(d.apply(state, actor, { type: 'SHOWDOWN_SHOT', targetSeatId: target }));
      assert.deepEqual(state.seats.map(seat => [seat.seatId, seat.health, seat.location, seat.slotId]),
        before.map(seat => [seat.seatId, seat.health, seat.location, seat.slotId]), 'No special damage occurs before the full registration window closes');
    }
    state = d.tick(state);
    assert.equal(state.phase.kind, 'FINISHED'); assert.equal(state.result.winner, 'Draw');
    assert.equal(count(state, 'Hospital'), mode, 'Hospital admits the entire starting roster and counts the retained body');
    assert.equal(count(state, 'Jail'), 0); assert.equal(count(state, 'Command Room'), 0);
    assert.deepEqual(new Set(state.seats.map(seat => seat.slotId)), new Set(Array.from({ length: mode }, (_, i) => `H${i + 1}`)));
    assert.equal(own(state, 'seat-3').health, 'Eliminated'); assert.equal(own(state, 'seat-3').slotId, 'H1');
    for (const seat of state.seats) {
      assert.equal(seat.specialShotAvailable, false); assert.equal(seat.captain, false);
      assert.equal(seat.medicalEpisodeCount, 1);
      if (seat.seatId === 'seat-3') { assert.equal(seat.medicalEpisode, null); assert.equal(pubSeat(state, seat.seatId).medical, null); }
      else {
        assert.equal(seat.health, 'Injured');
        assertEpisode(state, seat.seatId, 1, 5, null, 'CLOSED');
      }
      assert.equal(seat.jailed, before.find(value => value.seatId === seat.seatId).jailed);
    }
    d.replay(state);
  });

  test(`${mode} seats: all special shots resolve in recorded R5 order after earlier shooters are eliminated, with no intermediate victory`, () => {
    const d = driver(mode); let state = reachShowdown(d, mode);
    const targets = ['seat-3', 'seat-4', 'seat-4', 'seat-5', 'seat-6', 'seat-7', 'seat-6', 'seat-6', 'seat-6'];
    for (let number = 1; number <= mode; number++) state = accepted(d.apply(state, `seat-${number}`, { type: 'SHOWDOWN_SHOT', targetSeatId: targets[number - 1] }));
    state = d.tick(state);
    assert.equal(state.phase.kind, 'FINISHED'); assert.equal(state.result.winner, 'Draw');
    const contributors = faction => state.seats.filter(seat => seat.faction === faction && seat.health === 'Healthy' && !seat.jailed).map(seat => seat.seatId);
    assert.deepEqual(contributors('Blue'), mode === 7 ? [] : [mode === 8 ? 'seat-2' : 'seat-9']);
    assert.deepEqual(contributors('Red'), mode === 7 ? [] : ['seat-8']);
    assert.deepEqual(contributors('Alien'), [], 'The injured Alien adds no healthy power');
    assert.equal(own(state, 'seat-3').health, 'Eliminated'); assert.equal(own(state, 'seat-3').slotId, 'H1');
    assert.equal(own(state, 'seat-4').health, 'Eliminated', 'The already-eliminated seat 3 still delivers its registered shot');
    assert.equal(own(state, 'seat-4').location, 'Hospital'); assert.equal(own(state, 'seat-4').slotId, 'H2');
    assert.equal(own(state, 'seat-5').health, 'Injured', 'The already-eliminated Captain still delivers its registered shot');
    assert.equal(own(state, 'seat-6').health, 'Eliminated'); assert.equal(own(state, 'seat-7').health, 'Injured');
    assert.equal(own(state, 'seat-1').slotId, 'J1');
    if (mode !== 8) assert.equal(own(state, 'seat-2').slotId, 'J2');
    for (const seat of state.seats) assert.equal(seat.specialShotAvailable, false);
    assertEpisode(state, 'seat-5', 1, 5, null, 'CLOSED'); d.replay(state);
  });

  test(`${mode} seats: inactive medical tuple never offers the legacy remote release ballot`, () => {
    const d = driver(mode); let state = elect(d, closeRound(d, d.initial, 'seat-1'));
    assert.equal(own(state, 'seat-4').location, 'Command Room');
    assert.equal(own(state, 'seat-1').jailed, true);
    assert.equal(views(state).players['seat-4'].legalTargets.RELEASE_CHOICE, undefined);
    rejected(d.apply(state, 'seat-4', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-1' }), state);
    rejected(d.apply(state, 'seat-4', { type: 'RELEASE_VOTE', approve: true }), state);
    state = d.until(state, value => value.phase.kind === 'JAIL_VOTE');
    assert.equal(state.round, 2, 'The turn sequence reaches Jail voting without a selected-prisoner release stage');
    d.replay(state);
  });

  test(`${mode} seats: strict contracts reject missing/duplicate/wrong-room slots, invalid medical opportunities and private/source metadata`, () => {
    const d = driver(mode), injured = closeRound(d, disable(d, d.initial, 1));
    const valid = views(injured).public;
    const invalidSeat = patch => {
      const candidate = copy(valid); candidate.seats[0] = { ...candidate.seats[0], ...patch };
      assert.equal(FullPublicViewSchema.safeParse(candidate).success, false, JSON.stringify(patch));
      const player = { ...copy(views(injured).players['seat-2']), seats: candidate.seats };
      assert.equal(FullPlayerViewSchema.safeParse(player).success, false, 'Composed player views enforce the same public invariant');
    };
    for (const field of ['slotId', 'medical']) {
      const candidate = copy(valid); delete candidate.seats[0][field];
      assert.equal(FullPublicViewSchema.safeParse(candidate).success, false, `Missing ${field}`);
    }
    for (const slotId of ['A1', `H${mode + 1}`, 'H0', 'H01', 'h1', null]) invalidSeat({ slotId });
    invalidSeat({ location: 'Room A', slotId: 'A1' });
    invalidSeat({ medical: null });
    invalidSeat({ medical: { admittedRound: 1, rescueDueAfterRound: 3, rescueOpportunity: 'CURRENT_NORMAL_ROUND' } });
    invalidSeat({ medical: { admittedRound: 1, rescueDueAfterRound: null, rescueOpportunity: 'NO_ADDITIONAL_ROUND' } });
    invalidSeat({ medical: { admittedRound: 3, rescueDueAfterRound: 4, rescueOpportunity: 'NEXT_NORMAL_ROUND' } });
    invalidSeat({ medical: { admittedRound: 1, rescueDueAfterRound: 2, rescueOpportunity: 'NEXT_NORMAL_ROUND' } });
    invalidSeat({ medical: { ...valid.seats[0].medical, rescueOpportunity: 'GUARANTEED_RESCUE' } });
    invalidSeat({ medical: { ...valid.seats[0].medical, sourceSeatId: 'seat-3' } });
    invalidSeat({ medicalEpisodeCount: 1 });
    invalidSeat({ health: 'Eliminated', revealedFaction: 'Blue' });
    invalidSeat({ location: 'Final Zone', slotId: 'F1' });
    invalidSeat({ location: null, slotId: null, health: 'Eliminated', revealedFaction: 'Blue', medical: null });
    const duplicate = copy(views(d.initial).public); duplicate.seats[1].slotId = duplicate.seats[0].slotId;
    assert.equal(FullPublicViewSchema.safeParse(duplicate).success, false);
    const healthyMedical = copy(views(d.initial).public); healthyMedical.seats[0].medical = valid.seats[0].medical;
    assert.equal(FullPublicViewSchema.safeParse(healthyMedical).success, false);
    const falseCaptain = copy(views(d.initial).public); Object.assign(falseCaptain.seats[0], { location: 'Command Room', slotId: 'C1' });
    assert.equal(FullPublicViewSchema.safeParse(falseCaptain).success, false);
    d.replay(injured);
  });

  test(`${mode} seats SYNTHETIC projection edge: admission-round opportunity, abort closure and impossible medical detention cannot be confused with extra gameplay`, () => {
    const d = driver(mode), predecessor = copy(d.initial);
    // Synthetic predecessor only, not a claimed canonical command history: an
    // admission-round projection before its next normal round. No action is run
    // from the altered source; it tests schema/public indicator boundaries.
    Object.assign(own(predecessor, 'seat-1'), { health: 'Injured', location: 'Hospital', slotId: 'H1',
      medicalEpisodeCount: 1, medicalEpisode: { number: 1, admittedRound: 1, deathDueAfterRound: 2 } });
    views(predecessor); assertEpisode(predecessor, 'seat-1', 1, 1, 2, 'NEXT_NORMAL_ROUND');
    const recovered = copy(predecessor); assert.deepEqual(projectFullGame(recovered), projectFullGame(predecessor));
    const aborted = abortFullGame(predecessor, d.context(predecessor.phase.startedAt + 1));
    assert.equal(aborted.phase.kind, 'ABORTED'); views(aborted); assertEpisode(aborted, 'seat-1', 1, 1, 2, 'CLOSED');
    const impossible = copy(views(d.initial).public);
    for (let index = 0; index < 6; index++) {
      Object.assign(impossible.seats[index], { jailed: true, captain: false,
        location: index < 3 ? 'Jail' : 'Hospital', slotId: `${index < 3 ? 'J' : 'H'}${index % 3 + 1}`,
        health: index < 3 ? 'Healthy' : 'Injured', medical: index < 3 ? null
          : { admittedRound: 1, rescueDueAfterRound: 2, rescueOpportunity: 'NEXT_NORMAL_ROUND' } });
    }
    assert.equal(FullPublicViewSchema.safeParse(impossible).success, false,
      'Six physical/medical detainees violate the canonical Jail return invariant even with separate room space');
  });
}

for (const mode of [7, 8, 9]) for (const pins of LEGACY) {
  test(`${mode} seats: exact ${pins.engineVersion} retains absent slot/medical fields, old Hack shape, persistent injury and deterministic replay`, () => {
    const d = driver(mode, { pins }); let state = d.initial;
    const original = copy(state.versions);
    state = accepted(d.apply(state, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }));
    state = accepted(d.apply(state, 'seat-1', { type: 'MOVE', destination: 'Room B' }));
    state = d.tick(state);
    if (state.phase.kind === 'HACK_DECLARE') {
      state = accepted(d.apply(state, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }));
      state = d.tick(state);
    }
    assert.equal(state.phase.kind, 'HACK'); assert.equal(state.phase.endsAt - state.phase.startedAt, 60_000);
    assert.equal(Object.hasOwn(views(state).public, 'hackSession'), pins === PUBLIC_HACK_FULL_GAME_VERSION_PINS);
    state = d.tick(state);
    state = accepted(d.apply(turn(d, state, 1, 'seat-3'), 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-2' }));
    state = closeRound(d, state); assert.equal(own(state, 'seat-2').health, 'Injured');
    state = closeRound(d, state); assert.equal(state.round, 3);
    assert.equal(own(state, 'seat-2').health, 'Injured', 'Historical injury does not acquire the new aging deadline');
    assert.deepEqual(state.versions, original);
    const view = views(state).public;
    for (const extra of [{ slotId: 'H1' }, { medical: null }]) {
      const candidate = copy(view); candidate.seats[1] = { ...candidate.seats[1], ...extra };
      assert.equal(FullPublicViewSchema.safeParse(candidate).success, false, 'Legacy seat shapes reject even nullable new properties');
    }
    const capacity = fullRoomCapacityForVersions(state.versions, 'Hospital', mode);
    assert.equal(capacity, [LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS].includes(pins) ? null : 5);
    d.replay(state);
  });
}

for (const mode of [7, 8, 9]) test(`${mode} seats SYNTHETIC restored-state guard: Healthy/free Jail occupancy fails closed before stale command, deadline and abort handling`, () => {
  const d = driver(mode), corrupt = copy(d.initial);
  // Explicit corrupt predecessor, not a legal move or detention history. The
  // corresponding valid Healthy/free occupant belongs in an ordinary room.
  Object.assign(own(corrupt, 'seat-1'), { location: 'Jail', slotId: 'J1' });
  assert.equal(own(corrupt, 'seat-1').health, 'Healthy'); assert.equal(own(corrupt, 'seat-1').jailed, false);
  const before = copy(corrupt), context = { now: START + 1, nextPhaseId: 'guard-next-phase', nextDeadlineToken: 'guard-next-token' };
  assert.throws(() => projectFullGame(corrupt), 'A corrupt private room/detention pairing cannot be projected');
  for (const stale of [false, true]) {
    const request = { protocolVersion: 2, matchId: corrupt.matchId, phaseId: stale ? 'stale-ordinary-phase' : corrupt.phase.id,
      commandId: `guard-${stale ? 'stale' : 'current'}-command`, command: { type: 'PASS_TURN' } };
    assert.throws(() => executeFullGame(corrupt, 'seat-1', request, context), 'Invalid restored authority cannot hide behind a stale receipt rejection');
    assert.throws(() => advanceFullGame(corrupt, { ...context, now: corrupt.phase.endsAt,
      phaseId: stale ? 'stale-deadline-phase' : corrupt.phase.id,
      deadlineToken: stale ? 'stale-deadline-token' : corrupt.deadlineToken }), 'Invalid restored authority is checked even for obsolete deadlines');
  }
  assert.throws(() => abortFullGame(corrupt, context));
  assert.deepEqual(corrupt, before, 'Every failed invariant path preserves its input');
  const publicView = copy(views(d.initial).public);
  Object.assign(publicView.seats[0], { location: 'Jail', slotId: 'J1' });
  assert.equal(FullPublicViewSchema.safeParse(publicView).success, false, 'Correct slot prefix cannot legitimize a Healthy/free Jail occupant');
  const player = { ...copy(views(d.initial).players['seat-2']), seats: publicView.seats };
  assert.equal(FullPlayerViewSchema.safeParse(player).success, false);
});

function assertMedicalHack(state, { actor, target, hackId, status, side, patient }) {
  const projected = views(state), session = { hackId, actorSeatId: actor, targetSeatId: target };
  assert.deepEqual(projected.public.hackSession, session);
  assert.equal(Object.hasOwn(projected.public, 'hackFeedback'), false);
  assert.deepEqual(own(state, 'seat-1'), patient, 'Hack clocks and claims cannot age, move or re-admit the existing patient');
  assertEpisode(state, 'seat-1', patient.medicalEpisode.number, patient.medicalEpisode.admittedRound,
    patient.medicalEpisode.deathDueAfterRound, 'CURRENT_NORMAL_ROUND');
  for (const [id, view] of Object.entries(projected.players)) {
    assert.deepEqual(view.hackSession, session);
    if ([actor, target].includes(id)) {
      assert.equal(view.hackPartnerSeatId, id === actor ? target : actor);
      assert.deepEqual(view.hackFeedback, { hackId, phaseId: state.phase.id, round: state.round, status, declaredSide: side });
    } else { assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null); }
  }
}
function assertFullHackWindow(d, state, milliseconds) {
  assert.equal(state.phase.endsAt - state.phase.startedAt, milliseconds);
  const early = advanceFullGame(state, { ...d.context(state.phase.endsAt - 1), phaseId: state.phase.id, deadlineToken: state.deadlineToken });
  assert.equal(early.advanced, false); assert.strictEqual(early.state, state);
}

for (const mode of [7, 8, 9]) {
  test(`${mode} seats: active Protection blocks a Healthy target without creating a medical episode or moving its slot`, () => {
    const d = driver(mode);
    let state = accepted(d.apply(turn(d, d.initial, 1, 'seat-5'), 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').protection.activeFromRound, 2);
    assert.equal(own(state, 'seat-1').protection.consumed, false);
    state = closeRound(d, disable(d, state, 2));
    assert.equal(own(state, 'seat-1').health, 'Healthy'); assert.equal(own(state, 'seat-1').location, 'Room A');
    assert.equal(own(state, 'seat-1').slotId, 'A1'); assert.equal(own(state, 'seat-1').medicalEpisodeCount, 0);
    assert.equal(own(state, 'seat-1').medicalEpisode, null); assert.equal(pubSeat(state, 'seat-1').medical, null);
    assert.equal(own(state, 'seat-1').protection.consumed, true); assert.equal(own(state, 'seat-3').disablerSpent, true);
    assert.equal(count(state, 'Hospital'), 0); d.replay(state);
  });

  test(`${mode} seats: two legal hits against one active shield consume it once and create exactly one new episode`, () => {
    const d = driver(mode);
    let state = accepted(d.apply(turn(d, d.initial, 1, 'seat-5'), 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }));
    state = closeRound(d, state);
    state = disable(d, state, 4);
    state = accepted(d.apply(turn(d, state, 4, 'seat-5'), 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }));
    state = closeRound(d, state);
    assertEpisode(state, 'seat-1', 1, 4, 5, 'CURRENT_NORMAL_ROUND');
    assert.equal(own(state, 'seat-1').slotId, 'H1'); assert.equal(own(state, 'seat-1').protection.consumed, true);
    assert.equal(own(state, 'seat-3').disablerSpent, true); assert.equal(own(state, 'seat-5').ordinaryWeapons, 0);
    assert.equal(count(state, 'Hospital'), 1); d.replay(state);
  });

  test(`${mode} seats: new medical tuple inherits 15/5/60 public Hack, latest-slot return and final-turn cutoff without advancing a patient's episode`, () => {
    for (const final of [false, true]) {
      const d = driver(mode); let state = closeRound(d, disable(d, d.initial, 1));
      const actor = final ? `seat-${mode}` : 'seat-4', target = final ? 'seat-6' : 'seat-5', side = final ? 'Red' : 'Blue';
      state = turn(d, state, 2, actor);
      const patient = copy(own(state, 'seat-1'));
      if (final) assert.ok(views(state).players['seat-6'].self.movementDestinations.includes('Room A'));
      state = accepted(d.apply(state, actor, { type: 'REQUEST_HACK', targetSeatId: target }));
      state = accepted(d.apply(state, actor, { type: 'PASS_TURN' }));
      const hackId = state.phase.id;
      assert.equal(state.phase.kind, 'HACK_DECLARE'); assertFullHackWindow(d, state, 15_000);
      assertMedicalHack(state, { actor, target, hackId, status: 'AWAITING_DECLARATION', side: null, patient });
      let latestSlot = own(state, actor).slotId;
      if (!final) {
        const phase = copy(state.phase);
        state = accepted(d.apply(state, actor, { type: 'MOVE', destination: 'Room B' }));
        latestSlot = `B${mode - 4}`; assert.equal(own(state, actor).slotId, latestSlot);
        assert.deepEqual(state.phase, phase); assert.equal(own(state, actor).location, 'Room B');
      }
      for (const stage of ['HACK_DECLARE', 'HACK_RESULT', 'HACK']) {
        assert.equal(state.phase.kind, stage);
        const status = stage === 'HACK_DECLARE' ? 'AWAITING_DECLARATION' : 'DECLARED';
        assertMedicalHack(state, { actor, target, hackId, status, side: stage === 'HACK_DECLARE' ? null : side, patient });
        assertFullHackWindow(d, state, stage === 'HACK_DECLARE' ? 15_000 : stage === 'HACK_RESULT' ? 5000 : 60_000);
        if (final) {
          for (const view of Object.values(views(state).players)) assert.deepEqual(view.self.movementDestinations, []);
          assert.equal(count(state, 'Room A'), 4); assert.equal(own(state, 'seat-6').movedInRound, false);
          rejected(d.apply(state, 'seat-6', { type: 'MOVE', destination: 'Room A' }), state);
        }
        state = stage === 'HACK_DECLARE'
          ? accepted(d.apply(state, target, { type: 'DECLARE_HACK_SIDE', declaredSide: side })) : d.tick(state);
      }
      assert.equal(views(state).public.hackSession, null);
      assert.deepEqual(own(state, 'seat-1'), patient, 'Conversation completion is not a normal-round medical tick');
      assert.equal(own(state, actor).slotId, latestSlot, 'Exit preserves the latest committed slot rather than restoring departure art');
      assert.equal(state.phase.kind, final ? 'JAIL_VOTE' : 'ORDINARY_TURN');
      state = closeRound(d, state);
      assert.equal(own(state, 'seat-1').health, 'Eliminated'); assert.equal(own(state, 'seat-1').slotId, patient.slotId);
      assert.equal(own(state, 'seat-1').medicalEpisodeCount, 1); d.replay(state);
    }
  });

  test(`${mode} seats: final R5 Hack closes movement but preserves independent Code availability only in the full conversation`, () => {
    const ids = Array.from({ length: mode }, (_, index) => `seat-${index + 1}`);
    const orders = Array.from({ length: 5 }, (_, index) => index === 4 ? [...ids.filter(id => id !== 'seat-6'), 'seat-6'] : [...ids]);
    const d = driver(mode, { orders }); let state = closeRound(d, disable(d, d.initial, 4));
    state = turn(d, state, 5, 'seat-6');
    assert.equal(state.turnIndex, mode - 1);
    const patient = copy(own(state, 'seat-1')), code = { type: 'SUBMIT_CODE', seatIds: ['seat-1', 'seat-2', 'seat-3', 'seat-7'] };
    state = accepted(d.apply(state, 'seat-6', { type: 'REQUEST_HACK', targetSeatId: 'seat-7' }));
    state = accepted(d.apply(state, 'seat-6', { type: 'PASS_TURN' }));
    const hackId = state.phase.id;
    for (const stage of ['HACK_DECLARE', 'HACK_RESULT']) {
      assert.equal(state.phase.kind, stage);
      assertMedicalHack(state, { actor: 'seat-6', target: 'seat-7', hackId,
        status: stage === 'HACK_DECLARE' ? 'AWAITING_DECLARATION' : 'DECLARED', side: stage === 'HACK_DECLARE' ? null : 'Blue', patient });
      assert.equal(views(state).players['seat-6'].self.codeAttemptAvailable, false);
      rejected(d.apply(state, 'seat-6', code), state);
      for (const view of Object.values(views(state).players)) assert.deepEqual(view.self.movementDestinations, []);
      assertFullHackWindow(d, state, stage === 'HACK_DECLARE' ? 15_000 : 5000);
      state = stage === 'HACK_DECLARE'
        ? accepted(d.apply(state, 'seat-7', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' })) : d.tick(state);
    }
    assert.equal(state.phase.kind, 'HACK'); assertFullHackWindow(d, state, 60_000);
    assertMedicalHack(state, { actor: 'seat-6', target: 'seat-7', hackId, status: 'DECLARED', side: 'Blue', patient });
    assert.ok(views(state).players['seat-6'].self.codeAttemptAvailable);
    assert.equal(count(state, 'Room A'), 4); rejected(d.apply(state, 'seat-6', { type: 'MOVE', destination: 'Room A' }), state);
    const conversation = copy(state.phase);
    state = accepted(d.apply(state, 'seat-6', code));
    assert.equal(state.correctCode, true); assert.equal(state.codeSubmitted, true); assert.deepEqual(state.phase, conversation);
    assert.equal(views(state).players['seat-6'].self.codeAttemptAvailable, false);
    assert.deepEqual(own(state, 'seat-1'), patient); assertFullHackWindow(d, state, 60_000);
    state = d.tick(state);
    assert.equal(state.phase.kind, 'JAIL_VOTE'); assert.equal(views(state).public.hackSession, null);
    assert.deepEqual(own(state, 'seat-1'), patient);
    state = closeRound(d, state);
    assert.equal(state.phase.kind, 'FINISHED'); assert.equal(state.result.winner, 'Red');
    assert.equal(own(state, 'seat-1').health, 'Eliminated'); assert.equal(own(state, 'seat-1').slotId, patient.slotId);
    assert.equal(own(state, 'seat-1').medicalEpisode, null); d.replay(state);
  });

  test(`${mode} seats: a legal healed departure frees its bed before two new patients enter by number despite reverse shot order and a retained body`, () => {
    const d = driver(mode); let state = closeRound(d, disable(d, d.initial, 1));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-1').health, 'Eliminated'); assert.equal(own(state, 'seat-1').slotId, 'H1');
    state = accepted(d.apply(turn(d, state, 3, 'seat-4'), 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-4', 'seat-5'] }));
    state = closeRound(d, state);
    assert.equal(own(state, 'seat-4').ordinaryWeapons, 1); assert.equal(own(state, 'seat-5').ordinaryWeapons, 2);
    state = turn(d, state, 4, 'seat-5');
    state = accepted(d.apply(state, 'seat-6', { type: 'MOVE', destination: 'Room A' }));
    assert.equal(own(state, 'seat-6').slotId, 'A1');
    state = accepted(d.apply(state, 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' }));
    state = closeRound(d, state);
    assertEpisode(state, 'seat-2', 1, 4, 5, 'CURRENT_NORMAL_ROUND'); assert.equal(own(state, 'seat-2').slotId, 'H2');
    state = accepted(d.apply(turn(d, state, 5, 'seat-2'), 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-2' }));
    state = accepted(d.apply(turn(d, state, 5, 'seat-4'), 'seat-4', { type: 'REGISTER_SHOT', targetSeatId: 'seat-6' }));
    state = accepted(d.apply(turn(d, state, 5, 'seat-5'), 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-3' }));
    assert.deepEqual(state.queued.filter(entry => entry.command.type === 'REGISTER_SHOT').map(entry => [entry.actorSeatId, entry.command.targetSeatId]),
      [['seat-4', 'seat-6'], ['seat-5', 'seat-3']]);
    const body = copy(own(state, 'seat-1')), unchanged = ['seat-4', 'seat-5', 'seat-7', ...(mode >= 8 ? ['seat-8'] : []), ...(mode === 9 ? ['seat-9'] : [])]
      .map(id => [id, own(state, id).location, own(state, id).slotId]);
    state = closeRound(d, state);
    assert.equal(state.phase.kind, 'FINISHED'); assert.equal(state.result.winner, 'Blue');
    assert.deepEqual(own(state, 'seat-1'), body, 'The retained Hospital body is neither moved nor readmitted');
    assert.equal(own(state, 'seat-2').health, 'Healthy'); assert.equal(own(state, 'seat-2').location, 'Room A');
    assert.equal(own(state, 'seat-2').slotId, 'A1'); assert.equal(own(state, 'seat-2').medicalEpisode, null);
    assert.equal(own(state, 'seat-2').medicalEpisodeCount, 1); assert.equal(own(state, 'seat-2').rescuesRemaining, 1);
    assertEpisode(state, 'seat-3', 1, 5, null, 'CLOSED'); assert.equal(own(state, 'seat-3').slotId, 'H2');
    assertEpisode(state, 'seat-6', 1, 5, null, 'CLOSED'); assert.equal(own(state, 'seat-6').slotId, 'H3');
    assert.deepEqual(unchanged.map(([id]) => [id, own(state, id).location, own(state, id).slotId]), unchanged);
    assert.equal(own(state, 'seat-4').ordinaryWeapons, 0); assert.equal(own(state, 'seat-5').ordinaryWeapons, 0);
    d.replay(state);
  });
}
