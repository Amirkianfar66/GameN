import type { ClientPorts } from '../ports.js';
import type { ConnectedAdvanceResult, ConnectedApi } from './api.js';

// Deadline catch-up, as docs/backend/protocol2-client-handoff.md describes it: once this
// device's trusted estimate has reached the deadline of a phase the server confirmed, an
// admitted display or player may ask the server to evaluate that deadline (`v1Advance`).
//
// Asking decides nothing. The server compares its own clock with the deadline it set and
// answers "advanced" or "unchanged"; a phase can never be skipped or cut short from here,
// and the screen changes only when a new authoritative view arrives. This exists because a
// backend deadline job may be late or, under the local emulators, not run at the deadline
// at all, and a table should not sit on an ended phase.

/** Client-side technical parameters. None of them is a game rule, and none moves a deadline. */
export interface CatchUpTiming {
  /** How long after its own countdown ends a shared display waits before it asks. */
  readonly firstDelayMs: number;
  /** A phone waits longer than a display, so that with a display on the table a phone seldom asks at all. */
  readonly playerDelayMs: number;
  /** Phones wait a different time each, by seat, so that they do not all ask at once. */
  readonly seatStaggerMs: number;
  /** Waits before asking again while the same ended phase is still on screen. The last one repeats. */
  readonly retryDelaysMs: readonly number[];
}

export const DEFAULT_CATCH_UP_TIMING: CatchUpTiming = {
  firstDelayMs: 500,
  playerDelayMs: 2_500,
  seatStaggerMs: 400,
  retryDelaysMs: [1_000, 2_000, 4_000, 8_000, 15_000],
};

/** What the screen knows right now about the phase it shows. */
export interface CatchUpContext {
  /** The phase on screen, or null when no view is. */
  readonly phaseId: string | null;
  /** The view was confirmed by the server and nothing is wrong with the connection. */
  readonly current: boolean;
  /** The trusted estimate of server time has reached that phase's deadline. */
  readonly expired: boolean;
  /** The page is in front of someone. A hidden page's timers are not to be trusted. */
  readonly foreground: boolean;
}

export interface CatchUpOptions {
  readonly api: Pick<ConnectedApi, 'advance'>;
  readonly ports: ClientPorts;
  readonly matchId: string;
  /** 0 for a shared display; the seat number for a phone. Decides only how long this device waits. */
  readonly order: number;
  readonly timing?: Partial<CatchUpTiming> | undefined;
}

export interface DeadlineCatchUp {
  /** Tells the catch-up the present. Called for every redraw. */
  observe(context: CatchUpContext): void;
  dispose(): void;
}

/** Failures after which asking again for the same phase would be pointless or unwelcome. */
const FINAL: ReadonlySet<string> = new Set(['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL']);

export function createDeadlineCatchUp(options: CatchUpOptions): DeadlineCatchUp {
  const { api, ports, matchId } = options;
  const timing: CatchUpTiming = { ...DEFAULT_CATCH_UP_TIMING, ...options.timing };
  const order = Number.isInteger(options.order) && options.order > 0 ? options.order : 0;
  const firstDelayMs = order === 0 ? timing.firstDelayMs : timing.playerDelayMs + (order - 1) * timing.seatStaggerMs;

  let context: CatchUpContext = { phaseId: null, current: false, expired: false, foreground: false };
  /** The phase the counters below are about. */
  let phaseId: string | null = null;
  let asked = 0;
  let gaveUp = false;
  let timer: unknown = null;
  let inFlight = false;
  let disposed = false;

  const due = (): boolean => context.phaseId !== null && context.current && context.expired && context.foreground;

  function clearTimer(): void {
    if (timer !== null) ports.scheduler.clearTimeout(timer);
    timer = null;
  }

  function schedule(delayMs: number): void {
    clearTimer();
    timer = ports.scheduler.setTimeout(() => {
      timer = null;
      void ask();
    }, delayMs);
  }

  function retryDelay(): number {
    const delays = timing.retryDelaysMs;
    return delays[Math.min(asked - 1, delays.length - 1)] ?? 15_000;
  }

  // Runs only when a wait runs out. Every wait is called off the moment the phase moves on,
  // the view stops being current or the page leaves the foreground, so when one does run out
  // the phase on screen is the one it was started for, and it is still due.
  async function ask(): Promise<void> {
    const forPhase = phaseId;
    if (forPhase === null) return;
    inFlight = true;
    asked += 1;
    let result: ConnectedAdvanceResult | null = null;
    try {
      result = await api.advance(matchId, forPhase);
    } catch {
      // The same as no answer.
    }
    inFlight = false;
    if (disposed) return;
    // Another phase came on screen while the request was out: this answer is about the past.
    if (forPhase !== phaseId) return consider();
    if (result !== null && result.kind === 'api-failure' && FINAL.has(result.code)) {
      // This device may not ask, or the server cannot read what it asks. It stops for this phase.
      gaveUp = true;
      return;
    }
    if (!due()) return;
    // "advanced" and "unchanged" both mean: wait for the view. If none comes, ask again later;
    // an early or repeated ask is answered "unchanged" and changes nothing.
    const told = result !== null && result.kind === 'api-failure' && result.code === 'RATE_LIMITED' ? result.retryAfterMs ?? 0 : 0;
    // A delay the server named is a minimum. This device's own delay never shortens it.
    schedule(Math.max(retryDelay(), told) + order * timing.seatStaggerMs);
  }

  function consider(): void {
    if (disposed) return;
    if (context.phaseId !== phaseId) {
      // Another phase is on screen: whatever was planned for the previous one is void.
      clearTimer();
      phaseId = context.phaseId;
      asked = 0;
      gaveUp = false;
    }
    if (!due() || gaveUp) return clearTimer();
    if (timer !== null || inFlight) return;
    schedule(asked === 0 ? firstDelayMs : retryDelay() + order * timing.seatStaggerMs);
  }

  return {
    observe(next) {
      context = next;
      consider();
    },
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
