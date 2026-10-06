import { IdentifierSchema, PROTOCOL_VERSION, RegisterShotSchema, SeatIdSchema } from '@mothership/contracts';
import type { PlayerView, Receipt, RegisterShot, SeatId } from '@mothership/contracts';
import type { ShotFlowInput, ShotNotRegisteredReason, ShotRejectionCode } from '@mothership/presentation';
import type { PlayerPorts } from '../ports.js';
import type { PlayerApiClient, SubmitResult } from '../transport/api-client.js';

// One player's shot, from picking the card up to knowing what the server did with it.
//
// The flow decides nothing about the game. It keeps three things apart: what the server
// has said (a receipt, or the command listed in the player's own view), what this device
// merely asked for, and what it does not know. "Registered" is only ever the first of
// those, and it is not an outcome.
//
// Reliability rests on the command contract as the integration owner has stated it for
// wire protocol 1 (docs/backend/contract-review-response.md, a file of the backend branch
// that is not in this tree; items FE-C01 to FE-C03; a proposal still awaiting adoption by
// the affected roles):
//   - a receipt, accepted or rejected, is durable and terminal for its command ID;
//   - sending the identical command again returns that receipt, or evaluates the command
//     now, and a command for a phase that is no longer open is rejected durably;
//   - of the safe errors, only UNAVAILABLE leaves the outcome of an attempt unknown.
// So an unanswered command is never assumed to have failed. The flow looks its receipt up
// and, if none exists, sends the very same command again until the server answers.
//
// Across a page reload only the command's identifiers survive, never its target. A reloaded
// page can therefore ask about the command but cannot send it again; it keeps the card
// locked until a receipt is found or the command's phase is over.

/** Client-side technical parameters. None of them is a game rule or a server deadline. */
export interface ShotFlowTiming {
  /**
   * A control that sends or acknowledges does nothing for this long after it appears. The
   * second tap of a double tap lands wherever the screen has just drawn the next control.
   */
  readonly controlGuardMs: number;
  /** The wait before each automatic check of an unanswered command. Their number bounds the automatic checks. */
  readonly recheckDelaysMs: readonly number[];
}
export const DEFAULT_SHOT_FLOW_TIMING: ShotFlowTiming = {
  controlGuardMs: 400,
  recheckDelaysMs: [1_000, 2_000, 4_000],
};

/** What the flow is told on every redraw. It keeps the last one to judge the player's next input. */
export interface ShotFlowContext {
  /** The latest view that passed every check, or null before one has arrived. */
  readonly view: PlayerView | null;
  /** The interface would let the player start or send a shot right now. */
  readonly canAct: boolean;
  /** Seats offered as targets. A hint; the server's answer is what counts. */
  readonly candidates: readonly SeatId[];
  /** The private panel is open in the foreground. Once it is not, a choice that was not sent is dropped. */
  readonly panelOpen: boolean;
  /** The view is known to be the current authoritative one. */
  readonly current: boolean;
  readonly foreground: boolean;
}

export interface ShotFlow {
  getState(): ShotFlowInput;
  /**
   * The identifier of a command whose registration this page has just learned of: it sent
   * the command itself, and heard while the phase it was sent in was on screen. Null for a
   * registration learned any later (a lookup in a later phase, a reloaded page): the report
   * is still shown, but its moment is over. The identifier tells one registration from
   * another and is never put on screen.
   */
  registeredCommandId(): string | null;
  /** Told only about changes the flow makes on its own time: an answer, a check, a control becoming active. */
  subscribe(listener: () => void): () => void;
  /** Never notifies; the caller reads the state afterwards. */
  observe(context: ShotFlowContext): void;
  // Each returns whether it changed anything. None of them notifies.
  open(): boolean;
  chooseTarget(seatId: SeatId): boolean;
  back(): boolean;
  confirm(): boolean;
  checkAgain(): boolean;
  dismiss(): boolean;
  dispose(): void;
}

export interface ShotFlowOptions {
  readonly api: Pick<PlayerApiClient, 'submit' | 'lookupReceipt'>;
  readonly ports: PlayerPorts;
  /** The match this client asked for. An unresolved command kept for any other match is discarded. */
  readonly matchId: string;
  readonly timing?: Partial<ShotFlowTiming> | undefined;
}

