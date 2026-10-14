import assert from 'node:assert/strict';
import test from 'node:test';
import { CLONE_VERSION_PINS, DECLARED_HACK_VERSION_PINS } from '@mothership/contracts';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

const release = { GCLOUD_PROJECT: 'synthetic-board-v2-release', MOTHERSHIP_NEW_MATCH_PROFILE: 'board-v2-1.10',
  MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.4.0', MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: 'v1-preview-469bf64fe98cac5a' };
test('the Board V2 release explicitly selects only the complete Clone successor and new art', () => {
  const selected = assertRuntimeEnvironment(release);
  assert.deepEqual(selected.creationVersions, CLONE_VERSION_PINS);
  assert.equal(selected.assetManifestVersion, 'design-0.4.0');
  assert.equal(selected.emulator, false);
  assert.equal(selected.historicalAssetManifestVersion, release.MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION);
  const previous = assertRuntimeEnvironment({ ...release, MOTHERSHIP_NEW_MATCH_PROFILE: 'declared-hack-1.5', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.3.0' });
  assert.deepEqual(previous.creationVersions, DECLARED_HACK_VERSION_PINS);
});
test('new profile and art cannot be crossed, implicitly activated or partially configured', () => {
  for (const candidate of [
    { ...release, MOTHERSHIP_NEW_MATCH_PROFILE: undefined },
    { ...release, MOTHERSHIP_NEW_MATCH_PROFILE: 'declared-hack-1.5' },
    { ...release, MOTHERSHIP_NEW_MATCH_PROFILE: 'board-v2-1.9' },
    { ...release, MOTHERSHIP_NEW_MATCH_PROFILE: 'full-game-1.10.0' },
    ...['design-0.3.0', 'design-0.2.0', '0.0.0-no-assets', 'unreviewed-art'].map(art => ({ ...release, MOTHERSHIP_ASSET_MANIFEST_VERSION: art })),
    ...[undefined, '', 'design-0.3.0', 'design-0.4.0'].map(art => ({ ...release, MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: art })),
  ]) assert.throws(() => assertRuntimeEnvironment(candidate));
});
test('the new release is selectable in the complete loopback suite without changing its default', () => {
  const local = { GCLOUD_PROJECT: 'demo-mothership', FUNCTIONS_EMULATOR: 'true', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5101' };
  assert.equal(assertRuntimeEnvironment(local).creationVersions, undefined);
  assert.deepEqual(assertRuntimeEnvironment({ ...release, ...local }).creationVersions, CLONE_VERSION_PINS);
});
