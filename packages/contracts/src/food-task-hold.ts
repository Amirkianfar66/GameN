/** Candidate-only, pure admission ledger. No physics, hazard rolls, food or transport.
 * Persist the returned ledger and apply its effect in one authority transaction.
 * A server-issued control session belongs to one Task and authenticated Winch seat.
 */
export interface HoldInput {
  readonly commandId: string;
  readonly taskId: string;
  readonly controlSessionId: string;
  /** Adapter name for the strict wire field expectedControlRevision; observed <= current is valid.
   * This is not a blanket board CAS, and never a client clock. Gesture and crate bindings are causal.
   */
  readonly expectedRevision: number;
  readonly gestureSequence: number;
  readonly edge: 'DOWN' | 'UP';
  /** Null DOWN is unbound held intent; known DOWN is an observed-generation precondition.
   * Null UP resolves only this gesture's durable binding, including before acknowledgement.
   */
  readonly crateId: string | null;
}
export interface HoldContext {
  readonly taskId: string;
  readonly controlSessionId: string;
  readonly authenticatedSeatId: string;
  readonly control: 'WINCH' | 'PANEL';
  readonly alive: boolean;
  readonly active: boolean;
  readonly currentRevision: number;
  readonly currentCrateId: string;
  /** Calculated by the future authoritative physics, never supplied by the phone. */
  readonly canAcquire: boolean;
  /** Original authoritative receipt/boundary time. Never the phone's shownAt. */
  readonly receivedAt: number;
}
export interface HoldRecoveryInput {
  readonly kind: 'HOLD_RECOVER_OFF';
  readonly commandId: string;
  readonly taskId: string;
  readonly controlSessionId: string;
  readonly expectedRevision: number;
  readonly recoveryRevision: number;
  /** Includes locally ended/unacknowledged contacts not yet seen by the server. */
  readonly throughSequence: number;
}
export interface HoldRecoveryView {
  readonly currentHolder: Readonly<{sequence: number; crateId: string}> | null;
  readonly pendingIntent: Readonly<{sequence: number; crateId: string | null}> | null;
  readonly highestSequence: number;
  readonly recoveryRevision: number;
}
type Gesture = Readonly<{
  sequence: number;
  state: 'PENDING' | 'HOLDING' | 'CLOSED';
  expectedCrateId: string | null;
  boundCrateId: string | null;
}>;
export type HoldReceiptCode =
  | 'DOWN_PENDING' | 'ACQUIRED' | 'RELEASED' | 'CLOSED' | 'ALREADY_CLOSED' | 'ALREADY_DOWN'
  | 'INVALID_INPUT' | 'WRONG_BINDING' | 'WRONG_CONTROL' | 'NOT_ALIVE' | 'NOT_ACTIVE'
  | 'FUTURE_REVISION' | 'STALE_TIME' | 'OLD_GESTURE' | 'CRATE_MISMATCH'
  | 'COMMAND_ID_CONFLICT' | 'RECOVERED_CLOSED' | 'STALE_RECOVERY';
