// mothership:dev-only
//
// The comic board: five rooms as panels of one page, as in the owner's reference (Command
// Room across the top, Room A and Room B, then Hospital and Jail, a gutter between them),
// drawn with the approved room pictures and the nine characters as full-body comic figures
// (owner's decision of 9 October 2026), each posed by its station and public facts.
//
// Everything outside a piece's private cue attributes is built from public facts only, the
// same on every phone and on the shared display. Private cues (eligible, picked, pending, the
// tentative place of a move) are passed in separately by the viewer's own open action and are
// never derived here; the observer board is drawn with none.

import { h, vh } from './h.js';
import { LOCATION_OF, MOVE_ROOMS, ROOMS, bandRows, placements } from './layout.js';
import { COPY, PROPOSED, SHELL } from './copy.js';
import { CREW } from './fixtures.js';
import { shares } from '../figures/geometry.mjs';

const crewOf = id => CREW.find(entry => entry.id === id);

function roomTag(room, { interactive }) {
  const location = LOCATION_OF[room];
  const subtitle = PROPOSED.roomSubtitle[location] ?? null;
  const inner = [h('span', { class: 'bm-tag__name' }, location), subtitle ? h('span', { class: 'bm-tag__sub', 'aria-hidden': 'true' }, subtitle) : null];
  if (MOVE_ROOMS.includes(location)) {
    // The same neutral public button on every phone. Whether the viewer may move there is
    // checked by their own controller after the press, never drawn here. The button is the
    // press area (at least 44 x 44); the slanted caption is drawn inside it.
    const face = (...kids) => h('span', { class: 'bm-tag__face' }, ...kids);
    return h('h3', { class: 'bm-tag', 'data-room-tag': room },
      interactive ? h('button', { type: 'button', class: 'bm-tag__move', 'data-move-room': location, 'aria-label': `Move to ${location}`, id: `bm-move-${room}` },
        face(inner, h('span', { class: 'bm-tag__go', 'aria-hidden': 'true' }, '↗'))) : h('span', { class: 'bm-tag__move' }, face(inner)));
  }
  return h('h3', { class: 'bm-tag bm-tag--fixed', 'data-room-tag': room }, h('span', { class: 'bm-tag__icon', 'data-icon': room, 'aria-hidden': 'true' }), inner);
}

function roomPanel(room, stations, { interactive }) {
  const spec = stations.rooms[room];
  const view = spec.view ?? { cx: 512, cw: 1024, edge: 600, at: 0.8 };
  return h('section', {
    class: 'bm-room', 'data-room': room, 'aria-label': LOCATION_OF[room],
    style: { '--cx': view.cx, '--cw': view.cw, '--edge': view.edge, '--at': view.at },
  },
  h('div', { class: 'bm-stage', 'aria-hidden': 'true' }),
  spec.prop ? h('div', { class: 'bm-prop', 'aria-hidden': 'true' }) : null,
  roomTag(room, { interactive }),
  h('ol', { class: 'bm-pieces', 'aria-label': `In ${LOCATION_OF[room]}` }),
  h('div', { class: 'bm-room__fx', 'aria-hidden': 'true' }));
}

/**
 * Draws a pose on a piece, a flyer or a ghost: which picture of the figure bundle, mirrored or
 * not, and the shares of its box the stylesheet places it by (geometry.mjs). The picture is a
 * custom property of the bundle, so drawing a pose never fetches one.
 */
export function setFigure(element, character, pose, { mirror = false } = {}) {
  const g = shares(pose, mirror);
  element.dataset.pose = pose;
  element.dataset.mirror = String(mirror);
  element.style.setProperty('--fig', `var(--bm-figure-${character}-${pose})`);
  element.style.setProperty('--fig-front', g.front ? `var(--bm-figure-${character}-${pose}-front)` : 'none');
  const values = { '--fa': g.aspect, '--fx': g.fx, '--fy': g.fy, '--hx': g.hx, '--hy': g.hy, '--ht': g.ht, '--pl': g.pl, '--fw': g.width };
  for (const [name, value] of Object.entries(values)) element.style.setProperty(name, String(Number(value.toFixed(4))));
}

