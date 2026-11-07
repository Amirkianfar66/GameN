// mothership:dev-only
//
// Slice 5 of the ability art: the ballots (a Captain election and its runoff, a Jail vote, a release
// vote), the Captain's release request, a Hack (its request and the note its two partners see) and Pass.
// Built on the shared parts of dossier.js and intel.js; private like every file: drawn only inside the
// seat's own open card or its own action strip, never on the board, the shared display or a host view.
// Every player phone loads the whole kit, whatever its role, and nothing in it is named after or
// coloured for a role or a team: every seat votes, asks for a Hack and passes with the same pieces.
//
// What each shows, and what it must never show:
// - A ballot. In the strip, beside the question, the seat's own pick on a paper slip with a pencil tick;
//   a release vote's slip carries the jailed player's chip, ticked for Yes or crossed for No; an
//   abstention is a blank slip with a dash. At the start of the detail line a ballot box; once the
//   server accepts the ballot the slip's edge stands in its slot. The receipt is not a result: no count,
//   no other ballot and nobody else's choice is drawn. A count is public only as the board's tally.
// - The Captain's release request: the jailed player's chip in a key ring. "No release request" draws
//   nothing.
// - A Hack. Its request: the asked player's chip in a comms ring. While the server says two players are
//   in one, each of them sees the same note: their own chip and the other's, joined by a coiled cord, and
//   the release's words, "Hack: you and Player 5." Nothing tells who asked, and nothing speaks of what
//   either may say in it: that depends on a role, which the note never reads.
// - Pass: the speaking turn's microphone at the start of the strip, handed on once the server accepts
//   Pass. The turn moving on is the board's public turn cue, the same for every seat.

import { el } from './dossier.js';
import { BEAT_ID, chip } from './intel.js';

export const BALLOT_COPY = Object.freeze({
  // The release's sentence (packages/presentation/src/copy/en.ts, hackWith), for each of the two partners.
  hackWith: seat => `Hack: you and Player ${seat}.`,
});

/** Motion, in ms. */
export const BALLOT_MOTION = Object.freeze({ post: 240, connect: 320, handOn: 240 });

/**
 * The seat's own ballot slip: seat, the player it names (the pick, or a release vote's subject), and
 * vote, 'for' (a pick), 'yes', 'no' or 'abstain'. An abstention names nobody.
 */
export function ballotSlip({ seat = null, vote }) {
  const named = vote === 'abstain' ? null : seat;
  return el('span', { class: 'ab-target ab-ballot', 'data-mark': 'ballot', 'data-vote': vote, 'aria-hidden': 'true' },
    named ? chip(named) : null, el('span', { class: 'ab-target__mark' }),
    el('span', { class: 'ab-ballot__pencil', 'data-pencil': vote === 'no' ? 'x-mark' : vote === 'abstain' ? 'dash' : 'tick' }));
}

/** The ballot box at the start of the detail line; posted once the server has accepted the ballot. */
export function ballotBox({ posted = false } = {}) {
  return el('span', { class: 'ab-box', 'data-posted': String(posted), 'aria-hidden': 'true' });
}

/** The speaking turn's microphone at the start of the Pass strip; handed on once the server has accepted Pass. */
export function speakingTurn({ passed = false } = {}) {
  return el('span', { class: 'ab-mic', 'data-passed': String(passed), 'aria-hidden': 'true' });
}

/**
 * The note each partner of a Hack sees while the server says they are in one: its own chip and the
 * other's, joined by the cord, and the release's words. self and partner: { n, name, character }.
 */
export function hackLink(self, partner) {
  return el('div', { class: 'ab-kit', 'data-kit': 'hack', 'data-partner': String(partner.n) },
    el('span', { class: 'ab-link', 'aria-hidden': 'true' }, chip(self), el('span', { class: 'ab-link__cord' }), chip(partner)),
    el('p', { class: 'ab-kit__words' }, BALLOT_COPY.hackWith(partner.n)));
}

// ---------- the beats: each plays once, for the change that caused it (app.js), tagged so that reduced motion can finish it ----------

/** A ballot accepted: the slip drops into the box's slot. On a box already drawn posted, so that its rest is the slip in the slot. */
export const post = box => box?.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { pseudoElement: '::after', duration: BALLOT_MOTION.post, easing: 'cubic-bezier(0.3, 1.3, 0.6, 1)', id: BEAT_ID }) ?? null;

/** A Hack's note shown for the first time: the cord runs from the seat's own chip to the other's. */
export const connect = cord => cord?.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: BALLOT_MOTION.connect, easing: 'ease-out', id: BEAT_ID }) ?? null;

/** Pass accepted: the microphone is handed on. On a microphone already drawn passed, so that its rest is the outline. */
export const handOn = mic => mic?.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(14px) rotate(12deg)' }], { pseudoElement: '::after', duration: BALLOT_MOTION.handOn, easing: 'ease-in', id: BEAT_ID }) ?? null;
