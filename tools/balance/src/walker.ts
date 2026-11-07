import { seatIdsFor } from './model.js';
import type { Faction, Mode, ScenarioSetup, SeatId } from './model.js';
import { checkSetup, checkState, checkTransition, startLedger } from './invariants.js';
import type { Violation } from './invariants.js';
import type { CommandOutcome, EngineAdapter, NeutralCommand, Observation, PlayerFacts } from './observation.js';
import { deriveSetup, hashSeed, mulberry32, pickInt, shuffled } from './prng.js';
import type { RoomPlan } from './prng.js';

// Seeded random-policy playouts. Their purpose is to exercise legality, resource accounting,
// phase transitions, elimination and audience boundaries over many reachable states.
// A random-policy outcome is a result for that policy only. It says nothing about how people
// persuade, bluff or vote, and it is never a faction win rate (agents/game-balance.md).

export interface HintMismatch {
  round: number;
  phaseKind: string;
  seat: SeatId;
  type: string;
  offered: boolean;
  outcome: CommandOutcome;
}

export interface WalkResult {
  mode: Mode;
  seed: string;
  setup: ScenarioSetup;
  completed: boolean;
  phases: number;
  commandsAccepted: number;
  commandsRejected: number;
  hintMismatches: HintMismatch[];
  violations: Violation[];
  terminalPhase: string;
  winner: string | null;
  alienCoWinner: boolean | null;
  showdown: boolean;
  eliminatedBeforeShowdown: number;
  eliminatedAtEnd: number;
  maxJailed: number;
  windowSeconds: number;
  endDigest: string;
  occupancy: OccupancyStats;
}

// What a playout showed about how full the places got. Under a random policy these are facts
// about what can be reached and how the engine answered, never about how people would play.
export interface OccupancyStats {
  // The most players located at once in each place, whatever their health.
  most: Record<string, number>;
  // Phases that opened with five players in Room A or in Room B, and phases that opened at all.
  phasesWithAFullRoom: number;
  phasesOpened: number;
  // Phases that opened with more than five players in Room A, Room B, Hospital or Jail.
  phasesOverCapacity: number;
  // Moves sent towards a room that held five players, and how many of them were accepted.
  movesTowardsAFullRoom: number;
  movesIntoAFullRoom: number;
  // Players sent back to a room: after healing or release, or as a Captain who lost the title
  // inside Command Room. Then those sent to another room than the one they were last in; and of
  // those, the ones whose last room had a place once the resolution was over.
  returns: number;
  returnsToTheOtherRoom: number;
  returnsToTheOtherRoomThoughTheLastHadAPlace: number;
  // The most Injured, free players in Room A or Room B at once: players waiting for Hospital.
  mostWaiting: number;
}

const PLACES = ['Room A', 'Room B', 'Hospital', 'Jail', 'Command Room'] as const;
const FULL = 5;

function newOccupancy(): OccupancyStats {
  return {
    most: Object.fromEntries(PLACES.map(place => [place, 0])), phasesWithAFullRoom: 0, phasesOpened: 0, phasesOverCapacity: 0,
    movesTowardsAFullRoom: 0, movesIntoAFullRoom: 0, returns: 0, returnsToTheOtherRoom: 0, returnsToTheOtherRoomThoughTheLastHadAPlace: 0, mostWaiting: 0,
  };
}

const heldIn = (observation: Observation, place: string, except?: SeatId): number =>
  observation.truth.seats.filter(seat => seat.location === place && seat.seat !== except).length;

function notePhase(stats: OccupancyStats, observation: Observation): void {
  stats.phasesOpened += 1;
  for (const place of PLACES) stats.most[place] = Math.max(stats.most[place] ?? 0, heldIn(observation, place));
  if (heldIn(observation, 'Room A') >= FULL || heldIn(observation, 'Room B') >= FULL) stats.phasesWithAFullRoom += 1;
  if (['Room A', 'Room B', 'Hospital', 'Jail'].some(place => heldIn(observation, place) > FULL)) stats.phasesOverCapacity += 1;
  const waiting = observation.truth.seats.filter(seat => seat.health === 'Injured' && !seat.jailed && (seat.location === 'Room A' || seat.location === 'Room B')).length;
  stats.mostWaiting = Math.max(stats.mostWaiting, waiting);
}

