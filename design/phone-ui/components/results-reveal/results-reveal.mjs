// The results reveal: the arrival of the vote's result window over the room. The pack's handoff gives it in one
// line (docs/design/phone-ui-handoff.md, Motion): "The window rises over the room in 320 ms, then holds for 5 s";
// with Reduce motion, an 80 ms fade. Runtime source, Designer's (the owner, 14 and 15 November 2026: Designer
// builds each visual component once, in design/; the game and the preview use it as it is).
//
// How Frontend uses it, for the VOTE_RESULT phase:
//   const reveal = mountResultsReveal(shell.slot('cover'), { window: { id, startedAt, endsAt }, clock });
//   const result = mountVoteResult(reveal.host, input);   // the result window, unchanged, in the reveal's host
//   …
//   result.dispose(); reveal.dispose();                   // when the phase leaves VOTE_RESULT
//
// The reveal hosts the window and moves only its own host, as one layer. The window's layout, styles and DOM are
// untouched, and at rest nothing is set on the host: the window lies exactly as mountVoteResult() lays it in the
// cover.
//
// What it never does: read the tally, the outcome, a seat or a word; keep a clock of its own; advance the game.
// It takes the published phase and the match's trusted clock and shows that moment. A phone that joins at 120 ms
// sees the rise from its 120 ms; one that joins after 320 ms sees the window at rest at once. It has no callback,
// no skip and no exit: the window leaves when the phase does, and Frontend disposes it.
//
// How it moves: the rise is one Web Animation of the host's transform, sought to the trusted clock's moment on
// mount, on update(), on resume() and when the phone is live again, and once more as the browser starts it (its
// first frame), so a long frame while the window is being built does not leave the rise behind the clock. The
// browser runs the rest of those 320 ms; the component asks the page for no frame. Past 320 ms there is no
// animation at all.

export const RESULTS_REVEAL_VERSION = 'results-reveal-0.1.0';

/** The beats, in ms of reveal time: the rise (the motion tokens' publicImpact), then the window rests. */
export const REVEAL_BEATS = Object.freeze({ rise: Object.freeze([0, 320]) });
/** The rise's curve: the motion tokens' settle, the pack's sheet curve. */
export const REVEAL_EASING = Object.freeze({ css: 'cubic-bezier(0.16, 0.84, 0.3, 1)', points: Object.freeze([0.16, 0.84, 0.3, 1]) });
/** Reduce motion's one fade, in ms (the motion tokens' reducedMotionFade). */
export const REDUCED_FADE_MS = 80;

/** Every input, with its default. All are public, or this phone's own setting: nothing of the result is taken. */
export const RESULTS_REVEAL_DEFAULTS = Object.freeze({
  // The published VOTE_RESULT phase: { id, startedAt, endsAt } in server ms. A new id is a new arrival. null: at rest.
  window: null,
  // The match's trusted server time: { now() }. null: at rest.
  clock: null,
  // 'live', 'stale' (reconnecting: stands still) or 'concealed' (nothing drawn), as the shell and the window.
  status: 'live',
  // The game's Reduce motion. The device's prefers-reduced-motion is honoured as well.
  reducedMotion: false,
});

