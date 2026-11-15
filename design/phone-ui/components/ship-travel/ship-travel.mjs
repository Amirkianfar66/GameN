// The ship travel: runtime source, Designer's (the owner, 14 and 15 November 2026: one visual source, used by the
// game as it is). Sheet 41's public navigation (#222 item 18): for the whole navigation window every phone sees the
// ship travel through space, the same picture at the same moment, then "The ship moved". The interface was agreed on
// #269 with the Lead Designer; docs/design/components/ship-travel.md is its handoff.
//
// The film is the approved transit's drawing (./ship-art.mjs, ported unchanged), framed as the pack draws the
// transit poster on sheet 41: across the whole phone, as `background-size: cover`. It never advances the game: it
// takes the window the server published and the match's trusted clock and shows the moment they give, and reaching
// the end only holds the last picture. Its last picture, the still, is the approved poster's frame, which is also the
// "moved" picture and the Reduce motion picture.
//
// Privacy: everything it takes is public or this phone's own setting. It takes no route, position, direction, arm,
// tie, office, weight, choice or destination, and refuses any input it does not know. Its length, beats and picture
// are the same for every outcome, so they say nothing about the course, a tie or when it was chosen (P28).

import { createKit } from '../kit/kit.mjs';
import {
  SHIP, TRANSIT_POSTER, VOID, clamp01, easeOutCubic, f, fxDefs, lerp, letterbox, rand, ship, stars, streaks, transitX, vignette,
} from './ship-art.mjs';

export const SHIP_TRAVEL_VERSION = 'ship-travel-0.1.0';

/** The beats, in ms: the space opens, the ship glides in, cruises, and settles into the still. */
export const TRAVEL_BEATS = Object.freeze({ open: 200, enter: 1200, settle: 1200 });
/** Sheet 41's captions (the pack's nav screen), in the kit's paper pill with the course icon. */
export const CAPTIONS = Object.freeze({ setting: 'Same 15 seconds every round', moved: 'One step on the route · destination hidden' });
/** The film's text alternative: one image to assistive technology. */
export const LABELS = Object.freeze({ setting: 'The ship is travelling. Destination hidden.', moved: 'The ship moved one step. Destination hidden.', concealed: 'Hidden' });
/** Reduce motion: the still, with this fade, and nothing else. */
export const REDUCED_FADE_MS = 80;

export const SHIP_TRAVEL_DEFAULTS = Object.freeze({
  window: null,
  clock: null,
  state: 'setting',
  size: Object.freeze({ width: 390, height: 711 }),
  insets: Object.freeze({ top: 0, bottom: 0 }),
  safe: null,
  caption: true,
  status: 'live',
  reducedMotion: false,
});
const KEYS = Object.freeze(Object.keys(SHIP_TRAVEL_DEFAULTS));
const STATES = Object.freeze(['setting', 'moved']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);

// ── The composition: transitInsert()'s, in the poster's frame ──────
// The values below are transitContent()'s for the insert (ship-art.mjs): the lane is the whole frame and the ship is
// 0.24 of its height. At the end of the film every layer is exactly that function's at the poster's 1200 ms
// (packages/design-tokens/test/ship-travel.test.mjs compares them, element by element).
const W = TRANSIT_POSTER.width, H = TRANSIT_POSTER.height, POSTER_T = TRANSIT_POSTER.t;
const SHIP_H = H * 0.24;
const CY = H / 2;
/** Where the ship rests (the poster's middle of the pass) and where it comes in from (the insert's own entry, off the left edge). */
const REST_X = transitX(0.5, W);
const START_X = transitX(0, W);
const restY = Math.sin(POSTER_T / 320) * H * 0.012 + CY;
/** The two star fields, each in three depths that drift at their own pace (the insert's: 0.08 and 0.34 px a ms, times 0.3 to 1.3). */
const STAR_FIELDS = Object.freeze([
  Object.freeze({ seed: 31, count: Math.round((W * H) / 5200), speed: 0.08 }),
  Object.freeze({ seed: 37, count: Math.round((W * H) / 16000), speed: 0.34 }),
]);
const DEPTHS = 3;
/**
 * The insert's two kinds of streak: across the frame, and the trail behind the ship. `period` is the insert's (its
 * phase on the poster); the film runs them right to left at `pace`, a third of the insert's speed, as it lasts 15 s.
 */
