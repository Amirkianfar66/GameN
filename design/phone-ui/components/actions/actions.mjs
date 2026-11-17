// Actions: the phone's Actions during a match, as the phone pack draws them (sheets 27.2, 27.3, 28, 29, 29.1
// and 29.2, the Actions frames of 50 and 53, and 45's "Outcome unknown"; #222 items 9–13, with the owner's T2
// and T3). Runtime source, Designer's (the owner, 14 and 15 November 2026: Designer builds each visual
// component once, in design/; the game and the preview use it as it is; and 16 November: Designer builds each
// part once the Lead approves its interface). The interface is docs/design/components/actions.md.
//
// How Frontend uses it: each step is the phone shell's docked sheet, whose frame and footer the helpers here
// give (actionsSheet(), targetListSheet(), checkSheet(), afterSheet(), unknownSheet(), passSheet()), and a part
// mounted in the shell's sheetBody for it:
//   - mountActions(): "Your turn · Round 3" and every action of the viewer's role as a tile (sheet 28);
//   - mountTargetList(): "Choose from a list", room by room (29);
//   - mountActionCheck(): the person, both people or the action, its facts, and why it was not accepted (27.2, 29);
//   - mountAfterRegister(): the action's own state once the server accepts it (29, 29.1, 29.2);
//   - mountOutcomeUnknown(): sheet 45's "Outcome unknown";
//   - mountPassNote(): Pass's line (27.3).
// The words of the shell's target bar, chip and toast are targetBar(), targetChip() and registeredToast(). The
// room scene draws the people offered; the board, those in other rooms. Move chooses a position, not a person
// (sheets 20, 26 and 27.1; the Lead's Q1–Q4, 16 November): its bar and chip are moveBar() and moveChip(), its
// check is the same check with the position, and once accepted it says movedToast(). Pass's is passedToast().
// The Disabler's position during a Blackout (sheet 30; the owner's decision of 16 November, d7ab5220, gives it
// to Actions, beside Move) is blackoutBar(): "Choose a position", then "Position A3 fixed".
// The Hospital panel's request (PANEL_CODE) is the Hospital panel component's (design/phone-ui/components/
// hospital-panel; the Lead's Q3, 16 November): Actions draws only its sheet 45, "Panel request was sent, but no
// answer came back.", which names no number, and every other part refuses it, naming that component.
//
// What it never does: decide which actions a role has or which are offered, why one is not, who can be
// chosen, what an action costs or does, or whether it was accepted. Every state, line, reason, person, fact
// and step is Frontend's, from the projection; a tap only reports intent. Everything here is this viewer's
// own: concealed, or for a new viewer, it is dropped and removed from the page.

import { createControlPolicy, createKit, seatNumber } from '../kit/kit.mjs';
import { TILE_STATES, createPlayParts } from '../play-parts/play-parts.mjs';

export const ACTIONS_VERSION = 'actions-0.2.2';
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const TURNS = Object.freeze(['own', 'other']);
const AFTER_KINDS = Object.freeze(['registered', 'accepted', 'active', 'captured']);

/**
 * Each command's look and words: its icon, its tile's short name, its title (the target bar, After Register's
 * sheet), the check's verb, the Register button and its words while sending, the noun the toast names, and
 * how many people it takes (none, one or two; `null` for the actions whose choosing is not this component's).
 * Move takes no person but a position (moveBar(), the check's `position`). The pack's (screens-game.mjs
 * roleTiles() and actions()), and Frontend's labels where the pack draws none.
 */
const look = (icon, tile, title, verb, register, sending, noun, people) => Object.freeze({ icon, tile, title, verb, register, sending, noun, people });
export const ACTION_LOOKS = Object.freeze({
  RESCUE: look('rescue', 'Rescue', 'Rescue', 'Rescue', 'Register Rescue', 'Registering…', 'Rescue', 1),
  PROTECT: look('protect', 'Protect', 'Grant Protection', 'Protect', 'Register Protection', 'Registering…', 'Protection', 1),
  SUPPLY: look('supply', 'Supply', 'Supply', 'Supply', 'Register Supply', 'Registering…', 'Supply', 2),
  REGISTER_SHOT: look('shoot', 'Shoot', 'Shoot', 'Shoot', 'Register shot', 'Registering…', 'Shot', 1),
  REQUEST_HACK: look('talk', 'Private talk', 'Private talk', 'Talk with', 'Request private talk', 'Requesting…', 'Private talk', 1),
  REQUEST_BLACKOUT: look('blackout', 'Blackout', 'Blackout', 'Request Blackout', 'Request Blackout', 'Registering…', 'Blackout', 0),
  ENGINEER_SUPPRESS: look('suppress', 'Suppress', 'Suppress navigation', 'Suppress navigation', 'Suppress navigation', 'Registering…', 'Navigation', 0),
  ACTIVATE_CLONE: look('clone', 'Clone', 'Clone', 'Activate Clone', 'Activate Clone', 'Activating…', 'Clone', 0),
  ACTIVATE_SHIP_HACK: look('shipHack', 'Hack Ship', 'Hack Spaceship', 'Hack Spaceship', 'Hack Spaceship', 'Registering…', 'Hack Spaceship', 0),
  ACTIVATE_BLACKHOLE: look('blackhole', 'Blackhole', 'Blackhole', 'Activate Blackhole', 'Activate Blackhole', 'Activating…', 'Blackhole', 0),
  // Its check (Q1): "Move to A3", and Register in the form of the others' ("Register shot").
  MOVE: look('move', 'Move', 'Move', 'Move to', 'Register move', 'Registering…', 'Move', 0),
  SCAN: look('scan', 'Scan', 'Scan', null, null, null, 'Scan', null),
  SUBMIT_CODE: look('code', 'Final Code', 'Final Code', null, null, null, 'Final Code', null),
  // The Hospital panel's request (the Lead's Q3): sheet 45 alone is Actions', as "Panel request". It takes no one,
  // so "Outcome unknown" can never name the number the patient entered.
  PANEL_CODE: look('panel', 'Hospital panel', 'Hospital panel', 'Panel request', null, null, 'Panel request', 0),
});