function pieceElement(seat) {
  return h('li', { class: 'bm-piece', 'data-seat': seat.n, 'data-character': seat.character },
    h('span', { class: 'bm-piece__body' },
      h('span', { class: 'bm-piece__ring', 'aria-hidden': 'true' }),
      h('span', { class: 'bm-piece__art', 'aria-hidden': 'true' }),
      h('span', { class: 'bm-piece__turn', 'aria-hidden': 'true' }),
      h('span', { class: 'bm-piece__badges' })),
    // The hands on the table, the arms on the blanket: over the room's prop.
    h('span', { class: 'bm-piece__front', 'aria-hidden': 'true' }),
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

export function createBoard(root, { stations, interactive = true, viewer = null, label = SHELL.boardHeading }) {
  const pieces = new Map();
  const panels = new Map();
  const board = h('main', { class: 'bm-board', 'aria-label': label, 'data-board': interactive ? 'own' : 'observer' },
    h('h2', { class: 'bm-vh', id: interactive ? 'bm-board-heading' : null }, label));
  for (const room of [...ROOMS, 'final-zone']) {
    const panel = roomPanel(room, stations, { interactive });
    panels.set(room, panel);
    board.append(panel);
  }
  board.append(h('div', { class: 'bm-spine', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'), h('span')));
  root.append(board);

  function update(pub, cues = {}) {
    const { seats, active } = pub;
    const placed = placements(stations, seats);
    const finalZone = seats.some(seat => seat.location === 'Final Zone');
    const rows = bandRows(stations, seats);
    board.dataset.final = String(finalZone);
    board.style.setProperty('--rows-top', rows.top ?? 0);
    board.style.setProperty('--rows-middle', rows.middle ?? 0);
    board.style.setProperty('--rows-lower', rows.lower ?? 0);
    board.style.setProperty('--rows-final', rows.final ?? 0);
    for (const band of ['top', 'middle', 'lower']) board.style.setProperty(`--stand-${band}`, rows.stand?.[band] ?? 0);
    const byRoom = new Map([...panels.keys()].map(room => [room, []]));
    for (const seat of [...seats].sort((a, b) => a.n - b.n)) {
      let element = pieces.get(seat.n);
      if (!element) { element = pieceElement(seat); pieces.set(seat.n, element); }
      const place = placed.get(seat.n);
      byRoom.get(place.room).push([seat, element, place]);
      // Public facts.
      element.dataset.character = seat.character;
      element.dataset.station = place.station;
      element.dataset.kind = place.kind;
      element.dataset.health = seat.health;
      element.style.setProperty('--depth', place.depth);
      element.style.setProperty('--settle', `${crewOf(seat.character)?.settle ?? 0}deg`);
      element.style.setProperty('--hop', `${crewOf(seat.character)?.hop ?? 5}px`);
      setFigure(element, seat.character, place.pose, { mirror: place.mirror });
      if (place.kind === 'stand') {
        delete element.dataset.clear;
        element.style.setProperty('--x', place.at[0]); element.style.setProperty('--row', place.at[1]);
        for (const name of ['--ax', '--ay', '--fs']) element.style.removeProperty(name);
      } else {
        // A picture station: the figure's anchor at a point of the room's picture, at the picture's scale.
        element.style.setProperty('--ax', place.art[0]); element.style.setProperty('--ay', place.art[1]); element.style.setProperty('--fs', place.figure);
        if (place.clear) element.dataset.clear = ''; else delete element.dataset.clear;
        for (const name of ['--x', '--row']) element.style.removeProperty(name);
      }
      for (const [flag, on] of [['self', seat.n === viewer], ['active', seat.n === active], ['captain', seat.captain], ['jailed', seat.jailed]]) {
        if (on) element.dataset[flag] = ''; else delete element.dataset[flag];
      }
      if (seat.revealedFaction) element.dataset.revealed = seat.revealedFaction; else delete element.dataset.revealed;
      element.querySelector('.bm-piece__name').textContent = seat.name;
      const markers = publicMarkers(seat, { viewer, active });
      const badges = element.querySelector('.bm-piece__badges');
      badges.replaceChildren(...markers.filter(([kind]) => ['captain', 'injured', 'eliminated', 'jailed'].includes(kind)).map(([kind]) => h('span', { class: 'bm-badge', 'data-badge': kind, 'aria-hidden': 'true' })),
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
      // Each standing character's nearest neighbour in its row, as a share of the panel's width:
      // its press area is never wider, so two press areas in a row never overlap.
      const standing = list.filter(([, , place]) => place.kind === 'stand');
      for (const [, element, place] of list) {
        const gaps = place.kind === 'stand' ? standing.filter(([, other, p]) => other !== element && p.at[1] === place.at[1]).map(([, , p]) => Math.abs(p.at[0] - place.at[0])) : [];
        if (gaps.length) element.style.setProperty('--gap', Math.min(...gaps)); else element.style.removeProperty('--gap');
      }
      const panel = panels.get(room);
      const ol = panel.querySelector('.bm-pieces');
      const wanted = list.map(([, element]) => element);
      // Reuse the same element for a seat wherever it goes: focus and motion survive.
      wanted.forEach((element, index) => { if (ol.children[index] !== element) ol.insertBefore(element, ol.children[index] ?? null); });
      panel.dataset.count = String(list.length);
      panel.dataset.crowd = String(list.length > 5);
      // A used prop with characters standing in front of it: its line must clear their press areas.
      panel.dataset.propFront = String(list.some(([, , place]) => place.kind === 'prop') && list.some(([, , place]) => place.kind === 'stand'));
      panel.style.setProperty('--room-rows', room === 'final-zone' ? (rows.final ?? 2) : (rows.room?.[room] ?? 0));
      panel.hidden = finalZone ? room !== 'final-zone' : room === 'final-zone';
    }
    // A tentative place is drawn in the room the viewer pressed, and only there.
    for (const panel of panels.values()) panel.querySelector('.bm-ghost')?.remove();
    if (cues.ghost) {
      const room = Object.keys(LOCATION_OF).find(key => LOCATION_OF[key] === cues.ghost.location);
      const self = seats.find(seat => seat.n === viewer);
      if (room && self) {
        const ghost = h('div', { class: 'bm-ghost', 'data-character': self.character, 'data-state': cues.ghost.state, 'aria-hidden': 'true' }, h('span', { class: 'bm-ghost__art' }), h('span', { class: 'bm-ghost__tag' }, PROPOSED.moveTentative));
        setFigure(ghost, self.character, 'standing');
        panels.get(room).querySelector('.bm-pieces').after(ghost);
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

  /** Where each piece's body is drawn now, and where its feet (its anchor) are, for the motion director. */
  function rects() {
    return new Map([...pieces].map(([n, element]) => {
      const r = element.querySelector('.bm-piece__body').getBoundingClientRect();
      const fx = Number(element.style.getPropertyValue('--fx')) || 0.5, fy = Number(element.style.getPropertyValue('--fy')) || 1;
      return [n, { left: r.left, top: r.top, width: r.width, height: r.height, ax: r.left + r.width * fx, ay: r.top + r.height * fy, pose: element.dataset.pose ?? null }];
    }));
  }

  return { element: board, update, rects, pieces, panels };
}
