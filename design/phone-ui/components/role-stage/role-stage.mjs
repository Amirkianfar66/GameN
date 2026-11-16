// The role stage: the private 30-second stage on the player's own phone, as the phone pack draws it
// (sheet 17, its timeline; 18, its states). Runtime source, Designer's (the owner, 14 and 15 November
// 2026: Designer builds each visual component once, in design/; the game and the preview use it as it
// is). Frontend mounts it while the setup is reading roles, gives it this phone's view each tick, mounts
// the role film's player in `stage.film`, and connects its intents.
//
// What it draws: the top bar ("Your role · Only on this phone", the clock) through the phone shell, so
// the game has one top bar; the two-part strip under it (the card's 20 s, the film's 10 s); the role card
// (role-card.mjs), large; the line under it ("Your film starts in 0:19", "Hide your phone, then tap
// Ready", "6 of 9 ready", the film unavailable or skipped); Ready; in the film's view, the film full-bleed
// with the clock as a chip and Skip film; the crossfade between them; concealed, the card back.
//
// What it never does: decide when the film plays or Ready opens, send Ready, count the clock down or
// invent a result. Frontend gives the view, the film's state and Ready's offer and reason; each callback
// reports a tap. The card, Ready, the film's state and the toast are this viewer's own, and the stage
// drops them when it is concealed or its viewer changes; the clock and the ready count are public.

import { mountPhoneShell, clockText } from '../phone-shell/phone-shell.mjs';
import { iconSvg } from '../icons.mjs';
import { createControlPolicy, createKit } from '../kit/kit.mjs';
import { mountRoleCard, checkRoleCard } from './role-card.mjs';

export const ROLE_STAGE_VERSION = 'role-stage-0.1.0';
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const VIEWS = Object.freeze(['card', 'film', 'after']);
const FILMS = Object.freeze(['pending', 'playing', 'missing', 'skipped']);

/** The pack's words (screens-pregame.mjs, the role screen; sheets 17 and 18). */
export const STAGE_WORDS = Object.freeze({
  title: 'Your role',
  sub: 'Only on this phone',
  filmIn: time => `Your film starts in ${time}`,
  readyAt: time => `Ready opens at ${time}`,
  missing: 'Film unavailable · your card stays up until Ready',
  skipped: 'Film skipped on this phone · the stage keeps time',
  hide: 'Hide your phone, then tap Ready',
  count: (ready, total) => `${ready} of ${total} ready`,
  ready: 'Ready',
  skip: 'Skip film',
  rejoined: 'Rejoined · the stage carried on',
  strip: 'Role stage',
});
/** The crossfade between the card and the film (the handoff's Motion: 700 ms; 80 ms with Reduce motion). */
export const CROSSFADE_MS = 700;
export const CROSSFADE_REDUCED_MS = 80;
/** The card area's least distance from the bottom, between the bars (the pack's .card-area: 120 px). */
export const CARD_BOTTOM_PX = 120;

/** Every input, with its default: nothing private, Ready not offered. */
export const ROLE_STAGE_DEFAULTS = Object.freeze({
  status: 'live', interactive: true, reducedMotion: false, insets: null, viewer: null,
  clock: null, view: 'card', film: 'pending', card: null,
  ready: Object.freeze({ mode: 'ready', enabled: false, busy: false, reason: null }),
  roster: null, toast: null,
});
/** The inputs that belong to this viewer. */
const VIEWER_KEYS = Object.freeze(['card', 'ready', 'film', 'toast', 'view']);

const isText = value => typeof value === 'string' && value.length > 0;

