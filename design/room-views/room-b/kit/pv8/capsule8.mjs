// The food capsule for Room B's new layout (the owner: "in each room you have a food capsule characters eating from, eat like
// past"; the approved ship-life package, docs/design/ship-life.md and design/ship-life/capsule.mjs): a counter unit, a steel
// housing with a rounded top on a foot, a paper hatch whose handle slides up into the housing, a compartment with a tray behind
// it, a vent under the hatch and a small light on top. Its proportions are capsule.mjs's counter unit (36 x 60 in the room
// pictures): 0.24 m wide, 0.40 m tall, 0.22 m deep; the hatch 0.17 m wide, 0.13 to 0.27 m up; the light's centre 0.30 m up.
// It stands on a counter: { on: station place, end: -1 | 1 along the counter's long side, inset: m from that end, faceDeg:
// compass of the hatch }. Exports capsuleOf(spec) for stage8.mjs's roomWith and the box of its hatch. Generates nothing.
import { obox } from '../pv6/stage6.mjs';
import { DEG } from '../ring/ring4b.mjs';
export const DIMS = { w: 0.24, h: 0.40, d: 0.22, hatch: { w: 0.17, y0: 0.13, y1: 0.27 }, light: { y: 0.30, r: 0.028 }, foot: 0.047 };
const dirOf = deg => [Math.sin(deg * DEG), Math.cos(deg * DEG)];
// the counter's long axis, its centre, top and half-length
export function counterOf(room, on) { const o = room.objects.find(q => q.place === on && (q.name === 'bench' || q.name === 'console' || q.name === 'tablet console' || q.name === 'laptop cart'));
  const [a, b, c2, d] = o.foot, L = Math.hypot(b[0] - a[0], b[1] - a[1]), D = Math.hypot(d[0] - a[0], d[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [(d[0] - a[0]) / D, (d[1] - a[1]) / D];
  return { o, c: [o.c[0], o.c[2]], u, n, L, D, top: o.h }; }
export function placeOf(room, spec) { const k = counterOf(room, spec.on), s = spec.end * (k.L / 2 - spec.inset), t = spec.across ?? 0;
  return { c: [k.c[0] + k.u[0] * s + k.n[0] * t, k.c[1] + k.u[1] * s + k.n[1] * t], y0: k.top, yaw: (spec.faceDeg - 180) * DEG, k }; }
// the capsule as a room object (place 'K', so no view leaves it out as its viewer's own station)
export const capsuleOf = spec => room => { const p = placeOf(room, spec), o = obox('food capsule', 'K', p.c, DIMS.w, DIMS.d, p.y0, p.y0 + DIMS.h, p.yaw); o.spec = spec; o.on = spec.on; return o; };
// the hatch's four corners in the room (on the capsule's front face)
export function hatchOf(room, spec) { const p = placeOf(room, spec), f = dirOf(spec.faceDeg), r = [Math.cos(p.yaw), -Math.sin(p.yaw)], front = [p.c[0] + f[0] * DIMS.d / 2, p.c[1] + f[1] * DIMS.d / 2], hw = DIMS.hatch.w / 2;
  return [[-hw, DIMS.hatch.y0], [hw, DIMS.hatch.y0], [hw, DIMS.hatch.y1], [-hw, DIMS.hatch.y1]].map(([a, y]) => [front[0] + r[0] * a, p.y0 + y, front[1] + r[1] * a]); }
