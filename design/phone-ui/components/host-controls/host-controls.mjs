// Host controls: the host's controls in a match, as the phone pack draws them (sheet 15; the pack's host-controls
// screen with its code and abort states; #222 item 28). Runtime source, Designer's (the owner, 14, 15 and 16
// November 2026: Designer builds each visual component once, in design/; the game and the preview use it as it is).
//
// The split (the Lead's review of #295, answer 1, as the private talk's declareSheet() and claimSheet()):
//   mountHostControls   the body of the phone shell's sheet, for its three views: the list (Check the deadline, Run
//                       bots, a recovery code for each seat, Abort match), a seat's code card, and the abort's confirm
//   hostControlsSheet   the shell's sheet for the view: its title and line, Back, and the footer's buttons with the
//                       pack's words and icons and Frontend's states, so Frontend passes them to the shell as they are
// The view is Frontend's, from the taps and Back. The sheet's frame and footer are the shell's.
//
// What it never does: send a command or work out its answer. Checking the deadline (advance), running bots
// (runBots), issuing a seat's code (issueRecovery) and aborting (abort) are Frontend's to send and the server's to
// answer; each row reports a tap, and shows the state Frontend gives it: in flight, the kit's spinner at its end;
// refused, dimmed, with Frontend's reason as its line and its description (answer 2). Only that row: one
// command's state is never inferred from another's.
//
// The recovery code is private to the host's phone, and never reaches the shared display (the Lead's privacy
// note). Frontend gives its value only while it is revealed; hidden, the card shows the pack's fixed dots, so
// neither the code nor its length is on the page. It is never in an attribute, a report or the layout, and it
// leaves the page when hidden, when the view changes, when the viewer changes, when concealed and on dispose
// (answer 4). The minutes left are Frontend's, from the server's expiresAt and the trusted clock; the component
// never counts down.
//
// Retry (0.1.1; the Lead's answer of 17 November to the pre-game connection's part 8): when the session's own request
// has an unknown outcome, every command waits for it to be sent again. Frontend then gives `retry`, and the list's
// footer has "Retry", the kit's primary button, standing for that command (not local); the refused rows keep
// Frontend's words. It fills a state sheet 15 doesn't draw.

