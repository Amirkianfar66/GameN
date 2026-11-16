// mothership:dev-only
//
// The Roles list preview's states: the phone pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs:
// invented names, seats and roles, as the review sheets use; the reveal as the pack's end screen draws it), a
// labelled synthetic end phase and clock, and what each state gives the shell, the end scene and the list. No
// document is needed to read them (the repository test checks each state is a valid input).

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { END_BEATS, endSceneKind } from '../../end-scene/end-scene.mjs';
import { FIXTURE_LABEL, ROSTER, SELF } from '../../../prototype/fixtures.mjs';

export { FIXTURE_LABEL };
/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});

/** A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew. */
export const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });

// A synthetic end phase, as the server publishes it, and Round 6, as sheet 44 draws it.
export const EPOCH = Date.UTC(2026, 10, 15, 12, 0, 0);
export const WINDOW = Object.freeze({ id: 'synthetic-end-r6', startedAt: EPOCH });
export const ROUND = 6;
export const fixed = ms => Object.freeze({ now: () => EPOCH + ms });

/** The public results the preview shows, as the contract has them (PlanetResultSchema). */
export const RESULTS = Object.freeze({
  Blue: Object.freeze({ winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: false }),
  Red: Object.freeze({ winner: 'Red', reason: 'ARRIVAL', alienCoWinner: false }),
  alien: Object.freeze({ winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: true }),
  none: Object.freeze({ winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false }),
  aborted: Object.freeze({ winner: null, reason: 'ABORTED', alienCoWinner: false }),
});

/** The reveal as the pack's end screen draws it (screens-more.mjs end()): each seat's role and team, and the Code. */
const PACK_ROLES = Object.freeze([[1, 'Doctor', 'Blue'], [2, 'Insider', 'Blue'], [3, 'Blue Disabler', 'Blue'], [4, 'Supplier', 'Blue'], [5, 'Engineer', 'Blue'],
  [6, 'Undercover', 'Red'], [7, 'Hacker', 'Red'], [8, 'Red Disabler', 'Red'], [9, 'Alien', 'Alien']]);
export const REVEAL = Object.freeze({
  roles: Object.freeze(PACK_ROLES.map(([n, role]) => Object.freeze({ seatId: `seat-${n}`, role }))),
  code: Object.freeze(['seat-2', 'seat-5', 'seat-6', 'seat-9']),
});
/** Each seat's team, as Frontend takes it from the projection's faction data (here the pack's), never from the role. */
export const TEAMS = Object.freeze(Object.fromEntries(PACK_ROLES.map(([n, , team]) => [`seat-${n}`, team])));
export const ROLES_ROSTER = Object.freeze(ROSTER.map(p => Object.freeze({ seat: p.seat, name: p.name, character: p.character })));
export const VIEWER = `seat-${SELF}`;

/** When the list comes: with the scene's words (END_BEATS), as Frontend gives it. */
export const showAtFor = result => (endSceneKind(result) === 'arrival' ? END_BEATS.arrival.words : END_BEATS.none.words);

/**
 * Each state: its caption, the moment on the clock, and the shell's, the scene's and the list's inputs. `pack` names
 * the pack's own `end` screen it is drawn after (?s=end&winner=…), for the agreement.
 */
const reconnecting = Object.freeze({ status: 'stale', banner: Object.freeze({ kind: 'reconnecting' }) });
export const PREVIEW_STATES = Object.freeze({
  blue: { caption: 'Blue wins (sheet 44)', at: 6000, pack: 'Blue', result: RESULTS.Blue },
  red: { caption: 'Red wins (sheet 44)', at: 6000, pack: 'Red', result: RESULTS.Red },
  alien: { caption: 'Blue wins, the Alien too (the pack’s)', at: 6000, pack: 'alien', result: RESULTS.alien },
  none: { caption: 'No survivors (sheet 44)', at: 6000, pack: 'none', result: RESULTS.none },
  aborted: { caption: 'Match aborted · the button only (the pack’s)', at: 6000, pack: 'aborted', result: RESULTS.aborted, roles: { reveal: null, teams: null } },
  before: { caption: 'Before the words · 2.0 s, nothing yet', at: 2000, result: RESULTS.Red },
  reduced: { caption: 'The game’s Reduce motion · at once, with the fade', at: 1500, result: RESULTS.Red, shell: { reducedMotion: true }, scene: { reducedMotion: true }, roles: { reducedMotion: true } },
  stale: { caption: 'Reconnecting · as last seen; Return to lobby still works', at: 6000, result: RESULTS.Red, shell: reconnecting, scene: { status: 'stale' }, roles: { status: 'stale' } },
  staleEarly: { caption: 'Reconnecting before the words · waits with the scene', at: 2600, result: RESULTS.Red, shell: reconnecting, scene: { status: 'stale' }, roles: { status: 'stale' } },
  concealed: { caption: 'Concealed · nothing drawn', at: 6000, result: RESULTS.Red, shell: { status: 'concealed' }, scene: { status: 'concealed' }, roles: { status: 'concealed' } },
  noclock: { caption: 'No trusted clock · at once', at: 1500, result: RESULTS.Red, scene: { clock: null }, roles: { clock: null } },
  display: { caption: 'The shared display · no “(you)”, no button', at: 6000, result: RESULTS.Red, roles: { viewer: null } },
  noteams: { caption: 'No team data · no colour squares', at: 6000, result: RESULTS.Red, roles: { teams: null } },
});

/** One state's three inputs: the shell's, the scene's and the list's (without what the layout gives). */
export function inputsFor(stateKey, size, { clock = null } = {}) {
  const state = PREVIEW_STATES[stateKey];
  const c = clock ?? fixed(state.at);
  return {
    shell: { viewer: null, bar: null, tabs: null, edge: true, insets: size.insets, ...state.shell },
    scene: { window: WINDOW, clock: c, result: state.result, round: ROUND, ...state.scene },
    roles: { reveal: REVEAL, roster: ROLES_ROSTER, teams: TEAMS, window: WINDOW, clock: c, showAt: showAtFor(state.result), viewer: VIEWER, versions, ...state.roles },
  };
}
