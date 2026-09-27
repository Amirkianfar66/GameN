import type { SeatId } from '@mothership/contracts';

// Boundary only. No command evaluation or game-state implementation in bootstrap #1.
export interface EvaluationContext {
  readonly actorSeatId: SeatId;
  readonly evaluatedAt: number;
  readonly recordedRandomFacts: readonly number[];
}
