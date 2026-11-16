// The end scene: runtime source, Designer's (the owner, 14 and 15 November 2026: one visual source, used by the game
// as it is). The top of sheet 44, the end of a match (#222 item 8): the planet, the ship on its landing beam and the
// "RED WINS" stamp, then the title and the round; when no one wins, "NO WINNER" on the dark field. The interface was
// agreed on #271 with the Lead Designer; docs/design/components/end-scene.md is its handoff.
//
// The arrival is the approved arrival's drawing (./arrival-art.mjs, ported unchanged): at every moment the scene draws
// what arrivalSvg() draws, framed as the pack draws the arrival poster on sheet 44, over the top half of the phone as
// `background-size: cover`, fading to the canvas. Its host is the phone shell's stage edge to edge (`edge: true`, no
// bar, no tabs); sheet 44's Roles list and "Return to lobby" are the screen's, in the shell's cover. It never advances
// the game: it takes the end phase the server published and the match's trusted clock and shows the moment they give,
// and reaching the end only holds the last picture. The still is the approved poster's frame with the stamp and the
// words; it is also the Reduce motion picture.
//
// Larger text (0.1.1): the title block's words grow with the game's text size up to a 20 px root (125 %) and then
// hold (end-scene.css), and layout() says where the block ends, for the Roles list the screen lays under it.
//
// Privacy: everything it takes is public or this phone's own setting: the result, the round and the end phase, which
// the server publishes to everyone at the end. It takes no seat, name, role, team, code or reveal, and refuses any
// input it does not know. It draws a planet only for an arrival (result.reason 'ARRIVAL'), when the destination is
// public.

import { createKit } from '../kit/kit.mjs';
import { clamp01, easeOutCubic, lerp } from '../ship-travel/ship-art.mjs';
import { ARRIVAL_POSTERS, arrivalSvg } from './arrival-art.mjs';

export const END_SCENE_VERSION = 'end-scene-0.1.1';

/**
 * The beats, in ms from the end phase's start. An arrival: the approved film at its own pace, its clock slowing from
 * 3.7 s to a stop on the poster's frame (the film's 4.1 s) at 4.5 s; the stamp lands at 3.6 s and the words rise at
 * 3.9 s. No winner: the dark field; the stamp at 0.3 s, the words at 0.6 s, the still at 1 s. The stamp's punch lasts
 * 240 ms; the words rise 8 px and fade in over 400 ms.
 */
export const END_BEATS = Object.freeze({
  arrival: Object.freeze({ slow: 3700, stamp: 3600, words: 3900, still: 4500 }),
  none: Object.freeze({ stamp: 300, words: 600, still: 1000 }),
  punch: 240,
  rise: 400,
});

/** Sheet 44's words (the pack's `end` screen), and the scene's text alternative. */
export const END_WORDS = Object.freeze({
  stamp: Object.freeze({ Blue: 'BLUE WINS', Red: 'RED WINS', none: 'NO WINNER', alien: 'ALIEN TOO' }),
  title: Object.freeze({ Blue: 'Blue reached Blue Planet', Red: 'Red reached Red Planet', NO_SURVIVORS: 'No survivors', ABORTED: 'Match aborted' }),
  line: Object.freeze({ alien: 'The Alien survived and used Blackhole', ABORTED: 'The host ended the match', round: 'Round' }),
  label: Object.freeze({ Blue: 'Blue wins', Red: 'Red wins', none: 'No winner', alien: 'and the Alien too', over: 'Match over', concealed: 'Hidden' }),
});

/** Reduce motion: the still, with this fade, and nothing else. */
export const REDUCED_FADE_MS = 80;

export const END_SCENE_DEFAULTS = Object.freeze({
  window: null,
  clock: null,
  result: null,
  round: null,
  size: Object.freeze({ width: 390, height: 844 }),
  safe: Object.freeze({ top: 0 }),
  status: 'live',
  reducedMotion: false,
});
const KEYS = Object.freeze(Object.keys(END_SCENE_DEFAULTS));
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const WINNERS = Object.freeze(['Blue', 'Red']);
const REASONS = Object.freeze(['ARRIVAL', 'NO_SURVIVORS', 'ABORTED']);

