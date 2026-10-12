// mothership:dev-only
//
// Slice 3 of the ability art: the Cracker's Rescue, the two Disablers' Disable and the Supplier's
// Supply, with the slips a Supply leaves in its Supplier's and its recipients' own cards. Built on the
// shared parts of dossier.js and intel.js; private like every file: drawn only inside the seat's own
// open card or its own action strip, never on the board, the shared display or a host view. Every
// player phone loads the whole kit, whatever its role, and nothing in it is named after or coloured for
// a role or a team.
//
// What each shows, and what it must never show:
// - The Rescue. The vials are the Cracker's Rescues left (self.rescuesRemaining) of the two a match
//   gives (v2.1 roles.Cracker.rescues_per_match), a picture of the release's sentence ("Rescues you
//   have left: 2."). A vial empties when the view's count falls, never ahead of it: the use is reserved
//   when the Rescue is accepted (V1-15), and kept whatever the round brings. The target is ringed by
//   the medical cross while it is chosen and sent. Registering is not a recovery: nothing in the strip
//   or the card says the target is, or will be, healed. A recovery is public, the board's health
//   change, the same on every screen, naming no rescuer and no Rescue.
// - The Disable. The target is ringed by sparks while it is chosen and sent; one charge cell is the
//   one Disable a match gives (uses_per_match 1): full while the server offers the Disable, spent on its
//   receipt (reserved at acceptance, V1-15). The view keeps no lasting "spent": disablerAvailable means
//   a legal target now, so the card draws none (DSN-REQ-15). The Blue and the Red Disabler see the same
//   strip, part for part: their identities stay in their own role cards (the approved devices), so that
//   a glance at a phone mid-Disable tells nobody which. The effect is public, as a health change, the
//   same as any damage.
// - The Supply. Two shipping tags, the picks' chips in seat order (a set of two, never first and
//   second); the receipt ties them together and is not a delivery. A delivery is shown only from an own
//   acknowledgment (V1-16): the Supplier's names the players who received a weapon, in the release's
//   sentence; a recipient's says one ordinary weapon arrived and names no Supplier. No public marker.

import { el, STAMP_EASING } from './dossier.js';
import { BEAT_ID, chip } from './intel.js';

export const TOOLS_COPY = Object.freeze({
  // The release's sentences: knowledge.rescues in packages/presentation/src/copy/en.ts, and the own
  // acknowledgments and their heading in packages/presentation/src/markup/comic-shell.ts.
  rescues: count => `Rescues you have left: ${count}.`,
  supplyResults: 'Supply results',
  supplied: names => `Your Round 3 Supply granted one weapon each to ${names}.`,
  suppliedNone: 'No players received a weapon from your Round 3 Supply.',
  received: round => `You received one ordinary weapon from Supply in Round ${round}.`,
  historyUnavailable: 'Supply result history is unavailable for this match.',
  // Proposed: the stamp of a slip that says a weapon arrived.
  delivered: 'Delivered',
});

/** Motion, in ms. */
export const TOOLS_MOTION = Object.freeze({ drain: 240, discharge: 200, tie: 200, drop: 260 });

/** The Cracker's vials: the Rescues left of the two a match gives, the full ones first. A picture of the release's sentence. */
export function vials(remaining, { of = 2 } = {}) {
  return el('span', { class: 'ab-vials', 'data-remaining': String(remaining), 'aria-hidden': 'true' },
    Array.from({ length: of }, (_, index) => el('span', { class: 'ab-vial', 'data-full': String(index < remaining) })));
}

/** An action's target in the strip: the player's chip with the action's mark over it, the cross of a Rescue or the sparks of a Disable. */
export function target(seat, mark) {
  return el('span', { class: 'ab-target', 'data-mark': mark, 'aria-hidden': 'true' }, chip(seat), el('span', { class: 'ab-target__mark' }));
}

/** The one Disable a match gives: a charge cell, full while it is offered, spent on its receipt. */
export const cell = ({ spent = false } = {}) => el('span', { class: 'ab-cell', 'data-spent': String(spent), 'aria-hidden': 'true' });

/** Supply's two shipping tags: the picks' chips in seat order, whatever order they were picked in; tied together on the receipt. */
export function supplyTags(picks, { tied = false } = {}) {
  const sorted = [...picks].sort((a, b) => a.n - b.n);
  // A picture of the strip's words, which name the picks in seat order: hidden from assistive technology.
  return el('span', { class: 'ab-tags', 'data-count': String(sorted.length), 'data-tied': String(tied), 'aria-hidden': 'true' },
    Array.from({ length: 2 }, (_, index) => el('span', { class: 'ab-tag', 'data-filled': String(index < sorted.length) }, index < sorted.length ? chip(sorted[index]) : null)),
    el('span', { class: 'ab-tags__string' }));
}

