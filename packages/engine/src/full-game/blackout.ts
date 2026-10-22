import { IdentifierSchema, SeatIdSchema } from '@mothership/contracts';
import type { SeatId } from '@mothership/contracts';
import { blackoutEnabled } from './model.js';
import type { FullGameState } from './model.js';
import type { GameSeat } from './roster.js';
import { boardSlotIdsFor, assertBoardSlots } from './slots.js';

export type BlackoutRoom = Exclude<NonNullable<GameSeat['location']>, 'Final Zone'>;
export interface FullBlackoutState {
  snapshotId: string;
  darkStartsAt: number;
  endsAt: number;
  occupants: Array<{ seatId: SeatId; location: BlackoutRoom; slotId: string; health: GameSeat['health'] }>;
  attempts: Array<{ actorSeatId: SeatId; room: BlackoutRoom; selectedSlotId: string | null; selectedCommandId: string | null }>;
}
const rooms: BlackoutRoom[] = ['Room A', 'Room B', 'Jail', 'Hospital', 'Command Room'];
const disabler = (seat: GameSeat): boolean => seat.role === 'Blue Disabler' || seat.role === 'Red Disabler';
const ready = (seat: GameSeat): boolean => seat.health === 'Healthy' && !seat.jailed;
const numeric = (id: SeatId): number => Number(id.slice(5));
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function requests(state: FullGameState) {
  const pending = state.queued.filter(queued => queued.command.type === 'REQUEST_BLACKOUT');
  const ids = new Set<SeatId>();
  for (const queued of pending) {
    const actor = state.seats.find(seat => seat.seatId === queued.actorSeatId);
    if (!exact(queued, ['commandId', 'actorSeatId', 'command']) || !actor || !disabler(actor) || !IdentifierSchema.safeParse(queued.commandId).success
      || !exact(queued.command, ['type']) || ids.has(actor.seatId) || actor.mainActionUsedRound !== state.round) {
      throw new Error('Invalid registered Blackout request');
    }
    ids.add(actor.seatId);
  }
  return pending;
}
function clockValid(state: FullGameState): boolean {
  return state.phase.kind === 'BLACKOUT' && Number.isSafeInteger(state.phase.startedAt) && state.phase.startedAt >= 0
    && state.phase.startedAt <= Number.MAX_SAFE_INTEGER - 15_000 && state.phase.endsAt === state.phase.startedAt + 15_000
    && IdentifierSchema.safeParse(state.phase.id).success && state.activeSeatId === null;
}
function orderValid(state: FullGameState): boolean {
  return state.turnOrder.length === state.playerCount && new Set(state.turnOrder).size === state.playerCount
    && state.turnOrder.every(id => state.seats.some(seat => seat.seatId === id));
}

