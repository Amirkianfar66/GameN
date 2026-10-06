import type { DeadlineEstimate, PhaseFacts } from '@mothership/presentation';
import type { ClockReading } from './server-clock.js';

// How much of the trusted deadline is left, as far as this client can tell. Showing zero
// here changes nothing on the server: only an authoritative view moves the phase on.
export function estimateDeadline(phase: PhaseFacts, reading: ClockReading): DeadlineEstimate {
  if (phase.endsAt === null) return { kind: 'none' };
  if (reading.status === 'unsynced') return { kind: 'unsynced' };
  const remainingMs = phase.endsAt - reading.serverNowMs;
  if (remainingMs <= 0) return { kind: 'expired' };
  // An estimate that runs slightly behind the server must not show more than the phase holds.
  return { kind: 'running', remainingMs: Math.min(remainingMs, phase.endsAt - phase.startedAt) };
}

/** Milliseconds until a countdown shown in whole seconds, rounded up, next changes. */
export function millisecondsToNextSecond(remainingMs: number): number {
  const remainder = remainingMs % 1000;
  return remainder === 0 ? 1000 : remainder;
}
