import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { emulatorTestGroups } from '../../scripts/test-emulator.mjs';

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'mothership-emulator-groups-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const directory of ['services/game-api/test-emulator', 'infra/firebase/test-emulator']) mkdirSync(join(root, directory), { recursive: true });
  for (const file of files) writeFileSync(join(root, file), '');
  return root;
}
const functions = ['services/game-api/test-emulator/service.test.mjs', 'infra/firebase/test-emulator/full-http.test.mjs', 'infra/firebase/test-emulator/v1-practice-bots-functions.test.mjs'];

test('emulator grouping retains every suite and isolates newly added service tests from live triggers', t => {
  const extra = ['services/game-api/test-emulator/new-fixture.test.mjs', 'infra/firebase/test-emulator/new-rules.test.mjs'];
  const groups = emulatorTestGroups(fixture(t, [...functions, ...extra]));
  assert.deepEqual(groups.functions, [...functions].sort());
  assert.deepEqual(groups.data, [...extra].sort());
});
test('missing actual Functions acceptance cannot silently pass the data suite', t => {
  assert.throws(() => emulatorTestGroups(fixture(t, functions.slice(1))), /Required Functions suite missing/);
});
test('emulator command construction refuses shell metacharacters in discovered test names', t => {
  assert.throws(() => emulatorTestGroups(fixture(t, [...functions, 'infra/firebase/test-emulator/bad;name.test.mjs'])), /safe shell arguments/);
});
