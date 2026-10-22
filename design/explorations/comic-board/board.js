// mothership:dev-only
//
// The comic-board exploration: the board as a page of a comic book. A player picks a room
// on the page and moves to it; a move is a short piece of motion.
//
// It is a look and a feel to react to, not the game. The data is a synthetic fixture and
// the "server" below is four lines that imitate one rule, so that the page can be played
// with. The words on the card are Frontend's own (packages/presentation/src/copy/en.ts on
// codex/v1-connected-merge-candidate at 71dfd02), except where a comment says PROPOSED.
//
// What is real and kept: a move is offered only for the rooms the seat's own view lists
// (self.movementDestinations), it is confirmed before it is sent, and the token moves when
// the public fact arrives, on every screen alike. Nothing private is drawn on the page.
//
// The playing pieces are nine crew characters, one chosen by each player before any role is
// dealt, with the player's name under it. A character and a name are public and say whose
// piece is whose. They say nothing about a role: no rule, picture or color here ties one to
// the other. No contract carries a name or a character today; the seat number stays on the
// tag because it is what the rules and every other screen call a player.
//
// A role is dealt at random after that, and is PRIVATE. It is shown as a device added to the
// player's own character, inside a card that lies face down in the hand until the player
// turns it up, and nowhere else: not on the piece, not on the board, not on the shared
// display, not in any cue. This page holds one role, the viewer's own; it never knows
// anybody else's.

import { loadBundles } from '../../prototypes/js/bundles.js';
import { CREW, FAMILIES, ROLES, ROOMS, drawing, printIn } from './rooms.js';

window.__designReady = false;

const query = new URLSearchParams(location.search);
const root = document.documentElement;
const app = document.getElementById('app');
const page = document.getElementById('page');
const tokensLayer = document.getElementById('tokens');
const trails = document.getElementById('trails');
const hand = document.getElementById('hand');
const live = document.getElementById('live');
const banner = document.getElementById('banner');
const phase = document.getElementById('phase');
const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------- small helpers ----------

function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'html') node.innerHTML = value;
    else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const reduced = () => root.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const icon = body => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

