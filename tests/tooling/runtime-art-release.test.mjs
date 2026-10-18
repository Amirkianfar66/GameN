import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readRuntimeArtRelease, readHistoricalRuntimeArtRelease, assertRuntimeArtBundle,
  RUNTIME_ART_VERSION, RUNTIME_ART_MANIFEST, HOSPITAL_FOUR_ART_VERSION,
  HOSPITAL_FOUR_ART_MANIFEST, HISTORICAL_ART_BLOBS } from '../../scripts/runtime-art-release.mjs';
import { prepareBoardV2FilmsArt } from '../../apps/game/hosted/build/board-v2-films-art.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = file => JSON.parse(readFileSync(file, 'utf8'));
function candidate(t) {
  const destination = mkdtempSync(join(tmpdir(), 'mothership-art-release-'));
  t.after(() => rmSync(destination, { recursive: true, force: true }));
  const manifest = read(join(root, HOSPITAL_FOUR_ART_MANIFEST));
  for (const path of [HOSPITAL_FOUR_ART_MANIFEST, ...Object.keys(manifest.sources), ...Object.keys(manifest.runtimeFiles)]) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    cpSync(join(root, path), join(destination, path));
  }
  return { destination, manifest };
}
test('the explicit candidate binds nine common bundles to the exact four-bed successor', () => {
  const manifest = readRuntimeArtRelease(root, HOSPITAL_FOUR_ART_VERSION);
  assert.equal(manifest.manifestVersion, 'design-0.5.0');
  assert.equal(manifest.gameplayPins.engineVersion, 'full-game-1.11.0');
  assert.equal(manifest.gameplayPins.rulesetVersion, 'in-person-v1-hospital-four-2026-10-19');
  assert.equal(Object.keys(manifest.bundles).length, 9);
  assert.match(manifest.manifestSha256, /^[a-f0-9]{64}$/);
});
test('adding a candidate does not activate the default art identity', () => {
  assert.equal(RUNTIME_ART_VERSION, 'design-0.4.0');
  assert.equal(RUNTIME_ART_MANIFEST, 'design/releases/design-0.4.0.json');
});
test('the historical declared-Hack source and runtime artwork remain independently verifiable', () => {
  const historical = readHistoricalRuntimeArtRelease(root, 'design-0.3.0');
  assert.equal(historical.gameplayPins.engineVersion, 'full-game-1.5.0');
  assert.equal(historical.manifestSha256, '588e79930746266a3c33ab5aedc1f40a8c464ff92c8e181dec93653d619eaecf');
  assert.equal(Object.keys(historical.bundles).length, 5);
});
test('the historical Board V2 manifest retains its exact hash and Clone agreement', () => {
  const historical = readHistoricalRuntimeArtRelease(root, 'design-0.4.0');
  assert.equal(historical.gameplayPins.engineVersion, 'full-game-1.10.0');
  assert.equal(historical.manifestSha256, '64975b15cd9815472dc35276e19bdc9ffbdd13040a89f72ab9c15b3cf1cce33e');
  assert.equal(Object.keys(historical.bundles).length, 8);
});
test('historical verification cannot be substituted for a candidate or an unknown release', () => {
  for (const version of ['design-0.5.0', 'unknown', undefined]) {
    assert.throws(() => readHistoricalRuntimeArtRelease(root, version), /no preserved snapshot/);
  }
});
test('the new common film bundle matches the registered complete output', () => {
  const manifest = readRuntimeArtRelease(root, HOSPITAL_FOUR_ART_VERSION);
  const art = prepareBoardV2FilmsArt(root);
  assert.equal(art.assetCount, 100);
  assert.equal(art.byteLength, 1462181);
  assertRuntimeArtBundle(manifest, 'board-v2-films-art', art.url, art.stylesheet);
  const previous = readHistoricalRuntimeArtRelease(root, 'design-0.4.0');
  for (const [name, bundle] of Object.entries(previous.bundles)) assert.deepEqual(manifest.bundles[name], bundle);
});
test('all adopted drawing-module imports remain within the pinned runtime closure', () => {
  const manifest = readRuntimeArtRelease(root, HOSPITAL_FOUR_ART_VERSION);
  for (const path of Object.keys(manifest.runtimeFiles).filter(path => /\/(?:board-v2-drawing|scene-drawing)\/.*\.mjs$/.test(path))) {
    const source = readFileSync(join(root, path), 'utf8');
    for (const [, dependency] of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)) {
      assert.ok(dependency.startsWith('.'), `unreviewed external import in ${path}: ${dependency}`);
      const target = relative(root, resolve(root, dirname(path), dependency));
      assert.ok(Object.hasOwn(manifest.runtimeFiles, target), `unpinned dependency ${target} from ${path}`);
    }
  }
});
for (const [name, mutate] of [
  ['reused historical version', m => { m.manifestVersion = 'design-0.2.0'; }],
  ['crossed gameplay tuple', m => { m.gameplayPins.engineVersion = 'full-game-1.4.0'; }],
  ['missing public bundle', m => { delete m.bundles['public-board']; }],
  ['missing board supplement', m => { delete m.bundles['board-v2-art']; }],
  ['missing motion supplement', m => { delete m.bundles['board-v2-motion-art']; }],
  ['missing films supplement', m => { delete m.bundles['board-v2-films-art']; }],
  ['missing setup supplement', m => { delete m.bundles['setup-art']; }],
  ['role-selected remote art URL', m => { m.bundles.roles.url = 'https://example.invalid/alien.css'; }],
  ['empty runtime inventory', m => { m.runtimeFiles = {}; }],
  ['escaping source path', m => { m.sources['../outside'] = 'a'.repeat(64); }],
]) test(`immutable art release rejects ${name}`, t => {
  const { destination, manifest } = candidate(t); mutate(manifest);
  writeFileSync(join(destination, HOSPITAL_FOUR_ART_MANIFEST), JSON.stringify(manifest));
  assert.throws(() => readRuntimeArtRelease(destination, HOSPITAL_FOUR_ART_VERSION), /Runtime art release:/);
});
for (const kind of ['sources', 'runtimeFiles']) test(`immutable art release rejects changed ${kind}`, t => {
  const { destination, manifest } = candidate(t), path = Object.keys(manifest[kind])[0];
  writeFileSync(join(destination, path), 'changed without a new reviewed manifest');
  assert.throws(() => readRuntimeArtRelease(destination, HOSPITAL_FOUR_ART_VERSION), /content differs/);
});
test('bundle output must have both the reviewed URL and exact content', () => {
  const manifest = readRuntimeArtRelease(root, HOSPITAL_FOUR_ART_VERSION);
  assert.throws(() => assertRuntimeArtBundle(manifest, 'roles', manifest.bundles.roles.url, 'wrong content'), /bundle differs: roles/);
  assert.throws(() => assertRuntimeArtBundle(manifest, 'unknown', '/art/unknown.css', ''), /bundle differs: unknown/);
});

