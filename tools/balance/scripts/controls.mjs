// Negative controls for the scenario harness.
//
//   node scripts/controls.mjs --engine-root <dir> [--engine-commit <sha>] [--out <file.json>] [--require-engine]
//     [--stand-in supply-disclosure]
//
// --stand-in runs through the stand-in of tests/scenarios/support/disclosing.mjs, as for the
// scenario command. A scenario that does not pass has no controls, so this is the only way to try
// the controls of the Supplier disclosure cases before an engine makes that disclosure itself. The
// report names the stand-in as its adapter and the report gate refuses it.
//
// Each control copies a ready scenario and makes exactly one of its expectations wrong: a
// command expected to be accepted is expected to be refused, or an asserted value is changed.
// A run of that copy must fail. A control that still passes would mean the expectation checks
// nothing. This tests the harness and the fixtures, not the engine.
//
// Exit status, so that the command can be used as a gate:
//   0  every ready scenario passed unmodified, controls were executed and all were detected;
//      also when no engine is available and --require-engine was not given: nothing ran, and the
//      output says NOT RUN. That is the expected state at a commit without a full-game engine.
//   1  a ready scenario did not pass unmodified, a control was not detected, or no control ran.
//   2  nothing was run that could count: --require-engine was given and no engine is available,
//      the command line cannot be understood, or the engine commit it states contradicts the checkout.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { controlVerdict, hasTwin, runControls, runScenario } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { LEAKS, SUPPLY_DISCLOSURE_STAND_IN, withSupplyDisclosure } from '../../../tests/scenarios/support/disclosing.mjs';
import { loadGroup } from '../../../tests/scenarios/v1/files.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { buildPins, noteProvenance } from './pins.mjs';

const refuse = message => { console.error(`FAILED: ${message} Nothing was run.`); process.exit(2); };
const { values, flags } = readArgs({ values: ['engine-root', 'engine-commit', 'out', 'stand-in'], flags: ['require-engine'] }, refuse);
const standIn = values['stand-in'];
if (standIn !== null && standIn !== SUPPLY_DISCLOSURE_STAND_IN) refuse(`--stand-in knows only ${SUPPLY_DISCLOSURE_STAND_IN}.`);
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
// The binding itself, kept for the leaking variants of the stand-in below.
const binding = loaded.available ? loaded.adapter : null;
if (loaded.available && standIn !== null) {
  loaded.adapter = withSupplyDisclosure(loaded.adapter);
  console.log(`STAND-IN ${SUPPLY_DISCLOSURE_STAND_IN}: Supplier is told whom the Supplier stage armed by the stand-in, not by the engine. This run shows that the controls of those cases are detected. It is not evidence about the engine.`);
}
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
// With the stand-in, one more kind of control: the stand-in is made to leak, in each of the ways a
// disclosure to Supplier could go wrong, and the paired cases have to catch every one. A changed
// expectation tests a case's own checks; a leak tests whether the cases together watch the right things.
if (standIn !== null) {
  summary.leaks = [];
  const paired = [7, 8, 9].flatMap(mode => loadGroup(String(mode)).scenarios).filter(scenario => scenario.status === 'ready' && hasTwin(scenario));
  for (const [leak, meaning] of Object.entries(LEAKS)) {
    const leaking = withSupplyDisclosure(binding, leak);
    const caughtBy = paired.filter(scenario => runScenario(scenario, leaking, '').status === 'failed').map(scenario => scenario.id);
    summary.leaks.push({ leak, meaning, caughtBy });
    console.log(`leak ${leak}: ${caughtBy.length === 0 ? 'NOT CAUGHT' : `caught by ${caughtBy.join(', ')}`}`);
    if (caughtBy.length === 0) { verdict.passed = false; verdict.problems.push(`the leak "${leak}" (${meaning}) was caught by no paired case`); }
  }
}
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
