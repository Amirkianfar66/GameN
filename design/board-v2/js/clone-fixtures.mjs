// mothership:dev-only
//
// Synthetic inputs for the Clone's review page (storyboard S3; docs/design/clone-s3.md): a page for
// review, not a client. Which seat is the Alien is the server's secret; here it is seat 3, Lyra,
// because the review must pick one, and that is all it means. The statuses have the shape of
// full-game-1.10.0's self.cloneStatus (#153, packages/contracts/src/clone.ts): once-only, its fixed
// expiry the round after its activation (Round 5 its own).
//
// Not to port: a client takes the own view the server sends it.

import { fixtureSeats } from './fixtures.mjs';

/** The review's Alien: seat 3 (synthetic, labelled). */
export const CLONE_SEAT = 3;

/** self.cloneStatus as 1.10 shapes it: unused, active (activated in Round 2, through Round 3), ended; and a Round 5 activation. */
export const CLONE_STATUSES = Object.freeze({
  unused: Object.freeze({ used: false, activatedRound: null, expiresAfterRound: null, active: false }),
  active: Object.freeze({ used: true, activatedRound: 2, expiresAfterRound: 3, active: true }),
  ended: Object.freeze({ used: true, activatedRound: 2, expiresAfterRound: 3, active: false }),
  r5: Object.freeze({ used: true, activatedRound: 5, expiresAfterRound: 5, active: true }),
});

/**
 * The review's cases: the own view before and after (the film it starts, by cloneFilmFor()), and
 * where the Alien is. activate: Lyra in Room A, unused, then active through Round 3. expire: active,
 * then ended. jailed: active after a Jail vote put Lyra in the Jail, its expiry unchanged (Q-C02f).
 * r5: activated in Round 5, through Round 5's resolution.
 */
export const CLONE_CASES = Object.freeze({
  activate: Object.freeze({ before: 'unused', after: 'active', jailed: false }),
  expire: Object.freeze({ before: 'active', after: 'ended', jailed: false }),
  jailed: Object.freeze({ before: 'active', after: 'active', jailed: true }),
  r5: Object.freeze({ before: 'unused', after: 'r5', jailed: false }),
});

/**
 * One case for a roster: the seats the board draws (the mixed board; for jailed, Lyra at the Jail's
 * free place J1), the Alien's own seat, and its view's cloneStatus before and after.
 */
export function cloneCase(name, roster) {
  const entry = CLONE_CASES[name];
  if (!entry) throw new Error(`No Clone case ${name}`);
  const seats = fixtureSeats('mixed', roster).map(seat => (entry.jailed && seat.seat === CLONE_SEAT ? { ...seat, room: 'jail', slot: 'J1', jailed: true } : seat));
  const own = seats.find(seat => seat.seat === CLONE_SEAT);
  return { name, seats, own, before: CLONE_STATUSES[entry.before], after: CLONE_STATUSES[entry.after] };
}
