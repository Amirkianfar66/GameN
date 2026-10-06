import { FullCommandRequestSchema, IdentifierSchema, SeatIdSchema } from '@mothership/contracts';
import type { FullCommandRequest, FullPlayerView, FullReceipt, SeatId } from '@mothership/contracts';
import type { PlayerPorts } from '../ports.js';
import type { ConnectedApi, ConnectedCommandResult, ConnectedFailureCode } from './api.js';

// One player's own command under wire protocol 2, from picking an action up to knowing what
// the server did with it. One command at a time for the seat, whatever its kind: while an
// earlier one is unaccounted for, no new intent is offered.
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
//     unknown, and a safe failure settles only the invocation it answered;
//   - a rate-limit answer names the least time to wait before the same request goes again.
//
// Across a page reload only the command's identifiers survive, never its payload. A
// reloaded page can ask about the command but cannot send it again. It keeps the command
// pending while its phase is open; once a fresh view shows that phase closed, a lookup made
// after that view settles it, and "unknown" then means it was not accepted.

export type Destination = Extract<FullCommandRequest['command'], { type: 'MOVE' }>['destination'];
export type ActionKind = 'move' | 'shot';
export type ActionChoice =
  | { readonly kind: 'move'; readonly destination: Destination }
  | { readonly kind: 'shot'; readonly targetSeatId: SeatId };

/** Client-side technical parameters. None of them is a game rule or a server deadline. */
export interface ActionFlowTiming {
  /** A control that sends or acknowledges does nothing for this long after it appears, against the second tap of a double tap. */
  readonly controlGuardMs: number;
  /** The wait before each automatic check of an unanswered command. Their number bounds the automatic checks. */
  readonly recheckDelaysMs: readonly number[];
  /** Added to a delay the server named, so that many phones told to wait do not all return at the same instant. */
  readonly retryJitterMs: number;
}
export const DEFAULT_ACTION_FLOW_TIMING: ActionFlowTiming = {
  controlGuardMs: 400,
  recheckDelaysMs: [1_000, 2_000, 4_000],
  retryJitterMs: 250,
};

/** What the flow is told on every redraw. */
export interface ActionFlowContext {
  /** The latest view that passed every check, or null before one has arrived. */
  readonly view: FullPlayerView | null;
  /** The view is a fresh server snapshot of a feed that is up. Nothing is offered or sent otherwise. */
  readonly current: boolean;
  /** The local estimate of the phase clock has run out. */
  readonly expired: boolean;
  /** The private panel is open in the foreground. Once it is not, a choice that was not sent is dropped. */
  readonly panelOpen: boolean;
  readonly foreground: boolean;
}

export type NotAcceptedReason = Exclude<ConnectedFailureCode, 'UNAVAILABLE' | 'RATE_LIMITED'> | 'NOT_SENT' | 'PHASE_OVER';

/** Where the player's own command stands on this device, as far as this device knows. */
export type ActionFlowState =
  | { readonly step: 'idle' }
  | { readonly step: 'choosing'; readonly kind: ActionKind }
  | { readonly step: 'confirming'; readonly choice: ActionChoice; readonly armed: boolean }
  /** kind and choice are null on a reloaded page, which kept the identifiers only. */
  | { readonly step: 'submitting'; readonly choice: ActionChoice | null }
  | { readonly step: 'checking'; readonly choice: ActionChoice | null; readonly recovered: boolean }
  | { readonly step: 'unknown'; readonly choice: ActionChoice | null; readonly recovered: boolean; readonly phaseOver: boolean; readonly armed: boolean }
  /** The server accepted it. For a queued command that is a registration and not an outcome; a move has already happened. */
  | { readonly step: 'accepted'; readonly choice: ActionChoice | null; readonly armed: boolean }
  | { readonly step: 'rejected'; readonly choice: ActionChoice | null; readonly code: 'PHASE_CLOSED' | 'NOT_ALLOWED'; readonly armed: boolean }
  | { readonly step: 'not-accepted'; readonly choice: ActionChoice | null; readonly reason: NotAcceptedReason; readonly armed: boolean };

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
}

