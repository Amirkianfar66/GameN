// mothership:dev-only
//
// The pack's art adapters. Every picture is the game's own approved art, used unchanged:
// - rooms: the scenes the playable build draws (design/board-motion scenes; the four-bed ward and
//   its lights-out picture from apps/game/hosted/board-v2-film-art; the lights-out rooms and the
//   private-talk capsule from design/board-v2/assets);
// - crew: the restyled nine (crew-drawing-1.0.0, design-0.7.0/0.8.0), drawn by the runtime port of
//   the crew drawing; portraits, cards and role devices from design/crew-drawing/assets;
// - placement: the playable build's own slots and press areas (board-v2-drawing four-bed tables,
//   scene-drawing/frame.mjs), so every view puts each person where the game does. The board's
//   panels use the game's own framing too. The phone's room view frames the same scene wider
//   (phoneFrame below), after the owner found it too zoomed in on a phone (9 November 2026).
// Nothing here fetches by role, team or hidden fact; a fixture names what to draw.

import { BOARD_ROOMS, LOCATION_OF, sceneOf, slotsOf } from '../../../apps/game/hosted/board-v2-drawing/slots-four.mjs';
import { pressSide, slotRects } from '../../../apps/game/hosted/board-v2-drawing/fit-four.mjs';
import { PRESS, frameScene, slotGeometry } from '../../../apps/game/hosted/scene-drawing/frame.mjs';
import { FRAME } from '../../../apps/game/hosted/scene-drawing/body.mjs';
import { INJURED, skeletonOf } from '../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { outfitFor } from '../../../apps/game/hosted/scene-drawing/wardrobe.mjs';
import { CREW } from '../../../apps/game/hosted/crew-drawing/crew.mjs';
import { dressedFigureSvg } from '../../../apps/game/hosted/crew-drawing/wardrobe.mjs';
import { CAPSULE_SEATS, CAPSULE_SIZE, capsuleTargets, frameCapsule } from '../../../apps/game/hosted/board-v2-drawing/capsule-scene.mjs';
import { sittingPose } from '../../../apps/game/hosted/board-v2-drawing/capsule-figures.mjs';
import { iconSvg } from './icons.mjs';

export { BOARD_ROOMS, LOCATION_OF, CREW };

const HOSTED = new URL('../../../apps/game/hosted/', import.meta.url).href;
const DESIGN = new URL('../../', import.meta.url).href;
const [bx, by, box] = FRAME.box;
const [ax, ay] = FRAME.anchor;

export const ROOM_OF = Object.freeze({ 'Room A': 'room-a', 'Room B': 'room-b', 'Command Room': 'command-room', Hospital: 'hospital', Jail: 'jail' });
export const ROOM_NAMES = Object.freeze(Object.fromEntries(Object.entries(ROOM_OF).map(([k, v]) => [v, k])));

/** The crew's call signs, as the drawing release names them. */
export const SIGN = Object.freeze(Object.fromEntries(Object.entries(CREW).map(([id, c]) => [id, c.sign])));

