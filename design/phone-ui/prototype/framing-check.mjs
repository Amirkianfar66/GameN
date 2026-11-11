// mothership:dev-only
//
// The room view's framing checked the way Frontend checks it (#222): each case painted with the
// pack's own paintRoom (fit: 'phone', the corrected phoneFrame), then every figure's SVG, both
// layers, drawn again onto a canvas laid over the panel, well past its own box (figures may paint
// outside it), and its painted pixels counted inside the panel and in all. Each figure is counted
// as drawn (Reduce motion: the pose alone) and again at every corner of the crew's own motion (the
// native game's idle drift and tilt of the head and the hanging hair's swing, FIGURE_MOTION_RANGE),
// unless it is gone still. design/tools/phone-ui-framing-check.mjs opens this page and records
// window.__framingCheck. A desktop Chrome measurement of drawn pixels; it says nothing about a phone.

import { BOARD_ROOMS, ROOM_NAMES, paintRoom } from './art.mjs';
import { ROSTER } from './fixtures.mjs';
import { FIGURE_MOTION_RANGE } from './figure-extents.mjs';
import { slotsOf } from '../../../apps/game/hosted/board-v2-drawing/slots-four.mjs';
import { INJURED, skeletonOf } from '../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { outfitFor } from '../../../apps/game/hosted/scene-drawing/wardrobe.mjs';
import { CREW } from '../../../apps/game/hosted/crew-drawing/crew.mjs';
import { dressedFigureSvg } from '../../../apps/game/hosted/crew-drawing/wardrobe.mjs';
import { hasHangingHair, isStill } from '../../../apps/game/hosted/crew-drawing/motion.mjs';

window.__framingReady = false;

/** The cases: every room full, on Frontend's native panel and the pack's three phones; Frontend's failures among them. */
const PANELS = [[386, 712, 'native 390 × 844'], [390, 653, 'pack 390 × 844'], [320, 438, 'pack 320 × 568'], [320, 335, 'pack 320 × 568, 200 % text'], [430, 741, 'pack 430 × 932']];
/** Everyone present standing (Injured in the Hospital), or everyone present Eliminated in place (their down pose). */
const HEALTHS = ['Healthy', 'Eliminated'];
/** The nine characters turned through the places, so each character stands in each place once; 7, 8 and 9 players in turn. */
const CHARACTERS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];
const TURNS = CHARACTERS.map((_, turn) => ({ turn, roster: 7 + (turn % 3) }))
  .slice(0, Number(new URLSearchParams(location.search).get('turns') ?? CHARACTERS.length));
/** Frontend's own failing case on #222: a full Room A, 7 players, A1 seat 2 (c2), A2 seat 1 (c1), A3 seat 3 (c3), A4 seat 4 (c4), A5 seat 5 (c5). */
const FRONTEND_CASE = { room: 'room-a', roster: 7, places: { A1: [2, 'c2'], A2: [1, 'c1'], A3: [3, 'c3'], A4: [4, 'c4'], A5: [5, 'c5'] } };

/** Everyone in one room: the roster's first seats in the room's places, with the characters turned; the rest elsewhere. */
function fullRoom(room, roster, health = 'Healthy', turn = 0) {
  const places = slotsOf(room, roster).map(s => s.id);
  return ROSTER.filter(p => p.seat <= roster).map((p, i) => (i < places.length
    ? { ...p, character: CHARACTERS[(i + turn) % CHARACTERS.length], location: ROOM_NAMES[room], slot: places[i], health: room === 'hospital' && health === 'Healthy' ? 'Injured' : health, jailed: room === 'jail' }
    : { ...p, location: room === 'room-a' ? 'Room B' : 'Room A', slot: null, health: 'Healthy', jailed: false }));
}

/** Frontend's case, its seats and characters exactly. */
function frontendRoom() {
  const { room, roster, places } = FRONTEND_CASE;
  const at = new Map(Object.entries(places).map(([slot, [seat, character]]) => [seat, { slot, character }]));
  return ROSTER.filter(p => p.seat <= roster).map(p => (at.has(p.seat)
    ? { ...p, character: at.get(p.seat).character, location: ROOM_NAMES[room], slot: at.get(p.seat).slot, health: 'Healthy', jailed: false }
    : { ...p, location: 'Room B', slot: null, health: 'Healthy', jailed: false }));
}

