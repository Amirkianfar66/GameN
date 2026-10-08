import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BALANCE_TOTALS, CONTROL_COUNTS, assertCompleteStaticSuite, assertControlReport, assertScenarioReport, assertWalkReport, loadBalanceContract } from '../../scripts/test-balance-reports.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const provenance = { head: '1234567890abcdef1234567890abcdef12345678', branch: 'codex/guard-test', node: 'v22.21.1' };
const contract = loadBalanceContract(root, provenance);
const window = { startedAt: Date.parse('2026-10-06T12:00:00.000Z'), finishedAt: Date.parse('2026-10-06T12:00:01.000Z') };
const grouped = {
  'mode-7': { total: 165, passed: 152, failed: 0, blocked: 11, notRun: 2 },
  'mode-8': { total: 171, passed: 158, failed: 0, blocked: 11, notRun: 2 },
  'mode-9': { total: 178, passed: 165, failed: 0, blocked: 11, notRun: 2 },
  unsupported: { total: 8, passed: 8, failed: 0, blocked: 0, notRun: 0 },
};
function scenarioReport() {
  return { schema: 'mothership.balance.scenario-run/1', pins: {
    repository: 'Amirkianfar66/GameN', baseCommit: '333c9e820f362a211352bc689372663f29b73ac4', branch: provenance.branch,
    workingTreeCommit: provenance.head, sourceManifestSha256: contract.sourceManifestSha256, ruleSourceHashes: contract.ruleSourceHashes,
    v1OverlaySha256: contract.v1OverlaySha256, additionalOwnerOverlayHashes: contract.additionalOwnerOverlayHashes, scenarioFileHashes: contract.scenarioFileHashes, rulebookSha256: contract.rulebookSha256,
    engine: contract.engine, engineCommit: provenance.head, engineOrigin: '@mothership/engine of this checkout',
    runner: '@mothership/balance scenario runner', node: provenance.node, generatedAt: '2026-10-06T12:00:00.500Z',
  }, totals: { ...BALANCE_TOTALS }, byGroup: structuredClone(grouped), runs: [...contract.scenarios].map(([scenarioId, expected]) => ({
    scenarioId, group: expected.group, mode: expected.mode, decisionIds: expected.decisionIds, seed: expected.seed,
    reason: expected.reason, status: expected.status, failure: null, invariantViolations: [],
    probes: expected.probeLabels.map(label => ({ label, outcome: 'observed, not approved canon' })),
    transitions: expected.seed !== null && !(/SETUP-0[1-5]$/.test(scenarioId) || scenarioId.startsWith('V1-UX-SETUP-')) ? 1 : 0,
    commands: expected.seed !== null && !(/SETUP-0[1-5]$/.test(scenarioId) || scenarioId.startsWith('V1-UX-SETUP-')) ? 1 : 0, finalDigest: null,
  })) };
}
function controlReport() {
  return { schema: 'mothership.balance.controls/1', engine: contract.engine, engineCommit: provenance.head, node: provenance.node,
    verdict: 'passed', undetected: [], baselineFailures: [], modes: Object.fromEntries(Object.entries(CONTROL_COUNTS).map(([mode, counts]) => [mode, { ...counts, detected: counts.controls, undetected: 0, baselineNotPassing: 0 }])) };
}
function walkReport() {
  return { schema: 'mothership.balance.walk/1', engine: contract.engine, engineCommit: provenance.head, node: provenance.node,
    seedsPerMode: 10, seedLabels: 'walk-1 .. walk-10', policy: { activity: 0.6, noise: 0.25, coordination: 0.5, maxPhases: 400,
      description: 'uniform random choice among offered commands, plus arbitrary commands' },
    modes: Object.fromEntries(['7', '8', '9'].map(mode => [mode, { playouts: 10, completed: 10, phases: 10, commandsAccepted: 10,
      commandsRejected: 0, invariantViolations: 0, hintMismatches: 0, replayMismatches: 0, terminalReached: { unfinished: 0 }, examples: [] }])) };
}
const ready = report => report.runs.find(run => run.status === 'passed' && !run.scenarioId.includes('SETUP'));
const blocked = report => report.runs.find(run => run.status === 'blocked' && run.seed !== null);
const manual = report => report.runs.find(run => run.status === 'not-run');

