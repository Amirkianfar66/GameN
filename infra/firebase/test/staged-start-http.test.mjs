import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema,
} from '@mothership/contracts';
import { createV1HttpHandler, createV1Entrypoints, V1_OPERATIONS } from '../dist/v1.js';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

const common = { schemaVersion: 1, protocolVersion: 2, matchId: 'synthetic-match', requestId: 'synthetic-request' };
const headers = { 'content-type': 'application/json', authorization: 'Bearer valid-token', 'x-firebase-appcheck': 'valid-appcheck', origin: 'https://synthetic-preview.example' };
const cases = [
  { operation: 'beginSetup', request: common, schema: FullBeginSetupResponseSchema,
    success: { ...common, ok: true, serverTimeMs: 123, revision: 1, stage: 'choosing', dealId: null },
    next: { stage: 'choosing', dealId: null } },
  { operation: 'confirmSetupChoice', request: { ...common, bindingRevision: 2, displayName: 'Crew member', characterId: 'c1' }, schema: FullConfirmSetupChoiceResponseSchema,
    success: { ...common, ok: true, serverTimeMs: 123, revision: 2, seatId: 'seat-1', bindingRevision: 2, stage: 'choosing', dealId: null },
    next: { stage: 'awaiting-ready', dealId: 'synthetic-deal' } },
  { operation: 'readyForMatch', request: { ...common, bindingRevision: 2, dealId: 'synthetic-deal' }, schema: FullReadyForMatchResponseSchema,
    success: { ...common, ok: true, serverTimeMs: 123, revision: 3, seatId: 'seat-1', bindingRevision: 2, stage: 'awaiting-ready', dealId: 'synthetic-deal' },
    next: { stage: 'running', dealId: 'synthetic-deal' } },
];
function dependencies(entry) {
  const calls = [];
  return { calls, clock: () => 123, configuration: assertRuntimeEnvironment({
    GCLOUD_PROJECT: 'synthetic-production-project', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'synthetic-assets',
    MOTHERSHIP_ALLOWED_ORIGINS: '["https://synthetic-preview.example"]',
  }), verifyIdToken: async token => { if (token !== 'valid-token') throw new Error('private identity diagnostics'); return { uid: 'verified-human' }; },
    verifyAppCheckToken: async token => { if (token !== 'valid-appcheck') throw new Error('private attestation diagnostics'); },
    service: { [entry.operation]: async (uid, payload) => { calls.push({ uid, payload }); return entry.success; } },
  };
}
async function invoke(entry, deps, overrides = {}) {
  const result = { headers: {} };
  const response = { set(key, value) { result.headers[key] = value; return this; }, status(value) { result.status = value; return this; }, json(value) { result.body = value; return this; } };
  await createV1HttpHandler(entry.operation, deps)({ method: 'POST', body: entry.request, headers, ...overrides }, response);
  if (result.body !== null) entry.schema.parse(result.body);
  return result;
}

