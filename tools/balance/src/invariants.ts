import { ROLES_BY_MODE, canonicalJson, deepEqual, factionOf, isMode, sameSet, seatIdsFor } from './model.js';
import type { Faction, Role, ScenarioSetup, SeatId } from './model.js';
import { expectedCode } from './prng.js';
import { payloadOf } from './observation.js';
import type { CommandOutcome, NeutralCommand, Observation, PlayerFacts } from './observation.js';

// Invariants derived from docs/balance/game-rules.md. They are independent assertions about
// an engine's observable behaviour. They do not compute what a transition should produce.
// The catalogue with rule references is docs/balance/invariants.md.

export type TransitionEvent =
  | { kind: 'create' }
  | { kind: 'command'; actor: SeatId; command: NeutralCommand; outcome: CommandOutcome }
  | { kind: 'advance'; atMs: number; advanced: boolean }
  | { kind: 'abort' };

export interface Violation {
  invariant: string;
  message: string;
}

export interface Ledger {
  ordinaryShots: Record<SeatId, number>;
  specialShots: Record<SeatId, number>;
  movesThisRound: Record<SeatId, number>;
  hackRequests: Record<SeatId, number>;
  hackRequestsThisRound: number;
  scansThisRound: number;
  codeAttempts: number;
  disables: Record<SeatId, number>;
  rescues: number;
  protectionsByRecipient: Record<SeatId, number>;
  supplies: number;
  mainActionsThisRound: Record<SeatId, number>;
  shotsThisRound: Record<SeatId, number>;
  turnsThisRound: SeatId[];
  roundOfCounters: number;
  showdowns: number;
  phaseKinds: string[];
}

export function newLedger(): Ledger {
  return {
    ordinaryShots: {}, specialShots: {}, movesThisRound: {}, hackRequests: {}, hackRequestsThisRound: 0,
    scansThisRound: 0, codeAttempts: 0, disables: {}, rescues: 0, protectionsByRecipient: {}, supplies: 0,
    mainActionsThisRound: {}, shotsThisRound: {}, turnsThisRound: [], roundOfCounters: 1, showdowns: 0, phaseKinds: [],
  };
}

const LIVE_PHASES = ['ORDINARY_TURN', 'HACK', 'CAPTAIN_ELECTION', 'RELEASE_CHOICE', 'RELEASE_VOTE', 'JAIL_VOTE', 'SHOWDOWN'];
const TERMINAL_PHASES = ['FINISHED', 'ABORTED'];
const NEXT_PHASES: Readonly<Record<string, readonly string[]>> = {
  ORDINARY_TURN: ['ORDINARY_TURN', 'HACK', 'RELEASE_CHOICE', 'JAIL_VOTE'],
  HACK: ['ORDINARY_TURN', 'RELEASE_CHOICE', 'JAIL_VOTE'],
  RELEASE_CHOICE: ['RELEASE_VOTE', 'JAIL_VOTE'],
  RELEASE_VOTE: ['JAIL_VOTE'],
  // The last two entries occur only when no player can take a turn in the next round.
  JAIL_VOTE: ['CAPTAIN_ELECTION', 'ORDINARY_TURN', 'SHOWDOWN', 'FINISHED', 'RELEASE_CHOICE', 'JAIL_VOTE'],
  CAPTAIN_ELECTION: ['CAPTAIN_ELECTION', 'ORDINARY_TURN', 'RELEASE_CHOICE', 'JAIL_VOTE'],
  SHOWDOWN: ['FINISHED'],
  FINISHED: [],
  ABORTED: [],
};
// Commands whose acceptance must stay invisible to everyone except the actor (R-VIEW-07).
const HIDDEN_COMMANDS = [
  'REGISTER_SHOT', 'DISABLE', 'PROTECT', 'RESCUE', 'SUPPLY', 'SCAN', 'REQUEST_HACK', 'SUBMIT_CODE',
  'VOTE', 'RELEASE_VOTE', 'RELEASE_CHOICE', 'SHOWDOWN_SHOT',
];
const MAIN_ACTIONS = ['DISABLE', 'PROTECT', 'RESCUE', 'SUPPLY', 'SCAN'];
const ROLE_NAMES: readonly string[] = ROLES_BY_MODE[9];
const FORBIDDEN_PUBLIC_KEYS = [
  'role', 'roles', 'faction', 'self', 'knowledge', 'legalTargets', 'ownPendingCommandIds', 'ownBallot',
  'ordinaryWeapons', 'weapon', 'weapons', 'protection', 'protections', 'code', 'ballots', 'queued',
];

