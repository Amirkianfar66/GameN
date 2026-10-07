// Integration-owned acceptance checks for the reviewed Version 1 Balance catalogue.
// Updating these pins/counts requires review of the changed catalogue and its open decisions.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const BALANCE_GROUPS = ['mode-7', 'mode-8', 'mode-9', 'unsupported'];
export const BALANCE_TOTALS = { total: 522, passed: 483, failed: 0, blocked: 33, notRun: 6 };
export const CONTROL_COUNTS = { 7: { scenarios: 152, controls: 1384 }, 8: { scenarios: 158, controls: 1385 }, 9: { scenarios: 165, controls: 1619 } };
export const PLAYOUTS_PER_MODE = 10;
const GROUP_TOTALS = {
  'mode-7': { total: 165, passed: 152, failed: 0, blocked: 11, notRun: 2 },
  'mode-8': { total: 171, passed: 158, failed: 0, blocked: 11, notRun: 2 },
  'mode-9': { total: 178, passed: 165, failed: 0, blocked: 11, notRun: 2 },
  unsupported: { total: 8, passed: 8, failed: 0, blocked: 0, notRun: 0 },
};
const FILE_HASHES = {
  'mode-7.scenarios.json': '93ce71e36d0763a93cc5204dca3909effb83e0f2876c709f04b9f1f75976fb6f',
  'mode-8.scenarios.json': 'edf2c6a972cf2b4e970b3b154408edc7bb1df22f3e1453a1abb4c199cdec57bd',
  'mode-9.scenarios.json': 'd7d8c7dde2141fece99353c63c1fd7d683e8756eeac9577207f755eacdd7d310',
  'unsupported.scenarios.json': 'f4c4a7c044c4596f4be251c0338aff23daa4f749dff90bb267022d83b706ee9c',
};
const OVERLAY_PATH = 'rules/overlays/in-person-v1-owner-decisions-2026-10-06.json';
const OVERLAY_HASH = '6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90';
const RULEBOOK_HASH = '76f593c91108b1dc7dcf898f1772f0cf1e9d27a06ba4a417b66ba17e1528991f';
const CATALOGUE_HASH = 'd4e59c2d76662c7990769bab431f5529aebd7dd4acfc3866267d82a292b1d07b';
const ADAPTER_HASH = '381d6cfcd3f57cc94a300887740da8ed1df15142522bb98fa4e0fc76ef8d8376';
const EXCEPTIONS_HASH = '8687477328a57b37ade88e6cf35c010f9599e695c8f11846bf17dea10cf96148';
const V1_MANIFEST_HASH = '451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2';
const SOURCE_MANIFEST_HASH = '34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc';
export const ENGINE_PINS = { adapter: 'full-game-v1', engineVersion: 'full-game-1.0.1', rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: OVERLAY_HASH, protocolVersion: 2 };
const BLOCKED = {
  'FLOW-07': ['D17'], 'FLOW-08': ['D20'], 'FLOW-09': ['D19'], 'MOVE-05': ['D16'],
  'SUP-08': ['D11'], 'SUP-09': ['D12', 'D11'], 'HACK-06': ['D18'], 'FLOW-10': ['D17'],
  'SHOW-15': ['D34'], 'OPS-03': ['D35'], 'POW-01': ['D10'],
};
const MANUAL = ['HACK-07', 'OPS-02'];
const MANUAL_REASON = 'manual: needs human or user-interface evidence, not an engine run';
const BLOCKED_REASON = 'awaiting an owner decision; no probe is defined';

// Do not include report values in failures: reports can contain private engine observations.
export function requireBalance(condition, label) { if (!condition) throw new Error(`Balance gate: ${label}`); }
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
function same(actual, expected, label) { requireBalance(canonical(actual) === canonical(expected), label); }
function integer(value, label) { requireBalance(Number.isSafeInteger(value) && value >= 0, label); }
function empty(value, label) { requireBalance(Array.isArray(value) && value.length === 0, label); }
function keys(value, expected, label) { requireBalance(value !== null && typeof value === 'object' && !Array.isArray(value), label); same(Object.keys(value).sort(), [...expected].sort(), label); }
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');

