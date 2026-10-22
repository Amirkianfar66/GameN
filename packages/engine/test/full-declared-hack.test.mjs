import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullCommandSchema, FullPlayerViewSchema, FullPublicViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  DECLARED_HACK_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';

// Issue #120, approved declared-hack-owner-decision-2026-10-12 overlay and
// playtest-feedback-contract.md at implementation 0ff2619d236bb75237c2b06c711eda2885b1ae7f.
// Explicit 1.5 pins keep this matrix stable when later defaults change. These are
// pure-engine acceptance cases, not transaction/receipt, bot or human-balance proof.
const START = 1_800_000_000_000;
const ASSETS = 'declared-hack-fixture-assets-v1';
const ROLES = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const SIDES = ['Blue', 'Red', 'Alien'];
const FEEDBACK_KEYS = ['hackId', 'phaseId', 'round', 'status', 'declaredSide'].sort();
const byId = (state, id) => state.seats.find(seat => seat.seatId === id);
const reload = state => JSON.parse(JSON.stringify(state));

function views(state) {
  const result = projectFullGame(state);
  FullPublicViewSchema.parse(result.public);
  for (const view of Object.values(result.players)) FullPlayerViewSchema.parse(view);
  return result;
}
function accepted(result) {
  assert.equal(result.receipt.status, 'accepted');
  assert.equal(result.receipt.code, 'REGISTERED');
  views(result.state);
  return result.state;
}
function rejected(result, before, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected');
  assert.equal(result.receipt.code, code);
  assert.strictEqual(result.state, before, 'Rejected input leaves all state unchanged');
}
function driver(count, pins = DECLARED_HACK_FULL_GAME_VERSION_PINS, roomBIds = null) {
  let serial = 0;
  const roleOrder = [...ROLES, ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const initial = createFullGame({ matchId: 'declared-hack-fixture', now: START,
    phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: ASSETS,
    versions: { ...pins, assetManifestVersion: ASSETS },
    setup: { playerCount: count, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
      initialRooms: Object.fromEntries(ids.map((id, index) => [id,
        (roomBIds ? roomBIds.includes(id) : index >= 5) ? 'Room B' : 'Room A'])),
      roundOrders: Array.from({ length: 5 }, () => [...ids]) } });
  const context = now => ({ now, nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `deadline-${serial}` });
  const request = (state, command) => ({ protocolVersion: 2, matchId: state.matchId,
    phaseId: state.phase.id, commandId: `command-${++serial}`, command });
  const apply = (state, actor, command, now = state.phase.startedAt + 1) => {
    const before = reload(state), input = request(state, command), ctx = context(now);
    const result = executeFullGame(state, actor, input, ctx);
    FullReceiptSchema.parse(result.receipt);
    assert.deepEqual(state, before, 'Commands must not mutate their input');
    assert.deepEqual(executeFullGame(reload(state), actor, input, ctx), result,
      'Recorded input/time replay identically after private state JSON recovery');
    return result;
  };
  const deadline = (state, now = state.phase.endsAt) => ({ ...context(now),
    phaseId: state.phase.id, deadlineToken: state.deadlineToken });
  const tick = (state, delay = 0) => {
    assert.notEqual(state.phase.endsAt, null, 'Reach the checkpoint before a terminal state');
    const before = reload(state), ctx = deadline(state, state.phase.endsAt + delay);
    const result = advanceFullGame(state, ctx);
    assert.equal(result.advanced, true);
    assert.deepEqual(state, before, 'Deadline processing must not mutate its input');
    assert.deepEqual(advanceFullGame(reload(state), ctx), result,
      'Private continuation survives JSON recovery with exact recorded context');
    views(result.state);
    return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let step = 0; !predicate(current); step++) {
      assert.ok(step < 500, 'Canonical lifecycle did not reach its bounded checkpoint');
      current = tick(current);
    }
    return current;
  };
  const turn = (state, actor, round = state.round) => until(state,
    current => current.round === round && current.phase.kind === 'ORDINARY_TURN' && current.activeSeatId === actor);
  return { initial, context, request, apply, deadline, tick, until, turn };
}
function requestHack(d, state = d.initial, actor = state.activeSeatId, target = 'seat-2') {
  return accepted(d.apply(state, actor, { type: 'REQUEST_HACK', targetSeatId: target }));
}
function declaration(d, state = d.initial, actor = state.activeSeatId, target = 'seat-2') {
  const pending = requestHack(d, state, actor, target);
  const next = d.tick(pending);
  assert.equal(next.phase.kind, 'HACK_DECLARE');
  return next;
}
function declare(d, state, target = 'seat-2', declaredSide = 'Blue', now = state.phase.startedAt + 1) {
  return accepted(d.apply(state, target, { type: 'DECLARE_HACK_SIDE', declaredSide }, now));
}
function assertCleared(state, historical = false) {
  const projected = views(state);
  assert.equal(Object.hasOwn(projected.public, 'hackFeedback'), false);
  assert.equal(Object.hasOwn(projected.public, 'hackPartnerSeatId'), false);
  for (const view of Object.values(projected.players)) {
    assert.equal(view.hackPartnerSeatId, null);
    assert.equal(Object.hasOwn(view.legalTargets, 'DECLARE_HACK_SIDE'), false);
    if (historical) assert.equal(Object.hasOwn(view, 'hackFeedback'), false);
    else assert.equal(view.hackFeedback, null);
  }
}
function assertExchange(state, actor, target, hackId, status, declaredSide) {
  const projected = views(state), prelude = ['HACK_DECLARE', 'HACK_RESULT'].includes(state.phase.kind);
  assert.equal(state.activeSeatId, actor);
  assert.equal(projected.public.activeSeatId, actor);
  assert.equal(Object.hasOwn(projected.public, 'hackFeedback'), false);
  assert.equal(Object.hasOwn(projected.public, 'hackPartnerSeatId'), false);
  const publicBytes = JSON.stringify(projected.public);
  for (const field of ['"declaredSide"', '"truthful"', '"activeHack"', '"hackId"', '"knowledge"']) {
    assert.equal(publicBytes.includes(field), false, field);
  }
  for (const [id, view] of Object.entries(projected.players)) {
    const participant = id === actor || id === target;
    assert.equal(Object.hasOwn(view, 'hackFeedback'), true);
    assert.equal(view.hackPartnerSeatId, id === actor ? target : id === target ? actor : null);
    assert.deepEqual(view.hackFeedback, participant
      ? { hackId, phaseId: state.phase.id, round: state.round, status, declaredSide } : null);
    if (participant) assert.deepEqual(Object.keys(view.hackFeedback).sort(), FEEDBACK_KEYS);
    assert.deepEqual(view.legalTargets, state.phase.kind === 'HACK_DECLARE' && id === target
      ? { DECLARE_HACK_SIDE: [target] } : {});
    if (prelude) assert.equal(view.self.codeAttemptAvailable, false);
  }
}
function unchangedDeadline(d, state, now, overrides = {}) {
  const before = reload(state), result = advanceFullGame(state, { ...d.deadline(state, now), ...overrides });
  assert.equal(result.advanced, false);
  assert.strictEqual(result.state, state);
  assert.deepEqual(state, before);
}

