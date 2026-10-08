import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OwnAcknowledgmentsSchema } from '@mothership/contracts';
import {
  FULL_ENGINE_VERSION, createFullGame, executeFullGame, advanceFullGame,
  abortFullGame, projectFullGame, projectOwnAcknowledgments,
} from '../dist/index.js';

const roles = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
function driver(playerCount = 7) {
  let serial = 0;
  const context = now => ({ now, nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `deadline-${serial}` });
  const roleOrder = [...roles, ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const initial = createFullGame({ matchId: 'acknowledgment-fixture',
    setup: { playerCount, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
      initialRooms: Object.fromEntries(ids.map(id => [id, 'Room A'])), roundOrders: Array.from({ length: 5 }, () => [...ids]) },
    now: 1_800_000_000_000, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: 'fixture-assets-v1' });
  const journal = [];
  const tick = state => {
    assert.notEqual(state.phase.endsAt, null, 'Fixture must reach checkpoint before match ends');
    const entry = { kind: 'deadline', context: { ...context(state.phase.endsAt), phaseId: state.phase.id, deadlineToken: state.deadlineToken } };
    const result = advanceFullGame(state, entry.context);
    assert.equal(result.advanced, true);
    journal.push(entry);
    return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let count = 0; !predicate(current); count++) { assert.ok(count < 200); current = tick(current); }
    return current;
  };
  const turn = (state, seatId, round = state.round) => until(state, next => next.round === round && next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === seatId);
  const command = (state, actorSeatId, value, commandId = `command-${serial + 1}`) => {
    const entry = { kind: 'command', actorSeatId, request: { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId, command: value }, context: context(state.phase.startedAt + 1) };
    const result = executeFullGame(state, actorSeatId, entry.request, entry.context);
    assert.equal(result.receipt.status, 'accepted');
    journal.push(entry);
    return result.state;
  };
  return { initial, journal, context, tick, until, turn, command };
}
function registered(d, targetSeatIds = ['seat-1', 'seat-2']) {
  const ready = d.turn(d.initial, 'seat-4', 3);
  return d.command(ready, 'seat-4', { type: 'SUPPLY', targetSeatIds }, 'supply-command');
}
const resolved = (d, state) => d.until(state, next => next.round === 4);
const resultFor = ids => [{ round: 3, commandId: 'supply-command', successfulRecipientSeatIds: ids }];
const received = [{ round: 3, ordinaryWeaponsGranted: 1 }];

for (const playerCount of [7, 8, 9]) {
  test(`${playerCount}-player Supply result is durable, private and separate from existing views`, () => {
    const d = driver(playerCount);
    const before = structuredClone(d.initial);
    assert.equal(FULL_ENGINE_VERSION, 'full-game-1.1.0');
    assert.equal(d.initial.versions.engineVersion, FULL_ENGINE_VERSION);
    assert.deepEqual(d.initial.supplierGrantResults, []);
    const submitted = registered(d);
    assert.deepEqual(d.initial, before, 'Transitions must not mutate their input state');
    assert.deepEqual(projectOwnAcknowledgments(submitted, 'seat-4').supplierResults, [], 'Registration is not resolution');
    const after = resolved(d, submitted);
    assert.deepEqual(after.supplierGrantResults, [{ round: 3, commandId: 'supply-command', supplierSeatId: 'seat-4', successfulRecipientSeatIds: ['seat-1', 'seat-2'] }]);
    const supplier = projectOwnAcknowledgments(after, 'seat-4');
    OwnAcknowledgmentsSchema.parse(supplier);
    assert.deepEqual(supplier.supplierResults, resultFor(['seat-1', 'seat-2']));
    assert.deepEqual(supplier.receivedSupply, []);
    assert.equal(supplier.revision, 2);
    for (const id of ['seat-1', 'seat-2']) {
      const own = projectOwnAcknowledgments(after, id);
      assert.deepEqual(own.receivedSupply, received);
      assert.deepEqual(own.supplierResults, []);
      assert.equal(own.revision, 2);
      assert.equal(after.seats.find(seat => seat.seatId === id).ordinaryWeapons, 1);
      assert.equal(JSON.stringify(own).includes('supply-command'), false);
      assert.equal(JSON.stringify(own).includes('seat-4'), false);
    }
    const loaded = JSON.parse(JSON.stringify(after));
    for (const seat of loaded.seats) assert.deepEqual(projectOwnAcknowledgments(loaded, seat.seatId), projectOwnAcknowledgments(after, seat.seatId));
    const views = projectFullGame(loaded);
    assert.deepEqual(views.players['seat-4'].ownPendingCommandIds, []);
    assert.equal(JSON.stringify(views).includes('supplierResults'), false);
    assert.equal(JSON.stringify(views.public).includes('ordinaryWeapons'), false);
  });
}

