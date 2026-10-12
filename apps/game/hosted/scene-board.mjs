// Hosted adapter for the owner-authorized unpainted trial. Drawing primitives are the
// reviewed Designer port at 49f0db4d; source hashes live beside them and in the handoff.
// Placement reads only the current public snapshot. No station enters the wire contract.
import { fullRoomCapacityForVersions } from '@mothership/contracts';
import { placements, LOCATION_OF } from './scene-drawing/layout.mjs';
import { geometry, pressRect } from './scene-drawing/geometry.mjs';
import { frameScene } from './scene-drawing/frame.mjs';
import { SCENES } from './scene-drawing/scenes.mjs';
import { CREW } from './scene-drawing/crew.mjs';
import { hasFront } from './scene-drawing/body.mjs';
import { skeletonOf } from './scene-drawing/gestures.mjs';
import { wardrobeSvg, outfitFor } from './scene-drawing/wardrobe.mjs';
import { compactBands, compactSlots } from './scene-drawing/compact-layout.mjs';

const BANDS = { top: ['command-room'], middle: ['room-a', 'room-b'], lower: ['hospital', 'jail'] };
const WEIGHTS = [0.8, 1.25, 1];
const number = value => Number.parseFloat(value) || 0;
const set = (node, key, value) => { if (node.style.getPropertyValue(key) !== String(value)) node.style.setProperty(key, String(value)); };
const px = value => `${value.toFixed(3)}px`;

/** A sanitized input to the pure allocator: no own knowledge, command or identity. */
export function publicSceneSeats(model) {
  if (model.screen !== 'match' || !model.match) return [];
  return (model.match.board?.zones ?? model.match.roster?.zones ?? []).flatMap(zone => zone.seats.map(seat => ({
    n: seat.number ?? Number(seat.seatId.slice(5)), location: seat.location ?? LOCATION_OF[zone.id],
    health: seat.health, captain: seat.captain === true,
  })));
}

export function capacityLabel(versions, location, count) {
  if (versions?.protocolVersion !== 2) return null;
  const cap = fullRoomCapacityForVersions(versions, location);
  return cap !== null && count >= cap ? 'FULL' : null;
}

/** Press areas of the offered seats must fit; a non-offered figure does not reserve a button. */
export function scenePressAreasFit(places, size) {
  if (size.width < 44 || size.height < size.cap + size.pad + 44) return places.length === 0;
  const rects = places.map(place => pressRect(geometry(place, size), size));
  if (rects.some(r => r.left < -0.01 || r.top < size.cap - 0.01 || r.left + r.side > size.width + 0.01 || r.top + r.side > size.height - size.pad + 0.01)) return false;
  return rects.every((a, i) => rects.every((b, j) => j <= i || a.left + a.side <= b.left + 0.01 || b.left + b.side <= a.left + 0.01 || a.top + a.side <= b.top + 0.01 || b.top + b.side <= a.top + 0.01));
}

