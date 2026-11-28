// The cheats for views B to E, as in A: each person in a view stands within 0.6 m of their plan spot, their station moving with
// them and keeping its facing (PV6-A's for Vega, Lyra and Juno; the layout's for Mira and Atlas), so a view differs from the shared
// staging only where it must. Hard rules, on both phones at 100% and 200% text: the room's own rules (fits), no layout issue
// (whole, press areas, tags, faces, the chip, the person out of view fully out), and nobody in front of the window or the screen.
// Score: the distance from the shared spots (PV6-A's for Vega, Lyra and Juno; the plan's for Mira and Atlas), then edge clearance
// and size. Each person is scored alone first, then the best few are combined. Exports stagingAt(); run alone it searches and
// writes search7.json. Generates nothing.
import { writeFileSync } from 'fs';
import { stage7, VIEWS, SHARED, planOf } from './stage7.mjs';
import { DEG } from '../ring/ring4b.mjs';
const DIR = new URL('./', import.meta.url).pathname;
// the shared spot of each person: PV6-A's station spot, or the plan spot
export const sharedSpot = pl => (SHARED.stations[pl] ? [...SHARED.stations[pl].at] : [planOf(pl).x, planOf(pl).z].map(v => +v.toFixed(3)));
// the staging with some people at given spots (absolute x, z): a PV6-A station is rebuilt there; Mira and Atlas move with their stations
export function stagingAt(spots) {
  const stations = JSON.parse(JSON.stringify(SHARED.stations)), mv = {};
  for (const [pl, [x, z]] of Object.entries(spots)) { if (stations[pl]) stations[pl].at = [+x.toFixed(3), +z.toFixed(3)]; else { const p = planOf(pl); mv[pl] = [+(x - p.x).toFixed(3), +(z - p.z).toFixed(3)]; } }
  return { ...SHARED, moves: mv, stations };
}
const R = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], ANG = Array.from({ length: 24 }, (_, i) => i * 15);
const OFFS = [[0, 0], ...R.slice(1).flatMap(r => ANG.map(a => [+(r * Math.sin(a * DEG)).toFixed(3), +(r * Math.cos(a * DEG)).toFixed(3)]))];
// the candidate spots of a person: within 0.6 m of the plan spot, and the shared spot itself
const spotsOf = pl => { const p = planOf(pl); return [sharedSpot(pl), ...OFFS.map(([dx, dz]) => [+(p.x + dx).toFixed(3), +(p.z + dz).toFixed(3)])]; };
const fromShared = (pl, at) => Math.hypot(at[0] - sharedSpot(pl)[0], at[1] - sharedSpot(pl)[1]);
function evaluate(V, spots) {
  const st = stagingAt(spots), out = { issues: [], fits: [], clear: Infinity, heights: {} };
  for (const pct of [100, 200]) { const s = stage7(V, st, { pct }); if (pct === 100) out.fits = s.fits;
    for (const [k, v] of Object.entries(s.views)) { for (const i of v.issues) out.issues.push(`${k} ${pct}%: ${i}`);
      for (const f of ['window', 'screen']) for (const n of v.features[f].people) out.issues.push(`${k}: ${n} in front of the ${f}`);
      if (pct === 100) for (const [id, c] of Object.entries(v.per)) { out.clear = Math.min(out.clear, c.marginL, c.marginR); out.heights[`${id} ${k}`] = +(c.heightPx / v.SH).toFixed(2); } } }
  return out;
}
const scoreOf = (e, spots) => (e.fits.length ? 1000 : 0) + e.issues.length * 100 + Object.entries(spots).reduce((a, [pl, at]) => a + fromShared(pl, at), 0) * 10
  + Math.max(0, 12 - e.clear) * 0.5 + Object.values(e.heights).reduce((a, h) => a + Math.max(0, h - 0.5) * 50 + Math.max(0, 0.17 - h) * 50, 0);
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const result = {};
  for (const V of process.argv[2] ? process.argv[2].split(',') : VIEWS) {
    const people = stage7(V).sees, best = {};
    const name = pl => stage7(V).room.P(pl).name;
    for (const pl of people) best[pl] = spotsOf(pl).map(at => { const e = evaluate(V, { [pl]: at }); const own = e.issues.filter(i => i.includes(name(pl))).length;
      return { at, own, score: own * 100 + (e.fits.length ? 1000 : 0) + fromShared(pl, at) * 10 }; }).sort((a, b) => a.score - b.score).slice(0, 7);
    const combos = []; const pick = (i, acc) => { if (i === people.length) { const e = evaluate(V, acc); combos.push({ moves: acc, score: +scoreOf(e, acc).toFixed(2), issues: e.issues, fits: e.fits, clear: e.clear, heights: e.heights }); return; }
      for (const b of best[people[i]]) pick(i + 1, { ...acc, [people[i]]: b.at }); };
    pick(0, {}); combos.sort((a, b) => a.score - b.score);
    result[V] = { people, singles: Object.fromEntries(Object.entries(best).map(([k, v]) => [k, v.slice(0, 3)])), best: combos.slice(0, 5) };
    const b = combos[0]; console.log(`view ${V}: best score ${b.score} spots ${JSON.stringify(b.moves)} issues ${b.issues.length} ${JSON.stringify(b.issues.slice(0, 4))} fits ${JSON.stringify(b.fits)} clear ${b.clear} heights ${JSON.stringify(b.heights)}`);
  }
  writeFileSync(DIR + 'search7.json', JSON.stringify(result, null, 1));
}
