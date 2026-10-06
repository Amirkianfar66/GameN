import type { PlayerView, PublicView, Receipt, RegisterShot, SeatId } from '@mothership/contracts';

export const ENGINE_VERSION = '0.1.0-officer-slice' as const;
export const SOURCE_MANIFEST_SHA256 = '34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc' as const;

// The caller supplies trusted, recorded inputs. The engine reads no clock or randomness.
export interface EvaluationContext {
  readonly actorSeatId: SeatId;
  readonly evaluatedAt: number;
  readonly recordedRandomFacts: readonly number[];
}

export type EngineSeat = PublicView['seats'][number] & {
  role: PlayerView['self']['role'];
  shotAvailable: boolean;
  protection: { activeFromRound: number; consumed: boolean; lifetimeReceipts: 1 } | null;
};

// This state models the nine-seat Round 2 integration slice only. It is server-only.
export interface EngineState {
  versions: PublicView['versions'];
  matchId: string;
  round: 2;
  seats: EngineSeat[];
  phase: PublicView['phase'];
  activeSeatId: SeatId | null;
  // A recorded harness order, not a new rule for generating turn order.
  remainingTurnSeatIds: SeatId[];
  deadlineToken: string | null;
  turnsComplete: boolean;
  attacks: Array<{ commandId: string; actorSeatId: SeatId; targetSeatId: SeatId; registeredAt: number }>;
  resolved: boolean;
  // Adapter-owned server-only total ordering. Pure transitions preserve it unchanged.
  journalSequence: number;
  revisions: { public: number; players: Record<SeatId, number> };
}

export interface ProjectedViews {
  public: PublicView;
  players: Record<SeatId, PlayerView>;
}

function copyState(state: EngineState): EngineState {
  return {
    ...state,
    versions: { ...state.versions },
    phase: { ...state.phase },
    seats: state.seats.map(seat => ({ ...seat, protection: seat.protection === null ? null : { ...seat.protection } })),
    remainingTurnSeatIds: [...state.remainingTurnSeatIds],
    attacks: state.attacks.map(attack => ({ ...attack })),
    revisions: { public: state.revisions.public, players: { ...state.revisions.players } },
  };
}

function requireTime(time: number): void {
  if (!Number.isSafeInteger(time) || time < 0) throw new RangeError('A trusted integer timestamp is required');
}

function requireIdentifier(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw new RangeError('An opaque identifier is required');
}

function incrementAllViews(state: EngineState): void {
  state.revisions.public += 1;
  for (const seat of state.seats) state.revisions.players[seat.seatId] += 1;
}

/** Build complete audience snapshots by allowlisting fields, never spreading private seats. */
export function project(state: EngineState): ProjectedViews {
  const common = {
    versions: { ...state.versions },
    matchId: state.matchId,
    playerCount: 9 as const,
    round: state.round,
    phase: { ...state.phase },
    activeSeatId: state.activeSeatId,
    seats: state.seats.map(({ seatId, location, health, jailed, captain }) => ({ seatId, location, health, jailed, captain })),
  };
  const publicView: PublicView = {
    ...common, audience: { kind: 'public' }, viewRevision: state.revisions.public,
  };
  const players = Object.fromEntries(state.seats.map(seat => [seat.seatId, {
    ...common,
    // Each snapshot owns its nested public data too; consumers cannot mutate another audience.
    versions: { ...common.versions },
    phase: { ...common.phase },
    seats: common.seats.map(publicSeat => ({ ...publicSeat })),
    audience: { kind: 'player' as const, seatId: seat.seatId },
    viewRevision: state.revisions.players[seat.seatId],
    self: { seatId: seat.seatId, role: seat.role, shotAvailable: seat.shotAvailable },
    ownPendingCommandIds: state.resolved ? [] : state.attacks
      .filter(attack => attack.actorSeatId === seat.seatId).map(attack => attack.commandId),
  }])) as Record<SeatId, PlayerView>;
  return { public: publicView, players };
}

