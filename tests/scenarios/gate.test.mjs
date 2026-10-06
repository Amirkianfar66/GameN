// The report gate, the reviewed exception list and the strict runner for these static tests.
//
// The gate is tested with reports written here from the catalogue: one clean set, and then that
// set with exactly one thing wrong at a time. Each wrong thing must be named. No engine is
// involved, and the clean set is not a result: results are in docs/balance/evidence/.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { controlsFor, exceptionProblems, gateProblems } from '@mothership/balance';
import { sourceHashes } from '../../tools/balance/scripts/pins.mjs';
import { SOURCE_MANIFEST_SHA256, V1_OVERLAY_SHA256, V1_RULESET_VERSION, loadAll, loadExceptions } from './v1/files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'mothership-balance-gate-'));
test.after(() => { rmSync(work, { recursive: true, force: true }); });

const catalogue = loadAll();
const allowlist = loadExceptions();
const disk = sourceHashes();
const ENGINE_COMMIT = 'a'.repeat(40);
const TREE_COMMIT = 'b'.repeat(40);
const copy = value => JSON.parse(JSON.stringify(value));

// What the three commands write for a complete and clean run of the catalogue as it is on disk.
function cleanReports(playouts = 10) {
  // Each report gets pins of its own, so that changing one report changes nothing else.
  const pins = () => copy({
    ...disk, v1OverlaySha256: V1_OVERLAY_SHA256, workingTreeCommit: TREE_COMMIT, engineCommit: ENGINE_COMMIT,
    engine: { adapter: 'written-by-the-test', engineVersion: 'none', rulesetVersion: V1_RULESET_VERSION, rulesetHash: V1_OVERLAY_SHA256, protocolVersion: 2 },
  });
  const runs = catalogue.map(scenario => {
    const head = { scenarioId: scenario.id, group: scenario.group, mode: scenario.mode, decisionIds: scenario.decisionIds, failure: null, probes: [] };
    if (scenario.status === 'ready') return { ...head, status: 'passed', reason: null };
    if (scenario.status === 'manual') return { ...head, status: 'not-run', reason: 'manual: needs human or user-interface evidence, not an engine run' };
    if (scenario.setup === null) return { ...head, status: 'blocked', reason: 'awaiting an owner decision; no probe is defined' };
    const probes = scenario.steps.filter(step => step.op === 'probe' || step.op === 'note').map(step => ({ label: step.label, outcome: 'recorded' }));
    return { ...head, status: 'blocked', reason: null, probes };
  });
  const count = status => runs.filter(run => run.status === status).length;
  const totals = { total: runs.length, passed: count('passed'), failed: count('failed'), blocked: count('blocked'), notRun: count('not-run') };
  const controlModes = {};
  const playoutModes = {};
  for (const mode of [7, 8, 9]) {
    const baselines = catalogue.filter(scenario => scenario.mode === mode && scenario.status === 'ready');
    const controls = baselines.reduce((sum, scenario) => sum + controlsFor(scenario).length, 0);
    controlModes[mode] = { scenarios: baselines.length, controls, detected: controls, undetected: 0, baselineNotPassing: 0 };
    playoutModes[mode] = {
      playouts, completed: playouts, invariantViolations: 0, hintMismatches: 0, replayMismatches: 0,
      terminalReached: { Blue: true, Red: true, Alien: false, Draw: true, alienCoWin: true, unfinished: 0 },
    };
  }
  return {
    scenarios: { schema: 'mothership.balance.scenario-run/1', pins: pins(), totals, runs },
    controls: { schema: 'mothership.balance.controls/1', pins: pins(), modes: controlModes, undetected: [], baselineFailures: [], verdict: 'passed' },
    playouts: { schema: 'mothership.balance.walk/1', pins: pins(), seedsPerMode: playouts, modes: playoutModes },
  };
}

