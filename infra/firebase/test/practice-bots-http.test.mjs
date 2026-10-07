import assert from 'node:assert/strict';
import test from 'node:test';
import { FullSetPracticeBotsResponseSchema } from '@mothership/contracts';
import { createV1HttpHandler, createV1PracticeBotsHandler, createV1DeadlineHandler, createV1Entrypoints, V1_OPERATIONS } from '../dist/v1.js';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

const request = { schemaVersion: 1, protocolVersion: 2, matchId: 'synthetic-match', requestId: 'synthetic-request', botCount: 2 };
const success = { schemaVersion: 1, protocolVersion: 2, ok: true, serverTimeMs: 123, matchId: request.matchId, requestId: request.requestId, revision: 1, botSeatIds: ['seat-2', 'seat-3'] };
const headers = { 'content-type': 'application/json', authorization: 'Bearer valid-token', 'x-firebase-appcheck': 'valid-appcheck', origin: 'https://synthetic-preview.example' };
function dependencies() {
  const calls = [];
  return { calls, clock: () => 123, configuration: assertRuntimeEnvironment({
    GCLOUD_PROJECT: 'synthetic-production-project', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'synthetic-assets',
    MOTHERSHIP_ALLOWED_ORIGINS: '["https://synthetic-preview.example"]',
  }), verifyIdToken: async token => { if (token !== 'valid-token') throw new Error('private token diagnostics'); return { uid: 'verified-host' }; },
    verifyAppCheckToken: async token => { if (token !== 'valid-appcheck') throw new Error('private attestation diagnostics'); },
    service: { setPracticeBots: async (uid, payload) => { calls.push({ uid, payload }); return success; } },
  };
}
async function invoke(deps, overrides = {}) {
  const result = { headers: {} };
  const response = { set(key, value) { result.headers[key] = value; return this; }, status(value) { result.status = value; return this; }, json(value) { result.body = value; return this; } };
  await createV1HttpHandler('setPracticeBots', deps)({ method: 'POST', body: request, headers, ...overrides }, response);
  if (result.body !== null) FullSetPracticeBotsResponseSchema.parse(result.body);
  return result;
}

test('practice HTTP uses verified identity, exact versioned schemas and private no-store responses', async () => {
  assert.equal(V1_OPERATIONS.includes('setPracticeBots'), true);
  const deps = dependencies(), result = await invoke(deps);
  assert.equal(result.status, 200); assert.deepEqual(result.body, success);
  assert.deepEqual(deps.calls, [{ uid: 'verified-host', payload: request }]);
  assert.equal(result.headers['Cache-Control'], 'no-store, private');
  assert.equal(result.headers['Pragma'], 'no-cache');
  assert.equal(result.headers['Access-Control-Allow-Origin'], headers.origin);
});

test('practice HTTP gateway refuses origin, Auth and App Check errors before service invocation', async () => {
  const deps = dependencies();
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
    const result = await invoke(deps, overrides);
    assert.equal(result.status, status); assert.equal(result.body.error.code, code);
    assert.equal(JSON.stringify(result.body).includes('private'), false);
  }
  assert.equal(deps.calls.length, 0);
});

test('practice HTTP rejects client authority, invalid counts and unsupported versions', async () => {
  const deps = dependencies();
  for (const [body, code] of [
    [{ ...request, uid: 'spoofed-host' }, 'INVALID_REQUEST'],
    [{ ...request, botSeatIds: ['seat-1'] }, 'INVALID_REQUEST'],
    [{ ...request, botCount: -1 }, 'INVALID_REQUEST'],
    [{ ...request, botCount: 10 }, 'INVALID_REQUEST'],
    [{ ...request, botCount: 1.5 }, 'INVALID_REQUEST'],
    [{ ...request, protocolVersion: 1 }, 'UNSUPPORTED_PROTOCOL'],
    [{ ...request, schemaVersion: 2 }, 'UNSUPPORTED_SCHEMA'],
    [{ ...request, matchId: '../engine' }, 'INVALID_REQUEST'],
  ]) {
    const result = await invoke(deps, { body });
    assert.equal(result.status, 400); assert.equal(result.body.error.code, code);
  }
  assert.equal(deps.calls.length, 0);
});

