// Display settings: this phone's display settings, before and during a match, as the phone pack draws them
// (sheet 32; the pack's settings screen, with and without `from=menu`; #222 item 27). Runtime source,
// Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual component once, in design/;
// the game and the preview use it as it is).
//
// One module, two mounts (the Lead's review of #294, question 1):
//   mountDisplayPage    before a match: the Display page, opened from the main menu ("Menu" back, "Display")
//   mountSettingsSheet  in a match: the content of the phone shell's "Settings" sheet, opened from the top bar's
//                       ⋮; Frontend opens the sheet and mounts this in shell.sheetBody. The sheet's title, ✕ and
//                       glass are the shell's.
//
// What it draws: the Reduce motion row ("Films become stills; no shake or travel") with its switch; "Text size"
// and Standard, Large, Largest; "These stay on this phone. They never change the match."; in the sheet,
// "Display" over them and, for the host, "Host" and the Host controls row.
//
// What it never does: store or apply a setting. Frontend keeps them on the phone and applies them (the text
// size, the game's motion), and gives them back; each tap reports what it asks for (question 2). The settings
// never change the match, so they take taps while the match is reconnecting (question 4); only
// `interactive: false` refuses them. When the phone's own Reduce Motion forces it on, Frontend gives
// `motionLock: { reason }`: the switch is on, dimmed and refused, and Frontend's reason is both the row's
// line, in place of the usual one, and the switch's description (question 3); the component adds no words.

import { createControlPolicy, createKit } from '../kit/kit.mjs';
import { createEntryParts } from '../entry-parts/entry-parts.mjs';

export const DISPLAY_SETTINGS_VERSION = 'display-settings-0.1.0';
/** The text sizes, as the game keeps them (preferences.mjs textScale): Standard, Large, Largest. */
export const TEXT_SCALES = Object.freeze([1, 1.5, 2]);

/** The pack's words (screens-more.mjs, the settings screen; sheet 32). */
export const SETTINGS_WORDS = Object.freeze({
  back: 'Menu', page: 'Display', display: 'Display',
  motion: 'Reduce motion', motionLine: 'Films become stills; no shake or travel',
  textSize: 'Text size', sizes: Object.freeze({ 1: 'Standard', 1.5: 'Large', 2: 'Largest' }),
  note: 'These stay on this phone. They never change the match.',
  host: 'Host', hostControls: 'Host controls', hostLine: 'Bots, deadlines, recovery, abort',
  /** The shell sheet's title, which Frontend gives the shell when ⋮ opens it. */
  sheet: 'Settings',
});

/** Every input, with its default: Standard text, motion as usual, no host row. */
export const DISPLAY_SETTINGS_DEFAULTS = Object.freeze({
  interactive: true, reducedMotion: false, motionLock: null, textScale: 1, hostControls: null, insets: null,
});

const isText = value => typeof value === 'string' && value.length > 0;

/** The next input from the previous one and an update: each key given replaces that key; the rest stay. */
export function nextDisplaySettingsInput(previous, input = {}) {
  const next = { ...previous, ...input };
  next.interactive = next.interactive !== false;
  if (typeof next.reducedMotion !== 'boolean') throw new TypeError('reducedMotion is true or false, as the phone keeps it');
  if (next.motionLock !== null && next.motionLock !== undefined) {
    // The reason is Frontend's words, shown on the row and given to the switch: the component adds none.
    if (!isText(next.motionLock?.reason)) throw new TypeError('motionLock is null, or { reason } in Frontend\'s words');
    next.motionLock = Object.freeze({ reason: next.motionLock.reason });
  } else next.motionLock = null;
  if (!TEXT_SCALES.includes(next.textScale)) throw new TypeError(`textScale is ${TEXT_SCALES.join(', ')}, not ${JSON.stringify(next.textScale)}`);
  if (next.hostControls !== null && next.hostControls !== undefined) {
    const h = next.hostControls;
    if (typeof h !== 'object' || (h.reason !== null && h.reason !== undefined && typeof h.reason !== 'string')) throw new TypeError('hostControls is null, or { enabled, reason }');
    next.hostControls = Object.freeze({ enabled: h.enabled !== false, reason: isText(h.reason) ? h.reason : null });
  } else next.hostControls = null;
  if (next.insets !== null && next.insets !== undefined && (typeof next.insets !== 'object' || !['top', 'bottom'].every(k => next.insets[k] === undefined || Number.isFinite(next.insets[k])))) {
    throw new TypeError('insets are null, or { top, bottom } in px');
  }
  next.insets = next.insets ?? null;
  return next;
}

/** Whether the switch shows Reduce motion on: as the phone keeps it, or forced on by the phone's own setting. */
export const motionOn = s => s.reducedMotion || s.motionLock !== null;

/**
 * The options both mounts draw: the Reduce motion row and its switch, "Text size" and the three sizes, and the
 * note. Returns { nodes, paint(state, policy), switch, seg } for its mount to place and repaint.
 */
