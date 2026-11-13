/** Inactive Food Task candidate. Pure persisted authority: no renderer, wall clock, Firebase or RNG.
 * The caller persists this machine and applies returned world effects in the same transaction.
 * Coordinates/timing are from the owner record and strict contract, not presentation hit testing.
 */
import {
  FOOD_TASK_PARAMETERS as P, FOOD_TASK_VERTICAL as Y,
  FoodTaskCommandRequestSchema, FoodTaskParticipantSchema,
  createHoldLedger, admitHoldInput, admitHoldRecoveryOff, advancePendingHold,
  projectHoldRecovery, foodTaskHoldInput, foodTaskHoldRecoveryInput,
  type FoodTaskCommandRequest, type FoodTaskParticipant, type FoodTaskOutcome,
  type FoodTaskReceipt, type HoldLedger, type HoldContext, type HoldEffect,
  type HoldReceiptCode,
} from '@mothership/contracts';

type Panel = FoodTaskParticipant['panel'];
type Crate = FoodTaskParticipant['crate'];
type Person = FoodTaskParticipant['people'][number];
type TaskEvent = FoodTaskParticipant['events']['events'][number];
type Broken = FoodTaskParticipant['broken'][number];
type Motion = NonNullable<Crate['motion']>;
type Warning = NonNullable<Panel['warning']>;
type Direction = -1 | 1;
type Seat = Person['seatId'];
type Mechanism = 'CUT' | 'DROP';
type Rejection = Extract<FoodTaskReceipt, {status: 'rejected'}>['code'];
type InputResult = Extract<Extract<FoodTaskReceipt, {status: 'accepted'}>['result'], {kind: 'INPUT'}>;
export interface FoodTaskMachineOptions {
  matchId: string; phaseId: string; foodStepId: string; round: number; taskId: string;
  winchSeatId: Seat; panelSeatId: Seat;
  winchControlSessionId: string; panelControlSessionId: string;
  startedAt: number;
}
export type FoodTaskMachineEffect =
  | {type: 'KILL'; id: string; at: number; seatId: string}
  | {type: 'CONSUME_PROTECTION'; id: string; at: number; seatId: string}
  | {type: 'DELIVER'; id: string; at: number; doses: 10};
export interface FoodTaskHazardRoll {
  id: string; at: number; mechanism: Mechanism; actorSeatId: string; victimSeatId: string;
}
export interface FoodTaskPressContext {
  /** Actual original trusted server arrival time, never a phone timestamp. */
  now: number;
  /** Applicability is determined by the world adapter using existing Protection rules. No Clone. */
  protectionBySeat: Readonly<Record<string, boolean>>;
  /** Required for each unprotected lethal press; caller records/deterministically supplies the roll. */
  roll?: (hazard: Readonly<FoodTaskHazardRoll>) => number;
}
interface StoredPress {fingerprint: string; receipt: FoodTaskReceipt}
interface Presence {lastSeenAt: number; disconnectedAt: number | null}
interface HazardRecord extends FoodTaskHazardRoll {roll: number | null; stoppedBy: 'PROTECTION' | 'LUCK' | null}
/** JSON-serializable. All public getters/returns are recursively frozen; snapshots can be restored. */
export interface FoodTaskMachine {
  options: FoodTaskMachineOptions;
  evaluatedAt: number; runningAt: number; deadlineAt: number; returnsAt: number;
  returnedAt: number | null; stage: FoodTaskParticipant['stage'];
  sharedRevision: number; controlRevision: number;
  people: Person[]; panel: Panel; crate: Crate; broken: Broken[];
  hold: HoldLedger; presence: Record<string, Presence>;
  outcome: FoodTaskOutcome | null; delivered: boolean;
  eventCursor: number; events: TaskEvent[];
  /** Private input-only state and defense/RNG evidence never appear in participant projections. */
  receipts: Record<string, StoredPress>; hazards: HazardRecord[];
  /** Scheduled warning intervals are derived only from fixed anchors and approved mechanics. */
  warningWindows: Warning[];
}
export interface FoodTaskMachineTransition {
  machine: FoodTaskMachine; effects: readonly FoodTaskMachineEffect[]; advanced: boolean;
}
export interface FoodTaskPressTransition extends FoodTaskMachineTransition {
  receipt: FoodTaskReceipt; accepted: boolean; replayed: boolean;
}
const own = <T>(v: Readonly<Record<string, T>>, k: string): T | undefined => Object.hasOwn(v, k) ? v[k] : undefined;
const clamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
function freeze<T>(v: T): T {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.values(v).forEach(freeze); Object.freeze(v);
  }
  return v;
}
const clone = <T>(v:T):T => JSON.parse(JSON.stringify(v)) as T;
const copy = (v: FoodTaskMachine): FoodTaskMachine => clone(v);
const id = (v: string): boolean => /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
function time(v: number): void {if (!Number.isSafeInteger(v) || v < 0) throw Error('Invalid authoritative Food Task time');}
function plus(v: number, d: number): number {const n = v + d; time(n); return n;}
function person(m: FoodTaskMachine, seat: string): Person {
  const p = m.people.find(p => p.seatId === seat); if (!p) throw Error('Not a Food Task participant'); return p;
}
const isParticipant = (m: FoodTaskMachine, seat: string): boolean => m.people.some(p => p.seatId === seat);
const session = (m: FoodTaskMachine, seat: string): string => seat === m.options.winchSeatId
  ? m.options.winchControlSessionId : m.options.panelControlSessionId;