/** The pack's words (screens-game.mjs actions(), room() and screens-more.mjs system()). */
export const ACTION_WORDS = Object.freeze({
  yourTurn: 'Your turn', notYourTurn: 'Not your turn', round: n => `Round ${n}`,
  tilesLabel: 'Your actions', notAvailable: 'Not available now',
  actions: 'Actions', actionsSub: (role, room) => [role, room].filter(Boolean).join(' · ') || null,
  list: 'Choose from a list', listSub: title => `${title} · everyone you can reach`, listButton: 'List',
  you: name => `${name} (you)`, player: n => `Player ${n}`, players: (a, b) => `Players ${a} and ${b}`, picked: 'Picked',
  check: 'Check and register', onlyYou: 'Only you see this', yourself: 'yourself', and: (a, b) => `${a} and ${b}`,
  cancel: 'Cancel', done: 'Done',
  choosePlayer: 'Choose a player', chooseTwo: 'Choose two players', chooseSecond: 'Choose the second player', everyRoom: sub => `${sub} · every room`,
  otherRooms: n => `Other rooms · ${n}`,
  stamps: Object.freeze({ registered: 'REGISTERED', accepted: 'ACCEPTED', active: 'ACTIVE', captured: 'CAPTURED' }),
  toast: Object.freeze({ registered: noun => `${noun} registered`, accepted: noun => `${noun} accepted`, active: noun => `${noun} active`, captured: () => 'Navigation suppressed' }),
  unknown: 'Outcome unknown', retrySame: 'Retry the same', checkReceipt: 'Check receipt',
  noAnswer: what => `${what} was sent, but no answer came back.`, checkFirst: 'Check before doing anything else.',
  passTitle: 'Pass your turn?', passNext: (name, n) => `The turn goes to ${name} · Player ${n}`, pass: 'Pass', passed: 'Turn passed',
  stale: 'Controls return when the match is current',
  // Move (screens-game.mjs room() and board(); the Lead's Q2 and Q3 for the steps the pack leaves undrawn).
  moveWithin: room => `Move within ${room}`, moveTo: slot => `Move to ${slot}`, moved: slot => `Moved to ${slot}`,
  moveChoose: 'Choose an empty position', moveOrBoard: 'Choose an empty position · or another room on the Board',
  moveBoard: 'Choose an empty position · uses this round’s move', moveFull: room => `No empty position in ${room} · choose one on the Board`,
  moveChip: 'Other rooms on the Board',
  // The Disabler's position during a Blackout (screens-more.mjs blackout(), sheet 30).
  positionChoose: 'Choose a position', positionAny: room => `${room} · any position, even empty`,
  positionFixed: slot => `Position ${slot} fixed`, positionLater: 'Resolves after the window · no effect shown now',
});

/** After Register's stamp for each kind: its words, its tone (an outline while it waits), and whether it waits. */
const STAMPS = Object.freeze({
  registered: Object.freeze({ tone: 'pending', kind: 'waits' }), accepted: Object.freeze({ tone: 'pending', kind: 'waits' }),
  active: Object.freeze({ tone: 'amber', kind: 'now' }), captured: Object.freeze({ tone: 'steel', kind: 'now' }),
});

const isText = value => typeof value === 'string' && value.length > 0;
const optionalText = (value, what) => {
  if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${what} is text, or null`);
  return value === '' ? null : value ?? null;
};
/** A seat as the projection names it ('seat-1' … 'seat-9'), or its number. */
const isSeat = id => (Number.isSafeInteger(id) && id >= 1 && id <= 9) || (typeof id === 'string' && /^seat-[1-9]$/.test(id));
const seatOf = id => seatNumber({ seat: id });
const lookOf = (type, what = 'type') => {
  if (!Object.hasOwn(ACTION_LOOKS, type)) throw new TypeError(`${what} is one of ${Object.keys(ACTION_LOOKS).join(', ')}, not ${JSON.stringify(type)}`);
  return ACTION_LOOKS[type];
};
/**
 * The Hospital panel's request is the Hospital panel component's (the Lead's Q3, 16 November): its keypad, its
 * Submit and its records are drawn there, once. Every part here but sheet 45 refuses it, and says where it is.
 */
function notPanel(type, what) {
  if (type === 'PANEL_CODE') throw new TypeError(`PANEL_CODE ${what} the Hospital panel component's (design/phone-ui/components/hospital-panel); Actions draws only its "Outcome unknown"`);
}

// ── Inputs ──────────────────────────────────────────────────────────────
const COMMON = Object.freeze({ viewer: null, status: 'live', interactive: true, reducedMotion: false, versions: null });
function checkCommon(next) {
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  next.interactive = next.interactive !== false;
  next.reducedMotion = !!next.reducedMotion;
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is a seat, or null');
  // The seat's number, so a viewer given as 'seat-4' or 4 is the same viewer.
  next.viewer = next.viewer === null || next.viewer === undefined ? null : seatOf(next.viewer);
}
function person(p, what, { room = false } = {}) {
  if (!p || !isSeat(p.seat) || !isText(p.name)) throw new TypeError(`${what} is { seat, name, character${room ? ', room' : ''} }`);
  return Object.freeze({ seat: seatOf(p.seat), name: p.name, character: p.character ?? null, ...(room ? { room: optionalText(p.room, `${what}.room`) } : {}) });
}
function checkTargets(list, type, what = 'targets') {
  if (!Array.isArray(list)) throw new TypeError(`${what} is a list of people`);
  const wanted = type ? lookOf(type).people : null;
  const out = list.map((p, i) => person(p, `${what}[${i}]`, { room: true }));
  if (wanted !== null && type && out.length > wanted) throw new TypeError(`${type} takes ${wanted === 0 ? 'no one' : wanted === 1 ? 'one person' : 'two people'}`);
  return Object.freeze(out);
}
function checkLines(list, what) {
  if (!Array.isArray(list) || !list.every(isText)) throw new TypeError(`${what} are lines of text`);
  return Object.freeze([...list]);
}
/** Move's position (the Lead's Q1 and Q4): its label, as the bar and the toast say it ("A3"), and its room. Move's alone. */
function checkPosition(value, type) {
  const given = value !== null && value !== undefined;
  if (type !== 'MOVE') {
    if (given) throw new TypeError('position is Move\'s alone: { slot, room }');
    return null;
  }
  if (!given || !isText(value.slot)) throw new TypeError('Move needs its position: { slot, room }');
  return Object.freeze({ slot: value.slot, room: optionalText(value.room, 'position.room') });
}

