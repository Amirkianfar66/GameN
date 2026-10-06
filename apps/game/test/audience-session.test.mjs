import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerSession, createPublicSession, DEFAULT_SESSION_TIMING } from '@mothership/game';
import { createFakeHost, createFakeTransport, flush } from './support/fakes.mjs';

const { before, afterRegistration } = createOfficerFixture('protected');
const matchId = before.public.matchId;
const SERVER_EPOCH = before.public.phase.startedAt;
const altered = (view, change) => {
  const copy = structuredClone(view);
  change(copy);
  return copy;
};

function setup(audience = 'player', options = {}) {
  const host = createFakeHost({ serverStart: SERVER_EPOCH, ...options.host });
  const fake = createFakeTransport(host, { audience, mode: options.mode ?? 'fixture' });
  const create = audience === 'player' ? createPlayerSession : createPublicSession;
  const session = create({ transport: fake.transport, matchId, ports: host.ports, ...(options.timing ? { timing: options.timing } : {}) });
  const notifications = [];
  session.subscribe(() => notifications.push(session.getState()));
  return { host, fake, session, notifications };
}
const brief = state => [state.connection, state.view?.viewRevision ?? null, state.problem];

test('a session is connecting until the feed is up and has delivered the current view', async () => {
  const { fake, session } = setup();
  assert.deepEqual(brief(session.getState()), ['connecting', null, null]);
  assert.equal(fake.calls.subscribe, 0, 'Nothing is requested before start');
  session.start();
  session.start();
  assert.equal(fake.calls.subscribe, 1);
  await fake.connect();
  assert.deepEqual(brief(session.getState()), ['connecting', null, null], 'A connection without a view is not yet live');
  await fake.deliver(before.officer);
  assert.deepEqual(brief(session.getState()), ['live', 20, null]);
  assert.equal(session.mode, 'fixture');
});

test('losing the feed keeps the last view readable and marks it stale', async () => {
  const { fake, session } = setup();
  session.start();
  await fake.connectWith(before.officer);
  const held = session.getState().view;
  await fake.disconnect();
  assert.deepEqual(brief(session.getState()), ['stale', 20, null]);
  assert.equal(session.getState().view, held);
});

test('after reconnecting the view stays stale until the feed delivers the current one, even if unchanged', async () => {
  const { fake, session } = setup();
  session.start();
  await fake.connectWith(before.officer);
  await fake.disconnect();
  await fake.connect();
  assert.equal(session.getState().connection, 'stale', 'Being connected again does not prove the view is current');
  await fake.deliver(before.officer);
  assert.deepEqual(brief(session.getState()), ['live', 20, null]);

  await fake.disconnect();
  await fake.connect();
  await fake.deliver(afterRegistration.officer);
  assert.deepEqual(brief(session.getState()), ['live', 21, null]);
  assert.equal(session.getState().view.self.role, 'Officer', 'The same seat and role are restored');
});

test('a view that arrives while the feed reports itself down is kept but not called current', async () => {
  const { fake, session } = setup();
  session.start();
  await fake.deliver(before.officer);
  assert.deepEqual(brief(session.getState()), ['stale', 20, null]);
});

test('an older revision changes nothing and notifies nobody', async () => {
  const { fake, session, notifications } = setup();
  session.start();
  await fake.connectWith(afterRegistration.officer);
  const count = notifications.length;
  await fake.deliver(before.officer);
  assert.deepEqual(brief(session.getState()), ['live', 21, null]);
  assert.equal(notifications.length, count);
});

test('an incompatible protocol blocks the screen and clears when a readable view arrives', async () => {
  const { fake, session } = setup('public');
  session.start();
  await fake.connectWith(altered(before.public, view => { view.versions.protocolVersion = 2; }));
  assert.deepEqual(brief(session.getState()), ['connecting', null, 'incompatible-protocol']);
  await fake.deliver(before.public);
  assert.deepEqual(brief(session.getState()), ['live', 10, null]);
});

test('an unreadable update keeps the last good view and is cleared by the next good one', async () => {
  const { fake, session } = setup('public');
  session.start();
  await fake.connectWith(before.public);
  await fake.deliver({ nonsense: true });
  assert.deepEqual(brief(session.getState()), ['live', 10, 'unreadable-update']);
  await fake.deliver(altered(before.public, view => { view.viewRevision += 1; }));
  assert.deepEqual(brief(session.getState()), ['live', 11, null]);
});

test('the table session never holds a player view, whatever the feed sends', async () => {
  const { fake, session } = setup('public');
  session.start();
  await fake.connectWith(before.officer);
  assert.deepEqual(brief(session.getState()), ['connecting', null, 'unreadable-update']);
  await fake.deliver(before.public);
  await fake.deliver(afterRegistration.officer);
  assert.equal(JSON.stringify(session.getState().view).includes('Officer'), false);
  assert.equal('self' in session.getState().view, false);
});

