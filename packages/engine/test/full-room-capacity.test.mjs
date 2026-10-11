import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPlayerViewSchema, FullPublicViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, projectFullGame, projectOwnAcknowledgments,
} from '../dist/index.js';

// Independent rule-correctness cases for issue #96. These are synthetic engine tests,
// not human balance evidence. CAP-ORDER-01 follows the owner's approved policy:
// free healed Hospital places first, then use existing seat order.
const START = 1_800_000_000_000;
const ASSETS = 'capacity-fixture-assets-v1';
const ROLES = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const count = (state, location) => state.seats.filter(seat => seat.location === location).length;
const own = (state, id) => state.seats.find(seat => seat.seatId === id);
function argumentsFor(playerCount, pins = FULL_GAME_VERSION_PINS, roomACount = 5) {
  const roleOrder = [...ROLES, ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  return { matchId: 'room-capacity-fixture', setup: { playerCount, roleOrder,
    codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < roomACount ? 'Room A' : 'Room B'])),
    roundOrders: Array.from({ length: 5 }, () => [...ids]) },
  now: START, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: ASSETS,
  versions: { ...pins, assetManifestVersion: ASSETS } };
}
function assertCaps(state) {
  for (const room of ['Room A', 'Room B', 'Hospital', 'Jail']) assert.ok(count(state, room) <= 5, `${room} exceeds five`);
  assert.ok(count(state, 'Command Room') <= 1);
  for (const seat of state.seats.filter(seat => seat.location === 'Command Room')) assert.equal(seat.captain, true);
  assert.equal(new Set(state.seats.map(seat => seat.seatId)).size, state.playerCount);
}
function validViews(state) {
  const views = projectFullGame(state);
  FullPublicViewSchema.parse(views.public);
  for (const view of Object.values(views.players)) FullPlayerViewSchema.parse(view);
  return views;
}
function driver(playerCount, pins = FULL_GAME_VERSION_PINS, roomACount = 5) {
  let serial = 0;
  const initial = createFullGame(argumentsFor(playerCount, pins, roomACount));
  const context = now => ({ now, nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `deadline-${serial}` });
  const request = (state, command, commandId = `command-${++serial}`) => ({ protocolVersion: 2,
    matchId: state.matchId, phaseId: state.phase.id, commandId, command });
  const apply = (state, actor, command, now = state.phase.startedAt + 1) => {
    const result = executeFullGame(state, actor, request(state, command), context(now));
    FullReceiptSchema.parse(result.receipt);
    return result;
  };
  const tick = state => {
    assert.notEqual(state.phase.endsAt, null, 'Fixture must reach its checkpoint before terminal state');
    const result = advanceFullGame(state, { ...context(state.phase.endsAt), phaseId: state.phase.id, deadlineToken: state.deadlineToken });
    assert.equal(result.advanced, true);
    assertCaps(result.state); validViews(result.state);
    return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let step = 0; !predicate(current); step++) {
      assert.ok(step < 240, 'Canonical lifecycle did not reach the bounded checkpoint');
      current = tick(current);
    }
    return current;
  };
  return { initial, context, request, apply, tick, until };
}
function accepted(result) {
  assert.equal(result.receipt.status, 'accepted');
  assert.equal(result.receipt.code, 'REGISTERED');
  return result.state;
}
function rejected(result, state, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected');
  assert.equal(result.receipt.code, code);
  assert.strictEqual(result.state, state, 'Rejection must not mutate any resource, move or projection state');
}
const closeRound = (d, state) => d.tick(d.until(state, next => next.phase.kind === 'JAIL_VOTE'));
function approveRelease(d, state, captainId, targetId) {
  const choice = d.until(state, next => next.phase.kind === 'RELEASE_CHOICE');
  const requested = accepted(d.apply(choice, captainId, { type: 'RELEASE_CHOICE', targetSeatId: targetId }));
  let vote = requested.phase.kind === 'RELEASE_VOTE' ? requested : d.tick(requested);
  for (const voter of vote.eligibleVoters.slice(0, Math.ceil(vote.eligibleVoters.length / 2))) {
    vote = accepted(d.apply(vote, voter, { type: 'RELEASE_VOTE', approve: true }));
  }
  const result = d.tick(vote);
  assert.equal(result.phase.kind, 'JAIL_VOTE');
  return result;
}

