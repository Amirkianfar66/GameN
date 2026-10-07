import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const directories = ['services/game-api/test-emulator', 'infra/firebase/test-emulator'];
const httpSuites = new Set([
  'services/game-api/test-emulator/service.test.mjs',
  'infra/firebase/test-emulator/full-http.test.mjs',
  'infra/firebase/test-emulator/v1-practice-bots-functions.test.mjs',
]);

export function emulatorTestGroups(root = repositoryRoot) {
  const all = directories.flatMap(directory => readdirSync(resolve(root, directory), { withFileTypes: true })
    .filter(entry => entry.name.endsWith('.test.mjs')).map(entry => {
      assert.ok(entry.isFile() && !entry.isSymbolicLink(), `Invalid emulator test: ${entry.name}`);
      const path = `${directory}/${entry.name}`;
      assert.match(path, /^[A-Za-z0-9._/-]+$/, 'Emulator test paths must be safe shell arguments');
      return path;
    })).sort();
  for (const required of httpSuites) assert.ok(all.includes(required), `Required Functions suite missing: ${required}`);
  const data = all.filter(path => !httpSuites.has(path));
  const functions = all.filter(path => httpSuites.has(path));
  assert.ok(data.length > 0, 'Auth/Firestore suite must not be empty');
  assert.equal(new Set([...data, ...functions]).size, all.length, 'Every emulator file runs exactly once');
  return { data, functions };
}

export function runEmulatorTests(root = repositoryRoot, modes = ['data', 'functions']) {
  const groups = emulatorTestGroups(root);
  const cli = createRequire(resolve(root, 'package.json')).resolve('firebase-tools/lib/bin/firebase.js');
  for (const mode of modes) {
    assert.ok(Object.hasOwn(groups, mode), 'Use test-emulator.mjs [data|functions]');
    // Real-time Tasks/Functions must never observe a fixture whose service clock is injected.
    // A fresh suite retains actual HTTP, private trigger and task dispatch acceptance.
    const only = mode === 'data' ? 'auth,firestore' : 'auth,firestore,functions';
    const command = `node --test --test-concurrency=1 ${groups[mode].join(' ')}`;
    const environment = { ...process.env, MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5101' };
    delete environment.NODE_TEST_CONTEXT;
    console.log(`Emulator group ${mode}: ${groups[mode].length} files; ${only}; demo-mothership`);
    const result = spawnSync(process.execPath, [cli, 'emulators:exec', '--config', 'infra/firebase/firebase.json',
      '--project', 'demo-mothership', '--only', only, command], { cwd: root, env: environment, stdio: 'inherit' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Emulator ${mode} group failed`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length <= 3, 'Use test-emulator.mjs [data|functions]');
  runEmulatorTests(repositoryRoot, process.argv[2] ? [process.argv[2]] : undefined);
}