// `lastStood` is the room each player was last seen in, kept by the playout itself.
function noteReturns(stats: OccupancyStats, before: Observation, after: Observation, lastStood: Record<SeatId, string>): void {
  for (const now of after.truth.seats) {
    const was = before.truth.seats.find(seat => seat.seat === now.seat);
    // A return: from Hospital or Jail, or from Command Room for a Captain who lost the title there.
    const from = was !== undefined && (was.location === 'Hospital' || was.location === 'Jail' || (was.location === 'Command Room' && was.captain && !now.captain));
    if (was !== undefined && from && (now.location === 'Room A' || now.location === 'Room B')) {
      const last = lastStood[now.seat] ?? was.lastRoom;
      stats.returns += 1;
      if (now.location !== last) {
        stats.returnsToTheOtherRoom += 1;
        if (heldIn(after, last, now.seat) < FULL) stats.returnsToTheOtherRoomThoughTheLastHadAPlace += 1;
      }
    }
  }
  for (const now of after.truth.seats) if (now.location === 'Room A' || now.location === 'Room B') lastStood[now.seat] = now.location;
}

export interface WalkOptions {
  // Probability that a seat uses each opportunity its view offers in a phase.
  activity: number;
  // Probability that a seat also sends one arbitrary, possibly illegal command in a phase.
  noise: number;
  // Probability that a vote is coordinated on one target, so that Jail, release and Captain
  // states are reached often enough to be exercised.
  coordination: number;
  maxPhases: number;
  // How starting rooms are drawn. 'seeded' is an independent draw for each player, which was the
  // rule until the capacity rule; 'capped' is the same made legal under it. Default 'seeded'.
  rooms?: RoomPlan;
  // Probability that a seat also tries to move into a room that holds five players, in a phase in
  // which one does. The plain policy seldom tries; a run that is about capacity asks for more.
  // Default 0, which leaves every earlier playout exactly as it was.
  pressFullRooms?: number;
}

export const DEFAULT_WALK: WalkOptions = { activity: 0.6, noise: 0.25, coordination: 0.5, maxPhases: 400 };

const TARGETED = ['REGISTER_SHOT', 'DISABLE', 'PROTECT', 'RESCUE', 'REQUEST_HACK', 'SHOWDOWN_SHOT'];
const FACTIONS: readonly Faction[] = ['Blue', 'Red', 'Alien'];
const NOISE_TYPES = [...TARGETED, 'SCAN', 'VOTE', 'RELEASE_CHOICE', 'MOVE'];
const ROOMS = ['Room A', 'Room B', 'Command Room'];

function pick<T>(items: readonly T[], random: () => number): T {
  return items[pickInt(random, items.length)] as T;
}

interface PhasePlan {
  bandwagon: SeatId | null;
  releaseMood: boolean;
}

interface Planned {
  command: NeutralCommand;
  always: boolean;
}

function offeredCommands(view: PlayerFacts, observation: Observation, seats: readonly SeatId[], random: () => number, plan: PhasePlan): Planned[] {
  const planned: Planned[] = [];
  const commands = { push: (command: NeutralCommand) => { planned.push({ command, always: false }); } };
  for (const type of TARGETED) {
    const targets = view.legal[type];
    if (targets !== undefined && targets.length > 0) commands.push({ type, target: pick(targets, random) });
  }
  const scan = view.legal['SCAN'];
  if (scan !== undefined && scan.length > 0) commands.push({ type: 'SCAN', target: pick(scan, random), guess: pick(FACTIONS, random) });
  const supply = view.legal['SUPPLY'];
  if (supply !== undefined && supply.length >= 2) commands.push({ type: 'SUPPLY', targets: shuffled(supply, random).slice(0, 2) });
  const vote = view.legal['VOTE'];
  if (vote !== undefined) {
    if (plan.bandwagon !== null && vote.includes(plan.bandwagon) && random() < 0.85) planned.push({ command: { type: 'VOTE', target: plan.bandwagon }, always: true });
    else commands.push({ type: 'VOTE', target: vote.length === 0 || random() < 0.2 ? null : pick(vote, random) });
  }
  const release = view.legal['RELEASE_CHOICE'];
  if (release !== undefined) commands.push({ type: 'RELEASE_CHOICE', target: release.length === 0 || random() < 0.3 ? null : pick(release, random) });
  if (view.releaseVoteAvailable) {
    if (plan.releaseMood && random() < 0.85) planned.push({ command: { type: 'RELEASE_VOTE', approve: true }, always: true });
    else commands.push({ type: 'RELEASE_VOTE', approve: pick([true, false, null], random) });
  }
  if (view.moveDestinations.length > 0 && random() < 0.5) commands.push({ type: 'MOVE', destination: pick(view.moveDestinations, random) });
  if (view.codeAttemptAvailable && random() < 0.4) {
    commands.push({ type: 'SUBMIT_CODE', seats: random() < 0.5 ? [...observation.truth.code] : shuffled(seats, random).slice(0, 4) });
  }
  return planned;
}

