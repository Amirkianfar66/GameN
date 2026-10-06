import type { SeatId } from '@mothership/contracts';
import type { Cue } from '../director/director.js';
import { isSeatId } from '../model/common.js';

// Where in a shell's own markup a cue is shown. The markup carries these names in
// data-cue-at, the same for every role and at every moment, so marking an element for a
// cue is a lookup by a fixed name and never a selector assembled from data.

/** The names a shell's markup gives to the places a cue can land. */
export const CUE_AT = {
  /** The round and phase labels. Not the countdown, which no cue touches. */
  phase: 'phase',
  /** The status line of the action card a registration belongs to. Inside the private panel. */
  registration: 'registration',
  /** Wherever a seat's token is listed, and its location in the table's roster. */
  place: (seatId: SeatId): string => `${seatId}/place`,
  /** A seat's public health, wherever it is shown. */
  health: (seatId: SeatId): string => `${seatId}/health`,
} as const;

/** Mark every element whose data-cue-at equals `at` with data-cue=`name` for as long as the cue plays. */
export interface CueMark {
  readonly at: string;
  readonly name: Cue['kind'];
}

export function cueMark(cue: Cue): CueMark | null {
  switch (cue.kind) {
    case 'phase-change':
    case 'round-transition':
      return { at: CUE_AT.phase, name: cue.kind };
    case 'public-move':
      return isSeatId(cue.seatId) ? { at: CUE_AT.place(cue.seatId), name: cue.kind } : null;
    case 'status-change':
      return isSeatId(cue.seatId) ? { at: CUE_AT.health(cue.seatId), name: cue.kind } : null;
    case 'registration':
      return { at: CUE_AT.registration, name: cue.kind };
    default:
      // A kind this build does not know is not drawn. Nothing is guessed for it.
      return null;
  }
}

/** A cue as a screen frame carries it: a new number means show it once. */
export interface NumberedCue {
  readonly seq: number;
  readonly cue: Cue;
}

export interface CuePlan {
  /** In the order the cues were issued. */
  readonly marks: readonly CueMark[];
  /** The highest number seen. A renderer keeps it and passes it back with the next frame. */
  readonly shown: number;
}

/**
 * What a renderer has to mark for a frame it has just drawn: every cue in the frame's
 * lists with a number above the last one it showed. Pure, so "each cue exactly once"
 * is tested without a browser. A renderer that starts on a frame which already carries
 * cues passes the highest of their numbers as `shown`, and plays none of them.
 */
export function planCues(shown: number, ...lists: readonly (readonly NumberedCue[])[]): CuePlan {
  const fresh = lists.flat().filter(item => item.seq > shown).sort((a, b) => a.seq - b.seq);
  const marks = fresh.map(item => cueMark(item.cue)).filter((mark): mark is CueMark => mark !== null);
  return { marks, shown: fresh.reduce((highest, item) => Math.max(highest, item.seq), shown) };
}
