import assert from 'node:assert/strict';
import test from 'node:test';
import { createListenerVerification, hostedListenerFailure, listenWithVerification } from '../dist/browser/listener-verification.js';
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
