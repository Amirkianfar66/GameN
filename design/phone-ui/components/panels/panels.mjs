// Panels: the Panels tab's sheets, as the phone pack draws them (sheet 32: Panels, Players and Round order; the pack's
// panels, players and rules screens; #222 items 29, 30 and 31). Runtime source, Designer's (the owner, 14, 15 and 16
// November 2026: Designer builds each visual component once, in design/; the game and the preview use it as it is).
//
// The split (the Lead's review of #296, answer 1, as Host controls):
//   mountPanels   the body of the phone shell's sheet, for its three views: the Panels list (each destination a cell
//                 with what it shows or who can use it), Players (a row per seat, public facts only) and Round order
//                 (a row per phase, in the ruleset's order)
//   panelsSheet   the shell's sheet for the view: "Panels" with ✕ at the shell's own height; "Players" and "Round
//                 order" with Back and ✕, large
// The view is Frontend's, from the taps and Back. The sheet's frame is the shell's.
//
// What it never does: decide a fact. Whether this player can open a destination now is only Frontend's `enabled`
// (answer 2: the lines "Captain and Officer only" and "Patients only" are the owner-approved words of item 29, and
// the component never decides from them). Where each player is, their health and offices are Frontend's, from the
// projection; the round's phases, their names and their timings are Frontend's, from the ruleset, in its order; the
// component holds no step words and never the order (answer 5). Each row reports a tap, and only that.
//
// The Panels list is one grid of the kit's tiles, as Actions' (the owner, 19 November 2026: "Actions follow the 3
// column matrix order but the panel is like a row and wrong i want all follow a shared system"; on draft 4, "As you
// recommended"; the Lead's option A, in code): each destination a cell, its icon over its name, its line as the note,
// up to five in one grid with nothing between them. Players and Round order themselves stay lines.
//
// A cell's note fits two lines at 390 × 844 at the Standard text; where it wouldn't, it is shorter, not taller (the
// Lead, 19 November). So the Windows note names its one window by its rooms, and counts two or more ("2 windows"), their
// names being in the Windows panel (windowsLine). At larger text a note may wrap further; no word is ever cut.
//
// The Round order row's line says what the view will show (the Lead's review of the game's Panels, 18 November):
// "Phases and timings" once a step has its timing, "The phases, in order" while none has. It follows the steps given,
// never a fixed string (roundOrderLine).
//
// Players are public facts only (the pack's note: seats, rooms, health and offices). A player takes exactly the eight
// keys below; any other (a role, a revealed faction) is refused, so nothing private reaches this sheet (answer 4).

