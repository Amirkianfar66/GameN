// Runs scenario fixtures through an engine adapter and reports what happened.
//
//   node scripts/run-scenarios.mjs                       engine of this checkout
//   node scripts/run-scenarios.mjs --engine-root <dir>   a built checkout of another commit
//     [--engine-commit <sha>] [--out <report.json>] [--only <id-prefix>] [--verbose] [--require-engine]
//     [--suite v1|capacity] [--ruleset <ruleset version>]
//
// --suite     Which fixtures: the Version 1 catalogue (the default) or the room-capacity fixtures
//             of issue #96. The capacity fixtures are held to the capacity invariants as well.
// --ruleset   The ruleset every match is created under. An engine that plays several rulesets
//             is asked for this one, and an engine that does not name it runs nothing. Without
//             it the Version 1 catalogue runs under the engine's own default, as it always did,
//             and the capacity fixtures under the ruleset that carries the rule. Naming another
//             ruleset for the capacity fixtures is how they are shown to fail without the rule.
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
import { fileURLToPath } from 'node:url';
import { buildReport, runScenario, validateScenario } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { CAPACITY_FILES } from '../../../tests/scenarios/capacity/catalog.mjs';
import * as capacity from '../../../tests/scenarios/capacity/files.mjs';
import { GROUPS, loadGroup } from '../../../tests/scenarios/v1/files.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { buildPins, noteProvenance, sha256 } from './pins.mjs';

const refuse = message => { console.error(`FAILED: ${message} Nothing was run.`); process.exit(2); };
const { values, flags } = readArgs({ values: ['engine-root', 'engine-commit', 'out', 'only', 'suite', 'ruleset'], flags: ['verbose', 'require-engine'] }, refuse);
const engineRoot = values['engine-root'] === null ? null : invocationPath(values['engine-root']);
const only = values.only;
const out = values.out;
const verbose = flags.verbose;
const suiteName = values.suite ?? 'v1';
if (suiteName !== 'v1' && suiteName !== 'capacity') refuse(`--suite ${suiteName} names no suite; the suites are v1 and capacity.`);
const suite = suiteName === 'v1' ? { groups: GROUPS, loadGroup, ruleset: values.ruleset, roomCapacity: null }
  : { groups: capacity.GROUPS, loadGroup: capacity.loadGroup, ruleset: values.ruleset ?? capacity.CAPACITY_RULESET_VERSION, roomCapacity: 5 };
const loaded = await load(engineRoot, { ruleset: suite.ruleset, roomCapacity: suite.roomCapacity });
const adapter = loaded.available ? loaded.adapter : null;
const reason = loaded.available ? '' : `engine adapter unavailable: ${loaded.reason}`;
// A run that names its suite or its ruleset records both. A plain Version 1 run carries the pins it always did.
const extra = suiteName === 'v1' && suite.ruleset === null ? {} : {
  suite: suiteName, rulesetAskedFor: suite.ruleset, roomCapacity: suite.roomCapacity,
  ...(suiteName === 'capacity' ? {
    capacityFileHashes: Object.fromEntries(capacity.GROUPS.map(group => [CAPACITY_FILES[group], sha256(fileURLToPath(capacity.capacityFileUrl(group)))])),
    capacityRulesetVersion: capacity.CAPACITY_RULESET_VERSION, ownerDecision: capacity.CAPACITY_DECISION,
  } : {}),
};
const built = buildPins({ engineRoot, engineCommit: values['engine-commit'], adapter, runner: '@mothership/balance scenario runner', extra });
if ('problem' in built) refuse(built.problem);

const runs = [];
let invalid = 0;
for (const group of suite.groups) {
  for (const scenario of suite.loadGroup(group).scenarios) {
    if (only !== null && !scenario.id.startsWith(only)) continue;
    const issues = validateScenario(scenario);
    if (issues.length > 0) { invalid += 1; console.error(issues.join('\n')); continue; }
    runs.push(runScenario(scenario, adapter, reason));
  }
}
// A prefix that names no scenario would otherwise end as a run of nothing with no failure.
if (only !== null && runs.length === 0 && invalid === 0) refuse(`--only ${only} is the beginning of no scenario identifier.`);

const report = buildReport(runs, built.pins);

const row = (label, summary) => `${label.padEnd(12)} total ${String(summary.total).padStart(3)}  passed ${String(summary.passed).padStart(3)}  failed ${String(summary.failed).padStart(3)}  blocked ${String(summary.blocked).padStart(3)}  not-run ${String(summary.notRun).padStart(3)}`;
console.log(adapter === null ? `No scenario was executed. ${reason}` : `Engine ${adapter.pins.engineVersion}, ruleset ${adapter.pins.rulesetVersion}, protocol ${adapter.pins.protocolVersion}, commit ${report.pins.engineCommit}`);
if (suiteName !== 'v1') console.log(`Suite ${suiteName}${suite.roomCapacity === null ? '' : `, held to at most ${suite.roomCapacity} players a room`}`);
for (const group of ['mode-7', 'mode-8', 'mode-9', ...(suiteName === 'v1' ? ['unsupported'] : [])]) console.log(row(group, report.byGroup[group]));
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
