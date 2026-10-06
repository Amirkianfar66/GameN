import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readProtocolVersion } from '@mothership/contracts';
import { digestCommand, receiptKey, deadlineTaskId } from '../dist/index.js';
import { makeState, makeRequest } from '../../../packages/engine/test/helpers.mjs';

test('canonical payload digest is key-order independent and binds target and phase', () => {
  const request = makeRequest(makeState());
  const reordered = Object.fromEntries(Object.entries(request).reverse());
  assert.equal(digestCommand(request), digestCommand(reordered));
  assert.notEqual(digestCommand(request), digestCommand({ ...request, command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-3' } }));
  assert.notEqual(digestCommand(request), digestCommand({ ...request, phaseId: 'phase-b' }));
  assert.notEqual(receiptKey('uid-a', 'cmd'), receiptKey('uid-b', 'cmd'));
  assert.equal(deadlineTaskId('match-a', 'phase-a', 'token-a'), deadlineTaskId('match-a', 'phase-a', 'token-a'));
  assert.notEqual(deadlineTaskId('match-a', 'phase-a', 'token-a'), deadlineTaskId('match-a', 'phase-a', 'token-b'));
});

test('protocol probe identifies unsupported versions without trusting their payload', () => {
  assert.equal(readProtocolVersion({ protocolVersion: 2, extra: 'invalid-shape' }), 2);
  assert.equal(readProtocolVersion({ versions: { protocolVersion: 2 } }), 2);
  for (const value of [null, [], {}, { protocolVersion: '1' }, { protocolVersion: 1.5 }, { protocolVersion: 0 }]) assert.equal(readProtocolVersion(value), null);
  assert.equal(readProtocolVersion({ protocolVersion: 1 }), 1);
});
