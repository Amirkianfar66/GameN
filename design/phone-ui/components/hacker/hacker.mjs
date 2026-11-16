// The Hacker's Scan and final Code (sheet 42; #222 items 14 and 15): runtime source, Designer's (the owner, 14 and
// 15 November 2026: Designer builds each visual component once, in design/; the game and the previews use it as it
// is). The interface the Lead Designer approved on 16 November (docs/design/components/hacker.md), drawn as the
// phone pack draws it (design/phone-ui/prototype/screens-more.mjs scan() and code()):
//   - scanBar(): the shell's target bar for Scan, "Scan · Choose a player in your room", with the bar's Cancel (T2);
//   - mountScanGuess() with scanSheet(): who, and Blue, Red and Alien as one radio group; Cancel and Scan;
//   - mountScanResult(): MATCHED or NO MATCH, the guess, and its row; Done;
//   - mountFinalCode() with codeSheet(): the nine portraits with names, Pick 1–4 in order; Next, then Back and
//     Submit Code;
//   - mountCodeResult(): CODE CORRECT with its two lines, or CODE WRONG with "Your one attempt is used"; Done.
// The four results' stamps snap in as REGISTERED does, over 120 ms, and are there at once with Reduce motion (the
// handoff's motion table; hacker.css).
// It is built on the kit alone (component-kit-0.7.1): who, the segmented control, the cells and the 3 × 3, the
// row, the group note, the inline error, and the notice with its extra for Scan's row.
// Each part is mounted in the shell's sheet body for its step and returns { element, update, suspend, resume,
// dispose }; the helpers give the shell its words. It is all this viewer's: the Hacker's own phone. The component
// works nothing out: the offers, the results, the blocked round and the Code's outcome are the projection's, and
// the guess and the picks are Frontend's (T3; the Lead's Q1).
// Privacy (the Lead's note 3): a guess, a pick, a result, inCode and the blocked round never reach an attribute,
// the console, the layout or a callback but onGuess and onPick. The guesses are kept by their place, not their
// side. A cell's accessible name is the pack's ("Player 2, Ben, Pick 1"), but read from words in the page
// (aria-labelledby, visually hidden), so the pick is in no attribute's value.

import { createControlPolicy, createKit, seatNumber } from '../kit/kit.mjs';

export const HACKER_VERSION = 'hacker-0.1.0';
/** The sides a guess may take: the contract's PlanetFaction, in the pack's order. */
export const SIDES = Object.freeze(['Blue', 'Red', 'Alien']);
/**
 * The pack's words (screens-more.mjs scan() and code()), and the undrawn states' (Q2, Q3, T3). Not the pack's "Scan
 * stays available" under CODE WRONG: the Lead dropped it (Q-b, docs/design/phone-ui-handoff.md), as it states a
 * rule the planet-navigation overlay leaves open (CODE-OPEN-02), so Scan's state shows on its Actions tile alone.
 */
export const HACKER_WORDS = Object.freeze({
  scan: 'Scan', chooseInRoom: 'Choose a player in your room', onlyHere: 'Only on this phone',
  scanWho: name => `Scan ${name}`, guessLine: 'Guess a side. A wrong guess also blocks your next round.', guess: 'Guess',
  matched: 'MATCHED', noMatch: 'NO MATCH', guessed: (name, side) => `${name} · ${side} guess`,
  inCode: 'In the Code', yes: 'Yes', no: 'No', blocked: round => `Blocked in Round ${round}`,
  cancel: 'Cancel', scanning: 'Scanning…', done: 'Done',
  code: 'Final Code', pickLine: 'Choose four players. Order doesn’t matter.', confirmLine: 'One attempt for the whole match. It can’t be retried.',
  pick: n => `Pick ${n}`, cell: (n, name, note) => `Player ${n}, ${name}${note ? `, ${note}` : ''}`, next: 'Next', back: 'Back', submit: 'Submit Code', submitting: 'Submitting…',
  correct: 'CODE CORRECT', wrong: 'CODE WRONG', unlocked: 'Hack Spaceship is unlocked', separate: 'Using it is a separate action on your turn',
  used: 'Your one attempt is used',
  notAvailable: 'Not available now', stale: 'Controls return when the match is current',
});

