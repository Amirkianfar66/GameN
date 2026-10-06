import assert from 'node:assert/strict';
import test from 'node:test';
import { createLifecycleRequests, DURABLE_FIELDS } from '../dist/index.js';

// The one rule the lifecycle operations share: a request is made once and sent again as it
// is until the server has settled it. Synthetic answers, scripted here; no backend.

const sample = { serverTimeMs: 1, requestedAt: 0, receivedAt: 0 };
const done = result => ({ kind: 'done', result, sample });
const failure = (code, retryAfterMs = null) => ({ kind: 'api-failure', code, retryAfterMs, sample });
const silence = (reason = 'timeout') => ({ kind: 'no-response', reason });

/** A registry with identifiers that count up, a clock that is moved by hand, and a recorder of what was sent. */
function setup(stored = undefined) {
  let next = 0;
  let now = 1_000;
  const saved = [];
  const store = { load: () => stored, save: value => saved.push(JSON.parse(JSON.stringify(value))) };
  const requests = createLifecycleRequests({ ids: { next: () => `request-${(next += 1)}` }, clock: { now: () => now }, store });
  const sent = [];
  const answers = [];
  const built = [];
  /** Presses a control: what was entered goes into a request only if none is kept. */
  const press = (key, entered, options) => requests.send(key, requestId => {
    built.push(requestId);
    return { protocolVersion: 2, requestId, ...entered };
  }, async request => {
    sent.push(request);
    const answer = answers.shift();
    if (answer === undefined) throw new Error('No answer was scripted');
    if (answer instanceof Error) throw answer;
    return typeof answer === 'function' ? answer() : answer;
  }, options);
  return { requests, press, sent, answers, built, saved, advance: ms => { now += ms; } };
}

test('a request is made once from what was entered, and a settled one is forgotten', async () => {
  const s = setup();
  s.answers.push(done({ seatId: 'seat-3' }));
  const first = await s.press('seat', { matchId: 'm', seatId: 'seat-3' });
  assert.deepEqual(first, { kind: 'done', request: { protocolVersion: 2, requestId: 'request-1', matchId: 'm', seatId: 'seat-3' }, result: { seatId: 'seat-3' } });
  assert.equal(s.requests.unsettled('seat'), null);
  // The next press is a new request, with a new identifier and what is entered now.
  s.answers.push(done({ seatId: 'seat-5' }));
  const second = await s.press('seat', { matchId: 'm', seatId: 'seat-5' });
  assert.deepEqual([second.kind, second.request.requestId, second.request.seatId], ['done', 'request-2', 'seat-5']);
  assert.deepEqual(s.built, ['request-1', 'request-2']);
});

test('with no answer, the very same request goes again, whatever is entered by then', async () => {
  for (const reason of ['timeout', 'transport-error', 'unreadable-response', 'cancelled']) {
    const s = setup();
    s.answers.push(silence(reason), silence(reason), done(true));
    const first = await s.press('redeem', { matchId: 'match-one', recoveryToken: 'code-one' });
    assert.deepEqual([first.kind, first.why, first.code, first.retryAfterMs], ['unsettled', 'no-answer', null, null], reason);
    assert.deepEqual(s.requests.unsettled('redeem'), { request: first.request, unanswered: true });
    // The person has changed both fields. What goes is what was asked the first time.
    const second = await s.press('redeem', { matchId: 'another-match', recoveryToken: 'code-two' });
    const third = await s.press('redeem', { matchId: 'a-third', recoveryToken: 'code-three' });
    assert.deepEqual(s.sent, [first.request, first.request, first.request]);
    assert.equal(s.sent.every(request => request.requestId === 'request-1' && request.matchId === 'match-one' && request.recoveryToken === 'code-one'), true);
    assert.deepEqual(s.built, ['request-1'], 'Nothing was built from the later entries');
    assert.equal(second.kind, 'unsettled');
    // The answer belongs to the request that was kept, and says so.
    assert.deepEqual(third, { kind: 'done', request: first.request, result: true });
    assert.equal(s.requests.unsettled('redeem'), null);
  }
});

