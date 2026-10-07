// Required Balance verification. Evidence is fresh, local, and bound to a clean source commit.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ENGINE_PINS, assertCompleteStaticSuite, assertControlReport, assertScenarioReport, assertWalkReport, loadBalanceContract, requireBalance } from './test-balance-reports.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const STATIC_FILES = ['commands.test.mjs', 'rulebook.test.mjs', 'scenarios.test.mjs', 'sources.test.mjs', 'tooling.test.mjs'];
export function balanceStaticInputs(root = repositoryRoot) {
  const directory = join(root, 'tests/scenarios');
  requireBalance(existsSync(directory), 'required static suite missing');
  const files = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.name.endsWith('.test.mjs'));
  for (const filename of STATIC_FILES) requireBalance(files.some(entry => entry.name === filename && entry.isFile()), 'required static suite file missing');
  requireBalance(files.every(entry => entry.isFile()), 'static suite contains a symlink or non-file');
  const workspace = join(root, 'tools/balance');
  for (const file of ['package.json', 'scripts/materialize.mjs', 'scripts/traceability.mjs']) requireBalance(existsSync(join(workspace, file)), 'required static workspace/checker missing');
  return { workspace, files: files.map(entry => join(directory, entry.name)).sort() };
}
export function readBalanceProvenance(root = repositoryRoot, readGit) {
  const git = readGit ?? ((...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
  requireBalance(git('status', '--porcelain') === '', 'engine verification requires a clean committed checkout');
  const head = git('rev-parse', 'HEAD');
  requireBalance(/^[0-9a-f]{40}$/.test(head), 'actual Git HEAD unavailable');
  requireBalance(process.version === 'v22.21.1', 'pinned Node version required');
  return { head, branch: git('rev-parse', '--abbrev-ref', 'HEAD'), node: process.version };
}
export function balanceEngineCommands(root, head, directory) {
  requireBalance(/^[0-9a-f]{40}$/.test(head), 'engine commands require actual full Git HEAD');
  return [
    ['scenarios', 'run-scenarios.mjs', assertScenarioReport],
    ['controls', 'controls.mjs', assertControlReport],
    ['playouts', 'walk.mjs', assertWalkReport],
  ].map(([name, script, check]) => {
    const reportPath = join(directory, `${name}.json`);
    return { name, reportPath, check, args: [join(root, 'tools/balance/scripts', script), '--require-engine', '--engine-commit', head,
      ...(name === 'playouts' ? ['--seeds', '10'] : []), '--out', reportPath] };
  });
}
/** Check the same fresh reports against common build/manifest/Git provenance after root pins. */
export function balanceReportGateCommand(root, head, directory) {
  requireBalance(/^[0-9a-f]{40}$/.test(head), 'report gate requires actual full Git HEAD');
  return [join(root, 'tools/balance/scripts/gate.mjs'),
    '--scenarios', join(directory, 'scenarios.json'), '--controls', join(directory, 'controls.json'),
    '--playouts', join(directory, 'playouts.json'), '--engine-commit', head, '--candidate-commit', head,
    '--playouts-per-mode', '10'];
}
export function assertBalanceEngine(engine) {
  requireBalance(engine?.FULL_ENGINE_VERSION === ENGINE_PINS.engineVersion && engine?.FULL_RULESET_VERSION === ENGINE_PINS.rulesetVersion
    && engine?.FULL_RULESET_HASH === ENGINE_PINS.rulesetHash, 'built engine does not match the reviewed V1 engine/ruleset');
  requireBalance(typeof engine.projectOwnAcknowledgments === 'function', 'real projectOwnAcknowledgments export unavailable');
}
export function runBalanceProcess(command, args, cwd, logPath, spawn = spawnSync) {
  const environment = { ...process.env };
  delete environment.NODE_TEST_CONTEXT;
  const result = spawn(command, args, { cwd, env: environment, encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
  writeFileSync(logPath, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  requireBalance(!result.error && result.signal == null && result.status === 0, `command failed or unavailable; inspect ${logPath}`);
  return result.stdout ?? '';
}
export function readBalanceReport(path) {
  requireBalance(existsSync(path), 'required fresh engine report missing');
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { throw new Error('Balance gate: required engine report is unreadable or invalid JSON'); }
}
export function runBalanceStatic(root = repositoryRoot) {
  balanceStaticInputs(root);
  requireBalance(process.version === 'v22.21.1', 'pinned Node version required');
  const directory = mkdtempSync(join(tmpdir(), 'mothership-balance-static-'));
  // The role-owned workspace check builds Balance, verifies materialization and traceability,
  // then executes every static suite. Capture its TAP summary so skips cannot become green.
  const output = runBalanceProcess(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'check', '--workspace', '@mothership/balance'], root, join(directory, 'static.log'));
  const count = assertCompleteStaticSuite(output);
  console.log(`Balance static: ${count} executed, ${count} passed, zero failed/cancelled/skipped/todo; materialization and traceability checked`);
  console.log(`Balance static log: ${directory}`);
  return { tests: count, directory };
}
export async function runBalanceEngineEvidence(root = repositoryRoot) {
  const provenance = readBalanceProvenance(root);
  const contract = loadBalanceContract(root, provenance);
  const built = join(root, 'packages/engine/dist/index.js');
  requireBalance(existsSync(built), 'built engine unavailable; run the root build');
  let engine;
  try { engine = await import(pathToFileURL(built).href); }
  catch { throw new Error('Balance gate: built engine unavailable; run the root build'); }
  assertBalanceEngine(engine);
  const directory = mkdtempSync(join(tmpdir(), 'mothership-balance-engine-'));
  const startedAt = Date.now();
  const results = {};
  for (const command of balanceEngineCommands(root, provenance.head, directory)) {
    requireBalance(existsSync(command.args[0]), 'required engine CLI missing');
    requireBalance(!existsSync(command.reportPath), 'engine output must be fresh');
    runBalanceProcess(process.execPath, command.args, root, join(directory, `${command.name}.log`));
    const report = readBalanceReport(command.reportPath);
    results[command.name] = command.check(report, contract, { startedAt, finishedAt: Date.now() });
    const after = readBalanceProvenance(root);
    requireBalance(after.head === provenance.head && after.branch === provenance.branch, 'checkout changed during engine verification');
    console.log(command.name === 'scenarios' ? 'Balance scenarios: 522 catalogue IDs; 483 passed, 33 reviewed blocked, 6 explicit manual; zero errors'
      : command.name === 'controls' ? 'Balance controls: 475 baselines passed; 4388 controls executed and detected; zero misses'
        : 'Balance playouts: 10 completed in each of modes 7/8/9; zero unfinished/invariant/hint/replay mismatches');
  }
  runBalanceProcess(process.execPath, balanceReportGateCommand(root, provenance.head, directory), root, join(directory, 'report-gate.log'));
  const final = readBalanceProvenance(root);
  requireBalance(final.head === provenance.head && final.branch === provenance.branch, 'checkout changed during report gate');
  console.log('Balance report gate: common build/manifest/Git provenance checked at this clean candidate');
  console.log(`Balance engine source: ${provenance.head}; protocol 2; Original Powers off`);
  console.log(`Balance fresh reports/logs: ${directory}`);
  return { provenance, results, directory };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const mode = process.argv[2];
    requireBalance(process.argv.length === 3 && (mode === 'static' || mode === 'engine'), 'usage: node scripts/test-balance.mjs static|engine');
    if (mode === 'static') runBalanceStatic();
    else await runBalanceEngineEvidence();
  } catch (error) {
    console.error(error instanceof Error && error.message.startsWith('Balance gate:') ? error.message : 'Balance gate: verification failed');
    process.exitCode = 1;
  }
}
