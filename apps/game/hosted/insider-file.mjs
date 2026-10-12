// The Insider's file in the page: the string round the whole set, the assembly the first time the
// player opens the card in this page, the lift of an inspected snapshot, and a character ringed on
// the player's own board. A port of the Designer's motion (ability art abilities-0.1.0,
// PR #102 at 1453500; exact source paths are recorded in docs/frontend/insider-file.md).
//
// All of it decorates what the markup already says. Nothing waits on it, nothing here decides or
// delays game state, and every control works from the first frame. It reads no role and draws no
// words: the file's words, structure and inspected seat come from the presentation markup.

/** Motion, in ms: every beat, so a storyboard and a check can name them. */
export const FILE_MOTION = Object.freeze({
  board: 180, photosFrom: 120, photo: 260, photoStagger: 70, pin: 120, envelopeFrom: 300, envelope: 200,
  slipFrom: 520, slip: 240, queriesFrom: 540, query: 280, threadFrom: 640, thread: 380, stampClassified: 220, stampOneEach: 860, stamp: 140,
  total: 1020, reducedFade: 80, inspect: 200, hide: 160,
});

/** How long a character asked for from the file stays ringed on the board. */
export const SPOT_MS = 1600;

const SVG = 'http://www.w3.org/2000/svg';
const SETTLE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** The string from pin to pin round the four corners [tl, tr, br, bl], sagging a little inward between them. */
export function threadPath([tl, tr, br, bl]) {
  const at = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const sag = (a, b, [dx, dy]) => `Q ${at([(a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy])} ${at(b)}`;
  return `M ${at(tl)} ${sag(tl, tr, [0, 7])} ${sag(tr, br, [-6, 0])} ${sag(br, bl, [0, -7])} ${sag(bl, tl, [6, 0])}`;
}

/**
 * Every animation of the assembly: the board rises; the snapshots drop and are pinned in seat order;
 * the envelope rises and its slip slides up with the three names together; the query tags swing on
 * all at once; the corner pins pop and the string draws round the whole set; the two stamps land.
 * Every snapshot moves alike, by position only. Reduced: the file fades in at rest.
 * Returns [element, keyframes, options] for each, so the plan can be checked without a page.
 */
