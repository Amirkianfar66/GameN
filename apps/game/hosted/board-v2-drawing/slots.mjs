//
// The board's fixed places for the owner's motion specification of 13 October 2026 (G-01, G-09
// and Q-B03f of its game design and decision register): Room A, Room B and the Jail five each,
// the Command Room one, the Hospital one per seat of the match (seven, eight or nine). A place is
// a slot with a stable id. Backend stores each seat's slot and says it in the public view; a
// screen draws every seat at its stored slot and never works a place out from who is in the
// room. The memory targeting of the Blackout needs exactly that: the same position for the same
// person on every phone and on the display, before and during the darkness, and after a
// reconnect.
//
// The slots of Room A, Room B, the Jail and the Command Room are the places of the reviewed
// scenes (design/board-motion/scenes/), read here and not changed; the Hospital's are the
// ward's berths (./hospital-ward.mjs). For each slot this gives, in the scene's own units and
// normalized to its 1024 x 768 box ([x / 1024, y / 768]):
//   feet    where the figure stands (its anchor)
//   press   the centre of its press area: its place's gesture's press point, whatever the
//           character there is drawn doing, so a press area never moves
//   badge   where a status tag (detention, a rescue deadline) hangs
//   fx      where an impact or a shield is centred
// A Blackout position number is not a scene anchor: it sits in the upper right corner of the
// slot's press area, so that it is always on the target and never over the face it numbers
// (design/board-v2/js/fit.mjs places it).
//
// Nothing here is a rule, and this module allocates nothing. Which slot a seat holds is Backend's
// stored slotId, given by the specification's rule (rules-contracts.md, Blackout validation and
// resolution): existing occupants keep their slots, an entrant takes the lowest free slot of the
// room in this table's order, and a departure leaves a hole until a later entrant fills it. That
// order is the slots' numbering: A1 to A5, H1 to Hn. Nothing reads a role, a side or a cause.

import { skeletonOf } from '../scene-drawing/gestures.mjs';
import { pressPoint, toScene } from '../scene-drawing/frame.mjs';
import { SCENES } from '../scene-drawing/scenes.mjs';
import { WARD_ROSTERS, wardScene } from './hospital-ward.mjs';

/** This proposal's version, beside the board-motion-0.3.0 figures and scenes it reads (the ward's art carries it). */
export const SLOTS_VERSION = 'board-v2-0.1.0';
/** The slot table's own version: 0.1.1 carries no allocation policy (the Integration review of 13 October 2026). */
export const SLOT_TABLE_VERSION = 'board-v2-0.1.1';
export const SCENE_UNITS = Object.freeze([1024, 768]);
/** The rosters a board is drawn for. */
export const ROSTERS = WARD_ROSTERS;
/** The rooms in the board's reading order: the Command Room across the top, A and B, the Hospital and the Jail. */
export const BOARD_ROOMS = Object.freeze(['command-room', 'room-a', 'room-b', 'hospital', 'jail']);
export const LOCATION_OF = Object.freeze({ 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail' });
/** How many slots a room has, for a roster. */
export const slotCount = (room, roster) => (room === 'command-room' ? 1 : room === 'hospital' ? roster : 5);

/** The scene a room is drawn in: the ward for the Hospital, the reviewed scene elsewhere. */
export function sceneOf(room, roster) {
  if (!BOARD_ROOMS.includes(room)) throw new Error(`No room ${room}`);
  if (!ROSTERS.includes(roster)) throw new Error(`A board is drawn for 7, 8 or 9 players, not ${roster}`);
  return room === 'hospital' ? wardScene(roster) : SCENES[room];
}

const round = value => Number(value.toFixed(4));
const normalized = ([x, y]) => Object.freeze([round(x / SCENE_UNITS[0]), round(y / SCENE_UNITS[1])]);
const units = ([x, y]) => Object.freeze([Number(x.toFixed(1)), Number(y.toFixed(1))]);

const cache = new Map();
/**
 * A room's slots for a roster, in id order: id, room, location, the anchors above (normalized,
 * and in scene units with an "At" suffix), drawing order (depth), the place's gesture and its
 * gesture when Eliminated (down), the scene layer drawn over it (front: the ward's berths), and
 * the rosters that have it.
 */
export function slotsOf(room, roster) {
  const key = `${room}/${roster}`;
  if (cache.has(key)) return cache.get(key);
  const scene = sceneOf(room, roster);
  const slots = Object.freeze(scene.slots.map(place => {
    const sk = skeletonOf(place.gesture);
    const pressAt = toScene(place, pressPoint(sk));
    const headAt = toScene(place, sk.head);
    // A berth's plate is on its headboard; elsewhere a tag hangs over the head.
    const badgeAt = place.badge ?? [headAt[0], headAt[1] - 40 * place.scale];
    return Object.freeze({
      id: place.id, room, location: LOCATION_OF[room], rosters: Object.freeze([...(place.rosters ?? ROSTERS)]),
      feet: normalized(place.at), press: normalized(pressAt), badge: normalized(badgeAt), fx: normalized(pressAt),
      at: units(place.at), pressAt: units(pressAt), badgeAt: units(badgeAt),
      depth: place.depth ?? place.at[1], scale: place.scale, mirror: Boolean(place.mirror),
      gesture: place.gesture, down: place.down ?? 'down', front: place.front ?? null, about: place.about,
    });
  }));
  cache.set(key, slots);
  return slots;
}

/** Every slot of the board for a roster, room by room in the board's reading order. */
export const boardSlots = roster => BOARD_ROOMS.flatMap(room => slotsOf(room, roster));

/** What is wrong with the slot table for a roster: an empty list when every rule holds. */
export function slotProblems(roster) {
  const problems = [];
  for (const room of BOARD_ROOMS) {
    const slots = slotsOf(room, roster);
    if (slots.length !== slotCount(room, roster)) problems.push(`${room}: ${slots.length} slots for ${roster} players, not ${slotCount(room, roster)}`);
    const ids = new Set(slots.map(slot => slot.id));
    if (ids.size !== slots.length) problems.push(`${room}: a slot id is used twice`);
    const prefix = { 'command-room': 'C', 'room-a': 'A', 'room-b': 'B', hospital: 'H', jail: 'J' }[room];
    slots.forEach((slot, index) => {
      if (slot.id !== `${prefix}${index + 1}`) problems.push(`${room}: slot ${index + 1} is ${slot.id}, not ${prefix}${index + 1}`);
      for (const name of ['feet', 'press', 'badge', 'fx']) {
        if (!slot[name].every(value => value >= 0 && value <= 1)) problems.push(`${slot.id}: ${name} anchor leaves the scene`);
      }
      if (!slot.rosters.includes(roster)) problems.push(`${slot.id}: drawn for a roster it is not in`);
    });
  }
  return problems;
}
