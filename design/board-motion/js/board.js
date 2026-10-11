// mothership:dev-only
//
// The comic board: five rooms as panels of one page, as in the owner's reference (Command
// Room across the top, Room A and Room B, then Hospital and Jail, a gutter between them).
// Since the owner's decision of 9 October 2026 each room is a scene (scenes/) with five fixed
// places, the Command Room one, and every character is a full-body comic figure drawn live by
// the figure rig (figures/) in the gesture of the place it takes.
//
// Everything outside a piece's private cue attributes is built from public facts only, the
// same on every phone and on the shared display. Private cues (eligible, picked, pending, the
// tentative place of a move) are passed in separately by the viewer's own open action and are
// never derived here; the observer board is drawn with none.

import { h, vh } from './h.js';
import { CAPACITY, CAPACITY_ROOMS, LOCATION_OF, MOVE_ROOMS, ROOMS, ROOM_OF, assign, gestureOf, placements } from './layout.js';
import { COPY, PROPOSED, SHELL } from './copy.js';
import { SCENES } from '../scenes/index.mjs';
import { PRESS, frameScene, pressPoint, toScene } from '../scenes/frame.mjs';
import { FRAME, figureSvg } from '../figures/body.mjs';
import { CREW as FIGURES } from '../figures/crew.mjs';
import { skeletonOf } from '../figures/gestures.mjs';

