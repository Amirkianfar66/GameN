// Negative controls for the scenario harness.
//
//   node scripts/controls.mjs --engine-root <dir> [--engine-commit <sha>] [--out <file.json>] [--require-engine]
//
// Each control copies a ready scenario and makes exactly one of its expectations wrong: a
// command expected to be accepted is expected to be refused, or an asserted value is changed.
// A run of that copy must fail. A control that still passes would mean the expectation checks
// nothing. This tests the harness and the fixtures, not the engine.
//
// Then the deliberate leaks of tests/scenarios/support/leaks.mjs. The binding is made to tell
// somebody one thing a disclosure rule does not allow, and a comparison of two runs has to
// notice: every leak, with every number of players for which it tells anybody anything. And the
// other way round: every paired scenario that says two runs look the same has to fail for at
// least one leak, or it has not been shown to watch anything.
//
// Exit status, so that the command can be used as a gate:
//   0  every ready scenario passed unmodified, controls were executed and all were detected;
//      also when no engine is available and --require-engine was not given: nothing ran, and the
//      output says NOT RUN. That is the expected state at a commit without a full-game engine.
//   1  a ready scenario did not pass unmodified, a control was not detected, no control ran, a
//      leak was not caught, or a paired scenario failed for no leak.
//   2  nothing was run that could count: --require-engine was given and no engine is available,
//      the command line cannot be understood, or the engine commit it states contradicts the checkout.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { controlVerdict, hasTwin, judgeLeak, runControls, runScenario, unexercised } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { LEAKS, leakModes, withLeak } from '../../../tests/scenarios/support/leaks.mjs';
import { loadGroup } from '../../../tests/scenarios/v1/files.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { buildPins, noteProvenance } from './pins.mjs';

const refuse = message => { console.error(`FAILED: ${message} Nothing was run.`); process.exit(2); };
const { values, flags } = readArgs({ values: ['engine-root', 'engine-commit', 'out'], flags: ['require-engine'] }, refuse);
const engineRoot = values['engine-root'] === null ? null : invocationPath(values['engine-root']);
const out = values.out;
const requireEngine = flags['require-engine'];
const write = summary => {
  if (out === null) return;
  const target = invocationPath(out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(summary, null, 1)}\n`);
  console.log(`Summary written to ${target}`);
};

const loaded = await load(engineRoot);
const built = buildPins({ engineRoot, engineCommit: values['engine-commit'], adapter: loaded.available ? loaded.adapter : null, runner: '@mothership/balance negative controls' });
if ('problem' in built) refuse(built.problem);
const pins = built.pins;
if (!loaded.available) {
  console.log(`NOT RUN. No control was executed. Engine adapter unavailable: ${loaded.reason}`);
  // The report is written all the same, so that an older report in its place cannot be taken for this run.
  write({ schema: 'mothership.balance.controls/1', pins, verdict: 'not-run', reason: loaded.reason, node: process.version, modes: {}, undetected: [], baselineFailures: [] });
  process.exit(requireEngine ? 2 : 0);
}
const adapter = loaded.adapter;

const summary = { schema: 'mothership.balance.controls/1', pins, engine: adapter.pins, engineCommit: pins.engineCommit, node: process.version, modes: {}, undetected: [], baselineFailures: [], verdict: 'failed' };
const runs = [];
for (const mode of [7, 8, 9]) {
  const run = runControls(loadGroup(String(mode)).scenarios, adapter);
  runs.push(run);
  const stats = run.stats;
  summary.modes[mode] = stats;
  summary.undetected.push(...run.undetected);
  summary.baselineFailures.push(...run.baselineFailures);
  console.log(`mode ${mode}: ${stats.scenarios} ready scenarios, ${stats.controls} controls, ${stats.detected} detected, ${stats.undetected} undetected${stats.baselineNotPassing > 0 ? `, ${stats.baselineNotPassing} scenarios do not pass unmodified` : ''}`);
}
const verdict = controlVerdict(runs);
// One more kind of control: the binding is made to leak, in each of the ways a private read or a
// receipt could be built wrongly, and a comparison has to catch every one, in every player count
// in which the leak tells anybody anything. A changed expectation tests a case's own checks; a
// leak tests whether the cases together watch the right things. A run through a leaking binding
// says nothing about the engine and is not part of the counts above.
summary.leaks = [];
const paired = [7, 8, 9].flatMap(mode => loadGroup(String(mode)).scenarios).filter(scenario => scenario.status === 'ready' && hasTwin(scenario));
// The paired cases that pass when nothing leaks. Only those can show a leak.
const passing = new Set(paired.filter(scenario => runScenario(scenario, adapter, '').status === 'passed').map(scenario => scenario.id));
const outcomes = [];
for (const [leak, meaning] of Object.entries(LEAKS)) {
  const leaking = withLeak(adapter, leak);
  const modes = leakModes(leak);
  const outcome = judgeLeak(leak, meaning, modes, paired.filter(scenario => passing.has(scenario.id)).map(scenario => ({ scenario, run: runScenario(scenario, leaking, '') })), passing);
  outcomes.push(outcome);
  summary.leaks.push({ leak, meaning, modes, caughtBy: outcome.caughtBy });
  console.log(`leak ${leak}: ${outcome.caughtBy.length === 0 ? 'NOT CAUGHT' : `caught by ${outcome.caughtBy.map(item => item.scenario).join(', ')}`}`);
  if (outcome.problems.length > 0) { verdict.passed = false; verdict.problems.push(...outcome.problems); }
}
// The other way round: every paired case that says two runs look the same has to have failed for some leak.
summary.pairedCases = paired.length;
summary.unexercised = unexercised(paired, outcomes);
for (const id of summary.unexercised) { verdict.passed = false; verdict.problems.push(`no deliberate leak makes ${id} fail, so it has not been shown to watch anything`); }
summary.verdict = verdict.passed ? 'passed' : 'failed';
for (const line of summary.baselineFailures.slice(0, 40)) console.log(`BASELINE NOT PASSING ${line}`);
if (summary.baselineFailures.length > 40) console.log(`... and ${summary.baselineFailures.length - 40} more`);
for (const line of summary.undetected.slice(0, 40)) console.log(`UNDETECTED ${line}`);
noteProvenance(pins);
write(summary);
if (!verdict.passed) {
  for (const problem of verdict.problems) console.error(`FAILED: ${problem}`);
  process.exit(1);
}
console.log('All controls detected.');
