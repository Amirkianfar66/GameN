// The host lobby: the host's room before a match, as the phone pack draws it (sheet 11, Lobby). Runtime
// source, Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual component once, in
// design/; the game and the preview use it as it is). Frontend mounts it while this phone hosts an open
// room, gives it the room, the requests, the seats, the bot range and Start's availability, and routes the
// taps to today's operations.
//
// What it draws: "Leave" back and "Lobby"; the room code card (the code, Copy, "n of N seats" and its bar);
// offline, the kit's inline error under the card; "Asking to join · n" with Admit; the seats; Bots with − and
// + ("Up to n"); Start character selection at the foot, with Frontend's reason under it while unavailable;
// the entry screens' toast ("Copied", or Frontend's words when the clipboard is refused), 10 px under the
// nav bar.
//
// What it never does: work out the bot range, a free seat, whether Start is available or why not, or which
// controls the offline notice refuses (Frontend passes each as { enabled: false, reason }). Each callback
// reports a tap. Nothing here is a seat's secret: it is the host's own phone, before any role.

import { createControlPolicy, createKit } from '../kit/kit.mjs';
import { createEntryParts } from '../entry-parts/entry-parts.mjs';
import { checkInsets } from './host-setup.mjs';

export const HOST_LOBBY_VERSION = 'host-lobby-0.1.1';
const KINDS = Object.freeze(['host', 'person', 'bot']);
const DEVICES = Object.freeze(['phone', 'display']);

/** The pack's words (screens-entry.mjs, host-lobby; sheet 11), and the offline note (the Lead's review of #287). */
export const LOBBY_WORDS = Object.freeze({
  back: 'Leave', title: 'Lobby', asking: n => `Asking to join · ${n}`, phone: 'Player phone', display: 'Shared display',
  admit: 'Admit', seats: 'Seats', host: 'Host', bot: 'Bot', bots: 'Bots', upTo: n => `Up to ${n}`,
  fewer: 'Fewer bots', more: 'More bots', start: 'Start character selection',
  offline: 'No connection. Admit, Bots and Start return when you are back online.',
});

const CONTROL = Object.freeze({ enabled: true, busy: false, reason: null });
/** Every input, with its default. */
export const HOST_LOBBY_DEFAULTS = Object.freeze({
  interactive: true, reducedMotion: false, insets: null, roomCode: null, copied: false, toast: null,
  seats: null, members: Object.freeze([]), requests: Object.freeze([]),
  bots: Object.freeze({ count: 0, max: 0, enabled: true, busy: false, reason: null }), start: CONTROL, notice: null,
});

const isText = value => typeof value === 'string' && value.length > 0;
const whole = value => Number.isInteger(value) && value >= 0;
function checkControl(name, value) {
  if (value === null || typeof value !== 'object') throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}

/** The next input from the previous one and an update: each key given replaces that key; the rest stay. */
export function nextHostLobbyInput(previous, input = {}) {
  const next = { ...previous, ...input };
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  next.insets = checkInsets(next.insets ?? null);
  if (next.roomCode !== null && !isText(next.roomCode)) throw new TypeError('The room code is its characters, or null');
  next.copied = next.copied === true;
  if (next.toast !== null && next.toast !== undefined && (!isText(next.toast.id) || !isText(next.toast.text))) throw new TypeError('A toast is { id, text, icon }');
  next.toast = next.toast ? Object.freeze({ id: next.toast.id, text: next.toast.text, icon: isText(next.toast.icon) ? next.toast.icon : 'check' }) : null;
  if (next.seats !== null && next.seats !== undefined && !(whole(next.seats.filled) && whole(next.seats.total) && next.seats.total > 0)) throw new TypeError('seats are { filled, total }');
  next.seats = next.seats ? Object.freeze({ filled: next.seats.filled, total: next.seats.total }) : null;
  if (!Array.isArray(next.members) || !next.members.every(m => Number.isInteger(m?.seat) && m.seat > 0 && isText(m.name) && KINDS.includes(m.kind))) {
    throw new TypeError(`members are [{ seat, name, kind: ${KINDS.join(' | ')} }]`);
  }
  if (new Set(next.members.map(m => m.seat)).size !== next.members.length) throw new TypeError('Each seat is listed once');
  next.members = Object.freeze(next.members.map(m => Object.freeze({ seat: m.seat, name: m.name, kind: m.kind })));
  if (!Array.isArray(next.requests) || !next.requests.every(r => isText(r?.id) && isText(r.name) && DEVICES.includes(r.device))) {
    throw new TypeError(`requests are [{ id, name, device: ${DEVICES.join(' | ')}, admit }]`);
  }
  if (new Set(next.requests.map(r => r.id)).size !== next.requests.length) throw new TypeError('Each request is listed once');
  next.requests = Object.freeze(next.requests.map(r => Object.freeze({ id: r.id, name: r.name, device: r.device, admit: checkControl('admit', r.admit ?? CONTROL) })));
  const b = next.bots;
  if (b === null || typeof b !== 'object' || !whole(b.count) || !whole(b.max)) throw new TypeError('bots are { count, max, enabled, busy, reason }');
  next.bots = Object.freeze({ count: b.count, max: b.max, ...checkControl('bots', b) });
  next.start = checkControl('start', next.start);
  if (next.notice === undefined) next.notice = null;
  if (next.notice !== null && next.notice !== 'offline') throw new TypeError(`The notice is null or "offline", not ${JSON.stringify(next.notice)}`);
  return next;
}

