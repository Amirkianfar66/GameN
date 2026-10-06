import { PROTOCOL_VERSION, RegisterShotSchema } from '@mothership/contracts';
import type { PlayerView, Receipt, RegisterShot, SeatId } from '@mothership/contracts';
import type { ShotFlowInput } from '@mothership/presentation';
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
// wire protocol 1 (docs/backend/contract-review-response.md on the backend branch, items
// FE-C01 to FE-C03; a proposal still awaiting affected-role adoption):
//   - a receipt, accepted or rejected, is durable and terminal for its command ID;
//   - sending the identical command again returns that receipt, or evaluates the command
//     now, and a command for a phase that is no longer open is rejected durably;
//   - of the safe errors, only UNAVAILABLE leaves the outcome of an attempt unknown.
// So an unanswered command is never assumed to have failed. The flow looks its receipt up
// and, if none exists yet, sends the very same command again until the server answers.

/** Client-side technical parameters. None of them is a game rule or a server deadline. */
export interface ShotFlowTiming {
  /**
   * A confirmation arriving sooner than this after the confirm step appeared is ignored.
   * The second tap of a double tap lands wherever the confirm control has just been drawn.
   */
  readonly confirmGuardMs: number;
  /** The wait before each automatic check of an unanswered command. Their number bounds the automatic checks. */
  readonly recheckDelaysMs: readonly number[];
}
export const DEFAULT_SHOT_FLOW_TIMING: ShotFlowTiming = {
  confirmGuardMs: 400,
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
  /** Told only about changes the flow makes on its own time: an answer, a check, a give-up. */
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
  readonly timing?: Partial<ShotFlowTiming> | undefined;
}

/** A command that was sent and whose outcome the server has not yet told this device. */
interface Pending {
  readonly command: RegisterShot;
  readonly targetSeatId: SeatId;
  /** A check of this command is waiting on the server. */
  checking: boolean;
}

type State =
  | { readonly step: 'idle' }
  | { readonly step: 'targeting' }
  | { readonly step: 'confirming'; readonly targetSeatId: SeatId; readonly armedAt: number }
  | { readonly step: 'submitting' | 'checking' | 'unknown'; readonly pending: Pending }
  | Extract<ShotFlowInput, { step: 'registered' | 'rejected' | 'not-registered' }>;

/** This seat's own registered shot, as this device remembers it. Memory only; never stored. */
interface Remembered {
  readonly commandId: string;
  readonly phaseId: string;
  readonly targetSeatId: SeatId;
  /** The player's own view has listed the command as pending at least once. */
  readonly seenInView: boolean;
}

