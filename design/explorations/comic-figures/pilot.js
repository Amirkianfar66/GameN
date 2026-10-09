// mothership:dev-only
//
// The comic-figure pilot on a phone: the five approved rooms as one comic page, and the nine
// characters as full-body comic figures posed in them. A synthetic fixture, not the game.
//
//   ?scenario=spread|full|crowded   the public state shown
//   ?motion=reduced                 the reduced-motion alternative (also the system setting)
//   ?tags=off                       no name plates
//   ?hits=show                      draws every press area
//   ?pick=<seat>[&confirm]          a picked character, for review pictures
//
// Tap a character to pick them; the tray confirms. Tap Room A or Room B to move there.
// Everything on the board comes from public facts; the pick is the viewer's own and is drawn
// only on this board.

import { loadBundles } from '../../prototypes/js/bundles.js';
import { ART, ART_H, CAST, MOVE_ROOMS, POSE_BOX, ROOMS, ROOM_ORDER, SCENARIOS, figureBox, layout, pressBoxes } from './scene.js';
import { POSES } from './poses.mjs';

window.__designReady = false;
const params = new URLSearchParams(location.search);
const reducedBySystem = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scenarioId = SCENARIOS[params.get('scenario')] ? params.get('scenario') : 'spread';
const S = {
  scenario: scenarioId,
  motion: params.get('motion') === 'reduced' || (reducedBySystem && params.get('motion') !== 'full') ? 'reduced' : 'full',
  tags: params.get('tags') === 'off' ? 'off' : 'on',
  hits: params.get('hits') === 'show' ? 'show' : 'hide',
  pick: params.has('pick') ? Number(params.get('pick')) : null,
  confirmed: params.has('confirm'),
  notice: null,
  ...structuredClone(SCENARIOS[scenarioId]),
};
const cast = seat => CAST.find(entry => entry.seat === seat);
const roomOf = seat => ROOM_ORDER.find(room => (S.rooms[room] ?? []).includes(seat));

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}
const pct = value => `${(value * 100).toFixed(3)}%`;
const figureUrl = (character, pose, layer = '') => new URL(`./figures/${character}-${pose}${layer}.svg`, import.meta.url).href;

// ---------- the phone ----------
const rooms = new Map();
function roomPanel(room) {
  const spec = ROOMS[room];
  const [x0, y0, w, hgt] = spec.view;
  const box = { left: pct(-x0 / w), top: pct(-y0 / hgt), width: pct(ART / w), height: pct(ART_H / hgt) };
  const move = MOVE_ROOMS.includes(room);
  const face = h('span', { class: 'cf-tag__face' }, spec.location, move ? h('span', { 'aria-hidden': 'true' }, ' ↗') : null);
  const tag = h('h3', { class: `cf-tag${move ? '' : ' cf-tag--fixed'}` },
    move ? h('button', { type: 'button', class: 'cf-tag__move', 'aria-label': `Move to ${spec.location}`, onclick: () => moveTo(room, tag) }, face) : face);
  const panel = h('section', { class: 'cf-room', 'data-room': room, 'aria-label': spec.location, style: { aspectRatio: `${w} / ${hgt}` } },
    h('div', { class: 'cf-art', 'aria-hidden': 'true', style: box }),
    spec.prop ? h('div', { class: 'cf-prop', 'aria-hidden': 'true', style: { ...box, '--z': String(spec.prop.z) } }) : null,
    tag);
  rooms.set(room, { panel, spec });
  return panel;
}

const tray = h('div', { class: 'cf-tray', 'aria-live': 'polite' });
const board = h('div', { class: 'cf-board', 'data-board': 'own', 'data-motion': S.motion, 'data-tags': S.tags, 'data-hits': S.hits }, ROOM_ORDER.map(roomPanel));
const phone = h('div', { class: 'cf-phone', id: 'cf-phone', 'data-motion': S.motion },
  h('div', { class: 'cf-status' }, h('span', {}, 'Mothership'), h('small', {}, 'Pilot · synthetic')),
  board, tray);

// ---------- placing the figures ----------
const els = new Map();
const minTarget = 46;

