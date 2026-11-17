// mothership:dev-only
//
// The Actions preview's states: one per frame the phone pack draws for Actions (sheets 28, 27.2, 27.3, 29,
// 29.1, 29.2, 45, and the Actions frames of 50 and 53), and the states the pack leaves out (T3's "Not available
// now", Supply's two players, not accepted, accepted after a reload, Hack Ship's check, reconnecting,
// concealed, the Largest text), on the pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs:
// invented names, seats and roles, as the review sheets use). Each state gives the shell's input, the room
// scene's targets, and the component's own input as docs/design/components/actions.md proposes it. What the
// server and Frontend hold (the offers, the reasons, the state lines, the facts, After Register's words) is
// written out here as fixture data, standing in for them: the pack's words, and After Register's from the
// pack's own afterRegister() (screens-game.mjs), as Frontend's copy has them.

import { ROOM_FIXTURES, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';
import { afterRegister } from '../../../prototype/screens-game.mjs';
import { ACTION_WORDS, actionsSheet, afterSheet, checkSheet, moveBar, moveChip, movedToast, passSheet, passedToast, targetBar, targetChip, targetListSheet, unknownSheet } from '../actions.mjs';

const ROOM = 'Room A';
const seats = board({ place: ROOM_FIXTURES['room-a'].place });
const at = n => seats.find(s => s.seat === n);
/** The empty positions of a room, as the MOVE offer would list them (the fixture's Room A has one, A5; Room B, B4 and B5). */
const emptyIn = (room, ids) => ids.filter(id => !seats.some(s => s.location === room && s.slot === id));
const EMPTY_A = emptyIn(ROOM, ['A1', 'A2', 'A3', 'A4', 'A5']);
const EMPTY_B = emptyIn('Room B', ['B1', 'B2', 'B3', 'B4', 'B5']);
/** Whose turn follows the viewer's (the pack's NEXT_SEAT, screens-game.mjs room(): Eli). */
const NEXT_SEAT = 5;
/** A person as the check and the list take them: the seat as the projection names it, and where the public board has them. */
const who = n => { const p = seatOf(n), s = at(n); return { seat: `seat-${n}`, name: p.name, character: p.character, room: s.location, health: s.health }; };
const inRoomA = seats.filter(s => s.location === ROOM).map(s => s.seat);

// ── The tiles each role's phone shows (screens-game.mjs roleTiles(), Round 3) ─────────
const T = (type, state, line, extra = {}) => ({ type, state, ...(state === 'unavailable' || state === 'spent' ? { reason: line } : { note: line }), ...extra });
const MOVE = T('MOVE', 'available', 'Once a round');
const TALK = T('REQUEST_HACK', 'available', 'Once a match');
const SHOOT = T('REGISTER_SHOT', 'unavailable', 'From Round 4');
const WAIT = 'On your turn';
const TILES = {
  doctor: [T('RESCUE', 'available', '2 injections', { badge: 2 }), MOVE, TALK, SHOOT],
  hacker: [T('SCAN', 'available', 'Your room'), T('SUBMIT_CODE', 'available', 'One attempt'), T('ACTIVATE_SHIP_HACK', 'unavailable', 'Needs the Code'), MOVE, TALK, SHOOT],
  undercoverOther: [T('PROTECT', 'unavailable', WAIT), MOVE, T('REQUEST_HACK', 'unavailable', WAIT), SHOOT],
  doctorOther: [T('RESCUE', 'unavailable', WAIT, { badge: 2 }), MOVE, T('REQUEST_HACK', 'unavailable', WAIT), SHOOT],
  // Private talk once used is spent (kit 0.7.1), as the pack draws it.
  spent: [T('RESCUE', 'registered', 'Eli · end of round', { badge: 2 }), MOVE, T('REQUEST_HACK', 'spent', 'Used'), SHOOT],
  // T3: the server gives no reason (B1), so each tile it does not offer says "Not available now".
  t3: [T('RESCUE', 'available', '2 injections', { badge: 2 }), MOVE, T('REQUEST_HACK', 'unavailable', null), T('REGISTER_SHOT', 'unavailable', null)],
  sending: [T('RESCUE', 'sending', '2 injections', { badge: 2 }), MOVE, TALK, SHOOT],
  // Q3: no empty position anywhere, so the server offers no MOVE and gives no reason: "Not available now", and no bar.
  moveNone: [T('RESCUE', 'available', '2 injections', { badge: 2 }), T('MOVE', 'unavailable', null), TALK, SHOOT],
};
const OTHER_NOTE = 'Move works on any turn, once a round. The rest wait for your turn.';

// ── The check's facts (screens-game.mjs actions() ACT), as Frontend's copy would pass them (B7) ──
const FACTS = {
  RESCUE: ['Uses 1 of 2 shared injections', 'Resolved at the end of the round, after the attacks', 'Does not revive an eliminated player'],
  PROTECT: ['Resolved at the end of the round, active from the next', 'A player can be protected once a match'],
  REQUEST_HACK: ['Once a match', 'Starts after this turn: up to 15 s to declare, 5 s result, then 60 s'],
  SUPPLY: ['Choose two players', 'Each gets one weapon at the end of the round'],
  REGISTER_SHOT: ['Uses 1 weapon', 'Resolved at the end of the round', 'Protection and Clone are checked then'],
  REQUEST_BLACKOUT: ['Once a match', 'Registered now · the lights go out later this round', 'You will choose a position while it is dark'],
  ENGINEER_SUPPRESS: ['Once a match', 'Captures who is in Room B right now', 'Only their navigation weight, this round'],
  ACTIVATE_CLONE: ['Once a match', 'Active as soon as the server accepts it', 'Lasts through next round’s attacks'],
  // Not drawn by the pack (L7): its lines would be Frontend's copy; one stands in.
  ACTIVATE_SHIP_HACK: ['Once a match', 'Needs the Code'],
  // Move's check (the Lead's Q1): the prototype's picked words, "Uses this round’s move", as Frontend's fact; the
  // room is the check's own line under "Move to A5".
  MOVE: ['Uses this round’s move'],
};
const ACT = { RESCUE: 'rescue', PROTECT: 'protect', SUPPLY: 'supply', REGISTER_SHOT: 'shoot', REQUEST_HACK: 'talk', REQUEST_BLACKOUT: 'blackout', ENGINEER_SUPPRESS: 'suppress', ACTIVATE_CLONE: 'clone' };

/** After Register's input from the pack's own words for the action (Frontend's en.ts, the handoff's drafts). */
function after(type, target) {
  const A = afterRegister(ACT[type], target ? seatOf(Number(target.seat.slice(5))) : null, 'room-a');
  const kind = { REGISTERED: 'registered', ACCEPTED: 'accepted', ACTIVE: 'active', CAPTURED: 'captured' }[A.stamp];
  return { type, kind, title: A.title, detail: A.detail,
    people: A.people ? A.people.map(p => ({ seat: `seat-${p.seat}`, name: p.name, character: p.character, sub: `Player ${p.seat} · in Room B when accepted` })) : null,
    steps: A.steps.map(([state, title, sub]) => ({ state, title, sub })) };
}

const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
/** The pack's turn bar (screens.mjs turnBar()): whose turn, the round and the clock. */
const turnBar = (active, seconds, round = 3) => ({ kind: 'turn', who: person(active), self: active === SELF, round, timer: { remainingMs: seconds * 1000 }, promises: { count: 0 }, menu: {} });
const tabs = ({ own = true, open = null, view = 'room' } = {}) => ({ variant: 'game', view, open, hero: { mode: 'pass', enabled: own } });

/** A state: the shell's input, the room scene's own (active, targets), and the part with its input. */
const state = (caption, sheet, { shell, scene = {}, part = null }) => ({ caption, sheet, shell: { viewer: `seat-${SELF}`, ...shell }, scene, part });
const tilesState = (caption, sheetNo, role, list, { own = true, note = null, active = own ? SELF : 7, extra = {} } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(active, 42), tabs: tabs({ own, open: 'actions' }), sheet: actionsSheet({ role, room: ROOM }) },
  scene: { active },
  part: { kind: 'tiles', input: { turn: own ? 'own' : 'other', round: 3, tiles: list, note, ...extra } },
});
const checkState = (caption, sheetNo, type, targets, { phase = 'ready', seconds = 31, error = null, canRegister = true } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(SELF, seconds), tabs: tabs(), sheet: checkSheet({ type, phase, canRegister }) },
  // The picked people ringed, when in this room (screens-game.mjs: targets and picked).
  scene: { active: SELF, targets: targets.length && targets.every(t => t.room === ROOM) ? { seats: targets.map(t => Number(t.seat.slice(5))), picked: targets.map(t => Number(t.seat.slice(5))) } : null },
  part: { kind: 'check', input: { type, targets, facts: FACTS[type], error } },
});
const afterState = (caption, sheetNo, type, target, { seconds = 29, round = 3, input = null } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(SELF, seconds, round), tabs: tabs(), sheet: afterSheet({ type }) },
  scene: { active: SELF },
  part: { kind: 'after', input: input ?? after(type, target) },
});
/**
 * Choosing where to move (sheets 20, 26 and 27.1): the shell's bar and chip from moveBar() and moveChip(), and the
 * offered positions on the room scene. On the board the stage is the board's drawing (#298's), not drawn here.
 */
