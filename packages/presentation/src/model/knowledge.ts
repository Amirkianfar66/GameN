import type { FullPlayerView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { seatNumber } from './common.js';
import type { ConnectedPrivateAreaModel, InsiderSetModel, RoleName } from './types.js';

// What the server's view tells one seat and nobody else, put into words for that seat's
// open private panel. Nothing here is worked out: each sentence is one field of the view.
// Which role has which of them is the server's knowledge. A field the view leaves empty
// produces no sentence, so the panel never shows that a role lacks something.

type Knowledge = NonNullable<NonNullable<ConnectedPrivateAreaModel['content']>['knowledge']>;

const bySeat = (a: SeatId, b: SeatId): number => seatNumber(a) - seatNumber(b);

/** The roles the Insider's three players hold between them, in the rule's own order. */
const INSIDER_ROLES: readonly RoleName[] = Object.freeze(['Undercover', 'Alien', 'Cracker']);

export function buildKnowledge(view: FullPlayerView): Knowledge {
  const { knowledge, self } = view;
  /** A seat in a sentence: by its public number, or as the player's own. */
  const who = (seatId: SeatId): string => en.action.who(seatNumber(seatId), seatId === self.seatId);
  /** Seats in a list, in seat order: by public number, the player's own marked as theirs. */
  const listed = (seatIds: readonly SeatId[]): string => [...seatIds].sort(bySeat)
    .map(seatId => (seatId === self.seatId ? en.seat.labelSelf(seatNumber(seatId)) : en.seat.label(seatNumber(seatId)))).join(', ');

  const items: string[] = [];
  const scans: Knowledge['art']['scans'][number][] = [];
  const protections: Knowledge['art']['protections'][number][] = [];
  // The view lists the three as a set. They are put in public seat order here, whatever order
  // the view gives, so no order can stand for a role.
  const insider: InsiderSetModel | null = knowledge.insiderCandidates.length > 0
    ? { seatIds: [...knowledge.insiderCandidates].sort(bySeat), roles: INSIDER_ROLES, sentence: en.knowledge.insider(listed(knowledge.insiderCandidates)) }
    : null;
  if (insider) items.push(insider.sentence);
  if (knowledge.undercoverSeatId !== null) items.push(en.knowledge.undercover(en.seat.label(seatNumber(knowledge.undercoverSeatId))));
  if (knowledge.code.length > 0) items.push(en.knowledge.code(listed(knowledge.code)));
  // In the order the view lists them.
  for (const result of knowledge.scanResults) {
    const asked = en.knowledge.scan(result.round, who(result.targetSeatId), result.guess);
    // A wrong guess carries nothing about the Code; a right one carries membership and nothing else.
    const answer = !result.matched ? en.knowledge.scanWrong : result.inCode === true ? en.knowledge.scanRightInCode : result.inCode === false ? en.knowledge.scanRightNotInCode : null;
    const sentence = answer === null ? asked : `${asked} ${answer}`;
    items.push(sentence);
    scans.push({ ...result, sentence });
  }
  // A Protection as the view states it: used up, or active from the round the view names. That
  // round is set beside the view's own round, so a Protection in place says so (the contract's
  // own meaning of the field). Before a Protection is resolved it is the registered command's
  // receipt that speaks for it, never this list.
  for (const protection of knowledge.protections) {
    const sentence = protection.consumed ? en.knowledge.protectionUsed(who(protection.seatId))
      : protection.activeFromRound <= view.round ? en.knowledge.protectionActive(who(protection.seatId))
        : en.knowledge.protectionFrom(who(protection.seatId), protection.activeFromRound);
    items.push(sentence);
    protections.push({ seatId: protection.seatId, state: protection.consumed ? 'used' : protection.activeFromRound <= view.round ? 'active' : 'queued', sentence });
  }
  // What the seat holds. A weapon received later is learned here and nowhere else.
  items.push(en.knowledge.weapons(self.ordinaryWeapons));
  // The Rescues the view counts. A Cracker with none left is told so; the count is the view's.
  if (self.rescuesRemaining > 0) items.push(en.knowledge.rescues(self.rescuesRemaining));
  else if (self.role === 'Cracker') items.push(en.knowledge.noRescues);
  return { heading: en.knowledge.heading, items, insider, art: {
    undercover: knowledge.undercoverSeatId === null ? null : { seatId: knowledge.undercoverSeatId, sentence: en.knowledge.undercover(en.seat.label(seatNumber(knowledge.undercoverSeatId))) },
    code: knowledge.code.length === 0 ? null : { seatIds: [...knowledge.code].sort(bySeat), sentence: en.knowledge.code(listed(knowledge.code)) },
    scans, protections,
    weapons: { count: self.ordinaryWeapons, sentence: en.knowledge.weapons(self.ordinaryWeapons) },
    rescues: self.rescuesRemaining > 0 ? { count: self.rescuesRemaining, sentence: en.knowledge.rescues(self.rescuesRemaining) }
      : self.role === 'Cracker' ? { count: 0, sentence: en.knowledge.noRescues } : null,
  } };
}