for (const entry of cases) {
  test(`${entry.operation} uses current verified identity and a versioned lifecycle result without private role data`, async () => {
    const deps = dependencies(entry), result = await invoke(entry, deps);
    assert.equal(result.status, 200); assert.deepEqual(result.body, entry.success);
    assert.deepEqual(deps.calls, [{ uid: 'verified-human', payload: entry.request }]);
    assert.notEqual(deps.calls[0].payload, entry.request);
    assert.equal(result.headers['Cache-Control'], 'no-store, private'); assert.equal(result.headers['Pragma'], 'no-cache');
    assert.equal(result.headers['Access-Control-Allow-Origin'], headers.origin);
    assert.equal('started' in result.body, false); assert.equal('self' in result.body, false); assert.equal('knowledge' in result.body, false);
    deps.service[entry.operation] = async () => ({ ...entry.success, ...entry.next });
    assert.deepEqual((await invoke(entry, deps)).body, { ...entry.success, ...entry.next });
  });

  test(`${entry.operation} refuses transport, origin, Auth and App Check before invoking the service`, async () => {
    const deps = dependencies(entry);
    for (const [overrides, status, code] of [
      [{ method: 'GET' }, 405, 'INVALID_REQUEST'],
      [{ rawBody: new Uint8Array(4097) }, 413, 'INVALID_REQUEST'],
      [{ headers: { ...headers, 'content-type': 'text/plain' } }, 415, 'INVALID_REQUEST'],
      [{ headers: { ...headers, authorization: undefined } }, 401, 'UNAUTHENTICATED'],
      [{ headers: { ...headers, authorization: 'Bearer invalid-token' } }, 401, 'UNAUTHENTICATED'],
      [{ headers: { ...headers, 'x-firebase-appcheck': undefined } }, 403, 'FORBIDDEN'],
      [{ headers: { ...headers, 'x-firebase-appcheck': 'invalid-appcheck' } }, 403, 'FORBIDDEN'],
      [{ headers: { ...headers, origin: 'https://unlisted.example' } }, 403, 'FORBIDDEN'],
      [{ headers: { ...headers, origin: [headers.origin] } }, 403, 'FORBIDDEN'],
    ]) {
      const result = await invoke(entry, deps, overrides);
      assert.equal(result.status, status); assert.equal(result.body.error.code, code);
      assert.equal(JSON.stringify(result.body).includes('private'), false);
    }
    assert.equal(deps.calls.length, 0);
  });

  test(`${entry.operation} rejects unsupported versions, malformed context and client-supplied authority`, async () => {
    const deps = dependencies(entry);
    for (const [body, code] of [
      [{ ...entry.request, protocolVersion: 1 }, 'UNSUPPORTED_PROTOCOL'],
      [{ ...entry.request, schemaVersion: 2 }, 'UNSUPPORTED_SCHEMA'],
      [{ ...entry.request, matchId: '../engine' }, 'INVALID_REQUEST'],
      [{ ...entry.request, requestId: '' }, 'INVALID_REQUEST'],
      [{ ...entry.request, uid: 'forged-host' }, 'INVALID_REQUEST'],
      [{ ...entry.request, seatId: 'seat-9' }, 'INVALID_REQUEST'],
      [{ ...entry.request, role: 'Alien' }, 'INVALID_REQUEST'],
      [{ ...entry.request, ready: true }, 'INVALID_REQUEST'],
      [{ ...entry.request, serverTimeMs: 1 }, 'INVALID_REQUEST'],
      [null, 'INVALID_REQUEST'],
    ]) {
      const result = await invoke(entry, deps, { body });
      assert.equal(result.status, 400); assert.equal(result.body.error.code, code);
    }
    if (entry.operation !== 'beginSetup') {
      for (const bindingRevision of [0, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.equal((await invoke(entry, deps, { body: { ...entry.request, bindingRevision } })).status, 400);
    }
    if (entry.operation === 'confirmSetupChoice') {
      for (const body of [{ ...entry.request, characterId: 'c10' }, { ...entry.request, displayName: '   ' }]) assert.equal((await invoke(entry, deps, { body })).status, 400);
    }
    if (entry.operation === 'readyForMatch') assert.equal((await invoke(entry, deps, { body: { ...entry.request, dealId: null } })).status, 400);
    assert.equal(deps.calls.length, 0);
  });

  test(`${entry.operation} maps every typed refusal and preserves bounded retry advice`, async () => {
    const deps = dependencies(entry);
    for (const [code, status] of [
      ['UNAUTHENTICATED', 401], ['FORBIDDEN', 403], ['UNAVAILABLE', 503], ['RATE_LIMITED', 429],
      ['INVALID_REQUEST', 400], ['UNSUPPORTED_PROTOCOL', 400], ['UNSUPPORTED_SCHEMA', 400],
      ['REQUEST_ID_CONFLICT', 409], ['ROSTER_INCOMPLETE', 409], ['CHARACTER_TAKEN', 409], ['NAME_TAKEN', 409],
      ['SETUP_LOCKED', 409], ['STALE_DEAL', 409], ['STALE_BINDING', 409],
    ]) {
      const failure = { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 123, error: { code, ...(code === 'RATE_LIMITED' ? { retryAfterMs: 3000 } : {}) } };
      deps.service[entry.operation] = async () => failure;
      const result = await invoke(entry, deps);
      assert.equal(result.status, status); assert.deepEqual(result.body, failure);
    }
  });

  test(`${entry.operation} rejects mismatched context, private extensions and malformed service output safely`, async () => {
    const deps = dependencies(entry);
    const unavailable = { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 123, error: { code: 'UNAVAILABLE' } };
    deps.service[entry.operation] = async () => { throw new Error('private prepared roles'); };
    assert.deepEqual((await invoke(entry, deps)).body, unavailable);
    for (const body of [
      null, { ...entry.success, matchId: 'another-match' }, { ...entry.success, requestId: 'another-request' },
      { ...entry.success, self: { role: 'Alien' } }, { ...entry.success, schemaVersion: 2 },
      { ...entry.success, stage: 'aborted' },
      ...(entry.operation === 'beginSetup' ? [{ ...entry.success, stage: 'running', dealId: 'synthetic-deal' }] : []),
      { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 123, error: { code: 'FORBIDDEN', privateRole: 'Alien' } },
    ]) {
      deps.service[entry.operation] = async () => body;
      const result = await invoke(entry, deps); assert.equal(result.status, 503); assert.deepEqual(result.body, unavailable);
    }
  });

  test(`${entry.operation} accepts only exact POST preflight without initialization or service work`, async () => {
    const deps = dependencies(entry);
    const result = await invoke(entry, deps, { method: 'OPTIONS', headers: { origin: headers.origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type,x-firebase-appcheck' } });
    assert.equal(result.status, 204); assert.equal(result.body, null); assert.equal(deps.calls.length, 0);
    const refused = await invoke(entry, deps, { method: 'OPTIONS', headers: { origin: headers.origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,x-private-role' } });
    assert.equal(refused.status, 400); assert.equal(refused.body.error.code, 'INVALID_REQUEST'); assert.equal(deps.calls.length, 0);
  });
}

test('staged setup registers only three capped HTTP handlers lazily and preserves existing endpoint options', () => {
  assert.deepEqual(V1_OPERATIONS.slice(-3), cases.map(entry => entry.operation));
  const endpoints = createV1Entrypoints(() => assert.fail('metadata discovery must not initialize Admin'));
  for (const { operation } of cases) {
    const metadata = endpoints[operation].__endpoint;
    assert.equal(metadata.platform, 'gcfv2'); assert.deepEqual(metadata.region, ['us-central1']);
    assert.deepEqual(metadata.httpsTrigger, {}); assert.equal(metadata.timeoutSeconds, 30);
    assert.equal(metadata.maxInstances, 12); assert.equal(metadata.minInstances, 0);
    assert.equal(metadata.eventTrigger, undefined); assert.equal(metadata.taskQueueTrigger, undefined);
  }
  for (const operation of V1_OPERATIONS.filter(value => !['setPracticeBots', ...cases.map(entry => entry.operation)].includes(value))) {
    assert.notEqual(endpoints[operation].__endpoint.maxInstances, 12); assert.notEqual(endpoints[operation].__endpoint.minInstances, 0);
  }
});
