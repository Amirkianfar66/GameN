import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createV1Service } from '../dist/index.js';
import { encodeV1Setup, decodeV1Setup, encodeV1State, decodeV1State } from '../dist/full-game.js';
import {
  FullCommandRequestSchema, FullFailureSchema, FullCreateMatchRequestSchema, FullAdmissionRequestSchema,
  FullApproveAdmissionRequestSchema, FullAdmitDisplayRequestSchema, FullStartMatchRequestSchema, FullAbortMatchRequestSchema,
  FullIssueSeatRecoveryRequestSchema, FullRedeemSeatRecoveryRequestSchema, FullLookupRequestSchema,
  FullAdvanceRequestSchema, FullServerTimeRequestSchema, FullOperationResponseSchema, FullCommandResponseSchema,
  FullLookupResponseSchema, FullAdvanceResponseSchema, FullServerTimeResponseSchema,
} from '@mothership/contracts';

const methods = {
  createMatch: { requestId: 'request-a', playerCount: 7 },
  requestAdmission: { requestId: 'request-a', roomCode: 'ABCDEF123456', initialRoom: 'Room A' },
  approveAdmission: { matchId: 'match-a', requestId: 'request-a', admissionId: 'admission-a', seatId: 'seat-1' },
  admitDisplay: { matchId: 'match-a', requestId: 'request-a', displayUid: 'display-a' },
  startMatch: { matchId: 'match-a', requestId: 'request-a' },
  submit: { matchId: 'match-a', phaseId: 'phase-a', commandId: 'command-a', command: { type: 'MOVE', destination: 'Room B' } },
  lookup: { matchId: 'match-a', commandId: 'command-a' },
  advance: { matchId: 'match-a', phaseId: 'phase-a' },
  serverTime: { matchId: 'match-a' },
  abortMatch: { matchId: 'match-a', requestId: 'request-a' },
  issueSeatRecovery: { matchId: 'match-a', requestId: 'request-a', seatId: 'seat-1' },
  redeemSeatRecovery: { matchId: 'match-a', requestId: 'request-a', recoveryToken: 'a'.repeat(43) },
};
const requestSchemas = {
  createMatch: FullCreateMatchRequestSchema, requestAdmission: FullAdmissionRequestSchema,
  approveAdmission: FullApproveAdmissionRequestSchema, admitDisplay: FullAdmitDisplayRequestSchema,
  startMatch: FullStartMatchRequestSchema, abortMatch: FullAbortMatchRequestSchema,
  issueSeatRecovery: FullIssueSeatRecoveryRequestSchema, redeemSeatRecovery: FullRedeemSeatRecoveryRequestSchema,
  submit: FullCommandRequestSchema, lookup: FullLookupRequestSchema, advance: FullAdvanceRequestSchema,
  serverTime: FullServerTimeRequestSchema,
};
const responseSchemas = { submit: FullCommandResponseSchema, lookup: FullLookupResponseSchema,
  advance: FullAdvanceResponseSchema, serverTime: FullServerTimeResponseSchema };
const unavailableDb = new Proxy({}, { get() { assert.fail('An invalid request must not reach Firestore'); } });
const service = createV1Service({ db: unavailableDb, clock: () => 123 });

for (const [method, fields] of Object.entries(methods)) test(`${method} rejects spoofed identity, additional fields, unsupported protocol and unsafe paths before storage`, async () => {
  const payload = { protocolVersion: 2, ...fields };
  requestSchemas[method].parse(payload);
  const checkFailure = async (uid, candidate, code) => {
    const response = await service[method](uid, candidate);
    (responseSchemas[method] ?? FullOperationResponseSchema).parse(response);
    assert.equal(response.error.code, code);
  };
  for (const uid of ['', 'identity/child', null]) await checkFailure(uid, payload, 'UNAUTHENTICATED');
  const withIdentity = { ...payload, verifiedUid: 'identity-b' };
  assert.equal(requestSchemas[method].safeParse(withIdentity).success, false);
  await checkFailure('identity-a', withIdentity, 'INVALID_REQUEST');
  await checkFailure('identity-a', { ...payload, protocolVersion: 99 }, 'UNSUPPORTED_PROTOCOL');
  for (const field of Object.keys(payload)) {
    const missing = { ...payload }; delete missing[field];
    assert.equal(requestSchemas[method].safeParse(missing).success, false);
    await checkFailure('identity-a', missing, 'INVALID_REQUEST');
  }
  for (const key of ['matchId', 'requestId', 'commandId', 'phaseId']) if (key in fields) {
    const unsafe = { ...payload, [key]: 'unsafe/child' };
    assert.equal(requestSchemas[method].safeParse(unsafe).success, false);
    await checkFailure('identity-a', unsafe, 'INVALID_REQUEST');
  }
});

