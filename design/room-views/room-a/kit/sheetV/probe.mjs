// Probe (not published): each view's own station and pieces as projected polygons, for pixel counts. Usage: node probe.mjs C
import { writeFileSync } from 'fs';
const V = process.argv[2], g = await import(`../sheet${V}/guide${V}.mjs`);
const { project } = await import('../../roomb/ring/ring4b.mjs');
const P = q => project(g.cam, q);
const polys = objs => objs.flatMap(o => o.faces.map(fc => P(fc.pts)).filter(Boolean));
const own = g.room.objects.filter(o => o.place === V), out = { view: V, own: {}, pieces: {}, slices: {} };
for (const o of own) (out.own[o.name] ??= []).push(...polys([o]));
for (const p of g.pieces()) out.pieces[`${p.place ?? '-'} ${p.name}`] = polys(p.objects);
for (const ph of g.PHONES) { const r = g.slice(ph).rect; out.slices[ph.join('x')] = [r.x0, r.y0, r.x1, r.y1]; }
writeFileSync(`_probe-${V}.json`, JSON.stringify(out));