// ── The words ─────────────────────────────────────────────────────

/**
 * The scene's words for a result, as the pack's `end` screen writes them: the stamp (gold for a win, plain for no
 * winner), the title and the line under it, and the text alternative. Red with the Alien is composed from the same
 * words as the pack's Blue with the Alien. No result: no words.
 */
export function endWords(result, round = null) {
  if (!result) return Object.freeze({ stamp: null, tone: null, title: null, line: null, label: `${END_WORDS.label.over}.` });
  const win = result.reason === 'ARRIVAL' ? result.winner : null;
  const stamp = !win ? END_WORDS.stamp.none : result.alienCoWinner ? `${END_WORDS.stamp[win]} · ${END_WORDS.stamp.alien}` : END_WORDS.stamp[win];
  const title = win ? END_WORDS.title[win] : END_WORDS.title[result.reason];
  const line = result.alienCoWinner ? END_WORDS.line.alien : result.reason === 'ABORTED' ? END_WORDS.line.ABORTED : round === null ? null : `${END_WORDS.line.round} ${round}`;
  const said = !win ? END_WORDS.label.none : result.alienCoWinner ? `${END_WORDS.label[win]}, ${END_WORDS.label.alien}` : END_WORDS.label[win];
  return Object.freeze({ stamp, tone: win ? 'gold' : null, title, line, label: `${[said, title, line].filter(Boolean).join('. ')}.` });
}

// ── Time: the scene as a pure function of the server's time ─────────

/** Both posters are the same frame of their film: 4100 ms of 4200, the display surface, full, 1920 × 1080. */
const POSTER = ARRIVAL_POSTERS.Red;
const W = POSTER.width, H = POSTER.height;
const DRAW = Object.freeze({ surface: POSTER.surface, width: W, height: H, variant: POSTER.variant });

/** The scene's kind for a result: an arrival (a winner reached its planet), no winner, or no result yet. */
export const endSceneKind = result => (!result ? 'empty' : result.reason === 'ARRIVAL' ? 'arrival' : 'none');

/**
 * The film's clock at scene time t: the arrival's own time, 1:1 to 3.7 s, then slowing to a stop (its speed falling
 * evenly to nought) on the poster's 4.1 s at 4.5 s.
 */
export function arrivalTime(t) {
  const { slow, still } = END_BEATS.arrival;
  if (!(t > slow)) return Math.max(0, t);
  if (t >= still) return POSTER.t;
  const u = (t - slow) / (still - slow);
  return slow + (still - slow) * (u - (u * u) / 2);
}

/** The stamp's punch, ms after it begins: it comes down from 1.8 times its size, hits at 0.94 at 160 ms and settles at 1. */
const PUNCH = Object.freeze({ from: 1.8, hit: 0.94, at: 160 });
function stampAt(ms) {
  if (!(ms > 0)) return { opacity: 0, scale: PUNCH.from };
  if (ms >= END_BEATS.punch) return { opacity: 1, scale: 1 };
  if (ms < PUNCH.at) { const u = ms / PUNCH.at; return { opacity: clamp01(u * 2), scale: lerp(PUNCH.from, PUNCH.hit, u ** 3) }; }
  return { opacity: 1, scale: lerp(PUNCH.hit, 1, easeOutCubic((ms - PUNCH.at) / (END_BEATS.punch - PUNCH.at))) };
}
/** The title and the line, ms after they begin: they rise 8 px and fade in. */
function wordsAt(ms) {
  const e = easeOutCubic(clamp01(ms / END_BEATS.rise));
  return { opacity: e, rise: 8 * (1 - e) };
}
const round3 = v => Math.round(v * 1000) / 1000;

/**
 * The scene at time t (ms into the end phase) for a result, as plain values: a pure function, the same on every phone.
 * t is clamped to the scene; t = Infinity, or any t past the scene's length, is the still.
 */
