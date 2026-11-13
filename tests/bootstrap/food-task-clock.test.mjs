import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FOOD_TASK_CLOCK_MS, assertFoodTaskClockState, foodTaskClockBoundaries,
  earliestDueFoodTaskBoundaries, assertFoodTaskInputAdmissible, noteFoodTaskDisconnect,
} from '../../packages/contracts/dist/food-task-clock.js';

const copy = value => structuredClone(value);
const asking = (receivedAt = null) => ({
  evaluatedAt: 29_999,
  asking: { startedAt: 0, closed: false, pendingRequest: receivedAt === null ? null : { requestId: 'ask-1', receivedAt } },
  task: null,
});
const active = () => ({
  evaluatedAt: 4_000, asking: null,
  task: { startedAt: 0, briefingComplete: true, privateEndedAt: null, returnedAt: null,
    participants: ['seat-1', 'seat-2'].map(seatId => ({ seatId, alive: true, lastSeenAt: 0, disconnectedAt: null })) },
});
const kinds = boundaries => boundaries.map(value => value.kind).sort();

test('asking closes at exactly 30 seconds and admits a last-moment ask', () => {
  const state = asking();
  assert.doesNotThrow(() => assertFoodTaskInputAdmissible(state, 29_999, 'ASK'));
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 30_000), [{ kind: 'ASKING_CLOSED', at: 30_000 }]);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 30_000, 'ASK'), /Drain due/);
  const closed = copy(state); closed.evaluatedAt = 30_000; closed.asking.closed = true;
  assert.throws(() => assertFoodTaskInputAdmissible(closed, 30_000, 'ASK'), /outside/);
});

test('a timely pending ask keeps its complete 15-second answer after asking closes', () => {
  const state = asking(29_999);
  assert.deepEqual(foodTaskClockBoundaries(state), [
    { kind: 'ASKING_CLOSED', at: 30_000 },
    { kind: 'ANSWER_EXPIRED', at: 44_999, requestId: 'ask-1' },
  ]);
  state.evaluatedAt = 30_000; state.asking.closed = true;
  assert.doesNotThrow(() => assertFoodTaskInputAdmissible(state, 44_998, 'ANSWER'));
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 44_999), [{ kind: 'ANSWER_EXPIRED', at: 44_999, requestId: 'ask-1' }]);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 44_999, 'ANSWER'), /Drain due/);
});

test('simultaneous asking and answer boundaries are one unordered batch', () => {
  const state = asking(15_000);
  const due = earliestDueFoodTaskBoundaries(state, 35_000);
  assert.equal(due.length, 2);
  assert.deepEqual(kinds(due), ['ANSWER_EXPIRED', 'ASKING_CLOSED']);
  assert.equal(due.every(value => value.at === 30_000), true);
});

test('asks at the closed deadline and premature closure markers are invalid saved state', () => {
  const state = asking(30_000); state.evaluatedAt = 30_000;
  assert.throws(() => assertFoodTaskClockState(state), /asking interval/);
  const early = asking(); early.asking.closed = true;
  assert.throws(() => assertFoodTaskClockState(early), /closed before/);
});

test('briefing is inside the 30-second Task and must be drained before the first press', () => {
  const state = active(); state.evaluatedAt = 0; state.task.briefingComplete = false;
  assert.deepEqual(foodTaskClockBoundaries(state), [
    { kind: 'BRIEFING_COMPLETE', at: 4_000 }, { kind: 'TASK_EXPIRED', at: 30_000 }, { kind: 'COMMON_RETURN', at: 32_500 },
  ]);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 3_999, 'PRESS'), /outside/);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 4_000, 'PRESS'), /Drain due/);
  state.evaluatedAt = 4_000; state.task.briefingComplete = true;
  assert.doesNotThrow(() => assertFoodTaskInputAdmissible(state, 4_000, 'PRESS'));
  assert.doesNotThrow(() => assertFoodTaskInputAdmissible(state, 29_999, 'PRESS'));
});

