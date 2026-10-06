import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
function tests(directory) {
  assert.ok(existsSync(directory), `Required Frontend suite missing: ${directory}; integrate the pinned Frontend commit before verification`);
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Symlink in Frontend suite: ${path}`);
    return entry.isDirectory() ? tests(path) : entry.name.endsWith('.test.mjs') ? [path] : [];
  }).sort();
}
export function frontendInputs(root = repositoryRoot) {
  const suites = ['packages/presentation', 'apps/game'].map(workspace => {
    const files = tests(resolve(root, workspace, 'test'));
    assert.ok(files.length > 0, `Required Frontend suite empty: ${workspace}`);
    return { workspace, files };
  });
  const exclusion = resolve(root, 'apps/game/scripts/check-production-exclusion.mjs');
  assert.ok(existsSync(exclusion), 'Required Frontend production-exclusion checker missing');
  return { suites, exclusion };
}
export function assertCompleteSuite(output, workspace) {
  const count = name => Number(output.match(new RegExp(`^# ${name} (\\d+)$`, 'm'))?.[1] ?? NaN);
  assert.ok(count('tests') > 0, `No executed tests in ${workspace}`);
  assert.equal(count('fail'), 0, `Failed tests in ${workspace}`);
  assert.equal(count('cancelled'), 0, `Cancelled tests in ${workspace}`);
  assert.equal(count('skipped'), 0, `Skipped tests in ${workspace} are not passing verification`);
  assert.equal(count('todo'), 0, `Todo tests in ${workspace} are not passing verification`);
  assert.equal(count('pass'), count('tests'), `Incomplete tests in ${workspace}`);
}
export function runFrontend(root = repositoryRoot) {
  const { suites, exclusion } = frontendInputs(root);
  for (const { workspace, files } of suites) {
    const environment = { ...process.env };
    delete environment.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: root, env: environment, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Frontend suite failed: ${workspace}`);
    assertCompleteSuite(result.stdout, workspace);
  }
  const result = spawnSync(process.execPath, [exclusion], { cwd: dirname(dirname(exclusion)), stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'Frontend production-exclusion check failed');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runFrontend();