function placeStyle(node, entry, room) {
  const [x0, y0, w, hgt] = ROOMS[room].view;
  const [bx, by, bw, bh] = figureBox(entry);
  const { box: [minX, minY, fw, fh], anchor: [ax, ay] } = POSE_BOX[entry.pose];
  node.style.left = pct((bx - x0) / w);
  node.style.top = pct((by - y0) / hgt);
  node.style.width = pct(bw / w);
  node.style.height = pct(bh / hgt);
  node.style.setProperty('--ox', pct((entry.mirror ? fw - (ax - minX) : ax - minX) / fw));
  node.style.setProperty('--oy', pct((ay - minY) / fh));
  node.style.setProperty('--breath', `${(-entry.seat * 0.73).toFixed(2)}s`);
  node.dataset.mirror = String(entry.mirror);
}

const HEAD = { standing: [58, 36], standingFolded: [58, 36], standingBack: [58, 36], leaning: [70, 41], inBed: [64, 45], onBench: [58, 64], atConsole: [78, 50] };

/**
 * Where a character's plate sits, in the drawing's units: over the head, clear of the hair;
 * beside the head, or under the seat, where the station says so.
 */
function plateAt(entry) {
  const head = HEAD[entry.pose];
  const [ax, ay] = POSE_BOX[entry.pose].anchor;
  const toX = x => entry.at[0] + (x - ax) * (entry.mirror ? -1 : 1) * entry.scale;
  const toY = y => entry.at[1] + (y - ay) * entry.scale;
  if (entry.plate === 'right') return { x: toX(head[0] + 22), y: toY(head[1] + 4), side: 'right' };
  if (entry.plate === 'below') return { x: toX(head[0] + 14), y: toY(200), side: 'below' };
  return { x: toX(head[0]), y: toY(head[1] - 26), side: 'above' };
}

/** The plate's words and markers: seat number, name, and the public markers of the seat. */
function fillPlate(node, entry) {
  const who = cast(entry.seat);
  const badges = [];
  if (S.captain === entry.seat) badges.push('captain');
  if (S.injured.includes(entry.seat)) badges.push('injured');
  if (S.jailed.includes(entry.seat)) badges.push('jailed');
  node.toggleAttribute('data-self', S.viewer === entry.seat);
  node.replaceChildren(h('span', { class: 'cf-plate__num' }, String(entry.seat)), who.name, ...badges.map(badge => h('span', { class: 'cf-plate__badge', 'data-badge': badge })));
}

function label(entry) {
  const who = cast(entry.seat);
  const facts = [S.captain === entry.seat ? 'Captain' : null, S.injured.includes(entry.seat) ? 'Injured' : null, S.jailed.includes(entry.seat) ? 'Jailed' : null, S.viewer === entry.seat ? 'you' : null].filter(Boolean);
  return `${who.name}, Player ${entry.seat}, ${ROOMS[entry.room].location}${facts.length ? `, ${facts.join(', ')}` : ''}`;
}

function create(entry) {
  const { panel } = rooms.get(entry.room);
  const character = cast(entry.seat).character;
  const body = h('div', { class: 'cf-fig', 'data-seat': entry.seat, 'data-layer': 'body', 'aria-hidden': 'true' }, h('img', { alt: '', src: figureUrl(character, entry.pose), draggable: 'false' }));
  const hit = h('button', { type: 'button', class: 'cf-hit', 'data-seat': entry.seat, onclick: () => pick(entry.seat) });
  const plateEl = h('span', { class: 'cf-plate', 'aria-hidden': 'true', 'data-seat': entry.seat });
  panel.append(body, plateEl, hit);
  return { room: entry.room, pose: null, body, front: null, plate: plateEl, hit };
}

function update(el, entry, boxes) {
  const { panel, spec } = rooms.get(entry.room);
  const character = cast(entry.seat).character;
  if (el.pose !== entry.pose) {
    el.body.querySelector('img').src = figureUrl(character, entry.pose);
    el.front?.remove();
    el.front = POSE_BOX[entry.pose].front ? h('div', { class: 'cf-fig', 'data-seat': entry.seat, 'data-layer': 'front', 'aria-hidden': 'true' }, h('img', { alt: '', src: figureUrl(character, entry.pose, '.front'), draggable: 'false' })) : null;
    if (el.front) panel.append(el.front);
    el.pose = entry.pose;
  }
  placeStyle(el.body, entry, entry.room);
  el.body.style.setProperty('--z', String(Math.round(entry.z)));
  if (el.front) {
    placeStyle(el.front, entry, entry.room);
    el.front.style.setProperty('--z', String((spec.prop?.z ?? entry.z) + 1));
  }
  const [x0, y0, w, hgt] = spec.view;
  fillPlate(el.plate, entry);
  // The press area, never under one 44 px target in this panel, never over another's.
  const [hx, hy, hw, hh] = boxes.get(entry.seat);
  const left = Math.max(hx, x0), top = Math.max(hy, y0), right = Math.min(hx + hw, x0 + w), bottom = Math.min(hy + hh, y0 + hgt);
  Object.assign(el.hit.style, { left: pct((left - x0) / w), top: pct((top - y0) / hgt), width: pct((right - left) / w), height: pct((bottom - top) / hgt) });
  el.hit.setAttribute('aria-label', label(entry));
  el.hit.setAttribute('aria-pressed', String(S.pick === entry.seat));
  for (const node of [el.body, el.front, el.plate]) {
    if (!node) continue;
    if (S.pick === entry.seat) node.dataset.pick = S.confirmed ? 'done' : (node.dataset.pick ?? 'on');
    else delete node.dataset.pick;
  }
}

