import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeadlineCatchUp, DEFAULT_CATCH_UP_TIMING } from '@mothership/game';
import { createFakeHost, flush } from './support/fakes.mjs';

// Deadline catch-up against a scripted API. No backend is involved: these tests pin when
// this client asks the server to look at a deadline, and that asking is all it does.

const T = DEFAULT_CATCH_UP_TIMING;
const MATCH = 'catch-up-match';
const running = (phaseId = 'phase-one', change = {}) => ({ phaseId, current: true, expired: false, foreground: true, ...change });
const ended = (phaseId = 'phase-one', change = {}) => running(phaseId, { expired: true, ...change });

function setup({ order = 0, timing } = {}) {
  const host = createFakeHost();
  const asked = [];
  const s = {
    host,
    asked,
    /** What the scripted server answers. Replace in a test. */
    answer: async () => ({ kind: 'unchanged' }),
    times: () => asked.map(call => call.at - asked[0].at),
  };
  s.catchUp = createDeadlineCatchUp({
    api: {
      advance(matchId, phaseId) {
        asked.push({ matchId, phaseId, at: host.localNow() });
        return s.answer(phaseId);
      },
    },
    ports: host.ports, matchId: MATCH, order, timing,
  });
  return s;
}

test('nothing is asked while a phase is running, or by a device with no view', async () => {
  const s = setup();
  s.catchUp.observe(running());
  await s.host.advance(120_000);
  s.catchUp.observe({ phaseId: null, current: false, expired: false, foreground: true });
  await s.host.advance(120_000);
  assert.deepEqual(s.asked, []);
  assert.equal(s.host.pendingTimers(), 0, 'and nothing is waiting to ask');
});

test('a display asks once, shortly after its own countdown ended, naming the match and the phase on its screen', async () => {
  const s = setup();
  const endedAt = s.host.localNow();
  s.catchUp.observe(ended());
  await s.host.advance(T.firstDelayMs - 1);
  assert.deepEqual(s.asked, [], 'Not at the instant the countdown reaches zero');
  await s.host.advance(1);
  assert.deepEqual(s.asked, [{ matchId: MATCH, phaseId: 'phase-one', at: endedAt + T.firstDelayMs }]);
  // Told again and again that the phase has ended, as every redraw does, it does not ask again for that.
  for (let redraw = 0; redraw < 5; redraw += 1) s.catchUp.observe(ended());
  await flush();
  assert.equal(s.asked.length, 1);
});

test('a phone waits longer than a display, and each seat a different time', async () => {
  const waits = [];
  for (const order of [0, 1, 2, 9]) {
    const s = setup({ order });
    const endedAt = s.host.localNow();
    s.catchUp.observe(ended());
    await s.host.advance(60_000);
    waits.push(s.asked[0].at - endedAt);
  }
  assert.deepEqual(waits, [T.firstDelayMs, T.playerDelayMs, T.playerDelayMs + T.seatStaggerMs, T.playerDelayMs + 8 * T.seatStaggerMs]);
  assert.equal(new Set(waits).size, 4);
  assert.equal(waits.every((wait, index) => index === 0 || wait > waits[index - 1]), true, 'The display first, then the seats in order');

  // Asking again is spread out by seat as well, so phones that got the same answer do not come back together.
  const again = [];
  for (const order of [0, 2, 5]) {
    const s = setup({ order });
    s.catchUp.observe(ended());
    await s.host.advance(60_000);
    again.push(s.times().slice(0, 3));
  }
  assert.deepEqual(again, [[0, 1_000, 3_000], [0, 1_000 + 2 * T.seatStaggerMs, 3_000 + 4 * T.seatStaggerMs], [0, 1_000 + 5 * T.seatStaggerMs, 3_000 + 10 * T.seatStaggerMs]]);
});

test('a phase that moves on before the wait is over is never asked about', async () => {
  const s = setup({ order: 3 });
  s.catchUp.observe(ended('phase-one'));
  await s.host.advance(T.playerDelayMs);
  // Another device, or the backend's own job, got there first: the next view is here.
  s.catchUp.observe(running('phase-two'));
  await s.host.advance(120_000);
  assert.deepEqual(s.asked, []);
  assert.equal(s.host.pendingTimers(), 0);
});

