// Character selection: the 30-second screen where each player chooses one of the nine characters, as the
// phone pack draws it (sheet 16; #222 item 26). Runtime source, Designer's (the owner, 14 and 15 November
// 2026: Designer builds each visual component once, in design/; the game and the preview use it as it
// is). Frontend mounts it while the session is choosing, gives it the public grid and this phone's own
// choice each tick, and connects its intents.
//
// What it draws: the top bar ("Choose a character", its line and the clock, amber from 0:05) through the
// phone shell, so the game has one top bar; the nine in the kit's 3 × 3, each free, taken ("Taken · 2"),
// saving, yours or assigned; the foot with this phone's character, or none yet; the shell's toast
// ("Assigned: Juno") and its reconnecting banner.
//
// What it never does: decide who may take a character, when the time ends, or what is assigned; count the
// clock down; look a name up. Frontend gives the nine with their names, each other seat's character, this
// phone's choice and the server's offer; a tap reports which character, and only that. This phone's choice,
// the offer and the toast are this viewer's own, and the screen drops them when it is concealed or its
// viewer changes; the grid's holders, the clock and "Time is up" are public.

import { mountPhoneShell, RECONNECTING } from '../phone-shell/phone-shell.mjs';
import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const CHARACTER_SELECT_VERSION = 'character-select-0.1.0';
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const MINE_STATES = Object.freeze(['saving', 'confirmed', 'assigned']);
/** The clock turns amber from 0:05, as sheet 16 draws it (the pack's urgentAt: 5). */
export const CHOOSE_URGENT_MS = 5000;
/** The grid holds the nine (the pack's 3 × 3). */
export const CHARACTER_COUNT = 9;

/** The pack's words (screens-entry.mjs, the choose screen; sheet 16). */
export const CHOOSE_WORDS = Object.freeze({
  title: 'Choose a character',
  sub: 'Assigned for you if time runs out',
  closed: 'Time is up',
  group: 'Characters',
  taken: seat => `Taken · ${seat}`,
  takenBy: seat => `Taken by player ${seat}`,
  saving: 'Saving…',
  yours: 'Yours',
  assignedNote: 'Assigned',
  none: 'No character yet',
  tapOne: 'Tap one to choose',
  savingLine: 'Saving your choice',
  change: 'Tap another to change',
  auto: 'Assigned automatically',
  /** The toast, in Frontend's words when the server assigns this phone a character. */
  assigned: name => `Assigned: ${name}`,
});

/** Every input, with its default: no characters yet, nothing of this viewer's, choosing not offered. */
export const CHARACTER_SELECT_DEFAULTS = Object.freeze({
  status: 'live', interactive: true, reducedMotion: false, insets: null, viewer: null, versions: null,
  characters: Object.freeze([]), timer: null, closed: false, holders: Object.freeze({}),
  mine: null, choose: Object.freeze({ enabled: false, reason: null }), toast: null,
});
/** The inputs that belong to this viewer. */
const VIEWER_KEYS = Object.freeze(['mine', 'choose', 'toast']);

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = value => Number.isSafeInteger(value) && value >= 1;

function checkCharacters(characters) {
  if (!Array.isArray(characters) || (characters.length !== 0 && characters.length !== CHARACTER_COUNT)) {
    throw new TypeError(`characters are the ${CHARACTER_COUNT} as [{ id, name }], in the grid's order, or none yet`);
  }
  const ids = new Set();
  const out = characters.map(c => {
    if (!c || !isText(c.id)) throw new TypeError('Each character needs its id');
    // The screen never looks a name up: Frontend gives each one from the game's character data.
    if (!isText(c.name)) throw new TypeError(`Character ${c.id} needs its name: the screen never looks one up`);
    if (ids.has(c.id)) throw new TypeError(`Character ${c.id} is given twice`);
    ids.add(c.id);
    return Object.freeze({ id: c.id, name: c.name });
  });
  return Object.freeze(out);
}
function checkHolders(holders, ids) {
  if (holders === null || holders === undefined) return Object.freeze({});
  if (typeof holders !== 'object' || Array.isArray(holders)) throw new TypeError('holders are { [characterId]: seat }');
  const out = {};
  for (const [id, seat] of Object.entries(holders)) {
    if (!ids.has(id)) throw new TypeError(`holders name ${JSON.stringify(id)}, which is not one of the characters given`);
    if (!isSeat(seat)) throw new TypeError(`The holder of ${id} is a seat number (1 or more), not ${JSON.stringify(seat)}`);
    out[id] = seat;
  }
  return Object.freeze(out);
}

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's
 * value; the rest stay. This viewer's own inputs (this phone's choice, the offer, the toast) are dropped
 * while the screen is concealed, never kept for when it shows again, and when the viewer changes, unless
 * the same update gives the new viewer's.
 */
