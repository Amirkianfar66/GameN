import assert from 'node:assert/strict';
import test from 'node:test';
import { FullSetLobbyIdentityResponseSchema } from '@mothership/contracts';
import { createV1HttpHandler, V1_OPERATIONS } from '../dist/v1.js';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

function dependencies() {
  const calls = [];
  return { calls, clock: () => 123, configuration: assertRuntimeEnvironment({
    GCLOUD_PROJECT: 'synthetic-production-project', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'synthetic-assets',
    MOTHERSHIP_ALLOWED_ORIGINS: '["https://synthetic-preview.example"]',
  }), verifyIdToken: async token => { if (token !== 'valid-token') throw new Error('private diagnostics'); return { uid: 'verified-player' }; },
    verifyAppCheckToken: async token => { if (token !== 'valid-appcheck') throw new Error('private diagnostics'); },
    service: { setLobbyIdentity: async (uid, payload) => { calls.push({ uid, payload }); return { schemaVersion: 1, protocolVersion: 2, ok: true, serverTimeMs: 123, revision: 1 }; } },
  };
}
async function invoke(deps, overrides = {}) {
  const result = { headers: {} };
  const response = { set(key, value) { result.headers[key] = value; return this; }, status(value) { result.status = value; return this; }, json(value) { result.body = value; return this; } };
  await createV1HttpHandler('setLobbyIdentity', deps)({ method: 'POST', body: {}, headers: {
    'content-type': 'application/json', authorization: 'Bearer valid-token', 'x-firebase-appcheck': 'valid-appcheck',
    origin: 'https://synthetic-preview.example',
  }, ...overrides }, response);
  if (result.body !== null) FullSetLobbyIdentityResponseSchema.parse(result.body);
  return result;
}
test('new HTTP operation preserves existing operation order and verifies current Auth plus App Check', async () => {
  assert.deepEqual(V1_OPERATIONS, ['createMatch','requestAdmission','approveAdmission','admitDisplay','startMatch','submit','lookup','advance','serverTime','abortMatch','issueSeatRecovery','redeemSeatRecovery','setLobbyIdentity','setPracticeBots','beginSetup','confirmSetupChoice','readyForMatch']);
  const deps = dependencies(), result = await invoke(deps);
  assert.equal(result.status, 200); assert.equal(deps.calls[0].uid, 'verified-player');
  assert.equal(result.headers['Cache-Control'], 'no-store, private');
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://synthetic-preview.example');
});
test('every identity HTTP gateway failure has the new versioned shape and safe generic error', async () => {
  const deps = dependencies();
  for (const [overrides, status, code] of [
    [{ method: 'GET' }, 405, 'INVALID_REQUEST'],
    [{ rawBody: new Uint8Array(4097) }, 413, 'INVALID_REQUEST'],
    [{ headers: { 'content-type': 'text/plain' } }, 415, 'INVALID_REQUEST'],
    [{ headers: { 'content-type': 'application/json' } }, 401, 'UNAUTHENTICATED'],
    [{ headers: { 'content-type': 'application/json', authorization: 'Bearer invalid' } }, 401, 'UNAUTHENTICATED'],
    [{ headers: { 'content-type': 'application/json', authorization: 'Bearer valid-token' } }, 403, 'FORBIDDEN'],
    [{ headers: { 'content-type': 'application/json', authorization: 'Bearer valid-token', 'x-firebase-appcheck': 'invalid' } }, 403, 'FORBIDDEN'],
    [{ headers: { origin: 'https://unlisted.example' } }, 403, 'FORBIDDEN'],
  ]) {
    const result = await invoke(deps, overrides); assert.equal(result.status, status); assert.equal(result.body.error.code, code);
    assert.equal(JSON.stringify(result.body).includes('private'), false);
  }
  assert.equal(deps.calls.length, 0);
  deps.service.setLobbyIdentity = async () => { throw new Error('private diagnostics'); };
  assert.deepEqual((await invoke(deps)).body, { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 123, error: { code: 'UNAVAILABLE' } });
});
test('identity refusal codes map deterministically and valid preflight stays a bodyless 204', async () => {
  const deps = dependencies();
  for (const [code, expected] of [['CHARACTER_TAKEN',409],['IDENTITY_LOCKED',409],['REQUEST_ID_CONFLICT',409],['UNSUPPORTED_SCHEMA',400],['RATE_LIMITED',429]]) {
    deps.service.setLobbyIdentity = async () => ({ schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 123, error: { code } });
    assert.equal((await invoke(deps)).status, expected);
  }
  const result = await invoke(deps, { method: 'OPTIONS', headers: { origin: 'https://synthetic-preview.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type,x-firebase-appcheck' } });
  assert.equal(result.status, 204); assert.equal(result.body, null);
});