export function loadBalanceContract(root, provenance) {
  requireBalance(/^[0-9a-f]{40}$/.test(provenance.head), 'actual engine source commit must be a full Git SHA');
  requireBalance(typeof provenance.branch === 'string' && provenance.branch.length > 0, 'actual checkout branch missing');
  requireBalance(provenance.node === 'v22.21.1', 'pinned Node version required');
  same(hash(join(root, 'rules/source-manifest.json')), SOURCE_MANIFEST_HASH, 'historical source manifest changed');
  same(hash(join(root, OVERLAY_PATH)), OVERLAY_HASH, 'approved V1 overlay changed');
  const manifest = JSON.parse(readFileSync(join(root, 'rules/source-manifest.json'), 'utf8'));
  same(hash(join(root, 'docs/balance/game-rules.md')), RULEBOOK_HASH, 'reviewed rulebook changed');
  same(hash(join(root, 'tests/scenarios/v1/catalog.mjs')), CATALOGUE_HASH, 'reviewed catalogue authoring source changed');
  same(hash(join(root, 'tests/scenarios/v1/exceptions.json')), EXCEPTIONS_HASH, 'reviewed exceptions changed');
  same(hash(join(root, 'tests/scenarios/adapters/full-game-v1.mjs')), ADAPTER_HASH, 'reviewed real acknowledgment adapter changed');
  same(hash(join(root, 'rules/in-person-v1-manifest.json')), V1_MANIFEST_HASH, 'combined V1 source manifest changed');
  const ruleSourceHashes = Object.fromEntries(manifest.sources.map(source => {
    const digest = hash(join(root, source.path));
    same(digest, source.sha256, 'historical source differs from its recorded digest');
    return [source.path, digest];
  }));
  const scenarios = new Map();
  for (const [filename, digest] of Object.entries(FILE_HASHES)) {
    const path = join(root, 'tests/scenarios/v1', filename);
    same(hash(path), digest, `reviewed catalogue changed: ${filename}`);
    const file = JSON.parse(readFileSync(path, 'utf8'));
    const group = file.group === 'unsupported' ? 'unsupported' : `mode-${file.mode}`;
    requireBalance(BALANCE_GROUPS.includes(group) && file.optionalPowers === false, 'catalogue group or Original Powers policy changed');
    for (const scenario of file.scenarios) {
      requireBalance(!scenarios.has(scenario.id), 'duplicate catalogue ID');
      const status = { ready: 'passed', blocked: 'blocked', manual: 'not-run' }[scenario.status];
      requireBalance(status !== undefined, 'unapproved catalogue status');
      const setup = scenario.setup === null ? null : file.setups[scenario.setup];
      requireBalance(scenario.setup === null || setup !== undefined, 'missing catalogue setup');
      const suffix = scenario.id.replace(/^V1-M[789]-/, '');
      if (status === 'blocked') same(scenario.decisionIds, BLOCKED[suffix], 'blocked decision allowlist changed');
      if (status === 'not-run') requireBalance(MANUAL.includes(suffix) && scenario.decisionIds.length === 0, 'manual allowlist changed');
      scenarios.set(scenario.id, { group, mode: file.mode, status, decisionIds: scenario.decisionIds, seed: setup?.seed ?? null,
        reason: status === 'not-run' ? MANUAL_REASON : status === 'blocked' && setup === null ? BLOCKED_REASON : null,
        probeLabels: setup === null ? [] : scenario.steps.filter(step => step.op === 'probe' || step.op === 'note').map(step => step.label) });
    }
  }
  same(scenarios.size, BALANCE_TOTALS.total, 'reviewed catalogue count changed');
  return { ...provenance, scenarios, engine: ENGINE_PINS, sourceManifestSha256: SOURCE_MANIFEST_HASH,
    ruleSourceHashes,
    v1OverlaySha256: OVERLAY_HASH, scenarioFileHashes: FILE_HASHES, rulebookSha256: RULEBOOK_HASH };
}
function engine(report, contract) {
  requireBalance(report !== null && typeof report === 'object', 'required report unavailable');
  same(report.engine, contract.engine, 'engine adapter/version/ruleset/protocol unavailable or mismatched');
  same(report.engineCommit, contract.head, 'engine commit does not identify this checkout');
  same(report.node, contract.node, 'report Node provenance mismatch');
}
function summary(runs) {
  const count = status => runs.filter(run => run.status === status).length;
  return { total: runs.length, passed: count('passed'), failed: count('failed'), blocked: count('blocked'), notRun: count('not-run') };
}
export function assertScenarioReport(report, contract, window) {
  same(report?.schema, 'mothership.balance.scenario-run/1', 'scenario report missing or incompatible');
  engine(report.pins, contract);
  const pins = report.pins;
  for (const [field, expected] of Object.entries({ repository: 'Amirkianfar66/GameN', baseCommit: '333c9e820f362a211352bc689372663f29b73ac4',
    branch: contract.branch, workingTreeCommit: contract.head, sourceManifestSha256: contract.sourceManifestSha256,
    ruleSourceHashes: contract.ruleSourceHashes, v1OverlaySha256: contract.v1OverlaySha256, scenarioFileHashes: contract.scenarioFileHashes,
    rulebookSha256: contract.rulebookSha256, engineOrigin: '@mothership/engine of this checkout', runner: '@mothership/balance scenario runner' })) {
    same(pins[field], expected, `scenario provenance mismatch: ${field}`);
  }
  const generatedAt = typeof pins.generatedAt === 'string' ? Date.parse(pins.generatedAt) : NaN;
  requireBalance(Number.isFinite(generatedAt) && Number.isFinite(window?.startedAt) && Number.isFinite(window?.finishedAt)
    && generatedAt >= window.startedAt && generatedAt <= window.finishedAt, 'scenario report generation time outside this invocation');
  requireBalance(Array.isArray(report.runs) && report.runs.length === contract.scenarios.size, 'scenario run catalogue incomplete');
  const seen = new Set();
  let transitions = 0;
  let commands = 0;
  for (const run of report.runs) {
    requireBalance(run !== null && typeof run === 'object', 'malformed scenario run');
    const expected = contract.scenarios.get(run.scenarioId);
    requireBalance(expected !== undefined && !seen.has(run.scenarioId), 'unknown or duplicate scenario ID');
    seen.add(run.scenarioId);
    for (const field of ['group', 'mode', 'status', 'decisionIds', 'seed', 'reason']) same(run[field], expected[field], `scenario ${field} mismatch`);
    same(run.failure, null, 'scenario or blocked probe reported an error');
    empty(run.invariantViolations, 'scenario invariant violations or missing invariant evidence');
    integer(run.transitions, 'scenario transition count invalid');
    integer(run.commands, 'scenario command count invalid');
    if (expected.seed === null) requireBalance(run.transitions === 0 && run.commands === 0, 'manual or unprobed blocked case has unexpected execution');
    transitions += run.transitions;
    commands += run.commands;
    requireBalance(Array.isArray(run.probes), 'scenario probe evidence missing');
    same(run.probes.map(probe => probe?.label), expected.probeLabels, 'scenario probe evidence incomplete');
    requireBalance(run.probes.every(probe => typeof probe.outcome === 'string' && probe.outcome.length > 0), 'scenario probe outcome missing');
    // Setup checks and rejected configurations legitimately make no transitions. The report
    // deliberately omits finalDigest; replay failures are represented by status/failure.
  }
  requireBalance(transitions > 0 && commands > 0, 'scenario report executed no transitions or commands');
  same(summary(report.runs), BALANCE_TOTALS, 'scenario status totals do not satisfy the reviewed catalogue');
  same(report.totals, BALANCE_TOTALS, 'scenario aggregate totals mismatch');
  keys(report.byGroup, BALANCE_GROUPS, 'scenario mode coverage incomplete');
  for (const group of BALANCE_GROUPS) {
    const runs = report.runs.filter(run => run.group === group);
    same(summary(runs), GROUP_TOTALS[group], 'scenario group status counts mismatch');
    if (group !== 'unsupported') requireBalance(runs.reduce((total, run) => total + run.transitions, 0) > 0
      && runs.reduce((total, run) => total + run.commands, 0) > 0, 'scenario mode executed no transitions or commands');
    same(report.byGroup[group], GROUP_TOTALS[group], 'scenario group aggregate mismatch');
  }
  return { ...BALANCE_TOTALS, transitions, commands };
}
export function assertControlReport(report, contract) {
  same(report?.schema, 'mothership.balance.controls/1', 'control report missing or incompatible');
  engine(report, contract);
  same(report.verdict, 'passed', 'controls unavailable or failing');
  empty(report.undetected, 'undetected controls or missing control evidence');
  empty(report.baselineFailures, 'failing baselines or missing baseline evidence');
  keys(report.modes, ['7', '8', '9'], 'control mode coverage incomplete');
  for (const mode of ['7', '8', '9']) {
    const expected = CONTROL_COUNTS[mode];
    same(report.modes[mode], { ...expected, detected: expected.controls, undetected: 0, baselineNotPassing: 0 }, 'control execution/counts mismatch');
  }
  return { baselines: 475, controls: 4388, detected: 4388 };
}
export function assertWalkReport(report, contract) {
  same(report?.schema, 'mothership.balance.walk/1', 'playout report missing or incompatible');
  engine(report, contract);
  same(report.seedsPerMode, PLAYOUTS_PER_MODE, 'playout seed count mismatch');
  same(report.seedLabels, 'walk-1 .. walk-10', 'playout seed labels mismatch');
  same(report.policy, { activity: 0.6, noise: 0.25, coordination: 0.5, maxPhases: 400,
    description: 'uniform random choice among offered commands, plus arbitrary commands' }, 'reviewed playout policy mismatch');
  keys(report.modes, ['7', '8', '9'], 'playout mode coverage incomplete');
  for (const mode of ['7', '8', '9']) {
    const stats = report.modes[mode];
    requireBalance(stats !== null && typeof stats === 'object', 'playout mode evidence missing');
    same(stats.playouts, PLAYOUTS_PER_MODE, 'playout execution count mismatch');
    same(stats.completed, PLAYOUTS_PER_MODE, 'unfinished or missing playouts');
    for (const field of ['invariantViolations', 'hintMismatches', 'replayMismatches']) same(stats[field], 0, `playout ${field} present or unavailable`);
    same(stats.terminalReached?.unfinished, 0, 'terminal playout evidence missing or unfinished');
    empty(stats.examples, 'playout error examples or missing evidence');
    for (const field of ['phases', 'commandsAccepted', 'commandsRejected']) integer(stats[field], 'playout execution counter invalid');
    requireBalance(stats.phases > 0 && stats.commandsAccepted > 0, 'playout report executed no phases or accepted commands');
  }
  return { modes: 3, playoutsPerMode: PLAYOUTS_PER_MODE, completed: 30 };
}
export function assertCompleteStaticSuite(output) {
  const count = name => { const matches = [...output.matchAll(new RegExp(`^# ${name} (\\d+)$`, 'gm'))]; requireBalance(matches.length === 1, `static test ${name} summary missing or ambiguous`); return Number(matches[0][1]); };
  const tests = count('tests');
  requireBalance(tests > 0, 'static suite executed no tests');
  for (const field of ['fail', 'cancelled', 'skipped', 'todo']) same(count(field), 0, `static suite has ${field} tests`);
  same(count('pass'), tests, 'static suite incomplete');
  return tests;
}
