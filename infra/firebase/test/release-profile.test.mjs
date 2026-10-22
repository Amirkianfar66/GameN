import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  VOTE_RESULT_FULL_GAME_VERSION_PINS, isSupportedFullGameVersions, declaredHackEnabled, voteResultEnabled } from '@mothership/engine';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

const production = { GCLOUD_PROJECT: 'synthetic-release-project', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.2.0' };
const legacyAsset = 'v1-preview-469bf64fe98cac5a';
const release = { ...production, MOTHERSHIP_NEW_MATCH_PROFILE: 'declared-hack-1.5', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.3.0',
  MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: legacyAsset };
const local = { GCLOUD_PROJECT: 'demo-mothership', FUNCTIONS_EMULATOR: 'true', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5101' };

test('historical global default stays exactly 1.3 while immutable 1.4/1.5 handlers remain supported', () => {
  assert.deepEqual(FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS);
  assert.equal(FULL_GAME_VERSION_PINS.engineVersion, 'full-game-1.3.0');
  for (const pins of [RESOLUTION_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS]) {
    assert.equal(isSupportedFullGameVersions(pins), true);
  }
  assert.equal(declaredHackEnabled(FULL_GAME_VERSION_PINS), false);
  assert.equal(voteResultEnabled(FULL_GAME_VERSION_PINS), false);
  assert.equal(voteResultEnabled(VOTE_RESULT_FULL_GAME_VERSION_PINS), true);
  assert.equal(declaredHackEnabled(DECLARED_HACK_FULL_GAME_VERSION_PINS), true);
  assert.equal(isSupportedFullGameVersions({ ...DECLARED_HACK_FULL_GAME_VERSION_PINS, rulesetHash: FULL_GAME_VERSION_PINS.rulesetHash }), false);
});

test('production creation remains historical until the explicit reviewed gameplay and art pair is configured', () => {
  const previous = assertRuntimeEnvironment(production);
  assert.equal(previous.creationVersions, undefined);
  assert.equal(previous.assetManifestVersion, 'design-0.2.0');
  const selected = assertRuntimeEnvironment(release);
  assert.deepEqual(selected.creationVersions, DECLARED_HACK_FULL_GAME_VERSION_PINS);
  assert.equal(selected.assetManifestVersion, 'design-0.3.0');
  assert.equal(selected.historicalAssetManifestVersion, legacyAsset);
  assert.equal(selected.emulator, false);
});

test('partial, misspelled or unreviewed creation/art combinations fail before SDK initialization', () => {
  for (const environment of [
    { ...production, MOTHERSHIP_NEW_MATCH_PROFILE: 'declared-hack-1.5' },
    { ...production, MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.3.0' },
    { ...release, MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.2.0' },
    { ...release, MOTHERSHIP_ASSET_MANIFEST_VERSION: 'unrelated-preview-digest' },
    ...[undefined, '', 'design-0.3.0', 'design-0.2.0', 'unreviewed-assets', '0.0.0-no-assets', 'bad/asset'].map(value => ({ ...release, MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: value })),
    ...['', 'true', 'full-game-1.5.0', 'declared-hack-1.6', 'capacity-resolution-1.3'].map(value => ({ ...release, MOTHERSHIP_NEW_MATCH_PROFILE: value })),
  ]) assert.throws(() => assertRuntimeEnvironment(environment));
});

test('the loopback suite uses the same explicit 1.5 release selection and keeps its default unchanged', () => {
  assert.equal(assertRuntimeEnvironment(local).creationVersions, undefined);
  const selected = assertRuntimeEnvironment({ ...local, MOTHERSHIP_NEW_MATCH_PROFILE: 'declared-hack-1.5',
    MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.3.0', MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: legacyAsset });
  assert.equal(selected.emulator, true);
  assert.deepEqual(selected.creationVersions, DECLARED_HACK_FULL_GAME_VERSION_PINS);
  assert.equal(assertRuntimeEnvironment({ ...production, MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: legacyAsset }).historicalAssetManifestVersion, undefined,
    'Disabled-profile behavior ignores the new historical routing option');
  assert.throws(() => assertRuntimeEnvironment({ ...local, MOTHERSHIP_NEW_MATCH_PROFILE: 'declared-hack-1.5' }));
});
