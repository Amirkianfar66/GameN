// Where each of Room A's people can stand so that every view that sees them shows them whole: for each person, every spot within
// 0.6 m of their plan spot (5 cm grid, 0.3 m clear of the walls), the box of their stand-in in the PV6 camera of each of the three
// views that see them (both phones; the 70° slice is the same angle on both, so the margins are the same in degrees), and the
// angle each view sees them at with the way they face there. Prints, per person, the spots that every view shows whole with a
// margin, and the head each view's angle takes. Generates nothing.
import { camera, figure, DEG, UNIT_M } from '../roomb/ring/ring4b.mjs';
import { PLACES, FULL, IDS, CAST, EYE, SIZE, toRoom, yawOf, headFor } from './vis/visA.mjs';
const H2 = SIZE / 2, FOV = 70, PITCH = -5;
const PHONES = [[390, 844 - 99 - 92], [430, 932 - 99 - 92]];
const cams = Object.fromEntries(IDS.flatMap(v => PHONES.map(([W, SH]) => { const f = W / 2 / Math.tan((FOV / 2) * DEG), [x, z] = toRoom(PLACES[v]);
  return [`${v}${W}`, { W, SH, cam: camera({ C: [x, EYE, z], yaw: yawOf(PLACES[v].camera_facing_degrees), f, cx: W / 2, hy: SH / 2 + f * Math.tan(PITCH * DEG), mode: 'rect' }) }]; })));
const sgn = a => ((((a + 180) % 360) + 360) % 360) - 180;
// the way each person faces at a spot: Echo and Vega face their wall (north, south); Mira and Atlas face into the room as their
// place does; Lyra faces west across the hatch
export const FACE = { A: () => 0, B: () => 180, C: () => 270, D: () => (PLACES.D.camera_facing_degrees + 90) % 360, E: () => (PLACES.E.camera_facing_degrees + 90) % 360 };
export function fitAt(pl, x, z, faceDeg = FACE[pl]()) {
  const p = { ...CAST[pl], place: pl, x, z, Y: 0, face: faceDeg * DEG, mirror: false }, out = {};
  for (const v of IDS.filter(v => FULL[v].sees.includes(pl))) {
    let minMargin = Infinity, ok = true;
    for (const [W] of PHONES) { const { cam, SH } = cams[`${v}${W}`], fg = figure(cam, p); if (!fg) { ok = false; continue; }
      const m = Math.min(fg.box[0], W - fg.box[2], fg.box[1], SH - fg.box[3]); minMargin = Math.min(minMargin, m); }
    const C = cams[`${v}390`].cam.C, seen = sgn(Math.atan2(C[0] - x, C[2] - z) / DEG - faceDeg);
    out[v] = { margin: +minMargin.toFixed(1), seen: +seen.toFixed(1), head: headFor(seen, CAST[pl].name), ok: ok && minMargin >= 2 && headFor(seen, CAST[pl].name) !== 'NEEDS A SKETCH' };
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const pl of IDS) {
    const [px, pz] = toRoom(PLACES[pl]), good = [];
    for (let dx = -0.6; dx <= 0.6001; dx += 0.05) for (let dz = -0.6; dz <= 0.6001; dz += 0.05) {
      const d = Math.hypot(dx, dz); if (d > 0.6001) continue; const x = px + dx, z = pz + dz;
      if (Math.abs(x) > H2 - 0.3 || Math.abs(z) > H2 - 0.3) continue;
      const r = fitAt(pl, x, z); if (Object.values(r).every(o => o.ok)) good.push({ x: +x.toFixed(2), z: +z.toFixed(2), d: +d.toFixed(2), r });
    }
    good.sort((a, b) => a.d - b.d);
    const wallDist = g => +(Math.min(H2 - Math.abs(g.x), H2 - Math.abs(g.z))).toFixed(2);
    console.log(`${pl} ${CAST[pl].name} (${CAST[pl].work}): plan (${px.toFixed(2)}, ${pz.toFixed(2)}); spots whole in all three views: ${good.length}`);
    for (const g of good.slice(0, 4)) console.log(`   (${g.x}, ${g.z}) ${g.d} m from the plan, ${wallDist(g)} m from the wall: ` + Object.entries(g.r).map(([v, o]) => `${v} margin ${o.margin}px seen ${o.seen}° ${o.head}`).join(' | '));
    if (!good.length) { const r = fitAt(pl, px, pz); console.log('   at the plan spot: ' + Object.entries(r).map(([v, o]) => `${v} margin ${o.margin}px seen ${o.seen}° ${o.head}`).join(' | ')); }
  }
}
