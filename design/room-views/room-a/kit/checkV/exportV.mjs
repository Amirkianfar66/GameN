// Room A, views B and C (and later E): the data for the people layers and the three-phone checks, as view A's room data
// (../data/exportA.mjs, version 2) has them, for the view's accepted step-2 plate (B: RA-B-3c, the Lead, 18:56; C: RA-C-2c, 20:40).
// Writes, into checkV/<V>/:
//   geo-<V>.json    the painting's camera; every station in view as solids (room metres: x east, y up, z north; the faces the stage
//                   draws), keyed as the view's lifted layers are, with its depth along the camera's axis; the people in view at their
//                   spots, with their depth
//   scene-<V>.json  the plate (its file, pixels' sha256 and record); the three phones as Room B's views and view A have them: the slice,
//                   the plate on the stage, f and the horizon, the people's slots (feet, unit, head, box, press area, depth) from the
//                   plan's stage (stageView), checked against the camera report; the out-of-view chip; the layout's checks at 100% and
//                   200% text; and the live screens: the view's fitted screen regions (screens-<V>.json) on each phone's stage
// Painting pixels are of the 1024 x 1536 painting; a phone's stage pixel is (painting - the slice's origin) / its scale.
// View E (RA-E-2c, the Lead, 21:28) has no screen in view: its scene has none. Generates nothing. Usage: node exportV.mjs B|C|E
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { stageView } from '../stageA.mjs';
const V = process.argv[2], v = (V || '').toLowerCase();
const PLATES = { B: { file: 'ra-B-3c.png', record: 'composite-B3.json', name: 'RA-B-3c', start: 'RA-B-3', accepted: 'the Lead, 27 November 2026, 18:56', lift: 'lift-B3c.json', lid: 'floor hatch' },
  C: { file: 'ra-C-2c.png', record: 'composite-C2.json', name: 'RA-C-2c', start: 'RA-C-2', accepted: 'the Lead, 27 November 2026, 20:40', lift: 'lift-C2c.json', lid: 'hatch lid' },
  E: { file: 'ra-E-2c.png', record: 'composite-E2.json', name: 'RA-E-2c', start: 'RA-E-2', accepted: 'the Lead, 27 November 2026, 21:28', lift: 'lift-E2c.json', lid: 'hatch lid' },
  // view D: its final plate RA-D-4c (step 3's keep with the capsule completed and the toolbox's cast shadow, the Lead, 28 November, 00:36); its
  // screens are RA-D-3x's, unchanged through RA-D-3hc and RA-D-4c
  D: { file: 'ra-D-4c.png', record: 'composite-D4c.json', name: 'RA-D-4c', start: 'RA-D-4', accepted: 'the Lead, 28 November 2026, 00:36', lift: 'lift-D4c.json', lid: 'hatch lid', screensVia: ['composite-D3hc.json', 'composite-D4c.json'] } };
