import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { FoodTaskCommandSchema, FOOD_TASK_VERTICAL as Y } from '@mothership/contracts';
import { chooseFoodBotInput } from '../dist/food-bot-policy.js';

const examples = JSON.parse(readFileSync(new URL('./fixtures/food-views.json', import.meta.url), 'utf8'));
const clone = v => structuredClone(v);
function view(count = 7, control = 'WINCH') {
  const v = clone(examples['task-winch-initial']);
  v.playerCount = count;
  v.rosterSeatIds = Array.from({ length: count }, (_, i) => `seat-${i + 1}`);
  v.seatId = control === 'WINCH' ? 'seat-1' : 'seat-2';
  v.partnerChoices = v.rosterSeatIds.filter(id => id !== v.seatId).map(seatId => ({ seatId, available: false, reason: 'NOT_AVAILABLE_NOW' }));
  v.participantTask.selfControl = control;
  v.participantTask.controlSessionId = control === 'WINCH' ? 'winch-session-2' : 'panel-session-2';
  if (control === 'PANEL') v.participantTask.ownGesture = null;
  offer(v, control === 'WINCH' ? ['HOLD'] : ['PANEL_RELEASE']);
  return v;
}
function offer(v, inputs) {
  const t = v.participantTask;
  v.offers = [{ type: 'TASK_PRESS', taskId: t.taskId, controlSessionId: t.controlSessionId,
    controlRevision: t.controlRevision, inputs, crateId: t.crate.id }];
}
function holding(v, sequence = 1) {
  const t = v.participantTask;
  Object.assign(t.crate, { state: 'HELD', holder: 'WINCH', height: Y.raised, motion: null });
  if (t.ownGesture) Object.assign(t.ownGesture, { highestSequence: sequence, recoveryRevision: sequence,
    currentHolder: { sequence, crateId: t.crate.id }, pendingIntent: null });
}
function asking(count = 7, seatId = 'seat-1') {
  const v = view(count);
  v.seatId = seatId;
  v.participantTask = null;
  v.step = { kind: 'ASKING', stepId: 'food-step-2', startedAt: 1000, askingEndsAt: 31000, someoneAsking: false };
  v.ownAvailability = { canAsk: true, reason: null };
  v.partnerChoices = v.rosterSeatIds.filter(id => id !== seatId).map(id => ({ seatId: id, available: true, reason: null }));
  v.offers = [{ type: 'TASK_ASK', partnerSeatIds: v.partnerChoices.map(p => p.seatId) }];
  return v;
}
function choose(v) {
  const before = JSON.stringify(v);
  const decision = chooseFoodBotInput(v);
  assert.equal(JSON.stringify(v), before, 'policy must not mutate the authorized projection');
  if (decision.command) FoodTaskCommandSchema.parse(decision.command);
  return decision;
}

