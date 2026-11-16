// Host setup: the host's "New room" screen before a match, as the phone pack draws it (sheet 11, Setup).
// Runtime source, Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual component
// once, in design/; the game and the preview use it as it is). Frontend mounts it when the menu's Host is
// tapped, gives it the counts and their team mix from the ruleset, and routes Open room to today's create.
//
// What it draws: "Menu" back and "Host"; "New room"; Players: the 7, 8, 9 control with the chosen count's
// mix under it; "After the room opens" with its two rows; Open room at the foot ("Opening…" while busy);
// a failed opening as the kit's inline error over the foot (the Lead's review of #287, question 2).
//
// What it never does: work out a count's team mix, or whether the room can open. Each callback reports a tap.

import { createControlPolicy, createKit } from '../kit/kit.mjs';
import { createEntryParts } from '../entry-parts/entry-parts.mjs';

export const HOST_SETUP_VERSION = 'host-setup-0.1.0';

/** The pack's words (screens-entry.mjs, host-setup; sheet 11). */
export const SETUP_WORDS = Object.freeze({
  back: 'Menu', title: 'Host', heading: 'New room', players: 'Players', after: 'After the room opens',
  ask: 'Players ask to join', askSub: 'You admit each one', bots: 'Bots fill empty seats', botsSub: 'Set them in the lobby',
  open: 'Open room', opening: 'Opening…',
});

const CONTROL = Object.freeze({ enabled: true, busy: false, reason: null });
/** Every input, with its default. */
export const HOST_SETUP_DEFAULTS = Object.freeze({
  interactive: true, reducedMotion: false, insets: null, counts: Object.freeze([]), count: null, open: CONTROL, error: null,
});

const isText = value => typeof value === 'string' && value.length > 0;
function checkControl(name, value) {
  if (value === null || typeof value !== 'object') throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}
export function checkInsets(insets) {
  if (insets !== null && (typeof insets !== 'object' || !['top', 'bottom'].every(k => insets[k] === undefined || Number.isFinite(insets[k])))) {
    throw new TypeError('insets are null, or { top, bottom } in px');
  }
  return insets;
}

/** The next input from the previous one and an update: each key given replaces that key; the rest stay. */
export function nextHostSetupInput(previous, input = {}) {
  const next = { ...previous, ...input };
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  next.insets = checkInsets(next.insets ?? null);
  if (!Array.isArray(next.counts) || !next.counts.every(c => Number.isInteger(c?.value) && c.value > 0 && isText(c.mix))) {
    throw new TypeError('counts are [{ value, mix }]: a whole number of players and its team mix, from the ruleset');
  }
  next.counts = Object.freeze(next.counts.map(c => Object.freeze({ value: c.value, mix: c.mix })));
  if (next.count === undefined) next.count = null;
  if (next.count !== null && !next.counts.some(c => c.value === next.count)) throw new TypeError(`The count is null or one of the counts, not ${JSON.stringify(next.count)}`);
  next.open = checkControl('open', next.open);
  if (next.error !== null && next.error !== undefined && !isText(next.error)) throw new TypeError('The error is null or words');
  next.error = next.error ?? null;
  return next;
}

/**
 * Mounts host setup in `host`, which it fills (position it, and give it the phone's size). Returns
 * { layout, update, dispose, element }.
 */
export function mountHostSetup(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('Host setup needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const parts = createEntryParts(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);

  let state = nextHostSetupInput(HOST_SETUP_DEFAULTS, input);
  let disposed = false, lastLayout = null, error = null;
  const on = Object.fromEntries(['onBack', 'onCount', 'onOpen', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  // ── The parts ───────────────────────────────────────────────────────
  const root = el('div', 'ms-host-setup ms-kit ms-entry-parts', { tabindex: '-1', role: 'group', 'aria-label': SETUP_WORDS.title });
  const screen = parts.screen();
  const nav = parts.navBar({ title: SETUP_WORDS.title, back: { label: SETUP_WORDS.back, intent: 'back' } });
  const seg = kit.seg({ options: [], value: null, label: SETUP_WORDS.players, intent: 'count' });
  const mix = kit.groupNote('');
  const rows = kit.list(
    kit.row({ tag: 'div', icon: 'join', tint: 'paper', title: SETUP_WORDS.ask, sub: SETUP_WORDS.askSub }),
    kit.row({ tag: 'div', icon: 'bot', tint: 'steel', title: SETUP_WORDS.bots, sub: SETUP_WORDS.botsSub }));
  const foot = parts.foot();
  const open = kit.button({ label: SETUP_WORDS.open, kind: 'primary', block: true, icon: 'host', intent: 'open', extra: ['ms-hs-open'] });
  foot.append(open);
  screen.append(nav, parts.largeTitle(SETUP_WORDS.heading), kit.groupLabel(SETUP_WORDS.players), seg, mix, kit.groupLabel(SETUP_WORDS.after), rows, foot);
  root.append(screen);
  host.append(root);

  const accepts = () => !disposed && state.interactive;
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); } });

  // ── Taps: one delegated listener; each reports a tap, and only that ──
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    const intent = target.dataset.intent;
    if (intent === 'back') on.onBack?.();
    else if (intent === 'count') on.onCount?.(Number(target.dataset.value));
    else if (intent === 'open') on.onOpen?.(state.count);
  };
  root.addEventListener('click', onClick);

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    if (disposed) return;
    for (const [name, value] of [['--ms-ep-safe-t', state.insets?.top], ['--ms-ep-safe-b', state.insets?.bottom]]) {
      if (Number.isFinite(value)) root.style.setProperty(name, `${value}px`); else root.style.removeProperty(name);
    }
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    kit.setSeg(seg, { options: state.counts.map(c => ({ id: c.value, label: String(c.value) })), value: state.count, label: SETUP_WORDS.players, intent: 'count' });
    for (const b of seg.children) policy.control(b, { intent: 'count' });
    const chosen = state.counts.find(c => c.value === state.count);
    kit.text(mix, chosen?.mix ?? '');
    mix.hidden = !chosen;
    // A failed opening: the kit's inline error over the foot, with Frontend's words.
    if (state.error && !error) { error = kit.errorNote(state.error); foot.prepend(error); }
    else if (state.error && error) kit.text(error.querySelector('.ms-k-error-text'), state.error);
    else if (!state.error && error) { error.remove(); error = null; }
    kit.setButton(open, { label: state.open.busy ? SETUP_WORDS.opening : SETUP_WORDS.open, kind: 'primary', block: true, icon: 'host', intent: 'open', extra: ['ms-hs-open'] });
    policy.control(open, { off: !state.open.enabled, busy: state.open.busy, reason: state.open.reason });
    policy.control(nav.querySelector('.ms-ep-back'), {});
  }

  // ── Layout ──────────────────────────────────────────────────────────
  function layout() {
    if (disposed) return null;
    const round = v => Math.round(v * 100) / 100;
    const box = root.getBoundingClientRect(), cs = win.getComputedStyle(screen);
    return { size: { width: round(box.width), height: round(box.height) }, safe: { top: round(parseFloat(cs.paddingTop) - 8), bottom: round(parseFloat(cs.paddingBottom) - 16) } };
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
    state = nextHostSetupInput(state, next);
    render();
    reportLayout();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }

  render();
  if (!observer) reportLayout();
  return Object.freeze({ layout, update, dispose, element: root });
}
