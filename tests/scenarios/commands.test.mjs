// Exit status of the balance commands. They are meant to be used as verification gates, so a run
// that could not do its work must not end like a run that succeeded. These tests start the real
// scripts against stand-in engines written to a temporary directory. No real engine is involved,
// and the stand-ins contain no rules.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENGINE_COMMIT_BASIS, controlsFor, hasTwin } from '@mothership/balance';
import { engineBuildDigest, engineProvenance, treeState } from '../../tools/balance/scripts/pins.mjs';
import { LEAKS, leakModes } from './support/disclosing.mjs';
import { ADAPTER, ENGINE_COMMIT, TREE_COMMIT, catalogue, cleanReports, disk, first, judge, runOf, script, writeReports } from './support/gate-reports.mjs';
import { OVERLAY_ABSENT, V1_OVERLAY_PATH, loadAll } from './v1/files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'mothership-balance-commands-'));
test.after(() => { rmSync(work, { recursive: true, force: true }); });

const run = (name, ...args) => spawnSync(process.execPath, [join(root, 'tools/balance/scripts', name), ...args], { cwd: root, encoding: 'utf8' });
// As `npm run --workspace` starts a script: in the workspace directory, with INIT_CWD naming the
// directory the person was in.
const runFrom = (directory, name, ...args) => spawnSync(process.execPath, [join(root, 'tools/balance/scripts', name), ...args], { cwd: join(root, 'tools/balance'), encoding: 'utf8', env: { ...process.env, INIT_CWD: directory } });

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

