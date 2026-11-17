// Waiting: the joining player's screen once the request is sent, as the phone pack draws it (sheet 13):
// "Waiting for the host", the player lobby once admitted, and the room started without them; and a declined
// request in the same layout (the Lead's review of #289, question 3). Runtime source, Designer's (the owner, 14,
// 15 and 16 November 2026: Designer builds each visual component once, in design/; the game and the preview use
// it as it is). Frontend mounts it once the request is sent and gives it the admission's status.
//
// What it draws: the nav bar ("Cancel", "Leave" or "Menu"); waiting, the hourglass, "Waiting for the host", "Room
// K7Q2XM · as Dev" and Check again; admitted, the seat badge, the line, "Players · 5 of 9", a row per seat and
// the foot's spinner and words; started without you or declined, the lock, the words, the room and Back to menu.
// A lost connection is Frontend's words under the line (question 4); the words alone refuse nothing.
// What it never does: work out the admission, a seat, or why the request ended. Each callback reports a tap.
// Cancel, Leave and Back to menu take Frontend's availability (`cancel`, `leave`, `back`; the Lead's decision of
// 17 November 2026): while the game has no command to withdraw a request or leave a lobby (#222 G6), they are drawn
// unavailable by the kit's control policy, dimmed, with Frontend's reason as their description, and report nothing.

import { createControlPolicy, createKit } from '../kit/kit.mjs';
import { createEntryParts } from '../entry-parts/entry-parts.mjs';

export const JOIN_WAIT_VERSION = 'join-wait-0.1.1';
const VIEWS = Object.freeze(['pending', 'admitted', 'closed', 'declined']);

/** The pack's words (screens-entry.mjs, join-wait; sheet 13), the declined request's and the connection's (the Lead's review of #289). */
export const WAIT_WORDS = Object.freeze({
  join: 'Join', lobby: 'Lobby', cancel: 'Cancel', leave: 'Leave', menu: 'Menu',
  waiting: 'Waiting for the host', as: (code, name) => `Room ${code} · as ${name}`, check: 'Check again',
  inSeat: seat => `You’re in · Seat ${seat}`, waitingHost: code => `Room ${code} · waiting for the host`,
  players: (filled, total) => `Players · ${filled} of ${total}`, you: name => `${name} (you)`,
  starts: 'Character selection starts when every seat is filled',
  closed: 'This room started without you', declined: 'The host didn’t admit you', room: code => `Room ${code}`, back: 'Back to menu',
  offline: 'No connection. Check again returns when you are back online.',
});

const CONTROL = Object.freeze({ enabled: true, busy: false, reason: null });
/** Every input, with its default. */
export const JOIN_WAIT_DEFAULTS = Object.freeze({
  interactive: true, reducedMotion: false, insets: null, view: 'pending', roomCode: null, name: null, seat: null,
  members: Object.freeze([]), seats: null, check: CONTROL, error: null, cancel: CONTROL, leave: CONTROL, back: CONTROL,
});

