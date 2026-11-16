// The main menu: the phone's menu after the intro, as the phone pack draws it (sheet 10). Runtime source,
// Designer's (the owner, 14 and 15 November 2026: Designer builds each visual component once, in design/; the
// game and the preview use it as it is). Frontend mounts it on the entry screen after the brand intro, when
// no match, admission or recovery is under way, draws the brand film's frame at 1.65 s in `menu.hero` with
// its existing player, gives it the session's availability, and routes the four taps to their screens.
//
// What it draws: the hero's place in the top 58 % with the canvas fading over its lower 40 %; the display-
// settings button at the top right; at the foot, Join (the primary entry choice), Host (the entry choice)
// and "Recover my seat" (the kit's plain button with the filled key); offline, the kit's inline error with
// the offline icon above Join. No phone shell: no bar, tabs or match status, on the phone's canvas.
//
// What it never does: work out whether the phone is online or whether a choice can start. Frontend gives
// each choice's availability and reason; a refused choice keeps its focus. Each callback reports a tap.
// Nothing here is private: the menu is the same for everyone, before any match.

import { createControlPolicy, createKit } from '../kit/kit.mjs';
import { createEntryParts } from '../entry-parts/entry-parts.mjs';

export const MAIN_MENU_VERSION = 'main-menu-0.1.0';
const NOTICES = Object.freeze([null, 'offline']);
/** How far above the choices' top the cover over the hero begins, fading in to the canvas at their top. */
export const COVER_LEAD_PX = 24;

/** The pack's words (screens-entry.mjs, the menu; sheet 10). */
export const MENU_WORDS = Object.freeze({
  name: 'Main menu',
  join: 'Join',
  joinSub: 'Enter a room code',
  host: 'Host',
  hostSub: 'Open a room for 7–9 players',
  recover: 'Recover my seat',
  settings: 'Display settings',
  offline: 'No connection. Join, Host and Recover return when you are back online.',
});

const CHOICE = Object.freeze({ enabled: true, busy: false, reason: null });
/** Every input, with its default. */
export const MAIN_MENU_DEFAULTS = Object.freeze({
  interactive: true, reducedMotion: false, insets: null, notice: null,
  join: CHOICE, host: CHOICE, recover: CHOICE, settings: Object.freeze({ enabled: true }),
});

const isText = value => typeof value === 'string' && value.length > 0;
function checkChoice(name, value) {
  if (value === null || typeof value !== 'object') throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}

/** The next input from the previous one and an update: each key given replaces that key; the rest stay. */
export function nextMainMenuInput(previous, input = {}) {
  const next = { ...previous, ...input };
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  if (next.insets !== null && (typeof next.insets !== 'object' || !['top', 'bottom'].every(k => next.insets[k] === undefined || Number.isFinite(next.insets[k])))) {
    throw new TypeError('insets are null, or { top, bottom } in px');
  }
  if (next.notice === undefined) next.notice = null;
  if (!NOTICES.includes(next.notice)) throw new TypeError(`The notice is null or "offline", not ${JSON.stringify(next.notice)}`);
  for (const name of ['join', 'host', 'recover']) next[name] = checkChoice(name, next[name]);
  if (next.settings === null || typeof next.settings !== 'object') throw new TypeError('settings is { enabled }');
  next.settings = Object.freeze({ enabled: next.settings.enabled !== false });
  return next;
}

/**
 * Mounts the menu in `host`, which it fills (position it, and give it the phone's size). Returns
 * { hero, layout, update, dispose, element }.
 */
