import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPlayerViewSchema, FullPublicViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, legalTargets,
  projectFullGame, projectOwnAcknowledgments,
} from '../dist/index.js';

const START = 1_800_000_000_000;
const ASSETS = 'pass-fixture-assets-v1';
const PASS = Object.freeze({ type: 'PASS_TURN' });
const baseRoles = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
function argumentsFor(playerCount = 7, versions) {
  const roleOrder = [...baseRoles, ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => 'seat-' + (index + 1));
  return { matchId: 'pass-turn-fixture', setup: { playerCount, roleOrder,
    codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'], initialRooms: Object.fromEntries(ids.map(id => [id, 'Room A'])),
    roundOrders: Array.from({ length: 5 }, () => [...ids]) },
  now: START, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: ASSETS,
  ...(versions === undefined ? {} : { versions }) };
}
function driver(playerCount = 7, versions) {
  let serial = 0;
  const initial = createFullGame(argumentsFor(playerCount, versions));
  const context = now => ({ now, nextPhaseId: 'phase-' + ++serial, nextDeadlineToken: 'deadline-' + serial });
  const request = (state, command = PASS, commandId = 'command-' + ++serial) => ({ protocolVersion: 2,
    matchId: state.matchId, phaseId: state.phase.id, commandId, command });
  const apply = (state, actorSeatId, command = PASS, now = state.phase.startedAt + 1) => {
    const result = executeFullGame(state, actorSeatId, request(state, command), context(now));
    FullReceiptSchema.parse(result.receipt);
    return result;
  };
  const tick = state => {
    assert.notEqual(state.phase.endsAt, null, 'The fixture must reach its target before the terminal phase');
    const result = advanceFullGame(state, { ...context(state.phase.endsAt), phaseId: state.phase.id, deadlineToken: state.deadlineToken });
    assert.equal(result.advanced, true);
    return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let step = 0; !predicate(current); step++) {
      assert.ok(step < 200, 'The recorded lifecycle must reach the bounded target');
      current = tick(current);
    }
    return current;
  };
  const turn = (state, seatId, round = state.round) => until(state,
    next => next.round === round && next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === seatId);
  return { initial, context, request, apply, tick, until, turn };
}
const accepted = result => {
  assert.equal(result.receipt.status, 'accepted');
  assert.equal(result.receipt.code, 'REGISTERED');
  return result.state;
};
function rejectedUnchanged(result, before, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected');
  assert.equal(result.receipt.code, code);
  assert.strictEqual(result.state, before);
}
function validViews(state) {
  const views = projectFullGame(state);
  FullPublicViewSchema.parse(views.public);
  for (const view of Object.values(views.players)) FullPlayerViewSchema.parse(view);
  return views;
}

for (const playerCount of [7, 8, 9]) {
  for (const offset of [0, 59_999]) {
    test(playerCount + '-player Pass at ordinary offset ' + offset + ' opens one full next turn', () => {
      const d = driver(playerCount), before = structuredClone(d.initial), now = START + offset;
      const state = accepted(d.apply(d.initial, 'seat-1', PASS, now));
      assert.deepEqual(d.initial, before);
      assert.equal(state.phase.kind, 'ORDINARY_TURN');
      assert.equal(state.activeSeatId, 'seat-2');
      assert.equal(state.turnIndex, 1);
      assert.equal(state.phase.startedAt, now);
      assert.equal(state.phase.endsAt, now + 60_000);
      assert.notEqual(state.phase.id, before.phase.id);
      assert.notEqual(state.deadlineToken, before.deadlineToken);
      assert.deepEqual(state.seats, before.seats);
      assert.deepEqual(state.queued, before.queued);
      assert.equal(state.journalSequence, before.journalSequence + 1);
      assert.deepEqual(validViews(before).players['seat-1'].legalTargets.PASS_TURN, ['seat-1']);
      assert.equal(Object.hasOwn(validViews(state).players['seat-1'].legalTargets, 'PASS_TURN'), false);
      assert.deepEqual(validViews(state).players['seat-2'].legalTargets.PASS_TURN, ['seat-2']);
    });
  }
}

