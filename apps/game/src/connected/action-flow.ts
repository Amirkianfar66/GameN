import { FullCommandRequestSchema, IdentifierSchema, SeatIdSchema } from '@mothership/contracts';
import type { FullCommandRequest, FullPlayerView, FullReceipt, SeatId } from '@mothership/contracts';
import type { ActionChoice, ActionFlowState, ActionKind, Destination, NotAcceptedReason } from '@mothership/presentation';
import type { PlayerPorts } from '../ports.js';
import type { ConnectedApi, ConnectedCommandResult } from './api.js';

export type { ActionChoice, ActionFlowState, ActionKind, Destination, NotAcceptedReason };

// One player's own command under wire protocol 2, from picking an action up to knowing what
// the server did with it. One command at a time for the seat, whatever its kind: while an
// earlier one is unaccounted for, no new intent is offered, and the flow has no way to put
// an unaccounted-for command aside.
//
// The flow decides nothing about the game. What may be chosen is read from the player's own
// authoritative view (the server's destinations, the server's legal targets) and from
// nowhere else, and only while that view is known to be fresh. "Accepted" is only ever what
// the server said, by a receipt.
//
// Reliability follows docs/backend/protocol2-client-handoff.md, "Durable receipts and
// uncertain delivery":
//   - a receipt, accepted or rejected, is final for its command identifier;
//   - the identical request sent again returns that receipt or is decided now;
//   - a lost answer, a timeout, an unreadable body and UNAVAILABLE leave the outcome
//     unknown, and a safe failure settles only the invocation it answered: it settles the
//     command only if no other attempt went unanswered or is still on its way;
//   - a rate-limit answer names the least time to wait before anything is sent about the
//     command again, whatever else happens in the meantime;
//   - a command is sent only on a view the server confirmed. One the server has never
//     looked at is sent only while what the player confirmed is still what the present allows.
//
// Across a page reload only the command's identifiers survive, never its payload. A
// reloaded page can ask about the command but cannot send it again. It keeps the command
// pending while its phase is open; once a fresh view shows that phase closed, a lookup made
// after that view settles it, and "unknown" then means it was not accepted.

/** Client-side technical parameters. None of them is a game rule or a server deadline. */
export interface ActionFlowTiming {
  /** A control that sends or acknowledges does nothing for this long after it appears, against the second tap of a double tap. */
  readonly controlGuardMs: number;
  /**
   * The wait before each automatic check of an unanswered command. Their number bounds one
   * series of automatic checks. The first is also the least time between two checks,
   * however they are started: by a timer, by the feed coming back, or by the player.
   */
  readonly recheckDelaysMs: readonly number[];
  /** Added to a delay the server named, once per seat number, so that phones told to wait at the same moment come back spread out. */
  readonly retryJitterMs: number;
}
export const DEFAULT_ACTION_FLOW_TIMING: ActionFlowTiming = {
  controlGuardMs: 400,
  recheckDelaysMs: [1_000, 2_000, 4_000],
  retryJitterMs: 100,
};

/** What the flow is told on every redraw. */
export interface ActionFlowContext {
  /** The latest view that passed every check, or null before one has arrived. */
  readonly view: FullPlayerView | null;
  /** The view is a fresh server snapshot of a feed that is up. No command is offered or sent otherwise. */
  readonly current: boolean;
  /**
   * The trusted countdown of the view's phase is running. False once it has ended, and false
   * while this device has no trusted clock to tell: not knowing is not permission.
   */
  readonly inTime: boolean;
  /** The private panel is open in the foreground. Once it is not, a choice that was not sent is dropped. */
  readonly panelOpen: boolean;
  readonly foreground: boolean;
}

export interface ActionFlow {
  getState(): ActionFlowState;
  /** Told only about changes the flow makes on its own time: an answer, a check, a control becoming active. */
  subscribe(listener: () => void): () => void;
  /** Never notifies; the caller reads the state afterwards. */
  observe(context: ActionFlowContext): void;
  // Each returns whether it changed anything. None of them notifies.
  open(kind: ActionKind): boolean;
  choose(choice: ActionChoice): boolean;
  back(): boolean;
  confirm(): boolean;
  checkAgain(): boolean;
  dismiss(): boolean;
  dispose(): void;
}