/** A part's inputs: its defaults, which of them are this viewer's own, and its check. */
function part(defaults, viewerKeys, check) {
  const known = new Set(Object.keys(defaults));
  const normalize = input => {
    for (const key of Object.keys(input)) if (!known.has(key)) throw new TypeError(`Unknown input ${JSON.stringify(key)}`);
    const next = { ...defaults, ...input };
    checkCommon(next);
    return Object.freeze(check(next));
  };
  /** Each key an update gives replaces that key; this viewer's own are dropped while concealed, and for a new viewer unless given. */
  const merge = (previous, input) => {
    for (const key of Object.keys(input)) if (!known.has(key)) throw new TypeError(`Unknown input ${JSON.stringify(key)}`);
    const merged = { ...previous, ...input };
    const viewerChanged = 'viewer' in input && previous.viewer !== (input.viewer === null || input.viewer === undefined ? null : seatOf(input.viewer));
    if ((merged.status ?? 'live') === 'concealed') for (const key of viewerKeys) merged[key] = defaults[key];
    else if (viewerChanged) for (const key of viewerKeys) if (!(key in input)) merged[key] = defaults[key];
    return normalize(merged);
  };
  return { normalize, merge };
}

/** The tiles' inputs (sheet 28). */
export const ACTIONS_DEFAULTS = Object.freeze({ ...COMMON, turn: 'own', round: null, tiles: Object.freeze([]), note: null });
function checkTiles(list) {
  if (!Array.isArray(list)) throw new TypeError('tiles is a list of { type, state, note, reason, badge }');
  const seen = new Set();
  return Object.freeze(list.map((t, i) => {
    if (!t || typeof t !== 'object') throw new TypeError(`tiles[${i}] is { type, state, note, reason, badge }`);
    lookOf(t.type, `tiles[${i}].type`);
    notPanel(t.type, `is not an action tile (tiles[${i}]): the Hospital's own control and the Panels row open`);
    if (seen.has(t.type)) throw new TypeError(`tiles lists ${t.type} twice`);
    seen.add(t.type);
    const state = t.state ?? 'available';
    if (!TILE_STATES.includes(state)) throw new TypeError(`tiles[${i}].state is ${TILE_STATES.join(', ')}, not ${JSON.stringify(state)}`);
    const badge = t.badge ?? null;
    if (badge !== null && !(Number.isSafeInteger(badge) && badge >= 0)) throw new TypeError(`tiles[${i}].badge is a whole number, or null`);
    return Object.freeze({ type: t.type, state, note: optionalText(t.note, `tiles[${i}].note`), reason: optionalText(t.reason, `tiles[${i}].reason`), badge });
  }));
}
const TILES = part(ACTIONS_DEFAULTS, ['tiles', 'note'], next => {
  if (!TURNS.includes(next.turn)) throw new TypeError(`turn is own or other, not ${JSON.stringify(next.turn)}`);
  if (next.round !== null && next.round !== undefined && !(Number.isSafeInteger(next.round) && next.round >= 0)) throw new TypeError('round is a whole number, or null');
  return { ...next, round: next.round ?? null, tiles: checkTiles(next.tiles), note: optionalText(next.note, 'note') };
});
/** The tiles' input, checked and normalized: checking it again changes nothing. */
export const checkActions = input => TILES.normalize(input);
/** The next tiles input from the current one and an update, as update() merges it. */
export const nextActionsInput = (current, partial) => TILES.merge(current, partial);

/** The list's inputs (sheet 29). */
export const TARGET_LIST_DEFAULTS = Object.freeze({ ...COMMON, type: null, groups: Object.freeze([]), picked: Object.freeze([]) });
const LIST = part(TARGET_LIST_DEFAULTS, ['type', 'groups', 'picked'], next => {
  if (next.type !== null) lookOf(next.type);
  notPanel(next.type, 'has no list: its keypad is');
  if (!Array.isArray(next.groups)) throw new TypeError('groups is [{ room, people }]');
  const seen = new Set();
  const groups = next.groups.map((g, i) => {
    if (!g || !isText(g.room) || !Array.isArray(g.people)) throw new TypeError(`groups[${i}] is { room, people: [{ seat, name, character, health, you }] }`);
    return Object.freeze({ room: g.room, people: Object.freeze(g.people.map((p, j) => {
      const who = person(p, `groups[${i}].people[${j}]`);
      if (seen.has(who.seat)) throw new TypeError(`groups lists seat ${who.seat} twice`);
      seen.add(who.seat);
      // `id` is the seat as Frontend gave it, which a tap reports back.
      return Object.freeze({ ...who, id: p.seat, health: optionalText(p.health, `groups[${i}].people[${j}].health`), you: !!p.you });
    })) });
  });
  if (!Array.isArray(next.picked) || !next.picked.every(isSeat)) throw new TypeError('picked is a list of seats');
  return { ...next, groups: Object.freeze(groups), picked: Object.freeze(next.picked.map(seatOf)) };
});
export const checkTargetList = input => LIST.normalize(input);