/** What identifies a command without saying anything about it. This, and only this, is kept across a reload. */
interface CommandIds {
  readonly matchId: string;
  readonly seatId: SeatId;
  readonly phaseId: string;
  readonly commandId: string;
}

/** A command that was sent and whose outcome the server has not yet told this device. */
interface Pending {
  readonly ids: CommandIds;
  /** The command itself, to send again. Null on a reloaded page, which kept the identifiers only. */
  readonly command: RegisterShot | null;
  readonly targetSeatId: SeatId | null;
  /** The number of the latest check started. Answers to an earlier one are ignored. */
  round: number;
}

type Settled =
  /**
   * `prompt`: this page sent the command itself and learned of the registration while the
   * phase it was sent in was on screen. Only then is the moment still the present; a
   * registration learned later than that is history. (Whether the feed is current at that
   * moment is the screen's rule: it shows no cue on one that is not.)
   */
  | { readonly step: 'registered'; readonly ids: CommandIds; readonly targetSeatId: SeatId | null; readonly prompt: boolean }
  | { readonly step: 'rejected'; readonly ids: CommandIds; readonly targetSeatId: SeatId | null; readonly code: ShotRejectionCode }
  /** ids is null when nothing was ever sent. */
  | { readonly step: 'not-registered'; readonly ids: CommandIds | null; readonly targetSeatId: SeatId | null; readonly reason: ShotNotRegisteredReason };

type State =
  | { readonly step: 'idle' }
  // A choice belongs to the phase it was made in.
  | { readonly step: 'targeting'; readonly phaseId: string }
  | { readonly step: 'confirming'; readonly phaseId: string; readonly targetSeatId: SeatId }
  | { readonly step: 'submitting' | 'checking' | 'unknown'; readonly pending: Pending }
  | Settled;

/** This seat's own registered shot, as this device remembers it. Memory only. */
interface Remembered {
  readonly commandId: string;
  readonly phaseId: string;
  readonly targetSeatId: SeatId | null;
  /** The player's own view has listed the command as pending at least once. */
  readonly seenInView: boolean;
}

type Outcome = { readonly receipt: Receipt } | { readonly reason: 'PHASE_OVER' };