const expectations = (changes = {}) => ({
  engineCommit: ENGINE_COMMIT, playoutsPerMode: 10, candidateCommit: null, allowUnpinnedTree: false,
  rulesetVersion: V1_RULESET_VERSION, overlaySha256: V1_OVERLAY_SHA256, sourceManifestSha256: SOURCE_MANIFEST_SHA256,
  v1Manifest: { sha256: disk.v1ManifestSha256 }, scenarioFileHashes: disk.scenarioFileHashes,
  ruleSourceHashes: disk.ruleSourceHashes, rulebookSha256: disk.rulebookSha256, ...changes,
});
const judge = (reports, changes) => gateProblems(reports, catalogue, allowlist, expectations(changes));
const runOf = (reports, id) => reports.scenarios.runs.find(run => run.scenarioId === id);
const first = status => catalogue.find(scenario => scenario.status === status && scenario.mode === 7);
const probed = catalogue.find(scenario => scenario.status === 'blocked' && scenario.setup !== null);
const unprobed = catalogue.find(scenario => scenario.status === 'blocked' && scenario.setup === null);

test('the fixtures that are not ready are exactly the reviewed exceptions', () => {
  assert.deepEqual(exceptionProblems(catalogue, allowlist), []);
  const waiting = catalogue.filter(scenario => scenario.status !== 'ready');
  const listed = allowlist.exceptions.reduce((sum, entry) => sum + entry.modes.length, 0);
  assert.equal(listed, waiting.length, 'the list and the catalogue count the same cases');
  // Each blocked exception names a decision that the register still holds open or deferred.
  const audit = readFileSync(join(root, 'docs/balance/rules-audit-v1.md'), 'utf8');
  for (const entry of allowlist.exceptions) {
    for (const id of entry.decisionIds) assert.match(audit, new RegExp(`^\\| ${id} \\|[^\\n]*\\| (OPEN|DEFERRED) \\|`, 'm'), `${entry.code}: ${id} is not open or deferred in the register`);
  }
});

test('a difference between the fixtures and the exception list is named', () => {
  const without = entry => ({ ...allowlist, exceptions: allowlist.exceptions.filter(item => item !== entry) });
  const changed = (entry, change) => ({ ...allowlist, exceptions: allowlist.exceptions.map(item => (item === entry ? { ...entry, ...change } : item)) });
  const blocked = allowlist.exceptions.find(entry => entry.status === 'blocked' && entry.probe);
  const manual = allowlist.exceptions.find(entry => entry.status === 'manual');
  const ready = first('ready');
  const cases = [
    ['a blocked fixture that is not listed', catalogue, without(blocked), new RegExp(`V1-M7-${blocked.code} is blocked and is not in the reviewed exception list`)],
    ['a listed case that is a ready fixture', catalogue, { ...allowlist, exceptions: [...allowlist.exceptions, { code: ready.id.replace('V1-M7-', ''), modes: [7], status: 'blocked', decisionIds: ['D11'], probe: true, why: 'none' }] }, /which is not a blocked or manual fixture/],
    ['another status', catalogue, changed(manual, { status: 'blocked', decisionIds: ['D11'] }), /is manual; the exception list says blocked/],
    ['another decision', catalogue, changed(blocked, { decisionIds: ['D99'] }), /the exception list says D99/],
    ['a probe the list does not know', catalogue, changed(blocked, { probe: false }), /is probed; the exception list says otherwise/],
    ['a mode left out', catalogue, changed(blocked, { modes: [7, 8] }), new RegExp(`V1-M9-${blocked.code} is blocked and is not in the reviewed exception list`)],
    ['a case listed twice', catalogue, { ...allowlist, exceptions: [...allowlist.exceptions, manual] }, /names V1-M7-[A-Z]+-\d+ twice/],
    ['an entry without a reason', catalogue, changed(blocked, { why: ' ' }), /exception \d+ is malformed/],
    ['a blocked entry without a decision', catalogue, changed(blocked, { decisionIds: [] }), /is blocked and names no decision/],
    ['a list of another kind', catalogue, { exceptions: [] }, /must have the schema/],
    // A fixture quietly turned from ready to blocked is the case the list exists for.
    ['a ready fixture turned blocked', catalogue.map(scenario => (scenario === ready ? { ...scenario, status: 'blocked', decisionIds: ['D11'] } : scenario)), allowlist, new RegExp(`${ready.id} is blocked and is not in the reviewed exception list`)],
  ];
  for (const [name, fixtures, list, pattern] of cases) {
    const problems = exceptionProblems(fixtures, list);
    assert.ok(problems.some(problem => pattern.test(problem)), `${name}: ${JSON.stringify(problems.slice(0, 3))}`);
  }
});

