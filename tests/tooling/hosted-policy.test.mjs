import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHostedPreviewCsp, createHostedPreviewHeaders, applyHostedPreviewHeaders,
  createEmulatorPreviewHeaders } from '../../scripts/hosted-preview-policy.mjs';
import {createServer} from 'node:http';

test('generated Hosting CSP permits the installed App Check SDK exchange endpoint', () => {
  const source = readFileSync(new URL('../../node_modules/@firebase/app-check/dist/esm/index.esm.js', import.meta.url), 'utf8');
  const endpoint = source.match(/const BASE_ENDPOINT = ['"]([^'"]+)['"]/u)?.[1];
  assert.ok(endpoint, 'Review an SDK endpoint change explicitly');
  const policy = createHostedPreviewCsp('gamen-mothership-staging');
  const connect = policy.split('; ').find(d => d.startsWith('connect-src ')).split(' ').slice(1);
  assert.ok(connect.includes(new URL(endpoint).origin));
  assert.ok(connect.includes('https://us-central1-gamen-mothership-staging.cloudfunctions.net'));
  assert.equal(connect.some(value => value.includes('*') || /localhost|127\.0\.0\.1|demo-/u.test(value)), false);
  assert.ok(policy.includes("frame-ancestors 'none'"));
});


test('cinematic playback is limited to same-origin media without weakening the default', () => {
  const directives = new Map(createHostedPreviewCsp('gamen-mothership-staging').split('; ').map(value => {
    const [name, ...sources] = value.split(' '); return [name, sources];
  }));
  assert.deepEqual(directives.get('media-src'), ["'self'"]);
  assert.deepEqual(directives.get('default-src'), ["'none'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
});

test('Food object URLs are permitted only as images, without adding remote image hosts or executable blobs', () => {
  const directives = new Map(createHostedPreviewCsp('gamen-mothership-staging').split('; ').map(value => {
    const [name, ...sources] = value.split(' '); return [name, sources];
  }));
  assert.deepEqual(directives.get('img-src'), ["'self'", 'data:', 'blob:']);
  for (const [name, sources] of directives) {
    if (name !== 'img-src') assert.equal(sources.includes('blob:'), false, `${name} must not permit object URLs`);
  }
  assert.deepEqual(directives.get('default-src'), ["'none'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
});

test('preview HTTP responses carry every production header, including image policy', async t => {
  const server = createServer((_request, response) => {
    applyHostedPreviewHeaders(response, 'gamen-mothership-staging'); response.end('preview');
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(await response.text(), 'preview');
  const headers = createHostedPreviewHeaders('gamen-mothership-staging');
  assert.equal(headers.length, 7);
  for (const {key, value} of headers) assert.equal(response.headers.get(key), value, key);
});

test('connected emulator exception changes only connect-src and rejects non-local origins', () => {
  const original = createHostedPreviewHeaders('gamen-mothership-staging');
  const local = createEmulatorPreviewHeaders('gamen-mothership-staging', ['http://127.0.0.1:5101', 'http://127.0.0.1:9199']);
  for (let i = 0; i < original.length; i++) {
    if (original[i].key !== 'Content-Security-Policy') assert.deepEqual(local[i], original[i]);
    else {
      const before = original[i].value.split('; '), after = local[i].value.split('; ');
      for (let n = 0; n < before.length; n++) {
        if (before[n].startsWith('connect-src ')) assert.equal(after[n], `${before[n]} http://127.0.0.1:5101 http://127.0.0.1:9199`);
        else assert.equal(after[n], before[n]);
      }
    }
  }
  for (const origins of [[], ['https://example.com'], ['http://localhost.evil:1234'], ['http://localhost:1234/path'],
    ['http://user@localhost:1234'], ['http://localhost:*'], ['*']])
    assert.throws(() => createEmulatorPreviewHeaders('gamen-mothership-staging', origins));
});
