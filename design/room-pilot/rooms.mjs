// mothership:dev-only
//
// The five rooms of the room pilot (docs/design/room-pilot.md), in the board's reading order. For
// each, the scene it redraws, with its places, focus, frame and layers unchanged:
//  - the Command Room, Room A, Room B and the Jail: the reviewed scenes the board shows
//    (design/board-motion/scenes/), whose pictures are design/board-motion/assets/scenes/;
//  - the Hospital: the ward of four berths the board shows today (./ward-four.mjs), whose
//    pictures are kept in its release snapshot.
// And for each: its colour family (tokens 0.5.0 color.room.*, tested equal), today's pictures (the
// back, behind every place, and each layer drawn in front of the places behind it), and who stands
// where in the review. The owner approved Room A redrawn by hand (./room-a.mjs) on 8 November
// 2026 ("I am really happy with rooms let do it for all"); the other four are redrawn shape for
// shape from today's pictures in the same hand (./ink-room.mjs), as dark as Room A.

import { SCENES } from '../board-motion/scenes/index.mjs';
import { inkRoomSvg } from './ink-room.mjs';
import { roomAPilotSvg } from './room-a.mjs';
import { WARD_FOUR } from './ward-four.mjs';

const ART = 'design/board-motion/assets/scenes';
const WARD = 'design/releases/source-snapshots/cb9386bd716dc346160509d5e49d7348fdaf4f84/design/board-v2/assets/scenes';
/** Where the redrawn pictures are written (design/tools/room-pilot-render.mjs). */
export const REVIEW = 'design/room-pilot/review';

/** Each room's colour family, dark to light: tokens 0.5.0 color.room.*. */
export const FAMILIES = Object.freeze({
  'command-room': Object.freeze({ deep: '#40300A', shadow: '#7A5A0C', mid: '#C4950F', light: '#EFC62F', pale: '#F9E48C' }),
  'room-a': Object.freeze({ deep: '#14243F', shadow: '#1D3D6B', mid: '#2D609E', light: '#5C92CC', pale: '#A9CAEB' }),
  'room-b': Object.freeze({ deep: '#2A1446', shadow: '#4B2079', mid: '#7A3CAD', light: '#AE6CD3', pale: '#DCB6EE' }),
  hospital: Object.freeze({ deep: '#0E3A3A', shadow: '#155B58', mid: '#1F8A80', light: '#57BBA8', pale: '#A6DFD0' }),
  jail: Object.freeze({ deep: '#45100F', shadow: '#7E1B19', mid: '#BE2D26', light: '#E85C44', pale: '#F6A78F' }),
});

const room = ({ id, name, token, prefix, scene, back, layers = {}, cast }) => Object.freeze({
  id, name, token, prefix, scene, family: FAMILIES[id], cast: Object.freeze(cast),
  today: Object.freeze({ back, layers: Object.freeze(layers) }),
  redrawn: Object.freeze({ back: `${REVIEW}/${id}.back.svg`, layers: Object.freeze(Object.fromEntries(Object.keys(layers).map(layer => [layer, `${REVIEW}/${id}.${layer}.svg`]))) }),
});

/** The rooms, in the board's reading order: the Command Room across the top, A and B, the Hospital and the Jail. */
export const ROOMS = Object.freeze([
  room({ id: 'command-room', name: 'Command Room', token: 'commandRoom', prefix: 'rc', scene: SCENES['command-room'], back: `${ART}/command-room.back.svg`, layers: { table: `${ART}/command-room.table.svg` }, cast: { C1: 'c4' } }),
  room({ id: 'room-a', name: 'Room A', token: 'roomA', prefix: 'ra', scene: SCENES['room-a'], back: `${ART}/room-a.back.svg`, cast: { A1: 'c1', A2: 'c8', A3: 'c3', A4: 'c4', A5: 'c9' } }),
  room({ id: 'room-b', name: 'Room B', token: 'roomB', prefix: 'rb', scene: SCENES['room-b'], back: `${ART}/room-b.back.svg`, layers: { bench: `${ART}/room-b.bench.svg` }, cast: { B1: 'c6', B2: 'c7', B3: 'c5', B4: 'c2', B5: 'c8' } }),
  room({
    id: 'hospital', name: 'Hospital', token: 'hospital', prefix: 'rh', scene: WARD_FOUR, back: `${WARD}/hospital-ward-four.back.svg`,
    layers: Object.fromEntries(Object.keys(WARD_FOUR.layers).map(layer => [layer, `${WARD}/hospital-ward-four.${layer}.svg`])),
    cast: { H1: 'c2', H2: 'c6', H3: 'c1', H4: 'c9' },
  }),
  room({ id: 'jail', name: 'Jail', token: 'jail', prefix: 'rj', scene: SCENES.jail, back: `${ART}/jail.back.svg`, cast: { J1: 'c5', J2: 'c7', J3: 'c3', J4: 'c8', J5: 'c4' } }),
]);
export const roomOf = id => ROOMS.find(r => r.id === id) ?? null;

/** A redrawn picture's file header: what it is and where it comes from. */
export function pictureHeader(r, layer = null) {
  const what = layer ? `the layer ${layer}, drawn in front of the places behind it` : 'the back picture, behind every place';
  const how = r.id === 'room-a'
    ? 'drawn by hand by design/room-pilot/room-a.mjs'
    : `redrawn shape for shape from ${layer ? r.today.layers[layer] : r.today.back} by design/room-pilot/ink-room.mjs`;
  return `  mothership:dev-only · room pilot · ${r.name} redrawn to match the approved crew · ${what} · generated, do not edit by hand
  A proposal in no release: ${how}, with the crew's ink (design/crew-drawing/source/ink.mjs), in the room's colour family
  (design tokens 0.5.0 color.room.${r.token}), its places, focus and frame unchanged. Written by design/tools/room-pilot-render.mjs.`;
}

/**
 * A room redrawn: { back, layers }, each an SVG, as elements (for a page) or, with file: true,
 * as files with their headers. read(path): today's picture at a repository path, as text.
 */
export function redrawRoom(r, read, { file = false } = {}) {
  const header = layer => (file ? pictureHeader(r, layer) : null);
  const back = r.id === 'room-a'
    ? roomAPilotSvg({ prefix: r.prefix, header: header(null) })
    : inkRoomSvg(read(r.today.back), r.family, { prefix: r.prefix, header: header(null) });
  const layers = Object.fromEntries(Object.entries(r.today.layers).map(([layer, path], i) => [layer,
    inkRoomSvg(read(path), r.family, { prefix: `${r.prefix}l${i + 1}`, layer: true, header: header(layer) })]));
  return { back, layers };
}
