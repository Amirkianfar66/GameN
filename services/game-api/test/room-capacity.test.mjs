import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullBeginSetupResponseSchema } from '@mothership/contracts';
import { CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';

const MATCH = 'synthetic-capacity-match', CODE = 'ABCDEF123456', HOST = 'synthetic-capacity-host';
const path = suffix => `matches/${MATCH}/${suffix}`;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const admitted = n => `synthetic-player-${n}`;
const request = (fields = {}) => ({ protocolVersion: 2, matchId: MATCH, requestId: 'synthetic-capacity-request', ...fields });

// Atomic transaction-port double with collection snapshots and reads-before-writes.
// Retry injection changes the approved roster between attempts, without retaining
// the losing attempt's writes. Real concurrency belongs to test-emulator coverage.
function storage({ versions = CAPACITY_FULL_GAME_VERSION_PINS, rooms = [], count = 9, retry, lostAck = false } = {}) {
  const documents = new Map([
    [`roomCodes/${CODE}`, { matchId: MATCH }],
    [path('control/session'), { protocolVersion: 2, hostUid: HOST, playerCount: count, status: 'lobby' }],
    ...rooms.flatMap((initialRoom, index) => [
      [path(`seats/seat-${index + 1}`), { uid: admitted(index + 1), bindingRevision: 1, initialRoom }],
      [path(`members/${admitted(index + 1)}`), { kind: 'player', seatId: `seat-${index + 1}`, bindingRevision: 1 }],
    ]),
    ...(versions === null ? [] : [[path('engine/gameplayPins'), structuredClone(versions)]]),
  ]);
  const attempts = [];
  let invocation = 0;
  const ref = documentPath => ({ path: documentPath, id: documentPath.split('/').at(-1), collection: name => collection(`${documentPath}/${name}`) });
  const collection = collectionPath => ({ path: collectionPath, query: true, doc: id => ref(`${collectionPath}/${id}`) });
  const snapshot = documentPath => {
    const value = documents.get(documentPath);
    return { ref: ref(documentPath), id: documentPath.split('/').at(-1), exists: documents.has(documentPath),
      data: () => structuredClone(value), get: field => structuredClone(value?.[field]) };
  };
  const db = { collection, documents, attempts,
    async runTransaction(callback) {
      const first = invocation++ === 0;
      for (let attemptIndex = 0; attemptIndex < (first && retry ? 2 : 1); attemptIndex++) {
        const writes = [], reads = []; attempts.push({ reads, writes });
        const get = async reference => {
          assert.equal(writes.length, 0, 'Every transaction read must precede its first write');
          reads.push(reference.path);
          if (!reference.query) return snapshot(reference.path);
          const docs = [...documents.keys()].filter(key => key.startsWith(`${reference.path}/`)
            && !key.slice(reference.path.length + 1).includes('/')).sort().map(snapshot);
          return { docs, size: docs.length, empty: docs.length === 0 };
        };
        const result = await callback({ get, getAll: (...refs) => Promise.all(refs.map(get)),
          set: (reference, value) => writes.push({ kind: 'set', path: reference.path, value: structuredClone(value) }),
          create: (reference, value) => writes.push({ kind: 'create', path: reference.path, value: structuredClone(value) }),
          update: (reference, value) => writes.push({ kind: 'update', path: reference.path, value: structuredClone(value) }),
          delete: reference => writes.push({ kind: 'delete', path: reference.path }),
        });
        if (first && retry && attemptIndex === 0) { retry(documents); continue; }
        const committed = new Map(documents);
        for (const write of writes) {
          if (write.kind === 'delete') committed.delete(write.path);
          else {
            if (write.kind === 'create') assert.equal(committed.has(write.path), false, 'Creates cannot replace persisted decisions');
            if (write.kind === 'update') assert.equal(committed.has(write.path), true);
            committed.set(write.path, write.kind === 'update' ? { ...committed.get(write.path), ...write.value } : write.value);
          }
        }
        documents.clear(); for (const [key, value] of committed) documents.set(key, value);
        if (first && lostAck) throw new Error('Synthetic lost post-commit acknowledgment');
        return result;
      }
    },
  };
  return db;
}
function fixture(options) {
  const db = storage(options); let draws = 0;
  const service = createV1Service({ db, clock: () => 10_000, randomInitialRoom: () => { draws++; return 'Room A'; } });
  return { db, service, draws: () => draws };
}
const admissionRequest = (uid = 'synthetic-new-player') => ({ uid, body: { protocolVersion: 2, requestId: `admission-${uid}`, roomCode: CODE, initialRoom: 'Room A' } });
async function pending(h, admission = admissionRequest()) {
  const response = FullOperationResponseSchema.parse(await h.service.requestAdmission(admission.uid, admission.body));
  assert.equal(response.ok, true, JSON.stringify(response));
  return { ...admission, result: response.result };
}
async function approve(h, admission, seatId, requestId = `approve-${seatId}`) {
  return FullOperationResponseSchema.parse(await h.service.approveAdmission(HOST,
    request({ admissionId: admission.result.admissionId, seatId, requestId })));
}
const roomOf = (h, id) => h.db.documents.get(path(`admissions/${id}`)).initialRoom;
const seatRooms = h => [...h.db.documents].filter(([key]) => key.startsWith(path('seats/'))).map(([, value]) => value.initialRoom);
const botRequest = (count, requestId = 'bots') => ({ schemaVersion: 1, ...request({ requestId, botCount: count }) });

test('a capacity admission redirects a full preferred room without honoring the deprecated choice', async () => {
  const h = fixture({ rooms: [...Array(5).fill('Room A'), 'Room B'] }), admission = await pending(h);
  assert.equal(roomOf(h, admission.result.admissionId), 'Room B');
  assert.equal(h.draws(), 1);
  assert.equal((await approve(h, admission, 'seat-7')).ok, true);
  assert.equal(h.db.documents.get(path('seats/seat-7')).initialRoom, 'Room B');
  assert.equal(roomOf(h, admission.result.admissionId), 'Room B');
});

test('pending admissions share a preference but only approval consumes the last physical place', async () => {
  const h = fixture({ rooms: Array(4).fill('Room A') });
  const a = await pending(h, admissionRequest('new-a')), b = await pending(h, admissionRequest('new-b'));
  assert.equal(roomOf(h, a.result.admissionId), 'Room A'); assert.equal(roomOf(h, b.result.admissionId), 'Room A');
  assert.equal((await approve(h, a, 'seat-5')).ok, true);
  assert.equal((await approve(h, b, 'seat-6')).ok, true);
  assert.equal(roomOf(h, b.result.admissionId), 'Room B');
  assert.equal(h.db.documents.get(path('seats/seat-6')).initialRoom, 'Room B');
  assert.equal(h.draws(), 2, 'Approval cannot redraw a preference');
  const before = structuredClone([...h.db.documents]);
  assert.equal((await approve(h, b, 'seat-6')).ok, true);
  assert.deepEqual([...h.db.documents], before, 'Approval replay cannot allocate another place');
});

test('a callback retry keeps one random preference but allocates against the new approved roster', async () => {
  const h = fixture({ rooms: Array(4).fill('Room A'), retry: documents => {
    documents.set(path('seats/seat-9'), { uid: 'concurrent-human', bindingRevision: 1, initialRoom: 'Room A' });
  } });
  const admission = await pending(h);
  const attempts = h.db.attempts.map(attempt => attempt.writes.find(write => write.path === path(`admissions/${admission.result.admissionId}`)));
  assert.deepEqual(attempts.map(write => write.value.initialRoom), ['Room A', 'Room B']);
  assert.equal(roomOf(h, admission.result.admissionId), 'Room B'); assert.equal(h.draws(), 1);
});

test('lost acknowledgment replays the capacity assignment before pins, occupancy or randomness', async () => {
  const h = fixture({ rooms: Array(5).fill('Room A'), lostAck: true }), intent = admissionRequest();
  assert.equal((await h.service.requestAdmission(intent.uid, intent.body)).error.code, 'UNAVAILABLE');
  h.db.documents.set(path('engine/gameplayPins'), { ...CAPACITY_FULL_GAME_VERSION_PINS, rulesetHash: 'f'.repeat(64) });
  const before = structuredClone([...h.db.documents]), result = await pending(h, intent);
  assert.equal(roomOf(h, result.result.admissionId), 'Room B'); assert.equal(h.draws(), 1);
  assert.deepEqual([...h.db.documents], before);
  assert.deepEqual(h.db.attempts.at(-1).reads, [`identityOperations/${hash([intent.uid, intent.body.requestId])}`]);
});

for (const [label, versions] of [['Pass', PASS_FULL_GAME_VERSION_PINS], ['legacy', LEGACY_FULL_GAME_VERSION_PINS], ['missing', null]]) {
  test(`${label} lobby preserves uncapped human and bot placement`, async () => {
    const h = fixture({ versions, rooms: Array(6).fill('Room A') }), admission = await pending(h);
    assert.equal(roomOf(h, admission.result.admissionId), 'Room A');
    assert.equal((await approve(h, admission, 'seat-7')).ok, true);
    assert.equal(h.db.documents.get(path('seats/seat-7')).initialRoom, 'Room A');
    const response = FullSetPracticeBotsResponseSchema.parse(await h.service.setPracticeBots(HOST, botRequest(2)));
    assert.equal(response.ok, true); assert.deepEqual(seatRooms(h), Array(9).fill('Room A'));
  });
}

for (const count of [7, 8, 9]) test(`${count} new bots honor capacity without an equal-count quota`, async () => {
  const h = fixture({ count });
  const response = FullSetPracticeBotsResponseSchema.parse(await h.service.setPracticeBots(HOST, botRequest(count)));
  assert.equal(response.ok, true); assert.equal(h.draws(), count);
  assert.equal(seatRooms(h).filter(room => room === 'Room A').length, 5);
  assert.equal(seatRooms(h).filter(room => room === 'Room B').length, count - 5);
  const before = structuredClone([...h.db.documents]);
  assert.equal((await h.service.setPracticeBots(HOST, botRequest(count))).ok, true);
  assert.deepEqual([...h.db.documents], before); assert.equal(h.draws(), count);
});

test('bot callback retry recalculates final rooms while reusing each binding epoch preference', async () => {
  const h = fixture({ rooms: Array(4).fill('Room A'), retry: documents => {
    documents.set(path('seats/seat-9'), { uid: 'concurrent-human', bindingRevision: 1, initialRoom: 'Room A' });
  } });
  assert.equal((await h.service.setPracticeBots(HOST, botRequest(3))).ok, true);
  const slot = path('seats/seat-5');
  assert.deepEqual(h.db.attempts.map(attempt => attempt.writes.find(write => write.path === slot).value.initialRoom), ['Room A', 'Room B']);
  assert.equal(h.draws(), 3);
  assert.equal(seatRooms(h).filter(room => room === 'Room A').length, 5);
  assert.equal(seatRooms(h).filter(room => room === 'Room B').length, 3);
});

test('retained bots never redraw rooms and a removed/re-added epoch gets exactly one new draw', async () => {
  const h = fixture({ count: 7 });
  assert.equal((await h.service.setPracticeBots(HOST, botRequest(7))).ok, true);
  const before = structuredClone(h.db.documents.get(path('seats/seat-6')));
  assert.equal((await h.service.setPracticeBots(HOST, botRequest(6, 'remove'))).ok, true);
  assert.deepEqual(h.db.documents.get(path('seats/seat-6')), before); assert.equal(h.draws(), 7);
  assert.equal((await h.service.setPracticeBots(HOST, botRequest(7, 'readd'))).ok, true);
  assert.equal(h.draws(), 8); assert.equal(h.db.documents.get(path('seats/seat-7')).bindingRevision, 2);
  assert.equal(h.db.documents.get(path('seats/seat-7')).initialRoom, 'Room B');
});

test('unknown creation pins fail closed before random draws or writes', async () => {
  const h = fixture({ versions: { ...CAPACITY_FULL_GAME_VERSION_PINS, rulesetHash: 'f'.repeat(64) } }), before = structuredClone([...h.db.documents]);
  assert.equal((await h.service.requestAdmission(admissionRequest().uid, admissionRequest().body)).error.code, 'UNAVAILABLE');
  assert.equal((await h.service.setPracticeBots(HOST, botRequest(7))).error.code, 'UNAVAILABLE');
  assert.equal(h.draws(), 0); assert.deepEqual([...h.db.documents], before);
});

test('a corrupt capacity roster cannot open selection or change existing rooms', async () => {
  const h = fixture({ count: 7, rooms: Array(7).fill('Room A') }), before = structuredClone([...h.db.documents]);
  const response = FullBeginSetupResponseSchema.parse(await h.service.beginSetup(HOST, { schemaVersion: 1, ...request() }));
  assert.equal(response.ok, false); assert.equal(response.error.code, 'UNAVAILABLE');
  assert.deepEqual([...h.db.documents], before); assert.equal(h.draws(), 0);
});