function startingWeapons(setup: ScenarioSetup): number {
  return setup.roleOrder.includes('Officer') ? 2 : 1;
}

function bump(record: Record<SeatId, number>, seat: SeatId): number {
  const next = (record[seat] ?? 0) + 1;
  record[seat] = next;
  return next;
}

function scanPublicPayload(value: unknown, path: string, terminal: boolean, out: Violation[]): void {
  if (value === null || typeof value !== 'object') {
    // A role name may appear only as the revealed faction of the unique Alien.
    if (!terminal && typeof value === 'string' && ROLE_NAMES.includes(value) && !path.endsWith('.revealedFaction')) {
      out.push({ invariant: 'INV-VIEW-01', message: `public payload names a role at ${path}` });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => { scanPublicPayload(item, `${path}[${index}]`, terminal, out); });
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_PUBLIC_KEYS.includes(key)) out.push({ invariant: 'INV-VIEW-01', message: `public payload carries the private key ${path}.${key}` });
    if (key === 'endReveal') continue;
    scanPublicPayload(item, `${path}.${key}`, terminal, out);
  }
}

function knowledgeViolations(view: PlayerFacts, role: Role, observation: Observation, setup: ScenarioSetup): Violation[] {
  const out: Violation[] = [];
  const seatIds = seatIdsFor(setup.playerCount);
  const seatOf = (wanted: Role): SeatId => seatIds[setup.roleOrder.indexOf(wanted)] as SeatId;
  const know = view.knowledge;
  const fail = (message: string) => { out.push({ invariant: 'INV-VIEW-02', message: `${view.seat} (${role}): ${message}` }); };
  if (view.role !== role) fail('own role differs from the dealt role');
  if (role === 'Insider') {
    if (!sameSet(know.insiderCandidates, [seatOf('Undercover'), seatOf('Alien'), seatOf('Cracker')])) fail('Insider candidates are not exactly Undercover, Alien and Cracker');
  } else if (know.insiderCandidates.length !== 0) fail('Insider knowledge given to another role');
  if (role === 'Hacker') {
    if (know.undercoverSeat !== seatOf('Undercover')) fail('Hacker does not know the Undercover');
  } else {
    // Undercover knows their own seat; showing it to them is not a disclosure.
    if (know.undercoverSeat !== null && !(role === 'Undercover' && know.undercoverSeat === view.seat)) fail('Undercover identity given to a role other than Hacker');
    if (know.scanResults.length !== 0) fail('Scan results given to a role other than Hacker');
  }
  if (role === 'Alien') {
    if (!sameSet(know.code, observation.truth.code)) fail('Alien does not hold the exact Code');
  } else if (know.code.length !== 0) fail('Code given to a role other than Alien');
  if (role !== 'Undercover' && know.protections.length !== 0) fail('Protection knowledge given to a role other than Undercover');
  if (role !== 'Supplier' && know.armedBySupply !== null && know.armedBySupply.length !== 0) fail('whom Supplier armed is given to a role other than Supplier');
  for (const scan of know.scanResults) {
    if (scan.matched !== (scan.inCode !== null)) fail('a failed Scan must carry no membership and a correct one must carry it');
    if (scan.inCode !== null && scan.inCode !== observation.truth.code.includes(scan.target)) fail('Scan membership disagrees with the Code');
  }
  return out;
}

