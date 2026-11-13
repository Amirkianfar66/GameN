/** Internal server authority only. These clocks and presence records are not wire fields. */
import { FOOD_TASK_PARAMETERS as parameters } from './planet-food-task.js';
export const FOOD_TASK_CLOCK_MS = Object.freeze({ asking: parameters.askingMs, answer: parameters.answerMs,
  briefing: parameters.briefingMs, task: parameters.taskMs, return: parameters.returnMs, grace: parameters.presenceGraceMs });

export interface FoodTaskPresenceClock {
  readonly seatId: string;
  readonly alive: boolean;
  readonly lastSeenAt: number;
  /** First server-observed disconnect; repeated observations do not reset this anchor. */
  readonly disconnectedAt: number | null;
}
export interface FoodTaskClockState {
  readonly evaluatedAt: number;
  readonly asking: null | {
    readonly startedAt: number;
    readonly closed: boolean;
    readonly pendingRequest: null | { readonly requestId: string; readonly receivedAt: number };
  };
  readonly task: null | {
    readonly startedAt: number;
    readonly briefingComplete: boolean;
    /** Recorded private ending instant, not late worker execution time; never changes common return. */
    readonly privateEndedAt: number | null;
    readonly returnedAt: number | null;
    readonly participants: readonly FoodTaskPresenceClock[];
  };
  /** Optional server-scheduled physical boundaries; the helper assigns them no gameplay meaning. */
  readonly physics?: readonly { readonly id: string; readonly at: number }[];
}
export type FoodTaskClockBoundary =
  | { readonly kind: 'ASKING_CLOSED' | 'BRIEFING_COMPLETE' | 'TASK_EXPIRED' | 'COMMON_RETURN'; readonly at: number }
  | { readonly kind: 'ANSWER_EXPIRED'; readonly at: number; readonly requestId: string }
  | { readonly kind: 'PRESENCE_EXPIRED'; readonly at: number; readonly seatId: string }
  | { readonly kind: 'PHYSICS'; readonly at: number; readonly id: string };
export type FoodTaskTimedInput = 'ASK' | 'ANSWER' | 'PRESS' | 'HOLD_CONTACT';

function time(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`Invalid server time: ${label}`);
}
function plus(value: number, offset: number): number {
  const result = value + offset;
  if (!Number.isSafeInteger(result)) throw new Error('Server deadline overflow');
  return result;
}
function identifier(value: string, label: string): void {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value))
    throw new Error(`Invalid server identity: ${label}`);
}
function presence(value: FoodTaskPresenceClock): void {
  identifier(value.seatId, 'participant');
  if (!/^seat-[1-9]$/.test(value.seatId)) throw new Error('Invalid participant seat');
  if (typeof value.alive !== 'boolean') throw new Error('Invalid alive presence');
  time(value.lastSeenAt, 'lastSeenAt');
  if (value.disconnectedAt !== null) {
    time(value.disconnectedAt, 'disconnectedAt');
    if (value.disconnectedAt < value.lastSeenAt) throw new Error('Disconnect precedes last presence');
  }
}

/** Validate persisted clock shape and ordering without deriving a game outcome. */
export function assertFoodTaskClockState(state: FoodTaskClockState): void {
  time(state.evaluatedAt, 'evaluatedAt');
  if (state.asking !== null && state.task !== null) throw new Error('Asking and Task clocks overlap');
  if (state.asking !== null) {
    const ask = state.asking;
    time(ask.startedAt, 'asking.startedAt');
    plus(ask.startedAt, FOOD_TASK_CLOCK_MS.asking);
    if (ask.startedAt > state.evaluatedAt || typeof ask.closed !== 'boolean') throw new Error('Invalid asking clock');
    if (ask.closed && state.evaluatedAt < ask.startedAt + FOOD_TASK_CLOCK_MS.asking)
      throw new Error('Asking closed before its deadline');
    if (ask.pendingRequest !== null) {
      identifier(ask.pendingRequest.requestId, 'request');
      time(ask.pendingRequest.receivedAt, 'request.receivedAt');
      plus(ask.pendingRequest.receivedAt, FOOD_TASK_CLOCK_MS.answer);
      if (ask.pendingRequest.receivedAt < ask.startedAt
        || ask.pendingRequest.receivedAt >= ask.startedAt + FOOD_TASK_CLOCK_MS.asking
        || ask.pendingRequest.receivedAt > state.evaluatedAt) throw new Error('Request was not received in the asking interval');
    }
  }
  if (state.task !== null) {
    const task = state.task;
    time(task.startedAt, 'task.startedAt');
    plus(task.startedAt, FOOD_TASK_CLOCK_MS.return);
    if (task.startedAt > state.evaluatedAt || typeof task.briefingComplete !== 'boolean') throw new Error('Invalid Task clock');
    if (task.briefingComplete && state.evaluatedAt < task.startedAt + FOOD_TASK_CLOCK_MS.briefing)
      throw new Error('Briefing completed before its deadline');
    if (task.privateEndedAt !== null) {
      time(task.privateEndedAt, 'privateEndedAt');
      if (task.privateEndedAt < task.startedAt || task.privateEndedAt > state.evaluatedAt
        || task.privateEndedAt > task.startedAt + FOOD_TASK_CLOCK_MS.task)
        throw new Error('Invalid private ending time');
    }
    if (task.returnedAt !== null) {
      time(task.returnedAt, 'returnedAt');
      if (task.returnedAt !== task.startedAt + FOOD_TASK_CLOCK_MS.return
        || task.returnedAt > state.evaluatedAt || task.privateEndedAt === null) throw new Error('Invalid common return time');
    }
    if (task.participants.length !== 2 || new Set(task.participants.map(p => p.seatId)).size !== 2)
      throw new Error('Exactly two distinct Task participants required');
    for (const participant of task.participants) {
      presence(participant);
      if (participant.alive && participant.disconnectedAt !== null) plus(participant.disconnectedAt, FOOD_TASK_CLOCK_MS.grace);
      if (participant.lastSeenAt < task.startedAt || participant.lastSeenAt > state.evaluatedAt
        || participant.disconnectedAt !== null && participant.disconnectedAt > state.evaluatedAt)
        throw new Error('Presence is outside the observed Task interval');
    }
  }
  const physical = state.physics ?? [];
  if (new Set(physical.map(p => p.id)).size !== physical.length)
    throw new Error('Distinct physical boundaries required');
  for (const boundary of physical) {
    identifier(boundary.id, 'physical boundary'); time(boundary.at, 'physical boundary');
    if (state.task === null || boundary.at < state.task.startedAt
      || boundary.at > state.task.startedAt + FOOD_TASK_CLOCK_MS.task)
      throw new Error('Physical boundary is outside the Task interval');
  }
}

