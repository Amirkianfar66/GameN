// Join: the joining player's form before a match, as the phone pack draws it (sheet 12, and sheet 13's Busy).
// Runtime source, Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual component
// once, in design/; the game and the preview use it as it is). Frontend mounts it when the menu's Join is
// tapped, keeps the code and the name, and routes Ask to join to today's requestAdmission.
//
// What it draws: "Menu" back and "Join"; "Join a room"; "Room code" over six boxes, with one real text box over
// them; "Your name" with its count; "This device", Player phone or Shared display; the errors in place; and
// Ask to join at the foot (the spinner while sending).
//
// The typing is the form's and the values are Frontend's: each keystroke reports onCode(text) or onName(text)
// with what the box holds, and Frontend gives back `code` and `name`, which the boxes then show.
// What it never does: work out whether a code is complete, whether a name is valid, what a character is, or why
// a request failed. Each callback reports a tap or a keystroke.

import { createControlPolicy, createKit } from '../kit/kit.mjs';
import { createEntryParts } from '../entry-parts/entry-parts.mjs';

export const JOIN_FORM_VERSION = 'join-form-0.1.0';
const DEVICES = Object.freeze(['player', 'display']);

/** The pack's words (screens-entry.mjs, join; sheets 12 and 13), and the connection's (the Lead's review of #289, question 4). */
export const JOIN_WORDS = Object.freeze({
  back: 'Menu', title: 'Join', heading: 'Join a room', code: 'Room code', name: 'Your name',
  placeholder: max => `1–${max} characters`, count: (n, max) => `${n}/${max}`,
  device: 'This device', player: 'Player phone', display: 'Shared display', ask: 'Ask to join', sending: 'Sending…',
  noRoom: 'No room has this code. Check it with the host.', started: 'This room has already started.',
  busy: 'Too many requests right now. Try again in a moment.', nameRule: max => `Use 1–${max} characters.`,
  offline: 'No connection. Ask to join returns when you are back online.',
});

const CONTROL = Object.freeze({ enabled: true, busy: false, reason: null });
/** Every input, with its default. */
export const JOIN_FORM_DEFAULTS = Object.freeze({
  interactive: true, reducedMotion: false, insets: null, code: '', codeError: null, name: '', nameCount: 0, nameMax: 12,
  nameError: null, device: 'player', ask: CONTROL, error: null,
});

const isText = value => typeof value === 'string' && value.length > 0;
const words = (name, value) => {
  if (value !== null && value !== undefined && !isText(value)) throw new TypeError(`${name} is null or words`);
  return value ?? null;
};
function checkControl(name, value) {
  if (value === null || typeof value !== 'object') throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}
function checkInsets(insets) {
  if (insets !== null && (typeof insets !== 'object' || !['top', 'bottom'].every(k => insets[k] === undefined || Number.isFinite(insets[k])))) {
    throw new TypeError('insets are null, or { top, bottom } in px');
  }
  return insets;
}

/** The next input from the previous one and an update: each key given replaces that key; the rest stay. */
export function nextJoinFormInput(previous, input = {}) {
  const next = { ...previous, ...input };
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  next.insets = checkInsets(next.insets ?? null);
  if (typeof next.code !== 'string' || [...next.code].length > 6) throw new TypeError('The code is up to six characters');
  if (typeof next.name !== 'string') throw new TypeError('The name is text');
  if (!Number.isInteger(next.nameCount) || next.nameCount < 0) throw new TypeError('nameCount is a whole number: the characters as the contract counts them');
  if (!Number.isInteger(next.nameMax) || next.nameMax < 1) throw new TypeError('nameMax is the contract\'s most, a whole number');
  if (!DEVICES.includes(next.device)) throw new TypeError(`The device is ${DEVICES.map(d => `"${d}"`).join(' or ')}`);
  next.codeError = words('codeError', next.codeError);
  next.nameError = words('nameError', next.nameError);
  next.error = words('error', next.error);
  next.ask = checkControl('ask', next.ask);
  return next;
}