/** The check's inputs (sheets 27.2 and 29; Move's position, Q1). */
export const ACTION_CHECK_DEFAULTS = Object.freeze({ ...COMMON, type: null, targets: Object.freeze([]), position: null, facts: Object.freeze([]), error: null });
const CHECK = part(ACTION_CHECK_DEFAULTS, ['type', 'targets', 'position', 'facts', 'error'], next => {
  if (next.type !== null) lookOf(next.type);
  notPanel(next.type, 'has no check: its keypad and Submit are');
  let error = next.error ?? null;
  if (error !== null) {
    if (!isText(error.text)) throw new TypeError('error is { text, detail }, or null');
    error = Object.freeze({ text: error.text, detail: optionalText(error.detail, 'error.detail') });
  }
  return { ...next, targets: checkTargets(next.targets, next.type), position: checkPosition(next.position, next.type), facts: checkLines(next.facts, 'facts'), error };
});
export const checkActionCheck = input => CHECK.normalize(input);

/** After Register's inputs (sheets 29, 29.1 and 29.2). */
export const AFTER_REGISTER_DEFAULTS = Object.freeze({ ...COMMON, type: null, kind: 'registered', title: null, detail: null, people: null, steps: Object.freeze([]) });
const AFTER = part(AFTER_REGISTER_DEFAULTS, ['type', 'kind', 'title', 'detail', 'people', 'steps'], next => {
  if (next.type !== null) lookOf(next.type);
  if (next.type === 'MOVE') throw new TypeError('A move has no After Register: it happens at once, and movedToast() says so (Q2)');
  notPanel(next.type, 'has no After Register: its records are');
  if (!AFTER_KINDS.includes(next.kind)) throw new TypeError(`kind is ${AFTER_KINDS.join(', ')}, not ${JSON.stringify(next.kind)}`);
  let people = next.people ?? null;
  if (people !== null) {
    if (!Array.isArray(people)) throw new TypeError('people is [{ seat, name, character, sub }], or null');
    people = Object.freeze(people.map((p, i) => Object.freeze({ ...person(p, `people[${i}]`), sub: optionalText(p.sub, `people[${i}].sub`) })));
  }
  if (!Array.isArray(next.steps)) throw new TypeError('steps is a list');
  const steps = next.steps.map((s, i) => {
    if (!s || !['done', 'next', 'later'].includes(s.state) || !isText(s.title)) throw new TypeError(`steps[${i}] is { state: done | next | later, title, sub }`);
    return Object.freeze({ state: s.state, title: s.title, sub: optionalText(s.sub, `steps[${i}].sub`) });
  });
  return { ...next, title: optionalText(next.title, 'title'), detail: optionalText(next.detail, 'detail'), people, steps: Object.freeze(steps) };
});
export const checkAfterRegister = input => AFTER.normalize(input);

/** "Outcome unknown"'s inputs (sheet 45). */
export const OUTCOME_UNKNOWN_DEFAULTS = Object.freeze({ ...COMMON, type: null, targets: Object.freeze([]), position: null });
const UNKNOWN = part(OUTCOME_UNKNOWN_DEFAULTS, ['type', 'targets', 'position'], next => {
  if (next.type !== null) lookOf(next.type);
  // "Panel request was sent, but no answer came back.": the patient's number is never in it (the Lead's Q3).
  if (next.type === 'PANEL_CODE' && Array.isArray(next.targets) && next.targets.length) throw new TypeError('PANEL_CODE\'s "Outcome unknown" names no number: it takes no targets');
  return { ...next, targets: checkTargets(next.targets, next.type), position: checkPosition(next.position, next.type) };
});
export const checkOutcomeUnknown = input => UNKNOWN.normalize(input);

/** Pass's line (sheet 27.3). */
export const PASS_NOTE_DEFAULTS = Object.freeze({ ...COMMON, note: null });
const PASS = part(PASS_NOTE_DEFAULTS, ['note'], next => ({ ...next, note: optionalText(next.note, 'note') }));
export const checkPassNote = input => PASS.normalize(input);

// ── Words from the inputs ───────────────────────────────────────────────
/** A person as the check names them: "yourself" for this viewer, else their name. */
const named = (p, viewer) => (viewer !== null && p.seat === viewer ? ACTION_WORDS.yourself : p.name);
/**
 * The check's head, the same for the check and "Outcome unknown": { title, sub, what } where `what` names the
 * action with its people ("Rescue Eli", "Supply Ava and Gus", "Request Blackout"), or a move with its position
 * and its room under it ("Move to A3", "Room A"), as a person's room is under them (Q1 and Q4).
 */
export function actionWords({ type, targets = [], viewer = null, position = null }) {
  const l = lookOf(type);
  if (type === 'MOVE') {
    if (!position || !isText(position.slot)) throw new TypeError('Move needs its position: { slot, room }');
    const what = ACTION_WORDS.moveTo(position.slot);
    return { title: what, sub: position.room ?? null, what };
  }
  const verb = l.verb ?? l.title;
  if (targets.length === 2) {
    const what = `${verb} ${ACTION_WORDS.and(named(targets[0], viewer), named(targets[1], viewer))}`;
    return { title: what, sub: ACTION_WORDS.players(targets[0].seat, targets[1].seat), what };
  }
  if (targets.length === 1) {
    const t = targets[0], what = `${verb} ${named(t, viewer)}`;
    return { title: what, sub: t.room ? `${ACTION_WORDS.player(t.seat)} · ${t.room}` : ACTION_WORDS.player(t.seat), what };
  }
  return { title: verb, sub: ACTION_WORDS.onlyYou, what: verb };
}
/**
 * A tile's state line: the note, or for one not offered, or used up (spent, kit 0.7.1), the server's reason or
 * "Not available now" (T3).
 */
export const tileLine = t => (t.state === 'unavailable' || t.state === 'spent' ? t.reason ?? ACTION_WORDS.notAvailable : t.note);