import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const PANELS_VERSION = 'panels-0.1.1';
const VIEWS = Object.freeze(['list', 'players', 'round-order']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
/** The sheet's id, the same for the three views, so the shell keeps its body (and this content) through them. */
export const PANELS_SHEET_ID = 'panels';
/** The destinations a row opens: the first three are other components' sheets; the last two, this sheet's views. */
export const PANEL_DESTINATIONS = Object.freeze(['windows', 'navigation', 'hospital', 'players', 'round-order']);
/** The contract's health words (PlanetHealthSchema). */
const HEALTH = Object.freeze(['Healthy', 'Injured', 'Eliminated']);
/** A player's keys: the public facts of the pack's note, and nothing else. */
const PLAYER_KEYS = Object.freeze(['seat', 'name', 'character', 'location', 'health', 'jailed', 'captain', 'officer']);

/**
 * The pack's words (screens-game.mjs panels; screens-more.mjs players and rules; sheet 32), and one of the Lead's (18
 * November): the Round order row's line while no step has its timing. No step words: answer 5.
 */
export const PANELS_WORDS = Object.freeze({
  panels: 'Panels', players: 'Players', roundOrder: 'Round order',
  windows: 'Windows', noWindow: 'No window here',
  navigation: 'Navigation', navigationLine: 'Captain and Officer only',
  hospital: 'Hospital panel', hospitalLine: 'Patients only',
  playersLine: 'Seats, rooms and public status', roundOrderLine: 'Phases and timings', roundOrderPhases: 'The phases, in order',
  seat: (seat, name, you) => `${seat} · ${you ? `${name} (you)` : name}`,
  pair: (a, b) => `${a} ↔ ${b}`, join: ' · ', windowCount: n => `${n} windows`,
  inJail: 'In Jail', injured: 'Injured', eliminated: 'Eliminated',
  captain: 'Captain', officer: 'Officer',
  playersNote: 'Public facts only: seats, rooms, health and offices.',
});

/**
 * Each step's icon by its kind (Designer's: the pack's six, and the ruleset's other phases); an unknown kind gets the
 * Round order icon, so a new phase still draws (answer 5).
 */
export const ROUND_STEP_ICONS = Object.freeze({
  'food-supply': 'supply', 'officer-appointment': 'officer', 'pre-turn': 'hourglass', turns: 'actions', 'private-talk': 'talk',
  hack: 'code', sync: 'blackhole', blackout: 'dark', hospital: 'hospital', 'jail-vote': 'vote', 'captain-election': 'captain',
  result: 'vote', resolution: 'rescue', navigation: 'course',
});
const STEP_FALLBACK_ICON = 'rules';

/** Every input, with its default: the list, no destination until Frontend gives it, no players, no steps. */
export const PANELS_DEFAULTS = Object.freeze({
  view: 'list', status: 'live', interactive: true, reducedMotion: false, viewer: null, versions: null,
  windows: null, navigation: null, hospital: null, players: Object.freeze([]), steps: Object.freeze([]),
});

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = value => Number.isSafeInteger(value) && value >= 1;
const optionalText = (value, what) => {
  if (value === null || value === undefined) return null;
  if (!isText(value)) throw new TypeError(`${what} is words, or null`);
  return value;
};

function checkDestination(name, value, extra = null) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || (value.reason !== null && value.reason !== undefined && typeof value.reason !== 'string')) {
    throw new TypeError(`${name} is null, or { enabled, reason${extra ? `, ${extra}` : ''} }`);
  }
  return { enabled: value.enabled !== false, reason: isText(value.reason) ? value.reason : null };
}
function checkWindows(value) {
  const base = checkDestination('windows', value, 'rooms');
  if (!base) return null;
  const rooms = value.rooms ?? [];
  if (!Array.isArray(rooms) || !rooms.every(p => Array.isArray(p) && p.length === 2 && p.every(isText))) {
    throw new TypeError('windows.rooms are the windows of this player\'s room, as pairs of room names: [[\'Room A\', \'Room B\'], …]');
  }
  return Object.freeze({ ...base, rooms: Object.freeze(rooms.map(p => Object.freeze([...p]))) });
}
function checkPlayers(players) {
  if (!Array.isArray(players)) throw new TypeError('players are [{ seat, name, character, location, health, jailed, captain, officer }]');
  const seen = new Set();
  return Object.freeze(players.map(p => {
    if (!p || typeof p !== 'object') throw new TypeError('Each player is { seat, name, character, location, health, jailed, captain, officer }');
    // Public facts only: a role, a faction or anything else private is refused, never drawn or kept.
    const other = Object.keys(p).filter(k => !PLAYER_KEYS.includes(k));
    if (other.length) throw new TypeError(`Players take only the public facts (${PLAYER_KEYS.join(', ')}), not ${other.join(', ')}`);
    if (!isSeat(p.seat)) throw new TypeError('Each player needs their seat number');
    if (!isText(p.name)) throw new TypeError(`Seat ${p.seat} needs its name: the component never looks one up`);
    if (seen.has(p.seat)) throw new TypeError(`Seat ${p.seat} is given twice`);
    seen.add(p.seat);
    const health = p.health ?? 'Healthy';
    if (!HEALTH.includes(health)) throw new TypeError(`Seat ${p.seat}'s health is ${HEALTH.join(', ')}, not ${JSON.stringify(p.health)}`);
    for (const flag of ['jailed', 'captain', 'officer']) {
      if (p[flag] !== undefined && typeof p[flag] !== 'boolean') throw new TypeError(`Seat ${p.seat}'s ${flag} is true or false`);
    }
    return Object.freeze({ seat: p.seat, name: p.name, character: isText(p.character) ? p.character : null, location: optionalText(p.location, `Seat ${p.seat}'s location`),
      health, jailed: p.jailed === true, captain: p.captain === true, officer: p.officer === true });
  }));
}
function checkSteps(steps) {
  if (!Array.isArray(steps)) throw new TypeError('steps are [{ kind, title, timing }], in the ruleset\'s order');
  return Object.freeze(steps.map((s, i) => {
    if (!s || typeof s !== 'object' || !isText(s.kind) || !isText(s.title)) throw new TypeError(`Step ${i + 1} needs its kind and its name, in Frontend's words`);
    return Object.freeze({ kind: s.kind, title: s.title, timing: optionalText(s.timing, `Step ${i + 1}'s timing`) });
  }));
}

