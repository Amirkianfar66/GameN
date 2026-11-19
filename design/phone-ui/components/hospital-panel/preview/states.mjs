// mothership:dev-only
//
// The Hospital panel preview's states: one per frame the phone pack draws for the panel (sheets 23 and 43: enter,
// a number entered, registered, wrong number, unavailable, attempt used), and the states the pack leaves out, as
// the Lead answered them on 16 November (sending, not accepted, TREATED, NO EFFECT, DISCARDED, the 7- and
// 8-player keypads, reconnecting, concealed, the smallest phone and the larger text), on the pack's synthetic
// fixtures (design/phone-ui/prototype/fixtures.mjs: invented names, seats and roles, as the review sheets use).
// The patient is Player 4 (Dev), Injured in the Hospital, on Gus's turn, as the pack's panel() draws it. Each
// state gives the shell's input, the room scene's own, and the component's input as
// docs/design/components/hospital-panel.md has it. What the server and Frontend hold (the offer's keys, the
// record, the pick) is written out here as fixture data, standing in for them.

import { SELF, seatOf } from '../../../prototype/fixtures.mjs';
import { panelSheet } from '../hospital-panel.mjs';

/** Whose turn the pack's panel() shows: Gus, Player 7, 25 seconds left (screens-more.mjs). */
const ACTIVE = 7, SECONDS = 25;
/** The PANEL_CODE offer's keys: every original player's number, seat-1…seat-N (the contract's own check). */
export const keysFor = players => Array.from({ length: players }, (_, i) => ({ seat: `seat-${i + 1}`, number: i + 1 }));
/** The pack's picked number on sheet 23 ("Submit 3"). */
const PICKED = 'seat-3';

const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
/** The pack's turn bar (screens.mjs turnBar()): whose turn, the round and the clock. */
const turnBar = (active, seconds, round = 3) => ({ kind: 'turn', who: person(active), self: active === SELF, round, timer: { remainingMs: seconds * 1000 }, promises: { count: 0 }, menu: {} });
/** The pack's tabs on another's turn: Pass off (hero: 'pass-off'). */
const tabs = () => ({ variant: 'game', view: 'room', open: null, hero: { mode: 'pass', enabled: false } });

/** A state: the shell's input, the room scene's own, and the part with its input. */
const state = (caption, sheet, { shell, scene = {}, part = null }) => ({ caption, sheet, shell: { viewer: `seat-${SELF}`, ...shell }, scene, part });
const keypadState = (caption, sheetNo, { picked = null, phase = 'ready', error = null, players = 9 } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(ACTIVE, SECONDS), tabs: tabs(), sheet: panelSheet({ step: 'keypad', picked: picked === null ? null : Number(picked.slice(5)), phase }) },
  scene: { roster: players },
  part: { kind: 'keypad', input: { keys: keysFor(players), picked, phase, error } },
});
const statusState = (caption, sheetNo, result) => state(caption, sheetNo, {
  shell: { bar: turnBar(ACTIVE, SECONDS), tabs: tabs(), sheet: panelSheet({ step: 'status' }) },
  part: { kind: 'status', input: { result } },
});

/** Every state, by key: its caption, the sheet it comes from, and its inputs. */
export const PANEL_STATES = Object.freeze({
  // Sheets 23 and 43.
  enter: keypadState('Enter', '23, 43'),
  entered: keypadState('Number entered · “Submit 3”', '23', { picked: PICKED }),
  queued: statusState('Request registered', '23, 43', 'QUEUED'),
  wrong: statusState('Wrong number', '43', 'WRONG'),
  unavailable: statusState('Unavailable · the same words whatever the reason', '43', 'unavailable'),
  spent: statusState('Attempt used', '43', 'spent'),
  // What the pack does not draw, as the Lead answered it (16 November).
  sending: keypadState('Sending · “Submitting…”, the keys refused (Q1)', '43+', { picked: PICKED, phase: 'sending' }),
  rejected: keypadState('Not accepted · the keypad stays, with the kit’s note (Q2)', '43+', { picked: PICKED, error: { text: 'The server did not accept it.', detail: 'Nothing was queued. Submit again.' } }),
  treated: statusState('TREATED (Q4)', '43+', 'TREATED'),
  'no-effect': statusState('NO EFFECT (Q4)', '43+', 'NO_EFFECT'),
  discarded: statusState('DISCARDED (Q4)', '43+', 'DISCARDED'),
  eight: keypadState('An eight-player match · 9’s place empty (Q5)', '43+', { players: 8 }),
  seven: keypadState('A seven-player match · 8’s and 9’s places empty (Q5)', '43+', { players: 7, picked: 'seat-7' }),
  stale: { ...keypadState('Reconnecting · as last seen, no taps', '45+', { picked: PICKED }), status: 'stale' },
  concealed: { ...keypadState('Concealed · nothing drawn', '—', { picked: PICKED }), status: 'concealed' },
  // The smallest phone and the larger text (sheets 50, 53 and 56-like; the Lead's Q6).
  'small-enter': { ...keypadState('320 × 568 · the keypad', '50-like'), sizes: ['320x568'] },
  'large-entered': { ...keypadState('Large text (150 %) · a number entered', '53-like', { picked: PICKED }), sizes: ['390x844'], text: 150 },
  'largest-entered': { ...keypadState('Largest text (200 %) · the 3 × 3 stays, the display grows (Q6)', '56-like', { picked: PICKED }), sizes: ['320x568'], text: 200 },
  'largest-status': { ...statusState('Largest text · registered', '56-like', 'QUEUED'), sizes: ['320x568'], text: 200 },
});

/** The pack's frame each state is compared with (screens-more.mjs panel()). */
export const PACK_FRAMES = Object.freeze({
  enter: { frame: 'panel&state=enter' },
  entered: { frame: 'panel&state=entered' },
  queued: { frame: 'panel&state=queued' },
  wrong: { frame: 'panel&state=wrong' },
  unavailable: { frame: 'panel&state=unavailable' },
  spent: { frame: 'panel&state=spent' },
});