// ── The shell's frames and words ────────────────────────────────────────
/** The tiles' sheet: "Actions", the role and the room, Close. */
export function actionsSheet({ role = null, room = null } = {}) {
  return { id: 'actions', title: ACTION_WORDS.actions, sub: ACTION_WORDS.actionsSub(role, room), close: true };
}
/** The list's sheet: back to the board, no close. Move has none: its positions are the room scene's and the board's. */
export function targetListSheet({ type }) {
  const l = lookOf(type);
  notPanel(type, 'has no list: its keypad is');
  if (type === 'MOVE') throw new TypeError('Move has no list: its positions are the room scene\'s and the board\'s');
  return { id: 'action-list', title: ACTION_WORDS.list, sub: ACTION_WORDS.listSub(l.title), back: true, close: false };
}
/**
 * The check's sheet: Cancel and Register; while sending, Register busy and named as it sends. Cancel only closes
 * the sheet on this phone, so it is local (shell 0.2.4) and works while reconnecting; Register stands for the command.
 */
export function checkSheet({ type, phase = 'ready', canRegister = true }) {
  const l = lookOf(type);
  notPanel(type, 'has no check: its keypad and Submit are');
  if (!l.register) throw new TypeError(`${type} has no check of this component's`);
  if (!['ready', 'sending'].includes(phase)) throw new TypeError('phase is ready or sending');
  const sending = phase === 'sending';
  return { id: 'action-check', title: ACTION_WORDS.check, close: false, actions: [
    { id: 'cancel', label: ACTION_WORDS.cancel, kind: 'secondary', local: true },
    { id: 'register', label: sending ? l.sending : l.register, kind: 'primary', busy: sending, enabled: sending || !!canRegister },
  ] };
}
/** After Register's sheet: the action's title, and Done, which only closes it on this phone (local: it works while reconnecting). */
export function afterSheet({ type }) {
  const l = lookOf(type);
  if (type === 'MOVE') throw new TypeError('A move has no After Register: it happens at once, and movedToast() says so (Q2)');
  notPanel(type, 'has no After Register: its records are');
  return { id: 'action-after', title: l.title, close: false, actions: [{ id: 'done', label: ACTION_WORDS.done, kind: 'secondary', local: true }] };
}
/**
 * Sheet 45's "Outcome unknown": "Retry the same" and "Check receipt", each busy while it asks. The Hospital panel's
 * request too (PANEL_CODE, the Lead's Q3): both stand for commands, as for every action.
 */
export function unknownSheet({ type, busy = null } = {}) {
  if (type !== undefined && type !== null) lookOf(type);
  if (![null, 'retry', 'check'].includes(busy)) throw new TypeError('busy is retry, check, or null');
  return { id: 'action-unknown', title: ACTION_WORDS.unknown, close: false, actions: [
    { id: 'retry', label: ACTION_WORDS.retrySame, kind: 'secondary', icon: 'retry', busy: busy === 'retry', enabled: busy === null || busy === 'retry' },
    { id: 'check', label: ACTION_WORDS.checkReceipt, kind: 'primary', icon: 'check', busy: busy === 'check', enabled: busy === null || busy === 'check' },
  ] };
}
/**
 * Pass asks once (27.3): "The turn goes to Eli · Player 5" when the next player is known (B5), else no sub. Cancel only
 * closes the sheet (local: it works while reconnecting, except while Pass is sending); Pass stands for PASS_TURN.
 */
export function passSheet({ next = null, busy = false } = {}) {
  const who = next ? person(next, 'next') : null;
  return { id: 'pass', title: ACTION_WORDS.passTitle, sub: who ? ACTION_WORDS.passNext(who.name, who.seat) : null, close: false, actions: [
    { id: 'cancel', label: ACTION_WORDS.cancel, kind: 'secondary', local: true, enabled: !busy },
    { id: 'pass', label: ACTION_WORDS.pass, kind: 'primary', icon: 'pass', busy: !!busy },
  ] };
}
/**
 * The shell's target bar while choosing: the action's icon and title, and "Choose a player" in the room or
 * "Choose a player · every room" on the board; Supply's "Choose two players", then "Choose the second player" (L4).
 */
export function targetBar({ type, where = 'room', picked = [] }) {
  const l = lookOf(type);
  // The Hacker's are the Hacker component's (the Lead's note 2, 16 November): its words exist once, there.
  if (type === 'SCAN') throw new TypeError('Scan\'s target bar is the Hacker component\'s scanBar() (design/phone-ui/components/hacker)');
  if (type === 'SUBMIT_CODE') throw new TypeError('The final Code has no target bar: it is the Hacker component\'s codeSheet() and mountFinalCode()');
  if (type === 'MOVE') throw new TypeError('Move chooses a position, not a person: its target bar is moveBar()');
  notPanel(type, 'has no target bar: its keypad is');
  if (!['room', 'board'].includes(where)) throw new TypeError('where is room or board');
  const sub = l.people === 2 ? (picked.length ? ACTION_WORDS.chooseSecond : ACTION_WORDS.chooseTwo) : ACTION_WORDS.choosePlayer;
  return { icon: l.icon, title: l.title, sub: where === 'board' ? ACTION_WORDS.everyRoom(sub) : sub };
}
/**
 * The shell's target bar while choosing where to move (sheets 20, 26 and 27.1; the Lead's Q3 and Q4, 16 November).
 * `here` and `elsewhere` say whether the MOVE offer has an empty position in the viewer's room and in another room.
 *   - In the room: "Move within Room A" with "Choose an empty position · or another room on the Board"; with no
 *     position elsewhere, "Choose an empty position"; with none here, "Move" with "No empty position in Room A ·
 *     choose one on the Board".
 *   - On the board: "Move" with "Choose an empty position · uses this round’s move".
 * No position anywhere: no bar, as the tile is then unavailable (the server's reason or "Not available now"). A
 * position picked: no bar either, as the check takes its place (Q1).
 */
