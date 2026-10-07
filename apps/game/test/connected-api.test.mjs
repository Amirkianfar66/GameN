import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FullAbortMatchRequestSchema, FullAdmissionRequestSchema, FullAdmitDisplayRequestSchema, FullAdvanceRequestSchema, FullApproveAdmissionRequestSchema, FullCommandRequestSchema,
  FullCreateMatchRequestSchema, FullIssueSeatRecoveryRequestSchema, FullLookupRequestSchema, FullRedeemSeatRecoveryRequestSchema, FullServerTimeRequestSchema,
  FullStartMatchRequestSchema, FullSetLobbyIdentityRequestSchema,
} from '@mothership/contracts';
import { createConnectedApi, DEFAULT_API_TIMEOUT_MS, V1_OPERATIONS } from '@mothership/game';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, MATCH } from './support/connected.mjs';

// The protocol-2 API client against a transport whose every answer the test scripts. It
// shows what the client sends and what it concludes from an answer; it involves no backend.

function setup() {
  const host = createFakeHost();
  const fake = createFakeConnectedTransport(host);
  const api = createConnectedApi(fake.transport, host.ports);
  const answer = (operation, body) => { fake.respond[operation] = async () => (typeof body === 'function' ? body() : body); };
  return { host, fake, api, answer, now: () => host.serverNow() };
}
const move = (overrides = {}) => ({ protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one', commandId: 'command-1', command: { type: 'MOVE', destination: 'Room B' }, ...overrides });
const receiptFor = (request, status = 'accepted', code = 'REGISTERED') => ({ protocolVersion: 2, matchId: request.matchId, phaseId: request.phaseId, commandId: request.commandId, status, code });
const failed = (s, code, extra = {}) => ({ ok: false, serverTimeMs: s.now(), error: { code, ...extra } });
/** A synthetic one-time code of the documented shape. It opens nothing. */
const TOKEN = 'synthetic-recovery-code-000000000000000000A';

test('the client reaches the documented operations and no other', () => {
  assert.deepEqual([...V1_OPERATIONS], [
    'v1CreateMatch', 'v1RequestAdmission', 'v1ApproveAdmission', 'v1AdmitDisplay', 'v1StartMatch', 'v1AbortMatch', 'v1IssueSeatRecovery', 'v1RedeemSeatRecovery',
    'v1Command', 'v1Receipt', 'v1Advance', 'v1ServerTime', 'v1SetLobbyIdentity',
  ]);
});

test('every request the client sends satisfies the shared protocol-2 schema, and carries no actor, clock or outcome', async () => {
  const s = setup();
  await Promise.all([
    s.api.setLobbyIdentity({ schemaVersion: 1, protocolVersion: 2, matchId: MATCH, requestId: 'identity-1', displayName: 'Ada', characterId: 'c8' }),
    s.api.serverTime(MATCH), s.api.advance(MATCH, 'phase-one'), s.api.command(move()), s.api.receipt({ protocolVersion: 2, matchId: MATCH, commandId: 'command-1' }),
    s.api.createMatch({ protocolVersion: 2, requestId: 'request-1', playerCount: 7 }),
    s.api.requestAdmission({ protocolVersion: 2, requestId: 'request-2', roomCode: 'A1B2C3D4E5F6', initialRoom: 'Room A' }),
    s.api.approveAdmission({ protocolVersion: 2, matchId: MATCH, requestId: 'request-3', admissionId: 'admission-1', seatId: 'seat-1' }),
    s.api.admitDisplay({ protocolVersion: 2, matchId: MATCH, requestId: 'request-4', displayUid: 'display-uid' }),
    s.api.startMatch({ protocolVersion: 2, matchId: MATCH, requestId: 'request-5' }),
    s.api.abortMatch({ protocolVersion: 2, matchId: MATCH, requestId: 'request-6' }),
    s.api.issueSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-7', seatId: 'seat-3' }),
    s.api.redeemSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-8', recoveryToken: TOKEN }),
  ]);
  const schemas = {
    v1SetLobbyIdentity: FullSetLobbyIdentityRequestSchema,
    v1ServerTime: FullServerTimeRequestSchema, v1Advance: FullAdvanceRequestSchema, v1Command: FullCommandRequestSchema, v1Receipt: FullLookupRequestSchema,
    v1CreateMatch: FullCreateMatchRequestSchema, v1RequestAdmission: FullAdmissionRequestSchema, v1ApproveAdmission: FullApproveAdmissionRequestSchema,
    v1AdmitDisplay: FullAdmitDisplayRequestSchema, v1StartMatch: FullStartMatchRequestSchema, v1AbortMatch: FullAbortMatchRequestSchema,
    v1IssueSeatRecovery: FullIssueSeatRecoveryRequestSchema, v1RedeemSeatRecovery: FullRedeemSeatRecoveryRequestSchema,
  };
  assert.equal(s.fake.calls.length, 13);
  assert.deepEqual(Object.keys(schemas).sort(), [...V1_OPERATIONS].sort(), 'Every operation the client can reach is checked here');
  assert.deepEqual([...new Set(s.fake.calls.map(call => call.operation))].sort(), [...V1_OPERATIONS].sort(), 'and every one of them was sent');
  for (const { operation, body } of s.fake.calls) {
    assert.deepEqual(schemas[operation].parse(body), body, operation);
    assert.doesNotMatch(JSON.stringify(body), /"(uid|actor|seatId"\s*:\s*"seat-9|now|clock|serverTime|health|damage|outcome)"/, operation);
  }
  // A request that does not satisfy the contract is a defect here and is never sent.
  const before = s.fake.calls.length;
  await assert.rejects(() => s.api.command(move({ command: { type: 'MOVE', destination: 'Hospital' } })), /does not satisfy the shared contract/);
  await assert.rejects(() => s.api.createMatch({ protocolVersion: 2, requestId: 'request-9', playerCount: 6 }), /does not satisfy the shared contract/);
  await assert.rejects(() => s.api.serverTime('not a match id'), /does not satisfy the shared contract/);
  assert.equal(s.fake.calls.length, before);
});

test('a receipt is the server’s decision, accepted or rejected, and is believed only for the command it names', async () => {
  const s = setup();
  const request = move();
  s.answer('v1Command', () => ({ ok: true, serverTimeMs: s.now(), receipt: receiptFor(request) }));
  const accepted = await s.api.command(request);
  assert.deepEqual([accepted.kind, accepted.receipt.status], ['receipt', 'accepted']);
  assert.equal(accepted.sample.serverTimeMs, s.now());

  for (const code of ['PHASE_CLOSED', 'NOT_ALLOWED']) {
    s.answer('v1Command', () => ({ ok: true, serverTimeMs: s.now(), receipt: receiptFor(request, 'rejected', code) }));
    const rejected = await s.api.command(request);
    assert.deepEqual([rejected.kind, rejected.receipt.status, rejected.receipt.code], ['receipt', 'rejected', code], 'A rejection is a readable final decision, not a failed request');
  }
  // A receipt for another command, phase or match settles nothing about this one.
  for (const other of [{ commandId: 'command-2' }, { phaseId: 'phase-two' }, { matchId: 'another-match' }]) {
    s.answer('v1Command', () => ({ ok: true, serverTimeMs: s.now(), receipt: receiptFor({ ...request, ...other }) }));
    assert.deepEqual(await s.api.command(request), { kind: 'no-response', reason: 'unreadable-response' });
  }
  // Nor does a protocol-1 receipt, or one with a field the contract does not list.
  s.answer('v1Command', () => ({ ok: true, serverTimeMs: s.now(), receipt: { ...receiptFor(request), protocolVersion: 1 } }));
  assert.equal((await s.api.command(request)).kind, 'no-response');
  s.answer('v1Command', () => ({ ok: true, serverTimeMs: s.now(), receipt: { ...receiptFor(request), targetSeatId: 'seat-2' } }));
  assert.equal((await s.api.command(request)).kind, 'no-response');
});

test('every declared failure is reported with its code and with the retry delay the server named, if any', async () => {
  const s = setup();
  for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'COMMAND_ID_CONFLICT', 'REQUEST_ID_CONFLICT', 'UNAVAILABLE']) {
    s.answer('v1Command', () => failed(s, code));
    const result = await s.api.command(move());
    assert.deepEqual([result.kind, result.code, result.retryAfterMs], ['api-failure', code, null], code);
  }
  s.answer('v1Command', () => failed(s, 'RATE_LIMITED', { retryAfterMs: 2_500 }));
  assert.deepEqual((({ kind, code, retryAfterMs }) => [kind, code, retryAfterMs])(await s.api.command(move())), ['api-failure', 'RATE_LIMITED', 2_500]);
  s.answer('v1Command', () => failed(s, 'RATE_LIMITED', { retryAfterMs: null }));
  assert.equal((await s.api.command(move())).retryAfterMs, null);
  // The same on every other kind of call.
  s.answer('v1ServerTime', () => failed(s, 'FORBIDDEN'));
  s.answer('v1Advance', () => failed(s, 'RATE_LIMITED', { retryAfterMs: 100 }));
  s.answer('v1Receipt', () => failed(s, 'UNAUTHENTICATED'));
  s.answer('v1StartMatch', () => failed(s, 'FORBIDDEN'));
  assert.equal((await s.api.serverTime(MATCH)).code, 'FORBIDDEN');
  assert.equal((await s.api.advance(MATCH, 'phase-one')).retryAfterMs, 100);
  assert.equal((await s.api.receipt({ protocolVersion: 2, matchId: MATCH, commandId: 'command-1' })).code, 'UNAUTHENTICATED');
  assert.equal((await s.api.startMatch({ protocolVersion: 2, matchId: MATCH, requestId: 'request-1' })).code, 'FORBIDDEN');
  // An unknown code is not a failure the client understands: the outcome stays unknown.
  s.answer('v1Command', () => failed(s, 'SOMETHING_NEW'));
  assert.deepEqual(await s.api.command(move()), { kind: 'no-response', reason: 'unreadable-response' });
});