const [BOX_X, BOX_Y, BOX] = FRAME.box;
const [ANCHOR_X, ANCHOR_Y] = FRAME.anchor;
/** The share of a figure's box at which its anchor stands: a mirror turns it about this line. */
export const ANCHOR_SHARE = (ANCHOR_X - BOX_X) / BOX;
const STAND_HEIGHT = ANCHOR_Y - 19;
const JOINTS = ['head', 'neck', 'pelvis', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF', 'hipN', 'kN', 'aN', 'hipF', 'kF', 'aF'];

/** The press area's side in CSS pixels: 44 at least, a little more on a large board. */
const pressSize = unit => Math.max(PRESS, Math.min(64, 0.26 * STAND_HEIGHT * unit));

function roomTag(room, { interactive }) {
  const location = LOCATION_OF[room];
  const subtitle = PROPOSED.roomSubtitle[location] ?? null;
  const inner = [h('span', { class: 'bm-tag__name' }, location), subtitle ? h('span', { class: 'bm-tag__sub', 'aria-hidden': 'true' }, subtitle) : null];
  if (MOVE_ROOMS.includes(location)) {
    // The same neutral public button on every phone. Whether the viewer may move there is
    // checked by their own controller after the press, never drawn here. The button is the
    // press area (at least 44 x 44); the slanted caption is drawn inside it.
    const face = (...kids) => h('span', { class: 'bm-tag__face' }, ...kids);
    // FULL, from public occupancy (the owner's capacity of five), drawn alike on every screen.
    const full = CAPACITY_ROOMS.includes(location) ? h('span', { class: 'bm-tag__full', 'aria-hidden': 'true' }, PROPOSED.roomFull) : null;
    return h('h3', { class: 'bm-tag', 'data-room-tag': room },
      interactive ? h('button', { type: 'button', class: 'bm-tag__move', 'data-move-room': location, 'aria-label': `Move to ${location}`, id: `bm-move-${room}` },
        face(inner, full, h('span', { class: 'bm-tag__go', 'aria-hidden': 'true' }, '↗'))) : h('span', { class: 'bm-tag__move' }, face(inner, full)));
  }
  // The Hospital and the Jail say FULL too; their heading reads "Hospital, full" while they are.
  const full = CAPACITY_ROOMS.includes(location) ? [h('span', { class: 'bm-vh bm-tag__fullvh' }), h('span', { class: 'bm-tag__full', 'aria-hidden': 'true' }, PROPOSED.roomFull)] : null;
  return h('h3', { class: 'bm-tag bm-tag--fixed', 'data-room-tag': room }, h('span', { class: 'bm-tag__icon', 'data-icon': room, 'aria-hidden': 'true' }), inner, full);
}

function roomPanel(room, { interactive }) {
  const scene = SCENES[room];
  // The scene's picture and what is drawn in front of its places, each a whole layer of the scene bundle.
  const layers = Object.entries(scene?.layers ?? {}).map(([id, layer]) => h('div', { class: 'bm-layer', 'data-layer': id, 'aria-hidden': 'true', style: { '--z': String(Math.round(layer.depth) * 2 + 1) } }));
  return h('section', { class: 'bm-room', 'data-room': room, 'aria-label': LOCATION_OF[room] },
    h('div', { class: 'bm-stage', 'aria-hidden': 'true' }),
    ...layers,
    roomTag(room, { interactive }),
    h('ol', { class: 'bm-pieces', 'aria-label': `In ${LOCATION_OF[room]}` }),
    h('div', { class: 'bm-room__fx', 'aria-hidden': 'true' }));
}

/**
 * Draws a gesture of a character into a figure element: its body, and on a separate element
 * what lies over the place's prop (the hands on a desk). Redrawn only when what draws it changed.
 * prefix keeps the drawing's definitions apart from every other figure in the document.
 */
export function drawFigure(body, front, character, gesture, prefix, sk = skeletonOf(gesture)) {
  const key = `${character}|${gesture}`;
  if (body.dataset.drawn === key && gesture !== '*') return;
  body.dataset.drawn = key;
  body.innerHTML = figureSvg(FIGURES[character], sk, { prefix: `${prefix}b` });
  if (front) {
    const has = (sk.front ?? []).length > 0;
    front.innerHTML = has ? figureSvg(FIGURES[character], sk, { prefix: `${prefix}f`, layer: 'front' }) : '';
  }
}

export function pieceElement(seat) {
  return h('li', { class: 'bm-piece', 'data-seat': seat.n, 'data-character': seat.character },
    h('span', { class: 'bm-piece__body', 'aria-hidden': 'true' }),
    // The hands on the desk, the arms on the blanket: over the place's prop.
    h('span', { class: 'bm-piece__front', 'aria-hidden': 'true' }),
    h('span', { class: 'bm-piece__ring', 'aria-hidden': 'true' }),
    h('span', { class: 'bm-piece__turn', 'aria-hidden': 'true' }),
    h('span', { class: 'bm-piece__badges' }),
    h('span', { class: 'bm-piece__tag' }, h('span', { class: 'bm-piece__num' }, vh('Player '), String(seat.n)), vh(', '), h('span', { class: 'bm-piece__name' }, seat.name)),
    h('span', { class: 'bm-piece__status' }));
}

/** The public status words of a seat: the same words the release's markers use. */
export function publicMarkers(seat, { viewer, active }) {
  const markers = [];
  if (seat.n === viewer) markers.push(['self', COPY.marker.self]);
  if (seat.n === active) markers.push(['turn', COPY.marker.turn]);
  if (seat.captain) markers.push(['captain', COPY.marker.captain]);
  if (seat.health !== 'Healthy') markers.push([seat.health.toLowerCase(), COPY.marker.health(seat.health)]);
  if (seat.jailed) markers.push(['jailed', COPY.marker.jailed]);
  if (seat.revealedFaction) markers.push(['faction', COPY.marker.faction(seat.revealedFaction)]);
  return markers;
}

/**
 * Where a placement is drawn in a panel width x height (CSS pixels): the figure's box (left,
 * top, side), its anchor, its scale (pixels per figure unit), its press area and its head.
 */
export function geometry(place, { width, height, cap, pad }) {
  const sk = skeletonOf(place.gesture);
  if (place.kind === 'place') {
    const scene = SCENES[place.room];
    const { k, tx, ty } = frameScene(scene, { width, height, cap, pad });
    const slot = { at: place.at, scale: place.scale, mirror: place.mirror };
    const unit = place.scale * k;
    const [ax, ay] = [tx + place.at[0] * k, ty + place.at[1] * k];
    // The press area is the place's (its own gesture's), whatever the character there is drawn doing.
    const [px, py] = toScene(slot, pressPoint(skeletonOf(place.pressGesture ?? place.gesture))).map((v, i) => (i ? ty : tx) + v * k);
    const [hx, hy] = toScene(slot, sk.head).map((v, i) => (i ? ty : tx) + v * k);
    return { unit, anchor: [ax, ay], left: ax - (ANCHOR_X - BOX_X) * unit, top: ay - (ANCHOR_Y - BOX_Y) * unit, side: BOX * unit, press: [px, py], head: [hx, hy], frame: { k, tx, ty } };
  }
  /** The figure standing on (ax, ay) at unit pixels per figure unit. */
  const standing = (ax, ay, unit) => {
    const at = ([x, y]) => [ax + (place.mirror ? ANCHOR_X - x : x - ANCHOR_X) * unit, ay + (y - ANCHOR_Y) * unit];
    return { unit, anchor: [ax, ay], left: ax - (ANCHOR_X - BOX_X) * unit, top: ay - (ANCHOR_Y - BOX_Y) * unit, side: BOX * unit, press: at(pressPoint(sk)), head: at(sk.head), frame: null };
  };
  // One figure on the panel's floor, as large as the panel lets it be, centred: the vocabulary sheet.
  if (place.kind === 'solo') {
    const xs = JOINTS.map(joint => sk[joint][0]);
    const [lo, hi] = [Math.min(...xs) - 28, Math.max(...xs) + 28];
    const unit = Math.min(((height - cap - pad) * 0.92) / STAND_HEIGHT, (width * 0.94) / (hi - lo));
    return standing(width / 2 - ((lo + hi) / 2 - ANCHOR_X) * unit * (place.mirror ? -1 : 1), height - pad, unit);
  }
  // A crowd of six or more (layout stress) or the Final Zone: rows from the panel's floor up.
  const rows = place.kind === 'final' ? 2 : 3;
  const area = height - cap - pad;
  const pitch = Math.max(PRESS + 2, Math.min(78, (area - PRESS) / Math.max(1, rows - 1)));
  const press = [place.at[0] * width, height - pad - PRESS / 2 - place.at[1] * pitch];
  const unit = (Math.min(pitch * 1.9, area * 0.95) / STAND_HEIGHT) * place.depth;
  const p = pressPoint(sk);
  return standing(press[0] + (place.mirror ? p[0] - ANCHOR_X : ANCHOR_X - p[0]) * unit, press[1] + (ANCHOR_Y - p[1]) * unit, unit);
}

/** A press area in a panel: its side, on the figure, moved inward to stay whole on screen and clear of the caption. */
export function pressRect(g, { width, height, cap, pad }) {
  const side = pressSize(g.unit);
  const left = Math.min(width - side, Math.max(0, g.press[0] - side / 2));
  const top = Math.min(height - pad - side, Math.max(cap, g.press[1] - side / 2));
  return { left, top, side };
}

/**
 * Lays a piece out for a placement in a panel width x height: its figure's box, drawing order,
 * press area, head and anchor, as the custom properties board.css draws it by.
 */
export function placePiece(element, place, size) {
  const g = geometry(place, size);
  const press = pressRect(g, size);
  const depth = place.kind === 'place' ? place.depth : 1000 - place.at[1] * 100;
  const vars = {
    '--bx': g.left, '--by': g.top, '--bs': g.side,
    '--px': press.left, '--py': press.top, '--ps': press.side, '--hx': g.head[0], '--hy': g.head[1],
    '--fx': g.anchor[0], '--fy': g.anchor[1], '--unit': g.unit,
  };
  for (const [name, value] of Object.entries(vars)) element.style.setProperty(name, Number(value).toFixed(2));
  // A z-index is an integer: "800.00" would be dropped and the figure drawn under every layer of its room.
  element.style.setProperty('--zb', String(Math.round(depth) * 2));
  element.style.setProperty('--zf', String(1500 + Math.round(depth)));
}

export function createBoard(root, { interactive = true, viewer = null, label = SHELL.boardHeading }) {
  const pieces = new Map();
  const panels = new Map();
  const prefix = interactive ? 'o' : 'p';
  let last = { seats: [], placed: new Map(), cues: {} };
  const board = h('main', { class: 'bm-board', 'aria-label': label, 'data-board': interactive ? 'own' : 'observer' },
    h('h2', { class: 'bm-vh', id: interactive ? 'bm-board-heading' : null }, label));
  for (const room of [...ROOMS, 'final-zone']) {
    const panel = roomPanel(room, { interactive });
    panels.set(room, panel);
    board.append(panel);
  }
  board.append(h('div', { class: 'bm-spine', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'), h('span')));
  root.append(board);

  function update(pub, cues = {}) {
    const { seats, active } = pub;
    const placed = placements(seats);
    const finalZone = seats.some(seat => seat.location === 'Final Zone');
    board.dataset.final = String(finalZone);
    const byRoom = new Map([...panels.keys()].map(room => [room, []]));
    for (const seat of [...seats].sort((a, b) => a.n - b.n)) {
      let element = pieces.get(seat.n);
      if (!element) { element = pieceElement(seat); pieces.set(seat.n, element); }
      const place = placed.get(seat.n);
      byRoom.get(place.room).push([seat, element, place]);
      // Public facts.
      Object.assign(element.dataset, { character: seat.character, place: place.place, kind: place.kind, health: seat.health, gesture: place.gesture, mirror: String(place.mirror) });
      drawFigure(element.querySelector('.bm-piece__body'), element.querySelector('.bm-piece__front'), seat.character, place.gesture, `${prefix}${seat.n}`);
      for (const [flag, on] of [['self', seat.n === viewer], ['active', seat.n === active], ['captain', seat.captain], ['jailed', seat.jailed]]) {
        if (on) element.dataset[flag] = ''; else delete element.dataset[flag];
      }
      if (seat.revealedFaction) element.dataset.revealed = seat.revealedFaction; else delete element.dataset.revealed;
      element.querySelector('.bm-piece__name').textContent = seat.name;
      const markers = publicMarkers(seat, { viewer, active });
      element.querySelector('.bm-piece__badges').replaceChildren(...markers.filter(([kind]) => ['captain', 'injured', 'eliminated', 'jailed'].includes(kind)).map(([kind]) => h('span', { class: 'bm-badge', 'data-badge': kind, 'aria-hidden': 'true' })),
        ...(seat.revealedFaction ? [h('span', { class: 'bm-reveal', 'aria-hidden': 'true' }, seat.revealedFaction)] : []));
      // Words for everyone, so no state is told by a picture alone.
      element.querySelector('.bm-piece__status').replaceChildren(...(markers.length ? [vh(`: ${markers.map(([, text]) => text).join(', ')}`)] : []));
      // Public: the subject of a release vote and the published count of a closed vote.
      const subject = pub.ballot?.release === seat.n;
      if (subject) element.dataset.subject = ''; else delete element.dataset.subject;
      const tally = pub.tally?.counts?.[seat.n];
      element.querySelector('.bm-piece__tally')?.remove();
      if (tally) element.append(h('span', { class: 'bm-piece__tally', 'data-selected': String(pub.tally.selected === seat.n) }, COPY.tally.votes(tally)));
      element.querySelector('.bm-piece__subject')?.remove();
      if (subject) element.append(h('span', { class: 'bm-piece__subject' }, PROPOSED.subject));
      applyCues(element, seat, cues);
    }
    for (const [room, list] of byRoom) {
      const panel = panels.get(room);
      const ol = panel.querySelector('.bm-pieces');
      const wanted = list.map(([, element]) => element);
      // Reuse the same element for a seat wherever it goes: focus and motion survive.
      wanted.forEach((element, index) => { if (ol.children[index] !== element) ol.insertBefore(element, ol.children[index] ?? null); });
      panel.dataset.count = String(list.length);
      panel.dataset.crowd = String(list.some(([, , place]) => place.kind === 'crowd'));
      // A full room says so on its tag, in words for everyone too; pressing it still goes
      // through the viewer's own offers, which never include a full room.
      const location = LOCATION_OF[room];
      if (CAPACITY_ROOMS.includes(location)) {
        const full = list.length >= CAPACITY;
        panel.dataset.full = String(full);
        panel.querySelector('button.bm-tag__move')?.setAttribute('aria-label', full ? PROPOSED.moveFullLabel(location) : `Move to ${location}`);
        const words = panel.querySelector('.bm-tag__fullvh');
        if (words) words.textContent = full ? PROPOSED.captionFull : '';
      }
      panel.hidden = finalZone ? room !== 'final-zone' : room === 'final-zone';
    }
    // A tentative place for a move is drawn in the room the viewer pressed, and only there: the
    // place the viewer would take, by the same rule as everyone's.
    for (const panel of panels.values()) panel.querySelector('.bm-ghost')?.remove();
    if (cues.ghost) {
      const room = ROOM_OF[cues.ghost.location];
      const self = seats.find(seat => seat.n === viewer);
      if (room && self) {
        const occupants = seats.filter(seat => seat.location === cues.ghost.location && seat.n !== viewer);
        const place = assign(room, [...occupants, { ...self, location: cues.ghost.location }]).get(viewer);
        const ghost = h('div', { class: 'bm-ghost', 'data-character': self.character, 'data-state': cues.ghost.state, 'aria-hidden': 'true' },
          h('span', { class: 'bm-ghost__art' }), h('span', { class: 'bm-ghost__tag' }, PROPOSED.moveTentative));
        const gesture = gestureOf(self, place ?? { gesture: 'stand' });
        ghost.dataset.place = place ? JSON.stringify({ room, kind: 'place', place: place.id, at: place.at, scale: place.scale, mirror: Boolean(place.mirror), gesture, depth: place.depth ?? place.at[1] }) : '';
        drawFigure(ghost.querySelector('.bm-ghost__art'), null, self.character, gesture, `${prefix}g`);
        panels.get(room).querySelector('.bm-pieces').after(ghost);
      }
    }
    last = { seats, placed, cues };
  }

  /** Positions every piece in its panel's current size: run after the board's bands are set. */
  function layout() {
    for (const [room, panel] of panels) {
      if (panel.hidden) continue;
      const width = panel.clientWidth, height = panel.clientHeight;
      if (!width || !height) continue;
      const css = getComputedStyle(panel);
      const cap = parseFloat(css.getPropertyValue('--bm-cap')) || 32;
      const pad = parseFloat(css.getPropertyValue('--bm-pad')) || 6;
      const size = { width, height, cap, pad };
      const scene = SCENES[room];
      if (scene) {
        const { k, tx, ty } = frameScene(scene, size);
        panel.style.setProperty('--k', k.toFixed(5)); panel.style.setProperty('--tx', tx.toFixed(2)); panel.style.setProperty('--ty', ty.toFixed(2));
      }
      for (const element of panel.querySelectorAll('.bm-piece')) {
        const place = last.placed.get(Number(element.dataset.seat));
        if (!place) continue;
        place.layout = size;
        placePiece(element, place, size);
      }
      const ghost = panel.querySelector('.bm-ghost');
      if (ghost) {
        const place = ghost.dataset.place ? JSON.parse(ghost.dataset.place) : { room, kind: 'crowd', at: [0.5, 0], depth: 1, gesture: 'stand', mirror: false };
        const g = geometry(place, size);
        for (const [name, value] of Object.entries({ '--bx': g.left, '--by': g.top, '--bs': g.side, '--px': g.press[0], '--py': g.press[1] })) ghost.style.setProperty(name, Number(value).toFixed(2));
        ghost.dataset.mirror = String(place.mirror);
      }
    }
  }

  function applyCues(element, seat, cues) {
    const eligible = cues.eligible?.includes(seat.n) ?? false;
    const pick = cues.picked?.indexOf(seat.n) ?? -1;
    const pending = cues.pending?.includes(seat.n) ?? false;
    const target = pending ? 'pending' : pick >= 0 ? (cues.multi ? 'picked' : 'selected') : eligible ? 'eligible' : cues.choosing ? 'other' : null;
    if (target) element.dataset.target = target; else delete element.dataset.target;
    element.querySelector('.bm-piece__pick')?.remove();
    if (pick >= 0 && cues.multi) element.append(h('span', { class: 'bm-piece__pick', 'aria-hidden': 'true' }, String(pick + 1)));
    const existing = element.querySelector('.bm-piece__target');
    if (eligible && interactive) {
      const label = `Select ${seat.n === viewer ? `Player ${seat.n} (you)` : `Player ${seat.n}`}, ${seat.name}`;
      if (!existing) element.append(h('button', { type: 'button', class: 'bm-piece__target', id: `bm-target-seat-${seat.n}`, 'data-intent': 'action/choose', 'data-value': `seat-${seat.n}`, 'aria-label': label, 'aria-describedby': 'bm-strip-line' }));
      else existing.setAttribute('aria-label', label);
    } else existing?.remove();
  }

  /**
   * Where each piece's figure is drawn now, for the motion director: its box and anchor in the
   * page, its scale, the gesture and mirror it is drawn in, and the room and place it holds.
   */
  function rects() {
    return new Map([...pieces].map(([n, element]) => {
      const panel = element.closest('.bm-room');
      if (!panel || panel.hidden) return [n, null];
      const box = panel.getBoundingClientRect();
      const css = getComputedStyle(element);
      const v = name => parseFloat(css.getPropertyValue(name)) || 0;
      const border = parseFloat(getComputedStyle(panel).borderLeftWidth) || 0;
      const ox = box.left + border, oy = box.top + border;
      return [n, {
        left: ox + v('--bx'), top: oy + v('--by'), side: v('--bs'), unit: v('--unit'), anchor: [ox + v('--fx'), oy + v('--fy')],
        gesture: element.dataset.gesture, mirror: element.dataset.mirror === 'true', room: panel.dataset.room, place: element.dataset.place, kind: element.dataset.kind,
      }];
    }).filter(([, rect]) => rect));
  }

  /** The placements of the characters in a room, as last drawn. */
  const placesIn = room => [...last.placed.values()].filter(place => place.room === room);

  return { element: board, update, layout, rects, placesIn, pieces, panels, prefix };
}