export function createShotFlow(options: ShotFlowOptions): ShotFlow {
  const { api, ports } = options;
  const timing: ShotFlowTiming = { ...DEFAULT_SHOT_FLOW_TIMING, ...options.timing };
  const listeners = new Set<() => void>();
  const usedIds = new Set<string>();

  let context: ShotFlowContext = { view: null, canAct: false, candidates: [], panelOpen: false, current: false, foreground: true };
  let state: State = { step: 'idle' };
  let remembered: Remembered | null = null;
  let disposed = false;
  let timer: unknown = null;
  let roundsLeft = 0;
  let delayIndex = 0;

  function emit(): void {
    if (disposed) return;
    for (const listener of [...listeners]) listener();
  }

  function clearTimer(): void {
    if (timer !== null) ports.scheduler.clearTimeout(timer);
    timer = null;
  }

  /** True while this is still the command the flow is waiting on. Late answers find it false. */
  function isOpen(pending: Pending): boolean {
    return !disposed && 'pending' in state && state.pending === pending;
  }

  function settle(pending: Pending, next: Extract<State, { step: 'registered' | 'rejected' | 'not-registered' }>): void {
    clearTimer();
    state = next;
    if (next.step !== 'registered') return;
    const { commandId, phaseId } = pending.command;
    remembered = {
      commandId, phaseId, targetSeatId: pending.targetSeatId,
      seenInView: context.view?.ownPendingCommandIds.includes(commandId) ?? false,
    };
  }

  function byReceipt(pending: Pending, receipt: Receipt): Extract<State, { step: 'registered' | 'rejected' }> {
    return receipt.status === 'accepted'
      ? { step: 'registered', targetSeatId: pending.targetSeatId }
      : { step: 'rejected', targetSeatId: pending.targetSeatId, code: receipt.code };
  }

  async function sendFirst(pending: Pending): Promise<void> {
    let result: SubmitResult | null = null;
    try {
      result = await api.submit(pending.command);
    } catch {
      // The request was checked before it was handed over, so nothing can be concluded here.
    }
    if (!isOpen(pending)) return;
    if (result?.kind === 'receipt') {
      settle(pending, byReceipt(pending, result.receipt));
    } else if (result?.kind === 'api-failure' && result.code !== 'UNAVAILABLE') {
      // The only attempt made, and the server says it committed nothing. This command is
      // not registered and, never being sent again, cannot become so.
      settle(pending, { step: 'not-registered', targetSeatId: pending.targetSeatId, reason: result.code });
    } else {
      beginChecking(pending, false, timing.recheckDelaysMs.length);
    }
    emit();
  }

  // Finds out what happened to a command that got no usable answer. Returns the settled
  // state, or null when the server still could not say.
  async function reconcile(pending: Pending): Promise<Extract<State, { step: 'registered' | 'rejected' }> | null> {
    const { command } = pending;
    const looked = await api.lookupReceipt({ protocolVersion: command.protocolVersion, matchId: command.matchId, commandId: command.commandId });
    if (!isOpen(pending)) return null;
    if (looked.kind === 'found') {
      // A receipt for another phase cannot belong to this command, whatever identifier it carries.
      return looked.receipt.phaseId === command.phaseId ? byReceipt(pending, looked.receipt) : null;
    }
    // The server could not be asked. Nothing is sent into that silence.
    if (looked.kind !== 'unknown') return null;
    // No receipt exists yet, and an earlier attempt may still be on its way. Sending the
    // identical command is the one step that always ends in a durable answer: the original
    // receipt if an attempt got through, otherwise a decision on this one, which is a
    // rejection if its phase has closed.
    const sent = await api.submit(command);
    if (!isOpen(pending)) return null;
    return sent.kind === 'receipt' ? byReceipt(pending, sent.receipt) : null;
  }

  function scheduleRound(pending: Pending): void {
    const delays = timing.recheckDelaysMs;
    const delay = delays[Math.min(delayIndex, delays.length - 1)] ?? 0;
    delayIndex += 1;
    timer = ports.scheduler.setTimeout(() => {
      timer = null;
      void runRound(pending);
    }, delay);
  }

  async function runRound(pending: Pending): Promise<void> {
    if (!isOpen(pending) || pending.checking) return;
    pending.checking = true;
    roundsLeft -= 1;
    let outcome: Awaited<ReturnType<typeof reconcile>> = null;
    try {
      outcome = await reconcile(pending);
    } catch {
      // A transport that misbehaves is the same as one that did not answer.
    }
    pending.checking = false;
    // Settled some other way in the meantime, by the player's own view for instance.
    if (!isOpen(pending)) return;
    if (outcome !== null) settle(pending, outcome);
    else if (roundsLeft > 0) return scheduleRound(pending);
    else state = { step: 'unknown', pending };
    emit();
  }

  function beginChecking(pending: Pending, immediately: boolean, rounds: number): void {
    clearTimer();
    state = { step: 'checking', pending };
    roundsLeft = Math.max(1, rounds);
    delayIndex = 0;
    // A check already waiting on the server carries on under the new budget.
    if (pending.checking) return;
    if (immediately) void runRound(pending);
    else scheduleRound(pending);
  }

  function nextCommand(view: PlayerView, targetSeatId: SeatId): RegisterShot | null {
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
      protocolVersion: PROTOCOL_VERSION, matchId: view.matchId, phaseId: view.phase.id, commandId,
      command: { type: 'REGISTER_SHOT', targetSeatId },
    };
    return RegisterShotSchema.safeParse(command).success ? command : null;
  }

  const mayChoose = (): boolean => !disposed && context.canAct && context.panelOpen && context.view !== null;

  return {
    getState() {
      switch (state.step) {
        case 'idle': return { step: 'idle', registeredTargetSeatId: remembered?.targetSeatId ?? null };
        case 'targeting': return { step: 'targeting' };
        case 'confirming': return { step: 'confirming', targetSeatId: state.targetSeatId };
        case 'submitting':
        case 'checking':
        case 'unknown': return { step: state.step, targetSeatId: state.pending.targetSeatId };
        default: return state;
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

      // The registered target is remembered while the player's view still lists the command,
      // and before that only for the phase it was sent in, while the view catches up.
      if (remembered !== null && view !== null) {
        if (view.ownPendingCommandIds.includes(remembered.commandId)) remembered = { ...remembered, seenInView: true };
        else if (remembered.seenInView || view.phase.id !== remembered.phaseId) remembered = null;
      }

      if ('pending' in state) {
        const { pending } = state;
        // The composed view is authoritative. It lists the command, so the command is registered.
        if (view !== null && view.ownPendingCommandIds.includes(pending.command.commandId)) {
          settle(pending, { step: 'registered', targetSeatId: pending.targetSeatId });
          return;
        }
        if (state.step === 'submitting') return;
        // The first answer never came. Each of these is a fresh reason to ask again at once.
        const cameBack = (next.current && !previous.current) || (next.foreground && !previous.foreground);
        const phaseMoved = view !== null && previous.view !== null && view.phase.id !== previous.view.phase.id;
        if (cameBack || phaseMoved) beginChecking(pending, true, timing.recheckDelaysMs.length);
        return;
      }

      // A choice that has not been sent does not outlive the conditions it was made under.
      if (state.step === 'targeting' || state.step === 'confirming') {
        if (!next.canAct || !next.panelOpen) state = { step: 'idle' };
        else if (state.step === 'confirming' && !next.candidates.includes(state.targetSeatId)) state = { step: 'targeting' };
      }
    },

    open() {
      if (state.step !== 'idle' || !mayChoose()) return false;
      // This device's own accepted command is newer than the view it holds.
      if (remembered !== null && !remembered.seenInView) return false;
      state = { step: 'targeting' };
      return true;
    },
    chooseTarget(seatId) {
      if (state.step !== 'targeting' || !mayChoose() || !context.candidates.includes(seatId)) return false;
      state = { step: 'confirming', targetSeatId: seatId, armedAt: ports.clock.now() + timing.confirmGuardMs };
      return true;
    },
    back() {
      if (disposed) return false;
      if (state.step === 'confirming') state = { step: 'targeting' };
      else if (state.step === 'targeting') state = { step: 'idle' };
      else return false;
      return true;
    },
    confirm() {
      // Only the confirm step can send, and it leaves that step before anything is sent, so
      // a second activation finds nothing to do: one confirmation, one command.
      if (state.step !== 'confirming' || !mayChoose() || context.view === null) return false;
      if (!context.candidates.includes(state.targetSeatId) || ports.clock.now() < state.armedAt) return false;
      const { targetSeatId } = state;
      const command = nextCommand(context.view, targetSeatId);
      if (command === null) {
        state = { step: 'not-registered', targetSeatId, reason: 'NOT_SENT' };
        return true;
      }
      const pending: Pending = { command, targetSeatId, checking: false };
      state = { step: 'submitting', pending };
      void sendFirst(pending);
      return true;
    },
    checkAgain() {
      if (disposed || state.step !== 'unknown') return false;
      beginChecking(state.pending, true, 1);
      return true;
    },
    dismiss() {
      if (disposed || (state.step !== 'registered' && state.step !== 'rejected' && state.step !== 'not-registered')) return false;
      state = { step: 'idle' };
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimer();
      listeners.clear();
    },
  };
}
