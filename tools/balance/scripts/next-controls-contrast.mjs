// The controls of the controls on the existing versions. A control that says what is particular
// to its own ruleset is run here, on purpose, under the ruleset it is contrasted with, through the
// same built engine. It must fail there. One that passes cannot tell the two versions apart and
// is worth nothing as a statement about either.
//
//   node scripts/next-controls-contrast.mjs --engine-root <built checkout> [--engine-commit <sha>] [--out <report.json>]
//
// The engine has to name both rulesets of a contrast; a pair it does not name is left out and
// counted as not run. The result says nothing about the versions themselves.
//
// It also makes the engine leak, one fact at a time, what three of the controls say is hidden: who
// cast a ballot, and who the partner of a Hack is. Each of those controls must fail on its leak,
// and fail at a comparison of two runs.
//
// Exit status: 1 when a contrast or a leak was not detected; 2 when nothing could be run or the command line
// cannot be understood; otherwise 0.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MODES } from '../../../tests/scenarios/next-version/catalog.mjs';
import { CONTROLS, RULESETS, runContrasts, runLeaks, tupleFor } from '../../../tests/scenarios/next-version/controls.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { buildPins, noteProvenance } from './pins.mjs';

export const CONTRAST_REPORT_SCHEMA = 'mothership.balance.next-controls-contrast/1';

const refuse = message => { console.error(`FAILED: ${message} Nothing was run.`); process.exit(2); };
const { values } = readArgs({ values: ['engine-root', 'engine-commit', 'out'] }, refuse);
const engineRoot = values['engine-root'] === null ? null : invocationPath(values['engine-root']);
let engine;
try {
  engine = await import(engineRoot === null ? '@mothership/engine' : pathToFileURL(join(engineRoot, 'packages/engine/dist/index.js')).href);
} catch (error) {
  refuse(`The engine module could not be loaded (${error.code ?? error.message}); build it first.`);
}
const named = Object.fromEntries(Object.entries(RULESETS).map(([key, ruleset]) => [key, tupleFor(engine, ruleset) !== null]));
const built = buildPins({
  engineRoot, engineCommit: values['engine-commit'], runner: '@mothership/balance contrast of the controls on existing versions',
  adapter: { pins: { adapter: 'next-version-controls', binaryEngineVersion: engine.FULL_ENGINE_VERSION ?? 'unknown', binaryRulesetVersion: engine.FULL_RULESET_VERSION ?? 'unknown', binaryRulesetHash: engine.FULL_RULESET_HASH ?? 'unknown' } },
  extra: { suite: 'next-version-controls-contrast', rulesetsNamed: named },
});
if ('problem' in built) refuse(built.problem);

const runs = MODES.flatMap(mode => runContrasts(engine, mode));
const leaks = MODES.flatMap(mode => runLeaks(engine, mode));
const contrasted = CONTROLS.filter(item => item.contrast !== undefined);
const notRun = contrasted.filter(item => !named[item.contrast]).map(item => item.code);
const report = {
  schema: CONTRAST_REPORT_SCHEMA,
  pins: built.pins,
  controlsWithAContrast: contrasted.length,
  controlsWithout: CONTROLS.filter(item => item.contrast === undefined).map(item => item.code),
  notRun,
  totals: { run: runs.length, detected: runs.filter(run => run.detected).length, undetected: runs.filter(run => !run.detected).length },
  runs,
  leakTotals: { run: leaks.length, detected: leaks.filter(run => run.detected).length, undetected: leaks.filter(run => !run.detected).length },
  leaks,
};
if (runs.length === 0) refuse('The engine names no pair of rulesets that a control contrasts.');
console.log(`Engine built from ${engine.FULL_ENGINE_VERSION}, commit ${report.pins.engineCommit}`);
console.log(`Controls run under the ruleset they are contrasted with: ${report.totals.run}; detected ${report.totals.detected}; not detected ${report.totals.undetected}`);
if (notRun.length > 0) console.log(`Not run, the engine does not name the other ruleset: ${notRun.join(', ')}`);
for (const run of runs.filter(item => !item.detected)) console.log(`NOT DETECTED ${run.id} under ${run.runUnder}`);
console.log(`Deliberate leaks: ${report.leakTotals.run}; detected ${report.leakTotals.detected}; not detected ${report.leakTotals.undetected}`);
for (const run of leaks.filter(item => !item.detected)) console.log(`NOT DETECTED ${run.id}: ${run.leak} (${run.where})`);
noteProvenance(report.pins);
if (values.out !== null) {
  const target = invocationPath(values.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 1)}\n`);
  console.log(`Report written to ${target}`);
}
if (report.totals.undetected > 0 || report.leakTotals.undetected > 0) process.exit(1);
