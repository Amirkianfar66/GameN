// mothership:dev-only
//
// The Y route as the owner-confirmed overlay states it
// (rules/overlays/planet-navigation-code-owner-decisions-2026-10-25.json, confirmed rules 5 to 8, 17
// and 18; owner decisions P11 and P13): Start, the common Junction, then three places on each arm,
// B1, B2, Blue Planet and R1, R2, Red Planet. Round 1 moves Start to Junction. Each later round makes
// exactly one movement: the same side advances one place; the other side moves to the same depth
// on the other arm (B1 to R1, R2 to B2), keeping progress; there is no backtracking toward the
// Junction. A planet ends the match.
//
// A presentation mirror of the rule, for the office panel only: the course arrow before a move and
// the name of a step after it. The server's privateNavigation.position stays the only authority on
// where the ship is; a step this module cannot name (a reconnect that skipped rounds) is drawn at
// rest, never guessed.

export const POSITIONS = Object.freeze(['Start', 'Junction', 'B1', 'B2', 'Blue Planet', 'R1', 'R2', 'Red Planet']);
export const DIRECTIONS = Object.freeze(['Blue', 'Red']);

const PLACE = Object.freeze({
  Start: Object.freeze({ arm: null, depth: -1 }),
  Junction: Object.freeze({ arm: null, depth: 0 }),
  B1: Object.freeze({ arm: 'Blue', depth: 1 }),
  B2: Object.freeze({ arm: 'Blue', depth: 2 }),
  'Blue Planet': Object.freeze({ arm: 'Blue', depth: 3 }),
  R1: Object.freeze({ arm: 'Red', depth: 1 }),
  R2: Object.freeze({ arm: 'Red', depth: 2 }),
  'Red Planet': Object.freeze({ arm: 'Red', depth: 3 }),
});

const known = position => {
  if (!Object.hasOwn(PLACE, position)) throw new Error(`Not a route position: ${position}`);
  return PLACE[position];
};

/** The arm a position is on ('Blue', 'Red', or null for Start and the Junction). */
export const armOf = position => known(position).arm;
/** Places after the Junction: -1 Start, 0 Junction, 1 and 2 on an arm, 3 a planet. */
export const depthOf = position => known(position).depth;
export const isPlanet = position => known(position).depth === 3;

/** The position on an arm at a depth: depth 0 is the Junction, 3 the arm's planet. */
export function placeAt(arm, depth) {
  if (!DIRECTIONS.includes(arm)) throw new Error(`Not an arm: ${arm}`);
  if (depth === 0) return 'Junction';
  if (depth === 3) return `${arm} Planet`;
  if (depth === 1 || depth === 2) return `${arm[0]}${depth}`;
  throw new Error(`Not a depth on the route: ${depth}`);
}

/**
 * The one movement a round makes from a position, as { to, kind }:
 *   start    Start to the Junction (Round 1, no direction)
 *   advance  one place along the direction's arm (from the Junction, onto it)
 *   switch   the same depth on the other arm
 *   arrive   the last advance, onto the direction's planet
 * null from a planet (the match has ended). Throws for a direction that is not Blue or Red.
 */
export function step(position, direction) {
  const { arm, depth } = known(position);
  if (position === 'Start') return Object.freeze({ to: 'Junction', kind: 'start' });
  if (depth === 3) return null;
  if (!DIRECTIONS.includes(direction)) throw new Error(`Not a direction: ${direction}`);
  if (arm === null || arm === direction) {
    const to = placeAt(direction, depth + 1);
    return Object.freeze({ to, kind: depth + 1 === 3 ? 'arrive' : 'advance' });
  }
  return Object.freeze({ to: placeAt(direction, depth), kind: 'switch' });
}

/**
 * The name of a movement already made, from where the ship was to where it is now: the step kind
 * and the direction that made it, or null when no single movement joins them (the client missed a
 * round, or the two are the same place). The panel animates only a step it can name.
 */
export function classify(from, to) {
  if (from === to) return null;
  if (from === 'Start') return to === 'Junction' ? Object.freeze({ kind: 'start', direction: null }) : null;
  for (const direction of DIRECTIONS) {
    const made = step(from, direction);
    if (made && made.to === to) return Object.freeze({ kind: made.kind, direction });
  }
  return null;
}

/** Every movement the rule allows, once each: the course overlays the panel can draw. */
export const MOVES = Object.freeze(POSITIONS.filter(p => p !== 'Start' && !isPlanet(p))
  .flatMap(from => DIRECTIONS.map(direction => ({ from, direction, ...step(from, direction) })))
  .map(move => Object.freeze(move)));
