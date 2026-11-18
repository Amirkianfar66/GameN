// Version 2: the pieces of views B to E as PLACE names them, the capsule units included (PV6-A's pieces6.mjs, for any view): for each piece in view (guide8.mjs's
// pieces), the wall it stands by and how far, how its long side lies against that wall and against the line of sight, and where
// its parts fall in the painting. Adds them to pieces8-<view>.json. Usage: node pieces7.mjs <view>
import { readFileSync, writeFileSync } from 'fs';
const VIEW = process.argv[2];
const { room, cam, pieces, GW } = await import(`./guide8.mjs?view=${VIEW}`);
import { project } from '../ring/ring4b.mjs';
const DIR = new URL('./', import.meta.url).pathname, P = q => project(cam, q), C = cam.C;
const byWall = o => { const f = o.foot, h = room.size / 2, xs = f.map(p => p[0]), zs = f.map(p => p[1]);
  const gaps = { west: Math.min(...xs) + h, east: h - Math.max(...xs), south: Math.min(...zs) + h, north: h - Math.max(...zs) }, [wall, gap] = Object.entries(gaps).sort((a, b) => a[1] - b[1])[0];
  const e1 = [f[1][0] - f[0][0], f[1][1] - f[0][1]], e2 = [f[2][0] - f[1][0], f[2][1] - f[1][1]], long = Math.hypot(...e1) >= Math.hypot(...e2) ? e1 : e2;
  const along = ['west', 'east'].includes(wall) ? [0, 1] : [1, 0], c = Math.abs(long[0] * along[0] + long[1] * along[1]) / Math.hypot(...long);
  return { wall, wallGapM: +gap.toFixed(2), longSideToWallDeg: +(Math.acos(Math.min(1, c)) * 180 / Math.PI).toFixed(0), long }; };
const xOf = o => cam.proj(cam.view(o.c))[0];
const range = o => { const xs = o.faces.map(f => P(f.pts)).filter(Boolean).flat().map(q => q[0]); return xs.length ? [Math.min(...xs), Math.max(...xs)] : null; };
const base = JSON.parse(readFileSync(DIR + `pieces8-${VIEW}.json`, 'utf8'));
const out = pieces().map((p, k) => { const main = p.objects[0], w = byWall(main), sight = [main.c[0] - C[0], main.c[2] - C[2]];
  const cos = Math.abs(w.long[0] * sight[0] + w.long[1] * sight[1]) / (Math.hypot(...w.long) * Math.hypot(...sight)); delete w.long;
  return { ...base[k], ...w, longSideToSightDeg: +(Math.acos(Math.min(1, cos)) * 180 / Math.PI).toFixed(0), dist: +p.dist.toFixed(2),
    partsX: Object.fromEntries(p.objects.map(o => [o.name, +xOf(o).toFixed(0)])), partsDist: Object.fromEntries(p.objects.map(o => [o.name, +cam.view(o.c)[2].toFixed(2)])),
    partsInPicture: Object.fromEntries(p.objects.map(o => { const r = range(o); return [o.name, !!r && r[1] > 0 && r[0] < GW]; })) }; });
writeFileSync(DIR + `pieces8-${VIEW}.json`, JSON.stringify(out, null, 1));
for (const p of out) console.log(p.place, p.name, 'wall', p.wall, p.wallGapM, 'm, long side to wall', p.longSideToWallDeg, '| to sight', p.longSideToSightDeg, '| depth', p.dist, '| parts', JSON.stringify(p.partsX), JSON.stringify(p.partsInPicture));