if (!PLATES[V]) throw new Error('usage: node exportV.mjs B|C|E|D');
const DIR = new URL('./', import.meta.url).pathname, SHEET = DIR + `../sheet${V}/`, OUT = DIR + `${V}/`;
mkdirSync(OUT, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex'), J = f => JSON.parse(readFileSync(f, 'utf8'));
const r1 = n => +(+n).toFixed(1), r3 = n => +(+n).toFixed(3), pt = p => p.map(r1);
const { GW, GH, FP, GCX, GHY, VIEWER } = await import(`../sheet${V}/guide${V}.mjs`);
if (VIEWER !== V) throw new Error(`guide${V}.mjs is not view ${V}'s`);
const REPORT_RAW = readFileSync(DIR + `../camera-report-${V}.json`), REPORT = JSON.parse(REPORT_RAW), MAN = J(SHEET + `room-a-ra-${v}.json`), KIT = J(SHEET + `kit-${V}.json`);
const PL = PLATES[V], REC = J(SHEET + PL.record), PO = REC.outputs[PL.file], HAS_SCR = existsSync(SHEET + `screens-${V}.json`), SCR = HAS_SCR ? J(SHEET + `screens-${V}.json`) : { screens: [] }, LIFT = J(SHEET + PL.lift);
if (!REC.pass || sha(readFileSync(SHEET + PL.file)) !== PO.sha256) throw new Error(`${PL.file} is not the plate ${PL.record} records`);
if (LIFT.kept.pixelsSha256 !== PO.pixelsSha256 || LIFT.missing.length) throw new Error(`${PL.lift} is not a whole lift of ${PL.name}`);
// a view whose screens were fitted on an earlier plate (D's, on RA-D-3x) carries them only where each later record checks them unchanged
const screensCarried = PL.screensVia ? PL.screensVia.every(f => Object.values(J(SHEET + f).checks.screens).every(x => Object.entries(x).some(([k, val]) => k.startsWith('equalTo') && val === true))) : false;
if (SCR.picture?.pixelsSha256 && SCR.picture.pixelsSha256 !== PO.pixelsSha256 && !screensCarried) throw new Error(`screens-${V}.json is not of ${PL.name}`);
const S = stageView(V, { pcts: [100, 200] }), room = S.room, { C, yaw } = S;
const fwd = [Math.sin(yaw), Math.cos(yaw)], depthOf = (x, z) => (x - C[0]) * fwd[0] + (z - C[2]) * fwd[1];
// the phones' slices, as the sheet's manifest gives them
const PH = Object.fromEntries(Object.entries(MAN.camera.phones.slices).map(([k, s]) => { const [x0, y0, x1] = s.paintingRect; return [k, { origin: [x0, y0], k: (x1 - x0) / s.stage[0], stage: s.stage }]; }));
// 1. the solids: every station in view, keyed as the lifted layers are (A PC workstation, D crates, E toolbox, E floor hatch, ...)
const PIECE_OF = { 'PC desk': 'PC workstation', monitor: 'PC workstation', crate: 'crates', toolbox: 'toolbox', 'floor hatch': 'floor hatch', 'hatch lid': PL.lid, 'electrical panel': 'electrical cabinet' };
const stations = {}, SPLIT = V === 'D' ? { ...KIT.split, ...KIT.split3 } : KIT.split;   // view D's capsule is its own layer (step 3's split), as in view A
for (const o of room.objects) {
  const key = o.kind === 'capsule' ? 'wall food capsule' : PIECE_OF[o.name] && `${o.place} ${PIECE_OF[o.name]}`; if (!key || !(key in SPLIT)) continue;   // the viewer's own and what is out of view
  (stations[key] ??= { place: o.place ?? 'wall', name: key.split(' ').slice(1).join(' '), layer: LIFT.pieces[key].file, solids: [] }).solids.push({ name: o.name, c: o.c.map(r3), faces: o.faces.map(f => f.pts.map(p => p.map(r3))),
    depthM: (() => { const ds = o.faces.flatMap(f => f.pts.map(p => depthOf(p[0], p[2]))); return [r3(Math.min(...ds)), r3(Math.max(...ds))]; })() });
}
if (Object.keys(stations).sort().join() !== Object.keys(SPLIT).sort().join()) throw new Error(`view ${V}'s stations in view are not its layers: ${Object.keys(stations).join(', ')}`);
// pieces painted away from the plan's place (painted-<V>.json, view D's toolbox): their solids turned and shifted on the deck to where
// the plate has them, so the occlusion uses where they stand (turn about the vertical, positive from east toward north)
let PAINTED = null;
if (existsSync(SHEET + `painted-${V}.json`)) {
  const PD = J(SHEET + `painted-${V}.json`), T = PD.toolbox, st = stations[T.station];
  if (PD.picture.pixelsSha256 !== PO.pixelsSha256) throw new Error(`painted-${V}.json is not of ${PL.name}`);
  if (!st) throw new Error(`${T.station} is not in view ${V}`);
  const th = T.deck.turnDeg * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th), [pcx, pcz] = T.deck.planCentre, [ncx, ncz] = T.deck.centre;
  const mv = p => [r3(ncx + cs * (p[0] - pcx) - sn * (p[2] - pcz)), p[1], r3(ncz + sn * (p[0] - pcx) + cs * (p[2] - pcz))];
  for (const so of st.solids) { so.faces = so.faces.map(f => f.map(mv)); so.c = mv(so.c); const ds = so.faces.flatMap(f => f.map(p => depthOf(p[0], p[2]))); so.depthM = [r3(Math.min(...ds)), r3(Math.max(...ds))]; }
  PAINTED = { station: T.station, file: `painted-${V}.json`, sha256: sha(readFileSync(SHEET + `painted-${V}.json`)), shiftM: T.deck.shift, turnDeg: T.deck.turnDeg, centre: T.deck.centre, planCentre: T.deck.planCentre };
  if (PD.capsule) {   // the capsule: the plan's box stretched on the east wall to the painted box (its depth off the wall kept), so the occlusion uses the painted capsule
    const K = PD.capsule, sc = stations[K.station], P0 = K.wall.plan, P1 = K.wall.painted;
    if (!sc) throw new Error(`${K.station} is not in view ${V}`);
    const lin = (v, a, b) => r3(b[0] + (v - a[0]) * (b[1] - b[0]) / (a[1] - a[0])), mvC = p => [r3(p[0]), lin(p[1], P0.y, P1.y), lin(p[2], P0.z, P1.z)];
    for (const so of sc.solids) { so.faces = so.faces.map(f => f.map(mvC)); so.c = mvC(so.c); const ds = so.faces.flatMap(f => f.map(p => depthOf(p[0], p[2]))); so.depthM = [r3(Math.min(...ds)), r3(Math.max(...ds))]; }
    PAINTED.capsule = { station: K.station, wall: P1, plan: P0, sizeM: K.wall.sizeM, outlineBox: K.picture.outlineBox, parts: K.picture.parts };
  }
}
const v100any = S.views[`${Object.keys(PH)[0]}@100`], inView = v100any.layout.figs.map(f => f.place);
const people = room.people.filter(p => inView.includes(p.place)).map(p => { const rep = REPORT.people[p.place];
  if (!rep || Math.abs(rep.spot[0] - p.x) > 1e-3 || Math.abs(rep.spot[1] - p.z) > 1e-3) throw new Error(`${p.name}'s spot is not the camera report's`);
  return { id: p.id, place: p.place, name: p.name, gesture: p.gesture, x: r3(p.x), z: r3(p.z), Z: r3(depthOf(p.x, p.z)) }; });
