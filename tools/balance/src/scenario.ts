import { ROLES_BY_MODE, isMode, seatIdsFor } from './model.js';
import type { Faction, Mode, Role, ScenarioSetup, SeatId } from './model.js';
import type { CommandOutcome } from './observation.js';

// A reference is '@Role' (resolved through the scenario's own setup) or a literal seat ID.
export type Ref = string;

export interface StepCommand {
  type: string;
  target?: Ref | null;
  targets?: Ref[];
  destination?: string;
  guess?: Faction;
  seats?: Ref[];
  approve?: boolean | null;
}

// REFUSED is the rules-level expectation "the engine must not accept this". Whether the refusal
// is a game rejection or a malformed-request error is an interface detail, not a rule.
export type Expectation = CommandOutcome | 'REFUSED';

export type Audiences = 'public' | 'all-players' | { players: Ref[] } | { allPlayersExcept: Ref[] };

export type Check =
  | { truth: Ref; field: string; equals: unknown }
  | { match: string; equals: unknown }
  | { public: Ref; field: string; equals: unknown }
  | { publicFact: string; equals?: unknown; sameSet?: Ref[] }
  | { tallyCount: Ref; equals: number }
  | { visible: Ref; field: string; equals?: unknown; sameSet?: Ref[]; includes?: Ref; excludes?: Ref }
  | { unchanged: { since: string; audiences: Audiences } }
  | { changed: { since: string; audiences: Audiences } }
  | { trace: { kinds: string[] } }
  | { traceTurns: { round: number; actives: Ref[] } }
  | { count: string; equals: number }
  // Paired runs. The scenario is run a second time, its twin, with one declared difference, and
  // what an audience can read at this point is compared between the two runs. "Same" is how a
  // secret is checked without knowing where an engine keeps it: if two matches that differ only in
  // the secret look the same to an audience, that audience cannot learn it. "Differs" is the
  // opposite: this audience is told something that depends on the difference.
  | { sameAsTwin: { audiences: Audiences } }
  | { differsFromTwin: { audiences: Audiences } };

export type Step =
  | { op: 'until'; round?: number; phase?: string; active?: Ref }
  | { op: 'expire'; times?: number }
  | { op: 'expireEarly'; beforeDeadlineMs: number }
  // `twin` is the command sent in its place in the twin run, with the same expected outcome.
  // `null` means that the twin run sends nothing there: the two runs differ in whether it was sent.
  | { op: 'command'; actor: Ref; command: StepCommand; expect: Expectation; at?: 'start' | 'deadline-1' | 'deadline'; twin?: StepCommand | null }
  | { op: 'probe'; actor: Ref; command: StepCommand; label: string }
  | { op: 'note'; label: string; match: string }
  | { op: 'mark'; name: string }
  | { op: 'abort' }
  | { op: 'createRejected' }
  | { op: 'assert'; checks: Check[] };

export type ScenarioStatus = 'ready' | 'blocked' | 'manual';
export type ScenarioGroup = 'mode-7' | 'mode-8' | 'mode-9' | 'unsupported';

// The five areas named by the assignment plus the areas the audit separates from them.
export const SCENARIO_AREAS = [
  'resources', 'phase-transitions', 'mode-setup', 'elimination', 'authorized-views',
  'movement', 'voting', 'resolution-order', 'victory', 'showdown', 'timing', 'operating-policy',
] as const;

export interface Scenario {
  id: string;
  group: ScenarioGroup;
  mode: Mode | null;
  title: string;
  status: ScenarioStatus;
  kind: string;
  areas: string[];
  // Rules the expectations are about.
  ruleRefs: string[];
  // Further rules the lead-up steps rely on, so that every scenario touched by a rule can be found.
  dependsOn: string[];
  lineage: string[];
  decisionIds: string[];
  optionalPowers: false;
  setup: ScenarioSetup | null;
  steps: Step[];
  note: string;
  twin?: TwinSetup;
}

// A twin run that differs in the setup, and in nothing else.
export type TwinSetup =
  // Two players change roles. Used to show that a fact does not give away who holds a role.
  | { swapRoles: [Role, Role] }
  // The Code has other numbers beside Alien's. Used to show that a fact does not give away the
  // Code, or whether an attempt at it was right.
  | { codeExtras: [SeatId, SeatId, SeatId] };

/** Whether the scenario is run twice and compared: a command with a twin, or a twin setup. */
export function hasTwin(scenario: Scenario): boolean {
  return scenario.twin !== undefined || scenario.steps.some(step => step.op === 'command' && step.twin !== undefined);
}

/** The setup of the twin run: the same setup, or the same with the one declared difference. */
export function twinSetup(scenario: Scenario, setup: ScenarioSetup): ScenarioSetup {
  if (scenario.twin === undefined) return setup;
  if ('codeExtras' in scenario.twin) return { ...setup, codeExtraSeatIds: [...scenario.twin.codeExtras] };
  const [first, second] = scenario.twin.swapRoles;
  return { ...setup, roleOrder: setup.roleOrder.map(role => (role === first ? second : role === second ? first : role)) };
}

