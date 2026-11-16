// The Food surface's inputs: what the component takes, checked, and what the port's drawing reads from it.
//
// The drawing in this folder is the frozen native port's, copied (sources.json). The port's renderer reads one
// own-seat controller, the ordinary board of the same response and the public identities. Here those three are built
// from the component's inputs and nothing else, so the audiences stay apart:
//   public            people, board (locations, the active seat, the phase), clock, assets
//   this viewer's     view, can, viewer (the Promises badge)
//   this phone's      sending, status, navigation, reducedMotion, bars
// This module is pure: no DOM, no clock of its own, no storage. It imports nothing.

export const FOOD_VERSION = 'food-0.1.0';

export const FOOD_STATUSES = Object.freeze(['live', 'stale', 'concealed']);
/** The controller's seven offers. Nothing else enables a control. */
export const FOOD_CAN = Object.freeze(['ask', 'answer', 'withdraw', 'hold', 'panelRelease', 'panelLock', 'key']);
/**
 * All the component accepts of the authorized Food player view: the eleven keys the drawing reads, and the view's own
 * `viewRevision`, which it takes as Frontend's inputs give it and does not read. Every other key of the contract's
 * view is refused: the binding and envelope (`schemaVersion`, `audience`, `matchId`, `phaseId`, `serverNowMs`), the
 * roster (`playerCount`, `rosterSeatIds`), `turnEnds`, and the viewer's `privateCursor` and `ownMeals`.
 */
export const FOOD_VIEW_KEYS = Object.freeze(['seatId', 'round', 'versions', 'viewRevision', 'step', 'stock', 'ownAvailability', 'partnerChoices', 'offers',
  'invitation', 'requestClosures', 'participantTask']);
/** The three presses the surface reports with onPress. Hold is reported as contacts, never as a press. */
export const FOOD_PRESSES = Object.freeze(['PANEL_RELEASE', 'PANEL_LOCK', 'KEY']);
/** The two answers the surface reports with onAnswer. */
export const FOOD_ANSWERS = Object.freeze(['JOIN', 'DECLINE']);
/** The names a press's feedback goes by, as the controller names them. */
export const FOOD_PRESS_NAMES = Object.freeze(['Hold', 'let-go', 'LOCK', 'RELEASE', 'key', 'request', 'Join', 'Decline', 'Cancel']);
export const FOOD_FEEDBACK_STATUSES = Object.freeze(['sending', 'unknown', 'accepted', 'rejected']);
export const FOOD_REQUEST_STATES = Object.freeze(['PENDING', 'JOINED', 'DECLINED', 'WITHDRAWN']);
export const FOOD_CLOSURE_STATES = Object.freeze(['JOINED', 'DECLINED', 'WITHDRAWN', 'EXPIRED']);
/** Of a refused press's request closure, the six fields the request cards read, and so all that is taken of it. */
export const FOOD_CLOSURE_KEYS = Object.freeze(['requestId', 'state', 'round', 'foodStepId', 'volunteerSeatId', 'partnerSeatId']);
export const FOOD_BOARD_MODES = Object.freeze(['room', 'board']);
/** Where a tap on the surface's own bars asks the app to go. */
export const FOOD_NAVIGATION_TARGETS = Object.freeze(['settings', 'promises', 'switch', 'card', 'panels']);
/** The published Food step, as the notice may be given it. It reads `kind` alone. */
export const FOOD_STEP_KEYS = Object.freeze(['kind', 'stepId', 'startedAt', 'askingEndsAt', 'returnsAt', 'awaySeatIds']);

const NO_CAN = Object.freeze(Object.fromEntries(FOOD_CAN.map(key => [key, false])));
export const FOOD_DEFAULTS = Object.freeze({
  view: null,
  can: NO_CAN,
  sending: Object.freeze({ feedback: null, pendingCount: 0, physicalHolding: false, needsContactOff: false }),
  status: 'live',
  clock: null,
  people: Object.freeze([]),
  board: Object.freeze({ seats: Object.freeze([]), activeSeatId: null, phase: null }),
  viewer: Object.freeze({ promiseOfferCount: 0 }),
  navigation: Object.freeze({ openPanel: null, boardMode: 'room' }),
  assets: null,
  reducedMotion: false,
  bars: Object.freeze({ top: 0, bottom: 0 }),
});
export const FOOD_NOTICE_DEFAULTS = Object.freeze({ step: null, stock: null, status: 'live', bars: Object.freeze({ top: 0 }) });

