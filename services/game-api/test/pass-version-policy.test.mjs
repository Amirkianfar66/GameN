import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS } from '@mothership/engine';

const bytes = path => readFileSync(new URL('../../../rules/overlays/' + path, import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('the current Pass tuple binds exact confirmed overlay bytes and its immutable legacy parent', () => {
  const currentBytes = bytes('ordinary-turn-pass-owner-decision-2026-10-08.json');
  const decision = JSON.parse(currentBytes);
  assert.equal(decision.status, 'confirmed');
  assert.deepEqual(FULL_GAME_VERSION_PINS, {
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