test('no usable answer leaves the outcome unknown: a lost request, a timeout, and a body that is not the contract’s', async () => {
  const s = setup();
  s.fake.respond.v1Command = () => Promise.reject(new Error('connection lost'));
  assert.deepEqual(await s.api.command(move()), { kind: 'no-response', reason: 'transport-error' });
  s.fake.respond.v1Command = () => { throw new Error('transport threw'); };
  assert.deepEqual(await s.api.command(move()), { kind: 'no-response', reason: 'transport-error' });
  for (const body of [undefined, null, '', '<html>', 200, [], {}, { ok: true }, { ok: true, serverTimeMs: 1, receipt: null }]) {
    s.answer('v1Command', body);
    assert.deepEqual(await s.api.command(move()), { kind: 'no-response', reason: 'unreadable-response' }, JSON.stringify(body));
  }
  // An answer that never comes is given up on after the limit, and a late one is ignored.
  let release;
  s.fake.respond.v1Command = () => new Promise(resolve => { release = resolve; });
  const pending = s.api.command(move());
  await flush();
  await s.host.advance(DEFAULT_API_TIMEOUT_MS - 1);
  let settled = false;
  pending.then(() => { settled = true; });
  await flush();
  assert.equal(settled, false);
  await s.host.advance(1);
  assert.deepEqual(await pending, { kind: 'no-response', reason: 'timeout' });
  release({ ok: true, serverTimeMs: s.now(), receipt: receiptFor(move()) });
  await flush();
  assert.equal(s.host.pendingTimers(), 0);
});

