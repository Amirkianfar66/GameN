// The Hospital panel (sheets 23 and 43): runtime source, Designer's (the owner, 14 and 15 November 2026: Designer
// builds each visual component once, in design/; the game and the previews use it as it is). The interface the
// Lead Designer approved on 16 November (docs/design/components/hospital-panel.md), drawn as the phone pack draws
// it (design/phone-ui/prototype/screens-more.mjs panel()):
//   - mountPanelKeypad() with panelSheet({ step: 'keypad' }): the number display ("_" until a key is pressed) and
//     the keypad, every player's number in its place in a 3 × 3; "One attempt: the Doctor’s player number."; with
//     a number picked, "Submit 3" in the shell's footer; while it sends, "Submitting…";
//   - mountPanelStatus() with panelSheet({ step: 'status' }): the request's record as the patient sees it:
//     REGISTERED, WRONG NUMBER, and the undrawn TREATED, NO EFFECT and DISCARDED (the Lead's Q4); the attempt used
//     with no record; and "The panel is unavailable right now".
// The stamps snap in as REGISTERED does, over 120 ms, and are there at once with Reduce motion.
// It is built on the kit alone (component-kit-0.8.0): the notice, the stamp, the group note, the inline error and
// the control policy. The display and the keys are its own (the pack's .display-num and .keypad, which no other
// part draws).
// Each part is mounted in the shell's sheet body for its step and returns { element, update, suspend, resume,
// dispose }; panelSheet() gives the shell its words. It is all this viewer's: the patient's own phone. The
// component works nothing out: the keys are the PANEL_CODE offer's, the record is the projection's, and the pick
// is Frontend's. Sheet 43: "An empty injection pool must not confirm the Doctor's number" — the component never
// reads the Doctor, the pool or anyone's health, and "unavailable" is the same, word for word, whatever the reason.
// Privacy (the Lead, 16 November): the picked number never reaches an attribute's value, the console or the
// layout. It is the display's words, and the picked key is pressed (aria-pressed="true", as the pack's). Every
// key's own value is a public player number, the same on every phone: onPick reports a tapped key's seat, and
// onFocusReturn the key that had the focus by its number, as the control policy reports every control.

import { createControlPolicy, createKit, seatNumber } from '../kit/kit.mjs';

export const HOSPITAL_PANEL_VERSION = 'hospital-panel-0.1.0';
/**
 * The pack's words (screens-more.mjs panel(), sheets 23 and 43), and the undrawn records' (the Lead's Q4, 16
 * November): they state the record and nothing else, never a reason, the pool or the Doctor.
 */
export const PANEL_WORDS = Object.freeze({
  title: 'Hospital panel', onlyHere: 'Only on this phone', note: 'One attempt: the Doctor’s player number.', empty: '_',
  submit: n => `Submit ${n}`, submitting: 'Submitting…',
  registered: 'REGISTERED', queued: 'Your request is queued for Rescue', nothingYet: 'Nothing happens until then',
  wrong: 'WRONG NUMBER', used: 'Your attempt is used', unavailable: 'The panel is unavailable right now',
  treated: 'TREATED', treatedLine: 'You were treated',
  noEffect: 'NO EFFECT', noEffectLine: 'Your request had no effect',
  discarded: 'DISCARDED', discardedLine: 'Your request was discarded',
  stale: 'Controls return when the match is current',
});
/**
 * What the status part shows: the record's status (abilities.panelRequest.status), 'spent' for an attempt used
 * with no record (abilities.panelAttemptSpent on a historical version), or 'unavailable' (no offer, or the
 * server's uniform NO_INJECTION).
 */
export const PANEL_RESULTS = Object.freeze(['QUEUED', 'WRONG', 'TREATED', 'NO_EFFECT', 'DISCARDED', 'spent', 'unavailable']);
/** Each result as the kit's notice draws it: the pack's tones (a good outcome amber, the rest paper) and words. */
const RESULT_LOOKS = Object.freeze({
  QUEUED: { stamp: { text: PANEL_WORDS.registered, tone: 'amber' }, lines: [PANEL_WORDS.queued, PANEL_WORDS.nothingYet] },
  WRONG: { stamp: { text: PANEL_WORDS.wrong, tone: null }, lines: [PANEL_WORDS.used] },
  TREATED: { stamp: { text: PANEL_WORDS.treated, tone: 'amber' }, lines: [PANEL_WORDS.treatedLine, PANEL_WORDS.used] },
  NO_EFFECT: { stamp: { text: PANEL_WORDS.noEffect, tone: null }, lines: [PANEL_WORDS.noEffectLine, PANEL_WORDS.used] },
  DISCARDED: { stamp: { text: PANEL_WORDS.discarded, tone: null }, lines: [PANEL_WORDS.discardedLine, PANEL_WORDS.used] },
  spent: { icon: 'lock', filled: true, lines: [PANEL_WORDS.used] },
  unavailable: { icon: 'panel', filled: false, lines: [PANEL_WORDS.unavailable] },
});

