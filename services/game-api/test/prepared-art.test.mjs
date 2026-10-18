import assert from 'node:assert/strict';
import test from 'node:test';
import { HOSPITAL_FOUR_VERSION_PINS, CLONE_VERSION_PINS, DECLARED_HACK_VERSION_PINS, VOTE_RESULT_VERSION_PINS, PUBLIC_HACK_VERSION_PINS, BOARD_MEDICAL_VERSION_PINS, CAPTAIN_OUTCOMES_VERSION_PINS, BLACKOUT_VERSION_PINS } from '@mothership/contracts';
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


test('Hospital4 preparation requires its exact reviewed tuple and successor artwork', () => {
  assert.equal(selectPreparedArt(HOSPITAL_FOUR_VERSION_PINS, 'design-0.5.0', legacy), 'design-0.5.0');
  assert.equal(selectPreparedArt(HOSPITAL_FOUR_VERSION_PINS, 'design-0.5.0'), 'design-0.5.0');
  for (const art of ['design-0.4.0', 'design-0.3.0', '0.0.0-no-assets']) {
    assert.throws(() => selectPreparedArt(HOSPITAL_FOUR_VERSION_PINS, art, legacy), /No reviewed art pairing/);
    assert.throws(() => selectPreparedArt(HOSPITAL_FOUR_VERSION_PINS, art), /No reviewed art pairing/);
  }
});
test('Hospital4 service preserves exact historical art for previously unprepared stored lobbies', () => {
  for (const pins of [LEGACY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS])
    assert.equal(selectPreparedArt(pins, 'design-0.5.0', legacy), legacy);
  for (const [pins, art] of [[VOTE_RESULT_VERSION_PINS, 'design-0.2.0'], [DECLARED_HACK_VERSION_PINS, 'design-0.3.0'], [CLONE_VERSION_PINS, 'design-0.4.0']])
    assert.equal(selectPreparedArt(pins, 'design-0.5.0', legacy), art);
  for (const pins of [PUBLIC_HACK_VERSION_PINS, BOARD_MEDICAL_VERSION_PINS, CAPTAIN_OUTCOMES_VERSION_PINS, BLACKOUT_VERSION_PINS])
    assert.throws(() => selectPreparedArt(pins, 'design-0.5.0', legacy), /No reviewed art pairing/);
});
test('crossed Hospital4 pins and successor art without historical routing fail closed', () => {
  for (const pins of [
    { ...HOSPITAL_FOUR_VERSION_PINS, rulesetHash: CLONE_VERSION_PINS.rulesetHash },
    { ...CLONE_VERSION_PINS, rulesetHash: HOSPITAL_FOUR_VERSION_PINS.rulesetHash },
    { ...HOSPITAL_FOUR_VERSION_PINS, engineVersion: CLONE_VERSION_PINS.engineVersion },
  ]) assert.throws(() => selectPreparedArt(pins, 'design-0.5.0', legacy), /No reviewed art pairing/);
  for (const pins of [CLONE_VERSION_PINS, DECLARED_HACK_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS])
    assert.throws(() => selectPreparedArt(pins, 'design-0.5.0'), /No reviewed art pairing/);
});