/** Removes a node when its cue has played; at once if nothing plays. A paused cue keeps it, for storyboards. */
function whenPlayed(node, done) {
  requestAnimationFrame(() => {
    if (node.getAnimations().length === 0) { done(); return; }
    const end = event => { if (event.target !== node) return; node.removeEventListener('animationend', end); done(); };
    node.addEventListener('animationend', end);
  });
}

const meets = (a, b, gap = 0) => a.left < b.left + b.width + gap && b.left < a.left + a.width + gap && a.top < b.top + b.height + gap && b.top < a.top + a.height + gap;

/**
 * The plates of one room, in panel pixels: each over its character's head (or beside it, or
 * under the seat), whole inside the panel, clear of the room's caption and of the plates of
 * the plates laid before it. A plate that meets another is nudged sideways, up or down, by
 * the least that frees it.
 */
function layoutPlates(room, entries) {
  const { panel, spec } = rooms.get(room);
  const [x0, y0, w, hgt] = spec.view;
  const kx = panel.clientWidth / w, ky = panel.clientHeight / hgt;
  const frame = panel.getBoundingClientRect();
  const face = panel.querySelector('.cf-tag__face').getBoundingClientRect();
  const caption = { left: face.left - frame.left, top: face.top - frame.top, width: face.width, height: face.height };
  const laid = [];
  const inset = 4;
  // A bed's or a bench's plate has one good place, so it is laid first; then from the front back.
  for (const entry of [...entries].sort((a, b) => Number(b.special) - Number(a.special) || b.z - a.z)) {
    const node = els.get(entry.seat).plate;
    const pw = node.offsetWidth, ph = node.offsetHeight;
    const at = plateAt(entry);
    const x = (at.x - x0) * kx, y = (at.y - y0) * ky;
    const start = {
      left: at.side === 'right' ? x : x - pw / 2,
      top: at.side === 'above' ? y - ph : at.side === 'right' ? y - ph / 2 : y,
      width: pw, height: ph,
    };
    const inside = box => ({ ...box, left: Math.min(Math.max(box.left, inset), panel.clientWidth - inset - pw), top: Math.min(Math.max(box.top, inset), panel.clientHeight - inset - ph) });
    const free = box => !meets(box, caption, 2) && !laid.some(other => meets(box, other, 2));
    let best = inside(start);
    if (!free(best)) {
      const tries = [];
      for (const other of [caption, ...laid]) {
        tries.push({ ...best, left: other.left - pw - 3 }, { ...best, left: other.left + other.width + 3 }, { ...best, top: other.top - ph - 3 }, { ...best, top: other.top + other.height + 3 });
      }
      const fits = tries.map(inside).filter(free).sort((a, b) => Math.hypot(a.left - start.left, a.top - start.top) - Math.hypot(b.left - start.left, b.top - start.top));
      if (fits.length) best = fits[0];
    }
    laid.push(best);
    node.style.left = `${best.left.toFixed(1)}px`;
    node.style.top = `${best.top.toFixed(1)}px`;
  }
}

function retire(el) {
  el.plate.remove();
  el.hit.remove();
  for (const node of [el.body, el.front]) {
    if (!node) continue;
    node.dataset.cue = 'leave';
    whenPlayed(node, () => node.remove());
  }
}