export function endSceneFrame(t, result = null) {
  const kind = endSceneKind(result);
  const beats = kind === 'arrival' ? END_BEATS.arrival : END_BEATS.none;
  const end = kind === 'empty' ? 0 : beats.still;
  const at = Math.min(end, Math.max(0, Number.isFinite(t) ? t : end));
  const still = at >= end;
  const stamp = kind === 'empty' ? { opacity: 0, scale: 1 } : stampAt(still ? END_BEATS.punch : at - beats.stamp);
  const words = kind === 'empty' ? { opacity: 0, rise: 0 } : wordsAt(still ? END_BEATS.rise : at - beats.words);
  return {
    t: at,
    kind,
    side: kind === 'arrival' ? result.winner : null,
    beat: still ? 'still' : kind === 'arrival' ? (at < beats.slow ? 'film' : 'settle') : 'field',
    tau: kind === 'arrival' ? (still ? POSTER.t : arrivalTime(at)) : null,
    still,
    stamp: { opacity: round3(stamp.opacity), scale: round3(stamp.scale) },
    words: { opacity: round3(words.opacity), rise: round3(words.rise) },
  };
}

/**
 * How the poster's frame sits on the hero, the top half of the host (the whole phone): covered, as
 * `background-size: cover; background-position: center`. Returns the scale, the hero's box and its box in the
 * frame's units.
 */
export function endSceneFraming(size) {
  const hero = { width: size.width, height: size.height / 2 };
  const k = Math.max(hero.width / W, hero.height / H);
  const ox = (hero.width - W * k) / 2, oy = (hero.height - H * k) / 2;
  return { k, hero, viewBox: [-ox / k, -oy / k, hero.width / k, hero.height / k] };
}

// ── The layers' markup: arrivalSvg()'s own ─────────────────────────

/** The ids arrivalSvg() gives its display surface ('nard', 'nabd'), which a mount replaces with its own. */
export const arrivalPrefix = side => `na${side[0].toLowerCase()}${POSTER.surface[0]}`;

/**
 * The arrival at film time tau, exactly as the approved arrivalSvg() draws it on its display surface at 1920 × 1080,
 * in two parts: the body (the space, and the stars, planet, beam and ship as they fade in), which moves, and the front
 * (the filters, vignette, grain and letterbox), which never changes. Joined in arrivalSvg()'s order they are its frame;
 * `prefix` replaces its ids, so two scenes on one page never share one.
 */
export function arrivalLayers(side, tau, prefix = arrivalPrefix(side)) {
  const own = arrivalPrefix(side);
  const { svg } = arrivalSvg(tau, side, DRAW);
  const open = svg.indexOf('>') + 1;
  const defsEnd = svg.indexOf('</defs>', open) + '</defs>'.length;
  const frontAt = svg.indexOf(`<defs><radialGradient id="${own}-vignette"`, defsEnd);
  const close = svg.lastIndexOf('</svg>');
  if (open <= 0 || defsEnd <= open || frontAt < defsEnd || close < frontAt) throw new Error('arrivalSvg() is not the drawing this scene was built on');
  const ids = text => (prefix === own ? text : text.replaceAll(own, prefix));
  return { body: ids(svg.slice(defsEnd, frontAt)), front: ids(svg.slice(open, defsEnd) + svg.slice(frontAt, close)) };
}

// ── Inputs ────────────────────────────────────────────────────────