export function createShotFlow(options: ShotFlowOptions): ShotFlow {
  const { api, ports } = options;
  const timing: ShotFlowTiming = { ...DEFAULT_SHOT_FLOW_TIMING, ...options.timing };
  const listeners = new Set<() => void>();
  const usedIds = new Set<string>();

  let context: ShotFlowContext = { view: null, canAct: false, candidates: [], panelOpen: false, current: false, foreground: true };
  let state: State = { step: 'idle' };
  let remembered: Remembered | null = null;
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
      // Nothing to do: recovery after a reload then falls back to what the view says.
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
      if (!seat.success || !match?.success || !phase?.success || !command?.success || match.data !== options.matchId) return null;
      return { matchId: match.data, seatId: seat.data, phaseId: phase.data, commandId: command.data };
    } catch {
      return null;
    }
  }

  function clearCheckTimer(): void {
    if (checkTimer !== null) ports.scheduler.clearTimeout(checkTimer);
    checkTimer = null;
  }

  // Only one step at a time has a control that sends or acknowledges, so one wait is enough.
  /** Starts the wait before a control that has just appeared becomes active, and says when it has. */
  function arm(): void {
    if (armTimer !== null) ports.scheduler.clearTimeout(armTimer);
    armedAt = ports.clock.now() + timing.controlGuardMs;
    armTimer = ports.scheduler.setTimeout(() => {
      armTimer = null;
      // The timer is the authority here: one that fires a moment early by the clock must
      // not leave the control drawn as inactive with nothing left to redraw it.
      armedAt = 0;
      emit();
    }, timing.controlGuardMs);
  }
  const isArmed = (): boolean => ports.clock.now() >= armedAt;

  /** True while this is still the command the flow is waiting on. Late answers find it false. */
  function isOpen(pending: Pending): boolean {
    return !disposed && 'pending' in state && state.pending === pending;
  }
  const listed = (commandId: string): boolean => context.view?.ownPendingCommandIds.includes(commandId) ?? false;
  /** The phase the command was sent in has ended, so it can no longer be newly accepted. */
  const phaseIsOver = (ids: CommandIds): boolean => context.view !== null && context.view.phase.id !== ids.phaseId;

  /** The registration is being learned in the phase the command was sent in, by the page that sent it. */
  const isPrompt = (ids: CommandIds, targetSeatId: SeatId | null): boolean =>
    // A reloaded page has the command's identifiers and nothing else: no target means it did not send it.
    targetSeatId !== null && context.view !== null && context.view.phase.id === ids.phaseId;

  function toRegistered(ids: CommandIds, targetSeatId: SeatId | null): void {
    clearCheckTimer();
    forget();
    remembered = { commandId: ids.commandId, phaseId: ids.phaseId, targetSeatId, seenInView: listed(ids.commandId) };
    state = { step: 'registered', ids, targetSeatId, prompt: isPrompt(ids, targetSeatId) };
    arm();
    followView();
  }
  function toRejected(pending: Pending, code: ShotRejectionCode): void {
    clearCheckTimer();
    forget();
    state = { step: 'rejected', ids: pending.ids, targetSeatId: pending.targetSeatId, code };
    arm();
  }
  function toNotRegistered(pending: Pending, reason: ShotNotRegisteredReason): void {
    clearCheckTimer();
    forget();
    state = { step: 'not-registered', ids: pending.ids, targetSeatId: pending.targetSeatId, reason };
    arm();
  }
  function settle(pending: Pending, outcome: Outcome): void {
    if ('reason' in outcome) toNotRegistered(pending, outcome.reason);
    else if (outcome.receipt.status === 'accepted') toRegistered(pending.ids, pending.targetSeatId);
    else toRejected(pending, outcome.receipt.code);
  }

  // What the latest view means for anything already settled. The view is the authority.
  function followView(): void {
    const view = context.view;
    if (view === null) return;
    // A command the view lists is registered, whatever this device concluded about it earlier.
    if ((state.step === 'rejected' || state.step === 'not-registered') && state.ids !== null && view.ownPendingCommandIds.includes(state.ids.commandId)) {
      remembered = { commandId: state.ids.commandId, phaseId: state.ids.phaseId, targetSeatId: state.targetSeatId, seenInView: true };
      state = { step: 'registered', ids: state.ids, targetSeatId: state.targetSeatId, prompt: isPrompt(state.ids, state.targetSeatId) };
      arm();
    }
    // The target is remembered while the view still lists the command, and before that only
    // for the phase it was sent in, while the view catches up.
    if (remembered !== null) {
      if (view.ownPendingCommandIds.includes(remembered.commandId)) remembered = { ...remembered, seenInView: true };
      else if (remembered.seenInView || view.phase.id !== remembered.phaseId) remembered = null;
    }
  }
  /** The registration this device reports is still waiting to be resolved, as far as the view shows. */
  const stillPending = (ids: CommandIds): boolean => remembered !== null && remembered.commandId === ids.commandId;

  async function sendFirst(pending: Pending, command: RegisterShot): Promise<void> {
    let result: SubmitResult | null = null;
    try {
      result = await api.submit(command);
    } catch {
      // The request was checked before it was handed over, so nothing can be concluded here.
    }
    if (!isOpen(pending)) return;
    if (result?.kind === 'receipt') {
      settle(pending, { receipt: result.receipt });
    } else if (result?.kind === 'api-failure' && result.code !== 'UNAVAILABLE') {
      // The first answer to this command, and the server says that request committed nothing.
      // Should a copy of it have got through all the same, the player's view will list the
      // command and followView corrects this.
      toNotRegistered(pending, result.code);
    } else {
      beginChecking(pending, false, timing.recheckDelaysMs.length);
    }
    emit();
  }

  // Finds out what happened to a command that got no usable answer. Returns what settles
  // it, or null when the server still could not say.
  async function reconcile(pending: Pending, round: number): Promise<Outcome | null> {
    const { ids, command } = pending;
    const current = (): boolean => isOpen(pending) && pending.round === round;
    // Taken before asking: only a lookup made after the phase was seen to be over can show
    // by itself that the command will never be accepted.
    const phaseWasOver = phaseIsOver(ids);
    const looked = await api.lookupReceipt({ protocolVersion: PROTOCOL_VERSION, matchId: ids.matchId, commandId: ids.commandId });
    if (!current()) return null;
    if (looked.kind === 'found') {
      // A receipt for another phase cannot belong to this command, whatever identifier it carries.
      return looked.receipt.phaseId === ids.phaseId ? { receipt: looked.receipt } : null;
    }
    // The server could not be asked. Nothing is sent into that silence.
    if (looked.kind !== 'unknown') return null;
    if (command === null) {
      // A reloaded page cannot send the command again. No receipt exists; if the command's
      // phase had already ended when that was asked, it can no longer be accepted either.
      return phaseWasOver ? { reason: 'PHASE_OVER' } : null;
    }
    // No receipt exists yet, and an earlier attempt may still be on its way. Sending the
    // identical command is the one step that always ends in a durable answer: the original
    // receipt if an attempt got through, otherwise a decision on this one, which is a
    // rejection if its phase has closed.
    const sent = await api.submit(command);
    if (!current()) return null;
    return sent.kind === 'receipt' ? { receipt: sent.receipt } : null;
  }

  function scheduleRound(pending: Pending): void {
    const delays = timing.recheckDelaysMs;
    const delay = delays[Math.min(delayIndex, delays.length - 1)] ?? 0;
    delayIndex += 1;
    checkTimer = ports.scheduler.setTimeout(() => {
      checkTimer = null;
      void runRound(pending);
    }, delay);
  }

  async function runRound(pending: Pending): Promise<void> {
    if (!isOpen(pending)) return;
    // A newer check supersedes one still waiting on the server, whose answer is then ignored.
    pending.round += 1;
    const round = pending.round;
    roundsLeft -= 1;
    let outcome: Outcome | null = null;
    try {
      outcome = await reconcile(pending, round);
    } catch {
      // A transport that misbehaves is the same as one that did not answer.
    }
    // Settled some other way in the meantime, or overtaken by a newer check.
    if (!isOpen(pending) || pending.round !== round) return;
    if (outcome !== null) settle(pending, outcome);
    else if (roundsLeft > 0) return scheduleRound(pending);
    else {
      state = { step: 'unknown', pending };
      arm();
    }
    emit();
  }

  function beginChecking(pending: Pending, immediately: boolean, rounds: number): void {
    clearCheckTimer();
    state = { step: 'checking', pending };
    roundsLeft = Math.max(1, rounds);
    delayIndex = 0;
    if (immediately) void runRound(pending);
    else scheduleRound(pending);
  }

  function nextCommand(ids: Omit<CommandIds, 'commandId'>, targetSeatId: SeatId): RegisterShot | null {
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
    const command: RegisterShot = {
      protocolVersion: PROTOCOL_VERSION, matchId: ids.matchId, phaseId: ids.phaseId, commandId,
      command: { type: 'REGISTER_SHOT', targetSeatId },
    };
    return RegisterShotSchema.safeParse(command).success ? command : null;
  }

  // A command whose outcome was unknown when the page was last unloaded.
  const kept = recall();
  if (kept === null) {
    forget();
  } else {
    usedIds.add(kept.commandId);
    state = { step: 'checking', pending: { ids: kept, command: null, targetSeatId: null, round: 0 } };
    recalled = true;
  }

  return {
    getState() {
      switch (state.step) {
        case 'idle': return { step: 'idle', registered: remembered === null ? null : { targetSeatId: remembered.targetSeatId } };
        case 'targeting': return { step: 'targeting' };
        case 'confirming': return { step: 'confirming', targetSeatId: state.targetSeatId, armed: isArmed() };
        case 'submitting': return { step: 'submitting' };
        case 'checking': return { step: 'checking', recovered: state.pending.command === null };
        case 'unknown': return { step: 'unknown', recovered: state.pending.command === null, phaseOver: phaseIsOver(state.pending.ids), armed: isArmed() };
        case 'registered': return { step: 'registered', targetSeatId: state.targetSeatId, pending: stillPending(state.ids), armed: isArmed() };
        case 'rejected': return { step: 'rejected', code: state.code, armed: isArmed() };
        case 'not-registered': return { step: 'not-registered', reason: state.reason, armed: isArmed() };
      }
    },
    registeredCommandId: () => (state.step === 'registered' && state.prompt ? state.ids.commandId : null),
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
        if (recalled && view !== null) {
          recalled = false;
          // Kept by another seat's page in this tab: it is not this seat's to ask about.
          if (view.self.seatId !== pending.ids.seatId) {
            forget();
            state = { step: 'idle' };
            return;
          }
          if (!listed(pending.ids.commandId)) return beginChecking(pending, true, timing.recheckDelaysMs.length);
        }
        // The composed view is authoritative. It lists the command, so the command is registered.
        if (listed(pending.ids.commandId)) return toRegistered(pending.ids, pending.targetSeatId);
        if (state.step === 'submitting' || view === null) return;
        // The first answer never came. Each of these is a fresh reason to ask again at once.
        const cameBack = (next.current && !previous.current) || (next.foreground && !previous.foreground);
        const phaseMoved = previous.view !== null && view.phase.id !== previous.view.phase.id;
        if (cameBack || phaseMoved) beginChecking(pending, true, timing.recheckDelaysMs.length);
        return;
      }

      followView();
      // A choice that has not been sent does not outlive the conditions it was made under.
      if (state.step === 'targeting' || state.step === 'confirming') {
        if (!next.canAct || !next.panelOpen || view === null || view.phase.id !== state.phaseId) state = { step: 'idle' };
        else if (state.step === 'confirming' && !next.candidates.includes(state.targetSeatId)) state = { step: 'targeting', phaseId: state.phaseId };
      }
    },

    open() {
      if (disposed || state.step !== 'idle' || !context.canAct || !context.panelOpen || context.view === null) return false;
      // This device's own accepted command is newer than the view it holds.
      if (remembered !== null && !remembered.seenInView) return false;
      state = { step: 'targeting', phaseId: context.view.phase.id };
      return true;
    },
    chooseTarget(seatId) {
      if (disposed || state.step !== 'targeting' || !context.candidates.includes(seatId)) return false;
      state = { step: 'confirming', phaseId: state.phaseId, targetSeatId: seatId };
      arm();
      return true;
    },
    back() {
      if (disposed) return false;
      if (state.step === 'confirming') state = { step: 'targeting', phaseId: state.phaseId };
      else if (state.step === 'targeting') state = { step: 'idle' };
      else return false;
      return true;
    },
    confirm() {
      // Only the confirm step can send, and it leaves that step before anything is sent, so
      // a second activation finds nothing to do: one confirmation, one command. observe keeps
      // this step only while the gate is open, the panel is open, the phase is the one the
      // choice was made in and the target is still offered.
      if (disposed || state.step !== 'confirming' || context.view === null || !isArmed()) return false;
      const { targetSeatId, phaseId } = state;
      const ids = { matchId: options.matchId, seatId: context.view.self.seatId, phaseId };
      const command = nextCommand(ids, targetSeatId);
      if (command === null) {
        state = { step: 'not-registered', ids: null, targetSeatId, reason: 'NOT_SENT' };
        arm();
        return true;
      }
      const pending: Pending = { ids: { ...ids, commandId: command.commandId }, command, targetSeatId, round: 0 };
      keep(pending.ids);
      state = { step: 'submitting', pending };
      void sendFirst(pending, command);
      return true;
    },
    checkAgain() {
      if (disposed || state.step !== 'unknown' || !isArmed()) return false;
      beginChecking(state.pending, true, 1);
      return true;
    },
    dismiss() {
      if (disposed) return false;
      if (state.step === 'registered' || state.step === 'rejected' || state.step === 'not-registered') {
        // The acknowledging control is drawn where the confirm control was.
        if (!isArmed()) return false;
      } else if (state.step === 'unknown') {
        // While the command's phase is open, a new choice could race the one unaccounted for.
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
