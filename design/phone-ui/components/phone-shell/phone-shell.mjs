// The phone shell: the match's frame on a phone, as the phone pack draws it (sheets 07 and 08 the bars,
// 25 the private talk's two buttons, 27–29 the tabs, the docked sheets and the target bar, 44 an
// eliminated player's phone, 45 reconnecting, 56 at large text). Runtime source, Designer's (the owner,
// 14 and 15 November 2026: Designer builds each visual component once, in design/; the game and the
// preview use it as it is).
// Frontend mounts it once for the match screen, gives it this phone's view, mounts the room scene (or the
// board) in its stage, mounts each sheet's content in the sheet's body, and connects its intents.
//
// What it draws: the top bar (a turn, your turn, a phase, a private talk, the Blackout's dark) with
// Promises, ⋮, the round and the clock; the tabs with the raised Pass, Vote or Voted button, or the
// private talk's Promises and My card; over the stage, the target bar with its Cancel, the floating chip,
// a banner (reconnecting, or an eliminated player's) and a toast; the docked glass sheet's frame. It
// takes its looks from the pack (design/phone-ui/prototype/ui.mjs and kit.css, which the frozen Food
// release pins, so they stay as they are; the shell's test checks that the two agree).
//
// What it never does: decide what is offered, send a command, open a sheet, count a clock down or
// invent an outcome. Each callback reports a tap; Frontend checks the current offer and acts. The bar is
// the public match status; the Promises count, the tabs, the target bar, the chip, the sheet, the
// toast and an eliminated player's banner are this viewer's own, and the shell drops them when it is
// concealed or its viewer changes.
//
// The words of a phase bar are not the shell's to choose: phase-bars.mjs (0.2.10) holds the pack's for
// each game step, and returns this file's `bar` input from the facts Frontend gives.
//
// One departure from the pack's sheet 08, the owner's of 18 November 2026 (docs/design/owner-decisions.md,
// "The Card tab moves to the right and shows the player's own character"), 0.3.0: Card is the last tab,
// after Panels, and its icon is this viewer's own crew portrait (`tabs.me`), the plain portrait the top
// bar draws. With no character it keeps the pack's card icon. From 0.3.1 (the owner, the same day) the
// portrait has the top bar's own shape and size: its rounded-square tile, whole, at 32 px.

import { crewPortraitVariable } from '../../../../apps/game/hosted/crew-runtime.mjs';
import { iconPaintedSvg, iconTileSvg } from '../icon-paint.mjs';
import { iconSvg } from '../icons.mjs';
import { createControlPolicy, createKit, followTextSize } from '../kit/kit.mjs';

export const PHONE_SHELL_VERSION = 'phone-shell-0.3.1';
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const KINDS = Object.freeze(['turn', 'phase', 'pair']);
const HERO_MODES = Object.freeze(['pass', 'vote', 'voted']);

/**
 * The game's tabs, in order, and the private talk's two buttons (sheet 25). Card is last (0.3.0, the owner's
 * 18 November 2026 decision); the pack's sheet 08 draws it before Panels.
 */
export const GAME_TABS = Object.freeze(['switch', 'actions', 'hero', 'panels', 'card']);
export const TALK_BUTTONS = Object.freeze(['promises', 'my-card']);

/** The pack's words: the hero's accessible names (ui.mjs tabs()), the reconnecting banner (sheet 45) and an
    eliminated player's (sheet 44's Eliminated frame, 0.2.8). */
export const HERO_WORDS = Object.freeze({
  pass: Object.freeze({ label: 'Pass', aria: 'Pass your turn', icon: 'pass' }),
  vote: Object.freeze({ label: 'Vote', aria: 'Open the ballot', icon: 'vote' }),
  voted: Object.freeze({ label: 'Voted', aria: 'Ballot registered', icon: 'vote' }),
});
export const RECONNECTING = Object.freeze({ title: 'Connection lost', sub: 'Controls return when the match is current', action: 'Retry' });
export const OUT = Object.freeze({ title: 'You’re out', sub: 'You can watch. Your role stays private.' });
/** The banner's kinds and how each is drawn: its icon, filled as the pack's, and its words. Only reconnecting has an action. */
export const BANNER_KINDS = Object.freeze(['reconnecting', 'out']);
const BANNERS = Object.freeze({ reconnecting: { icon: 'offline', ...RECONNECTING }, out: { icon: 'eliminated', ...OUT, action: null } });
/** How long a toast shows before it fades, in milliseconds: a local confirmation, never game time. */
export const TOAST_MS = 2400;

/** Every input, with its default. */
export const PHONE_SHELL_DEFAULTS = Object.freeze({
  status: 'live', interactive: true, reducedMotion: false,
  // null: the safe areas come from the browser (env(safe-area-inset-*)); or { top, right, bottom, left } in px.
  insets: null,
  // An opaque id for whose phone this is (a seat id, or null for a shared display): when it changes, this
  // viewer's inputs are dropped unless the same update gives the new viewer's own.
  viewer: null,
  versions: null,
  bar: Object.freeze({ kind: 'phase', title: '', icon: 'hourglass' }),
  // true: the stage and its cover fill the whole shell, edge to edge, under the safe areas and any bar or
  // tabs, for a full-screen film or poster (the pack draws them at inset 0, kit.css .media).
  edge: false,
  // What lies behind the bars and wherever nothing is drawn: 'scene', the room view's space (the pack's .scene,
  // which lies under its bars), or 'canvas', the phone's own (the pack's .ph), for a screen with no room.
  backdrop: 'scene',
  tabs: null, target: null, chip: null, banner: null, toast: null, sheet: null,
});

/** The inputs that belong to this viewer, not to the public match status. */
const VIEWER_KEYS = Object.freeze(['tabs', 'target', 'chip', 'sheet', 'toast']);

