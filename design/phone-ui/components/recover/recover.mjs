// Recover: the screen a player uses to take their seat back with the host's code, as the phone pack draws it
// (sheet 14). Runtime source, Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual
// component once, in design/; the game and the preview use it as it is). Frontend mounts it when the menu's
// "Recover my seat" is tapped, keeps the Match ID, and routes Recover seat to today's redeemRecovery.
//
// What it draws: "Menu" back and "Recover"; "Recover your seat"; "Match ID" in the mono face; "Recovery code" as
// dots; the refusal under the code; the note that the host makes the code and that it never appears on the
// shared display (#222 item 25); Recover seat at the foot (the spinner while checking); and once recovered, the
// check, "Seat 4 is yours again", and Continue.
//
// The recovery code is private to its seat, and stays in its box (the Lead's review of #291, question 1): each
// keystroke reports only its length, and onRecover hands it over once, at the tap. Frontend never gives it back.
// The box is emptied once the seat is recovered and on dispose, and the code is never put in an attribute, a
// report or the layout. What it never does: work out whether a code was accepted, how long one lasts, or why.

import { createControlPolicy, createKit, followTextSize } from '../kit/kit.mjs';
import { createEntryParts } from '../entry-parts/entry-parts.mjs';

export const RECOVER_VERSION = 'recover-0.1.1';
const VIEWS = Object.freeze(['form', 'recovered']);

/** The pack's words (screens-entry.mjs, recover; sheet 14), and the connection's (the Lead's review of #291, question 2). */
export const RECOVER_WORDS = Object.freeze({
  back: 'Menu', title: 'Recover', heading: 'Recover your seat', matchId: 'Match ID', matchIdHint: 'From the host',
  code: 'Recovery code', codeHint: length => `${length} characters`,
  note: 'The host makes a code for your seat in Host controls. It is never shown on the shared display.',
  refused: 'That code was not accepted. A code works once, for 15 minutes. Ask the host for a new one.',
  recover: 'Recover seat', checking: 'Checking…',
  recovered: seat => `Seat ${seat} is yours again`, recoveredLine: 'Back to the match where it is now', continue: 'Continue',
  offline: 'No connection. Recover returns when you are back online.',
});

