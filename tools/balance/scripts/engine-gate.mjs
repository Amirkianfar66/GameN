// The engine-backed Balance checks as one command for a merge gate.
//
//   node scripts/engine-gate.mjs [--out-dir <dir>] [--playouts-per-mode 10]
//     [--engine-root <dir> --engine-commit <sha>] [--allow-unpinned-tree]
//
// Runs the scenarios, the negative controls and the seeded playouts with --require-engine against
// the engine of this checkout at its current commit, and then lets gate.mjs decide. Nothing is
// skipped when an earlier step fails: every report that can be written is written, and the gate
// names everything that is wrong.
//
// The checkout must be a clean commit, because the reports are evidence about a commit and not
// about a working tree. Reports go to --out-dir, or to a new temporary directory. Keep them
// outside the checkout: a report file inside it is itself an uncommitted change, and the next
// report then records one.
//
//   --engine-root, --engine-commit   an engine built in another checkout, and its exact commit
//   --allow-unpinned-tree            run on uncommitted work. For trying it locally; never for a merge gate.
//
// Exit status: 0 only when the gate passed; 1 when any step did not; 2 when nothing was run
// because the checkout is not a clean commit or the engine's commit is not known.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, reportPath, root } from './pins.mjs';

const args = process.argv.slice(2);
const notRun = message => { console.error(`Balance engine gate: NOT RUN. ${message}`); process.exit(2); };
// An option that is named must have a value. An empty shell variable must not change what is run.
const option = name => {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (value === undefined || value === '' || value.startsWith('--')) notRun(`${name} was given without a value.`);
  return value;
};

const allowUnpinned = args.includes('--allow-unpinned-tree');
const head = git('rev-parse', 'HEAD');
const clean = head !== null && git('status', '--porcelain') === '';
if (!clean && !allowUnpinned) notRun(head === null ? 'This directory has no Git commit to pin the reports to.' : 'This checkout has uncommitted changes. Commit them, or pass --allow-unpinned-tree to try the checks without a result that counts.');
const engineRoot = option('--engine-root') === null ? root : reportPath(option('--engine-root'));
const engineCommit = option('--engine-commit') ?? (engineRoot === root ? head : null);
if (engineCommit === null) notRun('The commit of the engine is not known: pass --engine-commit with --engine-root.');
const playouts = option('--playouts-per-mode') ?? '10';
const outDir = option('--out-dir') === null ? mkdtempSync(join(tmpdir(), 'mothership-balance-reports-')) : reportPath(option('--out-dir'));
mkdirSync(outDir, { recursive: true });

const report = name => join(outDir, `${name}.json`);
const engine = ['--require-engine', '--engine-root', engineRoot, '--engine-commit', engineCommit];
const steps = [
  ['scenarios', 'run-scenarios.mjs', [...engine, '--out', report('scenarios')]],
  ['controls', 'controls.mjs', [...engine, '--out', report('controls')]],
  ['playouts', 'walk.mjs', [...engine, '--seeds', playouts, '--out', report('playouts')]],
  ['gate', 'gate.mjs', [
    '--scenarios', report('scenarios'), '--controls', report('controls'), '--playouts', report('playouts'),
    '--engine-root', engineRoot, '--engine-commit', engineCommit, '--playouts-per-mode', playouts,
    ...(allowUnpinned ? ['--allow-unpinned-tree'] : ['--candidate-commit', head]),
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
console.log(`\nBalance engine gate: ${passed ? 'PASSED' : 'FAILED'}. Exit status of ${statuses.map(([name, status]) => `${name} ${status}`).join(', ')}.`);
console.log(`Reports: ${outDir}`);
if (allowUnpinned) console.log('Run with --allow-unpinned-tree: this is a trial, not a result for a merge gate.');
process.exit(passed ? 0 : 1);