export function moveBar({ where = 'room', room = null, here = false, elsewhere = false, picked = null } = {}) {
  if (!['room', 'board'].includes(where)) throw new TypeError('where is room or board');
  if ((picked !== null && picked !== undefined) || (!here && !elsewhere)) return null;
  const l = ACTION_LOOKS.MOVE;
  if (where === 'board') return { icon: l.icon, title: l.title, sub: ACTION_WORDS.moveBoard };
  if (!isText(room)) throw new TypeError('In the room, the bar names the viewer\'s room');
  if (!here) return { icon: l.icon, title: l.title, sub: ACTION_WORDS.moveFull(room) };
  return { icon: l.icon, title: ACTION_WORDS.moveWithin(room), sub: elsewhere ? ACTION_WORDS.moveOrBoard : ACTION_WORDS.moveChoose };
}
/**
 * The Disabler's position bar during a Blackout (sheet 30; screens-more.mjs blackout()): the shell's target bar
 * while the dark room's positions are offered (SELECT_BLACKOUT_SLOT, from the view's blackoutTargeting).
 *   - Choosing: "Choose a position" with "Room A · any position, even empty", the room the request is bound to
 *     (blackoutTargeting.boundRoom).
 *   - Once the server has the position (blackoutTargeting.selectedSlotId, `fixed`): "Position A3 fixed" with
 *     "Resolves after the window · no effect shown now". The offer ends then, so the position can't change.
 * The pack's position mark is its icon. The room scene draws the positions offered (targets.slots, any position,
 * even a taken one); the bar names no player and shows no effect.
 */
export function blackoutBar({ room = null, fixed = null } = {}) {
  if (fixed !== null && fixed !== undefined) {
    if (!isText(fixed)) throw new TypeError('fixed is the position the server has, such as "A3", or null');
    return { icon: 'position', title: ACTION_WORDS.positionFixed(fixed), sub: ACTION_WORDS.positionLater };
  }
  if (!isText(room)) throw new TypeError('The bar names the room the Disabler chooses in');
  return { icon: 'position', title: ACTION_WORDS.positionChoose, sub: ACTION_WORDS.positionAny(room) };
}
/** In the room, while the MOVE offer has a position in another room: the chip to the Board, "Other rooms on the Board" (sheet 20). Else null. */
export function moveChip({ elsewhere = false } = {}) {
  return elsewhere ? { id: 'move-board', label: ACTION_WORDS.moveChip, icon: 'board', tone: 'paper' } : null;
}
/** The floating chip: the way to the people elsewhere ("Other rooms · 1"), or on the board the list. */
export function targetChip({ kind, count = null }) {
  if (kind === 'other-rooms') {
    if (!(Number.isSafeInteger(count) && count > 0)) throw new TypeError('Other rooms needs how many people are elsewhere');
    return { id: 'other-rooms', label: ACTION_WORDS.otherRooms(count), icon: 'board', tone: 'paper' };
  }
  if (kind === 'list') return { id: 'list', label: ACTION_WORDS.listButton, icon: 'players', tone: 'paper' };
  throw new TypeError('A chip is other-rooms or list');
}
/** The shell's toast once the server accepts (L5): "Rescue registered", "Private talk accepted", "Clone active", "Navigation suppressed". */
export function registeredToast({ type, kind = 'registered', id }) {
  const l = lookOf(type);
  if (type === 'MOVE') throw new TypeError('A move\'s toast is movedToast(): "Moved to A3" (Q2)');
  notPanel(type, 'has no toast (the Lead\'s Q4): its records are');
  if (!AFTER_KINDS.includes(kind)) throw new TypeError(`kind is ${AFTER_KINDS.join(', ')}`);
  if (!isText(String(id ?? ''))) throw new TypeError('A toast needs the command\'s id, so it shows once');
  return { id: String(id), text: ACTION_WORDS.toast[kind](l.noun), icon: 'check' };
}
/**
 * Once the server accepts a move (the Lead's Q2): "Moved to A3", with the position as the bar and the check say
 * it. The shell's info toast, on this phone only; the person walking in the scene is what everyone sees.
 */
export function movedToast({ slot, id }) {
  if (!isText(slot)) throw new TypeError('A move\'s toast names its position');
  if (!isText(String(id ?? ''))) throw new TypeError('A toast needs the command\'s id, so it shows once');
  return { id: String(id), text: ACTION_WORDS.moved(slot), icon: 'info' };
}
/** Once the turn has passed (sheet 27.3, "The turn moves on"): "Turn passed", the shell's info toast, on this phone. */
export function passedToast({ id }) {
  if (!isText(String(id ?? ''))) throw new TypeError('A toast needs the command\'s id, so it shows once');
  return { id: String(id), text: ACTION_WORDS.passed, icon: 'info' };
}

// ── Mounting ────────────────────────────────────────────────────────────
/** What every part shares: its root, the kit, the parts, the control policy, and its lifecycle. */
function mountPart(host, name, model, input, handlers, paint) {
  if (!host?.ownerDocument) throw new TypeError(`${name} needs a host element`);
  const doc = host.ownerDocument;
  const kit = createKit(doc), parts = createPlayParts(doc);
  let state = model.merge(model.normalize({}), input);
  let disposed = false, suspended = false;
  const root = kit.h('div', 'ms-actions ms-kit', { tabindex: '-1', 'data-part': name });
  host.append(root);
  const accepts = () => !disposed && !suspended && state.interactive && state.status === 'live';
  const policy = createControlPolicy({ root, accepts,
    defaultReason: () => (state.status === 'stale' ? ACTION_WORDS.stale : null),
    onFocusReturn: detail => handlers.onFocusReturn?.(detail) });
  const ctx = { doc, kit, parts, root, policy, accepts, get state() { return state; } };
  const painter = paint(ctx);
  const onClick = event => {
    const target = event.target.closest?.('button[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    painter.tap?.(target);
  };
  root.addEventListener('click', onClick);
  function render() {
    if (disposed) return;
    root.dataset.status = state.status;
    kit.attr(root, 'data-motion', state.reducedMotion ? 'reduced' : null);
    kit.attr(root, 'aria-hidden', state.status === 'concealed' ? 'true' : null);
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    painter.paint(state);
  }
  function update(next = {}) {
    if (disposed) return;
    state = model.merge(state, next);
    render();
  }
  /** Nothing here runs by itself; suspended, it takes no taps until resumed. */
  function suspend() { if (disposed) return; suspended = true; render(); }
  function resume() { if (disposed) return; suspended = false; render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, suspend, resume, dispose, element: root });
}

