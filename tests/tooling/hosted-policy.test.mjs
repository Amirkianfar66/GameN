import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHostedPreviewCsp } from '../../scripts/hosted-preview-policy.mjs';

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
