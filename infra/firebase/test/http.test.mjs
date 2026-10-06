import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpHandler, mayBypassAppCheck } from '../dist/http.js';

const emulator = { functionsEmulator: 'true', projectId: 'demo-mothership', authEmulatorHost: '127.0.0.1:9199', firestoreEmulatorHost: '127.0.0.1:8180' };

function setup(overrides = {}) {
  const calls = [];
  const service = Object.fromEntries(['submit', 'lookup', 'advance', 'serverTime'].map(name => [name, async (...args) => {
    calls.push({ name, args });
    return { protocolVersion: 1, serverTimeMs: 123 };
  }]));
  const dependencies = {
    service,
    environment: emulator,
    clock: () => 123,
    verifyIdToken: async token => {
      if (token !== 'verified-token') throw new Error('Secret verification details');
      return { uid: 'verified-uid' };
    },
    verifyAppCheckToken: async () => { throw new Error('App Check verifier was called'); },
    ...overrides,
  };
  return { calls, dependencies };
}

async function request(operation, dependencies, overrides = {}) {
  const capture = { status: undefined, headers: {}, body: undefined };
  const response = {
    set(key, value) { capture.headers[key] = value; return response; },
    status(value) { capture.status = value; return response; },
    json(value) { capture.body = value; return response; },
  };
  await createHttpHandler(operation, dependencies)({
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer verified-token' },
    body: { protocolVersion: 1, matchId: 'match-a' },
    ...overrides,
  }, response);
  return capture;
}

test('App Check bypass requires every loopback demo emulator condition', () => {
  assert.equal(mayBypassAppCheck(emulator), true);
  for (const override of [
    { functionsEmulator: undefined }, { functionsEmulator: 'false' }, { projectId: 'production-project' },
    { authEmulatorHost: undefined }, { firestoreEmulatorHost: undefined },
    { authEmulatorHost: 'remote.example:9199' }, { firestoreEmulatorHost: '127.0.0.1:0' },
    { firestoreEmulatorHost: 'localhost:8180/escape' }, { projectId: 'demo-' },
  ]) assert.equal(mayBypassAppCheck({ ...emulator, ...override }), false);
});

test('missing/invalid Auth returns safe failure without calling service or leaking details', async () => {
  const { dependencies, calls } = setup();
  for (const headers of [
    { 'content-type': 'application/json' },
    { 'content-type': 'application/json', authorization: 'Bearer invalid-token' },
    { 'content-type': 'application/json', authorization: ['Bearer verified-token', 'Bearer verified-token'] },
  ]) {
    const result = await request('command', dependencies, { headers });
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { ok: false, serverTimeMs: 123, error: { code: 'UNAUTHENTICATED' } });
    assert.equal(result.headers['Cache-Control'], 'no-store, private');
  }
  assert.equal(calls.length, 0);
});

test('production App Check is required, verified, and cannot be switched off by partial emulator config', async () => {
  let verifications = 0;
  const { dependencies, calls } = setup({
    environment: { ...emulator, projectId: 'production-project' },
    verifyAppCheckToken: async token => { verifications++; if (token !== 'app-token') throw new Error('Private app-check details'); },
  });
  assert.equal((await request('command', dependencies)).status, 403);
  assert.equal((await request('command', dependencies, {
    headers: { 'content-type': 'application/json', authorization: 'Bearer verified-token', 'x-firebase-appcheck': 'invalid' },
  })).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await request('command', dependencies, {
    headers: { 'content-type': 'application/json', authorization: 'Bearer verified-token', 'x-firebase-appcheck': 'app-token' },
  })).status, 200);
  assert.equal(verifications, 2);
  assert.equal(calls[0].args[0], 'verified-uid');
});

test('HTTP guard rejects oversized/non-JSON/other-method requests before service invocation', async () => {
  const { dependencies, calls } = setup();
  assert.equal((await request('command', dependencies, { rawBody: new Uint8Array(2049) })).status, 413);
  assert.equal((await request('command', dependencies, { method: 'GET' })).status, 405);
  assert.equal((await request('command', dependencies, { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal(calls.length, 0);
});

test('server time accepts only the versioned match envelope and derives identity from verification', async () => {
  const { dependencies, calls } = setup();
  for (const body of [null, [], { protocolVersion: 1, matchId: 'match-a', uid: 'victim' }, { protocolVersion: 1, matchId: '../match' }]) {
    assert.equal((await request('serverTime', dependencies, { body })).status, 400);
  }
  const unsupported = await request('serverTime', dependencies, { body: { protocolVersion: 2, matchId: 'match-a' } });
  assert.equal(unsupported.status, 400);
  assert.deepEqual(unsupported.body, { ok: false, serverTimeMs: 123, error: { code: 'UNSUPPORTED_PROTOCOL' } });
  assert.equal(calls.length, 0);
  assert.equal((await request('serverTime', dependencies)).status, 200);
  assert.deepEqual(calls, [{ name: 'serverTime', args: ['verified-uid', 'match-a'] }]);
});

test('unexpected service exceptions become safe UNAVAILABLE failures', async () => {
  const { dependencies } = setup();
  dependencies.service.submit = async () => { throw new Error('Hidden role mapping and token details'); };
  const result = await request('command', dependencies);
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { ok: false, serverTimeMs: 123, error: { code: 'UNAVAILABLE' } });
});