const CONTROL = Object.freeze({ enabled: true, busy: false, reason: null });
/** Every input, with its default. */
export const RECOVER_DEFAULTS = Object.freeze({
  interactive: true, reducedMotion: false, insets: null, view: 'form', matchId: '', codeLength: null, codeError: null,
  recover: CONTROL, error: null, seat: null,
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
export function nextRecoverInput(previous, input = {}) {
  if ('recoveryCode' in input || 'code' in input) throw new TypeError('The recovery code stays in its box: Frontend never gives it back');
  const next = { ...previous, ...input };
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  next.insets = checkInsets(next.insets ?? null);
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is "form" or "recovered", not ${JSON.stringify(next.view)}`);
  if (typeof next.matchId !== 'string') throw new TypeError('The Match ID is text');
  if (next.codeLength !== null && next.codeLength !== undefined && !(Number.isInteger(next.codeLength) && next.codeLength > 0)) throw new TypeError('codeLength is null, or the issued codes\' length');
  next.codeLength = next.codeLength ?? null;
  next.codeError = words('codeError', next.codeError);
  next.error = words('error', next.error);
  next.recover = checkControl('recover', next.recover);
  if (next.seat !== null && next.seat !== undefined && !(Number.isInteger(next.seat) && next.seat > 0)) throw new TypeError('The seat is a seat number, or null');
  next.seat = next.seat ?? null;
  if (next.view === 'recovered' && next.seat === null) throw new TypeError('Recovered, the screen needs the seat');
  return next;
}

/**
 * Mounts the screen in `host`, which it fills (position it, and give it the phone's size). Returns
 * { focus(which), clearCode, layout, update, dispose, element }. focus('matchId') or focus('code') puts the focus
 * in that box, where Frontend wants it; clearCode() empties the code's box.
 */
export function mountRecover(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('The recover screen needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const parts = createEntryParts(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);

  let state = nextRecoverInput(RECOVER_DEFAULTS, input);
  let disposed = false, lastLayout = null, shown = null, codeNote = null, errorNote = null;
  const on = Object.fromEntries(['onBack', 'onMatchId', 'onCode', 'onRecover', 'onContinue', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));
  const uid = `ms-rv-${(mountRecover.count = (mountRecover.count ?? 0) + 1)}`;

  // ── The parts ───────────────────────────────────────────────────────
  // ms-k-phone: the phone-sized container the kit's larger-text rules ask (kit 0.5.0).
  const root = el('div', 'ms-recover ms-kit ms-k-phone ms-entry-parts', { tabindex: '-1', role: 'group', 'aria-label': RECOVER_WORDS.title });
  const screen = parts.screen();
  const nav = parts.navBar({ title: RECOVER_WORDS.title, back: { label: RECOVER_WORDS.back, intent: 'back' } });
  screen.append(nav);
  root.append(screen);
  host.append(root);
  // A phone root outside the shell: a part opened after the text size changes takes the new size's rules (kit 0.8.1).
  const textSize = followTextSize(root);
  // The form's boxes live for the screen's life, so the Match ID and the code keep their typing across views.
  const { field: idField, input: idBox } = kit.field({ label: RECOVER_WORDS.matchId, value: '', placeholder: RECOVER_WORDS.matchIdHint, mono: true, autocomplete: 'off' });
  idBox.id = `${uid}-match`;
  // The kit's secret field: a password box, with no autocomplete, autocapitalize or spellcheck.
  const { field: codeField, input: codeBox } = kit.field({ label: RECOVER_WORDS.code, value: '', secret: true, autocomplete: 'off' });
  codeBox.id = `${uid}-code`;

  const accepts = () => !disposed && state.interactive;
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); } });

  // ── Taps and typing: one delegated listener each; each reports, and only that ──
  /** The one place the code leaves its box: Recover seat, when it is available. */
  const recoverNow = () => { if (accepts() && action && !policy.refused(action) && shown === 'form') on.onRecover?.({ matchId: state.matchId, recoveryCode: codeBox.value }); };
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    const intent = target.dataset.intent;
    if (intent === 'back') on.onBack?.();
    else if (intent === 'recover') recoverNow();
    else if (intent === 'continue') on.onContinue?.();
  };
  const onInput = event => {
    if (!accepts()) return;
    if (event.target === idBox) on.onMatchId?.(idBox.value);
    // The code's keystrokes report its length only.
    else if (event.target === codeBox) on.onCode?.({ length: [...codeBox.value].length });
  };
  const onKey = event => {
    if (event.key !== 'Enter' || (event.target !== idBox && event.target !== codeBox)) return;
    event.preventDefault();
    recoverNow();
  };
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('keydown', onKey);

  /** The Match ID is Frontend's: when it differs from what the box holds, the box takes it, the caret at its end. */
  function give(box, value) {
    if (box.value === value) return;
    box.value = value;
    if (doc.activeElement === box) box.setSelectionRange(value.length, value.length);
  }
  function placeNote(current, words, after, describes) {
    let note = current;
    if (words && !note) { note = kit.errorNote(words); note.id = `${uid}-${describes ? 'code' : 'general'}-error`; after(note); }
    else if (words && note) kit.text(note.querySelector('.ms-k-error-text'), words);
    else if (!words && note) { note.remove(); note = null; }
    if (describes) kit.attr(describes, 'aria-describedby', note ? note.id : null);
    return note;
  }

  // ── The views ───────────────────────────────────────────────────────
  let body = [], action = null, wait = null, foot = null;
  function clearCode() { codeBox.value = ''; }
  function build(view) {
    for (const node of body) policy.remove(node);
    codeNote = errorNote = null;
    if (view === 'form') {
      foot = parts.foot();
      action = kit.button({ label: RECOVER_WORDS.recover, kind: 'primary', block: true, icon: 'key', intent: 'recover', extra: ['ms-rv-recover'] });
      foot.append(action);
      body = [parts.largeTitle(RECOVER_WORDS.heading), idField, codeField, kit.groupNote(RECOVER_WORDS.note), foot];
    } else {
      // Recovered: the secret leaves the page.
      clearCode();
      wait = kit.wait({ icon: 'check', filled: false, title: RECOVER_WORDS.recovered(state.seat), line: RECOVER_WORDS.recoveredLine });
      foot = parts.foot();
      action = kit.button({ label: RECOVER_WORDS.continue, kind: 'primary', block: true, intent: 'continue', extra: ['ms-rv-continue'] });
      foot.append(action);
      body = [wait, foot];
    }
    screen.append(...body);
    shown = view;
  }

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    if (disposed) return;
    for (const [name, value] of [['--ms-ep-safe-t', state.insets?.top], ['--ms-ep-safe-b', state.insets?.bottom]]) {
      if (Number.isFinite(value)) root.style.setProperty(name, `${value}px`); else root.style.removeProperty(name);
    }
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    policy.control(nav.querySelector('.ms-ep-back'), {});
    if (shown !== state.view) build(state.view);
    if (state.view === 'form') {
      give(idBox, state.matchId);
      idBox.readOnly = codeBox.readOnly = !state.interactive;
      // The hint says the issued codes' length, from Frontend; without it, no count is guessed.
      kit.setField(codeField, { label: RECOVER_WORDS.code, placeholder: state.codeLength ? RECOVER_WORDS.codeHint(state.codeLength) : null, invalid: !!state.codeError });
      codeNote = placeNote(codeNote, state.codeError, note => codeField.after(note), codeBox);
      errorNote = placeNote(errorNote, state.error, note => foot.before(note), null);
      kit.setButton(action, { label: state.recover.busy ? RECOVER_WORDS.checking : RECOVER_WORDS.recover, kind: 'primary', block: true, icon: 'key', intent: 'recover', extra: ['ms-rv-recover'] });
      policy.control(action, { off: !state.recover.enabled, busy: state.recover.busy, reason: state.recover.reason });
    } else {
      kit.setWait(wait, { icon: 'check', filled: false, title: RECOVER_WORDS.recovered(state.seat), line: RECOVER_WORDS.recoveredLine });
      policy.control(action, {});
    }
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
    const box = which === 'matchId' ? idBox : which === 'code' ? codeBox : null;
    if (!box) throw new TypeError('focus() takes "matchId" or "code"');
    if (!box.isConnected) return;
    box.focus({ preventScroll: true });
    box.setSelectionRange(box.value.length, box.value.length);
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextRecoverInput(state, next);
    render();
    reportLayout();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    // The secret leaves the page with the screen.
    clearCode();
    observer?.disconnect();
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
    root.removeEventListener('keydown', onKey);
    policy.dispose();
    textSize.dispose();
    root.remove();
  }

  render();
  if (!observer) reportLayout();
  return Object.freeze({ focus, clearCode: () => { if (!disposed) clearCode(); }, layout, update, dispose, element: root });
}
