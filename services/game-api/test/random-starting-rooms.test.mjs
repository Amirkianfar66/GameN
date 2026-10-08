import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { FullOperationResponseSchema } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';

const UID = 'synthetic-admission-uid';
const MATCH = 'synthetic-random-room-match';
const CODE = 'ABCDEF123456';
const request = { protocolVersion: 2, requestId: 'synthetic-admission', roomCode: CODE };
const hash = text => createHash('sha256').update(text).digest('hex');
const admissionPath = id => 'matches/' + MATCH + '/admissions/' + id;

// Document-only transaction double: an attempt's writes are atomic and invisible
// until commit. It models callback retry and lost commit acknowledgment, not Rules
// or Firestore contention; the persisted emulator suite covers those boundaries.
function admissionDb({ retryFirst = false, loseFirstAck = false, seed = [] } = {}) {
  const documents = new Map([
    ['roomCodes/' + CODE, { matchId: MATCH }],
    ['matches/' + MATCH + '/control/session', { protocolVersion: 2, status: 'lobby' }],
    ...seed,
  ].map(([path, value]) => [path, structuredClone(value)]));
  const attempts = [];
  let commits = 0, invocations = 0;
  const ref = path => ({
    path, id: path.split('/').at(-1),
    collection: name => collection(path + '/' + name),
  });
  const collection = path => ({ doc: id => ref(path + '/' + id) });
  return {
    documents, attempts, get commits() { return commits; },
    collection,
    async runTransaction(callback) {
      const invocation = invocations++;
      const count = retryFirst && invocation === 0 ? 2 : 1;
      for (let index = 0; index < count; index++) {
        const writes = [], reads = [];
        const attempt = { writes, reads, committed: false };
        attempts.push(attempt);
        const result = await callback({
          async get(reference) {
            reads.push(reference.path);
            const value = documents.get(reference.path);
            return {
              exists: documents.has(reference.path),
              data: () => structuredClone(value),
              get: field => structuredClone(value?.[field]),
            };
          },
          set(reference, value) { writes.push({ kind: 'set', path: reference.path, value: structuredClone(value) }); },
          create(reference, value) { writes.push({ kind: 'create', path: reference.path, value: structuredClone(value) }); },
        });
        if (index + 1 < count) continue; // Discard the whole retryable attempt.
        const next = new Map(documents);
        for (const write of writes) {
          if (write.kind === 'create' && next.has(write.path)) throw new Error('Document already exists');
          next.set(write.path, write.value);
        }
        for (const [path, value] of next) documents.set(path, value);
        attempt.committed = true;
        commits++;
        if (loseFirstAck && invocation === 0) throw new Error('Synthetic lost commit acknowledgment');
        return result;
      }
    },
  };
}

function setup(randomInitialRoom, options) {
  const db = admissionDb(options);
  let draws = 0, now = 10_000;
  const service = createV1Service({
    db, clock: () => now,
    randomInitialRoom: () => { draws++; return randomInitialRoom(); },
  });
  return { db, service, get draws() { return draws; }, advance: () => { now++; } };
}
async function admit(s, payload = request) {
  return FullOperationResponseSchema.parse(await s.service.requestAdmission(UID, payload));
}
const admissionWrites = s => s.db.attempts.flatMap(attempt => attempt.writes)
  .filter(write => write.path.startsWith('matches/' + MATCH + '/admissions/'));

test('omitted and opposite deprecated room values persist the injected server draw', async () => {
  for (const [initialRoom, serverRoom] of [[undefined, 'Room A'], ['Room A', 'Room B'], ['Room B', 'Room A']]) {
    const s = setup(() => serverRoom);
    const payload = initialRoom === undefined ? request : { ...request, initialRoom };
    const response = await admit(s, payload);
    assert.equal(response.ok, true);
    assert.deepEqual(response.result, { matchId: MATCH, admissionId: response.result.admissionId, status: 'pending' });
    assert.deepEqual(s.db.documents.get(admissionPath(response.result.admissionId)), {
      uid: UID, initialRoom: serverRoom, requestedAt: 10_000, status: 'pending',
    });
    assert.equal(s.draws, 1);
    assert.equal(admissionWrites(s).length, 1);
  }
});

test('receipt replay preserves its room; changing or omitting the ignored legacy field still conflicts', async () => {
  const s = setup(() => 'Room B');
  const payload = { ...request, initialRoom: 'Room A' };
  const first = await admit(s, payload);
  assert.equal(first.ok, true);
  const before = structuredClone([...s.db.documents]);
  s.advance();
  const replay = await admit(s, { roomCode: CODE, initialRoom: 'Room A', requestId: request.requestId, protocolVersion: 2 });
  assert.deepEqual(replay, { ...first, serverTimeMs: first.serverTimeMs + 1 });
  for (const candidate of [{ ...payload, initialRoom: 'Room B' }, request]) {
    const refused = await admit(s, candidate);
    assert.equal(refused.ok, false);
    assert.equal(refused.error.code, 'COMMAND_ID_CONFLICT');
  }
  assert.deepEqual([...s.db.documents], before);
  assert.equal(s.draws, 1);
  assert.equal(admissionWrites(s).length, 1);
  assert.ok(s.db.attempts.slice(1).every(attempt => attempt.writes.length === 0));
});