/** Caller-scoped command-ID deduplication belongs to the transactional adapter. */
export function registerShot(
  state: EngineState, request: RegisterShot, context: EvaluationContext,
): { state: EngineState; receipt: Receipt } {
  requireTime(context.evaluatedAt);
  const receiptContext = {
    protocolVersion: 1 as const, matchId: request.matchId, phaseId: request.phaseId, commandId: request.commandId,
  };
  const reject = (code: 'PHASE_CLOSED' | 'NOT_ALLOWED') => ({
    state, receipt: { ...receiptContext, status: 'rejected' as const, code },
  });
  if (request.matchId !== state.matchId) return reject('NOT_ALLOWED');
  if (state.resolved || state.turnsComplete || state.phase.kind !== 'ORDINARY_TURN'
    || request.phaseId !== state.phase.id || context.evaluatedAt >= state.phase.endsAt
    || context.evaluatedAt < state.phase.startedAt) return reject('PHASE_CLOSED');
  const actor = state.seats.find(seat => seat.seatId === context.actorSeatId);
  const target = state.seats.find(seat => seat.seatId === request.command.targetSeatId);
  if (actor === undefined || target === undefined || actor.role !== 'Officer'
    || actor.seatId !== state.activeSeatId || actor.health !== 'Healthy' || actor.jailed
    || !actor.shotAvailable || state.attacks.length !== 0 || target.health === 'Eliminated'
    || target.location === 'Command Room' || actor.location !== target.location
    // Self-shooting is unresolved in canon; the approved fixture targets another seat only.
    || actor.seatId === target.seatId) return reject('NOT_ALLOWED');
  const next = copyState(state);
  next.seats.find(seat => seat.seatId === actor.seatId)!.shotAvailable = false;
  next.attacks.push({
    commandId: request.commandId, actorSeatId: actor.seatId, targetSeatId: target.seatId,
    registeredAt: context.evaluatedAt,
  });
  // No target/public revision, timestamp or event changes for a secret registration.
  next.revisions.players[actor.seatId] += 1;
  return { state: next, receipt: { ...receiptContext, status: 'accepted', code: 'REGISTERED' } };
}

export interface DeadlineContext {
  phaseId: string;
  deadlineToken: string;
  now: number;
  nextPhaseId: string;
  nextDeadlineToken: string;
}

export function advanceDeadline(state: EngineState, context: DeadlineContext): { state: EngineState; advanced: boolean } {
  requireTime(context.now);
  if (state.resolved || state.turnsComplete || state.phase.kind !== 'ORDINARY_TURN'
    || state.phase.id !== context.phaseId || state.deadlineToken === null
    || state.deadlineToken !== context.deadlineToken || context.now < state.phase.endsAt) {
    return { state, advanced: false };
  }
  const next = copyState(state);
  const nextSeatId = next.remainingTurnSeatIds.shift();
  if (nextSeatId === undefined) {
    // Voting timing is unresolved. Only the internal harness can supply a completed vote
    // and open resolution. Do not fabricate a vote phase or silently skip the prerequisite.
    next.turnsComplete = true;
    next.deadlineToken = null;
  } else {
    requireIdentifier(context.nextPhaseId);
    requireIdentifier(context.nextDeadlineToken);
    if (context.nextPhaseId === state.phase.id || context.nextDeadlineToken === state.deadlineToken) {
      throw new RangeError('A new turn requires new phase and deadline identities');
    }
    requireTime(context.now + 60_000);
    next.activeSeatId = nextSeatId;
    next.phase = { id: context.nextPhaseId, kind: 'ORDINARY_TURN', startedAt: context.now, endsAt: context.now + 60_000 };
    next.deadlineToken = context.nextDeadlineToken;
    incrementAllViews(next);
  }
  return { state: next, advanced: true };
}

export interface SliceResolutionContext {
  now: number;
  resolutionPhaseId: string;
  completedNoJailVote: true;
}

/** Internal slice harness only. This is not a production skip-vote or end-round endpoint. */
export function resolveSlice(state: EngineState, context: SliceResolutionContext): EngineState {
  requireTime(context.now);
  if (state.resolved) return state;
  if (!state.turnsComplete || state.phase.kind !== 'ORDINARY_TURN' || context.now < state.phase.endsAt
    || context.completedNoJailVote !== true || state.attacks.length > 1) {
    throw new Error('The slice requires all recorded turns and a completed no-jail vote');
  }
  requireIdentifier(context.resolutionPhaseId);
  if (context.resolutionPhaseId === state.phase.id) throw new RangeError('Resolution requires a new phase identity');
  const next = copyState(state);
  for (const attack of next.attacks) {
    const target = next.seats.find(seat => seat.seatId === attack.targetSeatId)!;
    // This fixture has fixed target locations and a single attack; no movement or
    // competing-effect precedence is inferred. Actor eligibility is never rechecked.
    if (target.health === 'Eliminated' || target.location === 'Command Room') continue;
    if (target.protection !== null && !target.protection.consumed
      && target.protection.activeFromRound <= next.round) {
      target.protection.consumed = true;
    } else {
      target.health = target.health === 'Healthy' ? 'Injured' : 'Eliminated';
      if (target.captain) target.captain = false;
    }
  }
  next.resolved = true;
  next.phase = { id: context.resolutionPhaseId, kind: 'ROUND_RESOLUTION', startedAt: context.now, endsAt: null };
  next.activeSeatId = null;
  next.deadlineToken = null;
  incrementAllViews(next);
  // No Protection explanation, attack cause, Hospital relocation, reveal, Rescue or victory
  // is emitted here. Those later stages require their own approved contracts/semantics.
  return next;
}

export * from './full-game/model.js';
export * from './full-game/lifecycle.js';
export { buildRoster } from './full-game/roster.js';
export type { FullGameSetup, FullGameState, FullGameContext } from './full-game/model.js';