const KEYS = Object.freeze(Object.keys(RESULTS_REVEAL_DEFAULTS));
const WINDOW_KEYS = Object.freeze(['id', 'startedAt', 'endsAt']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const round3 = v => Math.round(v * 1000) / 1000;

/** The next inputs: `changes` replace their keys in `current`. Any key the reveal does not know is refused, in `window` too. */
export function nextResultsRevealInput(current, changes = {}) {
  if (!plain(changes)) throw new TypeError('The results reveal takes an object of inputs');
  for (const key of Object.keys(changes)) {
    if (!KEYS.includes(key)) throw new TypeError(`The results reveal takes no "${key}". Its inputs are ${KEYS.join(', ')}: the phase and the clock, and nothing of the result`);
  }
  const next = { ...current, ...changes };
  const w = next.window;
  if (w !== null) {
    if (!plain(w)) throw new TypeError('window is null, or { id, startedAt, endsAt }: the published VOTE_RESULT phase');
    for (const key of Object.keys(w)) if (!WINDOW_KEYS.includes(key)) throw new TypeError(`window takes only ${WINDOW_KEYS.join(', ')}, not "${key}"`);
    if (!((typeof w.id === 'string' && w.id) || finite(w.id))) throw new TypeError('window.id is the phase\'s id');
    if (!finite(w.startedAt)) throw new TypeError('window.startedAt is the phase\'s start, in server milliseconds');
    if (!finite(w.endsAt) || w.endsAt <= w.startedAt) throw new TypeError('window.endsAt is the phase\'s end, in server milliseconds, after its start');
  }
  if (next.clock !== null && typeof next.clock?.now !== 'function') throw new TypeError('clock is null, or { now() }: the match\'s trusted server time');
  if (!STATUSES.includes(next.status)) throw new TypeError(`status is ${STATUSES.join(', ')}`);
  if (typeof next.reducedMotion !== 'boolean') throw new TypeError('reducedMotion is true or false');
  return Object.freeze({ ...next, window: w && Object.freeze({ id: w.id, startedAt: w.startedAt, endsAt: w.endsAt }) });
}

/** The reveal's time: the trusted clock's moment inside the phase, in ms from its start, never past its end. */
export function revealTime(window, now) {
  if (!window || !Number.isFinite(now)) return null;
  return Math.min(Math.max(0, now - window.startedAt), window.endsAt - window.startedAt);
}

/** y of a CSS cubic-bezier(x1, y1, x2, y2) at x, both 0..1. */
function bezier([x1, y1, x2, y2], x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const at = u => ((ax * u + bx) * u + cx) * u;
  // The curve's own parameter for this x: its x only ever grows, so halving the range finds it.
  let lo = 0, hi = 1, u = x;
  for (let i = 0; i < 48; i += 1) {
    const e = at(u) - x;
    if (Math.abs(e) < 1e-9) break;
    if (e < 0) lo = u; else hi = u;
    u = (lo + hi) / 2;
  }
  return ((ay * u + by) * u + cy) * u;
}

/**
 * The reveal at `t` ms of reveal time, as a pure function: { t, beat, offset, still }. `offset` is the host's
 * distance below its place as a share of its own height: 1 at the start, 0 at rest. A time that is not a number
 * is the rest.
 */
export function revealFrame(t) {
  const end = REVEAL_BEATS.rise[1];
  const time = Number.isFinite(t) ? Math.max(0, t) : Infinity;
  if (time >= end) return Object.freeze({ t: time, beat: 'rest', offset: 0, still: true });
  return Object.freeze({ t: time, beat: 'rise', offset: 1 - bezier(REVEAL_EASING.points, time / end), still: false });
}

/**
 * Mounts the reveal in `target` (the shell's cover, `shell.slot('cover')`). It appends one element, the host,
 * which fills the cover and takes no taps; the result window is mounted in it (`reveal.host`). Returns
 * { host, element, update, suspend, resume, frame, dispose }. Dispose the window first, then the reveal.
 */
export function mountResultsReveal(target, input = {}) {
  if (!target?.ownerDocument) throw new TypeError('The results reveal needs an element to mount in: the shell\'s cover');
  const doc = target.ownerDocument, win = doc.defaultView;
  let state = nextResultsRevealInput(RESULTS_REVEAL_DEFAULTS, input);

  // The host has no role and no name: to assistive technology the reveal is nothing, and the window in it is
  // in the page and readable from its first moment.
  const host = doc.createElement('div');
  host.className = 'ms-results-reveal';
  target.append(host);

  const motionQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const reduced = () => state.reducedMotion || !!motionQuery?.matches;
  const canAnimate = typeof host.animate === 'function';
  // One animation at most: the rise, or Reduce motion's fade.
  let animation = null, moving = null;
  // The phase the window has shown for on this phone: Reduce motion's fade is given once, when it first shows.
  let shownFor = null;
  let suspended = false, disposed = false;

  /** The reveal time the trusted clock gives; null without a phase or a usable clock. */
  const clockTime = () => (state.window && state.clock ? revealTime(state.window, Number(state.clock.now())) : null);

  function drop() {
    if (!animation) return;
    const old = animation;
    animation = null; moving = null;
    old.onfinish = null;
    old.cancel();
  }
  function start(kind, keyframes, timing) {
    drop();
    animation = host.animate(keyframes, { ...timing, fill: 'none' });
    moving = kind;
    const mine = animation;
    // Finished, it is let go: at rest nothing is set and nothing runs.
    mine.onfinish = () => { if (animation === mine) { animation = null; moving = null; } };
  }
  /** The rise at `t`, running on from there or held there. Kept and sought: never started twice for a moment. */
  function rise(t, hold) {
    if (moving !== 'rise') start('rise', [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: REVEAL_BEATS.rise[1], easing: REVEAL_EASING.css });
    // Held: paused first, then sought, which holds it at exactly `t` now (a pause alone takes hold a frame later).
    if (hold) { animation.pause(); animation.currentTime = t; return; }
    animation.currentTime = t;
    animation.play();
    // The browser starts the animation at its next frame. If building the window made that frame a long one, the
    // clock has moved on: the rise is put at the clock's moment again as it starts, before that frame is drawn.
    const mine = animation;
    mine.ready.then(() => {
      if (disposed || animation !== mine || moving !== 'rise' || mine.playState !== 'running') return;
      const now = clockTime();
      if (now === null || now >= REVEAL_BEATS.rise[1]) drop(); else mine.currentTime = now;
    }, () => {});
  }

  /** Puts the host where the inputs say: hidden, at rest, on the rise at the clock's moment, or standing still. */
  function settle() {
    host.dataset.status = state.status;
    if (state.reducedMotion) host.dataset.motion = 'reduced'; else delete host.dataset.motion;
    const concealed = state.status === 'concealed';
    host.hidden = concealed;
    if (concealed) { drop(); return; }
    const phase = state.window ? String(state.window.id) : null;
    const first = phase !== null && shownFor !== phase;
    if (phase !== null) shownFor = phase;
    const still = suspended || state.status === 'stale';
    if (reduced()) {
      // At rest, with one fade when the window first shows for a phase. A phone standing still does not fade.
      if (moving === 'rise' || (still && moving === 'fade')) drop();
      if (first && !still && canAnimate) start('fade', [{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FADE_MS, easing: 'linear' });
      return;
    }
    if (moving === 'fade') drop();
    const t = clockTime();
    // No phase or clock, or past the rise: at rest, with nothing set and nothing running.
    if (t === null || t >= REVEAL_BEATS.rise[1] || !canAnimate) { drop(); return; }
    // Suspended, it holds the clock's moment. Reconnecting, it stands where it is; one that has not shown the
    // clock's moment yet shows it, once.
    if (suspended) rise(t, true);
    else if (state.status === 'stale') { if (moving === 'rise') rise(Number(animation.currentTime ?? t), true); else rise(t, true); }
    else rise(t, false);
  }

  function update(changes = {}) {
    if (disposed) return;
    state = nextResultsRevealInput(state, changes);
    settle();
  }
  function suspend() { if (disposed) return; suspended = true; settle(); }
  function resume() { if (disposed) return; suspended = false; settle(); }

  /** What the reveal shows now, as a plain snapshot; null after dispose(). */
  function frame() {
    if (disposed) return null;
    const rising = moving === 'rise' && animation !== null;
    const at = rising ? Number(animation.currentTime ?? 0) : null;
    const t = rising ? at : clockTime();
    return {
      window: state.window?.id ?? null,
      t: t === null ? null : Math.round(t),
      beat: rising ? 'rise' : 'rest',
      offset: rising ? round3(revealFrame(at).offset) : 0,
      still: !rising,
      running: animation !== null && animation.playState === 'running',
      status: state.status,
      reduced: reduced(),
      shown: state.status !== 'concealed',
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    drop();
    motionQuery?.removeEventListener?.('change', motionChanged);
    // The host goes, and anything left in it.
    host.remove();
  }
  /** The device's Reduce motion turned on or off. */
  function motionChanged() { if (!disposed) settle(); }
  motionQuery?.addEventListener?.('change', motionChanged);

  settle();
  return Object.freeze({ host, element: host, update, suspend, resume, frame, dispose });
}
