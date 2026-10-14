import assert from 'node:assert/strict';
import test from 'node:test';
import { CLONE_VERSION_PINS, DECLARED_HACK_VERSION_PINS, VOTE_RESULT_VERSION_PINS, PUBLIC_HACK_VERSION_PINS, BOARD_MEDICAL_VERSION_PINS, CAPTAIN_OUTCOMES_VERSION_PINS, BLACKOUT_VERSION_PINS } from '@mothership/contracts';
import { LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS } from '@mothership/engine';
import { selectPreparedArt } from '../dist/prepared-art.js';

const legacy = 'v1-preview-469bf64fe98cac5a';
test('Board V2 release routes unprepared historical lobbies by their stored exact pins', () => {
  for (const pins of [LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS]) {
    assert.equal(selectPreparedArt(pins, 'design-0.4.0', legacy), legacy);
  }
  assert.equal(selectPreparedArt(VOTE_RESULT_VERSION_PINS, 'design-0.4.0', legacy), 'design-0.2.0');
  assert.equal(selectPreparedArt(DECLARED_HACK_VERSION_PINS, 'design-0.4.0', legacy), 'design-0.3.0');
  assert.equal(selectPreparedArt(CLONE_VERSION_PINS, 'design-0.4.0', legacy), 'design-0.4.0');
});
test('unpaired intermediate versions and crossed hashes cannot borrow the Board V2 artwork', () => {
  for (const pins of [PUBLIC_HACK_VERSION_PINS, BOARD_MEDICAL_VERSION_PINS, CAPTAIN_OUTCOMES_VERSION_PINS, BLACKOUT_VERSION_PINS,
    { ...CLONE_VERSION_PINS, rulesetHash: DECLARED_HACK_VERSION_PINS.rulesetHash }]) {
    assert.throws(() => selectPreparedArt(pins, 'design-0.4.0', legacy), /No reviewed art pairing/);
  }
});
test('historical configuration and explicit synthetic services keep their original routing', () => {
  assert.equal(selectPreparedArt(DECLARED_HACK_VERSION_PINS, 'design-0.3.0', legacy), 'design-0.3.0');
  assert.equal(selectPreparedArt(VOTE_RESULT_VERSION_PINS, 'design-0.3.0', legacy), 'design-0.2.0');
  assert.equal(selectPreparedArt(CLONE_VERSION_PINS, '0.0.0-no-assets'), '0.0.0-no-assets');
});
