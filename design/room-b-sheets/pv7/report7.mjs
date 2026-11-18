// The camera reports for Room B's views B, C, D and E (sheets PV6-B to PV6-E), as PV6-A's (report6.mjs, version 4), for the
// In-game animation builder through the Lead: for each of the three in view (by crew id), their station, their spot (and how far
// it is from the plan and from PV6-A's), the screen box on 390 x 653 and 430 x 741 (100% text), the angle at which the camera sees
// them and their station's facing, where the warm lamps and the skylight's ring of lights sit relative to them, what covers them,
// and the person out of view. Writes camera-report-<view>.json. Generates nothing.
import { writeFileSync } from 'fs';
import { stage7, VIEWS, planOf, SHARED } from './stage7.mjs';
import { stagingAt, sharedSpot } from './search7.mjs';
import { coverOn7 } from './cover7.mjs';
import { camera, project, DEG } from '../ring/ring4b.mjs';
import { EYE, FULL } from '../vis/vis5.mjs';
import { LAMPS, RING } from '../pv6/report6.mjs';
import { VEGA_HAND, LYRA_EDGE, JUNO_EDGE } from '../pv6/stage6.mjs';
const DIR = new URL('./', import.meta.url).pathname;
// Each view's spots (search7.mjs: within 0.6 m of the plan spot, the station moving with its person and keeping its facing; the
// rest at the shared staging). Where nobody can keep wholly clear of the screen within the cheat limit (B: Atlas, C: Mira), the
// spot that covers the least of it (_screen7.mjs), and the cover is reported.
export const SPOTS = {
  B: { A: [-1.038, 1.68], D: [-1.68, -0.047], E: [0.458, 1.525] },
  C: { A: [-1.629, 1.576], B: [0, -1.08], D: [-1.68, -0.397] },
  D: { A: [-0.692, 1.48], C: [1.256, 0.027], E: [0.74, 1.33] },
  E: { B: [0.6, -1.68], C: [1.247, -0.147], D: [-1.48, -0.743] },
};
export const stagingOf = V => stagingAt(SPOTS[V]);
const compass = rad => { const d = ((rad / DEG) % 360 + 360) % 360; return +d.toFixed(0); };
const r1 = n => +(+n).toFixed(1), r2 = n => +(+n).toFixed(2);
const POSE = {
  E: `test tube: far hand (her ${SHARED.stations.E.side ?? 'left'}) on the bench's edge ${VEGA_HAND.forward} m forward, ${VEGA_HAND.left} m to her ${SHARED.stations.E.side ?? 'left'}, ${VEGA_HAND.up} m up; the bench's long edge along her ${SHARED.stations.E.side ?? 'left'} side (PV6-A's pose)`,
  C: `typing: the console's working edge ${LYRA_EDGE} m in front of her feet (PV6-A's pose)`,
  B: `seated on the stool behind her; the cart's near edge ${JUNO_EDGE} m in front of her feet (PV6-A's pose)`,
  A: 'at her place\'s tablet console, which stands at her left, its long side along the north wall; stand-in: standing, a tablet held at the chest (the layout\'s "tablet"); her pose is the animation builder\'s, from the place',
  D: 'at his bench, 0.5 m in front of him, square to his facing; stand-in: leaning toward the bench (the layout\'s "leanBench"); his pose is the animation builder\'s, from the place',
};
export function report(V) {
  const st = stagingOf(V), s = stage7(V, st), room = s.room, { C, yaw } = s;
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
  return { viewer: V, viewerName: room.P(V).name, version: 1, method: 'PV6-A camera report version 4', staging: { ...st, spots: SPOTS[V] }, camera: { at: [r2(C[0]), EYE, r2(C[2])], yawDeg: compass(yaw), yawDegExact: r2(yaw / DEG), lens: 'straight lines, 70° across on both phones, the middle 5° down by a lens shift (the horizon raised by f·tan 5°, walls upright)' },
    outOfView: { place: FULL[V].blind_place, name: room.P(FULL[V].blind_place).name }, lamps: LAMPS, ringRadiusM: 1.45, people, features, fits: s.fits, issues };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const V of VIEWS) { const r = report(V); writeFileSync(DIR + `camera-report-${V}.json`, JSON.stringify(r, null, 1));
    console.log(`${V} (${r.viewerName}): sees ${Object.values(r.people).map(p => `${p.name} ${p.spot} (plan +${p.fromPlanM} m, PV6-A +${p.fromPv6aM} m) seen ${p.seenSide} ${p.seenFromDeg}°, ${p['390x844'].shareOfStageHeight} of the stage`).join('; ')} | out ${r.outOfView.name} | issues ${JSON.stringify(r.issues)} | fits ${JSON.stringify(r.fits)} | features 390 ${JSON.stringify(r.features['390x844'])}`); }
}
