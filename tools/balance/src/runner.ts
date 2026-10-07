import { canonicalJson, deepEqual, sameSet } from './model.js';
import type { Mode, ScenarioSetup, SeatId } from './model.js';
import { checkSetup, checkState, checkTransition, startLedger } from './invariants.js';
import type { Ledger, Violation } from './invariants.js';
import { payloadOf } from './observation.js';
import type { CommandOutcome, EngineAdapter, EngineMatch, NeutralCommand, Observation } from './observation.js';
import { hasTwin, resolveRef, resolveValue, twinSetup } from './scenario.js';
import type { Audiences, Check, Ref, Scenario, Step, StepCommand } from './scenario.js';

// Executes a declarative scenario through an engine adapter and compares what the engine did
// with the independently derived expectation. It never computes a game outcome itself.

export type RunStatus = 'passed' | 'failed' | 'blocked' | 'not-run';

export interface ScenarioRun {
  scenarioId: string;
  group: string;
  mode: Mode | null;
  status: RunStatus;
  reason: string | null;
  failure: { stepIndex: number; op: string; message: string } | null;
  invariantViolations: Violation[];
  probes: { label: string; outcome: string }[];
  decisionIds: string[];
  transitions: number;
  commands: number;
  finalDigest: string | null;
  seed: string | null;
}

class StepError extends Error {}

const MAX_EXPIRIES = 400;

interface Session {
  setup: ScenarioSetup;
  match: EngineMatch;
  ledger: Ledger;
  current: Observation;
  marks: Record<string, Observation>;
  trace: { round: number; phaseKind: string; activeSeat: SeatId | null }[];
  violations: Violation[];
  probes: { label: string; outcome: string }[];
  commandsInPhase: number;
  transitions: number;
  commands: number;
  // Paired runs. In the twin run every assert step records what was observable there and judges
  // nothing; in the main run `twinAt` holds those records, by step index, to compare with.
  stepIndex: number;
  recording: Map<number, Observation> | null;
  twinAt: Map<number, Observation> | null;
}

function neutralCommand(command: StepCommand, setup: ScenarioSetup): NeutralCommand {
  const out: NeutralCommand = { type: command.type };
  if (command.target !== undefined) out.target = command.target === null ? null : resolveRef(command.target, setup);
  if (command.targets !== undefined) out.targets = command.targets.map(ref => resolveRef(ref, setup));
  if (command.seats !== undefined) out.seats = command.seats.map(ref => resolveRef(ref, setup));
  if (command.destination !== undefined) out.destination = command.destination;
  if (command.guess !== undefined) out.guess = command.guess;
  if (command.approve !== undefined) out.approve = command.approve;
  return out;
}

function observe(session: Session, previous: Observation): void {
  const next = session.match.observe();
  if (next.phaseId !== previous.phaseId) {
    session.trace.push({ round: next.round, phaseKind: next.phaseKind, activeSeat: next.activeSeat });
    session.commandsInPhase = 0;
  }
  session.current = next;
}

function expire(session: Session): void {
  const before = session.current;
  if (before.phaseEndsAt === null) throw new StepError(`cannot expire the terminal phase ${before.phaseKind}`);
  const atMs = before.phaseEndsAt;
  const advanced = session.match.advance(atMs);
  observe(session, before);
  session.transitions += 1;
  session.violations.push(...checkTransition(session.setup, before, session.current, { kind: 'advance', atMs, advanced }, session.ledger));
  if (!advanced) throw new StepError(`${before.phaseKind} did not close at its deadline`);
}

function submit(session: Session, actorRef: Ref, command: StepCommand, at: 'start' | 'deadline-1' | 'deadline'): CommandOutcome {
  const before = session.current;
  const actor = resolveRef(actorRef, session.setup);
  const neutral = neutralCommand(command, session.setup);
  let atMs = before.phaseStartedAt;
  if (before.phaseEndsAt !== null) {
    if (at === 'deadline') atMs = before.phaseEndsAt;
    else if (at === 'deadline-1') atMs = before.phaseEndsAt - 1;
    else atMs = before.phaseStartedAt + 1_000 + Math.min(session.commandsInPhase, 50_000);
  }
  const outcome = session.match.command(actor, neutral, atMs);
  session.commandsInPhase += 1;
  session.commands += 1;
  observe(session, before);
  session.violations.push(...checkTransition(session.setup, before, session.current, { kind: 'command', actor, command: neutral, outcome }, session.ledger));
  return outcome;
}