/** The motion's corners for a character: the head's drift and tilt, and the hanging hair's swing and lift where it hangs. */
function motionCorners(id) {
  const { dx, dy, tilt, hair } = FIGURE_MOTION_RANGE;
  const hairs = hasHangingHair(id) ? [-hair, hair] : [0];
  const out = [];
  for (const sx of [-dx, dx]) for (const sy of [-dy, dy]) for (const st of [-tilt, tilt]) for (const sway of hairs) for (const lift of hairs) {
    out.push({ blink: 0, sway, lift, drift: { dx: sx, dy: sy, tilt: st } });
  }
  return out;
}

/** A figure's painted pixels, inside the panel and in all: its SVG drawn again over a canvas aligned with the panel. */
async function measure(svgText, box, mirrored, panelRect) {
  const [vx, vy, vw, vh] = /viewBox="([^"]*)"/.exec(svgText)[1].split(/\s+/).map(Number);
  const unit = box.width / vw;
  // A drawing area twice the figure's own box each way, centred on it (no figure paints half a box outside it).
  const W = vw * 2, H = vh * 2, PX = 1;
  const wide = svgText.replace(/viewBox="[^"]*"/, `viewBox="${vx - vw / 2} ${vy - vh / 2} ${W} ${H}"`).replace(/ width="[^"]*"/, ` width="${W}"`).replace(/ height="[^"]*"/, ` height="${H}"`)
    .replace(/<svg /, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ').replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"');
  const cw = Math.round(W * unit * PX), ch = Math.round(H * unit * PX);
  const canvas = new OffscreenCanvas(cw, ch), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const url = URL.createObjectURL(new Blob([wide], { type: 'image/svg+xml' }));
  const im = new Image(); im.src = url; await im.decode(); URL.revokeObjectURL(url);
  ctx.drawImage(im, 0, 0, cw, ch);
  im.src = '';
  const data = ctx.getImageData(0, 0, cw, ch).data;
  // Canvas pixel → screen: the canvas's left edge is half a box left of the figure's own box (mirrored, half a box right).
  const left0 = box.left - box.width / 2, top0 = box.top - box.height / 2;
  let all = 0, inside = 0, l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
  for (let y = 0; y < ch; y += 1) for (let x = 0; x < cw; x += 1) {
    if (data[(y * cw + x) * 4 + 3] <= 8) continue;
    const sx = mirrored ? box.right + box.width / 2 - (x + 0.5) / PX : left0 + (x + 0.5) / PX, sy = top0 + (y + 0.5) / PX;
    all += 1;
    if (sx >= panelRect.left && sx <= panelRect.right && sy >= panelRect.top && sy <= panelRect.bottom) inside += 1;
    if (sx < l) l = sx; if (sx > r) r = sx; if (sy < t) t = sy; if (sy > b) b = sy;
  }
  return { painted: all, ratio: all ? inside / all : 1, bounds: [l - panelRect.left, t - panelRect.top, r - panelRect.left, b - panelRect.top].map(v => Math.round(v * 10) / 10) };
}

const pct = v => `${(v * 100).toFixed(2)} %`;
const grid = document.getElementById('cases');
const results = [];
let seq = 0;

