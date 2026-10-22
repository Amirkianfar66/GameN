import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS, BOARD_MEDICAL_FULL_GAME_VERSION_PINS,
  DECLARED_HACK_FULL_GAME_VERSION_PINS, boardMedicalEnabled } from '@mothership/engine';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

const release = { GCLOUD_PROJECT:'synthetic-board-medical-profile',
  MOTHERSHIP_NEW_MATCH_PROFILE:'declared-hack-1.5', MOTHERSHIP_ASSET_MANIFEST_VERSION:'design-0.3.0',
  MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION:'v1-preview-469bf64fe98cac5a' };

test('Board/medical draft cannot select a creation profile or change historical defaults/art', () => {
  assert.deepEqual(FULL_GAME_VERSION_PINS,RESOLUTION_FULL_GAME_VERSION_PINS);
  const selected = assertRuntimeEnvironment(release);
  assert.deepEqual(selected.creationVersions,DECLARED_HACK_FULL_GAME_VERSION_PINS);
  assert.equal(boardMedicalEnabled(selected.creationVersions),false);
  for (const profile of ['board-medical-1.7','board-v2-1.7',BOARD_MEDICAL_FULL_GAME_VERSION_PINS.engineVersion,
    BOARD_MEDICAL_FULL_GAME_VERSION_PINS.rulesetVersion]) {
    assert.throws(()=>assertRuntimeEnvironment({...release,MOTHERSHIP_NEW_MATCH_PROFILE:profile}),/Unsupported new-match release profile/);
  }
});