const geo = { view: V, version: 1, about: `Room A, view ${V} (${REPORT.viewer ?? V}'s place): the painting's camera, the stations in view as solids, keyed as ${PL.name}'s lifted layers are (room metres: x east, y up, z north; the faces the stage draws), and the people in view at their spots, with their depth along the camera's axis.`,
  camera: { C, yaw, f: FP, cx: GCX, hy: GHY, size: [GW, GH], lens: 'rect', depth: 'along the camera axis: (x - Cx) sin(yaw) + (z - Cz) cos(yaw)' },
  cameraReport: { file: `camera-report-${V}.json`, version: REPORT.version, sha256: sha(REPORT_RAW) }, stations, people, ...(PAINTED ? { painted: PAINTED } : {}) };
writeFileSync(OUT + `geo-${V}.json`, JSON.stringify(geo, null, 1));
// 2. scene: the plate, the phones, the slots, the chip, the checks and the live screens
const TOP = 99, BOT = 92, near = (a, b, tol = 0.051) => Math.abs(a - b) <= tol, diffs = [], sceneP = {};
for (const [k, p] of Object.entries(PH)) {
  const [W, H] = k.split('x').map(Number), SH = H - TOP - BOT, v100 = S.views[`${k}@100`], v200 = S.views[`${k}@200`], L = v100.layout;
  if (v100.SH !== SH || p.stage[1] !== SH) throw new Error(`${k}: the stage height disagrees`);
  const toStage = ([x, y]) => [r1((x - p.origin[0]) / p.k), r1((y - p.origin[1]) / p.k)];
  const ppl = L.figs.map(fg => { const per = v100.per[fg.place], pp = room.people.find(q => q.place === fg.place), sq = L.squares.find(s => s.id === pp.id), rep = REPORT.people[fg.place], rb = rep[`box${W}x${SH}`];
    if (!rb) throw new Error(`${fg.name}: no camera-report box for ${k}`);
    fg.box.forEach((b, i) => { if (!near(b, rb[i])) diffs.push(`${k} ${fg.name} box ${i}: report ${rb[i]}, here ${b}`); });
    return { id: pp.id, place: fg.place, name: fg.name, num: fg.num, crew: rep.crew, pose: pp.gesture, Z: r3(depthOf(pp.x, pp.z)), feet: pt(fg.anchor), u: +fg.u.toFixed(4), head: pt(fg.head), headR: r1(fg.headR),
      headKind: per.head, box: pt(fg.box), press: [r1((sq.x0 + sq.x1) / 2), r1((sq.y0 + sq.y1) / 2)], side: r1(sq.x1 - sq.x0), heightPx: per.heightPx, seen: rep.seenSide, tagAt: per.tagAt }; });
  const screens = SCR.screens.map(s => ({ name: s.name, corners: s.corners.map(toStage), inSlice: s.corners.every(([x, y]) => x >= p.origin[0] && y >= p.origin[1] && x <= p.origin[0] + p.k * W && y <= p.origin[1] + p.k * SH) }));
  sceneP[k] = { W, H, TOP, BOT, SH, k: +p.k.toFixed(4), slice: { x0: r1(p.origin[0]), y0: r1(p.origin[1]), x1: r1(p.origin[0] + p.k * W), y1: r1(p.origin[1] + p.k * SH) },
    plate: { left: r1(-p.origin[0] / p.k), top: r1(-p.origin[1] / p.k), width: r1(GW / p.k), height: r1(GH / p.k) }, f: v100.f, hy: v100.hy, people: ppl, chip: L.chip, screens,
    byPct: { 100: { issues: v100.issues, chip: v100.layout.chip }, 200: { issues: v200.issues, chip: v200.layout.chip } } };
}
if (diffs.length) throw new Error('the slots differ from the camera report: ' + diffs.join('; '));
const PLATE = { name: PL.name, file: `img/${PL.file}`, sha256: PO.sha256, pixelsSha256: PO.pixelsSha256, aiGenerated: true, codeComposite: true,
  record: { file: PL.record, sha256: sha(readFileSync(SHEET + PL.record)) }, accepted: PL.accepted, start: { name: PL.start, aiGenerated: true },
  layers: { file: PL.lift, sha256: sha(readFileSync(SHEET + PL.lift)), pieces: Object.fromEntries(Object.entries(LIFT.pieces).map(([k2, q]) => [k2, { file: q.file, sha256: q.sha256, px: q.px, box: q.box }])) } };