const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const PHASES = Object.freeze(['ready', 'sending']);
const CODE_STEPS = Object.freeze(['pick', 'confirm']);
const SCAN_STEPS = Object.freeze(['guess', 'result']);
const CODE_SHEET_STEPS = Object.freeze(['pick', 'confirm', 'result']);

const isText = value => typeof value === 'string' && value.length > 0;
const optionalText = (value, what) => {
  if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${what} is text, or null`);
  return value === '' ? null : value ?? null;
};
const isSeat = id => (Number.isSafeInteger(id) && id >= 1 && id <= 9) || (typeof id === 'string' && /^seat-[1-9]$/.test(id));
const seatOf = id => seatNumber({ seat: id });

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
/** A person as Frontend gives them, the seat in its own form ('seat-4' or 4), which onPick reports back. */
function person(p, what) {
  if (!p || typeof p !== 'object' || !isSeat(p.seat) || !isText(p.name)) throw new TypeError(`${what} is { seat, name, character }`);
  return Object.freeze({ seat: p.seat, name: p.name, character: p.character ?? null });
}
const checkPhase = value => {
  if (!PHASES.includes(value)) throw new TypeError('phase is ready or sending');
  return value;
};
/** A side, never echoed back in the error: only Blue, Red or Alien. */
function checkSide(value, what, { optional = false } = {}) {
  if ((value === null || value === undefined) && optional) return null;
  if (!SIDES.includes(value)) throw new TypeError(`${what} is Blue, Red or Alien${optional ? ', or null' : ''}`);
  return value;
}
/** Not accepted (L6): Frontend's words, drawn as the kit's inline note. */
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

/** Scan · guess: the person, the guess (Frontend's), whether Scan is sending, and Frontend's words when not accepted. */
export const SCAN_GUESS_DEFAULTS = Object.freeze({ ...COMMON, target: null, guess: null, phase: 'ready', error: null });
const GUESS = part(SCAN_GUESS_DEFAULTS, ['target', 'guess', 'phase', 'error'], next => ({
  ...next,
  target: next.target === null || next.target === undefined ? null : person(next.target, 'target'),
  guess: checkSide(next.guess, 'guess', { optional: true }),
  phase: checkPhase(next.phase),
  error: checkError(next.error),
}));
export const checkScanGuess = input => GUESS.normalize(input);

/**
 * Scan's result, from the projection's latest knowledge.scanResults entry: a match says whether the person is in
 * the Code (inCode: true or false, Q2); no match may say the round Scan is blocked through
 * (abilities.scanBlockedThroughRound). Without a target, nothing is drawn.
 */
export const SCAN_RESULT_DEFAULTS = Object.freeze({ ...COMMON, target: null, guess: null, matched: null, inCode: null, blockedRound: null });
const RESULT = part(SCAN_RESULT_DEFAULTS, ['target', 'guess', 'matched', 'inCode', 'blockedRound'], next => {
  const given = key => next[key] !== null && next[key] !== undefined;
  if (!given('target')) {
    if (['guess', 'matched', 'inCode', 'blockedRound'].some(given)) throw new TypeError('A result needs its target');
    return { ...next, target: null, guess: null, matched: null, inCode: null, blockedRound: null };
  }
  const target = person(next.target, 'target');
  const guess = checkSide(next.guess, 'guess');
  if (typeof next.matched !== 'boolean') throw new TypeError('matched is true or false');
  const inCode = next.inCode ?? null, blockedRound = next.blockedRound ?? null;
  if (next.matched) {
    if (typeof inCode !== 'boolean') throw new TypeError('A match says whether the person is in the Code: inCode is true or false');
    if (blockedRound !== null) throw new TypeError('A match blocks no round: blockedRound is null');
  } else {
    if (inCode !== null) throw new TypeError('Only a match says whether the person is in the Code: inCode is null');
    if (blockedRound !== null && !(Number.isSafeInteger(blockedRound) && blockedRound >= 1)) throw new TypeError('blockedRound is a round, or null');
  }
  return { ...next, target, guess, matched: next.matched, inCode, blockedRound };
});
export const checkScanResult = input => RESULT.normalize(input);

/**
 * The final Code: the match's seats (public), the picks in the order picked (Frontend's, Q1), the step, whether
 * Submit Code is sending, the seats the SUBMIT_CODE offer lists, and Frontend's words when not accepted.
 */
export const FINAL_CODE_DEFAULTS = Object.freeze({ ...COMMON, people: Object.freeze([]), picks: Object.freeze([]), step: 'pick', phase: 'ready', offered: Object.freeze([]), error: null });
// The whole sheet is the Hacker's: its seats go with the rest, concealed or for a new viewer.
const CODE = part(FINAL_CODE_DEFAULTS, ['people', 'picks', 'step', 'phase', 'offered', 'error'], next => {
  if (!Array.isArray(next.people) || next.people.length > 9) throw new TypeError('people is a list of up to nine { seat, name, character }');
  const people = next.people.map((p, i) => person(p, `people[${i}]`));
  const seats = new Set();
  for (const p of people) {
    const n = seatOf(p.seat);
    if (seats.has(n)) throw new TypeError(`people lists Player ${n} twice`);
    seats.add(n);
  }
  // Never the seat in an error: a pick stays out of the console too.
  const seatList = (list, what) => {
    if (!Array.isArray(list)) throw new TypeError(`${what} is a list of seats`);
    const out = list.map(s => { if (!isSeat(s)) throw new TypeError(`${what} lists something that is not a seat`); return seatOf(s); });
    if (new Set(out).size !== out.length) throw new TypeError(`${what} lists a seat twice`);
    if (out.some(s => !seats.has(s))) throw new TypeError(`${what} lists a seat that is not in people`);
    return Object.freeze(out);
  };
  const offered = seatList(next.offered, 'offered');
  const picks = seatList(next.picks, 'picks');
  if (picks.length > 4) throw new TypeError('The Code is four players: picks lists at most four');
  if (picks.some(s => !offered.includes(s))) throw new TypeError('picks lists a seat that is not offered');
  if (!CODE_STEPS.includes(next.step)) throw new TypeError('step is pick or confirm');
  if (next.step === 'confirm' && picks.length !== 4) throw new TypeError('The confirm step needs four picks');
  return { ...next, people: Object.freeze(people), offered, picks, phase: checkPhase(next.phase), error: checkError(next.error) };
});
export const checkFinalCode = input => CODE.normalize(input);

/** The Code's outcome: abilities.shipHackUnlocked once abilities.codeAttempted is true. Without it, nothing is drawn. */
export const CODE_RESULT_DEFAULTS = Object.freeze({ ...COMMON, correct: null });
const OUTCOME = part(CODE_RESULT_DEFAULTS, ['correct'], next => {
  if (next.correct !== null && next.correct !== undefined && typeof next.correct !== 'boolean') throw new TypeError('correct is true or false, or null');
  return { ...next, correct: next.correct ?? null };
});
export const checkCodeResult = input => OUTCOME.normalize(input);

// ── The shell's frames and words ────────────────────────────────────────
/** Scan · choose: the shell's target bar (its Cancel is the shell's own, T2). The room scene rings the people the SCAN offer lists. */
export const scanBar = () => ({ icon: 'scan', title: HACKER_WORDS.scan, sub: HACKER_WORDS.chooseInRoom });
/**
 * The Scan sheet (no ✕, the Lead's note 1). The guess: Cancel and Scan; Scan off until a guess is given, and busy
 * while it sends ("Scanning…", Q3), when Cancel is off too, since the answer comes straight back here. Cancel only
 * closes the sheet on this phone, so it is local and works while reconnecting. The result: Done, local.
 */
export function scanSheet({ step = 'guess', guess = null, phase = 'ready' } = {}) {
  if (!SCAN_STEPS.includes(step)) throw new TypeError('step is guess or result');
  const frame = { id: 'scan', title: HACKER_WORDS.scan, sub: HACKER_WORDS.onlyHere, close: false };
  if (step === 'result') return { ...frame, actions: [{ id: 'done', label: HACKER_WORDS.done, kind: 'secondary', local: true }] };
  checkSide(guess, 'guess', { optional: true });
  const sending = checkPhase(phase) === 'sending';
  return { ...frame, actions: [
    { id: 'cancel', label: HACKER_WORDS.cancel, kind: 'secondary', local: true, enabled: !sending },
    { id: 'scan', label: sending ? HACKER_WORDS.scanning : HACKER_WORDS.scan, kind: 'primary', icon: 'scan', busy: sending, enabled: sending || guess !== null },
  ] };
}
/**
 * The Final Code sheet: large, no ✕ (note 1). Pick: Next, off until four are picked. Confirm: Back and Submit Code;
 * while it sends, Submit Code is busy ("Submitting…", Q3) and Back is off. The result: Done. Next, Back and Done
 * only change this phone, so they are local and work while reconnecting; Submit Code stands for the command.
 */
export function codeSheet({ step = 'pick', count = 0, phase = 'ready' } = {}) {
  if (!CODE_SHEET_STEPS.includes(step)) throw new TypeError('step is pick, confirm or result');
  const frame = { id: 'code', title: HACKER_WORDS.code, sub: HACKER_WORDS.onlyHere, detent: 'large', close: false };
  if (step === 'result') return { ...frame, actions: [{ id: 'done', label: HACKER_WORDS.done, kind: 'secondary', local: true }] };
  if (step === 'pick') {
    if (!(Number.isSafeInteger(count) && count >= 0 && count <= 4)) throw new TypeError('count is how many are picked, 0 to 4');
    return { ...frame, actions: [{ id: 'next', label: HACKER_WORDS.next, kind: 'primary', local: true, enabled: count === 4 }] };
  }
  const sending = checkPhase(phase) === 'sending';
  return { ...frame, actions: [
    { id: 'back', label: HACKER_WORDS.back, kind: 'secondary', local: true, enabled: !sending },
    { id: 'submit', label: sending ? HACKER_WORDS.submitting : HACKER_WORDS.submit, kind: 'primary', icon: 'code', busy: sending },
  ] };
}

// ── Mounting ────────────────────────────────────────────────────────────
/** Concealed, or with no viewer (the shared display), a part draws nothing: it is the Hacker's own phone's. */
const hidden = s => s.status === 'concealed' || s.viewer === null;
/** What every part shares: its root, the kit, the control policy, and its lifecycle. */
function mountPart(host, name, model, input, handlers, paint) {
  if (!host?.ownerDocument) throw new TypeError(`${name} needs a host element`);
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  let state = model.merge(model.normalize({}), input);
  let disposed = false, suspended = false, gate = null;
  const root = kit.h('div', 'ms-hacker ms-kit', { tabindex: '-1', 'data-part': name });
  host.append(root);
  const accepts = intent => !disposed && !suspended && state.interactive && state.status === 'live' && (gate ? gate(state, intent) : true);
  const policy = createControlPolicy({ root, accepts,
    defaultReason: () => (state.status === 'stale' ? HACKER_WORDS.stale : null),
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
 * Scan · guess (sheet 42): who (the person's 64 px portrait, "Scan Gus" and the pack's line), then Blue, Red and
 * Alien as one radio group, "Guess", kept by their place. Handlers: onGuess(side) for a tap, onFocusReturn(detail),
 * which reports a guess's place, never its side. While Scan sends, the guess takes no taps.
 */
export function mountScanGuess(host, input = {}, handlers = {}) {
  return mountPart(host, 'scan-guess', GUESS, input, handlers, ({ kit, root, policy }) => {
    let who = null, seg = null, error = null, errorKey = null;
    const options = SIDES.map((side, i) => ({ id: i, label: side }));
    return {
      gate: s => s.phase !== 'sending',
      tap: target => { if (target.dataset.intent === 'guess') handlers.onGuess?.(SIDES[Number(target.dataset.value)]); },
      paint: s => {
        if (hidden(s) || s.target === null) {
          // Emptied, not hidden: no person, guess or note stays in the page.
          if (seg) policy.remove(seg);
          for (const n of [who, error]) n?.remove();
          who = seg = error = null;
          errorKey = null;
          return;
        }
        const props = { people: [s.target], title: HACKER_WORDS.scanWho(s.target.name), sub: HACKER_WORDS.guessLine, versions: s.versions };
        if (!who) { who = kit.who(props); root.prepend(who); } else kit.setWho(who, props);
        const segProps = { options, value: s.guess === null ? null : SIDES.indexOf(s.guess), label: HACKER_WORDS.guess, intent: 'guess' };
        if (!seg) { seg = kit.seg(segProps); who.after(seg); } else kit.setSeg(seg, segProps);
        // The pack's 6 px under who (its .seg's own margin); the kit's builder sets the class each time.
        seg.classList.add('ms-hk-guess');
        for (const b of seg.children) policy.control(b, { intent: 'guess' });
        const key = s.error ? JSON.stringify(s.error) : null;
        if (key !== errorKey) {
          error?.remove();
          error = s.error ? kit.errorNote(`${s.error.text}${s.error.detail ? ` ${s.error.detail}` : ''}`) : null;
          if (error) { error.classList.add('ms-hk-error'); seg.after(error); }
          errorKey = key;
        }
      },
    };
  });
}

/**
 * A result, as the pack's .registered: the kit's notice (0.7.0), its stamp and lines, and Scan's row in a list as
 * the notice's `extra`, after the lines inside it. The row is kept while the result changes in place. The notice
 * carries the component's own class (ms-hk-result), under which its stamp snaps in (hacker.css).
 */
function paintResult(ctx, holder, props, row) {
  const { kit, root } = ctx;
  if (row) {
    if (!holder.row) { holder.row = kit.row(row); holder.list = kit.list(holder.row); } else kit.setRow(holder.row, row);
  } else holder.list = holder.row = null;
  const next = { ...props, extra: holder.list };
  if (!holder.notice) { holder.notice = kit.notice(next); holder.notice.classList.add('ms-hk-result'); root.prepend(holder.notice); } else kit.setNotice(holder.notice, next);
}
const emptyResult = holder => { holder.notice?.remove(); holder.notice = holder.list = holder.row = null; };

/**
 * Scan's result (sheet 42): MATCHED (amber) with "In the Code · Yes" or "No" (Q2), or NO MATCH with "Scan ·
 * Blocked in Round 4" (no row when no round is blocked); "Gus · Blue guess" under the stamp. It reads as it opens.
 */
export function mountScanResult(host, input = {}, handlers = {}) {
  return mountPart(host, 'scan-result', RESULT, input, handlers, ctx => {
    const holder = { notice: null, list: null, row: null };
    return {
      paint: s => {
        if (hidden(s) || s.target === null) { emptyResult(holder); return; }
        const props = { stamp: { text: s.matched ? HACKER_WORDS.matched : HACKER_WORDS.noMatch, tone: s.matched ? 'amber' : null }, lines: [HACKER_WORDS.guessed(s.target.name, s.guess)] };
        const row = s.matched
          ? { tag: 'div', icon: 'code', tint: 'paper', title: HACKER_WORDS.inCode, value: s.inCode ? HACKER_WORDS.yes : HACKER_WORDS.no }
          : s.blockedRound !== null ? { tag: 'div', icon: 'lock', tint: 'steel', title: HACKER_WORDS.scan, value: HACKER_WORDS.blocked(s.blockedRound) } : null;
        paintResult(ctx, holder, props, row);
      },
    };
  });
}

/**
 * The final Code (sheet 42): the match's seats in the kit's 3 × 3 (a list of whole names when narrow), seat n in
 * cell n; each pick selected, with the check and "Pick 1"–"Pick 4" in pick order; "You" on this phone's own; a seat
 * the offer does not list says "Not available now" (T3). Under it, the pack's line for the step, and Frontend's
 * words when not accepted. Handlers: onPick(seat), the seat as Frontend gave it, for a tap on an offered cell,
 * picked or not (Q1); onFocusReturn(detail). The cells take no taps in the confirm step or while it sends.
 */
export function mountFinalCode(host, input = {}, handlers = {}) {
  return mountPart(host, 'final-code', CODE, input, handlers, ctx => {
    const { kit, root, policy } = ctx;
    const { wrap, grid } = kit.grid9();
    wrap.classList.add('ms-hk-code');
    grid.setAttribute('role', 'group');
    const note = kit.groupNote('');
    note.classList.add('ms-hk-line');
    // Each cell's name, as the pack's aria-label words it, kept in the page's words (the kit's visually hidden
    // class), not in an attribute: the cell points at it by id.
    const names = kit.h('div', 'ms-k-vh');
    const uid = `ms-hk-${(mountFinalCode.count = (mountFinalCode.count ?? 0) + 1)}`;
    let error = null, errorKey = null;
    const cells = new Map(), labels = new Map();
    return {
      gate: (s, intent) => intent !== 'pick' || (s.step === 'pick' && s.phase !== 'sending'),
      tap: target => {
        if (target.dataset.intent !== 'pick') return;
        const seat = Number(target.dataset.value), p = ctx.state.people.find(q => seatOf(q.seat) === seat);
        if (p) handlers.onPick?.(p.seat);
      },
      paint: s => {
        if (hidden(s) || !s.people.length) {
          // Emptied, not hidden: no cell, pick or note stays in the page.
          for (const node of cells.values()) policy.remove(node);
          cells.clear();
          labels.clear();
          names.replaceChildren();
          for (const n of [wrap, note, error, names]) n?.remove();
          error = null;
          errorKey = null;
          kit.attr(grid, 'aria-label', null);
          return;
        }
        if (!wrap.isConnected) root.prepend(wrap, note);
        if (!names.isConnected) root.append(names);
        kit.attr(grid, 'aria-label', HACKER_WORDS.code);
        const bySeat = new Map(s.people.map(p => [seatOf(p.seat), p]));
        for (let n = 1; n <= 9; n += 1) {
          const p = bySeat.get(n) ?? null;
          const wanted = p ? 'button' : 'div';
          let node = cells.get(n);
          if (node && node.tagName.toLowerCase() !== wanted) { policy.remove(node); cells.delete(n); node = null; }
          if (!p) {
            // An empty seat (a 7- or 8-player match): the kit's empty frame, nothing inside, and no name.
            labels.get(n)?.remove();
            labels.delete(n);
            if (!node) { node = kit.cell({ tag: 'div', state: 'empty' }); cells.set(n, node); }
            kit.setCell(node, { state: 'empty' });
          } else {
            const k = s.picks.indexOf(n), offered = s.offered.includes(n);
            const words = k >= 0 ? HACKER_WORDS.pick(k + 1) : offered ? '' : HACKER_WORDS.notAvailable;
            const props = {
              person: { seat: n, name: p.name, character: p.character }, versions: s.versions, intent: 'pick',
              state: k >= 0 ? 'selected' : offered ? 'available' : 'ineligible',
              note: words, mark: k >= 0 ? 'check' : null, you: s.viewer === n,
              // No aria-label: the name is read from the words below.
              label: false,
            };
            if (!node) { node = kit.cell(props); cells.set(n, node); } else kit.setCell(node, props);
            let label = labels.get(n);
            if (!label) { label = kit.h('span', null, { id: `${uid}-c${n}` }); labels.set(n, label); names.append(label); }
            kit.text(label, HACKER_WORDS.cell(n, p.name, words));
            kit.attr(node, 'aria-labelledby', label.id);
            // The note already names why a seat is not offered, so it needs no second description.
            policy.control(node, { intent: 'pick', off: !offered });
          }
          if (grid.children[n - 1] !== node) grid.insertBefore(node, grid.children[n - 1] ?? null);
        }
        kit.text(note, s.step === 'confirm' ? HACKER_WORDS.confirmLine : HACKER_WORDS.pickLine);
        const key = s.error ? JSON.stringify(s.error) : null;
        if (key !== errorKey) {
          error?.remove();
          error = s.error ? kit.errorNote(`${s.error.text}${s.error.detail ? ` ${s.error.detail}` : ''}`) : null;
          if (error) { error.classList.add('ms-hk-error'); note.after(error); }
          errorKey = key;
        }
      },
    };
  });
}

/**
 * The Code's outcome (sheet 42): CODE CORRECT (amber) with the pack's two lines, or CODE WRONG with "Your one attempt
 * is used" alone (the Lead's Q-b). It reads as it opens.
 */
export function mountCodeResult(host, input = {}, handlers = {}) {
  return mountPart(host, 'code-result', OUTCOME, input, handlers, ctx => {
    const holder = { notice: null, list: null, row: null };
    return {
      paint: s => {
        if (hidden(s) || s.correct === null) { emptyResult(holder); return; }
        paintResult(ctx, holder, s.correct
          ? { stamp: { text: HACKER_WORDS.correct, tone: 'amber' }, lines: [HACKER_WORDS.unlocked, HACKER_WORDS.separate] }
          : { stamp: { text: HACKER_WORDS.wrong, tone: null }, lines: [HACKER_WORDS.used] }, null);
      },
    };
  });
}