test('a complete and clean set of reports passes the gate, and only that', () => {
  assert.deepEqual(judge(cleanReports()), []);
  assert.deepEqual(judge(cleanReports(), { candidateCommit: TREE_COMMIT }), []);
  assert.deepEqual(gateProblems(cleanReports(200), catalogue, allowlist, expectations({ playoutsPerMode: 200 })), []);
  for (const missing of ['scenarios', 'controls', 'playouts']) {
    const reports = { ...cleanReports(), [missing]: null };
    assert.ok(judge(reports).includes(`${missing}: the report is missing or is not an object`), missing);
  }
  assert.ok(judge({ scenarios: null, controls: null, playouts: null }).length >= 3);
});

test('one wrong thing in the scenario report fails the gate and is named', () => {
  const ready = first('ready');
  const manual = first('manual');
  const cases = [
    ['a missing case', reports => { reports.scenarios.runs = reports.scenarios.runs.filter(run => run.scenarioId !== ready.id); }, new RegExp(`${ready.id} is missing from the report`)],
    ['a case reported twice', reports => { reports.scenarios.runs.push(copy(runOf(reports, ready.id))); }, new RegExp(`${ready.id} is reported twice`)],
    ['a case that is not in the catalogue', reports => { reports.scenarios.runs.push({ ...copy(runOf(reports, ready.id)), scenarioId: 'V1-M7-NONE-01' }); }, /V1-M7-NONE-01 is reported and is not in the catalogue/],
    ['a ready case that failed', reports => { Object.assign(runOf(reports, ready.id), { status: 'failed', failure: { stepIndex: 1, op: 'assert', message: 'observed something else' } }); }, new RegExp(`${ready.id} is ready and was failed: observed something else`)],
    ['a ready case that was not run', reports => { Object.assign(runOf(reports, ready.id), { status: 'not-run', reason: 'engine adapter unavailable' }); }, new RegExp(`${ready.id} is ready and was not-run: engine adapter unavailable`)],
    ['a ready case reported blocked', reports => { runOf(reports, ready.id).status = 'blocked'; }, new RegExp(`${ready.id} is ready and was blocked`)],
    ['a blocked case reported passed', reports => { runOf(reports, probed.id).status = 'passed'; }, new RegExp(`${probed.id} is blocked and was reported passed`)],
    ['a blocked case with another decision', reports => { runOf(reports, probed.id).decisionIds = ['D99']; }, new RegExp(`${probed.id} reports other decisions than its fixture`)],
    ['a probe that was not completed', reports => { runOf(reports, probed.id).reason = 'probe could not be completed: the engine refused a legal setup'; }, new RegExp(`${probed.id}: its probe was not completed`)],
    ['a probe that recorded nothing', reports => { runOf(reports, probed.id).probes = []; }, new RegExp(`${probed.id}: 0 observations recorded`)],
    ['an unprobed case with another reason', reports => { runOf(reports, unprobed.id).reason = null; }, new RegExp(`${unprobed.id}: unexpected reason null`)],
    ['a manual case reported passed', reports => { runOf(reports, manual.id).status = 'passed'; }, new RegExp(`${manual.id} is manual and was reported passed`)],
    ['totals that do not match the runs', reports => { reports.scenarios.totals.passed += 1; }, /the totals do not match the runs/],
    ['another kind of report', reports => { reports.scenarios.schema = 'something-else/1'; }, /scenarios: unexpected schema/],
  ];
  for (const [name, change, pattern] of cases) {
    const reports = cleanReports();
    change(reports);
    const problems = judge(reports);
    assert.ok(problems.some(problem => pattern.test(problem)), `${name}: ${JSON.stringify(problems.slice(0, 3))}`);
  }
  // A whole mode left out cannot hide behind the other two.
  const reports = cleanReports();
  reports.scenarios.runs = reports.scenarios.runs.filter(run => run.mode !== 8);
  assert.ok(judge(reports).includes('scenarios: no scenario passed for 8 players'));
});

