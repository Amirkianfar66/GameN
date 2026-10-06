import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  FullCommandSchema, FullCommandRequestSchema, FullFailureSchema, FullReceiptSchema,
  FullCreateMatchRequestSchema, FullAdmissionRequestSchema, FullApproveAdmissionRequestSchema,
  FullAdmitDisplayRequestSchema, FullStartMatchRequestSchema, FullAbortMatchRequestSchema,
  FullIssueSeatRecoveryRequestSchema, FullRedeemSeatRecoveryRequestSchema, FullLookupRequestSchema,
  FullAdvanceRequestSchema, FullServerTimeRequestSchema, FullOperationResponseSchema,
  FullCommandResponseSchema, FullLookupResponseSchema, FullAdvanceResponseSchema,
  FullServerTimeResponseSchema, FullLobbyViewSchema, FullPublicViewSchema, FullPlayerViewSchema,
  FullPublicEventSchema, FullPlayerEventSchema,
} from '@mothership/contracts';

// Synthetic documentation artifacts live outside src/build/package inputs.
const examples = JSON.parse(await readFile(new URL('./examples/protocol2.synthetic.json', import.meta.url), 'utf8'));
const requests = {
  v1CreateMatch: FullCreateMatchRequestSchema,
  v1RequestAdmission: FullAdmissionRequestSchema,
  v1ApproveAdmission: FullApproveAdmissionRequestSchema,
  v1AdmitDisplay: FullAdmitDisplayRequestSchema,
  v1StartMatch: FullStartMatchRequestSchema,
  v1Command: FullCommandRequestSchema,
  v1Receipt: FullLookupRequestSchema,
  v1Advance: FullAdvanceRequestSchema,
  v1ServerTime: FullServerTimeRequestSchema,
  v1AbortMatch: FullAbortMatchRequestSchema,
  v1IssueSeatRecovery: FullIssueSeatRecoveryRequestSchema,
  v1RedeemSeatRecovery: FullRedeemSeatRecoveryRequestSchema,
};
const responseSchemas = [FullOperationResponseSchema, FullCommandResponseSchema,
  FullLookupResponseSchema, FullAdvanceResponseSchema, FullServerTimeResponseSchema];

test('protocol-2 handoff includes strict requests for every endpoint and every gameplay command type', () => {
  assert.equal(examples.syntheticOnly, true);
  assert.deepEqual(Object.keys(examples.requests).sort(), Object.keys(requests).sort());
  for (const [endpoint, schema] of Object.entries(requests)) {
    const request = examples.requests[endpoint];
    assert.deepEqual(schema.parse(request), request, endpoint);
    assert.equal(schema.safeParse({ ...request, actorSeatId: 'seat-5' }).success, false, endpoint);
    assert.equal(schema.safeParse({ ...request, protocolVersion: 1 }).success, false, endpoint);
  }
  const expected = FullCommandSchema.options.map(schema => schema.shape.type.value).sort();
  assert.deepEqual(examples.commandRequests.map(request => request.command.type).sort(), expected);
  for (const request of examples.commandRequests) {
    assert.deepEqual(FullCommandRequestSchema.parse(request), request);
    assert.equal(FullCommandRequestSchema.safeParse({ ...request, command: { ...request.command, privateEffect: 'invented' } }).success, false);
  }
});

test('protocol-2 handoff covers operation results, neutral acceptance and every durable rejection/lookup outcome', () => {
  const responses = examples.responses;
  assert.deepEqual(Object.keys(responses.operations).sort(), ['created', 'admissionPending', 'admissionApproved',
    'displayAdmitted', 'started', 'aborted', 'recoveryIssued', 'recoveryIssueReplay', 'recovered'].sort());
  for (const response of Object.values(responses.operations)) FullOperationResponseSchema.parse(response);
  assert.equal(responses.operations.recoveryIssueReplay.result.recoveryToken, null);
  assert.deepEqual(responses.commands.map(response => response.receipt.code).sort(), ['REGISTERED', 'PHASE_CLOSED', 'NOT_ALLOWED'].sort());
  for (const response of responses.commands) {
    FullCommandResponseSchema.parse(response);
    FullReceiptSchema.parse(response.receipt);
    assert.equal('targetSeatId' in response.receipt, false);
  }
  assert.deepEqual(responses.lookups.map(response => response.status), ['found', 'found', 'found', 'unknown']);
  for (const response of responses.lookups) FullLookupResponseSchema.parse(response);
  for (const response of responses.advances) FullAdvanceResponseSchema.parse(response);
  FullServerTimeResponseSchema.parse(responses.serverTime);
  // Success envelopes are distinct; a callable-style or invented ok field cannot slip through.
  assert.equal(FullLookupResponseSchema.safeParse({ ...responses.lookups[0], ok: true }).success, false);
  assert.equal(FullAdvanceResponseSchema.safeParse({ ...responses.advances[0], ok: true }).success, false);
  assert.equal(FullServerTimeResponseSchema.safeParse({ ...responses.serverTime, ok: true }).success, false);
});

