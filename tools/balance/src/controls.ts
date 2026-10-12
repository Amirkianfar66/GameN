import type { Mode } from './model.js';
import type { EngineAdapter } from './observation.js';
import { audiencesToldApart, runScenario } from './runner.js';
import type { ScenarioRun } from './runner.js';
import type { Scenario } from './scenario.js';

// Negative controls for the scenario harness. A control is a copy of a ready scenario with exactly
// one expectation made wrong: a command expected to be accepted is expected to be refused, or an
// asserted value is changed. A run of that copy must fail. A control that still passes would mean
// the expectation checks nothing. This tests the fixtures and the runner, not an engine.

export interface Control {
  kind: 'command expectation' | 'asserted fact';
  where: string;
  scenario: Scenario;
}

function wrongValue(value: unknown): unknown {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return value + 1;
  if (value === null) return 'seat-1';
  if (value === 'Healthy') return 'Injured';
  if (value === 'Injured' || value === 'Eliminated') return 'Healthy';
  if (typeof value === 'string') return `${value}-changed`;
  if (Array.isArray(value)) return [...(value as unknown[]), 'seat-1'];
  return undefined;
}

type Loose = Record<string, unknown>;
const copyOf = (scenario: Scenario): Scenario => JSON.parse(JSON.stringify(scenario)) as Scenario;

/** Every single-expectation change of one scenario. */
export function controlsFor(scenario: Scenario): Control[] {
  const out: Control[] = [];
  scenario.steps.forEach((step, index) => {
    if (step.op === 'command') {
      const copy = copyOf(scenario);
      (copy.steps[index] as unknown as Loose)['expect'] = step.expect === 'REGISTERED' ? 'NOT_ALLOWED' : 'REGISTERED';
      out.push({ kind: 'command expectation', where: `step ${index}`, scenario: copy });
    }
    if (step.op === 'watch') {
      // The opposite claim about the same span: where the two runs were to look the same at every
      // phase, they are now to look different at every phase, and the other way round.
      const copy = copyOf(scenario);
      const target = copy.steps[index] as unknown as Loose;
      if ('sameAsTwin' in step) { target['differsFromTwin'] = step.sameAsTwin; delete target['sameAsTwin']; }
      else { target['sameAsTwin'] = step.differsFromTwin; delete target['differsFromTwin']; }
      out.push({ kind: 'asserted fact', where: `step ${index}`, scenario: copy });
    }
    if (step.op !== 'assert') return;
    step.checks.forEach((original, position) => {
      const check = original as unknown as Loose;
      const copy = copyOf(scenario);
      const target = ((copy.steps[index] as unknown as { checks: Loose[] }).checks[position]) as Loose;
      if ('equals' in check) {
        const changed = wrongValue(check['equals']);
        if (changed === undefined) return;
        target['equals'] = changed;
      } else if ('sameSet' in check && Array.isArray(check['sameSet'])) target['sameSet'] = check['sameSet'].length > 0 ? (check['sameSet'] as unknown[]).slice(1) : ['seat-1'];
      else if ('includes' in check) { target['excludes'] = check['includes']; delete target['includes']; }
      else if ('excludes' in check) { target['includes'] = check['excludes']; delete target['excludes']; }
      else if ('unchanged' in check) { target['changed'] = check['unchanged']; delete target['unchanged']; }
      else if ('changed' in check) { target['unchanged'] = check['changed']; delete target['changed']; }
      else if ('sameAsTwin' in check) { target['differsFromTwin'] = check['sameAsTwin']; delete target['sameAsTwin']; }
      else if ('differsFromTwin' in check) { target['sameAsTwin'] = check['differsFromTwin']; delete target['differsFromTwin']; }
      else if ('trace' in check) target['trace'] = { kinds: (check['trace'] as { kinds: string[] }).kinds.slice(1) };
      else if ('traceTurns' in check) {
        const turns = check['traceTurns'] as { round: number; actives: string[] };
        target['traceTurns'] = { round: turns.round, actives: [...turns.actives, 'seat-1'] };
      } else return;
      out.push({ kind: 'asserted fact', where: `step ${index} check ${position}`, scenario: copy });
    });
  });
  return out;
}

export interface ControlStats {
  scenarios: number;
  controls: number;
  detected: number;
  undetected: number;
  baselineNotPassing: number;
}

export interface ControlRun {
  stats: ControlStats;
  /** Controls that still passed although one expectation was wrong. */
  undetected: string[];
  /** Ready scenarios that did not pass unmodified, so that none of their controls could be run. */
  baselineFailures: string[];
}