/** State invariants that must hold at every observable point of a match. */
export function checkState(setup: ScenarioSetup, observation: Observation, ledger: Ledger): Violation[] {
  const out: Violation[] = [];
  const fail = (invariant: string, message: string) => { out.push({ invariant, message }); };
  const seats = observation.truth.seats;
  const live = LIVE_PHASES.includes(observation.phaseKind);
  const finished = observation.phaseKind === 'FINISHED';

  if (!Number.isInteger(observation.round) || observation.round < 1 || observation.round > 5) fail('INV-PH-01', `round ${observation.round} is outside 1..5`);
  if (!live && !TERMINAL_PHASES.includes(observation.phaseKind)) fail('INV-PH-02', `unknown phase kind ${observation.phaseKind}`);
  if (live && (observation.phaseEndsAt === null || observation.phaseEndsAt - observation.phaseStartedAt !== 60_000)) fail('INV-PH-03', `${observation.phaseKind} is not a 60-second window`);
  if (!live && observation.phaseEndsAt !== null) fail('INV-PH-03', 'a terminal phase carries a deadline');
  if (observation.terminal !== !live) fail('INV-PH-06', 'terminal flag disagrees with the phase kind');

  let weapons = 0;
  for (const seat of seats) {
    weapons += seat.ordinaryWeapons;
    if (seat.ordinaryWeapons < 0) fail('INV-RES-01', `${seat.seat} holds a negative weapon count`);
    if (seat.rescuesRemaining < 0 || seat.rescuesRemaining > (seat.role === 'Cracker' ? 2 : 0)) fail('INV-RES-01', `${seat.seat} rescue count out of bounds`);
    if (seat.faction !== factionOf(seat.role)) fail('INV-SET-01', `${seat.seat} faction does not follow its role`);
    if (seat.captain && (seat.health !== 'Healthy' || seat.jailed)) fail('INV-LOC-01', `${seat.seat} keeps the Captain title while Injured, Jailed or Eliminated`);
    if (seat.location === 'Command Room' && !seat.captain) fail('INV-LOC-01', `${seat.seat} is in Command Room without being Captain`);
    if (seat.location === 'Final Zone' && observation.round !== 5) fail('INV-LOC-03', `${seat.seat} is in Final Zone before Round 5`);
    // Special shots are granted when the showdown opens (R-SHOW-02). A player eliminated during
    // its resolution may leave an unused shot behind; that is not a grant to an Eliminated player.
    if (seat.health === 'Eliminated' && seat.captain) fail('INV-EL-03', `${seat.seat} is Eliminated but keeps the Captain title`);
    if (seat.health === 'Eliminated' && seat.specialShotAvailable && observation.phaseKind === 'SHOWDOWN') fail('INV-EL-03', `${seat.seat} was Eliminated before the showdown but holds a special shot`);
    if (seat.protection !== 'none' && !seat.lifetimeProtectionReceived) fail('INV-RES-05', `${seat.seat} holds Protection without a recorded lifetime receipt`);
  }
  if (observation.truth.hacksThisRound < 0 || observation.truth.hacksThisRound > 2) fail('INV-RES-04', 'more than two Hack conversations in a round');
  const fired = Object.values(ledger.ordinaryShots).reduce((sum, count) => sum + count, 0);
  if (weapons + fired > startingWeapons(setup) + 2) fail('INV-RES-03', `ordinary weapons in play (${weapons} held + ${fired} fired) exceed the starting grants plus two Supplier weapons`);
  if (seats.filter(seat => seat.captain).length > 1) fail('INV-LOC-01', 'more than one Captain');

  const showdownPlacement = seats.some(seat => seat.location === 'Final Zone');
  for (const seat of seats) {
    if (seat.health === 'Eliminated') continue;
    if (observation.phaseKind === 'SHOWDOWN') {
      if (seat.location !== 'Final Zone') fail('INV-LOC-02', `${seat.seat} is not in Final Zone during the showdown`);
    } else if (!showdownPlacement) {
      if (seat.jailed && seat.location !== 'Jail') fail('INV-LOC-02', `${seat.seat} is Jailed but located in ${seat.location}`);
      if (!seat.jailed && seat.health === 'Injured' && seat.location !== 'Hospital') fail('INV-LOC-02', `${seat.seat} is Injured but located in ${seat.location}`);
      if (!seat.jailed && seat.health === 'Healthy' && !['Room A', 'Room B', 'Command Room'].includes(seat.location)) fail('INV-LOC-02', `${seat.seat} is Healthy and free but located in ${seat.location}`);
    }
  }

  // Authorized views.
  const facts = observation.publicView;
  scanPublicPayload(observation.raw.public, 'public', finished, out);
  for (const seat of seats) {
    const shown = facts.seats.find(item => item.seat === seat.seat);
    if (shown === undefined) { fail('INV-VIEW-06', `${seat.seat} is missing from the public view`); continue; }
    if (shown.health !== seat.health || shown.location !== seat.location || shown.jailed !== seat.jailed || shown.captain !== seat.captain) {
      fail('INV-VIEW-06', `${seat.seat} public status disagrees with authoritative state`);
    }
    if (seat.health === 'Eliminated' ? shown.revealedFaction !== seat.faction : (!finished && shown.revealedFaction !== null)) {
      fail('INV-EL-04', `${seat.seat} faction reveal does not match its elimination status`);
    }
    if (seat.health === 'Eliminated' && (facts.eligibleVoters.includes(seat.seat) || facts.eligibleTargets.includes(seat.seat))) {
      fail('INV-EL-03', `${seat.seat} is Eliminated but listed as an eligible voter or target`);
    }
    const view = observation.playerViews[seat.seat];
    if (view === undefined) { fail('INV-VIEW-06', `${seat.seat} has no player view`); continue; }
    if (!deepEqual(view.publicFacts, facts)) fail('INV-VIEW-06', `${seat.seat} sees public facts that differ from the public view`);
    if (view.ordinaryWeapons !== seat.ordinaryWeapons || view.rescuesRemaining !== seat.rescuesRemaining) fail('INV-VIEW-02', `${seat.seat} sees own resources that differ from authoritative state`);
    out.push(...knowledgeViolations(view, seat.role, observation, setup));
  }
  // Whether an aborted match reveals roles is not stated by V1-12, so only live and finished
  // phases are constrained here.
  if (live && facts.endReveal !== null) fail('INV-VIEW-07', 'exact roles and Code were made public before the match ended');
  if (finished && facts.endReveal === null) fail('INV-VIEW-07', 'a finished match must make exact roles and the Code public');
  if (facts.endReveal !== null) {
    const roles = facts.endReveal.roles;
    if (roles.length !== seats.length || seats.some(seat => roles.find(item => item.seat === seat.seat)?.role !== seat.role)) fail('INV-VIEW-07', 'end reveal roles differ from the dealt roles');
    if (!sameSet(facts.endReveal.code, observation.truth.code)) fail('INV-VIEW-07', 'end reveal Code differs from the match Code');
  }

  // Result.
  const result = observation.result;
  if ((result !== null) !== finished) fail('INV-WIN-01', 'a result must exist exactly when the match is finished');
  if (result !== null) {
    const healthy = (faction: Faction) => seats.some(seat => seat.faction === faction && seat.health === 'Healthy');
    const allOut = (faction: Faction) => seats.filter(seat => seat.faction === faction).every(seat => seat.health === 'Eliminated');
    const alienAlive = seats.some(seat => seat.faction === 'Alien' && seat.health !== 'Eliminated');
    if (result.alienCoWinner && result.winner !== 'Blue') fail('INV-WIN-01', 'Alien co-win recorded without a Blue win');
    if (result.winner === 'Blue' && !healthy('Blue')) fail('INV-WIN-02', 'Blue won without a Healthy Blue member');
    if (result.winner === 'Blue' && result.alienCoWinner !== alienAlive) fail('INV-WIN-02', 'Alien co-win flag does not follow Alien survival');
    if (result.winner === 'Red' && !healthy('Red')) fail('INV-WIN-02', 'Red won without a Healthy Red member');
    if (result.winner === 'Alien' && !(allOut('Blue') && allOut('Red') && alienAlive)) fail('INV-WIN-02', 'Alien solo win without both factions eliminated');
    if (result.winner === 'Draw' && ledger.showdowns === 0) fail('INV-WIN-03', 'Draw recorded without a final showdown');
    if (observation.round !== 5 && (result.winner === 'Draw' || (result.winner === 'Blue' && !allOut('Red')) || (result.winner === 'Red' && !allOut('Blue')))) {
      fail('INV-WIN-03', 'a Code, Power or Draw result before the end of Round 5');
    }
  }
  return out;
}

