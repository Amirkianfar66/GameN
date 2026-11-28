// Version 2 of the camera reports for Room B's views B, C, D and E (sheets PV6-B to PV6-E), as version 1's (report7.mjs) for
// option 1's stagings (the Lead's approval, 18 November: identical furniture in D and E, a cheated person alone; in B and C a
// station moves with its person, as in version 1), with every moved station and person listed with its distance, the
// food capsule units of the layout (units8.mjs) and each viewer's own station that the view leaves undrawn. For the
// In-game animation builder through the Lead: for each of the three in view (by crew id), their station, their spot (and how far
// it is from the plan and from PV6-A's), the screen box on 390 x 653 and 430 x 741 (100% text), the angle at which the camera sees
// them and their station's facing, where the warm lamps and the skylight's ring of lights sit relative to them, what covers them,
// and the person out of view. Writes camera-report-<view>.json (version 2). Generates nothing.
import { writeFileSync } from 'fs';
import { SHARED } from '../pv7/stage7.mjs';
import { sharedSpot } from '../pv7/search7.mjs';
import { coverOn7 } from '../pv7/cover7.mjs';
import { roomOf8, fits8, OPTION1, LAYOUT, planOf, camAt8 } from './views8.mjs';
import { LAYOUTS, unitIn, partsOf, visitorOf } from './units8.mjs';
import { phoneView, IDS } from '../vis/vis5.mjs';
import { camera, project, DEG } from '../ring/ring4b.mjs';
import { EYE, FULL } from '../vis/vis5.mjs';
import { LAMPS, RING } from '../pv6/report6.mjs';
import { VEGA_HAND, LYRA_EDGE, JUNO_EDGE } from '../pv6/stage6.mjs';
const DIR = new URL('./', import.meta.url).pathname;
export const VIEWS = ['B', 'C', 'D', 'E'];
// a view's staging and room (option 1), its camera at the viewer's plan spot, and both phones' views
export function stage8v(V, { pct = 100, layout = LAYOUT } = {}) { const room = roomOf8(V, 1, { layout }), { C, yaw } = camAt8(V);
  const views = Object.fromEntries([[390, 844], [430, 932]].map(([W, H]) => [`${W}x${H}`, phoneView(room, V, IDS, { W, H, pct, fov: 70, pitch: -5, farScale: 1, lens: 'rect', C, yaw })]));
  return { room, C, yaw, views, fits: fits8(room), sees: FULL[V].sees, blind: FULL[V].blind_place }; }
