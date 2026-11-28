// Room A view A's data for the Motion builder (version 1; the Lead's plan and the Motion builder's list, 19 November), from sheet
// RA-A version 4's stage (the geometry RA-A-3 and RA-A-4 were painted on: the 0.88 m doorless cabinet, the 0.48 m lid at 80
// degrees) and the camera report. Writes:
//   geo-A.json    the painting's camera and, as solids in room metres, every station in view (the cabinet, the hatch, its lid, the
//                 toolbox and the food unit) with the faces the stage draws, and the people in view at their spots with their depth
//                 along the camera's axis: for hiding a walker or a visitor behind what is nearer
//   marks-A.json  the hatch's opening as painted in RA-A-4 (the rim's inner edge, where Lyra's hands and wrench go in), with its
//                 near edges named, the stage's deck-level outline beside it, and the point on Echo's cabinet the wire comes from;
//                 each in painting pixels and on the three phones' stages
// Painting pixels are of the 1024 x 1536 painting; a phone's stage pixel is (painting - the slice's origin) / its scale.
// Generates nothing. Usage: node exportA.mjs
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { stageView } from '../stageA.mjs';
import { GW, GH, FP, GCX, GHY, cam } from '../sheet/guideA.mjs';
import { project } from '../../roomb/ring/ring4b.mjs';
const DIR = new URL('./', import.meta.url).pathname, SHEET = DIR + '../sheet/';
const sha = b => createHash('sha256').update(b).digest('hex'), J = f => JSON.parse(readFileSync(f, 'utf8'));
const r1 = n => +(+n).toFixed(1), r3 = n => +(+n).toFixed(3), pt = p => p.map(r1);
const REPORT_RAW = readFileSync(DIR + '../camera-report-A.json'), REPORT = JSON.parse(REPORT_RAW);
const MAN = J(SHEET + '_readback-4/room-a-ra-a.json');
if (MAN.version !== 4 || sha(readFileSync(SHEET + '_readback-4/room-a-ra-a.json')) !== '27cab8a2ef473b908020f340da839e9b49230792a44ffbdd0a6dc11a3ada7870') throw new Error("not version 4's manifest");
const v = stageView('A', { pcts: [100] }), room = v.room, { C, yaw } = v;
const cab = room.objects.find(o => o.name === 'electrical panel'), lid = room.objects.find(o => o.name === 'hatch lid');
if (cab.w !== 0.88 || cab.y0 !== 0.8 || cab.h !== 1.95 || room.objects.some(o => o.name === 'panel door')) throw new Error("the stage's cabinet is not version 4's");
if (Math.abs(Math.hypot(lid.faces[0].pts[3][0] - lid.faces[0].pts[0][0], lid.faces[0].pts[3][1] - lid.faces[0].pts[0][1]) - 0.48) > 1e-6) throw new Error("the stage's lid is not version 4's 0.48 m");
const fwd = [Math.sin(yaw), Math.cos(yaw)], depthOf = (x, z) => (x - C[0]) * fwd[0] + (z - C[2]) * fwd[1];
// the phones' slices, as the sheet's manifest gives them
const PH = Object.fromEntries(Object.entries(MAN.camera.phones.slices).map(([k, s]) => { const [x0, y0, x1] = s.paintingRect; return [k, { origin: [x0, y0], k: (x1 - x0) / s.stage[0], stage: s.stage }]; }));
const onPhones = pts => Object.fromEntries(Object.entries(PH).map(([k, p]) => [k, pts.map(([x, y]) => [r1((x - p.origin[0]) / p.k), r1((y - p.origin[1]) / p.k)])]));
// 1. the solids: every station in view, keyed as the sheet's layers are (C electrical cabinet, E floor hatch, ...)
const KEY = { 'electrical panel': 'C electrical cabinet', 'floor hatch': 'E floor hatch', 'hatch lid': 'E hatch lid', toolbox: 'E toolbox', 'food capsule': 'wall food capsule' };
const stations = {};
for (const o of room.objects) {
  const key = KEY[o.name]; if (!key) continue;   // Vega's desk and monitors are the viewer's own; Atlas's crates and Vega's chair are out of view
  (stations[key] ??= { place: o.place ?? 'wall', name: key.split(' ').slice(1).join(' '), solids: [] }).solids.push({ name: o.name, c: o.c.map(r3), faces: o.faces.map(f => f.pts.map(p => p.map(r3))),
    depthM: (() => { const ds = o.faces.flatMap(f => f.pts.map(p => depthOf(p[0], p[2]))); return [r3(Math.min(...ds)), r3(Math.max(...ds))]; })() });
}
if (Object.keys(stations).length !== 5) throw new Error('view A has five stations in view: ' + Object.keys(stations).join(', '));
const people = room.people.filter(p => ['B', 'C', 'E'].includes(p.place)).map(p => { const rep = REPORT.people[p.place];
  if (Math.abs(rep.spot[0] - p.x) > 1e-3 || Math.abs(rep.spot[1] - p.z) > 1e-3) throw new Error(`${p.name}'s spot is not the camera report's`);
  return { id: p.id, place: p.place, name: p.name, gesture: p.gesture, x: r3(p.x), z: r3(p.z), Z: r3(depthOf(p.x, p.z)), seat: null }; });
