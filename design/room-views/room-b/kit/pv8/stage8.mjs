// Room B's views B, C, D and E, version 2 (sheets PV6-B to PV6-E): one room, its furniture identical in every view (the Lead,
// 18 November 2026: "Furniture stays identical in every view. A cheat moves only a person, and every cheat is listed per view").
// The stations: Vega's bench, Lyra's console and Juno's stool and cart as PV6-A painted them (report6.mjs STAGING, stage6.mjs
// restage); Mira's tablet console and Atlas's bench where the per-place layout the owner has seen puts them (vis5.mjs build).
// A cheat moves a person only, and only along their own station, so their pose still meets it: Vega and Atlas slide along their
// bench, Lyra along her console's working edge; Mira, who holds her tablet, may step about her console; Juno sits on her stool
// and does not move. The camera stands at the viewer's plan spot, eye height, the place's camera facing, straight lines, 70°
// across, 5° down by a lens shift (as PV6-A and version 1). Generates nothing.
import { build, phoneView, IDS, EYE, FULL } from '../vis/vis5.mjs';
import { DEG } from '../ring/ring4b.mjs';
import { cheatRoom, fits, obox } from '../pv6/stage6.mjs';
import { STAGING as STAGING_A } from '../pv6/report6.mjs';
export const VIEWS = ['B', 'C', 'D', 'E'];
const PLAN = build(4);
export const planOf = id => { const p = PLAN.P(id); return { x: p.x, z: p.z, face: p.face, camYaw: p.camYaw }; };
export const STATIONS = STAGING_A.stations;
const dirOf = deg => [Math.sin(deg * DEG), Math.cos(deg * DEG)];
const compassOf = (dx, dz) => (((Math.atan2(dx, dz) / DEG) % 360) + 360) % 360;
// the room with nobody cheated: every station and every person at the shared staging
export function sharedRoom() { return cheatRoom({}, STATIONS); }
// each person's shared spot and the line a cheat may move them along (unit vector, compass, and the allowed range in metres)
const S0 = sharedRoom();
const axisOf = o => { const [a, b] = [o.foot[0], o.foot[1]], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); return [dx / L, dz / L]; };
export const SLIDES = (() => {
  const out = {};
  for (const pl of IDS) {
    const p = S0.P(pl), at = [+p.x.toFixed(4), +p.z.toFixed(4)];
    if (pl === 'E') { const bench = S0.objects.find(o => o.place === 'E' && o.name === 'bench'), u = axisOf(bench); out[pl] = { at, kind: 'slide', along: 'her bench', u, compass: +compassOf(...u).toFixed(1) }; }
    else if (pl === 'D') { const bench = S0.objects.find(o => o.place === 'D' && o.name === 'bench'), u = axisOf(bench); out[pl] = { at, kind: 'slide', along: 'his bench', u, compass: +compassOf(...u).toFixed(1) }; }
    else if (pl === 'C') { const c = S0.objects.find(o => o.place === 'C'), u = axisOf(c); out[pl] = { at, kind: 'slide', along: "her console's working edge", u, compass: +compassOf(...u).toFixed(1) }; }
    else if (pl === 'A') out[pl] = { at, kind: 'step', along: 'about her tablet console' };
    else out[pl] = { at, kind: 'none', along: 'seated on her stool' };
  }
  return out;
})();
// the room for one view: the shared room with some people moved (cheats = { place: [x, z] }); the furniture never moves
export function roomWith(cheats = {}, { capsule = null } = {}) {
  const room = sharedRoom();
  for (const [pl, at] of Object.entries(cheats)) { const p = room.P(pl); [p.x, p.z] = at; }
  if (capsule) room.objects.push(capsule(room));
  return room;
}
export function camAt8(viewer) { const V = planOf(viewer); return { C: [V.x, EYE, V.z], yaw: V.camYaw }; }
export function stage8(viewer, cheats = {}, { pct = 100, capsule = null } = {}) {
  const room = roomWith(cheats, { capsule }), { C, yaw } = camAt8(viewer);
  const views = Object.fromEntries([[390, 844], [430, 932]].map(([W, H]) => [`${W}x${H}`, phoneView(room, viewer, IDS, { W, H, pct, fov: 70, pitch: -5, farScale: 1, lens: 'rect', C, yaw })]));
  return { room, C, yaw, views, fits: fits(room), sees: FULL[viewer].sees, blind: FULL[viewer].blind_place };
}
export { FULL, IDS, EYE, obox, dirOf, compassOf };