/** Run every control of the ready scenarios given. A scenario that does not pass unmodified is a failure of the run. */
export function runControls(scenarios: readonly Scenario[], adapter: EngineAdapter): ControlRun {
  const stats: ControlStats = { scenarios: 0, controls: 0, detected: 0, undetected: 0, baselineNotPassing: 0 };
  const undetected: string[] = [];
  const baselineFailures: string[] = [];
  for (const scenario of scenarios) {
    if (scenario.status !== 'ready' || scenario.setup === null) continue;
    stats.scenarios += 1;
    const baseline = runScenario(scenario, adapter, '');
    if (baseline.status !== 'passed') {
      stats.baselineNotPassing += 1;
      baselineFailures.push(`${scenario.id}: ${baseline.failure?.message ?? baseline.reason ?? baseline.status}`);
      continue;
    }
    for (const control of controlsFor(scenario)) {
      stats.controls += 1;
      if (runScenario(control.scenario, adapter, '').status === 'failed') stats.detected += 1;
      else {
        stats.undetected += 1;
        undetected.push(`${scenario.id} ${control.where} (${control.kind})`);
      }
    }
  }
  return { stats, undetected, baselineFailures };
}

export interface ControlVerdict {
  passed: boolean;
  problems: string[];
}

/**
 * A controls run counts as passed only when every baseline passed, at least one control was
 * executed and every executed control was detected. A baseline that does not pass means its
 * controls were never run, which is a failure of the run and not a smaller success.
 */
export function controlVerdict(runs: readonly ControlRun[]): ControlVerdict {
  const total = (key: keyof ControlStats) => runs.reduce((sum, run) => sum + run.stats[key], 0);
  const problems: string[] = [];
  if (total('baselineNotPassing') > 0) problems.push(`${total('baselineNotPassing')} of ${total('scenarios')} ready scenarios do not pass unmodified, so their controls were not run`);
  if (total('undetected') > 0) problems.push(`${total('undetected')} of ${total('controls')} controls were not detected`);
  if (total('controls') === 0) problems.push('no control was executed');
  return { passed: problems.length === 0, problems };
}

// A second kind of control. A changed expectation tests a case's own checks. A deliberate leak
// tests whether the paired cases together watch the right things: the engine binding is made to
// tell somebody something the rules do not allow, and a comparison of two runs has to notice.

export interface LeakOutcome {
  /** The paired cases whose comparison failed, each with the audiences that could tell the two runs apart. */
  caughtBy: { scenario: string; couldTell: string[] }[];
  problems: string[];
}

/**
 * Judges one deliberate leak from the runs of the paired cases through a binding that makes it.
 * The leak is caught where a comparison fails and names who could tell the two runs apart, and it
 * has to be caught with every number of players in `modes`. A case that does not pass for any
 * other reason has caught nothing: that is a fault of the control, and it is reported as one.
 * `passingWithout` names the cases that pass through the same binding without the leak; a case
 * that does not pass there either says nothing about the leak.
 */
export function judgeLeak(
  leak: string, meaning: string, modes: readonly Mode[], runs: readonly { scenario: Scenario; run: ScenarioRun }[], passingWithout: ReadonlySet<string>,
): LeakOutcome {
  const caughtBy: LeakOutcome['caughtBy'] = [];
  const problems: string[] = [];
  const caughtIn = new Set<Mode>();
  for (const { scenario, run } of runs) {
    if (!passingWithout.has(scenario.id)) {
      problems.push(`with the leak "${leak}", ${scenario.id} was tried although it does not pass without the leak`);
      continue;
    }
    if (run.status === 'passed') continue;
    const message = run.failure?.message ?? '';
    // A step reports every check of its that failed, joined by "; ". All of them have to be
    // comparisons that name who could tell: one other failure beside them, and the case has
    // not failed for the leak alone.
    const compared = run.status === 'failed' && (run.failure?.op === 'assert' || run.failure?.op === 'watch');
    const named = compared ? message.split('; ').map(audiencesToldApart) : [];
    if (named.length > 0 && named.every((audiences): audiences is string[] => audiences !== null)) {
      caughtBy.push({ scenario: scenario.id, couldTell: [...new Set(named.flat())] });
      if (scenario.mode !== null) caughtIn.add(scenario.mode);
    } else problems.push(`with the leak "${leak}", ${scenario.id} did not pass for a reason that is not a comparison: ${message === '' ? run.status : message}`);
  }
  for (const mode of modes) {
    if (!caughtIn.has(mode)) problems.push(`the leak "${leak}" (${meaning}) was caught by no paired case with ${mode} players`);
  }
  if (runs.length === 0) problems.push(`the leak "${leak}" was tried on no paired case`);
  return { caughtBy, problems };
}

/**
 * The paired cases that claim two runs look the same to somebody and that no deliberate leak made
 * fail. Such a case has been seen to pass and never to notice anything, so it has not been shown
 * to watch what it says it watches. A case that only claims a difference is not asked: a leak adds
 * differences and cannot make it fail.
 */
export function unexercised(paired: readonly Scenario[], outcomes: readonly LeakOutcome[]): string[] {
  const caught = new Set(outcomes.flatMap(outcome => outcome.caughtBy.map(item => item.scenario)));
  const claimsSame = (scenario: Scenario): boolean => scenario.steps.some(step => (step.op === 'watch' && 'sameAsTwin' in step)
    || (step.op === 'assert' && step.checks.some(check => 'sameAsTwin' in check)));
  return paired.filter(scenario => claimsSame(scenario) && !caught.has(scenario.id)).map(scenario => scenario.id);
}