const geo = { view: 'A', version: 1, about: "Room A, view A (Vega's place): the painting's camera, the stations in view as solids (room metres: x east, y up, z north; the faces the stage draws) and the people in view at their spots. Sheet RA-A version 4's geometry, the one RA-A-3 and RA-A-4 were painted on.",
  camera: { C, yaw, f: FP, cx: GCX, hy: GHY, size: [GW, GH], lens: 'rect', depth: 'along the camera axis: (x - Cx) sin(yaw) + (z - Cz) cos(yaw)' },
  cameraReport: { file: 'camera-report-A.json', version: REPORT.version, sha256: sha(REPORT_RAW) }, stations, people };
writeFileSync(DIR + 'geo-A.json', JSON.stringify(geo, null, 1));
// 2. the marks
const RA4 = '63c0ca59e2caf52d4082bffbb977b50c63ed4dea5e1302a7ef642c2fbb914500';
const hatch = room.objects.find(o => o.name === 'floor hatch'), top = hatch.faces.find(f => f.pts.every(p => Math.abs(p[1] - 0.012) < 1e-9));
if (!top) throw new Error("no deck-level face on the stage's hatch");
const outline = project(cam, top.pts), projPt = p => cam.proj(cam.view(p));   // project() is for polygons; one point goes through the camera itself
// the opening as painted (RA-A-4): the rim's inner edge, traced at 3 times on a 10 px grid and checked by overlay; the left edge
// agrees within 2 px with the stage's north edge moved 11 px inward, the strongest brightness drop along it (kit4 measures)
const OPENING = [[281, 1203], [400, 1168], [560, 1357], [357, 1408]];
// Echo's wire: the middle breaker row's left feed cable, where it leaves its clamp; it runs right into the row's first breaker
const WIRE = [408, 774];
// the wire point in the room: where its ray meets the cabinet's front face (x = the cabinet's west face)
const xFront = Math.min(...cab.faces.flatMap(f => f.pts.map(p => p[0])));
let yz = [1.3, -0.2];   // Newton on (y, z) so that the face's point projects onto the wire point
for (let i = 0; i < 30; i++) {
  const P = q => projPt([xFront, q[0], q[1]]), p0 = P(yz), e = 1e-4, py = P([yz[0] + e, yz[1]]), pz = P([yz[0], yz[1] + e]);
  const a = (py[0] - p0[0]) / e, b = (pz[0] - p0[0]) / e, c = (py[1] - p0[1]) / e, d = (pz[1] - p0[1]) / e, rx = WIRE[0] - p0[0], ry = WIRE[1] - p0[1], det = a * d - b * c;
  yz = [yz[0] + (d * rx - b * ry) / det, yz[1] + (-c * rx + a * ry) / det];
}
const wireRoom = [r3(xFront), r3(yz[0]), r3(yz[1])], back = projPt(wireRoom);
if (Math.hypot(back[0] - WIRE[0], back[1] - WIRE[1]) > 0.6) throw new Error('the wire point does not project back onto itself');
const marks = { view: 'A', version: 1, picture: { name: 'RA-A-4', sha256: RA4, aiGenerated: true, note: "view A's accepted step-3 picture; step 4 changes only the cabinet's right side (x 512 to 546), so these marks hold for the fixed picture too" },
  hatch: {
    opening: { painting: OPENING, phones: onPhones(OPENING), corners: ['the north-east inner corner (top left, by the lid\'s hinge)', 'the south-east inner corner (top right)', 'the south-west inner corner (bottom right, behind the toolbox)', 'the north-west inner corner (bottom left)'],
      how: "the rim's inner edge as painted, where the hole begins: traced on RA-A-4 at 3 times on a 10 px grid and checked by overlay (within about 3 px); the left edge agrees within 2 px with the stage's north edge moved 11 px inward, where the brightness drops most from the rim into the hole" },
    nearEdges: [{ from: 3, to: 0, side: 'left, the hatch\'s north side, where Lyra kneels: their hands and wrench go in over it' }, { from: 3, to: 2, side: 'bottom, the hatch\'s west side, nearest the camera' }],
    farEdges: [{ from: 0, to: 1, side: "top, the east side, the lid's hinge" }, { from: 1, to: 2, side: 'right, the south side' }],
    use: 'what is below the rim is seen only inside the opening; the near edges are the rim the camera looks over, so a hand or wrench that goes below the rim is drawn only inside the opening',
    stageOutline: { room: top.pts.map(p => p.map(r3)), painting: outline.map(pt), phones: onPhones(outline), note: "the stage's hatch at deck level (1 m by 0.5 m, x 0.13 to 1.13, z 0.65 to 1.15); RA-A-3 painted a raised rim along it, so the painted opening lies inside it" },
    wrenchSeen: { painting: [378, 1293], note: "the Motion builder's fit: the top bolt of the first collar on the big pipe, inside the opening" } },
  wire: { painting: WIRE, phones: onPhones([WIRE]), room: wireRoom, on: "the middle breaker row's left feed cable, where it leaves its clamp (the clamp x 384 to 406, y 768 to 778); it runs right into the row's first breaker at x 420",
    near: "Echo's slot's left edge is at x 420 on all three phones (their box at 390: 153.2 to 222.6 stage px), so the point is 12 px left of it, at Echo's hand height (about 1.25 m up)", painted: 'no loose wire is painted there: the cables are neat' } };
