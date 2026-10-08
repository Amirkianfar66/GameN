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
//   --allow-unpinned-tree accept reports from a tree with uncommitted changes or without Git, and
//                         an engine whose commit was only stated. For trying the gate locally.
//                         Never for a merge gate; without effect beside --candidate-commit.
//
// Exit status: 0 only when nothing is wrong; 1 when anything is, with every problem listed;
// 2 when the gate was not told what to check: an option is missing, unknown, repeated or empty.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE_COMMIT_BASIS, gateProblems } from '@mothership/balance';
import { ADAPTER_NAME } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { EXCEPTIONS_PATH, SOURCE_MANIFEST_SHA256, V1_OVERLAY_SHA256, loadAll, loadExceptions } from '../../../tests/scenarios/v1/files.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { V1_MANIFEST_PATH, root, sourceHashes } from './pins.mjs';
import { ENGINE_PINS, ADDITIONAL_OWNER_OVERLAYS } from '../../../scripts/test-balance-reports.mjs';

const usage = message => {
  console.error(`Balance report gate: NOT CHECKED. ${message}`);
  console.error('Needed: --scenarios <file> --controls <file> --playouts <file> --engine-commit <sha> --playouts-per-mode <n>');
  process.exit(2);
};
const { values, flags } = readArgs({
  values: ['scenarios', 'controls', 'playouts', 'engine-commit', 'playouts-per-mode', 'engine-root', 'candidate-commit'],
  flags: ['allow-unpinned-tree'],
}, usage);
const files = { scenarios: values.scenarios, controls: values.controls, playouts: values.playouts };
for (const [name, file] of Object.entries(files)) if (file === null) usage(`No ${name} report was named.`);
if (values['engine-commit'] === null) usage('No engine commit was named.');
if (values['playouts-per-mode'] === null) usage('The required number of playouts per mode was not given.');

const problems = [];
const explain = error => (error instanceof Error ? error.message : String(error));
const reports = {};
for (const [name, file] of Object.entries(files)) {
  const path = invocationPath(file);
  try {
    reports[name] = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    reports[name] = null;
    problems.push(`${name}: ${path} cannot be read (${explain(error)})`);
  }
}

// What the reports are held against. If any of it cannot be read there is nothing to hold them
// against, and that is a named failure, not a crash.
const need = (what, read) => {
  try {
    return read();
  } catch (error) {
    problems.push(`${what} cannot be read (${explain(error)})`);
    return null;
  }
};
const engineCheckout = values['engine-root'] === null ? root : invocationPath(values['engine-root']);
const catalogue = need('the scenario catalogue', loadAll);
const allowlist = need(`the exception list ${EXCEPTIONS_PATH}`, loadExceptions);
const onDisk = need('the rule sources, the scenario files or the rulebook', () => sourceHashes(engineCheckout));
// The combined manifest belongs to the engine's checkout. It is compared when that checkout is at
// hand; committed reports checked later, without it, must still carry its hash and agree about it.
const manifestAtHand = values['engine-root'] !== null || existsSync(join(engineCheckout, V1_MANIFEST_PATH));
if (catalogue !== null && onDisk !== null) {
  problems.push(...gateProblems(reports, catalogue, allowlist, {
    engineCommit: values['engine-commit'],
    playoutsPerMode: Number(values['playouts-per-mode']),
    candidateCommit: values['candidate-commit'],
    allowUnpinnedTree: flags['allow-unpinned-tree'],
    adapter: ADAPTER_NAME,
    rulesetVersion: ENGINE_PINS.rulesetVersion,
    engineRulesetHash: ENGINE_PINS.rulesetHash,
    additionalOwnerOverlayHashes: ADDITIONAL_OWNER_OVERLAYS,
    overlaySha256: V1_OVERLAY_SHA256,
    sourceManifestSha256: SOURCE_MANIFEST_SHA256,
    v1Manifest: manifestAtHand ? { sha256: onDisk.v1ManifestSha256 } : null,
    scenarioFileHashes: onDisk.scenarioFileHashes,
    ruleSourceHashes: onDisk.ruleSourceHashes,
    rulebookSha256: onDisk.rulebookSha256,
  }));
}

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
const trial = flags['allow-unpinned-tree'] && values['candidate-commit'] === null;
console.log(`Balance report gate: PASSED${trial ? ' AS A TRIAL' : ''}.`);
if (trial) console.log('  With --allow-unpinned-tree the gate accepts uncommitted changes and an engine commit that is only stated. This is not a result for a merge gate.');
else if (values['candidate-commit'] !== null) console.log(`  pinned to the candidate commit ${values['candidate-commit']}: every report came from a clean tree at that commit`);
else console.log('  every report came from one clean commit; no candidate commit was named to compare it with');
console.log(`  engine ${pins.engine.engineVersion}, ruleset ${pins.engine.rulesetVersion}, protocol ${pins.engine.protocolVersion}, commit ${pins.engineCommit}`);
console.log(`  engine commit: ${pins.engineCommitBasis === ENGINE_COMMIT_BASIS.stated ? 'as stated on the command line, not checked against a repository' : `read from Git, ${pins.engineCommitBasis}`}; build digest ${pins.engineBuildSha256.slice(0, 16)}`);
console.log(`  working tree ${pins.workingTreeCommit}`);
console.log(`  scenarios: ${catalogue.length} in the catalogue, each reported once; ${count('ready')} ready and passed; ${count('blocked')} blocked and ${count('manual')} manual, as in ${EXCEPTIONS_PATH}`);
console.log(`  controls: ${controls.join(' + ')} = ${controls.reduce((sum, value) => sum + value, 0)} executed, all detected`);
console.log(`  playouts: ${reports.playouts.seedsPerMode} per mode, all finished, no invariant violation, hint mismatch or replay mismatch`);
console.log(manifestAtHand ? '  combined Version 1 manifest: the same in the reports and beside the engine' : '  combined Version 1 manifest: the reports carry it and agree; the engine checkout is not at hand to compare');
console.log('  A pass says the checks ran completely and found nothing. It says nothing about balance or human play.');