export function nextCharacterSelectInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.insets !== null && !['top', 'right', 'bottom', 'left'].every(k => next.insets[k] === undefined || Number.isFinite(next.insets[k]))) throw new TypeError('insets are null, or { top, right, bottom, left } in px');
  next.interactive = next.interactive !== false;
  next.reducedMotion = !!next.reducedMotion;
  next.characters = checkCharacters(next.characters ?? []);
  const ids = new Set(next.characters.map(c => c.id));
  if (next.timer !== null && next.timer !== undefined) {
    const { remainingMs } = next.timer;
    if (!Number.isFinite(remainingMs) || remainingMs < 0) throw new TypeError('timer is { remainingMs } from the server\'s clock, or null');
    next.timer = Object.freeze({ remainingMs });
  } else next.timer = null;
  if (typeof next.closed !== 'boolean') throw new TypeError('closed is true or false, from the server');
  next.holders = checkHolders(next.holders, ids);
  if (next.mine) {
    if (!ids.has(next.mine.id)) throw new TypeError(`mine is ${JSON.stringify(next.mine.id)}, which is not one of the characters given`);
    if (!MINE_STATES.includes(next.mine.state)) throw new TypeError(`mine's state is ${MINE_STATES.join(', ')}, not ${JSON.stringify(next.mine.state)}`);
    next.mine = Object.freeze({ id: next.mine.id, state: next.mine.state });
  } else next.mine = null;
  const choose = next.choose ?? CHARACTER_SELECT_DEFAULTS.choose;
  if (choose.reason !== null && choose.reason !== undefined && typeof choose.reason !== 'string') throw new TypeError('choose.reason is text, or null');
  next.choose = Object.freeze({ enabled: choose.enabled === true, reason: isText(choose.reason) ? choose.reason : null });
  if (next.toast) {
    if (!isText(next.toast.text)) throw new TypeError('A toast needs its text');
    next.toast = Object.freeze({ id: String(next.toast.id ?? next.toast.text), text: next.toast.text, icon: next.toast.icon ?? 'info' });
  } else next.toast = null;
  const viewerChanged = 'viewer' in input && previous.viewer !== input.viewer;
  if (next.status === 'concealed' || viewerChanged) {
    for (const key of VIEWER_KEYS) if (next.status === 'concealed' || !(key in input)) next[key] = CHARACTER_SELECT_DEFAULTS[key];
  }
  return next;
}

/**
 * One character's cell, from the input: its kit state, note, mark, accessible name, and whether a tap on
 * it is refused (and why). This phone's own is never refused or dimmed, but a tap on it reports nothing.
 */