function fitSceneBands(board, placed, seats, compact) {
  const zones = board.querySelector(':scope > .ms-zones');
  if (!zones || zones.dataset.final === 'true') return;
  const style = getComputedStyle(zones);
  const height = zones.clientHeight;
  if (!height) return;
  const outer = number(style.paddingTop) + number(style.paddingBottom) + 2 * number(style.rowGap);
  if (compact) {
    const count = id => seats.filter(seat => seat.location === LOCATION_OF[id]).length;
    const counts = { command: count('command-room'), a: count('room-a'), b: count('room-b'), h: count('hospital'), j: count('jail') };
    const captions = { top: 6, middle: 44, lower: 30 };
    const borders = { top: 0, middle: 0, lower: 0 };
    for (const [band, rooms] of Object.entries(BANDS)) for (const id of rooms) {
      const zone = zones.querySelector(`.ms-zone[data-zone="${id}"]`);
      const heading = zone.querySelector('.ms-zone__name');
      const wideCommand = id === 'command-room' && heading.offsetWidth + 50 > zone.clientWidth;
      const measured = heading.querySelector('.phone-room-move') ? Math.max(44, heading.offsetHeight) : (heading.querySelector('.phone-room-tag')?.offsetHeight ?? heading.offsetHeight) + 6;
      const cap = id === 'command-room' && !wideCommand ? 6 : Math.max(captions[band], measured);
      captions[band] = Math.max(captions[band], cap);
      const css = getComputedStyle(zone);
      borders[band] = Math.max(borders[band], number(css.borderTopWidth) + number(css.borderBottomWidth));
      set(zone, '--cap', px(cap)); set(zone, '--pad', '4px');
    }
    const bands = Object.keys(BANDS), additions = bands.map((band, i) => borders[band] + captions[band] - [6,44,30][i]);
    const sizes = compactBands(counts, { available: height - outer - additions.reduce((sum, n) => sum + n, 0) });
    bands.forEach((band, index) => set(zones, `--band-${band}`, px(sizes[index] + additions[index])));
    return;
  }
  const needs = Object.values(BANDS).map(rooms => rooms.map(id => {
    const zone = zones.querySelector(`.ms-zone[data-zone="${id}"]`);
    const css = getComputedStyle(zone);
    const cap = number(css.getPropertyValue('--cap')) || 32;
    const pad = number(css.getPropertyValue('--pad')) || 6;
    const width = zone.clientWidth;
    const offered = [...zone.querySelectorAll('.ms-seat:has(.phone-character-target)')].map(node => placed.get(Number(node.dataset.seat.slice(5)))).filter(Boolean);
    const occupied = zone.querySelector('.ms-seat') !== null;
    let need = cap + (occupied ? 50 : 24);
    while (need < 900 && !scenePressAreasFit(offered, { width, height: need, cap, pad })) need += 2;
    const scene = SCENES[id];
    const most = scene ? width * (scene.inner[3] - scene.inner[1]) / (scene.focus[2] - scene.focus[0]) : need;
    const borders = number(css.borderTopWidth) + number(css.borderBottomWidth);
    return { need: need + borders, most: Math.max(need, most) + borders };
  }));
  const minimum = needs.map(list => Math.max(...list.map(entry => entry.need)));
  const most = needs.map((list, i) => Math.max(minimum[i], Math.min(...list.map(entry => entry.most))));
  const sizes = [...minimum];
  let left = Math.max(0, height - outer - sizes.reduce((a, b) => a + b, 0));
  for (let round = 0; round < 4 && left > 0.5; round += 1) {
    const weights = sizes.map((size, i) => size < most[i] ? WEIGHTS[i] : 0);
    const total = weights.reduce((a, b) => a + b, 0);
    if (!total) { sizes[1] += left; break; }
    let given = 0;
    sizes.forEach((size, i) => { const add = Math.min(left * weights[i] / total, most[i] - size); sizes[i] += add; given += add; });
    left -= given;
  }
  Object.keys(BANDS).forEach((band, i) => set(zones, `--band-${band}`, px(sizes[i])));
}

function figure(token, front, character, gesture, seat, location) {
  const outfit = outfitFor(location);
  const key = `${character}|${gesture}|${outfit}`;
  if (token.dataset.figure === key) return;
  token.dataset.figure = key;
  const sk = skeletonOf(gesture);
  token.innerHTML = wardrobeSvg(CREW[character], sk, { outfit, prefix: `scene-${seat}-body` });
  front.innerHTML = hasFront(sk) ? wardrobeSvg(CREW[character], sk, { outfit, prefix: `scene-${seat}-front`, layer: 'front' }) : '';
}