test('recorded command/deadline replay is identical and a duplicated resolution deadline cannot grant twice', () => {
  const d = driver();
  const after = resolved(d, registered(d));
  let replay = structuredClone(d.initial);
  for (const entry of d.journal) {
    const transition = entry.kind === 'command'
      ? executeFullGame(replay, entry.actorSeatId, entry.request, entry.context)
      : advanceFullGame(replay, entry.context);
    replay = transition.state;
  }
  assert.deepEqual(replay, after);
  assert.deepEqual(projectOwnAcknowledgments(replay, 'seat-4'), projectOwnAcknowledgments(after, 'seat-4'));
  const duplicate = advanceFullGame(after, d.journal.at(-1).context);
  assert.equal(duplicate.advanced, false);
  assert.strictEqual(duplicate.state, after);
  const later = d.tick(after);
  assert.equal(later.supplierGrantResults.length, 1);
  assert.deepEqual(projectOwnAcknowledgments(later, 'seat-4'), projectOwnAcknowledgments(after, 'seat-4'));
});

test('a valid Supply still resolves and records its result after attacks eliminate Supplier', () => {
  const d = driver(8);
  let state = d.turn(d.initial, 'seat-3', 3);
  state = d.command(state, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-4' });
  state = d.turn(state, 'seat-4');
  state = d.command(state, 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-2'] }, 'supply-command');
  state = d.turn(state, 'seat-8');
  state = d.command(state, 'seat-8', { type: 'DISABLE', targetSeatId: 'seat-4' });
  const after = resolved(d, state);
  assert.equal(after.seats.find(seat => seat.seatId === 'seat-4').health, 'Eliminated');
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-4').supplierResults, resultFor(['seat-1', 'seat-2']));
  for (const id of ['seat-1', 'seat-2']) assert.deepEqual(projectOwnAcknowledgments(after, id).receivedSupply, received);
});

test('a recipient eliminated by ordered real attacks before Supply gets no weapon or receipt', () => {
  const d = driver(9);
  let state = d.turn(d.initial, 'seat-3', 3);
  state = d.command(state, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' });
  state = d.turn(state, 'seat-4');
  state = d.command(state, 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-2'] }, 'supply-command');
  state = d.turn(state, 'seat-9');
  state = d.command(state, 'seat-9', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' });
  const after = resolved(d, state);
  assert.equal(after.seats.find(seat => seat.seatId === 'seat-1').health, 'Eliminated');
  assert.equal(after.seats.find(seat => seat.seatId === 'seat-1').ordinaryWeapons, 0);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-1').receivedSupply, []);
  assert.equal(projectOwnAcknowledgments(after, 'seat-1').revision, 1);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-4').supplierResults, resultFor(['seat-2']));
});

test('accepted Supply with no surviving recipient persists an empty Supplier result only', () => {
  const d = driver();
  const state = registered(d);
  // Synthetic later target deaths isolate the no-success checkpoint. No new
  // targeting or failure-cause disclosure rule is inferred from this fixture.
  for (const id of ['seat-1', 'seat-2']) state.seats.find(seat => seat.seatId === id).health = 'Eliminated';
  const after = resolved(d, state);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-4').supplierResults, resultFor([]));
  assert.equal(projectOwnAcknowledgments(after, 'seat-4').revision, 2);
  for (const id of ['seat-1', 'seat-2']) {
    assert.deepEqual(projectOwnAcknowledgments(after, id).receivedSupply, []);
    assert.equal(projectOwnAcknowledgments(after, id).revision, 1);
  }
  assert.equal(after.supplierGrantResults.length, 1);
  const aborted = abortFullGame(after, d.context(after.phase.startedAt + 1));
  assert.deepEqual(projectOwnAcknowledgments(aborted, 'seat-4'), projectOwnAcknowledgments(after, 'seat-4'));
});

test('Officer gets its private ammunition receipt after a spent shot without gaining a second ordinary shot', () => {
  const d = driver(9);
  let state = d.turn(d.initial, 'seat-9');
  state = d.command(state, 'seat-9', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' });
  state = d.turn(state, 'seat-4', 3);
  state = d.command(state, 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-6', 'seat-9'] }, 'supply-command');
  const after = resolved(d, state);
  const officer = after.seats.find(seat => seat.seatId === 'seat-9');
  assert.equal(officer.officerShotSpent, true);
  assert.equal(officer.ordinaryWeapons, 1);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-9').receivedSupply, received);
  const turn = d.turn(after, 'seat-9');
  assert.equal(projectFullGame(turn).players['seat-9'].self.shotAvailable, false);
  const attempted = executeFullGame(turn, 'seat-9', { protocolVersion: 2, matchId: turn.matchId, phaseId: turn.phase.id,
    commandId: 'no-second-shot', command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' } }, d.context(turn.phase.startedAt + 1));
  assert.equal(attempted.receipt.code, 'NOT_ALLOWED');
  assert.deepEqual(projectOwnAcknowledgments(attempted.state, 'seat-9').receivedSupply, received);
});

test('recipient receipt is one grant even when existing ammunition is different', () => {
  const d = driver();
  const after = resolved(d, registered(d, ['seat-2', 'seat-5']));
  assert.equal(after.seats.find(seat => seat.seatId === 'seat-5').ordinaryWeapons, 2);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-2').receivedSupply, projectOwnAcknowledgments(after, 'seat-5').receivedSupply);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-5').receivedSupply, received);
});

test('paired recipient choices change only authorized acknowledgment facts and never reveal hidden sequence gaps', () => {
  const run = targets => { const d = driver(); const submitted = registered(d, targets); return { initial: d.initial, submitted, state: resolved(d, submitted) }; };
  const a = run(['seat-1', 'seat-2']), b = run(['seat-1', 'seat-3']);
  const av = projectFullGame(a.state), bv = projectFullGame(b.state);
  assert.deepEqual(av.public, bv.public);
  assert.deepEqual(av.players['seat-4'], bv.players['seat-4'], 'Normal strict Supplier view remains unchanged');
  assert.notDeepEqual(projectOwnAcknowledgments(a.state, 'seat-4'), projectOwnAcknowledgments(b.state, 'seat-4'));
  assert.deepEqual(projectOwnAcknowledgments(a.state, 'seat-1'), projectOwnAcknowledgments(b.state, 'seat-1'), 'Common recipient never learns the other recipient');
  for (const id of ['seat-5', 'seat-6', 'seat-7']) {
    assert.deepEqual(av.players[id], bv.players[id]);
    assert.deepEqual(projectOwnAcknowledgments(a.state, id), projectOwnAcknowledgments(b.state, id));
    assert.deepEqual(projectOwnAcknowledgments(a.initial, id), projectOwnAcknowledgments(a.submitted, id));
    assert.deepEqual(projectOwnAcknowledgments(a.initial, id), projectOwnAcknowledgments(a.state, id));
  }
  const artificialHiddenSequence = structuredClone(a.state);
  artificialHiddenSequence.journalSequence += 100;
  artificialHiddenSequence.viewRevisions.public += 20;
  artificialHiddenSequence.viewRevisions.players['seat-5'] += 10;
  assert.deepEqual(projectOwnAcknowledgments(artificialHiddenSequence, 'seat-5'), projectOwnAcknowledgments(a.state, 'seat-5'));
});

test('legacy history absence stays unavailable after Round 3 and never infers results from ammunition', () => {
  const d = driver();
  const legacy = JSON.parse(JSON.stringify(resolved(d, registered(d))));
  delete legacy.supplierGrantResults;
  legacy.versions.engineVersion = 'full-game-1.0.0';
  for (const id of ['seat-1', 'seat-4', 'seat-5']) {
    const own = projectOwnAcknowledgments(legacy, id);
    assert.equal(own.historyAvailable, false);
    assert.equal(own.revision, 0);
    assert.deepEqual(own.supplierResults, []);
    assert.deepEqual(own.receivedSupply, []);
  }
  const later = d.tick(legacy);
  assert.equal(later.versions.engineVersion, 'full-game-1.0.0', 'Pure transitions never rewrite saved pins');
  assert.equal(later.supplierGrantResults, undefined);
  assert.equal(projectOwnAcknowledgments(later, 'seat-4').historyAvailable, false);
});

test('a legacy pre-resolution state records only future actual Round 3 outcomes', () => {
  const d = driver();
  const legacy = registered(d);
  delete legacy.supplierGrantResults;
  legacy.versions.engineVersion = 'full-game-1.0.0';
  assert.equal(projectOwnAcknowledgments(legacy, 'seat-4').historyAvailable, false);
  const after = resolved(d, legacy);
  assert.equal(after.versions.engineVersion, 'full-game-1.0.0');
  assert.equal(projectOwnAcknowledgments(after, 'seat-4').historyAvailable, true);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-4').supplierResults, resultFor(['seat-1', 'seat-2']));
  // This pure compatibility case does not authorize service mutation of legacy pins.
});

test('known empty history is distinct from legacy missing history; abort before resolution fabricates no grant', () => {
  const d = driver();
  const withoutSupply = d.until(d.initial, state => state.round === 4);
  assert.deepEqual(withoutSupply.supplierGrantResults, []);
  assert.equal(projectOwnAcknowledgments(withoutSupply, 'seat-4').historyAvailable, true);
  const registeredSupply = registered(driver());
  const aborted = abortFullGame(registeredSupply, d.context(registeredSupply.phase.startedAt + 1));
  assert.deepEqual(aborted.supplierGrantResults, []);
  assert.deepEqual(projectOwnAcknowledgments(aborted, 'seat-4').supplierResults, []);
});

test('same-seat binding revisions advance own acknowledgment revision and do not change private results', () => {
  const d = driver();
  const state = resolved(d, registered(d));
  const original = projectOwnAcknowledgments(state, 'seat-4');
  const recovered = projectOwnAcknowledgments(state, 'seat-4', 2);
  assert.equal(recovered.bindingRevision, 2);
  assert.equal(recovered.revision, original.revision + 1);
  assert.deepEqual(recovered.supplierResults, original.supplierResults);
  assert.deepEqual(projectOwnAcknowledgments(state, 'seat-5'), projectOwnAcknowledgments(d.initial, 'seat-5'));
});

test('unknown audiences, invalid binding revisions and counter overflow fail closed', () => {
  const d = driver();
  assert.throws(() => projectOwnAcknowledgments(d.initial, 'seat-9'));
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => projectOwnAcknowledgments(d.initial, 'seat-4', value));
  const resolvedState = resolved(d, registered(d));
  assert.throws(() => projectOwnAcknowledgments(resolvedState, 'seat-4', Number.MAX_SAFE_INTEGER));
});

test('projection returns detached evidence and cannot mutate the authoritative ledger', () => {
  const d = driver();
  const state = resolved(d, registered(d));
  const own = projectOwnAcknowledgments(state, 'seat-4');
  own.supplierResults[0].successfulRecipientSeatIds.length = 0;
  own.supplierResults.length = 0;
  assert.deepEqual(projectOwnAcknowledgments(state, 'seat-4').supplierResults, resultFor(['seat-1', 'seat-2']));
});


test('malformed saved acknowledgment history is refused rather than represented as known empty', () => {
  const d = driver();
  for (const value of [null, {}, 'missing']) {
    const malformed = structuredClone(d.initial);
    malformed.supplierGrantResults = value;
    assert.throws(() => projectOwnAcknowledgments(malformed, 'seat-4'));
  }
});


test('a valid Supply keeps its locked recipients when a recipient moves before resolution', () => {
  const d = driver();
  let state = registered(d);
  state = d.command(state, 'seat-1', { type: 'MOVE', destination: 'Room B' });
  const after = resolved(d, state);
  assert.equal(after.seats.find(seat => seat.seatId === 'seat-1').location, 'Room B');
  assert.equal(after.seats.find(seat => seat.seatId === 'seat-1').ordinaryWeapons, 1);
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-4').supplierResults, resultFor(['seat-1', 'seat-2']));
  assert.deepEqual(projectOwnAcknowledgments(after, 'seat-1').receivedSupply, received);
});