test('every declared protocol-2 failure code is schema checked across all response families', () => {
  const expected = FullFailureSchema.shape.error.shape.code.options;
  assert.deepEqual(examples.failures.map(response => response.error.code).sort(), [...expected].sort());
  for (const response of examples.failures) {
    assert.deepEqual(FullFailureSchema.parse(response), response);
    for (const schema of responseSchemas) assert.deepEqual(schema.parse(response), response);
    assert.equal(FullFailureSchema.safeParse({ ...response, error: { ...response.error, targetSeatId: 'seat-2' } }).success, false);
  }
  assert.equal(examples.failures.find(response => response.error.code === 'RATE_LIMITED').error.retryAfterMs, 1250);
  // The contract permits omitted/null retry delays; clients cannot assume every failure carries one.
  for (const retryAfterMs of [undefined, null]) {
    FullFailureSchema.parse({ ok: false, serverTimeMs: 1, error: { code: 'RATE_LIMITED', ...(retryAfterMs === undefined ? {} : { retryAfterMs }) } });
  }
});

test('synthetic lobby, audience views and events match the approved protocol-2 version pins', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../../rules/in-person-v1-manifest.json', import.meta.url), 'utf8'));
  FullLobbyViewSchema.parse(examples.views.lobby);
  FullPublicViewSchema.parse(examples.views.public);
  for (const view of [examples.views.player, examples.views.playerWithoutShotTargets]) FullPlayerViewSchema.parse(view);
  for (const view of [examples.views.public, examples.views.player, examples.views.playerWithoutShotTargets]) {
    assert.equal(view.versions.protocolVersion, 2);
    assert.equal(view.versions.rulesetVersion, manifest.ruleset_version);
    assert.equal(view.versions.rulesetHash, manifest.ruleset_hash);
    assert.equal(view.matchId, 'synthetic-match');
    assert.equal(view.phase.endsAt - view.phase.startedAt, 60_000);
  }
  assert.equal(examples.views.playerWithoutShotTargets.self.shotAvailable, true);
  assert.deepEqual(examples.views.playerWithoutShotTargets.legalTargets.REGISTER_SHOT, []);
  for (const event of examples.events) {
    (event.audience.kind === 'public' ? FullPublicEventSchema : FullPlayerEventSchema).parse(event);
    assert.equal(event.matchId, 'synthetic-match');
    assert.equal(event.protocolVersion, 2);
  }
});

test('handoff examples reject public private-data additions and premature terminal disclosures', () => {
  for (const privateKey of ['targetSeatId', 'role', 'code', 'protections', 'ownPendingCommandIds']) {
    assert.equal(FullPublicViewSchema.safeParse({ ...examples.views.public, [privateKey]: 'private' }).success, false, privateKey);
    for (const event of examples.events.filter(item => item.audience.kind === 'public')) {
      assert.equal(FullPublicEventSchema.safeParse({ ...event, fact: { ...event.fact, [privateKey]: 'private' } }).success, false, privateKey);
    }
  }
  const registration = examples.events.find(event => event.fact.type === 'COMMAND_REGISTERED');
  assert.equal(FullPublicEventSchema.safeParse({ ...registration, audience: { kind: 'public' } }).success, false);
  assert.equal(FullPlayerEventSchema.safeParse({ ...registration, fact: { ...registration.fact, targetSeatId: 'seat-2' } }).success, false);
  assert.equal(FullPublicViewSchema.safeParse({ ...examples.views.public, endReveal: { roles: [], code: ['seat-1', 'seat-2', 'seat-3', 'seat-7'] } }).success, false);
  const otherAudience = { ...examples.views.player, audience: { kind: 'player', seatId: 'seat-1' } };
  assert.equal(FullPlayerViewSchema.safeParse(otherAudience).success, false);
});
