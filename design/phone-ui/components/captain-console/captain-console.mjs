// Captain console: the Captain's two once-a-match commands in the Command Room, as the phone pack draws them (sheets
// 22 and 24; the pack's captain screen in its console, used, release and eject states; #222 item 17's console note).
// Runtime source, Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual component once, in
// design/; the game and the preview use it as it is). It opens from the Command Room's own chip on the Captain's turn.
//
// The split (the Lead's review of #302):
//   mountCaptainConsole   the body of the phone shell's sheet, for its three views: the console (the two plates,
//                         Release and Eject, and the note), and each command's confirm (the who block and the facts)
//   captainConsoleSheet   the shell's sheet for the view: its title and line, the ✕ on the console only, and the
//                         confirm's footer: Cancel this phone's own (`local`), Release or Eject the command, with
//                         Frontend's state
// The view is Frontend's, from the plate tapped and Cancel.
//
// What it never does: send a command, or work out whether a command is used, offered or why not, or who is in Jail.
// Each plate's state and its unavailable reason are Frontend's (T3, decision 3): the server's reason or "Not
// available now", and never worked out from an empty list of the jailed. The plates' art is the game's own film
// bundle, through the CSS properties it defines, as today's game draws it; the component names a property and
// fetches nothing. The fixed words that state a rule are the pack's, held here, and must change with the rules
// (decision 4): "Once a match", the note, and the confirm's three facts.
//
// Private (decision 5): every view is the Captain's only (the contract keeps captainCommands to the Captain). The
// plates, the jailed names and the command leave the page when the viewer changes and when concealed.