for (const mode of [7, 8, 9]) {
  test(`${mode} seats: every valid starting split respects five and six in either room is refused`, () => {
    for (let a = mode - 5; a <= 5; a++) {
      const state = createFullGame(argumentsFor(mode, FULL_GAME_VERSION_PINS, a));
      assert.equal(count(state, 'Room A'), a);
      assert.equal(count(state, 'Room B'), mode - a);
      assertCaps(state); validViews(state);
    }
    for (const a of [6, mode - 6]) assert.throws(() => createFullGame(argumentsFor(mode, FULL_GAME_VERSION_PINS, a)), /capacity/);
  });

  test(`${mode} seats: full movement offer is absent and server refuses entry including Eliminated occupants`, () => {
    const d = driver(mode), state = structuredClone(d.initial);
    own(state, 'seat-1').health = 'Eliminated';
    const before = structuredClone(state), actor = own(state, 'seat-6');
    assert.equal(count(state, 'Room A'), 5);
    assert.equal(validViews(state).players[actor.seatId].self.movementDestinations.includes('Room A'), false);
    rejected(d.apply(state, actor.seatId, { type: 'MOVE', destination: 'Room A' }), state);
    assert.deepEqual(state, before);
    assert.equal(actor.movedInRound, false);
  });

  test(`${mode} seats: the last ordinary place goes to the first accepted move in either competitor order`, () => {
    for (const [first, second] of [['seat-5', 'seat-6'], ['seat-6', 'seat-5']]) {
      const d = driver(mode, FULL_GAME_VERSION_PINS, 4), before = structuredClone(d.initial);
      const moved = accepted(d.apply(d.initial, first, { type: 'MOVE', destination: 'Room A' }));
      assert.equal(count(moved, 'Room A'), 5);
      assert.equal(own(moved, first).movedInRound, true);
      assert.equal(own(moved, second).movedInRound, false);
      assert.equal(validViews(moved).players[second].self.movementDestinations.includes('Room A'), false);
      rejected(d.apply(moved, second, { type: 'MOVE', destination: 'Room A' }), moved);
      assert.deepEqual(d.initial, before); assertCaps(moved);
    }
  });

  test(`${mode} seats: a canonical Rescue returns a healed Hospital patient to the other ordinary room`, () => {
    const d = driver(mode), initial = structuredClone(d.initial);
    // Focused predecessor: a patient is in Hospital and its remembered Room A is full.
    Object.assign(own(initial, 'seat-6'), { health: 'Injured', location: 'Hospital', lastRoom: 'Room A' });
    const turn = d.until(initial, next => next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-2');
    const rescued = accepted(d.apply(turn, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-6' }));
    const resolved = closeRound(d, rescued);
    assert.equal(own(resolved, 'seat-6').health, 'Healthy');
    assert.equal(own(resolved, 'seat-6').location, 'Room B');
    assert.equal(own(resolved, 'seat-6').movedInRound, false);
    assert.equal(own(resolved, 'seat-2').rescuesRemaining, 1);
    assert.equal(count(resolved, 'Room A'), 5); assertCaps(resolved);
  });

  test(`${mode} seats: Healthy release falls back to other ordinary room without spending movement`, () => {
    for (const movedInRound of [false, true]) {
      const d = driver(mode), initial = structuredClone(d.initial);
      Object.assign(own(initial, 'seat-6'), { location: 'Jail', jailed: true, lastRoom: 'Room A', movedInRound });
      Object.assign(own(initial, 'seat-7'), { captain: true, location: 'Command Room' });
      const released = approveRelease(d, initial, 'seat-7', 'seat-6');
      assert.equal(own(released, 'seat-6').jailed, false);
      assert.equal(own(released, 'seat-6').health, 'Healthy');
      assert.equal(own(released, 'seat-6').location, 'Room B');
      assert.equal(own(released, 'seat-6').movedInRound, movedInRound);
      assert.equal(released.releaseUsed, true); assertCaps(released);
    }
  });

  test(`${mode} seats: queued injury and Rescue preserve Captain loss and full ordinary fallback`, () => {
    const d = driver(mode), initial = structuredClone(d.initial);
    own(initial, 'seat-1').captain = true;
    const rescueTurn = d.until(initial, next => next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-2');
    const rescued = accepted(d.apply(rescueTurn, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    const attackTurn = d.until(rescued, next => next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-3');
    const registered = accepted(d.apply(attackTurn, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }));
    const inCommand = accepted(d.apply(registered, 'seat-1', { type: 'MOVE', destination: 'Command Room' }));
    const fullOldRoom = accepted(d.apply(inCommand, 'seat-6', { type: 'MOVE', destination: 'Room A' }));
    const resolved = closeRound(d, fullOldRoom);
    assert.equal(own(resolved, 'seat-1').captain, false);
    assert.equal(own(resolved, 'seat-1').health, 'Healthy');
    assert.equal(own(resolved, 'seat-1').location, 'Room B');
    assert.equal(count(resolved, 'Room A'), 5);
    assert.equal(count(resolved, 'Command Room'), 0);
    assert.equal(own(resolved, 'seat-3').disablerSpent, true); assertCaps(resolved);
  });

  test(`${mode} seats: full Hospital counts an Eliminated occupant, waits, then admits at later end-round`, () => {
    const d = driver(mode), initial = structuredClone(d.initial);
    for (const seat of initial.seats.slice(0, 5)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
    own(initial, 'seat-1').health = 'Eliminated';
    Object.assign(own(initial, 'seat-6'), { health: 'Injured', location: 'Room B' });
    const waiting = closeRound(d, initial);
    assert.equal(own(waiting, 'seat-6').location, 'Room B');
    assert.equal(own(waiting, 'seat-6').health, 'Injured');
    assert.equal(count(waiting, 'Hospital'), 5);
    // Isolate a later already-vacant bed, without choosing same-checkpoint competition priority.
    const later = structuredClone(waiting);
    Object.assign(own(later, 'seat-2'), { health: 'Healthy', location: 'Room A' });
    const admitted = closeRound(d, later);
    assert.equal(own(admitted, 'seat-6').location, 'Hospital');
    assert.equal(own(admitted, 'seat-6').health, 'Injured');
    assert.equal(own(admitted, 'seat-1').location, 'Hospital');
    assert.equal(own(admitted, 'seat-1').health, 'Eliminated');
    assert.equal(count(admitted, 'Hospital'), 5); assertCaps(admitted);
  });

  test(`${mode} seats: injured Captain vacates Command immediately and waits outside a full Hospital`, () => {
    const d = driver(mode), initial = structuredClone(d.initial);
    for (const seat of initial.seats.slice(0, 5)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
    Object.assign(own(initial, 'seat-6'), { captain: true, location: 'Command Room', lastRoom: 'Room B' });
    // Recorded registration predates the current statuses/Command move. Actor status and
    // changed target location do not cancel a valid queued action (V1-06/V1-07).
    initial.queued = [{ actorSeatId: 'seat-3', commandId: 'earlier-disabler', command: { type: 'DISABLE', targetSeatId: 'seat-6' } }];
    const resolved = closeRound(d, initial);
    assert.equal(own(resolved, 'seat-6').captain, false);
    assert.equal(own(resolved, 'seat-6').health, 'Injured');
    assert.equal(own(resolved, 'seat-6').location, 'Room B');
    assert.equal(count(resolved, 'Command Room'), 0);
    assert.equal(count(resolved, 'Hospital'), 5); assertCaps(resolved);
  });

  test(`${mode} seats: released Injured waits physically in Jail free and later enters Hospital`, () => {
    const d = driver(mode), initial = structuredClone(d.initial);
    for (const seat of initial.seats.slice(0, 5)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
    Object.assign(own(initial, 'seat-6'), { health: 'Injured', location: 'Jail', jailed: true });
    Object.assign(own(initial, 'seat-7'), { captain: true, location: 'Command Room' });
    const released = approveRelease(d, initial, 'seat-7', 'seat-6');
    assert.equal(own(released, 'seat-6').jailed, false);
    assert.equal(own(released, 'seat-6').location, 'Jail');
    assert.equal(own(released, 'seat-6').health, 'Injured');
    assert.equal(validViews(released).players['seat-6'].self.movementDestinations.length, 0);
    assert.equal(count(released, 'Hospital'), 5);
    const waiting = d.tick(released);
    assert.equal(own(waiting, 'seat-6').location, 'Jail');
    const later = structuredClone(waiting);
    Object.assign(own(later, 'seat-1'), { location: 'Room A', health: 'Healthy' });
    const admitted = closeRound(d, later);
    assert.equal(own(admitted, 'seat-6').location, 'Hospital');
    assert.equal(own(admitted, 'seat-6').jailed, false); assertCaps(admitted);
  });

  test(`${mode} seats: five distinct canonical Jail votes prove the five-round maximum`, () => {
    const d = driver(mode);
    let current = d.initial;
    for (let round = 1; round <= 5; round++) {
      let vote = d.until(current, next => next.round === round && next.phase.kind === 'JAIL_VOTE');
      // Jail both Red original seats by R5, so the normal Blue victory retains
      // the fifth Jail occupant instead of transferring living prisoners to Final Zone.
      const targetSeatId = ['seat-1', 'seat-2', 'seat-3', 'seat-5', 'seat-6'][round - 1];
      assert.ok(vote.eligibleTargets.includes(targetSeatId));
      for (const voter of vote.eligibleVoters.slice(0, Math.ceil(vote.eligibleVoters.length / 2))) {
        vote = accepted(d.apply(vote, voter, { type: 'VOTE', targetSeatId }));
      }
      const deadline = { ...d.context(vote.phase.endsAt), phaseId: vote.phase.id, deadlineToken: vote.deadlineToken };
      current = advanceFullGame(vote, deadline).state;
      assert.equal(count(current, 'Jail'), round);
      assertCaps(current);
      const repeated = advanceFullGame(current, deadline);
      assert.equal(repeated.advanced, false); assert.strictEqual(repeated.state, current);
      if (round < 5) assert.equal(current.round, round + 1);
    }
    assert.equal(count(current, 'Jail'), 5);
    assert.equal(current.phase.kind, 'FINISHED');
  });

  test(`${mode} seats: conditional Final Zone holds all living participants without a capacity limit`, () => {
    const d = driver(mode), initial = structuredClone(d.initial);
    // Synthetic no-victory setup: Blue has no Healthy member, while both factions survive.
    for (const seat of initial.seats) if (seat.faction === 'Blue') seat.health = 'Injured';
    const showdown = d.until(initial, next => next.phase.kind === 'SHOWDOWN');
    assert.equal(count(showdown, 'Final Zone'), mode);
    assert.equal(showdown.seats.every(seat => seat.specialShotAvailable), true);
    assertCaps(showdown);
    assert.deepEqual(d.tick(showdown).result, { winner: 'Draw', alienCoWinner: false });
  });
}

for (const pins of [PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS]) {
  for (const mode of [7, 8, 9]) {
    test(`${pins.engineVersion}, ${mode} seats: uncapped construction and movement retain exact old behavior`, () => {
      const initial = createFullGame(argumentsFor(mode, pins, mode - 1));
      assert.equal(count(initial, 'Room A'), mode - 1);
      const versions = structuredClone(initial.versions);
      const request = { protocolVersion: 2, matchId: initial.matchId, phaseId: initial.phase.id,
        commandId: 'legacy-crowd-move', command: { type: 'MOVE', destination: 'Room A' } };
      const context = { now: START + 1, nextPhaseId: 'legacy-next', nextDeadlineToken: 'legacy-token' };
      const moved = accepted(executeFullGame(initial, `seat-${mode}`, request, context));
      assert.equal(count(moved, 'Room A'), mode);
      assert.deepEqual(moved.versions, versions);
      const replayed = accepted(executeFullGame(JSON.parse(JSON.stringify(initial)), `seat-${mode}`, request, context));
      assert.deepEqual(replayed, moved); assert.deepEqual(validViews(replayed), validViews(moved));
      const views = validViews(initial);
      assert.equal(Boolean(views.players['seat-1'].legalTargets.PASS_TURN), pins === PASS_FULL_GAME_VERSION_PINS);
      const pass = executeFullGame(initial, 'seat-1', { ...request, commandId: 'legacy-pass', command: { type: 'PASS_TURN' } }, context);
      if (pins === PASS_FULL_GAME_VERSION_PINS) assert.equal(pass.receipt.status, 'accepted');
      else rejected(pass, initial);
    });
  }
}

test('capacity MOVE/Pass/deadline journal replay and JSON reload reproduce state and every audience', () => {
  const d = driver(9), before = structuredClone(d.initial), journal = [];
  let state = d.initial;
  for (const [actor, command] of [
    ['seat-1', { type: 'MOVE', destination: 'Room B' }],
    ['seat-6', { type: 'MOVE', destination: 'Room A' }],
    ['seat-1', { type: 'PASS_TURN' }],
  ]) {
    const entry = { kind: 'command', actor, request: d.request(state, command), context: d.context(state.phase.startedAt + 1) };
    journal.push(entry);
    state = accepted(executeFullGame(JSON.parse(JSON.stringify(state)), actor, entry.request, entry.context));
  }
  const deadline = { kind: 'deadline', context: { ...d.context(state.phase.endsAt), phaseId: state.phase.id, deadlineToken: state.deadlineToken } };
  journal.push(deadline); state = advanceFullGame(state, deadline.context).state;
  let replay = structuredClone(before);
  for (const entry of journal) replay = entry.kind === 'command'
    ? accepted(executeFullGame(replay, entry.actor, entry.request, entry.context)) : advanceFullGame(replay, entry.context).state;
  assert.deepEqual(replay, state); assert.deepEqual(validViews(replay), validViews(state));
  for (const seat of state.seats) assert.deepEqual(projectOwnAcknowledgments(replay, seat.seatId), projectOwnAcknowledgments(state, seat.seatId));
  assert.deepEqual(d.initial, before); assertCaps(state);
});


// Approved CAP-ORDER-01: heal departures precede entrants, whose priority uses
// the existing state seat order rather than the round's recorded action order.
for (const mode of [7, 8, 9]) {
  test(`CAP-ORDER-01 approved, ${mode} seats: existing seat order decides the last Hospital bed regardless of round order`, () => {
    for (const reverseRoundOrder of [false, true]) {
      const d = driver(mode), args = argumentsFor(mode);
      if (reverseRoundOrder) for (const order of args.setup.roundOrders) order.reverse();
      const initial = createFullGame(args);
      for (const seat of initial.seats.slice(0, 4)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
      own(initial, 'seat-5').health = 'Injured';
      own(initial, 'seat-6').health = 'Injured';
      assert.equal(initial.turnOrder.indexOf('seat-5') < initial.turnOrder.indexOf('seat-6'), !reverseRoundOrder);
      const resolved = closeRound(d, initial);
      assert.equal(count(resolved, 'Hospital'), 5);
      assert.equal(own(resolved, 'seat-5').location, 'Hospital');
      assert.equal(own(resolved, 'seat-6').location, 'Room B');
      assert.equal(own(resolved, 'seat-6').health, 'Injured'); assertCaps(resolved);
    }
  });

  test(`CAP-ORDER-01 approved, ${mode} seats: earlier and later healed departures both free a Hospital place before entrants`, () => {
    for (const healedId of ['seat-1', 'seat-7']) {
      const d = driver(mode), initial = structuredClone(d.initial);
      for (const id of ['seat-1', 'seat-3', 'seat-4', 'seat-5', 'seat-7']) {
        Object.assign(own(initial, id), { health: 'Injured', location: 'Hospital' });
      }
      own(initial, 'seat-6').health = 'Injured';
      const rescueTurn = d.until(initial, next => next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-2');
      const rescued = accepted(d.apply(rescueTurn, 'seat-2', { type: 'RESCUE', targetSeatId: healedId }));
      const resolved = closeRound(d, rescued);
      assert.equal(own(resolved, healedId).health, 'Healthy');
      assert.equal(own(resolved, healedId).location, healedId === 'seat-1' ? 'Room A' : 'Room B');
      assert.equal(own(resolved, 'seat-6').location, 'Hospital');
      assert.equal(own(resolved, 'seat-6').health, 'Injured');
      assert.equal(count(resolved, 'Hospital'), 5); assertCaps(resolved);
    }
  });
}


// Historical saved matches keep their uncapped forced placement as well as MOVE.
// The last checkpoint deliberately uses advanceFullGame directly: assertCaps in
// the new-tuple driver's tick is inapplicable to these exact historical tuples.
for (const pins of [PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS]) {
  for (const mode of [7, 8, 9]) {
    test(`${pins.engineVersion}, ${mode} seats: old full Hospital admits its sixth Injured occupant and replays identically`, () => {
      const d = driver(mode, pins), initial = structuredClone(d.initial);
      for (const seat of initial.seats.slice(0, 5)) Object.assign(seat, { health: 'Injured', location: 'Hospital' });
      Object.assign(own(initial, 'seat-6'), { health: 'Injured', location: 'Room B' });
      const vote = d.until(initial, next => next.phase.kind === 'JAIL_VOTE');
      const before = structuredClone(vote);
      const context = { ...d.context(vote.phase.endsAt), phaseId: vote.phase.id, deadlineToken: vote.deadlineToken };
      const result = advanceFullGame(vote, context);
      assert.equal(result.advanced, true);
      assert.equal(count(result.state, 'Hospital'), 6);
      assert.equal(own(result.state, 'seat-6').location, 'Hospital');
      assert.equal(own(result.state, 'seat-6').health, 'Injured');
      assert.deepEqual(result.state.versions, initial.versions);
      assert.deepEqual(vote, before);
      const replay = advanceFullGame(JSON.parse(JSON.stringify(before)), context);
      assert.deepEqual(replay, result);
      assert.deepEqual(validViews(replay.state), validViews(result.state));
      const repeated = advanceFullGame(result.state, context);
      assert.equal(repeated.advanced, false); assert.strictEqual(repeated.state, result.state);
    });

    test(`${pins.engineVersion}, ${mode} seats: old healed patient returns to a full remembered ordinary room without fallback`, () => {
      const d = driver(mode, pins), initial = structuredClone(d.initial);
      Object.assign(own(initial, 'seat-6'), { health: 'Injured', location: 'Hospital', lastRoom: 'Room A' });
      const turn = d.until(initial, next => next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-2');
      const registered = accepted(d.apply(turn, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-6' }));
      const vote = d.until(registered, next => next.phase.kind === 'JAIL_VOTE');
      assert.equal(count(vote, 'Room A'), 5);
      const before = structuredClone(vote);
      const context = { ...d.context(vote.phase.endsAt), phaseId: vote.phase.id, deadlineToken: vote.deadlineToken };
      const result = advanceFullGame(vote, context);
      assert.equal(result.advanced, true);
      assert.equal(own(result.state, 'seat-6').health, 'Healthy');
      assert.equal(own(result.state, 'seat-6').location, 'Room A');
      assert.equal(count(result.state, 'Room A'), 6);
      assert.equal(own(result.state, 'seat-2').rescuesRemaining, 1);
      assert.equal(own(result.state, 'seat-6').movedInRound, false);
      assert.deepEqual(result.state.versions, initial.versions);
      assert.deepEqual(vote, before);
      const replay = advanceFullGame(JSON.parse(JSON.stringify(before)), context);
      assert.deepEqual(replay, result);
      assert.deepEqual(validViews(replay.state), validViews(result.state));
    });
  }
}


// The historical uncapped outcome remains unchanged for a late healed departure.
// Its final snapshot cannot expose the temporary sixth occupant in the old loop;
// exact tuple gating of the new prepass is separately checked in source review.
for (const pins of [PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS]) {
  for (const mode of [7, 8, 9]) {
    test(`${pins.engineVersion}, ${mode} seats: old late healed Hospital departure retains its exact outcome and replay`, () => {
      const d = driver(mode, pins), initial = structuredClone(d.initial);
      for (const id of ['seat-1', 'seat-3', 'seat-4', 'seat-5', 'seat-7']) {
        Object.assign(own(initial, id), { health: 'Injured', location: 'Hospital' });
      }
      own(initial, 'seat-6').health = 'Injured';
      const turn = d.until(initial, next => next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-2');
      const registered = accepted(d.apply(turn, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-7' }));
      const vote = d.until(registered, next => next.phase.kind === 'JAIL_VOTE');
      assert.equal(count(vote, 'Hospital'), 5);
      assert.equal(own(vote, 'seat-7').health, 'Injured');
      assert.equal(vote.queued.filter(q => q.command.type === 'RESCUE').length, 1);
      const before = structuredClone(vote);
      const context = { ...d.context(vote.phase.endsAt), phaseId: vote.phase.id, deadlineToken: vote.deadlineToken };
      const result = advanceFullGame(vote, context);
      assert.equal(result.advanced, true);
      assert.equal(own(result.state, 'seat-7').health, 'Healthy');
      assert.equal(own(result.state, 'seat-7').location, 'Room B');
      assert.equal(own(result.state, 'seat-6').health, 'Injured');
      assert.equal(own(result.state, 'seat-6').location, 'Hospital');
      assert.equal(count(result.state, 'Hospital'), 5);
      assert.equal(own(result.state, 'seat-2').rescuesRemaining, 1);
      assert.deepEqual(result.state.versions, initial.versions);
      assert.deepEqual(result.state.seats.map(seat => seat.seatId), initial.seats.map(seat => seat.seatId));
      assert.deepEqual(vote, before);
      const replay = advanceFullGame(JSON.parse(JSON.stringify(before)), context);
      assert.deepEqual(replay, result);
      assert.deepEqual(validViews(replay.state), validViews(result.state));
      const duplicate = advanceFullGame(result.state, context);
      assert.equal(duplicate.advanced, false); assert.strictEqual(duplicate.state, result.state);
    });
  }
}