export interface ActionFlowOptions {
  readonly api: Pick<ConnectedApi, 'command' | 'receipt'>;
  readonly ports: PlayerPorts;
  /** The match this client asked for. An unresolved command kept for any other match is discarded. */
  readonly matchId: string;
  /** The seat the host approved. One kept for any other seat is discarded. */
  readonly seatId: SeatId;
  readonly timing?: Partial<ActionFlowTiming> | undefined;
}

/** What identifies a command without saying anything about it. This, and only this, is kept across a reload. */
interface CommandIds {
  readonly matchId: string;
  readonly seatId: SeatId;
  readonly phaseId: string;
  readonly commandId: string;
}

interface Pending {
  readonly ids: CommandIds;
  /** The request itself, to send again. Null on a reloaded page. */
  readonly request: FullCommandRequest | null;
  readonly choice: ActionChoice | null;
  /** The number of the latest check started. Answers to an earlier one are ignored. */
  round: number;
  /** An attempt to send it got no usable answer, so it may have been decided without this device knowing. */
  unanswered: boolean;
  /** Attempts to send it that are still on their way. Any of them may yet be decided. */
  out: number;
}

type State =
  | { readonly step: 'idle' }
  // A choice belongs to the phase it was made in.
  | { readonly step: 'choosing'; readonly kind: ActionKind; readonly phaseId: string }
  | { readonly step: 'confirming'; readonly choice: ActionChoice; readonly phaseId: string }
  | { readonly step: 'submitting' | 'checking' | 'unknown'; readonly pending: Pending }
  | { readonly step: 'accepted'; readonly choice: ActionChoice | null }
  | { readonly step: 'rejected'; readonly ids: CommandIds; readonly choice: ActionChoice | null; readonly code: 'PHASE_CLOSED' | 'NOT_ALLOWED' }
  // ids is null when nothing was ever sent.
  | { readonly step: 'not-accepted'; readonly ids: CommandIds | null; readonly choice: ActionChoice | null; readonly reason: NotAcceptedReason };

type Outcome = { readonly receipt: FullReceipt } | { readonly reason: NotAcceptedReason } | null;

/** What the server's own view offers this seat right now, for one kind of action. */
export function offeredChoices(view: FullPlayerView, kind: ActionKind): ActionChoice[] {
  if (kind === 'move') return view.self.movementDestinations.map(destination => ({ kind, destination }));
  // An open shot category with no legal target offers nothing to choose.
  return view.self.shotAvailable ? (view.legalTargets['REGISTER_SHOT'] ?? []).map(targetSeatId => ({ kind, targetSeatId })) : [];
}

const sameChoice = (a: ActionChoice, b: ActionChoice): boolean =>
  (a.kind === 'move' && b.kind === 'move' && a.destination === b.destination) || (a.kind === 'shot' && b.kind === 'shot' && a.targetSeatId === b.targetSeatId);