const ICON = {
  crate: icon('<rect x="3.5" y="4.5" width="17" height="15.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M4 5 20 19.5M20 5 4 19.5" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
  flask: icon('<path d="M8.5 3h7M10 3v6.2L4.6 18.8A1.6 1.6 0 0 0 6 21.2h12a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M7.6 15h8.8l2.4 4.6H5.2z" fill="currentColor"/>'),
  planet: icon('<circle cx="12" cy="12" r="6.4" fill="currentColor"/><ellipse cx="12" cy="12" rx="11" ry="3.4" fill="none" stroke="currentColor" stroke-width="2.4" transform="rotate(-20 12 12)"/>'),
  cross: icon('<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor"/>'),
  lock: icon('<rect x="4.5" y="10.5" width="15" height="11" rx="2" fill="currentColor"/><path d="M8 10.5V7.4a4 4 0 0 1 8 0v3.1" fill="none" stroke="currentColor" stroke-width="3"/>'),
  move: icon('<path d="M3.5 12h13M11.5 5.5 18 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  pin: icon('<path d="M12 22s7-7.2 7-12.2A7 7 0 0 0 5 9.8C5 14.8 12 22 12 22z" fill="currentColor"/><circle cx="12" cy="9.6" r="2.6" fill="#F4EBDD"/>'),
  eyeClosed: icon('<path d="M3 10.5c2.5 3.3 5.5 5 9 5s6.5-1.7 9-5M7 15l-1.7 3M12 16.2v3.4M17 15l1.7 3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  eyeOpen: icon('<path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.3" fill="currentColor"/>'),
};

// ---------- the fixture ----------

const MOVE_ROOMS = ['Room A', 'Room B', 'Command Room'];
const startingSeats = () => [
  { n: 1, location: 'Room A', health: 'Healthy', jailed: false, captain: false, moved: false },
  { n: 2, location: 'Room A', health: 'Healthy', jailed: false, captain: false, moved: false },
  { n: 3, location: 'Room A', health: 'Healthy', jailed: false, captain: false, moved: false },
  { n: 4, location: 'Room A', health: 'Healthy', jailed: false, captain: false, moved: false },
  { n: 5, location: 'Command Room', health: 'Healthy', jailed: false, captain: true, moved: false },
  { n: 6, location: 'Room B', health: 'Healthy', jailed: false, captain: false, moved: false },
  { n: 7, location: 'Room B', health: 'Healthy', jailed: false, captain: false, moved: false },
  { n: 8, location: 'Hospital', health: 'Injured', jailed: false, captain: false, moved: false },
  { n: 9, location: 'Jail', health: 'Healthy', jailed: true, captain: false, moved: false },
];

// Fixture players, seat 1 to 9.
const FIXTURE_NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const fixtureNames = () => Object.fromEntries(FIXTURE_NAMES.map((name, index) => [index + 1, name]));

const state = {
  // seat number -> the player's name, and -> the character they chose (1 to 9).
  names: fixtureNames(),
  crew: Object.fromEntries(FIXTURE_NAMES.map((unused, index) => [index + 1, index + 1])),
  chosen: false,
  // The viewer's own role, once dealt: a key of ROLES. PRIVATE. `roleWanted` is the Controls' choice of which to look at.
  role: null,
  roleWanted: ROLES.some(each => each.key === query.get('peek')) ? query.get('peek') : 'random',
  surface: query.get('surface') === 'table' ? 'table' : 'player',
  set: FAMILIES[query.get('set')] ? query.get('set') : 'picture',
  viewer: query.get('viewer') === '5' ? 5 : 1,
  round: 2,
  mode: 'idle', // idle | choosing | confirming | submitting | accepted | not-accepted
  choice: null,
  refuseNext: false,
  stale: false,
  busy: false,
  // ?still=<ms>: a storyboard frame. The viewer's own move to Room B, held at that moment.
  still: query.has('still') ? Number(query.get('still')) : null,
  seats: startingSeats(),
};
if (query.get('motion') === 'reduced') root.dataset.motion = 'reduced';
// ?crew=<1 to 9> gives the viewer that character without the chooser: for looking at one.
if (/^[1-9]$/.test(query.get('crew') ?? '')) {
  const wanted = Number(query.get('crew'));
  const holder = Number(Object.keys(state.crew).find(n => state.crew[n] === wanted));
  state.crew[holder] = state.crew[state.viewer];
  state.crew[state.viewer] = wanted;
}

const seat = n => state.seats.find(candidate => candidate.n === n);
const nameOf = n => state.names[n] ?? `Player ${n}`;
const viewerSeat = () => (state.surface === 'table' ? null : seat(state.viewer));

/**
 * What the seat's own view would list in self.movementDestinations. Imitates the landing
 * candidate's engine for this fixture only: once a round, from Room A, Room B or the
 * Command Room, and into the Command Room only as Captain. The page never works this out
 * for itself in the game: it draws the list the server sends.
 */
function destinations(who) {
  if (who.moved || !MOVE_ROOMS.includes(who.location)) return [];
  return MOVE_ROOMS.filter(room => room !== who.location && (room !== 'Command Room' || who.captain));
}
const mayStart = () => !state.stale && !state.busy;

// ---------- the page ----------

const PAGE_ORDER = ['command', 'room-a', 'room-b', 'hospital', 'jail'];
// Each panel's inked edge is cut a little out of square, differently.
const CUTS = { command: [2, 1, 3, 2], 'room-a': [1, 3, 1, 2], 'room-b': [3, 1, 2, 1], hospital: [1, 2, 2, 3], jail: [2, 2, 1, 1] };
const panels = new Map();
const tokenEls = new Map();

function buildPage() {
  for (const key of PAGE_ORDER) {
    const room = ROOMS.find(candidate => candidate.key === key);
    const panel = h('button', { class: 'cb-panel', type: 'button', 'data-room': key, onclick: () => pressRoom(room) },
      h('span', { class: 'cb-panel__ink' }),
      h('span', { class: 'cb-panel__frame' }, h('span', { class: 'cb-art' }), h('span', { class: 'cb-panel__wait' })),
      h('span', { class: 'cb-caption' }, h('span', { html: ICON[room.icon] }).firstChild, room.name),
      // PROPOSED words: "You are here", "Move here", "Selected".
      h('span', { class: 'cb-tag cb-tag--here' }, h('span', { html: ICON.pin }).firstChild, 'You are here'),
      h('span', { class: 'cb-tag cb-tag--go' }, h('span', { html: ICON.move }).firstChild, h('span', { class: 'cb-tag__words' }, 'Move here')),
    );
    CUTS[key].forEach((cut, index) => panel.style.setProperty(`--k${index + 1}`, `${cut}px`));
    page.insertBefore(panel, tokensLayer);
    panels.set(room.name, panel);
  }
  for (const each of state.seats) {
    // The tag under a piece: the seat number the rules use, and the player's name.
    const body = h('div', { class: 'cb-token__body' }, h('span', { class: 'cb-token__name' }, h('b', null, String(each.n)), h('span', null, nameOf(each.n))));
    const token = h('div', { class: 'cb-token', 'data-n': each.n }, h('div', { class: 'cb-token__lift' }, body));
    tokensLayer.append(token);
    tokenEls.set(each.n, token);
  }
}

async function paintRooms() {
  await Promise.all(ROOMS.map(async room => {
    const art = panels.get(room.name).querySelector('.cb-art');
    art.innerHTML = printIn(await drawing(room), FAMILIES[state.set][room.name], `${room.key}-`);
    const svg = art.querySelector('svg');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }));
  fitArt();
}

/** A panel shows the part of its drawing that fits its shape: the wall first, then as much floor as there is room for. */
function fitArt() {
  for (const panel of panels.values()) {
    const svg = panel.querySelector('.cb-art svg');
    const frame = panel.querySelector('.cb-panel__frame');
    if (!svg || frame.clientHeight === 0) continue;
    const ratio = frame.clientWidth / frame.clientHeight;
    let box;
    if (ratio >= 1024 / 768) {
      const height = 1024 / ratio;
      box = [0, Math.min(84, 768 - height), 1024, height];
    } else {
      const width = 768 * ratio;
      box = [(1024 - width) / 2, 0, width, 768];
    }
    svg.setAttribute('viewBox', box.map(value => value.toFixed(1)).join(' '));
  }
}

function slotsFor(panel, count) {
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  if (count === 0) return [];
  // A piece is sized by the room it stands in, larger on a shared display, which is read from
  // across a table, and smaller when the room is crowded: all of them stand in one row.
  const tall = height * (width / height > 2.8 ? 0.46 : 0.34);
  let tw = clamp(Math.min((width - 10) / Math.max(count, 3) / 1.25, tall), 20, clamp(width * 0.2, 72, 110));
  tw = Math.max(18, Math.min(tw, (width - 10) / count / 0.94));
  const step = Math.min(tw * 1.9, (width - 10) / count);
  // Name tags hang under the pieces. Where neighbours stand close, every second tag drops a line.
  const staggered = count > 1 && step < tw * 1.45;
  const line = clamp(tw * 0.42, 14, 32);
  const floor = panel.offsetTop + height - (staggered ? 2 : 1) * line - Math.max(3, height * 0.03);
  return Array.from({ length: count }, (unused, index) => ({
    x: panel.offsetLeft + width / 2 + (index - (count - 1) / 2) * step,
    y: floor,
    tw,
    z: 2,
    drop: staggered && index % 2 === 1,
    tag: (staggered ? step * 2 : step) - 4,
  }));
}

/** Where every token stands, by room and seat number. Returns the slot of each seat. */
function standing() {
  const where = new Map();
  for (const room of ROOMS) {
    const here = state.seats.filter(each => each.location === room.name).sort((a, b) => a.n - b.n);
    const slots = slotsFor(panels.get(room.name), here.length);
    here.forEach((each, index) => where.set(each.n, slots[index]));
  }
  return where;
}

function place(token, slot) {
  token.style.setProperty('--tw', `${slot.tw.toFixed(1)}px`);
  token.style.setProperty('--x', `${(slot.x - slot.tw / 2).toFixed(1)}px`);
  token.style.setProperty('--y', `${(slot.y - slot.tw * 1.25 * (104 / 120)).toFixed(1)}px`);
  token.style.setProperty('--tag', `${slot.tag.toFixed(1)}px`);
  token.toggleAttribute('data-drop', slot.drop);
  token.style.zIndex = String(slot.z);
}

function layoutTokens({ except = null } = {}) {
  const where = standing();
  for (const [n, slot] of where) if (n !== except) place(tokenEls.get(n), slot);
  return where;
}

// ---------- drawing the state ----------

const OFFERING = new Set(['choosing', 'confirming']);

function sync() {
  const me = viewerSeat();
  const offered = me ? destinations(me) : [];
  app.dataset.mode = state.mode;
  app.dataset.surface = state.surface;
  app.toggleAttribute('data-stale', state.stale);
  banner.hidden = !state.stale;
  banner.textContent = state.stale ? 'Connection lost. Showing the last known state, which may be out of date. Reconnecting…' : '';

  for (const room of ROOMS) {
    const panel = panels.get(room.name);
    const here = !!me && me.location === room.name;
    const selected = state.choice === room.name && (state.mode === 'confirming' || state.mode === 'submitting');
    let offer = null;
    if (me && OFFERING.has(state.mode)) offer = offered.includes(room.name) ? 'offered' : 'not-offered';
    if (me && state.mode === 'submitting') offer = selected ? 'offered' : 'not-offered';
    panel.toggleAttribute('data-here', here);
    panel.toggleAttribute('data-selected', selected);
    if (offer) panel.dataset.offer = offer; else delete panel.dataset.offer;
    panel.querySelector('.cb-tag__words').textContent = selected ? 'Selected' : 'Move here';
    const canPress = !!me && mayStart() && offered.includes(room.name) && ['idle', 'choosing', 'confirming'].includes(state.mode);
    panel.setAttribute('aria-disabled', String(!canPress));
    const present = state.seats.filter(each => each.location === room.name).map(each => `${nameOf(each.n)}, Player ${each.n}`);
    panel.setAttribute('aria-label', [
      room.name,
      present.length > 0 ? `Here: ${present.join(', ')}` : 'No players here',
      here ? 'You are here' : null,
      selected ? 'Selected' : canPress ? 'Move here' : null,
    ].filter(Boolean).join('. '));
  }

  for (const each of state.seats) {
    const token = tokenEls.get(each.n);
    const body = token.querySelector('.cb-token__body');
    const panel = panels.get(each.location);
    token.dataset.health = each.health;
    token.dataset.lift = panel.hasAttribute('data-selected') ? 'selected'
      : panel.dataset.offer === 'offered' ? 'offered'
      : panel.dataset.offer === 'not-offered' ? (panel.hasAttribute('data-here') ? 'here' : 'dim') : '';
    // The piece is the character the player chose. Nothing about it depends on a role.
    const art = `url("${CREW.find(candidate => candidate.id === state.crew[each.n]).art}")`;
    if (body.style.backgroundImage !== art) body.style.backgroundImage = art;
    body.querySelector('.cb-token__name > span').textContent = nameOf(each.n);
    const mark = each.captain ? 'captain' : each.jailed ? 'jail' : each.health === 'Injured' ? 'injured' : null;
    let markEl = body.querySelector('.cb-token__mark');
    if (mark && !markEl) body.append(markEl = h('span', { class: 'cb-token__mark' }));
    if (!mark && markEl) markEl.remove();
    if (mark) markEl.dataset.mark = mark;
    const isMe = !!me && me.n === each.n;
    token.toggleAttribute('data-mine', isMe);
    const you = body.querySelector('.cb-token__you');
    if (isMe && !you) body.append(h('span', { class: 'cb-token__you' }, 'You'));
    if (!isMe && you) you.remove();
  }

  phase.replaceChildren(
    // PROPOSED: the name where Frontend's caption says "Player 4's turn".
    h('div', null, h('p', { class: 'cb-phase__round' }, `Round ${state.round}`), h('p', { class: 'cb-phase__what' }, `${nameOf(4)}’s turn`)),
    h('p', { class: 'cb-phase__timer' }, '0:42'),
  );
  drawHand();
  drawControls();
}

function drawHand() {
  const me = viewerSeat();
  if (!me) return hand.replaceChildren();
  const offered = destinations(me);
  const button = (label, onclick, primary = false) => h('button', { class: `cb-button${primary ? ' cb-button--primary' : ''}`, type: 'button', onclick }, label);
  const head = (status, kind = null) => h('div', { class: 'cb-card__head' },
    h('span', { class: 'cb-card__icon', html: ICON.move }),
    h('h2', { class: 'cb-card__title' }, 'Move'),
    h('span', { class: 'cb-card__status', 'data-kind': kind }, status),
  );
  let parts;
  if (state.mode === 'choosing') {
    parts = [head('Choosing', 'plain'),
      h('p', { class: 'cb-card__prompt' }, 'Where do you move?'),
      // PROPOSED: the first half of this sentence. The second is Frontend's.
      h('p', { class: 'cb-card__text' }, 'Press a room on the page, or one of these. These are the choices the server offers you now.'),
      h('div', { class: 'cb-row' }, offered.map(room => button(room, () => choose(room))), button('Cancel', cancel))];
  } else if (state.mode === 'confirming') {
    parts = [head('Not sent yet', 'dashed'),
      h('p', { class: 'cb-card__prompt' }, `Move to ${state.choice}?`),
      h('p', { class: 'cb-card__text' }, 'You cannot change or withdraw it here once the server accepts it.'),
      h('div', { class: 'cb-row' }, button('Move', confirmMove, true), button(offered.length > 1 ? 'Choose again' : 'Cancel', offered.length > 1 ? openChoosing : cancel))];
  } else if (state.mode === 'submitting') {
    parts = [head('Submitting', 'dashed'), h('div', { class: 'cb-card__wait' }), h('p', { class: 'cb-card__prompt' }, 'Sending your move to the server…')];
  } else if (state.mode === 'accepted') {
    parts = [head('Accepted', 'stamp'),
      h('p', { class: 'cb-card__prompt' }, `Move to ${state.choice} accepted.`),
      // PROPOSED: Frontend's line points at "Your location"; on this page that is the page itself.
      h('p', { class: 'cb-card__text' }, 'Where you are is shown on the page, as the server has it.'),
      h('div', { class: 'cb-row' }, button('Done', done, true))];
  } else if (state.mode === 'not-accepted') {
    parts = [head('Not accepted', 'plain'),
      h('p', { class: 'cb-card__prompt' }, 'Not accepted. The server did not allow it.'),
      h('p', { class: 'cb-card__text' }, 'You can choose again if the server still offers it.'),
      h('div', { class: 'cb-row' }, button('OK', done, true))];
  } else if (offered.length > 0 && !state.stale) {
    parts = [head('Available'), h('div', { class: 'cb-row' }, button('Choose where to move', openChoosing, true))];
  } else {
    parts = [head(offered.length > 0 ? 'Paused' : 'Not available', 'plain')];
  }
  // The role card lies face down beside the Move card. It looks the same whatever the role is.
  const dealt = state.role !== null;
  hand.replaceChildren(
    h('div', { class: 'cb-hand__row' },
      h('div', { class: 'cb-card' }, parts),
      dealt && h('button', { class: 'cb-rolecard', type: 'button', 'aria-label': 'Show private information', onclick: openPrivate }, h('span', { html: ICON.eyeClosed }).firstChild, h('span', null, 'Private'))),
    // PROPOSED: the reminder the closed private dock carries, said of the card.
    dealt && h('p', { class: 'cb-hand__note' }, 'Only turn your role card up where other players cannot see your screen.'),
  );
  // The page keeps the room the card needs at rest, and does not resize when the card is picked up.
  if (state.mode === 'idle' && offered.length > 0 && !state.stale) reserveHand();
}
function reserveHand() {
  const rest = `${hand.offsetHeight}px`;
  if (app.style.getPropertyValue('--cb-hand-rest') !== rest) app.style.setProperty('--cb-hand-rest', rest);
}

// ---------- choosing and moving ----------

function openChoosing() {
  const me = viewerSeat();
  if (!me || !mayStart() || destinations(me).length === 0) return;
  state.mode = 'choosing';
  state.choice = null;
  sync();
}
function choose(roomName) {
  const changed = state.choice !== roomName;
  state.choice = roomName;
  state.mode = 'confirming';
  sync();
  hand.querySelector('.cb-button--primary')?.focus({ preventScroll: true });
  if (changed && !reduced()) {
    // Picked: the room comes up off the page with a small knock, and its tag is stamped.
    const panel = panels.get(roomName);
    panel.animate([{ scale: '1' }, { scale: '1.04', offset: 0.4 }, { scale: '1' }], { duration: 200, easing: 'ease-out' });
    panel.querySelector('.cb-tag--go').animate([{ opacity: 0, scale: '1.7', rotate: '-8deg' }, { opacity: 1, scale: '1', rotate: '0deg' }], { duration: 130, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' });
  }
}
function cancel() {
  state.mode = 'idle';
  state.choice = null;
  sync();
}
function done() {
  state.mode = 'idle';
  state.choice = null;
  sync();
}

/** Pressing a room on the page is the same as pressing its name on the card. */
function pressRoom(room) {
  const me = viewerSeat();
  if (!me) return;
  const offered = destinations(me);
  if (['idle', 'choosing', 'confirming'].includes(state.mode) && mayStart() && offered.includes(room.name)) return choose(room.name);
  if (['idle', 'choosing', 'confirming'].includes(state.mode)) refuse(panels.get(room.name));
}
function refuse(panel) {
  if (reduced()) return;
  panel.animate([{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '4px 0' }, { translate: '-2px 0' }, { translate: '0 0' }], { duration: 220, easing: 'ease-out' });
}

async function confirmMove() {
  const me = viewerSeat();
  if (!me || state.mode !== 'confirming') return;
  state.mode = 'submitting';
  sync();
  await wait(reduced() ? 250 : 700);
  if (state.refuseNext) {
    state.refuseNext = false;
    state.mode = 'not-accepted';
    sync();
    return;
  }
  // The receipt and the public fact. The token moves on the fact, as it does on every screen.
  const from = me.location;
  me.location = state.choice;
  me.moved = true;
  state.mode = 'accepted';
  await publicMove(me, from, { own: true });
}

async function otherPlayerMoves() {
  if (state.busy) return;
  const movers = state.seats.filter(each => each.n !== state.viewer || state.surface === 'table').filter(each => destinations(each).length > 0);
  if (movers.length === 0) return announce('Nobody else can move this round.');
  const who = movers[Math.floor(Math.random() * movers.length)];
  const options = destinations(who);
  const from = who.location;
  who.location = options[Math.floor(Math.random() * options.length)];
  who.moved = true;
  await publicMove(who, from, { own: false });
}

const announce = text => { live.textContent = text; };

// ---------- the move cue: lifted off the page, carried over it, set down ----------

const BEAT = 900; // --ms-motion-beat-max
const LIFT_AT = 120;
const FLIGHT = 450; // --ms-motion-move
const LAND_AT = LIFT_AT + FLIGHT;

// What the cue in flight has put on the page, to be taken off when its beat ends.
let spent = [];

async function publicMove(who, fromName, { own }) {
  state.busy = true;
  spent = [];
  const token = tokenEls.get(who.n);
  const body = token.querySelector('.cb-token__body');
  const toPanel = panels.get(who.location);
  const before = { x: parseFloat(token.style.getPropertyValue('--x')), y: parseFloat(token.style.getPropertyValue('--y')), tw: parseFloat(token.style.getPropertyValue('--tw')) };
  if (own) toPanel.dataset.arriving = '';
  token.dataset.flying = '';
  sync();
  // The room it is going to makes space at once. The room it leaves closes up only after it has gone.
  const where = standing();
  const closeUp = () => { for (const each of state.seats) if (each.n !== who.n && each.location === fromName) place(tokenEls.get(each.n), where.get(each.n)); };
  for (const each of state.seats) if (each.n !== who.n && each.location !== fromName) place(tokenEls.get(each.n), where.get(each.n));
  if (reduced() || (state.still !== null && state.still >= LIFT_AT + 100)) closeUp();
  else if (state.still === null) setTimeout(closeUp, LIFT_AT + 100);
  const slot = where.get(who.n);
  place(token, slot);
  const after = { x: parseFloat(token.style.getPropertyValue('--x')), y: parseFloat(token.style.getPropertyValue('--y')), tw: slot.tw };
  announce(`${nameOf(who.n)}, Player ${who.n}, is now in ${who.location}.`);

  if (reduced()) {
    // Reduced motion: no travel. The token is simply there, after a short fade.
    token.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'linear' });
    delete token.dataset.flying;
    delete toPanel.dataset.arriving;
    state.busy = false;
    sync();
    return;
  }

  const distance = Math.hypot(after.x - before.x, after.y - before.y);
  const height = clamp(distance * 0.42, 46, 130);
  const tilt = clamp((after.x - before.x) / 14, -14, 14);
  const at = ms => ms / BEAT;

  // Across the page, in a straight line on the ground...
  token.animate([
    { transform: `translate(${before.x}px, ${before.y}px)`, inlineSize: `${before.tw}px`, blockSize: `${before.tw * 1.25}px`, offset: 0 },
    { transform: `translate(${before.x}px, ${before.y}px)`, inlineSize: `${before.tw}px`, blockSize: `${before.tw * 1.25}px`, offset: at(LIFT_AT), easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
    { transform: `translate(${after.x}px, ${after.y}px)`, inlineSize: `${after.tw}px`, blockSize: `${after.tw * 1.25}px`, offset: at(LAND_AT) },
    { transform: `translate(${after.x}px, ${after.y}px)`, inlineSize: `${after.tw}px`, blockSize: `${after.tw * 1.25}px`, offset: 1 },
  ], { duration: BEAT });
  // ...and up off it and down again: a crouch, the lift, the drop, a squash, a settle.
  body.animate([
    { transform: 'translateY(0) scale(1, 1) rotate(0deg)', offset: 0, easing: 'ease-out' },
    { transform: 'translateY(0) scale(1.16, 0.8) rotate(0deg)', offset: at(80), easing: 'ease-in' },
    { transform: 'translateY(0) scale(0.9, 1.14) rotate(0deg)', offset: at(LIFT_AT), easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
    { transform: `translateY(${-height}px) scale(1.42, 1.42) rotate(${tilt}deg)`, offset: at(LIFT_AT + FLIGHT * 0.5), easing: 'cubic-bezier(0.6, 0, 0.8, 0.3)' },
    { transform: 'translateY(0) scale(0.94, 1.1) rotate(0deg)', offset: at(LAND_AT), easing: 'ease-out' },
    { transform: 'translateY(0) scale(1.22, 0.76) rotate(0deg)', offset: at(LAND_AT + 60), easing: 'ease-out' },
    { transform: 'translateY(0) scale(0.95, 1.07) rotate(0deg)', offset: at(LAND_AT + 170), easing: 'ease-in-out' },
    { transform: 'translateY(0) scale(1, 1) rotate(0deg)', offset: 1 },
  ], { duration: BEAT });

  shadow(before, after);
  const start = { x: before.x + before.tw / 2, y: before.y + before.tw * 0.6 };
  const end = { x: after.x + after.tw / 2, y: after.y + after.tw * 0.6 };
  inkTrail(start, end, height, after.tw);
  puff(start.x, before.y + before.tw * 1.25 * (104 / 120), before.tw, LIFT_AT - 20, 0.7);
  puff(end.x, after.y + after.tw * 1.25 * (104 / 120), after.tw, LAND_AT, 1);
  burst(end.x, after.y + after.tw * 0.7, after.tw, LAND_AT);
  // The room it lands in takes the knock.
  toPanel.animate([
    { scale: '1', translate: '0 0' },
    { scale: '1.022', translate: '0 2px', offset: 0.3 },
    { scale: '0.996', translate: '0 0', offset: 0.65 },
    { scale: '1', translate: '0 0' },
  ], { duration: 280, delay: LAND_AT, easing: 'ease-out' });
  toPanel.querySelector('.cb-caption').animate([
    { rotate: '0deg' }, { rotate: '-3.5deg', offset: 0.35 }, { rotate: '1.5deg', offset: 0.7 }, { rotate: '0deg' },
  ], { duration: 300, delay: LAND_AT, easing: 'ease-out' });

  if (state.still !== null) {
    // A held frame: no timers, only what the moment itself shows.
    if (state.still >= LAND_AT + 40) delete toPanel.dataset.arriving;
    return;
  }
  await wait(LAND_AT + 40);
  if (own) {
    delete toPanel.dataset.arriving;
    toPanel.querySelector('.cb-tag--here').animate([
      { opacity: 0, scale: '1.8', rotate: '-9deg' },
      { opacity: 1, scale: '1', rotate: '0deg' },
    ], { duration: 140, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' });
  }
  await wait(BEAT - LAND_AT - 40);
  for (const node of spent) node.remove();
  spent = [];
  delete token.dataset.flying;
  state.busy = false;
  sync();
}

/** The token's shadow stays on the page while the token is off it: that is what says "lifted". */
function shadow(before, after) {
  const at = ms => ms / BEAT;
  const floor = spot => ({ x: spot.x + spot.tw * 0.08, y: spot.y + spot.tw * 1.25 * (104 / 120) - spot.tw * 0.13 });
  const from = floor(before);
  const to = floor(after);
  const node = h('div', { class: 'cb-shadow' });
  node.style.setProperty('--tw', `${after.tw.toFixed(1)}px`);
  tokensLayer.prepend(node);
  spent.push(node);
  const travel = node.animate([
    { translate: `${from.x}px ${from.y}px`, offset: 0 },
    { translate: `${from.x}px ${from.y}px`, offset: at(LIFT_AT), easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
    { translate: `${to.x}px ${to.y}px`, offset: at(LAND_AT) },
    { translate: `${to.x}px ${to.y}px`, offset: 1 },
  ], { duration: BEAT, fill: 'both' });
  node.animate([
    { opacity: 0, scale: '1', offset: 0 },
    { opacity: 0.5, scale: '1', offset: at(LIFT_AT) },
    { opacity: 0.22, scale: '0.55', offset: at(LIFT_AT + FLIGHT * 0.5) },
    { opacity: 0.5, scale: '1', offset: at(LAND_AT) },
    { opacity: 0, scale: '1.1', offset: at(LAND_AT + 120) },
    { opacity: 0, scale: '1.1', offset: 1 },
  ], { duration: BEAT, fill: 'both' });
  travel.finished.then(() => node.remove(), () => node.remove());
}

function inkTrail(start, end, height, tw) {
  const control = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - height * 2 };
  const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  const strokes = [
    { color: 'var(--ms-color-ink)', width: tw * 0.3, dash: 30, delay: 30, shift: 0 },
    { color: 'var(--ms-color-paper)', width: tw * 0.1, dash: 22, delay: 45, shift: 0 },
    { color: 'var(--ms-color-ink)', width: tw * 0.09, dash: 16, delay: 70, shift: -tw * 0.34 },
    { color: 'var(--ms-color-ink)', width: tw * 0.07, dash: 12, delay: 90, shift: tw * 0.3 },
  ];
  for (const stroke of strokes) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '100');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('transform', `translate(0 ${stroke.shift.toFixed(1)})`);
    path.style.stroke = stroke.color;
    path.style.strokeWidth = `${stroke.width.toFixed(1)}px`;
    path.style.strokeDasharray = `${stroke.dash} 300`;
    path.style.strokeDashoffset = `${stroke.dash}`;
    trails.append(path);
    spent.push(path);
    const animation = path.animate([
      { strokeDashoffset: stroke.dash, opacity: 1 },
      { strokeDashoffset: -100 + stroke.dash * 0.5, opacity: 1, offset: 0.86 },
      { strokeDashoffset: -100, opacity: 0 },
    ], { duration: FLIGHT, delay: LIFT_AT + stroke.delay, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'both' });
    animation.finished.then(() => path.remove(), () => path.remove());
  }
}

function puff(x, floorY, tw, delay, strength) {
  const node = h('div', { class: 'cb-puff' });
  node.style.setProperty('--tw', `${tw.toFixed(1)}px`);
  // Placed by left and top, so that growing it grows it where it is.
  const width = tw * 1.9;
  node.style.left = `${(x - width / 2).toFixed(1)}px`;
  node.style.top = `${(floorY - width * 0.3 * (30 / 36)).toFixed(1)}px`;
  tokensLayer.append(node);
  spent.push(node);
  const animation = node.animate([
    { opacity: 0, scale: '0.45' },
    { opacity: strength, scale: '0.9', offset: 0.3 },
    { opacity: 0, scale: '1.35' },
  ], { duration: 300, delay, easing: 'ease-out', fill: 'both' });
  animation.finished.then(() => node.remove(), () => node.remove());
}

function burst(x, y, tw, delay) {
  const spikes = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const inner = 25 + (index % 2) * 4;
    const outer = index % 2 === 0 ? 47 : 38;
    const spread = 0.1;
    const point = (radius, a) => `${(50 + radius * Math.cos(a)).toFixed(1)},${(50 + radius * Math.sin(a)).toFixed(1)}`;
    spikes.push(`<polygon points="${point(inner, angle - spread)} ${point(outer, angle)} ${point(inner, angle + spread)}"/>`);
  }
  // Paper spikes with an inked edge: they read on a dark wall and on the light floor alike.
  const node = h('div', { class: 'cb-burst', html: `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="#F4EBDD" stroke="#151923" stroke-width="2.2" stroke-linejoin="round">${spikes.join('')}</g></svg>` });
  node.style.setProperty('--tw', `${tw.toFixed(1)}px`);
  const size = tw * 3.2;
  node.style.left = `${(x - size / 2).toFixed(1)}px`;
  node.style.top = `${(y - size / 2).toFixed(1)}px`;
  tokensLayer.append(node);
  spent.push(node);
  const animation = node.animate([
    { opacity: 0, scale: '0.3', rotate: '-8deg' },
    { opacity: 1, scale: '0.85', rotate: '0deg', offset: 0.35 },
    { opacity: 0, scale: '1.15', rotate: '6deg' },
  ], { duration: 260, delay, easing: 'ease-out', fill: 'both' });
  animation.finished.then(() => node.remove(), () => node.remove());
}

/** The page is laid down panel by panel, then the tokens are set on it. */
function opening() {
  if (reduced()) return;
  PAGE_ORDER.forEach((key, index) => {
    const panel = page.querySelector(`.cb-panel[data-room="${key}"]`);
    panel.animate([
      { opacity: 0, translate: '0 16px', scale: '0.94', rotate: '-1.2deg' },
      { opacity: 1, translate: '0 0', scale: '1', rotate: '0deg' },
    ], { duration: 340, delay: index * 60, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)', fill: 'backwards' });
    panel.querySelector('.cb-caption').animate([
      { opacity: 0, scale: '1.6' },
      { opacity: 1, scale: '1' },
    ], { duration: 140, delay: index * 60 + 220, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'backwards' });
  });
  for (const [n, token] of tokenEls) {
    token.querySelector('.cb-token__body').animate([
      { opacity: 0, transform: 'translateY(-34px) scale(0.6, 0.6)' },
      { opacity: 1, transform: 'translateY(0) scale(1.12, 0.86)', offset: 0.7 },
      { opacity: 1, transform: 'translateY(0) scale(1, 1)' },
    ], { duration: 240, delay: 380 + n * 34, easing: 'ease-in', fill: 'backwards' });
  }
}

// ---------- choosing a character: before the match, before any role is dealt ----------

let chooser = null;

/** In the fixture four other players have chosen already; the rest choose after the viewer. */
function alreadyTaken() {
  const others = state.seats.map(each => each.n).filter(n => n !== state.viewer).slice(0, 4);
  return new Map(others.map(n => [n, n])); // character -> seat
}

function openChooser() {
  if (chooser || state.busy) return;
  closePrivate();
  // Choosing a character comes before any role: a new choice means a new deal.
  state.role = null;
  sync();
  const taken = alreadyTaken();
  let pick = state.chosen && !taken.has(state.crew[state.viewer]) ? state.crew[state.viewer] : null;
  const tiles = new Map();
  // PROPOSED words, all of them: the heading, the note, "Your name", "Join".
  const nameInput = h('input', { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false', placeholder: `Player ${state.viewer}`, value: state.chosen ? state.names[state.viewer] : '' });
  const join = h('button', { class: 'cb-button cb-button--primary', type: 'button', onclick: () => pick !== null && closeChooser(pick, nameInput.value) }, 'Join');
  const paint = () => {
    for (const [id, tile] of tiles) {
      const holder = taken.get(id);
      const stateName = holder ? 'taken' : id === pick ? 'mine' : 'free';
      tile.dataset.state = stateName;
      tile.disabled = !!holder;
      tile.setAttribute('aria-pressed', String(stateName === 'mine'));
      tile.querySelector('.cb-choose__who').textContent = holder ? nameOf(holder) : stateName === 'mine' ? 'You' : '';
    }
    join.disabled = pick === null;
  };
  const grid = h('div', { class: 'cb-choose__grid' }, CREW.map(each => {
    const tile = h('button', { class: 'cb-choose__tile', type: 'button', 'aria-label': `Character ${each.id}, ${each.sign}`, onclick: () => {
      if (pick !== each.id && !reduced()) tile.animate([{ scale: '1' }, { scale: '1.08', offset: 0.4 }, { scale: '1' }], { duration: 200, easing: 'ease-out' });
      pick = each.id;
      paint();
    } }, h('img', { src: each.art, alt: '' }), h('span', { class: 'cb-choose__sign' }, each.sign), h('span', { class: 'cb-choose__who' }));
    tiles.set(each.id, tile);
    return tile;
  }));
  nameInput.addEventListener('keydown', event => { if (event.key === 'Enter' && pick !== null) closeChooser(pick, nameInput.value); });
  chooser = h('div', { class: 'cb-choose', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cb-choose-title' },
    h('div', { class: 'cb-choose__sheet' },
      h('h1', { class: 'cb-choose__title', id: 'cb-choose-title' }, 'Choose your character'),
      h('p', { class: 'cb-choose__note' }, 'It is how you look on the board, with your name under it. It says nothing about your role.'),
      grid,
      h('label', { class: 'cb-choose__name' }, h('span', null, 'Your name'), nameInput),
      h('div', { class: 'cb-row' }, join)));
  paint();
  app.append(chooser);
  for (const node of [page, hand, phase]) node.inert = true;
  if (!reduced()) {
    // Dealt like cards.
    [...tiles.values()].forEach((tile, index) => tile.animate([
      { opacity: 0, translate: '0 26px', rotate: `${index % 2 === 0 ? -6 : 6}deg` },
      { opacity: 1, translate: '0 0', rotate: '0deg' },
    ], { duration: 240, delay: 80 + index * 45, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)', fill: 'backwards' }));
  }
  const sheet = chooser.querySelector('.cb-choose__sheet');
  sheet.tabIndex = -1;
  sheet.focus({ preventScroll: true });
}

function closeChooser(pick, typed) {
  const taken = alreadyTaken();
  const crew = {};
  for (const [id, n] of taken) crew[n] = id;
  crew[state.viewer] = pick;
  const left = CREW.map(each => each.id).filter(id => id !== pick && !taken.has(id));
  for (const each of state.seats) if (!(each.n in crew)) crew[each.n] = left.shift();
  state.crew = crew;
  state.names = fixtureNames();
  state.names[state.viewer] = typed.trim().slice(0, 12) || `Player ${state.viewer}`;
  state.chosen = true;
  const sheet = chooser;
  chooser = null;
  for (const node of [page, hand, phase]) node.inert = false;
  const gone = () => sheet.remove();
  if (reduced()) gone();
  else sheet.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 22px' }], { duration: 180, easing: 'ease-in' }).finished.then(gone, gone);
  sync();
  layoutTokens();
  opening();
  // The page is laid, the pieces are set down, and then a card is dealt.
  setTimeout(dealRole, reduced() ? 0 : 980);
}

// ---------- the role card: private, face down until the player turns it up ----------

const textOf = (() => {
  const cache = new Map();
  return url => {
    if (!cache.has(url)) cache.set(url, fetch(url).then(response => response.text()));
    return cache.get(url);
  };
})();
const inline = text => text.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
// The summary lines that exist: proposed copy with its rule sources (the Officer only, so far).
let roleCopy = {};
fetch('/contract/copy.en.proposed.json').then(response => response.json()).then(copy => { roleCopy = copy.roleCard ?? {}; }).catch(() => {});
const TEAM_ACCENT = { Blue: '#70AFFF', Red: '#FF8C8C', Alien: '#C4A4FF' }; // color.factionPrivateOrRevealed

/** Roles are dealt at random, after the character is chosen, and independently of it. */
function dealRole() {
  const me = viewerSeat();
  if (!me) return;
  state.role = state.roleWanted === 'random' ? ROLES[Math.floor(Math.random() * ROLES.length)].key : state.roleWanted;
  sync();
  // PROPOSED words. They say that a card came, never what is on it.
  announce('Your role card has been dealt. It is private.');
  const card = hand.querySelector('.cb-rolecard');
  if (card && !reduced()) {
    card.animate([
      { opacity: 0, translate: '-40px -260px', rotate: '-24deg', scale: '1.25' },
      { opacity: 1, translate: '0 6px', rotate: '7deg', scale: '1', offset: 0.72 },
      { opacity: 1, translate: '0 0', rotate: '4deg', scale: '1' },
    ], { duration: 420, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' });
    hand.querySelector('.cb-card').animate([{ translate: '0 0' }, { translate: '0 3px', offset: 0.5 }, { translate: '0 0' }], { duration: 180, delay: 300, easing: 'ease-out' });
  }
}

let privateSheet = null;

async function openPrivate() {
  const me = viewerSeat();
  if (privateSheet || !me || state.role === null) return;
  const role = ROLES.find(each => each.key === state.role);
  const crew = CREW.find(each => each.id === state.crew[me.n]);
  const [personText, deviceText] = await Promise.all([textOf(crew.art), textOf(role.art)]);
  if (privateSheet) return;
  // The player's own character, as on the board but without its stand, and the device added to it.
  const person = h('div', { class: 'cb-role__person', html: inline(personText) });
  person.querySelector('svg').setAttribute('viewBox', '5 0 86 95');
  const device = h('div', { class: 'cb-role__device', html: inline(deviceText) });
  const words = roleCopy[role.role] ?? null;
  const card = h('div', { class: 'cb-role', style: `--cb-team: ${TEAM_ACCENT[role.team]}` },
    h('div', { class: 'cb-role__face cb-role__face--back', html: ICON.eyeClosed }),
    h('div', { class: 'cb-role__face cb-role__face--front' },
      h('div', { class: 'cb-role__art' }, person, device),
      h('div', { class: 'cb-role__plate' },
        h('p', { class: 'cb-role__name' }, role.role),
        h('p', { class: 'cb-role__team' }, role.team === 'Alien' ? 'Alien' : `${role.team} team`))));
  privateSheet = h('div', { class: 'cb-private', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Private' },
    h('div', { class: 'cb-private__sheet' },
      h('div', { class: 'cb-private__head' },
        h('h2', { class: 'cb-private__title' }, 'Private'),
        h('button', { class: 'cb-button', type: 'button', onclick: closePrivate }, h('span', { html: ICON.eyeOpen }).firstChild, 'Hide private information')),
      card,
      words && h('p', { class: 'cb-private__text' }, `${words.summary} ${words.limit}`),
      // PROPOSED.
      h('p', { class: 'cb-private__note' }, 'Only you see the device. On the board, everyone sees your character without it.')));
  app.append(privateSheet);
  privateSheet.querySelector('.cb-button').focus({ preventScroll: true });
  if (reduced()) return;
  // Up from the hand, turned over, and then the device is added: about 0.9 s in all.
  privateSheet.querySelector('.cb-private__sheet').animate([{ translate: '0 100%' }, { translate: '0 0' }], { duration: 220, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)' });
  card.animate([{ transform: 'rotateY(180deg) scale(0.92)' }, { transform: 'rotateY(0deg) scale(1)' }], { duration: 280, delay: 170, easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)', fill: 'backwards' });
  device.animate([
    { opacity: 0, translate: '42% 36%', rotate: '28deg' },
    { opacity: 1, translate: '0 0', rotate: '-8deg', offset: 0.7 },
    { opacity: 1, translate: '0 0', rotate: '0deg' },
  ], { duration: 340, delay: 460, easing: 'cubic-bezier(0.2, 1.3, 0.4, 1)', fill: 'backwards' });
  for (const light of device.querySelectorAll('[id$="-glow"], [id$="-lit"], [id$="-nodes"]')) {
    light.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 740, easing: 'linear', fill: 'backwards' });
  }
  person.animate([{ scale: '1' }, { scale: '1.03', offset: 0.4 }, { scale: '1' }], { duration: 200, delay: 700, easing: 'ease-out' });
}

function closePrivate() {
  if (!privateSheet) return;
  const sheet = privateSheet;
  privateSheet = null;
  const gone = () => sheet.remove();
  if (reduced()) gone();
  else sheet.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 30px' }], { duration: 150, easing: 'ease-in' }).finished.then(gone, gone);
  hand.querySelector('.cb-rolecard')?.focus({ preventScroll: true });
}
// The page going to the background turns the card face down. Best-effort privacy, not screenshot protection.
document.addEventListener('visibilitychange', () => { if (document.hidden) closePrivate(); });

// ---------- exploration controls ----------

function drawControls() {
  const host = document.getElementById('dev-controls');
  const option = (value, label, current) => h('option', { value, selected: value === current }, label);
  const check = (label, checked, onchange) => h('label', null, h('input', { type: 'checkbox', checked, onchange: event => onchange(event.target.checked) }), label);
  host.replaceChildren(
    h('label', null, 'Room colors',
      h('select', { onchange: async event => { state.set = event.target.value; await paintRooms(); } },
        option('picture', 'As in your picture', state.set), option('apart', 'Kept away from the team colors', state.set), option('steel', 'As drawn (steel)', state.set))),
    check('Reduce motion', root.dataset.motion === 'reduced', on => { root.dataset.motion = on ? 'reduced' : 'full'; }),
    state.surface === 'player' && h('label', null, 'This phone is',
      h('select', { onchange: event => { state.viewer = Number(event.target.value); restart(); } },
        option('1', 'Player 1', String(state.viewer)), option('5', 'Player 5, the Captain', String(state.viewer)))),
    state.surface === 'player' && h('button', { type: 'button', onclick: () => { document.getElementById('dev').open = false; openChooser(); } }, 'Choose my character again'),
    state.surface === 'player' && h('label', null, 'My role card',
      h('select', { onchange: event => { state.roleWanted = event.target.value; if (state.chosen) { closePrivate(); dealRole(); } } },
        option('random', 'Dealt at random', state.roleWanted), ROLES.map(each => option(each.key, each.role, state.roleWanted)))),
    h('button', { type: 'button', onclick: nextRound }, 'Next round: everyone may move again'),
    h('button', { type: 'button', onclick: otherPlayerMoves }, 'Another player moves'),
    state.surface === 'player' && check('The server refuses my next move', state.refuseNext, on => { state.refuseNext = on; }),
    check('Connection lost', state.stale, on => { state.stale = on; if (on && state.mode !== 'accepted') { state.mode = 'idle'; state.choice = null; } sync(); }),
    h('button', { type: 'button', onclick: restart }, 'Start again'),
    h('p', { class: 'cb-dev__note' }, h('a', { href: state.surface === 'table' ? '?' : '?surface=table', style: 'color: inherit' }, state.surface === 'table' ? 'A player’s phone' : 'The shared display'), ' · ', h('a', { href: 'art-sheet.html', style: 'color: inherit' }, 'The room drawings')),
  );
}

function nextRound() {
  if (state.busy) return;
  state.round = state.round >= 5 ? 1 : state.round + 1;
  for (const each of state.seats) each.moved = false;
  if (state.mode !== 'idle') { state.mode = 'idle'; state.choice = null; }
  sync();
}
function restart() {
  if (state.busy) return;
  state.seats = startingSeats();
  state.round = 2;
  state.mode = 'idle';
  state.choice = null;
  sync();
  layoutTokens();
  opening();
}

// ---------- start ----------

buildPage();
const pictures = CREW.map(each => { const image = new Image(); image.src = each.art; return image.decode().catch(() => {}); });
// Every phone asks for all nine characters and all nine role devices, here, before anything is
// dealt. What a device asks for must not depend on its role: a file fetched when the card is
// turned up would tell anyone watching requests which role it is.
const drawings = [...CREW, ...ROLES].map(each => textOf(each.art).catch(() => ''));
await Promise.all([loadBundles(['public-board']), paintRooms(), ...pictures, ...drawings]);
// Tokens are set down where they stand; they do not slide there from a corner of the page.
tokensLayer.dataset.settling = '';
sync();
layoutTokens();
requestAnimationFrame(() => requestAnimationFrame(() => { layoutTokens(); delete tokensLayer.dataset.settling; }));
new ResizeObserver(() => { fitArt(); if (!state.busy) layoutTokens(); }).observe(page);
addEventListener('resize', () => { if (state.mode === 'idle' && hand.firstChild && viewerSeat() && destinations(viewerSeat()).length > 0 && !state.stale) reserveHand(); });
window.__board = { state, otherPlayerMoves, nextRound, restart, pressRoom, confirmMove, sync, openChooser, closeChooser, dealRole, openPrivate, closePrivate };
if (state.still === null) {
  // A player's phone starts where a match does: choosing a character. ?skip goes straight to the board.
  if (state.surface === 'player' && !query.has('skip')) openChooser();
  else {
    opening();
    // ?skip&peek=<role> lays the board, deals that role and turns the card up: for looking at one.
    if (state.surface === 'player') {
      state.chosen = true;
      dealRole();
      if (query.has('peek')) {
        await openPrivate();
        // ?peekstill=<ms> holds the turning-up of the card at one moment: a storyboard frame.
        if (query.has('peekstill')) {
          for (const animation of document.getAnimations()) {
            animation.pause();
            animation.currentTime = Number(query.get('peekstill'));
          }
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
      }
    }
  }
} else {
  // Let the page reach its size before the frame is set up, and set it up without transitions.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  tokensLayer.style.setProperty('--ms-motion-card', '0ms');
  fitArt();
  layoutTokens();
  for (const animation of document.getAnimations()) if (animation instanceof CSSTransition) animation.finish();
  const me = viewerSeat() ?? seat(1);
  const from = me.location;
  state.choice = 'Room B';
  me.location = 'Room B';
  me.moved = true;
  state.mode = 'accepted';
  await publicMove(me, from, { own: state.surface === 'player' });
  for (const animation of document.getAnimations()) {
    animation.pause();
    animation.currentTime = state.still;
  }
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
window.__designReady = true;