const finite = v => typeof v === 'number' && Number.isFinite(v);
const only = (value, keys, what) => {
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TypeError(`${what} takes only ${keys.join(', ')}, not "${key}"`);
};
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The next inputs: `changes` replace their keys in `current`. Any key the scene does not know is refused, at every level. */
export function nextEndSceneInput(current, changes = {}) {
  if (!plain(changes)) throw new TypeError('The end scene takes an object of inputs');
  for (const key of Object.keys(changes)) {
    if (!KEYS.includes(key)) throw new TypeError(`The end scene takes no "${key}". Its inputs are ${KEYS.join(', ')}: public, with no seat, name, role, team, code or reveal`);
  }
  const next = { ...current, ...changes };
  const w = next.window;
  if (w !== null) {
    if (!plain(w)) throw new TypeError('window is null, or { id, startedAt }: the published FINISHED or ABORTED phase');
    only(w, ['id', 'startedAt'], 'window');
    if (!((typeof w.id === 'string' && w.id) || finite(w.id))) throw new TypeError('window.id is the phase\'s id');
    if (!finite(w.startedAt)) throw new TypeError('window.startedAt is the phase\'s start, in server milliseconds');
  }
  if (next.clock !== null && typeof next.clock?.now !== 'function') throw new TypeError('clock is null, or { now() }: the match\'s trusted server time');
  const r = next.result;
  if (r !== null) {
    if (!plain(r)) throw new TypeError('result is null, or { winner, reason, alienCoWinner }: the public view\'s result');
    only(r, ['winner', 'reason', 'alienCoWinner'], 'result');
    if (!(r.winner === null || WINNERS.includes(r.winner))) throw new TypeError('result.winner is Blue, Red or null');
    if (!REASONS.includes(r.reason)) throw new TypeError(`result.reason is ${REASONS.join(', ')}`);
    if (typeof r.alienCoWinner !== 'boolean') throw new TypeError('result.alienCoWinner is true or false');
    // The contract's rule (PlanetResultSchema): a winner only on a planet arrival, and the Alien only beside a winner.
    if (r.reason === 'ARRIVAL' ? r.winner === null : r.winner !== null || r.alienCoWinner) {
      throw new TypeError('result: a winner only on a planet arrival, and the Alien only beside a winner (the contract\'s PlanetResultSchema)');
    }
  }
  if (next.round !== null && !(Number.isInteger(next.round) && next.round >= 1)) throw new TypeError('round is null, or the match\'s round: a whole number from 1');
  if (!plain(next.size) || !finite(next.size.width) || !finite(next.size.height) || next.size.width <= 0 || next.size.height <= 0) throw new TypeError('size is { width, height } in CSS px: the whole phone');
  only(next.size, ['width', 'height'], 'size');
  if (!plain(next.safe) || !finite(next.safe.top) || next.safe.top < 0) throw new TypeError('safe is { top }: the phone\'s top safe area in CSS px, the shell\'s layout().safe.top');
  only(next.safe, ['top'], 'safe');
  if (!STATUSES.includes(next.status)) throw new TypeError(`status is ${STATUSES.join(', ')}`);
  if (typeof next.reducedMotion !== 'boolean') throw new TypeError('reducedMotion is true or false');
  return Object.freeze({
    ...next,
    window: w && Object.freeze({ id: w.id, startedAt: w.startedAt }),
    result: r && Object.freeze({ winner: r.winner, reason: r.reason, alienCoWinner: r.alienCoWinner }),
    size: Object.freeze({ width: next.size.width, height: next.size.height }),
    safe: Object.freeze({ top: next.safe.top }),
  });
}

// ── The component ─────────────────────────────────────────────────

let mounts = 0;
const SVG = 'http://www.w3.org/2000/svg';

/**
 * Mounts the scene in `host`: Frontend's element, the phone shell's stage with no bar, no tabs and `edge: true`, so the
 * scene covers the whole phone, as the pack draws sheet 44. Returns { update, suspend, resume, frame, layout, dispose,
 * element }. It takes no taps and reports nothing: layout() is read, never called back.
 */
