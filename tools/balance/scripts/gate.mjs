// The report gate: decides whether three reports are a complete and clean run of the Balance checks.
//
//   node scripts/gate.mjs --scenarios <report.json> --controls <report.json> --playouts <report.json>
//     --engine-commit <sha> --playouts-per-mode <n>
//     [--engine-root <dir>] [--candidate-commit <sha>] [--allow-unpinned-tree]
//
// The three commands that write those reports each exit 0 when they found nothing wrong in what
// they did. That is not enough for a merge gate: a run can be clean and still be about another
// engine, an older fixture file or half the catalogue. The gate holds the reports against the
// catalogue, the reviewed exception list (tests/scenarios/v1/exceptions.json), the files on disk
// and each other. It executes nothing and reads no engine.
//
//   --engine-commit       the exact commit of the engine under test; every report must name it
//   --playouts-per-mode   the exact number of playouts each mode must have run and finished
//   --engine-root         the built checkout the engine came from, when it is not this one; its
//                         combined Version 1 manifest is compared with the reports
//   --candidate-commit    every report must come from a clean working tree at exactly this commit
//   --allow-unpinned-tree accept reports from a tree with uncommitted changes or without Git.
//                         For trying the gate locally. Never for a merge gate.
//
// Exit status: 0 only when nothing is wrong; 1 when anything is, with every problem listed;
// 2 when the gate was not told what to check.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gateProblems } from '@mothership/balance';
import { EXCEPTIONS_PATH, SOURCE_MANIFEST_SHA256, V1_OVERLAY_SHA256, V1_RULESET_VERSION, loadAll, loadExceptions } from '../../../tests/scenarios/v1/files.mjs';
import { V1_MANIFEST_PATH, reportPath, root, sourceHashes } from './pins.mjs';

const args = process.argv.slice(2);
const usage = message => {
  console.error(`Balance report gate: NOT CHECKED. ${message}`);
  console.error('Needed: --scenarios <file> --controls <file> --playouts <file> --engine-commit <sha> --playouts-per-mode <n>');
  process.exit(2);
};
// An option that is named must have a value. An empty shell variable must not turn a check off.
const option = name => {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (value === undefined || value === '' || value.startsWith('--')) usage(`${name} was given without a value.`);
  return value;
};
const files = { scenarios: option('--scenarios'), controls: option('--controls'), playouts: option('--playouts') };
for (const [name, file] of Object.entries(files)) if (file === null) usage(`No ${name} report was named.`);
const engineCommit = option('--engine-commit');
if (engineCommit === null) usage('No engine commit was named.');
if (option('--playouts-per-mode') === null) usage('The required number of playouts per mode was not given.');
const engineRoot = option('--engine-root');

const problems = [];
const reports = {};
for (const [name, file] of Object.entries(files)) {
  const path = reportPath(file);
  try {
    reports[name] = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    reports[name] = null;
    problems.push(`${name}: ${path} cannot be read (${error instanceof Error ? error.message : String(error)})`);
  }
}

const engineCheckout = engineRoot === null ? root : resolve(engineRoot);
const onDisk = sourceHashes(engineCheckout);
// The combined manifest belongs to the engine's checkout. It is compared when that checkout is at
// hand; committed reports checked later, without it, only have to agree with each other.
const manifestAtHand = engineRoot !== null || existsSync(join(engineCheckout, V1_MANIFEST_PATH));
const catalogue = loadAll();
problems.push(...gateProblems(reports, catalogue, loadExceptions(), {
  engineCommit,
  playoutsPerMode: Number(option('--playouts-per-mode')),
  candidateCommit: option('--candidate-commit'),
  allowUnpinnedTree: args.includes('--allow-unpinned-tree'),
  rulesetVersion: V1_RULESET_VERSION,
  overlaySha256: V1_OVERLAY_SHA256,
  sourceManifestSha256: SOURCE_MANIFEST_SHA256,
  v1Manifest: manifestAtHand ? { sha256: onDisk.v1ManifestSha256 } : null,
  scenarioFileHashes: onDisk.scenarioFileHashes,
  ruleSourceHashes: onDisk.ruleSourceHashes,
  rulebookSha256: onDisk.rulebookSha256,
}));

if (problems.length > 0) {
  console.error(`Balance report gate: FAILED, ${problems.length} problem${problems.length === 1 ? '' : 's'}.`);
  for (const problem of problems.slice(0, 60)) console.error(`  ${problem}`);
  if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`);
  process.exit(1);
}

// Everything below is read from reports that have just been held against the catalogue.
const count = status => catalogue.filter(scenario => scenario.status === status).length;
const pins = reports.scenarios.pins;
const controls = [7, 8, 9].map(mode => reports.controls.modes[mode].controls);
console.log('Balance report gate: PASSED.');
console.log(`  engine ${pins.engine.engineVersion}, ruleset ${pins.engine.rulesetVersion}, protocol ${pins.engine.protocolVersion}, commit ${pins.engineCommit}`);
console.log(`  working tree ${pins.workingTreeCommit}`);
console.log(`  scenarios: ${catalogue.length} in the catalogue, each reported once; ${count('ready')} ready and passed; ${count('blocked')} blocked and ${count('manual')} manual, as in ${EXCEPTIONS_PATH}`);
console.log(`  controls: ${controls.join(' + ')} = ${controls.reduce((sum, value) => sum + value, 0)} executed, all detected`);
console.log(`  playouts: ${reports.playouts.seedsPerMode} per mode, all finished, no invariant violation, hint mismatch or replay mismatch`);
console.log(manifestAtHand ? '  combined Version 1 manifest: the same in the reports and beside the engine' : '  combined Version 1 manifest: the reports agree; the engine checkout is not at hand to compare');
console.log('  A pass says the checks ran completely and found nothing. It says nothing about balance or human play.');