/** Persisted boundaries require a complete fixed snapshot only during BLACKOUT. */
export function assertBlackoutState(state: FullGameState): void {
  if (!blackoutEnabled(state.versions)) {
    if (Object.hasOwn(state, 'blackout') || state.phase.kind === 'BLACKOUT'
      || state.queued.some(queued => ['REQUEST_BLACKOUT', 'SELECT_BLACKOUT_SLOT'].includes(queued.command.type))) {
      throw new Error('Blackout requires its exact gameplay tuple');
    }
    return;
  }
  if (!Object.hasOwn(state, 'blackout') || !Number.isInteger(state.round) || state.round < 1 || state.round > 5
    || !orderValid(state) || state.queued.some(queued => ['SELECT_BLACKOUT_SLOT', 'DISABLE'].includes(queued.command.type))) {
    throw new Error('Invalid Blackout state');
  }
  const pending = requests(state);
  if (state.phase.kind !== 'BLACKOUT') {
    if (state.blackout !== null || pending.some(q => state.seats.find(seat => seat.seatId === q.actorSeatId)!.disablerSpent !== false)) {
      throw new Error('Unfinished Blackout state outside its window');
    }
    return;
  }
  const window = state.blackout;
  if (!clockValid(state) || !exact(window, ['snapshotId', 'darkStartsAt', 'endsAt', 'occupants', 'attempts'])
    || window.snapshotId !== state.phase.id || window.darkStartsAt !== state.phase.startedAt + 5_000
    || window.endsAt !== state.phase.endsAt || !Array.isArray(window.occupants) || !Array.isArray(window.attempts)) {
    throw new Error('Invalid fixed Blackout clock');
  }
  assertBoardSlots(state);
  const physical = state.seats.filter(seat => seat.location !== null);
  if (window.occupants.length !== physical.length) throw new Error('Incomplete frozen Blackout roster');
  const frozenSeats = new Set<string>(), frozenSlots = new Set<string>();
  for (const occupant of window.occupants) {
    if (!exact(occupant, ['seatId', 'location', 'slotId', 'health']) || !SeatIdSchema.safeParse(occupant.seatId).success
      || !rooms.includes(occupant.location) || !['Healthy', 'Injured', 'Eliminated'].includes(occupant.health)
      || !boardSlotIdsFor(state, occupant.location).includes(occupant.slotId)
      || frozenSeats.has(occupant.seatId) || frozenSlots.has(occupant.slotId)) throw new Error('Invalid frozen Blackout occupant');
    const current = physical.find(seat => seat.seatId === occupant.seatId);
    if (!current || current.location !== occupant.location || current.slotId !== occupant.slotId || current.health !== occupant.health) {
      throw new Error('Blackout frozen placement changed');
    }
    frozenSeats.add(occupant.seatId); frozenSlots.add(occupant.slotId);
  }
  const admittedIds = state.turnOrder.filter(id => pending.some(q => q.actorSeatId === id));
  if (window.attempts.length !== admittedIds.length) throw new Error('Invalid Blackout admissions');
  for (let index = 0; index < window.attempts.length; index++) {
    const attempt = window.attempts[index]!;
    if (!exact(attempt, ['actorSeatId', 'room', 'selectedSlotId', 'selectedCommandId'])
      || attempt.actorSeatId !== admittedIds[index] || !rooms.includes(attempt.room)) throw new Error('Invalid Blackout admission order');
    const actor = state.seats.find(seat => seat.seatId === attempt.actorSeatId)!;
    const selected = attempt.selectedSlotId !== null;
    if (!ready(actor) || !disabler(actor) || actor.location !== attempt.room || actor.disablerSpent !== selected
      || (selected ? typeof attempt.selectedSlotId !== 'string' || !boardSlotIdsFor(state, attempt.room).includes(attempt.selectedSlotId)
        || !IdentifierSchema.safeParse(attempt.selectedCommandId).success : attempt.selectedCommandId !== null)) {
      throw new Error('Invalid final Blackout attempt');
    }
  }
}

/** Own ordinary turn; a lack of damaging candidates never prevents an untargeted request. */
export function blackoutRequestAllowed(state: FullGameState, actor: GameSeat): boolean {
  assertBlackoutState(state);
  return blackoutEnabled(state.versions) && state.seats.includes(actor) && disabler(actor) && ready(actor)
    && actor.disablerSpent === false && actor.mainActionUsedRound !== state.round
    && (actor.mainActionUsedRound === null || (Number.isInteger(actor.mainActionUsedRound) && actor.mainActionUsedRound! >= 1 && actor.mainActionUsedRound! < state.round))
    && state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === actor.seatId
    && actor.location !== null && rooms.includes(actor.location as BlackoutRoom)
    && !state.queued.some(q => q.actorSeatId === actor.seatId && q.command.type === 'REQUEST_BLACKOUT');
}

