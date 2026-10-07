// The engine-backed Balance checks as one command for a merge gate.
//
//   node scripts/engine-gate.mjs [--out-dir <dir>] [--playouts-per-mode 10]
//     [--engine-root <dir> [--engine-commit <sha>]] [--allow-unpinned-tree]
//
// Runs the scenarios, the negative controls and the seeded playouts with --require-engine against
// the engine of this checkout at its current commit, and then lets gate.mjs decide. Nothing is
// skipped when an earlier step fails: every report that can be written is written, and the gate
// names everything that is wrong. Reports of an earlier run in the same directory are removed first.
//
// The checkout must be a clean commit, because the reports are evidence about a commit and not
// about a working tree. Reports go to --out-dir, or to a new temporary directory. Keep them
// outside the checkout: a report file inside it is itself an uncommitted change, and the next
// report then records one.
//
//   --engine-root, --engine-commit   an engine built in another checkout. Its commit is read from
//                                    that checkout, which must be clean; a commit stated as well
//                                    must be the same. A directory that is not a Git checkout, such
//                                    as an exported archive, can only be used for a trial
//   --allow-unpinned-tree            run on uncommitted work, or on an engine whose commit can only
//                                    be stated. For trying it locally; never for a merge gate
//
// Exit status: 0 only when the gate passed; 1 when any step did not; 2 when nothing was run
// because the command line cannot be understood or a commit cannot be pinned.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_COMMIT_BASIS } from '@mothership/balance';
import { invocationPath, readArgs } from './args.mjs';
import { engineProvenance, root, treeState } from './pins.mjs';

const notRun = message => { console.error(`Balance engine gate: NOT RUN. ${message}`); process.exit(2); };
const { values, flags } = readArgs({ values: ['out-dir', 'playouts-per-mode', 'engine-root', 'engine-commit'], flags: ['allow-unpinned-tree'] }, notRun);

const trial = flags['allow-unpinned-tree'];
const tree = treeState(root);
if (!trial && tree.commit === null) notRun('This directory has no Git commit to pin the reports to.');
if (!trial && !tree.clean) notRun('This checkout has uncommitted changes. Commit them, or pass --allow-unpinned-tree to try the checks without a result that counts.');
const engineRoot = values['engine-root'] === null ? null : invocationPath(values['engine-root']);
const engine = engineProvenance(engineRoot, values['engine-commit'], tree);
if ('problem' in engine) notRun(engine.problem);
if (!/^[0-9a-f]{40}$/.test(engine.commit)) notRun('The commit of the engine is not known: the directory at --engine-root is not a Git checkout, so pass --engine-commit with it.');
if (!trial && engine.basis === ENGINE_COMMIT_BASIS.stated) notRun('The directory at --engine-root is not a Git checkout, so the commit of its engine can only be stated, not checked. Use a checkout of that commit, or pass --allow-unpinned-tree for a trial.');
if (!trial && engine.clean !== true) notRun('The checkout at --engine-root has uncommitted changes.');
const playouts = values['playouts-per-mode'] ?? '10';
const outDir = values['out-dir'] === null ? mkdtempSync(join(tmpdir(), 'mothership-balance-reports-')) : invocationPath(values['out-dir']);
mkdirSync(outDir, { recursive: true });

const report = name => join(outDir, `${name}.json`);
// A report left by an earlier run must not be read as this run's.
for (const name of ['scenarios', 'controls', 'playouts']) rmSync(report(name), { force: true });
const engineArgs = ['--require-engine', '--engine-root', engineRoot ?? root, '--engine-commit', engine.commit];
const steps = [
  ['scenarios', 'run-scenarios.mjs', [...engineArgs, '--out', report('scenarios')]],
  ['controls', 'controls.mjs', [...engineArgs, '--out', report('controls')]],
  ['playouts', 'walk.mjs', [...engineArgs, '--seeds', playouts, '--out', report('playouts')]],
  ['gate', 'gate.mjs', [
    '--scenarios', report('scenarios'), '--controls', report('controls'), '--playouts', report('playouts'),
    '--engine-root', engineRoot ?? root, '--engine-commit', engine.commit, '--playouts-per-mode', playouts,
    ...(trial ? ['--allow-unpinned-tree'] : ['--candidate-commit', tree.commit]),
  ]],
];
const here = dirname(fileURLToPath(import.meta.url));
const statuses = [];
for (const [name, script, scriptArgs] of steps) {
  console.log(`\n== ${name} ==`);
  const result = spawnSync(process.execPath, [join(here, script), ...scriptArgs], { stdio: 'inherit' });
  statuses.push([name, result.status ?? `signal ${result.signal}`]);
}
const passed = statuses.every(([, status]) => status === 0);
console.log(`\nBalance engine gate: ${passed ? (trial ? 'PASSED AS A TRIAL' : 'PASSED') : 'FAILED'}. Exit status of ${statuses.map(([name, status]) => `${name} ${status}`).join(', ')}.`);
console.log(`Reports: ${outDir}`);
if (trial) console.log('Run with --allow-unpinned-tree: this is a trial, not a result for a merge gate.');
process.exit(passed ? 0 : 1);