export interface HoldReceipt {
  readonly commandId: string;
  readonly taskId: string;
  readonly controlSessionId: string;
  readonly gestureSequence: number;
  readonly status: 'accepted' | 'rejected';
  readonly code: HoldReceiptCode;
  readonly serverReceivedAt: number;
  readonly boundCrateId: string | null;
  /** Only RECOVERED_CLOSED asserts atomic closure of all contacts through this sequence. */
  readonly closedHighwater: number | null;
}
type StoredReceipt = Readonly<{fingerprint: string; receipt: HoldReceipt}>;
export interface HoldLedger {
  readonly taskId: string;
  readonly controlSessionId: string;
  readonly seatId: string;
  readonly highestSequence: number;
  /** Changes only when accepted input state/actual ownership changes, never for clocks or refusals. */
  readonly recoveryRevision: number;
  readonly evaluatedAt: number;
  readonly holderSequence: number | null;
  readonly gestures: Readonly<Record<string, Gesture>>;
  readonly receipts: Readonly<Record<string, StoredReceipt>>;
}
export type HoldEffect = Readonly<{type: 'NONE'}> | Readonly<{
  type: 'ACQUIRE' | 'RELEASE';
  id: string;
  taskId: string;
  controlSessionId: string;
  gestureSequence: number;
  crateId: string;
  serverReceivedAt: number;
}>;
export interface HoldAdmission {
  readonly ledger: HoldLedger;
  readonly receipt: HoldReceipt;
  readonly replayed: boolean;
  readonly effect: HoldEffect;
}
type MutableLedger = {
  taskId: string; controlSessionId: string; seatId: string; highestSequence: number; recoveryRevision: number;
  evaluatedAt: number; holderSequence: number | null;
  gestures: Record<string, Gesture>; receipts: Record<string, StoredReceipt>;
};
const none: HoldEffect = Object.freeze({type: 'NONE'});
const identifier = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
const natural = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const own = <T>(map: Readonly<Record<string, T>>, key: string): T | undefined => Object.hasOwn(map, key) ? map[key] : undefined;
function clone(value: HoldLedger): MutableLedger {
  return {...value,
    gestures: Object.fromEntries(Object.entries(value.gestures).map(([k, v]) => [k, {...v}])),
    receipts: Object.fromEntries(Object.entries(value.receipts).map(([k, v]) => [k, {fingerprint: v.fingerprint, receipt: {...v.receipt}}])),
  };
}
function freeze(value: MutableLedger): HoldLedger {
  for (const v of Object.values(value.gestures)) Object.freeze(v);
  for (const v of Object.values(value.receipts)) { Object.freeze(v.receipt); Object.freeze(v); }
  Object.freeze(value.gestures); Object.freeze(value.receipts);
  return Object.freeze(value);
}
function inputState(value: HoldLedger): string {
  return JSON.stringify([value.highestSequence, value.holderSequence,
    Object.entries(value.gestures).sort(([a], [b]) => Number(a) - Number(b))
      .map(([key, g]) => [key, g.sequence, g.state, g.expectedCrateId, g.boundCrateId])]);
}
function complete(before: HoldLedger, value: MutableLedger): HoldLedger {
  if (!natural(before.recoveryRevision)) throw Error('Invalid Hold recovery revision');
  if (inputState(before) !== inputState(value)) {
    if (before.recoveryRevision === Number.MAX_SAFE_INTEGER) throw Error('Hold recovery revision exhausted');
    value.recoveryRevision = before.recoveryRevision + 1;
  }
  return freeze(value);
}
function assertContext(c: HoldContext): void {
  if (![c.taskId, c.controlSessionId, c.authenticatedSeatId, c.currentCrateId].every(identifier)
    || !natural(c.currentRevision) || !natural(c.receivedAt)
    || !['WINCH', 'PANEL'].includes(c.control)
    || typeof c.active !== 'boolean' || typeof c.alive !== 'boolean' || typeof c.canAcquire !== 'boolean')
    throw Error('Invalid server Hold context');
}
function validInput(v: HoldInput): boolean {
  const keys = ['commandId', 'taskId', 'controlSessionId', 'expectedRevision', 'gestureSequence', 'edge', 'crateId'];
  return v !== null && typeof v === 'object' && Object.keys(v).length === keys.length
    && Object.keys(v).every(k => keys.includes(k))
    && [v.commandId, v.taskId, v.controlSessionId].every(identifier)
    && natural(v.expectedRevision) && natural(v.gestureSequence) && v.gestureSequence > 0
    && (v.edge === 'DOWN' || v.edge === 'UP')
    && (v.crateId === null || identifier(v.crateId));
}
const fingerprint = (v: HoldInput): string => JSON.stringify([
  v.taskId, v.controlSessionId, v.expectedRevision, v.gestureSequence, v.edge, v.crateId,
]);
const boundContext = (l: HoldLedger, c: HoldContext): boolean => l.taskId === c.taskId
  && l.controlSessionId === c.controlSessionId && l.seatId === c.authenticatedSeatId;