writeFileSync(DIR + 'marks-A.json', JSON.stringify(marks, null, 1));
console.log('geo-A.json: stations', Object.entries(stations).map(([k, s]) => `${k} ${s.solids[0].depthM.join('-')} m`).join(' | '), '| people', people.map(p => `${p.name} Z ${p.Z}`).join(', '));
console.log('marks-A.json: opening', JSON.stringify(OPENING), '| stage outline', JSON.stringify(outline.map(pt)), '| wire', JSON.stringify(WIRE), 'room', JSON.stringify(wireRoom), 'back', JSON.stringify(pt(back)));
// 3. scene.json (version 1): the three phones as Room B's views have them (pv6b/export6a.mjs): the slice, the plate on the stage, f
// and hy; the people's slots at the camera report's spots (feet, unit, head, box, press area, depth); the out-of-view chip; the food
// unit's painted hatch and glass, measured on RA-A-4 (its warm paper-white hatch: the pixels with R over 185, G over 172, B over
// 140 and R - B under 70; its dark glass and bright ring by brightness around their centre)
const UNIT = { hatch: [[220.5, 755.5], [278.5, 755.5], [278.5, 840.5], [220.5, 840.5]], glass: { c: [249.1, 738.2], r: 8, ringR: 10 } };
const views = stageView('A', { pcts: [100, 200] }), TOP = 99, BOT = 92, near = (a, b, tol = 0.051) => Math.abs(a - b) <= tol, diffs = [];
const sceneP = {};
for (const [k, p] of Object.entries(PH)) {
  const [W, H] = k.split('x').map(Number), SH = H - TOP - BOT, v100 = views.views[`${k}@100`], v200 = views.views[`${k}@200`], L = v100.layout;
  if (v100.SH !== SH || p.stage[1] !== SH) throw new Error(`${k}: the stage height disagrees`);
  const toStage = ([x, y]) => [r1((x - p.origin[0]) / p.k), r1((y - p.origin[1]) / p.k)];
  const people = L.figs.map(fg => { const per = v100.per[fg.place], sq = L.squares.find(s => s.id === room.people.find(q => q.place === fg.place).id), rep = REPORT.people[fg.place], rb = rep[`box${W}x${SH}`];
    if (!rb) throw new Error(`${fg.name}: no camera-report box for ${k}`);
    fg.box.forEach((b, i) => { if (!near(b, rb[i])) diffs.push(`${k} ${fg.name} box ${i}: report ${rb[i]}, here ${b}`); });
    const pp = room.people.find(q => q.place === fg.place);
    return { id: pp.id, place: fg.place, name: fg.name, num: fg.num, crew: rep.crew, pose: pp.gesture, ...(rep.gestureBoard ? { boardPose: rep.gestureBoard } : {}), Z: r3(depthOf(pp.x, pp.z)),
      feet: pt(fg.anchor), u: +fg.u.toFixed(4), head: pt(fg.head), headR: r1(fg.headR), headKind: per.head, box: pt(fg.box), press: [r1((sq.x0 + sq.x1) / 2), r1((sq.y0 + sq.y1) / 2)], side: r1(sq.x1 - sq.x0),
      heightPx: per.heightPx, seen: rep.seenSide, tagAt: per.tagAt }; });
  sceneP[k] = { W, H, TOP, BOT, SH, k: +p.k.toFixed(4), slice: { x0: r1(p.origin[0]), y0: r1(p.origin[1]), x1: r1(p.origin[0] + p.k * W), y1: r1(p.origin[1] + p.k * SH) },
    plate: { left: r1(-p.origin[0] / p.k), top: r1(-p.origin[1] / p.k), width: r1(GW / p.k), height: r1(GH / p.k) }, f: v100.f, hy: v100.hy, people,
    chip: L.chip,   // the out-of-view person's chip at 100% text: its box and press area on the stage
    unit: { hatch: UNIT.hatch.map(toStage), glass: { c: toStage(UNIT.glass.c), r: r1(UNIT.glass.r / p.k), ringR: r1(UNIT.glass.ringR / p.k) } },
    byPct: { 100: { issues: v100.issues, chip: v100.layout.chip }, 200: { issues: v200.issues, chip: v200.layout.chip } } };
}
if (diffs.length) throw new Error('the slots differ from the camera report: ' + diffs.join('; '));
// version 2 (the Lead, 14:36 on 19 November): the plate is RA-A-4 with the cabinet's right frame drawn in code (sheet RA-A version 7,
// frameA.py), checked here against frame-A.json (the file as frameA.py wrote it) before its record is written
const FR = J(SHEET + 'frame-A.json'), FRO = FR.outputs['ra-A-4-frame.png'];
if (sha(readFileSync(SHEET + 'ra-A-4-frame.png')) !== FRO.sha256) throw new Error('ra-A-4-frame.png is not the plate frame-A.json records');
if (FR.start.sha256 !== RA4 || !FR.pass) throw new Error("frame-A.json is not RA-A-4's passed frame");
// the page's copy (plateA.py): the same pixels, re-encoded losslessly where its bytes spelled a scan word by chance
const PC = J(DIR + 'plate-A.json');
if (PC.pixelsSha256 !== FRO.pixelsSha256 || sha(readFileSync(DIR + 'ra-A-4-frame.png')) !== PC.sha256) throw new Error("the page's plate is not plateA.py's copy of the frame's plate");
const PLATE = { name: 'RA-A-4, framed', file: 'img/ra-A-4-frame.png', sha256: PC.sha256, pixelsSha256: FRO.pixelsSha256, aiGenerated: true,
  record: "RA-A-4, an AI-generated picture (the image tool's step 3 of sheet RA-A), with the cabinet's right frame drawn in code: a steel post at x 527 to 537, y 639 to 880, cut away around the second orange light, and the wall beyond it cleaned to RA-A-1's paint (sheet RA-A version 7, 1795098767-9ba7: frameA.py and frame-A.json)",
  start: { name: 'RA-A-4', sha256: RA4, aiGenerated: true }, frameRecord: { file: 'frame-A.json', sha256: sha(readFileSync(SHEET + 'frame-A.json')) }, changed: { x: [527, 542], y: [639, 880] },
  accepted: 'the Lead, 19 November 2026, 14:36', note: "view A's picture. Nothing outside x 527 to 542, y 639 to 880 differs from RA-A-4, so every mark measured on RA-A-4 holds for it" };