function createOptions(kit) {
  const W = SETTINGS_WORDS;
  const toggle = kit.switchControl({ checked: false, label: W.motion, intent: 'reduce-motion' });
  const motion = kit.row({ tag: 'div', icon: 'motion', tint: 'steel', title: W.motion, sub: W.motionLine, trail: toggle });
  motion.classList.add('ms-ds-motion');
  const sizes = TEXT_SCALES.map(scale => ({ id: String(scale), label: W.sizes[scale] }));
  // Words that may not fit side by side at the Largest text: there they stack, one a row (question 5).
  const seg = kit.seg({ options: sizes, value: '1', label: W.textSize, intent: 'text-size', stack: true });
  seg.classList.add('ms-ds-sizes');
  const nodes = [kit.list(motion), kit.groupLabel(W.textSize), seg, kit.groupNote(W.note)];
  function paint(s, policy) {
    const on = motionOn(s);
    kit.setSwitch(toggle, { checked: on, label: W.motion, intent: 'reduce-motion' });
    // Locked by the phone's own setting: Frontend's reason in place of the row's line, and as the switch's description.
    kit.setRow(motion, { tag: 'div', icon: 'motion', tint: 'steel', title: W.motion, sub: s.motionLock ? s.motionLock.reason : W.motionLine, trail: toggle });
    if (s.motionLock) motion.dataset.locked = ''; else delete motion.dataset.locked;
    policy.control(toggle, { off: s.motionLock !== null, reason: s.motionLock?.reason ?? null });
    kit.setSeg(seg, { options: sizes, value: String(s.textScale), label: W.textSize, intent: 'text-size', stack: true });
    for (const b of seg.children) policy.control(b, { intent: 'text-size' });
  }
  return { nodes, paint, toggle, seg };
}

/** Reports a tap on one of the options: the setting it asks for, or nothing when it asks for what is already so. */
function reportOption(target, s, on) {
  const intent = target.dataset.intent;
  if (intent === 'reduce-motion') { on.onReducedMotion?.(!motionOn(s)); return true; }
  if (intent === 'text-size') {
    const scale = Number(target.dataset.value);
    if (TEXT_SCALES.includes(scale) && scale !== s.textScale) on.onTextScale?.(scale);
    return true;
  }
  return false;
}

/**
 * Before a match: the Display page, which fills `host` (position it, and give it the phone's size). Returns
 * { update, dispose, layout, element }.
 */
export function mountDisplayPage(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('The Display page needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const parts = createEntryParts(doc);
  let state = nextDisplaySettingsInput(DISPLAY_SETTINGS_DEFAULTS, input);
  let disposed = false, lastLayout = null;
  const on = Object.fromEntries(['onReducedMotion', 'onTextScale', 'onBack', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  // ms-k-phone: the phone-sized container the kit's larger-text rules ask (kit 0.5.0).
  const root = kit.h('div', 'ms-display-settings ms-kit ms-k-phone ms-entry-parts', { tabindex: '-1', role: 'group', 'aria-label': SETTINGS_WORDS.page });
  const screen = parts.screen();
  const nav = parts.navBar({ title: SETTINGS_WORDS.page, back: { label: SETTINGS_WORDS.back, intent: 'back' } });
  const options = createOptions(kit);
  screen.append(nav, ...options.nodes);
  root.append(screen);
  host.append(root);
  const accepts = () => !disposed && state.interactive;
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); } });

  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    if (target.dataset.intent === 'back') on.onBack?.();
    else reportOption(target, state, on);
  };
  root.addEventListener('click', onClick);

  function render() {
    if (disposed) return;
    for (const [name, value] of [['--ms-ep-safe-t', state.insets?.top], ['--ms-ep-safe-b', state.insets?.bottom]]) {
      if (Number.isFinite(value)) root.style.setProperty(name, `${value}px`); else root.style.removeProperty(name);
    }
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    policy.control(nav.querySelector('.ms-ep-back'), {});
    options.paint(state, policy);
  }
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
    state = nextDisplaySettingsInput(state, next);
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
  return Object.freeze({ update, dispose, layout, element: root });
}

/**
 * In a match: the Settings sheet's content, in the phone shell's open sheet (`shell.sheetBody`), on its glass.
 * Returns { update, dispose, element }.
 */
export function mountSettingsSheet(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('The Settings sheet\'s content needs a host element: the shell\'s sheetBody');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  let state = nextDisplaySettingsInput(DISPLAY_SETTINGS_DEFAULTS, input);
  let disposed = false;
  const on = Object.fromEntries(['onReducedMotion', 'onTextScale', 'onHostControls', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));
  const W = SETTINGS_WORDS;

  const root = kit.h('div', 'ms-settings-sheet ms-kit', { tabindex: '-1', role: 'group', 'aria-label': W.sheet });
  const options = createOptions(kit);
  root.append(kit.groupLabel(W.display), ...options.nodes);
  host.append(root);
  const accepts = () => !disposed && state.interactive;
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); } });
  /** The Host group, only while Frontend gives hostControls (question 6): "Host" and the Host controls row. */
  let hostGroup = null, hostRow = null;

  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    if (target.dataset.intent === 'host-controls') on.onHostControls?.();
    else reportOption(target, state, on);
  };
  root.addEventListener('click', onClick);

  function render() {
    if (disposed) return;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    options.paint(state, policy);
    if (state.hostControls && !hostGroup) {
      hostRow = kit.row({ icon: 'host', tint: 'amber', title: W.hostControls, sub: W.hostLine, chevron: true, intent: 'host-controls' });
      hostGroup = kit.h('div', 'ms-ds-host');
      hostGroup.append(kit.groupLabel(W.host), kit.list(hostRow));
      root.append(hostGroup);
    } else if (!state.hostControls && hostGroup) {
      policy.remove(hostGroup);
      hostGroup = hostRow = null;
    }
    if (hostRow) policy.control(hostRow, { off: !state.hostControls.enabled, reason: state.hostControls.reason });
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextDisplaySettingsInput(state, next);
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, dispose, element: root });
}