test('creation and admission reject incomplete/unsupported lobby configuration', async () => {
  for (const playerCount of [6, 10, '7', null]) assert.equal((await service.createMatch('identity-a', { protocolVersion: 2, requestId: 'request-a', playerCount })).error.code, 'INVALID_REQUEST');
  for (const initialRoom of ['Command Room', 'Hospital', 'Jail']) assert.equal((await service.requestAdmission('identity-a', { protocolVersion: 2, requestId: 'request-a', roomCode: 'ABCDEF123456', initialRoom })).error.code, 'INVALID_REQUEST');
  assert.equal((await service.requestAdmission('identity-a', { protocolVersion: 2, requestId: 'request-a', roomCode: 'guess', initialRoom: 'Room A' })).error.code, 'INVALID_REQUEST');
  assert.equal((await service.issueSeatRecovery('identity-a', { protocolVersion: 2, matchId: 'match-a', requestId: 'request-a', seatId: 'seat-10' })).error.code, 'INVALID_REQUEST');
});

test('trusted deadline and bounded repair reject malformed inputs before Firestore', async () => {
  for (const payload of [null, {}, { matchId: 'match-a', phaseId: 'phase-a', deadlineToken: 'token-a', uid: 'identity-a' }, { matchId: 'unsafe/child', phaseId: 'phase-a', deadlineToken: 'token-a' }]) {
    assert.equal(FullFailureSchema.parse(await service.runDeadline(payload)).error.code, 'INVALID_REQUEST');
  }
  for (const limit of [0, 101, 1.5]) await assert.rejects(service.repairOutbox(async () => {}, { limit }), /1\.\.100/);
  assert.deepEqual(await service.dispatchDeadlineIntent('matches/match-a/outbox/unsafe', async () => assert.fail('invalid path must not enqueue')), { status: 'blocked' });
});

test('asset manifests require a bounded explicit version, allowing semver pins without ambient environment access', () => {
  for (const assetManifestVersion of [null, 123, '', 'contains/slash', 'a'.repeat(129)]) assert.throws(() => createV1Service({ db: unavailableDb, assetManifestVersion }), /Invalid asset manifest/);
  assert.doesNotThrow(() => createV1Service({ db: unavailableDb, assetManifestVersion: '1.2.0-approved' }));
});

test('versioned Firestore storage preserves all five recorded permutations without unsupported nested arrays', () => {
  const ids = Array.from({ length: 7 }, (_, i) => `seat-${i + 1}`);
  const setup = { playerCount: 7, roleOrder: ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'], codeExtraSeatIds: ids.slice(0, 3), initialRooms: Object.fromEntries(ids.map(id => [id, 'Room A'])), roundOrders: Array.from({ length: 5 }, (_, i) => [...ids.slice(i), ...ids.slice(0, i)]) };
  const before = structuredClone(setup), encoded = encodeV1Setup(setup);
  assert.equal(encoded.storageCodecVersion, 1);
  assert.ok(encoded.roundOrders.every(entry => !Array.isArray(entry) && Array.isArray(entry.seatIds)));
  assert.deepEqual(decodeV1Setup(encoded), setup); assert.deepEqual(setup, before);
  const state = { setup, matchId: 'sample-codec-roundtrip' };
  assert.deepEqual(decodeV1State(encodeV1State(state)), state);
  for (const value of [{ ...encoded, storageCodecVersion: 2 }, { ...encoded, roundOrders: setup.roundOrders }, { ...encoded, roundOrders: [{ seatIds: ['seat-unknown'] }, ...encoded.roundOrders.slice(1)] }]) assert.throws(() => decodeV1Setup(value), /Invalid stored V1 setup/);
  assert.throws(() => decodeV1State({ ...encodeV1State(state), storageCodecVersion: 2 }), /Invalid stored V1 state/);
});