/** Legal mode setup, checked once on the first observation. */
export function checkSetup(setup: ScenarioSetup, observation: Observation): Violation[] {
  const out: Violation[] = [];
  const fail = (invariant: string, message: string) => { out.push({ invariant, message }); };
  const seats = observation.truth.seats;
  const seatIds = seatIdsFor(setup.playerCount);
  if (!isMode(setup.playerCount)) { fail('INV-SET-01', 'unsupported player count accepted'); return out; }
  const expected = ROLES_BY_MODE[setup.playerCount];
  const dealt = seats.map(seat => seat.role);
  if (seats.length !== setup.playerCount || !sameSet(dealt, expected)) fail('INV-SET-01', 'dealt roles are not exactly the roles of this mode');
  seats.forEach((seat, index) => {
    if (seat.seat !== seatIds[index] || seat.role !== setup.roleOrder[index]) fail('INV-SET-01', `${seat.seat} does not hold the recorded role`);
    if (seat.health !== 'Healthy' || seat.jailed || seat.captain) fail('INV-SET-04', `${seat.seat} does not start Healthy, free and without a title`);
    if (seat.location !== setup.initialRooms[seat.seat]) fail('INV-SET-04', `${seat.seat} does not start in its chosen room`);
    const weapons = seat.role === 'Undercover' || seat.role === 'Officer' ? 1 : 0;
    if (seat.ordinaryWeapons !== weapons) fail('INV-SET-04', `${seat.seat} (${seat.role}) starts with ${seat.ordinaryWeapons} ordinary weapons, expected ${weapons}`);
    if (seat.rescuesRemaining !== (seat.role === 'Cracker' ? 2 : 0)) fail('INV-SET-04', `${seat.seat} starts with the wrong Rescue count`);
    if (seat.officerShotSpent || seat.disablerSpent || seat.hackUsed || seat.lifetimeProtectionReceived || seat.protection !== 'none' || seat.specialShotAvailable) {
      fail('INV-SET-04', `${seat.seat} starts with a spent or granted resource`);
    }
  });
  const code = observation.truth.code;
  if (code.length !== 4 || new Set(code).size !== 4 || !sameSet(code, expectedCode(setup))) fail('INV-SET-02', 'Code is not the recorded four-seat set');
  const alien = seats.find(seat => seat.role === 'Alien');
  const undercover = seats.find(seat => seat.role === 'Undercover');
  if (alien === undefined || undercover === undefined || !code.includes(alien.seat) || code.includes(undercover.seat)) fail('INV-SET-02', 'Code must include Alien and exclude Undercover');
  if (observation.round !== 1 || observation.phaseKind !== 'ORDINARY_TURN') fail('INV-SET-04', 'a match must open on a Round 1 ordinary turn');
  if (observation.activeSeat !== setup.roundOrders[0]?.[0]) fail('INV-SET-04', 'the first turn does not follow the recorded Round 1 order');
  if (observation.truth.codeSubmitted || observation.truth.releaseUsed) fail('INV-SET-04', 'a match-wide resource starts spent');
  return out;
}