const WIDE = Object.freeze({ lines: Object.freeze({ x: 0, y: H * 0.1, w: W, h: H * 0.8, count: 22, seed: 41, color: '#CFE2FF', width: 1.6, length: 0.22, opacity: 0.22 }), period: 700, pace: 2100 });
const TRAIL = Object.freeze({ lines: Object.freeze({ count: 16, seed: 43, color: '#E8F4FF', width: 2.6, length: 0.42, opacity: 0.5 }), period: 260, pace: 780 });
/** The engines flicker a little while the ship cruises; at the still they burn as on the poster. */
const FLICKER = 0.12;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (v, m) => { const r = v % m; return r < 0 ? r + m : r; };
const phase = v => { const r = v % 1; return r < 0 ? r + 1 : r; };

/** The beats of a window `duration` ms long: enter and settle 1.2 s each, or half the window each when it is shorter than 2.4 s. */
export function travelBeats(duration) {
  const d = Math.max(0, Number(duration) || 0);
  const k = Math.min(1, d / (TRAVEL_BEATS.enter + TRAVEL_BEATS.settle));
  const enter = TRAVEL_BEATS.enter * k, settle = TRAVEL_BEATS.settle * k;
  return { duration: d, enter, settle, cruise: d - enter - settle, settleAt: d - settle };
}

/**
 * The world's clock at film time t: the insert's own time, which the stars, the streaks, the bob and the engines
 * follow. It runs at the film's pace, slows to a stop over the settle, and reads the poster's 1200 ms at the end.
 */
function worldTime(t, b) {
  if (t >= b.duration) return POSTER_T;
  if (b.settle > 0 && t >= b.settleAt) { const u = (t - b.settleAt) / b.settle; return POSTER_T - (b.settle * (1 - u) ** 3) / 3; }
  return POSTER_T - (b.settleAt - t) - b.settle / 3;
}

/**
 * The film at time t (ms into a window `duration` ms long), as plain values: a pure function, the same on every
 * phone. t is clamped to the window. At t = duration it is the still, the approved poster's frame.
 */
export function shipTravelFrame(t, duration = 15000) {
  const b = travelBeats(duration);
  const at = clamp(Number.isFinite(t) ? t : b.duration, 0, b.duration);
  const tau = worldTime(at, b);
  const beat = at >= b.duration ? 'still' : at < b.enter ? 'enter' : at < b.settleAt ? 'cruise' : 'settle';
  const x = at < b.enter ? lerp(START_X, REST_X, easeOutCubic(at / b.enter)) : REST_X;
  const since = tau - POSTER_T;
  const flicker = 0.6 * Math.sin((Math.PI * since) / 190) ** 2 + 0.4 * Math.sin((Math.PI * since) / 123) ** 2;
  return {
    t: at, duration: b.duration, beat, tau,
    open: at >= b.duration ? 1 : clamp01(at / TRAVEL_BEATS.open),
    x, y: CY + Math.sin(tau / 320) * H * 0.012,
    engine: Math.round((1 - FLICKER * flicker) * 100) / 100,
    wide: phase(POSTER_T / WIDE.period - since / WIDE.pace),
    trail: phase(POSTER_T / TRAIL.period - since / TRAIL.pace),
    // Each depth's drift from its place on the poster, right to left as the world's clock runs, wrapped to the frame.
    drift: STAR_FIELDS.flatMap(field => Array.from({ length: DEPTHS }, (_, depth) => wrap(-since * field.speed * (0.3 + (depth + 0.5) / DEPTHS), W))),
  };
}

/** The still: the film's last picture, the approved poster's frame. */
export const STILL = Object.freeze(shipTravelFrame(Infinity));

/**
 * How the poster's frame sits on the host: the whole phone (the host and its insets above and below) covered, as
 * `background-size: cover; background-position: center`. Returns the scale and the host's box in the poster's units.
 */
export function shipTravelFraming(size, insets = { top: 0, bottom: 0 }) {
  const fw = size.width, fh = insets.top + size.height + insets.bottom;
  const k = Math.max(fw / W, fh / H);
  const ox = (fw - W * k) / 2, oy = (fh - H * k) / 2 - insets.top;
  return { k, viewBox: [-ox / k, -oy / k, size.width / k, size.height / k] };
}

// ── The layers' markup, from ship-art.mjs's functions ─────────────