test('a view the server has not confirmed, or a page that is not in front, asks nothing; the wait starts when both hold', async () => {
  const s = setup();
  s.catchUp.observe(ended('phase-one', { current: false }));
  await s.host.advance(60_000);
  s.catchUp.observe(ended('phase-one', { foreground: false }));
  await s.host.advance(60_000);
  assert.deepEqual(s.asked, [], 'A stale countdown reaching zero is not a reason to ask');
  s.catchUp.observe(ended());
  await s.host.advance(T.firstDelayMs - 1);
  // The connection drops during the wait: the wait is called off.
  s.catchUp.observe(ended('phase-one', { current: false }));
  await s.host.advance(60_000);
  assert.deepEqual(s.asked, []);
  s.catchUp.observe(ended());
  await s.host.advance(T.firstDelayMs);
  assert.equal(s.asked.length, 1);
});

test('"unchanged" and "advanced" both mean: wait for the view. It asks again only after growing waits, and stops when the next phase arrives', async () => {
  for (const kind of ['unchanged', 'advanced']) {
    const s = setup();
    s.answer = async () => ({ kind });
    s.catchUp.observe(ended());
    await s.host.advance(T.firstDelayMs + 1_000 + 2_000 + 4_000 + 8_000 + 15_000 + 15_000);
    assert.deepEqual(s.times(), [0, 1_000, 3_000, 7_000, 15_000, 30_000, 45_000], `${kind}: the waits grow and the last one repeats`);
    assert.equal(s.asked.every(call => call.phaseId === 'phase-one'), true);
    s.catchUp.observe(running('phase-two'));
    await s.host.advance(120_000);
    assert.equal(s.asked.length, 7, 'The next phase ends the asking');
  }
});

test('no answer, and an API that throws, are waited out the same way', async () => {
  for (const answer of [async () => ({ kind: 'no-response', reason: 'timeout' }), async () => { throw new Error('transport'); }, async () => ({ kind: 'api-failure', code: 'UNAVAILABLE', retryAfterMs: null })]) {
    const s = setup();
    s.answer = answer;
    s.catchUp.observe(ended());
    await s.host.advance(T.firstDelayMs + 999);
    assert.equal(s.asked.length, 1);
    await s.host.advance(1);
    assert.equal(s.asked.length, 2);
  }
});

test('a wait the server names is a minimum, and this device’s own wait never shortens it', async () => {
  const long = setup();
  long.answer = async () => ({ kind: 'api-failure', code: 'RATE_LIMITED', retryAfterMs: 5_000 });
  long.catchUp.observe(ended());
  await long.host.advance(T.firstDelayMs + 4_999);
  assert.equal(long.asked.length, 1, 'Nothing during the five seconds the server named');
  await long.host.advance(1);
  assert.equal(long.asked.length, 2);

  const short = setup();
  short.answer = async () => ({ kind: 'api-failure', code: 'RATE_LIMITED', retryAfterMs: 200 });
  short.catchUp.observe(ended());
  await short.host.advance(T.firstDelayMs + 999);
  assert.equal(short.asked.length, 1, 'A shorter one does not make this device ask sooner than it would have');
  await short.host.advance(1);
  assert.equal(short.asked.length, 2);

  const unnamed = setup();
  unnamed.answer = async () => ({ kind: 'api-failure', code: 'RATE_LIMITED', retryAfterMs: null });
  unnamed.catchUp.observe(ended());
  await unnamed.host.advance(T.firstDelayMs + 1_000);
  assert.equal(unnamed.asked.length, 2, 'With no delay named, its own bounded wait applies');
});