const fail = message => { throw new TypeError(`Food: ${message}`); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const count = value => Number.isSafeInteger(value) && value >= 0;
const measure = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function keysOf(value, allowed, where) {
  if (!plain(value)) fail(`${where} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${where} takes no "${key}"`);
  return value;
}
/** A copy the caller cannot change afterwards. Views are plain data, as they come off the wire. */
function copied(value, where) {
  try { return structuredClone(value); } catch { return fail(`${where} must be plain data`); }
}

function checkView(view) {
  if (view === null) return null;
  keysOf(view, FOOD_VIEW_KEYS, 'view');
  if (!text(view.seatId)) fail('view.seatId must be a seat');
  if (!plain(view.stock) || !count(view.stock.doses)) fail('view.stock.doses must be a whole number');
  if (!Array.isArray(view.partnerChoices) || !Array.isArray(view.offers) || !Array.isArray(view.requestClosures)) fail('view.partnerChoices, view.offers and view.requestClosures must be lists');
  if (!plain(view.ownAvailability)) fail('view.ownAvailability must be an object');
  for (const key of ['step', 'invitation', 'participantTask']) if (view[key] !== null && !plain(view[key])) fail(`view.${key} must be an object or null`);
  return copied(view, 'view');
}
function checkCan(can) {
  keysOf(can, FOOD_CAN, 'can');
  for (const key of Object.keys(can)) if (typeof can[key] !== 'boolean') fail(`can.${key} must be true or false`);
  return Object.freeze({ ...NO_CAN, ...can });
}
function checkFeedback(feedback) {
  if (feedback === null) return null;
  keysOf(feedback, ['key', 'name', 'status', 'recovered', 'request', 'closure'], 'sending.feedback');
  if (!text(feedback.key)) fail('sending.feedback.key must name the press');
  if (!FOOD_PRESS_NAMES.includes(feedback.name)) fail('sending.feedback.name is not a press');
  if (!FOOD_FEEDBACK_STATUSES.includes(feedback.status)) fail('sending.feedback.status is not a status');
  if (typeof feedback.recovered !== 'boolean') fail('sending.feedback.recovered must be true or false');
  const request = feedback.request ?? null, closure = feedback.closure ?? null;
  if (request !== null) {
    keysOf(request, ['requestId', 'state'], 'sending.feedback.request');
    if (feedback.status !== 'accepted') fail('sending.feedback.request belongs to an accepted press');
    if (!text(request.requestId) || !FOOD_REQUEST_STATES.includes(request.state)) fail('sending.feedback.request needs its request and state');
  }
  if (closure !== null) {
    keysOf(closure, FOOD_CLOSURE_KEYS, 'sending.feedback.closure');
    if (feedback.status !== 'rejected') fail('sending.feedback.closure belongs to a rejected press');
    if (!text(closure.requestId) || !FOOD_CLOSURE_STATES.includes(closure.state) || !text(closure.foodStepId) || !count(closure.round)
      || !text(closure.volunteerSeatId) || !text(closure.partnerSeatId)) fail('sending.feedback.closure needs its request, state, round, step and both seats');
  }
  return Object.freeze({ key: feedback.key, name: feedback.name, status: feedback.status, recovered: feedback.recovered,
    request: request === null ? null : Object.freeze({ requestId: request.requestId, state: request.state }),
    closure: closure === null ? null : Object.freeze({ ...closure }) });
}
function checkSending(sending) {
  keysOf(sending, ['feedback', 'pendingCount', 'physicalHolding', 'needsContactOff'], 'sending');
  const next = { ...FOOD_DEFAULTS.sending, ...sending };
  if (!count(next.pendingCount)) fail('sending.pendingCount must be a whole number');
  for (const key of ['physicalHolding', 'needsContactOff']) if (typeof next[key] !== 'boolean') fail(`sending.${key} must be true or false`);
  return Object.freeze({ ...next, feedback: checkFeedback(next.feedback) });
}
function checkClock(clock) {
  if (clock === null) return null;
  if (typeof clock?.now !== 'function') fail('clock must be { now() } or null');
  return clock;
}
function checkPeople(people) {
  if (!Array.isArray(people)) fail('people must be a list');
  return Object.freeze(people.map((person, index) => {
    keysOf(person, ['seatId', 'name', 'character'], `people[${index}]`);
    if (!text(person.seatId) || !text(person.name)) fail(`people[${index}] needs its seat and name`);
    if (person.character !== null && person.character !== undefined && !text(person.character)) fail(`people[${index}].character must be a character or null`);
    return Object.freeze({ seatId: person.seatId, name: person.name, character: person.character ?? null });
  }));
}
function checkBoard(board) {
  keysOf(board, ['seats', 'activeSeatId', 'phase'], 'board');
  const next = { ...FOOD_DEFAULTS.board, ...board };
  if (!Array.isArray(next.seats)) fail('board.seats must be a list');
  const seats = Object.freeze(next.seats.map((seat, index) => {
    keysOf(seat, ['seatId', 'location'], `board.seats[${index}]`);
    if (!text(seat.seatId)) fail(`board.seats[${index}] needs its seat`);
    if (seat.location !== null && seat.location !== undefined && !text(seat.location)) fail(`board.seats[${index}].location must be a place or null`);
    return Object.freeze({ seatId: seat.seatId, location: seat.location ?? null });
  }));
  if (next.activeSeatId !== null && !text(next.activeSeatId)) fail('board.activeSeatId must be a seat or null');
  let phase = null;
  if (next.phase !== null) {
    keysOf(next.phase, ['kind', 'remainingMs'], 'board.phase');
    if (!text(next.phase.kind)) fail('board.phase.kind must name the phase');
    const remainingMs = next.phase.remainingMs ?? null;
    if (remainingMs !== null && !(typeof remainingMs === 'number' && Number.isFinite(remainingMs))) fail('board.phase.remainingMs must be a number or null');
    phase = Object.freeze({ kind: next.phase.kind, remainingMs });
  }
  return Object.freeze({ seats, activeSeatId: next.activeSeatId, phase });
}
function checkViewer(viewer) {
  keysOf(viewer, ['promiseOfferCount'], 'viewer');
  const next = { ...FOOD_DEFAULTS.viewer, ...viewer };
  if (!count(next.promiseOfferCount)) fail('viewer.promiseOfferCount must be a whole number');
  return Object.freeze(next);
}
function checkNavigation(navigation) {
  keysOf(navigation, ['openPanel', 'boardMode'], 'navigation');
  const next = { ...FOOD_DEFAULTS.navigation, ...navigation };
  if (next.openPanel !== null && !text(next.openPanel)) fail('navigation.openPanel must name a panel or be null');
  if (!FOOD_BOARD_MODES.includes(next.boardMode)) fail('navigation.boardMode must be "room" or "board"');
  return Object.freeze(next);
}
function checkAssets(assets) {
  if (assets === null) return null;
  if (typeof assets?.operator !== 'function') fail('assets must be { back, operator(station, character, out) } or null');
  return assets;
}
function checkBars(bars, keys, where) {
  keysOf(bars, keys, where);
  const next = Object.fromEntries(keys.map(key => [key, bars[key] ?? 0]));
  for (const key of keys) if (!measure(next[key])) fail(`${where}.${key} must be a length in CSS px`);
  return Object.freeze(next);
}
const CHECKS = Object.freeze({
  view: checkView, can: checkCan, sending: checkSending, clock: checkClock, people: checkPeople, board: checkBoard, viewer: checkViewer,
  navigation: checkNavigation, assets: checkAssets,
  status: status => (FOOD_STATUSES.includes(status) ? status : fail('status must be "live", "stale" or "concealed"')),
  reducedMotion: value => (typeof value === 'boolean' ? value : fail('reducedMotion must be true or false')),
  bars: bars => checkBars(bars, ['top', 'bottom'], 'bars'),
});

/** The next input: each key given replaces that key, and the rest stay. An unknown key is refused, at every level. */
export function nextFoodInput(current = FOOD_DEFAULTS, changes = {}) {
  keysOf(changes, Object.keys(CHECKS), 'the input');
  const next = { ...current };
  for (const [key, value] of Object.entries(changes)) next[key] = CHECKS[key](value);
  return Object.freeze(next);
}

/** The moment to draw: the trusted server time in ms, or null while it is not known. */
export function foodNow(input) {
  const now = input.clock === null ? null : input.clock.now();
  return typeof now === 'number' && Number.isFinite(now) ? now : null;
}

/**
 * What the port's drawing reads where it read its controller's model.
 * Concealed, nothing of this viewer is in it. Stale, the view stays (it is still authorized) and no offer enables a
 * control. A recovered press is told by `recovered`, on the original press's own feedback: it never replaces it.
 */
export function foodModel(input, now = foodNow(input)) {
  const shown = input.status !== 'concealed', live = input.status === 'live', f = shown ? input.sending.feedback : null, can = input.can;
  const receipt = f === null ? null
    : f.status === 'rejected' ? { status: 'rejected', requestClosure: f.closure }
      : f.status === 'accepted' ? { status: 'accepted', result: f.request === null ? { kind: 'INPUT' } : { kind: 'REQUEST', requestId: f.request.requestId, state: f.request.state } }
        : null;
  return {
    visible: shown, fresh: live, message: null, view: shown ? input.view : null,
    clock: shown && now !== null ? { status: 'synced', serverNowMs: now } : { status: 'unsynced' },
    feedback: f === null ? null : { commandId: f.key, name: f.name, status: f.status, receipt, recovered: f.recovered },
    pendingCount: shown ? input.sending.pendingCount : 0,
    canAsk: live && can.ask, canAnswer: live && can.answer, canWithdraw: live && can.withdraw,
    canHold: live && can.hold, canPanelRelease: live && can.panelRelease, canPanelLock: live && can.panelLock, canKey: live && can.key,
    physicalHolding: shown && input.sending.physicalHolding, needsContactOff: shown && input.sending.needsContactOff,
  };
}

/** The ordinary board of the same response, as the port's drawing reads it: public facts, this viewer's badge, the open panel. */
export function foodOrdinary(input) {
  if (input.status === 'concealed') return null;
  return { board: { seats: input.board.seats }, phase: input.board.phase, activeSeatId: input.board.activeSeatId,
    promiseOfferCount: input.viewer.promiseOfferCount, panel: input.navigation.openPanel };
}

/** The public identities, in the port's own field names. */
export function foodIdentities(input) {
  return input.people.map(person => ({ seatId: person.seatId, displayName: person.name, characterId: person.character }));
}

const NOTICE_CHECKS = Object.freeze({
  step(step) {
    if (step === null) return null;
    keysOf(step, FOOD_STEP_KEYS, 'step');
    if (!text(step.kind)) fail('step.kind must name the step');
    return Object.freeze({ kind: step.kind });
  },
  stock(stock) {
    if (stock === null) return null;
    keysOf(stock, ['doses'], 'stock');
    if (!count(stock.doses)) fail('stock.doses must be a whole number');
    return Object.freeze({ doses: stock.doses });
  },
  status: CHECKS.status,
  bars: bars => checkBars(bars, ['top'], 'bars'),
});

/** The shared display's notice takes public facts and this screen's own measure. Nothing of a viewer has a key here. */
export function nextFoodNoticeInput(current = FOOD_NOTICE_DEFAULTS, changes = {}) {
  keysOf(changes, Object.keys(NOTICE_CHECKS), 'the notice input');
  const next = { ...current };
  for (const [key, value] of Object.entries(changes)) next[key] = NOTICE_CHECKS[key](value);
  return Object.freeze(next);
}

/** What the port's notice reads where it read the display's game model. */
export function foodNoticeModel(input) {
  return { food: input.stock === null ? null : { step: input.step, stock: input.stock }, concealed: input.status === 'concealed',
    connection: input.status === 'live' ? 'live' : 'stale' };
}
