// mothership:dev-only
//
// The phase bars beside the pack: each bar the pack draws for a game step, as the pack's own screen writes
// its input to ui.mjs topBar(), with the call that draws the same bar from ../phase-bars.mjs. The agreement
// (agree.mjs) draws both in one page and compares them, part by part; the test
// (packages/design-tokens/test/phase-bars.test.mjs) holds each pack input here to the pack's source.
//   source    the pack's file the bar is drawn in (design/phone-ui/prototype/)
//   literal   true: the pack writes this input as one literal, `topBar({ … })`, found there word for word;
//             false: the pack builds it from a screen's state, and each of its words is found there
//   text      200: compared at the Largest text on the small phone (320 × 568) as well

import { phaseBar, movedBar, loadingBar, reconnectingBar } from '../phase-bars.mjs';

/** Promises and ⋮ as a player's phone gives them: the pack's topBar() draws both on a bar with a round. */
const PLAYER = Object.freeze({ promises: Object.freeze({ count: 0 }), menu: Object.freeze({}) });

export const PHASE_CASES = Object.freeze([
  // Before turns: an Officer and no block yet (sheet 07); a block shown (sheet 21, "Officer's block shown"); the
  // Officer's own phone (sheet 40).
  { id: 'words-before', sheet: '07', source: 'screens-game.mjs', literal: true,
    pack: { kind: 'phase', icon: 'hourglass', title: 'Before turns', sub: 'Officer block · Blackhole', round: 3, seconds: 12 },
    bar: () => phaseBar({ phase: 'PRE_TURN', hasOfficer: true, round: 3, remainingMs: 12000, ...PLAYER }) },
  { id: 'words-before-start', sheet: '21', source: 'screens-more.mjs', literal: true,
    pack: { kind: 'phase', icon: 'hourglass', title: 'Before turns', sub: 'Turns start at 0:00', round: 3, seconds: 9 },
    bar: () => phaseBar({ phase: 'PRE_TURN', hasOfficer: true, blocked: true, round: 3, remainingMs: 9000, ...PLAYER }) },
  { id: 'words-block', sheet: '40', source: 'screens-more.mjs', literal: true,
    pack: { kind: 'phase', icon: 'officer', title: 'Block a move', sub: 'Before turns · Officer', round: 3, seconds: 11 },
    bar: () => phaseBar({ phase: 'PRE_TURN', own: true, hasOfficer: true, round: 3, remainingMs: 11000, ...PLAYER }) },
  // The Officer's appointment: everyone else (sheet 07), and the Captain's own phone (sheet 40).
  { id: 'words-appointment', sheet: '07', source: 'screens-game.mjs', literal: true,
    pack: { kind: 'phase', icon: 'officer', title: 'New Officer', sub: 'Ben chooses', round: 2, seconds: 24 },
    bar: () => phaseBar({ phase: 'OFFICER_APPOINTMENT', chooser: { name: 'Ben' }, round: 2, remainingMs: 24000, ...PLAYER }) },
  { id: 'words-appoint', sheet: '40', source: 'screens-more.mjs', literal: false, text: 200,
    pack: { kind: 'phase', icon: 'officer', title: 'Appoint Officer', sub: 'Random if time runs out', round: 2, seconds: 22 },
    bar: () => phaseBar({ phase: 'OFFICER_APPOINTMENT', own: true, round: 2, remainingMs: 22000, ...PLAYER }) },
  // The Blackout, lit and dark (sheets 07 and 30).
  { id: 'words-lit', sheet: '07', source: 'screens-game.mjs', literal: true,
    pack: { kind: 'phase', icon: 'lit', title: 'Blackout', sub: 'Lights out in 0:03', round: 3, seconds: 13 },
    bar: () => phaseBar({ phase: 'BLACKOUT', lightsOutMs: 3000, round: 3, remainingMs: 13000, ...PLAYER }) },
  { id: 'dark', sheet: '07', source: 'screens-game.mjs', literal: true,
    pack: { kind: 'phase', icon: 'dark', title: 'Blackout', sub: 'Dark · positions fixed', round: 3, seconds: 8, tone: 'dark' },
    bar: () => phaseBar({ phase: 'BLACKOUT', dark: true, round: 3, remainingMs: 8000, ...PLAYER }),
    tabs: { pack: { view: 'room', open: 'panels', hero: 'voted' }, shell: { view: 'room', open: 'panels', hero: { mode: 'voted' } } } },
  // The six seconds after a Sync: a ring, never amber, ⋮ and no Promises (sheet 07, and sheet 44 a second later).
  { id: 'words-synchronized', sheet: '07', source: 'screens-game.mjs', literal: true, text: 200,
    pack: { kind: 'phase', icon: 'blackhole', title: 'Ship synchronized', round: 4, seconds: 5, ring: 0.17, urgentAt: -1 },
    bar: () => phaseBar({ phase: 'BLACKHOLE_PRESENTATION', round: 4, remainingMs: 5000, durationMs: 6000, ...PLAYER }) },
  { id: 'words-synchronized-44', sheet: '44', source: 'screens-more.mjs', literal: false,
    pack: { kind: 'phase', icon: 'blackhole', title: 'Ship synchronized', round: 4, seconds: 4, ring: 1 / 3, urgentAt: -1 },
    bar: () => phaseBar({ phase: 'BLACKHOLE_PRESENTATION', round: 4, remainingMs: 4000, durationMs: 6000, ...PLAYER }) },
  // Navigation (sheet 41): everyone's neutral window, the Captain's and the Officer's own, and the ship moved.
  { id: 'words-course', sheet: '41', source: 'screens-more.mjs', literal: false,
    pack: { kind: 'phase', icon: 'course', title: 'Setting course', sub: 'The offices are setting it', round: 3, seconds: 11 },
    bar: () => phaseBar({ phase: 'NAV_SETTING', round: 3, remainingMs: 11000, ...PLAYER }) },
  { id: 'words-course-captain', sheet: '41', source: 'screens-more.mjs', literal: false,
    pack: { kind: 'phase', icon: 'course', title: 'Setting course', sub: 'Captain · private', round: 3, seconds: 13 },
    bar: () => phaseBar({ phase: 'NAV_CAPTAIN_CONFIRM', office: 'captain', round: 3, remainingMs: 13000, ...PLAYER }) },
  { id: 'words-course-officer', sheet: '41', source: 'screens-more.mjs', literal: false,
    pack: { kind: 'phase', icon: 'course', title: 'Setting course', sub: 'Officer · private', round: 3, seconds: 9 },
    bar: () => phaseBar({ phase: 'NAV_SETTING', office: 'officer', round: 3, remainingMs: 9000, ...PLAYER }) },
  { id: 'words-moved', sheet: '41', source: 'screens-more.mjs', literal: false,
    pack: { kind: 'phase', icon: 'course', title: 'The ship moved', sub: 'Round 3 complete', round: 3, seconds: null },
    bar: () => movedBar({ round: 3, ...PLAYER }) },
  // Loading, before the match: no round, so no Promises or ⋮ either; and reconnecting (sheets 45 and 07).
  { id: 'words-loading', sheet: '45', source: 'screens-more.mjs', literal: true,
    pack: { kind: 'phase', icon: 'hourglass', title: 'Loading the ship', sub: 'Room 3 of 5', seconds: null },
    bar: () => loadingBar({ index: 3, total: 5 }) },
  { id: 'words-reconnecting', sheet: '07', source: 'screens-game.mjs', literal: true,
    pack: { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, seconds: null },
    bar: () => reconnectingBar({ round: 3, ...PLAYER }) },
]);

/**
 * Sheet 07's one phase specimen the functions do not reproduce (the Lead's decision, 16 November 2026): its
 * Navigation bar puts "Round 3 complete" under "Setting course". Sheet 41 is the navigation screen's own sheet:
 * it draws "The offices are setting it" under that title, and "Round 3 complete" under "The ship moved".
 */
export const NOT_REPRODUCED = Object.freeze([
  { sheet: '07', source: 'screens-game.mjs', pack: { kind: 'phase', icon: 'course', title: 'Setting course', sub: 'Round 3 complete', round: 3, seconds: 11 } },
]);
