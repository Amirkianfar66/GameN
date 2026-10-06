import type { MonotonicClock } from '../ports.js';

/** One request/response pair that carried a server timestamp. Times are local monotonic readings. */
export interface ClockSample {
  readonly requestedAt: number;
  readonly receivedAt: number;
  readonly serverTimeMs: number;
}

export type ClockReading =
  | { readonly status: 'unsynced' }
  | { readonly status: 'synced'; readonly serverNowMs: number; readonly uncertaintyMs: number };

export interface ServerClock {
  /** Returns true when the sample changed the estimate. */
  addSample(sample: ClockSample): boolean;
  /** Forgets the estimate. Used when local elapsed time can no longer be trusted. */
  invalidate(): void;
  read(): ClockReading;
}

// An estimate of server time for display only. The device's wall clock is never consulted:
// the estimate is a server timestamp carried forward by a monotonic clock, so a wrong or
// changed device time cannot move a countdown. It never opens, extends or closes a phase.
export function createServerClock(clock: MonotonicClock): ServerClock {
  let calibration: { readonly offsetMs: number; readonly uncertaintyMs: number } | null = null;
  return {
    addSample(sample) {
      const roundTripMs = sample.receivedAt - sample.requestedAt;
      if (!Number.isFinite(roundTripMs) || roundTripMs < 0 || !Number.isFinite(sample.serverTimeMs)) return false;
      // The response was stamped somewhere inside the round trip; assume its midpoint.
      const uncertaintyMs = roundTripMs / 2;
      const offsetMs = sample.serverTimeMs - (sample.requestedAt + uncertaintyMs);
      if (calibration) {
        const consistent = Math.abs(offsetMs - calibration.offsetMs) <= uncertaintyMs + calibration.uncertaintyMs;
        // A sample that disagrees beyond both error bars means local time stopped or jumped
        // (for example the device slept), so it replaces the estimate however loose it is.
        if (consistent && calibration.uncertaintyMs <= uncertaintyMs) return false;
      }
      calibration = { offsetMs, uncertaintyMs };
      return true;
    },
    invalidate() {
      calibration = null;
    },
    read() {
      if (!calibration) return { status: 'unsynced' };
      return { status: 'synced', serverNowMs: clock.now() + calibration.offsetMs, uncertaintyMs: calibration.uncertaintyMs };
    },
  };
}
