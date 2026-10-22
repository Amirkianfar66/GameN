import assert from 'node:assert/strict';
import test from 'node:test';
import { FullSetPracticeBotsResponseSchema } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';

const request = { schemaVersion: 1, protocolVersion: 2, requestId: 'practice-request', matchId: 'practice-match', botCount: 6 };
const db = new Proxy({}, { get() { assert.fail('Invalid bot input reached storage'); } });

test('practice configuration rejects spoofed identity, versions and invalid counts before storage', async () => {
  const service = createV1Service({ db, clock: () => 100 });
  for (const [uid, payload, code] of [
    ['', request, 'UNAUTHENTICATED'], ['bad/path', request, 'UNAUTHENTICATED'],
    ['host', { ...request, schemaVersion: 2 }, 'UNSUPPORTED_SCHEMA'],
    ['host', { ...request, protocolVersion: 1 }, 'UNSUPPORTED_PROTOCOL'],
    ['host', { ...request, botCount: -1 }, 'INVALID_REQUEST'],
    ['host', { ...request, botCount: 10 }, 'INVALID_REQUEST'],
    ['host', { ...request, botCount: 1.5 }, 'INVALID_REQUEST'],
    ['host', { ...request, uid: 'another-host' }, 'INVALID_REQUEST'],
    ['host', { ...request, seatId: 'seat-1' }, 'INVALID_REQUEST'],
    ['host', { ...request, matchId: 'bad/path' }, 'INVALID_REQUEST'],
  ]) {
    const response = FullSetPracticeBotsResponseSchema.parse(await service.setPracticeBots(uid, payload));
    assert.equal(response.ok, false);
    assert.equal(response.error.code, code);
  }
});

test('server bot runner rejects unbounded or malformed invocations before storage', async () => {
  const service = createV1Service({ db, clock: () => 100 });
  for (const [matchId, limit] of [['bad/path', 18], ['practice-match', 0], ['practice-match', 19], ['practice-match', 1.5], ['practice-match', Infinity]]) {
    assert.deepEqual(await service.runPracticeBots(matchId, { limit }), { status: 'blocked', processed: 0 });
  }
});
