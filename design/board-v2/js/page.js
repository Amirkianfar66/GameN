// mothership:dev-only
//
// The board-v2 review page: the proposed fixed slots and the Hospital ward drawn on a board the
// size of the window, laid out by fit.mjs from the viewport and the roster alone. It draws what a
// synthetic fixture (fixtures.mjs) puts at each slot; it is a picture for review, not a client:
// no command, clock, audience or private information exists here.
//
//   ?roster=7|8|9        the match's roster (default 9)
//   &fixture=ward|mixed|stress|empty   who is where (default ward)
//   &markers=1           the Blackout position numbers at every slot
//   &press=1             every slot's press area
//   &ids=1               every slot's id
//   &scene=<room>        that room's whole scene alone, at its own 1024 x 768 size (for the art review)

import { FRAME } from '../../board-motion/figures/body.mjs';
import { CREW } from '../../board-motion/figures/crew.mjs';
import { INJURED, skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { dressedFigureSvg, outfitFor } from '../../board-motion/figures/wardrobe.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { SCENES } from '../../board-motion/scenes/index.mjs';
import { wardScene } from '../scenes/hospital-ward.mjs';
import { BOARD_ROOMS, LOCATION_OF, sceneOf, slotsOf } from '../scenes/slots.mjs';
import { BANDS, SHELL, fitBoardV2, slotRects } from './fit.mjs';
import { fixtureSeats } from './fixtures.mjs';

const params = new URLSearchParams(location.search);
const roster = Number(params.get('roster') ?? 9);
const fixture = params.get('fixture') ?? 'ward';
const show = name => params.get(name) === '1';
const app = document.getElementById('v2-app');
const [BX, BY, BOX] = FRAME.box;
const [AX, AY] = FRAME.anchor;
const kebab = id => id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style') Object.assign(node.style, value);
    else node.setAttribute(name, value);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
}

/** The scene's pictures for a room: its back and each layer drawn in front of its places, with depths. */
function scenePictures(room) {
  if (room === 'hospital') {
    const scene = wardScene(roster);
    return [{ src: `../board-v2/assets/scenes/hospital-ward-${roster}.back.svg`, z: 0 },
      ...Object.entries(scene.layers).map(([id, layer]) => ({ src: `../board-v2/assets/scenes/hospital-ward.${id}.svg`, z: Math.round(layer.depth) * 2 + 1 }))];
  }
  const scene = SCENES[room];
  return [{ src: `../board-motion/assets/scenes/${room}.back.svg`, z: 0 },
    ...Object.entries(scene.layers ?? {}).map(([id, layer]) => ({ src: `../board-motion/assets/scenes/${room}.${kebab(id)}.svg`, z: Math.round(layer.depth) * 2 + 1 }))];
}