type State =
  | { readonly step: 'idle' }
  // A choice belongs to the phase it was made in.
  | { readonly step: 'choosing'; readonly kind: ActionKind; readonly phaseId: string }
  | { readonly step: 'confirming'; readonly choice: ActionChoice; readonly phaseId: string }
  | { readonly step: 'submitting' | 'checking' | 'unknown'; readonly pending: Pending }
  | { readonly step: 'accepted'; readonly choice: ActionChoice | null }
  // ids is null when nothing was ever sent.
  | { readonly step: 'rejected'; readonly ids: CommandIds; readonly choice: ActionChoice | null; readonly code: 'PHASE_CLOSED' | 'NOT_ALLOWED' }
  | { readonly step: 'not-accepted'; readonly ids: CommandIds | null; readonly choice: ActionChoice | null; readonly reason: NotAcceptedReason };

type Outcome = { readonly receipt: FullReceipt } | { readonly reason: NotAcceptedReason } | { readonly waitMs: number } | null;

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

  let context: ActionFlowContext = { view: null, current: false, expired: false, panelOpen: false, foreground: true };
  let state: State = { step: 'idle' };
  let disposed = false;
  let checkTimer: unknown = null;
  let armTimer: unknown = null;
  let armedAt = 0;
  let roundsLeft = 0;
  let delayIndex = 0;
  /** A command recalled after a reload has not been asked about yet. */
  let recalled = false;

  function emit(): void {
    if (disposed) return;
    for (const listener of [...listeners]) listener();
  }

  // The store is the host's. If it fails, the flow carries on without a memory across reloads.
  function keep(ids: CommandIds): void {
    try {
      ports.unresolved.save(JSON.stringify(ids));
    } catch {
      // Nothing to do: after a reload the view is then the only thing left to go by.
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
  const canAct = (): boolean => context.view !== null && context.current && !context.expired && context.panelOpen;
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

  function settle(pending: Pending, outcome: Exclude<Outcome, null | { waitMs: number }>): void {
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

  /** What an answer to the command means for the command it was an attempt at. */
  function read(pending: Pending, result: ConnectedCommandResult): Outcome {
    if (result.kind === 'receipt') return { receipt: result.receipt };
    if (result.kind !== 'api-failure') {
      pending.unanswered = true;
      return null;
    }
    const { code } = result;
    // Told to wait: this invocation decided nothing, and the same request may go again later.
    if (code === 'RATE_LIMITED') return { waitMs: (result.retryAfterMs ?? 0) + timing.retryJitterMs };
    if (code === 'UNAVAILABLE') {
      pending.unanswered = true;
      return null;
    }
    // A safe failure settles only the invocation it answered. Once an earlier attempt has
    // gone unanswered it settles nothing: that attempt may still have been decided.
    return pending.unanswered ? null : { reason: code };
  }

  async function sendFirst(pending: Pending, request: FullCommandRequest): Promise<void> {
    let outcome: Outcome = null;
    try {
      outcome = read(pending, await api.command(request));
    } catch {
      // The request was checked before it was handed over, so nothing can be concluded here.
      pending.unanswered = true;
    }
    if (!isOpen(pending)) return;
    if (outcome !== null && !('waitMs' in outcome)) settle(pending, outcome);
    else beginChecking(pending, timing.recheckDelaysMs.length, outcome?.waitMs ?? null);
    emit();
  }

  // Finds out what happened to a command that got no usable answer.
  async function reconcile(pending: Pending, round: number): Promise<Outcome> {
    const { ids, request } = pending;
    const stillThis = (): boolean => isOpen(pending) && pending.round === round;
    // Taken before asking: only a lookup made after a fresh view showed the phase over can
    // show by itself that the command will never be accepted.
    const phaseWasOver = phaseIsOver(ids);
    const looked = await api.receipt({ protocolVersion: 2, matchId: ids.matchId, commandId: ids.commandId });
    if (!stillThis()) return null;
    if (looked.kind === 'found') {
      // A receipt for another phase cannot belong to this command, whatever identifier it carries.
      return looked.receipt.phaseId === ids.phaseId ? { receipt: looked.receipt } : null;
    }
    if (looked.kind === 'api-failure' && looked.code === 'RATE_LIMITED') return { waitMs: (looked.retryAfterMs ?? 0) + timing.retryJitterMs };
    // The server could not be asked. Nothing is sent into that silence.
    if (looked.kind !== 'unknown') return null;
    if (request === null) {
      // A reloaded page cannot send the command again: its payload is gone and is not rebuilt.
      // No receipt exists; if its phase was already over when that was asked, none will be an
      // acceptance. While the phase is open the command stays pending.
      return phaseWasOver ? { reason: 'PHASE_OVER' } : null;
    }
    // No receipt yet, and an earlier attempt may still be on its way. Sending the identical
    // request is the one step that always ends in a durable answer: the original receipt if
    // an attempt got through, otherwise a decision on this one.
    const outcome = read(pending, await api.command(request));
    return stillThis() ? outcome : null;
  }

  function scheduleRound(pending: Pending, atLeastMs: number | null): void {
    const delays = timing.recheckDelaysMs;
    const planned = delays[Math.min(delayIndex, delays.length - 1)] ?? 0;
    delayIndex += 1;
    // A delay the server named is a minimum. The flow's own delay never shortens it.
    checkTimer = ports.scheduler.setTimeout(() => {
      checkTimer = null;
      void runRound(pending);
    }, Math.max(planned, atLeastMs ?? 0));
  }

  async function runRound(pending: Pending): Promise<void> {
    if (!isOpen(pending)) return;
    // A newer check supersedes one still waiting on the server, whose answer is then ignored.
    pending.round += 1;
    const round = pending.round;
    roundsLeft -= 1;
    let outcome: Outcome = null;
    try {
      outcome = await reconcile(pending, round);
    } catch {
      // A transport that misbehaves is the same as one that did not answer.
    }
    if (!isOpen(pending) || pending.round !== round) return;
    if (outcome !== null && !('waitMs' in outcome)) settle(pending, outcome);
    else if (roundsLeft > 0) return scheduleRound(pending, outcome?.waitMs ?? null);
    else {
      state = { step: 'unknown', pending };
      arm();
    }
    emit();
  }

  function beginChecking(pending: Pending, rounds: number, atLeastMs: number | null, immediately = false): void {
    clearCheckTimer();
    state = { step: 'checking', pending };
    roundsLeft = Math.max(1, rounds);
    delayIndex = 0;
    if (immediately) void runRound(pending);
    else scheduleRound(pending, atLeastMs);
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
    state = { step: 'checking', pending: { ids: kept, request: null, choice: null, round: 0, unanswered: true } };
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
          return beginChecking(pending, timing.recheckDelaysMs.length, null, true);
        }
        if (state.step === 'submitting') return;
        // The first answer never came. Each of these is a fresh reason to ask again at once:
        // the feed is current again, the page is back in front, or the phase has moved on.
        const cameBack = (next.current && !previous.current) || (next.foreground && !previous.foreground);
        const phaseMoved = previous.view !== null && view.phase.id !== previous.view.phase.id;
        if (cameBack || phaseMoved) beginChecking(pending, timing.recheckDelaysMs.length, null, true);
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
      // Only the confirm step can send, and it leaves that step before anything is sent, so
      // a second activation finds nothing to do: one confirmation, one command.
      if (disposed || state.step !== 'confirming' || !isArmed() || !canAct() || !offered(state.choice)) return false;
      const { choice, phaseId } = state;
      const request = buildRequest(phaseId, choice);
      if (request === null) {
        state = { step: 'not-accepted', ids: null, choice, reason: 'NOT_SENT' };
        arm();
        return true;
      }
      const pending: Pending = { ids: { matchId: options.matchId, seatId: options.seatId, phaseId, commandId: request.commandId }, request, choice, round: 0, unanswered: false };
      // Before sending, so that a reload at any later instant can still ask about it.
      keep(pending.ids);
      state = { step: 'submitting', pending };
      void sendFirst(pending, request);
      return true;
    },
    checkAgain() {
      if (disposed || state.step !== 'unknown' || !isArmed()) return false;
      beginChecking(state.pending, 1, null, true);
      return true;
    },
    dismiss() {
      if (disposed) return false;
      if (state.step === 'accepted' || state.step === 'rejected' || state.step === 'not-accepted') {
        // The acknowledging control is drawn where the confirm control was.
        if (!isArmed()) return false;
      } else if (state.step === 'unknown') {
        // While the command's phase is open, a new intent could race the one unaccounted for.
        if (!isArmed() || !phaseIsOver(state.pending.ids)) return false;
        forget();
      } else {
        return false;
      }
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
