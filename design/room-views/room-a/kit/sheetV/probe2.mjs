// Probe (not published): every room object that is neither a piece nor the viewer's own, as projected polygons. Usage: node probe2.mjs C
import { writeFileSync } from 'fs';
const V = process.argv[2], g = await import(`../sheet${V}/guide${V}.mjs`);
const { project } = await import('../../roomb/ring/ring4b.mjs');
const inPieces = new Set(g.pieces().flatMap(p => p.objects));
const rest = g.room.objects.filter(o => o.place !== V && !inPieces.has(o));
const out = { view: V, own: {}, pieces: Object.fromEntries(rest.map((o, i) => [`${o.place ?? '-'} ${o.name} #${i}`, o.faces.map(fc => project(g.cam, fc.pts)).filter(Boolean)])), slices: {} };
for (const ph of g.PHONES) { const r = g.slice(ph).rect; out.slices[ph.join('x')] = [r.x0, r.y0, r.x1, r.y1]; }
writeFileSync(`_probe-${V}.json`, JSON.stringify(out));