test('one wrong thing in the controls or playout report fails the gate and is named', () => {
  const cases = [
    ['a run that judged itself failed', reports => { reports.controls.verdict = 'failed'; }, /controls: the run's own verdict is failed/],
    ['a run that did not happen', reports => { reports.controls = { schema: 'mothership.balance.controls/1', verdict: 'not-run', modes: {}, undetected: [], baselineFailures: [] }; }, /controls: the report carries no pins/],
    ['a baseline that did not pass', reports => { reports.controls.modes[7].baselineNotPassing = 1; }, /7 players: 1 baselines did not pass/],
    ['fewer baselines than the catalogue has', reports => { reports.controls.modes[8].scenarios -= 1; }, /8 players: \d+ baselines reported, \d+ in the catalogue/],
    ['fewer controls than the catalogue generates', reports => { reports.controls.modes[9].controls -= 1; reports.controls.modes[9].detected -= 1; }, /9 players: \d+ controls executed, \d+ generated from the catalogue/],
    ['a control that was not detected', reports => { reports.controls.modes[7].detected -= 1; reports.controls.modes[7].undetected = 1; }, /7 players: 1 controls not detected/],
    ['an undetected control in the list', reports => { reports.controls.undetected.push('V1-M7-SETUP-01 step 1 (asserted fact)'); }, /1 controls are listed as not detected/],
    ['a mode without controls', reports => { delete reports.controls.modes[9]; }, /controls: no result for 9 players/],
    ['another number of playouts asked for', reports => { reports.playouts.seedsPerMode = 5; }, /5 playouts per mode were asked for, 10 are required/],
    ['fewer playouts than required', reports => { reports.playouts.modes[7].playouts = 9; reports.playouts.modes[7].completed = 9; }, /7 players: 9 playouts executed, 10 required/],
    ['a playout that did not finish', reports => { reports.playouts.modes[8].completed = 9; }, /8 players: 9 of 10 playouts finished/],
    ['an unfinished playout in the terminal record', reports => { reports.playouts.modes[8].terminalReached.unfinished = 1; }, /8 players: unfinished playouts are reported/],
    ['an invariant violation', reports => { reports.playouts.modes[9].invariantViolations = 1; }, /9 players: 1 invariant violations/],
    ['a hint mismatch', reports => { reports.playouts.modes[9].hintMismatches = 2; }, /9 players: 2 hint mismatches/],
    ['a replay mismatch', reports => { reports.playouts.modes[7].replayMismatches = 1; }, /7 players: 1 replay mismatches/],
    ['a mode without playouts', reports => { delete reports.playouts.modes[7]; }, /playouts: no result for 7 players/],
  ];
  for (const [name, change, pattern] of cases) {
    const reports = cleanReports();
    change(reports);
    const problems = judge(reports);
    assert.ok(problems.some(problem => pattern.test(problem)), `${name}: ${JSON.stringify(problems.slice(0, 3))}`);
  }
});

test('reports about another engine, other files or an unpinned tree fail the gate', () => {
  const cases = [
    ['no engine', reports => { reports.scenarios.pins.engine = null; }, /scenarios: no engine was available when the report was made/],
    ['another engine commit', reports => { reports.controls.pins.engineCommit = 'c'.repeat(40); }, /controls: the engine commit is c{40}, not a{40}/],
    ['an engine commit that was not stated', reports => { reports.playouts.pins.engineCommit = 'not stated'; }, /playouts: the engine commit is not stated/],
    ['another ruleset', reports => { reports.scenarios.pins.engine.rulesetVersion = 'in-person-v0'; }, /the engine reports ruleset in-person-v0/],
    ['an engine with another owner decision', reports => { reports.scenarios.pins.engine.rulesetHash = 'd'.repeat(64); }, /a ruleset hash that is not the approved owner decision/],
    ['an owner-decision file that is not the approved one', reports => { reports.scenarios.pins.v1OverlaySha256 = 'd'.repeat(64); }, /the owner-decision file beside the engine is missing or is not the approved one/],
    ['no owner-decision file', reports => { reports.controls.pins.v1OverlaySha256 = null; }, /controls: the owner-decision file beside the engine is missing/],
    ['another combined manifest', reports => { reports.playouts.pins.v1ManifestSha256 = 'd'.repeat(64); }, /playouts: the combined Version 1 manifest differs from the file beside the engine/],
    ['another source manifest', reports => { reports.scenarios.pins.sourceManifestSha256 = 'd'.repeat(64); }, /the rule-source manifest is not the pinned one/],
    ['a rule source that changed', reports => { const key = Object.keys(reports.scenarios.pins.ruleSourceHashes)[0]; reports.scenarios.pins.ruleSourceHashes[key] = 'd'.repeat(64); }, /the rule sources differ from the files on disk/],
    ['a scenario file that changed', reports => { reports.controls.pins.scenarioFileHashes['mode-7.scenarios.json'] = 'd'.repeat(64); }, /controls: the scenario files differ from the files on disk/],
    ['a rulebook that changed', reports => { reports.playouts.pins.rulebookSha256 = 'd'.repeat(64); }, /playouts: the rulebook differs from the file on disk/],
    ['uncommitted changes', reports => { for (const report of Object.values(reports)) report.pins.workingTreeCommit = `${TREE_COMMIT} plus uncommitted changes`; }, /the working tree is not a clean commit/],
    ['no Git provenance', reports => { for (const report of Object.values(reports)) report.pins.workingTreeCommit = 'unknown'; }, /the working tree is not a clean commit \(unknown\)/],
    ['reports from two trees', reports => { reports.playouts.pins.workingTreeCommit = 'c'.repeat(40); }, /playouts: not the same working tree as the scenario report/],
    ['reports about two engines', reports => { reports.controls.pins.engine.engineVersion = 'another'; }, /controls: not the same engine as the scenario report/],
    ['a report without pins', reports => { delete reports.playouts.pins; }, /playouts: the report carries no pins/],
  ];
  for (const [name, change, pattern] of cases) {
    const reports = cleanReports();
    change(reports);
    const problems = judge(reports);
    assert.ok(problems.some(problem => pattern.test(problem)), `${name}: ${JSON.stringify(problems.slice(0, 3))}`);
  }
  // The scenario files are pinned by name; the test above relies on this one being among them.
  assert.ok('mode-7.scenarios.json' in disk.scenarioFileHashes);

  // A candidate commit pins the tree exactly. An unpinned tree is accepted only when asked for,
  // and then nothing else is relaxed.
  assert.ok(judge(cleanReports(), { candidateCommit: 'c'.repeat(40) }).some(problem => /not the clean candidate c{40}/.test(problem)));
  const dirty = cleanReports();
  for (const report of Object.values(dirty)) report.pins.workingTreeCommit = `${TREE_COMMIT} plus uncommitted changes`;
  assert.deepEqual(judge(dirty, { allowUnpinnedTree: true }), []);
  assert.ok(judge(dirty, { allowUnpinnedTree: true, candidateCommit: TREE_COMMIT }).length > 0, 'a named candidate is never relaxed');
  dirty.playouts.modes[7].invariantViolations = 1;
  assert.equal(judge(dirty, { allowUnpinnedTree: true }).length, 1);
  // Without the engine's checkout at hand the reports still have to agree about the combined manifest.
  const apart = cleanReports();
  apart.controls.pins.v1ManifestSha256 = 'd'.repeat(64);
  assert.deepEqual(judge(apart, { v1Manifest: null }), ['controls: not the same combined Version 1 manifest as the scenario report']);
  // What the gate is told to expect has to be exact itself.
  assert.ok(judge(cleanReports(), { engineCommit: 'a3898b8' }).some(problem => /must be a full commit hash/.test(problem)));
  assert.ok(judge(cleanReports(), { playoutsPerMode: 0 }).some(problem => /whole number of at least 1/.test(problem)));
});

const script = (name, args, env = {}) => spawnSync(process.execPath, [join(root, 'tools/balance/scripts', name), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });

function writeReports(directory, reports) {
  mkdirSync(directory, { recursive: true });
  const named = [];
  for (const [name, report] of Object.entries(reports)) {
    writeFileSync(join(directory, `${name}.json`), `${JSON.stringify(report)}\n`);
    named.push(`--${name}`, join(directory, `${name}.json`));
  }
  return named;
}

test('the gate command exits 0 only for a complete and clean set of reports', () => {
  const needed = ['--engine-commit', ENGINE_COMMIT, '--playouts-per-mode', '10'];
  const clean = script('gate.mjs', [...writeReports(join(work, 'clean'), cleanReports()), ...needed]);
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /^Balance report gate: PASSED\./);
  assert.match(clean.stdout, new RegExp(`${catalogue.length} in the catalogue, each reported once`));
  assert.match(clean.stdout, /It says nothing about balance or human play\./);

  const failing = cleanReports();
  const ready = first('ready');
  runOf(failing, ready.id).status = 'failed';
  const failed = script('gate.mjs', [...writeReports(join(work, 'failing'), failing), ...needed]);
  assert.equal(failed.status, 1, failed.stdout + failed.stderr);
  assert.match(failed.stderr, /^Balance report gate: FAILED, 2 problems\./);
  assert.match(failed.stderr, new RegExp(`${ready.id} is ready and was failed`));
  assert.doesNotMatch(failed.stdout, /PASSED/);

  const named = writeReports(join(work, 'partial'), cleanReports());
  const absent = script('gate.mjs', [...named.slice(0, 4), '--playouts', join(work, 'partial/none.json'), ...needed]);
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
  // An option without its value counts as not told: an empty shell variable must not switch a check off.
  const untold = [
    [...named.slice(2), ...needed], [...named, '--playouts-per-mode', '10'], [...named, '--engine-commit', ENGINE_COMMIT],
    [...named, ...needed, '--candidate-commit'], [...named, ...needed, '--candidate-commit', ''], [...named, '--engine-commit', '--playouts-per-mode', '10'],
  ];
  for (const args of untold) {
    const unasked = script('gate.mjs', args);
    assert.equal(unasked.status, 2, unasked.stdout + unasked.stderr);
    assert.match(unasked.stderr, /^Balance report gate: NOT CHECKED\./);
  }
});

