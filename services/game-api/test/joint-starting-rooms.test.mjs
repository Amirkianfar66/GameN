import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullBeginSetupResponseSchema, FullLobbyViewSchema } from '@mothership/contracts';
import { FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { jointStartingRooms, jointStartingRoomAssignmentCount } from '../dist/joint-starting-rooms.js';

const MATCH = 'synthetic-joint-room-match', CODE = 'ABCDEF123456', HOST = 'synthetic-joint-room-host';
const path = suffix => `matches/${MATCH}/${suffix}`;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const request = (fields = {}) => ({ protocolVersion: 2, matchId: MATCH, requestId: 'joint-request', ...fields });
const ids = n => Array.from({ length: n }, (_, index) => `seat-${index + 1}`);
const encodeRooms = rooms => Object.values(rooms).map(room => room === 'Room A' ? 'A' : 'B').join('');

// The transaction double enforces read-before-write and atomic commits. Controlled
// retries discard the first callback's writes; emulator tests establish real races.
function storage({ count = 9, versions = FULL_GAME_VERSION_PINS } = {}) {
  const documents = new Map([
    [`roomCodes/${CODE}`, { matchId: MATCH }],
    [path('control/session'), { protocolVersion: 2, hostUid: HOST, playerCount: count, status: 'lobby' }],
    ...(versions === null ? [] : [[path('engine/gameplayPins'), structuredClone(versions)]]),
  ]);
  const attempts = []; let retry, loseAck = false;
  const ref = documentPath => ({ path: documentPath, id: documentPath.split('/').at(-1), collection: name => collection(`${documentPath}/${name}`) });
  const collection = (collectionPath, filters = []) => ({ path: collectionPath, query: true, filters,
    doc: id => ref(`${collectionPath}/${id}`), where: (field, operator, value) => {
      assert.equal(operator, '=='); return collection(collectionPath, [...filters, [field, value]]);
    } });
  const snapshot = documentPath => { const value = documents.get(documentPath); return {
    ref: ref(documentPath), id: documentPath.split('/').at(-1), exists: documents.has(documentPath),
    data: () => structuredClone(value), get: field => structuredClone(value?.[field]),
  }; };
  return { documents, attempts, collection, retryNext: change => { retry = change; }, loseNextAck: () => { loseAck = true; },
    async runTransaction(callback) {
      for (;;) {
        const writes = [], reads = []; attempts.push({ reads, writes });
        const get = async reference => {
          assert.equal(writes.length, 0, 'Every transaction read precedes every write'); reads.push(reference.path);
          if (!reference.query) return snapshot(reference.path);
          const docs = [...documents.keys()].filter(key => key.startsWith(`${reference.path}/`) && !key.slice(reference.path.length + 1).includes('/'))
            .sort().map(snapshot).filter(doc => reference.filters.every(([field, value]) => doc.get(field) === value));
          return { docs, size: docs.length, empty: docs.length === 0 };
        };
        const result = await callback({ get, getAll: (...refs) => Promise.all(refs.map(get)),
          set: (reference, value) => writes.push({ kind: 'set', path: reference.path, value: structuredClone(value) }),
          create: (reference, value) => writes.push({ kind: 'create', path: reference.path, value: structuredClone(value) }),
          update: (reference, value) => writes.push({ kind: 'update', path: reference.path, value: structuredClone(value) }),
          delete: reference => writes.push({ kind: 'delete', path: reference.path }),
        });
        if (retry) { const change = retry; retry = undefined; change(documents); continue; }
        const committed = new Map(documents);
        for (const write of writes) {
          if (write.kind === 'delete') committed.delete(write.path);
          else {
            if (write.kind === 'create') assert.equal(committed.has(write.path), false);
            if (write.kind === 'update') assert.equal(committed.has(write.path), true);
            committed.set(write.path, write.kind === 'update' ? { ...committed.get(write.path), ...write.value } : write.value);
          }
        }
        documents.clear(); for (const [key, value] of committed) documents.set(key, value);
        if (loseAck) { loseAck = false; throw new Error('Synthetic lost post-commit acknowledgment'); }
        return result;
      }
    },
  };
}
function fixture(options = {}) {
  const db = storage(options), ranks = []; let roomDraws = 0, serial = 0;
  const service = createV1Service({ db, clock: () => 10_000, randomInitialRoom: () => { roomDraws++; return 'Room A'; },
    randomStartingRoomRank: maximum => { ranks.push(maximum); return options.rank === undefined ? ranks.length === 1 ? 0 : maximum - 1 : options.rank; } });
  return { db, service, ranks, roomDraws: () => roomDraws, nextId: () => `request-${++serial}`, count: options.count ?? 9 };
}
const ok = response => { FullOperationResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response.result; };
async function pending(h, uid = `new-player-${h.nextId()}`) {
  const body = { protocolVersion: 2, requestId: h.nextId(), roomCode: CODE, initialRoom: 'Room B' };
  const result = ok(await h.service.requestAdmission(uid, body)); return { uid, body, result };
}
async function approve(h, entry, seatId, body = request({ requestId: h.nextId(), admissionId: entry.result.admissionId, seatId })) {
  ok(await h.service.approveAdmission(HOST, body)); return body;
}
async function humans(h, number) { for (let n = 1; n <= number; n++) await approve(h, await pending(h), `seat-${n}`); }
async function bots(h, number, body = { schemaVersion: 1, ...request({ requestId: h.nextId(), botCount: number }) }) {
  const response = FullSetPracticeBotsResponseSchema.parse(await h.service.setPracticeBots(HOST, body));
  assert.equal(response.ok, true, JSON.stringify(response)); return body;
}
const bindings = h => [...h.db.documents].filter(([key]) => key.startsWith(path('seats/'))).map(([key, value]) => ({ seatId: key.split('/').at(-1), ...value }));
const rooms = h => Object.fromEntries(bindings(h).sort((a, b) => a.seatId.localeCompare(b.seatId)).map(binding => [binding.seatId, binding.initialRoom]));
function consistent(h, expected) {
  assert.deepEqual(rooms(h), expected);
  const lobby = FullLobbyViewSchema.parse(h.db.documents.get(path('lobby/public')));
  assert.deepEqual(Object.fromEntries(lobby.seats.map(seat => [seat.seatId, seat.initialRoom])), expected);
  for (const [key, admission] of h.db.documents) if (key.startsWith(path('admissions/')) && admission.status === 'approved') assert.equal(admission.initialRoom, expected[admission.seatId]);
}

for (const [count, total] of [[7, 112], [8, 182], [9, 252]]) {
  test(`${count} seats: exact unranking covers every legal labelled assignment once with symmetric marginals`, () => {
    assert.equal(jointStartingRoomAssignmentCount(count), total);
    const expected = new Set();
    for (let mask = 0; mask < 2 ** count; mask++) {
      const value = ids(count).map((_, index) => mask & (1 << index) ? 'A' : 'B').join('');
      const a = [...value].filter(room => room === 'A').length;
      if (a <= 5 && count - a <= 5) expected.add(value);
    }
    const results = Array.from({ length: total }, (_, rank) => encodeRooms(jointStartingRooms(count, rank)));
    assert.equal(new Set(results).size, total); assert.deepEqual(new Set(results), expected);
    for (let index = 0; index < count; index++) assert.equal(results.filter(value => value[index] === 'A').length, total / 2);
    assert.equal(results.filter(value => value[0] === value[1]).length,
      results.filter(value => value[count - 2] === value[count - 1]).length, 'Approval/seat pair positions have the same distribution');
    for (const rank of [-1, total, 0.5, NaN]) assert.throws(() => jointStartingRooms(count, rank), /rank/);
  });

  test(`${count} seats: admissions stay unassigned until one atomic complete-roster approval draw`, async () => {
    const h = fixture({ count }); await humans(h, count - 1);
    consistent(h, Object.fromEntries(ids(count - 1).map(id => [id, null])));
    assert.deepEqual(h.ranks, []); assert.equal(h.roomDraws(), 0);
    const last = await pending(h), body = await approve(h, last, `seat-${count}`);
    consistent(h, jointStartingRooms(count, 0)); assert.deepEqual(h.ranks, [total]);
    const before = structuredClone([...h.db.documents]);
    ok(await h.service.approveAdmission(HOST, body)); assert.deepEqual([...h.db.documents], before); assert.deepEqual(h.ranks, [total]);
    assert.equal(h.roomDraws(), 0);
  });

  test(`${count} seats: last approval reuses its complete-roster rank across callback retries`, async () => {
    const h = fixture({ count }); await humans(h, count - 1); const last = await pending(h);
    h.db.retryNext(() => {});
    await approve(h, last, `seat-${count}`); consistent(h, jointStartingRooms(count, 0)); assert.deepEqual(h.ranks, [total]);
    const attempts = h.db.attempts.slice(-2);
    assert.equal(attempts.length, 2);
    for (const attempt of attempts) assert.ok(attempt.writes.some(write => write.path === path(`seats/seat-${count}`)));
  });

  test(`${count} seats: bot completion, shrink and new epoch preserve the immutable first room draw`, async () => {
    const h = fixture({ count }); await humans(h, 1); await bots(h, count - 2);
    consistent(h, Object.fromEntries(ids(count - 1).map(id => [id, null]))); assert.deepEqual(h.ranks, []);
    const completion = await bots(h, count - 1); consistent(h, jointStartingRooms(count, 0)); assert.deepEqual(h.ranks, [total]);
    const record = structuredClone(h.db.documents.get(path('engine/startingRooms')));
    assert.deepEqual(record.initialRooms, jointStartingRooms(count, 0)); assert.deepEqual(record.versions, FULL_GAME_VERSION_PINS);
    const before = structuredClone(bindings(h)); await bots(h, count - 1, completion); await bots(h, count - 1);
    assert.deepEqual(bindings(h), before); assert.deepEqual(h.ranks, [total]);
    await bots(h, count - 2); consistent(h, Object.fromEntries(ids(count - 1).map(id => [id, record.initialRooms[id]]))); assert.deepEqual(h.ranks, [total]);
    await bots(h, count - 1); consistent(h, record.initialRooms); assert.deepEqual(h.ranks, [total]);
    assert.deepEqual(h.db.documents.get(path('engine/startingRooms')), record, 'Private first draw is never rewritten');
    assert.equal(h.db.documents.get(path(`seats/seat-${count}`)).bindingRevision, 2); assert.equal(h.roomDraws(), 0);
  });

  test(`${count} seats: bot completion retry keeps one rank after a human binding recovery`, async () => {
    const h = fixture({ count }); await humans(h, 1); await bots(h, count - 2);
    const before = h.db.documents.get(path('seats/seat-1'));
    h.db.retryNext(documents => {
      documents.set(path('seats/seat-1'), { ...before, uid: 'recovered-player', bindingRevision: 2 });
      documents.delete(path(`members/${before.uid}`));
      documents.set(path('members/recovered-player'), { kind: 'player', seatId: 'seat-1', bindingRevision: 2 });
    });
    await bots(h, count - 1); consistent(h, jointStartingRooms(count, 0)); assert.deepEqual(h.ranks, [total]);
    assert.equal(h.db.documents.get(path('seats/seat-1')).uid, 'recovered-player'); assert.equal(h.roomDraws(), 0);
  });

  test(`${count} seats: lost bot acknowledgment recovers before pins, assignments or randomness`, async () => {
    const h = fixture({ count }); await humans(h, 1); await bots(h, count - 2);
    const body = { schemaVersion: 1, ...request({ requestId: h.nextId(), botCount: count - 1 }) };
    h.db.loseNextAck(); assert.equal((await h.service.setPracticeBots(HOST, body)).error.code, 'UNAVAILABLE');
    const before = structuredClone(rooms(h));
    h.db.documents.set(path('engine/gameplayPins'), { ...FULL_GAME_VERSION_PINS, rulesetHash: 'f'.repeat(64) });
    assert.equal((await h.service.setPracticeBots(HOST, body)).ok, true); assert.deepEqual(rooms(h), before); assert.deepEqual(h.ranks, [total]);
    assert.deepEqual(h.db.attempts.at(-1).reads, [path('control/session'), `practiceBotOperations/${hash([HOST, body.requestId])}`]);
  });

  test(`${count} seats: mixed roster final human approval updates retained bots and all approved admissions`, async () => {
    const h = fixture({ count }); await humans(h, 1); await bots(h, count - 2);
    const last = await pending(h); await approve(h, last, `seat-${count}`);
    consistent(h, jointStartingRooms(count, 0)); assert.deepEqual(h.ranks, [total]); assert.equal(h.roomDraws(), 0);
    const canonical = structuredClone(h.db.documents.get(path('engine/startingRooms'))), vacant = `seat-${count - 1}`;
    await bots(h, count - 3); consistent(h, Object.fromEntries(Object.entries(canonical.initialRooms).filter(([id]) => id !== vacant)));
    const replacement = await pending(h); assert.equal(h.db.documents.get(path(`admissions/${replacement.result.admissionId}`)).initialRoom, null);
    await approve(h, replacement, vacant); consistent(h, canonical.initialRooms); assert.deepEqual(h.ranks, [total]);
    assert.deepEqual(h.db.documents.get(path('engine/startingRooms')), canonical);
  });

  test(`${count} seats: lost approval acknowledgment replays before corrupted pins or new draws`, async () => {
    const h = fixture({ count }); await humans(h, count - 1); const last = await pending(h);
    const body = request({ requestId: h.nextId(), admissionId: last.result.admissionId, seatId: `seat-${count}` });
    h.db.loseNextAck(); assert.equal((await h.service.approveAdmission(HOST, body)).error.code, 'UNAVAILABLE');
    const completed = structuredClone(rooms(h)); h.db.documents.set(path('engine/gameplayPins'), { ...FULL_GAME_VERSION_PINS, rulesetHash: 'f'.repeat(64) });
    ok(await h.service.approveAdmission(HOST, body)); assert.deepEqual(rooms(h), completed); assert.deepEqual(h.ranks, [total]);
    assert.deepEqual(h.db.attempts.at(-1).reads, [`identityOperations/${hash([HOST, body.requestId])}`]);
  });

  test(`${count} seats: corrupt first-draw record or bindings fail closed without replacement randomness`, async () => {
    const h = fixture({ count }); await humans(h, count);
    const baseline = structuredClone([...h.db.documents]), canonical = structuredClone(h.db.documents.get(path('engine/startingRooms')));
    assert.equal(canonical.schemaVersion, 1); assert.equal(canonical.matchId, MATCH); assert.equal(typeof canonical.drawNonce, 'string');
    assert.deepEqual(canonical.versions, FULL_GAME_VERSION_PINS); assert.deepEqual(canonical.initialRooms, jointStartingRooms(count, 0));
    const corruptions = [
      documents => documents.delete(path('engine/startingRooms')),
      documents => documents.get(path('engine/startingRooms')).versions.rulesetHash = 'f'.repeat(64),
      documents => documents.get(path('engine/startingRooms')).versions.engineVersion = CAPACITY_FULL_GAME_VERSION_PINS.engineVersion,
      documents => delete documents.get(path('engine/startingRooms')).initialRooms[`seat-${count}`],
      documents => documents.get(path('engine/startingRooms')).initialRooms['seat-1'] = null,
      documents => documents.get(path('engine/startingRooms')).initialRooms = Object.fromEntries(ids(count).map(id => [id, 'Room A'])),
      documents => documents.get(path('engine/startingRooms')).drawNonce = 'bad nonce with spaces',
      documents => documents.get(path('engine/startingRooms')).matchId = 'different-match',
      documents => documents.get(path('engine/startingRooms')).initialRooms = jointStartingRooms(count, total - 1),
      documents => documents.get(path('seats/seat-1')).initialRoom = null,
    ];
    for (const corrupt of corruptions) {
      h.db.documents.clear(); for (const [key, value] of structuredClone(baseline)) h.db.documents.set(key, value);
      corrupt(h.db.documents); const before = structuredClone([...h.db.documents]);
      const response = FullBeginSetupResponseSchema.parse(await h.service.beginSetup(HOST, { schemaVersion: 1, ...request({ requestId: h.nextId() }) }));
      assert.equal(response.ok, false); assert.equal(response.error.code, 'UNAVAILABLE');
      assert.equal((await h.service.setPracticeBots(HOST, { schemaVersion: 1, ...request({ requestId: h.nextId(), botCount: 0 }) })).error.code, 'UNAVAILABLE');
      assert.deepEqual([...h.db.documents], before); assert.deepEqual(h.ranks, [total]);
    }
  });
}

for (const [label, versions] of [['capacity1.2', CAPACITY_FULL_GAME_VERSION_PINS], ['Pass', PASS_FULL_GAME_VERSION_PINS], ['legacy', LEGACY_FULL_GAME_VERSION_PINS], ['missing', null]]) {
  test(`${label}: historical admission/bot assignments never use the joint sampler`, async () => {
    const h = fixture({ versions }); h.db.documents.set(path('engine/startingRooms'), { invalid: 'historical tuples ignore this record' });
    await humans(h, 1); await bots(h, 8);
    assert.deepEqual(h.ranks, []); assert.equal(h.roomDraws(), 9);
    assert.ok(h.db.attempts.every(attempt => !attempt.reads.includes(path('engine/startingRooms'))));
    const values = Object.values(rooms(h)); assert.equal(values.filter(room => room === 'Room A').length, label === 'capacity1.2' ? 5 : 9);
    assert.ok(values.every(room => room !== null));
  });
  test(`${label}: an existing corrupt null binding cannot pass partial-roster approval`, async () => {
    const h = fixture({ versions }); await humans(h, 1); const entry = await pending(h);
    h.db.documents.get(path('seats/seat-1')).initialRoom = null;
    const before = structuredClone([...h.db.documents]);
    const response = await h.service.approveAdmission(HOST, request({ admissionId: entry.result.admissionId, seatId: 'seat-2' }));
    assert.equal(response.ok, false); assert.equal(response.error.code, 'UNAVAILABLE'); assert.deepEqual([...h.db.documents], before); assert.deepEqual(h.ranks, []);
  });
  test(`${label}: a corrupt null admission is refused rather than adopted as an assignment`, async () => {
    const h = fixture({ versions }), entry = await pending(h);
    h.db.documents.get(path(`admissions/${entry.result.admissionId}`)).initialRoom = null;
    const before = structuredClone([...h.db.documents]);
    const response = await h.service.approveAdmission(HOST, request({ admissionId: entry.result.admissionId, seatId: 'seat-1' }));
    assert.equal(response.ok, false); assert.equal(response.error.code, 'UNAVAILABLE'); assert.deepEqual([...h.db.documents], before); assert.deepEqual(h.ranks, []);
  });
}

test('mixed or unknown pins fail closed before either randomizer or writes', async () => {
  for (const versions of [{ ...FULL_GAME_VERSION_PINS, rulesetHash: 'f'.repeat(64) }, { ...FULL_GAME_VERSION_PINS, engineVersion: CAPACITY_FULL_GAME_VERSION_PINS.engineVersion }]) {
    const h = fixture({ versions }), before = structuredClone([...h.db.documents]);
    assert.equal((await h.service.requestAdmission('unknown-player', { protocolVersion: 2, requestId: 'unknown', roomCode: CODE })).error.code, 'UNAVAILABLE');
    assert.equal((await h.service.setPracticeBots(HOST, { schemaVersion: 1, ...request({ botCount: 9 }) })).error.code, 'UNAVAILABLE');
    assert.deepEqual([...h.db.documents], before); assert.deepEqual(h.ranks, []); assert.equal(h.roomDraws(), 0);
  }
});

test('invalid injected joint rank rolls back completion without assigning any room', async () => {
  const h = fixture({ count: 7, rank: 112 }); await humans(h, 6); const last = await pending(h), before = structuredClone([...h.db.documents]);
  const response = await h.service.approveAdmission(HOST, request({ admissionId: last.result.admissionId, seatId: 'seat-7' }));
  assert.equal(response.ok, false); assert.equal(response.error.code, 'UNAVAILABLE'); assert.deepEqual([...h.db.documents], before); assert.equal(h.roomDraws(), 0);
});
