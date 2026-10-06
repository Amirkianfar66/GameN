// Exit status of the balance commands. They are meant to be used as verification gates, so a run
// that could not do its work must not end like a run that succeeded. These tests start the real
// scripts against stand-in engines written to a temporary directory. No real engine is involved,
// and the stand-ins contain no rules.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from './v1/files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'mothership-balance-commands-'));
test.after(() => { rmSync(work, { recursive: true, force: true }); });

const run = (name, ...args) => spawnSync(process.execPath, [join(root, 'tools/balance/scripts', name), ...args], { cwd: root, encoding: 'utf8' });

// An importable engine with the full-game API whose every setup fails: the integration review's
// reproducer for finding R2.
const refusing = join(work, 'refusing');
mkdirSync(join(refusing, 'packages/engine/dist'), { recursive: true });
writeFileSync(join(refusing, 'packages/engine/package.json'), '{ "type": "module" }\n');
writeFileSync(join(refusing, 'packages/engine/dist/index.js'), [
  "export const FULL_ENGINE_VERSION = 'stand-in';",
  "export function createFullGame() { throw new Error('stand-in engine refuses every setup'); }",
  ...['executeFullGame', 'advanceFullGame', 'abortFullGame', 'projectFullGame'].map(name => `export function ${name}() { throw new Error('unreachable'); }`),
  '',
].join('\n'));
// A directory with no engine in it. Passing it keeps these tests independent of whichever engine
// the checkout itself contains.
const absent = join(work, 'absent');
mkdirSync(absent);

const ready = loadAll().filter(scenario => scenario.status === 'ready');
const readyInModes = ready.filter(scenario => scenario.mode !== null).length;

test('the controls command fails when its baselines do not pass', () => {
  const out = join(work, 'controls.json');
  const result = run('controls.mjs', '--engine-root', refusing, '--out', out);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, new RegExp(`FAILED: ${readyInModes} of ${readyInModes} ready scenarios do not pass unmodified`));
  assert.match(result.stderr, /FAILED: no control was executed/);
  assert.match(result.stdout, /BASELINE NOT PASSING V1-M7-SETUP-01: the engine refused a legal setup/);
  const summary = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(summary.verdict, 'failed');
  assert.equal(summary.baselineFailures.length, readyInModes);
  for (const mode of [7, 8, 9]) {
    assert.equal(summary.modes[mode].controls, 0);
    assert.equal(summary.modes[mode].baselineNotPassing, summary.modes[mode].scenarios);
  }
});

test('with no engine the three commands say NOT RUN, and fail only when an engine is required', () => {
  for (const name of ['controls.mjs', 'walk.mjs']) {
    const lenient = run(name, '--engine-root', absent);
    assert.equal(lenient.status, 0, `${name}: ${lenient.stderr}`);
    assert.match(lenient.stdout, /^NOT RUN\./);
    const strict = run(name, '--engine-root', absent, '--require-engine');
    assert.equal(strict.status, 2, `${name}: ${strict.stderr}`);
    assert.match(strict.stdout, /^NOT RUN\./);
  }
  const lenient = run('run-scenarios.mjs', '--engine-root', absent);
  assert.equal(lenient.status, 0, lenient.stderr);
  assert.match(lenient.stdout, /^No scenario was executed\./);
  assert.match(lenient.stdout, new RegExp(`all +total +\\d+ +passed +0 +failed +0 +blocked +\\d+ +not-run +\\d+`));
  const strict = run('run-scenarios.mjs', '--engine-root', absent, '--require-engine');
  assert.equal(strict.status, 2, strict.stderr);
  assert.match(strict.stderr, /--require-engine was given and no engine is available/);
});

test('an engine that refuses every setup fails the scenario and playout commands without passing or crashing', () => {
  const scenarios = run('run-scenarios.mjs', '--engine-root', refusing);
  assert.equal(scenarios.status, 1, scenarios.stderr);
  const blocked = loadAll().filter(scenario => scenario.status === 'blocked').length;
  // Every ready case of a mode fails; the refused-setup cases pass, which is what they ask for;
  // and a blocked case stays blocked.
  assert.match(scenarios.stdout, new RegExp(`all +total +\\d+ +passed +${ready.length - readyInModes} +failed +${readyInModes} +blocked +${blocked} `));
  const playouts = run('walk.mjs', '--engine-root', refusing, '--seeds', '2');
  assert.equal(playouts.status, 1, playouts.stderr);
  assert.match(playouts.stdout, /mode 7: 2 playouts, 0 finished/);
  assert.doesNotMatch(playouts.stderr, /at .*walker/);
});