function audienceSeats(audiences: Audiences, session: Session): { includePublic: boolean; players: SeatId[] } {
  const all = Object.keys(session.current.raw.players);
  if (audiences === 'public') return { includePublic: true, players: [] };
  if (audiences === 'all-players') return { includePublic: false, players: all };
  if ('players' in audiences) return { includePublic: false, players: audiences.players.map(ref => resolveRef(ref, session.setup)) };
  const excluded = audiences.allPlayersExcept.map(ref => resolveRef(ref, session.setup));
  return { includePublic: true, players: all.filter(seat => !excluded.includes(seat)) };
}

function changedSince(session: Session, since: string, audiences: Audiences): string[] {
  const mark = session.marks[since];
  if (mark === undefined) throw new StepError(`unknown mark ${since}`);
  return differing(mark, session.current, audiences, session);
}

// The audiences to whom two observations do not look the same: what they can read, or its revision.
function differing(one: Observation, other: Observation, audiences: Audiences, session: Session): string[] {
  const { includePublic, players } = audienceSeats(audiences, session);
  const out: string[] = [];
  if (includePublic && (payloadOf(one, 'public') !== payloadOf(other, 'public') || one.revisions.public !== other.revisions.public)) out.push('public');
  for (const seat of players) {
    if (payloadOf(one, seat) !== payloadOf(other, seat) || one.revisions.players[seat] !== other.revisions.players[seat]) out.push(seat);
  }
  return out;
}

function twinObservation(session: Session): Observation {
  const twin = session.twinAt?.get(session.stepIndex);
  if (twin === undefined) throw new StepError('this step has no twin run to compare with');
  return twin;
}

function compare(label: string, actual: unknown, check: { equals?: unknown; sameSet?: Ref[]; includes?: Ref; excludes?: Ref }, setup: ScenarioSetup): string | null {
  if (check.sameSet !== undefined) {
    const expected = check.sameSet.map(ref => resolveRef(ref, setup));
    return Array.isArray(actual) && sameSet(actual as string[], expected) ? null : `${label}: expected the set ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`;
  }
  if (check.includes !== undefined) {
    const wanted = resolveRef(check.includes, setup);
    return Array.isArray(actual) && actual.includes(wanted) ? null : `${label}: expected to include ${wanted}, observed ${JSON.stringify(actual)}`;
  }
  if (check.excludes !== undefined) {
    const unwanted = resolveRef(check.excludes, setup);
    return Array.isArray(actual) && !actual.includes(unwanted) ? null : `${label}: expected to exclude ${unwanted}, observed ${JSON.stringify(actual)}`;
  }
  const expected = resolveValue(check.equals, setup);
  return deepEqual(actual, expected) ? null : `${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`;
}

function visibleField(session: Session, seat: SeatId, field: string): unknown {
  const view = session.current.playerViews[seat];
  if (view === undefined) throw new StepError(`no player view for ${seat}`);
  const [name, argument] = field.split(':');
  const know = view.knowledge;
  const lastScan = know.scanResults[know.scanResults.length - 1];
  switch (name) {
    case 'role': return view.role;
    case 'ordinaryWeapons': return view.ordinaryWeapons;
    case 'rescuesRemaining': return view.rescuesRemaining;
    case 'pendingCount': return view.pendingCount;
    case 'hackPartner': return view.hackPartner;
    case 'ownBallot': return view.ownBallot;
    case 'hasVoted': return view.hasVoted;
    case 'codeAttemptAvailable': return view.codeAttemptAvailable;
    case 'releaseVoteAvailable': return view.releaseVoteAvailable;
    case 'moveDestinations': return [...view.moveDestinations].sort();
    case 'insiderCandidates': return know.insiderCandidates;
    case 'undercoverSeat': return know.undercoverSeat;
    case 'code': return know.code;
    case 'scanCount': return know.scanResults.length;
    case 'lastScanMatched': return lastScan?.matched ?? null;
    case 'lastScanInCode': return lastScan?.inCode ?? null;
    case 'protectionSeats': return know.protections.map(item => item.seat);
    // An engine that offers this player no such fact is not the same as one that names nobody.
    case 'armedBySupply': return know.armedBySupply ?? 'nothing: this engine tells the player nothing about it';
    case 'protectionState': {
      const entry = know.protections.find(item => item.seat === resolveRef(argument ?? '', session.setup));
      if (entry === undefined) return 'none';
      if (entry.consumed) return 'consumed';
      return entry.activeFromRound <= session.current.round ? 'active' : 'pending';
    }
    case 'legal': return view.legal[argument ?? ''] ?? [];
    case 'legalOffered': return view.legal[argument ?? ''] !== undefined;
    default: throw new StepError(`unknown visible field ${field}`);
  }
}

