import assert from 'node:assert/strict';
import test from 'node:test';
import { FOOD_TASK_TARGET, PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS, PLANET_GAME_PINS,
  PLANET_PHONE_OFFER_PINS, PLANET_BLACKOUT_PINS, PlanetEventSchema } from '@mothership/contracts';
import { resolvePlanetPhysical, publishPlanetFoodReturnDeaths, planetJailOccupancy, planetSlotIds } from '../dist/planet-game/physical.js';
import { planetSeatView } from '../dist/planet-game/model.js';
import { registerPlanetPanelRequest } from '../dist/planet-game/feedback.js';
import { createFoodWorldLedger, finishFoodOrdinaryTurn, assertFoodWorldLedger } from '../dist/planet-game/food-meals.js';

// Constructed complete physical-stage fixtures only. These exercise the real copied physical
// handler, not native lifecycle, command registration, service, Task timing or social balance.
const ids = n => Array.from({ length: n }, (_, i) => `seat-${i + 1}`);
const world = state => state.worlds.Original;
const seat = (state, id) => world(state).seats.find(value => value.seatId === id);
function fixture(n, pins = FOOD_TASK_TARGET) {
  const list = ids(n), roles = ['Insider', 'Doctor', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien', 'Red Disabler', 'Engineer'];
  const seats = list.map((seatId, i) => ({ seatId, health: 'Healthy', location: i < 5 ? 'Room A' : 'Room B',
    slotId: i < 5 ? `A${i + 1}` : `B${i - 4}`, lastRoom: i < 5 ? 'Room A' : 'Room B', jailed: false,
    revealedFaction: null, rescueDueAfterRound: null, medical: null, ordinaryWeapons: i === 4 ? 1 : 0,
    roleActionSpent: false, shotSpent: false, protection: null, protectionEver: false,
    clone: { used: false, active: false, expiresAfterRound: null }, blackoutSpent: false, engineerSpent: false }));
  const w = { seats, actions: [], injectionsRemaining: 2, captainSeatId: null, officerSeatId: null,
    releaseUsed: false, ejectUsed: false, shipHackSpent: false, shipHackOverride: false, suppressedSeatIds: [],
    events: [], panelReservations: {} };
  return { matchId: `physical-food-${n}`, versions: { ...pins, rulesetHash: pins.rulesetHash ?? 'a'.repeat(64), assetManifestVersion: 'physical-food-test' },
    playerCount: n, round: 3, evaluatedAt: 20000, phase: { id: 'food-physical-phase', kind: 'ORDINARY_TURN', startedAt: 0, endsAt: 60000 },
    deadlineToken: 'physical-token', roles: Object.fromEntries(list.map((id, i) => [id, roles[i]])), code: ['seat-1', 'seat-2', 'seat-5', 'seat-7'],
    worlds: { Original: w }, realityOf: Object.fromEntries(list.map(id => [id, 'Original'])), currentWorldId: 'Original',
    blackholeActive: false, blackoutPreviewComplete: false, nextWorldNumber: 1, blackoutBatch: { status: 'RESOLVED' },
    global: { promiseEvaluation: {}, movementSpent: [], blockedSeatId: null, lastBlockedSeatId: null,
      blackholeSpent: false, blackholeRound: null, panelAttempts: [], panelRequests: {}, scanResults: [], scanUsedRound: null,
      scanBlockedThroughRound: null, codeAttempted: false, shipHackUnlocked: false, hackCounts: {}, hackSpent: [],
      promises: [], promiseGiven: [], promiseReceived: [], declinedPromiseIds: [], drawings: [], roundOrders: { 3: list } },
    turnOrder: list, turnIndex: 0, activeSeatId: 'seat-1', hack: null, panelOpen: false, ballot: null,
    lastTally: null, afterVote: null, electionNeeded: false, navigation: { position: 'Junction', direction: null, lastMovedRound: 1, arrivedAt: null, started: true },
    result: null, finalized: { round: 0, seats: [], events: [] }, eventPublications: {}, revisions: { public: 0, players: Object.fromEntries(list.map(id => [id, 0])) } };
}
function assign(state, id, location, slotId, health = 'Healthy', jailed = false, due = null) {
  Object.assign(seat(state, id), { location, slotId, health, jailed, rescueDueAfterRound: due,
    medical: health === 'Injured' ? { admittedRound: due - 1, rescueDueAfterRound: due, rescueOpportunity: due === state.round ? 'CURRENT_NORMAL_ROUND' : 'NEXT_NORMAL_ROUND' } : null });
}
function patients(state, list, health = 'Eliminated', due = null) {
  for (const [index, id] of list.entries()) assign(state, id, 'Hospital', `H${index + 1}`, health, false, due);
}
function queue(state, entries) {
  world(state).actions = entries.map(([actorSeatId, command], index) => ({ actorSeatId, command,
    commandId: `physical-action-${index}`, order: state.turnOrder.indexOf(actorSeatId) }));
}
function hungry(state, order) {
  let ledger = createFoodWorldLedger();
  let sequence = 1;
  const complete = (round, id) => {
    const initial = Number(id.slice(5));
    const location = initial <= 5 ? 'Room A' : 'Room B', slotId = initial <= 5 ? `A${initial}` : `B${initial - 5}`;
    ledger = finishFoodOrdinaryTurn(ledger, { matchId: state.matchId, round, seatId: id, sourcePhaseId: `meal-${round}-${id}`,
      order: sequence, endedAt: 1000 + sequence++, placement: { location, slotId }, location, health: 'Healthy' }).ledger;
  };
  for (const round of [1, 2]) for (const id of ids(state.playerCount)) complete(round, id);
  for (const id of order) complete(3, id);
  assertFoodWorldLedger(ledger);
  world(state).food = ledger;
}
function priority(state, first) {
  state.turnOrder = [...first, ...ids(state.playerCount).filter(id => !first.includes(id))];
  state.global.roundOrders[3] = [...state.turnOrder];
}
function invariant(state) {
  const w = world(state), slots = w.seats.flatMap(s => s.slotId === null ? [] : [s.slotId]);
  assert.equal(new Set(slots).size, slots.length);
  assert.ok(w.seats.filter(s => s.location === 'Hospital').length <= 4);
  assert.ok(planetJailOccupancy(w) <= 5);
  for (const s of w.seats) {
    assert.equal(s.location === null, s.slotId === null);
    if (s.location !== null) assert.ok(planetSlotIds(s.location).includes(s.slotId));
    if (s.health === 'Injured') { assert.equal(s.location, 'Hospital'); assert.equal(s.medical.rescueDueAfterRound, s.rescueDueAfterRound); }
  }
  for (const record of w.events) PlanetEventSchema.parse(record.event);
}

for (const n of [7, 8, 9]) {
  test(`${n}: hunger bypasses Protection/Clone and a queued Rescue cannot heal the new episode`, () => {
    const state = fixture(n), w = world(state);
    hungry(state, ['seat-6']);
    Object.assign(seat(state, 'seat-6'), { protection: { donorSeatId: 'seat-5', activeFromRound: 1, consumed: false },
      clone: { used: true, active: true, expiresAfterRound: 5 } });
    w.injectionsRemaining = 1;
    queue(state, [['seat-2', { type: 'RESCUE', targetSeatId: 'seat-6' }]]);
    resolvePlanetPhysical(state, w);
    assert.equal(seat(state, 'seat-6').health, 'Injured');
    assert.deepEqual(seat(state, 'seat-6').medical, { admittedRound: 3, rescueDueAfterRound: 4, rescueOpportunity: 'NEXT_NORMAL_ROUND' });
    assert.equal(seat(state, 'seat-6').protection.consumed, false);
    assert.equal(seat(state, 'seat-6').clone.active, true);
    assert.equal(w.injectionsRemaining, 1);
    assert.deepEqual(w.events.filter(r => ['INJURED', 'ATTACK_BLOCKED', 'RESCUED'].includes(r.event.kind)).map(r => r.event.kind), ['INJURED']);
    assert.equal(w.events[0].event.actorSeatId, null);
    invariant(state);
  });

  test(`${n}: existing injury gets no extra consequence/deadline and existing valid treatment still runs`, () => {
    for (const rescue of [false, true]) {
      const state = fixture(n), w = world(state);
      hungry(state, ['seat-1', 'seat-3']);
      patients(state, ['seat-1'], 'Injured', 4);
      assign(state, 'seat-3', 'Room A', 'A3', 'Eliminated');
      if (rescue) { queue(state, [['seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }]]); w.injectionsRemaining = 1; }
      resolvePlanetPhysical(state, w);
      assert.equal(seat(state, 'seat-1').health, rescue ? 'Healthy' : 'Injured');
      assert.equal(seat(state, 'seat-1').rescueDueAfterRound, rescue ? null : 4);
      assert.equal(seat(state, 'seat-3').health, 'Eliminated');
      assert.equal(w.events.filter(r => r.event.kind === 'INJURED').length, 0);
      assert.equal(w.events.filter(r => r.event.kind === 'RESCUED').length, rescue ? 1 : 0);
      invariant(state);
    }
  });

  test(`${n}: retained hunger order wins the last Hospital bed even against numeric seat order`, () => {
    const state = fixture(n), w = world(state);
    priority(state, ['seat-6', 'seat-4']);
    hungry(state, ['seat-6', 'seat-4']);
    patients(state, ['seat-1', 'seat-2', 'seat-3']);
    resolvePlanetPhysical(state, w);
    assert.equal(seat(state, 'seat-6').slotId, 'H4');
    assert.equal(seat(state, 'seat-6').health, 'Injured');
    assert.equal(seat(state, 'seat-4').health, 'Eliminated');
    assert.equal(seat(state, 'seat-4').location, null);
    assert.deepEqual(w.events.filter(r => r.event.kind === 'HOSPITAL_OVERFLOW_REMOVED').flatMap(r => r.event.seatIds), ['seat-4']);
    invariant(state);
  });

  test(`${n}: retained attack candidates keep priority before the ordered hunger suffix`, () => {
    const state = fixture(n), w = world(state);
    priority(state, ['seat-6', 'seat-4']);
    hungry(state, ['seat-6', 'seat-4']);
    patients(state, ['seat-1', 'seat-2', 'seat-3']);
    queue(state, [['seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-7' }]]);
    resolvePlanetPhysical(state, w);
    assert.equal(seat(state, 'seat-7').slotId, 'H4');
    assert.equal(seat(state, 'seat-7').health, 'Injured');
    for (const id of ['seat-6', 'seat-4']) { assert.equal(seat(state, id).health, 'Eliminated'); assert.equal(seat(state, id).location, null); }
    invariant(state);
  });

  test(`${n}: old patients healed at Rescue free places before hunger admissions compete`, () => {
    const state = fixture(n), w = world(state);
    priority(state, ['seat-7', 'seat-6']);
    hungry(state, ['seat-7', 'seat-6']);
    patients(state, ['seat-1', 'seat-2', 'seat-3']);
    assign(state, 'seat-4', 'Hospital', 'H4', 'Injured', false, 4);
    queue(state, [['seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' }]]);
    w.injectionsRemaining = 1;
    resolvePlanetPhysical(state, w);
    assert.equal(seat(state, 'seat-4').health, 'Healthy');
    assert.equal(seat(state, 'seat-4').location, 'Room A');
    assert.equal(seat(state, 'seat-7').slotId, 'H4');
    assert.equal(seat(state, 'seat-6').health, 'Eliminated');
    invariant(state);
  });

  test(`${n}: detained hunger inherits Hospital/Jail reservation and the full following-round deadline`, () => {
    const state = fixture(n), w = world(state);
    hungry(state, ['seat-6']);
    assign(state, 'seat-6', 'Jail', 'J1', 'Healthy', true);
    resolvePlanetPhysical(state, w);
    assert.equal(seat(state, 'seat-6').health, 'Injured');
    assert.equal(seat(state, 'seat-6').jailed, true);
    assert.equal(seat(state, 'seat-6').rescueDueAfterRound, 4);
    assert.equal(planetJailOccupancy(w), 1);
    state.round = 4;
    resolvePlanetPhysical(state, w);
    assert.equal(seat(state, 'seat-6').health, 'Eliminated');
    assert.equal(seat(state, 'seat-6').location, 'Hospital');
    assert.equal(seat(state, 'seat-6').rescueDueAfterRound, null);
    assert.equal(planetJailOccupancy(w), 0);
    invariant(state);
  });

  test(`${n}: queued Panel treatment of a new hunger episode becomes NO_EFFECT without refund`, () => {
    const state = fixture(n), w = world(state);
    hungry(state, ['seat-6']);
    const commandId = 'panel-before-hunger';
    registerPlanetPanelRequest(state, w, 'seat-6', commandId, true);
    state.global.panelAttempts.push('seat-6');
    w.injectionsRemaining = 1;
    w.actions.push({ actorSeatId: 'seat-6', commandId, command: { type: 'PANEL_CODE', doctorSeatId: 'seat-2' }, order: state.turnOrder.indexOf('seat-6') });
    resolvePlanetPhysical(state, w);
    assert.equal(seat(state, 'seat-6').health, 'Injured');
    assert.equal(w.panelReservations[`seat-6:${commandId}`].status, 'NO_EFFECT');
    assert.equal(state.global.panelRequests['seat-6'].status, 'NO_EFFECT');
    assert.equal(w.injectionsRemaining, 1);
    assert.deepEqual(state.global.panelAttempts, ['seat-6']);
    assert.equal(w.events.some(r => r.event.kind === 'RESCUED'), false);
    invariant(state);
  });

  test(`${n}: fixed-return publisher emits only new ordinary death facts and uses caller-restored placement`, () => {
    const state = fixture(n), w = world(state);
    patients(state, ['seat-1']);
    const original = w.seats.map(s => planetSeatView(w, s));
    // This is a caller-supplied publication control, not a return-placement rule proposal.
    assign(state, 'seat-6', null, null, 'Eliminated');
    state.evaluatedAt = 32500;
    const seatsBefore = structuredClone(w.seats), originalBefore = structuredClone(original);
    const resources = { captain: w.captainSeatId, officer: w.officerSeatId, injections: w.injectionsRemaining, actions: structuredClone(w.actions) };
    publishPlanetFoodReturnDeaths(state, w, original);
    assert.deepEqual(w.seats, seatsBefore);
    assert.deepEqual(original, originalBefore);
    assert.deepEqual({ captain: w.captainSeatId, officer: w.officerSeatId, injections: w.injectionsRemaining, actions: w.actions }, resources);
    assert.deepEqual(w.events.map(r => [r.event.kind, r.event.seatIds]), [['ELIMINATED', ['seat-6']], ['PLACEMENT_CHANGED', ['seat-6']]]);
    for (const record of w.events) {
      PlanetEventSchema.parse(record.event);
      assert.equal(record.event.publishedAt, 32500);
      assert.equal(record.event.actorSeatId, null);
      assert.equal(record.recipients, null);
      assert.equal(record.event.location, null);
      assert.equal(record.event.slotId, null);
    }
    assert.deepEqual(w.events[0].event.clinicalAnchor, { kind: 'CLINICAL_VIGNETTE', batchId: 'food-physical-phase-clinical', anchorId: 'HV2', slotCount: n });
    assert.equal(seat(state, 'seat-6').revealedFaction, null);
  });

  for (const pins of [PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS, PLANET_GAME_PINS, PLANET_PHONE_OFFER_PINS, PLANET_BLACKOUT_PINS]) {
    test(`${n}: ${pins.engineVersion} retains predecessor treatment/damage behavior without Food fields`, () => {
      const state = fixture(n, pins), w = world(state);
      patients(state, ['seat-1'], 'Injured', 4);
      queue(state, [['seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }], ['seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-6' }]]);
      w.injectionsRemaining = 1;
      resolvePlanetPhysical(state, w);
      assert.equal(seat(state,'seat-1').health,'Healthy');
      assert.equal(seat(state,'seat-6').health,'Injured');
      assert.equal(seat(state,'seat-6').location,'Hospital');
      assert.equal(w.injectionsRemaining,1);
      assert.equal(Object.hasOwn(w, 'food'), false);
      invariant(state);
    });
  }
}

test('candidate missing food rejects before physical mutation; predecessor cannot publish Food return facts', () => {
  const state = fixture(7);
  queue(state, [['seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-6' }]]);
  const before = structuredClone(state);
  assert.throws(() => resolvePlanetPhysical(state, world(state)), /retained world ledger/);
  assert.deepEqual(state, before);
  const old = fixture(7, PLANET_BLACKOUT_PINS), oldBefore = structuredClone(old);
  assert.throws(() => publishPlanetFoodReturnDeaths(old, world(old), world(old).seats.map(s => planetSeatView(world(old), s))), /Food ruleset/);
  assert.deepEqual(old, oldBefore);
});

test('return publisher rejects partial or duplicate original roster before event mutation', () => {
  const state = fixture(7), w = world(state), original = w.seats.map(s => planetSeatView(w, s));
  assert.throws(() => publishPlanetFoodReturnDeaths(state, w, original.slice(1)), /complete original roster/);
  assert.throws(() => publishPlanetFoodReturnDeaths(state, w, [...original.slice(1), original[1]]), /complete original roster/);
  assert.deepEqual(w.events, []);
});
