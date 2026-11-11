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
//   the character's real move, an injury or elimination, a conversation they are in, the game leaving
//   turn play (TURN_PLAY below: a new player's turn is not a stop), the lights going out among it (the
//   Blackout keeps the frame and the places frozen), and, on this phone
//   only, a targeting the player opens (nothing is sent; other phones carry on, so a private choice
//   changes nothing anyone else sees).
// The same event before a visit begins (while the visitor still waits for the capsule, or at the
// moment it would begin) drops it: it never begins, so nothing walks after the phase has changed or
// the lights have gone out, and the capsule stays free for the next visitor.
// Nothing plays: in the Hospital (no capsule; the patients rest), for an Eliminated character, when
// the capsule's availability is unknown, or with Reduce motion.
//
// No replay: each visit has a key (the round and the seat). A phone that comes back (a reload, a
// reconnection, the app brought back) plays a visit already under way only if it started less than
// RESUME_MS ago by the game's clock and has not been stopped, from its start; an older one, a stopped
// one, or one this phone already played, is done. A visit yet to start plays when it starts.
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

/**
 * Which phase changes stop visits (Integration's review of #230). The engine opens a new phase, with
 * a new id, at each player's turn, and a visit carries on into the next player's turn: a new phase id
 * alone is not a stop. Turn play is a player's turn and the Hack steps inside it; in the full and the
 * planet game alike, the engine goes from them only to the next player's turn or out of turn play
 * (packages/engine/src/full-game/lifecycle.ts and planet-game/lifecycle.ts). Every visit stops, as a
 * stop for everyone (seat null), when the public phase's kind leaves turn play: the lights going out
 * (BLACKOUT), a vote or its result, a Blackhole's presentation, a new round's start, the Showdown,
 * the end, an abort, and a kind this list does not know (a later version's) alike. In today's engine
 * the round's last turn ends as turn play does, so that turn's visit does not begin.
 */
export const TURN_PLAY = Object.freeze(['ORDINARY_TURN', 'HACK_DECLARE', 'HACK_RESULT', 'HACK']);
/** Whether entering a public phase of this kind stops every visit: true for any kind outside turn play. */
export const phaseStops = kind => !TURN_PLAY.includes(kind);

/** The key of a visit, for not playing it twice: the round and the seat. */
export const visitKey = (round, seat) => `${round}:${seat}`;

/**
 * The visits of one room, in the order turns end there. turns: [{ seat, place (a slot), at (ms),
 * round }] as the game ends them (after-turn order). capsule: CAPSULES[room] or null. availability:
 * 'stocked' | 'empty' | 'unknown' (the contract's; a fixture in the preview). stops: [{ at, seat }]
 * (seat null: everyone, when the public phase leaves turn play, phaseStops; the lights going out are
 * one such change). eliminated: seats that play nothing.
 * A stop from the turn's end until the visit would begin drops the visit (it never begins, and the
 * capsule stays free); a stop after it has begun cancels it at that moment (cancelAt > start).
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
    // The first stop for this seat (or everyone) from the turn's end until the visit would be over.
    const stop = stops.filter(s => (s.seat == null || s.seat === turn.seat) && s.at >= turn.at && s.at < timeline.end).sort((a, b) => a.at - b.at)[0];
    if (stop && stop.at <= start) { none.push({ seat: turn.seat, why: 'stopped before it began' }); continue; }
    visits.push({ seat: turn.seat, place: turn.place.id, round: turn.round ?? 0, key, start, kind, end: timeline.end, cancelAt: stop ? stop.at : null, waited, timeline });
    free = timeline.atCapsule[1];
  }
  return { visits, none };
}

/**
 * Coming back to the app at now (the game's clock): which visits already under way to play, from
 * their start. Only one that has started, less than RESUME_MS ago, and has not been stopped; an
 * older or stopped one is done, and one yet to start plays when it starts, as planned.
 */
export function onResume(visits, now) {
  return visits.filter(v => v.start <= now && now - v.start < RESUME_MS && now < v.end && (v.cancelAt == null || now < v.cancelAt));
}
