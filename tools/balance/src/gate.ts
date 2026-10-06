import { controlsFor } from './controls.js';
import { deepEqual, sameSet } from './model.js';
import type { Scenario } from './scenario.js';

// The report gate. Each of the three engine commands ends with an exit status, and an exit status
// of 0 says only that the command found nothing wrong in what it did. The gate reads their reports
// and checks that together they did the whole job: every fixture accounted for exactly once, every
// ready case executed and passed, every exception one that was reviewed, every control and playout
// run, and all three reports about the same engine, fixtures and rule sources. It computes no game
// outcome and executes nothing.

export const EXCEPTIONS_SCHEMA = 'mothership.balance.scenario-exceptions/1';

/** How a report came to know the commit of the engine it ran. Only the first two were read from Git. */
export const ENGINE_COMMIT_BASIS = {
  here: 'head of this checkout',
  there: 'head of the engine checkout',
  stated: 'stated on the command line, not checked',
} as const;

/** A reviewed fixture that is not executed as a ready case. Changing the list is a change to review. */
export interface ScenarioException {
  // The scenario identifier without its mode group: FLOW-07 stands for V1-M7-FLOW-07 and so on.
  code: string;
  modes: number[];
  status: 'blocked' | 'manual';
  decisionIds: string[];
  // Whether the fixture has a setup, and is therefore run up to the undecided point to record what an engine does.
  probe: boolean;
  why: string;
}

export interface GateExpectations {
  // The exact commit of the engine under test. Every report must name it.
  engineCommit: string;
  // The exact number of playouts required for each mode.
  playoutsPerMode: number;
  // When given, every report must come from a clean working tree at exactly this commit.
  candidateCommit: string | null;
  // Accept reports from a tree that is unknown or has uncommitted changes, and an engine whose
  // commit was only stated. For trying the gate. Never for a merge gate, and without effect when a
  // candidate commit is named.
  allowUnpinnedTree: boolean;
  rulesetVersion: string;
  // The approved owner decision and the pinned rule-source manifest. Two separate pins.
  overlaySha256: string;
  sourceManifestSha256: string;
  // The combined Version 1 manifest beside the engine, when that checkout is at hand. Without it
  // (null) the reports still have to carry its hash and agree with each other about it.
  v1Manifest: { sha256: string | null } | null;
  // What is on disk now, to hold the reports against.
  scenarioFileHashes: Record<string, string>;
  ruleSourceHashes: Record<string, string>;
  rulebookSha256: string;
}