function checkClock(clock) {
  if (clock === null || clock === undefined) return null;
  const { elapsedMs, filmAtMs, endsAtMs } = clock;
  if (![elapsedMs, filmAtMs, endsAtMs].every(Number.isFinite) || filmAtMs <= 0 || endsAtMs <= filmAtMs) {
    throw new TypeError('clock is { elapsedMs, filmAtMs, endsAtMs } in ms, with 0 < filmAtMs < endsAtMs, or null');
  }
  return { elapsedMs: Math.max(0, Math.min(elapsedMs, endsAtMs)), filmAtMs, endsAtMs };
}
function checkReady(ready) {
  if (ready === null || ready === undefined) return { ...ROLE_STAGE_DEFAULTS.ready };
  if (!['ready', 'done'].includes(ready.mode ?? 'ready')) throw new TypeError(`Ready's mode is ready or done, not ${JSON.stringify(ready.mode)}`);
  const mode = ready.mode ?? 'ready';
  // Once this viewer is ready, Ready is spent: never usable again here.
  return { mode, enabled: mode === 'ready' && ready.enabled !== false, busy: mode === 'ready' && !!ready.busy, reason: isText(ready.reason) ? ready.reason : null };
}

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's
 * value; the rest stay. This viewer's own inputs are dropped while the stage is concealed, never kept
 * for when it shows again, and when the viewer changes, unless the same update gives the new viewer's.
 */
export function nextRoleStageInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.insets !== null && !['top', 'right', 'bottom', 'left'].every(k => next.insets[k] === undefined || Number.isFinite(next.insets[k]))) throw new TypeError('insets are null, or { top, right, bottom, left } in px');
  next.clock = checkClock(next.clock);
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  if (!FILMS.includes(next.film)) throw new TypeError(`The film is ${FILMS.join(', ')}, not ${JSON.stringify(next.film)}`);
  next.card = next.card ? checkRoleCard({ ...next.card, face: 'up' }) : null;
  next.ready = checkReady(next.ready);
  if (next.roster) {
    const { ready, total } = next.roster;
    if (!Number.isSafeInteger(ready) || !Number.isSafeInteger(total) || ready < 0 || total < 1 || ready > total) throw new TypeError('roster is { ready, total }, whole numbers, ready ≤ total');
    next.roster = { ready, total };
  } else next.roster = null;
  if (next.toast) {
    if (!isText(next.toast.text)) throw new TypeError('A toast needs its text');
    next.toast = { id: String(next.toast.id ?? next.toast.text), text: next.toast.text, icon: next.toast.icon ?? 'info' };
  } else next.toast = null;
  const viewerChanged = 'viewer' in input && previous.viewer !== input.viewer;
  if (next.status === 'concealed' || viewerChanged) {
    for (const key of VIEWER_KEYS) if (next.status === 'concealed' || !(key in input)) next[key] = key === 'ready' ? { ...ROLE_STAGE_DEFAULTS.ready } : ROLE_STAGE_DEFAULTS[key];
  }
  return next;
}

/** The line under the card, from the view, the film's state, Ready and the public count. */
export function stageNote(s) {
  if (s.view === 'after' || (s.status !== 'concealed' && s.ready.mode === 'done')) {
    if (s.ready.mode === 'done') return s.roster ? STAGE_WORDS.count(s.roster.ready, s.roster.total) : '';
    return STAGE_WORDS.hide;
  }
  if (s.film === 'missing') return STAGE_WORDS.missing;
  if (s.film === 'skipped') return STAGE_WORDS.skipped;
  if (!s.clock) return '';
  return s.clock.elapsedMs < s.clock.filmAtMs
    ? STAGE_WORDS.filmIn(clockText(s.clock.filmAtMs - s.clock.elapsedMs))
    : STAGE_WORDS.readyAt(clockText(s.clock.endsAtMs));
}

/**
 * Mounts the stage in `host`, which it fills (position it, and give it the phone's size). Returns
 * { update, suspend, resume, dispose, layout, film, element }.
 */