export function mountMainMenu(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A main menu needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const parts = createEntryParts(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);

  let state = nextMainMenuInput(MAIN_MENU_DEFAULTS, input);
  let disposed = false, lastLayout = null, note = null;
  const on = Object.fromEntries(['onJoin', 'onHost', 'onRecover', 'onSettings', 'onLayout'].map(k => [k, handlers[k] ?? null]));

  // ── The parts ───────────────────────────────────────────────────────
  const root = el('div', 'ms-main-menu ms-kit ms-entry-parts', { tabindex: '-1', role: 'group', 'aria-label': MENU_WORDS.name });
  // The hero: Frontend's player draws the brand film's held frame in `hero`; the fade to the canvas is drawn over it.
  const heroFrame = el('div', 'ms-mm-heroframe', { 'aria-hidden': 'true' });
  const hero = el('div', 'ms-mm-hero');
  // The pack's fade, and the cover that follows the choices when larger text raises them into the hero.
  const cover = el('div', 'ms-mm-cover');
  cover.hidden = true;
  heroFrame.append(hero, el('div', 'ms-mm-fade'), cover);
  const settingsPlace = el('div', 'ms-mm-settings');
  const settings = kit.iconButton({ icon: 'settings', label: MENU_WORDS.settings, intent: 'settings' });
  settingsPlace.append(settings);
  const actions = el('div', 'ms-mm-actions');
  const join = parts.entry({ title: MENU_WORDS.join, sub: MENU_WORDS.joinSub, icon: 'join', tone: 'primary', intent: 'join' });
  const hostChoice = parts.entry({ title: MENU_WORDS.host, sub: MENU_WORDS.hostSub, icon: 'host', intent: 'host' });
  const recover = kit.button({ label: MENU_WORDS.recover, kind: 'plain', icon: 'key', filled: true, intent: 'recover', extra: ['ms-mm-recover'] });
  actions.append(join, hostChoice, recover);
  root.append(heroFrame, settingsPlace, actions);
  host.append(root);

  const accepts = () => !disposed && state.interactive;
  const policy = createControlPolicy({ root, accepts });

  // ── Taps: one delegated listener; each reports a tap, and only that ──
  const report = { join: 'onJoin', host: 'onHost', recover: 'onRecover', settings: 'onSettings' };
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || !report[target.dataset.intent] || policy.refused(target) || !accepts()) return;
    on[report[target.dataset.intent]]?.();
  };
  root.addEventListener('click', onClick);

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    if (disposed) return;
    // The safe areas: Frontend's, or the browser's (the stylesheet's env() fallback).
    for (const [name, value] of [['--ms-mm-safe-t', state.insets?.top], ['--ms-mm-safe-b', state.insets?.bottom]]) {
      if (Number.isFinite(value)) root.style.setProperty(name, `${value}px`); else root.style.removeProperty(name);
    }
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    // Offline: the kit's inline error with the offline icon, unfilled, above Join (an alert when it appears).
    if (state.notice === 'offline' && !note) { note = kit.errorNote(MENU_WORDS.offline, { icon: 'offline', filled: false }); note.classList.add('ms-mm-note'); actions.prepend(note); }
    if (state.notice !== 'offline' && note) { note.remove(); note = null; }
    for (const [node, choice] of [[join, state.join], [hostChoice, state.host], [recover, state.recover]]) {
      policy.control(node, { off: !choice.enabled, busy: choice.busy, reason: choice.reason });
    }
    policy.control(settings, { off: !state.settings.enabled });
    placeCover();
  }

  /**
   * Nothing in the choices ever sits on the hero's words. At the Standard text they start below the hero, as
   * sheet 10 draws them, and only the pack's fade is drawn. When larger text raises them into the hero, the
   * canvas covers it from COVER_LEAD_PX above their top (the note's, or Join's), fading in over that distance.
   */
  function placeCover() {
    if (disposed || !root.isConnected) return;
    // From the hero's top, to the fraction of a pixel (the boxes, not offsetTop, which rounds).
    const frame = heroFrame.getBoundingClientRect();
    const top = (actions.firstElementChild ?? actions).getBoundingClientRect().top - frame.top;
    const raised = top < frame.height;
    cover.hidden = !raised;
    const value = raised ? `${Math.round((top - COVER_LEAD_PX) * 100) / 100}px` : '';
    if (root.style.getPropertyValue('--ms-mm-cover-top') !== value) {
      if (value) root.style.setProperty('--ms-mm-cover-top', value); else root.style.removeProperty('--ms-mm-cover-top');
    }
  }
  // ── Layout ──────────────────────────────────────────────────────────
  function layout() {
    if (disposed) return null;
    const round = v => Math.round(v * 100) / 100;
    const box = root.getBoundingClientRect(), h = heroFrame.getBoundingClientRect();
    // The safe areas as drawn: the settings button sits 4 px under the top one, the choices 18 px over the bottom one.
    const top = parseFloat(win.getComputedStyle(settingsPlace).top) - 4;
    const bottom = parseFloat(win.getComputedStyle(actions).bottom) - 18;
    return { size: { width: round(box.width), height: round(box.height) }, safe: { top: round(top), bottom: round(bottom) }, hero: { width: round(h.width), height: round(h.height) } };
  }
  function reportLayout() {
    if (disposed || !root.isConnected) return;
    const next = layout(), key = JSON.stringify(next);
    if (key === lastLayout) return;
    lastLayout = key;
    on.onLayout?.(next);
  }
  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => { placeCover(); reportLayout(); }) : null;
  observer?.observe(root);
  // The choices grow with the text: the cover follows them.
  observer?.observe(actions);

  function update(next = {}) {
    if (disposed) return;
    state = nextMainMenuInput(state, next);
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
  return Object.freeze({ hero, layout, update, dispose, element: root });
}
