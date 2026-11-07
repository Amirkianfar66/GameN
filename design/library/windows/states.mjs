// mothership:dev-only
//
// The state maps for the windows and the drawing pad, from the seat's own PlanetPlayerView alone
// (protocol 3 candidate, packages/contracts/src/planet-game.ts at 79418e7) and the client's own
// local drawing and command memory. The server's windows[] and offers[] are the only authority on
// which windows this seat sees and where it may Show.
//
// The rules (game-design.md "Promises and windows"; owner decisions P04 and P26; motion
// requirements): exactly three windows, A_B, A_HOSPITAL and B_JAIL, each seen from either of its
// two rooms, never transitively; four drawing stations, A1 and B1 (A_B), A2 (A_HOSPITAL) and B2
// (B_JAIL), the Hospital and the Jail none; only the station's current occupant may Show; drawing
// is local, Show sends one immutable image, appended with its author and order, never erased or
// replaced; the images expire at the end of their round; viewing, drawing and Show are free; a
// movement block does not stop a seated artist; no new voice channel; a window gives no view
// through the Blackout's darkness; a drawing is a claim, not verified evidence.
//
// R7: a shown drawing carries no publishedAt, so a new one is stamped in on its first sight on this
// screen and never on a reconnect (changes() compares with the previous view this screen drew).

export const WINDOWS = Object.freeze(['A_B', 'A_HOSPITAL', 'B_JAIL']);
/** Each window's two rooms, and the stations that draw into it (with the room each faces). */
export const ENDPOINTS = Object.freeze({ A_B: ['Room A', 'Room B'], A_HOSPITAL: ['Room A', 'Hospital'], B_JAIL: ['Room B', 'Jail'] });
export const STATIONS = Object.freeze({ A1: 'A_B', B1: 'A_B', A2: 'A_HOSPITAL', B2: 'B_JAIL' });
/** The contract's limits on one drawing (PlanetDrawingSchema). */
export const LIMITS = Object.freeze({ strokes: 128, pointsPerStroke: 512, points: 4096, minWidth: 1, maxWidth: 24 });

const own = view => view.board.seats.find(seat => seat.seatId === view.self.seatId) ?? null;
const offer = (view, type) => (view.offers ?? []).find(o => o.type === type) ?? null;

/** The room at a window's other end, seen from this location. */
export function otherEnd(windowId, location) {
  const [a, b] = ENDPOINTS[windowId];
  return location === a ? b : location === b ? a : null;
}

/**
 * When the windows are dark: the Blackout's dark span, from its authoritative preview deadline to its
 * end. The Blackout is five seconds lit, then ten dark (the brief's "Five seconds lit with stable
 * positions ... ten seconds dark"; the owner's correction of 6 November 2026: "Windows remain lit
 * during Blackout's first five seconds; darkness begins at the authoritative preview deadline").
 * During the lit seconds every window shows its pane as before; from blackout.previewEndsAt to the
 * Blackout's end none gives a view (windows cannot bypass the darkness).
 * Missing field: a BLACKOUT phase whose view carries no blackout.previewEndsAt is dark from the
 * phase's start (fail closed: a window never shows what the server has not timed as lit).
 * null outside the Blackout. { from, until (null if unknown), timed (false when the deadline was missing) }.
 */
export function darkSpan(view) {
  if (view.phase.kind !== 'BLACKOUT') return null;
  const b = view.blackout ?? null;
  const timed = Number.isFinite(b?.previewEndsAt);
  const until = Number.isFinite(b?.endsAt) ? b.endsAt : Number.isFinite(view.phase.endsAt) ? view.phase.endsAt : null;
  return { from: timed ? b.previewEndsAt : view.phase.startedAt ?? 0, until, timed };
}

/**
 * Whether the windows are dark at `now` (the server-corrected clock, ms). Without a clock, a Blackout
 * reads dark (fail closed); with one, only inside darkSpan().
 */
export function isDark(view, now = null) {
  const span = darkSpan(view);
  if (!span) return false;
  if (!Number.isFinite(now)) return true;
  return now >= span.from && (span.until === null || now < span.until);
}

/**
 * The windows this seat sees, from the view's windows[] only (the contract already limits it to the
 * seat's endpoints): each with the room at its other end, whether this seat is at its drawing
 * station (canDraw), whether Show is offered now, and its drawings in their shown order.
 */
export function windowsFor(view) {
  const seat = own(view);
  const show = offer(view, 'SHOW_WINDOW');
  return (view.windows ?? []).map(w => Object.freeze({
    windowId: w.windowId,
    facing: otherEnd(w.windowId, seat?.location ?? null),
    station: w.canDraw,
    canShow: Boolean(show && show.windowIds.includes(w.windowId) && w.canDraw),
    drawings: [...w.drawings].sort((x, y) => x.order - y.order),
  }));
}

