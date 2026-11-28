// PV6-A's camera report, for the Motion and Cinematics builder (through the Lead): for each of the three in Mira's view (by crew
// id), their pose's station, the cheated spot, the screen box on 390 x 653 and 430 x 741 (100% text), the yaw at which the camera sees them and their station's
// facing, and where the warm lamps and the skylight's ring of lights sit relative to them. Writes camera-report.json.
import { writeFileSync } from 'fs';
import { stage, cheatRoom, frame, VIEWER, VEGA_HAND, LYRA_EDGE, JUNO_EDGE } from './stage6.mjs';
import { coverOn } from './restage6.mjs';
import { camera } from '../ring/ring4b.mjs';
import { build, IDS, EYE } from '../vis/vis5.mjs';
import { DEG } from '../ring/ring4b.mjs';
const DIR = new URL('./', import.meta.url).pathname;
// version 4 (the Lead's review of 1794970662-fdca, the Motion builder's poses, and the Lead's request for Vega seen from the front
// three-quarter): no translated moves; each of the three stands at a pose with their station built from it (stage6.mjs restage)
export const STAGING = { fov: 70, back: 0, turnDeg: 0, farScale: 1, moves: {}, stations: {
  E: { at: [0.74, 1.33], faceDeg: 241.1, side: 'left', turnDeg: 20, nearEnd: -0.7, scope: 'near', mirror: true },
  C: { at: [1.28, -0.1], faceDeg: 90 },
  B: { at: [0.6, -1.68], faceDeg: 70 } } };
export const STAGING_V3 = { fov: 70, back: 0, turnDeg: 0, farScale: 1, moves: {}, stations: { E: { at: [0.72, 1.29], faceDeg: 76.4, turnDeg: 15, nearEnd: 0.1, mirror: true }, C: { at: [1.28, -0.1], faceDeg: 90 }, B: { at: [0.6, -1.68], faceDeg: 70 } } };
export const STAGING_V1 = { fov: 70, back: 0, turnDeg: 0, farScale: 1, moves: { E: [-0.424, -0.424], C: [-0.354, 0.354], B: [0.6, 0] } };
// The warm wall lamps (caged, as in the references): two on each wall at 2.05 m, clear of the window (south) and the screen
// (west); the skylight's ring: 16 small lights at 1.45 m from the room's middle in the 3.0 m ceiling, now warm.
export const LAMP_Y = 2.05;
export const LAMPS = [
  { id: 'N1', wall: 'north', at: [-1.0, LAMP_Y, 1.96] }, { id: 'N2', wall: 'north', at: [1.0, LAMP_Y, 1.96] },
  { id: 'E1', wall: 'east', at: [1.96, LAMP_Y, 1.0] }, { id: 'E2', wall: 'east', at: [1.96, LAMP_Y, -1.0] },
  { id: 'S1', wall: 'south', at: [0.15, LAMP_Y, -1.96] }, { id: 'S2', wall: 'south', at: [1.35, LAMP_Y, -1.96] },
  { id: 'W1', wall: 'west', at: [-1.96, LAMP_Y, 0.35] }, { id: 'W2', wall: 'west', at: [-1.96, LAMP_Y, -1.0] }];
