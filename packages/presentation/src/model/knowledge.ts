import type { FullPlayerView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { seatNumber } from './common.js';
import type { ConnectedPrivateAreaModel } from './types.js';

// What the server's view tells one seat and nobody else, put into words for that seat's
// open private panel. Nothing here is worked out: each sentence is one field of the view.
// Which role has which of them is the server's knowledge. A field the view leaves empty
// produces no sentence, so the panel never shows that a role lacks something.

type Knowledge = NonNullable<NonNullable<ConnectedPrivateAreaModel['content']>['knowledge']>;

const bySeat = (a: SeatId, b: SeatId): number => seatNumber(a) - seatNumber(b);

export function buildKnowledge(view: FullPlayerView): Knowledge {
  const { knowledge, self } = view;
  /** A seat in a sentence: by its public number, or as the player's own. */
  const who = (seatId: SeatId): string => en.action.who(seatNumber(seatId), seatId === self.seatId);
  /** Seats in a list, in seat order: by public number, the player's own marked as theirs. */
  const listed = (seatIds: readonly SeatId[]): string => [...seatIds].sort(bySeat)
    .map(seatId => (seatId === self.seatId ? en.seat.labelSelf(seatNumber(seatId)) : en.seat.label(seatNumber(seatId)))).join(', ');

  const items: string[] = [];
  if (knowledge.insiderCandidates.length > 0) items.push(en.knowledge.insider(listed(knowledge.insiderCandidates)));
  if (knowledge.undercoverSeatId !== null) items.push(en.knowledge.undercover(en.seat.label(seatNumber(knowledge.undercoverSeatId))));
  if (knowledge.code.length > 0) items.push(en.knowledge.code(listed(knowledge.code)));
  // In the order the view lists them.
  for (const result of knowledge.scanResults) {
    const asked = en.knowledge.scan(result.round, who(result.targetSeatId), result.guess);
    // A wrong guess carries nothing about the Code; a right one carries membership and nothing else.
    const answer = !result.matched ? en.knowledge.scanWrong : result.inCode === true ? en.knowledge.scanRightInCode : result.inCode === false ? en.knowledge.scanRightNotInCode : null;
    items.push(answer === null ? asked : `${asked} ${answer}`);
  }
  // The two things the view says of a Protection: the round it is active from, and whether it
  // is used up. Comparing that round with the present one would be working something out.
  for (const protection of knowledge.protections) {
    items.push(protection.consumed ? en.knowledge.protectionUsed(who(protection.seatId)) : en.knowledge.protectionFrom(who(protection.seatId), protection.activeFromRound));
  }
  // What the seat holds. A weapon received later is learned here and nowhere else.
  items.push(en.knowledge.weapons(self.ordinaryWeapons));
  if (self.rescuesRemaining > 0) items.push(en.knowledge.rescues(self.rescuesRemaining));
  return { heading: en.knowledge.heading, items };
}