const moveState = (caption, sheetNo, { where = 'room', here = true, elsewhere = true, seconds = 42 } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(SELF, seconds), tabs: tabs({ view: where }), target: moveBar({ where, room: ROOM, here, elsewhere }), chip: where === 'room' ? moveChip({ elsewhere }) : null },
  scene: where === 'board' ? { none: true } : { active: SELF, targets: here ? { slots: EMPTY_A, picked: null, icon: 'move' } : null },
});
/** Move's check (the Lead's Q1 and Q4): the position picked stays marked under it, in this room. */
const moveCheckState = (caption, sheetNo, position, { phase = 'ready', error = null, board = false } = {}) => state(caption, sheetNo, {
  shell: { bar: turnBar(SELF, 31), tabs: tabs({ view: board ? 'board' : 'room' }), sheet: checkSheet({ type: 'MOVE', phase }) },
  scene: board ? { none: true } : { active: SELF, targets: { slots: [position.slot], picked: position.slot, icon: 'move' } },
  part: { kind: 'check', input: { type: 'MOVE', position, facts: FACTS.MOVE, error } },
});
const MOVE_A = { slot: EMPTY_A[0], room: ROOM };
const MOVE_B = { slot: EMPTY_B[0], room: 'Room B' };

/** Every state, by key: its caption, the sheet it comes from, and its inputs. */
export const ACTIONS_STATES = Object.freeze({
  // Sheet 28.
  'tiles-doctor': tilesState('Doctor · your turn', '28', 'Doctor', TILES.doctor),
  'tiles-hacker': tilesState('Hacker · your turn', '28', 'Hacker', TILES.hacker),
  'tiles-undercover-other': tilesState('Undercover · not your turn', '28', 'Undercover', TILES.undercoverOther, { own: false, note: OTHER_NOTE }),
  'tiles-spent': tilesState('Registered and spent', '28', 'Doctor', TILES.spent),
  // Sheet 27.2's last frame.
  'tiles-doctor-other': tilesState('Actions on another player’s turn', '27.2', 'Doctor', TILES.doctorOther, { own: false, note: OTHER_NOTE }),
  // Sheet 29: choosing in the room, the list, the check, registering, registered.
  targeting: state('Choose in the scene', '29', {
    shell: { bar: turnBar(SELF, 36), tabs: tabs(), target: targetBar({ type: 'RESCUE', where: 'room' }), chip: targetChip({ kind: 'other-rooms', count: 1 }) },
    scene: { active: SELF, targets: { seats: inRoomA, picked: [] } },
  }),
  list: state('The same choice as a list', '29', {
    shell: { bar: turnBar(SELF, 33), tabs: tabs(), sheet: targetListSheet({ type: 'RESCUE' }) },
    scene: { active: SELF, targets: { seats: inRoomA, picked: [] } },
    part: { kind: 'list', input: { type: 'RESCUE', groups: [{ room: ROOM, people: inRoomA.map(n => ({ ...who(n), you: n === SELF })) }, { room: 'Hospital', people: [who(5)] }], picked: [] } },
  }),
  check: checkState('Check and register', '29', 'RESCUE', [who(5)]),
  'check-ava': checkState('Check · tap Register', '27.2', 'RESCUE', [who(1)]),
  sending: checkState('Registering', '29', 'RESCUE', [who(5)], { phase: 'sending' }),
  'after-rescue': afterState('Registered · Rescue', '29.1', 'RESCUE', who(5)),
  'after-rescue-ava': afterState('Registered (27.2)', '27.2', 'RESCUE', who(1)),
  'after-protect': afterState('Protection · active next round', '29.1', 'PROTECT', who(7)),
  'after-supply': afterState('Supply', '29.1', 'SUPPLY', null),
  'after-shot': afterState('Shot · Round 4', '29.1', 'REGISTER_SHOT', who(7), { round: 4 }),
  'after-blackout': afterState('Blackout', '29.1', 'REQUEST_BLACKOUT', null),
  'after-talk': afterState('Private talk · after this turn', '29.2', 'REQUEST_HACK', who(1)),
  'after-clone': afterState('Clone · active now', '29.2', 'ACTIVATE_CLONE', null),
  'after-suppress': afterState('Engineer · captured now', '29.2', 'ENGINEER_SUPPRESS', null),
  // An action without a person goes from its tile to the check (the pack's confirm for each).
  'check-blackout': checkState('Blackout · the check', '27.2+', 'REQUEST_BLACKOUT', []),
  'check-clone': checkState('Clone · the check', '27.2+', 'ACTIVATE_CLONE', []),
  'check-suppress': checkState('Suppress navigation · the check', '27.2+', 'ENGINEER_SUPPRESS', []),
  // Sheet 45's "Outcome unknown".
  unknown: state('Outcome unknown', '45', {
    shell: { bar: turnBar(SELF, 19), tabs: tabs({ own: false }), sheet: unknownSheet({ type: 'RESCUE' }) },
    scene: { active: SELF },
    part: { kind: 'unknown', input: { type: 'RESCUE', targets: [who(5)] } },
  }),
  // Sheet 27.3's check before Pass.
  pass: state('Pass asks once', '27.3', {
    shell: { bar: turnBar(SELF, 42), tabs: tabs(), sheet: passSheet({ next: { seat: 'seat-5', name: seatOf(5).name } }) },
    scene: { active: SELF },
    part: { kind: 'pass', input: { note: 'Your move stays open on the other turns this round.' } },
  }),
  // What the pack does not draw as its own frame.
  'tiles-t3': tilesState('Not offered, no reason given · “Not available now” (T3)', '28+', 'Doctor', TILES.t3),
  'tiles-sending': tilesState('A tile while its command is with the server', '28+', 'Doctor', TILES.sending),
  'targeting-supply': state('Supply · the second player (L4)', '29+', {
    shell: { bar: turnBar(SELF, 36), tabs: tabs(), target: targetBar({ type: 'SUPPLY', where: 'room', picked: ['seat-1'] }), chip: targetChip({ kind: 'other-rooms', count: 1 }) },
    scene: { active: SELF, targets: { seats: inRoomA, picked: [1] } },
  }),
  'list-supply': state('Supply · the list, the first pick marked (L4)', '29+', {
    shell: { bar: turnBar(SELF, 33), tabs: tabs(), sheet: targetListSheet({ type: 'SUPPLY' }) },
    scene: { active: SELF, targets: { seats: inRoomA, picked: [1] } },
    part: { kind: 'list', input: { type: 'SUPPLY', groups: [{ room: ROOM, people: inRoomA.map(n => ({ ...who(n), you: n === SELF })) }, { room: 'Hospital', people: [who(5)] }], picked: ['seat-1'] } },
  }),
  'check-supply': checkState('Supply · both players (L4)', '29+', 'SUPPLY', [who(1), who(7)]),
  'check-shiphack': checkState('Hack Ship · the check (L7)', '27.2+', 'ACTIVATE_SHIP_HACK', []),
  'check-error': checkState('Not accepted · Register again while offered (L6)', '29+', 'RESCUE', [who(5)],
    { error: { text: 'The server did not accept Rescue.', detail: 'Check the target, then register again.' } }),
  'after-reload': afterState('Accepted, after a reload (L6)', '29+', 'RESCUE', null,
    { input: { type: 'RESCUE', kind: 'registered', title: 'The server accepted your action.', detail: 'This is not a result. Registered actions are resolved at the end of the round.', people: null, steps: [] } }),
  'unknown-blackout': state('Outcome unknown · no person', '45+', {
    shell: { bar: turnBar(SELF, 19), tabs: tabs({ own: false }), sheet: unknownSheet({ type: 'REQUEST_BLACKOUT' }) },
    scene: { active: SELF },
    part: { kind: 'unknown', input: { type: 'REQUEST_BLACKOUT', targets: [] } },
  }),
  // The Hospital panel's request (the Lead's Q3, 16 November): its sheet 45, with no number.
  'unknown-panel': state('Outcome unknown · the Hospital panel, no number (Q3)', '45+', {
    shell: { bar: turnBar(SELF, 19), tabs: tabs({ own: false }), sheet: unknownSheet({ type: 'PANEL_CODE' }) },
    scene: { active: SELF },
    part: { kind: 'unknown', input: { type: 'PANEL_CODE', targets: [] } },
  }),
  // Move (sheets 20, 26 and 27.1), and the steps the pack leaves undrawn, as the Lead answered them (Q1–Q4).
  'move-room': moveState('Move within the room · the bar and the chip', '20'),
  'move-board': moveState('Move · choose a position on the Board (the bar: the board is #298’s)', '26', { where: 'board', seconds: 38 }),
  'move-room-only': moveState('Positions only in this room · no chip (Q3)', '20+', { elsewhere: false }),
  'move-room-full': moveState('This room full, positions elsewhere · “choose one on the Board” (Q3)', '20+', { here: false }),
  'tiles-move-none': tilesState('No position anywhere · Move not available, no bar (Q3)', '28+', 'Doctor', TILES.moveNone),
  'move-check': moveCheckState(`A position picked · the check, “${ACTION_WORDS.moveTo(MOVE_A.slot)}” (Q1)`, '20+', MOVE_A),
  'move-check-board': moveCheckState(`From the Board · the same check, “${ACTION_WORDS.moveTo(MOVE_B.slot)}” (Q4)`, '26+', MOVE_B, { board: true }),
  'move-sending': moveCheckState('Move · registering', '20+', MOVE_A, { phase: 'sending' }),
  'move-error': moveCheckState('Move not accepted · the inline note (L6)', '20+', MOVE_A,
    { error: { text: 'The server did not accept the move.', detail: 'Choose a position again.' } }),
  'move-unknown': state('Move · outcome unknown', '45+', {
    shell: { bar: turnBar(SELF, 19), tabs: tabs(), sheet: unknownSheet({ type: 'MOVE' }) },
    scene: { active: SELF },
    part: { kind: 'unknown', input: { type: 'MOVE', position: MOVE_A } },
  }),
  'move-moved': state(`Moved · “Moved to ${MOVE_A.slot}”, this phone’s toast (Q2)`, '20+', {
    shell: { bar: turnBar(SELF, 30), tabs: tabs(), toast: movedToast({ slot: MOVE_A.slot, id: 'move-1' }) },
    // The viewer now stands at the position, which everyone sees (the room scene's people, from the board).
    scene: { active: SELF, moved: { seat: SELF, slot: MOVE_A.slot } },
  }),
  // Sheet 27.3's third frame: the turn has moved on, and this phone says so.
  passed: state('The turn moves on · “Turn passed”', '27.3', {
    shell: { bar: turnBar(NEXT_SEAT, 60), tabs: tabs({ own: false }), toast: passedToast({ id: 'pass-1' }) },
    scene: { active: NEXT_SEAT },
  }),
  'move-stale': { ...moveState('Reconnecting while choosing · Cancel still works, no position taps', '45+'), status: 'stale' },
  stale: { ...tilesState('Reconnecting · as last seen, no taps', '45+', 'Doctor', TILES.doctor), status: 'stale' },
  concealed: { ...tilesState('Concealed · nothing drawn', '—', 'Doctor', TILES.doctor), status: 'concealed' },
  // Text size and the smallest phone (sheets 50 and 53; the Lead's L3 for the Largest text).
  'small-tiles': { ...tilesState('320 × 568 · three to a row', '50', 'Doctor', TILES.doctor), sizes: ['320x568'] },
  'large-tiles': { ...tilesState('Large text (150 %) · three to a row, the words wrap', '53', 'Doctor', TILES.doctor), sizes: ['390x844'], text: 150 },
  'largest-tiles': { ...tilesState('Largest text (200 %) · one per row (L3)', '56-like', 'Doctor', TILES.spent), sizes: ['320x568'], text: 200 },
  'largest-check': { ...checkState('Largest text · the check', '56-like', 'RESCUE', [who(5)]), sizes: ['320x568'], text: 200 },
  'largest-after': { ...afterState('Largest text · registered', '56-like', 'RESCUE', who(5)), sizes: ['320x568'], text: 200 },
  'largest-move': { ...moveState('Largest text · Move within the room', '56-like'), sizes: ['320x568'], text: 200 },
  'largest-move-check': { ...moveCheckState('Largest text · Move’s check', '56-like', MOVE_A), sizes: ['320x568'], text: 200 },
});