export const RING = Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * 2 * Math.PI; return [1.45 * Math.cos(a), 2.98, 1.45 * Math.sin(a)]; });
// a station's front (orientedBox: its -d side, corners k0-k1, the user's side) faces from its centre toward that edge
const compass = rad => { const d = ((rad / DEG) % 360 + 360) % 360; return +d.toFixed(0); };   // 0 = north, 90 = east
const r1 = n => +(+n).toFixed(1), r2 = n => +(+n).toFixed(2);
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const s = stage(STAGING), room = s.room, plan = build(4), { C, yaw } = s;
  const fwd = [Math.sin(yaw), Math.cos(yaw)], right = [Math.cos(yaw), -Math.sin(yaw)];
  // a direction from a point, in the camera's frame: across (+ screen right), up, and away (+ into the picture)
  const inCam = (from, to) => { const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], h = Math.hypot(d[0], d[2]);
    const across = d[0] * right[0] + d[2] * right[1], away = d[0] * fwd[0] + d[2] * fwd[1];
    return { azimuthDeg: r1(Math.atan2(across, away) / DEG), elevationDeg: r1(Math.atan2(d[1], h) / DEG), distM: r2(Math.hypot(d[0], d[1], d[2])) }; };
  const people = {};
  for (const id of ['E', 'C', 'B']) {
    const p = room.P(id), p0 = plan.P(id), st = room.objects.filter(o => o.place === id), main = st.find(o => o.name !== 'microscope' && o.name !== 'stool') ?? st[0];
    const chest = [p.x, 1.2, p.z], horiz = Math.hypot(p.x - C[0], p.z - C[2]);
    const toCam = Math.atan2(C[0] - p.x, C[2] - p.z), seen = (((toCam - p.face) / DEG + 540) % 360) - 180;   // + : the camera is to their right
    const lights = [...LAMPS.map(l => ({ id: l.id, kind: 'warm wall lamp', wall: l.wall, ...inCam(chest, l.at) })), ...RING.map((q, k) => ({ id: `ring ${k}`, kind: 'skylight ring', ...inCam(chest, q) }))];
    for (const l of lights) l.weight = 1 / (l.distM * l.distM);
    const lamps = lights.filter(l => l.kind === 'warm wall lamp').sort((a, b) => b.weight - a.weight), ring = lights.filter(l => l.kind === 'skylight ring');
    const sum = (arr) => { const v = arr.reduce((a, l) => { const az = l.azimuthDeg * DEG, el = l.elevationDeg * DEG; return [a[0] + l.weight * Math.cos(el) * Math.sin(az), a[1] + l.weight * Math.sin(el), a[2] + l.weight * Math.cos(el) * Math.cos(az)]; }, [0, 0, 0]);
      const h = Math.hypot(v[0], v[2]); return { azimuthDeg: r1(Math.atan2(v[0], v[2]) / DEG), elevationDeg: r1(Math.atan2(v[1], h) / DEG), share: 0 }; };
    const W = lamps.reduce((a, l) => a + l.weight, 0), Rw = ring.reduce((a, l) => a + l.weight, 0);
    const F = frame(room), azOf = ([x, z]) => { const [u, v] = F.uv(x, z); return r1(Math.atan2(u, v) / DEG); };
    people[id] = { name: p.name, crew: p.crew, plan: [r2(p0.x), r2(p0.z)], cheated: [r2(p.x), r2(p.z)], movedM: r2(Math.hypot(p.x - p0.x, p.z - p0.z)), movedToward: compass(Math.atan2(p.x - p0.x, p.z - p0.z)),
      fromCamera: { horizontalM: r2(horiz), depthM: r2((p.x - C[0]) * fwd[0] + (p.z - C[2]) * fwd[1]), azimuthDeg: r1(Math.atan2((p.x - C[0]) * right[0] + (p.z - C[2]) * right[1], (p.x - C[0]) * fwd[0] + (p.z - C[2]) * fwd[1]) / DEG) },
      facing: compass(p.face), facingFromCameraDeg: r1(((((p.face - yaw) / DEG) + 540) % 360) - 180), seenFromDeg: r1(seen),
      seenSide: Math.abs(seen) < 15 ? 'front' : Math.abs(seen) > 165 ? 'back' : `${Math.abs(seen) < 60 ? 'three-quarter front' : Math.abs(seen) <= 120 ? 'profile' : 'three-quarter back'}, from their ${seen > 0 ? 'right' : 'left'}`,
      station: st.map(o => ({ name: o.name, centre: [r2(o.c[0]), r2(o.c[2])], frontFacing: o.name === 'stool' ? null : compass(Math.atan2((o.foot[0][0] + o.foot[1][0]) / 2 - o.c[0], (o.foot[0][1] + o.foot[1][1]) / 2 - o.c[2])),
        fromCameraAxisDeg: { centre: azOf([o.c[0], o.c[2]]), corners: o.foot.length === 4 ? o.foot.map(azOf) : [Math.min(...o.foot.map(azOf)), Math.max(...o.foot.map(azOf))] } })),
      pose: { E: `test tube: far hand (her ${STAGING.stations.E.side ?? 'left'}) on the bench's edge ${VEGA_HAND.forward} m forward, ${VEGA_HAND.left} m to her ${STAGING.stations.E.side ?? 'left'}, ${VEGA_HAND.up} m up; the bench's long edge along her ${STAGING.stations.E.side ?? 'left'} side`, C: `typing: the console's working edge ${LYRA_EDGE} m in front of her feet`, B: `seated on the stool behind her; the cart's near edge ${JUNO_EDGE} m in front of her feet` }[id],
      lampsAhead: LAMPS.map(l => { const d = [l.at[0] - p.x, l.at[1] - 1.24, l.at[2] - p.z], h = Math.hypot(d[0], d[2]), rel = ((((Math.atan2(d[0], d[2]) - p.face) / DEG) + 540) % 360) - 180;
        return { id: l.id, wall: l.wall, fromFacingDeg: r1(rel), elevationDeg: r1(Math.atan2(d[1], h) / DEG), distM: r2(Math.hypot(...d)) }; }).filter(l => Math.abs(l.fromFacingDeg) <= 60).sort((a, b) => Math.abs(a.fromFacingDeg) - Math.abs(b.fromFacingDeg)),
      lights: { warmLamps: lamps.slice(0, 3).map(l => ({ id: l.id, wall: l.wall, azimuthDeg: l.azimuthDeg, elevationDeg: l.elevationDeg, distM: l.distM, share: r2(l.weight / (W + Rw)) })),
        warmLampsTogether: { ...sum(lamps), share: r2(W / (W + Rw)) }, skylightRing: { ...sum(ring), share: r2(Rw / (W + Rw)) }, frame: 'from their chest (1.2 m up): azimuth 0 = straight into the picture, +90 = screen right, -90 = screen left, 180 = toward the camera; elevation above level; share of 1/d² of all lights' } };
  }
  // the screen boxes, from phoneView (stage px; 100% text)
  for (const [k, v] of Object.entries(s.views)) for (const id of ['E', 'C', 'B']) { const c = v.per[id], fg = v.layout.figs.find(f => f.place === id);
    people[id][k] = { stage: [v.SH === 653 ? 390 : 430, v.SH], box: fg.box.map(r1), feet: fg.anchor.map(r1), head: fg.head.map(r1), headR: r1(fg.headR), heightPx: c.heightPx, shareOfStageHeight: r2(c.heightPx / v.SH),
      press: (() => { const q = v.layout.squares.find(x => x.id === room.P(id).id); return { x0: r1(q.x0), y0: r1(q.y0), x1: r1(q.x1), y1: r1(q.y1) }; })(), whole: c.whole, focalPx: v.f, horizonY: v.hy }; }
  // what covers Lyra and Juno: anything nearer than them over their box, lower half, face and press area (Juno's stool left out)
  for (const [k, v] of Object.entries(s.views)) { const W = v.SH === 653 ? 390 : 430, cam = camera({ C, yaw, f: v.f, cx: W / 2, hy: v.hy, mode: 'rect' });
    people.C[k].covered = coverOn(room, v, cam, 'C'); people.B[k].covered = coverOn(room, v, cam, 'B', ['B stool']); }
  writeFileSync(DIR + 'camera-report.json', JSON.stringify({ viewer: VIEWER, version: 4, staging: STAGING, camera: { at: [r2(C[0]), EYE, r2(C[2])], yawDeg: compass(yaw), yawDegExact: r2(yaw / DEG) }, lamps: LAMPS, ringRadiusM: 1.45, people }, null, 1));
  console.log(JSON.stringify(people, null, 1).slice(0, 4000));
}
