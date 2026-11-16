// Office decisions: the Captain's and the Officer's own decisions, which open by themselves at their phase, as the phone
// pack draws them (sheets 40 and 41; the pack's captain screen in its appoint and waiting states, its officer screen
// in its pick and done states, and its nav screen in its route, tie and confirm states; #222 item 17). Runtime
// source, Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual component once, in design/;
// the game and the preview use it as it is).
//
// The split (the Lead's review of #300):
//   mountOfficeDecisions   the body of the phone shell's sheet, for its five views: the Captain choosing an Officer
//                          (the 3 × 3), everyone else waiting for the Captain, the Officer choosing whom to block (the
//                          3 × 3), the block made (the notice), and the offices' Navigation (the route map, then the
//                          route, the tie or the acknowledgement)
//   officeDecisionsSheet   the shell's sheet for the view: its title and line, no ✕ (each lasts its phase), the large
//                          detent, and the footer: Appoint, Block and Acknowledge the commands, with Frontend's state;
//                          Skip this phone's own (`local`: it sends nothing, decision 4)
// The view, and the moment it opens and closes, are Frontend's, from the phase and this player's office.
//
// What it never does: send a command, or work out who can be chosen, why not, where the ship is or where it goes.
// Those are Frontend's, from the projection: the offers' targetSeatIds (exactly the cells that can be chosen), each
// dimmed cell's note (drawn only when given, decision 3), the Captain, the blocked seat, the offices, and the private
// navigation with its next position (decision 5). The fixed words that state a rule are the pack's, held here, and
// must change with the rules (decision 7): "Chosen at random if time runs out", "Optional · once a round", "You can't
// change or veto it", and the tie's two lines.
//
// Private (decision 6): the Navigation view is the offices' only, refused unless the viewer is the Captain or the
// Officer. The direction and the tie, the choices and the choice leave the page when the view or the viewer changes
// (unless the same update gives the new one's) and when concealed.