function effect(type: 'ACQUIRE' | 'RELEASE', l: HoldLedger, g: Gesture, c: HoldContext): HoldEffect {
  if (g.boundCrateId === null) throw Error('An effect requires the gesture crate binding');
  return Object.freeze({type, id: JSON.stringify([l.taskId, l.controlSessionId, g.sequence, g.boundCrateId, type]),
    taskId: l.taskId, controlSessionId: l.controlSessionId, gestureSequence: g.sequence,
    crateId: g.boundCrateId, serverReceivedAt: c.receivedAt});
}
function supersedePending(l: MutableLedger, sequence: number): void {
  if (sequence <= l.highestSequence) return;
  for (const [key, g] of Object.entries(l.gestures)) if (g.sequence < sequence && g.state === 'PENDING')
    l.gestures[key] = {...g, state: 'CLOSED'};
  l.highestSequence = sequence;
}
export function createHoldLedger(taskId: string, controlSessionId: string, seatId: string, at: number): HoldLedger {
  if (![taskId, controlSessionId, seatId].every(identifier) || !natural(at)) throw Error('Invalid Hold binding');
  return freeze({taskId, controlSessionId, seatId, highestSequence: 0, recoveryRevision: 0, evaluatedAt: at,
    holderSequence: null, gestures: {}, receipts: {}});
}
export function admitHoldInput(before: HoldLedger, input: HoldInput, c: HoldContext): HoldAdmission {
  assertContext(c);
  const l = clone(before);
  const finish = (status: HoldReceipt['status'], code: HoldReceiptCode, boundCrateId: string | null = null,
    physicalEffect: HoldEffect = none, persist = true, receivedAt = c.receivedAt): HoldAdmission => {
    const receipt: HoldReceipt = Object.freeze({commandId: input.commandId, taskId: input.taskId,
      controlSessionId: input.controlSessionId, gestureSequence: input.gestureSequence,
      status, code, serverReceivedAt: receivedAt, boundCrateId, closedHighwater: null});
    if (persist) l.receipts[input.commandId] = {fingerprint: fingerprint(input), receipt};
    return Object.freeze({ledger: complete(before, l), receipt, replayed: false, effect: physicalEffect});
  };
  // Authentication/binding precedes receipt recovery. Never reveal another controller's receipt.
  if (!validInput(input)) return finish('rejected', 'INVALID_INPUT', null, none, false);
  if (!boundContext(l, c) || input.taskId !== l.taskId || input.controlSessionId !== l.controlSessionId)
    return finish('rejected', 'WRONG_BINDING', null, none, false);
  if (c.control !== 'WINCH') return finish('rejected', 'WRONG_CONTROL', null, none, false);
  const previous = own(l.receipts, input.commandId);
  if (previous) {
    if (previous.fingerprint !== fingerprint(input))
      return finish('rejected', 'COMMAND_ID_CONFLICT', null, none, false, previous.receipt.serverReceivedAt);
    return Object.freeze({ledger: complete(before, l), receipt: previous.receipt, replayed: true, effect: none});
  }
  if (!c.active) return finish('rejected', 'NOT_ACTIVE');
  if (!c.alive) return finish('rejected', 'NOT_ALIVE');
  if (input.expectedRevision > c.currentRevision) return finish('rejected', 'FUTURE_REVISION');
  if (c.receivedAt < l.evaluatedAt) return finish('rejected', 'STALE_TIME');
  l.evaluatedAt = c.receivedAt;
  const key = String(input.gestureSequence), previousGesture = own(l.gestures, key);
  const closed = (): Gesture => ({sequence: input.gestureSequence, state: 'CLOSED',
    expectedCrateId: previousGesture?.expectedCrateId ?? input.crateId,
    boundCrateId: previousGesture?.boundCrateId ?? null});
  if (input.edge === 'UP') {
    // Closing an unseen gesture is safe even when its DOWN was delayed; no crate is guessed.
    if (previousGesture?.state === 'CLOSED') return finish('accepted', 'ALREADY_CLOSED', previousGesture.boundCrateId);
    if (previousGesture?.boundCrateId && input.crateId !== null && input.crateId !== previousGesture.boundCrateId)
      return finish('rejected', 'CRATE_MISMATCH');
    supersedePending(l, input.gestureSequence);
    const g = closed(); l.gestures[key] = g;
    if (l.holderSequence === input.gestureSequence) {
      l.holderSequence = null;
      // A different live crate cannot be released, even by an old genuine gesture.
      if (g.boundCrateId !== c.currentCrateId) return finish('accepted', 'CLOSED', g.boundCrateId);
      return finish('accepted', 'RELEASED', g.boundCrateId, effect('RELEASE', l, g, c));
    }
    return finish('accepted', 'CLOSED', g.boundCrateId);
  }
  if (previousGesture) {
    if (previousGesture.state === 'CLOSED') return finish('accepted', 'ALREADY_CLOSED', previousGesture.boundCrateId);
    if (previousGesture.expectedCrateId !== input.crateId) return finish('rejected', 'CRATE_MISMATCH');
    return finish('accepted', 'ALREADY_DOWN', previousGesture.boundCrateId);
  }
  const wasOld = input.gestureSequence < l.highestSequence;
  if (wasOld) return finish('rejected', 'OLD_GESTURE');
  if (input.crateId !== null && input.crateId !== c.currentCrateId) return finish('rejected', 'CRATE_MISMATCH');
  supersedePending(l, input.gestureSequence);
  const g: Gesture = {sequence: input.gestureSequence, state: 'PENDING', expectedCrateId: input.crateId, boundCrateId: null};
  if (c.canAcquire && l.holderSequence === null) {
    const held: Gesture = {...g, state: 'HOLDING', boundCrateId: c.currentCrateId};
    l.gestures[key] = held; l.holderSequence = held.sequence;
    return finish('accepted', 'ACQUIRED', held.boundCrateId, effect('ACQUIRE', l, held, c));
  }
  l.gestures[key] = g;
  return finish('accepted', 'DOWN_PENDING');
}
/** An authoritative eligibility boundary may finish an already-accepted held contact once.
 * No new receipt is minted and the old DOWN receipt remains immutable. No phone replay is needed.
 */
