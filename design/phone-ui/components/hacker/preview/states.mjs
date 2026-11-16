// mothership:dev-only
//
// The Hacker preview's states: one per frame the phone pack draws for Scan and the final Code (sheet 42's five, and
// the three more its own scan() and code() draw: no match, the pick step and a wrong Code), and the states the pack
// leaves out (no guess yet, sending, not accepted, "In the Code · No", no round blocked, fewer than four picks, a
// seat not offered, an eight-player match, reconnecting, concealed, the larger text), on the pack's synthetic
// fixtures (design/phone-ui/prototype/fixtures.mjs: invented names, seats and roles, as the review sheets use).
// Each state gives the shell's input, the room scene's own, and the component's input as
// docs/design/components/hacker.md proposes it. What the server and Frontend hold (the offers, the results, the
// guess and the picks) is written out here as fixture data, standing in for them.

import { ROOM_FIXTURES, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';
import { codeSheet, scanBar, scanSheet } from '../hacker.mjs';

const seats = board({ place: ROOM_FIXTURES['room-a'].place });
/** A person as the parts take them: the seat as the projection names it. */
const who = n => { const p = seatOf(n); return { seat: `seat-${n}`, name: p.name, character: p.character }; };
const everyone = seats.map(s => s.seat).sort((a, b) => a - b);
const people = everyone.map(who);
// The pack's scan() rings Room A's four (screens-more.mjs: targets [1, 4, 7, 9]), the SCAN offer's targetSeatIds here.
const SCAN_TARGETS = [1, 4, 7, 9];
// The pack's code() picks, in its order.
const PICKS = [2, 5, 6, 8];

const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
/** The pack's turn bar (screens.mjs turnBar()): whose turn, the round and the clock. */
const turnBar = (active, seconds, round = 3) => ({ kind: 'turn', who: person(active), self: active === SELF, round, timer: { remainingMs: seconds * 1000 }, promises: { count: 0 }, menu: {} });
const tabs = ({ own = true } = {}) => ({ variant: 'game', view: 'room', open: null, hero: { mode: 'pass', enabled: own } });

/** A state: the shell's input, the room scene's own (active, targets), and the part with its input. */
const state = (caption, sheet, { shell, scene = {}, part = null }) => ({ caption, sheet, shell: { viewer: `seat-${SELF}`, ...shell }, scene, part });
const GUS = 7;
const guessState = (caption, sheetNo, { guess = 'Blue', phase = 'ready', error = null, seconds = 34 } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(SELF, seconds), tabs: tabs(), sheet: scanSheet({ step: 'guess', guess, phase }) },
  scene: { active: SELF, targets: { seats: [GUS], picked: [GUS] } },
  part: { kind: 'guess', input: { target: who(GUS), guess, phase, error } },
});
const resultState = (caption, sheetNo, result) => state(caption, sheetNo, {
  shell: { bar: turnBar(SELF, 34), tabs: tabs(), sheet: scanSheet({ step: 'result' }) },
  scene: { active: SELF, targets: { seats: [GUS], picked: [GUS] } },
  part: { kind: 'result', input: { target: who(GUS), ...result } },
});
const codeState = (caption, sheetNo, { step = 'confirm', picks = PICKS, phase = 'ready', offered = everyone, error = null, list = people } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(7, 28), tabs: tabs({ own: false }), sheet: codeSheet({ step, count: picks.length, phase }) },
  scene: { active: 7 },
  part: { kind: 'code', input: { people: list, picks: picks.map(n => `seat-${n}`), step, phase, offered: offered.map(n => `seat-${n}`), error } },
});
const outcomeState = (caption, sheetNo, correct) => state(caption, sheetNo, {
  shell: { bar: turnBar(7, 28), tabs: tabs({ own: false }), sheet: codeSheet({ step: 'result' }) },
  scene: { active: 7 },
  part: { kind: 'outcome', input: { correct } },
});

