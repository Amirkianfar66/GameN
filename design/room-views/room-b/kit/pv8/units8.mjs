// The food capsule units of Room B's new layout (ship-life's capsule.mjs kinds): a counter unit standing on a station's top
// (it moves with that station where a view moves it), or a wall unit on its bracket (part of the room: it never moves). For each
// unit: its object for the room, the face its hatch is on, and the places and heights of its hatch, handle, tray and light in the
// room, which way it faces, and the visitor's spot beside it (never in front of the hatch, within reach). The layouts are the
// Lead's options of 18 November; which one is built is the owner's choice. Generates nothing.
import { obox } from '../pv6/stage6.mjs';
import { DEG } from '../ring/ring4b.mjs';
import { capsuleOf, placeOf, DIMS } from './capsule8.mjs';
// ship-life's wall unit (Room A: 29 x 100 in the room picture), at the counter unit's scale: 0.19 m wide, 0.67 m tall, 0.15 m out
// from the wall on its bracket, 0.70 to 1.37 m up; the hatch 0.14 m wide, 0.95 to 1.11 m up; the light 0.08 m above the hatch
export const WALL = { w: 0.19, h: 0.67, d: 0.15, y0: 0.70, hatch: { w: 0.14, y0: 0.95, y1: 1.11 }, light: { y: 1.19, r: 0.024 }, bracket: 0.04 };
const WALLS = { north: { n: [0, -1], at: s => [s, 2] }, south: { n: [0, 1], at: s => [s, -2] }, east: { n: [-1, 0], at: s => [2, s] }, west: { n: [1, 0], at: s => [-2, s] } };
// the layouts: A1, the owner's choice (relayed by the Lead, 18 November): the counter unit on Atlas's bench at its north-west end,
// its hatch facing east into the room (99°), painted in B and C; its visitor's spot is the one that hides none of the hatch and the
// least of the screen (_spot99.mjs). W2, two wall units, was the other layout studied and is not built.
export const LAYOUTS = {
  // visitorIn.D: in D's staging only, the eating spot cheated out of the frame on both phones by the smallest move that clears the
  // whole figure (the Lead, 18 November; _dspot8.mjs): D never draws the unit, which stands on Atlas's own bench
  A1: [{ id: 'K1', kind: 'counter', on: 'D', end: -1, inset: 0.13, across: 0, faceDeg: 99, visitor: { along: -0.3, out: 0.2 },
    visitorIn: { D: { at: [-1.787, 0.653], why: 'out of the frame on both phones while they eat', by: 'the Lead, 18 November' } } }],
  W2: [{ id: 'K1', kind: 'wall', wall: 'north', s: 0.8, visitor: { along: -0.3, out: 0.2 } }, { id: 'K2', kind: 'wall', wall: 'west', s: -1.6, visitor: { along: -0.45, out: 0.15 } }],
};
const dirOf = deg => [Math.sin(deg * DEG), Math.cos(deg * DEG)];
// a unit in a view's room: its centre on the deck, base height, facing (compass of the hatch), and its room object
export function unitIn(room, u) {
  if (u.kind === 'counter') { const p = placeOf(room, u), o = capsuleOf(u)(room); o.place = u.on; o.unit = u.id; o.kind = 'counter';
    return { u, o, c: p.c, y0: p.y0, faceDeg: u.faceDeg, n: dirOf(u.faceDeg), w: DIMS.w, d: DIMS.d, h: DIMS.h, hatch: { w: DIMS.hatch.w, y0: p.y0 + DIMS.hatch.y0, y1: p.y0 + DIMS.hatch.y1 }, light: { y: p.y0 + DIMS.light.y, r: DIMS.light.r } }; }
  const W = WALLS[u.wall], [wx, wz] = W.at(u.s), c = [wx + W.n[0] * WALL.d / 2, wz + W.n[1] * WALL.d / 2], faceDeg = (Math.atan2(W.n[0], W.n[1]) / DEG + 360) % 360;
  const o = obox('food capsule', u.id, c, WALL.w, WALL.d, WALL.y0, WALL.y0 + WALL.h, (faceDeg - 180) * DEG); o.unit = u.id; o.kind = 'wall';
  return { u, o, c, y0: WALL.y0, faceDeg, n: W.n, w: WALL.w, d: WALL.d, h: WALL.h, hatch: { ...WALL.hatch }, light: { ...WALL.light } };
}
// the parts the code draws over the painted unit, in the room (metres): the hatch's four corners on the front face, the handle
// along the hatch's foot, the tray inside (behind the hatch, at its foot), the light's centre and radius; and the unit's facing
export function partsOf(U) {
  const n = U.n, r = [n[1], -n[0]], f = [U.c[0] + n[0] * U.d / 2, U.c[1] + n[1] * U.d / 2], at = (a, y, depth = 0) => [+(f[0] + r[0] * a - n[0] * depth).toFixed(3), +y.toFixed(3), +(f[1] + r[1] * a - n[1] * depth).toFixed(3)], hw = U.hatch.w / 2;
  return { facingDeg: +U.faceDeg.toFixed(1), front: at(0, (U.hatch.y0 + U.hatch.y1) / 2),
    hatch: [at(-hw, U.hatch.y0), at(hw, U.hatch.y0), at(hw, U.hatch.y1), at(-hw, U.hatch.y1)], handle: [at(-0.045, U.hatch.y0 + 0.012), at(0.045, U.hatch.y0 + 0.012)],
    tray: { at: at(0, U.hatch.y0 + 0.015, U.d * 0.45), width: +(U.hatch.w * 0.85).toFixed(3), depth: +(U.d * 0.7).toFixed(3) }, light: { at: at(0, U.light.y), r: U.light.r },
    note: 'room metres: x east, y up from the deck, z north; the hatch slides up into the housing as it opens (ship-life), so the open hatch is drawn up to its own height above y1' };
}
// the visitor's spot on the deck, from the unit's centre: along its face (t = the normal turned a quarter clockwise, compass +90°)
// by along, and out from it by out, in metres (the spots found clean by _units8b.mjs)
// view: a view whose staging needs the spot on the unit's other side (visitorIn; the north unit in B, where Vega's moved bench
// stands west of it), or none for the spot every other view uses
export function visitorOf(U, view = null) { const n = U.n, t = [n[1], -n[0]], v = (view && U.u.visitorIn?.[view]) || U.u.visitor;
  if (v.at) return [...v.at];   // a view's cheated spot, given on the deck
  return [+(U.c[0] + t[0] * v.along + n[0] * v.out).toFixed(3), +(U.c[1] + t[1] * v.along + n[1] * v.out).toFixed(3)]; }
