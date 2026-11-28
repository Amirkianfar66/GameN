// Room A's staging for the layout test (version 2): the round window, the lamps, the food capsule and the five stations on the
// walls, each person at their station spot (staging.json, from optA.mjs), and each view's slides along the stations. The camera
// is PV6's: at the viewer's plan spot, eye height, the place's camera facing, straight lines, the phone's 70° slice at 5° down. A
// cheat moves a person only, along their own station, so their pose still meets it; the furniture is the same in every view
// (Room B's rule, the Lead, 18 November). Vega's chair rolls with Vega along the desk: it is drawn with the person, not with the room.
// Generates nothing.
import { readFileSync } from 'fs';
import { build, phoneView, obox, cylinder, slab, WALLS, IDS, FULL, PLACES, EYE, SIZE, DEG, toRoom, yawOf, CAST } from './vis/visA.mjs';
export { IDS, FULL, CAST, EYE };
const H2 = SIZE / 2;
export const STAGING = JSON.parse(readFileSync(new URL('./staging.json', import.meta.url), 'utf8'));
// One slide set by hand (optA.mjs knew only the two full-height phones): in view A, Lyra slides 0.2 m east along the hatch, a slide
// along the station within the same +-0.2 m rule as every other cheat ("the usual hatch spot", the Lead, 19 November; the search is
// not rerun, since it would move and turn Vega). On the owner's phone in the app, 402 x 742, it keeps Lyra whole (at the station
// spot the feet run 18 px below the picture) and the press area clear of the Board chip at 100% text. At 200% the chip, 340 px wide,
// still crosses it: known, fixed in the room scene's rule that keeps offered places clear of the shell's overlays, in the room scene's next version (0.6.0).
export const BY_HAND = { E: { A: [0.763, 1.325] } };
for (const [pl, vs] of Object.entries(BY_HAND)) for (const [v, at] of Object.entries(vs)) { const [px, pz] = toRoom(PLACES[pl]), s0 = STAGING[pl].at;
  STAGING[pl].views[v] = { ...STAGING[pl].views[v], at, slideM: null, byHand: true, fromStationM: +Math.hypot(at[0] - s0[0], at[1] - s0[1]).toFixed(2), fromPlanM: +Math.hypot(at[0] - px, at[1] - pz).toFixed(2) }; }
// The food capsule: a wall unit on a bracket (ship life's Room A kind), 0.32 m wide, 0.22 m deep, 1.0 to 1.55 m up
export const CAPSULE_SPOTS = { 'south wall, east': { wall: 's', u: -1.15 }, 'south wall, west': { wall: 's', u: 1.15 }, 'east wall, north': { wall: 'e', u: -1.05 }, 'east wall, south': { wall: 'e', u: 1.45 },
  'west wall, north': { wall: 'w', u: 1.0 }, 'west wall, south': { wall: 'w', u: -1.45 }, 'north wall, east': { wall: 'n', u: 1.35 } };
export const CAPSULE = 'east wall, north';   // whole in views A and D with nobody in front of it, out of B, C and E (capsule spots compared in the run log)
// Where a visitor stands at the capsule (the Lead, 19 November): side-on to the wall, facing 15° (compass), the unit at the right
// hand; in view A just south of the unit, 0.28 m off its front; in every other view at its north end, 0.33 m off its front. The
// way in is the strip of deck between the hatch's raised lid and the wall; its points are provisional (the Motion builder's).
export const VISIT = { faceDeg: 15, stance: 'side-on to the wall, the unit at the right hand', at: v => (v === 'A' ? [1.5, 0.75] : [1.45, 1.2]),
  wayIn: { intoTheStrip: [1.4, 0.5], roundTheHatchSouthAtZ: 0.42, westOfEcho: [0.95, 0.2], lyraRoundTheHatchNorth: [1.3, 1.34] } };