test('a refusal settles a request only if every earlier attempt of it was answered', async () => {
  // Answered every time: the refusal is the server's decision on this request.
  const clean = setup();
  clean.answers.push(failure('FORBIDDEN'), done(true));
  const refused = await clean.press('issue', { matchId: 'm', seatId: 'seat-3' });
  assert.deepEqual([refused.kind, refused.code, refused.request.requestId], ['refused', 'FORBIDDEN', 'request-1']);
  assert.equal(clean.requests.unsettled('issue'), null);
  assert.equal((await clean.press('issue', { matchId: 'm', seatId: 'seat-3' })).request.requestId, 'request-2', 'A new press is a new request');

  // After an attempt that got no answer, a refusal says nothing about that attempt.
  for (const code of ['FORBIDDEN', 'UNAUTHENTICATED', 'INVALID_REQUEST', 'CONFLICT']) {
    const s = setup();
    s.answers.push(silence(), failure(code), failure(code), done({ recoveryToken: null }));
    await s.press('issue', { matchId: 'm', seatId: 'seat-3' });
    const after = await s.press('issue', { matchId: 'm', seatId: 'seat-3' });
    assert.deepEqual([after.kind, after.why, after.code], ['unsettled', 'refused-after-no-answer', code]);
    assert.deepEqual(s.requests.unsettled('issue'), { request: after.request, unanswered: true }, 'The request is kept');
    await s.press('issue', { matchId: 'm', seatId: 'seat-5' });
    const last = await s.press('issue', { matchId: 'm', seatId: 'seat-5' });
    assert.equal(last.kind, 'done');
    assert.deepEqual(s.sent.map(request => [request.requestId, request.seatId]), Array.from({ length: 4 }, () => ['request-1', 'seat-3']), code);
  }
});

test('“unavailable” and “slow down” settle nothing, and nothing is sent before the wait the server named is over', async () => {
  for (const code of ['UNAVAILABLE', 'RATE_LIMITED']) {
    const s = setup();
    s.answers.push(failure(code, 3_000), done(true));
    const first = await s.press('start', { matchId: 'm' });
    assert.deepEqual([first.kind, first.why, first.code, first.retryAfterMs], ['unsettled', 'not-now', code, 3_000]);
    assert.deepEqual(s.requests.unsettled('start'), { request: first.request, unanswered: false });
    // Pressed too soon: nothing leaves the device, and the press is told how long is left.
    s.advance(1_000);
    const early = await s.press('start', { matchId: 'm' });
    assert.deepEqual([early.kind, early.why, early.code, early.retryAfterMs], ['unsettled', 'not-now', null, 2_000]);
    assert.equal(s.sent.length, 1);
    s.advance(2_000);
    const late = await s.press('start', { matchId: 'm' });
    assert.deepEqual([late.kind, s.sent.length, s.sent[1].requestId], ['done', 2, 'request-1']);
  }
  // Without a named wait the same request can go again at once.
  const s = setup();
  s.answers.push(failure('UNAVAILABLE'), done(true));
  await s.press('start', { matchId: 'm' });
  assert.equal((await s.press('start', { matchId: 'm' })).kind, 'done');
  // A refusal after “unavailable”, with no attempt unanswered, settles it: every attempt was answered.
  const answered = setup();
  answered.answers.push(failure('UNAVAILABLE'), failure('FORBIDDEN'));
  await answered.press('start', { matchId: 'm' });
  assert.equal((await answered.press('start', { matchId: 'm' })).kind, 'refused');
  assert.equal(answered.requests.unsettled('start'), null);
});

test('a second press while the first is on its way sends nothing, and one key does not hold up another', async () => {
  const s = setup();
  let release;
  s.answers.push(() => new Promise(resolve => { release = () => resolve(done(true)); }), done('other'));
  const first = s.press('approve seat-1', { matchId: 'm' });
  assert.deepEqual(await s.press('approve seat-1', { matchId: 'm' }), { kind: 'busy' });
  assert.equal(s.sent.length, 1);
  // Nothing is given up while a send for the key is on its way.
  assert.equal(s.requests.abandon('approve seat-1'), false);
  assert.notEqual(s.requests.unsettled('approve seat-1'), null);
  assert.equal((await s.press('approve seat-2', { matchId: 'm' })).result, 'other');
  release();
  assert.equal((await first).kind, 'done');
  assert.equal(s.requests.unsettled('approve seat-1'), null);
});

test('a request the client core will not send leaves nothing behind', async () => {
  const s = setup();
  s.answers.push(new TypeError('Not a request the protocol allows'), done(true));
  assert.deepEqual(await s.press('join', { roomCode: 'nonsense' }), { kind: 'invalid' });
  assert.equal(s.requests.unsettled('join'), null);
  assert.equal((await s.press('join', { roomCode: '0123456789AB' })).request.requestId, 'request-2');
});

