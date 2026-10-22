import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPublicViewSchema, FullPlayerViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  PUBLIC_HACK_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  VOTE_RESULT_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
  CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';

// Issue #139 / G-02 and G-09. Pure engine/contract acceptance only: no claim of
// Firestore receipt recovery, automatic Tasks delivery, art, audio or human balance.
// Histories start from legal explicit setups and use canonical commands/deadlines.
// The altered-health skipped-turn cases are separately labeled synthetic edges.
const START = 1_800_000_000_000;
const ASSET = 'public-hack-engine-test-v1';
const ROLES = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const OLD_PINS = [LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS,
  CAPACITY_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
  VOTE_RESULT_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS];
const HACK_STAGES = ['HACK_DECLARE', 'HACK_RESULT', 'HACK'];
const copy = value => JSON.parse(JSON.stringify(value));
const seat = (state, id) => state.seats.find(value => value.seatId === id);
const locations = state => state.seats.map(value => [value.seatId, value.location, value.lastRoom, value.movedInRound]);

function projected(state) {
  const value = projectFullGame(state);
  FullPublicViewSchema.parse(value.public);
  for (const player of Object.values(value.players)) FullPlayerViewSchema.parse(player);
  return value;
}
function accepted(result) {
  assert.equal(result.receipt.status, 'accepted', JSON.stringify(result.receipt));
  assert.equal(result.receipt.code, 'REGISTERED');
  projected(result.state);
  return result.state;
}
function rejected(result, before, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected');
  assert.equal(result.receipt.code, code);
  assert.strictEqual(result.state, before, 'A rejected engine command changes no state');
}
function driver(count, { pins = PUBLIC_HACK_FULL_GAME_VERSION_PINS, order, start = START } = {}) {
  let serial = 0;
  const roleOrder = [...ROLES, ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const initial = createFullGame({ matchId: 'public-hack-test', now: start,
    phaseId: 'initial-phase', deadlineToken: 'initial-token', assetManifestVersion: ASSET,
    versions: { ...pins, assetManifestVersion: ASSET },
    setup: { playerCount: count, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
      initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < 5 ? 'Room A' : 'Room B'])),
      roundOrders: Array.from({ length: 5 }, () => [...(order ?? ids)]) } });
  const context = now => ({ now, nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `token-${serial}` });
  const apply = (state, actor, command, now = state.phase.startedAt + 1) => {
    const request = { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id,
      commandId: `command-${++serial}`, command };
    const ctx = context(now), before = copy(state);
    const result = executeFullGame(state, actor, request, ctx);
    FullReceiptSchema.parse(result.receipt);
    assert.deepEqual(state, before, 'Input state is immutable');
    assert.deepEqual(executeFullGame(copy(state), actor, request, ctx), result,
      'Exact command/context replay survives JSON recovery');
    return result;
  };
  const tick = (state, delay = 0) => {
    assert.notEqual(state.phase.endsAt, null, 'Bounded history must not pass a terminal state');
    const ctx = { ...context(state.phase.endsAt + delay), phaseId: state.phase.id, deadlineToken: state.deadlineToken };
    const before = copy(state), result = advanceFullGame(state, ctx);
    assert.equal(result.advanced, true);
    assert.deepEqual(state, before, 'Deadline input is immutable');
    assert.deepEqual(advanceFullGame(copy(state), ctx), result, 'Exact deadline/context replay survives JSON recovery');
    projected(result.state);
    return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let step = 0; !predicate(current); step++) {
      assert.ok(step < 250, 'Canonical history failed to reach its checkpoint');
      current = tick(current);
    }
    return current;
  };
  const turn = (actor, round = 1) => until(initial,
    state => state.round === round && state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === actor);
  return { initial, ids, context, apply, tick, until, turn };
}
function open(d, state = d.initial, { target = 'seat-2', close = 'deadline' } = {}) {
  const pending = accepted(d.apply(state, state.activeSeatId, { type: 'REQUEST_HACK', targetSeatId: target }));
  return close === 'pass'
    ? accepted(d.apply(pending, state.activeSeatId, { type: 'PASS_TURN' })) : d.tick(pending);
}
function atStage(d, opened, stage) {
  if (stage === 'HACK_DECLARE') return opened;
  const result = accepted(d.apply(opened, opened.activeHack.targetSeatId,
    { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }));
  return stage === 'HACK_RESULT' ? result : d.tick(result);
}
function unchangedDeadline(d, state, now = state.phase.endsAt - 1, overrides = {}) {
  const result = advanceFullGame(state, { ...d.context(now), phaseId: state.phase.id,
    deadlineToken: state.deadlineToken, ...overrides });
  assert.equal(result.advanced, false);
  assert.strictEqual(result.state, state);
}
function assertSession(state, actor, target, hackId) {
  const value = projected(state), expected = { hackId, actorSeatId: actor, targetSeatId: target };
  assert.deepEqual(value.public.hackSession, expected);
  assert.equal(value.public.activeSeatId, actor);
  assert.deepEqual(Object.keys(value.public.hackSession).sort(), ['actorSeatId', 'hackId', 'targetSeatId']);
  assert.equal(Object.hasOwn(value.public, 'hackFeedback'), false);
  assert.equal(Object.hasOwn(value.public, 'hackPartnerSeatId'), false);
  for (const [id, player] of Object.entries(value.players)) {
    assert.deepEqual(player.hackSession, expected);
    if (id === actor || id === target) {
      assert.equal(player.hackPartnerSeatId, id === actor ? target : actor);
      assert.equal(player.hackFeedback.hackId, hackId);
      assert.equal(player.hackFeedback.phaseId, state.phase.id);
      assert.equal(player.hackFeedback.round, state.round);
    } else {
      assert.equal(player.hackPartnerSeatId, null);
      assert.equal(player.hackFeedback, null);
    }
  }
}
function assertCleared(state) {
  const value = projected(state);
  assert.equal(value.public.hackSession, null);
  for (const player of Object.values(value.players)) {
    assert.equal(player.hackSession, null);
    assert.equal(player.hackPartnerSeatId, null);
    assert.equal(player.hackFeedback, null);
  }
}
function invalid(schema, value, change, label) {
  const malformed = copy(value);
  change(malformed);
  assert.equal(schema.safeParse(malformed).success, false, label);
}

