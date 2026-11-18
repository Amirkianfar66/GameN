// Runtime source of the room scene component (design/phone-ui/components/room-scene): the owner's
// "a fifth wider" room view and the pictures it needs (the owner, 11 November 2026: "approved, go with a
// fifth wider", recorded in docs/design/owner-decisions.md). It ships with the approved room pictures,
// room-drawing-1.0.0, whose extension it draws: a match on that release frames each room a fifth wider
// than the filled view, and older art keeps the pack's framing (#229).
//
// The extension: each room's picture ends in its hand-drawn border, so a view a fifth wider would show
// nothing above and below it. Each room has two extension pictures, lit and dark, that continue its
// ceiling above and its deck below REACH scene units past the picture: they start in the picture's own
// colours along its edge (sampled from the lit picture, or from the lights-out one), feathered over its
// last rows, and fall into the room's shadow. They hold no place, prop or light that means anything, and
// they are the same for every phone. Like the room pictures they are reached through the CSS property of
// the bundle that carries them (Integration registers them with DSN-REQ-18); the component's preview
// defines the properties from the files beside this module (./assets/). The files are written by
// design/tools/room-scene-extend.mjs.

import { ROOM_ART_RELEASE } from './room-art.mjs';

/** How far each extension reaches past the picture, above and below, in scene units. */
export const REACH = 200;

/** The room-art releases framed wider than the filled view, and how much: the owner's "a fifth wider". */
export const WIDER = Object.freeze({ [ROOM_ART_RELEASE]: 0.8 });

/** The view's zoom for a match's room art: below 1 when its release is framed wider, else 1 (the pack's framing). */
export const zoomFor = roomArt => WIDER[roomArt] ?? 1;

const ROOMS = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];
/** room → its extension pictures, lit and lights-out, by the CSS property their bundle defines. */
export const ROOM_EXTENSION = Object.freeze(Object.fromEntries(ROOMS.map(room => [room, Object.freeze({
  lit: Object.freeze({ property: `--bm-scene-${room}-extend`, file: `${room}.extend.svg` }),
  dark: Object.freeze({ property: `--bm-scene-${room}-extend-dark`, file: `${room}.extend-dark.svg` }),
})])));

/**
 * The extension's layer: the picture's box grown by REACH above and below, drawn just over the picture
 * it continues (its feather overlaps the picture's last rows): over the back picture when lit (depth
 * −999.5), over the lights-out picture in the dark (depth 1400.5). z = 2 × depth + 1, as roomLayers.
 */
export function extensionLayer(room, { dark = false } = {}) {
  const art = ROOM_EXTENSION[room];
  if (!art) throw new Error(`No room extension for ${JSON.stringify(room)}`);
  return { id: dark ? 'extend-dark' : 'extend', depth: dark ? 1400.5 : -999.5, property: (dark ? art.dark : art.lit).property, reach: REACH };
}
