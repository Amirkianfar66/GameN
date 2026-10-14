import { cloneEnabled } from './model.js';
import type { FullGameState } from './model.js';
import type { GameSeat } from './roster.js';

const terminal = (state: FullGameState): boolean => ['FINISHED', 'ABORTED', 'SHOWDOWN'].includes(state.phase.kind);
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

/** Complete persisted boundaries. Cleanup alone may inspect an intermediate elimination/terminal transition. */
function validateCloneState(state: FullGameState, cleanup = false): void {
  if (!cloneEnabled(state.versions)) {
    if (state.seats.some(seat => Object.hasOwn(seat, 'cloneStatus'))
      || state.queued.some(queued => queued.command.type === 'ACTIVATE_CLONE')) throw new Error('Clone requires its exact gameplay tuple');
    return;
  }
  if (!Number.isInteger(state.round) || state.round < 1 || state.round > 5
    || state.seats.filter(seat => seat.role === 'Alien').length !== 1
    || state.queued.some(queued => queued.command.type === 'ACTIVATE_CLONE')) throw new Error('Invalid Clone state');
  for (const seat of state.seats) {
    if (!Object.hasOwn(seat, 'cloneStatus')) throw new Error('Missing Clone state');
    const status = seat.cloneStatus;
    if (seat.role !== 'Alien') {
      if (status !== null) throw new Error('Clone is Alien-private');
      continue;
    }
    if (seat.faction !== 'Alien' || !exact(status, ['used', 'activatedRound', 'expiresAfterRound', 'active'])
      || typeof status.used !== 'boolean' || typeof status.active !== 'boolean') throw new Error('Invalid Alien Clone state');
    if (!status.used) {
      if (status.activatedRound !== null || status.expiresAfterRound !== null || status.active) throw new Error('Invalid unused Clone');
      continue;
    }
    const activation = status.activatedRound;
    if (typeof activation !== 'number' || !Number.isInteger(activation) || activation < 1 || activation > state.round
      || status.expiresAfterRound !== Math.min(activation + 1, 5) || seat.mainActionUsedRound !== activation) {
      throw new Error('Invalid original Clone chronology');
    }
    const expires = status.expiresAfterRound as number;
    if (status.active) {
      if (state.round > expires || (!cleanup && (seat.health === 'Eliminated' || terminal(state)))) throw new Error('Unfinished Clone expiry');
    } else if (seat.health !== 'Eliminated' && !terminal(state) && state.round <= expires
      && !(cleanup && state.round === expires)) {
      throw new Error('Premature Clone cancellation');
    }
  }
}

export function assertCloneState(state: FullGameState): void { validateCloneState(state); }

/** Constructor-only initialization; an existing field is validated, never reset. */
export function initializeCloneState(state: FullGameState): void {
  if (!cloneEnabled(state.versions)) { assertCloneState(state); return; }
  for (const seat of state.seats) if (!Object.hasOwn(seat, 'cloneStatus')) {
    seat.cloneStatus = seat.role === 'Alien' ? { used:false, activatedRound:null, expiresAfterRound:null, active:false } : null;
  }
  assertCloneState(state);
}

/** The enclosing command owns authentication, phase identity and server-time admission. */
export function cloneActivationAllowed(state: FullGameState, actor: GameSeat): boolean {
  assertCloneState(state);
  return cloneEnabled(state.versions) && state.seats.includes(actor) && actor.role === 'Alien' && actor.faction === 'Alien'
    && state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === actor.seatId && actor.health === 'Healthy'
    && !actor.jailed && actor.location !== null && actor.cloneStatus!.used === false
    && actor.mainActionUsedRound !== state.round
    && (actor.mainActionUsedRound === null || (Number.isInteger(actor.mainActionUsedRound) && actor.mainActionUsedRound >= 1 && actor.mainActionUsedRound < state.round));
}

export function activateClone(state: FullGameState, actor: GameSeat): void {
  if (!cloneActivationAllowed(state, actor)) throw new Error('Clone activation is not allowed');
  actor.mainActionUsedRound = state.round;
  actor.cloneStatus = { used:true, activatedRound:state.round, expiresAfterRound:Math.min(state.round + 1, 5), active:true };
  assertCloneState(state);
}

/** A repeated block neither consumes Clone nor touches independent Protection. */
export function cloneBlocksAttack(state: FullGameState, target: GameSeat, showdown: boolean): boolean {
  assertCloneState(state);
  return cloneEnabled(state.versions) && state.seats.includes(target) && !showdown && state.phase.kind !== 'SHOWDOWN'
    && target.health !== 'Eliminated' && target.role === 'Alien' && target.cloneStatus!.active;
}

/** Immediate EJECT/damage or due-death cleanup; lifetime and original expiry remain recorded. */
export function clearEliminatedCloneEffects(state: FullGameState): void {
  if (!cloneEnabled(state.versions)) return;
  validateCloneState(state, true);
  for (const seat of state.seats) if (seat.health === 'Eliminated' && seat.cloneStatus?.active) seat.cloneStatus.active = false;
  assertCloneState(state);
}

/** Called after the entire normal attack/medical batch, before victory and the next phase. */
export function finishCloneCheckpoint(state: FullGameState): void {
  if (!cloneEnabled(state.versions)) return;
  assertCloneState(state);
  for (const seat of state.seats) if (seat.cloneStatus?.active && state.round >= seat.cloneStatus.expiresAfterRound!) seat.cloneStatus.active = false;
  // The caller now closes this completed round. No intermediate projection is valid.
}

/** Match completion/abort ends the effect without erasing use or changing health. */
export function stopCloneEffects(state: FullGameState): void {
  if (!cloneEnabled(state.versions)) return;
  validateCloneState(state, true);
  for (const seat of state.seats) if (seat.cloneStatus?.active) seat.cloneStatus.active = false;
  // Only the caller's terminal phase is a persisted boundary for early expiry.
}