function twinChecks(scenario: Scenario): { same: boolean; audiences: Audiences }[] {
  const out: { same: boolean; audiences: Audiences }[] = [];
  for (const step of scenario.steps) {
    if (step.op !== 'assert') continue;
    for (const check of step.checks) {
      if ('sameAsTwin' in check) out.push({ same: true, audiences: check.sameAsTwin.audiences });
      else if ('differsFromTwin' in check) out.push({ same: false, audiences: check.differsFromTwin.audiences });
    }
  }
  return out;
}

export const ARCHIVED_FIELD_NAMES = [
  'identifiedSeatId', 'identifiedPlayerId', 'identifiedFaction', 'guessedFaction',
  'thirdPlayerId', 'codePosition', 'orderedCode', 'heavyShot', 'surrender',
] as const;

export function validateSetup(setup: ScenarioSetup, mode: Mode): string[] {
  const issues: string[] = [];
  const seatIds = seatIdsFor(mode);
  if (setup.playerCount !== mode) issues.push(`playerCount ${setup.playerCount} does not match mode ${mode}`);
  const expected = ROLES_BY_MODE[mode];
  if (setup.roleOrder.length !== expected.length || new Set(setup.roleOrder).size !== expected.length
    || expected.some(role => !setup.roleOrder.includes(role))) {
    issues.push('roleOrder is not an exact permutation of the mode roles');
    return issues;
  }
  const rooms = Object.keys(setup.initialRooms);
  if (rooms.length !== mode || seatIds.some(seat => setup.initialRooms[seat] !== 'Room A' && setup.initialRooms[seat] !== 'Room B')) {
    issues.push('every seat needs an explicit Room A or Room B (V1-01)');
  }
  const seatOf = (role: Role): SeatId => seatIds[setup.roleOrder.indexOf(role)] as SeatId;
  const extras = setup.codeExtraSeatIds;
  if (extras.length !== 3 || new Set(extras).size !== 3
    || extras.some(seat => !seatIds.includes(seat) || seat === seatOf('Alien') || seat === seatOf('Undercover'))) {
    issues.push('Code extras must be three distinct seats other than Alien and Undercover');
  }
  if (setup.roundOrders.length !== 5 || setup.roundOrders.some(order =>
    order.length !== mode || new Set(order).size !== mode || order.some(seat => !seatIds.includes(seat)))) {
    issues.push('five complete turn-order permutations are required');
  }
  if (typeof setup.seed !== 'string' || setup.seed.length === 0) issues.push('a seed label is required');
  return issues;
}

function collectRefs(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    if (value.startsWith('@')) into.add(value.slice(1));
  } else if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, into);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) collectRefs(item, into);
  }
}

function hasExpectation(step: Step): boolean {
  return step.op === 'assert' || step.op === 'command' || step.op === 'createRejected' || step.op === 'expireEarly';
}