/** The next input from the previous one and an update. Each key an update gives replaces that key's value; the rest stay. */
export function nextPanelsInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is this phone\'s seat number, or null');
  next.viewer = next.viewer ?? null;
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  next.windows = checkWindows(next.windows);
  next.navigation = checkDestination('navigation', next.navigation);
  next.hospital = checkDestination('hospital', next.hospital);
  next.players = checkPlayers(next.players ?? []);
  next.steps = checkSteps(next.steps ?? []);
  return next;
}

/**
 * The phone shell's sheet for the view (the shell's `sheet` input): "Panels" with ✕ at the shell's own height;
 * "Players" and "Round order" with Back and ✕, large (the Lead's answer 1). No footer.
 */
export function panelsSheet(input) {
  const s = nextPanelsInput(PANELS_DEFAULTS, input);
  const W = PANELS_WORDS;
  if (s.view === 'players') return { id: PANELS_SHEET_ID, title: W.players, back: true, close: true, detent: 'large', actions: [] };
  if (s.view === 'round-order') return { id: PANELS_SHEET_ID, title: W.roundOrder, back: true, close: true, detent: 'large', actions: [] };
  return { id: PANELS_SHEET_ID, title: W.panels, back: false, close: true, detent: 'auto', actions: [] };
}

/** The Round order row's line: "Phases and timings" once a step has its timing, else "The phases, in order" (the Lead, 18 November). */
export function roundOrderLine(steps) {
  return (steps ?? []).some(step => isText(step?.timing)) ? PANELS_WORDS.roundOrderLine : PANELS_WORDS.roundOrderPhases;
}

/**
 * The Windows cell's note (answer 3; the Lead, 19 November): the one window by its two rooms; two or more, their count,
 * their names being in the Windows panel; none, "No window here".
 */
export function windowsLine(rooms) {
  const W = PANELS_WORDS;
  if (!rooms?.length) return W.noWindow;
  return rooms.length === 1 ? W.pair(...rooms[0]) : W.windowCount(rooms.length);
}

/** A player's line (the Lead's answer 4): "In Jail" in the room's place when jailed; then "Injured" or "Eliminated". */
export function playerLine(p) {
  const W = PANELS_WORDS;
  const where = p.jailed ? W.inJail : p.location;
  const health = p.health === 'Injured' ? W.injured : p.health === 'Eliminated' ? W.eliminated : null;
  return [where, health].filter(Boolean).join(W.join);
}

/**
 * Mounts the body in the shell's open sheet (`shell.sheetBody`), on its glass. Returns { update, dispose, element }.
 */
