// mothership:dev-only
//
// Slice 4 of the ability art: the ordinary shot (the Officer's first shot from Round 1, the
// Undercover's, a supplied weapon's, an Alien's among them) and the Undercover's Protection. Built on
// the shared parts of dossier.js, intel.js and tools.js; private like every file: drawn only inside the
// seat's own open card or its own action strip, never on the board, the shared display or a host view.
// Every player phone loads the whole kit, whatever its role, and nothing in it is named after or
// coloured for a role or a team.
//
// What each shows, and what it must never show:
// - A shot. The target's chip in a reticle beside the question; at the start of the detail line the
//   rounds the seat holds (self.ordinaryWeapons). The shot uses one when it is accepted, and the round
//   is drawn spent when the view's count falls, never ahead of it. Direct targeting: the shooter and the
//   target, no third player (direct-shot-2026-09-26). The receipt is not damage: a hit, if there is one,
//   is the public health change at the end of the round, the same for every cause and from no
//   direction. Every seat that shoots sees the same strip, part for part.
// - Protection. In the Undercover's strip the target's chip on a shield; the receipt is not a grant. In
//   the Undercover's card one note per Protection the view carries (knowledge.protections), in the
//   view's order and the release's words, "Protection for Player 5: active from round 3." or
//   "Protection for Player 5: used up.", the player's chip on a whole shield, or drawn whole before a
//   shield split in two: the shield was spent, not the player. Whether that round has come is not worked
//   out, as the release does not. Only the Undercover's own view carries any of it (V1-17): nothing is
//   drawn for the recipient, the public, or a seat whose shot or Disable it stopped.
// - The weapons note. "Ordinary weapons you hold: 1." (the release's sentence, for every seat that
//   holds a count), with its rounds.

import { el, STAMP_EASING } from './dossier.js';
import { BEAT_ID, chip } from './intel.js';

export const GUARD_COPY = Object.freeze({
  // The release's sentences (packages/presentation/src/copy/en.ts, knowledge.weapons, knowledge.protectionFrom, knowledge.protectionUsed).
  weapons: count => `Ordinary weapons you hold: ${count}.`,
  protectionFrom: (who, round) => `Protection for ${who}: active from round ${round}.`,
  protectionUsed: who => `Protection for ${who}: used up.`,
});

/** Motion, in ms. */
export const GUARD_MOTION = Object.freeze({ spend: 220, crack: 260 });

/**
 * The rounds a seat holds: as many full as the view's count, and after an accepted shot the one it used,
 * spent, once the count has fallen. A picture of the release's sentence.
 */
export function rounds(count, { spent = 0 } = {}) {
  return el('span', { class: 'ab-rounds', 'data-count': String(count), 'aria-hidden': 'true' },
    Array.from({ length: count }, () => el('span', { class: 'ab-round', 'data-spent': 'false' })),
    Array.from({ length: spent }, () => el('span', { class: 'ab-round', 'data-spent': 'true' })));
}

/** The weapons note in the card: the rounds and the release's sentence. */
export function weaponsNote(count) {
  return el('div', { class: 'ab-kit', 'data-kit': 'weapons' }, count > 0 ? rounds(count) : null, el('p', { class: 'ab-kit__words' }, GUARD_COPY.weapons(count)));
}

/**
 * The Undercover's own notes of its Protections, in the view's order: protections, [{ seat: { n, name,
 * character }, activeFromRound, consumed, self }]. The words are the release's; the shield says no more.
 */
export function guardNotes(protections) {
  if (!protections.length) return null;
  return el('ul', { class: 'ab-guards' }, protections.map(protection => {
    const who = protection.self ? 'yourself' : `Player ${protection.seat.n}`;
    const used = protection.consumed === true;
    return el('li', { class: 'ab-guard', 'data-guard': String(protection.seat.n), 'data-used': String(used) },
      el('span', { class: 'ab-target ab-guard__mark', 'data-mark': used ? 'shield-used' : 'shield', 'aria-hidden': 'true' }, chip(protection.seat), el('span', { class: 'ab-target__mark' })),
      el('p', { class: 'ab-guard__words' }, used ? GUARD_COPY.protectionUsed(who) : GUARD_COPY.protectionFrom(who, protection.activeFromRound)));
  }));
}

// ---------- the beats: each plays once, for the change that caused it (app.js), tagged so that reduced motion can finish it ----------

/** A round spent: it leaves the rack. On a round already drawn spent, so that its rest is the view's count. */
export const spend = round => round?.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px) rotate(14deg)' }], { pseudoElement: '::after', duration: GUARD_MOTION.spend, easing: 'ease-in', id: BEAT_ID }) ?? null;

/** A Protection the view now says is used up: its split shield shakes and settles, once. On a note already drawn used up. */
export const crack = mark => mark?.animate([{ transform: 'none' }, { transform: 'translateX(-2px) rotate(-4deg)', offset: 0.25 }, { transform: 'translateX(2px) rotate(3deg)', offset: 0.5 }, { transform: 'none' }], { duration: GUARD_MOTION.crack, easing: STAMP_EASING, id: BEAT_ID }) ?? null;