/**
 * Mounts the form in `host`, which it fills (position it, and give it the phone's size). Returns
 * { focus(which), layout, update, dispose, element }. focus('code') or focus('name') puts the focus in that box,
 * when Frontend wants it there (the sheet draws the code's box ringed, as it is while typing).
 */
export function mountJoinForm(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('The join form needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const parts = createEntryParts(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);

  let state = nextJoinFormInput(JOIN_FORM_DEFAULTS, input);
  let disposed = false, lastLayout = null, codeNote = null, nameNote = null, errorNote = null, codeFocused = false;
  const on = Object.fromEntries(['onBack', 'onCode', 'onName', 'onDevice', 'onAsk', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));
  const uid = `ms-jf-${(mountJoinForm.count = (mountJoinForm.count ?? 0) + 1)}`;

  // ── The parts ───────────────────────────────────────────────────────
  // ms-k-phone: the phone-sized container the kit's larger-text rules ask (kit 0.5.0).
  const root = el('div', 'ms-join-form ms-kit ms-k-phone ms-entry-parts', { tabindex: '-1', role: 'group', 'aria-label': JOIN_WORDS.title });
  const screen = parts.screen();
  const nav = parts.navBar({ title: JOIN_WORDS.title, back: { label: JOIN_WORDS.back, intent: 'back' } });
  // The code: the label, one real text box over the six boxes (which only show Frontend's code), the error under them.
  const codeField = el('div', 'ms-k-field ms-jf-code-field');
  const codeLabel = el('label', 'ms-k-field-label', { for: `${uid}-code` });
  kit.text(codeLabel, JOIN_WORDS.code);
  const codePlace = el('div', 'ms-jf-code');
  const boxes = kit.codeBoxes({ code: '', label: JOIN_WORDS.code });
  kit.attr(boxes, 'aria-hidden', 'true');
  const codeInput = el('input', 'ms-jf-code-input', { id: `${uid}-code`, type: 'text', inputmode: 'text', autocapitalize: 'characters', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', maxlength: '6' });
  codePlace.append(boxes, codeInput);
  codeField.append(codeLabel, codePlace);
  // The name: the kit's field, with its count.
  const { field: nameField, input: nameInput } = kit.field({ label: JOIN_WORDS.name, value: '', autocomplete: 'nickname' });
  nameInput.id = `${uid}-name`;
  const deviceLabel = kit.groupLabel(JOIN_WORDS.device);
  const devices = kit.seg({ options: [], value: null, label: JOIN_WORDS.device, intent: 'device', stack: true });
  const foot = parts.foot();
  const ask = kit.button({ label: JOIN_WORDS.ask, kind: 'primary', block: true, icon: 'join', intent: 'ask', extra: ['ms-jf-ask'] });
  foot.append(ask);
  screen.append(nav, parts.largeTitle(JOIN_WORDS.heading), codeField, nameField, deviceLabel, devices, foot);
  root.append(screen);
  host.append(root);

  const accepts = () => !disposed && state.interactive;
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); } });

  // ── Taps and typing: one delegated listener each; each reports, and only that ──
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    const intent = target.dataset.intent;
    if (intent === 'back') on.onBack?.();
    else if (intent === 'device') { if (target.getAttribute('aria-checked') !== 'true') on.onDevice?.(target.dataset.value); }
    else if (intent === 'ask') on.onAsk?.();
  };
  const onInput = event => {
    if (!accepts()) return;
    if (event.target === codeInput) on.onCode?.(codeInput.value);
    else if (event.target === nameInput) on.onName?.(nameInput.value);
  };
  // Return in either box is Ask to join, when it is available.
  const onKey = event => {
    if (event.key !== 'Enter' || (event.target !== codeInput && event.target !== nameInput)) return;
    event.preventDefault();
    if (accepts() && !policy.refused(ask)) on.onAsk?.();
  };
  // The ring follows the code box's focus; a focus leaving is read once the next one has landed.
  const onFocus = () => { if (disposed) return; const now = doc.activeElement === codeInput; if (now !== codeFocused) { codeFocused = now; paintBoxes(); } };
  const onBlur = () => win.setTimeout(onFocus, 0);
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('keydown', onKey);
  root.addEventListener('focusin', onFocus);
  root.addEventListener('focusout', onBlur);

  /** A box's value is Frontend's: when it differs from what the box holds, the box takes it, the caret at its end. */
  function give(box, value) {
    if (box.value === value) return;
    box.value = value;
    if (doc.activeElement === box) box.setSelectionRange(value.length, value.length);
  }
  /** The six boxes: Frontend's code a character each; the next empty one ringed amber while the code has the focus. */
  function paintBoxes() {
    const code = [...state.code];
    kit.setCodeBoxes(boxes, { code, focusAt: codeFocused && code.length < 6 ? code.length : null, invalid: !!state.codeError, label: JOIN_WORDS.code });
    kit.attr(boxes, 'aria-hidden', 'true');
  }
  /** An error note in its place: created, changed or removed; the box it describes says so. */
  function placeNote(current, words, after, describes) {
    let note = current;
    if (words && !note) { note = kit.errorNote(words); note.id = `${uid}-${describes ? describes.id.slice(uid.length + 1) : 'error'}-error`; after(note); }
    else if (words && note) kit.text(note.querySelector('.ms-k-error-text'), words);
    else if (!words && note) { note.remove(); note = null; }
    if (describes) {
      kit.attr(describes, 'aria-invalid', words ? 'true' : null);
      kit.attr(describes, 'aria-describedby', note ? note.id : null);
    }
    return note;
  }

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    if (disposed) return;
    for (const [name, value] of [['--ms-ep-safe-t', state.insets?.top], ['--ms-ep-safe-b', state.insets?.bottom]]) {
      if (Number.isFinite(value)) root.style.setProperty(name, `${value}px`); else root.style.removeProperty(name);
    }
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    give(codeInput, state.code);
    give(nameInput, state.name);
    codeInput.readOnly = nameInput.readOnly = !state.interactive;
    paintBoxes();
    codeNote = placeNote(codeNote, state.codeError, note => codePlace.after(note), codeInput);
    kit.setField(nameField, { label: JOIN_WORDS.name, placeholder: JOIN_WORDS.placeholder(state.nameMax), count: JOIN_WORDS.count(state.nameCount, state.nameMax), invalid: !!state.nameError });
    nameNote = placeNote(nameNote, state.nameError, note => nameField.after(note), nameInput);
    kit.setSeg(devices, { options: [{ id: 'player', label: JOIN_WORDS.player, icon: 'phone' }, { id: 'display', label: JOIN_WORDS.display, icon: 'display' }], value: state.device, label: JOIN_WORDS.device, intent: 'device', stack: true });
    for (const b of devices.children) policy.control(b, { intent: 'device' });
    errorNote = placeNote(errorNote, state.error, note => devices.after(note), null);
    kit.setButton(ask, { label: state.ask.busy ? JOIN_WORDS.sending : JOIN_WORDS.ask, kind: 'primary', block: true, icon: 'join', intent: 'ask', extra: ['ms-jf-ask'] });
    policy.control(ask, { off: !state.ask.enabled, busy: state.ask.busy, reason: state.ask.reason });
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

  function focus(which) {
    if (disposed) return;
    const box = which === 'code' ? codeInput : which === 'name' ? nameInput : null;
    if (!box) throw new TypeError('focus() takes "code" or "name"');
    box.focus({ preventScroll: true });
    box.setSelectionRange(box.value.length, box.value.length);
    onFocus();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextJoinFormInput(state, next);
    render();
    reportLayout();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
    root.removeEventListener('keydown', onKey);
    root.removeEventListener('focusin', onFocus);
    root.removeEventListener('focusout', onBlur);
    policy.dispose();
    root.remove();
  }

  render();
  if (!observer) reportLayout();
  return Object.freeze({ focus, layout, update, dispose, element: root });
}