function matchValues(now: Observation): Record<string, unknown> {
  return {
    round: now.round, phase: now.phaseKind, terminal: now.terminal, active: now.activeSeat,
    winner: now.result?.winner ?? null, alienCoWinner: now.result?.alienCoWinner ?? null, hasResult: now.result !== null,
    codeSubmitted: now.truth.codeSubmitted, codeCorrect: now.truth.codeCorrect, releaseUsed: now.truth.releaseUsed,
    endRevealPresent: now.publicView.endReveal !== null,
    windowMs: now.phaseEndsAt === null ? null : now.phaseEndsAt - now.phaseStartedAt,
  };
}

function evaluate(check: Check, session: Session): string | null {
  const now = session.current;
  const setup = session.setup;
  if ('truth' in check) {
    const seat = resolveRef(check.truth, setup);
    const found = now.truth.seats.find(item => item.seat === seat) as unknown as Record<string, unknown> | undefined;
    if (found === undefined || !(check.field in found)) throw new StepError(`unknown truth field ${check.field}`);
    return compare(`truth ${check.truth}.${check.field}`, found[check.field], check, setup);
  }
  if ('match' in check) {
    const values = matchValues(now);
    if (!(check.match in values)) throw new StepError(`unknown match field ${check.match}`);
    return compare(`match ${check.match}`, values[check.match], check, setup);
  }
  if ('public' in check) {
    const seat = resolveRef(check.public, setup);
    const found = now.publicView.seats.find(item => item.seat === seat) as unknown as Record<string, unknown> | undefined;
    if (found === undefined || !(check.field in found)) throw new StepError(`unknown public field ${check.field}`);
    return compare(`public ${check.public}.${check.field}`, found[check.field], check, setup);
  }
  if ('publicFact' in check) {
    const facts = now.publicView;
    const values: Record<string, unknown> = {
      round: facts.round, phase: facts.phaseKind, active: facts.activeSeat,
      eligibleVoters: facts.eligibleVoters, eligibleTargets: facts.eligibleTargets, releaseTarget: facts.releaseTarget,
      endRevealPresent: facts.endReveal !== null, tallyKind: facts.lastTally?.kind ?? null, tallySelected: facts.lastTally?.selected ?? null,
      tallyEligibleVoterCount: facts.lastTally?.eligibleVoterCount ?? null, tallyReleased: facts.lastTally?.released ?? null,
      tallyYesCount: facts.lastTally?.yesCount ?? null,
    };
    if (!(check.publicFact in values)) throw new StepError(`unknown public fact ${check.publicFact}`);
    return compare(`public ${check.publicFact}`, values[check.publicFact], check, setup);
  }
  if ('tallyCount' in check) {
    const seat = resolveRef(check.tallyCount, setup);
    return compare(`tally count for ${check.tallyCount}`, now.publicView.lastTally?.counts[seat] ?? 0, check, setup);
  }
  if ('visible' in check) {
    return compare(`view of ${check.visible}: ${check.field}`, visibleField(session, resolveRef(check.visible, setup), check.field), check, setup);
  }
  if ('unchanged' in check) {
    const changed = changedSince(session, check.unchanged.since, check.unchanged.audiences);
    return changed.length === 0 ? null : `views changed since ${check.unchanged.since}: ${changed.join(', ')}`;
  }
  if ('changed' in check) {
    const { includePublic, players } = audienceSeats(check.changed.audiences, session);
    const changed = changedSince(session, check.changed.since, check.changed.audiences);
    const wanted = [...(includePublic ? ['public'] : []), ...players];
    const missing = wanted.filter(item => !changed.includes(item));
    return missing.length === 0 ? null : `views expected to change since ${check.changed.since} did not: ${missing.join(', ')}`;
  }
  if ('trace' in check) {
    const kinds = session.trace.map(item => item.phaseKind);
    return deepEqual(kinds, check.trace.kinds) ? null : `phase trace: expected ${check.trace.kinds.join(' ')}, observed ${kinds.join(' ')}`;
  }
  if ('traceTurns' in check) {
    const turns = session.trace.filter(item => item.phaseKind === 'ORDINARY_TURN' && item.round === check.traceTurns.round).map(item => item.activeSeat);
    const expected = check.traceTurns.actives.map(ref => resolveRef(ref, setup));
    return deepEqual(turns, expected) ? null : `Round ${check.traceTurns.round} turns: expected ${expected.join(',')}, observed ${turns.join(',')}`;
  }
  if ('sameAsTwin' in check) {
    const apart = differing(twinObservation(session), now, check.sameAsTwin.audiences, session);
    return apart.length === 0 ? null : `the twin run does not look the same to: ${apart.join(', ')}`;
  }
  if ('differsFromTwin' in check) {
    const { includePublic, players } = audienceSeats(check.differsFromTwin.audiences, session);
    const apart = differing(twinObservation(session), now, check.differsFromTwin.audiences, session);
    const alike = [...(includePublic ? ['public'] : []), ...players].filter(item => !apart.includes(item));
    return alike.length === 0 ? null : `the twin run looks exactly the same to: ${alike.join(', ')}`;
  }
  const seats = now.truth.seats;
  const counts: Record<string, number> = {
    eliminated: seats.filter(seat => seat.health === 'Eliminated').length,
    injured: seats.filter(seat => seat.health === 'Injured').length,
    jailed: seats.filter(seat => seat.jailed).length,
    finalZone: seats.filter(seat => seat.location === 'Final Zone').length,
    captains: seats.filter(seat => seat.captain).length,
    specialShots: seats.filter(seat => seat.specialShotAvailable).length,
    ordinaryWeapons: seats.reduce((sum, seat) => sum + seat.ordinaryWeapons, 0),
    hackPhases: session.trace.filter(item => item.phaseKind === 'HACK').length,
    showdownPhases: session.trace.filter(item => item.phaseKind === 'SHOWDOWN').length,
    electionPhases: session.trace.filter(item => item.phaseKind === 'CAPTAIN_ELECTION').length,
    releaseChoicePhases: session.trace.filter(item => item.phaseKind === 'RELEASE_CHOICE').length,
  };
  if (!(check.count in counts)) throw new StepError(`unknown count ${check.count}`);
  return counts[check.count] === check.equals ? null : `count ${check.count}: expected ${check.equals}, observed ${String(counts[check.count])}`;
}