export const capsuleAt = (name = CAPSULE) => () => { const c = CAPSULE_SPOTS[name], p = WALLS[c.wall].at(c.u, 0, 0.11), yaw = { n: 0, s: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[c.wall];
  const o = obox('food capsule', null, [p[0], p[2]], 0.32, 0.22, 1.0, 1.55, yaw); o.kind = 'capsule'; return o; };
// Where things are (metres: X east, Z north, the room's centre at 0, 0)
export const LAYOUT = {
  window: ['n', 0, 1.95, 0.5],                     // the round window: the north wall's middle, its centre 1.95 m up, 1 m across
  lamps: { z: [0.7, -0.7], half: 1.3 },             // two light bars across the ceiling, east to west
  people: Object.fromEntries(IDS.map(id => [id, { at: STAGING[id].at, faceDeg: STAGING[id].faceDeg }])),
  stations: P => [
    // A: Vega's PC desk against the north wall, its two monitors (Vega's chair is drawn with Vega)
    [obox('PC desk', 'A', [-1.01, H2 - 0.275], 1.3, 0.55, 0, 0.74, 0), obox('monitor', 'A', [-1.26, H2 - 0.1], 0.46, 0.05, 0.78, 1.1, 0), obox('monitor', 'A', [-0.76, H2 - 0.1], 0.46, 0.05, 0.78, 1.1, 0)],
    // B: Mira's open deck by the south wall: nothing stands there
    [],
    // C: Echo's electrical panel, a cabinet on the east wall. Mounted 0.65 to 2.1 m above the deck (version 1: 0.45 to 1.9 m) so that
    // in view A it stands clear of the hatch's raised lid (sheet RA-A version 2), its top at 1.95 m in version 3. Version 4 (the Lead's
    // rule of 19 November: every edge 15 px from what RA-A-1 painted): 0.88 m wide, its north side where it was, so that it centres on
    // Echo's spot; 0.8 to 1.95 m above the deck, clear of the pipe run along the wall's foot; no door, since folded south it would
    // end on the wall's grille and folded north it would reach the food capsule. Nothing else on the floor plan moved.
    [obox('electrical panel', 'C', [H2 - 0.15, 0.4 - 0.88 / 2], 0.88, 0.3, 0.8, 1.95, Math.PI / 2)],
    // D: Atlas's crates against the west wall: a long one, and a smaller one on it
    [obox('crate', 'D', [-H2 + 0.3, -0.45], 1.0, 0.6, 0, 0.62, -Math.PI / 2), obox('crate', 'D', [-H2 + 0.25, -0.5], 0.6, 0.5, 0.62, 1.0, -Math.PI / 2)],
    // E: Lyra's floor hatch, a long one (1 m, along which Lyra slides): the open hole, its lid raised on its east
    // edge, and a toolbox west of it. Version 4: the lid 0.48 m long (was 0.6), so that in view A its top stays 15 px under the
    // pipe run RA-A-1 painted along the wall's foot (raised less, it hardly moves in the picture)
    [obox('floor hatch', 'E', [0.63, 0.9], 1.0, 0.5, 0, 0.012, 0, { fill: '#000', top: '#000' }), slab('hatch lid', 'E', [1.13, 0.65], [1.13, 1.15], 0.48, 80 * DEG, [1, 0]), obox('toolbox', 'E', [-0.02, 0.98], 0.36, 0.2, 0, 0.18, Math.PI / 2)],
  ],
};
// the room for one view: the shared staging with the view's slides; Vega's chair at Vega's spot
export function roomWith(viewer = null, { capsule = CAPSULE } = {}) {
  const moved = Object.fromEntries(IDS.map(id => [id, { ...LAYOUT.people[id], at: viewer && STAGING[id].views[viewer] ? STAGING[id].views[viewer].at : LAYOUT.people[id].at }]));
  const L = { ...LAYOUT, people: moved, capsule: capsule ? capsuleAt(capsule) : null, stations: P => [...LAYOUT.stations(P), [cylinder("chair", 'A', [P('A').x, P('A').z], 0.2, 0, 0.48)]] };
  return build(L);
}
export const camOf = viewer => { const [x, z] = toRoom(PLACES[viewer]); return { C: [x, EYE, z], yaw: yawOf(PLACES[viewer].camera_facing_degrees) }; };
// the two iPhone presets, and the owner's iPhone inside the Claude app: 402 wide with about 742 px of height (the Lead, 19 November)
export const PHONES = [[390, 844], [430, 932], [402, 742]], PCTS = [100, 200];
export function stageView(viewer, { pcts = PCTS, capsule = CAPSULE, labels = true, squares = true } = {}) {
  const room = roomWith(viewer, { capsule }), { C, yaw } = camOf(viewer), views = {};
  for (const [W, H] of PHONES) for (const pct of pcts) views[`${W}x${H}@${pct}`] = phoneView(room, viewer, IDS, { W, H, pct, fov: 70, pitch: -5, C, yaw, labels, squares });
  return { room, C, yaw, views };
}
// run alone: every view, its issues and each person's angle and head
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const v of IDS) { const s = stageView(v), k = s.views['390x844@100'];
    console.log(`view ${v} (${CAST[v].name}'s) sees ${FULL[v].sees.join('')}, blind ${FULL[v].blind_place}`);
    for (const [pl, c] of Object.entries(k.per)) console.log(`   ${c.name.padEnd(6)} seen ${String(c.seenDeg).padStart(6)}° ${c.head.padEnd(14)} dist ${c.distM} m  h ${c.heightPx}px  margins L ${c.marginL} R ${c.marginR} top ${c.marginTop} foot ${c.marginFoot}  face covered ${JSON.stringify(c.faceCovered)}`);
    console.log(`   hidden: ${k.hidden.map(h => `${h.name} out ${h.out} gap ${h.gapPx}px`).join(', ')}`);
    console.log('   window', JSON.stringify(k.features.window), '| capsule', JSON.stringify(k.features.capsule));
    for (const [key, vw] of Object.entries(s.views)) console.log(`   ${key}: ${vw.issues.length ? vw.issues.join('; ') : 'passes'}`); }
}
