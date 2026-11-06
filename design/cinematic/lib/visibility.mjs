// mothership:dev-only
//
// Gameplay visibility: what a film may cover, and when. The owner's review of 6 November 2026
// ("animations must not obscure selectable characters, room labels or controls during active
// decisions"), and the brief: "Keep selectable characters, room labels, slots, cards and timers as
// interactive layers"; "Room labels, timers, player targets and navigation stay stable and
// accessible during effects"; "No decorative animation pauses the engine, extends a phase or spends
// a decision window".
//
// Every film has two ways to be drawn:
//   board   in a room's art layer only: over the room's back picture, under its scene layers,
//           figures, name tags, room label and press areas, and under the bars. It covers nothing a
//           player selects or reads, so it may play in any phase.
//   cover   anything drawn over the board (a display cut, a comic page, a band). It may play only
//           while no decision is open: in a result stage (HACK_RESULT, VOTE_RESULT, five seconds
//           each) or at the end (FINISHED, ABORTED). In every other phase a covering film gives way
//           to its board treatment from its first frame; it never waits for, extends or takes time
//           from a phase. A presentation stage of its own (the Blackhole's R1) would be a new phase
//           and is not assumed.

/** Phases in which some seat has an open decision with a deadline (packages/contracts/src/planet-game.ts at 79418e7). */
export const DECISION_PHASES = Object.freeze([
  'OFFICER_APPOINTMENT', 'PRE_TURN', 'ORDINARY_TURN', 'HACK_DECLARE', 'HACK', 'JAIL_VOTE', 'CAPTAIN_ELECTION',
  'BLACKOUT', 'NAV_TIE', 'NAV_CAPTAIN_CONFIRM', 'NAV_OFFICER_CONFIRM',
]);

/** Phases in which nobody decides: a covering film may play here, inside the phase's own time. */
export const COVER_PHASES = Object.freeze(['HACK_RESULT', 'VOTE_RESULT', 'FINISHED', 'ABORTED']);

/** Whether a covering presentation may play while the view's phase is `phaseKind`. Unknown or missing kinds: no. */
export const mayCover = phaseKind => COVER_PHASES.includes(phaseKind);

/** The presentation to use in a phase: the cover where it may cover (and the film has one), else the board treatment. */
export const presentationIn = (phaseKind, { hasCover = true } = {}) => (hasCover && mayCover(phaseKind) ? 'cover' : 'board');

/** The z-index a board treatment's own layer takes in a room's art: over the back picture (0), under every scene layer and figure (2 x depth and up). */
export const ART_LAYER_Z = 1;