function runStep(step: Step, session: Session): void {
  switch (step.op) {
    case 'until': {
      const wanted = step.active === undefined ? undefined : resolveRef(step.active, session.setup);
      const matches = () => (step.round === undefined || session.current.round === step.round)
        && (step.phase === undefined || session.current.phaseKind === step.phase)
        && (wanted === undefined || session.current.activeSeat === wanted);
      for (let expiries = 0; !matches(); expiries += 1) {
        if (session.current.terminal) throw new StepError(`the match ended (${session.current.phaseKind}) before reaching ${JSON.stringify(step)}`);
        if (expiries >= MAX_EXPIRIES) throw new StepError(`checkpoint ${JSON.stringify(step)} not reached within ${MAX_EXPIRIES} phases`);
        expire(session);
      }
      return;
    }
    case 'expire':
      for (let count = 0; count < (step.times ?? 1); count += 1) expire(session);
      return;
    case 'expireEarly': {
      const before = session.current;
      if (before.phaseEndsAt === null) throw new StepError('cannot test early closure of a terminal phase');
      const atMs = before.phaseEndsAt - step.beforeDeadlineMs;
      const advanced = session.match.advance(atMs);
      observe(session, before);
      session.violations.push(...checkTransition(session.setup, before, session.current, { kind: 'advance', atMs, advanced }, session.ledger));
      if (advanced) throw new StepError(`${before.phaseKind} closed ${step.beforeDeadlineMs} ms before its deadline`);
      return;
    }
    case 'command': {
      const outcome = submit(session, step.actor, step.command, step.at ?? 'start');
      const met = step.expect === 'REFUSED' ? outcome === 'NOT_ALLOWED' || outcome === 'INVALID' : outcome === step.expect;
      if (!met) throw new StepError(`${step.command.type} by ${step.actor}: expected ${step.expect}, engine returned ${outcome}`);
      return;
    }
    case 'probe':
      session.probes.push({ label: step.label, outcome: submit(session, step.actor, step.command, 'start') });
      return;
    case 'note':
      session.probes.push({ label: step.label, outcome: String(matchValues(session.current)[step.match] ?? 'unknown field') });
      return;
    case 'mark':
      session.marks[step.name] = session.current;
      return;
    case 'abort': {
      const before = session.current;
      session.match.abort(before.phaseStartedAt + 2_000);
      observe(session, before);
      session.violations.push(...checkTransition(session.setup, before, session.current, { kind: 'abort' }, session.ledger));
      return;
    }
    case 'assert': {
      // The twin run judges nothing. It keeps what was observable here for the main run to compare with.
      if (session.recording !== null) { session.recording.set(session.stepIndex, session.current); return; }
      const failures = step.checks.map(check => evaluate(check, session)).filter((message): message is string => message !== null);
      if (failures.length > 0) throw new StepError(failures.join('; '));
      return;
    }
    case 'createRejected':
      throw new StepError('createRejected is evaluated before a match exists');
  }
}