/** The Cracker's Rescues in the card, while one is left: the vials and the release's sentence. At none the release says nothing, and so does the card. */
export function rescueKit(remaining) {
  return el('div', { class: 'ab-kit', 'data-kit': 'rescue' }, vials(remaining), el('p', { class: 'ab-kit__words' }, TOOLS_COPY.rescues(remaining)));
}

/** One slip: a tag per player it names (seat order), the words, and a stamp when a weapon arrived. */
function slip({ key, words, seats = [], delivered = false }) {
  return el('li', { class: 'ab-slip', 'data-slip': key },
    seats.length ? el('span', { class: 'ab-slip__tags', 'aria-hidden': 'true' }, seats.map(seat => el('span', { class: 'ab-tag', 'data-filled': 'true' }, chip(seat)))) : null,
    el('p', { class: 'ab-slip__words' }, words),
    delivered ? el('span', { class: 'ab-stamp ab-slip__stamp', 'data-stamp': 'delivered', 'aria-hidden': 'true' }, TOOLS_COPY.delivered) : null);
}

/**
 * Supply results, as the release heads them, in the seat's own card. supplied: the Supplier's own
 * results ({ round, recipients: [{ n, name, character }] }, the players who received a weapon);
 * received: the seat's own receipts of a weapon ({ round }); self: the seat's own identity;
 * unavailable: the Supplier's history is not available for this match. Returns null when there is nothing to say.
 */
export function deliveries({ supplied = [], received = [], self = null, unavailable = false }) {
  const slips = [
    ...supplied.map(result => {
      const seats = [...result.recipients].sort((a, b) => a.n - b.n);
      // The release's words name the players as the acknowledgment lists them, in seat order (the engine sorts them).
      return slip({ key: `supplied:${result.round}`, seats, delivered: seats.length > 0,
        words: seats.length ? TOOLS_COPY.supplied(seats.map(seat => `Player ${seat.n}`).join(' and ')) : TOOLS_COPY.suppliedNone });
    }),
    ...received.map(result => slip({ key: `received:${result.round}`, seats: self ? [self] : [], delivered: true, words: TOOLS_COPY.received(result.round) })),
    ...(unavailable ? [slip({ key: 'unavailable', words: TOOLS_COPY.historyUnavailable })] : []),
  ];
  if (!slips.length) return null;
  return el('section', { class: 'ab-deliveries', 'aria-labelledby': 'ab-deliveries-title' },
    el('h3', { class: 'ab-deliveries__title', id: 'ab-deliveries-title' }, TOOLS_COPY.supplyResults),
    el('ul', { class: 'ab-deliveries__list' }, slips));
}

// ---------- the beats: each plays once, when the strip or the card changes (app.js), and is tagged so that reduced motion can finish it ----------

/** A vial empties: the liquid falls away. On a vial already drawn empty, so that its rest is the view's count. */
export const drain = vial => vial?.animate([{ clipPath: 'inset(0 0 0 0)', opacity: 1 }, { clipPath: 'inset(100% 0 0 0)', opacity: 1 }], { pseudoElement: '::after', duration: TOOLS_MOTION.drain, easing: 'ease-in', id: BEAT_ID }) ?? null;

/** The cell discharges: its charge flickers out. On a cell already drawn spent. */
export const discharge = node => node?.animate([{ opacity: 1 }, { opacity: 0.2, offset: 0.3 }, { opacity: 0.85, offset: 0.5 }, { opacity: 0 }], { pseudoElement: '::after', duration: TOOLS_MOTION.discharge, easing: 'linear', id: BEAT_ID }) ?? null;

/** The receipt ties the two tags together: the string is drawn from one eyelet to the other. */
export const tie = tags => tags?.querySelector('.ab-tags__string')?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: TOOLS_MOTION.tie, easing: STAMP_EASING, fill: 'backwards', id: BEAT_ID }) ?? null;

/** A slip the card shows for the first time in this page drops into place, once. */
export const dropIn = node => node?.animate([{ opacity: 0, transform: 'translateY(-14px) rotate(-3deg)' }, { opacity: 1, transform: 'none' }], { duration: TOOLS_MOTION.drop, easing: 'cubic-bezier(0.3, 1.3, 0.6, 1)', fill: 'backwards', id: BEAT_ID }) ?? null;