test('reviewed full reports pass, including zero-transition setup/rejection cases and null serialized digests', () => {
  const report = scenarioReport();
  assert.equal(report.runs.filter(run => run.status === 'passed' && run.scenarioId.includes('SETUP') && run.transitions === 0).length, 23);
  assert.ok(report.runs.every(run => run.finalDigest === null));
  assert.equal(assertScenarioReport(report, contract, window).passed, 483);
  assert.deepEqual(assertControlReport(controlReport(), contract), { baselines: 475, controls: 4388, detected: 4388 });
  assert.deepEqual(assertWalkReport(walkReport(), contract), { modes: 3, playoutsPerMode: 10, completed: 30 });
});
for (const [name, mutate] of [
  ['filtered catalogue despite green aggregates', r => r.runs.pop()],
  ['duplicate replaces an omitted ID at unchanged total', r => r.runs[1] = structuredClone(r.runs[0])],
  ['unknown ID replaces a real case', r => ready(r).scenarioId = 'invented-case'],
  ['ready scenario silently not run', r => ready(r).status = 'not-run'],
  ['ready scenario failed', r => ready(r).status = 'failed'],
  ['blocked scenario promoted to passed', r => blocked(r).status = 'passed'],
  ['manual scenario promoted to passed', r => manual(r).status = 'passed'],
  ['ready and blocked statuses swapped without changing counts', r => { const a = ready(r), b = blocked(r); [a.status, b.status] = [b.status, a.status]; }],
  ['manual reason silently changed', r => manual(r).reason = 'unavailable engine'],
  ['unprobed blocked case executed unexpectedly', r => r.runs.find(run => run.status === 'blocked' && run.seed === null).commands = 1],
  ['blocked probe has a concealed failure', r => blocked(r).failure = { message: 'private sentinel' }],
  ['invariant failure on a blocked case', r => blocked(r).invariantViolations = [{ message: 'private sentinel' }]],
  ['missing invariant evidence', r => delete ready(r).invariantViolations],
  ['blocked probes omitted', r => blocked(r).probes = []],
  ['probe outcome omitted', r => blocked(r).probes[0].outcome = ''],
  ['wrong group', r => ready(r).group = 'mode-9'],
  ['wrong mode', r => ready(r).mode = 8],
  ['wrong seed', r => ready(r).seed = 'unrecorded'],
  ['wrong decision IDs', r => blocked(r).decisionIds = ['D15']],
  ['aggregate counters lie', r => r.totals.passed++],
  ['missing group summary', r => delete r.byGroup.unsupported],
  ['group summary counters lie', r => r.byGroup['mode-7'].passed++],
  ['negative transition count', r => ready(r).transitions = -1],
  ['fractional command count', r => ready(r).commands = 0.5],
  ['green statuses but zero execution', r => r.runs.forEach(run => { run.transitions = 0; run.commands = 0; })],
]) test(`scenario guard rejects ${name}`, () => {
  const report = structuredClone(scenarioReport()); mutate(report);
  assert.throws(() => assertScenarioReport(report, contract, window), /Balance gate:/);
});
for (const mode of [7, 8, 9]) test(`scenario guard rejects zero execution for mode ${mode} despite other modes running`, () => {
  const report = scenarioReport();
  report.runs.filter(run => run.mode === mode).forEach(run => { run.commands = 0; run.transitions = 0; });
  assert.throws(() => assertScenarioReport(report, contract, window), /scenario mode executed no transitions or commands/);
});
for (const [name, mutate] of [
  ['unavailable engine', r => r.pins.engine = null],
  ['mislabeled engine role commit', r => r.pins.engineCommit = 'a'.repeat(40)],
  ['dirty checkout suffix', r => r.pins.workingTreeCommit += ' plus uncommitted changes'],
  ['wrong source digest', r => r.pins.ruleSourceHashes['rules/sources/v2.1-decisions.json'] = 'a'.repeat(64)],
  ['wrong catalogue digest', r => r.pins.scenarioFileHashes['mode-7.scenarios.json'] = 'a'.repeat(64)],
  ['wrong rulebook digest', r => r.pins.rulebookSha256 = 'a'.repeat(64)],
  ['missing Pass owner decision evidence', r => delete r.pins.additionalOwnerOverlayHashes],
  ['changed Pass owner decision evidence', r => r.pins.additionalOwnerOverlayHashes = {}],
  ['wrong overlay digest', r => r.pins.v1OverlaySha256 = 'a'.repeat(64)],
  ['wrong protocol', r => r.pins.engine.protocolVersion = 1],
  ['wrong runtime', r => r.pins.node = 'v24.0.0'],
  ['external engine origin', r => r.pins.engineOrigin = 'external checkout'],
  ['stale generation timestamp', r => r.pins.generatedAt = '2026-10-06T11:59:59.999Z'],
  ['future generation timestamp', r => r.pins.generatedAt = '2026-10-06T12:00:01.001Z'],
  ['missing generation timestamp', r => delete r.pins.generatedAt],
]) test(`scenario provenance rejects ${name}`, () => {
  const report = structuredClone(scenarioReport()); mutate(report);
  assert.throws(() => assertScenarioReport(report, contract, window), /Balance gate:/);
});
for (const [name, mutate] of [
  ['not-run verdict', r => r.verdict = 'not-run'],
  ['failed verdict', r => r.verdict = 'failed'],
  ['missing mode', r => delete r.modes[8]],
  ['zero controls falsely green', r => { r.modes[7].controls = 0; r.modes[7].detected = 0; }],
  ['missing baseline', r => r.modes[9].scenarios--],
  ['missing control at equal detected count', r => { r.modes[8].controls--; r.modes[8].detected--; }],
  ['undetected count', r => r.modes[7].undetected++],
  ['baseline failure count', r => r.modes[7].baselineNotPassing++],
  ['undetected list despite zero counters', r => r.undetected.push('failed control')],
  ['baseline failure list despite green verdict', r => r.baselineFailures.push('failed baseline')],
  ['missing baseline evidence', r => delete r.baselineFailures],
  ['wrong engine commit', r => r.engineCommit = 'b'.repeat(40)],
]) test(`control guard rejects ${name}`, () => {
  const report = structuredClone(controlReport()); mutate(report);
  assert.throws(() => assertControlReport(report, contract), /Balance gate:/);
});
for (const [name, mutate] of [
  ['zero requested seeds', r => r.seedsPerMode = 0],
  ['wrong seed labels', r => r.seedLabels = 'other-seeds'],
  ['missing mode', r => delete r.modes[9]],
  ['zero executed playouts', r => { r.modes[7].playouts = 0; r.modes[7].completed = 0; }],
  ['unfinished playout', r => r.modes[8].completed--],
  ['concealed unfinished terminal', r => r.modes[8].terminalReached.unfinished++],
  ['invariant violation', r => r.modes[7].invariantViolations++],
  ['hint mismatch', r => r.modes[7].hintMismatches++],
  ['replay mismatch', r => r.modes[7].replayMismatches++],
  ['missing error counter', r => delete r.modes[9].hintMismatches],
  ['error examples despite zero counters', r => r.modes[7].examples.push({ seed: 'walk-1' })],
  ['fractional execution counter', r => r.modes[7].phases = 0.5],
  ['no phase execution', r => r.modes[7].phases = 0],
  ['different policy', r => r.policy.noise = 0],
  ['unavailable engine', r => r.engine = null],
]) test(`playout guard rejects ${name}`, () => {
  const report = structuredClone(walkReport()); mutate(report);
  assert.throws(() => assertWalkReport(report, contract), /Balance gate:/);
});
test('missing/null reports never pass and failures do not print private report payloads', () => {
  for (const check of [assertScenarioReport, assertControlReport, assertWalkReport]) assert.throws(() => check(null, contract, window), /Balance gate:/);
  const report = scenarioReport(); blocked(report).failure = { message: 'private sentinel' };
  assert.throws(() => assertScenarioReport(report, contract, window), error => !error.message.includes('private sentinel'));
});
test('disk source pins fail before accepting a changed reviewed artifact', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'balance-guard-sources-'));
  try {
    for (const path of ['rules', 'docs/balance', 'tests/scenarios']) cpSync(join(root, path), join(temporary, path), { recursive: true });
    for (const path of ['rules/overlays/ordinary-turn-pass-owner-decision-2026-10-08.json', 'docs/balance/game-rules.md', 'tests/scenarios/v1/catalog.mjs', 'tests/scenarios/v1/exceptions.json', 'tests/scenarios/adapters/full-game-v1.mjs', 'rules/in-person-v1-manifest.json', 'rules/sources/v2.1-decisions.json', 'tests/scenarios/v1/mode-7.scenarios.json']) {
      const target = join(temporary, path); const original = readFileSync(target);
      writeFileSync(target, Buffer.concat([original, Buffer.from('\n')]));
      assert.throws(() => loadBalanceContract(temporary, provenance), /Balance gate:/, path);
      writeFileSync(target, original);
    }
    assert.equal(loadBalanceContract(temporary, provenance).scenarios.size, 522);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
const tap = values => Object.entries({ tests: 43, pass: 43, fail: 0, cancelled: 0, skipped: 0, todo: 0, ...values }).map(([name, count]) => `# ${name} ${count}`).join('\n');
test('static suite requires positive complete execution and rejects every nonpassing state', () => {
  assert.equal(assertCompleteStaticSuite(tap({})), 43);
  for (const values of [{ tests: 0, pass: 0 }, { pass: 42 }, { fail: 1 }, { cancelled: 1 }, { skipped: 1 }, { todo: 1 }]) assert.throws(() => assertCompleteStaticSuite(tap(values)), /Balance gate:/);
  assert.throws(() => assertCompleteStaticSuite(''), /Balance gate:/);
  assert.throws(() => assertCompleteStaticSuite(tap({}) + '\n# tests 43'), /Balance gate:/);
});
