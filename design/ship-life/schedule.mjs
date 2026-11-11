// mothership:dev-only
//
// Ship life: when each visit to a room's food capsule plays, and when one stops. A proposal for the
// owner and Frontend (11 November 2026), with preview fixtures standing in for the game's facts.
//
// Order (the owner's latest): after each turn, in the order turns end. Player 1 finishes and eats
// while play goes on; then Player 2; and so on. Play never waits for a visit: the next turn, a
// conversation or the next phase start on their own schedule, and a visit is decoration on top.
//
// One visitor at a capsule at a time, so nobody visibly collides at it. A visitor whose capsule is in
// use keeps working at their place and sets off so as to arrive just as the one before leaves (the
// two pass in the room, never at the capsule). A wait of more than WAIT.full turns the visit brief
// (one quick bite); a wait of more than WAIT.skip drops it: there is never a queue of people.
//
// What stops a visit at once (the figure goes back to its place in CANCEL_MS: out where it stands,
// in at its place; the real event then plays from the place as the game plays it today):
//   the character's real move, an injury or elimination, a conversation they are in, a phase change,
//   the lights going out (the Blackout keeps the frame and the places frozen), and, on this phone
//   only, a targeting the player opens (nothing is sent; other phones carry on, so a private choice
//   changes nothing anyone else sees).
// Nothing plays: in the Hospital (no capsule; the patients rest), for an Eliminated character, when
// the capsule's availability is unknown, or with Reduce motion.
//
// No replay: each visit has a key (the round and the seat). A phone that comes back (a reload, a
// reconnection, the app brought back) plays a visit only if it started less than RESUME_MS ago by the
// game's clock, from its start; an older one, or one this phone already played, is done.
//
// The game decides nothing here, and this decides nothing for the game: no food is spent or counted
// by a visit, and no visit's end tells the game anything. Availability (stocked, empty, unknown) is a
// fact the future gameplay contract will give; the preview names a fixture.

import { visitTimeline } from './eating.mjs';

/** How long a visitor may wait for the capsule: up to full, the whole visit; up to skip, a brief one; past it, none. */
export const WAIT = Object.freeze({ full: 1500, skip: 6000 });
/** How long a cancelled visit takes to put its figure back at its place: half out, half in. */
export const CANCEL_MS = 300;
/** A phone that comes back plays a visit that started less than this long ago, from its start. */
export const RESUME_MS = 1000;

/** The key of a visit, for not playing it twice: the round and the seat. */
export const visitKey = (round, seat) => `${round}:${seat}`;

/**
 * The visits of one room, in the order turns end there. turns: [{ seat, place (a slot), at (ms),
 * round }] as the game ends them (after-turn order). capsule: CAPSULES[room] or null. availability:
 * 'stocked' | 'empty' | 'unknown' (the contract's; a fixture in the preview). stops: [{ at, seat }]
 * (seat null: everyone, as a phase change or lights out). eliminated: seats that play nothing.
 * Returns [{ seat, place, round, key, start, kind, end, cancelAt, waited, timeline }] and the
 * turns that play nothing, with why.
 */
export function planRoom(turns, { capsule, availability = 'unknown', stops = [], reduced = false, eliminated = [], played = new Set() } = {}) {
  const visits = [], none = [];
  let free = -Infinity;
  for (const turn of [...turns].sort((a, b) => a.at - b.at)) {
    const key = visitKey(turn.round ?? 0, turn.seat);
    const why = !capsule ? 'no capsule in this room' : reduced ? 'Reduce motion' : availability === 'unknown' ? 'availability unknown'
      : eliminated.includes(turn.seat) ? 'eliminated' : played.has(key) ? 'already played on this phone' : null;
    if (why) { none.push({ seat: turn.seat, why }); continue; }
    let kind = availability === 'empty' ? 'empty' : 'stocked';
    // When would this visitor reach the capsule if they set off now, and how long must they wait?
    const probe = visitTimeline(turn.place, capsule, { kind, start: turn.at });
    const reach = probe.atCapsule[0] - turn.at;
    const waited = Math.max(0, free - (turn.at + reach));
    if (waited > WAIT.skip) { none.push({ seat: turn.seat, why: `the capsule was in use for ${Math.round(waited)} ms` }); continue; }
    if (waited > WAIT.full && kind === 'stocked') kind = 'brief';
    const start = turn.at + waited;
    const timeline = visitTimeline(turn.place, capsule, { kind, start });
    const stop = stops.filter(s => (s.seat == null || s.seat === turn.seat) && s.at >= start && s.at < timeline.end).sort((a, b) => a.at - b.at)[0];
    visits.push({ seat: turn.seat, place: turn.place.id, round: turn.round ?? 0, key, start, kind, end: timeline.end, cancelAt: stop ? stop.at : null, waited, timeline });
    free = timeline.atCapsule[1];
  }
  return { visits, none };
}

/**
 * Coming back to the app at now (the game's clock): which planned visits to play, and from when.
 * A visit that started less than RESUME_MS ago plays from its start; an older one is done.
 */
export function onResume(visits, now) {
  return visits.filter(v => now - v.start < RESUME_MS && now < v.end);
}
