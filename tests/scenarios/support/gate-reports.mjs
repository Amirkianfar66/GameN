// Reports as the three engine commands write them, built from the catalogue for the tests of the
// report gate: one clean set, to which a test then does exactly one wrong thing. No engine is
// involved, and the clean set is not a result: results are in docs/balance/evidence/.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_COMMIT_BASIS, controlsFor, gateProblems } from '@mothership/balance';
import { sourceHashes } from '../../../tools/balance/scripts/pins.mjs';
import { ADAPTER_NAME } from '../adapters/full-game-v1.mjs';
import { SOURCE_MANIFEST_SHA256, V1_OVERLAY_SHA256, V1_RULESET_VERSION, loadAll, loadExceptions } from '../v1/files.mjs';

export const root = fileURLToPath(new URL('../../../', import.meta.url));
export const catalogue = loadAll();
export const allowlist = loadExceptions();
export const disk = sourceHashes();
export const ENGINE_COMMIT = 'a'.repeat(40);
// The reports written here say they came through the real binding, as a real run's do.
export const ADAPTER = ADAPTER_NAME;
export const TREE_COMMIT = 'b'.repeat(40);
// The combined manifest belongs to the engine. Where this checkout has none, the reports written
// here name one of their own, as reports made against an engine elsewhere would.
export const MANIFEST = disk.v1ManifestSha256 ?? 'c'.repeat(64);
export const copy = value => JSON.parse(JSON.stringify(value));

// What the three commands write for a complete and clean run of the catalogue as it is on disk.
export function cleanReports(playouts = 10) {
  // Each report gets pins of its own, so that changing one report changes nothing else.
  const pins = () => copy({
    ...disk, v1OverlaySha256: V1_OVERLAY_SHA256, v1ManifestSha256: MANIFEST, workingTreeCommit: TREE_COMMIT,
    engineCommit: ENGINE_COMMIT, engineCommitBasis: ENGINE_COMMIT_BASIS.there, engineTreeClean: true, engineBuildSha256: 'e'.repeat(64),
    engine: { adapter: ADAPTER, engineVersion: 'none', rulesetVersion: V1_RULESET_VERSION, rulesetHash: V1_OVERLAY_SHA256, protocolVersion: 2 },
  });
  const runs = catalogue.map(scenario => {
    const head = { scenarioId: scenario.id, group: scenario.group, mode: scenario.mode, decisionIds: scenario.decisionIds, failure: null, invariantViolations: [], probes: [] };
    if (scenario.status === 'ready') return { ...head, status: 'passed', reason: null };
    if (scenario.status === 'manual') return { ...head, status: 'not-run', reason: 'manual: needs human or user-interface evidence, not an engine run' };
    if (scenario.setup === null) return { ...head, status: 'blocked', reason: 'awaiting an owner decision; no probe is defined' };
    const probes = scenario.steps.filter(step => step.op === 'probe' || step.op === 'note').map(step => ({ label: step.label, outcome: 'recorded' }));
    return { ...head, status: 'blocked', reason: null, probes };
  });
  const count = status => runs.filter(run => run.status === status).length;
  const totals = { total: runs.length, passed: count('passed'), failed: count('failed'), blocked: count('blocked'), notRun: count('not-run') };
  const controlModes = {};
  const playoutModes = {};
  for (const mode of [7, 8, 9]) {
    const baselines = catalogue.filter(scenario => scenario.mode === mode && scenario.status === 'ready');
    const controls = baselines.reduce((sum, scenario) => sum + controlsFor(scenario).length, 0);
    controlModes[mode] = { scenarios: baselines.length, controls, detected: controls, undetected: 0, baselineNotPassing: 0 };
    playoutModes[mode] = {
      playouts, completed: playouts, invariantViolations: 0, hintMismatches: 0, replayMismatches: 0,
      terminalReached: { Blue: true, Red: true, Alien: false, Draw: true, alienCoWin: true, unfinished: 0 },
    };
  }
  return {
    scenarios: { schema: 'mothership.balance.scenario-run/1', pins: pins(), totals, runs },
    controls: { schema: 'mothership.balance.controls/1', pins: pins(), modes: controlModes, undetected: [], baselineFailures: [], verdict: 'passed' },
    playouts: { schema: 'mothership.balance.walk/1', pins: pins(), seedsPerMode: playouts, modes: playoutModes },
  };
}

export const expectations = (changes = {}) => ({
  engineCommit: ENGINE_COMMIT, playoutsPerMode: 10, candidateCommit: null, allowUnpinnedTree: false,
  adapter: ADAPTER, rulesetVersion: V1_RULESET_VERSION, overlaySha256: V1_OVERLAY_SHA256, sourceManifestSha256: SOURCE_MANIFEST_SHA256,
  // As the command does it: the manifest is compared with the file where this checkout has one.
  v1Manifest: disk.v1ManifestSha256 === null ? null : { sha256: disk.v1ManifestSha256 }, scenarioFileHashes: disk.scenarioFileHashes,
  ruleSourceHashes: disk.ruleSourceHashes, rulebookSha256: disk.rulebookSha256, ...changes,
});
export const judge = (reports, changes) => gateProblems(reports, catalogue, allowlist, expectations(changes));
export const runOf = (reports, id) => reports.scenarios.runs.find(run => run.scenarioId === id);
export const first = status => catalogue.find(scenario => scenario.status === status && scenario.mode === 7);
export const probed = catalogue.find(scenario => scenario.status === 'blocked' && scenario.setup !== null);
export const unprobed = catalogue.find(scenario => scenario.status === 'blocked' && scenario.setup === null);
export const everyReport = (reports, change) => { for (const report of Object.values(reports)) change(report); };
// One wrong thing at a time: the change is made to a fresh clean set, and some problem must match.
export function eachIsNamed(cases, changes) {
  for (const [name, change, pattern] of cases) {
    const reports = cleanReports();
    change(reports);
    const problems = judge(reports, changes);
    assert.ok(problems.some(problem => pattern.test(problem)), `${name}: ${JSON.stringify(problems.slice(0, 3))}`);
  }
}


// One of the Balance commands, started as a person or CI would start it.
export const script = (name, args, env = {}) => spawnSync(process.execPath, [join(root, 'tools/balance/scripts', name), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });

export function writeReports(directory, reports) {
  mkdirSync(directory, { recursive: true });
  const named = [];
  for (const [name, report] of Object.entries(reports)) {
    writeFileSync(join(directory, `${name}.json`), `${JSON.stringify(report)}\n`);
    named.push(`--${name}`, join(directory, `${name}.json`));
  }
  return named;
}