import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const HOST_CONTROLS_VERSION = 'host-controls-0.1.2';
const VIEWS = Object.freeze(['list', 'code', 'abort']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
/** The sheet's id, the same for the three views, so the shell keeps its body (and this content) through them. */
export const HOST_SHEET_ID = 'host-controls';
/** While reconnecting, a command says why it waits: the shell's banner's words (phone-shell.mjs RECONNECTING.sub). */
const RECONNECTING_REASON = 'Controls return when the match is current';

/** The pack's words (screens-more.mjs, host-controls; sheet 15). */
export const HOST_WORDS = Object.freeze({
  title: 'Host controls',
  deadline: 'Check the deadline', deadlineLine: 'Asks the server to move on if time is up',
  bots: 'Run bots', botsLine: 'Bots act if they can',
  recovery: 'Recovery codes', seat: (seat, name) => `${seat} · ${name}`, newCode: 'New code',
  abort: 'Abort match', abortLine: 'Ends with no winner',
  codeTitle: 'Recovery code', codeSub: 'Private to this phone',
  codeFor: (seat, name) => `Recovery for Player ${seat} · ${name}`,
  matchId: 'Match ID', code: 'Code',
  terms: minutes => `Works once · ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
  codeNote: seat => `Show it only to Player ${seat}. It never appears on the shared display.`,
  reveal: 'Reveal', hide: 'Hide', copy: 'Copy', copied: 'Copied',
  confirm: 'Abort the match?', confirmLine: 'It ends now for everyone, with no winner.',
  keep: 'Keep playing', abortConfirm: 'Abort match',
  /** The list's footer while the session's request waits to be sent again (0.1.1): the kit's word, as the shell's banner. */
  retry: 'Retry',
});
/** The pack's dots for a hidden code: the same whatever the code, so its length is never on the page. */
export const CODE_MASK = '•••••• •••••• •••••• •••••• ••••••';

/**
 * Where the code and the Match ID may wrap (0.1.2, the Lead's rule of 17 November): only between groups, and a group
 * never splits, so a player copying them out by hand never reads half a group on each line. The mask's groups are its
 * own (between its spaces). The server's code is 32 base64url characters with no separator of its own, so its groups
 * are the mask's six; a hyphen or underscore inside it is a character of the code, not a place to wrap. The Match ID
 * (the server's UUID) wraps after its hyphens. Nothing is drawn between the groups and no character is added: the
 * code reads as the pack draws it, and its text, selected and copied by hand, is the code itself.
 */
export const CODE_GROUP = 6;
export const codeGroups = value => Array.from({ length: Math.ceil(value.length / CODE_GROUP) }, (_, i) => value.slice(i * CODE_GROUP, (i + 1) * CODE_GROUP));
export const maskGroups = () => CODE_MASK.split(' ');
export const matchIdGroups = value => value.split(/(?<=-)/);

const OFF = Object.freeze({ enabled: false, busy: false, reason: null });
/** Every input, with its default: the list, nothing offered until Frontend gives it, no code. */
export const HOST_CONTROLS_DEFAULTS = Object.freeze({
  view: 'list', status: 'live', interactive: true, reducedMotion: false, viewer: null, versions: null,
  deadline: OFF, bots: OFF, abort: OFF, seats: Object.freeze([]), code: null, retry: null,
});

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = value => Number.isSafeInteger(value) && value >= 1;

function checkCommand(name, value) {
  if (value === null || value === undefined) return OFF;
  if (typeof value !== 'object' || (value.reason !== null && value.reason !== undefined && typeof value.reason !== 'string')) throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}
function checkSeats(seats) {
  if (!Array.isArray(seats)) throw new TypeError('seats are [{ seat, name, character, enabled, busy, reason }]');
  const seen = new Set();
  return Object.freeze(seats.map(s => {
    if (!s || !isSeat(s.seat)) throw new TypeError('Each seat needs its seat number');
    if (!isText(s.name)) throw new TypeError(`Seat ${s.seat} needs its name: the component never looks one up`);
    if (seen.has(s.seat)) throw new TypeError(`Seat ${s.seat} is given twice`);
    seen.add(s.seat);
    return Object.freeze({ seat: s.seat, name: s.name, character: isText(s.character) ? s.character : null, ...checkCommand(`Seat ${s.seat}`, { enabled: true, ...s }) });
  }));
}
/** Retry: null, or { enabled, busy } (0.1.1), Frontend's while the session's request waits to be sent again. */
function checkRetry(retry) {
  if (retry === null || retry === undefined) return null;
  if (typeof retry !== 'object' || Array.isArray(retry)) throw new TypeError('retry is null, or { enabled, busy }');
  return Object.freeze({ enabled: retry.enabled !== false, busy: retry.busy === true });
}
function checkCode(code) {
  if (code === null || code === undefined) return null;
  if (typeof code !== 'object' || !isSeat(code.seat) || !isText(code.name) || !isText(code.matchId)) throw new TypeError('code is null, or { seat, name, matchId, revealed, value, minutes }');
  const revealed = code.revealed === true;
  // The page never holds the code hidden: Frontend gives its value only while it is revealed.
  if (!revealed && code.value !== null && code.value !== undefined) throw new TypeError('The code\'s value is given only while it is revealed');
  if (revealed && !isText(code.value)) throw new TypeError('A revealed code needs its value');
  if (code.minutes !== null && code.minutes !== undefined && !(Number.isSafeInteger(code.minutes) && code.minutes >= 1)) throw new TypeError('minutes are the whole minutes left (1 or more), or null');
  return Object.freeze({ seat: code.seat, name: code.name, matchId: code.matchId, revealed, value: revealed ? code.value : null, minutes: code.minutes ?? null });
}

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's value; the rest
 * stay. The code is this viewer's and private: it is dropped while concealed, never kept for when the sheet shows
 * again, and when the viewer changes, unless the same update gives the new viewer's.
 */
export function nextHostControlsInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  for (const name of ['deadline', 'bots', 'abort']) next[name] = checkCommand(name, next[name]);
  next.seats = checkSeats(next.seats ?? []);
  next.code = checkCode(next.code);
  next.retry = checkRetry(next.retry);
  const viewerChanged = 'viewer' in input && previous.viewer !== input.viewer;
  if (next.status === 'concealed' || (viewerChanged && !('code' in input))) next.code = null;
  return next;
}

/**
 * The phone shell's sheet for the view (the shell's `sheet` input): the pack's title and line, Back, the large
 * detent, and the footer's buttons. Reveal, Hide, Copy and Keep playing are this phone's own (`local`: they work
 * while reconnecting and stand for no command); Abort match is the command, the kit's warn button, with Frontend's
 * state (the Lead's review of #295, answers 3 and 5). Their taps come back through the shell's onSheetAction(id).
 */
export function hostControlsSheet(input) {
  const s = nextHostControlsInput(HOST_CONTROLS_DEFAULTS, input);
  const W = HOST_WORDS;
  const frame = { id: HOST_SHEET_ID, back: true, close: true, detent: 'large' };
  if (s.view === 'code') {
    const actions = s.code ? [
      s.code.revealed ? { id: 'hide', label: W.hide, kind: 'secondary', icon: 'hide', local: true } : { id: 'reveal', label: W.reveal, kind: 'secondary', icon: 'show', local: true },
      { id: 'copy', label: W.copy, kind: 'primary', icon: 'copy', local: true },
    ] : [];
    return { ...frame, title: W.codeTitle, sub: W.codeSub, actions };
  }
  if (s.view === 'abort') {
    return { ...frame, title: W.title, actions: [
      { id: 'keep', label: W.keep, kind: 'secondary', local: true },
      { id: 'abort', label: W.abortConfirm, kind: 'warn', enabled: s.abort.enabled, busy: s.abort.busy, reason: s.abort.reason },
    ] };
  }
  // The list: Retry in its footer only while Frontend gives it (0.1.1), the command it stands for, not local.
  const actions = s.retry ? [{ id: 'retry', label: W.retry, kind: 'primary', enabled: s.retry.enabled, busy: s.retry.busy }] : [];
  return { ...frame, title: W.title, actions };
}

/**
 * Mounts the body in the shell's open sheet (`shell.sheetBody`), on its glass. Returns { update, dispose, element }.
 */
export function mountHostControls(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('Host controls need a host element: the shell\'s sheetBody');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const W = HOST_WORDS;
  let state = nextHostControlsInput(HOST_CONTROLS_DEFAULTS, input);
  let disposed = false, shown = null;
  const on = Object.fromEntries(['onDeadline', 'onBots', 'onIssueRecovery', 'onAbortAsk', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  const root = kit.h('div', 'ms-host-controls ms-kit', { tabindex: '-1', role: 'group', 'aria-label': W.title });
  host.append(root);
  /** The commands wait while reconnecting, with the banner's words; opening the confirm is this phone's own. */
  const accepts = intent => !disposed && state.interactive && state.status !== 'concealed' && (state.status === 'live' || intent === 'abort-ask');
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: intent => (state.status === 'stale' && intent !== 'abort-ask' ? RECONNECTING_REASON : null),
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });

  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts(target.dataset.intent)) return;
    const intent = target.dataset.intent;
    if (intent === 'deadline') on.onDeadline?.();
    else if (intent === 'bots') on.onBots?.();
    else if (intent === 'issue-recovery') on.onIssueRecovery?.(Number(target.dataset.value));
    else if (intent === 'abort-ask') on.onAbortAsk?.();
  };
  root.addEventListener('click', onClick);

  // ── The views' parts, made as a view is shown ───────────────────────
  let parts = {};
  /** A command's row: the pack's words, or, refused, Frontend's reason as its line; in flight, the spinner at its end. */
  function paintCommand(row, props, command, { reason = true } = {}) {
    const refused = !command.enabled && !command.busy;
    let spinner = row.querySelector(':scope > .ms-k-row-trail > .ms-k-spinner');
    if (command.busy && !spinner) spinner = kit.h('span', 'ms-k-spinner', { 'aria-hidden': 'true' });
    kit.setRow(row, { ...props, sub: refused && reason && command.reason ? command.reason : props.sub, trail: command.busy ? spinner : null });
    policy.control(row, { off: refused, busy: command.busy, reason: refused ? command.reason : null });
  }
  function buildList() {
    const deadline = kit.row({ icon: 'timer', tint: 'steel', title: W.deadline, sub: W.deadlineLine, intent: 'deadline' });
    const bots = kit.row({ icon: 'bot', tint: 'steel', title: W.bots, sub: W.botsLine, intent: 'bots' });
    const label = kit.groupLabel(W.recovery);
    const seats = kit.h('ul', 'ms-k-list ms-hc-seats');
    const gap = kit.h('div', 'ms-hc-gap', { 'aria-hidden': 'true' });
    const abort = kit.row({ icon: 'warning', tint: 'paper', title: W.abort, sub: W.abortLine, chevron: true, intent: 'abort-ask' });
    root.append(kit.list(deadline, bots), label, seats, gap, kit.list(abort));
    parts = { deadline, bots, label, seats, seatRows: new Map(), abort };
  }
  function paintList() {
    const p = parts, s = state;
    paintCommand(p.deadline, { icon: 'timer', tint: 'steel', title: W.deadline, sub: W.deadlineLine, intent: 'deadline' }, s.deadline);
    paintCommand(p.bots, { icon: 'bot', tint: 'steel', title: W.bots, sub: W.botsLine, intent: 'bots' }, s.bots);
    // The seats Frontend lists, each its own row by its seat: the same element, and its focus, through updates.
    const wanted = new Set(s.seats.map(x => x.seat));
    for (const [seat, item] of p.seatRows) if (!wanted.has(seat)) { policy.remove(item); p.seatRows.delete(seat); }
    s.seats.forEach((x, i) => {
      let item = p.seatRows.get(x.seat);
      const props = { lead: null, title: W.seat(x.seat, x.name), sub: W.newCode, chevron: true, intent: 'issue-recovery', data: x.seat };
      if (!item) {
        item = kit.h('li', 'ms-k-list-item');
        const row = kit.row(props);
        row.dataset.value = String(x.seat);
        item.append(row);
        item.portrait = kit.portrait({ character: x.character }, s.versions);
        p.seatRows.set(x.seat, item);
      }
      kit.setPortrait(item.portrait, { character: x.character }, s.versions);
      paintCommand(item.firstChild, { ...props, lead: item.portrait }, x);
      if (p.seats.children[i] !== item) p.seats.insertBefore(item, p.seats.children[i] ?? null);
    });
    p.label.hidden = p.seats.hidden = s.seats.length === 0;
    // Abort match opens the confirm: refused (dimmed, Frontend's reason) only when the abort is not offered.
    paintCommand(p.abort, { icon: 'warning', tint: 'paper', title: W.abort, sub: W.abortLine, chevron: true, intent: 'abort-ask' }, { ...s.abort, busy: false });
  }
  function buildCode() {
    const card = kit.h('div', 'ms-hc-card');
    const label = kit.h('div', 'ms-hc-card-label');
    const idLabel = kit.text(kit.h('div', 'ms-hc-field-label'), W.matchId);
    const matchId = kit.h('div', 'ms-hc-match-id');
    const codeLabel = kit.text(kit.h('div', 'ms-hc-field-label'), W.code);
    const value = kit.h('div', 'ms-hc-code');
    const meta = kit.h('div', 'ms-hc-meta');
    meta.append(kit.icon('timer'), kit.h('span'));
    card.append(label, idLabel, matchId, codeLabel, value, meta);
    const note = kit.groupNote('');
    root.append(card, note);
    parts = { card, label, matchId, value, meta, note };
  }
  /**
   * Draws a line as its groups, each a span that never wraps (0.1.2): between them the mask's own space, or a break
   * that adds no character (<wbr>), so the line's text stays the value. Redrawn only when its text changes.
   */
  function drawGroups(line, groups, { spaced = false } = {}) {
    const text = groups.join(spaced ? ' ' : '');
    if (line.textContent === text && line.querySelectorAll(':scope > .ms-hc-group').length === groups.length) return;
    const doc = line.ownerDocument, nodes = [];
    groups.forEach((group, i) => {
      if (i) nodes.push(spaced ? doc.createTextNode(' ') : doc.createElement('wbr'));
      nodes.push(kit.text(kit.h('span', 'ms-hc-group'), group));
    });
    line.replaceChildren(...nodes);
  }
  function paintCode() {
    const p = parts, c = state.code;
    p.card.hidden = p.note.hidden = !c;
    if (!c) { p.value.replaceChildren(); return; }
    kit.text(p.label, W.codeFor(c.seat, c.name));
    drawGroups(p.matchId, matchIdGroups(c.matchId));
    // Revealed, the code; hidden, the fixed dots: the page never holds the code hidden.
    if (c.revealed) drawGroups(p.value, codeGroups(c.value)); else drawGroups(p.value, maskGroups(), { spaced: true });
    if (c.revealed) p.value.dataset.revealed = ''; else delete p.value.dataset.revealed;
    kit.text(p.meta.lastChild, c.minutes ? W.terms(c.minutes) : '');
    p.meta.hidden = !c.minutes;
    kit.text(p.note, W.codeNote(c.seat));
  }
  function buildAbort() {
    // The kit's small waiting block: its title at the pack's 1.25rem for the abort.
    const wait = kit.wait({ icon: 'warning', filled: true, title: W.confirm, line: W.confirmLine, size: 'small' });
    wait.classList.add('ms-hc-confirm');
    root.append(wait);
    parts = { wait };
  }
  function build(view) {
    // The view's parts leave with it; a focus in them returns to the content, reported once.
    if (shown === 'code' && parts.value) kit.text(parts.value, '');
    for (const node of [...root.children]) if (!node.classList.contains('ms-k-vh')) policy.remove(node);
    if (view === 'list') buildList();
    else if (view === 'code') buildCode();
    else buildAbort();
    shown = view;
  }

  function render() {
    if (disposed) return;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    root.dataset.view = state.view;
    if (shown !== state.view) build(state.view);
    if (state.view === 'list') paintList();
    else if (state.view === 'code') paintCode();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextHostControlsInput(state, next);
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    // The code leaves the page with the content.
    if (shown === 'code' && parts.value) kit.text(parts.value, '');
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, dispose, element: root });
}