const isText = value => typeof value === 'string' && value.length > 0;
const optionalText = (value, what) => {
  if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${what} is text, or null`);
  return value ?? null;
};
/** The number on a seat: `number`, or the digits at the end of its id ("seat-4" → 4). */
export const seatNumber = person => person?.number ?? (typeof person?.seat === 'number' ? person.seat : Number(String(person?.seat ?? '').match(/\d+$/)?.[0] ?? NaN));

function checkPerson(person, what) {
  if (!person || typeof person !== 'object') throw new TypeError(`${what} is { seat, name, character }`);
  if (!isText(person.name)) throw new TypeError(`${what} needs a name`);
  if (person.seat === null || person.seat === undefined) throw new TypeError(`${what} needs a seat`);
  return { seat: person.seat, number: person.number ?? null, name: person.name, character: person.character ?? null };
}

/** The top bar's input, checked, with the pack's defaults (ui.mjs topBar()). */
export function checkBar(bar) {
  if (!bar || typeof bar !== 'object') throw new TypeError('bar is the top bar\'s input');
  const kind = bar.kind ?? 'phase';
  if (!KINDS.includes(kind)) throw new TypeError(`A bar's kind is ${KINDS.join(', ')}, not ${JSON.stringify(kind)}`);
  const out = { kind, who: null, self: !!bar.self, pair: null, title: '', short: null, icon: bar.icon ?? 'hourglass', sub: optionalText(bar.sub, 'sub'),
    tone: bar.tone === 'dark' ? 'dark' : null, round: null, timer: null, promises: null, menu: null };
  if (kind === 'turn') out.who = checkPerson(bar.who, 'A turn bar\'s who');
  if (kind === 'pair') {
    if (!Array.isArray(bar.pair) || bar.pair.length !== 2) throw new TypeError('A pair bar names the two people talking');
    out.pair = bar.pair.map((p, i) => checkPerson(p, `pair[${i}]`));
  }
  if (kind === 'phase') {
    if (typeof bar.title !== 'string') throw new TypeError('A phase bar needs a title');
    out.title = bar.title;
    out.short = optionalText(bar.short, 'short');
  }
  if (bar.round !== null && bar.round !== undefined) {
    if (!Number.isSafeInteger(bar.round) || bar.round < 0) throw new TypeError('round is a whole number, or null');
    out.round = bar.round;
  }
  if (bar.timer) {
    const { remainingMs, urgentAtMs = 10000, ring = null } = bar.timer;
    if (!Number.isFinite(remainingMs) || remainingMs < 0) throw new TypeError('timer.remainingMs is the time left in milliseconds');
    if (ring !== null && !(Number.isFinite(ring) && ring >= 0 && ring <= 1)) throw new TypeError('timer.ring is 0…1, or null');
    out.timer = { remainingMs, urgentAtMs, ring };
  }
  if (bar.promises) out.promises = { count: Math.max(0, Number(bar.promises.count) || 0), open: !!bar.promises.open, enabled: bar.promises.enabled !== false, reason: optionalText(bar.promises.reason, 'promises.reason') };
  if (bar.menu) out.menu = { open: !!bar.menu.open, enabled: bar.menu.enabled !== false };
  return out;
}

function checkHero(hero) {
  if (hero === null || hero === undefined) return { mode: 'pass', enabled: false, busy: false, reason: null };
  if (!HERO_MODES.includes(hero.mode)) throw new TypeError(`The hero's mode is ${HERO_MODES.join(', ')}, not ${JSON.stringify(hero.mode)}`);
  return { mode: hero.mode, enabled: hero.enabled !== false, busy: !!hero.busy, reason: optionalText(hero.reason, 'hero.reason') };
}

/**
 * The tabs' input, checked. `null` is no tab bar (a shared display).
 * `me` (0.3.0) is this viewer's own person, { seat, name, character }, as the bar's `who`: the Card tab draws
 * their crew portrait in place of the card icon. null, or a person with no character: the card icon.
 */
export function checkTabs(tabs) {
  if (tabs === null || tabs === undefined) return null;
  const variant = tabs.variant ?? 'game';
  if (!['game', 'talk'].includes(variant)) throw new TypeError(`The tabs' variant is game or talk, not ${JSON.stringify(variant)}`);
  const keys = variant === 'game' ? GAME_TABS.filter(k => k !== 'hero') : TALK_BUTTONS;
  const open = tabs.open ?? null;
  if (open !== null && !keys.includes(open)) throw new TypeError(`An open tab is one of ${keys.join(', ')}, or null`);
  const view = tabs.view ?? 'room';
  if (!['room', 'board'].includes(view)) throw new TypeError(`The view is room or board, not ${JSON.stringify(view)}`);
  const enabled = Object.fromEntries(keys.map(k => [k, tabs.enabled?.[k] !== false]));
  const reasons = Object.fromEntries(keys.map(k => [k, optionalText(tabs.reasons?.[k], `reasons.${k}`)]));
  const badges = Object.fromEntries(keys.map(k => [k, Math.max(0, Number(tabs.badges?.[k]) || 0)]));
  const me = variant === 'game' && tabs.me ? checkPerson(tabs.me, 'tabs.me') : null;
  return { variant, view, open, enabled, reasons, badges, me, hero: variant === 'game' ? checkHero(tabs.hero) : null };
}

/** A footer action's looks: the kit's buttons the pack's sheets use. 'warn' is the pack's Abort match (paper, outlined). */
const ACTION_KINDS = Object.freeze(['primary', 'secondary', 'warn']);

/**
 * A footer action. It stands for a command, so it is refused while reconnecting, unless it is `local` (0.2.4): this
 * phone's own, as Back, Close and the head actions are, such as a recovery code's Reveal, Hide and Copy, or a
 * confirm's Keep playing. A local action works while reconnecting and stands for no command.
 */
function checkAction(action, i) {
  if (!action || !isText(String(action.id ?? '')) || !isText(action.label)) throw new TypeError(`sheet.actions[${i}] is { id, label }`);
  return { id: String(action.id), label: action.label, kind: ACTION_KINDS.includes(action.kind) ? action.kind : 'secondary', icon: action.icon ?? null,
    local: action.local === true, enabled: action.enabled !== false, busy: !!action.busy, reason: optionalText(action.reason, `sheet.actions[${i}].reason`) };
}

/**
 * A head action: an icon button in the sheet's head, before Close (the pack's sheet({ actions }), as the Card's
 * "Hide card"). It is this phone's own, as Back and Close are: it works while reconnecting and stands for no
 * command, which belongs in the footer.
 */
function checkHead(action, i) {
  if (!action || !isText(String(action.id ?? '')) || !isText(action.icon) || !isText(action.label)) throw new TypeError(`sheet.head[${i}] is { id, icon, label }`);
  return { id: String(action.id), icon: action.icon, label: action.label, enabled: action.enabled !== false, reason: optionalText(action.reason, `sheet.head[${i}].reason`) };
}

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's
 * value; the rest stay. This viewer's own inputs (the tabs, the target bar, the chip, the sheet, the
 * toast and the Promises count) are dropped while the shell is concealed, never kept for when it shows
 * again, and when the viewer changes, unless the same update gives the new viewer's own.
 */