/**
 * The tiles (sheet 28): "Your turn" or "Not your turn" and the round, every action of the viewer's role as a
 * tile in the order given, and the line under them. Handlers: onTile(type) for an available or chosen tile,
 * onFocusReturn(detail). Each tile is kept by its type, so a focused tile keeps its element and its focus.
 */
export function mountActions(host, input = {}, handlers = {}) {
  return mountPart(host, 'tiles', TILES, input, handlers, ({ doc, kit, parts, root, policy }) => {
    // The turn head is the kit's section head (0.7.0), as sheet 28 draws it.
    const head = kit.sectionHead({ title: ACTION_WORDS.yourTurn });
    const wrap = kit.h('div', 'ms-ac-tiles-wrap');
    const grid = kit.h('div', 'ms-ac-tiles', { role: 'group', 'aria-label': ACTION_WORDS.tilesLabel });
    wrap.append(grid);
    const note = kit.groupNote('');
    note.classList.add('ms-ac-note');
    const nodes = new Map();
    return {
      tap: target => { if (target.dataset.intent === 'tile') handlers.onTile?.(target.dataset.value); },
      paint: s => {
        const concealed = s.status === 'concealed';
        if (concealed) {
          // Emptied, not hidden: no tile, name, line or reason stays in the page.
          for (const node of nodes.values()) policy.remove(node);
          nodes.clear();
          for (const n of [head, wrap, note]) n.remove();
          return;
        }
        if (!head.isConnected) root.prepend(head, wrap);
        kit.setSectionHead(head, { title: s.turn === 'own' ? ACTION_WORDS.yourTurn : ACTION_WORDS.notYourTurn, aside: s.round === null ? null : ACTION_WORDS.round(s.round) });
        const wanted = new Set(s.tiles.map(t => t.type));
        for (const [type, node] of nodes) if (!wanted.has(type)) { policy.remove(node); nodes.delete(type); }
        // A tile moved to its new place keeps its element; the focus, which a move drops, is put back on it.
        const focused = [...nodes.values()].find(node => node === doc.activeElement) ?? null;
        s.tiles.forEach((t, i) => {
          const l = ACTION_LOOKS[t.type];
          let node = nodes.get(t.type);
          const props = { icon: l.icon, name: l.tile, note: tileLine(t), state: t.state, badge: t.badge, intent: 'tile', value: t.type };
          if (!node) { node = parts.tile(props); nodes.set(t.type, node); } else parts.setTile(node, props);
          policy.control(node, { intent: 'tile', off: !['available', 'selected'].includes(t.state), busy: t.state === 'sending' });
          if (grid.children[i] !== node) grid.insertBefore(node, grid.children[i] ?? null);
        });
        if (focused?.isConnected && doc.activeElement !== focused) focused.focus({ preventScroll: true });
        kit.text(note, s.note ?? '');
        if (s.note && !note.isConnected) wrap.after(note);
        if (!s.note && note.isConnected) note.remove();
      },
    };
  });
}

/**
 * The list (sheet 29): everyone the offer reaches, by room as the public board has them, each row going to the
 * check. Supply's first pick is marked (L4). Handlers: onPick(seat), onFocusReturn(detail). Each row is kept by
 * its seat.
 */
export function mountTargetList(host, input = {}, handlers = {}) {
  return mountPart(host, 'list', LIST, input, handlers, ({ doc, kit, root, policy }) => {
    const box = kit.h('div', 'ms-ac-list');
    const rows = new Map(), ids = new Map();
    let groupsKey = null;
    return {
      tap: target => { if (target.dataset.intent === 'pick') handlers.onPick?.(ids.get(Number(target.dataset.value)) ?? Number(target.dataset.value)); },
      paint: s => {
        if (s.status === 'concealed' || !s.groups.length) {
          for (const node of rows.values()) policy.remove(node);
          rows.clear();
          box.replaceChildren();
          box.remove();
          groupsKey = null;
          return;
        }
        if (!box.isConnected) root.append(box);
        const picked = new Set(s.picked);
        const seats = new Set(s.groups.flatMap(g => g.people.map(p => p.seat)));
        for (const [seat, node] of rows) if (!seats.has(seat)) { policy.remove(node); rows.delete(seat); }
        const lists = [];
        for (const g of s.groups) {
          const items = g.people.map(p => {
            let node = rows.get(p.seat);
            const props = { lead: node?.querySelector('.ms-k-pt') ?? kit.portrait(p, s.versions), title: p.you || p.seat === s.viewer ? ACTION_WORDS.you(p.name) : p.name,
              sub: `${ACTION_WORDS.player(p.seat)}${p.health && p.health !== 'Healthy' ? ` · ${p.health}` : ''}`, value: picked.has(p.seat) ? ACTION_WORDS.picked : null,
              chevron: true, intent: 'pick', data: p.seat };
            kit.setPortrait(props.lead, p, s.versions);
            ids.set(p.seat, p.id);
            if (!node) { node = kit.row(props); rows.set(p.seat, node); } else kit.setRow(node, props);
            kit.attr(node, 'data-picked', picked.has(p.seat) ? '' : null);
            policy.control(node, { intent: 'pick' });
            return node;
          });
          lists.push([g.room, items]);
        }
        // The groups' frame is redrawn only when the rooms or their order change; the rows move into it, kept.
        const key = JSON.stringify(s.groups.map(g => [g.room, g.people.map(p => p.seat)]));
        if (key !== groupsKey) {
          groupsKey = key;
          // A row moved into the new frame keeps its element; the focus, which a move drops, is put back on it.
          const focused = [...rows.values()].find(node => node === doc.activeElement) ?? null;
          const children = [];
          for (const [room, items] of lists) {
            const ul = kit.list();
            for (const item of items) { const li = kit.h('li', 'ms-k-list-item'); li.append(item); ul.append(li); }
            children.push(kit.groupLabel(room), ul);
          }
          box.replaceChildren(...children);
          if (focused?.isConnected && doc.activeElement !== focused) focused.focus({ preventScroll: true });
        }
      },
    };
  });
}

