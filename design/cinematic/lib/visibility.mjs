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
//           from a phase.
//
// One film has a stage of its own (owner decision P27, 6 November 2026): "after actual Blackhole
// Sync, there is a separate six-second presentation stage. The full 60-second Jail vote starts
// afterward." Only the Blackhole's stage cut plays there, and the Blackhole covers in no other
// phase. No other stage exists. In particular no covering EJECT stage is approved, so the EJECT's
// display cut is a review study that nothing mounts (NO_RUNTIME_COVER).
//
// Missing contract field: the protocol 3 candidate (packages/contracts/src/planet-game.ts at
// 79418e7) has no phase kind for P27's stage yet (request R16; Backend names it). Until a view
// carries one, presentationIn() never answers 'stage', and the Blackhole plays its board treatment
// at the Jail vote's start: the safe fallback, which covers nothing and takes no time.

/** Phases in which some seat has an open decision with a deadline (packages/contracts/src/planet-game.ts at 79418e7). */
export const DECISION_PHASES = Object.freeze([
  'OFFICER_APPOINTMENT', 'PRE_TURN', 'ORDINARY_TURN', 'HACK_DECLARE', 'HACK', 'JAIL_VOTE', 'CAPTAIN_ELECTION',
  'BLACKOUT', 'NAV_TIE', 'NAV_CAPTAIN_CONFIRM', 'NAV_OFFICER_CONFIRM',
]);

/** Phases in which nobody decides: a covering film may play here, inside the phase's own time. */
export const COVER_PHASES = Object.freeze(['HACK_RESULT', 'VOTE_RESULT', 'FINISHED', 'ABORTED']);

/**
 * The presentation stages the owner approved, each for one film only. surfaces are the surfaces that
 * mount the stage's covering cut (the Blackhole's is the shared display's: phones play the board
 * treatment from the stage's start). kind is the phase kind a view carries during the stage: null
 * until Backend publishes it (R16). proposedKind is the name the request suggests; it is never matched.
 */
export const PRESENTATION_STAGES = Object.freeze({
  blackhole: Object.freeze({
    decision: 'P27',
    after: 'an actual Blackhole Sync (event BLACKHOLE_SYNCED)',
    durationMs: 6000,
    then: 'JAIL_VOTE, its full 60 s',
    surfaces: Object.freeze(['display']),
    kind: null,
    proposedKind: 'BLACKHOLE_PRESENTATION',
  }),
});

/** Films with no covering form in the game: their covering renders are review studies, never mounted. */
export const NO_RUNTIME_COVER = Object.freeze(['eject']);

/** Whether a covering presentation may play while the view's phase is `phaseKind`. Unknown or missing kinds: no. */
export const mayCover = phaseKind => COVER_PHASES.includes(phaseKind);

/** The phase kind of a film's own stage: the one passed (Backend's name, once published), else the table's (null until then). */
export function stageKindOf(film, stageKind = undefined) {
  const stage = PRESENTATION_STAGES[film] ?? null;
  if (!stage) return null;
  return typeof stageKind === 'string' && stageKind ? stageKind : stage.kind;
}

/**
 * The presentation to use in a phase:
 *   'stage'  the film's own approved stage (P27: the Blackhole only), when the view's phase is that stage's kind, on that stage's surfaces
 *   'cover'  a phase where nobody decides, for a film with a covering form and no stage of its own
 *   'board'  everything else: the board treatment, from its first frame
 * Options: hasCover (the film has a covering form), film (its scene id: 'blackhole', 'eject', ...),
 * stageKind (the stage's phase kind as Backend publishes it; missing until R16 is answered), surface
 * ('display' or 'phone': a stage answers 'stage' only on one of its surfaces, so a phone, or a call
 * that names no surface, gets 'board').
 */
export function presentationIn(phaseKind, { hasCover = true, film = null, stageKind = undefined, surface = null } = {}) {
  if (!hasCover || NO_RUNTIME_COVER.includes(film)) return 'board';
  if (film && PRESENTATION_STAGES[film]) {
    const kind = stageKindOf(film, stageKind);
    return kind !== null && phaseKind === kind && PRESENTATION_STAGES[film].surfaces.includes(surface) ? 'stage' : 'board';
  }
  return mayCover(phaseKind) ? 'cover' : 'board';
}

/** The z-index a board treatment's own layer takes in a room's art: over the back picture (0), under every scene layer and figure (2 x depth and up). */
export const ART_LAYER_Z = 1;
