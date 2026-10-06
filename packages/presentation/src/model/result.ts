import type { FullPublicView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { seatNumber } from './common.js';
import type { AudienceFacts, ResultModel } from './types.js';

// How a match ended, for every audience alike. Nothing here decides a winner or reveals
// anything: the winner is the one the server's view names, and the roles and the Code are
// shown only when that view carries them, which it does for a finished match and for no
// other. A match the host ended has no winner and, as the view stands, reveals nothing.

type EndFacts = Pick<FullPublicView, 'phase' | 'result' | 'endReveal'>;

/** Only a wire protocol 2 view carries the end of a match. */
function endFacts(view: AudienceFacts): EndFacts | null {
  return 'endReveal' in view ? view : null;
}

const bySeat = (a: SeatId, b: SeatId): number => seatNumber(a) - seatNumber(b);
const label = (seatId: SeatId, selfSeatId: SeatId | null): string => (seatId === selfSeatId ? en.seat.labelSelf(seatNumber(seatId)) : en.seat.label(seatNumber(seatId)));

/** What the match came to, in one sentence, or null while it is still being played. */
export function matchOutcome(view: AudienceFacts): string | null {
  const facts = endFacts(view);
  if (facts === null) return null;
  if (facts.phase.kind === 'ABORTED') return en.result.aborted;
  return facts.phase.kind === 'FINISHED' && facts.result !== null ? en.result.winner[facts.result.winner] : null;
}

/** What is said in addition when the server's result names the Alien as winning with the winner. */
export function matchOutcomeLines(view: AudienceFacts): readonly string[] {
  const facts = endFacts(view);
  return facts !== null && facts.phase.kind === 'FINISHED' && facts.result?.alienCoWinner === true ? [en.result.alienCoWinner] : [];
}

export function buildResult(view: AudienceFacts, selfSeatId: SeatId | null): ResultModel | null {
  const facts = endFacts(view);
  const outcome = matchOutcome(view);
  if (facts === null || outcome === null) return null;
  const reveal = facts.endReveal === null ? null : {
    heading: en.result.revealHeading,
    columns: en.result.columns,
    roles: [...facts.endReveal.roles].sort((a, b) => bySeat(a.seatId, b.seatId)).map(entry => ({ seatId: entry.seatId, label: label(entry.seatId, selfSeatId), role: entry.role })),
    code: en.result.code([...facts.endReveal.code].sort(bySeat).map(seatId => label(seatId, selfSeatId)).join(', ')),
  };
  return { heading: en.result.heading, outcome, lines: matchOutcomeLines(view), reveal };
}
