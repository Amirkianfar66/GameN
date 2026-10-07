import { canonicalJson } from './model.js';
import type { EnginePins, Faction, Health, Role, ScenarioSetup, SeatId } from './model.js';

// The neutral test adapter boundary. An engine binding maps its own state and audience
// projections to these shapes; scenarios and invariants never read engine internals.

export type ProtectionState = 'none' | 'pending' | 'active' | 'consumed';
export type Winner = 'Blue' | 'Red' | 'Alien' | 'Draw';

/** Server-only truth. Never an audience payload. */
export interface TruthSeat {
  seat: SeatId;
  role: Role;
  faction: Faction;
  health: Health;
  jailed: boolean;
  captain: boolean;
  location: string;
  lastRoom: string;
  ordinaryWeapons: number;
  officerShotSpent: boolean;
  specialShotAvailable: boolean;
  movedThisRound: boolean;
  disablerSpent: boolean;
  rescuesRemaining: number;
  hackUsed: boolean;
  scannedThisRound: boolean;
  protection: ProtectionState;
  protectionActiveFromRound: number | null;
  lifetimeProtectionReceived: boolean;
}

export interface PublicSeatFacts {
  seat: SeatId;
  health: Health;
  location: string;
  jailed: boolean;
  captain: boolean;
  revealedFaction: Faction | null;
}

export interface TallyFacts {
  kind: string;
  counts: Record<SeatId, number>;
  eligibleVoterCount: number;
  yesCount: number | null;
  selected: SeatId | null;
  released: boolean | null;
}

/** What every audience may see. */
export interface PublicFacts {
  round: number;
  phaseKind: string;
  activeSeat: SeatId | null;
  seats: PublicSeatFacts[];
  eligibleVoters: SeatId[];
  eligibleTargets: SeatId[];
  releaseTarget: SeatId | null;
  lastTally: TallyFacts | null;
  result: { winner: Winner; alienCoWinner: boolean } | null;
  endReveal: { roles: { seat: SeatId; role: Role }[]; code: SeatId[] } | null;
}

export interface ScanResultFacts {
  round: number;
  target: SeatId;
  guess: Faction;
  matched: boolean;
  inCode: boolean | null;
}

/** One player's authorized view: the public facts plus that player's own private facts. */
export interface PlayerFacts {
  seat: SeatId;
  publicFacts: PublicFacts;
  role: Role;
  ordinaryWeapons: number;
  rescuesRemaining: number;
  legal: Record<string, SeatId[]>;
  moveDestinations: string[];
  releaseVoteAvailable: boolean;
  codeAttemptAvailable: boolean;
  pendingCount: number;
  ownBallot: SeatId | boolean | null;
  hasVoted: boolean;
  hackPartner: SeatId | null;
  knowledge: {
    insiderCandidates: SeatId[];
    undercoverSeat: SeatId | null;
    code: SeatId[];
    scanResults: ScanResultFacts[];
    protections: { seat: SeatId; activeFromRound: number; consumed: boolean }[];
    // Whom this player's own Supply gave a weapon to, as the engine tells this player (V1-16).
    // Only Supplier's view may name anyone. `null` means the engine offers this player no such
    // fact at all, which is not the same as an empty list.
    armedBySupply: SeatId[] | null;
  };
}

export interface Observation {
  round: number;
  phaseKind: string;
  phaseId: string;
  phaseStartedAt: number;
  phaseEndsAt: number | null;
  activeSeat: SeatId | null;
  terminal: boolean;
  result: { winner: Winner; alienCoWinner: boolean } | null;
  truth: {
    code: SeatId[];
    codeSubmitted: boolean;
    codeCorrect: boolean;
    releaseUsed: boolean;
    hacksThisRound: number;
    seats: TruthSeat[];
  };
  publicView: PublicFacts;
  playerViews: Record<SeatId, PlayerFacts>;
  // Unmodified audience payloads, kept for structural equality and forbidden-content scans.
  // `also` holds whatever else an audience can read besides its view, such as a read of its own
  // acknowledgments. An engine with no such read leaves it out. Every comparison of what an
  // audience can see covers both, so that a new read is watched from the day it is bound.
  // `receipts` holds, for each player, the receipts of the commands that player has sent, in
  // order, as the engine returned them. They are an answer to the sender and not part of anyone's
  // view, so the view invariants leave them alone; a comparison of two runs includes them.
  raw: { public: unknown; players: Record<SeatId, unknown>; also?: { public?: unknown; players?: Record<SeatId, unknown> }; receipts?: Record<SeatId, unknown[]> };
  revisions: { public: number; players: Record<SeatId, number> };
}

export type CommandOutcome = 'REGISTERED' | 'NOT_ALLOWED' | 'PHASE_CLOSED' | 'INVALID';

export interface NeutralCommand {
  type: string;
  target?: SeatId | null;
  targets?: SeatId[];
  destination?: string;
  guess?: Faction;
  seats?: SeatId[];
  approve?: boolean | null;
}

export interface EngineMatch {
  observe(): Observation;
  /** Evaluate one command at an absolute trusted time. Must not throw for game rejections. */
  command(actor: SeatId, command: NeutralCommand, atMs: number): CommandOutcome;
  /** Ask the engine to close the current phase at an absolute trusted time. */
  advance(atMs: number): boolean;
  /** Host abort (V1-12). */
  abort(atMs: number): void;
}

export interface EngineAdapter {
  readonly pins: EnginePins;
  /** Throws when the engine refuses the setup. */
  createMatch(setup: ScenarioSetup, matchId: string): EngineMatch;
}

/** What one audience can read of the match, as one comparable text: its view and any further read. */
export function payloadOf(observation: Observation, audience: 'public' | SeatId): string {
  const view = audience === 'public' ? observation.raw.public : observation.raw.players[audience];
  const also = audience === 'public' ? observation.raw.also?.public : observation.raw.also?.players?.[audience];
  return canonicalJson(also === undefined ? view : { view, also });
}

/**
 * Everything one audience has been given, as one comparable text: what `payloadOf` covers, and
 * for a player the receipts of their own commands. Two runs are compared by this, so that a
 * receipt which says more than "registered" is noticed like anything else.
 */
export function readableOf(observation: Observation, audience: 'public' | SeatId): string {
  const state = payloadOf(observation, audience);
  const receipts = audience === 'public' ? undefined : observation.raw.receipts?.[audience];
  return receipts === undefined || receipts.length === 0 ? state : canonicalJson({ state, receipts });
}

export function truthSeat(observation: Observation, seat: SeatId): TruthSeat {
  const found = observation.truth.seats.find(item => item.seat === seat);
  if (found === undefined) throw new Error(`Unknown seat ${seat}`);
  return found;
}

export function publicSeat(facts: PublicFacts, seat: SeatId): PublicSeatFacts {
  const found = facts.seats.find(item => item.seat === seat);
  if (found === undefined) throw new Error(`Unknown public seat ${seat}`);
  return found;
}
