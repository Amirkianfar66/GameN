// Room A's camera reports, one per view (as Room B's report8.mjs, for the stand-in layout test): the camera; for each of the three
// in view, by crew id, their work, their spot (its distance from the plan spot and from their station spot, and the cheat that
// moved them), the way their body faces, the angle the camera sees them at and the head it takes, their depth, their screen box on
// the three phones (100% text), each light bar's share for them (lightsA.mjs, the method agreed with the Motion builder), and what
// covers them; the person out of view; the round window and the food capsule on the screen; where a visitor stands at the capsule in
// this view, seen from the camera. Writes camera-report-<view>.json. Generates nothing.
import { writeFileSync } from 'fs';
import { stageView, STAGING, LAYOUT, CAPSULE, CAPSULE_SPOTS, IDS, FULL, CAST, EYE, camOf, VISIT } from './stageA.mjs';
import { lightsFor, LIGHTS_FRAME, LIGHTS_METHOD } from './lightsA.mjs';
import { PLACES, toRoom, DESIGN_SHA, HEAD_BAND, DEG } from './vis/visA.mjs';
const r3 = n => +(+n).toFixed(3), r2 = n => +(+n).toFixed(2), r1 = n => +(+n).toFixed(1);
const CEIL = 3.0, sgn = a => ((((a + 180) % 360) + 360) % 360) - 180;
// where a visitor stands at the capsule in this view, seen from the camera: geometry only (the Motion builder draws the walks)
function visitFor(v, C, yaw, room) {
  const at = VISIT.at(v), fwd = [Math.sin(yaw), Math.cos(yaw)], right = [Math.cos(yaw), -Math.sin(yaw)], d = [at[0] - C[0], at[1] - C[2]];
  const depth = d[0] * fwd[0] + d[1] * fwd[1], across = d[0] * right[0] + d[1] * right[1], seen = sgn(Math.atan2(C[0] - at[0], C[2] - at[1]) / DEG - VISIT.faceDeg);
  const others = IDS.filter(id => id !== v).map(id => { const p = room.P(id); return { name: p.name, m: Math.hypot(p.x - at[0], p.z - at[1]) }; }).sort((a, b) => a.m - b.m);
  return { standAt: at, faceCompass: VISIT.faceDeg, stance: VISIT.stance, seenDeg: r1(seen), seenSide: seen >= 0 ? "from the visitor's right" : "from the visitor's left",
    head: Math.abs(seen) < 100 ? 'approved face' : Math.abs(seen) > 118 ? 'back view' : 'back view (the Lead: walks and visits seen between 100° and 118° use the back view)',
    depthM: r2(depth), fromCameraM: r2(Math.hypot(...d)), fromCameraAxisDeg: depth > 0 ? r1(Math.atan2(across, depth) / DEG) : null,
    standingPoint: depth <= 0 ? 'behind the camera' : Math.abs(Math.atan2(across, depth) / DEG) < 35 ? 'inside the 70° slice' : 'outside the 70° slice',
    beyondTheSliceEdgeM: depth > 0 ? r2(Math.abs(across) - depth * Math.tan(35 * DEG)) : null, nearestPerson: { name: others[0].name, m: r2(others[0].m) }, wayIn: VISIT.wayIn };
}
for (const v of IDS) {
  const s = stageView(v, { pcts: [100] }), k390 = s.views['390x844@100'], k430 = s.views['430x932@100'], k402 = s.views['402x742@100'], { C, yaw } = camOf(v);
  const people = {};
  for (const pl of FULL[v].sees) {
    const p = s.room.P(pl), c = k390.per[pl], st = STAGING[pl], vv = st.views[v], [px, pz] = toRoom(PLACES[pl]);
    const box = k => { const fg = k.layout.figs.find(f => f.place === pl); return fg ? fg.box.map(r1) : null; };
    people[pl] = { name: p.name, crew: p.crew, work: CAST[pl].work, does: CAST[pl].does, gestureStandIn: CAST[pl].gesture, ...(CAST[pl].board ? { gestureBoard: CAST[pl].board } : {}),
      spot: [r3(p.x), r3(p.z)], plan: [r2(px), r2(pz)], fromPlanM: r2(Math.hypot(p.x - px, p.z - pz)), station: st.at, fromStationM: r2(Math.hypot(p.x - st.at[0], p.z - st.at[1])),
      cheat: vv.byHand ? `slides ${vv.fromStationM} m along the station, within the same ±0.2 m rule (set by hand for the 402 x 742 phone)` : vv.slideM ? `slides ${Math.abs(vv.slideM)} m along the station` : 'none',
      bodyFacesCompass: r1(p.face / DEG), seenDeg: c.seenDeg, seenSide: `from ${p.name}'s ${c.seenDeg >= 0 ? 'right' : 'left'}`, head: c.head, depthM: c.distM,
      box390x653: box(k390), box430x741: box(k430), box402x551: box(k402), heightPx390: c.heightPx, marginsPx390: { left: c.marginL, right: c.marginR, top: c.marginTop, foot: c.marginFoot },
      tagAt390: c.tagAt, lights: lightsFor(v, p.x, p.z), covers: Object.keys(c.faceCovered).length ? c.faceCovered : 'nothing covers the face' };
  }
  const blind = FULL[v].blind_place, bp = s.room.P(blind);
  const feat = k => ({ window: k.features.window.inPicture ? { box: Object.fromEntries(Object.entries(k.features.window.box).map(([a, b]) => [a, r1(b)])), shownPct: k.features.window.shownPct, inFront: k.features.window.people } : 'not in the picture',
    capsule: k.features.capsule.inPicture ? { box: Object.fromEntries(Object.entries(k.features.capsule.box).map(([a, b]) => [a, r1(b)])), shownPct: k.features.capsule.shownPct, inFront: k.features.capsule.people } : 'not in the picture' });
  const rep = { view: v, viewer: CAST[v].name, viewerCrew: CAST[v].crew, version: 2, room: 'room-a', layout: 'perimeter-five-v1', designSha256: DESIGN_SHA,
    method: 'the stand-in layout test (rooma/stageA.mjs): flat cut-outs of the approved crew drawing; the furniture the same in every view; a cheat moves a person only, along that person\'s own station',
    camera: { at: C.map(r2), eyeM: EYE, yawCompass: r1(yaw / DEG), lens: 'straight lines', acrossDeg: 70, downDeg: 5, stagePx: { '390x844': [390, 653], '430x932': [430, 741], '402x742': [402, 551] } },
    lamps: { kind: 'two light bars across the ceiling, east to west', zM: LAYOUT.lamps.z, halfLengthM: LAYOUT.lamps.half, heightM: CEIL }, lights: { frame: LIGHTS_FRAME, method: LIGHTS_METHOD },
    headRule: { band: [100, 118], keptClear: HEAD_BAND, turnedHeads: ['Juno', 'Atlas', 'Lyra'] },
    people, outOfView: { place: blind, name: bp.name, crew: bp.crew, chip: k390.chip?.box ?? null },
    features: { '390x844': feat(k390), '430x932': feat(k430), '402x742': feat(k402) }, capsuleSpot: { name: CAPSULE, ...CAPSULE_SPOTS[CAPSULE], heightM: [1.0, 1.55] }, capsuleVisit: visitFor(v, C, yaw, s.room),
    issues: Object.fromEntries(Object.entries(stageView(v).views).map(([key, vw]) => [key, vw.issues])) };
  writeFileSync(new URL(`./camera-report-${v}.json`, import.meta.url), JSON.stringify(rep, null, 1));
  console.log(`${v}: ` + Object.values(people).map(p => `${p.name} seen ${p.seenDeg}° (${p.head}) depth ${p.depthM} m, ${p.fromPlanM} m from plan, cheat: ${p.cheat}`).join('; ') + ` | out: ${bp.name}`);
}
