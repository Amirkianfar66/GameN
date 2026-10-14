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
//   &hit=1               every slot's press area as a button, for pointer tests (the capture's)
//   &safe=t,r,b,l        the phone's safe-area insets in CSS pixels (default none)
//   &scene=<room>        that room's whole scene alone, at its own 1024 x 768 size (for the art review)
//   &film=blackout       the Blackout's lighting window on the board (js/blackout-view.mjs has its options)
//   &film=blocked        ATTACK BLOCKED on its target, for the room's occupants (js/blocked-view.mjs has its options)
//   &capsule=1           the private-talk capsule beside the Command Room (fit.mjs { capsule: true }), empty
//   &film=capsule        the Hack's public pair going to the capsule and back (js/capsule-view.mjs has its options)
//   ?sheet=capsule       the capsule's art on one sheet, for the art review (no board)

import { FRAME } from '../../board-motion/figures/body.mjs';
import { CREW } from '../../board-motion/figures/crew.mjs';
import { INJURED, skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { dressedFigureSvg, outfitFor } from '../../board-motion/figures/wardrobe.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { SCENES } from '../../board-motion/scenes/index.mjs';
import { wardScene } from '../scenes/hospital-ward.mjs';
import { BOARD_ROOMS, LOCATION_OF, sceneOf, slotsOf } from '../scenes/slots.mjs';
import { CAPSULE, SHELL, fitBoardV2, insetsOf, slotRects } from './fit.mjs';
import { fixtureSeats } from './fixtures.mjs';
import { mountBlackout } from './blackout-view.mjs';
import { mountBlockedPage } from './blocked-view.mjs';
import { drawCapsulePanel, drawCapsuleSheet, fitCapsuleCaption, mountCapsule } from './capsule-view.mjs';

const params = new URLSearchParams(location.search);
const roster = Number(params.get('roster') ?? 9);
const fixture = params.get('fixture') ?? 'ward';
const show = name => params.get(name) === '1';
const capsule = show('capsule') || params.get('film') === 'capsule';
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

/** A seat's figure at its slot, in its health, framed by { k, tx, ty }: its body and, where its gesture has them, its front parts. */
function drawFigure(room, slot, seat, { k, tx, ty }) {
  const gesture = seat.health === 'Eliminated' ? slot.down : seat.health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture;
  const sk = skeletonOf(gesture);
  const unit = slot.scale * k;
  const outfit = outfitFor(LOCATION_OF[room]);
  const left = tx + slot.at[0] * k - (AX - BX) * unit;
  const top = ty + slot.at[1] * k - (AY - BY) * unit;
  const style = { left: `${left}px`, top: `${top}px`, width: `${BOX * unit}px`, height: `${BOX * unit}px`, '--origin': `${((AX - BX) / BOX) * 100}%` };
  const prefix = `s${seat.seat}${slot.id}${seat.health[0]}`;
  const body = el('div', { class: 'v2-fig', 'data-seat': String(seat.seat), 'data-mirror': String(slot.mirror), style: { ...style, zIndex: String(Math.round(slot.depth) * 2) } });
  body.innerHTML = dressedFigureSvg(CREW[seat.character], sk, { outfit, prefix: `${prefix}b` });
  if (!(sk.front ?? []).length) return [body];
  const front = el('div', { class: 'v2-fig', 'data-seat': String(seat.seat), 'data-mirror': String(slot.mirror), style: { ...style, zIndex: String(1500 + Math.round(slot.depth)) } });
  front.innerHTML = dressedFigureSvg(CREW[seat.character], sk, { outfit, prefix: `${prefix}f`, layer: 'front' });
  return [body, front];
}

/** A seat's name tag under its slot's press area: its number and its character's name. */
function drawTag(seat, rect, panel) {
  return el('span', { class: 'v2-tag', 'data-seat': String(seat.seat), style: { left: `${rect.press[0]}px`, top: `${Math.min(panel.height - 16, rect.top + rect.side - 14)}px` } },
    el('b', {}, String(seat.seat)), CREW[seat.character].sign);
}

function drawRoom(room, box, panel, seats, whole = false) {
  const scene = sceneOf(room, roster);
  // The whole scene at its own size, or framed on its places in a board panel.
  const { k, tx, ty } = whole ? { k: 1, tx: 0, ty: 0 } : frameScene(scene, panel);
  const section = el('section', { class: 'v2-room', 'data-room': room, 'aria-label': LOCATION_OF[room], style: { left: `${box.left}px`, top: `${box.top}px`, width: `${panel.width + 2 * SHELL.border}px`, height: `${panel.height + 2 * SHELL.border}px` } });
  // The room's art and its people, together: the layer a film may darken or shake, never its press areas.
  const art = el('div', { class: 'v2-art' });
  section.append(art);
  for (const picture of scenePictures(room)) {
    art.append(el('img', { src: picture.src, alt: '', style: { left: `${tx}px`, top: `${ty}px`, width: `${1024 * k}px`, height: `${768 * k}px`, zIndex: String(picture.z) } }));
  }
  const fixed = room === 'hospital' || room === 'jail';
  if (!whole) section.append(el('h2', { class: `v2-cap${fixed ? '' : ' v2-cap--move'}` }, LOCATION_OF[room]));
  const rects = new Map(slotRects(room, roster, panel).map(rect => [rect.id, rect]));
  slotsOf(room, roster).forEach((slot, index) => {
    const rect = rects.get(slot.id);
    const seat = seats.find(entry => entry.room === room && entry.slot === slot.id);
    if (seat) {
      art.append(...drawFigure(room, slot, seat, { k, tx, ty }));
      if (!whole) section.append(drawTag(seat, rect, panel));
    }
    // The whole scene is the art alone: its places' numbers and press areas belong to a board panel.
    if (whole) return;
    if (show('markers')) section.append(el('span', { class: 'v2-marker', 'aria-label': `Position ${index + 1}`, style: { left: `${rect.marker[0]}px`, top: `${rect.marker[1]}px` } }, String(index + 1)));
    if (show('press')) section.append(el('span', { class: 'v2-press', style: { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` } }));
    if (show('hit')) section.append(el('button', { class: 'v2-slot-hit', type: 'button', 'data-slot': slot.id, 'aria-label': `${LOCATION_OF[room]}, position ${index + 1}`, style: { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` } }));
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
  const insets = insetsOf(params.get('safe'));
  const board = fitBoardV2(viewport, roster, { insets, capsule });
  const { shell, pass } = board;
  const seats = fixtureSeats(fixture, roster);
  const fallback = board.fallback ? ` · ${board.fallback}` : '';
  app.replaceChildren(
    // The bars fill the safe-area insets with their background; their contents stay inside.
    el('header', { class: 'v2-top', style: { height: `${insets.top + shell.top}px`, paddingTop: `${insets.top}px`, paddingLeft: `${insets.left + 10}px`, paddingRight: `${insets.right + 10}px` } },
      el('span', { class: 'v2-top__label' }, 'Board v2 · proposal'),
      el('span', { class: 'v2-top__meta' }, params.get('film') ? `Synthetic · ${viewport.width}×${viewport.height} · ${shell.tier}${fallback}` : `Synthetic: ${fixture} · ${roster} players · ${viewport.width}×${viewport.height} · ${shell.tier} shell${fallback}`)),
    el('div', { class: 'v2-board', style: { left: `${board.boardLeft}px`, width: `${board.boardWidth}px`, top: `${board.boardTop}px`, height: `${board.boardHeight}px` } }),
    el('nav', { class: 'v2-nav', style: { height: `${shell.nav + insets.bottom}px`, paddingBottom: `${insets.bottom}px`, paddingLeft: `${insets.left + 10}px`, paddingRight: `${insets.right + 10}px` }, 'aria-hidden': 'true' }, ...['Board', 'Actions', '', 'Card', 'Menu'].map(name => el('span', {}, name))),
    // The phone kit's raised Pass, as a stand-in: its size and its rise over the board, for the check that it covers no slot.
    el('span', { class: 'v2-pass', 'aria-hidden': 'true', style: { left: `${pass.cx - pass.r}px`, top: `${pass.cy - pass.r}px`, width: `${2 * pass.r}px`, height: `${2 * pass.r}px` } }, 'Pass'));
  const surface = app.querySelector('.v2-board');
  if (board.fallback === 'too-short' || board.fallback === 'too-narrow') {
    // No board where none fits: an explicit message, never a board under the navigation or a scrolling one.
    surface.append(board.fallback === 'too-short'
      ? el('p', { class: 'v2-unfit', role: 'alert' }, el('b', {}, 'This board needs a taller screen.'), ' Turn the phone upright, or make the window taller.')
      : el('p', { class: 'v2-unfit', role: 'alert' }, el('b', {}, 'This board needs a wider screen.'), ' Unfold the phone, or make the window wider.'));
  } else {
    // The rooms' boxes are the phone's; the board starts below the top bar, at its column's left edge.
    for (const room of BOARD_ROOMS) {
      const box = board.boxes[room];
      surface.append(drawRoom(room, { left: box.left - board.boardLeft, top: box.top - board.boardTop }, board.panels[room], seats));
    }
    // The capsule, where the layout has one: scenery beside the Command Room, nothing on it to press.
    if (board.capsule) {
      const box = board.boxes[CAPSULE.id];
      const section = drawCapsulePanel({ left: box.left - board.boardLeft, top: box.top - board.boardTop }, board.panels[CAPSULE.id]);
      surface.append(section);
      fitCapsuleCaption(section, board.panels[CAPSULE.id]);
    }
  }
  document.documentElement.dataset.fits = String(board.fits);
  document.documentElement.dataset.shell = shell.tier;
  document.documentElement.dataset.fallback = board.fallback ?? 'none';
  // A film only where a board is drawn: never over the too-short or too-narrow message.
  if (params.get('film') === 'blackout' && board.fits) mountBlackout({ app, board, roster, seats, params, drawFigure, drawTag });
  if (params.get('film') === 'blocked' && board.fits) mountBlockedPage({ app, board, roster, seats, params });
  if (params.get('film') === 'capsule' && board.fits) mountCapsule({ app, board, roster, seats, params, drawFigure, drawTag });
  const pictures = [...document.images];
  Promise.all(pictures.map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; })))).then(() => { window.__designReady = true; });
}

window.__designReady = false;
for (const room of BOARD_ROOMS) if (!sceneOf(room, roster)) throw new Error(`No scene for ${room}`);
if (params.get('sheet') === 'capsule') {
  document.documentElement.dataset.sheet = 'capsule';
  drawCapsuleSheet(app);
  const pictures = [...document.images];
  Promise.all(pictures.map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; })))).then(() => { window.__designReady = true; });
} else if (params.get('scene')) drawScene(params.get('scene')); else draw();
