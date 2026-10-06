// Runs the Version 1 scenario fixtures through an engine adapter and reports what happened.
//
//   node scripts/run-scenarios.mjs                       engine of this checkout
//   node scripts/run-scenarios.mjs --engine-root <dir>   a built checkout of another commit
//     [--engine-commit <sha>] [--out <report.json>] [--only <id-prefix>] [--verbose] [--require-engine]
//
// Nothing is reported as passed unless it was executed. Without an engine every ready
// scenario is "not-run". Blocked scenarios stay blocked whatever an engine does.
//
// Exit status: 1 when an executed scenario failed or a fixture is malformed; 2 when
// --require-engine was given and no engine is available; otherwise 0. Without that switch a run
// that executed nothing exits 0, which is the expected state at a commit without a full-game
// engine and is not a pass. A gate must pass --require-engine.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport, runScenario, validateScenario } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { CATALOG_FILES } from '../../../tests/scenarios/v1/catalog.mjs';
import { GROUPS, V1_OVERLAY_PATH, loadGroup, scenarioFileUrl } from '../../../tests/scenarios/v1/files.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] ?? null; };
const engineRoot = option('--engine-root');
const only = option('--only');
const out = option('--out');
const verbose = args.includes('--verbose');
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const git = (...command) => { try { return execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim(); } catch { return 'unknown'; } };

const loaded = await load(engineRoot ? resolve(engineRoot) : null);
const adapter = loaded.available ? loaded.adapter : null;
const reason = loaded.available ? '' : `engine adapter unavailable: ${loaded.reason}`;

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

const manifest = JSON.parse(readFileSync(join(root, 'rules/source-manifest.json'), 'utf8'));
const overlayRoot = engineRoot ? resolve(engineRoot) : root;
const overlayPath = join(overlayRoot, V1_OVERLAY_PATH);
const report = buildReport(runs, {
  repository: 'Amirkianfar66/GameN',
  baseCommit: '333c9e820f362a211352bc689372663f29b73ac4',
  branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
  workingTreeCommit: `${git('rev-parse', 'HEAD')}${git('status', '--porcelain') === '' ? '' : ' plus uncommitted changes'}`,
  sourceManifestSha256: sha256(join(root, 'rules/source-manifest.json')),
  ruleSourceHashes: Object.fromEntries(manifest.sources.map(source => [source.path, sha256(join(root, source.path))])),
  v1OverlaySha256: existsSync(overlayPath) ? sha256(overlayPath) : null,
  scenarioFileHashes: Object.fromEntries(GROUPS.map(group => [CATALOG_FILES[group], sha256(fileURLToPath(scenarioFileUrl(group)))])),
  rulebookSha256: sha256(join(root, 'docs/balance/game-rules.md')),
  engine: adapter === null ? null : adapter.pins,
  engineCommit: option('--engine-commit') ?? (engineRoot ? 'not stated' : git('rev-parse', 'HEAD')),
  engineOrigin: engineRoot ? 'built checkout outside this worktree (--engine-root)' : '@mothership/engine of this checkout',
  runner: '@mothership/balance scenario runner',
  node: process.version,
  generatedAt: new Date().toISOString(),
});

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
if (out !== null) {
  const target = resolve(process.env.INIT_CWD ?? process.cwd(), out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 1)}\n`);
  console.log(`Report written to ${target}`);
}
if (invalid > 0 || report.totals.failed > 0) process.exit(1);
// Nothing was executed. With --require-engine that is a failure of the gate, with its own exit status.
if (adapter === null && args.includes('--require-engine')) {
  console.error('FAILED: --require-engine was given and no engine is available.');
  process.exit(2);
}