/**
 * Mounts the lobby in `host`, which it fills (position it, and give it the phone's size). Returns
 * { layout, update, dispose, element }.
 */
export function mountHostLobby(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A host lobby needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const parts = createEntryParts(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);

  let state = nextHostLobbyInput(HOST_LOBBY_DEFAULTS, input);
  let disposed = false, lastLayout = null, note = null;
  const on = Object.fromEntries(['onLeave', 'onCopy', 'onAdmit', 'onBots', 'onStart', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  // ── The parts ───────────────────────────────────────────────────────
  const root = el('div', 'ms-host-lobby ms-kit ms-k-phone ms-entry-parts', { tabindex: '-1', role: 'group', 'aria-label': LOBBY_WORDS.title });
  const screen = parts.screen();
  const nav = parts.navBar({ title: LOBBY_WORDS.title, back: { label: LOBBY_WORDS.back, intent: 'leave' } });
  const card = parts.codeCard({ code: state.roomCode ?? '······', copied: false, seats: null });
  const askLabel = kit.groupLabel('');
  const askList = kit.list();
  const seatsLabel = kit.groupLabel(LOBBY_WORDS.seats);
  const seatList = kit.list();
  const stepper = kit.stepper({ value: 0, label: LOBBY_WORDS.bots, intent: 'bots' });
  const [fewer, , more] = stepper.children;
  kit.attr(fewer, 'aria-label', LOBBY_WORDS.fewer);
  kit.attr(more, 'aria-label', LOBBY_WORDS.more);
  const botsRow = kit.row({ tag: 'div', icon: 'bot', tint: 'steel', title: LOBBY_WORDS.bots, sub: LOBBY_WORDS.upTo(0), trail: stepper });
  const botsList = kit.list(botsRow);
  const foot = parts.foot();
  const start = kit.button({ label: LOBBY_WORDS.start, kind: 'primary', block: true, icon: 'pass', intent: 'start', extra: ['ms-hl-start'] });
  const startNote = kit.groupNote('');
  foot.append(start, startNote);
  screen.append(nav, card, askLabel, askList, seatsLabel, seatList, kit.groupLabel(LOBBY_WORDS.bots), botsList, foot);
  root.append(screen);
  host.append(root);
  const toast = parts.createToast(root);

  // + at Frontend's most keeps its look, as sheet 11 draws Full (decision 5): it is refused through the policy's
  // accepts path, which refuses without dimming, under its own intent key. − at none is dimmed, as the pack's.
  const accepts = intent => !disposed && state.interactive && !(intent === 'bots-more' && state.bots.count >= state.bots.max);
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); } });

  // ── Taps: one delegated listener; each reports a tap, and only that ──
  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    const intent = target.dataset.intent;
    if (intent === 'leave') on.onLeave?.();
    else if (intent === 'copy') on.onCopy?.();
    else if (intent === 'admit') on.onAdmit?.(target.dataset.value);
    else if (intent === 'bots') on.onBots?.(state.bots.count + (target.dataset.value === 'up' ? 1 : -1));
    else if (intent === 'start') on.onStart?.();
  };
  root.addEventListener('click', onClick);

  // ── Keyed rows: each request by its id, each seat by its number; a row and its focus stay while it does ──
  function keyed(list, items, key, make, paint) {
    const have = new Map([...list.children].map(li => [li.dataset.key, li]));
    const wanted = new Set(items.map(i => String(key(i))));
    for (const [k, li] of have) if (!wanted.has(k)) policy.remove(li);
    items.forEach((item, i) => {
      const k = String(key(item));
      let li = have.get(k);
      if (!li || !li.isConnected) { li = kit.h('li', 'ms-k-list-item'); li.dataset.key = k; li.append(make(item)); }
      if (list.children[i] !== li) list.insertBefore(li, list.children[i] ?? null);
      paint(li.firstChild, item);
    });
  }
  const requestRow = r => {
    const admit = kit.button({ label: LOBBY_WORDS.admit, kind: 'primary', small: true, intent: 'admit', value: r.id });
    return kit.row({ tag: 'div', icon: r.device, tint: r.device === 'display' ? 'slate' : 'paper', title: r.name, sub: r.device === 'display' ? LOBBY_WORDS.display : LOBBY_WORDS.phone, trail: admit });
  };
  const paintRequest = (row, r) => {
    const admit = row.querySelector('[data-intent="admit"]');
    kit.setRow(row, { tag: 'div', icon: r.device, tint: r.device === 'display' ? 'slate' : 'paper', title: r.name, sub: r.device === 'display' ? LOBBY_WORDS.display : LOBBY_WORDS.phone, trail: admit });
    policy.control(admit, { off: !r.admit.enabled, busy: r.admit.busy, reason: r.admit.reason });
  };
  const botTile = () => { const tile = kit.h('span', 'ms-k-row-icon', { 'data-tint': 'steel' }); tile.append(kit.icon('bot', true)); return tile; };
  const seatRow = () => kit.row({ tag: 'div', lead: kit.num(1), title: ' ' });
  const paintSeat = (row, m) => {
    const lead = row.querySelector('.ms-k-num') ?? kit.num(m.seat);
    kit.text(lead, String(m.seat));
    const tile = m.kind === 'bot' ? (row.querySelector('.ms-k-row-trail > .ms-k-row-icon') ?? botTile()) : null;
    kit.setRow(row, { tag: 'div', lead, title: m.name, sub: m.kind === 'host' ? LOBBY_WORDS.host : m.kind === 'bot' ? LOBBY_WORDS.bot : null, trail: tile });
  };

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    if (disposed) return;
    for (const [name, value] of [['--ms-ep-safe-t', state.insets?.top], ['--ms-ep-safe-b', state.insets?.bottom]]) {
      if (Number.isFinite(value)) root.style.setProperty(name, `${value}px`); else root.style.removeProperty(name);
    }
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    parts.setCodeCard(card, { code: state.roomCode ?? '······', copied: state.copied, seats: state.seats });
    policy.control(card.querySelector('.ms-ep-copy'), {});
    policy.control(nav.querySelector('.ms-ep-back'), {});
    // Offline: the note only, under the card. Which controls are refused stays Frontend's.
    if (state.notice === 'offline' && !note) { note = kit.errorNote(LOBBY_WORDS.offline, { icon: 'offline', filled: false }); note.classList.add('ms-hl-note'); card.after(note); }
    if (state.notice !== 'offline' && note) { note.remove(); note = null; }
    askLabel.hidden = askList.hidden = state.requests.length === 0;
    kit.text(askLabel, LOBBY_WORDS.asking(state.requests.length));
    keyed(askList, state.requests, r => r.id, requestRow, paintRequest);
    keyed(seatList, state.members, m => m.seat, seatRow, paintSeat);
    seatsLabel.hidden = seatList.hidden = state.members.length === 0;
    // Bots: − refused at none (dimmed, as the pack's), + at Frontend's most (keeping its look, as sheet 11 draws
    // Full); both refused, dimmed, when Frontend refuses them. A refused side has Frontend's reason (bots.reason).
    const b = state.bots;
    kit.setStepper(stepper, { value: b.count, label: LOBBY_WORDS.bots, intent: 'bots' });
    kit.setRow(botsRow, { tag: 'div', icon: 'bot', tint: 'steel', title: LOBBY_WORDS.bots, sub: LOBBY_WORDS.upTo(b.max), trail: stepper });
    policy.control(fewer, { off: !b.enabled || b.count <= 0, busy: b.busy, reason: b.enabled && b.count > 0 ? null : b.reason });
    policy.control(more, { intent: 'bots-more', off: !b.enabled, busy: b.busy, reason: b.enabled && b.count < b.max ? null : b.reason });
    // Start: unavailable, its reason is the line under it.
    policy.control(start, { off: !state.start.enabled, busy: state.start.busy, reason: state.start.reason });
    const why = !state.start.enabled && state.start.reason ? state.start.reason : '';
    kit.text(startNote, why);
    startNote.hidden = !why;
    kit.attr(startNote, 'aria-hidden', why ? 'true' : null);
    placeToast();
    toast.update(state.toast);
  }
  /**
   * The toast 10 px under the nav bar (the Lead's review of #287, question 3), where the pack's sits under a bar: the
   * kit's toast (0.1.1, kit 0.8.0) sits 10 px under --ms-k-toast-top, so that is where the nav bar ends.
   */
  function placeToast() {
    const value = `${Math.round((nav.offsetTop + nav.offsetHeight) * 100) / 100}px`;
    if (root.style.getPropertyValue('--ms-k-toast-top') !== value) root.style.setProperty('--ms-k-toast-top', value);
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
  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => { placeToast(); reportLayout(); }) : null;
  observer?.observe(root);
  observer?.observe(nav);

  function update(next = {}) {
    if (disposed) return;
    state = nextHostLobbyInput(state, next);
    render();
    reportLayout();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    root.removeEventListener('click', onClick);
    toast.dispose();
    policy.dispose();
    root.remove();
  }

  render();
  if (!observer) reportLayout();
  return Object.freeze({ layout, update, dispose, element: root });
}
