import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  RESOLUTION_FULL_GAME_VERSION_PINS as FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, projectFullGame,
} from '../dist/index.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/capacity-resolution.json', import.meta.url)));
assert.equal(fixtures.source_commit, 'c82863eff563ea7fd8f6ee33e7260d2dc1c4899c');
// Focused copies of independently written Balance expectations. No expectation is
// inferred from this implementation or changed to fit its historical behavior.
function run(fixture, pins = FULL_GAME_VERSION_PINS, checkExpectations = true) {
  const { seed, ...setup } = fixture.setup;
  const assets = 'resolution-regression-assets-v1';
  let serial = 0, commands = 0;
  let state = createFullGame({ matchId: fixture.id, setup, versions: { ...pins, assetManifestVersion: assets },
    now: 1_800_000_000_000, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: assets });
  const ref = value => value === null ? null : value.startsWith('@') ? state.seats.find(seat => seat.role === value.slice(1)).seatId : value;
  const expected = value => Array.isArray(value) ? value.map(item => typeof item === 'string' && item.startsWith('@') ? ref(item) : item) : value;
  function invariants() {
    if (pins !== FULL_GAME_VERSION_PINS) return;
    for (const room of ['Room A', 'Room B', 'Hospital', 'Jail', 'Command Room']) {
      assert.ok(state.seats.filter(seat => seat.location === room).length <= (room === 'Command Room' ? 1 : 5), room);
    }
    for (const seat of state.seats) if (['Room A', 'Room B'].includes(seat.location)) assert.equal(seat.lastRoom, seat.location);
  }
  function tick() {
    assert.notEqual(state.phase.endsAt, null);
    const context = { now: state.phase.endsAt, phaseId: state.phase.id, deadlineToken: state.deadlineToken,
      nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `deadline-${serial}` };
    const outcome = advanceFullGame(state, context);
    assert.equal(outcome.advanced, true);
    assert.deepEqual(advanceFullGame(JSON.parse(JSON.stringify(state)), context), outcome);
    const duplicate = advanceFullGame(outcome.state, context);
    assert.equal(duplicate.advanced, false);
    assert.strictEqual(duplicate.state, outcome.state);
    state = outcome.state; invariants();
  }
  for (const step of fixture.steps) {
    if (step.op === 'until') {
      for (let bound = 0; !(state.phase.kind === step.phase && (step.round === undefined || state.round === step.round)
        && (step.active === undefined || state.activeSeatId === ref(step.active))); bound++) {
        assert.ok(bound < 500, 'Reach the recorded phase through canonical deadlines'); tick();
      }
    } else if (step.op === 'expire') {
      for (let i = 0; i < step.times; i++) tick();
    } else if (step.op === 'command') {
      const command = structuredClone(step.command);
      if ('target' in command) { command.targetSeatId = ref(command.target); delete command.target; }
      if ('targets' in command) { command.targetSeatIds = command.targets.map(ref); delete command.targets; }
      const request = { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id,
        commandId: `command-${++serial}`, command };
      const context = { now: state.phase.startedAt + 1, nextPhaseId: `phase-${serial}`, nextDeadlineToken: `deadline-${serial}` };
      const outcome = executeFullGame(state, ref(step.actor), request, context);
      assert.equal(outcome.receipt.status, 'accepted', fixture.id + ' ' + command.type);
      assert.equal(outcome.receipt.code, step.expect);
      assert.deepEqual(executeFullGame(JSON.parse(JSON.stringify(state)), ref(step.actor), request, context), outcome);
      state = outcome.state; commands++; invariants();
    } else if (step.op === 'assert') {
      if (!checkExpectations) continue;
      const views = projectFullGame(state);
      for (const check of step.checks) {
        let actual;
        if ('truth' in check) actual = state.seats.find(seat => seat.seatId === ref(check.truth))[check.field];
        else if ('public' in check) actual = views.public.seats.find(seat => seat.seatId === ref(check.public))[check.field];
        else if ('visible' in check) actual = views.players[ref(check.visible)].self.movementDestinations;
        else if ('count' in check) {
          if (check.count.startsWith('occupants:')) actual = state.seats.filter(seat => seat.location === check.count.slice('occupants:'.length)).length;
          else if (check.count === 'captains') actual = state.seats.filter(seat => seat.captain).length;
          else if (check.count === 'injured') actual = state.seats.filter(seat => seat.health === 'Injured').length;
          else if (check.count === 'waiting') actual = state.seats.filter(seat => seat.health === 'Injured' && !seat.jailed && seat.location !== 'Hospital').length;
          else throw new Error('Unsupported independent count');
        }
        else if ('publicFact' in check) actual = views.public.ballot[check.publicFact];
        else if (check.match === 'phase') actual = state.phase.kind;
        else if (check.match === 'winner') actual = state.result?.winner ?? null;
        else if (check.match === 'waiting') actual = state.seats.filter(seat => seat.health === 'Injured' && !seat.jailed && seat.location !== 'Hospital').map(seat => seat.seatId);
        else throw new Error('Unsupported independent assertion');
        if ('sameSet' in check) assert.deepEqual([...actual].sort(), expected(check.sameSet).sort());
        else assert.deepEqual(actual, expected(check.equals), fixture.id + ' ' + JSON.stringify(check));
      }
    } else throw new Error('Unsupported independent operation');
  }
  assert.ok(commands > 0);
  return state;
}
for (const fixture of fixtures.cases) test(fixture.id + ': ' + fixture.title, () => run(fixture));
for (const mode of [7, 8, 9]) {
  const fixture = fixtures.cases.find(item => item.id === `V1-M${mode}-CAP-28`);
  for (const pins of [CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS]) {
    test(`${mode}: replay preserves the exact ${pins.engineVersion} CAP-28 outcome`, () => {
      const state = run(fixture, pins, false);
      assert.equal(state.seats.find(seat => seat.role === 'Insider').location,
        pins === CAPACITY_FULL_GAME_VERSION_PINS ? 'Room A' : 'Room B');
      assert.equal(state.seats.find(seat => seat.role === 'Supplier').location, 'Hospital');
      assert.equal(state.seats.find(seat => seat.role === 'Supplier').captain, false);
      assert.equal(state.versions.rulesetHash, pins.rulesetHash);
    });
  }
}
