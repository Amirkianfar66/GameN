// The boarding stage: the shared ten-second boarding before Round 1 on a phone, as the phone pack draws it
// (sheet 19). Runtime source, Designer's (the owner, 14 and 15 November 2026: Designer builds each visual
// component once, in design/; the game and the preview use it as it is). Frontend mounts it while the
// setup is boarding, on a player's phone and on the shared display, gives it the view each tick, mounts
// the boarding film's player in `stage.film`, and connects Skip.
//
// What it draws: the film edge to edge, under the status bar, with Skip (the kit's small button with the
// skip icon); after a local skip, the flag and "Boarding · Round 1 in 0:04", the server's countdown; once
// the interval has ended, the hourglass and "Starting Round 1 · Waiting for the ship", with the spinner;
// the 220 ms crossfade between them; concealed, a plain cover. The holding screens are the kit's `wait`.
// The phone shell around it draws no bar and no tabs (sheet 19 draws none), and its reconnecting banner.
//
// What it never does: decide when the film plays, when the interval ends or when Round 1 starts, count
// the clock down, or skip anything but this phone's picture. Frontend gives the view; Skip reports a tap.
// Everything here is public: the boarding is the same on every phone and on the shared display.

import { clockText, mountPhoneShell } from '../phone-shell/phone-shell.mjs';
import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const BOARDING_STAGE_VERSION = 'boarding-stage-0.1.0';
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const VIEWS = Object.freeze(['film', 'holding', 'waiting']);

/** The pack's words (screens-pregame.mjs, the boarding screen; sheet 19). */
export const BOARDING_WORDS = Object.freeze({
  skip: 'Skip',
  holding: 'Boarding',
  roundIn: time => `Round 1 in ${time}`,
  waiting: 'Starting Round 1',
  ship: 'Waiting for the ship',
  film: 'The crew boards the ship',
  hidden: 'Hidden',
});
/** A change of view crossfades as the handoff's state change (220 ms; 80 ms with Reduce motion). */
export const CROSSFADE_MS = 220;
export const CROSSFADE_REDUCED_MS = 80;

/** Every input, with its default. */
export const BOARDING_STAGE_DEFAULTS = Object.freeze({
  status: 'live', interactive: true, reducedMotion: false, insets: null, viewer: null,
  clock: null, view: 'holding', skip: null,
});

const isText = value => typeof value === 'string' && value.length > 0;

function checkClock(clock) {
  if (clock === null || clock === undefined) return null;
  const { elapsedMs, endsAtMs } = clock;
  if (![elapsedMs, endsAtMs].every(Number.isFinite) || endsAtMs <= 0) throw new TypeError('clock is { elapsedMs, endsAtMs } in ms, with endsAtMs > 0, or null');
  return { elapsedMs: Math.max(0, Math.min(elapsedMs, endsAtMs)), endsAtMs };
}

/** The next input from the previous one and an update: each key given replaces that key; the rest stay. */
export function nextBoardingStageInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.insets !== null && !['top', 'right', 'bottom', 'left'].every(k => next.insets[k] === undefined || Number.isFinite(next.insets[k]))) throw new TypeError('insets are null, or { top, right, bottom, left } in px');
  next.clock = checkClock(next.clock);
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  if (next.skip === null || next.skip === undefined) next.skip = null;
  else next.skip = { enabled: next.skip.enabled !== false, reason: isText(next.skip.reason) ? next.skip.reason : null };
  return next;
}

/** The holding screen's block for a view: the kit's `wait` props. */
export function boardingWait(s) {
  if (s.view === 'waiting') return { icon: 'hourglass', filled: true, title: BOARDING_WORDS.waiting, line: BOARDING_WORDS.ship, busy: true };
  const line = s.clock ? BOARDING_WORDS.roundIn(clockText(s.clock.endsAtMs - s.clock.elapsedMs)) : null;
  return { icon: 'flag', filled: true, title: BOARDING_WORDS.holding, line, busy: false };
}

/**
 * Mounts the stage in `host`, which it fills (position it, and give it the phone's size). Returns
 * { update, suspend, resume, dispose, layout, film, element }.
 */
