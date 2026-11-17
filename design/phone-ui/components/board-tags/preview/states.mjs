// mothership:dev-only
//
// The board tags' preview states, on the pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs:
// invented names, seats and roles, as the review sheets use). Each state is a board as the pack's own paintBoard
// draws it (design/phone-ui/prototype/screens.mjs), standing in for Frontend's Board V2: sheet 26's three board
// frames, and the states sheet 26 leaves out that item 34 is about: the most people a room holds, the longest
// names a player can type (twelve characters), Injured and Out, both offices, "You" in a crowd, and the Talk
// capsule with two seated. The component draws the tags; the pack draws everything else.

import { SELF, board } from '../../../prototype/fixtures.mjs';

/** Twelve characters is the longest name a player can type (fixtures.mjs ROSTER: "1–12 characters"). */
const LONG = 'WWWWWWWWWWWW';
const OFFICES = Object.freeze({ captain: 2, officer: 3 });

/** The move frame's empty positions (screens-game.mjs MOVE_SLOTS). */
const MOVE_SLOTS = { 'room-a': { ids: ['A5'] }, 'room-b': { ids: ['B4', 'B5'] } };
/** The targets frame: the Doctor's Rescue reaches Room A's people and, in the Hospital, Eli (screens-game.mjs board()). */
const RESCUE_REACH = [1, 4, 7, 9, 5];

const seatsWith = ({ place = {}, health = {}, names = {} } = {}) => board({ roster: 9, place, health }).map(s => (names[s.seat] ? { ...s, name: names[s.seat] } : s));

export const BOARD_STATES = Object.freeze({
  // ── Sheet 26's frames ─────────────────────────────────────────────
  board: { caption: 'Sheet 26 · the board', frame: 'board', scene: { kind: 'board', room: 'room-a', active: 7 } },
  move: { caption: 'Sheet 26 · Move: empty positions', frame: 'board&state=move', scene: { kind: 'board', room: 'room-a', active: 7, slotsByRoom: MOVE_SLOTS } },
  targets: { caption: 'Sheet 26 · targets in another room (the rest dimmed)', frame: 'board&state=targets',
    scene: { kind: 'board', room: 'room-a', active: 7, targets: RESCUE_REACH, dimOthers: true } },
  // ── The states item 34 is about ───────────────────────────────────
  'crowd-ab': {
    caption: 'Five in Room A, four in Room B: long names, both offices, Out, "You" in the crowd',
    scene: { kind: 'board', room: 'room-a', active: 7, offices: OFFICES,
      seats: seatsWith({
        place: { 1: ['Room A', 'A1'], 2: ['Room A', 'A2'], 3: ['Room A', 'A3'], 4: ['Room A', 'A4'], 5: ['Room A', 'A5'],
          6: ['Room B', 'B1'], 7: ['Room B', 'B2'], 8: ['Room B', 'B3', 'Eliminated'], 9: ['Room B', 'B4'] },
        names: { 1: LONG, 3: 'Maximiliana', 6: LONG, 7: 'Bartholomew', 9: 'Gwendolynne' } }) },
  },
  'crowd-hj': {
    caption: 'Four in the Hospital, five in the Jail: long names, Injured and Out, "You" in the Jail',
    scene: { kind: 'board', room: 'jail', active: 1, offices: OFFICES,
      seats: seatsWith({
        place: { 1: ['Hospital', 'H1', 'Injured'], 2: ['Hospital', 'H2', 'Injured'], 3: ['Hospital', 'H3', 'Injured'], 5: ['Hospital', 'H4', 'Injured'],
          4: ['Jail', 'J1'], 6: ['Jail', 'J2'], 7: ['Jail', 'J3', 'Eliminated'], 8: ['Jail', 'J4'], 9: ['Jail', 'J5'] },
        names: { 1: LONG, 2: 'Bartholomew', 6: LONG, 8: 'Gwendolynne', 9: 'Maximiliana' } }) },
  },
  talk: {
    caption: 'The Talk capsule, two seated',
    scene: { kind: 'board', room: 'room-a', active: 7, talk: [1, SELF] },
  },
  concealed: { caption: 'Concealed: no name in the page', scene: { kind: 'board', room: 'room-a', active: 7 }, status: 'concealed' },
});

/** The sizes each state is captured at (the Lead's Q2): 390 and 430 at Standard, Large and Largest; 320 at Standard. */
export const CAPTURES = Object.freeze([
  ...['390x844', '430x932'].flatMap(size => ['board', 'crowd-ab', 'crowd-hj'].flatMap(state => [100, 150, 200].map(text => ({ state, size, text })))),
  ...['move', 'targets', 'talk'].flatMap(state => ['390x844', '430x932'].map(size => ({ state, size, text: 100 }))),
  ...['board', 'crowd-ab', 'crowd-hj'].map(state => ({ state, size: '320x568', text: 100 })),
  { state: 'concealed', size: '390x844', text: 100 },
]);

/** The pack's frames compared with the pack, at Standard (sheet 26 is drawn at 390 × 844; 320 and 430 are the narrowest and widest panels). */
export const PACK_FRAMES = Object.freeze([
  { state: 'board', size: '390x844' }, { state: 'move', size: '390x844' }, { state: 'targets', size: '390x844' },
  { state: 'board', size: '320x568' }, { state: 'board', size: '430x932' }, { state: 'talk', size: '390x844' },
]);