test('an integrity failure is permanent for the session: later data is not trusted again', async () => {
  for (const bad of [
    before.target,
    altered(afterRegistration.officer, view => { view.self.role = 'Insider'; }),
    altered(afterRegistration.officer, view => { view.matchId = 'another-match'; }),
    altered(afterRegistration.officer, view => { view.versions.engineVersion = 'changed'; }),
    altered(before.officer, view => { view.self.shotAvailable = false; }),
  ]) {
    const { fake, session } = setup();
    session.start();
    await fake.connectWith(before.officer);
    await fake.deliver(bad);
    assert.deepEqual(brief(session.getState()), ['live', 20, 'integrity']);
    await fake.deliver(afterRegistration.officer);
    assert.equal(session.getState().problem, 'integrity');
    session.reconnect();
    await fake.connectWith(afterRegistration.officer);
    assert.equal(session.getState().problem, 'integrity');
  }
});

test('reconnect resubscribes once, keeps the seat pinned and ignores the feed it replaced', async () => {
  const { host, fake, session } = setup();
  const captured = [];
  const subscribe = fake.transport.subscribe.bind(fake.transport);
  fake.transport.subscribe = listener => {
    captured.push(listener);
    return subscribe(listener);
  };
  session.start();
  await fake.connectWith(before.officer);
  session.reconnect();
  assert.deepEqual([fake.calls.subscribe, fake.calls.unsubscribe, fake.subscribers()], [2, 1, 1]);
  assert.deepEqual(brief(session.getState()), ['stale', 20, null]);

  // A transport that wrongly keeps calling the old listener cannot move the session.
  captured[0].onConnectionChange('connected');
  captured[0].onPayload(structuredClone(afterRegistration.officer));
  await flush();
  assert.deepEqual(brief(session.getState()), ['stale', 20, null]);

  await fake.connectWith(before.target);
  assert.equal(session.getState().problem, 'integrity', 'Another seat is refused after a reconnect too');
  void host;
});

test('the countdown clock is calibrated from the server as soon as the feed connects', async () => {
  const { host, fake, session } = setup();
  session.start();
  assert.deepEqual(session.readClock(), { status: 'unsynced' });
  await fake.connect();
  assert.equal(fake.calls.serverTime, 1, 'An immediate answer is tight enough; no further samples are taken');
  assert.deepEqual(session.readClock(), { status: 'synced', serverNowMs: SERVER_EPOCH, uncertaintyMs: 0 });
  await host.advance(12_345);
  assert.equal(session.readClock().serverNowMs, SERVER_EPOCH + 12_345);
});

test('on a slow link up to three samples are taken and the tightest is kept', async () => {
  const { host, fake, session } = setup();
  let delay = 900;
  fake.respond.serverTime = () => new Promise(resolve => {
    const roundTrip = delay;
    delay = Math.max(300, delay - 300);
    host.ports.scheduler.setTimeout(() => {
      const serverTimeMs = host.serverNow();
      host.ports.scheduler.setTimeout(() => resolve({ protocolVersion: 1, serverTimeMs }), roundTrip / 2);
    }, roundTrip / 2);
  });
  session.start();
  await fake.connect();
  await host.advance(900 + 600 + 300);
  assert.equal(fake.calls.serverTime, 3);
  const reading = session.readClock();
  assert.equal(reading.uncertaintyMs, 150);
  assert.equal(reading.serverNowMs, host.serverNow());
  await host.advance(60_000);
  assert.equal(fake.calls.serverTime, 3, 'No further requests once synchronized');
});

test('a safe error from the time endpoint still calibrates the clock', async () => {
  const { host, fake, session } = setup();
  fake.respond.serverTime = async () => ({ ok: false, serverTimeMs: host.serverNow(), error: { code: 'UNAVAILABLE' } });
  session.start();
  await fake.connect();
  assert.equal(session.readClock().status, 'synced');
});

test('when the time endpoint is unreachable the session retries with backoff while connected', async () => {
  const { host, fake, session } = setup('public', { timing: { clockRetryMs: 1_000, clockRetryMaxMs: 4_000 } });
  fake.respond.serverTime = () => Promise.reject(new Error('offline'));
  session.start();
  await fake.connect();
  assert.equal(fake.calls.serverTime, 1);
  const attemptsAfter = async ms => { await host.advance(ms); return fake.calls.serverTime; };
  assert.equal(await attemptsAfter(999), 1);
  assert.equal(await attemptsAfter(1), 2);
  assert.equal(await attemptsAfter(2_000), 3);
  assert.equal(await attemptsAfter(4_000), 4);
  assert.equal(await attemptsAfter(4_000), 5, 'Backoff is capped');
  assert.deepEqual(session.readClock(), { status: 'unsynced' });

  fake.respond.serverTime = async () => ({ protocolVersion: 1, serverTimeMs: host.serverNow() });
  await host.advance(4_000);
  assert.equal(session.readClock().status, 'synced');
  assert.equal(host.pendingTimers(), 0);

  await fake.disconnect();
  await fake.connect();
  fake.respond.serverTime = () => Promise.reject(new Error('offline'));
  session.resyncClock();
  await flush();
  await fake.disconnect();
  const calls = fake.calls.serverTime;
  await host.advance(60_000);
  assert.equal(fake.calls.serverTime, calls, 'No retries while the feed is down');
  assert.equal(host.pendingTimers(), 0);
});

