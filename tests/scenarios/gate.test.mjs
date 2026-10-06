// The report gate, the reviewed exception list and the strict runner for these static tests.
//
// The gate is tested with reports written here from the catalogue: one clean set, and then that
// set with exactly one thing wrong at a time. Each wrong thing must be named. No engine is
// involved, and the clean set is not a result: results are in docs/balance/evidence/.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENGINE_COMMIT_BASIS, controlsFor, exceptionProblems, gateProblems } from '@mothership/balance';
import { engineBuildDigest, engineProvenance, sourceHashes, treeState } from '../../tools/balance/scripts/pins.mjs';
import { OVERLAY_ABSENT, SOURCE_MANIFEST_SHA256, V1_OVERLAY_PATH, V1_OVERLAY_SHA256, V1_RULESET_VERSION, loadAll, loadExceptions } from './v1/files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'mothership-balance-gate-'));
test.after(() => { rmSync(work, { recursive: true, force: true }); });

const catalogue = loadAll();
const allowlist = loadExceptions();
const disk = sourceHashes();
const ENGINE_COMMIT = 'a'.repeat(40);
const TREE_COMMIT = 'b'.repeat(40);
// The combined manifest belongs to the engine. Where this checkout has none, the reports written
// here name one of their own, as reports made against an engine elsewhere would.
const MANIFEST = disk.v1ManifestSha256 ?? 'c'.repeat(64);
const copy = value => JSON.parse(JSON.stringify(value));

// What the three commands write for a complete and clean run of the catalogue as it is on disk.
function cleanReports(playouts = 10) {
  // Each report gets pins of its own, so that changing one report changes nothing else.
  const pins = () => copy({
    ...disk, v1OverlaySha256: V1_OVERLAY_SHA256, v1ManifestSha256: MANIFEST, workingTreeCommit: TREE_COMMIT,
    engineCommit: ENGINE_COMMIT, engineCommitBasis: ENGINE_COMMIT_BASIS.there, engineTreeClean: true, engineBuildSha256: 'e'.repeat(64),
    engine: { adapter: 'written-by-the-test', engineVersion: 'none', rulesetVersion: V1_RULESET_VERSION, rulesetHash: V1_OVERLAY_SHA256, protocolVersion: 2 },
  });
  const runs = catalogue.map(scenario => {
    const head = { scenarioId: scenario.id, group: scenario.group, mode: scenario.mode, decisionIds: scenario.decisionIds, failure: null, invariantViolations: [], probes: [] };
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
  // As the command does it: the manifest is compared with the file where this checkout has one.
  v1Manifest: disk.v1ManifestSha256 === null ? null : { sha256: disk.v1ManifestSha256 }, scenarioFileHashes: disk.scenarioFileHashes,
  ruleSourceHashes: disk.ruleSourceHashes, rulebookSha256: disk.rulebookSha256, ...changes,
});
const judge = (reports, changes) => gateProblems(reports, catalogue, allowlist, expectations(changes));
const runOf = (reports, id) => reports.scenarios.runs.find(run => run.scenarioId === id);
const first = status => catalogue.find(scenario => scenario.status === status && scenario.mode === 7);
const probed = catalogue.find(scenario => scenario.status === 'blocked' && scenario.setup !== null);
const unprobed = catalogue.find(scenario => scenario.status === 'blocked' && scenario.setup === null);
const everyReport = (reports, change) => { for (const report of Object.values(reports)) change(report); };
// One wrong thing at a time: the change is made to a fresh clean set, and some problem must match.
function eachIsNamed(cases, changes) {
  for (const [name, change, pattern] of cases) {
    const reports = cleanReports();
    change(reports);
    const problems = judge(reports, changes);
    assert.ok(problems.some(problem => pattern.test(problem)), `${name}: ${JSON.stringify(problems.slice(0, 3))}`);
  }
}

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
    ['no list at all', catalogue, null, /must have the schema/],
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
  assert.deepEqual(judge(cleanReports(200), { playoutsPerMode: 200 }), []);
  for (const missing of ['scenarios', 'controls', 'playouts']) {
    const reports = { ...cleanReports(), [missing]: null };
    assert.ok(judge(reports).includes(`${missing}: the report is missing or is not an object`), missing);
  }
  assert.ok(judge({ scenarios: null, controls: null, playouts: null }).length >= 3);
});