export function mountRoleStage(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A role stage needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);
  const icon = (name, filled = false) => {
    const t = doc.createElement('template');
    t.innerHTML = iconSvg(name, { filled, className: 'ms-rst-ic' }).trim();
    return t.content.firstChild;
  };
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const attr = (node, name, value) => {
    if (value === null || value === undefined || value === false) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  };

  let state = nextRoleStageInput(ROLE_STAGE_DEFAULTS, input);
  let disposed = false, suspended = false, lastLayout = null, shownView = null, fadeTimer = null;
  // Whether the shell's bar is away for the film, and the bar's height to hold the card still meanwhile.
  let barAway = false, barEdges = null;
  const on = Object.fromEntries(['onReady', 'onSkipFilm', 'onShowRole', 'onRetry', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  // ── The parts ───────────────────────────────────────────────────────
  const root = el('div', 'ms-role-stage ms-kit', { tabindex: '-1' });
  const shellHost = el('div', 'ms-rst-shell');
  const film = el('div', 'ms-rst-film', { 'aria-hidden': 'true' });
  const picture = el('div', 'ms-rst-picture');
  const chip = el('span', 'ms-rst-chip', { role: 'timer' });
  chip.append(icon('timer'), el('span', 'ms-rst-chip-text'));
  // Skip film: the kit's small secondary button with the skip icon, as the pack draws it (sheet 17).
  const skip = kit.button({ label: STAGE_WORDS.skip, kind: 'secondary', small: true, icon: 'skip', intent: 'skip-film', extra: ['ms-rst-skip'] });
  film.append(picture, chip, skip);
  root.append(shellHost);
  host.append(root);
  // The kit's control policy: refused while reconnecting, backgrounded or not interactive, with the
  // banner's words as the reason; Frontend's reason for an unavailable control.
  const accepts = () => !disposed && !suspended && state.interactive && state.status === 'live';
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: () => (state.status === 'stale' ? 'Controls return when the match is current' : null),
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });

  // The phone shell draws the top bar, the reconnecting banner and the toast; the stage's own parts sit
  // in its stage, between the bars.
  const shell = mountPhoneShell(shellHost, shellInput(), { onRetry: () => { if (!disposed) on.onRetry?.(); }, onLayout: () => { placeFilm(); reportLayout(); } });
  const body = el('div', 'ms-rst-body');
  const strip = el('div', 'ms-rst-strip', { role: 'progressbar', 'aria-label': STAGE_WORDS.strip, 'aria-valuemin': '0' });
  const stripCard = el('span', 'ms-rst-seg'), stripFilm = el('span', 'ms-rst-seg');
  stripCard.append(el('i')); stripFilm.append(el('i'));
  strip.append(stripCard, stripFilm);
  const cardArea = el('div', 'ms-rst-card');
  const foot = el('div', 'ms-rst-foot');
  const note = el('p', 'ms-rst-note', { 'aria-live': 'polite' });
  // Ready: the kit's block button with the check, amber until used, then secondary (sheets 17 and 18).
  const readyButton = mode => ({ label: STAGE_WORDS.ready, kind: mode === 'done' ? 'secondary' : 'primary', block: true, icon: 'check', intent: 'ready', extra: ['ms-rst-ready'] });
  const ready = kit.button(readyButton('ready'));
  foot.append(note, ready);
  body.append(strip, cardArea, foot);
  // The film lives in the shell's stage, above the card: in the film's view the shell draws no top bar
  // (bar: null), so the film runs full-bleed and the shell's toast and banner stay above it (sheet 18).
  shell.stage.append(body, film);
  // The card's Show role: its own policy, refused when the stage takes no tap at all. When Show ends as the
  // card turns face up, the focus is on the card, and the stage passes on which control ended.
  const card = mountRoleCard(cardArea, { face: 'down' }, {
    onShow: () => { if (!disposed && state.interactive) on.onShowRole?.(); },
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });
  card.refuseWhen(() => disposed || !state.interactive);

  function shellInput() {
    const c = state.clock, showClock = c && state.view !== 'after';
    return {
      status: state.status === 'stale' ? 'stale' : 'live',
      interactive: state.interactive, reducedMotion: state.reducedMotion, insets: state.insets, viewer: state.viewer,
      bar: barAway ? null : { kind: 'phase', icon: 'card', title: STAGE_WORDS.title, sub: STAGE_WORDS.sub, timer: showClock ? { remainingMs: c.endsAtMs - c.elapsedMs, urgentAtMs: -1 } : null },
      // The pack's phone canvas behind the bars' glass and in the bands the stage leaves (no room here).
      tabs: null, edge: barAway, backdrop: 'canvas', banner: state.status === 'stale' ? { kind: 'reconnecting' } : null,
      toast: state.status === 'concealed' ? null : state.toast,
    };
  }

  // ── Taps: one delegated listener for the stage's own two controls ───
  // Retry is the shell's and Show role the card's: each reports its own.
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || !(target === ready || target === skip) || policy.refused(target) || !accepts()) return;
    if (target === ready) on.onReady?.();
    else if (state.view === 'film') on.onSkipFilm?.();
  };
  root.addEventListener('click', onClick);

  // ── Render ──────────────────────────────────────────────────────────
  /**
   * Takes the shell's bar away for the film, or gives it back. Away, the shell's stage runs edge to edge
   * (bar: null, edge: true), and the card is held where it was by the bars' old heights.
   */
  function setBarAway(away) {
    if (away === barAway || disposed) return;
    if (away) barEdges = shell.layout()?.bars ?? barEdges;
    barAway = away;
    body.style.top = away && barEdges ? `${barEdges.top}px` : '';
    body.style.bottom = away && barEdges ? `${barEdges.bottom}px` : '';
    shell.update(shellInput());
    placeFilm();
  }
  function paintFilm() {
    const showing = state.view === 'film' && state.status !== 'concealed';
    // The game's Reduce motion, or the device's.
    const ms = state.reducedMotion || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? CROSSFADE_REDUCED_MS : CROSSFADE_MS;
    root.style.setProperty('--ms-rst-fade', `${ms}ms`);
    if (shownView !== showing) {
      // The film fades in over the card, and out again; its element stays for the stage's life, so the
      // player Frontend mounts in it is never lost. Skip film leaves with it, and if it held the focus,
      // the focus comes to the stage, and onFocusReturn says which control ended.
      // The bar goes once the film is opaque, and comes back before it fades, so the top of the screen
      // only ever changes under an opaque film. A stage that opens on the film shows it at once.
      const first = shownView === null;
      const hadFocus = !showing && film.contains(doc.activeElement);
      film.dataset.shown = showing ? '' : 'leaving';
      if (first && showing) { film.dataset.instant = ''; win.requestAnimationFrame(() => win.requestAnimationFrame(() => { delete film.dataset.instant; })); }
      if (fadeTimer) win.clearTimeout(fadeTimer);
      fadeTimer = null;
      if (showing && first) setBarAway(true);
      else if (showing) fadeTimer = win.setTimeout(() => { fadeTimer = null; if (film.dataset.shown === '') setBarAway(true); }, ms);
      else {
        setBarAway(false);
        fadeTimer = win.setTimeout(() => { fadeTimer = null; if (film.dataset.shown === 'leaving') film.dataset.shown = 'no'; }, ms);
      }
      attr(film, 'aria-hidden', showing ? null : 'true');
      film.inert = !showing;
      root.dataset.view = showing ? 'film' : state.view === 'after' ? 'after' : 'card';
      if (hadFocus) {
        root.focus({ preventScroll: true });
        queueMicrotask(() => { if (!disposed && doc.activeElement === root) on.onFocusReturn?.({ intent: 'skip-film' }); });
      }
      shownView = showing;
    } else root.dataset.view = showing ? 'film' : state.view === 'after' ? 'after' : 'card';
    const c = state.clock;
    chip.hidden = !c;
    if (c) {
      const left = c.endsAtMs - c.elapsedMs;
      text(chip.lastChild, clockText(left));
      attr(chip, 'aria-label', `Role stage, ${Math.ceil(left / 1000)} seconds left`);
    }
    policy.control(skip, {});
  }
  function paintBody() {
    const s = state, c = s.clock;
    // The strip: the card's part, then the film's (the server's split). Gone once the stage has ended.
    strip.hidden = !c || s.view === 'after';
    if (c) {
      stripCard.firstChild.style.width = `${Math.min(1, c.elapsedMs / c.filmAtMs) * 100}%`;
      stripFilm.firstChild.style.width = `${Math.max(0, Math.min(1, (c.elapsedMs - c.filmAtMs) / (c.endsAtMs - c.filmAtMs))) * 100}%`;
      stripCard.style.flexGrow = String(c.filmAtMs); stripFilm.style.flexGrow = String(c.endsAtMs - c.filmAtMs);
      attr(strip, 'aria-valuemax', String(Math.round(c.endsAtMs / 1000)));
      attr(strip, 'aria-valuenow', String(Math.min(Math.round(c.endsAtMs / 1000), Math.floor(c.elapsedMs / 1000))));
    }
    // The card: face up with this viewer's role; face down while concealed (or before the role arrives).
    if (s.status === 'concealed' || !s.card) card.update({ face: 'down', back: 'stage' });
    else card.update({ ...s.card, face: 'up', stamp: s.ready.mode === 'done' ? 'ready' : null });
    text(note, stageNote(s));
    note.hidden = !note.textContent;
    // Ready: amber, dimmed until Frontend offers it (sheet 17); once used, secondary and spent (sheet 18).
    kit.setButton(ready, readyButton(s.ready.mode));
    ready.dataset.mode = s.ready.mode;
    policy.control(ready, { off: !s.ready.enabled, busy: s.ready.busy, reason: s.ready.reason });
  }
  /**
   * The film's clock chip at the top safe area + 8 px and Skip film at the bottom safe area + 14 px, as the
   * pack places them, measured from the screen's edges wherever the shell's stage ends: edge to edge once
   * the bar is away, between the bars while the film fades in.
   */
  function placeFilm() {
    const l = shell.layout();
    if (!l) return;
    for (const [name, px] of [['--ms-rst-chip-top', l.safe.top + 8 - l.bars.top], ['--ms-rst-skip-bottom', l.safe.bottom + 14 - l.bars.bottom]]) {
      const value = `${Math.round(px * 100) / 100}px`;
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    }
  }
  /**
   * The card ends where the foot begins: 120 px over the bottom, as the pack's .card-area, at the Standard
   * text, and above the note's own 1em when larger text makes the foot taller, so the note never runs into
   * the card. Measured from the foot itself, whatever it holds (the note, the count, Ready).
   */
  function placeCard() {
    if (disposed || !foot.isConnected) return;
    const px = Math.max(CARD_BOTTOM_PX, body.clientHeight - foot.offsetTop);
    const value = `${Math.round(px * 100) / 100}px`;
    if (root.style.getPropertyValue('--ms-rst-card-bottom') !== value) root.style.setProperty('--ms-rst-card-bottom', value);
  }
  function render() {
    if (disposed) return;
    placeFilm();
    root.dataset.status = state.status;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    shell.update(shellInput());
    paintBody();
    paintFilm();
    placeCard();
  }

  // ── Layout ──────────────────────────────────────────────────────────
  function layout() {
    if (disposed) return null;
    const round = v => Math.round(v * 100) / 100;
    const box = root.getBoundingClientRect(), a = cardArea.getBoundingClientRect(), f = picture.getBoundingClientRect(), sh = shell.layout();
    return { size: { width: round(box.width), height: round(box.height) }, bars: sh.bars, card: { width: round(a.width), height: round(a.height) }, film: { width: round(f.width), height: round(f.height) } };
  }
  function reportLayout() {
    if (disposed || !root.isConnected) return;
    const next = layout(), key = JSON.stringify(next);
    if (key === lastLayout) return;
    lastLayout = key;
    on.onLayout?.(next);
  }
  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => { placeCard(); reportLayout(); }) : null;
  observer?.observe(root);
  observer?.observe(cardArea);
  // The foot grows with the text: the card follows it.
  observer?.observe(foot);

  function update(next = {}) {
    if (disposed) return;
    state = nextRoleStageInput(state, next);
    render();
    if (!observer) reportLayout();
  }
  /** Backgrounded: nothing takes a tap and the shell's toast ends. The film's player is Frontend's to pause. */
  function suspend() { if (disposed) return; suspended = true; shell.suspend(); render(); }
  function resume() { if (disposed) return; suspended = false; shell.resume(); render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (fadeTimer) win.clearTimeout(fadeTimer);
    observer?.disconnect();
    root.removeEventListener('click', onClick);
    policy.dispose();
    card.dispose();
    shell.dispose();
    root.remove();
  }

  render();
  return Object.freeze({ update, suspend, resume, dispose, layout, film: picture, element: root });
}