export function nextPhoneShellInput(previous, input) {
  const next = { ...previous, ...input };
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.insets !== null && !['top', 'right', 'bottom', 'left'].every(k => next.insets[k] === undefined || Number.isFinite(next.insets[k]))) throw new TypeError('insets are null, or { top, right, bottom, left } in px');
  // null: no top bar at all (a full-bleed film, as the role stage's): the stage runs to the top edge. The
  // overlays keep the bar's place, as the pack's do on its films (its --top keeps the bar's height).
  next.bar = next.bar === null ? null : checkBar(next.bar);
  if (typeof next.edge !== 'boolean') throw new TypeError('edge is true or false');
  if (!['scene', 'canvas'].includes(next.backdrop)) throw new TypeError('backdrop is scene or canvas');
  next.tabs = checkTabs(next.tabs);
  // The tab bar's shape (game, talk or none) is not this viewer's: it stays while concealed, so the
  // stage between the bars keeps its size and nothing on the phone moves.
  next.shape = 'tabs' in input ? (next.tabs ? next.tabs.variant : 'none') : (previous.shape ?? 'none');
  if (next.target) {
    if (next.target.cancel !== undefined && typeof next.target.cancel !== 'boolean') throw new TypeError('target.cancel is true or false');
    // `cancel: false` (0.2.12): a choice made and final (the Disabler's fixed position): the bar keeps its words, with no Cancel.
    next.target = { icon: next.target.icon ?? 'actions', title: String(next.target.title ?? ''), sub: optionalText(next.target.sub, 'target.sub'), cancel: next.target.cancel !== false };
  } else next.target = null;
  if (next.chip) {
    if (!isText(next.chip.label)) throw new TypeError('A chip needs a label');
    next.chip = { id: String(next.chip.id ?? ''), label: next.chip.label, icon: next.chip.icon ?? 'chevronRight', tone: next.chip.tone === 'steel' ? 'steel' : 'paper', enabled: next.chip.enabled !== false };
  } else next.chip = null;
  if (next.banner) {
    const kind = next.banner.kind;
    if (!BANNER_KINDS.includes(kind)) throw new TypeError('The banner is { kind: \'reconnecting\', busy } or { kind: \'out\' }, or null');
    next.banner = kind === 'reconnecting' ? { kind, busy: !!next.banner.busy } : { kind };
  } else next.banner = null;
  if (next.toast) {
    if (!isText(next.toast.text)) throw new TypeError('A toast needs its text');
    next.toast = { id: String(next.toast.id ?? next.toast.text), text: next.toast.text, icon: next.toast.icon ?? 'check' };
  } else next.toast = null;
  if (next.sheet) {
    const s = next.sheet;
    if (!isText(String(s.id ?? '')) || typeof s.title !== 'string') throw new TypeError('A sheet is { id, title, … }');
    next.sheet = { id: String(s.id), title: s.title, sub: optionalText(s.sub, 'sheet.sub'), back: !!s.back, close: s.close !== false,
      detent: s.detent === 'large' ? 'large' : 'auto', head: (s.head ?? []).map(checkHead), actions: (s.actions ?? []).map(checkAction) };
    // One callback reports both, so every id is the sheet's own.
    const ids = [...next.sheet.head, ...next.sheet.actions].map(a => a.id);
    if (new Set(ids).size !== ids.length) throw new TypeError('A sheet\'s head and footer actions each need their own id');
  } else next.sheet = null;
  const viewerChanged = 'viewer' in input && previous.viewer !== input.viewer;
  // The reconnecting banner is the phone's; an eliminated player's banner (out) is this viewer's own, so it
  // goes with the viewer's other inputs.
  const viewerBanner = next.banner?.kind === 'out';
  if (next.status === 'concealed') {
    for (const key of VIEWER_KEYS) next[key] = null;
    if (viewerBanner) next.banner = null;
    if (next.bar) next.bar = { ...next.bar, promises: null };
  } else if (viewerChanged) {
    for (const key of VIEWER_KEYS) if (!(key in input)) next[key] = null;
    if (viewerBanner && !('banner' in input)) next.banner = null;
    if (!('bar' in input) && next.bar) next.bar = { ...next.bar, promises: null };
  }
  return next;
}

/** The pack's clock: m:ss of the whole seconds left, rounded up (ui.mjs timer()). */
export const clockText = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/**
 * Mounts the shell in `host`, which it fills (position it, and give it the phone's size). Returns
 * { update, suspend, resume, dispose, layout, slot, stage, sheetBody, element }.
 */