test('an exact pre-upgrade receipt fingerprint replays without drawing or rewriting its original room', async () => {
  const legacy = { protocolVersion: 2, requestId: 'legacy-admission', roomCode: CODE, initialRoom: 'Room A' };
  const admissionId = hash(JSON.stringify([UID, legacy.requestId]));
  // Frozen historical canonical body, including initialRoom. This is deliberately
  // independent of the service's current canonicalization helper.
  const fingerprint = hash('["requestAdmission",{"initialRoom":"Room A","protocolVersion":2,"requestId":"legacy-admission","roomCode":"ABCDEF123456"}]');
  const prior = { ok: true, serverTimeMs: 100, result: { matchId: MATCH, admissionId, status: 'pending' } };
  const receiptPath = 'identityOperations/' + admissionId;
  const s = setup(() => assert.fail('Replay must not consume a new room draw'), { seed: [
    [receiptPath, { uid: UID, operation: 'requestAdmission', digest: fingerprint, response: prior, evaluatedAt: 100 }],
    [admissionPath(admissionId), { uid: UID, initialRoom: 'Room A', requestedAt: 100, status: 'pending' }],
  ] });
  const before = structuredClone([...s.db.documents]);
  assert.deepEqual(await admit(s, legacy), { ...prior, serverTimeMs: 10_000 });
  assert.deepEqual([...s.db.documents], before);
  assert.equal(s.draws, 0);
  assert.deepEqual(s.db.attempts[0].reads, [receiptPath]);
  assert.equal(s.db.attempts[0].writes.length, 0);
});

test('a transaction callback retry reuses one sampled room and commits only one admission', async () => {
  const sequence = ['Room A', 'Room B'];
  const s = setup(() => sequence.shift(), { retryFirst: true });
  const response = await admit(s);
  assert.equal(response.ok, true);
  assert.equal(s.db.attempts.length, 2);
  assert.deepEqual(s.db.attempts.map(attempt => attempt.committed), [false, true]);
  assert.equal(s.db.commits, 1);
  assert.equal(s.draws, 1);
  const writes = admissionWrites(s);
  assert.equal(writes.length, 2);
  assert.ok(writes.every(write => write.value.initialRoom === 'Room A'));
  assert.equal(writes[0].path, writes[1].path);
  assert.equal([...s.db.documents.keys()].filter(path => path.startsWith('matches/' + MATCH + '/admissions/')).length, 1);
  assert.equal(s.db.documents.get(admissionPath(response.result.admissionId)).initialRoom, 'Room A');
});

test('a lost post-commit acknowledgment returns UNAVAILABLE and an identical retry recovers the stored assignment', async () => {
  const s = setup(() => 'Room B', { loseFirstAck: true });
  const first = await admit(s, { ...request, initialRoom: 'Room A' });
  assert.equal(first.ok, false);
  assert.equal(first.error.code, 'UNAVAILABLE');
  assert.equal(s.db.attempts[0].committed, true);
  const writes = admissionWrites(s);
  assert.equal(writes.length, 1);
  const stored = structuredClone(s.db.documents.get(writes[0].path));
  s.advance();
  const replay = await admit(s, { ...request, initialRoom: 'Room A' });
  assert.equal(replay.ok, true);
  assert.equal(admissionPath(replay.result.admissionId), writes[0].path);
  assert.equal(replay.result.status, 'pending');
  assert.deepEqual(s.db.documents.get(writes[0].path), stored);
  assert.equal(stored.initialRoom, 'Room B');
  assert.equal(s.draws, 1);
  assert.equal(admissionWrites(s).length, 1);
  assert.equal(s.db.attempts[1].writes.length, 0);
});

test('invalid or throwing room randomizers return UNAVAILABLE without writing an admission, budget or receipt', async () => {
  const randomizers = [
    ...['Command Room', 'Hospital', 'Jail', '', null, undefined, 0].map(value => () => value),
    () => { throw new Error('Synthetic randomizer failure'); },
  ];
  for (const randomizer of randomizers) {
    const s = setup(randomizer), before = structuredClone([...s.db.documents]);
    const response = await admit(s);
    assert.equal(response.ok, false);
    assert.equal(response.error.code, 'UNAVAILABLE');
    assert.equal(s.draws, 1);
    assert.equal(s.db.commits, 0);
    assert.deepEqual([...s.db.documents], before);
    assert.ok(s.db.attempts.every(attempt => attempt.writes.length === 0));
  }
});

test('auth and strict request preflight reject invalid input before storage or room randomness', async () => {
  const db = new Proxy({}, { get() { assert.fail('Invalid admission reached storage'); } });
  const service = createV1Service({ db, clock: () => 100, randomInitialRoom: () => assert.fail('Invalid admission reached room randomness') });
  for (const [uid, payload, code] of [
    ['', request, 'UNAUTHENTICATED'], ['bad/path', request, 'UNAUTHENTICATED'],
    [UID, { ...request, protocolVersion: 3 }, 'UNSUPPORTED_PROTOCOL'],
    [UID, { ...request, requestId: 'bad/path' }, 'INVALID_REQUEST'],
    [UID, { ...request, roomCode: 'not-a-code' }, 'INVALID_REQUEST'],
    [UID, { ...request, initialRoom: 'Command Room' }, 'INVALID_REQUEST'],
    [UID, { ...request, initialRoom: null }, 'INVALID_REQUEST'],
    [UID, { ...request, randomSeed: 1 }, 'INVALID_REQUEST'],
    [UID, { ...request, uid: 'another-player' }, 'INVALID_REQUEST'],
  ]) {
    const response = FullOperationResponseSchema.parse(await service.requestAdmission(uid, payload));
    assert.equal(response.ok, false);
    assert.equal(response.error.code, code);
  }
});