for (const [health, jailed] of [['Healthy', false], ['Injured', false], ['Healthy', true], ['Injured', true]]) {
  test('the active living ' + health + (jailed ? '/jailed' : '/free') + ' seat may Pass without resource eligibility', () => {
    const d = driver(), state = structuredClone(d.initial), actor = state.seats[0];
    actor.health = health; actor.jailed = jailed;
    actor.location = jailed ? 'Jail' : health === 'Injured' ? 'Hospital' : 'Room A';
    actor.mainActionUsedRound = state.round; actor.movedInRound = true; actor.ordinaryWeapons = 0;
    const before = structuredClone(state);
    assert.deepEqual(validViews(state).players[actor.seatId].legalTargets.PASS_TURN, [actor.seatId]);
    const after = accepted(d.apply(state, actor.seatId));
    assert.deepEqual(state, before);
    assert.deepEqual(after.seats, before.seats);
    assert.equal(after.activeSeatId, 'seat-2');
  });
}

for (const actorSeatId of ['seat-2', 'seat-9']) {
  test('an inactive or missing actor cannot Pass: ' + actorSeatId, () => {
    const d = driver(), before = structuredClone(d.initial);
    rejectedUnchanged(d.apply(d.initial, actorSeatId), d.initial);
    assert.deepEqual(d.initial, before);
    if (actorSeatId === 'seat-2') assert.equal(Object.hasOwn(validViews(d.initial).players[actorSeatId].legalTargets, 'PASS_TURN'), false);
  });
}

test('an eliminated active actor cannot Pass or receive its hint', () => {
  const d = driver(), state = structuredClone(d.initial);
  state.seats[0].health = 'Eliminated';
  const before = structuredClone(state);
  assert.equal(Object.hasOwn(validViews(state).players['seat-1'].legalTargets, 'PASS_TURN'), false);
  rejectedUnchanged(d.apply(state, 'seat-1'), state);
  assert.deepEqual(state, before);
});

for (const offset of [-1, 60_000, 60_001]) {
  test('Pass outside the strict live ordinary interval is closed at offset ' + offset, () => {
    const d = driver(), before = structuredClone(d.initial);
    rejectedUnchanged(d.apply(d.initial, 'seat-1', PASS, START + offset), d.initial, 'PHASE_CLOSED');
    assert.deepEqual(d.initial, before);
  });
}
for (const field of ['matchId', 'phaseId']) {
  test('Pass with a stale ' + field + ' is closed without mutation', () => {
    const d = driver(), request = { ...d.request(d.initial), [field]: 'stale-' + field };
    rejectedUnchanged(executeFullGame(d.initial, 'seat-1', request, d.context(START + 1)), d.initial, 'PHASE_CLOSED');
  });
}
for (const kind of ['HACK', 'CAPTAIN_ELECTION', 'RELEASE_CHOICE', 'RELEASE_VOTE', 'JAIL_VOTE', 'SHOWDOWN']) {
  test('Pass cannot shorten the ' + kind + ' window even for its active actor', () => {
    const d = driver(), state = structuredClone(d.initial);
    state.phase.kind = kind;
    const before = structuredClone(state);
    assert.equal(Object.hasOwn(legalTargets(state, state.seats[0]), 'PASS_TURN'), false);
    rejectedUnchanged(d.apply(state, 'seat-1'), state);
    assert.deepEqual(state, before);
  });
}
for (const kind of ['FINISHED', 'ABORTED']) {
  test('Pass cannot reopen terminal ' + kind, () => {
    const d = driver(), state = structuredClone(d.initial);
    state.phase.kind = kind; state.phase.endsAt = null; state.deadlineToken = null; state.activeSeatId = null;
    rejectedUnchanged(d.apply(state, 'seat-1'), state, 'PHASE_CLOSED');
  });
}
for (const unchanged of ['nextPhaseId', 'nextDeadlineToken', 'both']) {
  test('accepted Pass requires new phase ID and deadline token: ' + unchanged, () => {
    const d = driver(), before = structuredClone(d.initial), context = d.context(START + 1);
    if (unchanged !== 'nextDeadlineToken') context.nextPhaseId = d.initial.phase.id;
    if (unchanged !== 'nextPhaseId') context.nextDeadlineToken = d.initial.deadlineToken;
    assert.throws(() => executeFullGame(d.initial, 'seat-1', d.request(d.initial), context), /New phase identifiers required/);
    assert.deepEqual(d.initial, before);
  });
}