for (const count of [7, 8, 9]) {
  test(`${count} players: cooperative ask, join, lift, move, lock, release, key, delivered snapshots`, () => {
    assert.deepEqual(choose(asking(count, 'seat-2')).command, { type: 'TASK_ASK', partnerSeatId: 'seat-3' });
    const join = clone(examples['full-answer-window-beyond-asking-deadline']);
    join.playerCount = count; join.rosterSeatIds = view(count).rosterSeatIds;
    join.partnerChoices = view(count).partnerChoices;
    assert.equal(choose(join).command.answer, 'JOIN'); // Full 15 seconds survives the asking deadline.

    const w = view(count), p = view(count, 'PANEL');
    for (const v of [w, p]) { v.serverNowMs = 2000; v.participantTask.stage = 'BRIEFING'; v.offers = []; }
    assert.equal(choose(w).nextWakeAt, 5000);
    assert.equal(choose(p).nextWakeAt, 5000);
    w.serverNowMs = 6000; w.participantTask.stage = 'ACTIVE'; offer(w, ['HOLD']);
    assert.deepEqual(choose(w).command.input, { kind: 'HOLD', edge: 'DOWN', gestureSequence: 1, crateId: 'crate-0' });
    holding(p); p.serverNowMs = 6450; p.participantTask.stage = 'ACTIVE'; offer(p, ['PANEL_RELEASE']);
    assert.equal(choose(p).command.input.kind, 'PANEL_RELEASE');
    Object.assign(p.participantTask.panel, { locked: false, stop: 0, anchorAt: 6450 });
    offer(p, ['PANEL_LOCK']);
    const lockWake = choose(p).nextWakeAt;
    assert.equal(lockWake, 7450);
    p.serverNowMs = lockWake;
    assert.equal(choose(p).command.input.kind, 'PANEL_LOCK');

    holding(w); w.serverNowMs = lockWake;
    Object.assign(w.participantTask.panel, { locked: true, stop: 5, anchorAt: lockWake,
      swing: { startedAt: lockWake, amplitude: 0.9, direction: 1 } });
    const releaseWake = choose(w).nextWakeAt;
    assert.ok(releaseWake > lockWake && releaseWake < lockWake + 2600);
    w.serverNowMs = releaseWake;
    assert.deepEqual(choose(w).command.input, { kind: 'HOLD', edge: 'UP', gestureSequence: 1, crateId: 'crate-0' });
    for (const v of [w, p]) {
      v.serverNowMs = releaseWake + 300;
      Object.assign(v.participantTask.crate, { state: 'LANDED', holder: null, x: 5, height: Y.platform, motion: null });
      if (v.participantTask.ownGesture) v.participantTask.ownGesture.currentHolder = null;
      offer(v, ['KEY']);
      assert.equal(choose(v).command.input.kind, 'KEY');
      v.participantTask.people.find(person => person.seatId === v.seatId).keyTurned = true;
      assert.equal(choose(v).command, null);
      v.participantTask.stage = 'ENDED';
      v.participantTask.outcome = { kind: 'DELIVERED', at: v.serverNowMs, dosesAdded: 10 };
      v.participantTask.crate.state = 'SENT';
      v.participantTask.crate.motion = { fromX: 5, toX: 5, fromHeight: Y.platform, toHeight: -0.12,
        easing: 'QUADRATIC_IN_OUT', startedAt: v.serverNowMs, endsAt: v.serverNowMs + 1100 };
      v.offers = [];
      assert.deepEqual(choose(v), { command: null, nextWakeAt: null });
    }
  });
  test(`${count} players: outage does not replay a missed window or revive an expired Task`, () => {
    const p = view(count, 'PANEL'); holding(p);
    Object.assign(p.participantTask.panel, { locked: false, stop: 0, anchorAt: 6000 });
    p.serverNowMs = 7610; offer(p, ['PANEL_LOCK']);
    const decision = choose(p);
    assert.equal(decision.command, null);
    assert.ok(decision.nextWakeAt > p.serverNowMs);
    p.serverNowMs = decision.nextWakeAt;
    assert.equal(choose(p).command.input.kind, 'PANEL_LOCK');
    p.serverNowMs = p.participantTask.deadlineAt; p.offers = [];
    assert.deepEqual(choose(p), { command: null, nextWakeAt: null });
  });
}