test('a late worker drains the earliest boundary before a press and cannot extend an expired Task', () => {
  const state = active();
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 40_000), [{ kind: 'TASK_EXPIRED', at: 30_000 }]);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 30_000, 'PRESS'), /Drain due/);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 40_000, 'PRESS'), /Drain due/);
  state.evaluatedAt = 40_000; state.task.privateEndedAt = 30_000;
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 40_000), [{ kind: 'COMMON_RETURN', at: 32_500 }]);
  state.task.returnedAt = 32_500;
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 40_000), []);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 40_000, 'PRESS'), /outside/);
});

for (const outcome of ['delivery', 'loss', 'death', 'cancellation']) {
  test(`early private ${outcome} cannot alter the common 32.5-second return`, () => {
    const state = active(); state.evaluatedAt = 5_000; state.task.privateEndedAt = 5_000;
    if (outcome === 'death') state.task.participants[0].alive = false;
    assert.deepEqual(foodTaskClockBoundaries(state), [{ kind: 'COMMON_RETURN', at: 32_500 }]);
    assert.deepEqual(earliestDueFoodTaskBoundaries(state, 7_500), []);
    assert.deepEqual(earliestDueFoodTaskBoundaries(state, 32_499), []);
    assert.deepEqual(earliestDueFoodTaskBoundaries(state, 32_500), [{ kind: 'COMMON_RETURN', at: 32_500 }]);
    assert.throws(() => assertFoodTaskInputAdmissible(state, 5_001, 'PRESS'), /outside/);
    const invalid = copy(state); invalid.evaluatedAt = 7_500; invalid.task.returnedAt = 7_500;
    assert.throws(() => assertFoodTaskClockState(invalid), /common return/);
  });
}

test('eight-second presence grace keeps its original anchor across repeated disconnect observations', () => {
  const state = active();
  const initial = noteFoodTaskDisconnect(state.task.participants[0], 5_000);
  const repeated = noteFoodTaskDisconnect(initial, 12_000);
  assert.equal(repeated.disconnectedAt, 5_000);
  assert.notEqual(repeated, initial);
  state.evaluatedAt = 12_000; state.task.participants[0] = repeated;
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 12_999), []);
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 13_000), [{ kind: 'PRESENCE_EXPIRED', at: 13_000, seatId: 'seat-1' }]);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 13_000, 'PRESS'), /Drain due/);
});

test('dead participants have no grace expiry and cannot cancel a survivor continuation', () => {
  const state = active(); state.evaluatedAt = 13_000;
  state.task.participants[0] = { seatId: 'seat-1', alive: false, lastSeenAt: 0, disconnectedAt: 5_000 };
  assert.equal(foodTaskClockBoundaries(state).some(value => value.kind === 'PRESENCE_EXPIRED'), false);
  assert.doesNotThrow(() => assertFoodTaskInputAdmissible(state, 13_000, 'PRESS'));
  assert.deepEqual(noteFoodTaskDisconnect(state.task.participants[0], 13_001), state.task.participants[0]);
});

test('server-confirmed reconnection clears presence expiry without resetting Task or return clocks', () => {
  const state = active(); state.evaluatedAt = 12_999;
  state.task.participants[0] = { seatId: 'seat-1', alive: true, lastSeenAt: 12_999, disconnectedAt: null };
  assert.deepEqual(foodTaskClockBoundaries(state), [{ kind: 'TASK_EXPIRED', at: 30_000 }, { kind: 'COMMON_RETURN', at: 32_500 }]);
  assert.equal(state.task.startedAt, 0);
});

test('all same-time physical, expiry and presence boundaries are returned without a priority', () => {
  const state = active(); state.evaluatedAt = 22_000;
  state.task.participants[0] = { seatId: 'seat-1', alive: true, lastSeenAt: 0, disconnectedAt: 22_000 };
  state.physics = [{ id: 'fall-1', at: 30_000 }, { id: 'panel-1', at: 30_000 }];
  const due = earliestDueFoodTaskBoundaries(state, 32_500);
  assert.deepEqual(kinds(due), ['PHYSICS', 'PHYSICS', 'PRESENCE_EXPIRED', 'TASK_EXPIRED']);
  assert.equal(due.every(value => value.at === 30_000), true);
});

test('physical deadlines close input until consumed, using original server times after worker delay', () => {
  const state = active(); state.physics = [{ id: 'fall-1', at: 4_500 }];
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 7_000), [{ kind: 'PHYSICS', at: 4_500, id: 'fall-1' }]);
  assert.throws(() => assertFoodTaskInputAdmissible(state, 4_500, 'PRESS'), /Drain due/);
  state.evaluatedAt = 7_000; state.physics = [];
  assert.doesNotThrow(() => assertFoodTaskInputAdmissible(state, 7_000, 'PRESS'));
});