export function mountEndScene(host, input = {}) {
  if (!host?.ownerDocument) throw new TypeError('mountEndScene needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  let state = nextEndSceneInput(END_SCENE_DEFAULTS, input);
  const prefix = `mses${(mounts += 1)}`;
  const kit = createKit(doc);

  const root = doc.createElement('div');
  root.className = 'ms-end-scene ms-kit';
  root.setAttribute('role', 'img');
  // The hero: the arrival's two layers (or the dark field), under the pack's fade to the canvas.
  const hero = doc.createElement('div');
  hero.className = 'ms-es-hero';
  const layer = name => {
    const node = doc.createElementNS(SVG, 'svg');
    node.setAttribute('class', `ms-es-layer ${name}`);
    node.setAttribute('preserveAspectRatio', 'none');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('focusable', 'false');
    return node;
  };
  const body = layer('ms-es-body'), front = layer('ms-es-front');
  front.innerHTML = arrivalLayers('Red', POSTER.t, prefix).front;
  hero.append(body, front);
  // The title block: the stamp (its punch on the wrapper, the kit's stamp keeping its own tilt), the title, the line.
  const title = doc.createElement('div');
  title.className = 'ms-es-title';
  const stampBox = doc.createElement('span');
  stampBox.className = 'ms-es-stamp';
  const stamp = kit.stamp({ text: '', tone: null });
  stampBox.append(stamp);
  const heading = doc.createElement('p');
  heading.className = 'ms-es-heading';
  const line = doc.createElement('p');
  line.className = 'ms-es-line';
  title.append(stampBox, heading, line);
  root.append(hero, title);
  host.append(root);

  const motionQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const deviceReduced = () => !!motionQuery?.matches;
  let raf = 0, suspended = false, disposed = false;
  // What is drawn, and why: 'clock' (a moment of the scene) or 'still' (Reduce motion, no clock or window).
  let drawn = null, drawnBy = null, drawnKey = null, bodyDrawn = null, framing = null, lastFade = null;

  const reduced = () => state.reducedMotion || deviceReduced();
  const kindKey = () => `${endSceneKind(state.result)}:${state.result?.winner ?? ''}`;
  /** The scene time the trusted clock gives; null without a window or a usable clock. */
  const clockTime = () => {
    if (!state.window || !state.clock) return null;
    const now = Number(state.clock.now());
    return Number.isFinite(now) ? Math.max(0, now - state.window.startedAt) : null;
  };
  const setStyle = (node, name, value) => { if (node.style[name] !== value) node.style[name] = value; };

  function frameLayout() {
    const next = endSceneFraming(state.size);
    root.style.width = `${state.size.width}px`;
    root.style.height = `${state.size.height}px`;
    // The phone's top safe area, as the shell gives it: the title block sits at safe.top + 34 % (end-scene.css).
    root.style.setProperty('--ms-es-safe-t', `${state.safe.top}px`);
    const box = next.viewBox.map(v => Math.round(v * 1000) / 1000).join(' ');
    if (!framing || framing.box !== box) for (const node of [body, front]) node.setAttribute('viewBox', box);
    framing = { ...next, box };
  }

  function paintWords() {
    const words = endWords(state.result, state.round);
    kit.setStamp(stamp, { text: words.stamp ?? '', tone: words.tone });
    heading.textContent = words.title ?? '';
    line.textContent = words.line ?? '';
    line.toggleAttribute('hidden', !words.line);
    return words;
  }

  function draw(frame, by) {
    const arrival = frame.kind === 'arrival';
    if (hero.dataset.field !== (arrival ? 'arrival' : 'none')) hero.dataset.field = arrival ? 'arrival' : 'none';
    body.toggleAttribute('hidden', !arrival);
    front.toggleAttribute('hidden', !arrival);
    if (arrival) {
      const key = `${frame.side}:${frame.tau}`;
      if (key !== bodyDrawn) { body.innerHTML = arrivalLayers(frame.side, frame.tau, prefix).body; bodyDrawn = key; }
    } else if (bodyDrawn !== null) {
      // No arrival: no planet is kept, even hidden.
      body.replaceChildren();
      bodyDrawn = null;
    }
    // At rest (the still) nothing is set inline: the title block lies exactly as the pack lays it.
    setStyle(stampBox, 'opacity', frame.stamp.opacity === 1 ? '' : String(frame.stamp.opacity));
    setStyle(stampBox, 'transform', frame.stamp.scale === 1 ? '' : `scale(${frame.stamp.scale})`);
    for (const node of [heading, line]) {
      setStyle(node, 'opacity', frame.words.opacity === 1 ? '' : String(frame.words.opacity));
      setStyle(node, 'transform', frame.words.rise === 0 ? '' : `translateY(${frame.words.rise}px)`);
    }
    drawn = frame;
    drawnBy = by;
    drawnKey = kindKey();
  }

  function stopLoop() { if (raf) { win.cancelAnimationFrame(raf); raf = 0; } }
  function tick() {
    raf = 0;
    if (disposed) return;
    const t = clockTime();
    if (t === null) { settle(); return; }
    const frame = endSceneFrame(t, state.result);
    draw(frame, 'clock');
    if (!frame.still) raf = win.requestAnimationFrame(tick);
  }

  /** Reduce motion's one fade: 80 ms, each time the still first shows for a phase and result. */
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
    const words = paintWords();
    root.dataset.kind = endSceneKind(state.result);
    root.dataset.status = state.status;
    if (state.reducedMotion) root.dataset.motion = 'reduced'; else delete root.dataset.motion;
    root.setAttribute('aria-label', concealed ? END_WORDS.label.concealed : words.label);
    hero.toggleAttribute('hidden', concealed);
    title.toggleAttribute('hidden', concealed || !words.stamp);
    if (concealed) { fade(null); return; }
    const t = clockTime();
    if (reduced() || t === null) {
      if (drawnBy !== 'still' || drawnKey !== kindKey()) draw(endSceneFrame(Infinity, state.result), 'still');
      fade(reduced() ? `${state.window?.id ?? ''}:${kindKey()}` : null);
      return;
    }
    fade(null);
    if (suspended || state.status === 'stale') {
      // Stands still where it is; a scene that has not drawn the clock's moment yet shows it, once.
      if (drawnBy !== 'clock' || drawnKey !== kindKey()) draw(endSceneFrame(t, state.result), 'clock');
      return;
    }
    tick();
  }

  function update(changes = {}) {
    if (disposed) return;
    const next = nextEndSceneInput(state, changes);
    const newWindow = (next.window?.id ?? null) !== (state.window?.id ?? null);
    state = next;
    if (newWindow) { drawn = null; drawnBy = null; drawnKey = null; }
    settle();
  }
  function suspend() { if (disposed) return; suspended = true; settle(); }
  function resume() { if (disposed) return; suspended = false; settle(); }
  /** What the scene shows now, as a plain snapshot; null after dispose(). */
  function frame() {
    if (disposed) return null;
    return {
      window: state.window?.id ?? null,
      t: drawn ? Math.round(drawn.t) : null,
      kind: endSceneKind(state.result),
      side: drawn?.side ?? null,
      beat: drawn ? drawn.beat : null,
      tau: drawn?.tau === null || drawn?.tau === undefined ? null : round3(drawn.tau),
      still: !!drawn?.still,
      running: raf !== 0,
      status: state.status,
      reduced: reduced(),
      shown: state.status !== 'concealed',
    };
  }
  /**
   * Where the title block ends, for what the screen lays under it (sheet 44's Roles list, in the shell's cover):
   * { titleBottom }, in CSS px from the scene's top, which is the stage's. It is measured when it is asked for, so it
   * is current after a change of size, safe area or text size, and it is the block at rest: the stamp's punch and
   * the words' rise are transforms, which do not move it. titleBottom is null while no title block is drawn
   * (concealed, no result) or the scene is not laid out; layout() is null after dispose().
   */
  function layout() {
    if (disposed) return null;
    const box = root.getBoundingClientRect();
    if (title.hasAttribute('hidden') || !(box.height > 0)) return { titleBottom: null };
    // The scene's own height against its box: whatever scale an ancestor puts on the phone, the answer is in CSS px.
    const k = box.height / state.size.height;
    return { titleBottom: Math.round(((title.getBoundingClientRect().bottom - box.top) / k) * 100) / 100 };
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
  return Object.freeze({ update, suspend, resume, frame, layout, dispose, element: root });
}
