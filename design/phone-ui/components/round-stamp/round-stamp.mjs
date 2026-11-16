// The round stamp: the "ROUND 1" stamp that lands over the room as Round 1 begins. The pack draws it once, the last
// frame of sheet 19 ("Round 1 begins": design/phone-ui/prototype/screens-game.mjs, the room screen's stamp=round1
// state): the pack's gold stamp, large, centred in the phone. Runtime source, Designer's (the owner, 14 and 15
// November 2026: Designer builds each visual component once, in design/; the game and the preview use it as it is).
// The interface was agreed with the Lead Designer on #288 (16 November 2026).
//
// How Frontend uses it, over the room view, when the server's view first shows the round:
//   const stamp = mountRoundStamp(shell.slot('cover'), { round: view.round, window: { id: phase.id, startedAt: phase.startedAt }, clock });
//   …
//   stamp.dispose();   // any time after it has gone, or when the room view leaves
//
// Which phase the stamp belongs to is Frontend's to pass: the round's first phase that shows the room view. The
// component only reads the `window` it is given.
//
// What it never does: read a turn, a seat, a role or anything of this viewer's; keep a clock of its own; take a tap;
// advance or delay the game. It has no callback and no skip: the server's phase has already begun when it shows.
// A phone that joins part-way sees the stamp from its moment; one that joins after it has gone sees no stamp.
//
// How it moves: one Web Animation of the stamp's size and strength over its whole length (1,400 ms), sought to the
// trusted clock's moment on mount, on update(), on resume() and when the phone is live again, and once more as the
// browser starts it. The browser runs the rest; the component asks the page for no frame and sets no timer. Outside
// the animation the stamp is not drawn, so when it ends nothing is left to clear.

import { createKit } from '../kit/kit.mjs';

export const ROUND_STAMP_VERSION = 'round-stamp-0.1.0';

/**
 * The beats, in ms of stamp time. It lands (the pack's "Stamp snap, 120 ms": the motion tokens' registrationStamp),
 * stands, and fades (the tokens' cardTransition, 220 ms); from `gone` nothing is drawn. The length is a constant of
 * this component, agreed with the Lead on #288: the pack gives the stamp no time.
 */
export const ROUND_STAMP_BEATS = Object.freeze({ snap: Object.freeze([0, 120]), hold: Object.freeze([120, 1180]), leave: Object.freeze([1180, 1400]), gone: 1400 });
/** Reduce motion: an 80 ms fade in (the tokens' reducedMotionFade), the stamp standing, an 80 ms fade out, gone at the same moment. */
export const ROUND_STAMP_REDUCED = Object.freeze({ in: Object.freeze([0, 80]), hold: Object.freeze([80, 1320]), leave: Object.freeze([1320, 1400]), gone: 1400 });
/** The landing's curve (the tokens' snap: a little past its size, then settling) and the fade's (the tokens' standard). */
export const ROUND_STAMP_EASING = Object.freeze({
  snap: Object.freeze({ css: 'cubic-bezier(0.2, 1.3, 0.4, 1)', points: Object.freeze([0.2, 1.3, 0.4, 1]) }),
  leave: Object.freeze({ css: 'cubic-bezier(0.2, 0, 0, 1)', points: Object.freeze([0.2, 0, 0, 1]) }),
});
/** The stamp begins its landing this many times its size, and clear. */
export const ROUND_STAMP_FROM = 1.6;
/** The stamp's words. The kit's stamp draws them in capitals, as the pack writes "ROUND 1". */
export const ROUND_STAMP_WORDS = Object.freeze({ round: n => `Round ${n}` });

/** Every input, with its default. All are public, or this phone's own setting. */
export const ROUND_STAMP_DEFAULTS = Object.freeze({
  // The round to name: a whole number from 1 (the public view's `round`). null: nothing is drawn.
  round: null,
  // The public phase the stamp belongs to: { id, startedAt } in server ms. A new id is a new stamp. null: nothing is drawn.
  window: null,
  // The match's trusted server time: { now() }. null: nothing is drawn.
  clock: null,
  // 'live', 'stale' (reconnecting: stands still) or 'concealed' (nothing drawn), as the shell.
  status: 'live',
  // The game's Reduce motion. The device's prefers-reduced-motion is honoured as well.
  reducedMotion: false,
});