// What changed for each audience: its view, or anything else it can read beside the view.
function changedAudiences(prev: Observation, next: Observation): { public: boolean; players: SeatId[] } {
  const players = Object.keys(next.raw.players).filter(seat => payloadOf(prev, seat) !== payloadOf(next, seat));
  return { public: payloadOf(prev, 'public') !== payloadOf(next, 'public'), players };
}

/** Transition invariants. Updates the ledger with what the event did. */
export function checkTransition(
  setup: ScenarioSetup, prev: Observation, next: Observation, event: TransitionEvent, ledger: Ledger,
): Violation[] {
  const out: Violation[] = [];
  const fail = (invariant: string, message: string) => { out.push({ invariant, message }); };
  const phaseChanged = prev.phaseId !== next.phaseId;
  const resolved = phaseChanged && (prev.phaseKind === 'JAIL_VOTE' || prev.phaseKind === 'SHOWDOWN');
  const changed = changedAudiences(prev, next);
  const ownChoiceClosed = phaseChanged && event.kind === 'command' && event.outcome === 'REGISTERED'
    && event.command.type === 'RELEASE_CHOICE' && prev.phaseKind === 'RELEASE_CHOICE';

  if (prev.terminal && (phaseChanged || canonicalJson(prev.truth) !== canonicalJson(next.truth) || changed.public || changed.players.length > 0)) {
    fail('INV-PH-06', 'state changed after the match ended');
  }
  if (next.round < prev.round || next.round > prev.round + 1) fail('INV-PH-02', `round moved from ${prev.round} to ${next.round}`);
  if (next.round !== prev.round && prev.phaseKind !== 'JAIL_VOTE') fail('INV-PH-02', 'the round advanced outside end-of-round resolution');
  if (phaseChanged) {
    const allowed = event.kind === 'abort' ? ['ABORTED'] : (NEXT_PHASES[prev.phaseKind] ?? []);
    if (!allowed.includes(next.phaseKind)) fail('INV-PH-02', `illegal phase transition ${prev.phaseKind} -> ${next.phaseKind}`);
    // Votes, turns and the showdown close only at their deadline. Whether the Captain's choice
    // closes its own window at once is undecided (R-FLOW-09, D17), so that one case is left alone.
    if (event.kind === 'command' && !ownChoiceClosed) fail('INV-PH-02', 'a command changed the phase; phases close only at their deadline');
    if (event.kind === 'advance' && next.phaseStartedAt !== event.atMs) fail('INV-PH-03', 'the next phase does not start at the actual transition time');
    // R-FLOW-13 (reading D37): a window opens only when someone can use it.
    if (next.phaseKind === 'CAPTAIN_ELECTION' && next.publicView.eligibleTargets.length === 0) fail('INV-PH-07', 'a Captain election opened with no eligible candidate');
    if (next.phaseKind === 'RELEASE_CHOICE' && prev.phaseKind !== 'RELEASE_CHOICE'
      && (next.truth.releaseUsed || !next.truth.seats.some(seat => seat.captain) || !next.truth.seats.some(seat => seat.jailed))) {
      fail('INV-PH-07', 'a release choice opened that the Captain could not use');
    }
    if (next.phaseKind === 'SHOWDOWN') {
      ledger.showdowns += 1;
      if (ledger.showdowns > 1 || prev.round !== 5 || prev.phaseKind !== 'JAIL_VOTE') fail('INV-PH-05', 'the showdown may follow only normal Round 5 resolution, once');
    }
  }
  if (event.kind === 'advance' && event.advanced !== phaseChanged) fail('INV-PH-02', 'advance result disagrees with the observed phase');
  if (event.kind === 'advance' && prev.phaseEndsAt !== null && event.atMs < prev.phaseEndsAt && phaseChanged) fail('INV-PH-03', 'a phase closed before its deadline');

  // Every non-eliminated player takes exactly one ordinary turn per round, in recorded order.
  if (phaseChanged && prev.phaseKind === 'JAIL_VOTE') {
    const order = setup.roundOrders[prev.round - 1] ?? [];
    const expected = order.filter(seat => prev.truth.seats.find(item => item.seat === seat)?.health !== 'Eliminated');
    if (!deepEqual(ledger.turnsThisRound, expected)) fail('INV-PH-04', `Round ${prev.round} turns ${ledger.turnsThisRound.join(',')} differ from the recorded order of non-eliminated players ${expected.join(',')}`);
  }

  for (const after of next.truth.seats) {
    const before = prev.truth.seats.find(item => item.seat === after.seat);
    if (before === undefined) { fail('INV-SET-01', `${after.seat} appeared mid-match`); continue; }
    if (before.role !== after.role || before.faction !== after.faction) fail('INV-SET-01', `${after.seat} changed role or faction`);
    if (before.health !== after.health) {
      const step = `${before.health}->${after.health}`;
      if (before.health === 'Eliminated') fail('INV-EL-01', `${after.seat} left Eliminated`);
      else if (!resolved) fail('INV-EL-02', `${after.seat} changed health (${step}) outside a resolution stage`);
      else if (step === 'Injured->Healthy' && prev.phaseKind === 'SHOWDOWN') fail('INV-EL-02', `${after.seat} was healed during the showdown`);
    }
    if (before.jailed !== after.jailed) {
      const expectedPhase = after.jailed ? 'JAIL_VOTE' : 'RELEASE_VOTE';
      if (!phaseChanged || prev.phaseKind !== expectedPhase) fail('INV-JAIL-01', `${after.seat} Jail status changed outside the closure of ${expectedPhase}`);
    }
    if (!before.captain && after.captain && !(phaseChanged && prev.phaseKind === 'CAPTAIN_ELECTION')) fail('INV-CAPT-01', `${after.seat} became Captain outside an election`);
    if (before.location !== after.location && !phaseChanged) {
      const moved = event.kind === 'command' && event.outcome === 'REGISTERED' && event.command.type === 'MOVE' && event.actor === after.seat;
      if (!moved) fail('INV-MOVE-01', `${after.seat} changed location without its own accepted move or a phase closure`);
      else if (!['Room A', 'Room B', 'Command Room'].includes(after.location)) fail('INV-MOVE-01', `${after.seat} moved voluntarily to ${after.location}`);
    }
    if ((before.officerShotSpent && !after.officerShotSpent) || (before.disablerSpent && !after.disablerSpent)
      || (before.hackUsed && !after.hackUsed) || (before.lifetimeProtectionReceived && !after.lifetimeProtectionReceived)) {
      fail('INV-RES-02', `${after.seat} regained a spent resource`);
    }
    if (after.rescuesRemaining > before.rescuesRemaining) fail('INV-RES-02', `${after.seat} regained a Rescue`);
    if (before.protection === 'consumed' && after.protection !== 'consumed') fail('INV-RES-05', `${after.seat} Protection returned after consumption`);
    if (after.ordinaryWeapons > before.ordinaryWeapons && !(resolved && prev.round === 3 && prev.phaseKind === 'JAIL_VOTE')) fail('INV-RES-03', `${after.seat} gained a weapon outside Round 3 Supplier distribution`);
  }
  if ((prev.truth.codeSubmitted && !next.truth.codeSubmitted) || (prev.truth.releaseUsed && !next.truth.releaseUsed)) fail('INV-RES-02', 'a match-wide one-use resource was restored');

  // Audience revisions and noninterference.
  if (next.revisions.public < prev.revisions.public) fail('INV-VIEW-04', 'public revision decreased');
  if ((next.revisions.public !== prev.revisions.public) !== changed.public) fail('INV-VIEW-04', 'public revision does not track public content');
  for (const seat of Object.keys(next.raw.players)) {
    const before = prev.revisions.players[seat] ?? 0;
    const after = next.revisions.players[seat] ?? 0;
    if (after < before) fail('INV-VIEW-04', `${seat} revision decreased`);
    if ((after !== before) !== changed.players.includes(seat)) fail('INV-VIEW-04', `${seat} revision does not track its view content`);
  }
  if (event.kind === 'command') {
    const type = event.command.type;
    if (event.outcome !== 'REGISTERED') {
      if (changed.public || changed.players.length > 0 || canonicalJson(prev.truth) !== canonicalJson(next.truth)) fail('INV-VIEW-05', `a ${event.outcome} ${type} changed state or a view`);
      if (prev.terminal && event.outcome !== 'PHASE_CLOSED' && event.outcome !== 'INVALID') fail('INV-PH-06', 'a command after the match ended was not refused as closed');
    } else {
      const others = changed.players.filter(seat => seat !== event.actor);
      if (HIDDEN_COMMANDS.includes(type) && !ownChoiceClosed && (changed.public || others.length > 0)) {
        fail('INV-VIEW-03', `accepted ${type} by ${event.actor} changed ${changed.public ? 'the public view' : ''}${others.length > 0 ? ` views of ${others.join(',')}` : ''}`);
      }
      const actor = prev.truth.seats.find(item => item.seat === event.actor);
      if (actor === undefined || actor.health === 'Eliminated') fail('INV-EL-03', `an Eliminated or unknown seat had ${type} accepted`);
      if (type === 'REGISTER_SHOT') {
        const total = bump(ledger.ordinaryShots, event.actor);
        if (actor?.role === 'Officer' && total > 1) fail('INV-RES-06', 'Officer registered a second ordinary shot');
        if (bump(ledger.shotsThisRound, event.actor) > 1) fail('INV-RES-04', `${event.actor} registered two ordinary shots in one turn`);
        if (actor?.role !== 'Officer' && prev.round < 4) fail('INV-RES-06', `an ordinary weapon was fired in Round ${prev.round}`);
      }
      if (type === 'SHOWDOWN_SHOT' && bump(ledger.specialShots, event.actor) > 1) fail('INV-RES-04', `${event.actor} registered two special shots`);
      if (type === 'MOVE' && bump(ledger.movesThisRound, event.actor) > 1) fail('INV-MOVE-02', `${event.actor} moved twice in Round ${prev.round}`);
      if (type === 'REQUEST_HACK') {
        if (bump(ledger.hackRequests, event.actor) > 1) fail('INV-RES-04', `${event.actor} initiated a second Standard Hack`);
        ledger.hackRequestsThisRound += 1;
        if (ledger.hackRequestsThisRound > 2) fail('INV-RES-04', 'a third Standard Hack was accepted in one round');
      }
      if (type === 'SCAN') { ledger.scansThisRound += 1; if (ledger.scansThisRound > 1) fail('INV-RES-04', 'a second Scan was accepted in one round'); }
      if (type === 'SUBMIT_CODE') { ledger.codeAttempts += 1; if (ledger.codeAttempts > 1 || prev.round !== 5) fail('INV-RES-04', 'a Code attempt outside the single Round 5 attempt'); }
      if (type === 'DISABLE' && bump(ledger.disables, event.actor) > 1) fail('INV-RES-04', `${event.actor} used a Disabler twice`);
      if (type === 'RESCUE') { ledger.rescues += 1; if (ledger.rescues > 2) fail('INV-RES-04', 'a third Rescue was accepted'); }
      if (type === 'SUPPLY') { ledger.supplies += 1; if (ledger.supplies > 1 || prev.round !== 3) fail('INV-RES-04', 'Supplier distribution outside its single Round 3 action'); }
      if (type === 'PROTECT' && typeof event.command.target === 'string' && bump(ledger.protectionsByRecipient, event.command.target) > 1) fail('INV-RES-05', `${event.command.target} received Protection twice`);
      if (MAIN_ACTIONS.includes(type) && bump(ledger.mainActionsThisRound, event.actor) > 1) fail('INV-RES-04', `${event.actor} used two Main Actions in one turn`);
    }
  }

  // Ledger bookkeeping for the next observation.
  if (phaseChanged) {
    ledger.phaseKinds.push(next.phaseKind);
    if (next.round !== ledger.roundOfCounters) {
      ledger.roundOfCounters = next.round;
      ledger.movesThisRound = {}; ledger.hackRequestsThisRound = 0; ledger.scansThisRound = 0;
      ledger.mainActionsThisRound = {}; ledger.shotsThisRound = {}; ledger.turnsThisRound = [];
    }
    if (next.phaseKind === 'ORDINARY_TURN' && next.activeSeat !== null) ledger.turnsThisRound.push(next.activeSeat);
  }
  out.push(...checkState(setup, next, ledger));
  return out;
}

export function startLedger(observation: Observation): Ledger {
  const ledger = newLedger();
  ledger.phaseKinds.push(observation.phaseKind);
  if (observation.phaseKind === 'ORDINARY_TURN' && observation.activeSeat !== null) ledger.turnsThisRound.push(observation.activeSeat);
  return ledger;
}