import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const OFFICE_DECISIONS_VERSION = 'office-decisions-0.1.0';
const VIEWS = Object.freeze(['appoint', 'appointing', 'block', 'blocked', 'navigation']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
/** The sheet's id, the same for every view, so the shell keeps its body (and this content) through them. */
export const OFFICE_SHEET_ID = 'office';
/** The contract's route positions (PlanetRoutePositionSchema), and the two directions. */
export const ROUTE_POSITIONS = Object.freeze(['Start', 'Junction', 'B1', 'B2', 'Blue Planet', 'R1', 'R2', 'Red Planet']);
export const DIRECTIONS = Object.freeze(['Blue', 'Red']);
const RECONNECTING_REASON = 'Controls return when the match is current';

/** The pack's fixed words (screens-more.mjs captain, officer and nav; sheets 40 and 41). Names and moves are Frontend's. */
export const OFFICE_WORDS = Object.freeze({
  appointTitle: 'Choose your Officer', appoint: name => (name ? `Appoint ${name}` : 'Appoint'), selected: 'Selected',
  appointingTitle: 'Officer appointment', choosing: name => `${name} is choosing an Officer`,
  // A rule (decision 7): it changes with the rules.
  random: 'Chosen at random if time runs out',
  blockTitle: 'Block movement',
  // A rule (decision 7).
  blockLine: 'Optional · once a round',
  skip: 'Skip', block: name => (name ? `Block ${name}` : 'Block'),
  blockedStamp: 'BLOCKED', cantMove: name => `${name} can’t move this round`, everyoneSees: 'Everyone sees the block',
  navTitle: 'Navigation', navLine: 'Only the Captain and Officer see this',
  position: 'Position', nextMove: 'Next move', beingSet: 'Being set', nextValue: (direction, next) => `${direction} · to ${next}`,
  acknowledge: 'Acknowledge',
  // Rules (decision 7).
  noVeto: 'You can’t change or veto it',
  tieNote: 'A genuine tie. Choose the direction; no choice means a random draw.', tieMap: 'Genuine tie · the Officer chooses',
  route: position => {
    const arm = /^B\d$/.test(position) ? 'Blue' : /^R\d$/.test(position) ? 'Red' : null;
    return `Route: the ship is at ${position}${arm ? ` on the ${arm} arm` : ''}`;
  },
});

const OFF = Object.freeze({ enabled: false, busy: false, reason: null });
/** Every input, with its default: nothing to choose or show until Frontend gives it. */
export const OFFICE_DECISIONS_DEFAULTS = Object.freeze({
  view: 'appointing', status: 'live', interactive: true, reducedMotion: false, viewer: null, versions: null,
  seats: Object.freeze([]), choices: Object.freeze([]), chosen: null, command: OFF,
  captain: null, blocked: null, offices: Object.freeze({ captain: null, officer: null }), navigation: null,
});
/** What belongs to this viewer's office and this view, dropped when either changes or the sheet is concealed. */
const VIEWERS_OWN = Object.freeze(['choices', 'chosen', 'command', 'navigation']);

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = value => Number.isSafeInteger(value) && value >= 1 && value <= 9;
const optionalText = (value, what) => {
  if (value === null || value === undefined) return null;
  if (!isText(value)) throw new TypeError(`${what} is words, or null`);
  return value;
};
function checkCommand(name, value) {
  if (value === null || value === undefined) return OFF;
  if (typeof value !== 'object' || (value.reason !== null && value.reason !== undefined && typeof value.reason !== 'string')) throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}
function checkPerson(value, what) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || !isSeat(value.seat) || !isText(value.name)) throw new TypeError(`${what} is { seat, name, character }, or null`);
  return Object.freeze({ seat: value.seat, name: value.name, character: isText(value.character) ? value.character : null });
}
function checkSeats(seats) {
  if (!Array.isArray(seats) || seats.length > 9) throw new TypeError('seats are up to nine [{ seat, name, character, note }]');
  const seen = new Set();
  return Object.freeze(seats.map(s => {
    const p = checkPerson(s, 'Each seat');
    if (!p) throw new TypeError('Each seat is { seat, name, character, note }');
    if (seen.has(p.seat)) throw new TypeError(`Seat ${p.seat} is given twice`);
    seen.add(p.seat);
    // The note under a cell that can't be chosen: Frontend's words, drawn only when given (decision 3).
    return Object.freeze({ ...p, note: optionalText(s.note, 'A seat\'s note') });
  }).sort((a, b) => a.seat - b.seat));
}
function checkChoices(choices, seats) {
  if (!Array.isArray(choices)) throw new TypeError('choices are the seats that can be chosen: the offer\'s targetSeatIds');
  const seen = new Set();
  for (const c of choices) {
    if (!seats.some(s => s.seat === c)) throw new TypeError(`Choice ${c} is one of the given seats`);
    if (seen.has(c)) throw new TypeError(`Choice ${c} is given twice`);
    seen.add(c);
  }
  return Object.freeze([...choices].sort((a, b) => a - b));
}
function checkOffices(offices) {
  const o = offices ?? OFFICE_DECISIONS_DEFAULTS.offices;
  if (typeof o !== 'object') throw new TypeError('offices is { captain, officer }');
  for (const k of ['captain', 'officer']) if (o[k] !== null && o[k] !== undefined && !isSeat(o[k])) throw new TypeError(`offices.${k} is a seat, or null`);
  return Object.freeze({ captain: o.captain ?? null, officer: o.officer ?? null });
}
function checkNavigation(nav) {
  if (nav === null || nav === undefined) return null;
  if (typeof nav !== 'object' || !ROUTE_POSITIONS.includes(nav.position)) throw new TypeError(`navigation.position is ${ROUTE_POSITIONS.join(', ')}`);
  const direction = nav.direction ?? null;
  if (direction !== null && !DIRECTIONS.includes(direction)) throw new TypeError('navigation.direction is Blue, Red, or null');
  const next = nav.next ?? null;
  if (next !== null && !ROUTE_POSITIONS.includes(next)) throw new TypeError(`navigation.next is ${ROUTE_POSITIONS.join(', ')}, or null`);
  const confirmation = nav.confirmation === true, tie = nav.tie === true;
  // The move to acknowledge is the server's: its direction and where it goes are given, never worked out (decision 5).
  if (confirmation && (direction === null || next === null)) throw new TypeError('A confirmation names its direction and next position');
  return Object.freeze({ position: nav.position, direction, next, tie, confirmation });
}

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's value; the rest
 * stay. What is this office's and this view's (the choices, the choice, the command, the navigation) is dropped while
 * concealed and when the viewer or the view changes, unless the same update gives the new one's.
 */
