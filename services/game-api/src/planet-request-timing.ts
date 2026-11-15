import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';

const stages = [
  'classification', 'readFenceRefresh', 'admission', 'sessionWriterWait', 'readWhileWriterWait', 'drain', 'drainLeaseWait', 'drainProbe',
  'authority', 'cleanup', 'finalReceipt', 'sdkReadOnly', 'sdkReadWrite',
  'sdkAttempt', 'sdkRead', 'sdkCommitAck', 'sdkCommitFailure', 'sdkRetryGap',
] as const;
export type PlanetTimingStage = typeof stages[number];

interface StageTiming {
  readonly count: number;
  readonly totalMs: number;
  readonly maxMs: number;
}

export interface PlanetRequestTimingSummary {
  readonly elapsedMs: number;
  readonly stages: Readonly<Partial<Record<PlanetTimingStage, StageTiming>>>;
}

interface RequestTiming {
  open: boolean;
  stages: Partial<Record<PlanetTimingStage, StageTiming>>;
}

const activeTiming = new AsyncLocalStorage<RequestTiming>();
const allowedStages = new Set<string>(stages);
const roundMs = (value: number) => Math.round(value * 1000) / 1000;

/** Opt-in server diagnostics. The callback receives only completed spans and monotonic durations. */
export function withPlanetRequestTiming<T>(
  run: () => Promise<T>,
  onSummary: (summary: PlanetRequestTimingSummary) => void,
): Promise<T> {
  const timing: RequestTiming = {open: true, stages: {}};
  const started = performance.now();
  return activeTiming.run(timing, async () => {
    try {
      return await run();
    } finally {
      timing.open = false;
      const elapsedMs = roundMs(performance.now() - started);
      const summary = Object.fromEntries(Object.entries(timing.stages).map(([stage, value]) => [
        stage, {count: value.count, totalMs: roundMs(value.totalMs), maxMs: roundMs(value.maxMs)},
      ]));
      try {
        // A failed logger must never replace a successful response or the original error.
        void Promise.resolve(onSummary({elapsedMs, stages: summary})).catch(() => {});
      } catch { /* Diagnostics are best effort. */ }
    }
  });
}

export function beginPlanetTiming(stage: PlanetTimingStage): (() => void) | undefined {
  const timing = activeTiming.getStore();
  if (!timing?.open || !allowedStages.has(stage)) return undefined;
  const started = performance.now();
  let ended = false;
  return () => {
    if (ended || !timing.open) return;
    ended = true;
    const elapsed = performance.now() - started;
    const prior = timing.stages[stage];
    timing.stages[stage] = {
      count: (prior?.count ?? 0) + 1,
      totalMs: (prior?.totalMs ?? 0) + elapsed,
      maxMs: Math.max(prior?.maxMs ?? 0, elapsed),
    };
  };
}

export function timePlanetStage<T>(stage: PlanetTimingStage, run: () => Promise<T>): Promise<T> {
  const finish = beginPlanetTiming(stage);
  if (!finish) return run();
  try {
    return run().finally(finish);
  } catch (error) {
    finish();
    throw error;
  }
}