const isText = value => typeof value === 'string' && value.length > 0;
const whole = value => Number.isInteger(value) && value >= 0;
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
export function nextJoinWaitInput(previous, input = {}) {
  const next = { ...previous, ...input };
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  next.insets = checkInsets(next.insets ?? null);
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.map(v => `"${v}"`).join(', ')}, not ${JSON.stringify(next.view)}`);
  if (next.roomCode !== null && !isText(next.roomCode)) throw new TypeError('The room code is its characters, or null');
  if (next.name !== null && !isText(next.name)) throw new TypeError('The name is words, or null');
  if (next.seat !== null && !(Number.isInteger(next.seat) && next.seat > 0)) throw new TypeError('The seat is a seat number, or null');
  if (!Array.isArray(next.members) || !next.members.every(m => Number.isInteger(m?.seat) && m.seat > 0 && isText(m.name))) throw new TypeError('members are [{ seat, name }]');
  if (new Set(next.members.map(m => m.seat)).size !== next.members.length) throw new TypeError('Each seat is listed once');
  next.members = Object.freeze(next.members.map(m => Object.freeze({ seat: m.seat, name: m.name })));
  if (next.seats !== null && next.seats !== undefined && !(whole(next.seats.filled) && whole(next.seats.total) && next.seats.total > 0)) throw new TypeError('seats are { filled, total }');
  next.seats = next.seats ? Object.freeze({ filled: next.seats.filled, total: next.seats.total }) : null;
  next.check = checkControl('check', next.check);
  for (const name of ['cancel', 'leave', 'back']) next[name] = checkControl(name, next[name] ?? CONTROL);
  if (next.error !== null && next.error !== undefined && !isText(next.error)) throw new TypeError('The error is null or words');
  next.error = next.error ?? null;
  if (next.view === 'admitted' && (next.seat === null || !next.seats)) throw new TypeError('Admitted, the screen needs the seat and the seats');
  return next;
}

/**
 * Mounts the waiting screen in `host`, which it fills (position it, and give it the phone's size). Returns
 * { layout, update, dispose, element }.
 */
export function mountJoinWait(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('The waiting screen needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const parts = createEntryParts(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);

  let state = nextJoinWaitInput(JOIN_WAIT_DEFAULTS, input);
  let disposed = false, lastLayout = null, shown = null, note = null;
  const on = Object.fromEntries(['onCancel', 'onCheck', 'onLeave', 'onBack', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  // ── The parts ───────────────────────────────────────────────────────
  // ms-k-phone: the phone-sized container the kit's larger-text rules ask (kit 0.5.0).
  const root = el('div', 'ms-join-wait ms-kit ms-k-phone ms-entry-parts', { tabindex: '-1', role: 'group', 'aria-label': WAIT_WORDS.join });
  const screen = parts.screen();
  const nav = parts.navBar({ title: WAIT_WORDS.join, back: { label: WAIT_WORDS.cancel, intent: 'cancel' } });
  // Each view's own parts, kept while it shows and made again when it returns.
  let body = [];
  screen.append(nav);
  root.append(screen);
  host.append(root);

  const accepts = () => !disposed && state.interactive;
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); } });

  // ── Taps: one delegated listener; each reports a tap, and only that ──
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    const intent = target.dataset.intent;
    if (intent === 'cancel') on.onCancel?.();
    else if (intent === 'check') on.onCheck?.();
    else if (intent === 'leave') on.onLeave?.();
    else if (intent === 'back') on.onBack?.();
  };
  root.addEventListener('click', onClick);

  // ── The views ───────────────────────────────────────────────────────
  let wait = null, check = null, badge = null, line = null, playersLabel = null, playersList = null, footNote = null, back = null;
  function build(view) {
    for (const node of body) policy.remove(node);
    note = null;
    wait = check = badge = line = playersLabel = playersList = footNote = back = null;
    if (view === 'pending') {
      wait = kit.wait({ icon: 'hourglass', filled: true, title: WAIT_WORDS.waiting });
      check = kit.button({ label: WAIT_WORDS.check, kind: 'plain', intent: 'check', extra: ['ms-jw-check'] });
      wait.append(check);
      body = [wait];
    } else if (view === 'admitted') {
      // The pack's lobby block: the badge and the line, 6 px from the top (screens-entry.mjs, join-wait admitted).
      wait = el('div', 'ms-k-wait ms-jw-in');
      badge = parts.seatBadge({ seat: state.seat, words: WAIT_WORDS.inSeat(state.seat) });
      line = el('p', 'ms-k-wait-line');
      wait.append(badge, line);
      playersLabel = kit.groupLabel('');
      playersList = kit.list();
      const foot = parts.foot();
      footNote = kit.groupNote('');
      footNote.append(el('span', 'ms-k-spinner', { 'aria-hidden': 'true' }), doc.createTextNode(` ${WAIT_WORDS.starts}`));
      foot.append(footNote);
      body = [wait, playersLabel, playersList, foot];
    } else {
      wait = kit.wait({ icon: 'lock', filled: true, title: WAIT_WORDS[view] });
      const foot = parts.foot();
      back = kit.button({ label: WAIT_WORDS.back, kind: 'secondary', block: true, intent: 'back', extra: ['ms-jw-back'] });
      foot.append(back);
      body = [wait, foot];
    }
    screen.append(...body);
    shown = view;
  }
  function keyedRows() {
    const have = new Map([...playersList.children].map(li => [li.dataset.key, li]));
    const wanted = new Set(state.members.map(m => String(m.seat)));
    for (const [k, li] of have) if (!wanted.has(k)) li.remove();
    state.members.forEach((m, i) => {
      const k = String(m.seat);
      let li = have.get(k);
      if (!li || !li.isConnected) { li = el('li', 'ms-k-list-item'); li.dataset.key = k; li.append(kit.row({ tag: 'div', lead: kit.num(m.seat), title: ' ' })); }
      if (playersList.children[i] !== li) playersList.insertBefore(li, playersList.children[i] ?? null);
      const row = li.firstChild, lead = row.querySelector('.ms-k-num');
      kit.text(lead, String(m.seat));
      kit.setRow(row, { tag: 'div', lead, title: m.seat === state.seat ? WAIT_WORDS.you(m.name) : m.name });
    });
  }

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    if (disposed) return;
    for (const [name, value] of [['--ms-ep-safe-t', state.insets?.top], ['--ms-ep-safe-b', state.insets?.bottom]]) {
      if (Number.isFinite(value)) root.style.setProperty(name, `${value}px`); else root.style.removeProperty(name);
    }
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    const view = state.view, code = state.roomCode ?? '······';
    const navOf = { pending: [WAIT_WORDS.join, WAIT_WORDS.cancel, 'cancel'], admitted: [WAIT_WORDS.lobby, WAIT_WORDS.leave, 'leave'], closed: [WAIT_WORDS.join, WAIT_WORDS.menu, 'back'], declined: [WAIT_WORDS.join, WAIT_WORDS.menu, 'back'] }[view];
    parts.setNavBar(nav, { title: navOf[0], back: { label: navOf[1], intent: navOf[2] } });
    kit.attr(root, 'aria-label', navOf[0]);
    // The nav bar's one control is Cancel, Leave or Menu: each with its own availability.
    const exit = state[navOf[2]];
    policy.control(nav.querySelector('.ms-ep-back'), { off: !exit.enabled, reason: exit.reason });
    if (shown !== view) build(view);
    if (view === 'pending') {
      kit.setWait(wait, { icon: 'hourglass', filled: true, title: WAIT_WORDS.waiting, line: state.name ? WAIT_WORDS.as(code, state.name) : WAIT_WORDS.room(code) });
      kit.setButton(check, { label: WAIT_WORDS.check, kind: 'plain', intent: 'check', extra: ['ms-jw-check'] });
      policy.control(check, { off: !state.check.enabled, busy: state.check.busy, reason: state.check.reason });
    } else if (view === 'admitted') {
      parts.setSeatBadge(badge, { seat: state.seat, words: WAIT_WORDS.inSeat(state.seat) });
      kit.text(line, WAIT_WORDS.waitingHost(code));
      kit.text(playersLabel, WAIT_WORDS.players(state.seats.filled, state.seats.total));
      keyedRows();
    } else {
      kit.setWait(wait, { icon: 'lock', filled: true, title: WAIT_WORDS[view], line: WAIT_WORDS.room(code) });
      policy.control(back, { off: !state.back.enabled, reason: state.back.reason });
    }
    // A lost connection: Frontend's words under the line, inside the block, before Check again. It refuses nothing.
    const lineNode = wait.querySelector('.ms-k-wait-line');
    if (state.error && !note) { note = kit.errorNote(state.error, { icon: 'offline', filled: false }); note.classList.add('ms-jw-note'); lineNode.after(note); }
    else if (state.error && note) kit.text(note.querySelector('.ms-k-error-text'), state.error);
    else if (!state.error && note) { note.remove(); note = null; }
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
    state = nextJoinWaitInput(state, next);
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