test('practice HTTP maps typed refusals and passes bounded retry hints', async () => {
  const deps = dependencies();
  for (const [code, status] of [['FORBIDDEN',403], ['UNAVAILABLE',503], ['REQUEST_ID_CONFLICT',409], ['LOBBY_LOCKED',409], ['CAPACITY_EXCEEDED',409], ['RATE_LIMITED',429]]) {
    const failure = { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 123, error: { code, ...(code === 'RATE_LIMITED' ? { retryAfterMs: 3000 } : {}) } };
    deps.service.setPracticeBots = async () => failure;
    const result = await invoke(deps);
    assert.equal(result.status, status); assert.deepEqual(result.body, failure);
  }
});

test('practice HTTP sanitizes thrown and malformed service responses', async () => {
  const deps = dependencies();
  const unavailable = { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 123, error: { code: 'UNAVAILABLE' } };
  deps.service.setPracticeBots = async () => { throw new Error('private roles and journal'); };
  assert.deepEqual((await invoke(deps)).body, unavailable);
  for (const body of [null, { ...success, engine: 'private roles' }, { ...success, botSeatIds: ['seat-3','seat-2'] }, { ...success, schemaVersion: 2 }]) {
    deps.service.setPracticeBots = async () => body;
    const result = await invoke(deps); assert.equal(result.status, 503); assert.deepEqual(result.body, unavailable);
  }
});