export function assemblyPlan(file, reduced) {
  const M = FILE_MOTION;
  const plan = [];
  const play = (node, frames, options) => { if (node) plan.push([node, frames, { fill: 'backwards', ...options }]); };
  if (reduced) {
    play(file, [{ opacity: 0 }, { opacity: 1 }], { duration: M.reducedFade, easing: 'linear' });
    return plan;
  }
  play(file, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: M.board, easing: SETTLE });
  file.querySelectorAll('.ab-photo').forEach((photo, index) => {
    const delay = M.photosFrom + index * M.photoStagger;
    play(photo, [
      { opacity: 0, transform: `translateY(-28px) rotate(${index % 2 ? 7 : -7}deg) scale(1.08)` },
      { opacity: 1, offset: 0.55 },
      { opacity: 1, transform: 'none' },
    ], { duration: M.photo, delay, easing: 'cubic-bezier(0.3, 1.35, 0.6, 1)' });
    play(photo.querySelector('.ab-photo__pin'), [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: M.pin, delay: delay + M.photo - 60, easing: SETTLE });
  });
  for (const query of file.querySelectorAll('.ab-photo__query')) {
    play(query, [{ opacity: 0, transform: 'rotate(-48deg)' }, { opacity: 1, transform: 'rotate(18deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: M.query, delay: M.queriesFrom, easing: 'ease-out' });
  }
  play(file.querySelector('.ab-roles'), [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: M.envelope, delay: M.envelopeFrom, easing: SETTLE });
  play(file.querySelector('.ab-roles__slip'), [{ transform: 'translateY(58%)' }, { transform: 'none' }], { duration: M.slip, delay: M.slipFrom, easing: 'cubic-bezier(0.3, 1.25, 0.6, 1)' });
  for (const pin of file.querySelectorAll('.ab-corner-pin')) {
    play(pin, [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: M.pin, delay: M.threadFrom - M.pin, easing: SETTLE });
  }
  for (const path of file.querySelectorAll('.ab-thread path')) {
    const length = path.getTotalLength?.() || 1;
    play(path, [{ strokeDasharray: `${length}`, strokeDashoffset: `${length}` }, { strokeDasharray: `${length}`, strokeDashoffset: '0' }], { duration: M.thread, delay: M.threadFrom, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
  }
  const thump = [
    { opacity: 0, transform: 'scale(1.9) rotate(var(--ab-stamp-from, -18deg))' },
    { opacity: 1, transform: 'scale(0.94) rotate(var(--ab-stamp-turn, -8deg))', offset: 0.75 },
    { opacity: 1, transform: 'scale(1) rotate(var(--ab-stamp-turn, -8deg))' },
  ];
  play(file.querySelector('[data-stamp="classified"]'), thump, { duration: M.stamp, delay: M.stampClassified, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
  play(file.querySelector('[data-stamp="one-each"]'), thump, { duration: M.stamp, delay: M.stampOneEach, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
  return plan;
}

/**
 * @param {HTMLElement} root The redrawn shell.
 * @param {{ setTimeout?: typeof setTimeout, clearTimeout?: typeof clearTimeout, now?: () => number }} [ports]
 */
export function createInsiderFile(root, { setTimeout: later = globalThis.setTimeout, clearTimeout: cancelLater = globalThis.clearTimeout, now = () => performance.now() } = {}) {
  let file = null;
  let assembled = false;
  let running = [];
  let resize = null;
  // How each snapshot looked before a redraw, so one the redraw replaced can move from there.
  let looks = new Map();
  let spot = null;

  function finish() {
    for (const animation of running) animation.finish();
    running = [];
  }

  function corners() {
    const box = file.getBoundingClientRect();
    return ['tl', 'tr', 'br', 'bl'].map(corner => {
      const pin = file.querySelector(`.ab-file__field [data-corner="${corner}"]`)?.getBoundingClientRect();
      return pin ? [pin.left - box.left + pin.width * 0.46, pin.top - box.top + pin.height * 0.36] : [Number.NaN, Number.NaN];
    });
  }

  /** The string, drawn into the file the markup left room for: an SVG the host makes, with no words in it. */
  function drawThread() {
    if (!file?.isConnected) return;
    let thread = file.querySelector(':scope > .ab-thread');
    if (!thread) {
      thread = document.createElementNS(SVG, 'svg');
      thread.setAttribute('class', 'ab-thread');
      thread.setAttribute('aria-hidden', 'true');
      thread.setAttribute('focusable', 'false');
      for (const part of ['ink', 'core']) {
        const path = document.createElementNS(SVG, 'path');
        path.setAttribute('class', `ab-thread__${part}`);
        thread.append(path);
      }
      file.querySelector(':scope > .ab-file__field')?.after(thread);
    }
    const points = corners();
    if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return;
    const box = file.getBoundingClientRect();
    thread.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const d = threadPath(points);
    for (const path of thread.querySelectorAll('path')) path.setAttribute('d', d);
  }

  /** The inspected snapshot is lifted toward the middle of the board: the same lift for any of the three. */
  function lift() {
    const pressed = file?.querySelector('.ab-photo[aria-pressed="true"]');
    if (!pressed) return;
    pressed.style.removeProperty('--ab-lift-x');
    const field = file.querySelector('.ab-file__field');
    if (!field) return;
    const box = pressed.getBoundingClientRect();
    const frame = field.getBoundingClientRect();
    pressed.style.setProperty('--ab-lift-x', `${Math.round(frame.left + frame.width / 2 - (box.left + box.width / 2))}px`);
  }

  function look(photo) {
    const style = getComputedStyle(photo);
    return { element: photo, transform: style.transform, rotate: style.rotate, opacity: style.opacity };
  }

  /** A snapshot the redraw replaced moves from how the old one looked to how the new one looks. */
  function settle(reduced) {
    if (!file || reduced) return;
    for (const photo of file.querySelectorAll('.ab-photo')) {
      const before = looks.get(photo.dataset.seat);
      if (!before || before.element === photo) continue;
      const after = look(photo);
      if (before.transform === after.transform && before.rotate === after.rotate && before.opacity === after.opacity) continue;
      running.push(photo.animate([
        { transform: before.transform, rotate: before.rotate, opacity: before.opacity },
        { transform: after.transform, rotate: after.rotate, opacity: after.opacity },
      ], { duration: FILE_MOTION.inspect, easing: SETTLE }));
    }
  }

  function applySpot() {
    if (spot === null) return;
    const elapsed = now() - spot.at;
    if (elapsed >= SPOT_MS || document.visibilityState !== 'visible') { clearSpot(); return; }
    const seat = root.querySelector(`.ms-board[data-board="own"] .ms-seat[data-seat="${CSS.escape(spot.seatId)}"]`);
    if (!seat || seat === spot.element) return;
    // A redraw that replaced the character carries the ring on from where it was, rather than starting it again.
    seat.style.setProperty('--ab-spot-delay', `${-Math.round(elapsed)}ms`);
    seat.dataset.spot = '';
    if (spot.element === null) seat.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    spot.element = seat;
  }

  function clearSpot() {
    if (spot === null) return;
    cancelLater(spot.timer);
    for (const seat of root.querySelectorAll('.ms-board .ms-seat[data-spot]')) {
      delete seat.dataset.spot;
      seat.style.removeProperty('--ab-spot-delay');
    }
    spot = null;
  }

  return {
    /** Before a redraw: how the snapshots look now. */
    before() {
      looks = new Map(file?.isConnected ? [...file.querySelectorAll('.ab-photo')].map(photo => [photo.dataset.seat, look(photo)]) : []);
    },
    /**
     * After a redraw. `requested`: this draw follows the player's own press of Card, so a file that
     * appears in it may assemble, once per page. `reduced`: motion is reduced, by the device or in the
     * app. `current`: the server confirms the view; a file shown on a view out of date stays at rest.
     */
    after({ requested = false, reduced = false, current = true } = {}) {
      if (!current) clearSpot();
      const next = root.querySelector('.ab-file');
      if (next !== file) {
        // Closed, concealed or out of date: whatever was moving stops, at rest, with the old file.
        finish();
        resize?.disconnect();
        resize = null;
        file = next;
        looks = new Map();
        if (file) {
          drawThread();
          resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { drawThread(); lift(); }) : null;
          resize?.observe(file);
        }
      }
      if (file && (reduced || !current)) finish();
      if (file && requested && current && !assembled) {
        // A reveal the player asked for, not a game event: the first deliberate open in this page,
        // never an update, a reconnect or a later open.
        assembled = true;
        for (const [node, frames, options] of assemblyPlan(file, reduced)) running.push(node.animate(frames, options));
      }
      lift();
      settle(reduced);
      applySpot();
    },
    /** The player pressed a snapshot or Back: anything still assembling stops, at rest. */
    finish,
    /** Ring a character on the player's own board, once the board is drawn. */
    spot(seatId) {
      clearSpot();
      spot = { seatId, at: now(), element: null, timer: later(() => clearSpot(), SPOT_MS) };
    },
    dispose() {
      finish();
      clearSpot();
      resize?.disconnect();
      resize = null;
      file = null;
    },
  };
}