const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const PHASES = Object.freeze(['ready', 'sending']);
const STEPS = Object.freeze(['keypad', 'status']);

const isText = value => typeof value === 'string' && value.length > 0;
const optionalText = (value, what) => {
  if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${what} is text, or null`);
  return value === '' ? null : value ?? null;
};
const isSeat = id => (Number.isSafeInteger(id) && id >= 1 && id <= 9) || (typeof id === 'string' && /^seat-[1-9]$/.test(id));
const seatOf = id => seatNumber({ seat: id });
const isNumber = n => Number.isSafeInteger(n) && n >= 1 && n <= 9;

// ── Inputs ──────────────────────────────────────────────────────────────
const COMMON = Object.freeze({ viewer: null, status: 'live', interactive: true, reducedMotion: false, versions: null });
function checkCommon(next) {
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  next.interactive = next.interactive !== false;
  next.reducedMotion = !!next.reducedMotion;
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is a seat, or null');
  // The seat's number, so a viewer given as 'seat-4' or 4 is the same viewer.
  next.viewer = next.viewer === null || next.viewer === undefined ? null : seatOf(next.viewer);
}
const checkPhase = value => {
  if (!PHASES.includes(value)) throw new TypeError('phase is ready or sending');
  return value;
};
/** Not accepted: Frontend's words, drawn as the kit's inline note. */
function checkError(error) {
  if (error === null || error === undefined) return null;
  if (!isText(error.text)) throw new TypeError('error is { text, detail }, or null');
  return Object.freeze({ text: error.text, detail: optionalText(error.detail, 'error.detail') });
}

/** A part's inputs: its defaults, which of them are this viewer's own, and its check. */
function part(defaults, viewerKeys, check) {
  const known = new Set(Object.keys(defaults));
  const normalize = input => {
    for (const key of Object.keys(input)) if (!known.has(key)) throw new TypeError(`Unknown input ${JSON.stringify(key)}`);
    const next = { ...defaults, ...input };
    checkCommon(next);
    return Object.freeze(check(next));
  };
  /** Each key an update gives replaces that key; this viewer's own are dropped while concealed, and for a new viewer unless given. */
  const merge = (previous, input) => {
    for (const key of Object.keys(input)) if (!known.has(key)) throw new TypeError(`Unknown input ${JSON.stringify(key)}`);
    const merged = { ...previous, ...input };
    const viewerChanged = 'viewer' in input && previous.viewer !== (input.viewer === null || input.viewer === undefined ? null : seatOf(input.viewer));
    if ((merged.status ?? 'live') === 'concealed') for (const key of viewerKeys) merged[key] = defaults[key];
    else if (viewerChanged) for (const key of viewerKeys) if (!(key in input)) merged[key] = defaults[key];
    return normalize(merged);
  };
  return { normalize, merge };
}

/**
 * The keypad: the PANEL_CODE offer's keys (every original player's number, 1 to N: the contract checks exactly
 * seat-1…seat-N), the pick (Frontend's), whether Submit is sending, and Frontend's words when not accepted. Each
 * key is { seat, number }: the seat in Frontend's own form, which onPick reports back, and the number on the key.
 */
export const PANEL_KEYPAD_DEFAULTS = Object.freeze({ ...COMMON, keys: Object.freeze([]), picked: null, phase: 'ready', error: null });
const KEYPAD = part(PANEL_KEYPAD_DEFAULTS, ['keys', 'picked', 'phase', 'error'], next => {
  if (!Array.isArray(next.keys) || next.keys.length > 9) throw new TypeError('keys is a list of up to nine { seat, number }');
  const numbers = new Set(), seats = new Set();
  const keys = next.keys.map((k, i) => {
    if (!k || typeof k !== 'object' || !isSeat(k.seat) || !isNumber(k.number)) throw new TypeError(`keys[${i}] is { seat, number }, the number 1 to 9`);
    if (numbers.has(k.number) || seats.has(seatOf(k.seat))) throw new TypeError(`keys[${i}] repeats a number or a seat`);
    numbers.add(k.number);
    seats.add(seatOf(k.seat));
    return Object.freeze({ seat: k.seat, number: k.number });
  });
  // The pick is the patient's own: never in an error's words.
  let picked = null;
  if (next.picked !== null && next.picked !== undefined) {
    if (!isSeat(next.picked)) throw new TypeError('picked is a seat from keys, or null');
    picked = keys.find(k => seatOf(k.seat) === seatOf(next.picked)) ?? null;
    if (!picked) throw new TypeError('picked is a seat from keys, or null');
  }
  const phase = checkPhase(next.phase);
  if (phase === 'sending' && !picked) throw new TypeError('Submit sends the picked number: sending needs picked');
  return { ...next, keys: Object.freeze(keys), picked: picked ? picked.seat : null, phase, error: checkError(next.error) };
});
export const checkPanelKeypad = input => KEYPAD.normalize(input);

/** The status: one of PANEL_RESULTS, or null (nothing drawn). */
export const PANEL_STATUS_DEFAULTS = Object.freeze({ ...COMMON, result: null });
const STATUS = part(PANEL_STATUS_DEFAULTS, ['result'], next => {
  if (next.result !== null && next.result !== undefined && !PANEL_RESULTS.includes(next.result)) throw new TypeError(`result is ${PANEL_RESULTS.join(', ')}, or null`);
  return { ...next, result: next.result ?? null };
});
export const checkPanelStatus = input => STATUS.normalize(input);

// ── The shell's frame and words ─────────────────────────────────────────
/**
 * The sheet (sheets 23 and 43): "Hospital panel · Only on this phone", large, with ✕ back to the room (the shell's
 * Close, this phone's own: it works while reconnecting, and while Submit sends it only closes the sheet, Q1). The
 * keypad: no footer until a number is picked (`picked`, the number on the picked key); then "Submit 3" with the
 * panel icon, the command; while it sends, "Submitting…", busy. The status: no footer.
 */
export function panelSheet({ step = 'keypad', picked = null, phase = 'ready' } = {}) {
  if (!STEPS.includes(step)) throw new TypeError('step is keypad or status');
  const frame = { id: 'hospital-panel', title: PANEL_WORDS.title, sub: PANEL_WORDS.onlyHere, detent: 'large', close: true };
  if (step === 'status') return { ...frame, actions: [] };
  if (picked !== null && !isNumber(picked)) throw new TypeError('picked is the number on the picked key, 1 to 9, or null');
  const sending = checkPhase(phase) === 'sending';
  if (sending && picked === null) throw new TypeError('Submit sends the picked number: sending needs picked');
  if (picked === null) return { ...frame, actions: [] };
  return { ...frame, actions: [{ id: 'submit', label: sending ? PANEL_WORDS.submitting : PANEL_WORDS.submit(picked), kind: 'primary', icon: 'panel', busy: sending }] };
}

// ── Mounting ────────────────────────────────────────────────────────────
/** Concealed, or with no viewer (the shared display), a part draws nothing: it is the patient's own phone's. */
const hidden = s => s.status === 'concealed' || s.viewer === null;
/** What every part shares: its root, the kit, the control policy, and its lifecycle. */
function mountPart(host, name, model, input, handlers, paint) {
  if (!host?.ownerDocument) throw new TypeError(`${name} needs a host element`);
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  let state = model.merge(model.normalize({}), input);
  let disposed = false, suspended = false, gate = null;
  const root = kit.h('div', 'ms-hospital-panel ms-kit', { tabindex: '-1', 'data-part': name });
  host.append(root);
  const accepts = intent => !disposed && !suspended && state.interactive && state.status === 'live' && (gate ? gate(state, intent) : true);
  const policy = createControlPolicy({ root, accepts,
    defaultReason: () => (state.status === 'stale' ? PANEL_WORDS.stale : null),
    onFocusReturn: detail => handlers.onFocusReturn?.(detail) });
  const ctx = { doc, kit, root, policy, get state() { return state; } };
  const painter = paint(ctx);
  gate = painter.gate ?? null;
  const onClick = event => {
    const target = event.target.closest?.('button[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts(target.dataset.intent)) return;
    painter.tap?.(target);
  };
  root.addEventListener('click', onClick);
  function render() {
    if (disposed) return;
    root.dataset.status = state.status;
    kit.attr(root, 'data-motion', state.reducedMotion ? 'reduced' : null);
    kit.attr(root, 'aria-hidden', state.status === 'concealed' ? 'true' : null);
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    painter.paint(state);
  }
  function update(next = {}) {
    if (disposed) return;
    state = model.merge(state, next);
    render();
  }
  /** Nothing here runs by itself; suspended, it takes no taps until resumed. */
  function suspend() { if (disposed) return; suspended = true; render(); }
  function resume() { if (disposed) return; suspended = false; render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, suspend, resume, dispose, element: root });
}

/**
 * The keypad (sheets 23 and 43): the display, "_" or the picked number (aria-live, as the pack's), and the keys,
 * each number n in cell n of the 3 × 3, so every number keeps its place; at 7 and 8 players the missing cells are
 * empty, not keys that are off (the Lead's Q5). The picked key is pressed. Under them, the pack's line, and
 * Frontend's words when not accepted (the kit's inline note; the pick stays, Q2). Handlers: onPick(seat), the seat
 * as Frontend gave it, for a tap on any key, the picked one too; onFocusReturn(detail). While Submit sends, the
 * keys take no taps (Q1).
 */
export function mountPanelKeypad(host, input = {}, handlers = {}) {
  return mountPart(host, 'keypad', KEYPAD, input, handlers, ctx => {
    const { kit, root, policy } = ctx;
    const uid = `ms-hp-${(mountPanelKeypad.count = (mountPanelKeypad.count ?? 0) + 1)}`;
    const wrap = kit.h('div', 'ms-hp-wrap');
    const display = kit.h('div', 'ms-hp-display', { 'aria-live': 'polite' });
    const pad = kit.h('div', 'ms-hp-keypad', { role: 'group', 'aria-labelledby': `${uid}-note` });
    wrap.append(display, pad);
    const note = kit.groupNote(PANEL_WORDS.note);
    note.classList.add('ms-hp-note');
    note.id = `${uid}-note`;
    let error = null, errorKey = null;
    const cells = new Map();
    return {
      gate: (s, intent) => intent !== 'key' || s.phase !== 'sending',
      tap: target => {
        if (target.dataset.intent !== 'key') return;
        const k = ctx.state.keys.find(q => q.number === Number(target.dataset.value));
        if (k) handlers.onPick?.(k.seat);
      },
      paint: s => {
        if (hidden(s) || !s.keys.length) {
          // Emptied, not hidden: no number, pressed key or note stays in the page.
          for (const node of cells.values()) policy.remove(node);
          cells.clear();
          for (const n of [wrap, note, error]) n?.remove();
          display.textContent = '';
          error = null;
          errorKey = null;
          return;
        }
        if (!wrap.isConnected) root.prepend(wrap, note);
        const byNumber = new Map(s.keys.map(k => [k.number, k]));
        const picked = s.picked === null ? null : s.keys.find(k => seatOf(k.seat) === seatOf(s.picked));
        kit.text(display, picked ? String(picked.number) : PANEL_WORDS.empty);
        for (let n = 1; n <= 9; n += 1) {
          const k = byNumber.get(n) ?? null;
          const wanted = k ? 'button' : 'span';
          let node = cells.get(n);
          if (node && node.tagName.toLowerCase() !== wanted) { policy.remove(node); cells.delete(n); node = null; }
          if (!k) {
            // A number no player has (a 7- or 8-player match): an empty place, not a key.
            if (!node) { node = kit.h('span', 'ms-hp-gap', { 'aria-hidden': 'true' }); cells.set(n, node); }
          } else {
            if (!node) {
              node = kit.h('button', 'ms-hp-key', { type: 'button' });
              node.dataset.intent = 'key';
              node.dataset.value = String(n);
              node.textContent = String(n);
              cells.set(n, node);
            }
            kit.attr(node, 'aria-pressed', String(picked?.number === n));
            policy.control(node, { intent: 'key' });
          }
          if (pad.children[n - 1] !== node) pad.insertBefore(node, pad.children[n - 1] ?? null);
        }
        const key = s.error ? JSON.stringify(s.error) : null;
        if (key !== errorKey) {
          error?.remove();
          error = s.error ? kit.errorNote(`${s.error.text}${s.error.detail ? ` ${s.error.detail}` : ''}`) : null;
          if (error) { error.classList.add('ms-hp-error'); note.after(error); }
          errorKey = key;
        }
      },
    };
  });
}

/**
 * The status (sheets 23 and 43, and the Lead's Q4): the kit's notice, a stamp or an icon over its lines. REGISTERED
 * (amber) "Your request is queued for Rescue" and "Nothing happens until then"; WRONG NUMBER "Your attempt is
 * used"; TREATED (amber), NO EFFECT and DISCARDED, each with its line and "Your attempt is used"; the lock and
 * "Your attempt is used" for an attempt used with no record; the panel icon and "The panel is unavailable right
 * now". The stamps snap in; the icons don't move. It reads as it opens.
 */
export function mountPanelStatus(host, input = {}, handlers = {}) {
  return mountPart(host, 'status', STATUS, input, handlers, ({ kit, root }) => {
    let notice = null, shown = null;
    return {
      paint: s => {
        if (hidden(s) || s.result === null) { notice?.remove(); notice = null; shown = null; return; }
        if (shown === s.result) return;
        // A new result is a new notice, so its stamp snaps in as it opens.
        notice?.remove();
        notice = kit.notice(RESULT_LOOKS[s.result]);
        notice.classList.add('ms-hp-result');
        root.prepend(notice);
        shown = s.result;
      },
    };
  });
}