export function characterCell(s, character) {
  const W = CHOOSE_WORDS;
  if (s.mine && s.mine.id === character.id) {
    const saving = s.mine.state === 'saving';
    return { state: saving ? 'selected' : 'confirmed', note: saving ? W.saving : s.mine.state === 'assigned' ? W.assignedNote : W.yours,
      mark: saving ? null : 'check', label: `${character.name}, yours`, mine: true, busy: saving, off: false, reason: null };
  }
  const seat = s.holders[character.id] ?? null;
  if (seat !== null) return { state: 'taken', note: W.taken(seat), mark: null, label: `${character.name}, taken by player ${seat}`, mine: false, busy: false, off: true, reason: W.takenBy(seat) };
  // Time is up (the server's word, never the clock's 0:00): every character but this phone's dimmed and refused.
  if (s.closed) return { state: 'taken', note: '', mark: null, label: character.name, mine: false, busy: false, off: true, reason: W.closed };
  return { state: 'available', note: '', mark: null, label: character.name, mine: false, busy: false, off: !s.choose.enabled, reason: s.choose.enabled ? null : s.choose.reason };
}

/** The foot: this phone's character and how it stands, or none yet (sheet 16). */
export function chooseFoot(s) {
  const W = CHOOSE_WORDS;
  const character = s.mine ? s.characters.find(c => c.id === s.mine.id) : null;
  if (!character) return { character: null, name: W.none, line: W.tapOne, busy: false, pill: false };
  const st = s.mine.state;
  return { character: character.id, name: character.name, line: st === 'saving' ? W.savingLine : st === 'assigned' ? W.auto : W.change, busy: st === 'saving', pill: st === 'confirmed' };
}

/**
 * Mounts the screen in `host`, which it fills (position it, and give it the phone's size). Returns
 * { update, dispose, layout, element }.
 */