const role = (m: FoodTaskMachine, seat: string): 'WINCH' | 'PANEL' => seat === m.options.winchSeatId ? 'WINCH' : 'PANEL';
function changed(m: FoodTaskMachine, control = true): void {
  m.sharedRevision += 1; if (control) m.controlRevision += 1;
}
function event(m: FoodTaskMachine, at: number, detail: Omit<TaskEvent, 'id' | 'cursor' | 'at'>): void {
  m.eventCursor += 1;
  m.events.push({...detail, id: `food-event-${m.eventCursor}`, cursor: m.eventCursor, at} as TaskEvent);
  // A bounded contiguous suffix, never an authority journal. Empty suffix remains render-complete.
  m.events = m.events.slice(-64);
}
function crateEvent(m: FoodTaskMachine, at: number, kind: 'LIFTED' | 'RELEASED' | 'LANDED' | 'RETURNED_TO_INTAKE' | 'BROKEN' | 'TAKEN', actorSeatId: string, x: number, crateId = m.crate.id): void {
  event(m, at, {kind, actorSeatId, crateId, x} as Omit<TaskEvent, 'id' | 'cursor' | 'at'>);
}
function simpleEvent(m: FoodTaskMachine, at: number, kind: 'KEY_TURNED' | 'ONLINE' | 'OFFLINE', seatId: string): void {
  event(m, at, {kind, seatId} as Omit<TaskEvent, 'id' | 'cursor' | 'at'>);
}
function terminal(m: FoodTaskMachine, outcome: FoodTaskOutcome): void {
  if (m.outcome) return;
  m.outcome = outcome; m.stage = 'ENDED'; m.panel.warning = null; m.warningWindows = [];
  // Ending/cancellation does not fabricate a finger-up or invent an extra crate drop.
  changed(m);
  if (outcome.kind === 'CANCELLED') event(m, outcome.at, {kind: 'CANCELLED'});
}
function fold(v: number): {x: number; direction: Direction} {
  const w = ((v % 12) + 12) % 12;
  return w <= 6 ? {x: w, direction: 1} : {x: 12 - w, direction: -1};
}
/** Pure authority sample. LOCK during a snap chooses its destination, including t=anchor. */
export function sampleFoodTaskPanel(m: FoodTaskMachine, at: number): {x: number; stop: number; direction: Direction; resting: boolean} {
  if (m.panel.locked) return {x: m.panel.stop, stop: m.panel.stop, direction: m.panel.direction, resting: true};
  const dt = Math.max(0, at - m.panel.anchorAt), n = Math.floor(dt / (P.snapMs + P.restMs));
  const r = dt - n * (P.snapMs + P.restMs), resting = r >= P.snapMs;
  const start = (m.panel.direction > 0 ? m.panel.stop : 12 - m.panel.stop) + n;
  const u = clamp(r / P.snapMs), eased = u * u * (3 - 2 * u);
  return {x: fold(start + (resting ? 1 : eased)).x,
    stop: Math.round(fold(start + 1).x), direction: fold(start + .5).direction, resting};
}
function ease(kind: Motion['easing'], u: number): number {
  if (kind === 'CUBIC_IN') return u ** 3;
  if (kind === 'CUBIC_OUT') return 1 - (1 - u) ** 3;
  return u < .5 ? 2 * u ** 2 : 1 - (-2 * u + 2) ** 2 / 2;
}
function motionAt(motion: Motion, at: number, lift = false): {x: number; height: number} {
  const u = motion.endsAt === motion.startedAt ? 1 : clamp((at - motion.startedAt) / (motion.endsAt - motion.startedAt));
  const eu = ease(motion.easing, u), ex = lift ? ease(motion.easing, clamp(u / .35)) : eu;
  return {x: motion.fromX + (motion.toX - motion.fromX) * ex,
    height: motion.fromHeight + (motion.toHeight - motion.fromHeight) * eu};
}
/** Full current crate pose, independent of event retention or renderer history. */
export function sampleFoodTaskCrate(m: FoodTaskMachine, at: number): {x: number; height: number} {
  const c = m.crate;
  if (c.motion && (c.state !== 'LIFTING' || at < c.motion.endsAt)) return motionAt(c.motion, at, c.state === 'LIFTING');
  if (c.state === 'HELD' || c.state === 'BRAKED' || c.state === 'LIFTING') {
    const panel = sampleFoodTaskPanel(m, at);
    if (!m.panel.locked || !m.panel.swing) return {x: panel.x, height: Y.raised};
    const swing = m.panel.swing, dt = Math.max(0, at - swing.startedAt);
    const amp = P.leastAmplitude + (swing.amplitude - P.leastAmplitude) * Math.exp(-dt / P.swingSettleMs);
    const offset = swing.direction * amp * Math.sin(2 * Math.PI * dt / P.swingPeriodMs);
    const designY = 140 + Math.sqrt(268 ** 2 - (128 * offset) ** 2);
    return {x: panel.x + offset, height: (658 - designY) / 250};
  }
  return {x: c.x, height: c.height};
}
function motion(from: {x: number; height: number}, toX: number, toHeight: number, at: number,
  duration: number, easing: Motion['easing']): Motion {
  return {fromX: from.x, toX, fromHeight: from.height, toHeight, easing, startedAt: at, endsAt: plus(at, duration)};
}
function canAcquire(m: FoodTaskMachine, at: number): boolean {
  return m.stage === 'ACTIVE' && person(m, m.options.winchSeatId).alive
    && (m.crate.state === 'BRAKED' || m.crate.state === 'INTAKE' && m.crate.motion === null
      && m.panel.locked && m.panel.stop === 0);
}
function holdContext(m: FoodTaskMachine, at: number): HoldContext {
  return {taskId: m.options.taskId, controlSessionId: m.options.winchControlSessionId,
    authenticatedSeatId: m.options.winchSeatId, control: 'WINCH', alive: person(m, m.options.winchSeatId).alive,
    active: m.stage !== 'ENDED', currentRevision: m.controlRevision, currentCrateId: m.crate.id,
    canAcquire: canAcquire(m, at), receivedAt: at};
}
function acquire(m: FoodTaskMachine, at: number): void {
  if (m.crate.state === 'BRAKED') {
    const pose = sampleFoodTaskCrate(m, at);
    m.crate = {...m.crate, state: 'HELD', holder: 'WINCH', x: pose.x, height: pose.height, anchorAt: at};
    crateEvent(m, at, 'TAKEN', m.options.winchSeatId, pose.x);
  } else {
    const pose = sampleFoodTaskCrate(m, at);
    m.crate = {...m.crate, state: 'LIFTING', holder: 'WINCH', x: pose.x, height: pose.height, anchorAt: at,
      motion: motion(pose, 0, Y.raised, at, P.liftMs, 'QUADRATIC_IN_OUT')};
    m.panel.swing = {startedAt: plus(at, P.liftMs), amplitude: P.liftAmplitude, direction: 1};
    crateEvent(m, at, 'LIFTED', m.options.winchSeatId, pose.x);
  }
  changed(m);
}
function advanceIntent(m: FoodTaskMachine, at: number): void {
  const next = advancePendingHold(m.hold, holdContext(m, at));
  m.hold = next.ledger;
  if (next.effect.type === 'ACQUIRE') acquire(m, at);
}
function landing(x: number): 'INTAKE' | 'PLATFORM' | 'CONSOLE' | 'DECK' {
  if (Math.abs(x - 5) <= P.platformHalfWidth) return 'PLATFORM';
  if (Math.abs(x - 4) <= P.consoleHalfWidth) return 'CONSOLE';
  if (Math.abs(x) <= P.intakeHalfWidth) return 'INTAKE';
  return 'DECK';
}
function fallOf(m: FoodTaskMachine, at: number): {pose: {x: number; height: number}; result: 'BACK' | 'LAND' | 'DROP' | 'BREAK'; zone: ReturnType<typeof landing>} {
  const pose = sampleFoodTaskCrate(m, at);
  if (m.crate.state === 'LIFTING' && m.crate.motion && at < m.crate.motion.endsAt)
    return {pose, result: 'BACK', zone: 'INTAKE'};
  const zone = landing(pose.x);
  const result = zone === 'INTAKE' ? 'BACK' : zone === 'PLATFORM' && m.panel.locked ? 'LAND'
    : zone === 'CONSOLE' && person(m, m.options.panelSeatId).alive ? 'DROP' : 'BREAK';
  return {pose, result, zone};
}
function breakCrate(m: FoodTaskMachine, at: number, fall: ReturnType<typeof fallOf>): void {
  const old = m.crate;
  const surface = fall.zone === 'CONSOLE' ? 'CONSOLE' : fall.zone === 'PLATFORM' ? 'PLATFORM' : 'DECK';
  const targetHeight = surface === 'CONSOLE' ? Y.console : surface === 'PLATFORM' ? Y.platform : Y.deck;
  m.broken.push({crateId: old.id, at, x: fall.pose.x, landing: surface,
    motion: motion(fall.pose, fall.pose.x, targetHeight, at, P.fallMs, 'CUBIC_IN')});
  m.broken = m.broken.slice(-64);
  crateEvent(m, at, 'BROKEN', m.options.winchSeatId, fall.pose.x, old.id);
  const generation = old.generation + 1;
  if (!Number.isSafeInteger(generation)) throw Error('Food crate generation exhausted');
  m.crate = {id: `food-crate-${generation}`, generation, state: 'INTAKE', holder: null, x: 0,
    height: -.184, anchorAt: at,
    motion: motion({x: 0, height: -.184}, 0, Y.intake, at, P.fallMs, 'CUBIC_OUT')};
  m.panel.swing = null;
  changed(m);
}
function lethal(m: FoodTaskMachine, at: number, mechanism: Mechanism, context: FoodTaskPressContext,
  effects: FoodTaskMachineEffect[]): boolean {
  const actorSeatId = mechanism === 'CUT' ? m.options.panelSeatId : m.options.winchSeatId;
  const victimSeatId = mechanism === 'CUT' ? m.options.winchSeatId : m.options.panelSeatId;
  const ordinal = m.hazards.length + 1;
  const hazard: FoodTaskHazardRoll = {id: `${m.options.taskId}-hazard-${ordinal}`, at, mechanism, actorSeatId, victimSeatId};
  const protectedNow = own(context.protectionBySeat, victimSeatId) === true;
  const roll = protectedNow ? null : context.roll?.(freeze({...hazard}));
  if (!protectedNow && (roll === undefined || typeof roll !== 'number' || !Number.isFinite(roll) || roll < 0 || roll >= 1))
    throw Error('An unprotected lethal press requires a recorded server roll in [0,1)');
  const stoppedBy = protectedNow ? 'PROTECTION' : roll! < P.catchProbability ? 'LUCK' : null;
  m.hazards.push({...hazard, roll: roll ?? null, stoppedBy});
  const pose = sampleFoodTaskCrate(m, at);
  event(m, at, {kind: stoppedBy ? 'STOPPED' : 'ELIMINATED', mechanism, actorSeatId, victimSeatId,
    crateId: m.crate.id, x: pose.x} as Omit<TaskEvent, 'id' | 'cursor' | 'at'>);
  if (stoppedBy) {
    if (stoppedBy === 'PROTECTION') effects.push({type: 'CONSUME_PROTECTION',
      id: `${m.options.taskId}-protection-${ordinal}`, at, seatId: victimSeatId});
    changed(m);
    return false;
  }
  const victim = person(m, victimSeatId);
  victim.alive = false; victim.keyTurned = false; victim.death = {at, mechanism, actorSeatId};
  effects.push({type: 'KILL', id: `${m.options.taskId}-kill-${ordinal}`, at, seatId: victimSeatId});
  changed(m);
  return true;
}
function tryDeliver(m: FoodTaskMachine, at: number, effects: FoodTaskMachineEffect[]): void {
  if (m.outcome || m.crate.state !== 'LANDED') return;
  const alive = m.people.filter(p => p.alive);
  if (!alive.length || !alive.every(p => p.keyTurned)) return;
  m.crate = {...m.crate, state: 'SENT', holder: null, height: Y.platform, anchorAt: at,
    motion: motion({x: m.crate.x, height: Y.platform}, m.crate.x, -.12, at, 1_100, 'QUADRATIC_IN_OUT')};
  if (m.delivered) throw Error('Duplicate Food delivery');
  m.delivered = true;
  effects.push({type: 'DELIVER', id: `${m.options.taskId}-deliver`, at, doses: 10});
  event(m, at, {kind: 'DELIVERED'});
  terminal(m, {kind: 'DELIVERED', at, dosesAdded: 10});
}
function release(m: FoodTaskMachine, at: number, context: FoodTaskPressContext, effects: FoodTaskMachineEffect[]): void {
  const fall = fallOf(m, at);
  crateEvent(m, at, 'RELEASED', m.options.winchSeatId, fall.pose.x);
  if (fall.result === 'DROP') {
    if (!lethal(m, at, 'DROP', context, effects)) {
      m.crate = {...m.crate, state: 'BRAKED', holder: 'BRAKE', motion: null,
        x: fall.pose.x, height: fall.pose.height, anchorAt: at};
      changed(m); return;
    }
    breakCrate(m, at, fall);
    terminal(m, {kind: 'LOST', at, reason: 'CRATE_BROKEN_NO_FETCHER'});
    return;
  }
  if (fall.result === 'BREAK') {breakCrate(m, at, fall); return;}
  const target = fall.result === 'LAND' ? {x: 5, height: Y.platform} : {x: 0, height: Y.intake};
  m.crate = {...m.crate, state: 'FALLING', holder: null, x: fall.pose.x, height: fall.pose.height, anchorAt: at,
    motion: motion(fall.pose, target.x, target.height, at, P.fallMs, 'CUBIC_IN')};
  m.panel.swing = null; changed(m);
}
function applyHoldEffect(m: FoodTaskMachine, effect: HoldEffect, context: FoodTaskPressContext, effects: FoodTaskMachineEffect[]): void {
  if (effect.type === 'NONE') return;
  if (effect.crateId !== m.crate.id) throw Error('Hold effect lost its crate generation');
  if (effect.type === 'ACQUIRE') acquire(m, effect.serverReceivedAt);
  else release(m, effect.serverReceivedAt, context, effects);
}