interface Pairing {
  // The steps to execute, when they are not the scenario's own: the twin run's.
  steps?: Step[];
  recording?: Map<number, Observation>;
  twinAt?: Map<number, Observation>;
}

function execute(scenario: Scenario, setup: ScenarioSetup, adapter: EngineAdapter, pairing: Pairing = {}): Omit<ScenarioRun, 'scenarioId' | 'group' | 'mode' | 'decisionIds' | 'seed'> {
  const steps = pairing.steps ?? scenario.steps;
  const base = { reason: null, invariantViolations: [] as Violation[], probes: [] as { label: string; outcome: string }[], transitions: 0, commands: 0, finalDigest: null as string | null };
  if (scenario.steps.some(step => step.op === 'createRejected')) {
    try {
      adapter.createMatch(setup, `scenario-${scenario.id}`);
    } catch {
      return { ...base, status: 'passed', failure: null };
    }
    return { ...base, status: 'failed', failure: { stepIndex: 0, op: 'createRejected', message: 'the engine accepted a setup that the rules do not allow' } };
  }
  let match: EngineMatch;
  let first: Observation;
  try {
    match = adapter.createMatch(setup, `scenario-${scenario.id}`);
    first = match.observe();
  } catch (error) {
    const failure = { stepIndex: -1, op: 'create', message: `the engine refused a legal setup: ${error instanceof Error ? error.message : String(error)}` };
    // A blocked case is never a pass and never a failure. Here it could not even be probed.
    if (scenario.status === 'blocked') return { ...base, status: 'blocked', failure, reason: `probe could not be completed: ${failure.message}` };
    return { ...base, status: 'failed', failure };
  }
  const session: Session = {
    setup, match, ledger: startLedger(first), current: first, marks: {},
    trace: [{ round: first.round, phaseKind: first.phaseKind, activeSeat: first.activeSeat }],
    violations: [...checkSetup(setup, first)], probes: [], commandsInPhase: 0, transitions: 0, commands: 0,
    stepIndex: 0, recording: pairing.recording ?? null, twinAt: pairing.twinAt ?? null,
  };
  session.violations.push(...checkState(setup, first, session.ledger));
  let failure: ScenarioRun['failure'] = null;
  for (let index = 0; index < steps.length && failure === null; index += 1) {
    const step = steps[index] as Step;
    session.stepIndex = index;
    try {
      runStep(step, session);
    } catch (error) {
      if (!(error instanceof StepError)) {
        failure = { stepIndex: index, op: step.op, message: `adapter or engine error: ${error instanceof Error ? error.message : String(error)}` };
      } else failure = { stepIndex: index, op: step.op, message: error.message };
    }
  }
  const finalDigest = canonicalJson({ truth: session.current.truth, result: session.current.result, round: session.current.round, phase: session.current.phaseKind });
  const done = { invariantViolations: session.violations, probes: session.probes, transitions: session.transitions, commands: session.commands, finalDigest, reason: null };
  if (scenario.status === 'blocked') {
    // A blocked case is never a pass. Probes only record what the engine currently does.
    return { ...done, status: 'blocked', failure, reason: failure === null ? null : `probe could not be completed: ${failure.message}` };
  }
  if (failure === null && session.violations.length > 0) {
    const firstViolation = session.violations[0] as Violation;
    failure = { stepIndex: -1, op: 'invariant', message: `${firstViolation.invariant}: ${firstViolation.message}` };
  }
  return { ...done, status: failure === null ? 'passed' : 'failed', failure };
}