const scene = { view: 'A', version: 2, plate: PLATE, emptyPlate: { name: 'RA-A-1', sha256: 'a565b6e01dec5a51fcedca90ace0331e657c09864411eba032cbe14021d4d635' },
  names: Object.fromEntries(room.people.map(p => [p.id, p.name])), camera: { at: REPORT.camera.at, yawCompass: REPORT.camera.yawCompass, report: REPORT.version },
  unit: { painting: UNIT, how: "measured on RA-A-4: the hatch is its warm paper-white area (R over 185, G over 172, B over 140, R - B under 70), x 221 to 278, y 756 to 840, given as pixel edges; the glass is the dark disc at (249.1, 738.2), radius about 8 px, inside a bright ring to about 10 px" },
  phones: sceneP };
writeFileSync(DIR + 'scene.json', JSON.stringify(scene, null, 1));
for (const [k, p] of Object.entries(sceneP)) console.log(k, 'k', p.k, 'plate', JSON.stringify(p.plate), '| f', +p.f.toFixed(2), 'hy', +p.hy.toFixed(1), '| people', p.people.map(q => `${q.name} feet ${q.feet} u ${q.u} Z ${q.Z}`).join('; '), '| unit hatch', JSON.stringify(p.unit.hatch[0]), 'glass', JSON.stringify(p.unit.glass));
