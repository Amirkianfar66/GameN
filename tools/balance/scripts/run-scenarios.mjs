// Runs the Version 1 scenario fixtures through an engine adapter and reports what happened.
//
//   node scripts/run-scenarios.mjs                       engine of this checkout
//   node scripts/run-scenarios.mjs --engine-root <dir>   a built checkout of another commit
//     [--engine-commit <sha>] [--out <report.json>] [--only <id-prefix>] [--verbose] [--require-engine]
//
// Nothing is reported as passed unless it was executed. Without an engine every ready
// scenario is "not-run". Blocked scenarios stay blocked whatever an engine does.
//
// Exit status: 1 when an executed scenario failed or a fixture is malformed; 2 when nothing was
// run that could count: --require-engine was given and no engine is available, the command line
// cannot be understood, or the engine commit it states contradicts the checkout; otherwise 0.
// Without --require-engine a run that executed nothing exits 0, which is the expected state at a
// commit without a full-game engine and is not a pass. A gate must pass --require-engine.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildReport, runScenario, validateScenario } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { GROUPS, loadGroup } from '../../../tests/scenarios/v1/files.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { buildPins, noteProvenance } from './pins.mjs';

const refuse = message => { console.error(`FAILED: ${message} Nothing was run.`); process.exit(2); };
const { values, flags } = readArgs({ values: ['engine-root', 'engine-commit', 'out', 'only'], flags: ['verbose', 'require-engine'] }, refuse);
const engineRoot = values['engine-root'] === null ? null : invocationPath(values['engine-root']);
const only = values.only;
const out = values.out;
const verbose = flags.verbose;
const loaded = await load(engineRoot);
const adapter = loaded.available ? loaded.adapter : null;
const reason = loaded.available ? '' : `engine adapter unavailable: ${loaded.reason}`;
const built = buildPins({ engineRoot, engineCommit: values['engine-commit'], adapter, runner: '@mothership/balance scenario runner' });
if ('problem' in built) refuse(built.problem);

const runs = [];
let invalid = 0;
for (const group of GROUPS) {
  for (const scenario of loadGroup(group).scenarios) {
    if (only !== null && !scenario.id.startsWith(only)) continue;
    const issues = validateScenario(scenario);
    if (issues.length > 0) { invalid += 1; console.error(issues.join('\n')); continue; }
    runs.push(runScenario(scenario, adapter, reason));
  }
}

const report = buildReport(runs, built.pins);

const row = (label, summary) => `${label.padEnd(12)} total ${String(summary.total).padStart(3)}  passed ${String(summary.passed).padStart(3)}  failed ${String(summary.failed).padStart(3)}  blocked ${String(summary.blocked).padStart(3)}  not-run ${String(summary.notRun).padStart(3)}`;
console.log(adapter === null ? `No scenario was executed. ${reason}` : `Engine ${adapter.pins.engineVersion}, ruleset ${adapter.pins.rulesetVersion}, protocol ${adapter.pins.protocolVersion}, commit ${report.pins.engineCommit}`);
for (const group of ['mode-7', 'mode-8', 'mode-9', 'unsupported']) console.log(row(group, report.byGroup[group]));
console.log(row('all', report.totals));
for (const run of runs) {
  if (run.status === 'failed') console.log(`FAILED  ${run.scenarioId}: step ${run.failure.stepIndex} (${run.failure.op}): ${run.failure.message}`);
  if (run.status === 'blocked' && run.probes.length > 0 && verbose) console.log(`BLOCKED ${run.scenarioId} [${run.decisionIds.join(', ')}] observed: ${run.probes.map(item => `${item.label} -> ${item.outcome}`).join('; ')}`);
  if (run.status === 'blocked' && run.reason !== null && verbose) console.log(`BLOCKED ${run.scenarioId} [${run.decisionIds.join(', ')}]: ${run.reason}`);
  if (run.status === 'not-run' && verbose) console.log(`NOT RUN ${run.scenarioId}: ${run.reason}`);
}
noteProvenance(report.pins);
if (out !== null) {
  const target = invocationPath(out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 1)}\n`);
  console.log(`Report written to ${target}`);
}
if (invalid > 0 || report.totals.failed > 0) process.exit(1);
// Nothing was executed. With --require-engine that is a failure of the gate, with its own exit status.
if (adapter === null && flags['require-engine']) {
  console.error('FAILED: --require-engine was given and no engine is available.');
  process.exit(2);
}