export function nextOfficeDecisionsInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is this phone\'s seat number, or null');
  next.viewer = next.viewer ?? null;
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  const changed = ('viewer' in input && previous.viewer !== next.viewer) || ('view' in input && previous.view !== next.view);
  if (next.status === 'concealed' || changed) for (const key of VIEWERS_OWN) if (next.status === 'concealed' || !(key in input)) next[key] = OFFICE_DECISIONS_DEFAULTS[key];
  next.seats = checkSeats(next.seats ?? []);
  next.choices = checkChoices(next.choices ?? [], next.seats);
  next.chosen = next.chosen ?? null;
  if (next.chosen !== null && !next.choices.includes(next.chosen)) throw new TypeError('chosen is one of the choices, or null');
  next.command = checkCommand('command', next.command);
  next.captain = checkPerson(next.captain, 'captain');
  next.blocked = checkPerson(next.blocked, 'blocked');
  next.offices = checkOffices(next.offices);
  next.navigation = checkNavigation(next.navigation);
  // The offices' only (decision 6): the contract's own audience, kept on the phone.
  if (next.view === 'navigation' && next.status !== 'concealed' && (next.viewer === null || ![next.offices.captain, next.offices.officer].includes(next.viewer))) {
    throw new TypeError('The Navigation view is the offices\' only: the viewer is the Captain or the Officer');
  }
  return next;
}

/** Each view's title (the sheet's, and the content's name). */
const TITLES = Object.freeze({ appoint: OFFICE_WORDS.appointTitle, appointing: OFFICE_WORDS.appointingTitle, block: OFFICE_WORDS.blockTitle, blocked: OFFICE_WORDS.blockTitle, navigation: OFFICE_WORDS.navTitle });
/** The chosen seat's name, for "Appoint Cleo" and "Block Gus". */
const chosenName = s => s.seats.find(x => x.seat === s.chosen)?.name ?? null;

/**
 * The phone shell's sheet for the view (the shell's `sheet` input): the pack's titles and lines, no ✕, the large
 * detent, and the footer. Appoint, Block and Acknowledge are the commands, with Frontend's state, and Appoint and Block
 * wait for a choice; Skip is this phone's own (`local`). Their taps come back through the shell's onSheetAction(id):
 * appoint, skip, block, acknowledge.
 */
export function officeDecisionsSheet(input) {
  const s = nextOfficeDecisionsInput(OFFICE_DECISIONS_DEFAULTS, input);
  const W = OFFICE_WORDS;
  const frame = { id: OFFICE_SHEET_ID, back: false, close: false, detent: 'large' };
  const command = (id, label, icon, enabled) => ({ id, label, kind: 'primary', icon, enabled: s.command.enabled && enabled, busy: s.command.busy, reason: s.command.reason });
  const concealed = s.status === 'concealed';
  if (s.view === 'appoint') return { ...frame, title: W.appointTitle, actions: concealed ? [] : [command('appoint', W.appoint(chosenName(s)), 'officer', s.chosen !== null)] };
  if (s.view === 'appointing') return { ...frame, title: W.appointingTitle, actions: [] };
  if (s.view === 'block') {
    return { ...frame, title: W.blockTitle, sub: W.blockLine, actions: concealed ? [] : [{ id: 'skip', label: W.skip, kind: 'secondary', local: true }, command('block', W.block(chosenName(s)), 'block', s.chosen !== null)] };
  }
  if (s.view === 'blocked') return { ...frame, title: W.blockTitle, sub: W.blockLine, actions: [] };
  return { ...frame, title: W.navTitle, sub: W.navLine, actions: !concealed && s.navigation?.confirmation && !s.navigation.tie ? [command('acknowledge', W.acknowledge, 'acknowledge', true)] : [] };
}