function isOffered(view: PlayerFacts, command: NeutralCommand): boolean {
  if (command.type === 'MOVE') return command.destination !== undefined && view.moveDestinations.includes(command.destination);
  const targets = view.legal[command.type];
  if (targets === undefined) return false;
  return command.target === null ? command.type === 'VOTE' || command.type === 'RELEASE_CHOICE'
    : command.target !== undefined && targets.includes(command.target);
}

/**
 * One seeded playout. An engine that refuses the setup or throws part-way does not stop the run:
 * the playout is reported as unfinished with the error as a violation, so that a command built on
 * this function fails instead of crashing or passing.
 */
export function walk(adapter: EngineAdapter, mode: Mode, seed: string, options: WalkOptions = DEFAULT_WALK): WalkResult {
  const setup = deriveSetup(mode, seed, { roles: 'seeded', rooms: options.rooms ?? 'seeded', orders: 'seeded' });
  try {
    return play(adapter, mode, seed, setup, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      mode, seed, setup, completed: false, phases: 0, commandsAccepted: 0, commandsRejected: 0, hintMismatches: [],
      violations: [{ invariant: 'engine-error', message: `the engine or its adapter threw: ${message}` }],
      terminalPhase: 'none', winner: null, alienCoWinner: null, showdown: false, eliminatedBeforeShowdown: 0, eliminatedAtEnd: 0,
      maxJailed: 0, windowSeconds: 0, endDigest: `error: ${message}`, occupancy: newOccupancy(),
    };
  }
}

