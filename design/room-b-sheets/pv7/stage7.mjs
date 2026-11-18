// Room B's views B, C, D and E (sheets PV6-B to PV6-E), by PV6-A's method: one staging of the whole room, shared by every view.
// Vega (E), Lyra (C) and Juno (B) stand at PV6-A's accepted poses with their stations built from them (report6.mjs STAGING,
// stage6.mjs restage); Mira (A) and Atlas (D) stand at their plan spots with the layout's own stations (vis5.mjs build: Mira's
// tablet console at her left, Atlas's bench in front of him). A view may cheat a person (up to about 0.6 m, their station moving
// with them, as in A) only where that view needs it to fit; such a cheat is listed in its camera report. The camera stands at the
// viewer's plan spot, at eye height, turned to the place's camera facing: straight lines, 70° across on both phones, 5° down by a
// lens shift (stage6.mjs, phoneView in 'rect' mode). The viewer's own station is never drawn in their view. Generates nothing.
import { build, phoneView, IDS, EYE, FULL, PLACES } from '../vis/vis5.mjs';
import { DEG } from '../ring/ring4b.mjs';
import { cheatRoom, fits } from '../pv6/stage6.mjs';
import { STAGING as STAGING_A } from '../pv6/report6.mjs';

export const VIEWS = ['B', 'C', 'D', 'E'];
const PLAN = build(4);
export const planOf = id => { const p = PLAN.P(id); return { x: p.x, z: p.z, face: p.face, camYaw: p.camYaw }; };
// the shared staging: PV6-A's stations for E, C and B, word for word; A and D as the layout builds them
export const SHARED = { fov: 70, back: 0, turnDeg: 0, farScale: 1, moves: {}, stations: STAGING_A.stations };
// the camera at the viewer's plan spot (not a cheated one), turned to the place's own camera facing (+ turnDeg to the right)
export function camAt7(viewer, { back = 0, turnDeg = 0 } = {}) {
  const V = planOf(viewer), yaw = V.camYaw + turnDeg * DEG;
  return { C: [V.x - Math.sin(V.camYaw) * back, EYE, V.z - Math.cos(V.camYaw) * back], yaw };
}
// the camera's frame: u to screen right, v into the picture (metres, on the deck)
export function frame7(viewer, opts = {}) {
  const { C, yaw } = camAt7(viewer, opts), right = [Math.cos(yaw), -Math.sin(yaw)], fwd = [Math.sin(yaw), Math.cos(yaw)];
  return { C, yaw, right, fwd, at: (u, v) => [C[0] + u * right[0] + v * fwd[0], C[2] + u * right[1] + v * fwd[1]], uv: (x, z) => [(x - C[0]) * right[0] + (z - C[2]) * right[1], (x - C[0]) * fwd[0] + (z - C[2]) * fwd[1]] };
}
export const roomOf = (staging = SHARED) => cheatRoom(staging.moves ?? {}, staging.stations ?? {});
export function stage7(viewer, staging = SHARED, { pct = 100 } = {}) {
  const room = roomOf(staging), { C, yaw } = camAt7(viewer, staging);
  const views = Object.fromEntries([[390, 844], [430, 932]].map(([W, H]) => [`${W}x${H}`, phoneView(room, viewer, IDS, { W, H, pct, fov: staging.fov ?? 70, pitch: -5, farScale: staging.farScale ?? 1, lens: 'rect', C, yaw })]));
  return { room, C, yaw, views, fits: fits(room), sees: FULL[viewer].sees, blind: FULL[viewer].blind_place };
}
export { PLACES, FULL, IDS };
