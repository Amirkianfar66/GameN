// View C's data for the people and C's page (export8b.mjs, view B's, for Lyra's view on sheet PV6-C version 8): for both phones and both
// text sizes, the 70° straight slice at 5° down of the painting (the plate on the stage, as camera report C frames it), the people's slots
// at the report's spots (until the Motion builder's figures come, the plain pose shapes, as placeholders), their press areas, the
// out-of-view chip, the skylight's and the wall window's boxes and the masks' visible boxes (masks8.py), and the food capsule as it is
// painted: the hatch's four corners (hatch8c.py) and its glass (lens8.py; the Lead, 18 November: code follows the painting). Writes
// scene.json, guide-openings.json (the skylight and the window in painting pixels) and _geo-C.json (the painting's camera, the
// stations' solids and the people, for occlude8c.py). Checks every slot against the camera report and stops if one differs.
// Generates nothing.
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { project } from '../../ring/ring4b.mjs';
import { IDS, CAST, spriteRect, standInPng } from '../../vis/vis5.mjs';
import { CEILING } from '../../pv5/guide5.mjs';
import { stage8v } from '../report8.mjs';
import { cam, slice, GW, GH, FP, GHY, GCX } from '../guide8.mjs?view=C';
const VIEWER = 'C';
const DIR = new URL('./', import.meta.url).pathname, PIC = JSON.parse(readFileSync(DIR + 'picture.json', 'utf8'));
const RAW = readFileSync(new URL(PIC.camera.report, import.meta.url)), REPORT = JSON.parse(RAW);
if (createHash('sha256').update(RAW).digest('hex') !== PIC.camera.sha256 || REPORT.version !== PIC.camera.version) throw new Error('the camera report is not the one picture.json names');
const r1 = n => +(+n).toFixed(1), pt = p => p.map(r1);
const views = { 100: stage8v(VIEWER, { pct: 100 }), 200: stage8v(VIEWER, { pct: 200 }) }, room = views[100].room, { C, yaw } = views[100];
if (views[100].fits.length) throw new Error(`the staging does not fit: ${views[100].fits.join('; ')}`);
const fwd = [Math.sin(yaw), Math.cos(yaw)], depthOf = p => (p.x - C[0]) * fwd[0] + (p.z - C[2]) * fwd[1];   // the camera's depth: along its axis
// the skylight in painting pixels: its glass and its cross
const glass = project(cam, CEILING.glass), mullions = CEILING.mullions.map(m => project(cam, m));
const bbox = pp => { const xs = pp.map(p => p[0]), ys = pp.map(p => p[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; };
// the wall window too (the Lead, 18 November: it shows the sky on the one voyage's clock): its glass, the room's window rectangle
const MASKJ = (() => { try { return JSON.parse(readFileSync(DIR + 'masks.json', 'utf8')); } catch { return null; } })();
const winGlass = MASKJ && typeof MASKJ.window === 'object' ? project(cam, room.window.pts) : null;
writeFileSync(DIR + 'guide-openings.json', JSON.stringify({ skylight: { glass: glass.map(pt), mullions: mullions.map(m => m.map(pt)), box: bbox(glass) }, ...(winGlass ? { window: { glass: winGlass.map(pt), box: bbox(winGlass) } } : {}) }));
// the code room's window glass, in the room scene's 1024 x 768 scene units (AMBIENT_ROOMS['room-b']): the skylight's crop
const SOURCE = { glass: [382, 128, 260, 124] };
// the skylight as the plate paints it (masks6a.py): its mask's bounding box on the stage, cut to the stage
const MASKS = Object.fromEntries(['skylight', 'window'].filter(n => MASKJ && typeof MASKJ[n] === 'object').map(n => [n, MASKJ[n]]));   // masks8.py: the plate's black in each opening
const visible = (toStage, W, SH) => Object.fromEntries(Object.entries(MASKS).map(([n, m]) => { const [a, b] = [toStage([m.bbox[0], m.bbox[1]]), toStage([m.bbox[2], m.bbox[3]])];
  const x0 = Math.max(0, a[0]), y0 = Math.max(0, a[1]), x1 = Math.min(W, b[0]), y1 = Math.min(SH, b[1]); return [`${n}Visible`, { x: r1(x0), y: r1(y0), w: r1(x1 - x0), h: r1(y1 - y0) }]; }));
const near = (a, b, tol = 0.051) => Math.abs(a - b) <= tol;
const phones = {}, diffs = [];
// the capsule as PV6-B-4 paints it, in painting pixel indices (the records'); a point is taken at its pixel's centre (index + 0.5),
// a box from its first pixel's corner to past its last
const HT = PIC.hatch, GL = PIC.glass ?? null, CORNERS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'], mid = p => [p[0] + 0.5, p[1] + 0.5], past = b => [b[0], b[1], b[2] + 1, b[3] + 1];
for (const [W, H] of [[390, 844], [430, 932]]) {
  const key = `${W}x${H}`, s = slice([W, H]), k = s.k, x0 = s.rect.x0, y0 = s.rect.y0, toStage = ([x, y]) => [(x - x0) / k, (y - y0) / k];
  const plate = { left: r1(-x0 / k), top: r1(-y0 / k), width: r1(GW / k), height: r1(GH / k) };
  const box = b => { const [a, c] = [toStage([b.x0, b.y0]), toStage([b.x1, b.y1])]; return { x: r1(a[0]), y: r1(a[1]), w: r1(c[0] - a[0]), h: r1(c[1] - a[1]) }; };
  const byPct = {};
  for (const pct of [100, 200]) {
    const v = views[pct].views[key], L = v.layout;
    if (v.SH !== s.SH || !near(v.f, s.fs, 0.01) || !near(v.hy, s.hys, 0.06)) throw new Error(`${key}: the phone view and the slice disagree`);
    byPct[pct] = { chip: L.chip, issues: v.issues, edge: { strict: v.edge.strictFull && v.edge.strictNarrow, relaxed: v.edge.relaxedFull }, seen: v.seen.join('') };
    if (pct !== 100) continue;
    const people = L.figs.map(fg => { const p = room.people.find(q => q.place === fg.place), sq = L.squares.find(q => q.id === p.id), r = spriteRect({ anchor: fg.anchor, u: fg.u, p }), rep = REPORT.people[fg.place]?.[key];
      if (!rep) throw new Error(`${p.name} is not in the camera report`);
      const want = [...rep.box, ...rep.feet, ...rep.head, rep.headR, rep.press.x0, rep.press.y0, rep.press.x1, rep.press.y1], have = [...fg.box, ...fg.anchor, ...fg.head, fg.headR, sq.x0, sq.y0, sq.x1, sq.y1];
      want.forEach((w, i) => { if (!near(w, have[i])) diffs.push(`${key} ${p.name} #${i}: report ${w}, here ${have[i]}`); });
      const png = standInPng(p);
      return { id: p.id, place: fg.place, name: fg.name, num: fg.num, crew: p.crew, png, placeholder: png === p.shape, pose: p.gesture, scale: fg.scale, Z: +depthOf(p).toFixed(3),
        rect: { left: r1(r.left), top: r1(r.top), size: r1(r.size), flip: r.flip }, feet: pt(fg.anchor), head: pt(fg.head), headR: r1(fg.headR), box: pt(fg.box), u: +fg.u.toFixed(4),
        press: [r1((sq.x0 + sq.x1) / 2), r1((sq.y0 + sq.y1) / 2)], side: r1(sq.x1 - sq.x0), heightPx: v.per[fg.place].heightPx, seen: REPORT.people[fg.place].seenSide }; });
    phones[key] = { W, H, TOP: 99, BOT: 92, SH: s.SH, k: +k.toFixed(4), slice: { x0: r1(x0), y0: r1(y0), x1: r1(s.rect.x1), y1: r1(s.rect.y1) }, plate, f: v.f, hy: v.hy, people,
      openings: { skylight: box(bbox(glass)), ...(winGlass ? { window: box(bbox(winGlass)) } : {}), ...visible(toStage, W, s.SH) },
      capsule: { hatch: CORNERS.map(c => pt(toStage(mid(HT.painted[c])))), hatchBox: (([a, b, c, d]) => box({ x0: a, y0: b, x1: c, y1: d }))(past(HT.painted.bbox)),
        lens: pt(toStage(mid(HT.lens.centre))), lensCore: (([a, b, c, d]) => box({ x0: a, y0: b, x1: c, y1: d }))(past(HT.lens.darkCoreBbox)),
        ...(GL ? { glass: { centre: pt(toStage(mid(GL.centre))), radius: r1(GL.radius / k) } } : {}) } };
  }
  phones[key].byPct = byPct;
}
if (diffs.length) throw new Error(`the slots differ from the camera report: ${diffs.join('; ')}`);
// the painting's camera, every station in view as its solids (the faces stage6.mjs builds; Vega's microscope with Vega's bench), and
// the people: their camera depth and their seat (Juno sits on the B stool)
const stations = {};
for (const o of room.objects.filter(o => o.place !== VIEWER)) {
  const key = o.name === 'microscope' ? `${o.place} bench` : `${o.place} ${o.name}`;
  (stations[key] ??= { place: o.place, name: o.name === 'microscope' ? 'bench' : o.name, solids: [] }).solids.push({ name: o.name, c: o.c, faces: o.faces.map(f => f.pts) });
}
const geoPeople = room.people.filter(p => p.place !== VIEWER).map(p => ({ id: p.id, place: p.place, name: p.name, gesture: p.gesture, x: p.x, z: p.z, Z: +depthOf(p).toFixed(3), seat: p.gesture === 'laptopStool' ? `${p.place} stool` : null }));
writeFileSync(DIR + '_geo-C.json', JSON.stringify({ view: VIEWER, camera: { C, yaw, f: FP, cx: GCX, hy: GHY, size: [GW, GH], lens: 'rect' }, stations, people: geoPeople }, null, 1));
const capsule = { piece: 'D food capsule', on: 'D bench', corners: CORNERS, painting: { hatch: CORNERS.map(c => HT.painted[c]), hatchBox: HT.painted.bbox, lens: HT.lens.centre, lensCore: HT.lens.darkCoreBbox, ...(GL ? { glass: { centre: GL.centre, radius: GL.radius } } : {}) },
  units: 'painting: pixel indices, as the records give them; each phone: stage points, a pixel taken at its centre', rule: HT.decision };
const out = { view: VIEWER, plate: PIC.plate.file, placed2: PIC.placed2.file, placed: PIC.placed.file, capsule, names: Object.fromEntries(IDS.map(id => [CAST[id].id, CAST[id].name])), source: SOURCE,
  camera: { at: REPORT.camera.at, yawDeg: REPORT.camera.yawDegExact, report: 'camera-report-C.json, version 2' }, phones };
writeFileSync(DIR + 'scene.json', JSON.stringify(out));
for (const [kk, p] of Object.entries(phones)) console.log(kk, 'k', p.k, 'plate', JSON.stringify(p.plate), '| skylight', JSON.stringify(p.openings.skylight), 'visible', JSON.stringify(p.openings.skylightVisible), '| people', p.people.map(q => `${q.name} ${q.heightPx}px Z ${q.Z}${q.placeholder ? ' (placeholder)' : ''}${q.rect.flip ? ' flipped' : ''}`).join(', '), '| chip', JSON.stringify(p.byPct[100].chip?.name), '| issues', JSON.stringify(p.byPct[100].issues), JSON.stringify(p.byPct[200].issues), '| edge', JSON.stringify(p.byPct[100].edge), JSON.stringify(p.byPct[200].edge), '| hatch', JSON.stringify(p.capsule.hatch), 'lens', JSON.stringify(p.capsule.lens));
console.log('stations', Object.keys(stations).join(', '), '| people', geoPeople.map(p => `${p.name} ${p.Z} m${p.seat ? ` (seat: ${p.seat})` : ''}`).join(', '));
