// Runs the controls on an existing version (tests/scenarios/next-version/controls.mjs) through a
// built engine, under the one ruleset named on the command line, and reports what happened.
//
//   node scripts/next-controls.mjs --ruleset <ruleset version>
//     [--engine-root <built checkout>] [--engine-commit <sha>] [--out <report.json>] [--require-engine] [--verbose]
//
// --ruleset   One of the rulesets the controls are written for. Every match is created under its
//             tuple. An engine that does not name the ruleset runs nothing: a control is never
//             run under another ruleset than its own.
//
// These are not cases of the specification of 13 October 2026. No engine plays that
// specification, and this command cannot be made to run its cases.
//
// A control that holds the engine to nothing (the rule it concerns is open) is reported as
// "recorded", never as passed.
//
// Exit status: 1 when a control failed; 2 when nothing was run that could count (--require-engine
// without an engine that names the ruleset, a command line that cannot be understood, a stated
// engine commit that contradicts the checkout); otherwise 0.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MODES } from '../../../tests/scenarios/next-version/catalog.mjs';
import { CONTROLS, RULESETS, controlId, controlsOf, runControls, tupleFor } from '../../../tests/scenarios/next-version/controls.mjs';
import { SPEC } from '../../../tests/scenarios/next-version/spec.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { buildPins, noteProvenance } from './pins.mjs';

export const CONTROL_REPORT_SCHEMA = 'mothership.balance.next-controls/1';
export const DRIVER_NAME = 'next-version-controls';

const refuse = message => { console.error(`FAILED: ${message} Nothing was run.`); process.exit(2); };
const { values, flags } = readArgs({ values: ['engine-root', 'engine-commit', 'out', 'ruleset'], flags: ['verbose', 'require-engine'] }, refuse);
if (values.ruleset === null) refuse(`--ruleset is required; the controls are written for ${Object.values(RULESETS).join(', ')}.`);
const version = Object.keys(RULESETS).find(key => RULESETS[key] === values.ruleset);
if (version === undefined) refuse(`--ruleset ${values.ruleset} is not a ruleset the controls are written for (${Object.values(RULESETS).join(', ')}).`);
const engineRoot = values['engine-root'] === null ? null : invocationPath(values['engine-root']);

let engine = null;
let reason = '';
try {
  engine = await import(engineRoot === null ? '@mothership/engine' : pathToFileURL(join(engineRoot, 'packages/engine/dist/index.js')).href);
} catch (error) {
  reason = `engine module could not be loaded (${error.code ?? error.message}); build it first`;
}
const tuple = engine === null ? null : tupleFor(engine, values.ruleset);
if (engine !== null && tuple === null) reason = `the engine at this commit does not name ruleset ${values.ruleset} among the tuples it plays`;
const available = engine !== null && tuple !== null;

const here = dirname(fileURLToPath(import.meta.url));
const sha256 = path => createHash('sha256').update(readFileSync(join(here, '../../..', path))).digest('hex');
const pins = available ? {
  adapter: DRIVER_NAME, engineVersion: tuple.engineVersion, rulesetVersion: tuple.rulesetVersion, rulesetHash: tuple.rulesetHash, protocolVersion: tuple.protocolVersion,
  binaryEngineVersion: engine.FULL_ENGINE_VERSION ?? 'unknown', binaryRulesetVersion: engine.FULL_RULESET_VERSION ?? 'unknown', binaryRulesetHash: engine.FULL_RULESET_HASH ?? 'unknown',
} : null;
const built = buildPins({
  engineRoot, engineCommit: values['engine-commit'], adapter: pins === null ? null : { pins }, runner: '@mothership/balance controls on an existing version',
  extra: {
    suite: DRIVER_NAME, rulesetAskedFor: values.ruleset, controlsOf: version,
    controlsSha256: sha256('tests/scenarios/next-version/controls.mjs'), catalogSha256: sha256('tests/scenarios/next-version/catalog.mjs'),
    specification: { name: SPEC.name, packetSha256: SPEC.packetSha256 },
  },
});
if ('problem' in built) refuse(built.problem);

const runs = [];
for (const mode of MODES) {
  if (available) runs.push(...runControls(engine, version, mode));
  else for (const item of controlsOf(version)) runs.push({ id: controlId(mode, item.code), code: item.code, mode, title: item.title, status: 'not-run', checks: [], records: [], error: null, phasesClosed: 0, commandsSent: 0, reason });
}
const count = list => ({
  total: list.length, passed: list.filter(run => run.status === 'passed').length, failed: list.filter(run => run.status === 'failed').length,
  recorded: list.filter(run => run.status === 'recorded').length, notRun: list.filter(run => run.status === 'not-run').length,
});
const report = {
  schema: CONTROL_REPORT_SCHEMA,
  pins: built.pins,
  ruleset: values.ruleset,
  controlsDefined: CONTROLS.length,
  totals: count(runs),
  byMode: Object.fromEntries(MODES.map(mode => [mode, count(runs.filter(run => run.mode === mode))])),
  runs,
};

console.log(available ? `Engine ${pins.engineVersion}, ruleset ${pins.rulesetVersion}, protocol ${pins.protocolVersion}, built from ${pins.binaryEngineVersion}, commit ${report.pins.engineCommit}`
  : `No control was executed. ${reason}`);
const row = (label, summary) => `${label.padEnd(10)} total ${String(summary.total).padStart(3)}  passed ${String(summary.passed).padStart(3)}  failed ${String(summary.failed).padStart(3)}  recorded ${String(summary.recorded).padStart(3)}  not-run ${String(summary.notRun).padStart(3)}`;
for (const mode of MODES) console.log(row(`${mode} players`, report.byMode[mode]));
console.log(row('all', report.totals));
for (const run of runs) {
  if (run.status === 'failed') {
    console.log(`FAILED  ${run.id}: ${run.title}`);
    if (run.error !== null) console.log(`        stopped: ${run.error}`);
    for (const check of run.checks.filter(item => !item.ok)) console.log(`        ${check.label}: expected ${JSON.stringify(check.expected)}, observed ${JSON.stringify(check.observed)}`);
  }
  if (run.status === 'recorded') console.log(`RECORDED ${run.id}: ${run.records.map(item => `${item.label} -> ${JSON.stringify(item.observed)}`).join('; ')}`);
  if (flags.verbose && run.status === 'passed') console.log(`passed  ${run.id}: ${run.checks.length} checks`);
}
noteProvenance(report.pins);
if (values.out !== null) {
  const target = invocationPath(values.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 1)}\n`);
  console.log(`Report written to ${target}`);
}
if (report.totals.failed > 0) process.exit(1);
if (!available && flags['require-engine']) {
  console.error('FAILED: --require-engine was given and no engine names the ruleset.');
  process.exit(2);
}
