import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS, PUBLIC_HACK_FULL_GAME_VERSION_PINS,
  DECLARED_HACK_FULL_GAME_VERSION_PINS, publicHackEnabled } from '@mothership/engine';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

const release = { GCLOUD_PROJECT: 'synthetic-capsule-profile',
  MOTHERSHIP_NEW_MATCH_PROFILE: 'declared-hack-1.5', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'design-0.3.0',
  MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION: 'v1-preview-469bf64fe98cac5a' };

test('public-Hack draft cannot become a runtime creation profile or replace historical defaults', () => {
  assert.deepEqual(FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS);
  assert.equal(publicHackEnabled(FULL_GAME_VERSION_PINS), false);
  assert.equal(publicHackEnabled(PUBLIC_HACK_FULL_GAME_VERSION_PINS), true);
  const selected = assertRuntimeEnvironment(release);
  assert.deepEqual(selected.creationVersions, DECLARED_HACK_FULL_GAME_VERSION_PINS);
  assert.equal(publicHackEnabled(selected.creationVersions), false);
  for (const profile of ['public-hack-1.6', 'capsule-1.6', PUBLIC_HACK_FULL_GAME_VERSION_PINS.engineVersion,
    PUBLIC_HACK_FULL_GAME_VERSION_PINS.rulesetVersion]) {
    assert.throws(() => assertRuntimeEnvironment({ ...release, MOTHERSHIP_NEW_MATCH_PROFILE: profile }),
      /Unsupported new-match release profile/);
  }
});