// ── The route map (the pack's routeSvg), as SVG elements ─────────────
const SVG = 'http://www.w3.org/2000/svg';
const PLACES = Object.freeze({ Start: [180, 204], Junction: [180, 164], B1: [140, 126], B2: [106, 92], 'Blue Planet': [72, 54], R1: [220, 126], R2: [254, 92], 'Red Planet': [288, 54] });
const ARMS = Object.freeze([['Start', 'Junction', '#55657E'], ['Junction', 'B1', '#2B4C80'], ['B1', 'B2', '#2B4C80'], ['B2', 'Blue Planet', '#2B4C80'], ['Junction', 'R1', '#7A2E2C'], ['R1', 'R2', '#7A2E2C'], ['R2', 'Red Planet', '#7A2E2C']]);
function el(doc, tag, attrs, words = null) {
  const node = doc.createElementNS(SVG, tag);
  for (const [k, v] of attrs) node.setAttribute(k, String(v));
  if (words !== null) node.textContent = words;
  return node;
}
const label = (doc, x, y, words, anchor, colour = '#B9C4D3') => el(doc, 'text', [['x', x], ['y', y], ['fill', colour], ['font-size', 12], ['font-weight', 600], ['font-family', 'Inter, system-ui, sans-serif'], ['text-anchor', anchor]], words);
const stroke = (doc, a, b, colour, dashed = false) => el(doc, 'line', [['x1', PLACES[a][0]], ['y1', PLACES[a][1]], ['x2', PLACES[b][0]], ['y2', PLACES[b][1]], ['stroke', colour], ['stroke-width', 5], ...(dashed ? [['stroke-dasharray', '6 6']] : []), ['stroke-linecap', 'round']]);
/**
 * The route map, as the pack draws it: the two arms, each place (the ship's in amber), the next step dashed in amber
 * when a move is to be acknowledged, and the tie's line under it. `next` is Frontend's (decision 5).
 */
export function routeSvg(doc, { position, next = null, tie = false } = {}) {
  if (!ROUTE_POSITIONS.includes(position)) throw new TypeError(`The route's position is ${ROUTE_POSITIONS.join(', ')}`);
  if (next !== null && !ROUTE_POSITIONS.includes(next)) throw new TypeError(`The route's next position is ${ROUTE_POSITIONS.join(', ')}, or null`);
  const svg = el(doc, 'svg', [['viewBox', '0 0 360 224'], ['aria-hidden', 'true']]);
  for (const [a, b, colour] of ARMS) svg.append(stroke(doc, a, b, colour));
  if (next) svg.append(stroke(doc, position, next, '#F1B84B', true));
  for (const k of Object.keys(PLACES)) {
    const [x, y] = PLACES[k], here = k === position, planet = k.includes('Planet');
    const fill = planet ? (k.startsWith('Blue') ? '#2979FF' : '#E8423F') : here ? '#F1B84B' : '#34415A';
    const words = planet ? label(doc, x, y - 22, k, 'middle', '#F4EBDD') : ['B1', 'B2'].includes(k) ? label(doc, x - 16, y + 4, k, 'end') : label(doc, x + 16, y + 4, k, 'start');
    const g = el(doc, 'g', []);
    g.append(el(doc, 'circle', [['cx', x], ['cy', y], ['r', planet ? 15 : here ? 11 : 7], ['fill', fill], ['stroke', '#F4EBDD'], ['stroke-width', here ? 3 : 1.5]]), words);
    svg.append(g);
  }
  if (tie) svg.append(label(doc, 180, 220, OFFICE_WORDS.tieMap, 'middle', '#F1B84B'));
  return svg;
}