test('practice HTTP valid preflight invokes no service and has a bodyless 204', async () => {
  const deps = dependencies();
  const result = await invoke(deps, { method: 'OPTIONS', headers: { origin: headers.origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type,x-firebase-appcheck' } });
  assert.equal(result.status, 204); assert.equal(result.body, null); assert.equal(deps.calls.length, 0);
});

function engineEvent(protocolVersion = 2, exists = true, matchId = 'synthetic-match') {
  return { params: { matchId }, data: { after: { exists, get: key => key === 'versions.protocolVersion' ? protocolVersion : undefined } } };
}
function entrypoints(runPracticeBots) {
  let resolutions = 0;
  const endpoints = createV1Entrypoints(() => {
    resolutions++; return { app: {}, configuration: {}, service: { runPracticeBots } };
  });
  return { endpoints, resolutions: () => resolutions };
}

test('practice engine trigger is retrying Eventarc-only metadata without a public worker operation', () => {
  const { endpoints, resolutions } = entrypoints(async () => ({ status: 'unchanged', processed: 0 }));
  assert.equal(resolutions(), 0);
  const metadata = endpoints.runPracticeBots.__endpoint;
  assert.equal(metadata.platform, 'gcfv2');
  assert.equal(metadata.eventTrigger.eventType, 'google.cloud.firestore.document.v1.written');
  assert.equal(metadata.eventTrigger.eventFilterPathPatterns.document, 'matches/{matchId}/engine/current');
  assert.equal(metadata.eventTrigger.retry, true);
  assert.deepEqual(metadata.region, ['us-central1']);
  assert.equal(metadata.maxInstances, 12); assert.equal(metadata.minInstances, 0);
  assert.equal(metadata.httpsTrigger, undefined); assert.equal(metadata.taskQueueTrigger, undefined);
  assert.equal(metadata.eventTrigger.serviceAccountEmail, undefined);
  assert.equal(V1_OPERATIONS.includes('runPracticeBots'), false);
});

test('practice and staged setup HTTP operations declare caps while existing endpoints retain theirs', () => {
  const { endpoints, resolutions } = entrypoints(async () => ({ status: 'unchanged', processed: 0 }));
  assert.equal(resolutions(), 0);
  assert.equal(endpoints.setPracticeBots.__endpoint.maxInstances, 12);
  assert.equal(endpoints.setPracticeBots.__endpoint.minInstances, 0);
  for (const operation of V1_OPERATIONS.filter(value => !['setPracticeBots', 'beginSetup', 'confirmSetupChoice', 'readyForMatch'].includes(value))) {
    assert.notEqual(endpoints[operation].__endpoint.maxInstances, 12);
    assert.notEqual(endpoints[operation].__endpoint.minInstances, 0);
  }
});

test('practice engine trigger ignores missing, deleted and non-protocol2 state before initialization', async () => {
  const { endpoints, resolutions } = entrypoints(async () => assert.fail('ineligible state must not run bots'));
  await endpoints.runPracticeBots.run({ params: { matchId: 'synthetic-match' } });
  await endpoints.runPracticeBots.run(engineEvent(2, false));
  await endpoints.runPracticeBots.run(engineEvent(1));
  await endpoints.runPracticeBots.run(engineEvent(null));
  assert.equal(resolutions(), 0);
});

test('practice engine trigger bounds work to18 and leaves duplicate/out-of-order delivery reconciliation to current service state', async () => {
  const calls = [];
  const { endpoints } = entrypoints(async (matchId, options) => { calls.push({ matchId, options }); return { status: calls.length === 1 ? 'advanced' : 'unchanged', processed: calls.length === 1 ? 18 : 0 }; });
  const event = engineEvent();
  await endpoints.runPracticeBots.run(event); await endpoints.runPracticeBots.run(event);
  assert.deepEqual(calls, Array.from({ length: 2 }, () => ({ matchId: 'synthetic-match', options: { limit: 18 } })));
});

test('practice worker failures and malformed outcomes throw safe retry errors; blocked is terminal', async () => {
  for (const result of [{ status: 'failed', processed: 0 }, null, {}, { status: 'advanced', processed: 19 }, { status: 'unchanged', processed: -1 }, { status: 'unchanged', processed: 1.5 }]) {
    const { endpoints } = entrypoints(async () => result);
    await assert.rejects(endpoints.runPracticeBots.run(engineEvent()), error => error.message === 'Practice bot evaluation unavailable');
  }
  const thrown = entrypoints(async () => { throw new Error('private role evidence'); });
  await assert.rejects(thrown.endpoints.runPracticeBots.run(engineEvent()), error => error.message === 'Practice bot evaluation unavailable');
  await entrypoints(async () => ({ status: 'blocked', processed: 0 })).endpoints.runPracticeBots.run(engineEvent());
  let calls = 0;
  await assert.rejects(createV1PracticeBotsHandler({ runPracticeBots: async () => { calls++; return { status: 'unchanged', processed: 0 }; } })('../engine'), /Invalid practice bot match/);
  assert.equal(calls, 0);
});

test('successful and stale deadlines both run bounded practice work after evaluation', async () => {
  const payload = { matchId: 'synthetic-match', phaseId: 'synthetic-phase', deadlineToken: 'synthetic-deadline' };
  for (const result of ['advanced', 'unchanged']) {
    const calls = [];
    const handler = createV1DeadlineHandler({ runDeadline: async given => { assert.deepEqual(given, payload); calls.push('deadline'); return { result }; },
      runPracticeBots: async (matchId, options) => { assert.equal(matchId, payload.matchId); assert.deepEqual(options, { limit: 18 }); calls.push('bots'); return { status: 'unchanged', processed: 0 }; },
    });
    await handler(payload); assert.deepEqual(calls, ['deadline', 'bots']);
  }
});

test('deadline failure skips bots, and bot failure after successful deadline remains retryable', async () => {
  const payload = { matchId: 'synthetic-match', phaseId: 'synthetic-phase', deadlineToken: 'synthetic-deadline' };
  let botCalls = 0;
  for (const runDeadline of [async () => ({ ok: false, error: { code: 'UNAVAILABLE' } }), async () => { throw new Error('private storage details'); }]) {
    await assert.rejects(createV1DeadlineHandler({ runDeadline, runPracticeBots: async () => { botCalls++; return { status: 'unchanged', processed: 0 }; } })(payload), /Deadline evaluation unavailable/);
  }
  assert.equal(botCalls, 0);
  await assert.rejects(createV1DeadlineHandler({ runDeadline: async () => ({ result: 'advanced' }), runPracticeBots: async () => ({ status: 'failed', processed: 0 }) })(payload), /Practice bot evaluation unavailable/);
});