/**
 * The check before Register (sheets 27.2 and 29): the person at 64 px, both people for Supply, or the action's
 * icon with "Only you see this"; its facts; and, when the server did not accept it, why (the kit's inline note,
 * never red; L6). The shell draws Cancel and Register (checkSheet()).
 */
export function mountActionCheck(host, input = {}, handlers = {}) {
  return mountPart(host, 'check', CHECK, input, handlers, ({ kit, parts, root }) => {
    let who = null, facts = null, error = null, errorKey = null;
    return {
      paint: s => {
        if (s.status === 'concealed' || s.type === null) {
          for (const n of [who, facts, error]) n?.remove();
          who = facts = error = null;
          errorKey = null;
          return;
        }
        const words = actionWords({ type: s.type, targets: s.targets, viewer: s.viewer, position: s.position });
        const props = { people: s.targets, icon: ACTION_LOOKS[s.type].icon, title: words.title, sub: words.sub, versions: s.versions };
        if (!who) { who = parts.who(props); root.prepend(who); } else parts.setWho(who, props);
        if (!facts) { facts = parts.facts(s.facts); who.after(facts); } else parts.setFacts(facts, s.facts);
        const key = s.error ? JSON.stringify(s.error) : null;
        if (key !== errorKey) {
          errorKey = key;
          error?.remove();
          error = s.error ? kit.errorNote(`${s.error.text}${s.error.detail ? ` ${s.error.detail}` : ''}`) : null;
          if (error) { error.classList.add('ms-ac-error'); facts.after(error); }
        }
      },
    };
  });
}

/**
 * After Register (sheets 29, 29.1 and 29.2): the stamp (REGISTERED and ACCEPTED an outline: they wait; ACTIVE
 * amber and CAPTURED steel: they happen at once), the headline, the detail, the Engineer's captured players and
 * the time line. Nothing is drawn on the target (29.1). The stamp snaps in over 120 ms as it opens; with Reduce
 * motion it is there at once. The shell draws Done (afterSheet()).
 */
export function mountAfterRegister(host, input = {}, handlers = {}) {
  return mountPart(host, 'after', AFTER, input, handlers, ({ kit, parts, root }) => {
    let box = null, peopleKey = null;
    return {
      paint: s => {
        if (s.status === 'concealed' || s.type === null) { box?.remove(); box = null; peopleKey = null; return; }
        if (!box) {
          box = kit.h('div', 'ms-ac-after');
          const head = kit.h('div', 'ms-ac-after-head', { role: 'status' });
          head.append(kit.stamp({ text: ACTION_WORDS.stamps.registered, tone: 'pending' }), kit.h('h3'));
          box.append(head, kit.h('p', 'ms-ac-after-detail'), kit.h('div', 'ms-ac-after-people'), parts.timeline([]));
          root.append(box);
        }
        const [head, detail, people, steps] = box.children;
        const stamp = STAMPS[s.kind];
        box.dataset.kind = stamp.kind;
        kit.setStamp(head.firstChild, { text: ACTION_WORDS.stamps[s.kind], tone: stamp.tone });
        kit.text(head.lastChild, s.title ?? '');
        head.lastChild.hidden = !s.title;
        kit.text(detail, s.detail ?? '');
        detail.hidden = !s.detail;
        const key = JSON.stringify([s.people, s.versions]);
        if (key !== peopleKey) {
          peopleKey = key;
          people.replaceChildren(...(s.people?.length ? [kit.list(...s.people.map(p => kit.row({ tag: 'div', lead: kit.portrait(p, s.versions), title: p.name, sub: p.sub ?? ACTION_WORDS.player(p.seat) })))] : []));
          people.hidden = !s.people?.length;
        }
        parts.setTimeline(steps, s.steps);
      },
    };
  });
}

/** Sheet 45's "Outcome unknown", exactly: the warning icon and its two lines. The shell draws its two buttons (unknownSheet()). */
export function mountOutcomeUnknown(host, input = {}, handlers = {}) {
  return mountPart(host, 'unknown', UNKNOWN, input, handlers, ({ kit, root }) => {
    let notice = null;
    return {
      paint: s => {
        if (s.status === 'concealed' || s.type === null) { notice?.remove(); notice = null; return; }
        const { what } = actionWords({ type: s.type, targets: s.targets, viewer: s.viewer, position: s.position });
        const props = { icon: 'warning', filled: true, lines: [ACTION_WORDS.noAnswer(what), ACTION_WORDS.checkFirst] };
        if (!notice) { notice = kit.notice(props); root.append(notice); } else kit.setNotice(notice, props);
      },
    };
  });
}

/** Pass's line (27.3): "Your move stays open on the other turns this round." when Frontend gives it. The shell draws Cancel and Pass (passSheet()). */
export function mountPassNote(host, input = {}, handlers = {}) {
  return mountPart(host, 'pass', PASS, input, handlers, ({ kit, root }) => {
    const note = kit.groupNote('');
    return {
      paint: s => {
        const words = s.status === 'concealed' ? null : s.note;
        kit.text(note, words ?? '');
        if (words && !note.isConnected) root.append(note);
        if (!words && note.isConnected) note.remove();
      },
    };
  });
}
