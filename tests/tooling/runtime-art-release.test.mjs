import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readRuntimeArtRelease, assertRuntimeArtBundle, RUNTIME_ART_MANIFEST } from '../../scripts/runtime-art-release.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = file => JSON.parse(readFileSync(file, 'utf8'));
function candidate(t) {
  const destination = mkdtempSync(join(tmpdir(), 'mothership-art-release-'));
  t.after(() => rmSync(destination, { recursive: true, force: true }));
  const manifest = read(join(root, RUNTIME_ART_MANIFEST));
  for (const path of [RUNTIME_ART_MANIFEST, ...Object.keys(manifest.sources), ...Object.keys(manifest.runtimeFiles)]) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    cpSync(join(root, path), join(destination, path));
  }
  return { destination, manifest };
}
test('the new art identity names the complete Board V2 release and exact Clone tuple', () => {
  const manifest = readRuntimeArtRelease(root);
  assert.equal(manifest.manifestVersion, 'design-0.4.0');
  assert.equal(manifest.gameplayPins.engineVersion, 'full-game-1.10.0');
  assert.match(manifest.manifestSha256, /^[a-f0-9]{64}$/);
});
test('the historical declared-Hack source and runtime artwork remain independently verifiable', () => {
  const historical = readRuntimeArtRelease(root, 'design-0.3.0');
  assert.equal(historical.gameplayPins.engineVersion, 'full-game-1.5.0');
  assert.equal(historical.manifestSha256, '588e79930746266a3c33ab5aedc1f40a8c464ff92c8e181dec93653d619eaecf');
  assert.equal(Object.keys(historical.bundles).length, 5);
});
for (const [name, mutate] of [
  ['reused historical version', m => { m.manifestVersion = 'design-0.2.0'; }],
  ['crossed gameplay tuple', m => { m.gameplayPins.engineVersion = 'full-game-1.4.0'; }],
  ['missing public bundle', m => { delete m.bundles['public-board']; }],
  ['missing board supplement', m => { delete m.bundles['board-v2-art']; }],
  ['missing motion supplement', m => { delete m.bundles['board-v2-motion-art']; }],
  ['missing setup supplement', m => { delete m.bundles['setup-art']; }],
  ['role-selected remote art URL', m => { m.bundles.roles.url = 'https://example.invalid/alien.css'; }],
  ['empty runtime inventory', m => { m.runtimeFiles = {}; }],
  ['escaping source path', m => { m.sources['../outside'] = 'a'.repeat(64); }],
]) test(`immutable art release rejects ${name}`, t => {
  const { destination, manifest } = candidate(t); mutate(manifest);
  writeFileSync(join(destination, RUNTIME_ART_MANIFEST), JSON.stringify(manifest));
  assert.throws(() => readRuntimeArtRelease(destination), /Runtime art release:/);
});
for (const kind of ['sources', 'runtimeFiles']) test(`immutable art release rejects changed ${kind}`, t => {
  const { destination, manifest } = candidate(t), path = Object.keys(manifest[kind])[0];
  writeFileSync(join(destination, path), 'changed without a new reviewed manifest');
  assert.throws(() => readRuntimeArtRelease(destination), /content differs/);
});
test('bundle output must have both the reviewed URL and exact content', () => {
  const manifest = readRuntimeArtRelease(root);
  assert.throws(() => assertRuntimeArtBundle(manifest, 'roles', manifest.bundles.roles.url, 'wrong content'), /bundle differs: roles/);
  assert.throws(() => assertRuntimeArtBundle(manifest, 'unknown', '/art/unknown.css', ''), /bundle differs: unknown/);
});