export function mountCharacterSelect(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('Character selection needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const kit = createKit(doc);
  const el = (tag, className, attrs = {}) => kit.h(tag, className, attrs);
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const attr = (node, name, value) => {
    if (value === null || value === undefined || value === false) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  };

  let state = nextCharacterSelectInput(CHARACTER_SELECT_DEFAULTS, input);
  let disposed = false, lastLayout = null, lineKey = null;
  const on = Object.fromEntries(['onChoose', 'onRetry', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  // ── The parts ───────────────────────────────────────────────────────
  const root = el('div', 'ms-char-select ms-kit', { tabindex: '-1' });
  const shellHost = el('div', 'ms-cs-shell');
  root.append(shellHost);
  host.append(root);
  // The kit's control policy: every cell refused while reconnecting, concealed or not interactive (with the
  // banner's words as the reason while reconnecting); a taken or closed one dimmed and refused with its
  // reason; a free one refused with Frontend's reason while choosing is not offered.
  const accepts = () => !disposed && state.interactive && state.status === 'live';
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: () => (state.status === 'stale' ? RECONNECTING.sub : null),
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });

  // The phone shell draws the top bar, the reconnecting banner and the toast; the screen sits in its stage.
  const shell = mountPhoneShell(shellHost, shellInput(), { onRetry: () => { if (!disposed) on.onRetry?.(); }, onLayout: () => reportLayout() });
  const screen = el('div', 'ms-cs-screen');
  // The kit's 3 × 3 in its container: at the Largest text it becomes a list, every name whole (kit.css).
  const { wrap, grid } = kit.grid9();
  grid.classList.add('ms-cs-grid');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', CHOOSE_WORDS.group);
  const foot = el('div', 'ms-cs-foot');
  const footPicture = kit.portrait(null, null);
  const who = el('div', 'ms-cs-who');
  const footName = el('b', 'ms-cs-name');
  // How this phone's choice stands, said as it changes ("Saving your choice", "Tap another to change").
  const line = el('span', 'ms-cs-line', { 'aria-live': 'polite' });
  who.append(footName, line);
  const pill = kit.pill({ text: CHOOSE_WORDS.yours, icon: 'check', tone: 'amber' });
  foot.append(footPicture, who);
  screen.append(wrap, foot);
  shell.stage.append(screen);
  /** Each character's cell, by its id: the same element (and its focus) through every update. */
  const cells = new Map();

  function shellInput() {
    return {
      status: state.status === 'stale' ? 'stale' : 'live',
      interactive: state.interactive, reducedMotion: state.reducedMotion, insets: state.insets, viewer: state.viewer, versions: state.versions,
      bar: { kind: 'phase', icon: 'players', title: CHOOSE_WORDS.title, sub: state.closed ? CHOOSE_WORDS.closed : CHOOSE_WORDS.sub,
        timer: state.timer ? { remainingMs: state.timer.remainingMs, urgentAtMs: CHOOSE_URGENT_MS } : null },
      // The pack's phone canvas behind the bar's glass and under the grid (no room here), and no tab bar.
      tabs: null, backdrop: 'canvas', banner: state.status === 'stale' ? { kind: 'reconnecting' } : null,
      toast: state.status === 'concealed' ? null : state.toast,
    };
  }

  // ── Taps: one delegated listener for the nine ───────────────────────
  const onClick = event => {
    const target = event.target.closest?.('[data-intent="choose"]');
    if (!target || !grid.contains(target) || policy.refused(target) || !accepts()) return;
    const id = target.dataset.value;
    // A tap on this phone's own character changes nothing, and reports nothing.
    if (!id || state.mine?.id === id) return;
    on.onChoose?.(id);
  };
  root.addEventListener('click', onClick);

  // ── Render ──────────────────────────────────────────────────────────
  function paintCells() {
    const ids = new Set(state.characters.map(c => c.id));
    for (const [id, node] of cells) if (!ids.has(id)) { policy.remove(node); cells.delete(id); }
    // A cell moved in a new order is taken out and put back, which drops its focus: the focus goes back to it.
    const focused = [...cells.values()].find(node => node === doc.activeElement) ?? null;
    state.characters.forEach((character, i) => {
      const c = characterCell(state, character);
      const props = { person: { name: character.name, character: character.id }, versions: state.versions, state: c.state, note: c.note, mark: c.mark, label: c.label, intent: 'choose' };
      let node = cells.get(character.id);
      if (node) kit.setCell(node, props);
      else { node = kit.cell(props); cells.set(character.id, node); }
      node.dataset.value = character.id;
      // Whether it is this phone's: the kit says "pressed" only while saving; the screen says it for its own.
      attr(node, 'aria-pressed', String(c.mine));
      if (grid.children[i] !== node) grid.insertBefore(node, grid.children[i] ?? null);
      policy.control(node, { intent: 'choose', off: c.off, busy: c.busy, reason: c.reason });
    });
    if (focused && focused.isConnected && doc.activeElement !== focused) focused.focus({ preventScroll: true });
  }
  function paintFoot() {
    const f = chooseFoot(state);
    kit.setPortrait(footPicture, f.character ? { character: f.character } : null, state.versions);
    text(footName, f.name);
    // The line, with the pack's spinner before its words while saving.
    const key = `${f.busy}|${f.line}`;
    if (key !== lineKey) {
      lineKey = key;
      if (f.busy) line.replaceChildren(el('span', 'ms-k-spinner', { 'aria-hidden': 'true' }), doc.createTextNode(` ${f.line}`));
      else line.replaceChildren(doc.createTextNode(f.line));
    }
    if (f.pill && pill.parentNode !== foot) foot.append(pill);
    else if (!f.pill && pill.parentNode) pill.remove();
  }
  function render() {
    if (disposed) return;
    root.dataset.status = state.status;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    if (state.closed) root.dataset.closed = ''; else delete root.dataset.closed;
    shell.update(shellInput());
    paintCells();
    paintFoot();
  }

  // ── Layout ──────────────────────────────────────────────────────────
  /** The shell's size, bars and safe areas, in its CSS pixels; after dispose(), null. */
  function layout() {
    if (disposed) return null;
    const l = shell.layout();
    return l ? { size: l.size, bars: l.bars, safe: l.safe } : null;
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
    state = nextCharacterSelectInput(state, next);
    render();
    if (!observer) reportLayout();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    root.removeEventListener('click', onClick);
    policy.dispose();
    shell.dispose();
    cells.clear();
    root.remove();
  }

  render();
  return Object.freeze({ update, dispose, layout, element: root });
}