test('pending DOWN is not repeated, and a replacement mismatch closes only that pending contact', () => {
  const v = view(), g = v.participantTask.ownGesture;
  Object.assign(g, { highestSequence: 3, pendingIntent: { sequence: 3, crateId: 'crate-0' } });
  assert.equal(choose(v).command, null);
  g.pendingIntent.crateId = 'old-crate';
  assert.deepEqual(choose(v).command.input, { kind: 'HOLD', edge: 'UP', gestureSequence: 3, crateId: null });
});
test('a newer pending contact closes before releasing the older actual holder', () => {
  const v = view(); holding(v, 3);
  Object.assign(v.participantTask.panel, { locked: true, stop: 5, swing: null });
  const g = v.participantTask.ownGesture;
  Object.assign(g, { highestSequence: 4, pendingIntent: { sequence: 4, crateId: null } });
  assert.deepEqual(choose(v).command.input, { kind: 'HOLD', edge: 'UP', gestureSequence: 4, crateId: null });
  g.pendingIntent = null;
  assert.deepEqual(choose(v).command.input, { kind: 'HOLD', edge: 'UP', gestureSequence: 3, crateId: 'crate-0' });
});
test('UP uses the actual owner, never the high-water sequence, and needs no new DOWN offer', () => {
  const v = view(); holding(v, 2);
  v.participantTask.ownGesture.highestSequence = 7;
  Object.assign(v.participantTask.panel, { stop: 5, swing: null }); v.offers = [];
  assert.deepEqual(choose(v).command.input, { kind: 'HOLD', edge: 'UP', gestureSequence: 2, crateId: 'crate-0' });
});
test('brake custody is acquired with a fresh DOWN, and another DOWN waits for its offer', () => {
  const v = clone(examples['neutral-stopped-drop-brake']);
  v.participantTask.ownGesture.pendingIntent = null;
  v.participantTask.ownGesture.currentHolder = null;
  v.participantTask.ownGesture.highestSequence = 1;
  offer(v, ['HOLD']);
  assert.equal(choose(v).command.input.gestureSequence, 2);
  v.offers = []; assert.equal(choose(v).command, null);
});
test('movement waits for the authoritative lift trajectory to finish', () => {
  const v = view(7, 'PANEL'); holding(v);
  v.participantTask.crate.state = 'LIFTING';
  v.participantTask.crate.motion = { fromX: 0, toX: 0, fromHeight: 0, toHeight: 1,
    easing: 'QUADRATIC_IN_OUT', startedAt: 5900, endsAt: 6350 };
  assert.deepEqual(choose(v), { command: null, nextWakeAt: 6350 });
});
test('own offline or dead status cannot fabricate a release; partner offline does not stop cooperation', () => {
  const v = view(); holding(v); v.participantTask.panel.stop = 5;
  v.participantTask.people[0].online = false;
  assert.equal(choose(v).command, null);
  v.participantTask.people[0].online = true; v.participantTask.people[1].online = false;
  assert.equal(choose(v).command.input.edge, 'UP');
  const dead = clone(examples['victim-cut-empty-cosmetic-suffix']);
  assert.equal(choose(dead).command, null);
});
test('only eligible offered partners are considered and last-round exclusions remain server decisions', () => {
  const v = asking(9, 'seat-2');
  const row = v.partnerChoices.find(p => p.seatId === 'seat-3');
  Object.assign(row, { available: false, reason: 'WENT_LAST_ROUND' });
  v.offers[0].partnerSeatIds = v.partnerChoices.filter(p => p.available).map(p => p.seatId);
  assert.equal(choose(v).command.partnerSeatId, 'seat-4');
});
test('strict input rejects malformed/unsupported packets and pooled hidden state', () => {
  const v = view();
  assert.throws(() => chooseFoodBotInput({ ...v, authority: { luck: 0 } }));
  assert.throws(() => chooseFoodBotInput({ ...v, versions: { ...v.versions, engineVersion: 'planet-game-1.3.0' } }));
  assert.throws(() => chooseFoodBotInput({ ...v, serverNowMs: -1 }));
  assert.throws(() => chooseFoodBotInput(v, {}));
  holding(v); v.participantTask.ownGesture.currentHolder.crateId = 'old-crate';
  assert.throws(() => chooseFoodBotInput(v));
});
test('no gesture sequence overflow and no undeclared fallback action', () => {
  const v = view(); v.participantTask.ownGesture.highestSequence = Number.MAX_SAFE_INTEGER;
  assert.equal(choose(v).command, null);
  v.participantTask = null; v.step = null; v.offers = [];
  v.ownAvailability = { canAsk: false, reason: 'NOT_IN_STEP' };
  assert.deepEqual(choose(v), { command: null, nextWakeAt: null });
});