export function mountPanels(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('Panels need a host element: the shell\'s sheetBody');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const W = PANELS_WORDS;
  let state = nextPanelsInput(PANELS_DEFAULTS, input);
  let disposed = false, shown = null;
  const on = Object.fromEntries(['onOpen', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  const root = kit.h('div', 'ms-panels ms-kit', { tabindex: '-1', role: 'group' });
  host.append(root);
  // The rows only open a sheet on this phone, so they take taps while reconnecting, as Settings does (answer 6);
  // a destination that isn't enabled stays refused, and `interactive: false` refuses everything.
  const accepts = () => !disposed && state.interactive && state.status !== 'concealed';
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: () => null,
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });

  const onClick = event => {
    const target = event.target.closest?.('[data-intent="open"]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    on.onOpen?.(target.dataset.value);
  };
  root.addEventListener('click', onClick);

  // ── The views' parts, made as a view is shown ───────────────────────
  let parts = {};
  // Each destination's cell: its icon, its name and its line. The Windows line and the Round order line follow what
  // Frontend gives (paintList); the other lines are the owner-approved words of item 29.
  const CELLS = {
    windows: { icon: 'window', name: W.windows },
    navigation: { icon: 'course', name: W.navigation, note: W.navigationLine },
    hospital: { icon: 'panel', name: W.hospital, note: W.hospitalLine },
    players: { icon: 'players', name: W.players, note: W.playersLine },
    'round-order': { icon: 'rules', name: W.roundOrder },
  };
  /** Players and Round order are this sheet's own views: always offered, refused only as everything is. */
  const OWN_VIEWS = new Set(['players', 'round-order']);
  function buildList() {
    const grid = kit.tiles();
    grid.classList.add('ms-pn-tiles');
    const cells = new Map(PANEL_DESTINATIONS.map(value => [value, kit.tile({ ...CELLS[value], intent: 'open', value })]));
    root.append(grid);
    parts = { grid, cells };
  }
  function paintList() {
    const p = parts, s = state;
    let i = 0;
    for (const value of PANEL_DESTINATIONS) {
      const cell = p.cells.get(value), own = OWN_VIEWS.has(value), given = own ? null : s[value];
      if (!own && !given) { if (cell.isConnected) policy.remove(cell); continue; }
      // The Windows note: the windows of this player's room, as Frontend gives them, named or counted (windowsLine).
      const note = value === 'windows' ? windowsLine(given.rooms) : value === 'round-order' ? roundOrderLine(s.steps) : CELLS[value].note;
      // Only Frontend's `enabled` dims and refuses it; its line stays, and Frontend's reason is its description (answer 2).
      const enabled = own || given.enabled;
      kit.setTile(cell, { ...CELLS[value], note, state: enabled ? 'available' : 'unavailable', intent: 'open', value });
      policy.control(cell, own ? {} : { off: !enabled, reason: enabled ? null : given.reason });
      if (p.grid.children[i] !== cell) p.grid.insertBefore(cell, p.grid.children[i] ?? null);
      i += 1;
    }
  }
  function buildPlayers() {
    const list = kit.h('ul', 'ms-k-list ms-pn-players');
    const note = kit.groupNote(W.playersNote);
    root.append(list, note);
    parts = { list, items: new Map() };
  }
  function paintPlayers() {
    const p = parts, s = state;
    // Each seat its own row by its seat number: the same element through updates.
    const wanted = new Set(s.players.map(x => x.seat));
    for (const [seat, item] of p.items) if (!wanted.has(seat)) { policy.remove(item); p.items.delete(seat); }
    s.players.forEach((x, i) => {
      let item = p.items.get(x.seat);
      if (!item) {
        item = kit.h('li', 'ms-k-list-item');
        item.portrait = kit.portrait({ character: x.character }, s.versions);
        // The badges' place is always there, as the pack's: an empty one when the player holds no office.
        item.badges = kit.h('span', 'ms-pn-badges');
        item.captain = kit.pill({ text: W.captain, icon: 'captain', tone: 'paper' });
        item.officer = kit.pill({ text: W.officer, icon: 'officer', tone: 'paper' });
        item.append(kit.row({ tag: 'div', title: '' }));
        item.firstChild.dataset.seat = String(x.seat);
        p.items.set(x.seat, item);
      }
      kit.setPortrait(item.portrait, { character: x.character }, s.versions);
      const line = playerLine(x);
      item.badges.replaceChildren(...[x.captain ? item.captain : null, x.officer ? item.officer : null].filter(Boolean));
      kit.setRow(item.firstChild, { tag: 'div', lead: item.portrait, title: W.seat(x.seat, x.name, x.seat === s.viewer), sub: line || null, trail: item.badges });
      if (p.list.children[i] !== item) p.list.insertBefore(item, p.list.children[i] ?? null);
    });
    p.list.hidden = s.players.length === 0;
  }
  function buildRoundOrder() {
    const list = kit.h('ul', 'ms-k-list ms-pn-steps');
    root.append(list);
    parts = { list };
  }
  function paintRoundOrder() {
    const p = parts, s = state;
    // The ruleset's steps in Frontend's order and words; the icon is the component's, by kind (answer 5). No note.
    const items = s.steps.map((x, i) => {
      let item = p.list.children[i];
      const props = { tag: 'div', icon: ROUND_STEP_ICONS[x.kind] ?? STEP_FALLBACK_ICON, tint: 'steel', title: x.title, sub: x.timing };
      if (!item) { item = kit.h('li', 'ms-k-list-item'); item.append(kit.row(props)); }
      else kit.setRow(item.firstChild, props);
      item.firstChild.dataset.kind = x.kind;
      return item;
    });
    p.list.replaceChildren(...items);
    p.list.hidden = items.length === 0;
  }
  function build(view) {
    // The view's parts leave with it; a focus in them returns to the content, reported once.
    for (const node of [...root.children]) if (!node.classList.contains('ms-k-vh')) policy.remove(node);
    if (view === 'list') buildList();
    else if (view === 'players') buildPlayers();
    else buildRoundOrder();
    shown = view;
  }

  function render() {
    if (disposed) return;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    root.dataset.view = state.view;
    root.setAttribute('aria-label', state.view === 'players' ? W.players : state.view === 'round-order' ? W.roundOrder : W.panels);
    if (shown !== state.view) build(state.view);
    if (state.view === 'list') paintList();
    else if (state.view === 'players') paintPlayers();
    else paintRoundOrder();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextPanelsInput(state, next);
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, dispose, element: root });
}