test('reports of commands that executed nothing never pass the gate', () => {
  // The real commands, pointed at a directory with no engine in it. Each ends with exit status 0
  // and says NOT RUN; the gate is what refuses to take that for a result.
  const none = join(work, 'no-engine');
  mkdirSync(none);
  const out = join(work, 'not-run');
  mkdirSync(out);
  const files = { scenarios: join(out, 'scenarios.json'), controls: join(out, 'controls.json'), playouts: join(out, 'playouts.json') };
  assert.equal(script('run-scenarios.mjs', ['--engine-root', none, '--engine-commit', ENGINE_COMMIT, '--out', files.scenarios]).status, 0);
  assert.equal(script('controls.mjs', ['--engine-root', none, '--engine-commit', ENGINE_COMMIT, '--out', files.controls]).status, 0);
  assert.equal(script('walk.mjs', ['--engine-root', none, '--engine-commit', ENGINE_COMMIT, '--seeds', '10', '--out', files.playouts]).status, 0);
  const gate = script('gate.mjs', ['--scenarios', files.scenarios, '--controls', files.controls, '--playouts', files.playouts, '--engine-commit', ENGINE_COMMIT, '--playouts-per-mode', '10', '--allow-unpinned-tree']);
  assert.equal(gate.status, 1, gate.stdout + gate.stderr);
  assert.match(gate.stderr, /scenarios: no engine was available when the report was made/);
  assert.match(gate.stderr, /V1-M7-SETUP-01 is ready and was not-run/);
  assert.match(gate.stderr, /controls: the run's own verdict is not-run/);
  assert.match(gate.stderr, /playouts: .* cannot be read/);
});

test('the one-command engine gate fails when there is no engine, and runs nothing without a commit to pin', () => {
  const none = join(work, 'no-engine-3');
  mkdirSync(none);
  const out = join(work, 'engine-gate');
  const result = script('engine-gate.mjs', ['--engine-root', none, '--engine-commit', ENGINE_COMMIT, '--out-dir', out, '--allow-unpinned-tree']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  // Each command refuses to count a run without an engine, and the gate still runs and still fails.
  assert.match(result.stdout, /Balance engine gate: FAILED\. Exit status of scenarios 2, controls 2, playouts 2, gate 1\./);
  assert.match(result.stdout, /this is a trial, not a result for a merge gate/);

  const noGit = { GIT_DIR: join(work, 'no-such-repository'), GIT_CEILING_DIRECTORIES: root };
  const unpinned = script('engine-gate.mjs', ['--out-dir', join(work, 'engine-gate-2')], noGit);
  assert.equal(unpinned.status, 2, unpinned.stdout + unpinned.stderr);
  assert.match(unpinned.stderr, /^Balance engine gate: NOT RUN\. This directory has no Git commit to pin the reports to\./);
  const unknown = script('engine-gate.mjs', ['--engine-root', none, '--allow-unpinned-tree', '--out-dir', join(work, 'engine-gate-3')]);
  assert.equal(unknown.status, 2, unknown.stdout + unknown.stderr);
  assert.match(unknown.stderr, /The commit of the engine is not known/);
  const valueless = script('engine-gate.mjs', ['--allow-unpinned-tree', '--engine-root', none, '--engine-commit']);
  assert.equal(valueless.status, 2, valueless.stdout + valueless.stderr);
  assert.match(valueless.stderr, /--engine-commit was given without a value/);
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
  assert.deepEqual(pins.scenarioFileHashes, disk.scenarioFileHashes);
});

test('the playout command refuses to run no playouts', () => {
  for (const seeds of ['0', '-3', '2.5', 'many']) {
    const result = script('walk.mjs', ['--seeds', seeds]);
    assert.equal(result.status, 1, `${seeds}: ${result.stdout}`);
    assert.match(result.stderr, /--seeds needs a whole number of at least 1/);
  }
});

test('the static checks fail unless every test ran and passed', () => {
  const directory = (name, body) => {
    const path = join(work, name);
    mkdirSync(path);
    if (body !== null) writeFileSync(join(path, 'sample.test.mjs'), `import test from 'node:test';\nimport assert from 'node:assert/strict';\n${body}\n`);
    return path;
  };
  // These files run inside this test run, so the nested runner must not take itself for a child of it.
  const strict = path => script('static-tests.mjs', ['--dir', path], { NODE_TEST_CONTEXT: undefined });
  const cases = [
    ['passing', "test('one', () => { assert.equal(1, 1); });\ntest('two', () => {});", 0, /Static checks: 2 tests in 1 file, all passed/],
    ['failing', "test('one', () => { assert.equal(1, 2); });", 1, /Static checks: FAILED\. Of 1 test in 1 file: 1 failed\./],
    ['skipped', "test('one', () => {});\ntest('two', { skip: true }, () => {});", 1, /Of 2 tests in 1 file: 1 skipped\./],
    ['todo', "test('one', () => {});\ntest('two', { todo: true }, () => {});", 1, /1 marked todo\./],
    ['only-skips', "test.skip('one', () => {});", 1, /1 skipped\./],
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
  // Started as a child of another test run the runner executes nothing, and says so by failing.
  const nested = script('static-tests.mjs', ['--dir', join(work, 'static-passing')], { NODE_TEST_CONTEXT: 'child-v8' });
  assert.equal(nested.status, 1, nested.stdout);
});