/**
 * Run one scenario. Without an adapter nothing is executed and nothing is reported as passed.
 * A ready scenario is executed twice from the same recorded inputs; differing end states fail.
 */
export function runScenario(scenario: Scenario, adapter: EngineAdapter | null, unavailableReason: string): ScenarioRun {
  const head = { scenarioId: scenario.id, group: scenario.group, mode: scenario.mode, decisionIds: scenario.decisionIds, seed: scenario.setup?.seed ?? null };
  const idle = { failure: null, invariantViolations: [], probes: [], transitions: 0, commands: 0, finalDigest: null };
  if (scenario.status === 'manual') return { ...head, ...idle, status: 'not-run', reason: 'manual: needs human or user-interface evidence, not an engine run' };
  if (adapter === null || scenario.setup === null) {
    return scenario.status === 'blocked'
      ? { ...head, ...idle, status: 'blocked', reason: scenario.setup === null ? 'awaiting an owner decision; no probe is defined' : `awaiting an owner decision; probes not run: ${unavailableReason}` }
      : { ...head, ...idle, status: 'not-run', reason: unavailableReason };
  }
  // A paired scenario is run as its twin first: the same steps with the declared difference. The
  // twin must itself be a clean run, or there is nothing sound to compare with.
  const pairing: Pairing = {};
  if (hasTwin(scenario)) {
    const recording = new Map<number, Observation>();
    const steps = scenario.steps.map(step => (step.op === 'command' && step.twin !== undefined ? { ...step, command: step.twin } : step));
    const twin = execute(scenario, twinSetup(scenario, scenario.setup), adapter, { steps, recording });
    if (twin.status !== 'passed') {
      const failure = { stepIndex: twin.failure?.stepIndex ?? -1, op: 'twin', message: `the twin run could not be completed: ${twin.failure?.message ?? twin.status}` };
      return { ...head, ...twin, status: 'failed', failure, finalDigest: null };
    }
    pairing.twinAt = recording;
  }
  const first = execute(scenario, scenario.setup, adapter, pairing);
  if (scenario.status === 'ready' && first.status === 'passed' && first.finalDigest !== null) {
    const second = execute(scenario, scenario.setup, adapter, pairing);
    if (second.finalDigest !== first.finalDigest || second.status !== 'passed') {
      return { ...head, ...first, status: 'failed', failure: { stepIndex: -1, op: 'replay', message: 'INV-DET-01: replaying the same recorded inputs produced a different end state' } };
    }
  }
  return { ...head, ...first };
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
}

export function summarize(runs: readonly ScenarioRun[]): RunSummary {
  const count = (status: RunStatus) => runs.filter(run => run.status === status).length;
  return { total: runs.length, passed: count('passed'), failed: count('failed'), blocked: count('blocked'), notRun: count('not-run') };
}