/** Drawing after layout, also on resize/art arrival. It never emits or replays a cue. */
export function applySceneBoard(root, model) {
  const enabled = (document.documentElement.dataset.art ?? '').split(' ').includes('scene-art');
  if (!enabled || model.screen !== 'match' || !model.match) return;
  const seats = publicSceneSeats(model);
  const placed = placements(seats);
  for (const board of root.querySelectorAll('.ms-board')) {
    board.dataset.scenes = 'true';
    const compact = board.dataset.board === 'own' && fullRoomCapacityForVersions(model.match.versions, 'Hospital') === 5
      && !seats.some(seat => seat.location === 'Final Zone');
    board.dataset.compact = String(compact);
    if (board.dataset.board === 'own') fitSceneBands(board, placed, seats, compact);
    for (const zone of board.querySelectorAll('.ms-zone')) {
      if (zone.hidden) continue;
      const scene = SCENES[zone.dataset.zone];
      const css = getComputedStyle(zone);
      const size = { width: zone.clientWidth, height: zone.clientHeight, cap: number(css.getPropertyValue('--cap')) || (board.dataset.board === 'own' ? 32 : 36), pad: number(css.getPropertyValue('--pad')) || 6 };
      if (!size.width || !size.height) continue;
      const location = LOCATION_OF[zone.dataset.zone];
      const roomSeats = seats.filter(seat => seat.location === location).sort((a,b) => a.n-b.n);
      const headingWidth = zone.dataset.zone === 'command-room' && size.cap === 6 ? zone.querySelector('.ms-zone__name').offsetWidth + 6 : 0;
      const slots = compact && roomSeats.length <= 5 ? compactSlots(roomSeats.length, { width: size.width - headingWidth, height: size.height, caption: size.cap, pad: size.pad }) : null;
      const label = capacityLabel(model.match.versions, location, seats.filter(seat => seat.location === location).length);
      const heading = zone.querySelector('.ms-zone__name');
      let full = heading.querySelector('.scene-full');
      if (label && !full) { full = document.createElement('span'); full.className = 'scene-full'; full.textContent = ' · FULL'; (heading.querySelector('.phone-room-tag') ?? heading).append(full); }
      if (!label) full?.remove();
      const move = heading.querySelector('[data-move-room]');
      if (move) move.setAttribute('aria-label', `Move to ${location}${label ? ', full' : ''}`);
      if (scene) {
        const framed = frameScene(scene, size);
        set(zone, '--scene-k', framed.k); set(zone, '--scene-tx', px(framed.tx)); set(zone, '--scene-ty', px(framed.ty));
        let stage = zone.querySelector('.scene-back');
        if (!stage) { stage = document.createElement('span'); stage.className = 'scene-back'; stage.setAttribute('aria-hidden', 'true'); zone.prepend(stage); }
        set(stage, '--scene-art', `var(--bm-scene-${zone.dataset.zone}-back)`);
        for (const [layer, value] of Object.entries(scene.layers)) {
          let prop = zone.querySelector(`.scene-prop[data-layer="${layer}"]`);
          if (!prop) { prop = document.createElement('span'); prop.className = 'scene-prop'; prop.dataset.layer = layer; prop.setAttribute('aria-hidden', 'true'); zone.append(prop); }
          const assetLayer = layer.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
          set(prop, '--scene-art', `var(--bm-scene-${zone.dataset.zone}-${assetLayer})`); set(prop, '--scene-depth', Math.round(value.depth) * 2 + 1);
        }
      }
      for (const piece of zone.querySelectorAll('.ms-seat')) {
        const seat = Number(piece.dataset.seat.slice(5));
        const place = placed.get(seat);
        if (!place) continue;
        const g = geometry(place, size);
        const slot = slots?.[roomSeats.findIndex(item => item.n === seat)];
        const press = slot ? { ...slot, left: slot.left + headingWidth } : pressRect(g, size);
        piece.dataset.place = place.place; piece.dataset.gesture = place.gesture; piece.dataset.mirror = String(place.mirror);
        for (const [name, value] of Object.entries({ '--body-x': g.left, '--body-y': g.top, '--body-size': g.side, '--press-x': press.left, '--press-y': press.top, '--press-size': press.side })) set(piece, name, px(value));
        const depth = place.kind === 'place' ? place.depth : 1000 - place.at[1] * 100;
        set(piece, '--scene-depth', Math.round(depth) * 2);
        set(piece, '--scene-front-depth', 1500 + Math.round(depth));
        const token = piece.querySelector('.ms-token');
        const character = piece.dataset.character;
        if (!CREW[character]) continue; // A missing public character keeps its readable numeral.
        let front = piece.querySelector('.scene-front');
        if (!front) { front = document.createElement('span'); front.className = 'scene-front'; front.setAttribute('aria-hidden', 'true'); token.after(front); }
        figure(token, front, character, place.gesture, seat, location);
        piece.dataset.outfit = outfitFor(location);
        let leader = piece.querySelector('.scene-leader');
        if (slot && !leader) { leader = document.createElement('span'); leader.className = 'scene-leader'; leader.setAttribute('aria-hidden', 'true'); piece.append(leader); }
        if (!slot) leader?.remove();
        if (slot) {
          const x = press.left + press.side / 2, y = press.top + press.side / 2;
          set(leader, '--leader-x', px(x)); set(leader, '--leader-y', px(y));
          set(leader, '--leader-length', px(Math.hypot(g.press[0] - x, g.press[1] - y)));
          set(leader, '--leader-angle', `${Math.atan2(g.press[1] - y, g.press[0] - x)}rad`);
        }
      }
      // A private tentative move is a separate drawing, never an occupant or a capacity
      // fact. Its known own character uses the same unpainted rig as the public figures.
      const ghost = board.dataset.board === 'own' ? zone.querySelector('.phone-move-ghost') : null;
      if (ghost && CREW[ghost.dataset.character] && model.match.identity) {
        const self = seats.find(seat => seat.n === model.match.identity.number);
        const future = self ? placements(seats.map(seat => seat === self ? { ...seat, location } : seat)).get(self.n) : null;
        if (future) {
          const g = geometry(future, size), press = pressRect(g, size);
          for (const [name, value] of Object.entries({ '--body-x': g.left, '--body-y': g.top, '--body-size': g.side, '--press-x': press.left, '--press-y': press.top, '--press-size': press.side })) set(ghost, name, px(value));
          ghost.dataset.mirror = String(future.mirror);
          const token = ghost.querySelector('.phone-move-ghost__art');
          token.innerHTML = wardrobeSvg(CREW[ghost.dataset.character], skeletonOf(future.gesture), { outfit: outfitFor(location), prefix: `ghost-${self.n}` });
        }
      }
    }
  }
}