import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const CAPTAIN_CONSOLE_VERSION = 'captain-console-0.1.0';
const VIEWS = Object.freeze(['console', 'release', 'eject']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
/** The sheet's id, the same for every view, so the shell keeps its body from the console to a confirm and back. */
export const CAPTAIN_CONSOLE_SHEET_ID = 'captain-console';
/** The two commands (the contract's CAPTAIN_RELEASE and CAPTAIN_EJECT), and a plate's three states. */
export const PLATE_KINDS = Object.freeze(['release', 'eject']);
export const PLATE_STATES = Object.freeze(['available', 'used', 'unavailable']);
/** The kit's tile state for each plate state: a used command is the pack's spent tile (kit 0.7.1). */
const TILE_STATE = Object.freeze({ available: 'available', used: 'spent', unavailable: 'unavailable' });
/** The film bundle's CSS property for a plate's art (apps/game/hosted/board-v2-film-art/catalog.json). */
export const plateProperty = (kind, state) => `--board-v2-film-captain-plate-${kind}-${state}`;

/** The pack's fixed words (screens-more.mjs captain; sheets 22 and 24). Names, states and reasons are Frontend's. */
export const CAPTAIN_CONSOLE_WORDS = Object.freeze({
  title: 'Captain console', consoleLine: 'Command Room · your turn',
  release: 'Release', eject: 'Eject', used: 'Used',
  // Rules (decision 4): they change with the rules.
  onceAMatch: 'Once a match',
  note: 'Each command works once a match, whoever is Captain.',
  releaseTitle: 'Release the Jail', ejectTitle: 'Eject the Jail',
  inJail: names => (names.length === 1 ? `${names[0]} is in Jail` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are in Jail`),
  // Rules (decision 4).
  onYourTurn: 'Once a match, on your turn in the Command Room',
  frees: 'Frees everyone physically in Jail now', ejects: 'Ejects everyone physically in Jail now',
  hospital: 'Hospital detention is not affected',
  cancel: 'Cancel',
});

const OFF = Object.freeze({ enabled: false, busy: false, reason: null });
const UNAVAILABLE = Object.freeze({ state: 'unavailable', reason: null });
/** Every input, with its default: nothing offered until Frontend says so. */
export const CAPTAIN_CONSOLE_DEFAULTS = Object.freeze({
  view: 'console', status: 'live', interactive: true, reducedMotion: false, viewer: null, versions: null,
  captain: null, plates: Object.freeze({ release: UNAVAILABLE, eject: UNAVAILABLE }), jailed: Object.freeze([]), command: OFF,
});
/** What is the Captain's, dropped when the viewer changes or the sheet is concealed. */
const VIEWERS_OWN = Object.freeze(['plates', 'jailed', 'command']);

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = value => Number.isSafeInteger(value) && value >= 1 && value <= 9;
function checkCommand(name, value) {
  if (value === null || value === undefined) return OFF;
  if (typeof value !== 'object' || (value.reason !== null && value.reason !== undefined && typeof value.reason !== 'string')) throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}
function checkPlates(plates) {
  const p = plates ?? CAPTAIN_CONSOLE_DEFAULTS.plates;
  if (typeof p !== 'object') throw new TypeError('plates is { release, eject }, each { state, reason }');
  return Object.freeze(Object.fromEntries(PLATE_KINDS.map(kind => {
    const plate = p[kind] ?? UNAVAILABLE;
    if (typeof plate !== 'object' || !PLATE_STATES.includes(plate.state)) throw new TypeError(`plates.${kind}.state is ${PLATE_STATES.join(', ')}`);
    if (plate.reason !== null && plate.reason !== undefined && !isText(plate.reason)) throw new TypeError(`plates.${kind}.reason is words, or null`);
    // The reason is an unavailable plate's: Frontend's, the server's or "Not available now" (T3).
    return [kind, Object.freeze({ state: plate.state, reason: plate.state === 'unavailable' && isText(plate.reason) ? plate.reason : null })];
  })));
}
function checkJailed(jailed) {
  if (!Array.isArray(jailed) || jailed.length > 9 || !jailed.every(isText)) throw new TypeError('jailed is the names of who is in Jail, in seat order');
  return Object.freeze([...jailed]);
}

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's value; the rest
 * stay. What is the Captain's (the plates, the jailed names, the command) is dropped while concealed and when the
 * viewer changes, unless the same update gives the new viewer's.
 */
export function nextCaptainConsoleInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is this phone\'s seat number, or null');
  next.viewer = next.viewer ?? null;
  if (next.captain !== null && next.captain !== undefined && !isSeat(next.captain)) throw new TypeError('captain is the Captain\'s seat, or null');
  next.captain = next.captain ?? null;
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  const concealed = next.status === 'concealed';
  const viewerChanged = 'viewer' in input && previous.viewer !== next.viewer;
  if (concealed || viewerChanged) for (const key of VIEWERS_OWN) if (concealed || !(key in input)) next[key] = CAPTAIN_CONSOLE_DEFAULTS[key];
  next.plates = checkPlates(next.plates);
  next.jailed = checkJailed(next.jailed ?? []);
  next.command = checkCommand('command', next.command);
  // The Captain's only (decision 5): the contract's own audience, kept on the phone.
  if (!concealed && (next.viewer === null || next.viewer !== next.captain)) throw new TypeError('The Captain console is the Captain\'s only: the viewer is the Captain');
  return next;
}

/**
 * The phone shell's sheet for the view (the shell's `sheet` input): "Captain console", its line and ✕ on the console;
 * on a confirm, no ✕, and the footer: Cancel this phone's own (`local`), then Release (primary) or Eject (the warning
 * button), the commands, with Frontend's state. Their taps come back through the shell's onSheetAction(id): cancel,
 * release, eject.
 */
export function captainConsoleSheet(input) {
  const s = nextCaptainConsoleInput(CAPTAIN_CONSOLE_DEFAULTS, input);
  const W = CAPTAIN_CONSOLE_WORDS;
  const frame = { id: CAPTAIN_CONSOLE_SHEET_ID, title: W.title, back: false, detent: 'auto' };
  if (s.view === 'console') return { ...frame, sub: W.consoleLine, close: true, actions: [] };
  if (s.status === 'concealed') return { ...frame, close: false, actions: [] };
  const release = s.view === 'release';
  return { ...frame, close: false, actions: [
    { id: 'cancel', label: W.cancel, kind: 'secondary', local: true },
    { id: s.view, label: release ? W.release : W.eject, kind: release ? 'primary' : 'warn', enabled: s.command.enabled, busy: s.command.busy, reason: s.command.reason },
  ] };
}

/**
 * Mounts the body in the shell's open sheet (`shell.sheetBody`), on its glass. Returns { update, dispose, element }.
 */
export function mountCaptainConsole(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('The Captain console needs a host element: the shell\'s sheetBody');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const W = CAPTAIN_CONSOLE_WORDS;
  let state = nextCaptainConsoleInput(CAPTAIN_CONSOLE_DEFAULTS, input);
  let disposed = false, shown = null;
  const on = Object.fromEntries(['onPlate', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  const root = kit.h('div', 'ms-captain-console ms-kit', { tabindex: '-1', role: 'group', 'aria-label': W.title });
  host.append(root);
  // Opening a confirm is this phone's own, so it works while reconnecting (decision 6); Release and Eject are the
  // shell's footer, which makes them wait with the banner's words.
  const accepts = () => !disposed && state.interactive && state.status !== 'concealed';
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: () => null,
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });

  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    if (target.dataset.intent === 'plate' && PLATE_KINDS.includes(target.dataset.value)) on.onPlate?.(target.dataset.value);
  };
  root.addEventListener('click', onClick);

  // ── The views' parts, made as a view is shown ───────────────────────
  let parts = {};
  function buildConsole() {
    const grid = kit.h('div', 'ms-cc-plates');
    const plates = PLATE_KINDS.map(kind => {
      // The plate's art: the film bundle's picture for its state, on this node (kit 0.7.1's tile takes it as its art).
      const art = kit.h('span', 'ms-cc-plate-art', { 'data-plate': `${kind}-available` });
      const tile = kit.tile({ art, name: W[kind], note: W.onceAMatch, state: 'available', intent: 'plate', value: kind });
      tile.art = art;
      return tile;
    });
    grid.append(...plates);
    const note = kit.groupNote(W.note);
    root.append(grid, note);
    parts = { plates };
  }
  /** The two plates (sheet 22): each its state's art, its name, and "Once a match", "Used" or Frontend's reason. */
  function paintConsole() {
    PLATE_KINDS.forEach((kind, i) => {
      const plate = state.plates[kind], tile = parts.plates[i];
      kit.attr(tile.art, 'data-plate', `${kind}-${plate.state}`);
      const note = plate.state === 'available' ? W.onceAMatch : plate.state === 'used' ? W.used : plate.reason;
      kit.setTile(tile, { art: tile.art, name: W[kind], note, state: TILE_STATE[plate.state], intent: 'plate', value: kind });
      policy.control(tile, { off: plate.state !== 'available' });
    });
  }
  function buildConfirm(kind) {
    const who = kit.who({ icon: kind, title: kind === 'release' ? W.releaseTitle : W.ejectTitle });
    const facts = kit.facts([W.onYourTurn, kind === 'release' ? W.frees : W.ejects, W.hospital]);
    root.append(who, facts);
    parts = { who, kind };
  }
  /** A command's confirm (sheets 22 and 24): its icon, its title, who is in Jail (Frontend's names), and the facts. */
  function paintConfirm() {
    const { who, kind } = parts;
    kit.setWho(who, { icon: kind, title: kind === 'release' ? W.releaseTitle : W.ejectTitle, sub: state.jailed.length ? W.inJail(state.jailed) : null });
  }
  function build(view) {
    // The view's parts leave with it; a focus in them returns to the content, reported once.
    for (const node of [...root.children]) if (!node.classList.contains('ms-k-vh')) policy.remove(node);
    parts = {};
    if (view === 'console') buildConsole();
    else if (view === 'release' || view === 'eject') buildConfirm(view);
    shown = view;
  }

  function render() {
    if (disposed) return;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    // Concealed, nothing of the view stays on the page.
    const view = state.status === 'concealed' ? 'concealed' : state.view;
    root.dataset.view = view;
    if (shown !== view) build(view);
    if (view === 'console') paintConsole();
    else if (view !== 'concealed') paintConfirm();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextCaptainConsoleInput(state, next);
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const node of [...root.children]) node.remove();
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, dispose, element: root });
}