export function createActionFlow(options: ActionFlowOptions): ActionFlow {
  const { api, ports } = options;
  const timing: ActionFlowTiming = { ...DEFAULT_ACTION_FLOW_TIMING, ...options.timing };
  const listeners = new Set<() => void>();
  const usedIds = new Set<string>();
  const jitterMs = timing.retryJitterMs * Number(options.seatId.slice(5));
  /** The least time between the starts of two checks. */
  const checkGapMs = timing.recheckDelaysMs[0] ?? 1_000;

  let context: ActionFlowContext = { view: null, current: false, inTime: false, panelOpen: false, foreground: true };
  let state: State = { step: 'idle' };
  let disposed = false;
  let checkTimer: unknown = null;
  let armTimer: unknown = null;
  let armedAt = 0;
  let roundsLeft = 0;
  let delayIndex = 0;
  /**
   * Nothing is sent or asked before this moment: the server said to wait. It is this
   * device's limit, not one command's, so it also holds the first send of the next command.
   */
  let notBefore = 0;
  /** When the latest check started. */
  let lastCheckAt = Number.NEGATIVE_INFINITY;
  /** A command recalled after a reload has not been asked about yet. */
  let recalled = false;

  function emit(): void {
    if (disposed) return;
    for (const listener of [...listeners]) listener();
  }

  // The store is the host's. A command is sent only once its identifiers are known to be
  // there, so that a reload at any later instant can still ask about it.
  function keep(ids: CommandIds): boolean {
    try {
      const record = JSON.stringify(ids);
      ports.unresolved.save(record);
      return ports.unresolved.load() === record;
    } catch {
      return false;
    }
  }
  function forget(): void {
    try {
      ports.unresolved.clear();
    } catch {
      // As above.
    }
  }
  function recall(): CommandIds | null {
    try {
      const raw = ports.unresolved.load();
      if (typeof raw !== 'string') return null;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const { matchId, seatId, phaseId, commandId } = parsed as Record<string, unknown>;
      const seat = SeatIdSchema.safeParse(seatId);
      const [match, phase, command] = [matchId, phaseId, commandId].map(value => IdentifierSchema.safeParse(value));
      if (!seat.success || !match?.success || !phase?.success || !command?.success) return null;
      // Kept by another match or another seat in this tab: not this seat's to ask about.
      if (match.data !== options.matchId || seat.data !== options.seatId) return null;
      return { matchId: match.data, seatId: seat.data, phaseId: phase.data, commandId: command.data };
    } catch {
      return null;
    }
  }

  function clearCheckTimer(): void {
    if (checkTimer !== null) ports.scheduler.clearTimeout(checkTimer);
    checkTimer = null;
  }

  /** Starts the wait before a control that has just appeared becomes active, and says when it has. */
  function arm(): void {
    if (armTimer !== null) ports.scheduler.clearTimeout(armTimer);
    armedAt = ports.clock.now() + timing.controlGuardMs;
    armTimer = ports.scheduler.setTimeout(() => {
      armTimer = null;
      // The timer is the authority: one that fires a moment early by the clock must not
      // leave the control drawn as inactive with nothing left to redraw it.
      armedAt = 0;
      emit();
    }, timing.controlGuardMs);
  }
  const isArmed = (): boolean => ports.clock.now() >= armedAt;

  /** The interface would let the player start or send something right now. */
  const canAct = (): boolean => context.view !== null && context.current && context.inTime && context.panelOpen;
  const offered = (choice: ActionChoice): boolean => context.view !== null && offeredChoices(context.view, choice.kind).some(candidate => sameChoice(candidate, choice));

  /** True while this is still the command the flow is waiting on. Late answers find it false. */
  function isOpen(pending: Pending): boolean {
    return !disposed && 'pending' in state && state.pending === pending;
  }
  /**
   * A fresh server view shows that the phase the command was sent in is over, so it can no
   * longer be newly accepted. A view that is not known to be fresh proves nothing here.
   */
  const phaseIsOver = (ids: CommandIds): boolean => context.view !== null && context.current && context.view.phase.id !== ids.phaseId;

  function settle(pending: Pending, outcome: Exclude<Outcome, null>): void {
    clearCheckTimer();
    forget();
    if ('reason' in outcome) state = { step: 'not-accepted', ids: pending.ids, choice: pending.choice, reason: outcome.reason };
    else if (outcome.receipt.status === 'accepted') state = { step: 'accepted', choice: pending.choice };
    else state = { step: 'rejected', ids: pending.ids, choice: pending.choice, code: outcome.receipt.code };
    arm();
  }
  /** The player's own view lists the command as waiting, which only a registered command is. */
  const listed = (ids: CommandIds): boolean => context.view?.ownPendingCommandIds.includes(ids.commandId) ?? false;
  function settleFromView(choice: ActionChoice | null): void {
    clearCheckTimer();
    forget();
    state = { step: 'accepted', choice };
    arm();
  }

  /** The server said to wait: nothing is sent about this command before then, whatever starts the next check. */
  function waitOut(retryAfterMs: number | null): void {
    notBefore = Math.max(notBefore, ports.clock.now() + (retryAfterMs ?? 0) + jitterMs);
  }

  /** What an answer to the command means for the command it was an attempt at. Called once that attempt is no longer out. */
  function read(pending: Pending, result: ConnectedCommandResult | null): Outcome {
    if (result === null || result.kind === 'no-response') {
      pending.unanswered = true;
      return null;
    }
    if (result.kind === 'receipt') return { receipt: result.receipt };
    const { code } = result;
    // Told to wait: this invocation decided nothing, and the same request may go again later.
    if (code === 'RATE_LIMITED') {
      waitOut(result.retryAfterMs);
      return null;
    }
    if (code === 'UNAVAILABLE') {
      pending.unanswered = true;
      return null;
    }
    // A safe failure settles only the invocation it answered. It settles the command only if
    // no other attempt can have been decided: none went unanswered, and none is still out.
    return pending.unanswered || pending.out > 0 ? null : { reason: code };
  }

  /** One attempt at the command. It is counted as out until it has returned, with an answer or without. */
  async function attempt(pending: Pending, request: FullCommandRequest): Promise<Outcome> {
    pending.out += 1;
    let result: ConnectedCommandResult | null = null;
    try {
      result = await api.command(request);
    } catch {
      // The request was checked before it was handed over, so nothing can be concluded here.
    }
    pending.out -= 1;
    return read(pending, result);
  }

  /** Every condition the first send was made under still holds for this command. */
  function stillAllowed(pending: Pending): boolean {
    return context.view !== null && context.current && context.inTime && context.view.phase.id === pending.ids.phaseId
      && pending.choice !== null && offered(pending.choice);
  }

  /**
   * The server told this device to wait, about an earlier command, and that time is not up.
   * The new command is held until it is, and goes then only if what the player confirmed is
   * still what the present allows: the server has not looked at it, so nothing is owed to it.
   */
  function holdFirst(pending: Pending, request: FullCommandRequest): void {
    clearCheckTimer();
    checkTimer = ports.scheduler.setTimeout(() => {
      checkTimer = null;
      if (!isOpen(pending)) return;
      if (stillAllowed(pending)) return void sendFirst(pending, request);
      settle(pending, { reason: 'NOT_SENT' });
      emit();
    }, notBefore - ports.clock.now());
  }

  async function sendFirst(pending: Pending, request: FullCommandRequest): Promise<void> {
    const outcome = await attempt(pending, request);
    if (!isOpen(pending)) return;
    if (outcome !== null) settle(pending, outcome);
    else beginChecking(pending, timing.recheckDelaysMs.length);
    emit();
  }

  // Finds out what happened to a command that got no usable answer. A receipt is returned
  // whichever check it answers; anything less is returned only to the latest check.
  async function reconcile(pending: Pending, round: number): Promise<Outcome> {
    const { ids, request } = pending;
    const latest = (): boolean => isOpen(pending) && pending.round === round;
    // Taken before asking: only a lookup made after a fresh view showed the phase over can
    // show by itself that the command will never be accepted.
    const phaseWasOver = phaseIsOver(ids);
    const looked = await api.receipt({ protocolVersion: 2, matchId: ids.matchId, commandId: ids.commandId });
    if (!isOpen(pending)) return null;
    if (looked.kind === 'found') {
      // A receipt for another phase cannot belong to this command, whatever identifier it carries.
      return looked.receipt.phaseId === ids.phaseId ? { receipt: looked.receipt } : null;
    }
    if (!latest()) return null;
    if (looked.kind === 'api-failure' && looked.code === 'RATE_LIMITED') {
      waitOut(looked.retryAfterMs);
      return null;
    }
    // The server could not be asked. Nothing is sent into that silence.
    if (looked.kind !== 'unknown') return null;
    if (request === null) {
      // A reloaded page cannot send the command again: its payload is gone and is not rebuilt.
      // No receipt exists; if its phase was already over when that was asked, none will be an
      // acceptance. While the phase is open the command stays pending.
      return phaseWasOver ? { reason: 'PHASE_OVER' } : null;
    }
    // No receipt yet. A command goes out only on a view the server confirmed; until there is
    // one again this check ends here, and the feed coming back starts the next.
    if (!context.current) return null;
    // Told to wait while this check was asking, by an answer to an earlier attempt: not before then.
    if (ports.clock.now() < notBefore) return null;
    if (!pending.unanswered && pending.out === 0 && !stillAllowed(pending)) {
      // Every attempt so far was turned away before the server looked at it, and no receipt
      // exists: the server has never judged this command. What the player confirmed is no
      // longer what the present allows, so it is not sent now either.
      return { reason: 'NOT_SENT' };
    }
    // An earlier attempt may still be on its way or may have been decided unheard. Sending
    // the identical request is the one step that always ends in a durable answer: the
    // original receipt if an attempt got through, otherwise a decision on this one.
    const outcome = await attempt(pending, request);
    if (outcome !== null && 'receipt' in outcome) return outcome;
    return latest() ? outcome : null;
  }

  /** How long from now until a check may start: never sooner than the server said, and never on the heels of the last one. */
  function earliest(plannedMs: number): number {
    const now = ports.clock.now();
    return Math.max(plannedMs, notBefore - now, lastCheckAt + checkGapMs - now, 0);
  }

  /** Starts the next check after `plannedMs`, or later if it may not start that soon. With nothing to wait for it starts at once. */
  function scheduleRound(pending: Pending, plannedMs: number): void {
    clearCheckTimer();
    const delayMs = earliest(plannedMs);
    if (delayMs <= 0) return void runRound(pending);
    checkTimer = ports.scheduler.setTimeout(() => {
      checkTimer = null;
      void runRound(pending);
    }, delayMs);
  }

  function nextPlannedDelay(): number {
    const delays = timing.recheckDelaysMs;
    const planned = delays[Math.min(delayIndex, delays.length - 1)] ?? 0;
    delayIndex += 1;
    return planned;
  }

  async function runRound(pending: Pending): Promise<void> {
    if (!isOpen(pending)) return;
    // A newer check supersedes one still waiting on the server. Of the older one's answers
    // only a receipt still counts.
    pending.round += 1;
    const round = pending.round;
    roundsLeft -= 1;
    lastCheckAt = ports.clock.now();
    let outcome: Outcome = null;
    try {
      outcome = await reconcile(pending, round);
    } catch {
      // A transport that misbehaves is the same as one that did not answer.
    }
    if (!isOpen(pending)) return;
    // A receipt is the server's durable decision on this command. It settles it whenever it arrives.
    if (outcome !== null && 'receipt' in outcome) {
      settle(pending, outcome);
      return emit();
    }
    if (pending.round !== round) return;
    if (outcome !== null) settle(pending, outcome);
    else if (roundsLeft > 0) return scheduleRound(pending, nextPlannedDelay());
    else {
      state = { step: 'unknown', pending };
      arm();
    }
    emit();
  }

  /** Starts a series of checks. "Now" still means: not before the server allows, and not on the heels of the last check. */
  function beginChecking(pending: Pending, rounds: number, now = false): void {
    clearCheckTimer();
    state = { step: 'checking', pending };
    roundsLeft = Math.max(1, rounds);
    delayIndex = 0;
    scheduleRound(pending, now ? 0 : nextPlannedDelay());
  }

  function buildRequest(phaseId: string, choice: ActionChoice): FullCommandRequest | null {
    let commandId: unknown;
    try {
      commandId = ports.ids.next();
    } catch {
      return null;
    }
    // An identifier is used for one command only. Reusing one could make the server answer
    // a new choice with the receipt of an old one.
    if (typeof commandId !== 'string' || usedIds.has(commandId)) return null;
    usedIds.add(commandId);
    const request: FullCommandRequest = {
      protocolVersion: 2, matchId: options.matchId, phaseId, commandId,
      command: choice.kind === 'move' ? { type: 'MOVE', destination: choice.destination } : { type: 'REGISTER_SHOT', targetSeatId: choice.targetSeatId },
    };
    return FullCommandRequestSchema.safeParse(request).success ? request : null;
  }

  // A command whose outcome was unknown when the page was last unloaded.
  const kept = recall();
  if (kept === null) {
    forget();
  } else {
    usedIds.add(kept.commandId);
    // Whatever was sent before the reload may or may not have been answered: unknown is the honest start.
    state = { step: 'checking', pending: { ids: kept, request: null, choice: null, round: 0, unanswered: true, out: 0 } };
    recalled = true;
  }

  return {
    getState() {
      switch (state.step) {
        case 'idle': return { step: 'idle' };
        case 'choosing': return { step: 'choosing', kind: state.kind };
        case 'confirming': return { step: 'confirming', choice: state.choice, armed: isArmed() };
        case 'submitting': return { step: 'submitting', choice: state.pending.choice };
        case 'checking': return { step: 'checking', choice: state.pending.choice, recovered: state.pending.request === null };
        case 'unknown': return { step: 'unknown', choice: state.pending.choice, recovered: state.pending.request === null, phaseOver: phaseIsOver(state.pending.ids), armed: isArmed() };
        case 'accepted': return { step: 'accepted', choice: state.choice, armed: isArmed() };
        case 'rejected': return { step: 'rejected', choice: state.choice, code: state.code, armed: isArmed() };
        case 'not-accepted': return { step: 'not-accepted', choice: state.choice, reason: state.reason, armed: isArmed() };
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    observe(next) {
      if (disposed) return;
      const previous = context;
      context = next;
      const view = next.view;

      if ('pending' in state) {
        const { pending } = state;
        if (view === null) return;
        // The composed view is authoritative. It lists the command, so the command is registered.
        if (listed(pending.ids)) return settleFromView(pending.choice);
        if (recalled) {
          // The first view of this page: now there is something to ask the server against.
          recalled = false;
          return beginChecking(pending, timing.recheckDelaysMs.length, true);
        }
        if (state.step === 'submitting') return;
        // The first answer never came. Each of these is a fresh reason to ask again at once:
        // the feed is current again, the page is back in front, or the phase has moved on.
        const cameBack = (next.current && !previous.current) || (next.foreground && !previous.foreground);
        const phaseMoved = previous.view !== null && view.phase.id !== previous.view.phase.id;
        if (cameBack || phaseMoved) beginChecking(pending, timing.recheckDelaysMs.length, true);
        return;
      }

      // A command the view lists is registered, whatever this device concluded about it earlier.
      if ((state.step === 'rejected' || state.step === 'not-accepted') && state.ids !== null && listed(state.ids)) settleFromView(state.choice);

      // A choice that has not been sent does not outlive the conditions it was made under:
      // a closed panel, a view that is no longer fresh, a clock that ran out, a new phase.
      if (state.step === 'choosing' || state.step === 'confirming') {
        if (!canAct() || view === null || view.phase.id !== state.phaseId) state = { step: 'idle' };
        else if (state.step === 'choosing' && offeredChoices(view, state.kind).length === 0) state = { step: 'idle' };
        else if (state.step === 'confirming' && !offered(state.choice)) state = { step: 'choosing', kind: state.choice.kind, phaseId: state.phaseId };
      }
    },

    open(kind) {
      if (disposed || state.step !== 'idle' || !canAct() || context.view === null) return false;
      if (offeredChoices(context.view, kind).length === 0) return false;
      state = { step: 'choosing', kind, phaseId: context.view.phase.id };
      return true;
    },
    choose(choice) {
      if (disposed || state.step !== 'choosing' || choice.kind !== state.kind || !canAct() || !offered(choice)) return false;
      state = { step: 'confirming', choice, phaseId: state.phaseId };
      arm();
      return true;
    },
    back() {
      if (disposed) return false;
      if (state.step === 'confirming') state = { step: 'choosing', kind: state.choice.kind, phaseId: state.phaseId };
      else if (state.step === 'choosing') state = { step: 'idle' };
      else return false;
      return true;
    },
    confirm() {
      // Only the confirm step can start a command, and it leaves that step before anything is
      // sent, so a second activation finds nothing to do: one confirmation, one command. What
      // is sent later is that same request again, to find out what became of it.
      if (disposed || state.step !== 'confirming' || !isArmed() || !canAct() || !offered(state.choice)) return false;
      const { choice, phaseId } = state;
      const request = buildRequest(phaseId, choice);
      if (request === null) {
        state = { step: 'not-accepted', ids: null, choice, reason: 'NOT_SENT' };
        arm();
        return true;
      }
      const pending: Pending = { ids: { matchId: options.matchId, seatId: options.seatId, phaseId, commandId: request.commandId }, request, choice, round: 0, unanswered: false, out: 0 };
      // Before sending, and only if it really is kept: a command this device could not ask
      // about after a reload is not sent at all.
      if (!keep(pending.ids)) {
        forget();
        state = { step: 'not-accepted', ids: null, choice, reason: 'NOT_RECORDED' };
        arm();
        return true;
      }
      state = { step: 'submitting', pending };
      if (ports.clock.now() < notBefore) holdFirst(pending, request);
      else void sendFirst(pending, request);
      return true;
    },
    checkAgain() {
      if (disposed || state.step !== 'unknown' || !isArmed()) return false;
      beginChecking(state.pending, 1, true);
      return true;
    },
    dismiss() {
      if (disposed) return false;
      // Only a command the server has answered about can be put away. One whose outcome is
      // unknown stays, whatever phase it is by now: asking again is the only way on.
      if (state.step !== 'accepted' && state.step !== 'rejected' && state.step !== 'not-accepted') return false;
      // The acknowledging control is drawn where the confirm control was.
      if (!isArmed()) return false;
      state = { step: 'idle' };
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearCheckTimer();
      if (armTimer !== null) ports.scheduler.clearTimeout(armTimer);
      armTimer = null;
      listeners.clear();
    },
  };
}
