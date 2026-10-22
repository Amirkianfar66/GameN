import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CLONE_VERSION_PINS, DECLARED_HACK_VERSION_PINS, HOSPITAL_FOUR_VERSION_PINS } from '@mothership/contracts';
import { assertRuntimeEnvironment } from '../dist/runtime.js';
import { readRuntimeArtRelease } from '../../../scripts/runtime-art-release.mjs';

const release = {
  GCLOUD_PROJECT: 'synthetic-hospital-four-release',
  MOTHERSHIP_NEW_MATCH_PROFILE: 'hospital-four-1.11',
  MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.5.0',
  MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: 'v1-preview-469bf64fe98cac5a',
};

test('new Hospital creation and hosted release metadata agree on the exact reviewed gameplay/art pair', () => {
  const selected = assertRuntimeEnvironment(release);
  const art = readRuntimeArtRelease(fileURLToPath(new URL('../../../', import.meta.url)));
  assert.deepEqual(selected.creationVersions, HOSPITAL_FOUR_VERSION_PINS);
  assert.deepEqual(selected.creationVersions, art.gameplayPins);
  assert.equal(selected.assetManifestVersion, art.manifestVersion);
  assert.equal(selected.assetManifestVersion, 'design-0.5.0');
  assert.equal(selected.historicalAssetManifestVersion, release.MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION);
  assert.equal(selected.emulator, false);
});

test('a partial Hospital switch, crossed art pair or unreviewed profile fails before SDK initialization', () => {
  for (const candidate of [
    { ...release, MOTHERSHIP_NEW_MATCH_PROFILE: undefined },
    ...['declared-hack-1.5', 'board-v2-1.10', 'hospital-four-1.12', 'full-game-1.11.0', 'in-person-v1-hospital-four-2026-10-19'].map(profile => ({ ...release, MOTHERSHIP_NEW_MATCH_PROFILE: profile })),
    ...[undefined, 'design-0.3.0', 'design-0.4.0', 'design-0.6.0', '0.0.0-no-assets'].map(art => ({ ...release, MOTHERSHIP_ASSET_MANIFEST_VERSION: art })),
    ...[undefined, '', 'design-0.3.0', 'design-0.4.0', 'design-0.5.0'].map(art => ({ ...release, MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: art })),
  ]) assert.throws(() => assertRuntimeEnvironment(candidate));
});

test('historical creation selections remain supported without inheriting Hospital rules or art', () => {
  for (const [profile, art, pins] of [
    ['declared-hack-1.5', 'design-0.3.0', DECLARED_HACK_VERSION_PINS],
    ['board-v2-1.10', 'design-0.4.0', CLONE_VERSION_PINS],
  ]) {
    const selected = assertRuntimeEnvironment({ ...release, MOTHERSHIP_NEW_MATCH_PROFILE: profile, MOTHERSHIP_ASSET_MANIFEST_VERSION: art });
    assert.deepEqual(selected.creationVersions, pins);
    assert.equal(selected.assetManifestVersion, art);
  }
  const unconfigured = assertRuntimeEnvironment({ GCLOUD_PROJECT: release.GCLOUD_PROJECT, MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.2.0' });
  assert.equal(unconfigured.creationVersions, undefined);
  assert.equal(unconfigured.historicalAssetManifestVersion, undefined);
});

test('the complete loopback suite can select Hospital explicitly without changing its default', () => {
  const local = { GCLOUD_PROJECT: 'demo-mothership', FUNCTIONS_EMULATOR: 'true',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180',
    MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5101' };
  assert.equal(assertRuntimeEnvironment(local).creationVersions, undefined);
  const selected = assertRuntimeEnvironment({ ...release, ...local });
  assert.equal(selected.emulator, true);
  assert.deepEqual(selected.creationVersions, HOSPITAL_FOUR_VERSION_PINS);
  assert.throws(() => assertRuntimeEnvironment({ ...local, MOTHERSHIP_NEW_MATCH_PROFILE: release.MOTHERSHIP_NEW_MATCH_PROFILE }));
});