test('giving a request up forgets it, and the next press is a new request', async () => {
  const s = setup();
  s.answers.push(silence(), done(true));
  await s.press('redeem', { matchId: 'm', recoveryToken: 'code-one' });
  assert.equal(s.requests.abandon('redeem'), true);
  assert.equal(s.requests.unsettled('redeem'), null);
  const next = await s.press('redeem', { matchId: 'm', recoveryToken: 'code-two' });
  assert.deepEqual([next.kind, next.request.requestId, next.request.recoveryToken], ['done', 'request-2', 'code-two']);
  assert.equal(s.requests.abandon('nothing-kept'), true);
});

test('a durable request outlives a reload as identifiers only, and goes again as it was', async () => {
  assert.deepEqual(DURABLE_FIELDS, ['protocolVersion', 'matchId', 'requestId', 'seatId']);
  const s = setup();
  s.answers.push(silence());
  const first = await s.press('issue', { matchId: 'm', seatId: 'seat-3' }, { durable: true });
  const written = { issue: { request: { protocolVersion: 2, requestId: 'request-1', matchId: 'm', seatId: 'seat-3' }, unanswered: true } };
  assert.deepEqual(s.saved.at(-1), written);
  assert.deepEqual(s.saved[0], { issue: { request: first.request, unanswered: false } }, 'It is written before it is sent');

  // The page is reloaded: a new registry, the same store. The same request goes again.
  const reloaded = setup(written);
  assert.deepEqual(reloaded.requests.unsettled('issue'), written.issue);
  reloaded.answers.push(failure('FORBIDDEN'), done({ seatId: 'seat-3', recoveryToken: null, expiresAt: 5 }));
  // Still unaccounted for across the reload: a refusal does not settle it.
  assert.equal((await reloaded.press('issue', { matchId: 'm', seatId: 'seat-6' }, { durable: true })).why, 'refused-after-no-answer');
  const replayed = await reloaded.press('issue', { matchId: 'm', seatId: 'seat-6' }, { durable: true });
  assert.deepEqual([replayed.kind, replayed.request, replayed.result.recoveryToken], ['done', written.issue.request, null]);
  assert.deepEqual(reloaded.built, [], 'Nothing was built: the request from before the reload is what went');
  assert.deepEqual(reloaded.saved.at(-1), {}, 'Settled, it is taken out of the store');
});

test('nothing but identifiers is ever written down, whatever was asked for', async () => {
  // A recovery code, a room code, a display identifier, a text of any kind: kept in memory only.
  for (const entered of [{ matchId: 'm', recoveryToken: 'a-secret-code' }, { roomCode: '0123456789AB', initialRoom: 'Room A' }, { matchId: 'm', displayUid: 'device' }, { matchId: 'm', seatId: 'seat-3', note: 'x' }, { matchId: 'm', seatId: { nested: 'seat-3' } }]) {
    const s = setup();
    s.answers.push(silence());
    await s.press('anything', entered, { durable: true });
    assert.notEqual(s.requests.unsettled('anything'), null, 'It is kept in memory');
    assert.equal(s.saved.every(value => JSON.stringify(value) === '{}'), true, JSON.stringify(entered));
  }
  // A request that was not marked durable is not written either, and does not disturb one that was.
  const s = setup();
  s.answers.push(silence(), silence());
  await s.press('issue', { matchId: 'm', seatId: 'seat-3' }, { durable: true });
  await s.press('end', { matchId: 'm' });
  assert.deepEqual(Object.keys(s.saved.at(-1)), ['issue']);
});

test('what the store holds is not trusted: anything that is not a record of identifiers is ignored', async () => {
  for (const stored of [null, 'text', 7, [], { issue: null }, { issue: 'x' }, { issue: { request: null } }, { issue: { request: { matchId: 'm', recoveryToken: 'planted' } } }, { issue: { request: { matchId: ['m'] } } }]) {
    const s = setup(stored);
    assert.equal(s.requests.unsettled('issue'), null, JSON.stringify(stored));
  }
  // A stored request the client core will not send is dropped at the first press, and nothing is sent.
  const s = setup({ issue: { request: { protocolVersion: 2, requestId: 'not a request the protocol allows', matchId: 'm', seatId: 'seat-3' }, unanswered: true } });
  s.answers.push(new TypeError('refused by the client core'));
  assert.deepEqual(await s.press('issue', { matchId: 'm', seatId: 'seat-3' }, { durable: true }), { kind: 'invalid' });
  assert.equal(s.requests.unsettled('issue'), null);
  assert.deepEqual(s.saved.at(-1), {});
  // “Unanswered” is believed only when it is exactly true.
  assert.equal(setup({ issue: { request: { matchId: 'm' }, unanswered: 'yes' } }).requests.unsettled('issue').unanswered, false);
});