function puff(entry) {
  const { panel, spec } = rooms.get(entry.room);
  const [x0, y0, w, hgt] = spec.view;
  const size = 150 * entry.scale;
  const node = h('div', { class: 'cf-puff', 'aria-hidden': 'true', style: { left: pct((entry.at[0] - x0) / w), top: pct((entry.at[1] - y0) / hgt), width: pct(size / w), height: pct((size * 0.5) / hgt) } });
  panel.append(node);
  whenPlayed(node, () => node.remove());
}

function place({ mover = null } = {}) {
  const placed = layout(S);
  const boxes = pressBoxes(placed, room => minTarget / (rooms.get(room).panel.clientWidth / ROOMS[room].view[2]));
  const seen = new Set();
  for (const entry of placed) {
    seen.add(entry.seat);
    let el = els.get(entry.seat);
    if (el && el.room !== entry.room) { retire(el); el = null; }
    const fresh = !el;
    if (fresh) { el = create(entry); els.set(entry.seat, el); }
    update(el, entry, boxes);
    if (fresh) {
      if (entry.seat === mover) {
        for (const node of [el.body, el.front]) {
          if (!node) continue;
          node.dataset.cue = 'land';
          whenPlayed(node, () => delete node.dataset.cue);
        }
        puff(entry);
      }
      requestAnimationFrame(() => requestAnimationFrame(() => { for (const node of [el.body, el.front, el.plate]) if (node) node.dataset.placed = ''; }));
    }
  }
  for (const [seat, el] of els) if (!seen.has(seat)) { retire(el); els.delete(seat); }
  for (const room of ROOM_ORDER) layoutPlates(room, placed.filter(entry => entry.room === room));
  renderTray();
}

// ---------- what the viewer does ----------
function pick(seat) {
  S.notice = null;
  S.pick = S.pick === seat ? null : seat;
  S.confirmed = false;
  for (const el of els.values()) for (const node of [el.body, el.front, el.plate]) if (node) delete node.dataset.pick;
  place();
  const el = els.get(seat);
  if (S.pick === seat) {
    for (const node of [el.body, el.front]) if (node) node.dataset.pick = 'new';
    setTimeout(() => { if (S.pick === seat && !S.confirmed) for (const node of [el.body, el.front]) if (node) node.dataset.pick = 'on'; }, 260);
  }
}

function confirmPick() {
  if (S.pick === null) return;
  S.confirmed = true;
  place();
}

function clearPick() {
  S.pick = null;
  S.confirmed = false;
  place();
}

/** The viewer's piece is lifted off its room. Returns false when the move is refused. */
function leave(room, tag) {
  const from = roomOf(S.viewer);
  if (from === room || !MOVE_ROOMS.includes(from)) {
    // Refused in words, on every motion setting; the caption also shakes in full motion.
    S.notice = from === room ? `${cast(S.viewer).name} is already in ${ROOMS[room].location}.` : `${cast(S.viewer).name} cannot move from the ${ROOMS[from].location}.`;
    renderTray();
    tag.dataset.nope = '';
    whenPlayed(tag.querySelector('.cf-tag__face'), () => delete tag.dataset.nope);
    return false;
  }
  S.notice = null;
  S.rooms[from] = S.rooms[from].filter(seat => seat !== S.viewer);
  S.rooms[room] = [...S.rooms[room], S.viewer];
  if (S.pick === S.viewer) S.pick = null;
  const leaving = els.get(S.viewer);
  if (leaving) { retire(leaving); els.delete(S.viewer); }
  return true;
}

/** ... and set down in the other, which makes room: the others take their new stations. */
const arrive = () => place({ mover: S.viewer });

function moveTo(room, tag) {
  if (leave(room, tag)) setTimeout(arrive, S.motion === 'full' ? 200 : 80);
}

function renderTray() {
  tray.replaceChildren();
  if (S.pick === null) {
    tray.append(
      S.notice ? h('p', { class: 'cf-tray__notice' }, S.notice) : null,
      h('p', { class: 'cf-tray__hint' }, 'Tap a character to pick them. Tap Room A or Room B to move there.'),
      h('p', { class: 'cf-tray__note' }, 'Pilot: a look, not the game\'s rules. The actions, their targets and their words are on the board-motion prototype.'));
    return;
  }
  const who = cast(S.pick);
  const face = h('span', { class: 'cf-tray__face', 'aria-hidden': 'true', style: { backgroundImage: `url("${figureUrl(who.character, 'standing')}")` } });
  const row = h('div', { class: 'cf-tray__row', 'data-new': '' },
    h('span', { class: 'cf-tray__who' }, face, h('span', {}, `${S.confirmed ? 'Picked' : 'Pick'} ${who.name}`, h('br'), h('small', {}, `Player ${who.seat}`))),
    S.confirmed ? h('button', { type: 'button', class: 'cf-btn', onclick: clearPick }, 'Clear')
      : [h('button', { type: 'button', class: 'cf-btn', onclick: clearPick }, 'Cancel'), h('button', { type: 'button', class: 'cf-btn cf-btn--go', onclick: confirmPick }, 'Confirm')]);
  tray.append(row);
}

