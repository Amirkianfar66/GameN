import assert from 'node:assert/strict';
import test from 'node:test';
import { readHostedConfiguration } from '../dist/browser/hosted-config.js';
import { postHostedOperation } from '../dist/browser/hosted-request.js';
import { createHostedTransport } from '../dist/browser/hosted-transport.js';

const CONFIG = { projectId: 'mothership-preview-test', apiKey: 'public-example-api-key-for-tests',
  messagingSenderId: '1234567890', appId: '1:1234567890:web:abcdef123456',
  authDomain: 'mothership-preview-test.firebaseapp.com', pageOrigin: 'https://mothership-preview-test.web.app',
  recaptchaEnterpriseSiteKey: 'public-example-recaptcha-test-key' };

test('hosted config refuses mixed projects, emulator targets, alternate origins and extra credentials', () => {
  assert.deepEqual(readHostedConfiguration(CONFIG), CONFIG);
  for (const change of [
    { projectId: 'demo-mothership' }, { authDomain: 'another-project.firebaseapp.com' },
    { pageOrigin: 'http://mothership-preview-test.web.app' }, { pageOrigin: 'https://mothership-preview-test.web.app.attacker.test' },
    { pageOrigin: 'https://mothership-preview-test.web.app/' }, { appId: '1:9999999999:web:abcdef' },
    { functionsOrigin: 'https://other.invalid' }, { accessToken: 'should-never-be-a-config-field' },
    { recaptchaEnterpriseSiteKey: '' },
  ]) assert.throws(() => readHostedConfiguration({ ...CONFIG, ...change }), /Invalid hosted preview configuration/);
  let read = false;
  const getter = { ...CONFIG };
  Object.defineProperty(getter, 'apiKey', { get() { read = true; return CONFIG.apiKey; } });
  assert.throws(() => readHostedConfiguration(getter));
  assert.equal(read, false);
});

test('hosted SDK cannot initialize outside the exact configured HTTPS page', () => {
  assert.throws(() => createHostedTransport(CONFIG), /configured HTTPS origin/);
});

test('each hosted operation gets current Auth and App Check tokens and forbids redirects/caching', async () => {
  let refreshes = 0;
  const sent = [];
  const ports = {
    getIdToken: async () => `id-${++refreshes}`,
    getAppCheckToken: async () => `attestation-${refreshes}`,
    fetch: async (url, options) => { sent.push({ url, options }); return new Response(JSON.stringify({ ok: true })); },
  };
  const payload = { protocolVersion: 2, requestId: 'synthetic-request', playerCount: 7 };
  assert.deepEqual(await postHostedOperation(CONFIG, ports, 'v1CreateMatch', payload), { ok: true });
  await postHostedOperation(CONFIG, ports, 'v1CreateMatch', payload);
  assert.equal(refreshes, 2);
  for (const [i, request] of sent.entries()) {
    assert.equal(request.url, 'https://us-central1-mothership-preview-test.cloudfunctions.net/v1CreateMatch');
    assert.equal(request.options.headers.authorization, `Bearer id-${i + 1}`);
    assert.equal(request.options.headers['X-Firebase-AppCheck'], `attestation-${i + 1}`);
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.cache, 'no-store');
    assert.equal(request.options.credentials, 'omit');
    assert.deepEqual(JSON.parse(request.options.body), payload);
  }
});

test('a missing attestation or an undocumented operation sends nothing', async () => {
  let requests = 0;
  const ports = { getIdToken: async () => 'synthetic-id', getAppCheckToken: async () => '',
    fetch: async () => { requests++; throw new Error('must not send'); } };
  await assert.rejects(postHostedOperation(CONFIG, ports, 'v1CreateMatch', {}), /verification unavailable/);
  await assert.rejects(postHostedOperation(CONFIG, ports, 'v1DeadlineTask', {}), /documented operation/);
  assert.equal(requests, 0);
});

test('an unreadable server answer remains an unknown outcome, not a manufactured success', async () => {
  const ports = { getIdToken: async () => 'synthetic-id', getAppCheckToken: async () => 'synthetic-attestation',
    fetch: async () => new Response('temporarily unavailable', { status: 503 }) };
  await assert.rejects(postHostedOperation(CONFIG, ports, 'v1Command', {}), SyntaxError);
});
