import { seatIdsFor } from './model.js';
import type { Faction, Mode, ScenarioSetup, SeatId } from './model.js';
import { checkSetup, checkState, checkTransition, startLedger } from './invariants.js';
import type { Violation } from './invariants.js';
import type { CommandOutcome, EngineAdapter, NeutralCommand, Observation, PlayerFacts } from './observation.js';
import { deriveSetup, hashSeed, mulberry32, pickInt, shuffled } from './prng.js';

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

export function walk(adapter: EngineAdapter, mode: Mode, seed: string, options: WalkOptions = DEFAULT_WALK): WalkResult {
  const setup = deriveSetup(mode, seed, { roles: 'seeded', rooms: 'seeded', orders: 'seeded' });
  const random = mulberry32(hashSeed(`walk|${seed}|${mode}`));
  const seats = seatIdsFor(mode);
  const match = adapter.createMatch(setup, `walk-${mode}-${hashSeed(seed).toString(36)}`);
  let current = match.observe();
  const ledger = startLedger(current);
  const violations: Violation[] = [...checkSetup(setup, current), ...checkState(setup, current, ledger)];
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
    violations.push(...checkTransition(setup, before, current, { kind: 'command', actor: seat, command, outcome }, ledger));
    if (outcome === 'REGISTERED') commandsAccepted += 1; else commandsRejected += 1;
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
    }
    const before = current;
    if (before.phaseEndsAt === null) break;
    windowSeconds += (before.phaseEndsAt - before.phaseStartedAt) / 1_000;
    const advanced = match.advance(before.phaseEndsAt);
    current = match.observe();
    violations.push(...checkTransition(setup, before, current, { kind: 'advance', atMs: before.phaseEndsAt, advanced }, ledger));
    phases += 1;
    maxJailed = Math.max(maxJailed, current.truth.seats.filter(seat => seat.jailed).length);
    if (current.phaseKind === 'SHOWDOWN') { showdown = true; eliminatedBeforeShowdown = eliminated(current); }
    if (!advanced) break;
  }
  if (!showdown) eliminatedBeforeShowdown = eliminated(current);
  return {
    mode, seed, setup, completed: current.terminal, phases, commandsAccepted, commandsRejected, hintMismatches, violations,
    terminalPhase: current.phaseKind, winner: current.result?.winner ?? null, alienCoWinner: current.result?.alienCoWinner ?? null,
    showdown, eliminatedBeforeShowdown, eliminatedAtEnd: eliminated(current), maxJailed, windowSeconds,
    endDigest: JSON.stringify({ truth: current.truth, result: current.result, phase: current.phaseKind, round: current.round }),
  };
}