/** Paints one case, measures every figure layer as drawn and moving, and keeps its panel on the page if shown. */
async function check({ room, roster, health, turn, seats, width, height, label, name, shown }) {
  const cell = document.createElement('figure');
  const host = document.createElement('div');
  host.className = 'panel';
  cell.append(host);
  grid.append(cell);
  paintRoom(host, { room, roster, seats, width, height, cap: 46, pad: 8, fit: 'phone', tags: true, status: false });
  const panelRect = host.getBoundingClientRect();
  // paintRoom appends each present seat's figure in order: its body, then its front layer if it has one.
  const nodes = [...host.querySelectorAll('.fig')];
  const places = slotsOf(room, roster);
  const measured = [];
  for (const seat of seats.filter(s => s.location === ROOM_NAMES[room] && s.slot)) {
    const slot = places.find(s => s.id === seat.slot);
    const gesture = seat.health === 'Eliminated' ? slot.down : seat.health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture;
    const sk = skeletonOf(gesture);
    for (const layer of ['body', 'front']) {
      if (layer === 'front' && !sk.front?.length) continue;
      const node = nodes.shift();
      if (node?.dataset.part !== layer) throw new Error(`${room} ${seat.slot}: expected its ${layer} layer`);
      const box = node.getBoundingClientRect();
      const mirrored = node.style.transform.includes('scaleX(-1)');
      const still = await measure(node.querySelector('svg').outerHTML, box, mirrored, panelRect);
      let moving = still;
      if (!isStill(gesture)) {
        for (const motion of motionCorners(seat.character)) {
          const svg = dressedFigureSvg(CREW[seat.character], sk, { outfit: outfitFor(seat.location), prefix: `fc${seq += 1}`, layer, motion });
          const m = await measure(svg, box, mirrored, panelRect);
          if (m.ratio < moving.ratio) moving = m;
        }
      }
      measured.push({ place: seat.slot, character: seat.character, gesture, layer, still, moving });
    }
  }
  if (nodes.length) throw new Error(`${room}: ${nodes.length} figure layers not accounted for`);
  const leastStill = Math.min(...measured.map(m => m.still.ratio));
  const leastMoving = Math.min(...measured.map(m => m.moving.ratio));
  if (shown) {
    const caption = document.createElement('figcaption');
    caption.textContent = `${name} · ${label} · least visible ${pct(leastStill)} as drawn, ${pct(leastMoving)} moving`;
    cell.append(caption);
  } else cell.remove();
  results.push({ name, room, roster, health, turn, width, height, label, figures: new Set(measured.map(m => m.place)).size, layers: measured.length,
    leastVisible: Math.round(leastStill * 1e5) / 1e5, leastVisibleMoving: Math.round(leastMoving * 1e5) / 1e5, measured });
}

// Every case, in one order: Frontend's own first, on its native panel and the pack's 390 × 844, then
// each room full on each panel, standing and Eliminated, each turn of the characters.
const CASES = [];
for (const [width, height, label] of PANELS.slice(0, 2)) {
  CASES.push({ room: FRONTEND_CASE.room, roster: FRONTEND_CASE.roster, health: 'Healthy', turn: null, seats: frontendRoom(), width, height, label, name: 'Frontend’s case (#222): Room A full, 7 players, A3 c3', shown: true });
}
for (const [width, height, label] of PANELS) {
  for (const room of BOARD_ROOMS) {
    for (const health of HEALTHS) {
      for (const { turn, roster } of TURNS) {
        const name = `${ROOM_NAMES[room]} full · ${roster} players${health === 'Eliminated' ? ' · all Eliminated' : ''} · characters turned ${turn}`;
        // On the page: the first turn of each; every turn is measured and recorded.
        CASES.push({ room, roster, health, turn, seats: fullRoom(room, roster, health, turn), width, height, label, name, shown: turn === 0 });
      }
    }
  }
}
// ?part=i&of=n measures every n-th case from the i-th, on a page of its own (the tool runs each part
// on a fresh page, so the browser's memory stays bounded); ?shown=1 paints and measures the cases
// shown on the page, for its picture.
const query = new URLSearchParams(location.search);
const part = Number(query.get('part') ?? 0), of = Number(query.get('of') ?? 1), shownOnly = query.get('shown') === '1';
for (const [i, c] of CASES.entries()) {
  if (shownOnly ? !c.shown : i % of !== part) continue;
  await check({ ...c, shown: c.shown && (shownOnly || of === 1) });
}
// The rooms' pictures (background images of the art layers) loaded before the page says it is ready,
// so its picture shows each room behind its people.
const pictures = new Set();
for (const node of grid.querySelectorAll('.panel span')) {
  // Only the layer's own picture (a quoted url, never a fragment inside an inline SVG's markup).
  const [, url] = /^url\("([^"]+)"\)/.exec(getComputedStyle(node).backgroundImage) ?? [];
  if (url && !url.startsWith('#')) pictures.add(url);
}
await Promise.all([...pictures].map(url => { const im = new Image(); im.src = url; return im.decode().catch(() => null); }));
window.__framingCases = CASES.length;
window.__framingCheck = results;
window.__framingReady = true;