/** The caller already opened the single authoritative 15-second phase. Never restart it. */
export function openBlackout(state: FullGameState): void {
  if (!blackoutEnabled(state.versions) || !Object.hasOwn(state, 'blackout') || state.blackout !== null
    || !clockValid(state) || !orderValid(state)) throw new Error('Cannot open Blackout');
  assertBoardSlots(state);
  const pending = requests(state);
  if (pending.some(q => state.seats.find(seat => seat.seatId === q.actorSeatId)!.disablerSpent !== false)) {
    throw new Error('Blackout request has already spent its lifetime use');
  }
  const canceled = new Set(pending.filter(q => !ready(state.seats.find(seat => seat.seatId === q.actorSeatId)!)).map(q => q.actorSeatId));
  const eligible = new Set(pending.filter(q => !canceled.has(q.actorSeatId)).map(q => q.actorSeatId));
  const occupants = state.seats.filter(seat => seat.location !== null).map(seat => ({ seatId: seat.seatId,
    location: seat.location as BlackoutRoom, slotId: seat.slotId!, health: seat.health })).sort((a, b) => numeric(a.seatId) - numeric(b.seatId));
  const attempts = state.turnOrder.filter(id => eligible.has(id)).map(id => ({ actorSeatId: id,
    room: state.seats.find(seat => seat.seatId === id)!.location as BlackoutRoom, selectedSlotId: null, selectedCommandId: null }));
  state.queued = state.queued.filter(q => q.command.type !== 'REQUEST_BLACKOUT' || !canceled.has(q.actorSeatId));
  state.blackout = { snapshotId: state.phase.id, darkStartsAt: state.phase.startedAt + 5_000, endsAt: state.phase.endsAt!, occupants, attempts };
  assertBlackoutState(state);
}

/** New selections only. Exact delivered-command retries are recovered from service receipts. */
export function selectBlackoutSlot(state: FullGameState, actor: GameSeat, command: unknown, commandId: string, now: number): boolean {
  assertBlackoutState(state);
  if (!blackoutEnabled(state.versions) || state.phase.kind !== 'BLACKOUT' || !state.seats.includes(actor)
    || !exact(command, ['type', 'snapshotId', 'room', 'slotId']) || command['type'] !== 'SELECT_BLACKOUT_SLOT'
    || !IdentifierSchema.safeParse(commandId).success || !Number.isSafeInteger(now)) return false;
  const window = state.blackout!, attempt = window.attempts.find(value => value.actorSeatId === actor.seatId);
  if (!attempt || attempt.selectedSlotId !== null || now < window.darkStartsAt || now >= window.endsAt
    || command['snapshotId'] !== window.snapshotId || command['room'] !== attempt.room
    || typeof command['slotId'] !== 'string' || !boardSlotIdsFor(state, attempt.room).includes(command['slotId'])) return false;
  attempt.selectedSlotId = command['slotId']; attempt.selectedCommandId = commandId; actor.disablerSpent = true;
  assertBlackoutState(state); return true;
}

/** Caller validated the due deadline. Collect every frozen target before resolving any attack. */
export function finishBlackout(state: FullGameState): Record<string, SeatId | null> {
  assertBlackoutState(state);
  if (!blackoutEnabled(state.versions) || state.phase.kind !== 'BLACKOUT') throw new Error('No Blackout to finish');
  const window = state.blackout!, targets: Record<string, SeatId | null> = {};
  for (const attempt of window.attempts) {
    const target = window.occupants.find(occupant => occupant.location === attempt.room && occupant.slotId === attempt.selectedSlotId);
    targets[attempt.actorSeatId] = target && target.health !== 'Eliminated' && target.seatId !== attempt.actorSeatId
      && target.location !== 'Command Room' ? target.seatId : null;
  }
  for (const attempt of window.attempts) state.seats.find(seat => seat.seatId === attempt.actorSeatId)!.disablerSpent = true;
  state.blackout = null;
  return targets;
}

/** Selected targeting stays recoverable after the lifetime use was spent. */
export function projectBlackoutTargeting(state: FullGameState, actor: GameSeat) {
  assertBlackoutState(state);
  if (!blackoutEnabled(state.versions) || state.phase.kind !== 'BLACKOUT' || !state.seats.includes(actor)) return null;
  const window = state.blackout!, attempt = window.attempts.find(value => value.actorSeatId === actor.seatId);
  return attempt ? { snapshotId: window.snapshotId, room: attempt.room, slotIds: boardSlotIdsFor(state, attempt.room),
    darkStartsAt: window.darkStartsAt, endsAt: window.endsAt, selectedSlotId: attempt.selectedSlotId } : null;
}