test('a relative path means the directory the command was started from, not the workspace directory', () => {
  // The stand-in engine is found only if --engine-root is resolved against INIT_CWD. Resolved
  // against the workspace directory there is no engine, and the commands would say NOT RUN.
  const scenarios = runFrom(work, 'run-scenarios.mjs', '--engine-root', 'refusing', '--out', 'relative/scenarios.json');
  assert.equal(scenarios.status, 1, scenarios.stdout + scenarios.stderr);
  assert.match(scenarios.stdout, new RegExp(`all +total +\\d+ +passed +${ready.length - readyInModes} +failed +${readyInModes} `));
  assert.equal(JSON.parse(readFileSync(join(work, 'relative/scenarios.json'), 'utf8')).totals.failed, readyInModes);
  const controls = runFrom(work, 'controls.mjs', '--engine-root', 'refusing', '--out', 'relative/controls.json');
  assert.equal(controls.status, 1, controls.stdout + controls.stderr);
  assert.equal(JSON.parse(readFileSync(join(work, 'relative/controls.json'), 'utf8')).verdict, 'failed');
  const playouts = runFrom(work, 'walk.mjs', '--engine-root', 'refusing', '--seeds', '1', '--out', 'relative/playouts.json');
  assert.equal(playouts.status, 1, playouts.stdout + playouts.stderr);
  assert.equal(JSON.parse(readFileSync(join(work, 'relative/playouts.json'), 'utf8')).modes[7].completed, 0);
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

// The report gate, the one-command engine gate and the strict runner of these static tests, as commands.
test('the gate command exits 0 only for a complete and clean set of reports', () => {
  const needed = ['--engine-commit', ENGINE_COMMIT, '--playouts-per-mode', '10'];
  const named = writeReports(join(work, 'clean'), cleanReports());
  const clean = script('gate.mjs', [...named, ...needed]);
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /^Balance report gate: PASSED\.\n {2}every report came from one clean commit; no candidate commit was named/);
  assert.match(clean.stdout, new RegExp(`${catalogue.length} in the catalogue, each reported once`));
  assert.match(clean.stdout, /engine commit: read from Git, head of the engine checkout; build digest e{16}\n/);
  assert.match(clean.stdout, /It says nothing about balance or human play\./);
  // Both spellings of an option mean the same, and what kind of pass it was is said first.
  const pinned = script('gate.mjs', [...named, ...needed, `--candidate-commit=${TREE_COMMIT}`]);
  assert.equal(pinned.status, 0, pinned.stdout + pinned.stderr);
  assert.match(pinned.stdout, new RegExp(`^Balance report gate: PASSED\\.\\n {2}pinned to the candidate commit ${TREE_COMMIT}`));
  for (const form of [['--candidate-commit', 'c'.repeat(40)], [`--candidate-commit=${'c'.repeat(40)}`]]) {
    const elsewhere = script('gate.mjs', [...named, ...needed, ...form]);
    assert.equal(elsewhere.status, 1, form.join(' '));
    assert.match(elsewhere.stderr, /not the clean candidate c{40}/);
  }
  const trial = script('gate.mjs', [...named, ...needed, '--allow-unpinned-tree']);
  assert.equal(trial.status, 0, trial.stdout + trial.stderr);
  assert.match(trial.stdout, /^Balance report gate: PASSED AS A TRIAL\.\n.*This is not a result for a merge gate\./);

  const failing = cleanReports();
  const ready = first('ready');
  runOf(failing, ready.id).status = 'failed';
  const failed = script('gate.mjs', [...writeReports(join(work, 'failing'), failing), ...needed]);
  assert.equal(failed.status, 1, failed.stdout + failed.stderr);
  assert.match(failed.stderr, /^Balance report gate: FAILED, 2 problems\./);
  assert.match(failed.stderr, new RegExp(`${ready.id} is ready and was failed`));
  assert.doesNotMatch(failed.stdout, /PASSED/);

  const absent = script('gate.mjs', [...named.slice(0, 4), '--playouts', join(work, 'clean/none.json'), ...needed]);
  assert.equal(absent.status, 1, absent.stdout + absent.stderr);
  assert.match(absent.stderr, /playouts: .*none\.json cannot be read/);

  // Other numbers than the ones asked for are a failure, not a smaller pass.
  const fewer = script('gate.mjs', [...named, '--engine-commit', ENGINE_COMMIT, '--playouts-per-mode', '200']);
  assert.equal(fewer.status, 1);
  assert.match(fewer.stderr, /10 playouts per mode were asked for, 200 are required/);
  const other = script('gate.mjs', [...named, '--engine-commit', 'c'.repeat(40), '--playouts-per-mode', '10']);
  assert.equal(other.status, 1);
  assert.match(other.stderr, /the engine commit is a{40}, not c{40}/);

  // A gate that was not told what to check has checked nothing, and says so with its own status.
  // That covers an option that is missing, misspelt, repeated or without its value: none of them
  // may quietly switch a check off, as an empty shell variable or a typing mistake would.
  const untold = [
    [[...named.slice(2), ...needed], /No scenarios report was named/],
    [[...named, '--playouts-per-mode', '10'], /No engine commit was named/],
    [[...named, '--engine-commit', ENGINE_COMMIT], /number of playouts per mode was not given/],
    [[...named, ...needed, '--candidate-commit'], /argument missing/],
    [[...named, ...needed, '--candidate-commit', ''], /--candidate-commit was given without a value/],
    [[...named, ...needed, '--candidate-commit='], /--candidate-commit was given without a value/],
    [[...named, '--engine-commit', '--playouts-per-mode', '10'], /argument is ambiguous/],
    [[...named, ...needed, '--candidate', 'c'.repeat(40)], /Unknown option '--candidate'/],
    [[...named, ...needed, '--candidate_commit', 'c'.repeat(40)], /Unknown option '--candidate_commit'/],
    [[...named, ...needed, '--allow-unpinned-trees'], /Unknown option '--allow-unpinned-trees'/],
    [[...named, ...needed, '--allow-unpinned-tree=no'], /does not take an argument/],
    [[...named, ...needed, '--playouts-per-mode', '10'], /--playouts-per-mode was given more than once/],
    [[...named, ...needed, 'extra.json'], /Unexpected argument 'extra\.json'/],
  ];
  for (const [args, pattern] of untold) {
    const unasked = script('gate.mjs', args);
    assert.equal(unasked.status, 2, `${args.slice(6).join(' ')}: ${unasked.stdout}${unasked.stderr}`);
    assert.match(unasked.stderr, /^Balance report gate: NOT CHECKED\./);
    assert.match(unasked.stderr, pattern);
  }
});

test('reports of commands that executed nothing never pass the gate', () => {
  // The real commands, pointed at a directory with no engine in it. Each ends with exit status 0
  // and says NOT RUN; the gate is what refuses to take that for a result.
  const none = join(work, 'no-engine');
  mkdirSync(none);
  const out = join(work, 'not-run');
  // The directory already holds a clean set, as it would when an earlier run is repeated in place.
  // Every command writes its report even when it ran nothing, so none of the three survives.
  const named = writeReports(out, cleanReports());
  const engine = ['--engine-root', none, '--engine-commit', ENGINE_COMMIT];
  assert.equal(script('run-scenarios.mjs', [...engine, '--out', join(out, 'scenarios.json')]).status, 0);
  assert.equal(script('controls.mjs', [...engine, '--out', join(out, 'controls.json')]).status, 0);
  assert.equal(script('walk.mjs', [...engine, '--seeds', '10', '--out', join(out, 'playouts.json')]).status, 0);
  const gate = script('gate.mjs', [...named, '--engine-commit', ENGINE_COMMIT, '--playouts-per-mode', '10', '--allow-unpinned-tree']);
  assert.equal(gate.status, 1, gate.stdout + gate.stderr);
  for (const name of ['scenarios', 'controls', 'playouts']) assert.match(gate.stderr, new RegExp(`${name}: no engine was available when the report was made`));
  assert.match(gate.stderr, /controls: the run's own verdict is not-run/);
  assert.match(gate.stderr, /playouts: no result for 7 players/);
  assert.match(gate.stderr, /V1-M7-SETUP-01 is ready and was not-run/);
  // With --require-engine each command also fails by itself, and still leaves its report behind.
  writeReports(out, cleanReports());
  for (const [name, file, extra] of [['run-scenarios.mjs', 'scenarios.json', []], ['controls.mjs', 'controls.json', []], ['walk.mjs', 'playouts.json', ['--seeds', '10']]]) {
    assert.equal(script(name, [...engine, ...extra, '--require-engine', '--out', join(out, file)]).status, 2, name);
    assert.equal(JSON.parse(readFileSync(join(out, file), 'utf8')).pins.engine, null, `${file} still holds the earlier run`);
  }
});

test('the three engine commands refuse a command line they do not understand', () => {
  const none = join(work, 'no-engine-4');
  mkdirSync(none);
  const cases = [
    ['run-scenarios.mjs', ['--engine-root', none, '--require_engine'], /Unknown option '--require_engine'/],
    ['run-scenarios.mjs', ['--engine-root', none, '--require-engine=false'], /does not take an argument/],
    ['controls.mjs', ['--engine-root', none, '--require-engine', '--out'], /argument missing/],
    ['controls.mjs', ['--engine-root', none, '--engine-root', none], /--engine-root was given more than once/],
    ['walk.mjs', ['--engine-root', none, '--seed', '10'], /Unknown option '--seed'/],
    ['walk.mjs', ['--engine-root', none, 'ten'], /Unexpected argument 'ten'/],
    // A selection that selects nothing is not a run in which nothing failed.
    ['run-scenarios.mjs', ['--engine-root', none, '--only', 'SUP-11'], /--only SUP-11 is the beginning of no scenario identifier/],
  ];
  for (const [name, args, pattern] of cases) {
    const result = script(name, args);
    assert.equal(result.status, 2, `${name} ${args.join(' ')}: ${result.stdout}${result.stderr}`);
    assert.match(result.stderr, pattern);
    assert.match(result.stderr, /Nothing was run\./);
  }
});

test('the one-command engine gate fails when there is no engine, and runs nothing without a commit to pin', () => {
  const none = join(work, 'no-engine-3');
  mkdirSync(none);
  const out = join(work, 'engine-gate');
  // Clean reports of an earlier run are already in the directory. They must not be what is judged.
  writeReports(out, cleanReports());
  const result = script('engine-gate.mjs', ['--engine-root', none, '--engine-commit', ENGINE_COMMIT, '--out-dir', out, '--allow-unpinned-tree']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  // Each command refuses to count a run without an engine, and the gate still runs and still fails.
  assert.match(result.stdout, /Balance engine gate: FAILED\. Exit status of scenarios 2, controls 2, playouts 2, gate 1\./);
  assert.match(result.stdout, /this is a trial, not a result for a merge gate/);

  const refusals = [
    // Without --allow-unpinned-tree nothing runs unless every commit can be pinned. Which refusal
    // comes first depends on where these tests run: in an exported archive there is no commit at
    // all, in a working tree there may be uncommitted changes, and in a clean checkout it is the
    // engine's directory, which is no Git checkout and so cannot vouch for its engine's commit.
    [['--engine-root', none, '--engine-commit', ENGINE_COMMIT, '--out-dir', out], {}, /This directory has no Git commit to pin the reports to|This checkout has uncommitted changes|is not a Git checkout, so the commit of its engine can only be stated/],
    [['--out-dir', out], { GIT_DIR: join(work, 'no-such-repository'), GIT_CEILING_DIRECTORIES: root }, /This directory has no Git commit to pin the reports to\./],
    [['--engine-root', none, '--allow-unpinned-tree', '--out-dir', out], {}, /The commit of the engine is not known/],
    [['--allow-unpinned-tree', '--engine-root', none, '--engine-commit'], {}, /argument missing/],
    [['--allow-unpinned-tree', '--engine-root=', '--engine-commit', ENGINE_COMMIT], {}, /--engine-root was given without a value/],
    [['--allow-unpinned-tree', '--engine_root', none], {}, /Unknown option '--engine_root'/],
  ];
  for (const [args, env, pattern] of refusals) {
    const refused = script('engine-gate.mjs', args, env);
    assert.equal(refused.status, 2, `${args.join(' ')}: ${refused.stdout}${refused.stderr}`);
    assert.match(refused.stderr, /^Balance engine gate: NOT RUN\./);
    assert.match(refused.stderr, pattern);
  }
});

test('the commit of an engine is read from Git where it can be, and a contradicting label is refused', () => {
  const git = (directory, ...args) => {
    const result = spawnSync('git', ['-c', 'user.name=Balance test', '-c', 'user.email=balance-test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout.trim();
  };
  const here = { checkout: true, commit: TREE_COMMIT, clean: true };
  // The engine of this checkout: its commit is the checkout's, whatever the command line says.
  assert.deepEqual(engineProvenance(null, null, here), { commit: TREE_COMMIT, basis: ENGINE_COMMIT_BASIS.here, clean: true, origin: '@mothership/engine of this checkout' });
  assert.equal(engineProvenance(root, TREE_COMMIT, here).basis, ENGINE_COMMIT_BASIS.here);
  assert.match(engineProvenance(null, ENGINE_COMMIT, here).problem, /--engine-commit names a{40}, but the engine is the one of this checkout, which is at b{40}/);
  // The same directory reached through a link is the same checkout.
  symlinkSync(root, join(work, 'link-to-checkout'));
  assert.equal(engineProvenance(join(work, 'link-to-checkout'), null, here).basis, ENGINE_COMMIT_BASIS.here);
  // Without Git here, a stated commit is all there is, and it is recorded as that.
  const nowhere = { checkout: false, commit: null, clean: null };
  assert.deepEqual(engineProvenance(null, ENGINE_COMMIT, nowhere), { commit: ENGINE_COMMIT, basis: ENGINE_COMMIT_BASIS.stated, clean: null, origin: '@mothership/engine of this checkout' });
  assert.equal(engineProvenance(null, null, nowhere).commit, 'unknown');

  // An engine in a directory that is not a checkout, such as an exported archive.
  const archive = join(work, 'archive');
  mkdirSync(archive);
  assert.deepEqual(treeState(archive), { checkout: false, commit: null, clean: null });
  assert.equal(engineProvenance(archive, ENGINE_COMMIT, here).basis, ENGINE_COMMIT_BASIS.stated);
  assert.equal(engineProvenance(archive, null, here).commit, 'not stated');

  // An engine in a checkout of its own.
  const other = join(work, 'engine-checkout');
  mkdirSync(join(other, 'packages/engine/dist'), { recursive: true });
  git(other, 'init', '-q');
  writeFileSync(join(other, '.gitignore'), 'dist/\n');
  writeFileSync(join(other, 'tracked.txt'), 'one\n');
  git(other, 'add', '-A');
  git(other, 'commit', '-q', '-m', 'engine');
  const head = git(other, 'rev-parse', 'HEAD');
  assert.deepEqual(treeState(other), { checkout: true, commit: head, clean: true });
  assert.deepEqual(engineProvenance(other, null, here), { commit: head, basis: ENGINE_COMMIT_BASIS.there, clean: true, origin: 'built checkout outside this worktree (--engine-root)' });
  assert.equal(engineProvenance(other, head, here).commit, head);
  assert.match(engineProvenance(other, ENGINE_COMMIT, here).problem, new RegExp(`--engine-commit names a{40}, but the checkout at --engine-root is at ${head}`));
  // A directory inside a checkout is not that checkout: its commit would say nothing about what is in it.
  assert.equal(treeState(join(other, 'packages')).checkout, false);

  // Build output is ignored by Git, so it never makes a tree unclean. The digest is what records it.
  assert.equal(engineBuildDigest(other), null);
  writeFileSync(join(other, 'packages/engine/dist/index.js'), 'export const built = 1;\n');
  const digest = engineBuildDigest(other);
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(treeState(other).clean, true);
  writeFileSync(join(other, 'packages/engine/dist/index.js'), 'export const built = 2;\n');
  assert.notEqual(engineBuildDigest(other), digest);

  // What does make a tree unclean, including the ways a change can be hidden from `git status`.
  writeFileSync(join(other, 'untracked.txt'), 'new\n');
  assert.equal(treeState(other).clean, false, 'an untracked file');
  git(other, 'config', 'status.showUntrackedFiles', 'no');
  assert.equal(treeState(other).clean, false, 'an untracked file that the user has told status not to show');
  rmSync(join(other, 'untracked.txt'));
  assert.equal(treeState(other).clean, true);
  writeFileSync(join(other, 'tracked.txt'), 'two\n');
  assert.equal(treeState(other).clean, false, 'a modified file');
  git(other, 'update-index', '--assume-unchanged', 'tracked.txt');
  assert.equal(treeState(other).clean, false, 'a modified file marked assume-unchanged');
  git(other, 'update-index', '--no-assume-unchanged', 'tracked.txt');
  git(other, 'update-index', '--skip-worktree', 'tracked.txt');
  assert.equal(treeState(other).clean, false, 'a modified file marked skip-worktree');
  git(other, 'update-index', '--no-skip-worktree', 'tracked.txt');
  git(other, 'checkout', '-q', '--', 'tracked.txt');
  assert.equal(treeState(other).clean, true);
});

test('outside a repository the reports record an unknown tree without passing on git errors', () => {
  const none = join(work, 'no-engine-2');
  mkdirSync(none);
  const out = join(work, 'no-git.json');
  const result = script('run-scenarios.mjs', ['--engine-root', none, '--out', out], { GIT_DIR: join(work, 'no-such-repository'), GIT_CEILING_DIRECTORIES: root });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  // The first line stays the command's own, and the note about Git follows the results.
  assert.match(result.stdout, /^No scenario was executed\.[^]*\nGit provenance is not available in this directory/);
  const pins = JSON.parse(readFileSync(out, 'utf8')).pins;
  assert.equal(pins.workingTreeCommit, 'unknown');
  assert.equal(pins.branch, 'unknown');
  assert.equal(pins.engineCommit, 'not stated');
  assert.equal(pins.engineCommitBasis, ENGINE_COMMIT_BASIS.stated);
  assert.deepEqual(pins.scenarioFileHashes, disk.scenarioFileHashes);
});

test('the playout command refuses to run no playouts', () => {
  for (const seeds of ['0', '2.5', 'many']) {
    const result = script('walk.mjs', ['--seeds', seeds]);
    assert.equal(result.status, 1, `${seeds}: ${result.stdout}`);
    assert.match(result.stderr, /--seeds needs a whole number of at least 1/);
  }
  // A negative number reads as another option, which is refused as well.
  assert.equal(script('walk.mjs', ['--seeds', '-3']).status, 2);
});

test('the static checks fail unless every test ran and passed', () => {
  const directory = (name, body) => {
    const path = join(work, name);
    mkdirSync(path);
    if (body !== null) writeFileSync(join(path, 'sample.test.mjs'), `import test, { describe, it } from 'node:test';\nimport assert from 'node:assert/strict';\n${body}\n`);
    return path;
  };
  // These files run inside this test run, so the nested runner must not take itself for a child of it.
  const strict = (path, args = [], env = {}) => script('static-tests.mjs', ['--dir', path, ...args], { NODE_TEST_CONTEXT: undefined, ...env });
  const cases = [
    ['passing', "test('one', () => { assert.equal(1, 1); });\ntest('two', () => {});\ndescribe('group', () => { it('three', () => {}); });", 0, /Static checks: 3 tests in 1 file, all passed/],
    ['failing', "test('one', () => { assert.equal(1, 2); });", 1, /Static checks: FAILED\. Of 1 test in 1 file: 1 failed\./],
    ['skipped', "test('one', () => {});\ntest('two', { skip: true }, () => {});", 1, /Of 2 tests in 1 file: 1 skipped \(two\)\./],
    ['skipped-inside', "test('one', () => {});\ntest('two', t => { t.skip('later'); });", 1, /1 skipped \(two: later\)\./],
    ['todo', "test('one', () => {});\ntest('two', { todo: true }, () => {});", 1, /1 marked todo\./],
    ['only-skips', "test.skip('one', () => {});", 1, /1 skipped/],
    // A skipped suite is counted by the runner as a suite and not as a skip. Its tests never ran.
    ['skipped-suite', "test('one', () => {});\ndescribe.skip('group', () => { it('never', () => { assert.fail(); }); });", 1, /Of 1 test in 1 file: 1 skipped \(group\)\./],
    ['skipped-suite-by-option', "test('one', () => {});\ndescribe('group', { skip: 'not now' }, () => { it('never', () => {}); });", 1, /1 skipped \(group: not now\)\./],
    ['todo-suite', "test('one', () => {});\ndescribe.todo('group', () => { it('never', () => {}); });", 1, /marked todo/],
    // A file that ends the process itself, after its first result is out, leaves the rest unfinished.
    ['early-exit', "test('one', () => {});\ntest('two', async () => { await new Promise(done => setTimeout(done, 300)); process.exit(0); });\ntest('three', () => { assert.fail(); });", 1, /sample\.test\.mjs started 3 tests and suites and finished 1/],
    ['no-tests', '', 1, /no test ran, sample\.test\.mjs ran no test/],
    ['no-files', null, 1, /There is no test file in/],
    ['broken', "test('one', () => {", 1, /1 failed/],
  ];
  for (const [name, body, status, pattern] of cases) {
    const result = strict(directory(`static-${name}`, body));
    assert.equal(result.status, status, `${name}: ${result.stdout}${result.stderr}`);
    assert.match(status === 0 ? result.stdout : result.stderr, pattern, name);
  }
  // One file without tests cannot hide behind another file's tests.
  const mixed = directory('static-mixed', "test('one', () => {});");
  writeFileSync(join(mixed, 'idle.test.mjs'), "import 'node:test';\n");
  const idle = strict(mixed);
  assert.equal(idle.status, 1, idle.stdout);
  assert.match(idle.stderr, /Of 1 test in 2 files: idle\.test\.mjs ran no test\./);
  // A test file that the check would not run is refused, wherever it is and however it is named.
  for (const stray of ['nested/more.test.mjs', 'other.test.js', 'other.spec.mjs']) {
    const path = directory(`static-stray-${stray.replace(/\W/g, '-')}`, "test('one', () => {});");
    mkdirSync(join(path, 'nested'), { recursive: true });
    writeFileSync(join(path, stray), "import test from 'node:test';\ntest('unseen', () => {});\n");
    const result = strict(path);
    assert.equal(result.status, 1, `${stray}: ${result.stdout}`);
    assert.match(result.stderr, /look like test files and are not run by this check/);
  }
  // Nothing may filter the tests from outside the command line either.
  for (const options of ['--test-skip-pattern=two', '--test-name-pattern=one', '--max-old-space-size=256 --test-only']) {
    const filtered = strict(join(work, 'static-passing'), [], { NODE_OPTIONS: options });
    assert.equal(filtered.status, 1, `${options}: ${filtered.stdout}`);
    assert.match(filtered.stderr, /NODE_OPTIONS carries an option of the test runner/);
  }
  assert.equal(strict(join(work, 'static-passing'), [], { NODE_OPTIONS: '--max-old-space-size=256' }).status, 0, 'other Node options are none of its business');
  // Started as a child of another test run the runner executes nothing, and says so by failing.
  const nested = script('static-tests.mjs', ['--dir', join(work, 'static-passing')], { NODE_TEST_CONTEXT: 'child-v8' });
  assert.equal(nested.status, 1, nested.stdout);
  for (const args of [['--dirs', work], ['--dir'], ['--allow-missing-overlay=yes'], ['extra']]) {
    const unknown = script('static-tests.mjs', args, { NODE_TEST_CONTEXT: undefined });
    assert.equal(unknown.status, 2, `${args.join(' ')}: ${unknown.stdout}${unknown.stderr}`);
    assert.match(unknown.stderr, /^Static checks: NOT RUN\./);
  }
});

test('the tests that need the owner-decision file may stay unrun only where that file is absent, and only when asked', () => {
  const strict = (path, args = []) => script('static-tests.mjs', ['--dir', path, ...args], { NODE_TEST_CONTEXT: undefined });
  const path = join(work, 'static-overlay');
  mkdirSync(path);
  const reason = JSON.stringify(OVERLAY_ABSENT);
  writeFileSync(join(path, 'sample.test.mjs'), `import test from 'node:test';\ntest('one', () => {});\ntest('needs the file', t => { t.skip(${reason}); });\n`);
  // Unasked, a skip is a failure whatever its reason, with a line that says what to do about it.
  const unasked = strict(path);
  assert.equal(unasked.status, 1, unasked.stdout);
  assert.match(unasked.stderr, /Of 2 tests in 1 file: 1 skipped \(needs the file: the owner-decision file is not in this checkout\)\. On a branch without the engine, .* pass --allow-missing-overlay/);
  const asked = strict(path, ['--allow-missing-overlay']);
  if (existsSync(join(root, V1_OVERLAY_PATH))) {
    // Where the file is present every test must run, and the switch itself is refused.
    assert.equal(asked.status, 1, asked.stdout);
    assert.match(asked.stderr, /--allow-missing-overlay was given, but .* is in this checkout\. Remove the switch/);
  } else {
    assert.equal(asked.status, 0, asked.stdout + asked.stderr);
    assert.match(asked.stdout, /Static checks: 2 tests in 1 file; 1 passed and 1 were NOT RUN because the owner-decision file is not in this checkout \(--allow-missing-overlay\)/);
    assert.match(asked.stdout, / {2}not run: needs the file\n/);
    // The switch accepts that reason and no other.
    writeFileSync(join(path, 'sample.test.mjs'), `import test from 'node:test';\ntest('one', () => {});\ntest('needs the file', t => { t.skip(${reason}); });\ntest('just skipped', t => { t.skip('another reason'); });\ntest('plainly skipped', { skip: true }, () => {});\n`);
    const others = strict(path, ['--allow-missing-overlay']);
    assert.equal(others.status, 1, others.stdout);
    assert.match(others.stderr, /Of 4 tests in 1 file: 2 skipped \(just skipped: another reason; plainly skipped\)\./);
  }
});

// The evidence of 7 October on the report gate: three reports of a real run against the landing
// candidate, and the prose around them. It is a record of what was run against the catalogue of
// that commit, which has since grown, so it is no longer held to the gate against the committed
// fixtures, and it says so at its head. What is still checked is that the prose repeats its
// artifacts exactly, and that the reports are whole in themselves.
const GATE_RECORD = {
  report: 'docs/balance/evidence/2026-10-07-report-gate.md',
  file: name => `docs/balance/evidence/2026-10-07-${name}-engine-71dfd02.json`,
  engineCommit: '71dfd0277c6ccc4a5dd78b9702face98a46310b8',
};

test('the evidence of 7 October on the report gate is kept as a record, and its prose repeats its artifacts', () => {
  const names = ['scenarios', 'controls', 'playouts'];
  const reports = Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(join(root, GATE_RECORD.file(name)), 'utf8'))]));
  const report = readFileSync(join(root, GATE_RECORD.report), 'utf8');
  const has = row => assert.ok(report.includes(row), `the evidence report lacks: ${row}`);
  assert.match(report, /^> \*\*A record, not the current evidence\.\*\*/m);
  const label = { 'mode-7': '7 players', 'mode-8': '8 players', 'mode-9': '9 players', unsupported: 'Unsupported configurations' };
  for (const [group, summary] of Object.entries(reports.scenarios.byGroup)) has(`| ${label[group]} | ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.blocked} | ${summary.notRun} |`);
  const totals = reports.scenarios.totals;
  has(`| All | ${totals.total} | ${totals.passed} | ${totals.failed} | ${totals.blocked} | ${totals.notRun} |`);
  assert.equal(reports.scenarios.runs.length, totals.total);
  assert.equal(reports.controls.verdict, 'passed');
  for (const mode of [7, 8, 9]) {
    const control = reports.controls.modes[mode];
    has(`| ${mode} players | ${control.scenarios} | ${control.controls} | ${control.detected} | ${control.undetected} |`);
    const walk = reports.playouts.modes[mode];
    has(`| ${mode} players | ${walk.playouts} | ${walk.completed} | ${walk.phases} | ${walk.commandsAccepted} | ${walk.commandsRejected} | ${walk.invariantViolations} | ${walk.hintMismatches} | ${walk.replayMismatches} |`);
    // A random policy's outcome frequencies are deliberately not stored.
    assert.equal('terminal' in walk, false);
    assert.equal('alienCoWin' in walk, false);
  }
  const pins = reports.scenarios.pins;
  for (const pin of [pins.workingTreeCommit, pins.engineCommit, pins.sourceManifestSha256, pins.v1OverlaySha256, pins.v1ManifestSha256, pins.rulebookSha256, pins.engineBuildSha256]) has(`\`${pin}\``);
  // The three reports are about one engine, one build and one clean tooling commit.
  for (const name of names) {
    assert.equal(reports[name].pins.engineCommit, GATE_RECORD.engineCommit, name);
    assert.equal(reports[name].pins.engineBuildSha256, pins.engineBuildSha256, name);
    assert.equal(reports[name].pins.workingTreeCommit, pins.workingTreeCommit, name);
    assert.match(reports[name].pins.workingTreeCommit, /^[0-9a-f]{40}$/, name);
  }
});

// The current evidence: the committed catalogue against the engine of the hosted branch, as the
// integration review of 7 October read it. That engine does not tell Supplier whom they armed
// (the review's finding G17), so the fixtures that ask for it fail and the gate is red. These
// tests require exactly that and nothing else. When an engine makes the disclosure, the reports
// are produced again and the first test is changed to require a clean pass.
const CURRENT = {
  report: 'docs/balance/evidence/2026-10-07-supplier-disclosure.md',
  real: name => `docs/balance/evidence/2026-10-07-g17-${name}-engine-c885624.json`,
  standIn: name => `docs/balance/evidence/2026-10-07-g17-${name}-stand-in.json`,
  engineCommit: 'c8856242caea349b620345349f6b59c7a87b6d7f',
  v1ManifestSha256: '451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2',
  playoutsPerMode: 200,
  // The cases that ask what Supplier is told. Every other ready case passes.
  needTheDisclosure: ['SUP-11', 'SUP-12', 'SUP-13', 'SUP-14', 'SUP-16', 'SUP-24', 'SUP-25'],
  stale: 'a scenario file, the exception list, the rulebook or a rule source changed after this evidence was produced, or what the engine tells Supplier did: run the engine gate again and commit a new dated report',
};
const readJson = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const codeOf = id => id.replace(/^V1-M\d-/, '');
const GROUP_LABEL = { 'mode-7': '7 players', 'mode-8': '8 players', 'mode-9': '9 players', unsupported: 'Unsupported configurations' };
// "`SUP-11` (7, 8, 9)" for a list of fixture identifiers, Supplier's cases first, as the report writes it.
const byCode = ids => {
  const modes = new Map();
  for (const id of ids) modes.set(codeOf(id), [...(modes.get(codeOf(id)) ?? []), id.slice(4, 5)]);
  const rank = code => [code.startsWith('SUP-') ? 0 : 1, code.split('-')[0], Number(code.split('-')[1])];
  return [...modes.entries()].sort(([one], [other]) => { const [a, b] = [rank(one), rank(other)]; return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || a[2] - b[2]; });
};
const scenarioRows = report => [
  ...Object.entries(report.byGroup).map(([group, summary]) => `| ${GROUP_LABEL[group]} | ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.blocked} | ${summary.notRun} |`),
  `| All | ${report.totals.total} | ${report.totals.passed} | ${report.totals.failed} | ${report.totals.blocked} | ${report.totals.notRun} |`,
];
const controlRows = report => [7, 8, 9].map(mode => `| ${mode} players | ${report.modes[mode].scenarios} | ${report.modes[mode].controls} | ${report.modes[mode].detected} | ${report.modes[mode].undetected} |`);

test('the current evidence is red for finding G17 and for nothing else, and its report repeats it', () => {
  const names = ['scenarios', 'controls', 'playouts'];
  const reports = Object.fromEntries(names.map(name => [name, readJson(CURRENT.real(name))]));
  const waiting = catalogue.filter(scenario => CURRENT.needTheDisclosure.includes(codeOf(scenario.id)));
  assert.ok(waiting.length > 0 && waiting.every(scenario => scenario.status === 'ready'));
  // Not a trial: a clean tooling commit, and an engine commit that was read from Git.
  const problems = judge(reports, { engineCommit: CURRENT.engineCommit, playoutsPerMode: CURRENT.playoutsPerMode, v1Manifest: { sha256: CURRENT.v1ManifestSha256 } });

  // Of the scenarios: exactly the fixtures that ask what Supplier is told, each failing because nothing is.
  const ofScenarios = problems.filter(problem => problem.startsWith('scenarios: '));
  assert.deepEqual(ofScenarios.map(problem => problem.match(/^scenarios: (\S+) is ready and was failed: /)?.[1]).sort(), waiting.map(scenario => scenario.id).sort(), CURRENT.stale);
  const said = message => {
    if (/^view of @Supplier: armedBySupply: expected the set \[.*\], observed "nothing: this engine tells the player nothing about it"$/.test(message)) return 'Whom Supplier armed: "this engine tells the player nothing about it"';
    if (/^the twin run looks exactly the same to: seat-\d$/.test(message)) return 'The twin run looks exactly the same to Supplier';
    return assert.fail(`a failure that is not finding G17: ${message}`);
  };
  for (const scenario of waiting) {
    const run = runOf(reports, scenario.id);
    assert.equal(run.status, 'failed', scenario.id);
    assert.deepEqual(run.invariantViolations, [], scenario.id);
    // The one comparison among them names Supplier's own seat, and no other.
    if (said(run.failure.message).startsWith('The twin run')) assert.equal(run.failure.message.split(': ')[1], `seat-${scenario.setup.roleOrder.indexOf('Supplier') + 1}`, scenario.id);
  }
  // Of the controls: those fixtures have no controls to try, and nothing else is wrong.
  const generated = mode => catalogue.filter(scenario => scenario.mode === mode && scenario.status === 'ready').reduce((sum, scenario) => sum + controlsFor(scenario).length, 0);
  const untried = mode => waiting.filter(scenario => scenario.mode === mode).reduce((sum, scenario) => sum + controlsFor(scenario).length, 0);
  const ofControls = [
    "controls: the run's own verdict is failed",
    `controls: the list of baselines that did not pass has ${waiting.length} entries`,
    ...[7, 8, 9].flatMap(mode => [
      `controls: ${mode} players: baselines that did not pass: ${waiting.filter(scenario => scenario.mode === mode).length}`,
      `controls: ${mode} players: ${generated(mode) - untried(mode)} controls executed, ${generated(mode)} generated from the catalogue`,
    ]),
  ];
  assert.deepEqual(problems.filter(problem => problem.startsWith('controls: ')).sort(), [...ofControls].sort(), CURRENT.stale);
  assert.deepEqual(problems.filter(problem => !problem.startsWith('controls: ') && !problem.startsWith('scenarios: ')), [], 'a problem of another kind');
  assert.deepEqual(reports.controls.baselineFailures.map(line => line.split(':')[0]).sort(), waiting.map(scenario => scenario.id).sort());
  assert.deepEqual(reports.controls.undetected, []);
  for (const mode of [7, 8, 9]) assert.equal(reports.controls.modes[mode].detected, reports.controls.modes[mode].controls, `${mode} players`);
  // The playouts do not depend on the catalogue, and found nothing.
  for (const mode of [7, 8, 9]) {
    const walk = reports.playouts.modes[mode];
    assert.deepEqual([walk.playouts, walk.completed, walk.invariantViolations, walk.hintMismatches, walk.replayMismatches], [CURRENT.playoutsPerMode, CURRENT.playoutsPerMode, 0, 0, 0], `${mode} players`);
    assert.equal('terminal' in walk, false);
  }

  // The same through the command, as the report tells a reader to do it.
  const gate = script('gate.mjs', [...names.flatMap(name => [`--${name}`, join(root, CURRENT.real(name))]), '--engine-commit', CURRENT.engineCommit, '--playouts-per-mode', String(CURRENT.playoutsPerMode)]);
  assert.equal(gate.status, 1, gate.stdout);
  assert.match(gate.stderr, new RegExp(`^Balance report gate: FAILED, ${problems.length} problems\\.\\n`));

  // The prose repeats the artifacts exactly: no number in it is typed by hand.
  const report = readFileSync(join(root, CURRENT.report), 'utf8');
  const has = row => assert.ok(report.includes(row), `the evidence report lacks: ${row}`);
  for (const line of gate.stderr.trimEnd().split('\n')) has(line);
  for (const row of [...scenarioRows(reports.scenarios), ...controlRows(reports.controls)]) has(row);
  for (const mode of [7, 8, 9]) {
    const walk = reports.playouts.modes[mode];
    has(`| ${mode} players | ${walk.playouts} | ${walk.completed} | ${walk.phases} | ${walk.commandsAccepted} | ${walk.commandsRejected} | ${walk.invariantViolations} | ${walk.hintMismatches} | ${walk.replayMismatches} |`);
  }
  for (const [code, modes] of byCode(waiting.map(scenario => scenario.id))) {
    const one = waiting.find(scenario => codeOf(scenario.id) === code);
    has(`| \`${code}\` | ${modes.join(', ')} | ${one.title} | ${said(runOf(reports, one.id).failure.message)} |`);
  }
  const pins = reports.scenarios.pins;
  for (const pin of [pins.workingTreeCommit, pins.engineCommit, pins.sourceManifestSha256, pins.v1OverlaySha256, pins.v1ManifestSha256, pins.rulebookSha256, pins.engineBuildSha256, ...Object.values(pins.scenarioFileHashes)]) has(`\`${pin}\``);
  assert.equal(pins.engineCommit, CURRENT.engineCommit);
  assert.equal(pins.v1ManifestSha256, CURRENT.v1ManifestSha256);
});

test('through the stand-in every ready fixture passes and every deliberate leak is caught, and the gate refuses those reports', () => {
  const real = readJson(CURRENT.real('scenarios'));
  const scenarios = readJson(CURRENT.standIn('scenarios'));
  const controls = readJson(CURRENT.standIn('controls'));
  // The same fixtures, the same tooling commit and the same engine build as the run without the stand-in.
  for (const report of [scenarios, controls]) {
    for (const key of ['workingTreeCommit', 'engineCommit', 'engineBuildSha256', 'rulebookSha256', 'scenarioFileHashes', 'ruleSourceHashes']) assert.deepEqual(report.pins[key], real.pins[key], key);
    assert.equal(report.pins.engine.adapter, `${ADAPTER} with the stand-in supply-disclosure`);
  }
  assert.deepEqual(scenarios.pins.scenarioFileHashes, disk.scenarioFileHashes, CURRENT.stale);
  assert.equal(scenarios.pins.rulebookSha256, disk.rulebookSha256, CURRENT.stale);

  // Every ready fixture passes, so the ones that fail against the engine can pass; nothing else moves.
  for (const scenario of catalogue) {
    const run = runOf({ scenarios }, scenario.id);
    assert.equal(run.status, { ready: 'passed', blocked: 'blocked', manual: 'not-run' }[scenario.status], scenario.id);
    if (!CURRENT.needTheDisclosure.includes(codeOf(scenario.id))) assert.equal(run.status, runOf({ scenarios: real }, scenario.id).status, scenario.id);
  }
  assert.equal(scenarios.runs.length, catalogue.length);
  // Every single-expectation change of every ready fixture is detected.
  assert.equal(controls.verdict, 'passed');
  for (const mode of [7, 8, 9]) {
    const ready = catalogue.filter(scenario => scenario.mode === mode && scenario.status === 'ready');
    const generated = ready.reduce((sum, scenario) => sum + controlsFor(scenario).length, 0);
    assert.deepEqual(controls.modes[mode], { scenarios: ready.length, controls: generated, detected: generated, undetected: 0, baselineNotPassing: 0 }, `${mode} players`);
  }
  // Every deliberate leak is caught by a comparison, with every number of players it has to be.
  assert.deepEqual(controls.leaks.map(item => item.leak), Object.keys(LEAKS));
  for (const item of controls.leaks) {
    assert.equal(item.meaning, LEAKS[item.leak]);
    assert.deepEqual(item.modes, leakModes(item.leak), item.leak);
    for (const mode of item.modes) assert.ok(item.caughtBy.some(caught => caught.scenario.startsWith(`V1-M${mode}-`)), `${item.leak} with ${mode} players`);
    for (const caught of item.caughtBy) {
      const scenario = catalogue.find(candidate => candidate.id === caught.scenario);
      assert.ok(scenario !== undefined && scenario.status === 'ready' && hasTwin(scenario), `${item.leak}: ${caught.scenario}`);
      assert.ok(caught.couldTell.length > 0 && caught.couldTell.every(audience => audience === 'public' || /^seat-\d$/.test(audience)), `${item.leak}: ${caught.scenario}`);
    }
  }

  // And the other way round: every paired fixture that says two runs look the same failed for at least one leak.
  const paired = catalogue.filter(scenario => scenario.status === 'ready' && hasTwin(scenario));
  assert.equal(controls.pairedCases, paired.length);
  assert.deepEqual(controls.unexercised, []);
  const caughtSomething = new Set(controls.leaks.flatMap(item => item.caughtBy.map(caught => caught.scenario)));
  const claimsSame = scenario => scenario.steps.some(step => (step.op === 'watch' && 'sameAsTwin' in step) || (step.op === 'assert' && step.checks.some(check => 'sameAsTwin' in check)));
  for (const scenario of paired.filter(claimsSame)) assert.ok(caughtSomething.has(scenario.id), `${scenario.id} failed for no leak`);

  // None of it is evidence about an engine, and the gate says so.
  const refused = judge({ scenarios, controls, playouts: readJson(CURRENT.real('playouts')) }, { engineCommit: CURRENT.engineCommit, playoutsPerMode: CURRENT.playoutsPerMode, v1Manifest: { sha256: CURRENT.v1ManifestSha256 } });
  for (const name of ['scenarios', 'controls']) {
    assert.ok(refused.includes(`${name}: the run was made through "${ADAPTER} with the stand-in supply-disclosure", not through the engine binding ${ADAPTER} alone`), JSON.stringify(refused.slice(0, 4)));
  }

  // The prose repeats the artifacts.
  const report = readFileSync(join(root, CURRENT.report), 'utf8');
  const has = row => assert.ok(report.includes(row), `the evidence report lacks: ${row}`);
  for (const row of [...scenarioRows(scenarios), ...controlRows(controls)]) has(row);
  const who = (id, audience) => (audience === 'public' ? 'the table' : catalogue.find(scenario => scenario.id === id).setup.roleOrder[Number(audience.slice(5)) - 1]);
  for (const item of controls.leaks) {
    const by = byCode(item.caughtBy.map(caught => caught.scenario)).map(([code, modes]) => `\`${code}\` (${modes.join(', ')})`).join('; ');
    const firstCaught = [...item.caughtBy].sort((one, other) => (one.scenario < other.scenario ? -1 : 1))[0];
    has(`| ${item.meaning} | ${by} | In \`${firstCaught.scenario}\`: ${[...new Set(firstCaught.couldTell.map(audience => who(firstCaught.scenario, audience)))].join(', ')} |`);
  }
});