for (const count of [7, 8, 9]) {
  test(`${count}: public pair starts at phase opening, never secret registration or an ordinary close without Hack`, () => {
    assert.equal(PUBLIC_HACK_FULL_GAME_VERSION_PINS.engineVersion, 'full-game-1.6.0');
    for (const close of ['deadline', 'pass']) {
      const d = driver(count), before = projected(d.initial);
      assertCleared(d.initial);
      const pending = accepted(d.apply(d.initial, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }));
      const registered = projected(pending);
      assert.deepEqual(registered.public, before.public);
      for (const id of d.ids.filter(id => id !== 'seat-1')) assert.deepEqual(registered.players[id], before.players[id]);
      const opened = close === 'pass' ? accepted(d.apply(pending, 'seat-1', { type: 'PASS_TURN' })) : d.tick(pending);
      assert.equal(opened.phase.kind, 'HACK_DECLARE');
      assertSession(opened, 'seat-1', 'seat-2', opened.phase.id);
      assert.deepEqual(locations(opened), locations(d.initial), 'Cinematic opening cannot move an occupant');
      const other = driver(count), ordinary = close === 'pass'
        ? accepted(other.apply(other.initial, 'seat-1', { type: 'PASS_TURN' })) : other.tick(other.initial);
      assertCleared(ordinary);
    }
  });

  test(`${count}: exact 15/5/60 clocks, late next windows and obsolete tasks preserve session identity`, () => {
    const d = driver(count), opened = open(d), hackId = opened.phase.id;
    assert.equal(opened.phase.endsAt - opened.phase.startedAt, 15_000);
    unchangedDeadline(d, opened);
    rejected(d.apply(opened, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }, opened.phase.endsAt), opened, 'PHASE_CLOSED');
    const result = d.tick(opened, 1700);
    assert.equal(result.phase.startedAt, opened.phase.endsAt + 1700);
    assert.equal(result.phase.endsAt - result.phase.startedAt, 5000);
    assert.equal(result.hackFeedback.status, 'NO_DECLARATION');
    assertSession(result, 'seat-1', 'seat-2', hackId);
    unchangedDeadline(d, result, result.phase.startedAt + 4999);
    unchangedDeadline(d, result, result.phase.endsAt + 1000, { phaseId: opened.phase.id, deadlineToken: opened.deadlineToken });
    unchangedDeadline(d, result, result.phase.endsAt + 1000, { deadlineToken: 'wrong-token' });
    const talk = d.tick(result, 2300);
    assert.equal(talk.phase.startedAt, result.phase.endsAt + 2300);
    assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
    assertSession(talk, 'seat-1', 'seat-2', hackId);
    unchangedDeadline(d, talk, talk.phase.startedAt + 59_999);
    unchangedDeadline(d, talk, talk.phase.endsAt + 1000, { phaseId: result.phase.id, deadlineToken: result.deadlineToken });
    const next = d.tick(talk);
    assert.equal(next.activeSeatId, 'seat-2');
    assertCleared(next);
    unchangedDeadline(d, next, next.phase.startedAt + 1, { phaseId: talk.phase.id, deadlineToken: talk.deadlineToken });
    assert.deepEqual(locations(next), locations(d.initial));
  });

  test(`${count}: Blue/Red/Alien/no-declaration claims have identical current public and outsider bytes`, () => {
    const branches = [];
    for (const side of ['Blue', 'Red', 'Alien', null]) {
      // Legal histories: the timeout branch opens 1ms earlier. Its due transition
      // and the three timely claims therefore have identical RESULT timestamps,
      // phase IDs and pair identities, without accepting a claim at its deadline.
      const d = driver(count, { start: START - (side === null ? 1 : 0) });
      const opened = open(d, d.initial, { target: 'seat-5' }); // Undercover can declare all three sides.
      const now = START + 60_000 + 14_999;
      const ctx = { now, nextPhaseId: 'paired-result', nextDeadlineToken: 'paired-result-token' };
      let result;
      if (side === null) {
        const evaluated = advanceFullGame(opened, { ...ctx, phaseId: opened.phase.id, deadlineToken: opened.deadlineToken });
        assert.equal(evaluated.advanced, true); result = evaluated.state;
      } else {
        result = accepted(executeFullGame(opened, 'seat-5', { protocolVersion: 2, matchId: opened.matchId,
          phaseId: opened.phase.id, commandId: 'paired-claim', command: { type: 'DECLARE_HACK_SIDE', declaredSide: side } }, ctx));
      }
      assert.equal(result.hackFeedback.declaredSide, side);
      assert.equal(result.hackFeedback.status, side === null ? 'NO_DECLARATION' : 'DECLARED');
      assertSession(result, 'seat-1', 'seat-5', opened.phase.id);
      const talkContext = { now: now + 5000, nextPhaseId: 'paired-talk', nextDeadlineToken: 'paired-talk-token',
        phaseId: result.phase.id, deadlineToken: result.deadlineToken };
      const talk = advanceFullGame(result, talkContext);
      assert.equal(talk.advanced, true);
      branches.push([projected(result), projected(talk.state)]);
    }
    for (const branch of branches.slice(1)) for (const index of [0, 1]) {
      assert.deepEqual(branch[index].public, branches[0][index].public);
      for (const id of [`seat-2`, `seat-3`, `seat-4`, ...Array.from({ length: count - 5 }, (_, n) => `seat-${n + 6}`)])
        assert.deepEqual(branch[index].players[id], branches[0][index].players[id]);
    }
    assert.notDeepEqual(branches[0][0].players['seat-1'].hackFeedback, branches[1][0].players['seat-1'].hackFeedback);
  });

  test(`${count}: allowed participant/outsider moves change real positions without changing capsule identity or clocks`, () => {
    for (const stage of HACK_STAGES) for (const mover of ['seat-1', 'seat-2', 'seat-3']) {
      const d = driver(count), opened = open(d), state = atStage(d, opened, stage), before = projected(state);
      assert.ok(before.players[mover].self.movementDestinations.includes('Room B'));
      const moved = accepted(d.apply(state, mover, { type: 'MOVE', destination: 'Room B' }));
      assert.deepEqual(moved.phase, state.phase);
      assert.equal(moved.deadlineToken, state.deadlineToken);
      assert.deepEqual(moved.activeHack, state.activeHack);
      assert.deepEqual(moved.hackFeedback, state.hackFeedback);
      assertSession(moved, 'seat-1', 'seat-2', opened.phase.id);
      assert.equal(seat(moved, mover).location, 'Room B');
      for (const other of d.ids.filter(id => id !== mover)) assert.deepEqual(seat(moved, other), seat(state, other));
      rejected(d.apply(moved, mover, { type: 'MOVE', destination: 'Room A' }), moved);
      const ended = d.until(moved, value => !HACK_STAGES.includes(value.phase.kind));
      assert.equal(seat(ended, mover).location, 'Room B', 'Exit uses the latest real location');
      assertCleared(ended);
    }
  });

  test(`${count}: abort clears every capsule stage and obsolete deadlines cannot resurrect it`, () => {
    for (const stage of HACK_STAGES) {
      const d = driver(count), state = atStage(d, open(d), stage), context = d.context(state.phase.startedAt + 2);
      const ended = abortFullGame(state, context);
      assert.deepEqual(abortFullGame(copy(state), context), ended);
      assert.equal(ended.phase.kind, 'ABORTED');
      assertCleared(ended);
      assert.deepEqual(locations(ended), locations(state));
      unchangedDeadline(d, ended, state.phase.endsAt + 1, { phaseId: state.phase.id, deadlineToken: state.deadlineToken });
    }
  });

  test(`${count}: strict session and participant feedback bindings reject malformed or copied projections`, () => {
    const d = driver(count), opened = open(d), result = atStage(d, opened, 'HACK_RESULT');
    const ordinary = projected(d.initial), active = projected(opened), reading = projected(result);
    for (const schema of [FullPublicViewSchema, FullPlayerViewSchema]) {
      const idle = schema === FullPublicViewSchema ? ordinary.public : ordinary.players['seat-1'];
      const live = schema === FullPublicViewSchema ? active.public : active.players['seat-1'];
      invalid(schema, idle, value => { delete value.hackSession; }, 'New tuple requires the nullable field');
      invalid(schema, idle, value => { value.hackSession = undefined; }, 'Undefined cannot substitute for null');
      invalid(schema, idle, value => { value.hackSession = copy(active.public.hackSession); }, 'No session outside Hack');
      invalid(schema, live, value => { value.hackSession = null; }, 'Every Hack stage requires a pair');
      invalid(schema, live, value => { delete value.hackSession.targetSeatId; }, 'Complete pair required');
      invalid(schema, live, value => { value.hackSession.targetSeatId = value.hackSession.actorSeatId; }, 'Distinct participants');
      invalid(schema, live, value => { value.hackSession.actorSeatId = 'seat-3'; }, 'Initiator equals active seat');
      invalid(schema, live, value => { value.hackSession.targetSeatId = 'seat-10'; }, 'Valid seat identifier');
      if (count < 9)
        invalid(schema, live, value => { value.hackSession.targetSeatId = 'seat-9'; }, 'Valid-looking seat outside this roster');
      invalid(schema, live, value => { value.hackSession.hackId = 'unrelated-hack'; }, 'Declaration binds its own phase');
      for (const [field, payload] of [['declaredSide', 'Red'], ['status', 'DECLARED'], ['truthful', true], ['endsAt', opened.phase.endsAt]])
        invalid(schema, live, value => { value.hackSession[field] = payload; }, `No public ${field}`);
      if (schema === FullPublicViewSchema)
        invalid(schema, live, value => { value.hackFeedback = copy(active.players['seat-1'].hackFeedback); }, 'No private field in public view');
    }
    for (const stage of [reading, projected(d.tick(result))]) {
      for (const [schema, view] of [[FullPublicViewSchema, stage.public], [FullPlayerViewSchema, stage.players['seat-1']]]) {
        invalid(schema, view, value => { value.hackSession = null; }, 'Result/conversation require the current pair');
        invalid(schema, view, value => { delete value.hackSession; }, 'Result/conversation cannot omit the session');
      }
    }
    // The player schema owns hackFeedback; explicitly test its binding, not its existence.
    const participant = reading.players['seat-1'];
    for (const [field, value] of [['hackId', 'other-hack'], ['phaseId', opened.phase.id], ['round', 2]])
      invalid(FullPlayerViewSchema, participant, view => { view.hackFeedback[field] = value; }, `Feedback ${field} binding`);
    invalid(FullPlayerViewSchema, participant, value => { value.hackPartnerSeatId = 'seat-3'; }, 'Opposite participant only');
    invalid(FullPlayerViewSchema, participant, value => { value.hackSession.targetSeatId = 'seat-3'; }, 'Session agrees with private partner');
    invalid(FullPlayerViewSchema, participant, value => { value.hackFeedback = null; }, 'Participant claim state required');
    invalid(FullPlayerViewSchema, participant, value => { value.hackPartnerSeatId = null; }, 'Participant partner required');
    invalid(FullPlayerViewSchema, reading.players['seat-3'], value => {
      value.hackFeedback = copy(participant.hackFeedback); value.hackPartnerSeatId = 'seat-1';
    }, 'A bystander cannot impersonate the target by copying private fields');
    invalid(FullPublicViewSchema, reading.public, value => { value.hackSession.hackId = value.phase.id; }, 'Result retains original Hack ID');
    invalid(FullPlayerViewSchema, participant, value => { value.hackFeedback.actualFaction = 'Red'; }, 'No true-faction metadata');
    invalid(FullPublicViewSchema, ordinary.public, value => { value.versions.rulesetHash = LEGACY_FULL_GAME_VERSION_PINS.rulesetHash; }, 'Mixed tuples fail closed');
  });

  for (const round of [1, 2, 3, 4, 5]) {
    test(`${count}, R${round}: G09 every current ordinary turn remains open, including the final one with pending Hack`, () => {
      const ids = Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
      const order = [...ids.slice(1), 'seat-1'];
      for (const actor of [order[0], order[Math.floor(count / 2)], 'seat-1']) {
        const d = driver(count, { order }), state = d.turn(actor, round);
        assert.ok(projected(state).players['seat-3'].self.movementDestinations.includes('Room B'));
        const moved = accepted(d.apply(state, 'seat-3', { type: 'MOVE', destination: 'Room B' }));
        assert.deepEqual(moved.phase, state.phase);
        rejected(d.apply(moved, 'seat-3', { type: 'MOVE', destination: 'Room A' }), moved);
      }
      const d = driver(count, { order }), last = d.turn('seat-1', round);
      const pending = accepted(d.apply(last, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }));
      const moved = accepted(d.apply(pending, 'seat-3', { type: 'MOVE', destination: 'Room B' }, pending.phase.endsAt - 1));
      assert.equal(projected(moved).public.hackSession, null);
      rejected(d.apply(pending, 'seat-3', { type: 'MOVE', destination: 'Room B' }, pending.phase.endsAt), pending, 'PHASE_CLOSED');
    });

    test(`${count}, R${round}: G09 earlier Hack stays open; final Hack closes all three stages on Pass or expiry`, () => {
      const ids = Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
      for (const final of [false, true]) for (const close of ['pass', 'deadline']) for (const stage of HACK_STAGES) {
        const order = final ? [...ids.slice(1), 'seat-1'] : ids;
        const d = driver(count, { order }), opened = open(d, d.turn('seat-1', round), { close });
        const state = atStage(d, opened, stage), player = projected(state).players['seat-3'];
        if (final) {
          assert.deepEqual(player.self.movementDestinations, []);
          rejected(d.apply(state, 'seat-3', { type: 'MOVE', destination: 'Room B' }), state);
        } else {
          assert.ok(player.self.movementDestinations.includes('Room B'));
          accepted(d.apply(state, 'seat-3', { type: 'MOVE', destination: 'Room B' }));
        }
        assertSession(state, 'seat-1', 'seat-2', opened.phase.id);
      }
    });
  }

  test(`${count}: synthetic G09 skipped trailing Eliminated seats close Hack, but later Injured/Jailed turns count`, () => {
    const ids = Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
    const trailing = ids.slice(-2), order = [...ids.filter(id => id !== 'seat-1' && !trailing.includes(id)), 'seat-1', ...trailing];
    for (const later of ['Eliminated', 'Injured', 'Jailed']) for (const stage of HACK_STAGES) {
      const d = driver(count, { order }), opened = copy(open(d, d.turn('seat-1')));
      // Synthetic status edge only: the target seat-2 remains alive and earlier in
      // the recorded permutation; no fixture claims these health changes are commands.
      for (const id of trailing) seat(opened, id).health = 'Eliminated';
      if (later !== 'Eliminated') {
        const remaining = seat(opened, trailing.at(-1));
        remaining.health = later === 'Injured' ? 'Injured' : 'Healthy';
        remaining.jailed = later === 'Jailed';
        remaining.location = later === 'Injured' ? 'Hospital' : 'Jail';
      }
      const state = atStage(d, opened, stage), offer = projected(state).players['seat-3'].self.movementDestinations;
      if (later === 'Eliminated') {
        assert.deepEqual(offer, []);
        rejected(d.apply(state, 'seat-3', { type: 'MOVE', destination: 'Room B' }), state);
      } else {
        assert.ok(offer.includes('Room B'));
        accepted(d.apply(state, 'seat-3', { type: 'MOVE', destination: 'Room B' }));
        if (stage === 'HACK') assert.equal(d.tick(state).activeSeatId, trailing.at(-1));
      }
    }
  });

  test(`${count}: G09 election is closed despite reset movement quota; next ordinary round opens it`, () => {
    const d = driver(count), election = d.until(d.initial, value => value.round === 2 && value.phase.kind === 'CAPTAIN_ELECTION');
    assert.equal(seat(election, 'seat-3').movedInRound, false);
    assert.deepEqual(projected(election).players['seat-3'].self.movementDestinations, []);
    rejected(d.apply(election, 'seat-3', { type: 'MOVE', destination: 'Room B' }), election);
    const next = d.until(election, value => value.phase.kind === 'ORDINARY_TURN');
    accepted(d.apply(next, 'seat-3', { type: 'MOVE', destination: 'Room B' }));
    const jail = d.until(next, value => value.phase.kind === 'JAIL_VOTE');
    assert.deepEqual(projected(jail).players['seat-3'].self.movementDestinations, []);
    rejected(d.apply(jail, 'seat-3', { type: 'MOVE', destination: 'Room B' }), jail);
  });

  test(`${count}: final R5 Hack closes movement without removing the independent Code opportunity`, () => {
    const ids = Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
    const d = driver(count, { order: [...ids.slice(1), 'seat-1'] });
    const opened = open(d, d.turn('seat-1', 5)), result = atStage(d, opened, 'HACK_RESULT');
    for (const state of [opened, result]) {
      assert.equal(projected(state).players['seat-6'].self.codeAttemptAvailable, false);
      rejected(d.apply(state, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...state.code] }), state);
    }
    const talk = d.tick(result);
    assert.deepEqual(projected(talk).players['seat-3'].self.movementDestinations, []);
    assert.equal(projected(talk).players['seat-6'].self.codeAttemptAvailable, true);
    const submitted = accepted(d.apply(talk, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...talk.code] }));
    assert.equal(submitted.correctCode, true);
    assert.equal(submitted.result, null, 'Code does not cut short the current conversation');
    assert.deepEqual(submitted.phase, talk.phase);
    assertSession(submitted, 'seat-1', 'seat-2', opened.phase.id);
    rejected(d.apply(submitted, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...talk.code] }), submitted);
    const ended = d.until(submitted, value => value.phase.kind === 'FINISHED');
    assertCleared(ended);
  });

  for (const pins of OLD_PINS) test(`${count}: exact ${pins.engineVersion} omits the new field and keeps historical final-Hack movement`, () => {
    const ids = Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
    const d = driver(count, { pins, order: [...ids.slice(1), 'seat-1'] }), opened = open(d, d.turn('seat-1'));
    const talk = pins === DECLARED_HACK_FULL_GAME_VERSION_PINS ? atStage(d, opened, 'HACK') : opened;
    assert.equal(talk.phase.kind, 'HACK');
    for (const state of [d.initial, opened, talk]) {
      const value = projected(state);
      for (const [schema, view] of [[FullPublicViewSchema, value.public], [FullPlayerViewSchema, value.players['seat-1']]]) {
        assert.equal(Object.hasOwn(view, 'hackSession'), false);
        for (const payload of [null, undefined, { hackId: 'historical-hack', actorSeatId: 'seat-1', targetSeatId: 'seat-2' }])
          invalid(schema, view, altered => { altered.hackSession = payload; }, 'Historical shape omits even a null/undefined session');
      }
    }
    assert.ok(projected(talk).players['seat-3'].self.movementDestinations.includes('Room B'));
    accepted(d.apply(talk, 'seat-3', { type: 'MOVE', destination: 'Room B' }));
    const election = d.until(talk, value => value.round === 2 && value.phase.kind === 'CAPTAIN_ELECTION');
    assert.ok(projected(election).players['seat-3'].self.movementDestinations.includes('Room B'));
  });
}