export function advancePendingHold(before: HoldLedger, c: HoldContext): Readonly<{ledger: HoldLedger; effect: HoldEffect}> {
  assertContext(c);
  const l = clone(before), finish = (result: HoldEffect = none) => Object.freeze({ledger: complete(before, l), effect: result});
  if (!boundContext(l, c) || c.control !== 'WINCH' || !c.active || !c.alive || c.receivedAt < l.evaluatedAt) return finish();
  l.evaluatedAt = c.receivedAt;
  const key = String(l.highestSequence), g = own(l.gestures, key);
  if (!g || g.state !== 'PENDING' || l.holderSequence !== null) return finish();
  // A known generation is an explicit precondition. Unbound held intent acquires
  // whichever generation the authority first makes eligible, then binds once.
  if (g.expectedCrateId !== null && g.expectedCrateId !== c.currentCrateId) { l.gestures[key] = {...g, state: 'CLOSED'}; return finish(); }
  if (!c.canAcquire) return finish();
  const held: Gesture = {...g, state: 'HOLDING', boundCrateId: c.currentCrateId};
  l.gestures[key] = held; l.holderSequence = held.sequence;
  return finish(effect('ACQUIRE', l, held, c));
}

/** Own-controller projection. Highest observed contact is not necessarily the current crate owner.
 * Calling this getter writes no cursor, clock, receipt or publication state.
 */
export function projectHoldRecovery(value: HoldLedger): HoldRecoveryView {
  const holder = value.holderSequence === null ? undefined : own(value.gestures, String(value.holderSequence));
  if (value.holderSequence !== null && (!holder || holder.state !== 'HOLDING' || holder.boundCrateId === null))
    throw Error('Invalid Hold owner binding');
  const pending = own(value.gestures, String(value.highestSequence));
  return Object.freeze({
    currentHolder: holder && holder.boundCrateId !== null ? Object.freeze({sequence: holder.sequence, crateId: holder.boundCrateId}) : null,
    pendingIntent: pending?.state === 'PENDING' ? Object.freeze({sequence: pending.sequence, crateId: pending.expectedCrateId}) : null,
    highestSequence: value.highestSequence,
    recoveryRevision: value.recoveryRevision,
  });
}
function validRecoveryInput(v: HoldRecoveryInput): boolean {
  const keys = ['kind', 'commandId', 'taskId', 'controlSessionId', 'expectedRevision', 'recoveryRevision', 'throughSequence'];
  return v !== null && typeof v === 'object' && Object.keys(v).length === keys.length
    && Object.keys(v).every(k => keys.includes(k)) && v.kind === 'HOLD_RECOVER_OFF'
    && [v.commandId, v.taskId, v.controlSessionId].every(identifier)
    && natural(v.expectedRevision) && natural(v.recoveryRevision) && natural(v.throughSequence);
}
const recoveryFingerprint = (v: HoldRecoveryInput): string => JSON.stringify([
  v.kind, v.taskId, v.controlSessionId, v.expectedRevision, v.recoveryRevision, v.throughSequence,
]);
/** Explicitly received local-finger-off reconciliation. Never call this merely on disconnect.
 * Close every pending contact atomically before releasing the one actual owner. The high-water
 * includes in-flight contacts, so separate delayed DOWN packets cannot resurrect a held finger.
 */
