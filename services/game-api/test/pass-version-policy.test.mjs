import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS } from '@mothership/engine';

const bytes = path => readFileSync(new URL('../../../rules/overlays/' + path, import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('the preserved Pass tuple binds exact confirmed overlay bytes and its immutable legacy parent', () => {
  const currentBytes = bytes('ordinary-turn-pass-owner-decision-2026-10-08.json');
  const decision = JSON.parse(currentBytes);
  assert.equal(decision.status, 'confirmed');
  assert.deepEqual(PASS_FULL_GAME_VERSION_PINS, {
    protocolVersion: decision.protocol_version, engineVersion: decision.engine_version,
    rulesetVersion: decision.ruleset_version, rulesetHash: sha256(currentBytes),
  });
  assert.deepEqual(decision.parent_ruleset, {
    version: LEGACY_FULL_GAME_VERSION_PINS.rulesetVersion, hash: LEGACY_FULL_GAME_VERSION_PINS.rulesetHash,
  });
  assert.equal(sha256(bytes('in-person-v1-owner-decisions-2026-10-06.json')), LEGACY_FULL_GAME_VERSION_PINS.rulesetHash);
  assert.equal(LEGACY_FULL_GAME_VERSION_PINS.engineVersion, 'full-game-1.0.1');
  assert.equal(LEGACY_FULL_GAME_VERSION_PINS.protocolVersion, 2);
});

test('the preserved capacity tuple binds exact confirmed overlay bytes and its immutable Pass parent', () => {
  const currentBytes = bytes('room-capacity-owner-decision-2026-10-11.json');
  const decision = JSON.parse(currentBytes);
  assert.equal(decision.status, 'confirmed');
  assert.deepEqual(CAPACITY_FULL_GAME_VERSION_PINS, {
    protocolVersion: decision.protocol_version, engineVersion: decision.engine_version,
    rulesetVersion: decision.ruleset_version, rulesetHash: sha256(currentBytes),
  });
  assert.deepEqual(decision.parent_ruleset, {
    version: PASS_FULL_GAME_VERSION_PINS.rulesetVersion, hash: PASS_FULL_GAME_VERSION_PINS.rulesetHash,
  });
  assert.equal(sha256(bytes('ordinary-turn-pass-owner-decision-2026-10-08.json')), PASS_FULL_GAME_VERSION_PINS.rulesetHash);
  assert.equal(PASS_FULL_GAME_VERSION_PINS.engineVersion, 'full-game-1.1.0');
  assert.equal(PASS_FULL_GAME_VERSION_PINS.protocolVersion, 2);
});

test('the preserved resolution tuple binds exact owner decisions and its immutable capacity parent', () => {
  const currentBytes = bytes('room-capacity-resolution-owner-decision-2026-10-12.json');
  const decision = JSON.parse(currentBytes);
  assert.equal(decision.status, 'confirmed');
  assert.deepEqual(RESOLUTION_FULL_GAME_VERSION_PINS, {
    protocolVersion: decision.protocol_version, engineVersion: decision.engine_version,
    rulesetVersion: decision.ruleset_version, rulesetHash: sha256(currentBytes),
  });
  assert.deepEqual(decision.parent_ruleset, {
    version: CAPACITY_FULL_GAME_VERSION_PINS.rulesetVersion, hash: CAPACITY_FULL_GAME_VERSION_PINS.rulesetHash,
  });
  assert.equal(CAPACITY_FULL_GAME_VERSION_PINS.engineVersion, 'full-game-1.2.0');
});

test('vote results bind their exact owner overlay and preserved resolution parent', () => {
  const raw = bytes('vote-result-owner-decision-2026-10-12.json'), decision = JSON.parse(raw);
  assert.equal(decision.status,'confirmed');
  assert.deepEqual(VOTE_RESULT_FULL_GAME_VERSION_PINS,{protocolVersion:2,engineVersion:decision.engine_version,rulesetVersion:decision.ruleset_version,rulesetHash:sha256(raw)});
  assert.deepEqual(decision.parent_ruleset,{version:RESOLUTION_FULL_GAME_VERSION_PINS.rulesetVersion,hash:RESOLUTION_FULL_GAME_VERSION_PINS.rulesetHash});
});