const scene = { view: V, version: 1, plate: PLATE, names: Object.fromEntries(room.people.map(p => [p.id, p.name])), camera: { at: REPORT.camera.at, yawCompass: REPORT.camera.yawCompass, report: REPORT.version },
  outOfView: REPORT.outOfView, screens: { file: HAS_SCR ? `screens-${V}.json` : null, sha256: HAS_SCR ? sha(readFileSync(SHEET + `screens-${V}.json`)) : null, painting: SCR.screens.map(s => ({ name: s.name, corners: s.corners, p95L: s.p95L, px: s.px })) }, phones: sceneP };
writeFileSync(OUT + `scene-${V}.json`, JSON.stringify(scene, null, 1));
console.log(`geo-${V}.json: stations`, Object.entries(stations).map(([k2, s]) => `${k2} ${Math.min(...s.solids.map(o => o.depthM[0]))}-${Math.max(...s.solids.map(o => o.depthM[1]))} m`).join(' | '), '| people', people.map(p => `${p.name} Z ${p.Z}`).join(', '));
for (const [k2, p] of Object.entries(sceneP)) console.log(k2, 'k', p.k, '| people', p.people.map(q => `${q.name} feet ${q.feet} u ${q.u}`).join('; '), '| screens in slice', p.screens.map(s => s.inSlice).join(','), '| issues 100', JSON.stringify(p.byPct[100].issues), '200', JSON.stringify(p.byPct[200].issues));