const compass = rad => { const d = ((rad / DEG) % 360 + 360) % 360; return +d.toFixed(0); };
const r1 = n => +(+n).toFixed(1), r2 = n => +(+n).toFixed(2);
const POSE = {
  E: `test tube: far hand (her ${SHARED.stations.E.side ?? 'left'}) on the bench's edge ${VEGA_HAND.forward} m forward, ${VEGA_HAND.left} m to her ${SHARED.stations.E.side ?? 'left'}, ${VEGA_HAND.up} m up; the bench's long edge along her ${SHARED.stations.E.side ?? 'left'} side (PV6-A's pose)`,
  C: `typing: the console's working edge ${LYRA_EDGE} m in front of her feet (PV6-A's pose)`,
  B: `seated on the stool behind her; the cart's near edge ${JUNO_EDGE} m in front of her feet (PV6-A's pose)`,
  A: 'at her place\'s tablet console, which stands at her left, its long side along the north wall; stand-in: standing, a tablet held at the chest (the layout\'s "tablet"); her pose is the animation builder\'s, from the place',
  D: 'at his bench, 0.5 m in front of him, square to his facing; stand-in: leaning toward the bench (the layout\'s "leanBench"); his pose is the animation builder\'s, from the place',
};
// ---- what this view moves, against the shared staging (PV6-A's stations for Vega, Lyra and Juno; the layout's for Mira and Atlas)
const SHARED_ROOM = roomOf8('A', 1, { layout: null });
const dirName = deg => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const FROM = { A: "the layout's", B: "PV6-A's", C: "PV6-A's", D: "the layout's", E: "PV6-A's" };
export function movedIn(V, room) { const out = { stations: [], people: [] };
  for (const pl of IDS) { if (pl === V) continue;
    const mine = room.objects.filter(o => o.place === pl && o.name !== 'food capsule'), theirs = SHARED_ROOM.objects.filter(o => o.place === pl);
    const shift = mine.length ? Math.hypot(mine[0].c[0] - theirs[0].c[0], mine[0].c[2] - theirs[0].c[2]) : 0;
    if (shift > 0.005) { const d = [mine[0].c[0] - theirs[0].c[0], mine[0].c[2] - theirs[0].c[2]], deg = compass(Math.atan2(d[0], d[1]));
      const cap = room.objects.find(o => o.place === pl && o.name === 'food capsule');
      out.stations.push({ place: pl, of: room.P(pl).name, pieces: [...mine.map(o => o.name), ...(cap ? ['food capsule (on the bench)'] : [])], movedM: r2(shift), towardDeg: deg, toward: dirName(deg), from: `${FROM[pl]} position`, withPerson: true, facingKept: true }); }
    const p = room.P(pl), q = SHARED_ROOM.P(pl), dm = Math.hypot(p.x - q.x, p.z - q.z);
    if (dm > 0.005) { const deg = compass(Math.atan2(p.x - q.x, p.z - q.z));
      out.people.push({ place: pl, name: p.name, movedM: r2(dm), towardDeg: deg, toward: dirName(deg), from: `${FROM[pl]} spot`, how: shift > 0.005 ? 'with their station' : pl === 'A' ? 'alone: a step about her tablet console, which stays at her left' : `alone: along ${SLIDES_TEXT[pl]}`, overCheatLimit: r2(dm) > 0.6 }); } }   // over a person's 0.6 m cheat at the centimetre the sheets give (C's Mira, 0.60008 m, is at it)
  // a capsule's eating spot cheated in this view only (units8.mjs visitorIn): from the shared spot, with its distance
  const visitors = LAYOUT ? LAYOUTS[LAYOUT].filter(u => u.visitorIn?.[V]).map(u => { const U = unitIn(room, u), a = visitorOf(U), b = visitorOf(U, V), d = [b[0] - a[0], b[1] - a[1]], deg = compass(Math.atan2(d[0], d[1]));
    return { unit: u.id, what: `${u.id}'s eating spot`, from: a, to: b, movedM: r2(Math.hypot(...d)), towardDeg: deg, toward: dirName(deg), how: `cheated alone: ${u.visitorIn[V].why}`, by: u.visitorIn[V].by, overCheatLimit: r2(Math.hypot(...d)) > 0.6 }; }) : [];
  if (visitors.length) out.visitors = visitors;   // only where a spot is cheated, so the other views' reports stay as they were
  return out; }
const SLIDES_TEXT = { C: "her console's working edge, her hands staying on it", D: 'his bench, his hands staying over it', E: 'her bench, toward its east end, her hand staying on it' };
// the viewer's own station: in their frame but never drawn in their own view (as PV6-A leaves Mira's console out): its share of the stage
export function ownStationIn(V, room) { const out = {};
  for (const [W, H] of [[390, 844], [430, 932]]) { const { C, yaw } = camAt8(V), SH = H - 191, f = W / 2 / Math.tan(35 * DEG), hy = SH / 2 + f * Math.tan(-5 * DEG), cam = camera({ C, yaw, f, cx: W / 2, hy, mode: 'rect' });
    const polys = room.objects.filter(o => o.place === V).flatMap(o => o.faces.map(fc => project(cam, fc.pts)).filter(Boolean));
    let n = 0, hit = 0, y0 = Infinity; for (let y = 1; y < SH; y += 2) for (let x = 1; x < W; x += 2) { n += 1; if (polys.some(q => inPolyR(q, x, y))) { hit += 1; y0 = Math.min(y0, y); } }
    out[`${W}x${H}`] = { shareOfStage: +(hit / n).toFixed(3), fromY: hit ? y0 : null }; }
  return { pieces: room.objects.filter(o => o.place === V).map(o => o.name), drawn: false, ...out, note: "never drawn in the viewer's own view (as PV6-A leaves Mira's console out); drawn, Vega's bench would cover Lyra in E" }; }
