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

/** A cue as a screen frame carries it: within its own list, a new number means show it once. */
export interface NumberedCue {
  readonly seq: number;
  readonly cue: Cue;
}

/**
 * The highest number a renderer has shown, per list. A frame's two lists are numbered
 * separately, so one mark for both would skip cues, and the numbers of one list say nothing
 * about the other.
 */
export interface CuesShown {
  readonly public: number;
  readonly private: number;
}

export interface CuePlan {
  /** The public list's new cues in the order issued, then the private list's. Nothing orders the two lists against each other. */
  readonly marks: readonly CueMark[];
  /** A renderer keeps this and passes it back with the next frame. */
  readonly shown: CuesShown;
}

/** The marks a renderer starts with on a frame it did not see come about: whatever that frame carries is not its to play. */
export function cuesAlreadyIn(publicCues: readonly NumberedCue[], privateCues: readonly NumberedCue[]): CuesShown {
  return { public: Math.max(0, ...publicCues.map(item => item.seq)), private: Math.max(0, ...privateCues.map(item => item.seq)) };
}

/**
 * What a renderer has to mark for a frame it has just drawn: every cue in each of the
 * frame's lists with a number above the last one it showed from that list. Pure, so "each
 * cue exactly once" is tested without a browser. A cue that has since left the frame is
 * simply not there any more: a mark already made for it is left to finish.
 */
export function planCues(shown: CuesShown, publicCues: readonly NumberedCue[], privateCues: readonly NumberedCue[]): CuePlan {
  const fresh = (list: readonly NumberedCue[], mark: number): NumberedCue[] => list.filter(item => item.seq > mark).sort((a, b) => a.seq - b.seq);
  const [open, own] = [fresh(publicCues, shown.public), fresh(privateCues, shown.private)];
  const marks = [...open, ...own].map(item => cueMark(item.cue)).filter((mark): mark is CueMark => mark !== null);
  const highest = (list: readonly NumberedCue[], mark: number): number => list.reduce((most, item) => Math.max(most, item.seq), mark);
  return { marks, shown: { public: highest(open, shown.public), private: highest(own, shown.private) } };
}
