import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPublicViewSchema, FullPlayerViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS as PINS, BOARD_MEDICAL_FULL_GAME_VERSION_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  VOTE_RESULT_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
  CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';
import { assertCaptainState, captainCommandAllowed, closeCaptainCheckpoint } from '../dist/full-game/captain.js';

// Captain 1.8 pure engine/contract acceptance. Every native case starts with legal
// SETUP and uses actual commands/deadlines. SYNTHETIC stage predecessors, retained
// Jail bodies and corruption samples do not claim native service reachability.
// This file does not prove Firestore receipt lookup, Tasks delivery, art or balance.
const START = 1_800_000_000_000, ASSETS = 'captain-engine-fixture-v1';
const ROLES = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const OLD = [LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS, BOARD_MEDICAL_FULL_GAME_VERSION_PINS];
const PRIVATE = ['captainPowersUsed', 'pendingCaptainReveal', 'pendingEjectStage'];
const copy = value => JSON.parse(JSON.stringify(value));
const seat = (state, id) => state.seats.find(value => value.seatId === id);
const publicSeat = (state, id) => projectFullGame(state).public.seats.find(value => value.seatId === id);
function views(state) {
  const result = projectFullGame(state);
  FullPublicViewSchema.parse(result.public);
  for (const player of Object.values(result.players)) {
    FullPlayerViewSchema.parse(player); assert.deepEqual(player.seats, result.public.seats);
    for (const key of PRIVATE) assert.equal(Object.hasOwn(player, key), false);
    if (state.versions.engineVersion === PINS.engineVersion) {
      assert.deepEqual(player.self.captainCommandUses, seat(state, player.self.seatId).captain ? state.captainPowersUsed : null);
    } else assert.equal(Object.hasOwn(player.self, 'captainCommandUses'), false);
  }
  for (const key of [...PRIVATE, 'outcomes']) assert.equal(Object.hasOwn(result.public, key), false);
  return result;
}
function driver(n, pins = PINS) {
  let serial = 0;
  const roleOrder = [...ROLES, ...(n >= 8 ? ['Red Disabler'] : []), ...(n === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const setup = { playerCount: n, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < 5 ? 'Room A' : 'Room B'])),
    roundOrders: Array.from({ length: 5 }, () => [...ids]) };
  const args = { matchId: 'captain-fixture', setup, now: START, phaseId: 'phase-initial', deadlineToken: 'token-initial',
    assetManifestVersion: ASSETS, versions: { ...pins, assetManifestVersion: ASSETS } };
  const initial = createFullGame(args), history = []; views(initial);
  const context = now => ({ now, nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `token-${serial}` });
  const apply = (state, actor, command, now = state.phase.startedAt + 1) => {
    const request = { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId: `command-${++serial}`, command };
    const ctx = context(now), before = copy(state), result = executeFullGame(state, actor, request, ctx);
    FullReceiptSchema.parse(result.receipt); assert.deepEqual(state, before);
    assert.deepEqual(executeFullGame(copy(state), actor, copy(request), copy(ctx)), result, 'Recorded command replay from its predecessor is deterministic');
    views(result.state); history.push({ kind: 'COMMAND', actor, request, context: ctx, receipt: result.receipt });
    return result;
  };
  const tick = state => {
    assert.notEqual(state.phase.endsAt, null);
    const ctx = { ...context(state.phase.endsAt), phaseId: state.phase.id, deadlineToken: state.deadlineToken };
    const before = copy(state), result = advanceFullGame(state, ctx);
    assert.equal(result.advanced, true); assert.deepEqual(state, before);
    assert.deepEqual(advanceFullGame(copy(state), copy(ctx)), result);
    assert.equal(advanceFullGame(result.state, ctx).advanced, false, 'An obsolete deadline cannot apply effects twice');
    views(result.state); history.push({ kind: 'DEADLINE', context: ctx }); return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let bound = 0; !predicate(current); bound++) { assert.ok(bound < 240, 'Canonical checkpoint must be reachable'); current = tick(current); }
    return current;
  };
  const replay = expected => {
    let current = createFullGame(copy(args));
    for (const entry of history) {
      if (entry.kind === 'COMMAND') {
        const evaluated = executeFullGame(current, entry.actor, copy(entry.request), copy(entry.context));
        assert.deepEqual(evaluated.receipt, entry.receipt); current = evaluated.state;
      } else current = advanceFullGame(current, copy(entry.context)).state;
    }
    assert.deepEqual(current, expected); assert.deepEqual(views(current), views(expected));
  };
  return { initial, apply, tick, until, replay, context };
}
const accepted = result => { assert.equal(result.receipt.status, 'accepted', JSON.stringify(result.receipt)); return result.state; };
function denied(result, previous, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected'); assert.equal(result.receipt.code, code); assert.strictEqual(result.state, previous);
}
const ownTurn = (d, state, round, actor) => d.until(state, s => s.round === round && s.phase.kind === 'ORDINARY_TURN' && s.activeSeatId === actor);
function vote(d, state, target) {
  let current = state;
  if (target !== null) {
    assert.ok(state.eligibleTargets.includes(target));
    for (const voter of state.eligibleVoters.slice(0, Math.ceil(state.eligibleVoters.length / 2))) current = accepted(d.apply(current, voter, { type: 'VOTE', targetSeatId: target }));
  }
  return d.tick(current);
}
function closeRound(d, state, target = null) {
  const round = state.round, jail = d.until(state, s => s.round === round && s.phase.kind === 'JAIL_VOTE');
  let current = vote(d, jail, target);
  if (current.phase.kind === 'VOTE_RESULT') current = d.tick(current);
  return current;
}
function elect(d, state, target = 'seat-4') {
  let current = vote(d, d.until(state, s => s.phase.kind === 'CAPTAIN_ELECTION'), target);
  assert.equal(seat(current, target).captain, true);
  if (current.phase.kind === 'VOTE_RESULT') current = d.tick(current);
  return current;
}
function nativePrisoner(n, captain = 'seat-4') {
  const d = driver(n); let state = elect(d, closeRound(d, d.initial, 'seat-1'), captain);
  state = ownTurn(d, state, 2, captain); return { d, state };
}
function stageFixture(n, mode = 'both', hits = 0) {
  // SYNTHETIC R5 predecessor: stage accounting and defensive queue preservation,
  // not a claim that detained prisoners can register ordinary damaging actions.
  const d = driver(n), state = copy(d.initial);
  state.round = 5; state.phase = { ...state.phase, id: 'synthetic-r5', kind: 'ORDINARY_TURN' };
  state.deadlineToken = 'synthetic-token'; state.turnOrder = [...state.setup.roundOrders[4]];
  state.turnIndex = state.turnOrder.indexOf('seat-7'); state.activeSeatId = 'seat-7';
  for (const player of state.seats) { player.health = 'Eliminated'; player.captain = false; player.jailed = false; }
  Object.assign(seat(state, 'seat-7'), { health: 'Healthy', captain: true, location: 'Command Room', slotId: 'C1' });
  const hospital = (id, slot) => Object.assign(seat(state, id), { health: 'Injured', location: 'Hospital', slotId: slot,
    medicalEpisodeCount: 1, medicalEpisode: { number: 1, admittedRound: 4, deathDueAfterRound: 5 } });
  const jail = (id, slot) => Object.assign(seat(state, id), { health: 'Healthy', jailed: true, location: 'Jail', slotId: slot });
  if (mode === 'normal') { hospital('seat-1', 'H1'); hospital('seat-5', 'H2'); }
  else if (mode === 'blue-first') { jail('seat-1', 'J1'); hospital('seat-5', 'H1'); }
  else if (mode === 'red-first') { hospital('seat-1', 'H1'); jail('seat-5', 'J1'); }
  else { jail('seat-1', 'J1'); jail('seat-5', 'J2'); }
  state.queued = ['seat-1', 'seat-5'].slice(0, hits).map((actorSeatId, index) => ({ commandId: `synthetic-locked-hit-${index + 1}`,
    actorSeatId, command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-7' } }));
  views(state); return { d, state };
}

for (const n of [7, 8, 9]) {
  test(`${n}: native RELEASE is immediate, independent, keeps identities/resources and complete journal replay`, () => {
    const { d, state } = nativePrisoner(n), previous = copy(state);
    assert.deepEqual(views(state).players['seat-4'].legalTargets.CAPTAIN_RELEASE, ['seat-4']);
    const after = accepted(d.apply(state, 'seat-4', { type: 'CAPTAIN_RELEASE' }));
    assert.equal(after.phase.id, state.phase.id); assert.equal(seat(after, 'seat-1').jailed, false);
    assert.equal(seat(after, 'seat-1').location, 'Room A'); assert.equal(seat(after, 'seat-1').slotId, 'A1');
    assert.deepEqual(after.captainPowersUsed, { releaseUsed: true, ejectUsed: false });
    assert.equal(after.pendingCaptainReveal, null); assert.equal(after.pendingEjectStage, null);
    for (const id of ['seat-1', 'seat-4']) for (const field of ['role', 'faction', 'ordinaryWeapons', 'mainActionUsedRound', 'movedInRound', 'hackUsed', 'medicalEpisodeCount']) assert.deepEqual(seat(after, id)[field], seat(previous, id)[field]);
    denied(d.apply(after, 'seat-4', { type: 'CAPTAIN_EJECT' }), after);
    d.replay(after);
  });
  for (const command of ['CAPTAIN_RELEASE', 'CAPTAIN_EJECT']) test(`${n}: native ${command} excludes a detained Hospital patient`, () => {
    const d = driver(n), beginning = elect(d, closeRound(d, d.initial, 'seat-1'));
    let state = accepted(d.apply(ownTurn(d, beginning, 2, 'seat-3'), 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-2' }));
    state = ownTurn(d, closeRound(d, state, 'seat-2'), 3, 'seat-4');
    const patient = copy(seat(state, 'seat-2'));
    assert.equal(patient.location, 'Hospital'); assert.equal(patient.jailed, true);
    const after = accepted(d.apply(state, 'seat-4', { type: command }));
    assert.deepEqual(seat(after, 'seat-2'), patient);
    assert.equal(seat(after, 'seat-1').location, command === 'CAPTAIN_EJECT' ? null : 'Room A');
    if (command === 'CAPTAIN_EJECT') {
      assert.equal(seat(after, 'seat-1').slotId, null); assert.equal(publicSeat(after, 'seat-1').revealedFaction, null);
      assert.deepEqual(after.pendingCaptainReveal, { round: 3, seatIds: ['seat-1'] });
      assert.equal(after.pendingEjectStage.actorSeatId, 'seat-4');
      denied(d.apply(after, 'seat-4', { type: 'CAPTAIN_RELEASE' }), after);
      denied(d.apply(after, 'seat-4', { type: 'CAPTAIN_EJECT' }), after);
    }
    d.replay(after);
  });
  test(`${n}: native RELEASE and EJECT uses survive two Captain replacements`, () => {
    const { d, state: first } = nativePrisoner(n);
    let state = accepted(d.apply(first, 'seat-4', { type: 'CAPTAIN_RELEASE' }));
    state = ownTurn(d, elect(d, closeRound(d, state, 'seat-4'), 'seat-5'), 3, 'seat-5');
    assert.deepEqual(views(state).players['seat-5'].self.captainCommandUses, { releaseUsed: true, ejectUsed: false });
    denied(d.apply(state, 'seat-5', { type: 'CAPTAIN_RELEASE' }), state);
    state = accepted(d.apply(state, 'seat-5', { type: 'CAPTAIN_EJECT' }));
    state = ownTurn(d, elect(d, closeRound(d, state, 'seat-5'), 'seat-7'), 4, 'seat-7');
    assert.deepEqual(views(state).players['seat-7'].self.captainCommandUses, { releaseUsed: true, ejectUsed: true });
    denied(d.apply(state, 'seat-7', { type: 'CAPTAIN_EJECT' }), state);
    assert.equal(afterRoundRevealed(state, 'seat-4'), true); d.replay(state);
  });
  test(`${n}: native office action after role Main Action, accepted move and pending Hack spends neither again`, () => {
    const { d, state: elected } = nativePrisoner(n, 'seat-5');
    let state = accepted(d.apply(elected, 'seat-5', { type: 'MOVE', destination: 'Room A' }));
    state = ownTurn(d, closeRound(d, state), 3, 'seat-5');
    state = accepted(d.apply(state, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-5' }));
    state = accepted(d.apply(state, 'seat-5', { type: 'REQUEST_HACK', targetSeatId: 'seat-3' }));
    state = accepted(d.apply(state, 'seat-5', { type: 'MOVE', destination: 'Command Room' }));
    const previous = copy(state);
    state = accepted(d.apply(state, 'seat-5', { type: 'CAPTAIN_RELEASE' }));
    for (const field of ['mainActionUsedRound', 'movedInRound', 'hackUsed', 'ordinaryWeapons']) assert.equal(seat(state, 'seat-5')[field], seat(previous, 'seat-5')[field]);
    assert.deepEqual(state.queued, previous.queued); assert.deepEqual(state.pendingHack, previous.pendingHack);
    d.replay(state);
  });
  test(`${n}: native Captain own-turn/location/server-time boundaries reject without spending`, () => {
    const { d, state } = nativePrisoner(n);
    denied(d.apply(state, 'seat-1', { type: 'CAPTAIN_EJECT' }), state);
    denied(d.apply(state, 'seat-4', { type: 'CAPTAIN_EJECT' }, state.phase.startedAt - 1), state, 'PHASE_CLOSED');
    denied(d.apply(state, 'seat-4', { type: 'CAPTAIN_EJECT' }, state.phase.endsAt), state, 'PHASE_CLOSED');
    const moved = accepted(d.apply(state, 'seat-4', { type: 'MOVE', destination: 'Room A' }));
    denied(d.apply(moved, 'seat-4', { type: 'CAPTAIN_EJECT' }), moved);
    const otherTurn = d.tick(state);
    assert.notEqual(otherTurn.activeSeatId, 'seat-4');
    denied(d.apply(otherTurn, 'seat-4', { type: 'CAPTAIN_RELEASE' }), otherTurn);
    assert.deepEqual(otherTurn.captainPowersUsed, { releaseUsed: false, ejectUsed: false });
  });
  test(`${n}: native Hack declaration/result/conversation do not admit Captain commands`, () => {
    const { d, state: elected } = nativePrisoner(n, 'seat-5');
    let state = accepted(d.apply(elected, 'seat-5', { type: 'MOVE', destination: 'Room A' }));
    state = ownTurn(d, closeRound(d, state), 3, 'seat-5');
    state = accepted(d.apply(state, 'seat-5', { type: 'REQUEST_HACK', targetSeatId: 'seat-3' }));
    state = accepted(d.apply(state, 'seat-5', { type: 'MOVE', destination: 'Command Room' }));
    state = accepted(d.apply(state, 'seat-5', { type: 'PASS_TURN' }));
    for (const phase of ['HACK_DECLARE', 'HACK_RESULT', 'HACK']) {
      assert.equal(state.phase.kind, phase);
      for (const type of ['CAPTAIN_RELEASE', 'CAPTAIN_EJECT']) denied(d.apply(state, 'seat-5', { type }), state);
      assert.deepEqual(state.captainPowersUsed, { releaseUsed: false, ejectUsed: false });
      if (phase !== 'HACK') state = d.tick(state);
    }
    d.replay(state);
  });
  test(`${n}: SYNTHETIC bodies-only Jail rejects both commands without use or pending evidence`, () => {
    const { d, state } = nativePrisoner(n);
    seat(state, 'seat-1').health = 'Eliminated';
    for (const type of ['CAPTAIN_RELEASE', 'CAPTAIN_EJECT']) denied(d.apply(state, 'seat-4', { type }), state);
    assert.deepEqual(state.captainPowersUsed, { releaseUsed: false, ejectUsed: false });
    assert.equal(state.pendingCaptainReveal, null); assert.equal(state.pendingEjectStage, null);
  });
  test(`${n}: native EJECT retains R5 Code accepted by a detained Hacker`, () => {
    const d = driver(n);
    let state = elect(d, closeRound(d, d.initial, 'seat-6'), 'seat-4');
    state = ownTurn(d, state, 5, 'seat-4');
    state = accepted(d.apply(state, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...state.code] }));
    const after = accepted(d.apply(state, 'seat-4', { type: 'CAPTAIN_EJECT' }));
    assert.equal(seat(after, 'seat-6').location, null); assert.equal(after.codeSubmitted, true); assert.equal(after.correctCode, true);
    assert.deepEqual(after.code, state.code); d.replay(after);
  });
  test(`${n}: SYNTHETIC multi-RELEASE preserves bodies/holes and lower player number wins last A slot`, () => {
    const { d, state } = stageFixture(n);
    state.round = 3; state.seats.reverse();
    const placements = { 'seat-1': ['Jail', 'J1'], 'seat-2': ['Room A', 'A1'], 'seat-3': ['Room A', 'A2'],
      'seat-4': ['Room A', 'A4'], 'seat-5': ['Jail', 'J2'], 'seat-6': ['Room A', 'A5'], 'seat-7': ['Command Room', 'C1'],
      'seat-8': ['Room B', 'B2'], 'seat-9': ['Room B', 'B4'] };
    for (const player of state.seats) Object.assign(player, { location: placements[player.seatId][0], slotId: placements[player.seatId][1], lastRoom: 'Room A' });
    seat(state, 'seat-1').movedInRound = true; seat(state, 'seat-5').movedInRound = false;
    const body = copy(seat(state, 'seat-2'));
    const after = accepted(d.apply(state, 'seat-7', { type: 'CAPTAIN_RELEASE' }));
    assert.deepEqual(seat(after, 'seat-2'), body);
    assert.equal(seat(after, 'seat-1').slotId, 'A3'); assert.equal(seat(after, 'seat-5').slotId, 'B1');
    assert.equal(seat(after, 'seat-5').lastRoom, 'Room B'); assert.equal(seat(after, 'seat-1').movedInRound, true);
    assert.equal(seat(after, 'seat-5').movedInRound, false); assert.deepEqual(after.seats.map(s => s.seatId), state.seats.map(s => s.seatId));
  });
  test(`${n}: SYNTHETIC EJECT clears old Jail bodies, keeps known faction and private resource history`, () => {
    const { d, state } = nativePrisoner(n);
    Object.assign(seat(state, 'seat-3'), { health: 'Eliminated', jailed: true, location: 'Jail', slotId: 'J2', medicalEpisodeCount: 2 });
    seat(state, 'seat-1').protection = { activeFromRound: 1, consumed: false, grantedBy: 'seat-5' };
    const previous = copy(state), after = accepted(d.apply(state, 'seat-4', { type: 'CAPTAIN_EJECT' }));
    assert.equal(after.seats.some(s => s.location === 'Jail'), false);
    assert.deepEqual(after.pendingCaptainReveal.seatIds, ['seat-1']);
    assert.equal(publicSeat(after, 'seat-1').revealedFaction, null); assert.equal(publicSeat(after, 'seat-3').revealedFaction, 'Blue');
    for (const id of ['seat-1', 'seat-3']) {
      assert.equal(seat(after, id).location, null); assert.equal(seat(after, id).slotId, null);
      for (const field of ['role', 'faction', 'medicalEpisodeCount', 'ordinaryWeapons', 'movedInRound', 'mainActionUsedRound', 'protection']) assert.deepEqual(seat(after, id)[field], seat(previous, id)[field]);
    }
    assert.equal(seat(after, 'seat-1').protection.consumed, false, 'EJECT bypasses protection without charging its block');
  });
  for (const hits of [0, 1, 2]) test(`${n}: SYNTHETIC CST atomic EJECT with ${hits} retained hits uses final Alien health`, () => {
    const { d, state } = stageFixture(n, 'both', hits), queue = copy(state.queued);
    let current = accepted(d.apply(state, 'seat-7', { type: 'CAPTAIN_EJECT' }));
    assert.deepEqual(current.queued, queue); assert.equal(current.result, null); assert.equal(current.phase.id, state.phase.id);
    assert.deepEqual(current.pendingEjectStage.before, { blueAlive: true, redAlive: true });
    assert.deepEqual(current.pendingEjectStage.after, { blueAlive: false, redAlive: false });
    const final = closeRound(d, current);
    assert.equal(final.pendingCaptainReveal, null); assert.equal(final.pendingEjectStage, null); assert.equal(final.queued.length, 0);
    if (hits < 2) { assert.equal(final.phase.kind, 'FINISHED'); assert.equal(final.result.winner, 'Alien'); assert.equal(seat(final, 'seat-7').health, hits === 0 ? 'Healthy' : 'Injured'); }
    else { assert.equal(final.phase.kind, 'SHOWDOWN'); assert.equal(final.result, null); assert.equal(d.tick(final).result.winner, 'Draw'); }
  });
  for (const mode of ['blue-first', 'red-first']) test(`${n}: SYNTHETIC CST ${mode} plus later due death cannot merge faction losses`, () => {
    const { d, state } = stageFixture(n, mode);
    const ejected = accepted(d.apply(state, 'seat-7', { type: 'CAPTAIN_EJECT' }));
    const final = closeRound(d, ejected);
    assert.equal(final.phase.kind, 'SHOWDOWN'); assert.equal(final.result, null);
    assert.equal(final.pendingEjectStage, null); assert.equal(d.tick(final).result.winner, 'Draw');
  });
  test(`${n}: SYNTHETIC CST existing normal stage remains an Alien-positive control without EJECT`, () => {
    const { d, state } = stageFixture(n, 'normal'), final = closeRound(d, state);
    assert.equal(final.phase.kind, 'FINISHED'); assert.equal(final.result.winner, 'Alien');
    assert.deepEqual(final.captainPowersUsed, { releaseUsed: false, ejectUsed: false });
  });
  test(`${n}: SYNTHETIC CST last Injured detained Hospital survivor prevents absent-faction inference`, () => {
    const { d, state } = stageFixture(n);
    Object.assign(seat(state, 'seat-2'), { health: 'Injured', jailed: true, location: 'Hospital', slotId: 'H1', medicalEpisodeCount: 1,
      medicalEpisode: { number: 1, admittedRound: 5, deathDueAfterRound: null } });
    const current = accepted(d.apply(state, 'seat-7', { type: 'CAPTAIN_EJECT' }));
    assert.deepEqual(current.pendingEjectStage.after, { blueAlive: true, redAlive: false });
    assert.equal(seat(current, 'seat-2').health, 'Injured'); assert.equal(seat(current, 'seat-2').jailed, true);
    const final = closeRound(d, current);
    assert.equal(final.phase.kind, 'SHOWDOWN'); assert.equal(final.result, null);
    assert.equal(seat(final, 'seat-2').location, 'Hospital'); assert.equal(seat(final, 'seat-2').health, 'Injured');
    assert.equal(publicSeat(final, 'seat-2').medical.rescueOpportunity, 'NO_ADDITIONAL_ROUND');
    assert.deepEqual(views(final).players['seat-2'].legalTargets.SHOWDOWN_SHOT, ['seat-7']);
  });
  test(`${n}: SYNTHETIC pending EJECT survives early/stale tasks and abort without faction/victory replay`, () => {
    const { d, state } = stageFixture(n), current = accepted(d.apply(state, 'seat-7', { type: 'CAPTAIN_EJECT' }));
    for (const overrides of [{ now: current.phase.endsAt - 1 }, { phaseId: 'obsolete-phase' }, { deadlineToken: 'obsolete-token' }]) {
      const result = advanceFullGame(current, { ...d.context(current.phase.endsAt), phaseId: current.phase.id, deadlineToken: current.deadlineToken, ...overrides });
      assert.equal(result.advanced, false); assert.strictEqual(result.state, current);
    }
    const aborted = abortFullGame(current, d.context(current.phase.startedAt + 2)), before = copy(aborted);
    assert.equal(aborted.phase.kind, 'ABORTED'); assert.equal(aborted.result, null); assert.equal(views(aborted).public.endReveal, null);
    assert.equal(publicSeat(aborted, 'seat-1').revealedFaction, null);
    assert.equal(closeCaptainCheckpoint(aborted), false); assert.deepEqual(aborted, before);
    assert.deepEqual(views(copy(aborted)), views(aborted));
  });
  test(`${n}: SYNTHETIC malformed restored private stage/placement fails before gameplay and projection`, () => {
    const { d, state } = stageFixture(n), pending = accepted(d.apply(state, 'seat-7', { type: 'CAPTAIN_EJECT' }));
    const corruptions = [s => delete s.captainPowersUsed, s => { s.captainPowersUsed.extra = true; }, s => { s.captainPowersUsed.ejectUsed = false; },
      s => { s.pendingCaptainReveal.round--; }, s => { s.pendingCaptainReveal.seatIds.push('seat-1'); }, s => { s.pendingCaptainReveal.seatIds = []; },
      s => { s.pendingCaptainReveal.seatIds = ['seat-7']; }, s => { s.pendingEjectStage = null; }, s => { s.pendingCaptainReveal = null; },
      s => { s.pendingEjectStage.actorSeatId = 'seat-1'; }, s => { s.pendingEjectStage.commandId = ''; }, s => { s.pendingEjectStage.round--; },
      s => { s.pendingEjectStage.before.blueAlive = 'true'; }, s => { s.pendingEjectStage.before.extra = true; },
      s => { s.pendingEjectStage.before.blueAlive = false; s.pendingEjectStage.after.blueAlive = true; },
      s => { s.phase.kind = 'SHOWDOWN'; }, s => { s.phase.kind = 'FINISHED'; },
      s => { seat(s, 'seat-1').slotId = 'J1'; }, s => { seat(s, 'seat-1').health = 'Healthy'; }, s => { seat(s, 'seat-1').jailed = true; },
      s => { seat(s, 'seat-1').captain = true; }, s => { seat(s, 'seat-1').medicalEpisode = { number: 1, admittedRound: 5, deathDueAfterRound: null }; }];
    for (const damage of corruptions) {
      const invalid = copy(pending); damage(invalid);
      assert.throws(() => assertCaptainState(invalid)); assert.throws(() => projectFullGame(invalid));
      assert.throws(() => advanceFullGame(invalid, { ...d.context(invalid.phase.endsAt), phaseId: invalid.phase.id, deadlineToken: invalid.deadlineToken }));
    }
    const projected = views(pending);
    assert.equal(FullPublicViewSchema.safeParse({ ...projected.public, pendingEjectStage: pending.pendingEjectStage }).success, false);
    const participant = projected.players['seat-7'];
    assert.equal(FullPlayerViewSchema.safeParse({ ...participant, pendingCaptainReveal: pending.pendingCaptainReveal }).success, false);
    assert.equal(FullPublicViewSchema.safeParse({ ...projected.public, seats: projected.public.seats.map(s => s.seatId === 'seat-1' ? { ...s, slotId: 'J1' } : s) }).success, false);
  });
  test(`${n}: native restored post-checkpoint off-board seats cannot reset EJECT to unused`, () => {
    const { d, state } = nativePrisoner(n);
    const ejected = accepted(d.apply(state, 'seat-4', { type: 'CAPTAIN_EJECT' }));
    const complete = closeRound(d, ejected);
    assert.equal(complete.pendingCaptainReveal, null); assert.equal(complete.pendingEjectStage, null);
    assert.equal(seat(complete, 'seat-1').location, null);
    const corrupt = copy(complete); corrupt.captainPowersUsed.ejectUsed = false;
    assert.throws(() => assertCaptainState(corrupt));
    assert.throws(() => projectFullGame(corrupt));
    assert.throws(() => advanceFullGame(corrupt, { ...d.context(corrupt.phase.endsAt), phaseId: corrupt.phase.id, deadlineToken: corrupt.deadlineToken }));
    d.replay(complete);
  });
  for (const pins of OLD) test(`${n}: ${pins.engineVersion} keeps Captain intents/fields/null placement unavailable`, () => {
    const d = driver(n, pins), state = copy(d.initial);
    state.activeSeatId = 'seat-7'; state.turnIndex = state.turnOrder.indexOf('seat-7');
    Object.assign(seat(state, 'seat-7'), { captain: true, location: 'Command Room' });
    Object.assign(seat(state, 'seat-1'), { jailed: true, location: 'Jail' });
    if (pins.engineVersion === 'full-game-1.7.0') { seat(state, 'seat-7').slotId = 'C1'; seat(state, 'seat-1').slotId = 'J1'; }
    const projected = views(state);
    assert.equal(captainCommandAllowed(state, seat(state, 'seat-7'), 'CAPTAIN_EJECT'), false);
    for (const command of ['CAPTAIN_RELEASE', 'CAPTAIN_EJECT']) denied(d.apply(state, 'seat-7', { type: command }), state);
    for (const field of PRIVATE) { const injected = copy(state); injected[field] = null; assert.throws(() => projectFullGame(injected)); }
    const bad = copy(projected.public); bad.seats[0].location = null;
    assert.equal(FullPublicViewSchema.safeParse(bad).success, false);
    const player = projected.players['seat-7'];
    assert.equal(FullPlayerViewSchema.safeParse({ ...player, self: { ...player.self, captainCommandUses: null } }).success, false);
  });
}
function afterRoundRevealed(state, id) { return publicSeat(state, id).revealedFaction === seat(state, id).faction; }