test('invalid, non-finite and overflowing server timestamps are rejected', () => {
  for (const invalid of [NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => earliestDueFoodTaskBoundaries(active(), invalid), /server time/);
    const state = active(); state.evaluatedAt = invalid;
    assert.throws(() => assertFoodTaskClockState(state), /server time/);
    const observed = { seatId: 'seat-1', alive: true, lastSeenAt: invalid, disconnectedAt: null };
    assert.throws(() => noteFoodTaskDisconnect(observed, 10_000), /server time/);
    const physical = active(); physical.physics = [{ id: 'fall-1', at: invalid }];
    assert.throws(() => assertFoodTaskClockState(physical), /server time/);
  }
  const overflow = active(); overflow.evaluatedAt = Number.MAX_SAFE_INTEGER; overflow.task.startedAt = Number.MAX_SAFE_INTEGER - 1;
  assert.throws(() => assertFoodTaskClockState(overflow), /overflow/);
  assert.throws(() => earliestDueFoodTaskBoundaries(active(), 3_999), /backward/);
});

test('malformed presence and physical records cannot create duplicate or foreign boundaries', () => {
  const duplicate = active(); duplicate.task.participants[1].seatId = 'seat-1';
  assert.throws(() => assertFoodTaskClockState(duplicate), /distinct/);
  const disconnect = active(); disconnect.task.participants[0].lastSeenAt = 3_000; disconnect.task.participants[0].disconnectedAt = 2_000;
  assert.throws(() => assertFoodTaskClockState(disconnect), /precedes/);
  const future = active(); future.physics = [{ id: 'fall-1', at: 30_001 }];
  assert.throws(() => assertFoodTaskClockState(future), /outside the Task/);
  const same = active(); same.physics = [{ id: 'fall-1', at: 4_500 }, { id: 'fall-1', at: 5_000 }];
  assert.throws(() => assertFoodTaskClockState(same), /distinct/i);
});

test('a late worker cannot persist a private ending after the fixed Task interval', () => {
  const state = active(); state.evaluatedAt = 40_000; state.task.privateEndedAt = 40_000;
  assert.throws(() => assertFoodTaskClockState(state), /private ending/);
  state.task.privateEndedAt = 30_000;
  assert.deepEqual(earliestDueFoodTaskBoundaries(state, 40_000), [{ kind: 'COMMON_RETURN', at: 32_500 }]);
});

test('clock evaluation is pure and exposes only the approved timing constants', () => {
  const state = active(), before = copy(state);
  foodTaskClockBoundaries(state); earliestDueFoodTaskBoundaries(state, 25_000); assertFoodTaskInputAdmissible(state, 25_000, 'PRESS');
  assert.deepEqual(state, before);
  assert.deepEqual(FOOD_TASK_CLOCK_MS, { asking: 30_000, answer: 15_000, briefing: 4_000, task: 30_000, return: 32_500, grace: 8_000 });
});

test('Hold contact intent and explicit finger-off are admissible in briefing without enabling physical input', () => {
  const state=active();state.evaluatedAt=0;state.task.briefingComplete=false;
  assert.doesNotThrow(()=>assertFoodTaskInputAdmissible(state,0,'HOLD_CONTACT'));
  assert.doesNotThrow(()=>assertFoodTaskInputAdmissible(state,3999,'HOLD_CONTACT'));
  assert.throws(()=>assertFoodTaskInputAdmissible(state,3999,'PRESS'),/outside/);
  assert.throws(()=>assertFoodTaskInputAdmissible(state,4000,'HOLD_CONTACT'),/Drain due/);
  state.evaluatedAt=4000;state.task.briefingComplete=true;
  assert.doesNotThrow(()=>assertFoodTaskInputAdmissible(state,4000,'HOLD_CONTACT'));
  state.evaluatedAt=5000;state.task.privateEndedAt=5000;
  assert.throws(()=>assertFoodTaskInputAdmissible(state,5001,'HOLD_CONTACT'),/outside/);
});