for (const count of [7, 8, 9]) {
  test(`${count}: ordinary expiry and Pass without Hack do not fabricate a prelude`, () => {
    for (const close of ['expiry', 'pass']) {
      const d = driver(count);
      assertCleared(d.initial);
      const next = close === 'expiry' ? d.tick(d.initial)
        : accepted(d.apply(d.initial, 'seat-1', { type: 'PASS_TURN' }));
      assert.equal(next.phase.kind, 'ORDINARY_TURN');
      assert.equal(next.activeSeatId, 'seat-2');
      assertCleared(next);
    }
  });

  for (const close of ['expiry', 'pass']) {
    test(`${count}: ${close} opens DECLARE, private result and the complete separate talk`, () => {
      const d = driver(count), original = views(d.initial);
      const pending = requestHack(d);
      assert.equal(pending.phase.kind, 'ORDINARY_TURN');
      assert.equal(pending.hacksThisRound, 1);
      assert.equal(byId(pending, 'seat-1').hackUsed, true);
      assert.equal(JSON.stringify(views(pending).public), JSON.stringify(original.public));
      for (const id of Object.keys(original.players).filter(id => id !== 'seat-1')) {
        assert.equal(JSON.stringify(views(pending).players[id]), JSON.stringify(original.players[id]));
      }
      assertCleared(pending);
      const closure = close === 'expiry' ? pending.phase.endsAt : pending.phase.startedAt + 1234;
      const opened = close === 'expiry' ? d.tick(pending)
        : accepted(d.apply(pending, 'seat-1', { type: 'PASS_TURN' }, closure));
      assert.equal(opened.phase.kind, 'HACK_DECLARE');
      assert.equal(opened.phase.startedAt, closure);
      assert.equal(opened.phase.endsAt, closure + 15_000);
      assertExchange(opened, 'seat-1', 'seat-2', opened.phase.id, 'AWAITING_DECLARATION', null);
      const result = declare(d, opened, 'seat-2', 'Blue', closure + 137);
      assert.equal(result.phase.kind, 'HACK_RESULT');
      assert.equal(result.phase.startedAt, closure + 137);
      assert.equal(result.phase.endsAt, closure + 137 + 5000);
      assertExchange(result, 'seat-1', 'seat-2', opened.phase.id, 'DECLARED', 'Blue');
      unchangedDeadline(d, result, result.phase.startedAt + 4999);
      const talk = d.tick(result);
      assert.equal(talk.phase.kind, 'HACK');
      assert.equal(talk.phase.startedAt, result.phase.endsAt);
      assert.equal(talk.phase.endsAt, result.phase.endsAt + 60_000);
      assertExchange(talk, 'seat-1', 'seat-2', opened.phase.id, 'DECLARED', 'Blue');
      unchangedDeadline(d, talk, talk.phase.endsAt - 1);
      const next = d.tick(talk);
      assert.equal(next.phase.kind, 'ORDINARY_TURN');
      assert.equal(next.activeSeatId, 'seat-2');
      assertCleared(next);
    });
  }

  test(`${count}: 14999 accepts, 15000 closes; missing declaration never fabricates a side`, () => {
    const d = driver(count), opened = declaration(d);
    unchangedDeadline(d, opened, opened.phase.startedAt + 14_999);
    const lastMoment = declare(d, opened, 'seat-2', 'Blue', opened.phase.startedAt + 14_999);
    assert.equal(lastMoment.phase.startedAt, opened.phase.startedAt + 14_999);
    assert.equal(lastMoment.phase.endsAt, lastMoment.phase.startedAt + 5000);
    rejected(d.apply(opened, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' },
      opened.phase.endsAt), opened, 'PHASE_CLOSED');
    const noInput = d.tick(opened);
    assert.equal(noInput.phase.kind, 'HACK_RESULT');
    assertExchange(noInput, 'seat-1', 'seat-2', opened.phase.id, 'NO_DECLARATION', null);
    assert.equal(noInput.phase.endsAt, opened.phase.endsAt + 5000);
    unchangedDeadline(d, noInput, noInput.phase.startedAt + 4999);
    const talk = d.tick(noInput);
    assertExchange(talk, 'seat-1', 'seat-2', opened.phase.id, 'NO_DECLARATION', null);
    assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
  });

  test(`${count}: late repair grants full result/talk windows; obsolete tasks cannot extend them`, () => {
    const d = driver(count), pending = requestHack(d);
    const opened = d.tick(pending, 41_000);
    assert.equal(opened.phase.startedAt, pending.phase.endsAt + 41_000);
    assert.equal(opened.phase.endsAt - opened.phase.startedAt, 15_000);
    unchangedDeadline(d, opened, opened.phase.endsAt + 1, { phaseId: pending.phase.id, deadlineToken: pending.deadlineToken });
    const result = d.tick(opened, 29_000);
    assert.equal(result.phase.startedAt, opened.phase.endsAt + 29_000);
    assert.equal(result.phase.endsAt - result.phase.startedAt, 5000);
    unchangedDeadline(d, result, result.phase.endsAt + 100_000, { phaseId: opened.phase.id, deadlineToken: opened.deadlineToken });
    unchangedDeadline(d, result, result.phase.endsAt + 1, { deadlineToken: 'obsolete-deadline' });
    const talk = d.tick(reload(result), 17_000);
    assert.equal(talk.phase.startedAt, result.phase.endsAt + 17_000);
    assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
    unchangedDeadline(d, talk, talk.phase.endsAt + 100_000, { phaseId: result.phase.id, deadlineToken: result.deadlineToken });
    assertExchange(talk, 'seat-1', 'seat-2', opened.phase.id, 'NO_DECLARATION', null);
  });

  test(`${count}: every normal role has the same declaration offer but accepts only its own side`, () => {
    const roster = driver(count).initial.seats.filter(seat => !['Undercover', 'Alien'].includes(seat.role));
    for (const target of roster) {
      const d = driver(count), actor = target.location === 'Room A'
        ? target.seatId === 'seat-1' ? 'seat-2' : 'seat-1'
        : target.seatId === 'seat-6' ? 'seat-7' : 'seat-6';
      const opened = declaration(d, d.turn(d.initial, actor), actor, target.seatId);
      assertExchange(opened, actor, target.seatId, opened.phase.id, 'AWAITING_DECLARATION', null);
      for (const side of SIDES.filter(side => side !== target.faction)) {
        rejected(d.apply(opened, target.seatId, { type: 'DECLARE_HACK_SIDE', declaredSide: side }), opened);
      }
      const result = declare(d, opened, target.seatId, target.faction);
      assertExchange(result, actor, target.seatId, opened.phase.id, 'DECLARED', target.faction);
    }
  });

  for (const role of ['Undercover', 'Alien']) for (const side of SIDES) {
    test(`${count}: ${role} may declare ${side} as an unverified claim`, () => {
      const d = driver(count), target = role === 'Undercover' ? 'seat-5' : 'seat-7';
      const actor = role === 'Undercover' ? 'seat-1' : 'seat-6';
      const opened = declaration(d, d.turn(d.initial, actor), actor, target);
      assertExchange(opened, actor, target, opened.phase.id, 'AWAITING_DECLARATION', null);
      const result = declare(d, opened, target, side);
      assertExchange(result, actor, target, opened.phase.id, 'DECLARED', side);
      assertExchange(d.tick(result), actor, target, opened.phase.id, 'DECLARED', side);
    });
  }

  test(`${count}: only the fixed target declares; later/obsolete declarations do not overwrite it`, () => {
    const d = driver(count), opened = declaration(d);
    for (const id of opened.seats.map(seat => seat.seatId).filter(id => id !== 'seat-2')) {
      rejected(d.apply(opened, id, { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), opened);
    }
    const result = declare(d, opened), talk = d.tick(result);
    for (const state of [result, talk]) {
      rejected(d.apply(state, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), state);
      const obsolete = d.request(opened, { type: 'DECLARE_HACK_SIDE', declaredSide: 'Red' });
      rejected(executeFullGame(state, 'seat-2', obsolete, d.context(state.phase.startedAt + 1)), state, 'PHASE_CLOSED');
    }
    for (const state of [result, talk]) {
      const targetView = views(state).players['seat-2'];
      const copied = { ...targetView, hackFeedback: views(opened).players['seat-2'].hackFeedback };
      assert.equal(FullPlayerViewSchema.safeParse(copied).success, false, 'Copied feedback cannot bind to a later phase');
    }
    assert.equal(FullPlayerViewSchema.safeParse({ ...views(talk).players['seat-2'],
      hackFeedback: views(result).players['seat-2'].hackFeedback }).success, false,
    'An identical settled claim from the result phase is obsolete during talk');
    assert.equal(FullCommandSchema.safeParse({ type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue', targetSeatId: 'seat-2' }).success, false);
    assert.equal(FullCommandSchema.safeParse({ type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue', role: 'Cracker' }).success, false);
  });

  test(`${count}: movement after request does not replace the target or recheck registration range`, () => {
    const d = driver(count), pending = requestHack(d);
    const moved = accepted(d.apply(pending, 'seat-2', { type: 'MOVE', destination: 'Room B' }));
    assert.equal(byId(moved, 'seat-2').location, 'Room B');
    assert.equal(byId(moved, 'seat-1').location, 'Room A');
    const opened = d.tick(moved);
    assertExchange(opened, 'seat-1', 'seat-2', opened.phase.id, 'AWAITING_DECLARATION', null);
    rejected(d.apply(opened, 'seat-3', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), opened);
    assertExchange(declare(d, opened), 'seat-1', 'seat-2', opened.phase.id, 'DECLARED', 'Blue');
  });

  for (const stage of ['HACK_DECLARE', 'HACK_RESULT']) {
    test(`${count}: ${stage} preserves participant/outsider movement, one-use and room authority`, () => {
      for (const id of ['seat-1', 'seat-2', 'seat-3']) {
        const d = driver(count), opened = declaration(d);
        const state = stage === 'HACK_DECLARE' ? opened : declare(d, opened);
        assert.ok(views(state).players[id].self.movementDestinations.includes('Room B'));
        const moved = accepted(d.apply(state, id, { type: 'MOVE', destination: 'Room B' }));
        assert.equal(byId(moved, id).movedInRound, true);
        assert.deepEqual(moved.phase, state.phase, 'Movement cannot restart a prelude clock');
        assertExchange(moved, 'seat-1', 'seat-2', opened.phase.id,
          stage === 'HACK_DECLARE' ? 'AWAITING_DECLARATION' : 'DECLARED', stage === 'HACK_DECLARE' ? null : 'Blue');
        rejected(d.apply(moved, id, { type: 'MOVE', destination: 'Room A' }), moved);
        if (stage === 'HACK_DECLARE') assert.equal(declare(d, moved).phase.kind, 'HACK_RESULT');
      }
      const d = driver(count, DECLARED_HACK_FULL_GAME_VERSION_PINS, ['seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7']);
      const opened = declaration(d), state = stage === 'HACK_DECLARE' ? opened : declare(d, opened);
      assert.equal(views(state).players['seat-1'].self.movementDestinations.includes('Room B'), false);
      rejected(d.apply(state, 'seat-1', { type: 'MOVE', destination: 'Room B' }), state);
      rejected(d.apply(state, 'seat-1', { type: 'MOVE', destination: 'Command Room' }), state);
    });
  }

  for (const status of ['Injured', 'Jailed']) {
    test(`${count}: synthetic ${status} participant fixture keeps Hack permission without voluntary movement`, () => {
      // Status regression fixture, not a claim that both statuses arise in Round 1.
      const d = driver(count), saved = reload(d.initial);
      for (const id of ['seat-1', 'seat-2']) {
        const seat = byId(saved, id);
        seat.health = status === 'Injured' ? 'Injured' : 'Healthy';
        seat.jailed = status === 'Jailed';
        seat.location = status === 'Injured' ? 'Hospital' : 'Jail';
      }
      const opened = declaration(d, saved), result = declare(d, opened);
      for (const state of [opened, result]) for (const id of ['seat-1', 'seat-2']) {
        assert.deepEqual(views(state).players[id].self.movementDestinations, []);
        rejected(d.apply(state, id, { type: 'MOVE', destination: 'Room A' }), state);
      }
      assertExchange(result, 'seat-1', 'seat-2', opened.phase.id, 'DECLARED', 'Blue');
    });
  }

  test(`${count}: both preludes reject all other gameplay command types without resource changes`, () => {
    const d = driver(count), opened = declaration(d), result = declare(d, opened);
    const commands = [
      { type: 'PASS_TURN' }, { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' },
      { type: 'DISABLE', targetSeatId: 'seat-2' }, { type: 'PROTECT', targetSeatId: 'seat-2' },
      { type: 'RESCUE', targetSeatId: 'seat-2' }, { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-2'] },
      { type: 'SCAN', targetSeatId: 'seat-2', guess: 'Blue' }, { type: 'REQUEST_HACK', targetSeatId: 'seat-2' },
      { type: 'SUBMIT_CODE', seatIds: [...opened.code] }, { type: 'VOTE', targetSeatId: null },
      { type: 'RELEASE_CHOICE', targetSeatId: null }, { type: 'RELEASE_VOTE', approve: true },
      { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-2' },
    ];
    for (const state of [opened, result]) for (const seat of state.seats) for (const command of commands) {
      rejected(d.apply(state, seat.seatId, command), state);
    }
  });

  test(`${count}: Main Action, Shot and Hack remain independent through ordinary Pass and both preludes`, () => {
    const d = driver(count), turn = d.turn(d.initial, 'seat-5', 4);
    let state = accepted(d.apply(turn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-5' }));
    state = accepted(d.apply(state, 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' }));
    state = requestHack(d, state, 'seat-5', 'seat-2');
    assert.equal(state.queued.length, 2);
    assert.equal(byId(state, 'seat-5').ordinaryWeapons, 0);
    assert.equal(byId(state, 'seat-5').mainActionUsedRound, 4);
    const queued = reload(state.queued);
    const opened = accepted(d.apply(state, 'seat-5', { type: 'PASS_TURN' }));
    const result = declare(d, opened), talk = d.tick(result);
    for (const phase of [opened, result, talk]) {
      assert.deepEqual(phase.queued, queued);
      assert.equal(byId(phase, 'seat-4').health, 'Healthy', 'Registered shot still waits for normal resolution');
      assert.equal(byId(phase, 'seat-5').protection, null, 'Protection still waits for normal resolution');
      assert.equal(byId(phase, 'seat-5').hackUsed, true);
      assert.equal(phase.hacksThisRound, 1);
    }
  });

  test(`${count}: no-self/range/own-turn, two-per-round and lifetime Hack initiation rules remain`, () => {
    const d = driver(count);
    rejected(d.apply(d.initial, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-1' }), d.initial);
    rejected(d.apply(d.initial, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-6' }), d.initial);
    rejected(d.apply(d.initial, 'seat-2', { type: 'REQUEST_HACK', targetSeatId: 'seat-3' }), d.initial);
    const first = declaration(d);
    const secondTurn = d.tick(d.tick(d.tick(first)));
    assert.equal(secondTurn.activeSeatId, 'seat-2');
    const second = declaration(d, secondTurn, 'seat-2', 'seat-3');
    const thirdTurn = d.tick(d.tick(declare(d, second, 'seat-3')));
    assert.equal(thirdTurn.activeSeatId, 'seat-3');
    assert.equal(thirdTurn.hacksThisRound, 2);
    rejected(d.apply(thirdTurn, 'seat-3', { type: 'REQUEST_HACK', targetSeatId: 'seat-4' }), thirdTurn);
    const nextRound = d.turn(thirdTurn, 'seat-1', 2);
    assert.equal(nextRound.hacksThisRound, 0);
    rejected(d.apply(nextRound, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }), nextRound);
    const freshTurn = d.turn(nextRound, 'seat-3');
    assert.equal(requestHack(d, freshTurn, 'seat-3', 'seat-4').hacksThisRound, 1);
  });

  test(`${count}: R5 Code is blocked in both preludes, allowed in talk and revealed only after inherited vote barrier`, () => {
    const d = driver(count), turn = d.turn(d.initial, 'seat-1', 5), opened = declaration(d, turn);
    const result = declare(d, opened);
    for (const state of [opened, result]) {
      assert.equal(views(state).players['seat-6'].self.codeAttemptAvailable, false);
      rejected(d.apply(state, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...state.code] }), state);
      assert.equal(state.codeSubmitted, false);
    }
    const talk = d.tick(result);
    assert.equal(views(talk).players['seat-6'].self.codeAttemptAvailable, true);
    const submitted = accepted(d.apply(talk, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...talk.code].reverse() }));
    assert.equal(submitted.correctCode, true);
    assert.equal(submitted.result, null);
    assert.equal(views(submitted).public.endReveal, null);
    assertExchange(submitted, 'seat-1', 'seat-2', opened.phase.id, 'DECLARED', 'Blue');
    const jail = d.until(submitted, state => state.phase.kind === 'JAIL_VOTE');
    assertCleared(jail);
    const barrier = d.tick(jail);
    assert.equal(barrier.phase.kind, 'VOTE_RESULT');
    assert.equal(barrier.phase.endsAt - barrier.phase.startedAt, 5000);
    assert.equal(views(barrier).public.endReveal, null);
    assert.equal(barrier.result, null);
    const finished = d.tick(barrier);
    assert.equal(finished.phase.kind, 'FINISHED');
    assert.deepEqual(finished.result, { winner: 'Red', alienCoWinner: false });
    assertCleared(finished);
    assert.equal(views(finished).public.endReveal.code.length, 4);
  });

  test(`${count}: paired permitted claims change only the two private participants under identical public timing`, () => {
    const d = driver(count), opened = declaration(d, d.initial, 'seat-1', 'seat-5');
    const input = d.request(opened, { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' });
    const context = d.context(opened.phase.startedAt + 2345);
    const blue = accepted(executeFullGame(opened, 'seat-5', input, context));
    const alien = accepted(executeFullGame(opened, 'seat-5', { ...input,
      command: { type: 'DECLARE_HACK_SIDE', declaredSide: 'Alien' } }, context));
    const comparePrivateClaims = (left, right) => {
      const a = views(left), b = views(right);
      assert.equal(JSON.stringify(a.public), JSON.stringify(b.public));
      for (const id of Object.keys(a.players).filter(id => !['seat-1', 'seat-5'].includes(id))) {
        assert.equal(JSON.stringify(a.players[id]), JSON.stringify(b.players[id]), id);
      }
      assert.notEqual(JSON.stringify(a.players['seat-1']), JSON.stringify(b.players['seat-1']));
      assert.notEqual(JSON.stringify(a.players['seat-5']), JSON.stringify(b.players['seat-5']));
    };
    comparePrivateClaims(blue, alien);
    const talkContext = d.deadline(blue);
    const blueTalk = advanceFullGame(blue, talkContext), alienTalk = advanceFullGame(alien, talkContext);
    assert.equal(blueTalk.advanced, true);
    assert.equal(alienTalk.advanced, true);
    comparePrivateClaims(blueTalk.state, alienTalk.state);
  });

  for (const stage of ['HACK_DECLARE', 'HACK_RESULT', 'HACK']) {
    test(`${count}: abort in ${stage} clears live feedback and cannot resume its continuation`, () => {
      // Host authorization belongs to the service; this checks its engine abort transition.
      const d = driver(count), opened = declaration(d), result = stage === 'HACK_DECLARE' ? null : declare(d, opened);
      const state = stage === 'HACK_DECLARE' ? opened : stage === 'HACK_RESULT' ? result : d.tick(result);
      const context = d.context(state.phase.startedAt + 2), before = reload(state);
      const aborted = abortFullGame(state, context);
      assert.deepEqual(state, before);
      assert.deepEqual(abortFullGame(reload(state), context), aborted);
      assert.equal(aborted.phase.kind, 'ABORTED');
      assert.equal(aborted.phase.endsAt, null);
      assert.equal(aborted.activeSeatId, null);
      assert.equal(aborted.activeHack, null);
      assertCleared(aborted);
      assert.equal(views(aborted).public.endReveal, null);
      assert.strictEqual(abortFullGame(aborted, d.context(context.now + 1)), aborted);
      unchangedDeadline(d, aborted, state.phase.endsAt + 100_000, { phaseId: state.phase.id, deadlineToken: state.deadlineToken });
      rejected(d.apply(aborted, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }, context.now + 1), aborted, 'PHASE_CLOSED');
    });
  }

  test(`${count}: complete recorded declaration/movement/deadline traces replay deterministically`, () => {
    const run = () => {
      const d = driver(count), opened = declaration(d);
      const moved = accepted(d.apply(opened, 'seat-2', { type: 'MOVE', destination: 'Room B' }));
      rejected(d.apply(moved, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Alien' }), moved);
      const result = declare(d, reload(moved), 'seat-2', 'Blue', opened.phase.startedAt + 14_999);
      const talk = d.tick(reload(result), 3210), next = d.tick(reload(talk), 1234);
      const secondRound = d.turn(next, 'seat-1', 2);
      assertCleared(secondRound);
      assert.deepEqual(secondRound.versions, { ...DECLARED_HACK_FULL_GAME_VERSION_PINS, assetManifestVersion: ASSETS });
      return JSON.stringify({ state: secondRound, views: views(secondRound) });
    };
    assert.equal(run(), run());
  });

  for (const pins of [VOTE_RESULT_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
    CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS]) {
    test(`${count}: exact ${pins.engineVersion} retains direct 60s Hack, old wire and R5 Code behavior`, () => {
      const d = driver(count, pins);
      assertCleared(d.initial, true);
      rejected(d.apply(d.initial, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), d.initial);
      const pending = requestHack(d), talk = d.tick(pending, 2000);
      assert.equal(talk.phase.kind, 'HACK');
      assert.equal(talk.phase.startedAt, pending.phase.endsAt + 2000);
      assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
      for (const view of [views(talk).public, ...Object.values(views(talk).players)]) {
        assert.equal(Object.hasOwn(view, 'hackFeedback'), false);
        assert.equal(Object.hasOwn(view, 'voteResult'), pins === VOTE_RESULT_FULL_GAME_VERSION_PINS);
      }
      assert.equal(views(talk).players['seat-1'].hackPartnerSeatId, 'seat-2');
      assert.equal(views(talk).players['seat-2'].hackPartnerSeatId, 'seat-1');
      rejected(d.apply(talk, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), talk);
      const next = d.tick(talk, 1000);
      assert.equal(next.activeSeatId, 'seat-2');
      assert.equal(next.phase.startedAt, talk.phase.endsAt + 1000);
      assertCleared(next, true);
      const r5 = d.turn(next, 'seat-6', 5), r5Talk = d.tick(requestHack(d, r5, 'seat-6', 'seat-7'));
      assert.equal(r5Talk.phase.kind, 'HACK');
      assert.equal(views(r5Talk).players['seat-6'].self.codeAttemptAvailable, true);
      const submitted = accepted(d.apply(r5Talk, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...r5Talk.code] }));
      assert.equal(submitted.result, null);
      const jail = d.until(submitted, state => state.phase.kind === 'JAIL_VOTE');
      const closure = d.tick(jail);
      const finished = pins === VOTE_RESULT_FULL_GAME_VERSION_PINS ? d.tick(closure) : closure;
      assert.equal(closure.phase.kind, pins === VOTE_RESULT_FULL_GAME_VERSION_PINS ? 'VOTE_RESULT' : 'FINISHED');
      assert.equal(finished.phase.kind, 'FINISHED');
      assert.deepEqual(finished.result, { winner: 'Red', alienCoWinner: false });
      assert.deepEqual(finished.versions, { ...pins, assetManifestVersion: ASSETS });
      assertCleared(finished, true);
    });
  }
}