/** Every state, by key: its caption, the sheet it comes from, and its inputs. */
export const HACKER_STATES = Object.freeze({
  // Sheet 42.
  'scan-choose': state('Scan · choose', '42', {
    shell: { bar: turnBar(SELF, 40), tabs: tabs(), target: scanBar() },
    scene: { active: SELF, targets: { seats: SCAN_TARGETS, picked: [] } },
  }),
  'scan-guess': guessState('Scan · guess', '42'),
  'scan-matched': resultState('Scan · matched', '42', { guess: 'Blue', matched: true, inCode: true }),
  'code-confirm': codeState('Code · four players', '42'),
  'code-correct': outcomeState('Code · correct', '42', true),
  // The pack's own scan() and code() states that sheet 42 leaves out.
  'scan-nomatch': resultState('Scan · no match', '42 (pack)', { guess: 'Red', matched: false, blockedRound: 4 }),
  'code-pick': codeState('Code · pick', '42 (pack)', { step: 'pick' }),
  'code-wrong': outcomeState('Code · wrong', '42 (pack)', false),
  // What the pack does not draw.
  'scan-no-guess': guessState('Scan · no guess yet: Scan off', '42+', { guess: null }),
  'scan-sending': guessState('Scan · sending: “Scanning…” (Q3)', '42+', { phase: 'sending' }),
  'scan-error': guessState('Scan · not accepted (L6)', '42+', { error: { text: 'The server did not accept the scan.', detail: 'Check the player, then scan again.' } }),
  'scan-not-in-code': resultState('Scan · matched, not in the Code (Q2)', '42+', { guess: 'Blue', matched: true, inCode: false }),
  'scan-nomatch-free': resultState('Scan · no match, no round blocked', '42+', { guess: 'Alien', matched: false, blockedRound: null }),
  'code-two': codeState('Code · two picked: Next off', '42+', { step: 'pick', picks: [2, 5] }),
  'code-sending': codeState('Code · sending: “Submitting…” (Q3)', '42+', { phase: 'sending' }),
  'code-error': codeState('Code · not accepted (L6)', '42+', { error: { text: 'The server did not accept the Code.', detail: 'Check your four, then submit again.' } }),
  'code-not-offered': codeState('Code · seats not offered: “Not available now” (T3)', '42+', { step: 'pick', picks: [2, 5], offered: everyone.filter(n => ![3, 9].includes(n)) }),
  'code-eight': codeState('Code · an eight-player match', '42+', { step: 'pick', picks: [2, 5, 6], offered: everyone.filter(n => n !== 9), list: people.filter(p => p.seat !== 'seat-9') }),
  stale: { ...guessState('Reconnecting · as last seen, no taps', '45+'), status: 'stale' },
  concealed: { ...guessState('Concealed · nothing drawn', '—'), status: 'concealed' },
  // The smallest phone and the larger text (sheets 50, 53 and 56-like).
  'small-code': { ...codeState('320 × 568 · the 3 × 3', '50-like', { step: 'pick' }), sizes: ['320x568'] },
  'large-guess': { ...guessState('Large text (150 %) · the guess', '53-like'), sizes: ['390x844'], text: 150 },
  'largest-guess': { ...guessState('Largest text (200 %) · the guess', '56-like'), sizes: ['320x568'], text: 200 },
  'largest-result': { ...resultState('Largest text · no match', '56-like', { guess: 'Red', matched: false, blockedRound: 4 }), sizes: ['320x568'], text: 200 },
  'largest-code': { ...codeState('Largest text · the Code as a list of whole names', '56-like', { step: 'pick' }), sizes: ['320x568'], text: 200 },
  'largest-outcome': { ...outcomeState('Largest text · Code correct', '56-like', true), sizes: ['320x568'], text: 200 },
});

/** The pack's frame each state is compared with (screens-more.mjs scan() and code()). */
export const PACK_FRAMES = Object.freeze({
  'scan-choose': { frame: 'scan&state=target' },
  'scan-guess': { frame: 'scan&state=guess' },
  'scan-matched': { frame: 'scan&state=result' },
  'scan-nomatch': { frame: 'scan&state=wrong' },
  'code-pick': { frame: 'code&state=pick' },
  'code-confirm': { frame: 'code&state=confirm' },
  'code-correct': { frame: 'code&state=correct' },
  'code-wrong': { frame: 'code&state=wrong' },
});