test('Pass preserves registered Main Action and Shot until normal round resolution', () => {
  const d = driver(9), turn = d.turn(d.initial, 'seat-5', 4);
  const protectedState = accepted(d.apply(turn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }));
  const shot = accepted(d.apply(protectedState, 'seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' }));
  assert.equal(shot.queued.length, 2);
  const before = structuredClone(shot), views = validViews(shot);
  const acknowledgments = Object.fromEntries(shot.seats.map(seat => [seat.seatId, projectOwnAcknowledgments(shot, seat.seatId)]));
  const passed = accepted(d.apply(shot, 'seat-5', PASS, shot.phase.startedAt + 25_000));
  assert.deepEqual(shot, before);
  assert.deepEqual(passed.queued, before.queued);
  assert.deepEqual(passed.seats, before.seats);
  assert.equal(passed.queued.some(entry => entry.command.type === 'PASS_TURN'), false);
  assert.equal(passed.round, before.round);
  assert.equal(passed.result, null);
  assert.equal(passed.seats[1].health, 'Healthy', 'Passing must not resolve the queued shot');
  assert.equal(passed.seats[0].protection, null, 'Passing must not activate the queued protection');
  const nextViews = validViews(passed);
  assert.deepEqual(nextViews.players['seat-5'].ownPendingCommandIds, views.players['seat-5'].ownPendingCommandIds);
  assert.equal(nextViews.public.viewRevision, views.public.viewRevision + 1);
  for (const seat of passed.seats) {
    assert.equal(nextViews.players[seat.seatId].viewRevision, views.players[seat.seatId].viewRevision + 1);
    assert.deepEqual(projectOwnAcknowledgments(passed, seat.seatId), acknowledgments[seat.seatId]);
  }
  const resolved = d.until(passed, state => state.round === 5);
  assert.equal(resolved.seats[1].health, 'Injured');
  assert.deepEqual(resolved.seats[0].protection, { activeFromRound: 5, consumed: false, grantedBy: 'seat-5' });
  assert.deepEqual(resolved.queued, []);
});

test('Pass opens a pending Hack immediately for its full minute and advances the turn only at Hack expiry', () => {
  const d = driver(), turn = d.turn(d.initial, 'seat-3');
  const action = accepted(d.apply(turn, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }));
  const requested = accepted(d.apply(action, 'seat-3', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }));
  const before = structuredClone(requested), now = requested.phase.startedAt + 21_000;
  const hacked = accepted(d.apply(requested, 'seat-3', PASS, now));
  assert.deepEqual(requested, before);
  assert.equal(hacked.phase.kind, 'HACK');
  assert.equal(hacked.phase.startedAt, now);
  assert.equal(hacked.phase.endsAt, now + 60_000);
  assert.equal(hacked.turnIndex, requested.turnIndex);
  assert.equal(hacked.activeSeatId, 'seat-3');
  assert.equal(hacked.pendingHack, null);
  assert.deepEqual(hacked.activeHack, before.pendingHack);
  assert.deepEqual(hacked.queued, before.queued);
  assert.deepEqual(hacked.seats, before.seats);
  assert.equal(hacked.hacksThisRound, before.hacksThisRound);
  assert.equal(hacked.journalSequence, before.journalSequence + 1);
  const views = validViews(hacked);
  assert.equal(views.players['seat-3'].hackPartnerSeatId, 'seat-2');
  assert.equal(views.players['seat-2'].hackPartnerSeatId, 'seat-3');
  assert.equal(views.players['seat-1'].hackPartnerSeatId, null);
  assert.equal(Object.hasOwn(views.players['seat-3'].legalTargets, 'PASS_TURN'), false);
  const early = advanceFullGame(hacked, { ...d.context(hacked.phase.endsAt - 1), phaseId: hacked.phase.id, deadlineToken: hacked.deadlineToken });
  assert.equal(early.advanced, false); assert.strictEqual(early.state, hacked);
  const next = d.tick(hacked);
  assert.equal(next.phase.kind, 'ORDINARY_TURN');
  assert.equal(next.activeSeatId, 'seat-4');
  assert.equal(next.turnIndex, before.turnIndex + 1);
  assert.deepEqual(next.queued, before.queued);
});

