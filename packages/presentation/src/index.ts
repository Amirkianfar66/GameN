import type { PlayerPresentationEvent, PlayerView, PublicPresentationEvent, PublicView } from '@mothership/contracts';

// A director must receive one audience's compatible snapshot/event pair.
// Runtime validation, deduplication and motion execution belong to Frontend #3.
export type PresentationInput =
  | { readonly view: PublicView; readonly events: readonly PublicPresentationEvent[] }
  | { readonly view: PlayerView; readonly events: readonly PlayerPresentationEvent[] };

export interface MotionPreferences {
  readonly reducedMotion: boolean;
  readonly reducedEffects: boolean;
  readonly muted: boolean;
}