// ---------- the page around the phone ----------
function controls() {
  const go = (key, value) => { const url = new URL(location.href); if (value === null) url.searchParams.delete(key); else url.searchParams.set(key, value); location.href = url.href; };
  const select = h('select', { id: 'cf-scenario', onchange: event => go('scenario', event.target.value) },
    Object.entries(SCENARIOS).map(([id, scenario]) => h('option', { value: id, selected: id === S.scenario }, scenario.title)));
  const toggle = (id, text, on, flip) => h('label', { class: 'cf-check' }, h('input', { type: 'checkbox', id, checked: on, onchange: flip }), text);
  return h('aside', { class: 'cf-controls', 'aria-label': 'Fixture controls' },
    h('h2', {}, 'Fixture'),
    h('label', {}, 'Public state', select),
    toggle('cf-reduced', 'Reduced motion', S.motion === 'reduced', () => go('motion', S.motion === 'reduced' ? 'full' : 'reduced')),
    toggle('cf-tags', 'Name plates', S.tags === 'on', () => go('tags', S.tags === 'on' ? 'off' : null)),
    toggle('cf-hits', 'Show press areas', S.hits === 'show', () => go('hits', S.hits === 'show' ? null : 'show')),
    h('p', {}, 'Everything here is synthetic. The viewer is Player 7, Juno. Nobody\'s role is in this page.'));
}

function sheet() {
  const grid = h('div', { class: 'cf-grid', role: 'table', 'aria-label': 'Seven poses of the nine characters' },
    h('span', { class: 'cf-grid__head', role: 'columnheader' }, 'Pose'),
    CAST.map(who => h('span', { class: 'cf-grid__head', role: 'columnheader' }, `${who.seat} ${who.name}`)));
  for (const [pose, spec] of Object.entries(POSES)) {
    grid.append(h('span', { class: 'cf-grid__pose', role: 'rowheader' }, pose, h('small', {}, spec.about)));
    for (const who of CAST) {
      grid.append(h('span', { class: 'cf-cell', role: 'cell' },
        h('img', { alt: `${who.name}, ${pose}`, src: figureUrl(who.character, pose) }),
        POSE_BOX[pose].front ? h('img', { alt: '', src: figureUrl(who.character, pose, '.front') }) : null));
    }
  }
  return h('section', { class: 'cf-sheet', id: 'cf-sheet' },
    h('h2', {}, 'Seven poses, nine characters'),
    h('p', {}, 'One drawing rig: a pose is a skeleton and a drawing order, a character is a head, a skin, hair and the colors of the patches. So 7 poses of 9 characters are 63 drawings made from 16 pieces, and an eighth pose is one more skeleton, not nine more drawings.'),
    grid);
}

function compare() {
  return h('section', { class: 'cf-notes', id: 'cf-compare' },
    h('h2', {}, 'Today and the pilot'),
    h('div', { class: 'cf-compare' },
      h('figure', {}, h('div', { class: 'cf-compare__frame' }, h('div', { class: 'cf-compare__standee', role: 'img', 'aria-label': 'Vega, the approved standee' })), h('figcaption', {}, 'Approved 7 October: a bust on a card standee (design/source/crew/crew-1.svg)')),
      h('figure', {}, h('div', { class: 'cf-compare__frame' }, h('img', { alt: 'Vega, the pilot comic figure, standing', src: figureUrl('c1', 'standing') })), h('figcaption', {}, 'Pilot: the same character, full body, inked, cel shadow, halftone and hatching')),
      h('figure', {}, h('div', { class: 'cf-compare__frame' }, h('img', { alt: 'Vega leaning over the chart table', src: figureUrl('c1', 'leaning') }), h('img', { alt: '', src: figureUrl('c1', 'leaning', '.front') })), h('figcaption', {}, 'Pilot: posed by the room. The Captain leans over the chart table'))));
}