test('one wrong thing in the scenario report fails the gate and is named', () => {
  const ready = first('ready');
  const manual = first('manual');
  eachIsNamed([
    ['a missing case', reports => { reports.scenarios.runs = reports.scenarios.runs.filter(run => run.scenarioId !== ready.id); }, new RegExp(`${ready.id} is missing from the report`)],
    ['a case reported twice', reports => { reports.scenarios.runs.push(copy(runOf(reports, ready.id))); }, new RegExp(`${ready.id} is reported twice`)],
    ['a case that is not in the catalogue', reports => { reports.scenarios.runs.push({ ...copy(runOf(reports, ready.id)), scenarioId: 'V1-M7-NONE-01' }); }, /V1-M7-NONE-01 is reported and is not in the catalogue/],
    ['a run without an identifier', reports => { runOf(reports, ready.id).scenarioId = [ready.id]; }, /a run has no scenario identifier/],
    ['a ready case that failed', reports => { Object.assign(runOf(reports, ready.id), { status: 'failed', failure: { stepIndex: 1, op: 'assert', message: 'observed something else' } }); }, new RegExp(`${ready.id} is ready and was failed: observed something else`)],
    ['a ready case that was not run', reports => { Object.assign(runOf(reports, ready.id), { status: 'not-run', reason: 'engine adapter unavailable' }); }, new RegExp(`${ready.id} is ready and was not-run: engine adapter unavailable`)],
    ['a ready case reported blocked', reports => { runOf(reports, ready.id).status = 'blocked'; }, new RegExp(`${ready.id} is ready and was blocked`)],
    // A report that contradicts itself is not a pass, whoever wrote it.
    ['a pass that carries a failure', reports => { runOf(reports, ready.id).failure = { stepIndex: 1, op: 'assert', message: 'observed something else' }; }, new RegExp(`${ready.id} is reported passed and carries a failure`)],
    ['a pass that carries an invariant violation', reports => { runOf(reports, ready.id).invariantViolations = [{ invariant: 'INV-PH-07', message: 'a window nobody could use' }]; }, new RegExp(`${ready.id} is reported passed and carries`)],
    ['a pass without its list of violations', reports => { delete runOf(reports, ready.id).invariantViolations; }, new RegExp(`${ready.id} is reported passed and carries`)],
    ['a blocked case reported passed', reports => { runOf(reports, probed.id).status = 'passed'; }, new RegExp(`${probed.id} is blocked and was reported passed`)],
    ['a blocked case with another decision', reports => { runOf(reports, probed.id).decisionIds = ['D99']; }, new RegExp(`${probed.id} reports other decisions than its fixture`)],
    ['a probe that was not completed', reports => { runOf(reports, probed.id).reason = 'probe could not be completed: the engine refused a legal setup'; }, new RegExp(`${probed.id}: its probe was not completed`)],
    ['a probe that recorded nothing', reports => { runOf(reports, probed.id).probes = []; }, new RegExp(`${probed.id}: 0 observations recorded`)],
    ['a probe that recorded no outcome', reports => { const run = runOf(reports, probed.id); run.probes = run.probes.map(() => null); }, new RegExp(`${probed.id}: 0 observations recorded`)],
    ['an unprobed case with another reason', reports => { runOf(reports, unprobed.id).reason = null; }, new RegExp(`${unprobed.id}: unexpected reason null`)],
    ['a manual case reported passed', reports => { runOf(reports, manual.id).status = 'passed'; }, new RegExp(`${manual.id} is manual and was reported passed`)],
    ['totals that do not match the runs', reports => { reports.scenarios.totals.passed += 1; }, /the totals do not match the runs/],
    ['another kind of report', reports => { reports.scenarios.schema = 'something-else/1'; }, /scenarios: unexpected schema/],
  ]);
  // A whole mode left out cannot hide behind the other two.
  const reports = cleanReports();
  reports.scenarios.runs = reports.scenarios.runs.filter(run => run.mode !== 8);
  assert.ok(judge(reports).includes('scenarios: no scenario passed for 8 players'));
});