export function validateScenario(scenario: Scenario): string[] {
  const issues: string[] = [];
  const say = (message: string) => { issues.push(`${scenario.id}: ${message}`); };
  if (!/^V1-(M7|M8|M9|UX)-[A-Z]+-\d{2}[a-z]?$/.test(scenario.id)) say('identifier does not follow V1-<group>-<AREA>-<nn>');
  const expectedGroup = scenario.mode === null ? 'unsupported' : `mode-${scenario.mode}`;
  if (scenario.group !== expectedGroup) say(`group ${scenario.group} does not match mode ${String(scenario.mode)}`);
  if (scenario.mode !== null && !isMode(scenario.mode)) say('mode must be 7, 8 or 9');
  const prefix = scenario.mode === null ? 'V1-UX-' : `V1-M${scenario.mode}-`;
  if (!scenario.id.startsWith(prefix)) say('identifier prefix must name its own mode group');
  if (scenario.optionalPowers !== false) say('the base comparison keeps optional powers off');
  if (scenario.title.trim().length === 0) say('a title is required');
  if (scenario.areas.length === 0 || scenario.areas.some(area => !(SCENARIO_AREAS as readonly string[]).includes(area))) {
    say('areas must come from the fixed vocabulary');
  }
  const expectations = scenario.steps.filter(hasExpectation).length;
  const probes = scenario.steps.filter(step => step.op === 'probe' || step.op === 'note').length;
  if (scenario.dependsOn.some(id => scenario.ruleRefs.includes(id))) say('dependsOn must not repeat ruleRefs');
  if (scenario.status === 'ready') {
    if (scenario.ruleRefs.length === 0) say('a ready scenario needs at least one rule reference');
    if (scenario.decisionIds.length !== 0) say('a ready scenario cannot depend on an open decision');
    if (expectations === 0) say('a ready scenario needs at least one expectation');
    if (probes !== 0) say('probes belong to blocked scenarios only');
  } else if (scenario.status === 'blocked') {
    if (scenario.decisionIds.length === 0) say('a blocked scenario must name its open decision');
    // The expected result stays null: nothing in a blocked case may assert an outcome.
    // Commands that only bring the match to the undecided situation are prerequisites.
    if (scenario.steps.some(step => step.op === 'assert' || step.op === 'createRejected' || step.op === 'expireEarly')) say('a blocked scenario must not assert an outcome');
  } else if (scenario.status === 'manual') {
    if (scenario.steps.length !== 0) say('a manual scenario has no executable steps');
    if (scenario.ruleRefs.length === 0) say('a manual scenario needs a rule reference');
  } else say('unknown status');

  // Paired runs: a comparison needs a declared difference, and a declared difference needs a comparison.
  const compared = twinChecks(scenario);
  if (hasTwin(scenario) !== compared.length > 0) say(hasTwin(scenario) ? 'a twin run is declared and nothing is compared with it' : 'a comparison with a twin run needs a twin command or a twin setup');
  if (hasTwin(scenario) && scenario.status !== 'ready') say('only a ready scenario may have a twin run');
  if (scenario.twin !== undefined) {
    const twin = scenario.twin;
    const roles: readonly string[] = scenario.setup?.roleOrder ?? [];
    const setup = scenario.setup;
    // Players are told apart by seat, so that a seat written as a number is not overlooked.
    const seatsOf = (refs: Ref[], within: ScenarioSetup): SeatId[] => refs.filter(ref => !ref.startsWith('@') || roles.includes(ref.slice(1))).map(ref => resolveRef(ref, within));
    // Whether a comparison reaches one of the given players.
    const reaches = (audiences: Audiences, seats: SeatId[], within: ScenarioSetup): boolean => {
      if (audiences === 'public') return false;
      if (audiences === 'all-players') return true;
      if ('players' in audiences) return seats.some(seat => seatsOf(audiences.players, within).includes(seat));
      return seats.some(seat => !seatsOf(audiences.allPlayersExcept, within).includes(seat));
    };
    if (setup === null) say('a twin setup needs a setup');
    else if ('codeExtras' in twin) {
      const extras = twin.codeExtras;
      if (!Array.isArray(extras) || extras.length !== 3 || [...extras].sort().join() === [...setup.codeExtraSeatIds].sort().join()) say('a twin Code has three other numbers than the Code of this setup');
      else if (scenario.mode !== null && validateSetup(twinSetup(scenario, setup), scenario.mode).length > 0) say('the twin setup is not a legal setup');
      else if (roles.includes('Alien')) {
        // Alien knows the Code, so Alien may be told the two runs apart and nobody else may.
        const alien = [resolveRef('@Alien', setup)];
        if (compared.some(item => item.same && reaches(item.audiences, alien, setup))) say('a comparison with a twin Code must leave out Alien, who knows the Code');
      }
    } else {
      const [first, second] = twin.swapRoles;
      if (first === second || !roles.includes(first) || !roles.includes(second)) say('a twin setup swaps two different roles of this setup');
      else {
        if (scenario.mode !== null && validateSetup(twinSetup(scenario, setup), scenario.mode).length > 0) say('the twin setup is not a legal setup');
        // The two players who change roles are different people in the two runs: comparing them says nothing.
        const swapped = [resolveRef(`@${first}`, setup), resolveRef(`@${second}`, setup)];
        if (compared.some(item => reaches(item.audiences, swapped, setup))) say('a comparison with a twin setup must leave out the two players who change roles');
      }
    }
  }

  const createsRejected = scenario.steps.some(step => step.op === 'createRejected');
  if (scenario.setup === null) {
    if (scenario.steps.length !== 0) say('steps require a setup');
  } else if (scenario.mode !== null && !createsRejected) {
    for (const issue of validateSetup(scenario.setup, scenario.mode)) say(issue);
  }
  if (createsRejected && scenario.steps.length !== 1) say('createRejected must be the only step');

  const refs = new Set<string>();
  collectRefs(scenario.steps, refs);
  const roles: readonly string[] = scenario.setup?.roleOrder ?? [];
  for (const ref of refs) if (!roles.includes(ref)) say(`reference @${ref} is not a role in this setup`);

  // No current fixture may carry an archived mechanic, not even to show that it is refused.
  const text = JSON.stringify(scenario.steps);
  for (const name of ARCHIVED_FIELD_NAMES) {
    if (text.includes(`"${name}"`)) say(`archived mechanic field ${name} must not appear in a current fixture`);
  }
  return issues;
}

export function resolveRef(ref: Ref, setup: ScenarioSetup): SeatId {
  if (!ref.startsWith('@')) return ref;
  const index = setup.roleOrder.indexOf(ref.slice(1) as Role);
  if (index < 0) throw new Error(`Unknown role reference ${ref}`);
  return `seat-${index + 1}`;
}

export function resolveValue(value: unknown, setup: ScenarioSetup): unknown {
  if (typeof value === 'string') return value.startsWith('@') ? resolveRef(value, setup) : value;
  if (Array.isArray(value)) return value.map(item => resolveValue(item, setup));
  return value;
}