/**
 * Mounts the body in the shell's open sheet (`shell.sheetBody`), on its glass. Returns { update, dispose, element }.
 */
export function mountOfficeDecisions(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('Office decisions need a host element: the shell\'s sheetBody');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const W = OFFICE_WORDS;
  let state = nextOfficeDecisionsInput(OFFICE_DECISIONS_DEFAULTS, input);
  let disposed = false, shown = null;
  const on = Object.fromEntries(['onChoose', 'onDirection', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  const root = kit.h('div', 'ms-office-decisions ms-kit', { tabindex: '-1', role: 'group' });
  host.append(root);
  // Choosing a cell is this phone's own, so it works while reconnecting (decision 8); the tie's Blue and Red are
  // commands, and wait with the banner's words, as the shell's footer makes Appoint, Block and Acknowledge wait.
  const accepts = intent => !disposed && state.interactive && state.status !== 'concealed' && (state.status === 'live' || intent !== 'direction');
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: intent => (state.status === 'stale' && intent === 'direction' ? RECONNECTING_REASON : null),
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });

  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts(target.dataset.intent)) return;
    if (target.dataset.intent === 'choose') on.onChoose?.(Number(target.dataset.value));
    else if (target.dataset.intent === 'direction') on.onDirection?.(target.dataset.value);
  };
  root.addEventListener('click', onClick);

  // ── The views' parts, made as a view is shown ───────────────────────
  let parts = {};
  function buildGrid() {
    const { wrap, grid } = kit.grid9();
    const cells = Array.from({ length: 9 }, (_, i) => kit.cell({ person: { seat: i + 1, name: '' }, state: 'empty', intent: 'choose' }));
    grid.append(...cells);
    root.append(wrap);
    parts = { wrap, cells };
  }
  /** The 3 × 3 (sheets 40 and 41): every seat in order; exactly the given choices can be chosen; the rest dimmed with Frontend's note. */
  function paintGrid() {
    const s = state;
    parts.cells.forEach((node, i) => {
      const seat = s.seats.find(x => x.seat === i + 1) ?? null;
      const choosable = !!seat && s.choices.includes(seat.seat), chosen = !!seat && s.chosen === seat.seat;
      const cellState = !seat ? 'empty' : chosen ? 'selected' : choosable ? 'available' : 'ineligible';
      const note = chosen ? W.selected : choosable ? null : seat?.note ?? null;
      kit.setCell(node, { person: seat ?? { seat: i + 1, name: '' }, state: cellState, note, you: !!seat && seat.seat === s.viewer, intent: 'choose', versions: s.versions });
      policy.control(node, { off: !choosable });
    });
  }
  function buildWaiting() {
    parts = { wait: null, portrait: null };
  }
  /** Everyone else (sheet 40): the Captain's portrait, as drawn at 44 px, with "Ben is choosing an Officer". */
  function paintWaiting() {
    const p = parts, c = state.captain;
    if (!c) { if (p.wait) { policy.remove(p.wait); p.wait = null; } return; }
    if (!p.portrait) p.portrait = kit.portrait({ character: c.character }, state.versions);
    kit.setPortrait(p.portrait, { character: c.character }, state.versions);
    const props = { lead: p.portrait, title: W.choosing(c.name), line: W.random, size: 'small' };
    if (!p.wait) { p.wait = kit.wait(props); root.append(p.wait); } else kit.setWait(p.wait, props);
  }
  function buildBlocked() {
    // The pack's .registered: the amber stamp over its two lines (kit 0.7.0's notice, decision 2).
    const notice = kit.h('div', 'ms-od-notice');
    const stamp = kit.stamp({ text: W.blockedStamp, tone: 'amber' });
    const who = kit.h('p'), all = kit.h('p');
    kit.text(all, W.everyoneSees);
    notice.append(stamp, who, all);
    root.append(notice);
    parts = { notice, who };
  }
  function paintBlocked() {
    const b = state.blocked;
    parts.notice.hidden = !b;
    kit.text(parts.who, b ? W.cantMove(b.name) : '');
  }
  function buildNavigation() {
    const map = kit.h('div', 'ms-od-route', { role: 'img' });
    root.append(map);
    parts = { map, sig: null, body: null, kind: null };
  }
  /** The offices' Navigation (sheet 41): the route map, then the route, the tie or the acknowledgement. */
  function paintNavigation() {
    const p = parts, n = state.navigation;
    p.map.hidden = !n;
    const kind = !n ? null : n.tie ? 'tie' : n.confirmation ? 'confirm' : 'route';
    const sig = n ? `${n.position}|${kind === 'confirm' ? n.next : ''}|${n.tie}` : null;
    if (sig !== p.sig) {
      p.map.replaceChildren(...(n ? [routeSvg(doc, { position: n.position, next: kind === 'confirm' ? n.next : null, tie: n.tie })] : []));
      kit.attr(p.map, 'aria-label', n ? W.route(n.position) : null);
      p.sig = sig;
    }
    if (kind !== p.kind) {
      if (p.body) policy.remove(p.body);
      p.body = null;
      p.kind = kind;
      if (kind === 'tie') {
        const note = kit.groupNote(W.tieNote);
        const pair = kit.h('div', 'ms-od-tie');
        p.directions = DIRECTIONS.map(d => kit.button({ label: d, kind: 'secondary', icon: 'planet', intent: 'direction', value: d }));
        pair.append(...p.directions);
        p.body = kit.h('div', 'ms-od-part');
        p.body.append(note, pair);
      } else if (kind) {
        p.rows = [kit.row({ tag: 'div', title: '' }), kit.row({ tag: 'div', title: '' })];
        p.body = kit.list(...p.rows);
      }
      if (p.body) root.append(p.body);
    }
    if (kind === 'tie') for (const b of p.directions) policy.control(b, { intent: 'direction', off: !state.command.enabled, busy: state.command.busy, reason: state.command.reason });
    else if (kind === 'confirm') {
      kit.setRow(p.rows[0], { tag: 'div', icon: 'direction', tint: 'amber', title: W.nextMove, value: W.nextValue(n.direction, n.next) });
      kit.setRow(p.rows[1], { tag: 'div', icon: 'acknowledge', tint: 'slate', title: W.acknowledge, sub: W.noVeto });
    } else if (kind === 'route') {
      kit.setRow(p.rows[0], { tag: 'div', icon: 'course', tint: 'slate', title: W.position, value: n.position });
      kit.setRow(p.rows[1], { tag: 'div', icon: 'direction', tint: 'slate', title: W.nextMove, value: n.direction && n.next ? W.nextValue(n.direction, n.next) : W.beingSet });
    }
  }
  function build(view) {
    // The view's parts leave with it; a focus in them returns to the content, reported once.
    for (const node of [...root.children]) if (!node.classList.contains('ms-k-vh')) policy.remove(node);
    parts = {};
    if (view === 'appoint' || view === 'block') buildGrid();
    else if (view === 'appointing') buildWaiting();
    else if (view === 'blocked') buildBlocked();
    else if (view === 'navigation') buildNavigation();
    shown = view;
  }

  function render() {
    if (disposed) return;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    // Concealed, nothing of the view stays on the page.
    const view = state.status === 'concealed' ? 'concealed' : state.view;
    root.dataset.view = view;
    kit.attr(root, 'aria-label', TITLES[state.view]);
    if (shown !== view) build(view);
    if (view === 'appoint' || view === 'block') paintGrid();
    else if (view === 'appointing') paintWaiting();
    else if (view === 'blocked') paintBlocked();
    else if (view === 'navigation') paintNavigation();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextOfficeDecisionsInput(state, next);
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