test('reconnecting discards the old estimate, because local time may have stood still', async () => {
  const { host, fake, session, notifications } = setup();
  session.start();
  await fake.connectWith(before.officer);
  await fake.disconnect();
  assert.equal(session.readClock().status, 'synced', 'The estimate keeps running through a short drop');

  host.sleepDevice(40_000);
  let release;
  fake.respond.serverTime = () => new Promise(resolve => { release = () => resolve({ protocolVersion: 1, serverTimeMs: host.serverNow() }); });
  const revision = session.getState().clockRevision;
  await fake.connect();
  assert.deepEqual(session.readClock(), { status: 'unsynced' }, 'Shown as syncing rather than as a wrong time');
  assert.equal(session.getState().clockRevision > revision, true);
  release();
  await flush();
  assert.equal(session.readClock().serverNowMs, SERVER_EPOCH + 40_000);
  assert.equal(notifications.at(-1).clockRevision, session.getState().clockRevision);
});

test('returning to the foreground re-measures server time', async () => {
  const { host, fake, session } = setup();
  session.start();
  await fake.connectWith(before.officer);
  host.sleepDevice(25_000);
  assert.equal(session.readClock().serverNowMs, SERVER_EPOCH, 'Stale until asked to re-measure');
  session.resyncClock();
  assert.deepEqual(session.readClock(), { status: 'unsynced' });
  await flush();
  assert.equal(session.readClock().serverNowMs, SERVER_EPOCH + 25_000);
  assert.equal(session.getState().connection, 'live', 'Re-measuring time does not disturb the view');
});

test('a session only reads: it never submits a command, looks up a receipt or advances a phase', async () => {
  const { host, fake, session } = setup();
  session.start();
  await fake.connectWith(before.officer);
  await fake.deliver(afterRegistration.officer);
  await fake.disconnect();
  await fake.connectWith(afterRegistration.officer);
  session.resyncClock();
  await host.advance(120_000);
  assert.deepEqual([fake.calls.submitCommand, fake.calls.lookupReceipt, fake.calls.advanceIfExpired], [[], [], []]);
});

test('subscribers are told about every change once, and can unsubscribe', async () => {
  const { fake, session, notifications } = setup();
  let extra = 0;
  const stop = session.subscribe(() => { extra += 1; });
  session.start();
  await fake.connectWith(before.officer);
  const seen = extra;
  assert.equal(seen > 0, true);
  stop();
  await fake.deliver(afterRegistration.officer);
  assert.equal(extra, seen);
  assert.deepEqual(notifications.at(-1), session.getState());
  await fake.deliver(afterRegistration.officer);
  assert.equal(notifications.at(-1), session.getState(), 'State keeps its identity when nothing changed');
});

test('dispose stops the feed, cancels timers and ignores anything still in flight', async () => {
  const { host, fake, session, notifications } = setup('player', { timing: { clockRetryMs: 500 } });
  let release;
  fake.respond.serverTime = () => new Promise(resolve => { release = resolve; });
  session.start();
  await fake.connect();
  assert.equal(host.pendingTimers(), 1, 'The pending time request holds its timeout');
  const count = notifications.length;
  const state = session.getState();
  session.dispose();
  session.dispose();
  assert.deepEqual([fake.calls.unsubscribe, fake.subscribers(), host.pendingTimers()], [1, 0, 0]);
  release({ protocolVersion: 1, serverTimeMs: host.serverNow() });
  await flush();
  await host.advance(120_000);
  session.start();
  session.reconnect();
  session.resyncClock();
  assert.equal(fake.calls.subscribe, 1);
  assert.equal(session.getState(), state);
  assert.equal(notifications.length, count);
  assert.deepEqual(session.readClock(), { status: 'unsynced' });
});

test('timing defaults are client-side technical values, overridable per session', () => {
  assert.deepEqual(DEFAULT_SESSION_TIMING, { apiTimeoutMs: 8_000, clockSamples: 3, clockGoodEnoughMs: 100, clockRetryMs: 2_000, clockRetryMaxMs: 30_000 });
});
