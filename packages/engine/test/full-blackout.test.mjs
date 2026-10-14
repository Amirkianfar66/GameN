import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPublicViewSchema, FullPlayerViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  BLACKOUT_FULL_GAME_VERSION_PINS as PINS, CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS,
  BOARD_MEDICAL_FULL_GAME_VERSION_PINS, PUBLIC_HACK_FULL_GAME_VERSION_PINS,
  DECLARED_HACK_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';
import { assertBlackoutState, finishBlackout, selectBlackoutSlot, openBlackout } from '../dist/full-game/blackout.js';

// Issue #148 pure engine/contract acceptance. Native cases begin with legal SETUP
// and actual commands/deadlines. SYNTHETIC body, medical and queue-order samples
// are explicitly labeled and do not establish native service reachability.
// Receipt lookup, Functions/Tasks, UI art and independent Balance remain separate.
const START = 1_800_000_000_000, ASSETS = 'blackout-engine-fixture-v1';
const ROLES = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const OLD = [LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS, BOARD_MEDICAL_FULL_GAME_VERSION_PINS, CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS];
const copy = value => JSON.parse(JSON.stringify(value));
const seat = (state, id) => state.seats.find(value => value.seatId === id);
const publicSeat = (state, id) => projectFullGame(state).public.seats.find(value => value.seatId === id);
const disablers = n => ['seat-3', ...(n >= 8 ? ['seat-8'] : [])];
function views(state) {
  const projected = projectFullGame(state); FullPublicViewSchema.parse(projected.public);
  for (const player of Object.values(projected.players)) {
    FullPlayerViewSchema.parse(player); assert.deepEqual(player.seats, projected.public.seats);
    if (state.versions.engineVersion === PINS.engineVersion) {
      const attempt = state.blackout?.attempts.find(value => value.actorSeatId === player.self.seatId);
      assert.equal(player.self.blackoutTargeting === null, !attempt);
      if (attempt) assert.equal(player.self.blackoutTargeting.selectedSlotId, attempt.selectedSlotId);
    } else assert.equal(Object.hasOwn(player.self, 'blackoutTargeting'), false);
  }
  if (state.versions.engineVersion === PINS.engineVersion && state.phase.kind === 'BLACKOUT') {
    assert.deepEqual(Object.keys(projected.public.blackout).sort(), ['darkStartsAt', 'layoutRevision', 'snapshotId']);
    assert.equal(projected.public.activeSeatId, null);
    assert.equal(projected.public.blackout.darkStartsAt, state.phase.startedAt + 5000);
    assert.equal(state.phase.endsAt - state.phase.startedAt, 15000);
  }
  return projected;
}
function driver(n, pins = PINS) {
  let commandSerial = 0, phaseSerial = 0;
  const roleOrder = [...ROLES, ...(n >= 8 ? ['Red Disabler'] : []), ...(n === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const setup = { playerCount: n, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < 5 ? 'Room A' : 'Room B'])),
    roundOrders: Array.from({ length: 5 }, () => [...ids]) };
  const args = { matchId: 'blackout-fixture', setup, now: START, phaseId: 'phase-initial', deadlineToken: 'token-initial',
    assetManifestVersion: ASSETS, versions: { ...pins, assetManifestVersion: ASSETS } };
  const initial = createFullGame(args), history = []; views(initial);
  const context = now => ({ now, nextPhaseId: `deadline-phase-${++phaseSerial}`, nextDeadlineToken: `deadline-token-${phaseSerial}` });
  const apply = (state, actor, command, now = state.phase.startedAt + 1) => {
    const id = ++commandSerial;
    const request = { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId: `command-${id}`, command };
    const ctx = { now, nextPhaseId: `command-phase-${id}`, nextDeadlineToken: `command-token-${id}` };
    const previous = copy(state), result = executeFullGame(state, actor, request, ctx);
    FullReceiptSchema.parse(result.receipt); assert.deepEqual(state, previous);
    assert.deepEqual(executeFullGame(copy(state), actor, copy(request), copy(ctx)), result, 'Predecessor command replay after JSON recovery is deterministic');
    views(result.state); history.push({ kind: 'COMMAND', actor, request, context: ctx, receipt: result.receipt }); return result;
  };
  const tick = (state, lateness = 0) => {
    assert.notEqual(state.phase.endsAt, null);
    const ctx = { ...context(state.phase.endsAt + lateness), phaseId: state.phase.id, deadlineToken: state.deadlineToken };
    const previous = copy(state), result = advanceFullGame(state, ctx);
    assert.equal(result.advanced, true); assert.deepEqual(state, previous);
    assert.deepEqual(advanceFullGame(copy(state), copy(ctx)), result);
    assert.equal(advanceFullGame(result.state, ctx).advanced, false);
    views(result.state); history.push({ kind: 'DEADLINE', context: ctx }); return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let bound = 0; !predicate(current); bound++) { assert.ok(bound < 260, 'Canonical checkpoint must be reachable'); current = tick(current); }
    return current;
  };
  const replay = expected => {
    let state = createFullGame(copy(args));
    for (const entry of history) {
      if (entry.kind === 'COMMAND') {
        const result = executeFullGame(state, entry.actor, copy(entry.request), copy(entry.context));
        assert.deepEqual(result.receipt, entry.receipt); state = result.state;
      } else state = advanceFullGame(state, copy(entry.context)).state;
    }
    assert.deepEqual(state, expected); assert.deepEqual(views(state), views(expected));
  };
  return { initial, apply, tick, until, replay, context };
}
const accepted = result => { assert.equal(result.receipt.status, 'accepted', JSON.stringify(result.receipt)); return result.state; };
function denied(result, previous, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected'); assert.equal(result.receipt.code, code); assert.strictEqual(result.state, previous);
}
const turn = (d, state, round, actor) => d.until(state, s => s.round === round && s.phase.kind === 'ORDINARY_TURN' && s.activeSeatId === actor);
function vote(d, state, target = null) {
  let current = state;
  if (target !== null) for (const voter of state.eligibleVoters.slice(0, Math.ceil(state.eligibleVoters.length / 2))) current = accepted(d.apply(current, voter, { type: 'VOTE', targetSeatId: target }));
  return d.tick(current);
}
function window(d, state, jailTarget = null) {
  const round = state.round, jail = d.until(state, s => s.round === round && s.phase.kind === 'JAIL_VOTE');
  const result = vote(d, jail, jailTarget); assert.equal(result.phase.kind, 'VOTE_RESULT');
  assert.equal(result.phase.endsAt - result.phase.startedAt, 5000);
  const opened = d.tick(result); assert.equal(opened.phase.kind, 'BLACKOUT'); return opened;
}
function endRound(d, state, jailTarget = null) { return d.tick(window(d, state, jailTarget)); }
function elect(d, state, target) {
  const election = d.until(state, s => s.phase.kind === 'CAPTAIN_ELECTION');
  let current = vote(d, election, target); if (current.phase.kind === 'VOTE_RESULT') current = d.tick(current); return current;
}
function request(d, state, round, actor = 'seat-3') { return accepted(d.apply(turn(d, state, round, actor), actor, { type: 'REQUEST_BLACKOUT' })); }
function select(d, state, actor, slotId, delta = 5000) {
  const targeting = views(state).players[actor].self.blackoutTargeting; assert.ok(targeting);
  return d.apply(state, actor, { type: 'SELECT_BLACKOUT_SLOT', snapshotId: targeting.snapshotId, room: targeting.room, slotId }, state.phase.startedAt + delta);
}
function sameRoomRequests(n, { protection = false } = {}) {
  const d = driver(n); let state = turn(d, d.initial, 1, 'seat-1');
  state = accepted(d.apply(state, 'seat-1', { type: 'MOVE', destination: 'Room B' }));
  if (n >= 8) state = accepted(d.apply(state, 'seat-8', { type: 'MOVE', destination: 'Room A' }));
  if (protection) state = accepted(d.apply(turn(d, state, 1, 'seat-5'), 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-2' }));
  const round = protection ? 2 : 1;
  if (protection) state = elect(d, endRound(d, state), 'seat-7');
  for (const actor of disablers(n)) state = request(d, state, round, actor);
  return { d, state: window(d, state) };
}

for (const n of [7, 8, 9]) {
  test(`${n}: native no-request rounds always run the full common 5+10 clock`, () => {
    const d = driver(n); let state = d.initial;
    for (let round = 1; round <= 5; round++) {
      if (state.phase.kind === 'CAPTAIN_ELECTION') state = elect(d, state, 'seat-7');
      const opened = window(d, state);
      assert.equal(opened.round, round); assert.deepEqual(opened.blackout.attempts, []);
      assert.equal(opened.blackout.occupants.length, n);
      for (const actor of disablers(n)) assert.equal(seat(opened, actor).disablerSpent, false);
      for (const delta of [4999, 5000, 14999]) {
        const early = advanceFullGame(opened, { ...d.context(opened.phase.startedAt + delta), phaseId: opened.phase.id, deadlineToken: opened.deadlineToken });
        assert.equal(early.advanced, false); assert.strictEqual(early.state, opened);
      }
      state = d.tick(opened); assert.equal(state.blackout, null);
    }
    d.replay(state);
  });
  test(`${n}: native untargeted request reserves Main Action without public/unrelated-player cue`, () => {
    const d = driver(n), state = turn(d, d.initial, 1, 'seat-3'), before = views(state);
    denied(d.apply(state, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-2' }), state);
    denied(d.apply(state, 'seat-2', { type: 'REQUEST_BLACKOUT' }), state);
    const after = request(d, state, 1);
    assert.equal(seat(after, 'seat-3').mainActionUsedRound, 1); assert.equal(seat(after, 'seat-3').disablerSpent, false);
    assert.deepEqual(after.queued.filter(q => q.actorSeatId === 'seat-3').map(q => q.command), [{ type: 'REQUEST_BLACKOUT' }]);
    assert.deepEqual(views(after).public, before.public);
    assert.deepEqual(views(after).players['seat-4'], before.players['seat-4']);
    denied(d.apply(after, 'seat-3', { type: 'REQUEST_BLACKOUT' }), after); d.replay(after);
  });
  test(`${n}: native Jail cancellation preserves lifetime use and cannot resurrect this request`, () => {
    const d = driver(n), requested = request(d, d.initial, 1), opened = window(d, requested, 'seat-3');
    assert.equal(seat(opened, 'seat-3').jailed, true); assert.equal(seat(opened, 'seat-3').mainActionUsedRound, 1);
    assert.equal(seat(opened, 'seat-3').disablerSpent, false); assert.deepEqual(opened.blackout.attempts, []);
    assert.equal(opened.queued.some(q => q.command.type === 'REQUEST_BLACKOUT'), false);
    assert.equal(views(opened).players['seat-3'].self.blackoutTargeting, null);
    let current = elect(d, d.tick(opened), 'seat-7'); current = turn(d, current, 2, 'seat-7');
    current = accepted(d.apply(current, 'seat-7', { type: 'CAPTAIN_RELEASE' }));
    current = electIfNeeded(d, endRound(d, current));
    current = request(d, current, 3); assert.equal(seat(current, 'seat-3').disablerSpent, false);
    d.replay(current);
  });
  test(`${n}: native room binding uses opening placement after a post-request move`, () => {
    const d = driver(n); let state = request(d, d.initial, 1);
    state = accepted(d.apply(state, 'seat-3', { type: 'MOVE', destination: 'Room B' }));
    const opened = window(d, state), targeting = views(opened).players['seat-3'].self.blackoutTargeting;
    assert.equal(targeting.room, 'Room B'); assert.deepEqual(targeting.slotIds, ['B1', 'B2', 'B3', 'B4', 'B5']);
    const next = accepted(select(d, opened, 'seat-3', targeting.selectedSlotId ?? seat(opened, 'seat-3').slotId));
    const final = d.tick(next); assert.equal(seat(final, 'seat-3').health, 'Healthy'); d.replay(final);
  });
  test(`${n}: native selection half-open boundaries, wrong intents and first-lock recovery`, () => {
    const d = driver(n), requested = request(d, d.initial, 1), opened = window(d, requested), before = copy(opened);
    const targeting = views(opened).players['seat-3'].self.blackoutTargeting;
    denied(select(d, opened, 'seat-3', 'A2', 4999), opened);
    for (const change of [{ snapshotId: 'stale-snapshot' }, { room: 'Room B' }, { slotId: 'B2' }]) {
      denied(d.apply(opened, 'seat-3', { type: 'SELECT_BLACKOUT_SLOT', snapshotId: targeting.snapshotId, room: targeting.room, slotId: 'A2', ...change }, opened.phase.startedAt + 5000), opened);
    }
    for (const malformed of [null, {}, { type: 'SELECT_BLACKOUT_SLOT', snapshotId: targeting.snapshotId, room: targeting.room, slotId: 'A6' },
      { type: 'SELECT_BLACKOUT_SLOT', snapshotId: targeting.snapshotId, room: targeting.room, slotId: 'A2', targetSeatId: 'seat-2' }]) {
      const sample = copy(opened); assert.equal(selectBlackoutSlot(sample, seat(sample, 'seat-3'), malformed, 'malformed-id', sample.phase.startedAt + 5000), false); assert.deepEqual(sample, before);
    }
    assert.equal(seat(opened, 'seat-3').disablerSpent, false);
    const chosen = accepted(select(d, opened, 'seat-3', 'A2', 5000)), selectedView = views(chosen);
    assert.equal(seat(chosen, 'seat-3').disablerSpent, true); assert.equal(selectedView.players['seat-3'].self.blackoutTargeting.selectedSlotId, 'A2');
    assert.equal(Object.hasOwn(selectedView.players['seat-3'].legalTargets, 'SELECT_BLACKOUT_SLOT'), false);
    assert.deepEqual(selectedView.public, views(opened).public); assert.deepEqual(selectedView.players['seat-4'], views(opened).players['seat-4']);
    denied(select(d, chosen, 'seat-3', 'A1', 5001), chosen);
    denied(select(d, chosen, 'seat-3', 'A2', 14999), chosen);
    denied(select(d, opened, 'seat-3', 'A2', 15000), opened, 'PHASE_CLOSED');
    assert.deepEqual(views(copy(chosen)), selectedView);
    const final = d.tick(chosen); assert.equal(seat(final, 'seat-2').health, 'Injured'); assert.equal(seat(final, 'seat-2').location, 'Hospital');
    d.replay(final);
  });
  for (const kind of ['timeout', 'self', 'empty']) test(`${n}: native ${kind} is a consuming miss with no replacement or self damage`, () => {
    const d = driver(n); let state = d.initial;
    if (kind === 'empty') state = accepted(d.apply(state, 'seat-1', { type: 'MOVE', destination: 'Room B' }));
    state = window(d, request(d, state, 1));
    if (kind !== 'timeout') state = accepted(select(d, state, 'seat-3', kind === 'self' ? seat(state, 'seat-3').slotId : 'A1', 14999));
    const final = d.tick(state); assert.equal(seat(final, 'seat-3').disablerSpent, true);
    assert.ok(final.seats.every(player => player.health === 'Healthy')); d.replay(final);
  });
  test(`${n}: SYNTHETIC snapshot corpse is selectable and a consuming miss`, () => {
    const d = driver(n); let state = turn(d, d.initial, 1, 'seat-3');
    seat(state, 'seat-2').health = 'Eliminated'; // Explicit retained-body predecessor.
    state = window(d, request(d, state, 1));
    assert.equal(state.blackout.occupants.find(value => value.seatId === 'seat-2').health, 'Eliminated');
    const selected = accepted(select(d, state, 'seat-3', 'A2')), final = d.tick(selected);
    assert.equal(seat(final, 'seat-2').health, 'Eliminated'); assert.equal(seat(final, 'seat-3').disablerSpent, true);
    assert.ok(final.seats.filter(value => value.seatId !== 'seat-2').every(value => value.health === 'Healthy'));
  });
  test(`${n}: native Command-only Disabler may request neutral C1 and miss without target hints`, () => {
    const d = driver(n); let state = elect(d, endRound(d, d.initial), 'seat-3');
    state = request(d, state, 2); state = window(d, state);
    const targeting = views(state).players['seat-3'].self.blackoutTargeting;
    assert.equal(targeting.room, 'Command Room'); assert.deepEqual(targeting.slotIds, ['C1']);
    const selected = accepted(select(d, state, 'seat-3', 'C1')), final = d.tick(selected);
    assert.equal(seat(final, 'seat-3').health, 'Healthy'); assert.equal(seat(final, 'seat-3').disablerSpent, true); d.replay(final);
  });
  test(`${n}: native off-board EJECT victims are excluded from frozen occupancy and reveal only after full window`, () => {
    const d = driver(n); let state = elect(d, endRound(d, d.initial, 'seat-1'), 'seat-4');
    state = accepted(d.apply(turn(d, state, 2, 'seat-4'), 'seat-4', { type: 'CAPTAIN_EJECT' }));
    const opened = window(d, state);
    assert.equal(opened.blackout.occupants.some(value => value.seatId === 'seat-1'), false);
    assert.equal(publicSeat(opened, 'seat-1').revealedFaction, null);
    const final = d.tick(opened); assert.equal(publicSeat(final, 'seat-1').revealedFaction, 'Blue');
    assert.equal(final.pendingEjectStage, null); d.replay(final);
  });
  test(`${n}: native fixed window cannot move, accept office/ordinary attacks or restart on late/stale tasks`, () => {
    const d = driver(n), opened = window(d, request(d, d.initial, 1));
    for (const command of [{ type: 'MOVE', destination: 'Room B' }, { type: 'REQUEST_BLACKOUT' },
      { type: 'DISABLE', targetSeatId: 'seat-2' }, { type: 'CAPTAIN_RELEASE' }, { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }]) denied(d.apply(opened, 'seat-3', command), opened);
    for (const change of [{ phaseId: 'old-phase' }, { deadlineToken: 'old-token' }]) {
      const stale = advanceFullGame(opened, { ...d.context(opened.phase.endsAt), phaseId: opened.phase.id, deadlineToken: opened.deadlineToken, ...change });
      assert.equal(stale.advanced, false); assert.strictEqual(stale.state, opened);
    }
    assert.throws(() => openBlackout(copy(opened)), /Cannot open Blackout/);
    const selected = accepted(select(d, opened, 'seat-3', 'A2')), final = d.tick(selected, 45000);
    assert.equal(final.phase.startedAt, selected.phase.endsAt + 45000); assert.equal(final.blackout, null);
    assert.equal(seat(final, 'seat-2').health, 'Injured'); d.replay(final);
  });
  test(`${n}: native abort clears targeting and does not create timeout attacks or historical replay`, () => {
    const d = driver(n), opened = window(d, request(d, d.initial, 1));
    const aborted = abortFullGame(opened, d.context(opened.phase.startedAt + 7000));
    assert.equal(aborted.phase.kind, 'ABORTED'); assert.equal(aborted.blackout, null); assert.equal(aborted.result, null);
    assert.equal(seat(aborted, 'seat-3').disablerSpent, false);
    assert.ok(Object.values(views(aborted).players).every(player => player.self.blackoutTargeting === null));
    assert.deepEqual(views(copy(aborted)), views(aborted));
  });
  test(`${n}: native repeated requests and selections leave public window independent of private actor count`, () => {
    const variants = [[], ['seat-3'], ...(n >= 8 ? [['seat-3', 'seat-8']] : [])].map(actors => {
      const d = driver(n); let state = d.initial;
      for (const actor of actors) state = request(d, state, 1, actor);
      return window(d, state);
    });
    for (const state of variants) {
      assert.deepEqual(views(state).public, views(variants[0]).public);
      assert.deepEqual(views(state).players['seat-4'], views(variants[0]).players['seat-4']);
    }
  });
  test(`${n}: SYNTHETIC malformed frozen clock/map/admission fails restored-state boundaries`, () => {
    const d = driver(n), opened = window(d, request(d, d.initial, 1));
    const damage = [s => delete s.blackout, s => { s.blackout = null; }, s => { s.blackout.extra = true; },
      s => { s.blackout.snapshotId = 'wrong-snapshot'; }, s => { s.blackout.darkStartsAt++; }, s => { s.blackout.endsAt++; },
      s => { s.blackout.occupants.pop(); }, s => { s.blackout.occupants.push(copy(s.blackout.occupants[0])); },
      s => { s.blackout.occupants[1].slotId = s.blackout.occupants[0].slotId; },
      s => { s.blackout.occupants[0].health = 'Injured'; }, s => { s.blackout.occupants[0].location = 'Room B'; },
      s => { s.blackout.attempts.push(copy(s.blackout.attempts[0])); }, s => { s.blackout.attempts[0].actorSeatId = 'seat-6'; },
      s => { s.blackout.attempts[0].room = 'Room B'; }, s => { s.blackout.attempts[0].selectedSlotId = 'A2'; },
      s => { s.blackout.attempts[0].selectedCommandId = 'orphan-choice'; }, s => { seat(s, 'seat-3').disablerSpent = true; },
      s => { s.queued.push(copy(s.queued.find(q => q.command.type === 'REQUEST_BLACKOUT'))); },
      s => { s.queued.find(q => q.command.type === 'REQUEST_BLACKOUT').command.targetSeatId = 'seat-2'; },
      s => { s.phase.kind = 'ORDINARY_TURN'; }, s => { s.round = 6; }];
    for (const mutate of damage) {
      const invalid = copy(opened); mutate(invalid);
      assert.throws(() => assertBlackoutState(invalid)); assert.throws(() => projectFullGame(invalid));
      assert.throws(() => advanceFullGame(invalid, { ...d.context(invalid.phase.endsAt), phaseId: invalid.phase.id, deadlineToken: invalid.deadlineToken }));
    }
    const publicView = views(opened).public;
    assert.equal(FullPublicViewSchema.safeParse({ ...publicView, blackout: { ...publicView.blackout, attempts: opened.blackout.attempts } }).success, false);
    const player = views(opened).players['seat-3'];
    assert.equal(FullPlayerViewSchema.safeParse({ ...player, self: { ...player.self, blackoutTargeting: { ...player.self.blackoutTargeting, occupants: opened.blackout.occupants } } }).success, false);
  });
  test(`${n}: SYNTHETIC restored direct DISABLE cannot bypass the new untargeted Blackout stage`, () => {
    const d = driver(n), corrupt = copy(turn(d, d.initial, 1, 'seat-3'));
    seat(corrupt, 'seat-3').mainActionUsedRound = 1; seat(corrupt, 'seat-3').disablerSpent = true;
    corrupt.queued.push({ commandId: 'synthetic-direct-disable', actorSeatId: 'seat-3', command: { type: 'DISABLE', targetSeatId: 'seat-2' } });
    assert.throws(() => assertBlackoutState(corrupt));
    assert.throws(() => projectFullGame(corrupt));
    assert.throws(() => advanceFullGame(corrupt, { ...d.context(corrupt.phase.endsAt), phaseId: corrupt.phase.id, deadlineToken: corrupt.deadlineToken }));
  });
  for (const pins of OLD) test(`${n}: ${pins.engineVersion} retains direct DISABLE and rejects Blackout fields/commands`, () => {
    const d = driver(n, pins), current = turn(d, d.initial, 1, 'seat-3'), projected = views(current);
    assert.equal(Object.hasOwn(projected.public, 'blackout'), false); assert.equal(Object.hasOwn(current, 'blackout'), false);
    denied(d.apply(current, 'seat-3', { type: 'REQUEST_BLACKOUT' }), current);
    denied(d.apply(current, 'seat-3', { type: 'SELECT_BLACKOUT_SLOT', snapshotId: current.phase.id, room: 'Room A', slotId: 'A2' }), current);
    const after = accepted(d.apply(current, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-2' }));
    assert.equal(seat(after, 'seat-3').disablerSpent, true); assert.equal(after.queued.some(q => q.command.type === 'DISABLE'), true);
    const corrupt = copy(current); corrupt.blackout = null; assert.throws(() => projectFullGame(corrupt));
    assert.equal(FullPublicViewSchema.safeParse({ ...projected.public, blackout: null }).success, false);
    const player = projected.players['seat-3'];
    assert.equal(FullPlayerViewSchema.safeParse({ ...player, self: { ...player.self, blackoutTargeting: null } }).success, false);
    d.replay(after);
  });
  test(`${n}: native Protection blocks the first applicable strike without exposing its cause`, () => {
    const { d, state } = sameRoomRequests(n, { protection: true });
    let current = state;
    for (const actor of disablers(n)) current = accepted(select(d, current, actor, 'A2'));
    const final = d.tick(current), blocked = final.outcomes.filter(value => value.fact.type === 'ATTACK_BLOCKED');
    assert.equal(blocked.length, 1); assert.equal(blocked[0].fact.seatId, 'seat-2'); assert.equal(blocked[0].fact.location, 'Room A');
    assert.deepEqual(Object.keys(blocked[0].fact).sort(), ['location', 'phaseId', 'round', 'seatId', 'slotId', 'type']);
    assert.deepEqual(new Set(blocked[0].recipientSeatIds), new Set(state.seats.filter(s => s.location === 'Room A').map(s => s.seatId)));
    assert.equal(seat(final, 'seat-2').protection.consumed, true);
    assert.equal(seat(final, 'seat-2').health, n === 7 ? 'Healthy' : 'Injured'); d.replay(final);
  });
  test(`${n}: SYNTHETIC frozen block audience includes retained bodies and excludes off-board/later entrants`, () => {
    const { d, state } = sameRoomRequests(n, { protection: true });
    seat(state, 'seat-4').health = 'Eliminated';
    state.blackout.occupants.find(value => value.seatId === 'seat-4').health = 'Eliminated';
    Object.assign(seat(state, 'seat-1'), { health: 'Eliminated', location: null, slotId: null });
    state.captainPowersUsed.ejectUsed = true;
    state.blackout.occupants = state.blackout.occupants.filter(value => value.seatId !== 'seat-1');
    let current = state;
    for (const actor of disablers(n)) current = accepted(select(d, current, actor, 'A2'));
    let final = d.tick(current);
    const block = final.outcomes.find(value => value.fact.type === 'ATTACK_BLOCKED');
    assert.ok(block.recipientSeatIds.includes('seat-4'), 'An eliminated body retains its actual room audience');
    assert.ok(!block.recipientSeatIds.includes('seat-1'), 'Off-board retained identity grants no room audience');
    assert.ok(!block.recipientSeatIds.includes('seat-6'));
    const frozen = [...block.recipientSeatIds];
    final = accepted(d.apply(final, 'seat-6', { type: 'MOVE', destination: 'Room A' }));
    assert.equal(seat(final, 'seat-6').location, 'Room A');
    assert.deepEqual(final.outcomes.find(value => value.fact.type === 'ATTACK_BLOCKED').recipientSeatIds, frozen);
    assert.ok(!frozen.includes('seat-6'), 'A later entrant does not acquire the frozen event');
  });
  if (n >= 8) {
    test(`${n}: native same-slot dual attempts survive as two attacks, injury then elimination before Rescue`, () => {
      const { d, state } = sameRoomRequests(n); let current = state;
      for (const actor of disablers(n)) current = accepted(select(d, current, actor, 'A2'));
      const collected = copy(current), map = finishBlackout(collected);
      assert.deepEqual(map, { 'seat-3': 'seat-2', 'seat-8': 'seat-2' }); assert.equal(collected.blackout, null);
      assert.deepEqual(collected.queued, current.queued);
      const final = d.tick(current); assert.equal(seat(final, 'seat-2').health, 'Eliminated');
      for (const actor of disablers(n)) assert.equal(seat(final, actor).disablerSpent, true);
      assert.equal(final.outcomes.filter(value => value.fact.type === 'MEDICAL_OUTCOME' && value.fact.seatId === 'seat-2' && value.fact.kind === 'DEATH').length, 1);
      d.replay(final);
    });
    test(`${n}: native one actor self-misses while the other independently hits that frozen occupant`, () => {
      const { d, state } = sameRoomRequests(n); let current = accepted(select(d, state, 'seat-3', 'A3'));
      current = accepted(select(d, current, 'seat-8', 'A3'));
      const final = d.tick(current); assert.equal(seat(final, 'seat-3').health, 'Injured');
      assert.equal(seat(final, 'seat-8').health, 'Healthy'); d.replay(final);
    });
    test(`${n}: native earlier Main-plus-Shot elimination leaves the later frozen strike spent without redirect`, () => {
      const d = driver(n); let state = accepted(d.apply(d.initial, 'seat-1', { type: 'MOVE', destination: 'Room B' }));
      state = accepted(d.apply(state, 'seat-8', { type: 'MOVE', destination: 'Room A' }));
      state = elect(d, endRound(d, state), 'seat-7');
      state = turn(d, state, 3, 'seat-4');
      state = accepted(d.apply(state, 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-3', 'seat-8'] }));
      state = endRound(d, state);
      state = request(d, state, 4, 'seat-3');
      state = accepted(d.apply(state, 'seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' }));
      state = request(d, state, 4, 'seat-8'); state = window(d, state);
      for (const actor of disablers(n)) state = accepted(select(d, state, actor, 'A2'));
      const final = d.tick(state);
      assert.equal(seat(final, 'seat-2').health, 'Eliminated');
      assert.equal(seat(final, 'seat-3').ordinaryWeapons, 0);
      assert.equal(seat(final, 'seat-3').disablerSpent, true); assert.equal(seat(final, 'seat-8').disablerSpent, true);
      assert.equal(final.outcomes.filter(value => value.fact.type === 'MEDICAL_OUTCOME' && value.fact.seatId === 'seat-2' && value.fact.kind === 'DEATH').length, 1);
      assert.ok(final.seats.filter(value => value.seatId !== 'seat-2').every(value => value.health === 'Healthy'));
      d.replay(final);
    });
    test(`${n}: SYNTHETIC equal-target defense outcomes do not disclose hidden resolution-actor order`, () => {
      const baseline = sameRoomRequests(n, { protection: true }).state, variants = [];
      for (const reverse of [false, true]) {
        const d = driver(n), state = copy(baseline);
        if (reverse) {
          const a = state.turnOrder.indexOf('seat-3'), b = state.turnOrder.indexOf('seat-8');
          [state.turnOrder[a], state.turnOrder[b]] = [state.turnOrder[b], state.turnOrder[a]];
          state.setup.roundOrders[state.round - 1] = [...state.turnOrder];
          state.blackout.attempts.sort((left, right) => state.turnOrder.indexOf(left.actorSeatId) - state.turnOrder.indexOf(right.actorSeatId));
        }
        let current = state;
        for (const actor of disablers(n)) current = accepted(select(d, current, actor, 'A2'));
        const final = d.tick(current); variants.push({ views: views(final), facts: final.outcomes.map(value => value.fact) });
      }
      assert.deepEqual(variants[0], variants[1]);
    });
    test(`${n}: SYNTHETIC admission order follows stored turn order, not queued network arrival`, () => {
      const { d, state } = sameRoomRequests(n), predecessor = copy(state);
      predecessor.blackout = null;
      predecessor.queued.reverse();
      openBlackout(predecessor);
      assert.deepEqual(predecessor.blackout.attempts.map(value => value.actorSeatId), ['seat-3', 'seat-8']);
      assert.deepEqual(predecessor.blackout.occupants, state.blackout.occupants);
      const invalid = copy(state); invalid.blackout.attempts.reverse(); assert.throws(() => assertBlackoutState(invalid));
    });
  }
}
function electIfNeeded(d, state) { return state.phase.kind === 'CAPTAIN_ELECTION' ? elect(d, state, 'seat-7') : state; }