/** Derive outstanding boundaries. The caller removes/completes each after resolving it. */
export function foodTaskClockBoundaries(state: FoodTaskClockState): readonly FoodTaskClockBoundary[] {
  assertFoodTaskClockState(state);
  const result: FoodTaskClockBoundary[] = [];
  if (state.asking !== null) {
    const ask = state.asking;
    if (!ask.closed) result.push({ kind: 'ASKING_CLOSED', at: ask.startedAt + FOOD_TASK_CLOCK_MS.asking });
    if (ask.pendingRequest !== null) result.push({ kind: 'ANSWER_EXPIRED',
      at: ask.pendingRequest.receivedAt + FOOD_TASK_CLOCK_MS.answer, requestId: ask.pendingRequest.requestId });
  }
  if (state.task !== null && state.task.returnedAt === null) {
    const task = state.task;
    if (task.privateEndedAt === null) {
      if (!task.briefingComplete) result.push({ kind: 'BRIEFING_COMPLETE', at: task.startedAt + FOOD_TASK_CLOCK_MS.briefing });
      result.push({ kind: 'TASK_EXPIRED', at: task.startedAt + FOOD_TASK_CLOCK_MS.task });
      for (const participant of task.participants) if (participant.alive && participant.disconnectedAt !== null)
        result.push({ kind: 'PRESENCE_EXPIRED', at: participant.disconnectedAt + FOOD_TASK_CLOCK_MS.grace, seatId: participant.seatId });
      for (const physical of state.physics ?? []) result.push({ kind: 'PHYSICS', at: physical.at, id: physical.id });
    }
    result.push({ kind: 'COMMON_RETURN', at: task.startedAt + FOOD_TASK_CLOCK_MS.return });
  }
  return result;
}

/**
 * All outstanding boundaries at the earliest due instant, including equality.
 * The batch has no outcome priority: callers must not interpret array order as a tie-break rule.
 */
export function earliestDueFoodTaskBoundaries(state: FoodTaskClockState, serverNow: number): readonly FoodTaskClockBoundary[] {
  time(serverNow, 'serverNow');
  if (serverNow < state.evaluatedAt) throw new Error('Server clock moved backward');
  const due = foodTaskClockBoundaries(state).filter(boundary => boundary.at <= serverNow);
  if (!due.length) return [];
  const earliest = Math.min(...due.map(boundary => boundary.at));
  return due.filter(boundary => boundary.at === earliest);
}

/** Refuse new input until every earlier/equal server boundary has been drained. */
export function assertFoodTaskInputAdmissible(state: FoodTaskClockState, serverNow: number, input: FoodTaskTimedInput): void {
  if (earliestDueFoodTaskBoundaries(state, serverNow).length) throw new Error('Drain due server boundaries before input');
  const ask = state.asking, task = state.task;
  if (input === 'ASK' && ask !== null && !ask.closed && ask.pendingRequest === null
    && serverNow >= ask.startedAt && serverNow < ask.startedAt + FOOD_TASK_CLOCK_MS.asking) return;
  if (input === 'ANSWER' && ask?.pendingRequest !== null && ask?.pendingRequest !== undefined
    && serverNow >= ask.pendingRequest.receivedAt && serverNow < ask.pendingRequest.receivedAt + FOOD_TASK_CLOCK_MS.answer) return;
  if (input === 'PRESS' && task !== null && task.privateEndedAt === null && task.returnedAt === null && task.briefingComplete
    && serverNow >= task.startedAt + FOOD_TASK_CLOCK_MS.briefing && serverNow < task.startedAt + FOOD_TASK_CLOCK_MS.task) return;
  // Contact closure/intent can precede eligibility; physics remains disabled until briefing/eligibility.
  if (input === 'HOLD_CONTACT' && task !== null && task.privateEndedAt === null && task.returnedAt === null
    && serverNow >= task.startedAt && serverNow < task.startedAt + FOOD_TASK_CLOCK_MS.task) return;
  throw new Error('Input is outside its authoritative interval');
}

/** A repeated server disconnect observation retains the original grace deadline. */
export function noteFoodTaskDisconnect(value: FoodTaskPresenceClock, serverReceivedAt: number): FoodTaskPresenceClock {
  presence(value); time(serverReceivedAt, 'disconnect observation');
  if (serverReceivedAt < value.lastSeenAt || value.disconnectedAt !== null && serverReceivedAt < value.disconnectedAt)
    throw new Error('Disconnect observation moved backward');
  if (!value.alive) return { ...value };
  plus(value.disconnectedAt ?? serverReceivedAt, FOOD_TASK_CLOCK_MS.grace);
  return { ...value, disconnectedAt: value.disconnectedAt ?? serverReceivedAt };
}
