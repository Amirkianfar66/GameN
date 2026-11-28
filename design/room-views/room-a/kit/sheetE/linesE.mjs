// Sheet RA-E version 2: view E's guide lines on the deck, from guideE.mjs's camera, for measuring RA-E-1 (measureE2.py): the west
// wall's foot (x = -2 m) and the deck seam 1 m out from it (x = -1 m), which Atlas's crates stand between; the south wall's foot
// (z = -2 m) and its seam 1 m out (z = -1 m); the crates' floor corners with their distance from the west wall; Atlas's foot anchor
// (the people module's figure(), as the stand-ins use it); Echo's cabinet's outline on the east wall; and the east and south walls'
// corner at the deck. Straight lines are
// y = intercept + slope x in the painting. Writes lines-E.json. Generates nothing. Usage: node linesE.mjs
import { writeFileSync } from 'fs';
import { cam, room, VIEWER } from './guideE.mjs';
import { figure } from '../../roomb/ring/ring4b.mjs';
import { roomWith } from '../stageA.mjs';
const r2 = v => +v.toFixed(2), P = q => cam.proj(cam.view(q)).map(r2);
const line = (axis, v, a0, a1) => { const q = u => (axis === 'z' ? [u, 0, v] : [v, 0, u]), a = P(q(a0)), b = P(q(a1)), s = (b[1] - a[1]) / (b[0] - a[0]); return { axis, at: v, along: [a0, a1], slope: +s.toFixed(5), intercept: +(a[1] - s * a[0]).toFixed(2) }; };
const uniq = pts => [...new Map(pts.map(q => [q.map(v => v.toFixed(3)).join(), q])).values()];
const crates = room.objects.filter(o => o.name === 'crate'), floor = uniq(crates.flatMap(o => o.faces.flatMap(f => f.pts)).filter(q => q[1] < 0.02));
const cab = room.objects.filter(o => o.name === 'electrical panel'), cabPts = uniq(cab.flatMap(o => o.faces.flatMap(f => f.pts)));
const atlas = roomWith(VIEWER).people.find(p => p.name === 'Atlas'), fg = figure(cam, atlas);
const out = { view: VIEWER,
  westFoot: line('x', -2, -1.9, -0.5), westSeam1: line('x', -1, -1.9, -0.5), southFoot: line('z', -2, -1.9, 1.9), southSeam1: line('z', -1, -1.9, 1.9),
  crates: floor.map(q => ({ world: q.map(v => +v.toFixed(3)), fromWestWallM: +(q[0] + 2).toFixed(3), px: P(q) })),
  atlas: { world: atlas.at ? atlas.at : null, anchor: fg.anchor.map(r2) },
  cabinet: cabPts.map(q => ({ world: q.map(v => +v.toFixed(3)), px: P(q) })), eastSouthCorner: P([2, 0, -2]) };
writeFileSync(new URL('./lines-E.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ westFoot: out.westFoot, westSeam1: out.westSeam1, southFoot: out.southFoot, crates: out.crates.map(c => [c.world, c.px]), atlas: out.atlas, cabinetX: [Math.min(...out.cabinet.map(c => c.px[0])), Math.max(...out.cabinet.map(c => c.px[0]))] }));