export function admitHoldRecoveryOff(before: HoldLedger, input: HoldRecoveryInput, c: HoldContext): HoldAdmission {
  assertContext(c);
  const l = clone(before);
  const finish = (status: HoldReceipt['status'], code: HoldReceiptCode, boundCrateId: string | null = null,
    physicalEffect: HoldEffect = none, persist = true, receivedAt = c.receivedAt): HoldAdmission => {
    const receipt: HoldReceipt = Object.freeze({commandId: input.commandId, taskId: input.taskId,
      controlSessionId: input.controlSessionId, gestureSequence: input.throughSequence,
      status, code, serverReceivedAt: receivedAt, boundCrateId,
      closedHighwater: status === 'accepted' && code === 'RECOVERED_CLOSED' ? l.highestSequence : null});
    if (persist) l.receipts[input.commandId] = {fingerprint: recoveryFingerprint(input), receipt};
    return Object.freeze({ledger: complete(before, l), receipt, replayed: false, effect: physicalEffect});
  };
  if (!validRecoveryInput(input)) return finish('rejected', 'INVALID_INPUT', null, none, false);
  if (!boundContext(l, c) || input.taskId !== l.taskId || input.controlSessionId !== l.controlSessionId)
    return finish('rejected', 'WRONG_BINDING', null, none, false);
  if (c.control !== 'WINCH') return finish('rejected', 'WRONG_CONTROL', null, none, false);
  const previous = own(l.receipts, input.commandId);
  if (previous) {
    if (previous.fingerprint !== recoveryFingerprint(input))
      return finish('rejected', 'COMMAND_ID_CONFLICT', null, none, false, previous.receipt.serverReceivedAt);
    return Object.freeze({ledger: complete(before, l), receipt: previous.receipt, replayed: true, effect: none});
  }
  if (!c.active) return finish('rejected', 'NOT_ACTIVE');
  if (!c.alive) return finish('rejected', 'NOT_ALIVE');
  if (input.expectedRevision > c.currentRevision) return finish('rejected', 'FUTURE_REVISION');
  if (c.receivedAt < l.evaluatedAt) return finish('rejected', 'STALE_TIME');
  if (input.recoveryRevision !== l.recoveryRevision || input.throughSequence < l.highestSequence)
    return finish('rejected', 'STALE_RECOVERY');
  l.evaluatedAt = c.receivedAt;
  const holder = l.holderSequence === null ? undefined : own(l.gestures, String(l.holderSequence));
  for (const [key, g] of Object.entries(l.gestures)) if (g.state === 'PENDING' || g.sequence === l.holderSequence)
    l.gestures[key] = {...g, state: 'CLOSED'};
  l.holderSequence = null;
  l.highestSequence = input.throughSequence;
  // A high-water without a tombstone at equality would leave that exact late DOWN admissible.
  if (input.throughSequence > 0 && !own(l.gestures, String(input.throughSequence)))
    l.gestures[String(input.throughSequence)] = {sequence: input.throughSequence, state: 'CLOSED', expectedCrateId: null, boundCrateId: null};
  const released = holder?.boundCrateId ?? null;
  return finish('accepted', 'RECOVERED_CLOSED', released,
    holder?.state === 'HOLDING' && released === c.currentCrateId ? effect('RELEASE', l, holder, c) : none);
}