test('one wrong thing in the controls or playout report fails the gate and is named', () => {
  eachIsNamed([
    ['a run that judged itself failed', reports => { reports.controls.verdict = 'failed'; }, /controls: the run's own verdict is failed/],
    ['a run that did not happen', reports => { reports.controls = { schema: 'mothership.balance.controls/1', pins: reports.controls.pins, verdict: 'not-run', modes: {}, undetected: [], baselineFailures: [] }; }, /controls: the run's own verdict is not-run/],
    ['a baseline that did not pass', reports => { reports.controls.modes[7].baselineNotPassing = 1; }, /7 players: baselines that did not pass: 1/],
    ['fewer baselines than the catalogue has', reports => { reports.controls.modes[8].scenarios -= 1; }, /8 players: \d+ baselines reported, \d+ in the catalogue/],
    ['fewer controls than the catalogue generates', reports => { reports.controls.modes[9].controls -= 1; reports.controls.modes[9].detected -= 1; }, /9 players: \d+ controls executed, \d+ generated from the catalogue/],
    ['a control that was not detected', reports => { reports.controls.modes[7].detected -= 1; reports.controls.modes[7].undetected = 1; }, /7 players: controls not detected: 1/],
    ['an undetected control in the list', reports => { reports.controls.undetected.push('V1-M7-SETUP-01 step 1 (asserted fact)'); }, /the list of controls that were not detected has 1 entry/],
    ['a failing baseline in the list', reports => { reports.controls.baselineFailures.push('V1-M7-SETUP-01: refused', 'V1-M7-SETUP-02: refused'); }, /the list of baselines that did not pass has 2 entries/],
    ['something else where a list belongs', reports => { reports.controls.undetected = { 0: 'V1-M7-SETUP-01 step 1' }; }, /the list of controls that were not detected is missing/],
    ['no list of failing baselines', reports => { reports.controls.baselineFailures = 'none'; }, /the list of baselines that did not pass is missing/],
    ['a mode without controls', reports => { delete reports.controls.modes[9]; }, /controls: no result for 9 players/],
    ['another number of playouts asked for', reports => { reports.playouts.seedsPerMode = 5; }, /5 playouts per mode were asked for, 10 are required/],
    ['fewer playouts than required', reports => { reports.playouts.modes[7].playouts = 9; reports.playouts.modes[7].completed = 9; }, /7 players: 9 playouts executed, 10 required/],
    ['a playout that did not finish', reports => { reports.playouts.modes[8].completed = 9; }, /8 players: 9 of 10 playouts finished/],
    ['an unfinished playout in the terminal record', reports => { reports.playouts.modes[8].terminalReached.unfinished = 1; }, /8 players: unfinished playouts are reported/],
    ['an invariant violation', reports => { reports.playouts.modes[9].invariantViolations = 1; }, /9 players: invariant violations: 1/],
    ['a hint mismatch', reports => { reports.playouts.modes[9].hintMismatches = 2; }, /9 players: hint mismatches: 2/],
    ['a replay mismatch', reports => { reports.playouts.modes[7].replayMismatches = 1; }, /7 players: replay mismatches: 1/],
    ['a mode without playouts', reports => { delete reports.playouts.modes[7]; }, /playouts: no result for 7 players/],
    ['a playout run that did not happen', reports => { reports.playouts = { schema: 'mothership.balance.walk/1', pins: reports.playouts.pins, verdict: 'not-run', seedsPerMode: 10, modes: {} }; }, /playouts: no result for 8 players/],
  ]);
});

test('reports about another engine, other files or an unpinned tree fail the gate', () => {
  eachIsNamed([
    ['no engine', reports => { reports.scenarios.pins.engine = null; }, /scenarios: no engine was available when the report was made/],
    ['another engine commit', reports => { reports.controls.pins.engineCommit = 'c'.repeat(40); }, /controls: the engine commit is c{40}, not a{40}/],
    ['an engine commit that was not stated', reports => { reports.playouts.pins.engineCommit = 'not stated'; }, /playouts: the engine commit is not stated/],
    ['another ruleset', reports => { reports.scenarios.pins.engine.rulesetVersion = 'in-person-v0'; }, /the engine reports ruleset in-person-v0/],
    ['an engine with another owner decision', reports => { reports.scenarios.pins.engine.rulesetHash = 'd'.repeat(64); }, /a ruleset hash that is not the approved owner decision/],
    ['an owner-decision file that is not the approved one', reports => { reports.scenarios.pins.v1OverlaySha256 = 'd'.repeat(64); }, /the owner-decision file beside the engine is missing or is not the approved one/],
    ['no owner-decision file', reports => { reports.controls.pins.v1OverlaySha256 = null; }, /controls: the owner-decision file beside the engine is missing/],
    ['another source manifest', reports => { reports.scenarios.pins.sourceManifestSha256 = 'd'.repeat(64); }, /the rule-source manifest is not the pinned one/],
    ['a rule source that changed', reports => { const key = Object.keys(reports.scenarios.pins.ruleSourceHashes)[0]; reports.scenarios.pins.ruleSourceHashes[key] = 'd'.repeat(64); }, /the rule sources differ from the files on disk/],
    ['a scenario file that changed', reports => { reports.controls.pins.scenarioFileHashes['mode-7.scenarios.json'] = 'd'.repeat(64); }, /controls: the scenario files differ from the files on disk/],
    ['a rulebook that changed', reports => { reports.playouts.pins.rulebookSha256 = 'd'.repeat(64); }, /playouts: the rulebook differs from the file on disk/],
    ['uncommitted changes', reports => { everyReport(reports, report => { report.pins.workingTreeCommit = `${TREE_COMMIT} plus uncommitted changes`; }); }, /the working tree is not a clean commit/],
    ['no Git provenance', reports => { everyReport(reports, report => { report.pins.workingTreeCommit = 'unknown'; }); }, /the working tree is not a clean commit \(unknown\)/],
    ['reports from two trees', reports => { reports.playouts.pins.workingTreeCommit = 'c'.repeat(40); }, /playouts: not the same working tree as the scenario report/],
    ['reports about two engines', reports => { reports.controls.pins.engine.engineVersion = 'another'; }, /controls: not the same engine as the scenario report/],
    ['reports about two builds of the engine', reports => { reports.playouts.pins.engineBuildSha256 = 'f'.repeat(64); }, /playouts: not the same engine build as the scenario report/],
    ['a report that does not say which build it ran', reports => { everyReport(reports, report => { report.pins.engineBuildSha256 = null; }); }, /the built engine modules were not found/],
    ['a report without pins', reports => { delete reports.playouts.pins; }, /playouts: the report carries no pins/],
    // An absent pin is not an agreement. Three reports without the combined manifest fail, whether
    // or not the engine's checkout is at hand to compare it with.
    ['no combined manifest in any report', reports => { everyReport(reports, report => { report.pins.v1ManifestSha256 = null; }); }, /the combined Version 1 manifest was not found beside the engine/],
    ['reports about two combined manifests', reports => { reports.controls.pins.v1ManifestSha256 = 'd'.repeat(64); }, /controls: not the same combined Version 1 manifest as the scenario report/],
    // The engine commit has to have been read from Git, from a clean tree. A label is not enough.
    ['an engine commit that was only stated', reports => { everyReport(reports, report => { report.pins.engineCommitBasis = ENGINE_COMMIT_BASIS.stated; report.pins.engineTreeClean = null; }); }, /the engine commit was only stated on the command line/],
    ['an engine commit of unknown origin', reports => { delete reports.scenarios.pins.engineCommitBasis; }, /scenarios: the engine commit was only stated on the command line/],
    ['an engine checkout with uncommitted changes', reports => { everyReport(reports, report => { report.pins.engineTreeClean = false; }); }, /the engine's checkout had uncommitted changes/],
    ["this checkout's engine under another commit", reports => { everyReport(reports, report => { report.pins.engineCommitBasis = ENGINE_COMMIT_BASIS.here; }); }, /the engine is this checkout's own, but its commit a{40} is not the working tree's/],
  ]);
  // The scenario files are pinned by name; a case above relies on this one being among them.
  assert.ok('mode-7.scenarios.json' in disk.scenarioFileHashes);
  // The same three without the checkout at hand: absent stays a failure.
  const absent = cleanReports();
  everyReport(absent, report => { report.pins.v1ManifestSha256 = null; });
  assert.equal(judge(absent, { v1Manifest: null }).filter(problem => /was not found beside the engine/.test(problem)).length, 3);
  const other = cleanReports();
  everyReport(other, report => { report.pins.v1ManifestSha256 = 'd'.repeat(64); });
  assert.deepEqual(judge(other, { v1Manifest: { sha256: MANIFEST } }), ['scenarios', 'controls', 'playouts'].map(name => `${name}: the combined Version 1 manifest differs from the file beside the engine`));
  assert.deepEqual(judge(other, { v1Manifest: null }), [], 'without the checkout at hand the reports only have to carry it and agree');

  // The engine of the checkout itself, at the checkout's commit, is the form a merge gate sees.
  const own = cleanReports();
  everyReport(own, report => { report.pins.engineCommitBasis = ENGINE_COMMIT_BASIS.here; report.pins.engineCommit = TREE_COMMIT; });
  assert.deepEqual(judge(own, { engineCommit: TREE_COMMIT, candidateCommit: TREE_COMMIT }), []);

  // A candidate commit pins the tree exactly. An unpinned tree and an unchecked engine commit are
  // accepted only when asked for, never beside a named candidate, and nothing else is relaxed.
  assert.ok(judge(cleanReports(), { candidateCommit: 'c'.repeat(40) }).some(problem => /not the clean candidate c{40}/.test(problem)));
  const trial = cleanReports();
  everyReport(trial, report => { Object.assign(report.pins, { workingTreeCommit: `${TREE_COMMIT} plus uncommitted changes`, engineCommitBasis: ENGINE_COMMIT_BASIS.stated, engineTreeClean: null }); });
  assert.deepEqual(judge(trial, { allowUnpinnedTree: true }), []);
  assert.ok(judge(trial).length >= 6);
  const named = judge(trial, { allowUnpinnedTree: true, candidateCommit: TREE_COMMIT });
  assert.ok(named.some(problem => /not the clean candidate/.test(problem)) && named.some(problem => /only stated on the command line/.test(problem)), 'a named candidate is never relaxed');
  trial.playouts.modes[7].invariantViolations = 1;
  assert.equal(judge(trial, { allowUnpinnedTree: true }).length, 1);
  // What the gate is told to expect has to be exact itself.
  assert.ok(judge(cleanReports(), { engineCommit: 'a3898b8' }).some(problem => /must be a full commit hash/.test(problem)));
  assert.ok(judge(cleanReports(), { candidateCommit: 'HEAD' }).some(problem => /candidate commit must be a full commit hash/.test(problem)));
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