/** The pack's frame each state is compared with (sheets/catalog.mjs), where the pack draws it, and its size and text. */
export const PACK_FRAMES = Object.freeze({
  'tiles-doctor': { frame: 'actions&role=Doctor&active=4' },
  'tiles-hacker': { frame: 'actions&role=Hacker&active=4' },
  'tiles-undercover-other': { frame: 'actions&role=Undercover&active=7' },
  'tiles-spent': { frame: 'actions&role=Doctor&active=4&state=spent' },
  'tiles-doctor-other': { frame: 'actions&role=Doctor&active=7' },
  targeting: { frame: 'actions&role=Doctor&active=4&state=targeting&act=rescue' },
  list: { frame: 'actions&role=Doctor&active=4&state=offroom&act=rescue' },
  check: { frame: 'actions&role=Doctor&active=4&state=confirm&act=rescue&target=5' },
  'check-ava': { frame: 'actions&role=Doctor&active=4&state=confirm&act=rescue&target=1' },
  sending: { frame: 'actions&role=Doctor&active=4&state=submitting&act=rescue&target=5' },
  'after-rescue': { frame: 'actions&role=Doctor&active=4&state=registered&act=rescue&target=5' },
  'after-rescue-ava': { frame: 'actions&role=Doctor&active=4&state=registered&act=rescue&target=1' },
  'after-protect': { frame: 'actions&role=Undercover&active=4&state=registered&act=protect&target=7' },
  'after-supply': { frame: 'actions&role=Supplier&active=4&state=registered&act=supply' },
  'after-shot': { frame: 'actions&role=Undercover&active=4&state=registered&act=shoot&target=7' },
  'after-blackout': { frame: 'actions&role=Blue Disabler&active=4&state=registered&act=blackout' },
  'after-talk': { frame: 'actions&role=Doctor&active=4&state=registered&act=talk&target=1' },
  'after-clone': { frame: 'actions&role=Alien&active=4&state=registered&act=clone' },
  'after-suppress': { frame: 'actions&role=Engineer&active=4&state=registered&act=suppress' },
  'check-blackout': { frame: 'actions&role=Blue Disabler&active=4&state=confirm&act=blackout' },
  'check-clone': { frame: 'actions&role=Alien&active=4&state=confirm&act=clone' },
  'check-suppress': { frame: 'actions&role=Engineer&active=4&state=confirm&act=suppress' },
  unknown: { frame: 'system&state=unknown' },
  pass: { frame: 'room&room=room-a&state=pass' },
  'small-tiles': { frame: 'actions&role=Doctor&active=4', size: '320x568' },
  'large-tiles': { frame: 'actions&role=Doctor&active=4', text: 150 },
  // Move: sheet 20's bar and chip, the board's bar (26 and 27.1); and 27.3's "Turn passed".
  'move-room': { frame: 'room&room=room-a&state=move' },
  'move-board': { frame: 'board&state=move' },
  // The pack's room shows its own control here ("Window · Hospital"): the room scene's (#261), compared in its own
  // agreement, not this component's chip.
  passed: { frame: 'room&room=room-a&state=passed', roomControl: true },
});