/** The space behind everything: transitContent()'s first rectangle. */
export const SPACE = `<rect x="${f(0)}" y="${f(0)}" width="${f(W)}" height="${f(H)}" fill="${VOID.space}"/>`;

/** The two star fields' circles exactly as stars() draws them on the poster, each field's sorted into its three depths. */
export function starDepths() {
  return STAR_FIELDS.map(field => {
    const circles = stars({ x: 0, y: 0, w: W, h: H, count: field.count, seed: field.seed, t: POSTER_T, drift: [-POSTER_T * field.speed, 0] }).split('<circle').slice(1).map(c => `<circle${c}`);
    const depths = Array.from({ length: DEPTHS }, () => []);
    circles.forEach((circle, i) => depths[Math.min(DEPTHS - 1, Math.floor(rand(field.seed, i, 'z') * DEPTHS))].push(circle));
    return depths.map(list => list.join(''));
  }).flat();
}
/** The streaks at a frame: across the frame, and behind the ship's tail (the trail follows the ship as it comes in). */
export function streakMarkup(frame) {
  const tail = frame.x - SHIP_H * (SHIP.w / SHIP.h) * 0.5;
  return streaks({ ...WIDE.lines, phase: frame.wide })
    + streaks({ ...TRAIL.lines, x: tail - W * 0.55, y: CY - SHIP_H * 0.32, w: W * 0.55, h: SHIP_H * 0.64, phase: frame.trail });
}
/** The ship where it rests on the poster, its engines at `engine`; the film moves this layer as a whole. */
export const shipMarkup = (prefix, engine) => ship(`${prefix}s`, { x: REST_X, y: restY, height: SHIP_H, engine });
/** The front: the insert's filters, vignette, grain and letterbox bars, which never change. */
export const frontMarkup = prefix => fxDefs(prefix) + vignette(prefix, { width: W, height: H, strength: 0.55 })
  + `<rect width="${W}" height="${H}" filter="url(#${prefix}-grain)" opacity="0.4"/>` + letterbox({ width: W, height: H, h: 0.085 * H });

// ── Inputs ────────────────────────────────────────────────────────

const finite = v => typeof v === 'number' && Number.isFinite(v);
const only = (value, keys, what) => {
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TypeError(`${what} takes only ${keys.join(', ')}, not "${key}"`);
};

