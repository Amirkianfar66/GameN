// Runs the checks of the four-bed Hospital against a built checkout, separately for 7, 8 and 9
// players, and writes a report that names the commit, whether its tree was clean, and whether its
// engine, contracts and game service are those of the source Backend tested.
//   node tools/balance/scripts/hospital-four.mjs [--engine-root <checkout>] [--out <report.json>] [--require-engine] [--verbose]
// Exit status: 0 when every check passed, 1 when one failed or stopped with an error, 2 when the
// checkout cannot be run and --require-engine was given.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApi } from '../../../tests/scenarios/hospital-four/driver.mjs';
import { MODES, linesFor, runLine } from '../../../tests/scenarios/hospital-four/checks.mjs';
import { CHECK_SOURCES, REPORT_SCHEMA, loadRecord } from '../../../tests/scenarios/hospital-four/files.mjs';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index === -1 ? null : args[index + 1]; };
const repository = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const root = resolve(option('--engine-root') ?? repository);
const out = option('--out');
const verbose = args.includes('--verbose');
const record = loadRecord();
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const git = (...rest) => execFileSync('git', ['-C', root, ...rest], { encoding: 'utf8' }).trim();

const api = await loadApi(root);
if (!api.available) {
  console.error(`No check was run: ${api.reason}.`);
  process.exit(args.includes('--require-engine') ? 2 : 0);
}

let provenance;
try {
  const commit = git('rev-parse', 'HEAD');
  const tested = record.implementation.testedSource;
  provenance = {
    commit, treeClean: git('status', '--porcelain') === '', testedSource: tested,
    sourceTrees: Object.fromEntries(record.implementation.sourceTrees.map(path => {
      const here = git('rev-parse', `${commit}:${path}`), there = git('rev-parse', `${tested}:${path}`);
      return [path, { here, tested: there, same: here === there }];
    })),
  };
} catch (error) {
  provenance = { commit: null, treeClean: null, testedSource: record.implementation.testedSource, sourceTrees: null, gitError: String(error.message ?? error) };
}

const modes = {};
for (const mode of MODES) {
  const lines = linesFor(mode).map(line => runLine(api, line, mode));
  modes[mode] = {
    lines,
    totals: {
      lines: lines.length, passed: lines.filter(line => line.status === 'passed').length,
      failed: lines.filter(line => line.status === 'failed').length, errors: lines.filter(line => line.status === 'error').length,
      claims: lines.reduce((sum, line) => sum + line.claims.length, 0), claimsPassed: lines.reduce((sum, line) => sum + line.claims.filter(item => item.passed).length, 0),
    },
  };
  const totals = modes[mode].totals;
  console.log(`${mode} players: ${totals.lines} lines, ${totals.passed} passed, ${totals.failed} failed, ${totals.errors} errors; ${totals.claimsPassed} of ${totals.claims} claims passed`);
  for (const line of lines) {
    if (verbose || line.status !== 'passed') console.log(`  ${line.line} (${line.kind}): ${line.status}${line.error ? `: ${line.error}` : ''}`);
    for (const claim of line.claims.filter(item => !item.passed)) {
      console.log(`    ${claim.id}: expected ${JSON.stringify(claim.expected)}, actual ${JSON.stringify(claim.actual)}`);
    }
  }
}

const report = {
  schema: REPORT_SCHEMA,
  generatedAt: new Date().toISOString(),
  pins: {
    ...provenance, node: process.version, tuple: api.pins,
    overlaySha256: sha(join(root, record.canonical.overlay.path)),
    checkSources: Object.fromEntries(CHECK_SOURCES.map(path => [path, sha(join(repository, path))])),
    recordSha256: sha(join(repository, 'tests/scenarios/hospital-four/record.json')),
  },
  totals: Object.fromEntries(['lines', 'passed', 'failed', 'errors', 'claims', 'claimsPassed'].map(key => [key, MODES.reduce((sum, mode) => sum + modes[mode].totals[key], 0)])),
  modes,
};
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report written to ${resolve(out)}`);
}
if (provenance.commit === null) console.log(`The checkout's commit could not be read: ${provenance.gitError}`);
else if (!provenance.treeClean) console.log('The checkout has uncommitted changes: this run is not evidence.');
else if (!Object.values(provenance.sourceTrees).every(tree => tree.same)) console.log(`The engine, contracts or service differ from the tested source ${provenance.testedSource}.`);
process.exit(report.totals.passed === report.totals.lines ? 0 : 1);