const inPolyR = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
// the capsule units in this view: shown or not, their boxes, the parts the code draws over them, and the visitor's spot
export function capsuleIn(V, room, layout) { if (!layout) return null;
  return { layout, units: LAYOUTS[layout].map(u => { const U = unitIn(room, u), mine = room.objects.find(o => o.name === 'food capsule' && o.unit === u.id), own = mine && mine.place === V;
    const per = {}; for (const [W, H] of [[390, 844], [430, 932]]) { const { C, yaw } = camAt8(V), SH = H - 191, f = W / 2 / Math.tan(35 * DEG), hy = SH / 2 + f * Math.tan(-5 * DEG), cam = camera({ C, yaw, f, cx: W / 2, hy, mode: 'rect' });
      const pp = mine.faces.map(fc => project(cam, fc.pts)).filter(Boolean).flat(); if (!pp.length) { per[`${W}x${H}`] = { inPicture: false }; continue; }
      const box = [Math.min(...pp.map(q => q[0])), Math.min(...pp.map(q => q[1])), Math.max(...pp.map(q => q[0])), Math.max(...pp.map(q => q[1]))], inside = box[2] > 0 && box[0] < W && box[3] > 0 && box[1] < SH;
      const toC = [C[0] - U.c[0], C[2] - U.c[1]], hatchToCameraDeg = Math.round(Math.acos((U.n[0] * toC[0] + U.n[1] * toC[1]) / Math.hypot(...toC)) / DEG);
      per[`${W}x${H}`] = { inPicture: inside && !own, box: box.map(r1), hatchToCameraDeg }; }
    return { id: u.id, kind: u.kind, where: u.kind === 'counter' ? `on ${room.P(u.on).name}'s bench, its north-west end` : `on the ${u.wall} wall`, ownStationHere: !!own, ...partsOf(U), visitor: visitorOf(U, V), phones: per }; }) }; }