test('a lookup reports a found receipt or that none was committed yet, and nothing about another command', async () => {
  const s = setup();
  const request = { protocolVersion: 2, matchId: MATCH, commandId: 'command-1' };
  s.answer('v1Receipt', () => ({ status: 'found', serverTimeMs: s.now(), receipt: receiptFor(move(), 'rejected', 'PHASE_CLOSED') }));
  const found = await s.api.receipt(request);
  assert.deepEqual([found.kind, found.receipt.code], ['found', 'PHASE_CLOSED']);
  s.answer('v1Receipt', () => ({ status: 'unknown', serverTimeMs: s.now() }));
  assert.equal((await s.api.receipt(request)).kind, 'unknown');
  s.answer('v1Receipt', () => ({ status: 'found', serverTimeMs: s.now(), receipt: receiptFor(move({ commandId: 'command-2' })) }));
  assert.deepEqual(await s.api.receipt(request), { kind: 'no-response', reason: 'unreadable-response' });
  // The lookup envelope has no "ok" on success; one that adds it is not the contract's.
  s.answer('v1Receipt', () => ({ ok: true, status: 'unknown', serverTimeMs: s.now() }));
  assert.equal((await s.api.receipt(request)).kind, 'no-response');
});

test('server time and phase catch-up are read from their own envelopes, and an answer about another phase is not believed', async () => {
  const s = setup();
  s.answer('v1ServerTime', () => ({ protocolVersion: 2, serverTimeMs: s.now() }));
  const time = await s.api.serverTime(MATCH);
  assert.deepEqual([time.kind, time.sample.serverTimeMs], ['time', s.now()]);
  s.answer('v1ServerTime', () => ({ protocolVersion: 1, serverTimeMs: s.now() }));
  assert.equal((await s.api.serverTime(MATCH)).kind, 'no-response');
  for (const result of ['advanced', 'unchanged']) {
    s.answer('v1Advance', () => ({ protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one', serverTimeMs: s.now(), result }));
    assert.equal((await s.api.advance(MATCH, 'phase-one')).kind, result);
  }
  s.answer('v1Advance', () => ({ protocolVersion: 2, matchId: MATCH, phaseId: 'phase-two', serverTimeMs: s.now(), result: 'advanced' }));
  assert.deepEqual(await s.api.advance(MATCH, 'phase-one'), { kind: 'no-response', reason: 'unreadable-response' });
});

test('each lobby operation accepts only its own result, for its own request', async () => {
  const s = setup();
  const ok = result => () => ({ ok: true, serverTimeMs: s.now(), result });
  const results = {
    created: { matchId: MATCH, roomCode: 'A1B2C3D4E5F6', playerCount: 7, status: 'lobby' },
    pending: { matchId: MATCH, admissionId: 'admission-1', status: 'pending' },
    approved: { admissionId: 'admission-1', seatId: 'seat-1', status: 'approved' },
    admitted: { admitted: true },
    started: { started: true, matchId: MATCH },
    aborted: { aborted: true },
    issued: { issued: true, seatId: 'seat-3', recoveryToken: TOKEN, expiresAt: 1_900_000_600_000 },
    recovered: { recovered: true, seatId: 'seat-3' },
  };
  const calls = {
    v1CreateMatch: [() => s.api.createMatch({ protocolVersion: 2, requestId: 'request-1', playerCount: 7 }), 'created', { matchId: MATCH, roomCode: 'A1B2C3D4E5F6', playerCount: 7 }],
    v1RequestAdmission: [() => s.api.requestAdmission({ protocolVersion: 2, requestId: 'request-2', roomCode: 'A1B2C3D4E5F6', initialRoom: 'Room B' }), 'pending', { matchId: MATCH, admissionId: 'admission-1' }],
    v1ApproveAdmission: [() => s.api.approveAdmission({ protocolVersion: 2, matchId: MATCH, requestId: 'request-3', admissionId: 'admission-1', seatId: 'seat-1' }), 'approved', { admissionId: 'admission-1', seatId: 'seat-1' }],
    v1AdmitDisplay: [() => s.api.admitDisplay({ protocolVersion: 2, matchId: MATCH, requestId: 'request-4', displayUid: 'display-uid' }), 'admitted', true],
    v1StartMatch: [() => s.api.startMatch({ protocolVersion: 2, matchId: MATCH, requestId: 'request-5' }), 'started', true],
    v1AbortMatch: [() => s.api.abortMatch({ protocolVersion: 2, matchId: MATCH, requestId: 'request-6' }), 'aborted', true],
    v1IssueSeatRecovery: [() => s.api.issueSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-7', seatId: 'seat-3' }), 'issued', { seatId: 'seat-3', recoveryToken: TOKEN, expiresAt: 1_900_000_600_000 }],
    v1RedeemSeatRecovery: [() => s.api.redeemSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-8', recoveryToken: TOKEN }), 'recovered', { seatId: 'seat-3' }],
  };
  for (const [operation, [invoke, own, expected]] of Object.entries(calls)) {
    s.answer(operation, ok(results[own]));
    const done = await invoke();
    assert.deepEqual([done.kind, done.result], ['done', expected], operation);
    // Any other operation's well-formed success says nothing about this one.
    for (const [name, other] of Object.entries(results)) {
      if (name === own) continue;
      s.answer(operation, ok(other));
      assert.deepEqual(await invoke(), { kind: 'no-response', reason: 'unreadable-response' }, `${operation} given ${name}`);
    }
  }
  // An approval for another seat or admission, a match created for another size, a start of another match.
  s.answer('v1ApproveAdmission', ok({ admissionId: 'admission-1', seatId: 'seat-2', status: 'approved' }));
  assert.equal((await calls.v1ApproveAdmission[0]()).kind, 'no-response');
  s.answer('v1CreateMatch', ok({ ...results.created, playerCount: 9 }));
  assert.equal((await calls.v1CreateMatch[0]()).kind, 'no-response');
  s.answer('v1StartMatch', ok({ started: true, matchId: 'another-match' }));
  assert.equal((await calls.v1StartMatch[0]()).kind, 'no-response');
  // Ending a match is the host's alone: a refusal is reported as the server gave it, and an abort for no match is never sent.
  s.answer('v1AbortMatch', () => failed(s, 'FORBIDDEN'));
  assert.deepEqual([(await calls.v1AbortMatch[0]()).kind, (await calls.v1AbortMatch[0]()).code], ['api-failure', 'FORBIDDEN']);
  const sentSoFar = s.fake.calls.length;
  await assert.rejects(() => s.api.abortMatch({ protocolVersion: 2, requestId: 'request-7' }), /does not satisfy the shared contract/);
  assert.equal(s.fake.calls.length, sentSoFar);
});

test('a recovery code is believed only for the seat it was asked for, and a replayed answer carries none', async () => {
  const s = setup();
  const ok = result => () => ({ ok: true, serverTimeMs: s.now(), result });
  const issue = () => s.api.issueSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-1', seatId: 'seat-3' });
  // The service gives a code out once. The same request sent again is answered without it.
  s.answer('v1IssueSeatRecovery', ok({ issued: true, seatId: 'seat-3', recoveryToken: null, expiresAt: 1_900_000_600_000 }));
  const replayed = await issue();
  assert.deepEqual([replayed.kind, replayed.result], ['done', { seatId: 'seat-3', recoveryToken: null, expiresAt: 1_900_000_600_000 }]);
  // A code for another seat is not this request's answer.
  s.answer('v1IssueSeatRecovery', ok({ issued: true, seatId: 'seat-4', recoveryToken: TOKEN, expiresAt: 1_900_000_600_000 }));
  assert.deepEqual(await issue(), { kind: 'no-response', reason: 'unreadable-response' });
  // A refusal is the server's, as given: only the host may ask, and a code is good once.
  s.answer('v1IssueSeatRecovery', () => failed(s, 'FORBIDDEN'));
  assert.deepEqual([(await issue()).kind, (await issue()).code], ['api-failure', 'FORBIDDEN']);
  s.answer('v1RedeemSeatRecovery', () => failed(s, 'FORBIDDEN'));
  const refused = await s.api.redeemSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-2', recoveryToken: TOKEN });
  assert.deepEqual([refused.kind, refused.code], ['api-failure', 'FORBIDDEN']);
  // Something that is not a code, or a request for a seat that cannot exist, is never sent.
  const sentSoFar = s.fake.calls.length;
  await assert.rejects(() => s.api.redeemSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-3', recoveryToken: 'too short' }), /does not satisfy the shared contract/);
  await assert.rejects(() => s.api.issueSeatRecovery({ protocolVersion: 2, matchId: MATCH, requestId: 'request-4', seatId: 'seat-10' }), /does not satisfy the shared contract/);
  assert.equal(s.fake.calls.length, sentSoFar);
});

test('cancelling settles every pending call as cancelled and leaves no timer behind', async () => {
  const s = setup();
  s.fake.respond.v1Command = () => new Promise(() => {});
  s.fake.respond.v1ServerTime = () => new Promise(() => {});
  const calls = [s.api.command(move()), s.api.serverTime(MATCH)];
  await flush();
  assert.equal(s.host.pendingTimers(), 2);
  s.api.cancelPending();
  assert.deepEqual(await Promise.all(calls), [{ kind: 'no-response', reason: 'cancelled' }, { kind: 'no-response', reason: 'cancelled' }]);
  assert.equal(s.host.pendingTimers(), 0);
});