export function mountBoardingStage(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A boarding stage needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);
  const attr = (node, name, value) => kit.attr(node, name, value);

  let state = nextBoardingStageInput(BOARDING_STAGE_DEFAULTS, input);
  let disposed = false, suspended = false, lastLayout = null, shownView = null, fadeTimer = null;
  const on = Object.fromEntries(['onSkip', 'onRetry', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  // ── The parts ───────────────────────────────────────────────────────
  const root = el('div', 'ms-boarding-stage ms-kit', { tabindex: '-1', role: 'group' });
  const shellHost = el('div', 'ms-bst-shell');
  root.append(shellHost);
  host.append(root);
  const accepts = () => !disposed && !suspended && state.interactive && state.status === 'live';
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: () => (state.status === 'stale' ? 'Controls return when the match is current' : null),
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });
  // The phone shell: no bar and no tabs (sheet 19 draws none), its stage edge to edge; its reconnecting
  // banner sits at the bar's place, over the film or the holding screen.
  const shell = mountPhoneShell(shellHost, shellInput(), { onRetry: () => { if (!disposed) on.onRetry?.(); }, onLayout: () => { placeParts(); reportLayout(); } });
  // In the shell's stage: the holding screen, the film over it, and the concealed cover over both.
  const hold = el('div', 'ms-bst-hold');
  const block = kit.wait(boardingWait(state));
  hold.append(block);
  const film = el('div', 'ms-bst-film', { role: 'group', 'aria-label': BOARDING_WORDS.film });
  const picture = el('div', 'ms-bst-picture');
  // Skip: the kit's small secondary button with the skip icon, as sheet 19 draws it.
  const skip = kit.button({ label: BOARDING_WORDS.skip, kind: 'secondary', small: true, icon: 'skip', intent: 'skip', extra: ['ms-bst-skip'] });
  film.append(picture, skip);
  const cover = el('div', 'ms-bst-cover', { 'aria-hidden': 'true' });
  shell.stage.append(hold, film, cover);

  function shellInput() {
    return {
      status: state.status, interactive: state.interactive, reducedMotion: state.reducedMotion, insets: state.insets, viewer: state.viewer,
      bar: null, tabs: null, edge: true, banner: state.status === 'stale' ? { kind: 'reconnecting' } : null,
    };
  }

  // ── Taps: one delegated listener for Skip; Retry is the shell's ──────
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (target !== skip || policy.refused(target) || !accepts() || state.view !== 'film' || !state.skip) return;
    on.onSkip?.();
  };
  root.addEventListener('click', onClick);

  // ── Render ──────────────────────────────────────────────────────────
  /** Skip 14 px above the bottom safe area, and the holding screen inside the safe areas, as the pack places them. */
  function placeParts() {
    const l = shell.layout();
    if (!l) return;
    for (const [name, px] of [['--ms-bst-safe-t', l.safe.top - l.bars.top], ['--ms-bst-safe-b', l.safe.bottom - l.bars.bottom]]) {
      const value = `${Math.round(px * 100) / 100}px`;
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    }
  }
  function paintView() {
    const concealed = state.status === 'concealed';
    const view = state.view;
    const ms = state.reducedMotion || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? CROSSFADE_REDUCED_MS : CROSSFADE_MS;
    root.style.setProperty('--ms-bst-fade', `${ms}ms`);
    if (shownView !== view) {
      // The film fades out over the holding screen (or in over it); a stage that opens shows its view at once.
      const first = shownView === null;
      const hadFocus = view !== 'film' && film.contains(doc.activeElement);
      if (first) { root.dataset.instant = ''; win.requestAnimationFrame(() => win.requestAnimationFrame(() => { delete root.dataset.instant; })); }
      film.dataset.shown = view === 'film' ? '' : 'leaving';
      if (fadeTimer) win.clearTimeout(fadeTimer);
      fadeTimer = view === 'film' ? null : win.setTimeout(() => { fadeTimer = null; if (film.dataset.shown === 'leaving') film.dataset.shown = 'no'; }, first ? 0 : ms);
      if (hadFocus) {
        root.focus({ preventScroll: true });
        queueMicrotask(() => { if (!disposed && doc.activeElement === root) on.onFocusReturn?.({ intent: 'skip', value: null }); });
      }
      shownView = view;
    }
    root.dataset.view = view;
    // Concealed: a plain cover, nothing drawn or named, as every component conceals.
    attr(root, 'aria-label', concealed ? BOARDING_WORDS.hidden : view === 'film' ? BOARDING_WORDS.film : view === 'waiting' ? BOARDING_WORDS.waiting : BOARDING_WORDS.holding);
    cover.hidden = !concealed;
    const filmShown = view === 'film' && !concealed;
    attr(film, 'aria-hidden', filmShown ? null : 'true');
    film.inert = !filmShown;
    attr(hold, 'aria-hidden', view !== 'film' && !concealed ? null : 'true');
    hold.inert = view === 'film' || concealed;
    // The holding block: the kit's wait, changed in place; the countdown a timer, the waiting line a status.
    kit.setWait(block, boardingWait(state));
    const line = block.querySelector('.ms-k-wait-line');
    attr(line, 'role', view === 'waiting' ? 'status' : 'timer');
    attr(line, 'aria-live', view === 'waiting' ? 'polite' : 'off');
    // Skip only where Frontend gives it (a phone, while the film plays): the shared display has none.
    skip.hidden = !state.skip;
    policy.control(skip, { off: !state.skip?.enabled, reason: state.skip?.reason ?? null });
  }
  function render() {
    if (disposed) return;
    root.dataset.status = state.status;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    shell.update(shellInput());
    placeParts();
    paintView();
  }

  // ── Layout ──────────────────────────────────────────────────────────
  function layout() {
    if (disposed) return null;
    const round = v => Math.round(v * 100) / 100;
    const box = root.getBoundingClientRect(), f = picture.getBoundingClientRect(), sh = shell.layout();
    return { size: { width: round(box.width), height: round(box.height) }, safe: sh.safe, film: { width: round(f.width), height: round(f.height) } };
  }
  function reportLayout() {
    if (disposed || !root.isConnected) return;
    const next = layout(), key = JSON.stringify(next);
    if (key === lastLayout) return;
    lastLayout = key;
    on.onLayout?.(next);
  }
  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => reportLayout()) : null;
  observer?.observe(root);

  function update(next = {}) {
    if (disposed) return;
    state = nextBoardingStageInput(state, next);
    render();
    if (!observer) reportLayout();
  }
  /** Backgrounded: nothing takes a tap. The film's player is Frontend's to pause. */
  function suspend() { if (disposed) return; suspended = true; shell.suspend(); render(); }
  function resume() { if (disposed) return; suspended = false; shell.resume(); render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (fadeTimer) win.clearTimeout(fadeTimer);
    observer?.disconnect();
    root.removeEventListener('click', onClick);
    policy.dispose();
    shell.dispose();
    root.remove();
  }

  render();
  return Object.freeze({ update, suspend, resume, dispose, layout, film: picture, element: root });
}
