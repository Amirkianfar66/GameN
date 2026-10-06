// Source pins: every claim in docs/balance rests on these exact files.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { OVERLAY_ABSENT, SOURCE_MANIFEST_SHA256, V1_OVERLAY_PATH, V1_OVERLAY_SHA256, V1_RULESET_VERSION } from './v1/files.mjs';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha256 = path => createHash('sha256').update(read(path)).digest('hex');

test('the rule-source manifest is the one issue #5 pins, and every listed source matches it', () => {
  assert.equal(sha256('rules/source-manifest.json'), SOURCE_MANIFEST_SHA256);
  const manifest = JSON.parse(read('rules/source-manifest.json'));
  assert.equal(manifest.sources.length, 7);
  for (const source of manifest.sources) assert.equal(sha256(source.path), source.sha256, source.path);
});

test('the earlier audit and scenario matrix are unchanged; this baseline adds files beside them', () => {
  const lock = JSON.parse(read('docs/bootstrap-source-lock.json'));
  for (const path of ['docs/balance/rules-audit.md', 'docs/balance/scenario-matrix.json', 'agents/game-balance.md', 'docs/decisions.md']) {
    const pinned = lock.files.find(file => file.path === path);
    assert.ok(pinned, `${path} is pinned by the bootstrap lock`);
    assert.equal(sha256(path), pinned.sha256, `${path} must stay byte-identical`);
  }
});

// The owner-decision file arrives with the engine. Where it is absent this test cannot run, and it
// says so by skipping: the static check then fails unless it was told to expect that.
test('the owner-decision overlay matches its pin', t => {
  if (!existsSync(new URL(V1_OVERLAY_PATH, root))) {
    t.skip(OVERLAY_ABSENT);
    return;
  }
  assert.equal(sha256(V1_OVERLAY_PATH), V1_OVERLAY_SHA256);
  const overlay = JSON.parse(read(V1_OVERLAY_PATH));
  assert.equal(overlay.status, 'confirmed');
  assert.equal(overlay.optional_powers, false);
  assert.deepEqual(overlay.decisions.map(decision => decision.id), Array.from({ length: 21 }, (_, index) => `V1-${String(index + 1).padStart(2, '0')}`));
  const manifest = JSON.parse(read('rules/in-person-v1-manifest.json'));
  assert.equal(manifest.ruleset_version, V1_RULESET_VERSION);
  assert.equal(manifest.baseline_source_manifest_sha256, SOURCE_MANIFEST_SHA256);
});