function play(adapter: EngineAdapter, mode: Mode, seed: string, setup: ScenarioSetup, options: WalkOptions): WalkResult {
  const random = mulberry32(hashSeed(`walk|${seed}|${mode}`));
  const seats = seatIdsFor(mode);
  const match = adapter.createMatch(setup, `walk-${mode}-${hashSeed(seed).toString(36)}`);
  let current = match.observe();
  const ledger = startLedger(current);
  ledger.roomCapacity = adapter.roomCapacity ?? null;
  const violations: Violation[] = [...checkSetup(setup, current), ...checkState(setup, current, ledger)];
  const occupancy = newOccupancy();
  notePhase(occupancy, current);
  const lastStood: Record<SeatId, string> = {};
  for (const seat of current.truth.seats) lastStood[seat.seat] = seat.location;
  const hintMismatches: HintMismatch[] = [];
  let commandsAccepted = 0;
  let commandsRejected = 0;
  let phases = 0;
  let windowSeconds = 0;
  let showdown = false;
  let eliminatedBeforeShowdown = 0;
  let maxJailed = 0;
  const eliminated = (observation: Observation) => observation.truth.seats.filter(seat => seat.health === 'Eliminated').length;

  const send = (seat: SeatId, command: NeutralCommand, offered: boolean, atMs: number): void => {
    const before = current;
    const outcome = match.command(seat, command, atMs);
    current = match.observe();
    // A move sent towards a room that held five players when it was sent, the mover not among them.
    if (command.type === 'MOVE' && (command.destination === 'Room A' || command.destination === 'Room B') && heldIn(before, command.destination, seat) >= FULL) {
      occupancy.movesTowardsAFullRoom += 1;
      if (outcome === 'REGISTERED') occupancy.movesIntoAFullRoom += 1;
    }
    violations.push(...checkTransition(setup, before, current, { kind: 'command', actor: seat, command, outcome }, ledger));
    if (outcome === 'REGISTERED') commandsAccepted += 1; else commandsRejected += 1;
    // A command can close its phase, as the Captain's release choice does.
    noteReturns(occupancy, before, current, lastStood);
    if (current.phaseId !== before.phaseId) notePhase(occupancy, current);
    if ((outcome === 'REGISTERED') !== offered) {
      hintMismatches.push({ round: before.round, phaseKind: before.phaseKind, seat, type: command.type, offered, outcome });
    }
  };

  while (!current.terminal && phases < options.maxPhases) {
    let offset = 1_000;
    const targets = current.publicView.eligibleTargets;
    const coordinated = random() < options.coordination;
    const plan: PhasePlan = { bandwagon: coordinated && targets.length > 0 ? pick(targets, random) : null, releaseMood: coordinated };
    for (const seat of shuffled(seats, random)) {
      const view = current.playerViews[seat];
      if (view === undefined) continue;
      for (const { command, always } of offeredCommands(view, current, seats, random, plan)) {
        if (!always && random() >= options.activity) continue;
        // Earlier commands in this phase may have used the opportunity; re-read the hint.
        const fresh = current.playerViews[seat];
        const stillOffered = fresh !== undefined && (command.type === 'SUBMIT_CODE' ? fresh.codeAttemptAvailable
          : command.type === 'RELEASE_VOTE' ? fresh.releaseVoteAvailable
            : command.type === 'SUPPLY' ? (command.targets ?? []).every(target => (fresh.legal['SUPPLY'] ?? []).includes(target))
              : isOffered(fresh, command));
        if (!stillOffered) continue;
        send(seat, command, true, current.phaseStartedAt + offset);
        offset += 7;
      }
      if (random() < options.noise) {
        const type = pick(NOISE_TYPES, random);
        const command: NeutralCommand = type === 'MOVE' ? { type, destination: pick(ROOMS, random) }
          : type === 'SCAN' ? { type, target: pick(seats, random), guess: pick(FACTIONS, random) }
            : { type, target: pick(seats, random) };
        const fresh = current.playerViews[seat];
        if (fresh !== undefined) {
          send(seat, command, isOffered(fresh, command), current.phaseStartedAt + offset);
          offset += 7;
        }
      }
      if ((options.pressFullRooms ?? 0) > 0 && random() < (options.pressFullRooms ?? 0)) {
        const here = current.truth.seats.find(item => item.seat === seat)?.location;
        const full = ROOMS.filter(room => room !== here && room !== 'Command Room' && heldIn(current, room, seat) >= FULL);
        const fresh = current.playerViews[seat];
        if (full.length > 0 && fresh !== undefined) {
          const command: NeutralCommand = { type: 'MOVE', destination: pick(full, random) };
          send(seat, command, isOffered(fresh, command), current.phaseStartedAt + offset);
          offset += 7;
        }
      }
    }
    const before = current;
    if (before.phaseEndsAt === null) break;
    windowSeconds += (before.phaseEndsAt - before.phaseStartedAt) / 1_000;
    const advanced = match.advance(before.phaseEndsAt);
    current = match.observe();
    violations.push(...checkTransition(setup, before, current, { kind: 'advance', atMs: before.phaseEndsAt, advanced }, ledger));
    phases += 1;
    noteReturns(occupancy, before, current, lastStood);
    if (current.phaseId !== before.phaseId) notePhase(occupancy, current);
    maxJailed = Math.max(maxJailed, current.truth.seats.filter(seat => seat.jailed).length);
    if (current.phaseKind === 'SHOWDOWN') { showdown = true; eliminatedBeforeShowdown = eliminated(current); }
    if (!advanced) break;
  }
  if (!showdown) eliminatedBeforeShowdown = eliminated(current);
  return {
    mode, seed, setup, completed: current.terminal, phases, commandsAccepted, commandsRejected, hintMismatches, violations,
    terminalPhase: current.phaseKind, winner: current.result?.winner ?? null, alienCoWinner: current.result?.alienCoWinner ?? null,
    showdown, eliminatedBeforeShowdown, eliminatedAtEnd: eliminated(current), maxJailed, windowSeconds, occupancy,
    endDigest: JSON.stringify({ truth: current.truth, result: current.result, phase: current.phaseKind, round: current.round }),
  };
}
