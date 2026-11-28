// Sheet RA-D version 2: view D's guide lines on the deck, from guideD.mjs's camera, for measuring RA-D-1 (measureD2.py): the north
// wall's foot (z = 2 m, the left wall in the picture) and the deck seam 1 m out from it (z = 1 m), which Vega's desk, the hatch and
// its lid stand between; the east wall's foot (x = 2 m, the right wall) and its seams 1 and 2 m out (x = 1 m, x = 0 m); the floor
// points of the desk and the hatch, and the lid's foot; the people's foot anchors in view (the people module's figure(), as the stand-ins use
// it), with their places on the deck; the food-capsule visitors' spot (stageA.mjs's VISIT, where a visitor stands at the capsule),
// the capsule's outline, and the walls' corner at the deck. Straight lines are y = intercept + slope x in the painting. Writes
// lines-D.json. Generates nothing. Usage: node linesD.mjs
import { writeFileSync } from 'fs';
import { cam, room, VIEWER } from './guideD.mjs';
import { figure } from '../../roomb/ring/ring4b.mjs';
import { roomWith, VISIT } from '../stageA.mjs';
const r2 = v => +v.toFixed(2), r3 = v => +v.toFixed(3), P = q => cam.proj(cam.view(q)).map(r2);
const line = (axis, v, a0, a1) => { const q = u => (axis === 'z' ? [u, 0, v] : [v, 0, u]), a = P(q(a0)), b = P(q(a1)), s = (b[1] - a[1]) / (b[0] - a[0]); return { axis, at: v, along: [a0, a1], slope: +s.toFixed(5), intercept: +(a[1] - s * a[0]).toFixed(2) }; };
const uniq = pts => [...new Map(pts.map(q => [q.map(v => v.toFixed(3)).join(), q])).values()];
const floorOf = name => uniq(room.objects.filter(o => o.name === name).flatMap(o => o.faces.flatMap(f => f.pts)).filter(q => q[1] < 0.02)).map(q => ({ world: q.map(r3), px: P(q) }));
// the lid stands on the hatch's rim, its foot 0.02 m up: its lowest points are its foot
const footOf = name => { const ps = room.objects.filter(o => o.name === name).flatMap(o => o.faces.flatMap(f => f.pts)), y0 = Math.min(...ps.map(q => q[1])); return uniq(ps.filter(q => q[1] < y0 + 0.001)).map(q => ({ world: q.map(r3), px: P(q) })); };
// a painting pixel back to the deck (y = 0), by Newton's method on the camera's own projection
const onDeck = ([u, v]) => { let x = 0, z = 0; for (let i = 0; i < 60; i++) { const p = cam.proj(cam.view([x, 0, z])), e = 1e-4, px = cam.proj(cam.view([x + e, 0, z])), pz = cam.proj(cam.view([x, 0, z + e]));
  const a = (px[0] - p[0]) / e, b = (pz[0] - p[0]) / e, c = (px[1] - p[1]) / e, d = (pz[1] - p[1]) / e, du = u - p[0], dv = v - p[1], det = a * d - b * c; x += (d * du - b * dv) / det; z += (-c * du + a * dv) / det; }
  return [r3(x), 0, r3(z)]; };
const IN_VIEW = ['Vega', 'Lyra', 'Echo'];
const people = roomWith(VIEWER).people.filter(p => IN_VIEW.includes(p.name)).map(p => { const a = figure(cam, p).anchor.map(r2); return { name: p.name, anchor: a, onDeck: onDeck(a) }; });
const visit = VISIT.at(VIEWER), visitWorld = [visit[0], 0, visit[1]];
const capsule = room.objects.filter(o => o.kind === 'capsule'), capPts = uniq(capsule.flatMap(o => o.faces.flatMap(f => f.pts)));
const out = { view: VIEWER,
  northFoot: line('z', 2, -1.9, 1.9), northSeam1: line('z', 1, -1.9, 1.9), eastFoot: line('x', 2, -1.9, 1.9), eastSeam1: line('x', 1, -1.9, 1.9), eastSeam0: line('x', 0, -1.9, 1.9),
  desk: floorOf('PC desk'), hatch: floorOf('floor hatch'), lid: footOf('hatch lid'),
  people, capsuleSpot: { what: "where a visitor stands at the food capsule (stageA.mjs's VISIT: side-on to the east wall, the unit at the right hand)", world: visitWorld, anchor: P(visitWorld) },
  capsule: capPts.map(q => ({ world: q.map(r3), px: P(q) })), corner: P([2, 0, 2]),
  window: room.quads.filter(q => q.kind === 'window').map(q => q.pts.map(P))[0] };   // the guide's window glass, for the zoom
writeFileSync(new URL('./lines-D.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ northFoot: out.northFoot, northSeam1: out.northSeam1, eastFoot: out.eastFoot, eastSeam1: out.eastSeam1, people: out.people, capsuleSpot: out.capsuleSpot, corner: out.corner,
  desk: out.desk.map(c => c.px), hatch: out.hatch.map(c => c.px), lid: out.lid.map(c => c.px), capsuleX: [Math.min(...out.capsule.map(c => c.px[0])), Math.max(...out.capsule.map(c => c.px[0]))] }));