function drawRoom(room, box, panel, seats, whole = false) {
  const scene = sceneOf(room, roster);
  // The whole scene at its own size, or framed on its places in a board panel.
  const { k, tx, ty } = whole ? { k: 1, tx: 0, ty: 0 } : frameScene(scene, panel);
  const section = el('section', { class: 'v2-room', 'data-room': room, 'aria-label': LOCATION_OF[room], style: { left: `${box.left}px`, top: `${box.top}px`, width: `${panel.width + 2 * SHELL.border}px`, height: `${panel.height + 2 * SHELL.border}px` } });
  for (const picture of scenePictures(room)) {
    section.append(el('img', { src: picture.src, alt: '', style: { left: `${tx}px`, top: `${ty}px`, width: `${1024 * k}px`, height: `${768 * k}px`, zIndex: String(picture.z) } }));
  }
  const fixed = room === 'hospital' || room === 'jail';
  if (!whole) section.append(el('h2', { class: `v2-cap${fixed ? '' : ' v2-cap--move'}` }, LOCATION_OF[room]));
  const rects = new Map(slotRects(room, roster, panel).map(rect => [rect.id, rect]));
  slotsOf(room, roster).forEach((slot, index) => {
    const rect = rects.get(slot.id);
    const seat = seats.find(entry => entry.room === room && entry.slot === slot.id);
    if (seat) {
      const gesture = seat.health === 'Eliminated' ? slot.down : seat.health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture;
      const sk = skeletonOf(gesture);
      const unit = slot.scale * k;
      const outfit = outfitFor(LOCATION_OF[room]);
      const left = tx + slot.at[0] * k - (AX - BX) * unit;
      const top = ty + slot.at[1] * k - (AY - BY) * unit;
      const style = { left: `${left}px`, top: `${top}px`, width: `${BOX * unit}px`, height: `${BOX * unit}px`, '--origin': `${((AX - BX) / BOX) * 100}%` };
      const prefix = `s${seat.seat}${slot.id}`;
      section.append(el('div', { class: 'v2-fig', 'data-mirror': String(slot.mirror), style: { ...style, zIndex: String(Math.round(slot.depth) * 2) } }));
      section.lastChild.innerHTML = dressedFigureSvg(CREW[seat.character], sk, { outfit, prefix: `${prefix}b` });
      if ((sk.front ?? []).length) {
        section.append(el('div', { class: 'v2-fig', 'data-mirror': String(slot.mirror), style: { ...style, zIndex: String(1500 + Math.round(slot.depth)) } }));
        section.lastChild.innerHTML = dressedFigureSvg(CREW[seat.character], sk, { outfit, prefix: `${prefix}f`, layer: 'front' });
      }
      if (!whole) {
        section.append(el('span', { class: 'v2-tag', style: { left: `${rect.press[0]}px`, top: `${Math.min(panel.height - 16, rect.top + rect.side - 14)}px` } },
          el('b', {}, String(seat.seat)), CREW[seat.character].sign));
      }
    }
    // The whole scene is the art alone: its places' numbers and press areas belong to a board panel.
    if (whole) return;
    if (show('markers')) section.append(el('span', { class: 'v2-marker', 'aria-label': `Position ${index + 1}`, style: { left: `${rect.marker[0]}px`, top: `${rect.marker[1]}px` } }, String(index + 1)));
    if (show('press')) section.append(el('span', { class: 'v2-press', style: { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` } }));
    if (show('ids')) {
      section.append(el('span', { class: 'v2-id', style: { left: `${rect.left + rect.side / 2}px`, top: `${rect.top}px` } }, slot.id));
      section.append(el('span', { class: 'v2-badge', style: { left: `${rect.badge[0]}px`, top: `${rect.badge[1]}px` } }));
    }
  });
  return section;
}

function drawScene(room) {
  const seats = fixtureSeats(fixture, roster);
  app.replaceChildren(drawRoom(room, { left: 0, top: 0 }, { width: 1024 - 2 * SHELL.border, height: 768 - 2 * SHELL.border, cap: 0, pad: 0 }, seats, true));
  app.firstChild.style.border = '0';
  const pictures = [...document.images];
  Promise.all(pictures.map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; })))).then(() => { window.__designReady = true; });
}

function draw() {
  const viewport = { width: innerWidth, height: innerHeight };
  const board = fitBoardV2(viewport, roster);
  const short = viewport.height <= SHELL.short;
  const topHeight = short ? SHELL.top.short : SHELL.top.tall;
  const navHeight = short ? SHELL.nav.short : SHELL.nav.tall;
  const seats = fixtureSeats(fixture, roster);
  app.replaceChildren(
    el('header', { class: 'v2-top', style: { height: `${topHeight}px` } },
      el('span', { class: 'v2-top__label' }, 'Board v2 · proposal'),
      el('span', { class: 'v2-top__meta' }, `Synthetic: ${fixture} · ${roster} players · ${viewport.width}×${viewport.height}`)),
    el('div', { class: 'v2-board', style: { top: `${topHeight}px`, height: `${board.boardHeight}px` } }),
    el('nav', { class: 'v2-nav', style: { height: `${navHeight}px` }, 'aria-hidden': 'true' }, ...['Board', 'Actions', 'Pass', 'Card', 'Menu'].map(name => el('span', {}, name))));
  const surface = app.querySelector('.v2-board');
  const inner = viewport.width - 2 * SHELL.boardPad;
  const half = (inner - 2 * SHELL.gap - SHELL.spine) / 2;
  let y = SHELL.boardPad;
  for (const [band, rooms] of Object.entries(BANDS)) {
    rooms.forEach((room, index) => {
      const left = SHELL.boardPad + (rooms.length === 1 ? 0 : index * (half + 2 * SHELL.gap + SHELL.spine));
      surface.append(drawRoom(room, { left, top: y }, board.panels[room], seats));
    });
    y += board.bands[band] + SHELL.gap;
  }
  if (!board.fits) surface.append(el('p', { class: 'v2-note' }, board.problems.join(' · ')));
  document.documentElement.dataset.fits = String(board.fits);
  const pictures = [...document.images];
  Promise.all(pictures.map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; })))).then(() => { window.__designReady = true; });
}

window.__designReady = false;
for (const room of BOARD_ROOMS) if (!sceneOf(room, roster)) throw new Error(`No scene for ${room}`);
if (params.get('scene')) drawScene(params.get('scene')); else draw();