test('Pass skips an eliminated next seat while preserving the recorded order', () => {
  const d = driver(), state = structuredClone(d.initial);
  state.seats[1].health = 'Eliminated';
  const passed = accepted(d.apply(state, 'seat-1'));
  assert.equal(passed.turnIndex, 2);
  assert.equal(passed.activeSeatId, 'seat-3');
  assert.deepEqual(passed.turnOrder, state.turnOrder);
});
for (const release of [false, true]) {
  test('last ordinary Pass routes to ' + (release ? 'Captain release choice' : 'Jail vote') + ' without closing that window', () => {
    const d = driver(), turn = d.turn(d.initial, 'seat-7'), state = structuredClone(turn);
    if (release) {
      state.seats[0].captain = true; state.seats[0].location = 'Command Room';
      state.seats[1].jailed = true; state.seats[1].location = 'Jail';
    }
    const now = state.phase.startedAt + 1, passed = accepted(d.apply(state, 'seat-7', PASS, now));
    assert.equal(passed.phase.kind, release ? 'RELEASE_CHOICE' : 'JAIL_VOTE');
    assert.equal(passed.phase.startedAt, now);
    assert.equal(passed.phase.endsAt, now + 60_000);
    assert.equal(passed.activeSeatId, release ? 'seat-1' : null);
    assert.equal(passed.round, state.round);
    assert.equal(passed.result, null);
    assert.deepEqual(passed.seats, state.seats);
    assert.deepEqual(passed.queued, state.queued);
    assert.deepEqual(passed.eligibleTargets, release ? ['seat-2'] : state.seats.map(seat => seat.seatId));
    assert.equal(passed.releaseUsed, false);
    validViews(passed);
  });
}

test('duplicate old-phase Pass and its old deadline cannot advance the newly opened turn', () => {
  const d = driver(), before = structuredClone(d.initial), request = d.request(d.initial, PASS, 'pass-once');
  const context = d.context(START + 12_000), passed = accepted(executeFullGame(d.initial, 'seat-1', request, context));
  rejectedUnchanged(executeFullGame(passed, 'seat-1', request, d.context(START + 12_001)), passed, 'PHASE_CLOSED');
  const stale = advanceFullGame(passed, { ...d.context(before.phase.endsAt), phaseId: before.phase.id, deadlineToken: before.deadlineToken });
  assert.equal(stale.advanced, false); assert.strictEqual(stale.state, passed);
  const early = advanceFullGame(passed, { ...d.context(passed.phase.endsAt - 1), phaseId: passed.phase.id, deadlineToken: passed.deadlineToken });
  assert.equal(early.advanced, false); assert.strictEqual(early.state, passed);
  assert.equal(d.tick(passed).activeSeatId, 'seat-3');
  assert.deepEqual(d.initial, before);
});