/** The next inputs: `changes` replace their keys in `current`. Any key the film does not know is refused. */
export function nextShipTravelInput(current, changes = {}) {
  if (changes === null || typeof changes !== 'object' || Array.isArray(changes)) throw new TypeError('The ship travel takes an object of inputs');
  for (const key of Object.keys(changes)) {
    if (!KEYS.includes(key)) throw new TypeError(`The ship travel takes no "${key}". Its inputs are ${KEYS.join(', ')}: public, with no route, position, direction, tie, office or destination`);
  }
  const next = { ...current, ...changes };
  const w = next.window;
  if (w !== null) {
    if (typeof w !== 'object') throw new TypeError('window is null, or { id, startedAt, endsAt }: the published navigation phase');
    only(w, ['id', 'startedAt', 'endsAt'], 'window');
    if (!((typeof w.id === 'string' && w.id) || finite(w.id))) throw new TypeError('window.id is the phase\'s id');
    if (!finite(w.startedAt) || !finite(w.endsAt) || w.endsAt < w.startedAt) throw new TypeError('window.startedAt and endsAt are server milliseconds, endsAt not before startedAt');
  }
  if (next.clock !== null && typeof next.clock?.now !== 'function') throw new TypeError('clock is null, or { now() }: the match\'s trusted server time');
  if (!STATES.includes(next.state)) throw new TypeError(`state is ${STATES.join(' or ')}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`status is ${STATUSES.join(', ')}`);
  if (!next.size || !finite(next.size.width) || !finite(next.size.height) || next.size.width <= 0 || next.size.height <= 0) throw new TypeError('size is { width, height } in CSS px');
  only(next.size, ['width', 'height'], 'size');
  if (!next.insets || !finite(next.insets.top) || !finite(next.insets.bottom) || next.insets.top < 0 || next.insets.bottom < 0) throw new TypeError('insets are { top, bottom } in CSS px, 0 or more');
  only(next.insets, ['top', 'bottom'], 'insets');
  if (next.safe !== null) {
    if (typeof next.safe !== 'object' || !finite(next.safe.top) || !finite(next.safe.bottom) || next.safe.top < 0 || next.safe.bottom < 0) throw new TypeError('safe is null (the device\'s), or { top, bottom } in CSS px: the shell\'s layout().safe');
    only(next.safe, ['top', 'bottom'], 'safe');
  }
  if (typeof next.caption !== 'boolean') throw new TypeError('caption is true or false');
  if (typeof next.reducedMotion !== 'boolean') throw new TypeError('reducedMotion is true or false');
  return Object.freeze({ ...next });
}

// ── The component ─────────────────────────────────────────────────

let mounts = 0;
const SVG = 'http://www.w3.org/2000/svg';

/**
 * Mounts the film in `host`: Frontend's element, the phone shell's stage with a bar, no tabs and `edge: true`, so the
 * film covers the whole phone under the bar's glass, as the pack draws the poster. Returns
 * { update, suspend, resume, frame, dispose, element }. It takes no taps and reports nothing.
 */
export function mountShipTravel(host, input = {}) {
  if (!host?.ownerDocument) throw new TypeError('mountShipTravel needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  let state = nextShipTravelInput(SHIP_TRAVEL_DEFAULTS, input);
  const prefix = `msst${(mounts += 1)}`;
  const kit = createKit(doc);

  const root = doc.createElement('div');
  root.className = 'ms-ship-travel ms-kit';
  root.setAttribute('role', 'img');
  const svg = className => {
    const node = doc.createElementNS(SVG, 'svg');
    node.setAttribute('class', `ms-st-layer ${className}`);
    node.setAttribute('preserveAspectRatio', 'none');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('focusable', 'false');
    return node;
  };
  // The field: space, the stars in their depths (each twice, for the wrap), the streaks.
  const field = svg('ms-st-field');
  field.innerHTML = SPACE + starDepths().map(circles => `<g class="ms-st-depth">${circles}<g transform="translate(${-W} 0)">${circles}</g></g>`).join('') + '<g class="ms-st-streaks"></g>';
  const depths = [...field.querySelectorAll('.ms-st-depth')];
  const streakLayer = field.querySelector('.ms-st-streaks');
  const shipLayer = svg('ms-st-ship');
  const front = svg('ms-st-front');
  front.innerHTML = frontMarkup(prefix);
  const open = doc.createElement('div');
  open.className = 'ms-st-open';
  const caption = doc.createElement('div');
  caption.className = 'ms-st-caption';
  const pill = kit.pill({ text: CAPTIONS.setting, icon: 'course', tone: 'paper' });
  caption.append(pill);
  root.append(field, shipLayer, front, open, caption);
  host.append(root);

  const motionQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const deviceReduced = () => !!motionQuery?.matches;
  let raf = 0, suspended = false, disposed = false;
  // What is drawn, and why: 'clock' (a moment of the window) or 'still' (moved, Reduce motion, no clock or window).
  let drawn = null, drawnBy = null, engineDrawn = null, streaksDrawn = null, framing = null, lastFade = null;

  const reduced = () => state.reducedMotion || deviceReduced();
  const duration = () => (state.window ? state.window.endsAt - state.window.startedAt : null);
  /** The film time the trusted clock gives, inside the window; null without a window or a usable clock. */
  const clockTime = () => {
    if (!state.window || !state.clock) return null;
    const now = Number(state.clock.now());
    return Number.isFinite(now) ? clamp(now - state.window.startedAt, 0, duration()) : null;
  };

  function frameLayout() {
    const next = shipTravelFraming(state.size, state.insets);
    root.style.width = `${state.size.width}px`;
    root.style.height = `${state.size.height}px`;
    root.style.setProperty('--ms-st-below', `${state.insets.bottom}px`);
    // The phone's bottom safe area, as the shell gives it; without one, the device's (ship-travel.css).
    if (state.safe) root.style.setProperty('--ms-st-safe-b', `${state.safe.bottom}px`); else root.style.removeProperty('--ms-st-safe-b');
    const box = next.viewBox.map(v => Math.round(v * 1000) / 1000).join(' ');
    if (!framing || framing.box !== box) for (const layer of [field, shipLayer, front]) layer.setAttribute('viewBox', box);
    framing = { ...next, box };
  }

  function draw(frame, by) {
    for (const [i, depth] of depths.entries()) {
      const value = `translate(${f(frame.drift[i])} 0)`;
      if (depth.getAttribute('transform') !== value) depth.setAttribute('transform', value);
    }
    const lines = streakMarkup(frame);
    if (lines !== streaksDrawn) { streakLayer.innerHTML = lines; streaksDrawn = lines; }
    if (frame.engine !== engineDrawn) { shipLayer.innerHTML = shipMarkup(prefix, frame.engine); engineDrawn = frame.engine; }
    const dx = (frame.x - REST_X) * framing.k, dy = (frame.y - restY) * framing.k;
    const move = Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3 ? '' : `translate(${dx.toFixed(3)}px, ${dy.toFixed(3)}px)`;
    if (shipLayer.style.transform !== move) shipLayer.style.transform = move;
    const cover = String(Math.round((1 - frame.open) * 1000) / 1000);
    if (open.style.opacity !== cover) open.style.opacity = cover;
    drawn = frame;
    drawnBy = by;
  }

  function stopLoop() { if (raf) { win.cancelAnimationFrame(raf); raf = 0; } }
  function tick() {
    raf = 0;
    if (disposed) return;
    const t = clockTime();
    if (t === null) { settle(); return; }
    const frame = shipTravelFrame(t, duration());
    draw(frame, 'clock');
    if (frame.beat !== 'still') raf = win.requestAnimationFrame(tick);
  }

  /** Reduce motion's one fade: 80 ms, each time the still first shows for a window and state. */
  function fade(key) {
    if (key === lastFade) return;
    lastFade = key;
    root.removeAttribute('data-fade');
    if (key === null) return;
    void root.offsetWidth;
    root.setAttribute('data-fade', '');
  }

  /** Puts everything where the current inputs say: concealed, the still, standing still, or on the clock. */
  function settle() {
    stopLoop();
    frameLayout();
    const concealed = state.status === 'concealed';
    root.dataset.state = state.state;
    root.dataset.status = state.status;
    if (state.reducedMotion) root.dataset.motion = 'reduced'; else delete root.dataset.motion;
    root.setAttribute('aria-label', concealed ? LABELS.concealed : LABELS[state.state]);
    // `hidden` as an attribute: the SVG layers have no `hidden` property.
    for (const layer of [field, shipLayer, front, open]) layer.toggleAttribute('hidden', concealed);
    caption.toggleAttribute('hidden', concealed || !state.caption);
    kit.setPill(pill, { text: CAPTIONS[state.state], icon: 'course', tone: 'paper' });
    if (concealed) { fade(null); return; }
    const t = clockTime();
    if (state.state === 'moved' || reduced() || t === null) {
      if (drawnBy !== 'still') draw(shipTravelFrame(Infinity, duration() ?? 15000), 'still');
      fade(reduced() ? `${state.window?.id ?? ''}:${state.state}` : null);
      return;
    }
    fade(null);
    if (suspended || state.status === 'stale') {
      // Stands still where it is; a film that has not drawn the clock's moment yet shows it, once.
      if (drawnBy !== 'clock') draw(shipTravelFrame(t, duration()), 'clock');
      return;
    }
    tick();
  }

  function update(changes = {}) {
    if (disposed) return;
    const next = nextShipTravelInput(state, changes);
    const newWindow = (next.window?.id ?? null) !== (state.window?.id ?? null);
    state = next;
    if (newWindow) { drawn = null; drawnBy = null; }
    settle();
  }
  function suspend() { if (disposed) return; suspended = true; settle(); }
  function resume() { if (disposed) return; suspended = false; settle(); }
  /** What the film shows now, as a plain snapshot; null after dispose(). */
  function frame() {
    if (disposed) return null;
    return {
      window: state.window?.id ?? null,
      t: drawn ? Math.round(drawn.t) : null,
      beat: drawn ? drawn.beat : null,
      still: drawn?.beat === 'still',
      running: raf !== 0,
      state: state.state,
      status: state.status,
      reduced: reduced(),
      shown: state.status !== 'concealed',
    };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stopLoop();
    motionQuery?.removeEventListener?.('change', onMotion);
    root.remove();
  }
  function onMotion() { if (!disposed) settle(); }
  motionQuery?.addEventListener?.('change', onMotion);

  settle();
  return Object.freeze({ update, suspend, resume, frame, dispose, element: root });
}