export function mountPhoneShell(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A phone shell needs a host element');
  const doc = host.ownerDocument, win = doc.defaultView;
  const el = (tag, className, attrs = {}) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, v);
    return node;
  };
  const icon = (name, filled = false) => {
    const t = doc.createElement('template');
    t.innerHTML = iconSvg(name, { filled, className: 'ms-ps-ic' }).trim();
    return t.content.firstChild;
  };
  const setIcon = (holder, name, filled = false) => {
    const key = `${name}:${filled ? 'filled' : ''}`;
    if (holder.dataset.icon === key) return;
    holder.replaceChildren(icon(name, filled));
    holder.dataset.icon = key;
  };
  // A tab's picture in its icon's place (0.3.0, the Card tab's): `picture` is a CSS image. Decorative, as an icon is.
  // The holder still names the tab's own icon first, which the large-content view draws.
  const setPicture = (holder, name, picture) => {
    const key = `${name}:picture:${picture}`;
    if (holder.dataset.icon === key) return;
    const node = el('span', 'ms-ps-tab-pt', { 'aria-hidden': 'true' });
    node.style.backgroundImage = picture;
    holder.replaceChildren(node);
    holder.dataset.icon = key;
  };
  // Draft (18 November, the owner's bottom bar): a tab's icon as a painted tile, in the portrait's own box and
  // frame, and the round button's icon painted. Decorative, as an icon is; the holder names the icon first.
  const painted = svg => {
    const t = doc.createElement('template');
    t.innerHTML = svg.trim();
    return t.content.firstChild;
  };
  const setTile = (holder, name) => {
    const key = `${name}:tile`;
    if (holder.dataset.icon === key) return;
    const node = el('span', 'ms-ps-tab-pt', { 'aria-hidden': 'true', 'data-tile': '' });
    node.append(painted(iconTileSvg(name, { className: 'ms-ps-tile' })));
    holder.replaceChildren(node);
    holder.dataset.icon = key;
  };
  const setPainted = (holder, name) => {
    const key = `${name}:painted`;
    if (holder.dataset.icon === key) return;
    holder.replaceChildren(painted(iconPaintedSvg(name, { className: 'ms-ps-ic ms-ps-ic-paint' })));
    holder.dataset.icon = key;
  };
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const attr = (node, name, value) => {
    if (value === null || value === undefined || value === false) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  };

  // The root carries the kit (kit.css applies inside it) as well as the shell's own styles.
  // The root is the kit's phone container (.ms-k-phone): the kit's rows and segmented controls ask its width.
  const root = el('div', 'ms-phone-shell ms-kit ms-k-phone', { tabindex: '-1' });
  const stage = el('div', 'ms-ps-stage');
  // The stage's cover: a layer exactly over the stage, above all it holds and under the bars, the
  // target bar, the chip, the banner, the toast and the sheet (a result window over the room).
  const cover = el('div', 'ms-ps-cover');
  const bar = el('header', 'ms-ps-tb', { 'aria-label': 'Match status' });
  const over = el('div', 'ms-ps-over');
  // An empty guide between the safe areas, which layout() measures (they may come from the browser).
  const guide = el('span', 'ms-ps-guide', { 'aria-hidden': 'true' });
  root.append(stage, cover, bar, over, guide);
  host.append(root);
  const kit = createKit(doc);
  // The text size (0.2.11): a part opened after it changes takes the new size's rules, as one open through the change
  // does (the kit's followTextSize; before, at 200 % a target bar opened afterwards stood side by side).
  const textSize = followTextSize(root);

  let state = nextPhoneShellInput(PHONE_SHELL_DEFAULTS, input);
  let disposed = false, suspended = false, seq = 0, lastLayout = null, toastShown = null, toastTimer = null, press = null;
  const on = Object.fromEntries(['onTab', 'onHero', 'onPromises', 'onMenu', 'onCancelTarget', 'onChip', 'onRetry', 'onSheetAction', 'onSheetBack',
    'onSheetClose', 'onLayout', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));
  const uid = `ms-ps-${(mountPhoneShell.count = (mountPhoneShell.count ?? 0) + 1)}`;
  // Every optional part, kept by identity so a focused control survives every ordinary update.
  const parts = { who: null, whoKey: null, promises: null, divs: null, right: null, round: null, clock: null, timer: null, slot: null, menu: null,
    tabs: null, tabsKey: null, tabNodes: new Map(), target: null, chip: null, banner: null, sheet: null, toast: null, hud: null };

  // ── Taps ────────────────────────────────────────────────────────────
  // Taken while reconnecting: Retry, and what stays on this phone (⋮, a sheet's back and close).
  // This phone's own controls, which work while reconnecting: Retry, ⋮, a sheet's Back, Close, head and local footer
  // actions, and the target bar's Cancel (0.2.7), which only ends the choosing on this phone.
  const LOCAL = new Set(['retry', 'menu', 'sheet-back', 'sheet-close', 'sheet-head', 'sheet-local', 'cancel-target']);
  const accepts = intent => !disposed && state.interactive && state.status !== 'concealed' && (state.status === 'live' || LOCAL.has(intent));
  const onClick = event => {
    const target = event.target.closest?.('button[data-intent]');
    if (!target || !root.contains(target)) return;
    const { intent, value } = target.dataset;
    if (policy.refused(target) || !accepts(intent)) return;
    if (intent === 'tab') on.onTab?.(value);
    else if (intent === 'hero') on.onHero?.(value);
    else if (intent === 'promises') on.onPromises?.();
    else if (intent === 'menu') on.onMenu?.();
    else if (intent === 'cancel-target') on.onCancelTarget?.();
    else if (intent === 'chip') on.onChip?.(value);
    else if (intent === 'retry') on.onRetry?.();
    else if (intent === 'sheet-action' || intent === 'sheet-head' || intent === 'sheet-local') on.onSheetAction?.(value, state.sheet?.id ?? null);
    else if (intent === 'sheet-back') on.onSheetBack?.(state.sheet?.id ?? null);
    else if (intent === 'sheet-close') on.onSheetClose?.(state.sheet?.id ?? null);
  };
  root.addEventListener('click', onClick);

  /**
   * The kit's control policy (kit.mjs createControlPolicy), the same for every Designer component: an
   * unavailable control is dimmed and refused but keeps its focus; one the shell is not taking now is
   * refused, and while reconnecting says why in the banner's words; a busy one is refused; when the
   * focused control ends, the focus moves to the shell and onFocusReturn({ intent, value }) says which.
   */
  const policy = createControlPolicy({ root, accepts: intent => accepts(intent),
    defaultReason: intent => (state.status === 'stale' && !LOCAL.has(intent) ? RECONNECTING.sub : null),
    onFocusReturn: detail => on.onFocusReturn?.(detail) });
  const control = (node, options) => policy.control(node, options);
  const remove = node => policy.remove(node);
  function keep(name, wanted, make, parent = over, before = null) {
    if (!wanted) { remove(parts[name]); parts[name] = null; return null; }
    if (!parts[name]) { parts[name] = make(); parent.insertBefore(parts[name], before); }
    return parts[name];
  }
  const button = (className, intent, value = null, attrs = {}) => {
    const node = el('button', className, { type: 'button', ...attrs });
    node.dataset.intent = intent;
    if (value !== null) node.dataset.value = value;
    return node;
  };
  // The person's portrait from the match's crew bundle; none without a character (never an empty tile).
  const portrait = person => {
    if (!person.character) return null;
    const node = el('span', 'ms-ps-pt', { 'aria-hidden': 'true' });
    node.style.backgroundImage = crewPortraitVariable(person.character, state.versions);
    return node;
  };

  // ── The top bar (ui.mjs topBar) ─────────────────────────────────────
  function paintWho(b) {
    const key = JSON.stringify([b.kind, b.who, b.self, b.pair, b.icon, b.tone, b.title, b.short, b.sub, state.versions]);
    if (parts.whoKey === key && parts.who) return;
    const who = el('div', 'ms-ps-who');
    const lines = el('div', 'ms-ps-lines');
    const name = el('span', 'ms-ps-name'), sub = el('span', 'ms-ps-sub');
    if (b.kind === 'turn') {
      const n = seatNumber(b.who), face = portrait(b.who);
      if (face) who.append(face);
      name.textContent = b.self ? 'Your turn' : b.who.name;
      if (b.self) { const strong = el('b'); strong.textContent = `Player ${n} · ${b.who.name}`; sub.append(strong); }
      else sub.textContent = `Player ${n} · Turn`;
      lines.append(name, sub);
    } else if (b.kind === 'pair') {
      const faces = b.pair.map(portrait).filter(Boolean);
      if (faces.length) { const pair = el('span', 'ms-ps-pair'); pair.append(...faces); who.append(pair); }
      name.textContent = b.pair.map(p => p.name).join(' + ');
      sub.textContent = b.sub ?? 'Private talk';
      lines.append(name, sub);
    } else {
      const glyph = el('span', 'ms-ps-glyph', { 'data-tone': b.tone });
      glyph.append(icon(b.icon, true));
      who.append(glyph);
      // A long phase title has a short form for the narrowest bars; the full title stays for screen readers.
      if (b.short) {
        const long = el('span', 'ms-ps-long'), short = el('span', 'ms-ps-short', { 'aria-hidden': 'true' });
        long.textContent = b.title; short.textContent = b.short;
        name.append(long, short);
      } else name.textContent = b.title;
      lines.append(name);
      if (b.sub) { sub.textContent = b.sub; lines.append(sub); }
    }
    who.append(lines);
    if (parts.who) parts.who.replaceWith(who); else bar.prepend(who);
    parts.who = who; parts.whoKey = key;
  }

  function paintBar() {
    const concealed = state.status === 'concealed';
    const b = state.bar;
    // No bar: the stage runs to the top edge, and the overlays keep the bar's place.
    root.dataset.bar = b ? 'top' : 'none';
    bar.dataset.kind = b ? b.kind : 'none';
    attr(bar, 'data-tone', b?.tone ?? null);
    attr(bar, 'aria-hidden', concealed || !b ? 'true' : null);
    // The right-hand side: the round, the clock with the place beside it for Food's gauge, and ⋮. The
    // clock and its place stay for the shell's whole life, so what Frontend mounts there is never lost.
    const right = keep('right', true, () => el('div', 'ms-ps-right'), bar, null);
    const clock = keep('clock', true, () => {
      const node = el('span', 'ms-ps-clock');
      parts.slot = el('span', 'ms-ps-slot');
      parts.slot.dataset.slot = 'clock';
      node.append(parts.slot);
      return node;
    }, right, null);
    parts.slot.hidden = concealed || !b;
    if (concealed || !b) {
      // The bars' empty material only (or no bar): no name, number, time or control for anyone to read.
      for (const name of ['who', 'promises', 'round', 'timer', 'menu']) { remove(parts[name]); parts[name] = null; }
      for (const d of parts.divs ?? []) d.remove();
      parts.divs = null; parts.whoKey = null;
      return;
    }
    paintWho(b);
    // Promises after the name, between two dividers (the owner, 9 November).
    const pr = keep('promises', !!b.promises, () => {
      const node = button('ms-ps-promises', 'promises');
      const pill = el('span', 'ms-ps-pill');
      const glyph = el('span', 'ms-ps-pill-icon'), label = el('span', 'ms-ps-pill-label');
      label.textContent = 'Promises';
      pill.append(glyph, label);
      node.append(pill, el('b', 'ms-ps-badge', { 'aria-hidden': 'true' }));
      return node;
    }, bar, parts.right);
    if (pr) {
      const p = b.promises;
      setIcon(pr.querySelector('.ms-ps-pill-icon'), 'promise', p.open);
      const badge = pr.querySelector('.ms-ps-badge');
      text(badge, p.count ? String(p.count) : '');
      badge.hidden = !p.count;
      attr(pr, 'aria-label', p.count ? `Promises, ${p.count} new` : 'Promises');
      attr(pr, 'aria-expanded', String(p.open));
      control(pr, { intent: 'promises', off: !p.enabled, reason: p.reason });
      if (!parts.divs) { parts.divs = [el('span', 'ms-ps-div', { 'aria-hidden': 'true' }), el('span', 'ms-ps-div', { 'aria-hidden': 'true' })]; }
      pr.before(parts.divs[0]); pr.after(parts.divs[1]);
    } else if (parts.divs) { for (const d of parts.divs) d.remove(); parts.divs = null; }
    if (right !== bar.lastElementChild) bar.append(right);
    const round = keep('round', b.round !== null, () => el('span', 'ms-ps-round'), right, clock);
    if (round) { text(round, `R${b.round}`); attr(round, 'aria-label', `Round ${b.round}`); }
    const t = b.timer;
    const timer = keep('timer', !!t, () => {
      const node = el('span', 'ms-ps-timer', { role: 'timer' });
      node.append(el('span', 'ms-ps-timer-mark'), el('span', 'ms-ps-timer-text'));
      return node;
    }, clock, parts.slot);
    if (timer) {
      const mark = timer.firstChild;
      if (t.ring === null) { if (mark.dataset.kind !== 'icon') { mark.className = 'ms-ps-timer-mark'; mark.replaceChildren(icon('timer')); mark.dataset.kind = 'icon'; mark.style.removeProperty('--p'); } }
      else {
        if (mark.dataset.kind !== 'ring') { mark.replaceChildren(); mark.className = 'ms-ps-timer-mark ms-ps-ring'; mark.dataset.kind = 'ring'; }
        mark.style.setProperty('--p', String(t.ring));
      }
      text(timer.lastChild, clockText(t.remainingMs));
      attr(timer, 'aria-label', `${Math.ceil(t.remainingMs / 1000)} seconds left`);
      attr(timer, 'data-urgent', t.remainingMs <= t.urgentAtMs ? '' : null);
    }
    const menu = keep('menu', !!b.menu, () => {
      const node = button('ms-ps-menu', 'menu', null, { 'aria-label': 'Settings' });
      node.append(icon('menu'));
      return node;
    }, right, null);
    if (menu) { attr(menu, 'aria-expanded', String(b.menu.open)); control(menu, { intent: 'menu', off: !b.menu.enabled }); }
  }

  // ── The tabs (ui.mjs tabs) and the private talk's two buttons ───────
  const TAB_WORDS = {
    actions: { icon: 'actions', label: 'Actions' }, card: { icon: 'card', label: 'Card' }, panels: { icon: 'panels', label: 'Panels' },
    promises: { icon: 'promise', label: 'Promises' }, 'my-card': { icon: 'card', label: 'My card' },
  };
  function dropTabs() {
    if (!parts.tabs) return;
    observer?.unobserve(parts.tabs);
    remove(parts.tabs);
    parts.tabs = null; parts.tabsKey = null;
    parts.tabNodes.clear();
  }
  function paintTabs() {
    const concealed = state.status === 'concealed';
    const tabs = concealed ? null : state.tabs;
    // Concealed, the bar keeps its shape as empty material; otherwise it is there when the tabs are given.
    const variant = concealed ? (state.shape === 'none' ? null : state.shape) : tabs?.variant ?? null;
    root.dataset.tabs = variant ?? 'none';
    if (!variant) { dropTabs(); return; }
    if (parts.tabsKey !== variant) {
      dropTabs();
      parts.tabs = variant === 'game' ? el('nav', 'ms-ps-tabs', { 'aria-label': 'Game' }) : el('div', 'ms-ps-talk', { role: 'group', 'aria-label': 'Private talk' });
      parts.tabsKey = variant;
      root.append(parts.tabs);
    }
    attr(parts.tabs, 'aria-hidden', tabs ? null : 'true');
    if (!tabs) {
      // No control in it, and nothing for a screen reader to read.
      for (const node of parts.tabNodes.values()) remove(node);
      parts.tabNodes.clear();
      return;
    }
    const nav = parts.tabs;
    const order = variant === 'game' ? GAME_TABS : TALK_BUTTONS;
    for (const key of order) {
      let node = parts.tabNodes.get(key);
      if (!node) {
        if (variant === 'talk') {
          node = kit.button({ label: TAB_WORDS[key].label, kind: 'secondary', icon: TAB_WORDS[key].icon, intent: 'tab', value: key });
        } else if (key === 'hero') {
          node = el('div', 'ms-ps-tab ms-ps-tab-hero');
          const hero = button('ms-ps-hero', 'hero');
          hero.append(el('span', 'ms-ps-hero-icon'), el('b', 'ms-ps-hero-label'));
          node.append(hero, el('span', 'ms-ps-hero-space', { 'aria-hidden': 'true' }));
        } else {
          node = button('ms-ps-tab', 'tab', key);
          node.append(el('span', 'ms-ps-tab-icon'), el('span', 'ms-ps-tab-label'), el('b', 'ms-ps-badge', { 'aria-hidden': 'true' }));
        }
        parts.tabNodes.set(key, node);
      }
      if (node.parentNode !== nav || nav.children[order.indexOf(key)] !== node) nav.insertBefore(node, nav.children[order.indexOf(key)] ?? null);
      if (variant === 'talk') {
        const w = TAB_WORDS[key];
        // As the pack draws a tab: the open one's icon is filled.
        kit.setButton(node, { label: w.label, kind: 'secondary', icon: w.icon, filled: tabs.open === key, expanded: tabs.open === key, intent: 'tab', value: key });
        control(node, { intent: 'tab', off: !tabs.enabled[key], reason: tabs.reasons[key] });
        continue;
      }
      if (key === 'hero') {
        const h = tabs.hero, words = HERO_WORDS[h.mode], hero = node.firstChild;
        hero.dataset.mode = h.mode;
        hero.dataset.value = h.mode;
        setPainted(hero.firstChild, words.icon);
        text(hero.lastChild, words.label);
        text(node.lastChild, words.label);
        attr(hero, 'aria-label', words.aria);
        control(hero, { intent: 'hero', off: !h.enabled, busy: h.busy, reason: h.reason });
        continue;
      }
      const w = key === 'switch' ? (tabs.view === 'room' ? { icon: 'board', label: 'Board', aria: 'Show the whole board' } : { icon: 'room', label: 'Room', aria: 'Show my room' }) : TAB_WORDS[key];
      const open = key !== 'switch' && tabs.open === key;
      // The Card tab (0.3.0): this viewer's own crew portrait, the plain one the top bar draws. With no character,
      // or no portrait in the match's crew bundle, the pack's card icon: never an empty tile.
      const picture = key === 'card' && tabs.me?.character ? crewPortraitVariable(tabs.me.character, state.versions) : 'none';
      if (picture !== 'none') setPicture(node.firstChild, w.icon, picture);
      else setTile(node.firstChild, w.icon);
      attr(node, 'data-picture', picture !== 'none' ? '' : null);
      text(node.children[1], w.label);
      const badge = tabs.badges[key];
      text(node.lastChild, badge ? String(badge) : '');
      node.lastChild.hidden = !badge;
      attr(node, 'aria-label', w.aria ?? (badge ? `${w.label}, ${badge} new` : null));
      attr(node, 'aria-expanded', key === 'switch' ? null : String(open));
      control(node, { intent: 'tab', off: !tabs.enabled[key], reason: tabs.reasons[key] });
    }
  }

  // ── Over the stage: the target bar, the chip, the banner ─────────────
  function paintOver() {
    const concealed = state.status === 'concealed';
    // The target bar replaces the sheet while picking on the scene; Cancel is in it (the owner, T2).
    const target = keep('target', !concealed && !!state.target, () => {
      const node = el('div', 'ms-ps-target', { role: 'status' });
      const glyph = el('span', 'ms-ps-target-icon'), words = el('div', 'ms-ps-text');
      words.append(el('b'), el('span'));
      node.append(glyph, words);
      return node;
    });
    if (target) {
      setIcon(target.firstChild, state.target.icon, true);
      text(target.children[1].firstChild, state.target.title);
      text(target.children[1].lastChild, state.target.sub ?? '');
      target.children[1].lastChild.hidden = !state.target.sub;
      // Cancel only while the choice can still be left (0.2.12). A final one (`cancel: false`) keeps its words and
      // drops Cancel, so nothing on the bar reads as undo; if Cancel had the focus, the policy hands it back.
      let cancel = target.children[2] ?? null;
      if (state.target.cancel && !cancel) target.append(cancel = kit.button({ label: 'Cancel', kind: 'secondary', small: true, intent: 'cancel-target' }));
      else if (!state.target.cancel && cancel) { remove(cancel); cancel = null; }
      if (cancel) control(cancel, { intent: 'cancel-target' });
      target.toggleAttribute('data-final', !state.target.cancel);
    }
    // A banner is drawn for its kind (BANNERS: its icon, its words, and Retry for reconnecting only), so one of
    // another kind is drawn afresh; the policy returns the focus if Retry had it.
    if (parts.banner && parts.banner.dataset.kind !== state.banner?.kind) { remove(parts.banner); parts.banner = null; }
    const banner = keep('banner', !concealed && !!state.banner, () => {
      const look = BANNERS[state.banner.kind];
      const node = el('div', 'ms-ps-banner', { role: 'status', 'data-kind': state.banner.kind });
      const glyph = el('span', 'ms-ps-banner-icon');
      glyph.append(icon(look.icon, true));
      const words = el('div', 'ms-ps-text');
      const b = el('b'), s = el('span');
      b.textContent = look.title; s.textContent = look.sub;
      words.append(b, s);
      node.append(glyph, words);
      if (look.action) node.append(kit.button({ label: look.action, kind: 'secondary', small: true, intent: 'retry' }));
      return node;
    });
    if (banner && state.banner.kind === 'reconnecting') control(banner.lastChild, { intent: 'retry', busy: state.banner.busy });
    // While a banner shows, a docked sheet stays below it (phone-shell.css [data-banner]), so the banner (and
    // Retry) and the sheet's Close are all in sight: the banner is in the over layer, under the sheet, as the pack's.
    attr(root, 'data-banner', banner ? '' : null);
    if (banner !== observedBanner) {
      if (observedBanner) observer?.unobserve(observedBanner);
      observedBanner = banner;
      if (banner) observer?.observe(banner);
    }
    if (!observer) placeBanner();
    const chip = keep('chip', !concealed && !!state.chip, () => {
      const node = el('div', 'ms-ps-chip');
      node.append(kit.button({ label: '', kind: 'secondary', small: true, intent: 'chip', extra: ['ms-ps-chip-btn'] }));
      return node;
    });
    if (chip) {
      const b = chip.firstChild, c = state.chip;
      kit.setButton(b, { label: c.label, kind: 'secondary', small: true, icon: c.icon, filled: true, intent: 'chip', value: c.id, extra: ['ms-ps-chip-btn'] });
      b.dataset.tone = c.tone;
      control(b, { intent: 'chip', off: !c.enabled });
    }
  }

  // ── The docked sheet's frame (ui.mjs sheet) ─────────────────────────
  function paintSheet() {
    const s = state.status === 'concealed' ? null : state.sheet;
    if (parts.sheet && (!s || parts.sheet.dataset.sheet !== s.id)) { remove(parts.sheet); parts.sheet = null; }
    root.toggleAttribute('data-sheet', !!s);
    if (!s) return;
    if (!parts.sheet) {
      // A glass surface: the kit's controls inside take their glass forms (kit.css), as the pack's sheets do.
      const node = el('section', 'ms-ps-sheet', { role: 'dialog', 'data-ms-surface': 'glass' });
      node.dataset.sheet = s.id;
      const head = el('div', 'ms-ps-sheet-head');
      const title = el('div', 'ms-ps-sheet-title');
      const h2 = el('h2', null, { id: `${uid}-t${(seq += 1)}` });
      title.append(h2, el('p'));
      head.append(title);
      node.setAttribute('aria-labelledby', h2.id);
      node.append(el('div', 'ms-ps-sheet-grab', { 'aria-hidden': 'true' }), head, el('div', 'ms-ps-sheet-body'));
      parts.sheet = node;
      const before = parts.tabs && parts.tabs.parentNode === root ? parts.tabs : null;
      root.insertBefore(node, before);
    }
    const node = parts.sheet, head = node.querySelector('.ms-ps-sheet-head'), title = head.querySelector('.ms-ps-sheet-title');
    node.dataset.detent = s.detent;
    text(title.firstChild, s.title);
    text(title.lastChild, s.sub ?? '');
    title.lastChild.hidden = !s.sub;
    let back = head.querySelector('[data-intent="sheet-back"]'), close = head.querySelector('[data-intent="sheet-close"]');
    if (s.back && !back) { back = kit.iconButton({ label: 'Back', icon: 'chevronLeft', intent: 'sheet-back' }); head.prepend(back); }
    else if (!s.back && back) { remove(back); back = null; }
    if (s.close && !close) { close = kit.iconButton({ label: 'Close', icon: 'close', intent: 'sheet-close' }); head.append(close); }
    else if (!s.close && close) { remove(close); close = null; }
    if (back) control(back, { intent: 'sheet-back' });
    if (close) control(close, { intent: 'sheet-close' });
    // The head's own actions, kept by id, in order after the title and so before Close. A button is moved only
    // when it is out of place: moving a focused one would lose the focus.
    const heads = [...head.querySelectorAll(':scope > [data-intent="sheet-head"]')];
    const headIds = s.head.map(a => a.id);
    for (const b of heads) if (!headIds.includes(b.dataset.value)) remove(b);
    let anchor = title;
    for (const a of s.head) {
      const b = heads.find(c => c.dataset.value === a.id && c.isConnected) ?? kit.iconButton({ label: a.label, icon: a.icon, intent: 'sheet-head', value: a.id });
      if (anchor.nextSibling !== b) head.insertBefore(b, anchor.nextSibling);
      kit.setIconButton(b, { label: a.label, icon: a.icon, intent: 'sheet-head', value: a.id });
      control(b, { intent: 'sheet-head', off: !a.enabled, reason: a.reason });
      anchor = b;
    }
    // The footer's buttons, kept by id.
    let foot = node.querySelector(':scope > .ms-ps-sheet-foot');
    if (s.actions.length && !foot) { foot = el('div', 'ms-ps-sheet-foot'); node.append(foot); }
    if (!s.actions.length && foot) { remove(foot); foot = null; }
    if (!foot) return;
    const ids = s.actions.map(a => a.id);
    for (const b of [...foot.children]) if (!ids.includes(b.dataset.value)) remove(b);
    s.actions.forEach((a, i) => {
      // A local action is this phone's own and works while reconnecting; any other stands for a command.
      const intent = a.local ? 'sheet-local' : 'sheet-action';
      let b = [...foot.children].find(c => c.dataset.value === a.id);
      if (!b) b = kit.button({ label: a.label, kind: a.kind, intent, value: a.id });
      if (foot.children[i] !== b) foot.insertBefore(b, foot.children[i] ?? null);
      kit.setButton(b, { label: a.label, kind: a.kind, icon: a.icon, intent, value: a.id });
      control(b, { intent, off: !a.enabled, busy: a.busy, reason: a.reason });
    });
  }

  // ── A toast: a local confirmation, shown once per id ────────────────
  function paintToast() {
    const t = state.status === 'concealed' ? null : state.toast;
    if (!t) { if (toastTimer) win.clearTimeout(toastTimer); toastTimer = null; if (parts.toast) { parts.toast.remove(); parts.toast = null; } return; }
    if (toastShown === t.id) return;
    toastShown = t.id;
    if (parts.toast) parts.toast.remove();
    // The kit's toast (0.8.0) draws it, drops it in and fades it out; its time and its place are the shell's.
    const props = { text: t.text, icon: t.icon, extra: ['ms-ps-toast'] };
    const node = kit.toast(props);
    root.append(node);
    parts.toast = node;
    if (toastTimer) win.clearTimeout(toastTimer);
    toastTimer = win.setTimeout(() => { toastTimer = null; if (parts.toast === node) { kit.setToast(node, { ...props, leaving: true }); win.setTimeout(() => { if (parts.toast === node) { node.remove(); parts.toast = null; } }, 200); } }, TOAST_MS);
  }

  // ── The large-content view: a tab's word, large, on a long press ────
  // As iOS shows a capped tab label at large text sizes (the handoff's Tabs). Only while the labels are
  // capped at 14 px: then the word is shown large over the stage while the finger stays down.
  const labelsCapped = () => parseFloat(win.getComputedStyle(doc.documentElement).fontSize) * 0.75 > 14;
  function showHud(node) {
    const words = node.querySelector('.ms-ps-tab-label, .ms-ps-hero-label, .ms-k-btn-label')?.textContent ?? '';
    const mark = node.querySelector('.ms-ps-tab-icon, .ms-ps-hero-icon, .ms-k-btn-icon')?.dataset.icon?.split(':')[0];
    const hud = keep('hud', true, () => {
      const h = el('div', 'ms-ps-hud', { 'aria-hidden': 'true' });
      h.append(el('span', 'ms-ps-hud-icon'), el('b'));
      return h;
    }, root, null);
    if (mark) setIcon(hud.firstChild, mark, true);
    text(hud.lastChild, words);
  }
  const hideHud = () => { if (press?.timer) win.clearTimeout(press.timer); press = null; if (parts.hud) { parts.hud.remove(); parts.hud = null; } };
  const onPointerDown = event => {
    const node = event.target.closest?.('.ms-ps-tabs button[data-intent], .ms-ps-talk button[data-intent]');
    if (!node || disposed) return;
    hideHud();
    press = { node, timer: win.setTimeout(() => { if (press?.node === node && labelsCapped()) showHud(node); }, 450) };
  };
  root.addEventListener('pointerdown', onPointerDown);
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) root.addEventListener(type, hideHud);

  // ── Layout ──────────────────────────────────────────────────────────
  function applyInsets() {
    const i = state.insets;
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (i && Number.isFinite(i[side])) root.style.setProperty(`--ms-ps-safe-${side[0]}`, `${i[side]}px`);
      else root.style.removeProperty(`--ms-ps-safe-${side[0]}`);
    }
  }
  /**
   * Where things are, in the shell's CSS pixels: its size; the bars' heights, as how far the stage starts
   * from the shell's top and ends from its foot (the top safe area and bar; the tabs and the bottom safe
   * area; 0 at an edge the stage runs to); the stage; the safe areas, which a component on an edge-to-edge
   * stage keeps its own controls clear of; and how much of the stage's foot the private talk's buttons
   * cover. After dispose(), null.
   */
  function layout() {
    if (disposed) return null;
    const box = root.getBoundingClientRect(), s = stage.getBoundingClientRect(), g = guide.getBoundingClientRect();
    const covered = parts.tabsKey === 'talk' && parts.tabs ? Math.max(0, s.bottom - parts.tabs.getBoundingClientRect().top) : 0;
    const round = v => Math.round(v * 100) / 100;
    return {
      size: { width: round(box.width), height: round(box.height) },
      bars: { top: round(s.top - box.top), bottom: round(box.bottom - s.bottom) },
      stage: { width: round(s.width), height: round(s.height) },
      safe: { top: round(g.top - box.top), bottom: round(box.bottom - g.bottom) },
      covered: { bottom: round(covered) },
    };
  }
  const reportLayout = () => {
    if (disposed || !root.isConnected) return;
    const next = layout(), key = JSON.stringify(next);
    if (key === lastLayout) return;
    lastLayout = key;
    on.onLayout?.(next);
  };
  /** The banner's height, for the sheet to stay below it: measured when the banner's size changes, not on each update. */
  function placeBanner() {
    const b = parts.banner;
    if (b && b.isConnected) root.style.setProperty('--ms-ps-banner-h', `${Math.ceil(b.getBoundingClientRect().height)}px`);
    else root.style.removeProperty('--ms-ps-banner-h');
  }
  /**
   * The private talk's two buttons: their height, so what docks above them (a sheet, the chip) stays 10 px clear at
   * any text size (0.2.6). Measured when their size changes, not on each update; to the hundredth of a pixel.
   */
  function placeTalk() {
    const t = parts.tabsKey === 'talk' ? parts.tabs : null;
    if (t && t.isConnected) root.style.setProperty('--ms-ps-talk-h', `${Math.round(t.getBoundingClientRect().height * 100) / 100}px`);
    else root.style.removeProperty('--ms-ps-talk-h');
  }
  let observedBanner = null;
  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => { placeBanner(); placeTalk(); reportLayout(); }) : null;
  observer?.observe(root);
  observer?.observe(bar);
  observer?.observe(stage);
  observer?.observe(guide);

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    if (disposed) return;
    root.dataset.status = state.status;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    attr(root, 'data-edge', state.edge ? '' : null);
    root.dataset.backdrop = state.backdrop;
    applyInsets();
    paintBar();
    paintTabs();
    if (parts.tabs) observer?.observe(parts.tabs);
    if (!observer) placeTalk();
    paintOver();
    paintSheet();
    paintToast();
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    // The ResizeObserver reports every change of the bars or the stage, without measuring on each update
    // (the model updates about four times a second); without one, each update measures.
    if (!observer) reportLayout();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextPhoneShellInput(state, next);
    render();
  }
  /**
   * Stops what runs by itself: a toast (its confirmation is over, and it does not come back on resume)
   * and a long press. The shell draws nothing else that moves without an update.
   */
  function suspend() {
    if (disposed) return;
    suspended = true;
    hideHud();
    if (toastTimer) { win.clearTimeout(toastTimer); toastTimer = null; }
    if (parts.toast) { parts.toast.remove(); parts.toast = null; }
    render();
  }
  function resume() { if (disposed) return; suspended = false; render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    hideHud();
    if (toastTimer) win.clearTimeout(toastTimer);
    observer?.disconnect();
    textSize.dispose();
    policy.dispose();
    root.removeEventListener('click', onClick);
    root.removeEventListener('pointerdown', onPointerDown);
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) root.removeEventListener(type, hideHud);
    root.remove();
  }
  /**
   * A place the shell keeps for another component, the same element for the shell's whole life:
   * 'clock', beside the clock (Food's gauge); 'cover', the stage's cover (a result window over the room).
   */
  function slot(name) {
    if (disposed) return null;
    if (name === 'clock') return parts.slot;
    if (name === 'cover') return cover;
    throw new TypeError(`No slot ${JSON.stringify(name)}: the shell has 'clock' and 'cover'`);
  }

  render();
  return Object.freeze({
    update, suspend, resume, dispose, layout, slot, stage, element: root,
    /** The open sheet's scrolling body, where its content mounts; null with no sheet. */
    get sheetBody() { return disposed ? null : parts.sheet?.querySelector('.ms-ps-sheet-body') ?? null; },
  });
}