test('constructor defaults to new pins and preserves an explicit supported tuple without aliasing it', () => {
  assert.deepEqual(driver().initial.versions, { ...FULL_GAME_VERSION_PINS, assetManifestVersion: ASSETS });
  for (const pins of [FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS]) {
    const versions = { ...pins, assetManifestVersion: ASSETS }, expected = structuredClone(versions);
    const initial = createFullGame(argumentsFor(7, versions));
    assert.deepEqual(initial.versions, expected);
    versions.engineVersion = 'caller-mutated';
    assert.deepEqual(initial.versions, expected);
    validViews(initial);
  }
});
for (const [name, changed] of [
  ['old engine/new rules', { engineVersion: LEGACY_FULL_GAME_VERSION_PINS.engineVersion }],
  ['new engine/old rules version', { rulesetVersion: LEGACY_FULL_GAME_VERSION_PINS.rulesetVersion }],
  ['new engine/old hash', { rulesetHash: LEGACY_FULL_GAME_VERSION_PINS.rulesetHash }],
  ['unknown engine', { engineVersion: 'full-game-unknown' }],
  ['protocol mismatch', { protocolVersion: 1 }],
  ['different asset argument', { assetManifestVersion: 'another-assets-v1' }],
  ['unknown version field', { callerControlled: true }],
]) {
  test('constructor rejects ' + name, () => {
    const versions = { ...FULL_GAME_VERSION_PINS, assetManifestVersion: ASSETS, ...changed };
    assert.throws(() => createFullGame(argumentsFor(7, versions)));
  });
}

test('legacy matches retain their pins and timed gameplay but never hint or accept Pass', () => {
  const d = driver(7, { ...LEGACY_FULL_GAME_VERSION_PINS, assetManifestVersion: ASSETS });
  const before = structuredClone(d.initial), views = validViews(d.initial);
  for (const view of Object.values(views.players)) assert.equal(Object.hasOwn(view.legalTargets, 'PASS_TURN'), false);
  rejectedUnchanged(d.apply(d.initial, 'seat-1'), d.initial);
  assert.deepEqual(d.initial, before);
  const moved = accepted(d.apply(d.initial, 'seat-1', { type: 'MOVE', destination: 'Room B' }));
  assert.deepEqual(moved.versions, before.versions);
  const next = d.tick(moved);
  assert.equal(next.activeSeatId, 'seat-2');
  assert.deepEqual(next.versions, before.versions);
  assert.equal(Object.hasOwn(validViews(next).players['seat-2'].legalTargets, 'PASS_TURN'), false);
});
for (const field of ['engineVersion', 'rulesetVersion', 'rulesetHash']) {
  test('a loaded mixed tuple cannot obtain Pass through only a changed ' + field, () => {
    const d = driver(), state = structuredClone(d.initial);
    state.versions[field] = LEGACY_FULL_GAME_VERSION_PINS[field];
    assert.equal(Object.hasOwn(validViews(state).players['seat-1'].legalTargets, 'PASS_TURN'), false);
    rejectedUnchanged(d.apply(state, 'seat-1'), state);
  });
}

test('serialized reload and identical recorded Pass replay preserve state, views, and acknowledgment revisions', () => {
  const d = driver(), initial = structuredClone(d.initial), journal = [];
  const record = (state, actorSeatId, command, now) => {
    const entry = { actorSeatId, request: d.request(state, command), context: d.context(now) };
    journal.push(entry);
    return accepted(executeFullGame(state, actorSeatId, entry.request, entry.context));
  };
  const hack = record(initial, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }, START + 1);
  const loaded = JSON.parse(JSON.stringify(hack));
  const passed = record(loaded, 'seat-1', PASS, START + 15_000);
  let replay = structuredClone(initial);
  for (const entry of journal) replay = accepted(executeFullGame(replay, entry.actorSeatId, entry.request, entry.context));
  assert.deepEqual(replay, passed);
  assert.deepEqual(validViews(replay), validViews(passed));
  assert.equal(passed.journalSequence, initial.journalSequence + 2);
  assert.deepEqual(initial, d.initial);
  for (const seat of passed.seats) assert.deepEqual(projectOwnAcknowledgments(passed, seat.seatId), projectOwnAcknowledgments(initial, seat.seatId));
});
for (const extra of [{ targetSeatId: 'seat-1' }, { approve: true }, { destination: 'Room B' }]) {
  test('Pass command is targetless and rejects extra fields ' + Object.keys(extra).join(','), () => {
    const d = driver(), before = structuredClone(d.initial);
    assert.throws(() => executeFullGame(d.initial, 'seat-1', d.request(d.initial, { ...PASS, ...extra }), d.context(START + 1)));
    assert.deepEqual(d.initial, before);
  });
}