export const portraitUrl = id => `${DESIGN}crew-drawing/assets/portraits/portrait-${id}.svg`;
export const cardUrl = id => `${DESIGN}crew-drawing/assets/cards/card-${id}.svg`;
const DEVICE = Object.freeze({ Doctor: 'cracker', Insider: 'insider', 'Blue Disabler': 'blue-disabler', Supplier: 'supplier', Undercover: 'undercover', Hacker: 'hacker', Alien: 'alien', 'Red Disabler': 'red-disabler' });
export const deviceUrl = role => (DEVICE[role] ? `${DESIGN}crew-drawing/assets/roles/device-${DEVICE[role]}.held.svg` : null);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** An app-icon portrait (the owner's portrait UI format). */
export function portrait(id, { size = 44, alt = '', className = 'pt' } = {}) {
  const img = document.createElement('img');
  img.className = className;
  img.src = portraitUrl(id);
  img.width = size; img.height = size;
  img.alt = alt;
  img.decoding = 'sync';
  return img;
}

function artLayers(room, roster, { dark }) {
  const scene = sceneOf(room, roster);
  const layers = Object.entries(scene.layers ?? {}).map(([id, layer]) => ({ id, depth: layer.depth }));
  if (room === 'hospital') {
    const file = id => `url("${HOSTED}board-v2-film-art/scenes/hospital-ward-four.${id}.svg")`;
    return [{ id: 'back', depth: -1000, image: file('back') }, ...layers.map(l => ({ ...l, image: file(l.id) })),
      ...(dark ? [{ id: 'dark', depth: 1400, image: `url("${HOSTED}board-v2-film-art/lighting/hospital-ward-four.dark.svg")` }] : [])];
  }
  const v = id => `var(--bm-scene-${room}-${id.replace(/[A-Z]/g, c => '-' + c.toLowerCase())})`;
  return [{ id: 'back', depth: -1000, image: v('back') }, ...layers.map(l => ({ ...l, image: v(l.id) })),
    ...(dark ? [{ id: 'dark', depth: 1400, image: `url("${DESIGN}board-v2/assets/lighting/${room}.dark.svg")` }] : [])];
}

let figureSeq = 0;
function figureNodes(seat, slot, frame, { dim = false } = {}) {
  const gesture = seat.health === 'Eliminated' ? slot.down : seat.health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture;
  const sk = skeletonOf(gesture);
  const outfit = outfitFor(seat.location);
  const unit = slot.scale * frame.k;
  const left = frame.tx + slot.at[0] * frame.k - (ax - bx) * unit;
  const top = frame.ty + slot.at[1] * frame.k - (ay - by) * unit;
  const size = box * unit;
  const nodes = [];
  for (const layer of ['body', 'front']) {
    if (layer === 'front' && !sk.front?.length) continue;
    const node = document.createElement('span');
    node.className = 'fig';
    node.dataset.part = layer;
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = dressedFigureSvg(CREW[seat.character], sk, { outfit, prefix: `pf${++figureSeq}`, layer });
    Object.assign(node.style, { left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px`,
      zIndex: String(layer === 'body' ? 2 * Math.round(slot.depth) : 1500 + Math.round(slot.depth)) });
    if (slot.mirror) { node.style.transform = 'scaleX(-1)'; node.style.transformOrigin = `${((ax - bx) / box) * 100}% 0`; }
    if (dim) node.dataset.dim = '';
    if (seat.health === 'Eliminated') node.dataset.elim = '';
    nodes.push(node);
  }
  return nodes;
}

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/** How far inside the view's side edges a person's press point is kept, in CSS pixels. */
export const EDGE_CLEAR = 48;

/**
 * The phone room view's framing, for a tall panel (the space between the top bar and the tabs).
 * The game's frameScene() spreads the bay its places are in across the panel's width, which on a
 * portrait phone zooms a landscape room far in and cuts people off at the sides. This uses the
 * smallest scale that still fills the panel with the picture (its inner box), so as much of the
 * room shows as fits without empty bands. Across, it holds the bay's centre, as the game does, and
 * moves only as far as it must to keep everyone present EDGE_CLEAR inside the sides; when they
 * span more than the view, it centres on them. Vertically it keeps frameScene()'s band, from the
 * back row's heads to the front row's press areas under the caption.
 */
export function phoneFrame(scene, { width, height, cap = 44, pad = 6 }, present = []) {
  const [ix0, iy0, ix1, iy1] = scene.inner ?? [0, 0, 1024, 768];
  const k = Math.max(width / (ix1 - ix0), height / (iy1 - iy0));
  let cx = (scene.focus[0] + scene.focus[2]) / 2;
  if (present.length) {
    const xs = present.map(slot => slot.pressAt[0]);
    const reach = width / (2 * k) - EDGE_CLEAR / k;
    const lo = Math.max(...xs) - reach, hi = Math.min(...xs) + reach;
    cx = lo <= hi ? clamp(cx, lo, hi) : (Math.min(...xs) + Math.max(...xs)) / 2;
  }
  const tx = clamp(width / 2 - cx * k, width - ix1 * k, -ix0 * k);
  const half = PRESS / 2 / k;
  const geometry = scene.slots.map(slot => slotGeometry(slot));
  const top = Math.min(...geometry.map(g => g.headTop));
  const bottom = Math.max(...geometry.map(g => g.press[1] + half));
  const avail = height - cap - pad;
  const ty = (bottom - top) * k > avail ? height - pad - bottom * k : cap + (avail - (bottom - top) * k) / 2 - top * k;
  return { k, tx, ty: clamp(ty, height - iy1 * k, -iy0 * k) };
}

/** Each place's press area in a panel framed by `frame`: fit-four's slotRects(), for any framing. */
function rectsIn(room, roster, panel, frame) {
  const at = ([x, y]) => [frame.tx + x * frame.k, frame.ty + y * frame.k];
  return slotsOf(room, roster).map(slot => {
    const side = pressSide(slot.scale * frame.k);
    const [px, py] = at(slot.pressAt);
    const left = Math.min(panel.width - side, Math.max(0, px - side / 2));
    const top = Math.min(panel.height - panel.pad - side, Math.max(panel.cap, py - side / 2));
    return { id: slot.id, left, top, side, press: [px, py], frame };
  });
}

function officeBadge(kind) {
  const b = document.createElement('i');
  b.className = 'office';
  b.innerHTML = iconSvg(kind === 'captain' ? 'captain' : 'officer', { filled: true });
  b.title = kind === 'captain' ? 'Captain' : 'Officer';
  return b;
}

/**
 * Paints one room as a full scene in `host` (position: relative, size width × height).
 * opts.seats: [{seat, name, character, location, slot, health, jailed}]
 * opts.targets: seat numbers offered as targets (others dim when opts.dimOthers); opts.picked: picked seats.
 * opts.slots: { ids, picked } empty-position targets (movement, Blackout).
 * opts.fit: 'game' (the board's panels: the game's own framing) or 'phone' (the room view: phoneFrame).
 * Returns the press rectangles by seat number.
 */
export function paintRoom(host, opts) {
  const { room, roster = 9, seats = [], width, height, cap = 0, pad = 8, dark = false, darkPeople = false,
    targets = null, targetGo = null, picked = [], dimOthers = false, slots = null, self = null, active = null, offices = {},
    tags = true, labelTop = 10, compact = false, blocked = null, status = true, fit = 'game' } = opts;
  host.replaceChildren();
  host.style.width = `${width}px`; host.style.height = `${height}px`;
  const panel = { width, height, cap, pad };
  const scene = sceneOf(room, roster);
  const location = LOCATION_OF[room];
  const present = seats.filter(s => s.location === location && s.slot);
  const placeOf = seat => slotsOf(room, roster).find(s => s.id === seat.slot);
  const frame = fit === 'phone' ? phoneFrame(scene, panel, present.map(placeOf).filter(Boolean)) : frameScene(scene, panel);
  const rects = new Map((fit === 'phone' ? rectsIn(room, roster, panel, frame) : slotRects(room, roster, panel)).map(r => [r.id, r]));
  for (const layer of artLayers(room, roster, { dark })) {
    const n = document.createElement('span');
    n.className = 'scene-art';
    n.dataset.layer = layer.id;
    Object.assign(n.style, { left: `${frame.tx}px`, top: `${frame.ty}px`, width: `${1024 * frame.k}px`, height: `${768 * frame.k}px`,
      backgroundImage: layer.image, zIndex: String(2 * Math.round(layer.depth) + 1) });
    host.append(n);
  }
  const press = new Map();
  for (const seat of present) {
    const slot = placeOf(seat);
    if (!slot) continue;
    const rect = rects.get(slot.id);
    press.set(seat.seat, rect);
    if (dark && !darkPeople) continue;
    const dim = dimOthers && targets && !targets.includes(seat.seat);
    for (const n of figureNodes(seat, slot, frame, { dim })) host.append(n);
    if (tags) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      const num = document.createElement('b'); num.className = 'num'; num.textContent = String(seat.seat);
      tag.append(num);
      if (offices.captain === seat.seat) tag.append(officeBadge('captain'));
      if (offices.officer === seat.seat) tag.append(officeBadge('officer'));
      const name = document.createElement('span');
      name.textContent = seat.seat === self ? 'You' : seat.name;
      tag.append(name);
      if (status && seat.health === 'Injured') { const s = document.createElement('span'); s.className = 'status'; s.textContent = '· Injured'; tag.append(s); }
      if (status && seat.health === 'Eliminated') { const s = document.createElement('span'); s.className = 'status'; s.textContent = '· Out'; tag.append(s); }
      if (seat.seat === self) tag.dataset.self = '';
      if (seat.seat === active) tag.dataset.active = '';
      if (dim) tag.style.opacity = '0.55';
      const cx = rect.left + rect.side / 2;
      const tagTop = Math.min(height - pad - 26, rect.top + rect.side - (compact ? 6 : 2));
      host.append(tag);
      // A tag stays whole on screen: its centre moves inward by half its own width (4 px clear).
      const reach = tag.isConnected ? tag.offsetWidth / 2 + 4 : 36;
      Object.assign(tag.style, { left: `${clamp(cx, reach, width - reach)}px`, top: `${tagTop}px` });
      if (blocked === seat.seat) {
        const b = document.createElement('span');
        b.className = 'pill'; b.dataset.tone = 'paper';
        b.innerHTML = `${iconSvg('block')}<span>Blocked</span>`;
        Object.assign(b.style, { position: 'absolute', zIndex: 13, left: `${Math.max(4, Math.min(width - 96, cx - 44))}px`, top: `${Math.max(4, tagTop - 32)}px`, height: '24px', fontSize: '0.75rem' });
        host.append(b);
      }
    }
    if (seat.seat === active && !compact) {
      const mark = document.createElement('span');
      mark.className = 'turn-mark';
      mark.innerHTML = iconSvg('turn', { filled: true });
      const headTop = frame.ty + (slot.at[1] - 250 * slot.scale) * frame.k;
      Object.assign(mark.style, { left: `${rect.left + rect.side / 2}px`, top: `${Math.max(cap + 2, Math.min(rect.top - 30, headTop))}px` });
      host.append(mark);
    }
    if (targets?.includes(seat.seat)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'press';
      b.dataset.target = '';
      if (picked.includes(seat.seat)) b.dataset.picked = '';
      b.setAttribute('aria-label', `${seat.name}, player ${seat.seat}`);
      if (targetGo) b.dataset.go = targetGo(seat.seat);
      Object.assign(b.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` });
      host.append(b);
    }
  }
  if (slots) {
    for (const id of slots.ids) {
      const r = rects.get(id);
      if (!r) continue;
      const m = document.createElement('button');
      m.type = 'button';
      m.className = 'slot-mark';
      m.setAttribute('aria-label', `Position ${id}`);
      if (slots.picked === id) m.dataset.picked = '';
      m.innerHTML = slots.icon === false ? '' : iconSvg(slots.icon ?? 'position', { filled: slots.picked === id });
      Object.assign(m.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.side}px`, height: `${r.side}px` });
      host.append(m);
    }
  }
  return { frame, press, rects };
}

/** The private-talk capsule beside the Command Room, with the two participants seated. */
export function paintCapsule(host, { width, height, pair = [], seats = [], dark = false, busy = true, self = null }) {
  host.replaceChildren();
  host.style.width = `${width}px`; host.style.height = `${height}px`;
  const panel = { width, height };
  const scene = frameCapsule(panel);
  const layers = [['back', 0], ['door-0', 100], ...(busy ? [['busy', 3000]] : []), ...(dark ? [['dark', 3200]] : [])];
  for (const [id, z] of layers) {
    const n = document.createElement('span');
    n.className = 'scene-art';
    Object.assign(n.style, { left: `${scene.tx}px`, top: `${scene.ty}px`, width: `${CAPSULE_SIZE[0] * scene.k}px`, height: `${CAPSULE_SIZE[1] * scene.k}px`,
      backgroundImage: `url("${DESIGN}board-v2/assets/capsule/${id}.svg")`, zIndex: String(z) });
    host.append(n);
  }
  const targets = capsuleTargets(panel);
  pair.forEach((seatNo, i) => {
    const seat = seats.find(s => s.seat === seatNo);
    if (!seat) return;
    const anchor = CAPSULE_SEATS[i];
    const sk = sittingPose('sit', { injured: seat.health === 'Injured', jailed: !!seat.jailed });
    const unit = anchor.scale * scene.k;
    const fig = document.createElement('span');
    fig.className = 'fig';
    fig.setAttribute('aria-hidden', 'true');
    fig.innerHTML = dressedFigureSvg(CREW[seat.character], sk, { outfit: outfitFor(seat.location), prefix: `pc${++figureSeq}`, layer: 'body' });
    Object.assign(fig.style, { left: `${scene.tx + anchor.at[0] * scene.k - (ax - bx) * unit}px`, top: `${scene.ty + anchor.at[1] * scene.k - (ay - by) * unit}px`, width: `${box * unit}px`, height: `${box * unit}px`, zIndex: '500' });
    if (anchor.mirror) { fig.style.transform = 'scaleX(-1)'; fig.style.transformOrigin = `${((ax - bx) / box) * 100}% 0`; }
    if (!dark) host.append(fig);
    const t = targets[i];
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `<b class="num">${seat.seat}</b><span>${esc(seat.seat === self ? 'You' : seat.name)}</span>`;
    if (seat.seat === self) tag.dataset.self = '';
    Object.assign(tag.style, { left: `${t.left + t.side / 2}px`, top: `${Math.min(height - 30, t.top + t.side + 2)}px` });
    host.append(tag);
  });
  return { scene, targets };
}

/** A seated figure for the capsule (the scene's own seats), drawn as a portrait chip when space is short. */
export function seatChip(seat, { self = null } = {}) {
  const chip = document.createElement('span');
  chip.className = 'pill';
  chip.append(portrait(seat.character, { size: 20 }));
  const t = document.createElement('span');
  t.textContent = seat.seat === self ? 'You' : seat.name;
  chip.append(t);
  return chip;
}

/** The private role film or the boarding film, from the reviewed films' stage, at time t (ms). */
export function filmFrame({ film, role, character, seat, roster = 9, t = 0, variant = 'full', play = false }) {
  const q = new URLSearchParams({ film, variant, t: String(Math.round(t)) });
  if (film === 'role') { q.set('role', role); q.set('character', character); q.set('seat', String(seat)); }
  if (film === 'boarding') q.set('roster', String(roster));
  if (play) q.set('play', '1');
  const f = document.createElement('iframe');
  f.className = 'media';
  f.title = film === 'role' ? 'Your role film' : film === 'boarding' ? 'Boarding film' : 'Game N';
  f.src = `${DESIGN}pregame-films/stage.html?${q}`;
  f.setAttribute('loading', 'eager');
  return f;
}

/** The role film's id for a role name (the films share one for both Disablers). */
export const FILM_ROLE = Object.freeze({ Doctor: 'doctor', Insider: 'insider', 'Blue Disabler': 'blue-disabler', 'Red Disabler': 'red-disabler', Supplier: 'supplier', Engineer: 'engineer', Undercover: 'undercover', Hacker: 'hacker', Alien: 'alien' });

/** Team title colours of the role films (owner decision, 8 November 2026). */
export const TEAM_TITLE = Object.freeze({ Blue: '#2979FF', Red: '#E8423F', Alien: '#9B5CFF' });