const KEYS = Object.freeze(Object.keys(ROUND_STAMP_DEFAULTS));
const WINDOW_KEYS = Object.freeze(['id', 'startedAt']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const LENGTH = ROUND_STAMP_BEATS.gone;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const round3 = v => Math.round(v * 1000) / 1000;
const clamp01 = v => Math.min(1, Math.max(0, v));

/** The next inputs: `changes` replace their keys in `current`. Any key the stamp does not know is refused, in `window` too. */
export function nextRoundStampInput(current, changes = {}) {
  if (!plain(changes)) throw new TypeError('The round stamp takes an object of inputs');
  for (const key of Object.keys(changes)) {
    if (!KEYS.includes(key)) throw new TypeError(`The round stamp takes no "${key}". Its inputs are ${KEYS.join(', ')}: the round, its phase and the clock, and nothing of a player`);
  }
  const next = { ...current, ...changes };
  if (next.round !== null && !(Number.isInteger(next.round) && next.round >= 1)) throw new TypeError('round is null, or the match\'s round: a whole number from 1');
  const w = next.window;
  if (w !== null) {
    if (!plain(w)) throw new TypeError('window is null, or { id, startedAt }: the public phase the stamp belongs to');
    for (const key of Object.keys(w)) if (!WINDOW_KEYS.includes(key)) throw new TypeError(`window takes only ${WINDOW_KEYS.join(', ')}, not "${key}"`);
    if (!((typeof w.id === 'string' && w.id) || finite(w.id))) throw new TypeError('window.id is the phase\'s id');
    if (!finite(w.startedAt)) throw new TypeError('window.startedAt is the phase\'s start, in server milliseconds');
  }
  if (next.clock !== null && typeof next.clock?.now !== 'function') throw new TypeError('clock is null, or { now() }: the match\'s trusted server time');
  if (!STATUSES.includes(next.status)) throw new TypeError(`status is ${STATUSES.join(', ')}`);
  if (typeof next.reducedMotion !== 'boolean') throw new TypeError('reducedMotion is true or false');
  return Object.freeze({ ...next, window: w && Object.freeze({ id: w.id, startedAt: w.startedAt }) });
}

/** The stamp's time: the trusted clock's moment since the phase began, in ms, never before its start. */
export function roundStampTime(window, now) {
  if (!window || !Number.isFinite(now)) return null;
  return Math.max(0, now - window.startedAt);
}

/** y of a CSS cubic-bezier(x1, y1, x2, y2) at x in 0..1. */
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
 * The stamp at `t` ms of stamp time, as a pure function: { t, beat, scale, opacity }. `beat` is 'snap', 'hold',
 * 'leave' or 'gone' ('in' for Reduce motion's fade in). `scale` is the stamp's size as a share of its own; `opacity`
 * 0..1. A time that is not a number is gone.
 */
export function roundStampFrame(t, { reduced = false } = {}) {
  const time = Number.isFinite(t) ? Math.max(0, t) : Infinity;
  if (time >= LENGTH) return Object.freeze({ t: time, beat: 'gone', scale: 1, opacity: 0 });
  if (reduced) {
    const { in: [, shown], leave: [leaving, gone] } = ROUND_STAMP_REDUCED;
    if (time < shown) return Object.freeze({ t: time, beat: 'in', scale: 1, opacity: time / shown });
    if (time < leaving) return Object.freeze({ t: time, beat: 'hold', scale: 1, opacity: 1 });
    return Object.freeze({ t: time, beat: 'leave', scale: 1, opacity: 1 - (time - leaving) / (gone - leaving) });
  }
  const { snap: [, landed], leave: [leaving, gone] } = ROUND_STAMP_BEATS;
  if (time < landed) {
    // Its size and its strength go the same way along the same curve; past 1 the strength is whole and the size a little under.
    const e = bezier(ROUND_STAMP_EASING.snap.points, time / landed);
    return Object.freeze({ t: time, beat: 'snap', scale: ROUND_STAMP_FROM + (1 - ROUND_STAMP_FROM) * e, opacity: clamp01(e) });
  }
  if (time < leaving) return Object.freeze({ t: time, beat: 'hold', scale: 1, opacity: 1 });
  return Object.freeze({ t: time, beat: 'leave', scale: 1, opacity: 1 - bezier(ROUND_STAMP_EASING.leave.points, (time - leaving) / (gone - leaving)) });
}

/** The stamp's keyframes over its whole length: the beats as offsets, each stretch on its own curve. */
function keyframesOf(reduced) {
  if (reduced) {
    const { in: [, shown], leave: [leaving] } = ROUND_STAMP_REDUCED;
    return [{ offset: 0, opacity: 0, easing: 'linear' }, { offset: shown / LENGTH, opacity: 1, easing: 'linear' }, { offset: leaving / LENGTH, opacity: 1, easing: 'linear' }, { offset: 1, opacity: 0 }];
  }
  const { snap: [, landed], leave: [leaving] } = ROUND_STAMP_BEATS;
  return [
    { offset: 0, transform: `scale(${ROUND_STAMP_FROM})`, opacity: 0, easing: ROUND_STAMP_EASING.snap.css },
    { offset: landed / LENGTH, transform: 'scale(1)', opacity: 1, easing: 'linear' },
    { offset: leaving / LENGTH, transform: 'scale(1)', opacity: 1, easing: ROUND_STAMP_EASING.leave.css },
    { offset: 1, transform: 'scale(1)', opacity: 0 },
  ];
}

/**
 * Mounts the stamp in `target` (the shell's cover, `shell.slot('cover')`). It appends one element, which takes no taps
 * and is nothing to assistive technology; its stylesheet centres the stamp in the phone, as the pack does. Returns
 * { element, update, suspend, resume, frame, dispose }.
 */
export function mountRoundStamp(target, input = {}) {
  if (!target?.ownerDocument) throw new TypeError('The round stamp needs an element to mount in: the shell\'s cover');
  const doc = target.ownerDocument, win = doc.defaultView;
  let state = nextRoundStampInput(ROUND_STAMP_DEFAULTS, input);
  const kit = createKit(doc);

  // The top bar already says the round, and Frontend's own announcement is unchanged: the stamp is a picture of it.
  const root = doc.createElement('div');
  root.className = 'ms-round-stamp ms-kit';
  root.setAttribute('aria-hidden', 'true');
  // The part that lands and leaves. The kit's stamp inside it keeps its own tilt.
  const mark = doc.createElement('span');
  mark.className = 'ms-rs-mark';
  const stamp = kit.stamp({ text: '', tone: 'gold' });
  mark.append(stamp);
  root.append(mark);
  target.append(root);

  const motionQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const reduced = () => state.reducedMotion || !!motionQuery?.matches;
  const canAnimate = typeof mark.animate === 'function';
  // One animation at most. `moving` names what it is of: the phase, the round and the motion it was made for.
  let animation = null, moving = null;
  let suspended = false, disposed = false;

  /** The stamp time the trusted clock gives; null without a round, a phase or a usable clock. */
  const clockTime = () => (state.round !== null && state.window && state.clock ? roundStampTime(state.window, Number(state.clock.now())) : null);

  function drop() {
    if (!animation) return;
    const old = animation;
    animation = null; moving = null;
    old.onfinish = null;
    old.cancel();
  }
  /** The stamp at `t`, running on from there or held there. Kept and sought: never started twice for a moment. */
  function show(key, t, hold) {
    if (moving !== key) {
      drop();
      animation = mark.animate(keyframesOf(reduced()), { duration: LENGTH, fill: 'none' });
      moving = key;
      const made = animation;
      // Finished, it is let go: the stamp is gone, nothing is set and nothing runs.
      made.onfinish = () => { if (animation === made) { animation = null; moving = null; } };
    }
    // Held: paused first, then sought, which holds it at exactly `t` now (a pause alone takes hold a frame later).
    if (hold) { animation.pause(); animation.currentTime = t; return; }
    animation.currentTime = t;
    animation.play();
    // The browser starts the animation at its next frame. If that frame was a long one the clock has moved on: the
    // stamp is put at the clock's moment again as it starts, before that frame is drawn.
    const mine = animation;
    mine.ready.then(() => {
      if (disposed || animation !== mine || mine.playState !== 'running') return;
      const now = clockTime();
      if (now === null || now >= LENGTH) drop(); else mine.currentTime = now;
    }, () => {});
  }

  /** Puts the stamp where the inputs say: hidden, gone, at the clock's moment, or standing still. */
  function settle() {
    root.dataset.status = state.status;
    if (state.reducedMotion) root.dataset.motion = 'reduced'; else delete root.dataset.motion;
    const concealed = state.status === 'concealed';
    root.hidden = concealed;
    kit.setStamp(stamp, { text: state.round === null ? '' : ROUND_STAMP_WORDS.round(state.round), tone: 'gold' });
    if (concealed) { drop(); return; }
    const t = clockTime();
    // No round, phase or clock, or past its length: nothing is drawn and nothing runs. A late phone sees no stamp.
    if (t === null || t >= LENGTH || !canAnimate) { drop(); return; }
    const key = `${state.window.id}|${state.round}|${reduced() ? 'reduced' : 'full'}`;
    if (suspended) { show(key, t, true); return; }
    if (state.status === 'stale') {
      // Reconnecting, it stands still where it is. A stamp that had not begun on this phone does not begin now.
      if (moving === key) show(key, Number(animation.currentTime ?? t), true); else drop();
      return;
    }
    show(key, t, false);
  }

  function update(changes = {}) {
    if (disposed) return;
    state = nextRoundStampInput(state, changes);
    settle();
  }
  function suspend() { if (disposed) return; suspended = true; settle(); }
  function resume() { if (disposed) return; suspended = false; settle(); }

  /** What the stamp shows now, as a plain snapshot; null after dispose(). */
  function frame() {
    if (disposed) return null;
    const drawn = animation !== null && state.status !== 'concealed';
    const at = drawn ? Number(animation.currentTime ?? 0) : clockTime();
    const still = drawn ? roundStampFrame(at, { reduced: reduced() }) : null;
    return {
      window: state.window?.id ?? null,
      round: state.round,
      t: at === null ? null : Math.round(at),
      beat: still ? still.beat : 'gone',
      scale: still ? round3(still.scale) : 1,
      opacity: still ? round3(still.opacity) : 0,
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
    root.remove();
  }
  /** The device's Reduce motion turned on or off. */
  function motionChanged() { if (!disposed) settle(); }
  motionQuery?.addEventListener?.('change', motionChanged);

  settle();
  return Object.freeze({ element: root, update, suspend, resume, frame, dispose });
}