export interface GateReports {
  scenarios: unknown;
  controls: unknown;
  playouts: unknown;
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const object = (value: unknown): Json => (isObject(value) ? value : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const COMMIT = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const isHash = (value: unknown): boolean => typeof value === 'string' && SHA256.test(value);
const MODES = [7, 8, 9] as const;

// The two reasons the runner gives for a case it does not execute.
const NO_PROBE_REASON = 'awaiting an owner decision; no probe is defined';
const MANUAL_REASON = 'manual: needs human or user-interface evidence, not an engine run';

function readException(value: unknown): ScenarioException | null {
  if (!isObject(value)) return null;
  const { code, modes, status, decisionIds, probe, why } = value;
  if (typeof code !== 'string' || !/^[A-Z]+-\d{2}[a-z]?$/.test(code)) return null;
  if (!Array.isArray(modes) || modes.length === 0 || modes.some(mode => mode !== 7 && mode !== 8 && mode !== 9)) return null;
  if (status !== 'blocked' && status !== 'manual') return null;
  if (!strings(decisionIds) || decisionIds.some(id => !/^D\d{2}$/.test(id))) return null;
  if (typeof probe !== 'boolean' || typeof why !== 'string' || why.trim().length === 0) return null;
  return { code, modes: modes as number[], status, decisionIds, probe, why };
}

/**
 * The fixtures that are not ready must be exactly the reviewed exceptions: the same cases, with the
 * same status, the same decisions and the same kind (probed or not). Needs no report and no engine.
 */
export function exceptionProblems(catalogue: readonly Scenario[], allowlist: unknown): string[] {
  if (!isObject(allowlist) || allowlist['schema'] !== EXCEPTIONS_SCHEMA || !Array.isArray(allowlist['exceptions'])) {
    return [`the exception list must have the schema ${EXCEPTIONS_SCHEMA} and a list of exceptions`];
  }
  const problems: string[] = [];
  const listed = new Map<string, ScenarioException>();
  allowlist['exceptions'].forEach((item, index) => {
    const entry = readException(item);
    if (entry === null) { problems.push(`exception ${index + 1} is malformed`); return; }
    if (entry.status === 'blocked' && entry.decisionIds.length === 0) problems.push(`exception ${entry.code} is blocked and names no decision`);
    if (entry.status === 'manual' && (entry.decisionIds.length > 0 || entry.probe)) problems.push(`exception ${entry.code} is manual: it waits on no decision and has no probe`);
    for (const mode of entry.modes) {
      const id = `V1-M${mode}-${entry.code}`;
      if (listed.has(id)) problems.push(`the exception list names ${id} twice`);
      listed.set(id, entry);
    }
  });
  const seen = new Set<string>();
  for (const scenario of catalogue) {
    if (scenario.status === 'ready') continue;
    seen.add(scenario.id);
    const entry = listed.get(scenario.id);
    if (entry === undefined) { problems.push(`${scenario.id} is ${scenario.status} and is not in the reviewed exception list`); continue; }
    if (entry.status !== scenario.status) problems.push(`${scenario.id} is ${scenario.status}; the exception list says ${entry.status}`);
    if (!sameSet(entry.decisionIds, scenario.decisionIds)) problems.push(`${scenario.id} waits on ${scenario.decisionIds.join(', ') || 'no decision'}; the exception list says ${entry.decisionIds.join(', ') || 'no decision'}`);
    if (entry.probe !== (scenario.setup !== null)) problems.push(`${scenario.id} ${scenario.setup !== null ? 'is probed' : 'has no probe'}; the exception list says otherwise`);
  }
  for (const id of listed.keys()) if (!seen.has(id)) problems.push(`the exception list names ${id}, which is not a blocked or manual fixture`);
  return problems;
}

function pinProblems(label: string, report: Json, expected: GateExpectations): string[] {
  if (!isObject(report['pins'])) return [`${label}: the report carries no pins`];
  const problems: string[] = [];
  const say = (message: string) => { problems.push(`${label}: ${message}`); };
  const pins = report['pins'];
  const engine = pins['engine'];
  if (!isObject(engine)) say('no engine was available when the report was made');
  else {
    if (engine['rulesetVersion'] !== expected.rulesetVersion) say(`the engine reports ruleset ${String(engine['rulesetVersion'])}, not ${expected.rulesetVersion}`);
    if (engine['rulesetHash'] !== expected.overlaySha256) say('the engine reports a ruleset hash that is not the approved owner decision');
  }
  if (pins['engineCommit'] !== expected.engineCommit) say(`the engine commit is ${String(pins['engineCommit'])}, not ${expected.engineCommit}`);
  if (pins['v1OverlaySha256'] !== expected.overlaySha256) say('the owner-decision file beside the engine is missing or is not the approved one');
  // An absent pin is a failure, not an agreement: three reports without the manifest prove nothing about it.
  if (!isHash(pins['v1ManifestSha256'])) say('the combined Version 1 manifest was not found beside the engine');
  else if (expected.v1Manifest !== null && pins['v1ManifestSha256'] !== expected.v1Manifest.sha256) say('the combined Version 1 manifest differs from the file beside the engine');
  if (!isHash(pins['engineBuildSha256'])) say('the built engine modules were not found, so the report does not say which build it ran');
  if (pins['sourceManifestSha256'] !== expected.sourceManifestSha256) say('the rule-source manifest is not the pinned one');
  if (!deepEqual(pins['ruleSourceHashes'], expected.ruleSourceHashes)) say('the rule sources differ from the files on disk');
  if (!deepEqual(pins['scenarioFileHashes'], expected.scenarioFileHashes)) say('the scenario files differ from the files on disk');
  if (pins['rulebookSha256'] !== expected.rulebookSha256) say('the rulebook differs from the file on disk');
  const tree = pins['workingTreeCommit'];
  if (expected.candidateCommit !== null) {
    if (tree !== expected.candidateCommit) say(`the working tree is ${String(tree)}, not the clean candidate ${expected.candidateCommit}`);
  } else if (!expected.allowUnpinnedTree && (typeof tree !== 'string' || !COMMIT.test(tree))) say(`the working tree is not a clean commit (${String(tree)})`);
  // The engine commit has to be more than a label: read from Git, from a tree with nothing uncommitted.
  if (expected.candidateCommit !== null || !expected.allowUnpinnedTree) {
    const basis = pins['engineCommitBasis'];
    if (basis !== ENGINE_COMMIT_BASIS.here && basis !== ENGINE_COMMIT_BASIS.there) say('the engine commit was only stated on the command line: the engine was not in a Git checkout that it could be read from');
    else if (pins['engineTreeClean'] !== true) say("the engine's checkout had uncommitted changes");
    else if (basis === ENGINE_COMMIT_BASIS.here && pins['engineCommit'] !== tree) say(`the engine is this checkout's own, but its commit ${String(pins['engineCommit'])} is not the working tree's`);
  }
  return problems;
}

function scenarioReportProblems(report: Json, catalogue: readonly Scenario[]): string[] {
  const problems: string[] = [];
  const say = (message: string) => { problems.push(`scenarios: ${message}`); };
  if (report['schema'] !== 'mothership.balance.scenario-run/1') say(`unexpected schema ${String(report['schema'])}`);
  const runs = new Map<string, Json>();
  for (const item of list(report['runs'])) {
    const run = object(item);
    const id = run['scenarioId'];
    if (typeof id !== 'string') { say('a run has no scenario identifier'); continue; }
    if (runs.has(id)) say(`${id} is reported twice`);
    runs.set(id, run);
  }
  const known = new Set(catalogue.map(scenario => scenario.id));
  for (const id of runs.keys()) if (!known.has(id)) say(`${id} is reported and is not in the catalogue`);
  const passed = new Map<number, number>();
  for (const scenario of catalogue) {
    const run = runs.get(scenario.id);
    if (run === undefined) { say(`${scenario.id} is missing from the report`); continue; }
    const status = run['status'];
    const reason = run['reason'] ?? null;
    if (scenario.status === 'ready') {
      const detail = object(run['failure'])['message'] ?? reason;
      if (status !== 'passed') say(`${scenario.id} is ready and was ${String(status)}${typeof detail === 'string' && detail.length > 0 ? `: ${detail}` : ''}`);
      // A pass that carries a failure, a reason or an invariant violation contradicts itself.
      else if (run['failure'] !== null || reason !== null || !Array.isArray(run['invariantViolations']) || run['invariantViolations'].length > 0) say(`${scenario.id} is reported passed and carries a failure, a reason or an invariant violation`);
      else if (scenario.mode !== null) passed.set(scenario.mode, (passed.get(scenario.mode) ?? 0) + 1);
    } else if (scenario.status === 'blocked') {
      // A blocked case is never a pass. With a setup it is run to the undecided point and what the
      // engine does there is recorded; that run has to have completed.
      if (status !== 'blocked') say(`${scenario.id} is blocked and was reported ${String(status)}`);
      if (!strings(run['decisionIds']) || !sameSet(run['decisionIds'], scenario.decisionIds)) say(`${scenario.id} reports other decisions than its fixture`);
      if (scenario.setup === null) {
        if (reason !== NO_PROBE_REASON) say(`${scenario.id}: unexpected reason ${String(reason)}`);
      } else {
        if (reason !== null) say(`${scenario.id}: its probe was not completed (${String(reason)})`);
        const wanted = scenario.steps.filter(step => step.op === 'probe' || step.op === 'note').length;
        const recorded = list(run['probes']).filter(probe => typeof object(probe)['label'] === 'string' && typeof object(probe)['outcome'] === 'string').length;
        if (recorded !== wanted || list(run['probes']).length !== wanted) say(`${scenario.id}: ${recorded} observations recorded, ${wanted} defined`);
      }
    } else {
      if (status !== 'not-run') say(`${scenario.id} is manual and was reported ${String(status)}`);
      if (reason !== MANUAL_REASON) say(`${scenario.id}: unexpected reason ${String(reason)}`);
    }
  }
  for (const mode of MODES) if ((passed.get(mode) ?? 0) === 0) say(`no scenario passed for ${mode} players`);
  const totals = object(report['totals']);
  const count = (status: string) => [...runs.values()].filter(run => run['status'] === status).length;
  if (totals['total'] !== runs.size || totals['passed'] !== count('passed') || totals['failed'] !== count('failed')
    || totals['blocked'] !== count('blocked') || totals['notRun'] !== count('not-run')) say('the totals do not match the runs');
  return problems;
}

function controlsReportProblems(report: Json, catalogue: readonly Scenario[]): string[] {
  const problems: string[] = [];
  const say = (message: string) => { problems.push(`controls: ${message}`); };
  if (report['schema'] !== 'mothership.balance.controls/1') say(`unexpected schema ${String(report['schema'])}`);
  if (report['verdict'] !== 'passed') say(`the run's own verdict is ${String(report['verdict'])}`);
  // Both lists have to be there and empty. Anything else in their place is not an empty list.
  for (const [field, what] of [['baselineFailures', 'baselines that did not pass'], ['undetected', 'controls that were not detected']] as const) {
    const value = report[field];
    if (!Array.isArray(value)) say(`the list of ${what} is missing`);
    else if (value.length > 0) say(`the list of ${what} has ${value.length} ${value.length === 1 ? 'entry' : 'entries'}`);
  }
  const modes = object(report['modes']);
  for (const mode of MODES) {
    const stats = modes[String(mode)];
    if (!isObject(stats)) { say(`no result for ${mode} players`); continue; }
    // The same selection the controls command makes, taken from the catalogue and not from the report.
    const baselines = catalogue.filter(scenario => scenario.mode === mode && scenario.status === 'ready' && scenario.setup !== null);
    const controls = baselines.reduce((sum, scenario) => sum + controlsFor(scenario).length, 0);
    if (baselines.length === 0 || controls === 0) say(`the catalogue has no baseline or no control for ${mode} players`);
    if (stats['scenarios'] !== baselines.length) say(`${mode} players: ${String(stats['scenarios'])} baselines reported, ${baselines.length} in the catalogue`);
    if (stats['baselineNotPassing'] !== 0) say(`${mode} players: baselines that did not pass: ${String(stats['baselineNotPassing'])}`);
    if (stats['controls'] !== controls) say(`${mode} players: ${String(stats['controls'])} controls executed, ${controls} generated from the catalogue`);
    if (stats['detected'] !== stats['controls']) say(`${mode} players: ${String(stats['detected'])} of ${String(stats['controls'])} controls detected`);
    if (stats['undetected'] !== 0) say(`${mode} players: controls not detected: ${String(stats['undetected'])}`);
  }
  return problems;
}

function playoutReportProblems(report: Json, playoutsPerMode: number): string[] {
  const problems: string[] = [];
  const say = (message: string) => { problems.push(`playouts: ${message}`); };
  if (report['schema'] !== 'mothership.balance.walk/1') say(`unexpected schema ${String(report['schema'])}`);
  if (report['seedsPerMode'] !== playoutsPerMode) say(`${String(report['seedsPerMode'])} playouts per mode were asked for, ${playoutsPerMode} are required`);
  const modes = object(report['modes']);
  for (const mode of MODES) {
    const stats = modes[String(mode)];
    if (!isObject(stats)) { say(`no result for ${mode} players`); continue; }
    if (stats['playouts'] !== playoutsPerMode) say(`${mode} players: ${String(stats['playouts'])} playouts executed, ${playoutsPerMode} required`);
    if (stats['completed'] !== stats['playouts']) say(`${mode} players: ${String(stats['completed'])} of ${String(stats['playouts'])} playouts finished`);
    if (stats['invariantViolations'] !== 0) say(`${mode} players: invariant violations: ${String(stats['invariantViolations'])}`);
    if (stats['hintMismatches'] !== 0) say(`${mode} players: hint mismatches: ${String(stats['hintMismatches'])}`);
    if (stats['replayMismatches'] !== 0) say(`${mode} players: replay mismatches: ${String(stats['replayMismatches'])}`);
    if (object(stats['terminalReached'])['unfinished'] !== 0) say(`${mode} players: unfinished playouts are reported`);
  }
  return problems;
}

/**
 * Every reason the three reports, taken together, are not a complete and clean run of the Balance
 * checks against the expected engine. An empty list is the only pass. A pass says that the checks
 * ran completely and found nothing; it is not a statement about balance or about human play.
 */
export function gateProblems(reports: GateReports, catalogue: readonly Scenario[], allowlist: unknown, expected: GateExpectations): string[] {
  const problems: string[] = [];
  if (!COMMIT.test(expected.engineCommit)) problems.push(`the expected engine commit must be a full commit hash, not ${expected.engineCommit}`);
  if (expected.candidateCommit !== null && !COMMIT.test(expected.candidateCommit)) problems.push(`the expected candidate commit must be a full commit hash, not ${expected.candidateCommit}`);
  if (!Number.isInteger(expected.playoutsPerMode) || expected.playoutsPerMode < 1) problems.push('the required number of playouts must be a whole number of at least 1');
  if (catalogue.length === 0) problems.push('the scenario catalogue is empty');
  problems.push(...exceptionProblems(catalogue, allowlist).map(problem => `exceptions: ${problem}`));
  const named: [string, unknown][] = [['scenarios', reports.scenarios], ['controls', reports.controls], ['playouts', reports.playouts]];
  for (const [label, report] of named) {
    if (isObject(report)) problems.push(...pinProblems(label, report, expected));
    else problems.push(`${label}: the report is missing or is not an object`);
  }
  // The three reports must be about one engine, one set of rule files and one working tree.
  const pinsOf = (report: unknown) => object(object(report)['pins']);
  const first = pinsOf(reports.scenarios);
  for (const [label, report] of named.slice(1)) {
    const pins = pinsOf(report);
    if (!deepEqual(pins['engine'], first['engine'])) problems.push(`${label}: not the same engine as the scenario report`);
    if (pins['engineBuildSha256'] !== first['engineBuildSha256']) problems.push(`${label}: not the same engine build as the scenario report`);
    if (pins['v1ManifestSha256'] !== first['v1ManifestSha256']) problems.push(`${label}: not the same combined Version 1 manifest as the scenario report`);
    if (pins['workingTreeCommit'] !== first['workingTreeCommit']) problems.push(`${label}: not the same working tree as the scenario report`);
  }
  // The scenario report comes last: it can name one problem for every case.
  if (isObject(reports.controls)) problems.push(...controlsReportProblems(reports.controls, catalogue));
  if (isObject(reports.playouts)) problems.push(...playoutReportProblems(reports.playouts, expected.playoutsPerMode));
  if (isObject(reports.scenarios)) problems.push(...scenarioReportProblems(reports.scenarios, catalogue));
  return problems;
}
