// The five views' stagings for version 2, by option (the Lead chooses; message of 18 November): each view's room is the shared
// room (stage8.mjs) with that view's moves. moves: a person and their station together (version 1's rule, option 1's B and C
// only); cheats: a person alone (slides along their own station, Mira's step about her console). The capsule stands on Atlas's
// bench at its north-west end, built on that view's bench (capsule8.mjs). Generates nothing.
import { phoneView, IDS, FULL } from '../vis/vis5.mjs';
import { cheatRoom, fits } from '../pv6/stage6.mjs';
import { STATIONS, SLIDES, planOf, camAt8 } from './stage8.mjs';
import { capsuleOf } from './capsule8.mjs';
import { LAYOUTS, unitIn } from './units8.mjs';
import { SPOTS as SPOTS1 } from '../pv7/report7.mjs';
import { stagingAt } from '../pv7/search7.mjs';
export const CAPSULE = { on: 'D', end: -1, inset: 0.13, across: 0, faceDeg: 99 };
const slide = (pl, t) => [+(SLIDES[pl].at[0] + SLIDES[pl].u[0] * t).toFixed(3), +(SLIDES[pl].at[1] + SLIDES[pl].u[1] * t).toFixed(3)];
const step = (pl, dx, dz) => [+(SLIDES[pl].at[0] + dx).toFixed(3), +(SLIDES[pl].at[1] + dz).toFixed(3)];
// option 1: identical furniture in D and E (person-only cheats); B and C keep version 1's stagings, a station moving with its person
export const OPTION1 = {
  A: { kind: 'shared', stations: STATIONS, moves: {}, cheats: {} },
  B: { kind: 'station moves', ...stagingAt(SPOTS1.B), cheats: {}, why: 'version 1: Atlas and Vega cannot be whole in B with their benches fixed' },
  C: { kind: 'station moves', ...stagingAt(SPOTS1.C), cheats: {}, why: 'version 1: Juno cannot be in C with her stool and cart fixed' },
  D: { kind: 'shared', stations: STATIONS, moves: {}, cheats: { A: step('A', 0.3, -0.5), C: slide('C', -0.12) } },
  E: { kind: 'shared', stations: STATIONS, moves: {}, cheats: { C: slide('C', 0.05), D: slide('D', 0.35) } },
};
export const STAGINGS = { 1: OPTION1 };
// the room of a view: stations (and station moves), then the capsule units of the layout (units8.mjs; a counter unit on the
// station it stands on, as that view's staging places it; a wall unit on its wall), then person-only cheats. layout: 'A1' (the
// counter unit on Atlas's bench), 'W2' (two wall units) or null (no capsule); the default is PV8_LAYOUT or A1. capsule: the
// version 1 test's single counter spec (kept for the exploration scripts), used only when no layout is given.
export const LAYOUT = process.env.PV8_LAYOUT ?? 'A1';
export function roomOf8(V, option = 1, { capsule = undefined, layout = undefined } = {}) {
  const s = STAGINGS[option][V], room = cheatRoom(s.moves ?? {}, s.stations ?? STATIONS);
  if (capsule !== undefined && layout === undefined) { if (capsule) { const o = capsuleOf(capsule)(room); o.place = capsule.on; room.objects.push(o); } }
  else { const L = layout === undefined ? LAYOUT : layout; if (L) for (const u of LAYOUTS[L]) room.objects.push(unitIn(room, u).o); }
  for (const [pl, at] of Object.entries(s.cheats ?? {})) [room.P(pl).x, room.P(pl).z] = at;
  return room;
}
// the room's own rules, as fits() but letting the capsule stand on its counter
export const fits8 = room => fits({ ...room, objects: room.objects.filter(o => o.name !== 'food capsule') });
export function view8(V, option = 1, { pct = 100, W = 390, H = 844, layout = undefined } = {}) {
  const room = roomOf8(V, option, { layout }), { C, yaw } = camAt8(V);
  return { room, C, yaw, view: phoneView(room, V, IDS, { W, H, pct, fov: 70, pitch: -5, farScale: 1, lens: 'rect', C, yaw }) };
}
export { FULL, IDS, planOf, camAt8 };
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const V of ['A', 'B', 'C', 'D', 'E']) for (const [W, H] of [[390, 844], [430, 932]]) for (const pct of [100, 200]) { const { room, view } = view8(V, 1, { W, H, pct });
    console.log(V, W, pct, JSON.stringify(Object.values(view.per).map(c => [c.name, c.marginL, c.marginR])), view.issues.length ? JSON.stringify(view.issues) : 'ok', 'fits', JSON.stringify(fits8(room))); }
}