/** Warning predicate is evaluated at integer authoritative milliseconds, matching TimestampSchema.
 * The future 150ms margin changes presentation only; actual hazards use the receipt-time pose.
 * No timer ever executes a lethal action without its corresponding received press.
 */
function warningWindows(m: FoodTaskMachine): Warning[] {
  if (m.outcome) return [];
  const start = Math.max(m.runningAt, m.evaluatedAt), end = m.deadlineAt;
  if (start >= end) return [];
  const cut: boolean[] = [], drop: boolean[] = [];
  const winchAlive = person(m, m.options.winchSeatId).alive, panelAlive = person(m, m.options.panelSeatId).alive;
  for (let t = start; t < end; t++) {
    cut.push(winchAlive && !m.panel.locked && sampleFoodTaskPanel(m, t).stop === 6);
    drop.push(panelAlive && m.crate.holder === 'WINCH' && fallOf(m, t).result === 'DROP');
  }
  let nextCut = Infinity, nextDrop = Infinity;
  const visible: Array<Mechanism | null> = [];
  for (let i = cut.length - 1; i >= 0; i--) {
    if (cut[i]) nextCut = i;
    if (drop[i]) nextDrop = i;
    visible[i] = nextCut - i <= P.warningMs ? 'CUT' : nextDrop - i <= P.warningMs ? 'DROP' : null;
  }
  const windows: Warning[] = [];
  for (let i = 0; i < visible.length;) {
    const mechanism = visible[i];
    if (!mechanism) {i++; continue;}
    let j = i + 1; while (visible[j] === mechanism) j++;
    windows.push({mechanism, actorSeatId: mechanism === 'CUT' ? m.options.panelSeatId : m.options.winchSeatId,
      victimSeatId: mechanism === 'CUT' ? m.options.winchSeatId : m.options.panelSeatId,
      startsAt: start + i, endsAt: start + j});
    i = j;
  }
  return windows;
}
function refreshWarning(m: FoodTaskMachine, at: number): void {
  const next = m.warningWindows.find(w => w.startsAt <= at && at < w.endsAt) ?? null;
  if (JSON.stringify(next) !== JSON.stringify(m.panel.warning)) {m.panel.warning = next; changed(m, false);}
}
function rebuildWarnings(m: FoodTaskMachine): void {
  const old = m.panel.warning;
  m.warningWindows = warningWindows(m);
  // Keep an already-visible window's original anchor when an unrelated key/presence changes nothing.
  const current = m.warningWindows.find(w => w.startsAt <= m.evaluatedAt && m.evaluatedAt < w.endsAt);
  if (old && current && old.mechanism === current.mechanism && old.endsAt === current.endsAt)
    current.startsAt = old.startsAt;
  refreshWarning(m, m.evaluatedAt);
}
interface Boundary {at: number; kind: 'TIME' | 'GRACE' | 'BRIEFING' | 'MOTION' | 'WARNING' | 'RETURN'; rank: number; seatId?: Seat}
// Preserve pinned design/food-supply/task.mjs:374-394's technical terminal order:
// earliest due time, Task deadline before exact grace tie, then Winch before Panel.
// Equal grace implies equal first-offline time because both use the same fixed 8 seconds.
function boundaries(m: FoodTaskMachine): Boundary[] {
  const b: Boundary[] = [];
  if (m.returnedAt === null) b.push({at: m.returnsAt, kind: 'RETURN', rank: 5});
  if (m.outcome) return b;
  b.push({at: m.deadlineAt, kind: 'TIME', rank: 0});
  m.people.forEach((p, i) => {
    const disconnectedAt = own(m.presence, p.seatId)?.disconnectedAt;
    if (p.alive && disconnectedAt !== null && disconnectedAt !== undefined)
      b.push({at: plus(disconnectedAt, P.presenceGraceMs), kind: 'GRACE', rank: 1 + i / 10, seatId: p.seatId});
  });
  if (m.stage === 'BRIEFING') b.push({at: m.runningAt, kind: 'BRIEFING', rank: 2});
  if (m.crate.motion && ['LIFTING', 'FALLING', 'INTAKE'].includes(m.crate.state))
    b.push({at: m.crate.motion.endsAt, kind: 'MOTION', rank: 3});
  for (const w of m.warningWindows) {
    if (w.startsAt > m.evaluatedAt) b.push({at: w.startsAt, kind: 'WARNING', rank: 4});
    if (w.endsAt > m.evaluatedAt) b.push({at: w.endsAt, kind: 'WARNING', rank: 4});
  }
  return b.sort((a, b) => a.at - b.at || a.rank - b.rank);
}
/** Earliest outstanding timer; root scheduling remains durable and version-pinned. */
export function foodTaskMachineDeadlineAt(m: FoodTaskMachine): number | null {return boundaries(m)[0]?.at ?? null;}
function advanceMutable(m: FoodTaskMachine, now: number, effects: FoodTaskMachineEffect[]): boolean {
  time(now); if (now < m.evaluatedAt) throw Error('Food Task server time moved backward');
  const before = JSON.stringify([m.stage, m.sharedRevision, m.hold.recoveryRevision, m.returnedAt]);
  while (true) {
    const boundary = boundaries(m).find(b => b.at <= now);
    if (!boundary) break;
    m.evaluatedAt = boundary.at;
    if (boundary.kind === 'TIME') terminal(m, {kind: 'LOST', at: boundary.at, reason: 'TIME'});
    else if (boundary.kind === 'GRACE') terminal(m, {kind: 'CANCELLED', at: boundary.at,
      reason: 'DISCONNECT', disconnectedSeatId: boundary.seatId!});
    else if (boundary.kind === 'RETURN') m.returnedAt = boundary.at;
    else if (boundary.kind === 'BRIEFING') {m.stage = 'ACTIVE'; changed(m, false); advanceIntent(m, boundary.at); rebuildWarnings(m);}
    else if (boundary.kind === 'MOTION') {
      const c = m.crate, segment = c.motion!;
      if (c.state === 'LIFTING') m.crate = {...c, state: 'HELD', x: segment.toX, height: segment.toHeight, anchorAt: boundary.at, motion: null};
      else {
        const onPlatform = c.state === 'FALLING' && segment.toHeight === Y.platform;
        m.crate = {...c, state: onPlatform ? 'LANDED' : 'INTAKE', x: segment.toX, height: segment.toHeight,
          anchorAt: boundary.at, motion: null};
        if (c.state === 'FALLING') crateEvent(m, boundary.at, onPlatform ? 'LANDED' : 'RETURNED_TO_INTAKE', m.options.winchSeatId, segment.toX);
      }
      // Completion was fixed by the accepted trajectory; it does not create another Panel CAS dependency.
      changed(m, false); advanceIntent(m, boundary.at); tryDeliver(m, boundary.at, effects); rebuildWarnings(m);
    } else refreshWarning(m, boundary.at);
  }
  m.evaluatedAt = now;
  return before !== JSON.stringify([m.stage, m.sharedRevision, m.hold.recoveryRevision, m.returnedAt]);
}
export function createFoodTaskMachine(options: FoodTaskMachineOptions): FoodTaskMachine {
  if (![options.matchId, options.phaseId, options.foodStepId, options.taskId, options.winchControlSessionId,
    options.panelControlSessionId].every(id)
    || !/^seat-[1-9]$/.test(options.winchSeatId) || !/^seat-[1-9]$/.test(options.panelSeatId)
    || options.winchSeatId === options.panelSeatId || options.winchControlSessionId === options.panelControlSessionId
    || !Number.isInteger(options.round) || options.round < 1) throw Error('Invalid Food Task assignment/context');
  time(options.startedAt);
  const m: FoodTaskMachine = {options: {...options}, evaluatedAt: options.startedAt,
    runningAt: plus(options.startedAt, P.briefingMs), deadlineAt: plus(options.startedAt, P.taskMs),
    returnsAt: plus(options.startedAt, P.returnMs), returnedAt: null, stage: 'BRIEFING',
    sharedRevision: 0, controlRevision: 0,
    people: [options.winchSeatId, options.panelSeatId].map(seatId => ({seatId, alive: true, online: true, keyTurned: false, death: null})),
    panel: {locked: true, stop: 0, direction: 1, anchorAt: options.startedAt,
      blade: {state: 'LOWERED', stop: 0, changedAt: options.startedAt}, warning: null, swing: null},
    crate: {id: 'food-crate-0', generation: 0, state: 'INTAKE', holder: null, x: 0, height: Y.intake,
      anchorAt: options.startedAt, motion: null}, broken: [],
    hold: createHoldLedger(options.taskId, options.winchControlSessionId, options.winchSeatId, options.startedAt),
    presence: Object.fromEntries([options.winchSeatId, options.panelSeatId].map(seatId => [seatId, {lastSeenAt: options.startedAt, disconnectedAt: null}])),
    outcome: null, delivered: false, eventCursor: 0, events: [], receipts: {}, hazards: [], warningWindows: []};
  return freeze(m);
}
export function advanceFoodTaskMachine(before: FoodTaskMachine, now: number): FoodTaskMachineTransition {
  const m = copy(before), effects: FoodTaskMachineEffect[] = [];
  const advanced = advanceMutable(m, now, effects);
  return freeze({machine: m, effects, advanced});
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
function envelope(request: FoodTaskCommandRequest): Omit<FoodTaskCommandRequest, 'command'> {
  const {command: _, ...base} = request; return base;
}
function holdCode(code: HoldReceiptCode): Rejection {
  if (code === 'FUTURE_REVISION') return 'FUTURE_REVISION';
  if (code === 'STALE_RECOVERY') return 'STALE_RECOVERY';
  if (code === 'WRONG_CONTROL') return 'WRONG_CONTROL';
  if (code === 'CRATE_MISMATCH') return 'CRATE_CHANGED';
  if (code === 'OLD_GESTURE') return 'GESTURE_CLOSED';
  if (code === 'WRONG_BINDING' || code === 'STALE_TIME') return 'STALE_CONTEXT';
  if (code === 'NOT_ACTIVE') return 'PHASE_CLOSED';
  return 'NOT_ALLOWED';
}
export function applyFoodTaskPress(before: FoodTaskMachine, authenticatedSeatId: string, request: FoodTaskCommandRequest,
  context: FoodTaskPressContext): FoodTaskPressTransition {
  // The outer service also parses/authorizes. Defense here is independent of transport/Firebase.
  const parsed = FoodTaskCommandRequestSchema.safeParse(request);
  if (!parsed.success) throw Error('Malformed Food Task request');
  const m = copy(before), effects: FoodTaskMachineEffect[] = [];
  const advanced = advanceMutable(m, context.now, effects), command = request.command;
  const finish = (receipt: FoodTaskReceipt, replayed = false, persist = true): FoodTaskPressTransition => {
    if (persist && isParticipant(m, authenticatedSeatId)) m.receipts[`${authenticatedSeatId}:${request.commandId}`] = {fingerprint: canonical(request), receipt};
    return freeze({machine: m, effects, advanced, receipt, accepted: receipt.status === 'accepted', replayed});
  };
  const reject = (code: Rejection, persist = true) => finish({...envelope(request), status: 'rejected',
    receivedAt: context.now, code, requestClosure: null}, false, persist);
  if (!isParticipant(m, authenticatedSeatId)) return reject('PHASE_CLOSED', false);
  if (request.matchId !== m.options.matchId || request.phaseId !== m.options.phaseId
    || request.foodStepId !== m.options.foodStepId || request.round !== m.options.round
    || command.type !== 'TASK_PRESS' || command.taskId !== m.options.taskId
    || command.controlSessionId !== session(m, authenticatedSeatId)) return reject('STALE_CONTEXT', false);
  const saved = own(m.receipts, `${authenticatedSeatId}:${request.commandId}`);
  if (saved) {
    if (saved.fingerprint !== canonical(request)) return reject('NOT_ALLOWED', false);
    return finish(saved.receipt, true, false);
  }
  if (m.outcome || m.returnedAt !== null) return reject('PHASE_CLOSED');
  const actor = person(m, authenticatedSeatId);
  if (!actor.alive) return reject('NOT_ALLOWED');
  if (command.expectedControlRevision > m.controlRevision) return reject('FUTURE_REVISION');
  const input = command.input;
  const applied = (effect: InputResult['effect'] = 'APPLIED', gestureSequence: number | null = null,
    crateId: string | null = null, closedThroughSequence?: number) => finish({...envelope(request), status: 'accepted',
    receivedAt: context.now, result: {kind: 'INPUT', taskId: command.taskId, controlSessionId: command.controlSessionId,
      effect, gestureSequence, crateId, ...(closedThroughSequence === undefined ? {} : {closedThroughSequence})}});
  if (input.kind === 'HOLD' || input.kind === 'HOLD_RECOVER_OFF') {
    if (role(m, authenticatedSeatId) !== 'WINCH') return reject('WRONG_CONTROL');
    if (input.kind === 'HOLD' && input.edge === 'DOWN' && ['LANDED', 'SENT'].includes(m.crate.state)) return reject('NOT_ALLOWED');
    const result = input.kind === 'HOLD' ? admitHoldInput(m.hold, foodTaskHoldInput(request), holdContext(m, context.now))
      : admitHoldRecoveryOff(m.hold, foodTaskHoldRecoveryInput(request), holdContext(m, context.now));
    m.hold = result.ledger;
    if (result.receipt.status === 'rejected') return reject(holdCode(result.receipt.code));
    applyHoldEffect(m, result.effect, context, effects);
    if (result.effect.type === 'RELEASE') advanceIntent(m, context.now);
    // A pending contact may become eligible when RELEASE establishes brake custody.
    // Recovery has already closed every pending contact before that single release.
    if (result.effect.type !== 'NONE') rebuildWarnings(m);
    if (input.kind === 'HOLD_RECOVER_OFF') return applied('RECOVERED_CLOSED', null, result.receipt.boundCrateId, input.throughSequence);
    const closed = ['CLOSED', 'ALREADY_CLOSED', 'OLD_GESTURE'].includes(result.receipt.code);
    return applied(result.effect.type === 'NONE' ? closed ? 'GESTURE_CLOSED' : 'NO_CHANGE' : 'APPLIED',
      input.gestureSequence, result.receipt.boundCrateId);
  }
  if (m.stage !== 'ACTIVE') return reject('NOT_ALLOWED');
  if (input.kind === 'KEY') {
    if (m.crate.state !== 'LANDED') return reject('NOT_ALLOWED');
    if (actor.keyTurned) return applied('NO_CHANGE');
    actor.keyTurned = true; changed(m, false); simpleEvent(m, context.now, 'KEY_TURNED', authenticatedSeatId);
    tryDeliver(m, context.now, effects); return applied();
  }
  if (role(m, authenticatedSeatId) !== 'PANEL') return reject('WRONG_CONTROL');
  // Panel toggles depend on the current control geometry; Hold contacts and independent keys do not.
  if (command.expectedControlRevision < m.controlRevision) return reject('STALE_CONTEXT');
  if (input.kind === 'PANEL_RELEASE') {
    if (!m.panel.locked || m.crate.motion !== null && m.crate.state !== 'SENT'
      || m.crate.state === 'INTAKE' && m.panel.stop === 0) return reject('NOT_ALLOWED');
    const stop = m.panel.stop;
    m.panel = {...m.panel, locked: false, direction: stop === 6 ? -1 : stop === 0 ? 1 : m.panel.direction,
      anchorAt: context.now, swing: null, blade: {state: 'RAISED', stop, changedAt: context.now}};
    const pose = sampleFoodTaskCrate(m, context.now);
    crateEvent(m, context.now, 'RELEASED', m.options.panelSeatId, pose.x);
    changed(m); rebuildWarnings(m); return applied();
  }
  if (input.kind !== 'PANEL_LOCK' || m.panel.locked) return reject('NOT_ALLOWED');
  const sample = sampleFoodTaskPanel(m, context.now), hanging = m.crate.state === 'HELD' || m.crate.state === 'BRAKED';
  m.panel = {...m.panel, locked: true, stop: sample.stop, direction: sample.direction, anchorAt: context.now,
    blade: {state: 'LOWERED', stop: sample.stop, changedAt: context.now},
    swing: hanging ? {startedAt: context.now, amplitude: P.lockAmplitude,
      direction: sample.stop === 6 ? -1 : sample.stop === 0 ? 1 : sample.direction} : null};
  changed(m);
  if (sample.stop === 6 && person(m, m.options.winchSeatId).alive) {
    const killed = lethal(m, context.now, 'CUT', context, effects);
    if (!killed) m.panel.blade.state = 'BUFFERED';
    else if (m.crate.state !== 'LANDED') terminal(m, {kind: 'LOST', at: context.now, reason: 'NOT_OVER_PLATFORM'});
    else tryDeliver(m, context.now, effects);
  }
  advanceIntent(m, context.now); rebuildWarnings(m); return applied();
}
/** Explicit trusted server connection evidence. Disconnect never fabricates a successful release. */
export function setFoodTaskPresence(before: FoodTaskMachine, seatId: string, online: boolean, now: number): FoodTaskMachineTransition {
  const m = copy(before), effects: FoodTaskMachineEffect[] = [], advanced = advanceMutable(m, now, effects);
  if (!isParticipant(m, seatId)) throw Error('Unknown Food Task presence seat');
  const p = person(m, seatId), presence = m.presence[seatId]!;
  if (m.outcome || !p.alive) return freeze({machine: m, effects, advanced});
  if (online) presence.lastSeenAt = now;
  if (p.online === online) return freeze({machine: m, effects, advanced});
  p.online = online; presence.disconnectedAt = online ? null : presence.disconnectedAt ?? now;
  simpleEvent(m, now, online ? 'ONLINE' : 'OFFLINE', seatId); changed(m, false);
  return freeze({machine: m, effects, advanced: true});
}
/** Own Hold state is visible only to Winch; all defense/RNG/receipt/presence anchors stay private. */
export function projectFoodTaskParticipant(m: FoodTaskMachine, seatId: string): FoodTaskParticipant {
  if (!isParticipant(m, seatId)) throw Error('Food Task participant projection denied');
  const winch = seatId === m.options.winchSeatId;
  const participant: FoodTaskParticipant = {
    foodStepId: m.options.foodStepId, round: m.options.round, taskId: m.options.taskId,
    revision: m.sharedRevision + (winch ? m.hold.recoveryRevision : 0), controlRevision: m.controlRevision,
    participantSeatIds: [m.options.winchSeatId, m.options.panelSeatId], winchSeatId: m.options.winchSeatId,
    panelSeatId: m.options.panelSeatId, selfControl: winch ? 'WINCH' : 'PANEL', controlSessionId: session(m, seatId),
    startedAt: m.options.startedAt, runningAt: m.runningAt, deadlineAt: m.deadlineAt, returnsAt: m.returnsAt,
    stage: m.stage, people: clone(m.people), panel: clone(m.panel), crate: clone(m.crate),
    ownGesture: winch ? {controlSessionId: m.options.winchControlSessionId, ...projectHoldRecovery(m.hold)} : null,
    broken: clone(m.broken), events: {cursor: m.eventCursor, events: clone(m.events)},
    outcome: clone(m.outcome),
  };
  return freeze(FoodTaskParticipantSchema.parse(participant));
}

export type FoodTaskMachineInputKind = 'HOLD' | 'PANEL_RELEASE' | 'PANEL_LOCK' | 'KEY';
/** Offers derive from the same authority interlocks. Causal UP/recovery intentionally needs no
 * visible offer; its original Task/session/gesture still binds it and prevents resurrection.
 */
export function foodTaskMachineInputs(m: FoodTaskMachine, seatId: string): FoodTaskMachineInputKind[] {
  if (!isParticipant(m, seatId) || m.outcome || m.returnedAt !== null || !person(m, seatId).alive) return freeze([]);
  const result: FoodTaskMachineInputKind[] = [];
  if (seatId === m.options.winchSeatId && !['LANDED', 'SENT'].includes(m.crate.state)) result.push('HOLD');
  if (m.stage !== 'ACTIVE') return freeze(result);
  if (m.crate.state === 'LANDED' && !person(m, seatId).keyTurned) result.push('KEY');
  if (seatId === m.options.panelSeatId) {
    if (!m.panel.locked) result.push('PANEL_LOCK');
    else if (!(m.crate.motion !== null && m.crate.state !== 'SENT')
      && !(m.crate.state === 'INTAKE' && m.panel.stop === 0)) result.push('PANEL_RELEASE');
  }
  return freeze(result);
}
