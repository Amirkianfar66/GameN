// For each of Room A's people at a station on their wall: at each distance from the wall (5 cm steps), the stretch along the wall
// where each view that sees them shows them whole (a margin of at least 2 px on both phones) and with a head the crew has, kept
// within 0.6 m of the plan spot. Prints the stretches, and the shortest station that holds one spot for every view. Generates nothing.
import { fitAt, FACE } from './fitA.mjs';
import { PLACES, FULL, IDS, CAST, SIZE, toRoom } from './vis/visA.mjs';
const H2 = SIZE / 2;
const WALL = { A: 'n', B: 's', C: 'e', D: 'w', E: 'n' };
// a spot at distance w from the wall and a along it (east for n and s, north for e and w)
const spot = (pl, w, a) => ({ n: [a, H2 - w], s: [a, -H2 + w], e: [H2 - w, a], w: [-H2 + w, a] })[WALL[pl]];
for (const pl of IDS) {
  const [px, pz] = toRoom(PLACES[pl]), along0 = ['n', 's'].includes(WALL[pl]) ? px : pz, views = IDS.filter(v => FULL[v].sees.includes(pl));
  console.log(`${pl} ${CAST[pl].name} (${CAST[pl].work}), wall ${WALL[pl]}, plan along ${along0.toFixed(2)}; views ${views.join('')}`);
  for (let w = 0.35; w <= 0.951; w += 0.05) {
    const per = Object.fromEntries(views.map(v => [v, []]));
    for (let a = along0 - 0.8; a <= along0 + 0.801; a += 0.025) { const [x, z] = spot(pl, w, a); if (Math.hypot(x - px, z - pz) > 0.6001 || Math.abs(x) > H2 - 0.25 || Math.abs(z) > H2 - 0.25) continue;
      const r = fitAt(pl, x, z); for (const v of views) if (r[v].ok) per[v].push(+a.toFixed(3)); }
    const iv = Object.fromEntries(Object.entries(per).map(([v, as]) => [v, as.length ? [Math.min(...as), Math.max(...as)] : null]));
    const all = Object.values(iv).every(Boolean), lo = all ? Math.min(...Object.values(iv).map(r => r[1])) : null, hi = all ? Math.max(...Object.values(iv).map(r => r[0])) : null;
    const need = all ? Math.max(0, hi - lo) : null;   // the shortest stretch that meets every view's interval
    console.log(`   w ${w.toFixed(2)}: ` + views.map(v => `${v} ${iv[v] ? iv[v].map(n => n.toFixed(2)).join('..') : 'none'}`).join(' | ') + (all ? `  -> slides span ${need.toFixed(2)} m (${Math.min(lo, hi).toFixed(2)}..${Math.max(lo, hi).toFixed(2)})` : ''));
  }
}
