import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerClock, estimateDeadline, millisecondsToNextSecond } from '@mothership/game';

const SERVER_EPOCH = 1_800_000_000_000;
const phase = { id: 'phase-a', kind: 'ORDINARY_TURN', startedAt: SERVER_EPOCH, endsAt: SERVER_EPOCH + 60_000 };

function clockAt(start = 0) {
  let now = start;
  return { clock: { now: () => now }, set: value => { now = value; }, advance: ms => { now += ms; } };
}

test('before any sample the clock admits it does not know the time', () => {
  const { clock } = clockAt();
  assert.deepEqual(createServerClock(clock).read(), { status: 'unsynced' });
});

test('server time is carried forward by the monotonic clock from the midpoint of a round trip', () => {
  const local = clockAt(10_000);
  const serverClock = createServerClock(local.clock);
  // Sent at 10 000, answered at 10 080; the server stamped SERVER_EPOCH somewhere in between.
  assert.equal(serverClock.addSample({ requestedAt: 10_000, receivedAt: 10_080, serverTimeMs: SERVER_EPOCH }), true);
  local.set(10_080);
  assert.deepEqual(serverClock.read(), { status: 'synced', serverNowMs: SERVER_EPOCH + 40, uncertaintyMs: 40 });
  local.advance(5_000);
  assert.equal(serverClock.read().serverNowMs, SERVER_EPOCH + 5_040);
});

test('the estimate does not depend on what the device believes the date is', () => {
  // The local clock is an arbitrary counter months away from server time; only differences matter.
  for (const origin of [0, 123_456_789, 9_999_999_999_999]) {
    const local = clockAt(origin);
    const serverClock = createServerClock(local.clock);
    serverClock.addSample({ requestedAt: origin, receivedAt: origin + 20, serverTimeMs: SERVER_EPOCH });
    local.advance(30_020);
    assert.deepEqual(estimateDeadline(phase, serverClock.read()), { kind: 'running', remainingMs: 29_990 });
  }
});

test('a tighter consistent sample replaces a looser one; a looser consistent one is ignored', () => {
  const local = clockAt(0);
  const serverClock = createServerClock(local.clock);
  serverClock.addSample({ requestedAt: 0, receivedAt: 400, serverTimeMs: SERVER_EPOCH + 200 });
  assert.equal(serverClock.read().uncertaintyMs, 200);
  assert.equal(serverClock.addSample({ requestedAt: 500, receivedAt: 520, serverTimeMs: SERVER_EPOCH + 510 }), true);
  assert.equal(serverClock.read().uncertaintyMs, 10);
  assert.equal(serverClock.addSample({ requestedAt: 600, receivedAt: 1_000, serverTimeMs: SERVER_EPOCH + 800 }), false);
  assert.equal(serverClock.read().uncertaintyMs, 10);
});

test('a sample that contradicts the estimate wins even if it is looser: local time stood still', () => {
  const local = clockAt(0);
  const serverClock = createServerClock(local.clock);
  serverClock.addSample({ requestedAt: 0, receivedAt: 10, serverTimeMs: SERVER_EPOCH + 5 });
  // The device slept for 40 s: the server moved on, the monotonic clock did not.
  local.set(100);
  const afterSleep = { requestedAt: 100, receivedAt: 700, serverTimeMs: SERVER_EPOCH + 40_400 };
  assert.equal(serverClock.addSample(afterSleep), true);
  local.set(700);
  assert.equal(serverClock.read().serverNowMs, SERVER_EPOCH + 40_700);
  assert.equal(serverClock.read().uncertaintyMs, 300);
});

test('invalidating forgets the estimate until a new sample arrives', () => {
  const local = clockAt(0);
  const serverClock = createServerClock(local.clock);
  serverClock.addSample({ requestedAt: 0, receivedAt: 10, serverTimeMs: SERVER_EPOCH });
  serverClock.invalidate();
  assert.deepEqual(serverClock.read(), { status: 'unsynced' });
  assert.equal(serverClock.addSample({ requestedAt: 50, receivedAt: 650, serverTimeMs: SERVER_EPOCH + 300 }), true);
  assert.equal(serverClock.read().status, 'synced');
});

test('impossible samples are discarded', () => {
  const serverClock = createServerClock(clockAt().clock);
  for (const sample of [
    { requestedAt: 100, receivedAt: 50, serverTimeMs: SERVER_EPOCH },
    { requestedAt: Number.NaN, receivedAt: 50, serverTimeMs: SERVER_EPOCH },
    { requestedAt: 0, receivedAt: Number.POSITIVE_INFINITY, serverTimeMs: SERVER_EPOCH },
    { requestedAt: 0, receivedAt: 10, serverTimeMs: Number.NaN },
  ]) {
    assert.equal(serverClock.addSample(sample), false);
  }
  assert.deepEqual(serverClock.read(), { status: 'unsynced' });
});

test('a deadline is none, unsynced, running or expired, and reaching zero is expiry', () => {
  const at = serverNowMs => ({ status: 'synced', serverNowMs, uncertaintyMs: 5 });
  assert.deepEqual(estimateDeadline({ id: 'r', kind: 'ROUND_RESOLUTION', startedAt: SERVER_EPOCH, endsAt: null }, at(SERVER_EPOCH)), { kind: 'none' });
  assert.deepEqual(estimateDeadline({ id: 'r', kind: 'ROUND_RESOLUTION', startedAt: SERVER_EPOCH, endsAt: null }, { status: 'unsynced' }), { kind: 'none' });
  assert.deepEqual(estimateDeadline(phase, { status: 'unsynced' }), { kind: 'unsynced' });
  assert.deepEqual(estimateDeadline(phase, at(SERVER_EPOCH + 18_000)), { kind: 'running', remainingMs: 42_000 });
  assert.deepEqual(estimateDeadline(phase, at(SERVER_EPOCH + 59_999)), { kind: 'running', remainingMs: 1 });
  assert.deepEqual(estimateDeadline(phase, at(SERVER_EPOCH + 60_000)), { kind: 'expired' });
  assert.deepEqual(estimateDeadline(phase, at(SERVER_EPOCH + 600_000)), { kind: 'expired' });
});

test('an estimate that runs behind the server never shows more time than the phase contains', () => {
  const early = { status: 'synced', serverNowMs: SERVER_EPOCH - 750, uncertaintyMs: 900 };
  assert.deepEqual(estimateDeadline(phase, early), { kind: 'running', remainingMs: 60_000 });
});

test('the next redraw lands exactly when the whole-second display changes', () => {
  assert.equal(millisecondsToNextSecond(42_000), 1_000);
  assert.equal(millisecondsToNextSecond(41_500), 500);
  assert.equal(millisecondsToNextSecond(41_001), 1);
  assert.equal(millisecondsToNextSecond(1_000), 1_000);
  assert.equal(millisecondsToNextSecond(1), 1);
});
