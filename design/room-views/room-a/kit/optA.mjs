// Room A's staging, made robust: for the chosen assignment, each person's station spot (its distance w from the wall and its
// place a along it), the way they face there (within 15° of their work's own direction: the wall for the panel and the desk, the
// place's own facing for the deck, the crates and the hatch), and each view's slide along the station (at most 0.2 m either way),
// chosen to make the worst of the three views that see them as good as it can be: the edge margin (at least 6 px wanted) and, for
// Vega, Mira and Echo, who have no turned head, the angle kept clear of the Lead's 100-118° band (at least 5° wanted). Every spot
// is within 0.6 m of the plan spot. Writes staging.json. Generates nothing.
import { writeFileSync } from 'fs';
import { camera, figure, DEG } from '../roomb/ring/ring4b.mjs';
import { PLACES, FULL, IDS, EYE, SIZE, toRoom, yawOf, TURNED_HEADS } from './vis/visA.mjs';
import { PEOPLE } from './assignA.mjs';
const H2 = SIZE / 2, SLIDE = 0.2, STEP = 0.025, FOV = 70, PITCH = -5, PHONES = [[390, 653], [430, 741]];
export const ORDER = { A: 'Vega', B: 'Mira', C: 'Echo', D: 'Atlas', E: 'Lyra' };
const cams = Object.fromEntries(IDS.flatMap(v => PHONES.map(([W, SH]) => { const f = W / 2 / Math.tan((FOV / 2) * DEG), [x, z] = toRoom(PLACES[v]);
  return [`${v}${W}`, { W, SH, cam: camera({ C: [x, EYE, z], yaw: yawOf(PLACES[v].camera_facing_degrees), f, cx: W / 2, hy: SH / 2 + f * Math.tan(PITCH * DEG), mode: 'rect' }) }]; })));
const sgn = a => ((((a + 180) % 360) + 360) % 360) - 180;
const WALL = Object.fromEntries(IDS.map(id => [id, PLACES[id].near_wall[0]])), WALLFACE = { n: 0, s: 180, e: 90, w: 270 };
const spot = (pl, w, a) => ({ n: [a, H2 - w], s: [a, -H2 + w], e: [H2 - w, a], w: [-H2 + w, a] })[WALL[pl]];
const headClear = (deg, name) => { if (TURNED_HEADS.has(name)) return 90; const a = Math.abs(deg); return a < 100 ? 100 - a : a > 118 ? a - 118 : -Math.min(a - 100, 118 - a); };
function look(name, pl, x, z, faceDeg) {
  const P = PEOPLE[name], p = { name, gesture: P.gesture, x, z, Y: 0, face: faceDeg * DEG }, out = {};
  for (const v of IDS.filter(v => FULL[v].sees.includes(pl))) { let m = Infinity;
    for (const [W] of PHONES) { const { cam, SH } = cams[`${v}${W}`], fg = figure(cam, p); m = fg ? Math.min(m, fg.box[0], W - fg.box[2], fg.box[1], SH - fg.box[3]) : -999; }
    const C = cams[`${v}390`].cam.C, seen = sgn(Math.atan2(C[0] - x, C[2] - z) / DEG - faceDeg);
    out[v] = { margin: +m.toFixed(1), seen: +seen.toFixed(1), clear: +headClear(seen, name).toFixed(1) }; }
  return out;
}
const goodness = o => Math.min(o.margin / 6, o.clear / 5);   // 1 = the wanted margins exactly
const out = {};
for (const pl of IDS) {
  const name = ORDER[pl], P = PEOPLE[name], [px, pz] = toRoom(PLACES[pl]), along0 = ['n', 's'].includes(WALL[pl]) ? px : pz, views = IDS.filter(v => FULL[v].sees.includes(pl));
  const base = P.face === 'wall' ? WALLFACE[WALL[pl]] : (PLACES[pl].camera_facing_degrees + 90) % 360;
  let top = null;
  for (let dF = -15; dF <= 15; dF += 5) { const faceDeg = (base + dF + 360) % 360, memo = new Map();
    const at = (w, a) => { const k = `${w.toFixed(3)},${a.toFixed(3)}`; if (!memo.has(k)) { const [x, z] = spot(pl, w, a); memo.set(k, Math.hypot(x - px, z - pz) > 0.6001 || Math.abs(x) > H2 - 0.25 || Math.abs(z) > H2 - 0.25 ? null : look(name, pl, x, z, faceDeg)); } return memo.get(k); };
    for (let w = 0.4; w <= 0.951; w += STEP) for (let aS = along0 - 0.6; aS <= along0 + 0.601; aS += STEP) {
      const per = {}; let score = Infinity, slides = 0;
      for (const v of views) { let bestV = null;
        for (let d = -SLIDE; d <= SLIDE + 1e-9; d += STEP) { const r = at(w, aS + d); if (!r) continue; const g = goodness(r[v]);
          if (!bestV || g > bestV.g + 1e-9 || (Math.abs(g - bestV.g) < 1e-9 && Math.abs(d) < Math.abs(bestV.d))) bestV = { d: +d.toFixed(3), g, ...r[v] }; }
        if (!bestV) { score = -Infinity; break; } per[v] = bestV; score = Math.min(score, bestV.g); slides += Math.abs(bestV.d); }
      if (score === -Infinity) continue;
      const cand = { score, slides, w: +w.toFixed(3), a: +aS.toFixed(3), faceDeg, dF, per };
      if (!top || score > top.score + 0.02 || (score > top.score - 0.02 && (Math.abs(dF) < Math.abs(top.dF) || (Math.abs(dF) === Math.abs(top.dF) && slides < top.slides - 1e-9)))) top = cand; } }
  const [sx, sz] = spot(pl, top.w, top.a);
  out[pl] = { name, work: P.work, gesture: P.gesture, wall: WALL[pl], w: top.w, along: top.a, at: [+sx.toFixed(3), +sz.toFixed(3)], faceDeg: top.faceDeg, turnFromWorkDeg: top.dF, fromPlanM: +Math.hypot(sx - px, sz - pz).toFixed(2), score: +top.score.toFixed(2),
    views: Object.fromEntries(Object.entries(top.per).map(([v, o]) => { const [x, z] = spot(pl, top.w, top.a + o.d); return [v, { slideM: o.d, at: [+x.toFixed(3), +z.toFixed(3)], fromPlanM: +Math.hypot(x - px, z - pz).toFixed(2), marginPx: o.margin, seenDeg: o.seen, headClearDeg: o.clear }]; })) };
  console.log(`${pl} ${name}: (${sx.toFixed(2)}, ${sz.toFixed(2)}), ${top.w} m from the wall, ${out[pl].fromPlanM} m from the plan, facing ${top.faceDeg}° (${top.dF >= 0 ? '+' : ''}${top.dF}°); score ${out[pl].score}; ` + Object.entries(out[pl].views).map(([v, o]) => `${v} slide ${o.slideM} margin ${o.marginPx} seen ${o.seenDeg}° clear ${o.headClearDeg}`).join(' | '));
}
writeFileSync(new URL('./staging.json', import.meta.url), JSON.stringify(out, null, 1));
