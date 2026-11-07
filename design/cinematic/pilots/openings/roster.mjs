// mothership:dev-only
//
// The boarding's one input: the match's public roster (issue #188: "the match's actual public
// selected character appearances and participant count", from the authorized admitted roster). Each
// member is { seat, character }: the seat's public number and the crew character chosen in the lobby.
// Nothing else is read: a role, a faction, a Code membership or any private field given with a
// member is dropped here, so nothing secret can reach the boarding's order, emphasis, clothing,
// gestures, camera or sound. The order is the seats' public order.

import { CREW } from '../../../board-motion/figures/crew.mjs';

/** The match sizes the boarding is drawn for. */
export const PLAYER_COUNTS = Object.freeze([7, 8, 9]);

/** The roster as the boarding reads it: 7 to 9 members, in seat order, { seat, character } only. */
export function publicRoster(roster) {
  if (!Array.isArray(roster)) throw new Error('boarding: the roster is a list of { seat, character }');
  if (!PLAYER_COUNTS.includes(roster.length)) throw new Error(`boarding: a match of ${roster.length} players; 7, 8 or 9 board`);
  const members = roster.map(m => ({ seat: m.seat, character: m.character }));
  for (const m of members) {
    if (!Number.isInteger(m.seat) || m.seat < 1 || m.seat > 9) throw new Error(`boarding: seat ${m.seat} is not a player number`);
    if (!Object.hasOwn(CREW, m.character ?? '')) throw new Error(`boarding: no crew character ${m.character}`);
  }
  if (new Set(members.map(m => m.seat)).size !== members.length) throw new Error('boarding: a seat appears twice');
  return Object.freeze(members.sort((a, b) => a.seat - b.seat).map(m => Object.freeze(m)));
}

/**
 * Review-only synthetic rosters, one for each match size (never a runtime asset): every crew
 * character appears across them, in mixed order, so the reviews show every look.
 */
export const REVIEW_ROSTERS = Object.freeze({
  7: publicRoster(['c3', 'c7', 'c1', 'c9', 'c5', 'c2', 'c8'].map((character, i) => ({ seat: i + 1, character }))),
  8: publicRoster(['c2', 'c4', 'c6', 'c8', 'c1', 'c3', 'c5', 'c9'].map((character, i) => ({ seat: i + 1, character }))),
  9: publicRoster(['c5', 'c1', 'c9', 'c3', 'c7', 'c2', 'c6', 'c4', 'c8'].map((character, i) => ({ seat: i + 1, character }))),
});

/** A review roster of n players (7, 8 or 9; 9 otherwise). */
export const reviewRoster = n => REVIEW_ROSTERS[n] ?? REVIEW_ROSTERS[9];

/** A roster from the stage's crew=c3,c1,... (the characters in seat order, seats from 1). */
export const rosterFromCrew = crew => publicRoster(String(crew).split(',').map((character, i) => ({ seat: i + 1, character: character.trim() })));
