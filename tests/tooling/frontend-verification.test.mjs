import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { frontendInputs, assertCompleteSuite } from '../../scripts/test-frontend.mjs';

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'mothership-frontend-check-'));
  for (const workspace of ['apps/game', 'packages/presentation']) mkdirSync(resolve(root, workspace, 'test/nested'), { recursive: true });
  mkdirSync(resolve(root, 'apps/game/scripts'), { recursive: true });
  return root;
}
const complete = '# tests 2\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';

test('missing and empty Frontend suites or exclusion checker fail instead of skipping', () => {
  const root = fixture();
  try {
    assert.throws(() => frontendInputs(root), /suite empty/);
    for (const workspace of ['apps/game', 'packages/presentation']) writeFileSync(resolve(root, workspace, 'test/nested/example.test.mjs'), '');
    assert.throws(() => frontendInputs(root), /exclusion checker missing/);
    writeFileSync(resolve(root, 'apps/game/scripts/check-production-exclusion.mjs'), '');
    const { suites } = frontendInputs(root);
    assert.equal(suites.length, 2);
    assert.ok(suites.every(suite => suite.files.length === 1));
    rmSync(resolve(root, 'apps/game/test'), { recursive: true });
    assert.throws(() => frontendInputs(root), /suite missing/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('TAP completion requires executed tests and no failures, skips, todos or cancellations', () => {
  assert.doesNotThrow(() => assertCompleteSuite(complete, 'Frontend'));
  for (const [name, value] of [['fail', 1], ['skipped', 1], ['todo', 1], ['cancelled', 1], ['pass', 1], ['tests', 0]]) {
    assert.throws(() => assertCompleteSuite(complete.replace(`# ${name} ${name === 'tests' || name === 'pass' ? 2 : 0}`, `# ${name} ${value}`), 'Frontend'));
  }
  assert.throws(() => assertCompleteSuite('', 'Frontend'), /No executed tests/);
});

test('real node:test skipped and todo results fail Frontend verification', () => {
  const root = fixture();
  try {
    const file = resolve(root, 'skip.test.mjs');
    writeFileSync(file, "import test from 'node:test'; test('skip', {skip:true},()=>{}); test.todo('todo');\n");
    const environment = { ...process.env };
    delete environment.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { env: environment, encoding: 'utf8' });
    assert.equal(result.status, 0, 'Node itself permits skips');
    assert.throws(() => assertCompleteSuite(result.stdout, 'Frontend'), /Skipped tests/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