/** The local drawing's use of the contract's budget. */
export function budget(local) {
  const strokes = local?.strokes ?? [];
  const points = strokes.reduce((n, s) => n + s.points.length, 0);
  return { strokes: strokes.length, points, strokesLeft: LIMITS.strokes - strokes.length, pointsLeft: LIMITS.points - points, full: strokes.length >= LIMITS.strokes || points >= LIMITS.points };
}

/** True when a drawing keeps every limit of PlanetDrawingSchema (what Show may send). */
export function drawingValid(d) {
  if (!d || !Array.isArray(d.strokes) || d.strokes.length < 1 || d.strokes.length > LIMITS.strokes) return false;
  let total = 0;
  for (const s of d.strokes) {
    if (typeof s.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(s.color)) return false;
    if (typeof s.width !== 'number' || !(s.width >= LIMITS.minWidth && s.width <= LIMITS.maxWidth)) return false;
    if (!Array.isArray(s.points) || s.points.length < 1 || s.points.length > LIMITS.pointsPerStroke) return false;
    for (const p of s.points) if (!Array.isArray(p) || p.length !== 2 || !p.every(v => typeof v === 'number' && v >= 0 && v <= 1)) return false;
    total += s.points.length;
  }
  return total <= LIMITS.points;
}

/**
 * The drawing pad of one window, for this seat:
 *   none       the seat does not see this window
 *   dark       the Blackout's dark span (from blackout.previewEndsAt): every window is dark, nothing
 *              is drawn or shown. During its five lit seconds the window keeps its usual state.
 *   view-only  the seat sees the window but is not at its drawing station (or is in the Hospital or the Jail)
 *   blank      at the station, nothing drawn yet
 *   drawing    at the station, a local drawing in progress
 *   full       the local drawing has reached the contract's budget
 *   review     "Show" pressed: the confirmation
 *   sending    SHOW_WINDOW sent, no receipt yet
 *   shown      the drawing was accepted in this phase (the pad is blank again for the next)
 *   refused    refused in this phase: nothing shown, the local drawing kept
 *   closed     at the station, but Show is not offered now (drawing stays local)
 * Options: local (the drawing on this phone), reviewing (bool), pending, accepted ({ windowId:
 * phaseId }), rejected ({ windowId: { phaseId, code } }), now (the server-corrected clock, ms: the
 * Blackout's lit seconds need it; without it a Blackout reads dark).
 */
export function padState(view, windowId, { local = null, reviewing = false, pending = null, accepted = {}, rejected = {}, now = null } = {}) {
  const w = windowsFor(view).find(x => x.windowId === windowId);
  if (!w) return { state: 'none' };
  const base = { windowId, facing: w.facing };
  if (isDark(view, now)) return { ...base, state: 'dark' };
  if (!w.station) return { ...base, state: 'view-only' };
  if (pending === `SHOW_WINDOW:${windowId}`) return { ...base, state: 'sending' };
  const refusal = rejected[windowId] ?? null;
  if (refusal && refusal.phaseId === view.phase.id) return { ...base, state: 'refused', code: refusal.code };
  const hasLocal = Boolean(local?.strokes?.length);
  if (accepted[windowId] === view.phase.id && !hasLocal) return { ...base, state: 'shown' };
  const b = budget(local);
  if (!hasLocal) return { ...base, state: 'blank', canShow: w.canShow };
  if (reviewing && w.canShow && drawingValid(local)) return { ...base, state: 'review', budget: b };
  if (!w.canShow) return { ...base, state: 'closed', budget: b };
  return { ...base, state: b.full ? 'full' : 'drawing', budget: b };
}

/** Drawings a new view brings for the first time, by window, against the previous view this screen drew (R7). */
export function newDrawings(previous, view) {
  if (!previous) return [];
  const seen = new Set((previous.windows ?? []).flatMap(w => w.drawings.map(d => d.id)));
  return (view.windows ?? []).flatMap(w => w.drawings.filter(d => !seen.has(d.id)).map(d => d.id));
}

/**
 * Whether the darkness begins or ends between two moments this screen drew (the shade's motion): each
 * a view and the clock at that moment. The shade lowers when the clock passes blackout.previewEndsAt
 * (no new view is needed), and rises when the Blackout ends. A screen with no earlier moment (a
 * reconnect, a late join) draws the shade at rest: null.
 * Options: previousNow, now (ms; without them each side reads as isDark() does without a clock).
 */
export function darkChange(previous, view, { previousNow = null, now = null } = {}) {
  if (!previous) return null;
  const was = isDark(previous, previousNow);
  const is = isDark(view, now);
  if (!was && is) return 'dark';
  if (was && !is) return 'light';
  return null;
}

export const PAD_STATES = Object.freeze(['none', 'dark', 'view-only', 'blank', 'drawing', 'full', 'review', 'sending', 'shown', 'refused', 'closed']);