const page = h('main', { class: 'cf-page' },
  h('header', { class: 'cf-intro' },
    h('span', { class: 'cf-flag' }, 'Exploration · dev only · synthetic'),
    h('h1', {}, 'Comic crew pilot'),
    h('p', {}, 'Can the characters feel like the owner\'s comic page, people in real positions in each room? A pilot of the nine characters as full-body comic figures, posed by the room they are in, on the approved rooms. It is not an asset, a contract or the game.')),
  h('div', { class: 'cf-stage' }, phone, controls()),
  compare(),
  sheet());
document.querySelector('#app').replaceWith(page);

// ---------- art, then the first placement ----------
async function loadArt() {
  await loadBundles(['public-board']);
  await new Promise(resolve => {
    const link = h('link', { rel: 'stylesheet', href: new URL('../../board-motion/assets/board-motion.art.css', import.meta.url).href });
    link.addEventListener('load', () => { document.documentElement.dataset.art = `${document.documentElement.dataset.art ?? ''} board-motion`.trim(); resolve(); }, { once: true });
    link.addEventListener('error', resolve, { once: true });
    document.head.append(link);
  });
}

await loadArt();
place();
await Promise.all([...document.querySelectorAll('img')].map(img => img.decode().catch(() => {})));

/** Checks the board as drawn: every press area at least 44 x 44 px, none overlapping another. */
function audit() {
  const problems = [];
  const boxes = [...board.querySelectorAll('.cf-hit')].map(node => ({ seat: node.dataset.seat, room: node.closest('.cf-room').dataset.room, rect: node.getBoundingClientRect() }));
  for (const box of boxes) {
    if (box.rect.width < 44 || box.rect.height < 44) problems.push(`Player ${box.seat}: press area ${box.rect.width.toFixed(1)} x ${box.rect.height.toFixed(1)} px`);
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i].rect, b = boxes[j].rect;
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
      if (overlap) problems.push(`Players ${boxes[i].seat} and ${boxes[j].seat}: press areas overlap`);
    }
  }
  // A room's move button is pressed first: no character's press area may lie under it.
  for (const move of board.querySelectorAll('.cf-tag__move')) {
    const a = move.getBoundingClientRect();
    for (const box of boxes) {
      const b = box.rect;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) problems.push(`Player ${box.seat}: press area under the ${move.getAttribute('aria-label')} button`);
    }
  }
  // Plates: whole inside their panel, clear of the caption and of each other.
  for (const panel of board.querySelectorAll('.cf-room')) {
    const frame = panel.getBoundingClientRect();
    const face = panel.querySelector('.cf-tag__face').getBoundingClientRect();
    const plates = [...panel.querySelectorAll('.cf-plate')].map(node => ({ seat: node.dataset.seat, rect: node.getBoundingClientRect() }));
    const hits = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    for (const plate of plates) {
      const r = plate.rect;
      if (r.left < frame.left || r.right > frame.right || r.top < frame.top || r.bottom > frame.bottom) problems.push(`Player ${plate.seat}: plate outside ${panel.dataset.room}`);
      if (hits(r, face)) problems.push(`Player ${plate.seat}: plate under the ${panel.dataset.room} caption`);
    }
    for (let i = 0; i < plates.length; i += 1) for (let j = i + 1; j < plates.length; j += 1) if (hits(plates[i].rect, plates[j].rect)) problems.push(`Players ${plates[i].seat} and ${plates[j].seat}: plates overlap`);
  }
  const scroll = document.querySelector('#cf-phone');
  if (scroll.scrollHeight > scroll.clientHeight + 1) problems.push('the phone scrolls');
  const tags = [...board.querySelectorAll('.cf-tag__move')].map(node => node.getBoundingClientRect()).filter(rect => rect.width < 44 || rect.height < 44);
  if (tags.length) problems.push(`${tags.length} room move under 44 px`);
  return { problems, areas: boxes.map(box => ({ seat: Number(box.seat), room: box.room, width: Math.round(box.rect.width), height: Math.round(box.rect.height) })) };
}

/** Holds every cue at one moment, for storyboards: ms after each cue began. */
function freeze(ms) {
  for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = ms; }
}

const tagOf = room => rooms.get(room).panel.querySelector('.cf-tag');
window.__pilot = { audit, pick, confirm: confirmPick, move: room => moveTo(room, tagOf(room)), leave: room => leave(room, tagOf(room)), arrive, freeze, state: S };
window.__designReady = true;
