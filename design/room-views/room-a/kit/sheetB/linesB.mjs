// Sheet RA-B version 2: view B's guide lines on the deck, from guideB.mjs's camera, for measuring RA-B-2 (measureB2.py): the north
// wall's foot and the deck seams 1 m and 2 m from it (straight lines y = intercept + slope x in the painting), the seam 1 m west of
// the room's middle (x = -1 m, running from the north wall toward the camera, beside Vega's feet) and its crossing with the far seam,
// the desk's floor corners with their distance from the north wall, and Vega's foot anchor (the people module's figure(), as the
// stand-ins use it). Writes lines-B.json. Generates nothing. Usage: node linesB.mjs
import { writeFileSync } from 'fs';
import { cam, room, VIEWER } from './guideB.mjs';
import { figure } from '../../roomb/ring/ring4b.mjs';
import { roomWith } from '../stageA.mjs';
const r2 = v => +v.toFixed(2), P = q => cam.proj(cam.view(q)).map(r2);
const line = z => { const a = P([-1.9, 0, z]), b = P([1.9, 0, z]), s = (b[1] - a[1]) / (b[0] - a[0]); return { z, slope: +s.toFixed(5), intercept: +(a[1] - s * a[0]).toFixed(2) }; };
const desk = room.objects.find(o => o.name === 'PC desk'), floor = desk.faces.flatMap(f => f.pts).filter(q => q[1] < 0.02);
const corners = [...new Map(floor.map(q => [q.map(v => v.toFixed(3)).join(), q])).values()].map(q => ({ world: q.map(v => +v.toFixed(3)), fromWallM: +(2 - q[2]).toFixed(3), px: P(q) }));
const a = P([-1, 0, 2]), b = P([-1, 0, 0.2]);
const vega = roomWith(VIEWER).people.find(p => p.name === 'Vega'), fg = figure(cam, vega);
const out = { view: VIEWER, wallFoot: line(2), seam1: line(1), seam2: line(0), seamXm1: { x: -1, at: a, dxdy: +((b[0] - a[0]) / (b[1] - a[1])).toFixed(5), crossSeam1: P([-1, 0, 1]) },
  desk: corners, vega: { anchor: fg.anchor.map(r2) } };
writeFileSync(new URL('./lines-B.json', import.meta.url), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ wallFoot: out.wallFoot, seam1: out.seam1, vega: out.vega, cross: out.seamXm1.crossSeam1 }));