function historicalCandidate(t, version = 'design-0.4.0') {
  const destination = mkdtempSync(join(tmpdir(), 'mothership-historical-art-'));
  t.after(() => rmSync(destination, { recursive: true, force: true }));
  const manifestPath = `design/releases/${version}.json`;
  const manifest = read(join(root, manifestPath));
  const paths = [manifestPath, ...new Set([...Object.values(manifest.sources), ...Object.values(manifest.runtimeFiles)].map(digest => `${HISTORICAL_ART_BLOBS}/${digest}`))];
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    cpSync(join(root, path), join(destination, path));
  }
  return { destination, manifest, manifestPath, version };
}

test('historical snapshot validation works without Git or the old runtime checkout', t => {
  const { destination, version } = historicalCandidate(t);
  assert.equal(readHistoricalRuntimeArtRelease(destination, version).manifestVersion, version);
  assert.throws(() => readRuntimeArtRelease(destination, version), /ENOENT/);
});
test('a changed current UI never falls back silently to preserved historical bytes', t => {
  const { destination, manifest, version } = historicalCandidate(t);
  for (const [path, digest] of Object.entries({ ...manifest.sources, ...manifest.runtimeFiles })) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    cpSync(join(destination, HISTORICAL_ART_BLOBS, digest), join(destination, path));
  }
  assert.equal(readRuntimeArtRelease(destination, version).manifestVersion, version);
  writeFileSync(join(destination, 'packages/presentation/src/model/connected-player.ts'), '// changed consumer\n');
  assert.throws(() => readRuntimeArtRelease(destination, version), /content differs: packages\/presentation/);
  assert.equal(readHistoricalRuntimeArtRelease(destination, version).manifestVersion, version);
});
test('historical evidence rejects changed manifest bytes even when their structure remains valid', t => {
  const { destination, manifestPath, version } = historicalCandidate(t);
  writeFileSync(join(destination, manifestPath), readFileSync(join(destination, manifestPath), 'utf8') + '\n');
  assert.throws(() => readHistoricalRuntimeArtRelease(destination, version), /historical manifest differs/);
});
test('historical evidence rejects a changed content-addressed blob', t => {
  const { destination, manifest, version } = historicalCandidate(t);
  writeFileSync(join(destination, HISTORICAL_ART_BLOBS, Object.values(manifest.runtimeFiles)[0]), 'changed');
  assert.throws(() => readHistoricalRuntimeArtRelease(destination, version), /content differs/);
});
