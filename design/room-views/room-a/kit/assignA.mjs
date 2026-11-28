// Who stands where: each Room A person (their work fixes their pose and the way they face) tried at each of the five places, with
// their station on that place's wall: at each distance from the wall, the stretch along it where each view that sees them shows
// them whole (2 px margin on both phones) with a head the crew has, within 0.6 m of the plan spot; the shortest slide that serves
// all three views. Then every assignment of the five to the places, ranked by its longest slide. Generates nothing.
import { camera, figure, DEG } from '../roomb/ring/ring4b.mjs';
import { PLACES, FULL, IDS, EYE, SIZE, toRoom, yawOf, headFor } from './vis/visA.mjs';
const H2 = SIZE / 2, FOV = 70, PITCH = -5, PHONES = [[390, 653], [430, 741]];
const cams = Object.fromEntries(IDS.flatMap(v => PHONES.map(([W, SH]) => { const f = W / 2 / Math.tan((FOV / 2) * DEG), [x, z] = toRoom(PLACES[v]);
  return [`${v}${W}`, { W, SH, cam: camera({ C: [x, EYE, z], yaw: yawOf(PLACES[v].camera_facing_degrees), f, cx: W / 2, hy: SH / 2 + f * Math.tan(PITCH * DEG), mode: 'rect' }) }]; })));
const sgn = a => ((((a + 180) % 360) + 360) % 360) - 180;
export const PEOPLE = {
  Echo: { crew: 'c9', gesture: 'wallPanelBack', face: 'wall', work: 'electrical panel' },
  Vega: { crew: 'c1', gesture: 'consoleBack', face: 'wall', work: 'PC workstation' },
  Lyra: { crew: 'c3', gesture: 'floorSit', face: 'room', work: 'floor hatch' },
  Mira: { crew: 'c8', gesture: 'think', face: 'room', work: 'open deck' },
  Atlas: { crew: 'c4', gesture: 'leanCrates', face: 'room', work: 'crates' },
};
const WALL = Object.fromEntries(IDS.map(id => [id, PLACES[id].near_wall[0]]));
const WALLFACE = { n: 0, s: 180, e: 90, w: 270 };
const spot = (pl, w, a) => ({ n: [a, H2 - w], s: [a, -H2 + w], e: [H2 - w, a], w: [-H2 + w, a] })[WALL[pl]];
export function fitOne(name, pl, x, z) {
  const P = PEOPLE[name], faceDeg = P.face === 'wall' ? WALLFACE[WALL[pl]] : (PLACES[pl].camera_facing_degrees + 90) % 360, p = { name, gesture: P.gesture, x, z, Y: 0, face: faceDeg * DEG }, out = {};
  for (const v of IDS.filter(v => FULL[v].sees.includes(pl))) { let m = Infinity, ok = true;
    for (const [W] of PHONES) { const { cam, SH } = cams[`${v}${W}`], fg = figure(cam, p); if (!fg) { ok = false; continue; } m = Math.min(m, fg.box[0], W - fg.box[2], fg.box[1], SH - fg.box[3]); }
    const C = cams[`${v}390`].cam.C, seen = sgn(Math.atan2(C[0] - x, C[2] - z) / DEG - faceDeg), head = headFor(seen, name);
    out[v] = { margin: +m.toFixed(1), seen: +seen.toFixed(1), head, ok: ok && m >= 2 && head !== 'NEEDS A SKETCH' }; }
  return out;
}
export function best(name, pl) {
  const [px, pz] = toRoom(PLACES[pl]), along0 = ['n', 's'].includes(WALL[pl]) ? px : pz, views = IDS.filter(v => FULL[v].sees.includes(pl)); let top = null;
  for (let w = 0.35; w <= 0.951; w += 0.05) { const per = Object.fromEntries(views.map(v => [v, []]));
    for (let a = along0 - 0.8; a <= along0 + 0.801; a += 0.025) { const [x, z] = spot(pl, w, a); if (Math.hypot(x - px, z - pz) > 0.6001 || Math.abs(x) > H2 - 0.25 || Math.abs(z) > H2 - 0.25) continue;
      const r = fitOne(name, pl, x, z); for (const v of views) if (r[v].ok) per[v].push(a); }
    if (!Object.values(per).every(a => a.length)) continue;
    const iv = Object.fromEntries(Object.entries(per).map(([v, as]) => [v, [Math.min(...as), Math.max(...as)]])), lo = Math.min(...Object.values(iv).map(r => r[1])), hi = Math.max(...Object.values(iv).map(r => r[0]));
    const span = Math.max(0, hi - lo); if (!top || span < top.span - 1e-9) top = { w: +w.toFixed(2), span: +span.toFixed(3), iv, from: Math.min(lo, hi), to: Math.max(lo, hi) }; }
  return top;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const T = {}; for (const n of Object.keys(PEOPLE)) { T[n] = {}; for (const pl of IDS) T[n][pl] = best(n, pl); }
  console.log('slide each person needs at each place (m), at the best distance from the wall:');
  console.log('        ' + IDS.map(pl => pl.padStart(12)).join(''));
  for (const n of Object.keys(PEOPLE)) console.log(n.padEnd(8) + IDS.map(pl => (T[n][pl] ? `${T[n][pl].span.toFixed(2)}@${T[n][pl].w}` : 'none').padStart(12)).join(''));
  const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
  const ranked = perms(Object.keys(PEOPLE)).map(order => { const cells = IDS.map((pl, i) => T[order[i]][pl]); return { order, ok: cells.every(Boolean), worst: cells.every(Boolean) ? Math.max(...cells.map(c => c.span)) : Infinity, sum: cells.every(Boolean) ? cells.reduce((s, c) => s + c.span, 0) : Infinity }; })
    .filter(r => r.ok).sort((a, b) => a.worst - b.worst || a.sum - b.sum);
  console.log(`assignments that fit: ${ranked.length} of 120`);
  for (const r of ranked.slice(0, 8)) console.log('   ' + IDS.map((pl, i) => `${pl} ${r.order[i]}`).join(', ') + `   longest slide ${r.worst.toFixed(2)} m, total ${r.sum.toFixed(2)} m`);
}
