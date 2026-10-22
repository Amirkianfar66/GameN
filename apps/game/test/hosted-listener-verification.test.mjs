import assert from 'node:assert/strict';
import test from 'node:test';
import { createListenerVerification, CREDENTIAL_REFRESH_INTERVAL_MS, hostedListenerFailure, listenWithVerification } from '../dist/browser/listener-verification.js';
import { flush } from './support/fakes.mjs';

test('hosted permission and identity failures are ambiguous rather than confirmed seat revocation', () => {
  assert.equal(hostedListenerFailure({ code: 'permission-denied' }), 'authorization-uncertain');
  assert.equal(hostedListenerFailure({ code: 'unauthenticated' }), 'authorization-uncertain');
  assert.equal(hostedListenerFailure({ code: 'unavailable' }), 'failed');
});

test('reconnecting after denial refreshes credentials once before opening concurrent listeners', async () => {
  let refreshes = 0, finishRefresh;
  const verification = createListenerVerification(() => {
    refreshes += 1;
    return new Promise(resolve => { finishRefresh = resolve; });
  });
  const opened = [], delivered = [], failures = [];
  const open = (deliver, fail) => { const record = { deliver, fail, stopped: false }; opened.push(record); return () => { record.stopped = true; }; };
  const listener = { onSnapshot: value => delivered.push(value), onError: reason => failures.push(reason) };
  const stopFirst = listenWithVerification(verification, open, listener);
  await flush();
  opened[0].fail({ code: 'permission-denied' });
  opened[0].deliver({ value: 'late private data', fresh: true });
  assert.deepEqual(failures, ['authorization-uncertain']);
  assert.deepEqual(delivered, []);
  stopFirst();
  const stopSecond = listenWithVerification(verification, open, listener);
  const stopThird = listenWithVerification(verification, open, listener);
  await flush();
  assert.equal(refreshes, 1);
  assert.equal(opened.length, 1, 'Neither listener opens with unverified credentials');
  stopThird();
  finishRefresh();
  await flush();
  assert.equal(opened.length, 2, 'A cancelled listener stays cancelled through refresh');
  opened[1].deliver({ value: 'fresh authorized data', fresh: true });
  assert.deepEqual(delivered, [{ value: 'fresh authorized data', fresh: true }]);
  stopSecond();
});

test('failed re-attestation keeps the listener closed and permits a later successful refresh', async () => {
  let unavailable = true, opens = 0;
  const verification = createListenerVerification(async () => { if (unavailable) throw new Error('attestation unavailable'); });
  verification.invalidate();
  const errors = [];
  const open = () => { opens += 1; return () => {}; };
  const listener = { onSnapshot() {}, onError: error => errors.push(error) };
  listenWithVerification(verification, open, listener);
  await flush();
  assert.equal(opens, 0);
  assert.deepEqual(errors, ['authorization-uncertain']);
  unavailable = false;
  const stop = listenWithVerification(verification, open, listener);
  await flush();
  assert.equal(opens, 1);
  stop();
});

/** Opens a listener, lets it be refused, and says how many refreshes of credentials there have been by then. */
async function refusedOnce(verification, refreshes) {
  const opened = [];
  const stop = listenWithVerification(verification, (deliver, fail) => { opened.push(fail); return () => {}; }, { onSnapshot() {}, onError() {} });
  await flush();
  assert.equal(opened.length, 1, 'The listener is opened');
  opened[0]({ code: 'permission-denied' });
  stop();
  return refreshes();
}

test('a listener the rules keep refusing costs one refresh of credentials for each interval, not one for each try', async () => {
  let at = 1_000_000, refreshes = 0;
  const verification = createListenerVerification(async () => { refreshes += 1; }, { now: () => at });
  // A display that the host has not admitted yet, asking every second and a half for ten minutes.
  const counts = [];
  for (let attempt = 0; attempt < 400; attempt += 1) {
    counts.push(await refusedOnce(verification, () => refreshes));
    at += 1_500;
  }
  assert.equal(counts[0], 0, 'The first listener opens with the credentials the page has');
  assert.equal(counts[1], 1, 'The first denial is answered with fresh credentials');
  assert.equal(counts[199], 1, 'and for the rest of the interval with those');
  assert.equal(refreshes, Math.ceil((400 * 1_500) / CREDENTIAL_REFRESH_INTERVAL_MS), 'Ten minutes of denials: one refresh for each interval that began');
  assert.equal(CREDENTIAL_REFRESH_INTERVAL_MS, 5 * 60_000);
});

test('once the interval is over a denial is answered with fresh credentials again, before the listener opens', async () => {
  let at = 0, refreshes = 0, finish = null;
  const verification = createListenerVerification(() => { refreshes += 1; return new Promise(resolve => { finish = resolve; }); }, { now: () => at, minIntervalMs: 60_000 });
  verification.invalidate();
  let opens = 0;
  const open = () => { opens += 1; return () => {}; };
  const listener = { onSnapshot() {}, onError() {} };
  listenWithVerification(verification, open, listener);
  await flush();
  assert.deepEqual([refreshes, opens], [1, 0], 'Not opened before the refresh is done');
  finish();
  await flush();
  assert.equal(opens, 1);
  // Refused again 59 seconds later: no new refresh, the listener opens with what it has.
  at = 59_000;
  verification.invalidate();
  listenWithVerification(verification, open, listener);
  await flush();
  assert.deepEqual([refreshes, opens], [1, 2]);
  // And again once the minute is over: refreshed first.
  at = 60_000;
  listenWithVerification(verification, open, listener);
  await flush();
  assert.deepEqual([refreshes, opens], [2, 2], 'The denial of a minute ago is still owed a refresh');
  finish();
  await flush();
  assert.equal(opens, 3);
});

test('a refresh that failed does not count as one: the next listener asks for it again at once', async () => {
  let at = 0, tries = 0, fails = true;
  const verification = createListenerVerification(async () => { tries += 1; if (fails) throw new Error('attestation unavailable'); }, { now: () => at });
  verification.invalidate();
  const errors = [];
  let opens = 0;
  const listener = { onSnapshot() {}, onError: reason => errors.push(reason) };
  listenWithVerification(verification, () => { opens += 1; return () => {}; }, listener);
  await flush();
  assert.deepEqual([tries, opens, errors], [1, 0, ['authorization-uncertain']]);
  fails = false;
  at += 1_500;
  listenWithVerification(verification, () => { opens += 1; return () => {}; }, listener);
  await flush();
  assert.deepEqual([tries, opens], [2, 1]);
});

test('a denial that arrives while credentials are being refreshed waits for the interval like any other', async () => {
  let at = 0, refreshes = 0, finish = null;
  const verification = createListenerVerification(() => { refreshes += 1; return new Promise(resolve => { finish = resolve; }); }, { now: () => at, minIntervalMs: 60_000 });
  verification.invalidate();
  let opens = 0;
  listenWithVerification(verification, () => { opens += 1; return () => {}; }, { onSnapshot() {}, onError() {} });
  await flush();
  // Another listener is refused before the refresh is done.
  verification.invalidate();
  finish();
  await flush();
  assert.deepEqual([refreshes, opens], [1, 1], 'One refresh, and the listener opens with it');
  at = 60_000;
  listenWithVerification(verification, () => { opens += 1; return () => {}; }, { onSnapshot() {}, onError() {} });
  await flush();
  assert.equal(refreshes, 2, 'The later denial gets its refresh once the interval is over');
});