export function report(V, { layout = LAYOUT } = {}) {
  const st = OPTION1[V], s = stage8v(V, { layout }), room = s.room, { C, yaw } = s;
  const fwd = [Math.sin(yaw), Math.cos(yaw)], right = [Math.cos(yaw), -Math.sin(yaw)];
  const inCam = (from, to) => { const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], h = Math.hypot(d[0], d[2]);
    const across = d[0] * right[0] + d[2] * right[1], away = d[0] * fwd[0] + d[2] * fwd[1];
    return { azimuthDeg: r1(Math.atan2(across, away) / DEG), elevationDeg: r1(Math.atan2(d[1], h) / DEG), distM: r2(Math.hypot(d[0], d[1], d[2])) }; };
  const uv = (x, z) => [(x - C[0]) * right[0] + (z - C[2]) * right[1], (x - C[0]) * fwd[0] + (z - C[2]) * fwd[1]], azOf = ([x, z]) => { const [u, v] = uv(x, z); return r1(Math.atan2(u, v) / DEG); };
  const people = {};
  for (const id of s.sees) {
    const p = room.P(id), p0 = planOf(id), sh = sharedSpot(id), stn = room.objects.filter(o => o.place === id);
    const chest = [p.x, 1.2, p.z], toCam = Math.atan2(C[0] - p.x, C[2] - p.z), seen = (((toCam - p.face) / DEG + 540) % 360) - 180;
    const lights = [...LAMPS.map(l => ({ id: l.id, kind: 'warm wall lamp', wall: l.wall, ...inCam(chest, l.at) })), ...RING.map((q, k) => ({ id: `ring ${k}`, kind: 'skylight ring', ...inCam(chest, q) }))];
    for (const l of lights) l.weight = 1 / (l.distM * l.distM);
    const lamps = lights.filter(l => l.kind === 'warm wall lamp').sort((a, b) => b.weight - a.weight), ring = lights.filter(l => l.kind === 'skylight ring');
    const sum = arr => { const v = arr.reduce((a, l) => { const az = l.azimuthDeg * DEG, el = l.elevationDeg * DEG; return [a[0] + l.weight * Math.cos(el) * Math.sin(az), a[1] + l.weight * Math.sin(el), a[2] + l.weight * Math.cos(el) * Math.cos(az)]; }, [0, 0, 0]);
      const h = Math.hypot(v[0], v[2]); return { azimuthDeg: r1(Math.atan2(v[0], v[2]) / DEG), elevationDeg: r1(Math.atan2(v[1], h) / DEG) }; };
    const W = lamps.reduce((a, l) => a + l.weight, 0), Rw = ring.reduce((a, l) => a + l.weight, 0);
    people[id] = { name: p.name, crew: p.crew, plan: [r2(p0.x), r2(p0.z)], pv6a: [r2(sh[0]), r2(sh[1])], spot: [r2(p.x), r2(p.z)], fromPlanM: r2(Math.hypot(p.x - p0.x, p.z - p0.z)), fromPv6aM: r2(Math.hypot(p.x - sh[0], p.z - sh[1])),
      movedToward: Math.hypot(p.x - p0.x, p.z - p0.z) > 0.005 ? compass(Math.atan2(p.x - p0.x, p.z - p0.z)) : null,
      fromCamera: { horizontalM: r2(Math.hypot(p.x - C[0], p.z - C[2])), depthM: r2(uv(p.x, p.z)[1]), azimuthDeg: azOf([p.x, p.z]) },
      facing: compass(p.face), facingFromCameraDeg: r1(((((p.face - yaw) / DEG) + 540) % 360) - 180), seenFromDeg: r1(seen),
      seenSide: Math.abs(seen) < 15 ? 'front' : Math.abs(seen) > 165 ? 'back' : `${Math.abs(seen) < 60 ? 'three-quarter front' : Math.abs(seen) <= 120 ? 'profile' : 'three-quarter back'}, from their ${seen > 0 ? 'right' : 'left'}`,
      station: stn.map(o => ({ name: o.name, centre: [r2(o.c[0]), r2(o.c[2])], frontFacing: o.name === 'stool' ? null : compass(Math.atan2((o.foot[0][0] + o.foot[1][0]) / 2 - o.c[0], (o.foot[0][1] + o.foot[1][1]) / 2 - o.c[2])),
        fromCameraAxisDeg: { centre: azOf([o.c[0], o.c[2]]), corners: o.foot.length === 4 ? o.foot.map(azOf) : [Math.min(...o.foot.map(azOf)), Math.max(...o.foot.map(azOf))] } })),
      pose: POSE[id],
      lampsAhead: LAMPS.map(l => { const d = [l.at[0] - p.x, l.at[1] - 1.24, l.at[2] - p.z], h = Math.hypot(d[0], d[2]), rel = ((((Math.atan2(d[0], d[2]) - p.face) / DEG) + 540) % 360) - 180;
        return { id: l.id, wall: l.wall, fromFacingDeg: r1(rel), elevationDeg: r1(Math.atan2(d[1], h) / DEG), distM: r2(Math.hypot(...d)) }; }).filter(l => Math.abs(l.fromFacingDeg) <= 60).sort((a, b) => Math.abs(a.fromFacingDeg) - Math.abs(b.fromFacingDeg)),
      lights: { warmLamps: lamps.slice(0, 3).map(l => ({ id: l.id, wall: l.wall, azimuthDeg: l.azimuthDeg, elevationDeg: l.elevationDeg, distM: l.distM, share: r2(l.weight / (W + Rw)) })),
        warmLampsTogether: { ...sum(lamps), share: r2(W / (W + Rw)) }, skylightRing: { ...sum(ring), share: r2(Rw / (W + Rw)) }, frame: 'from their chest (1.2 m up): azimuth 0 = straight into the picture, +90 = screen right, -90 = screen left, 180 = toward the camera; elevation above level; share of 1/d² of all lights' } };
  }
  const features = {};
  for (const [k, v] of Object.entries(s.views)) {
    const Wp = v.SH === 653 ? 390 : 430, cam = camera({ C, yaw, f: v.f, cx: Wp / 2, hy: v.hy, mode: 'rect' });
    for (const id of s.sees) { const c = v.per[id], fg = v.layout.figs.find(f => f.place === id), q = v.layout.squares.find(x => x.id === room.P(id).id);
      people[id][k] = { stage: [Wp, v.SH], box: fg.box.map(r1), feet: fg.anchor.map(r1), head: fg.head.map(r1), headR: r1(fg.headR), heightPx: c.heightPx, shareOfStageHeight: r2(c.heightPx / v.SH),
        press: { x0: r1(q.x0), y0: r1(q.y0), x1: r1(q.x1), y1: r1(q.y1) }, whole: c.whole, focalPx: v.f, horizonY: v.hy,
        covered: (c => ({ ...c, ownStation: +Object.entries(c.byBox).filter(([k]) => k.startsWith(id + ' ')).reduce((s, [, v]) => s + v, 0).toFixed(4), others: +Object.entries(c.byBox).filter(([k]) => !k.startsWith(id + ' ')).reduce((s, [, v]) => s + v, 0).toFixed(4) }))(coverOn7(room, v, cam, id, V, id === 'B' ? ['B stool'] : [])) }; }
    features[k] = {};
    for (const f of ['window', 'screen']) { const pp = project(cam, room[f].pts); if (!pp) { features[k][f] = { inPicture: false }; continue; }
      const fb = { x0: Math.min(...pp.map(q => q[0])), x1: Math.max(...pp.map(q => q[0])), y0: Math.min(...pp.map(q => q[1])), y1: Math.max(...pp.map(q => q[1])) }, inPic = fb.x1 > 0 && fb.x0 < Wp;
      const over = v.layout.figs.map(fg => { const ix = Math.max(0, Math.min(fb.x1, fg.box[2]) - Math.max(fb.x0, fg.box[0])), iy = Math.max(0, Math.min(fb.y1, fg.box[3]) - Math.max(fb.y0, fg.box[1])); return [fg.name, r2((ix * iy) / ((fb.x1 - fb.x0) * (fb.y1 - fb.y0)))]; }).filter(([, a]) => a > 0);
      features[k][f] = { inPicture: inPic, box: [fb.x0, fb.y0, fb.x1, fb.y1].map(r1), standInBoxCovers: Object.fromEntries(over) }; }
  }
  const issues = Object.fromEntries(Object.entries(s.views).map(([k, v]) => [k, v.issues]));
  return { viewer: V, viewerName: room.P(V).name, version: 2, method: 'PV6-A camera report version 4, version 2 of this view', staging: { option: 1, kind: st.kind, why: st.why ?? null, listed: movedIn(V, room), ownStation: ownStationIn(V, room) }, capsule: capsuleIn(V, room, layout), camera: { at: [r2(C[0]), EYE, r2(C[2])], yawDeg: compass(yaw), yawDegExact: r2(yaw / DEG), lens: 'straight lines, 70° across on both phones, the middle 5° down by a lens shift (the horizon raised by f·tan 5°, walls upright)' },
    outOfView: { place: FULL[V].blind_place, name: room.P(FULL[V].blind_place).name }, lamps: LAMPS, ringRadiusM: 1.45, people, features, fits: s.fits, issues };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const V of VIEWS) { const r = report(V); writeFileSync(DIR + `camera-report-${V}.json`, JSON.stringify(r, null, 1));
    console.log(`${V} (${r.viewerName}): issues ${JSON.stringify(r.issues)} fits ${JSON.stringify(r.fits)} | stations moved ${JSON.stringify(r.staging.listed.stations.map(s => `${s.of} ${s.movedM} m ${s.toward}`))} | people moved ${JSON.stringify(r.staging.listed.people.map(p => `${p.name} ${p.movedM} m ${p.toward} (${p.how.split(':')[0]})`))} | own station ${r.staging.ownStation['390x844'].shareOfStage} | capsule ${JSON.stringify(r.capsule?.units.map(u => `${u.id} ${u.phones['390x844'].inPicture ? 'in' : 'out'}`))}`); }
}