test('refused, it stops asking about that phase, and asks about the next one when that ends', async () => {
  for (const code of ['FORBIDDEN', 'UNAUTHENTICATED', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL']) {
    const s = setup();
    s.answer = async () => ({ kind: 'api-failure', code, retryAfterMs: null });
    s.catchUp.observe(ended());
    await s.host.advance(300_000);
    for (let redraw = 0; redraw < 3; redraw += 1) s.catchUp.observe(ended());
    await s.host.advance(300_000);
    assert.equal(s.asked.length, 1, `${code}: one ask, no more`);
    s.catchUp.observe(running('phase-two'));
    s.catchUp.observe(ended('phase-two'));
    await s.host.advance(T.firstDelayMs);
    assert.deepEqual(s.asked.map(call => call.phaseId), ['phase-one', 'phase-two']);
  }
});

test('never two requests at once, and an answer about a phase that is gone starts nothing for it', async () => {
  const s = setup();
  let release = null;
  s.answer = () => new Promise(resolve => { release = resolve; });
  s.catchUp.observe(ended('phase-one'));
  await s.host.advance(T.firstDelayMs);
  assert.equal(s.asked.length, 1);
  // The request is out. Time passes and the screen redraws; nothing else is sent.
  for (let redraw = 0; redraw < 3; redraw += 1) s.catchUp.observe(ended('phase-one'));
  await s.host.advance(60_000);
  assert.equal(s.asked.length, 1);
  // Meanwhile the next phase arrives and, much later, ends too, while the first request is still out.
  s.catchUp.observe(running('phase-two'));
  s.catchUp.observe(ended('phase-two'));
  await s.host.advance(60_000);
  assert.equal(s.asked.length, 1, 'Still one request at a time');
  const answeredAt = s.host.localNow();
  release({ kind: 'unchanged' });
  await flush();
  await s.host.advance(T.firstDelayMs - 1);
  assert.equal(s.asked.length, 1, 'The old answer does not make it ask at once');
  await s.host.advance(1);
  assert.deepEqual(s.asked.map(call => call.phaseId), ['phase-one', 'phase-two']);
  assert.equal(s.asked[1].at, answeredAt + T.firstDelayMs);
});

test('if the view stops being current while the request is out, the answer starts no wait; asking resumes when it is current again', async () => {
  const s = setup();
  let release = null;
  s.answer = () => new Promise(resolve => { release = resolve; });
  s.catchUp.observe(ended());
  await s.host.advance(T.firstDelayMs);
  assert.equal(s.asked.length, 1);
  s.catchUp.observe(ended('phase-one', { current: false }));
  release({ kind: 'unchanged' });
  await flush();
  assert.equal(s.host.pendingTimers(), 0, 'Nothing is planned on a view the server no longer confirms');
  await s.host.advance(120_000);
  assert.equal(s.asked.length, 1);
  // Current again, the same ended phase still on screen: it asks again, after a wait.
  s.answer = async () => ({ kind: 'unchanged' });
  s.catchUp.observe(ended());
  await s.host.advance(999);
  assert.equal(s.asked.length, 1);
  await s.host.advance(1);
  assert.equal(s.asked.length, 2);
});

test('a phase that arrives already ended gets its own wait from the start, not what was left of the last one', async () => {
  const s = setup();
  s.catchUp.observe(ended('phase-one'));
  await s.host.advance(T.firstDelayMs);
  assert.equal(s.asked.length, 1);
  // 100 ms before it would ask about phase one again, phase two arrives, itself already over:
  // a device that was away for a while.
  await s.host.advance(900);
  s.catchUp.observe(ended('phase-two'));
  await s.host.advance(T.firstDelayMs - 1);
  assert.equal(s.asked.length, 1, 'It does not ask about the new phase on the old phase’s schedule');
  await s.host.advance(1);
  assert.deepEqual(s.asked.map(call => call.phaseId), ['phase-one', 'phase-two']);
});

test('disposed, it asks nothing more, and a late answer does nothing', async () => {
  const waiting = setup();
  waiting.catchUp.observe(ended());
  assert.equal(waiting.host.pendingTimers(), 1);
  waiting.catchUp.dispose();
  assert.equal(waiting.host.pendingTimers(), 0, 'The wait is called off at once, not left to run out');
  await waiting.host.advance(120_000);
  assert.deepEqual(waiting.asked, []);
  assert.equal(waiting.host.pendingTimers(), 0);

  const asking = setup();
  let release = null;
  asking.answer = () => new Promise(resolve => { release = resolve; });
  asking.catchUp.observe(ended());
  await asking.host.advance(T.firstDelayMs);
  asking.catchUp.dispose();
  release({ kind: 'unchanged' });
  await flush();
  assert.equal(asking.host.pendingTimers(), 0, 'The late answer starts no new wait');
  asking.catchUp.observe(ended());
  assert.equal(asking.host.pendingTimers(), 0, 'and neither does being told the present again');
  await asking.host.advance(120_000);
  assert.equal(asking.asked.length, 1);
  assert.equal(asking.host.pendingTimers(), 0);
});
