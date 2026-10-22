// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/scenes/slots-four.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The successor board's fixed places, for the owner's four-bed decision of 18 October 2026
// (HOSPITAL-4-2026-10-18, issue #155): Room A, Room B and the Jail five each and the Command Room
// one, exactly as in ./slots.mjs, and the Hospital four, whatever the roster. The roster (7, 8 or
// 9) stays the match's own; only the Hospital's capacity differs, and nothing here is drawn for a
// roster of four.
//
// This is ./slots.mjs with the four-berth ward (./hospital-ward-four.mjs) in the roster-sized
// ward's place: the same exports, the same anchors and the same reading of them. ./slots.mjs is
// unchanged, for the current release; a successor board imports this module in its place
// (../js/fit-four.mjs and ../js/turns-four.mjs are fit.mjs and turns.mjs with that import alone
// changed). The rooms other than the Hospital read the very slots of ./slots.mjs.
//
// Its version is a proposal: Integration allocates the successor's layout identity with its
// tuple. Nothing here is a rule, and this module allocates nothing: which bed a patient holds is
// Backend's stored slotId, H1 to H4, under the successor's contract (draft #157).

import { skeletonOf } from '../scene-drawing/gestures.mjs';
import { pressPoint, toScene } from '../scene-drawing/frame.mjs';
import { SCENES } from '../scene-drawing/scenes.mjs';
import { FOUR_BEDS, FOUR_ROSTERS, wardFourScene } from './hospital-ward-four.mjs';
import { BOARD_ROOMS, LOCATION_OF, SCENE_UNITS, slotsOf as rosterSlotsOf } from './slots.mjs';

export { BOARD_ROOMS, LOCATION_OF, SCENE_UNITS };
/** This proposal's version, for the four-berth ward's art (a proposed identity, for Integration to allocate). */
export const SLOTS_VERSION = 'board-v2-four-0.1.0';
/** The successor slot table's version (proposed): the roster-sized table board-v2-0.1.1 with a Hospital of four. */
export const SLOT_TABLE_VERSION = 'board-v2-four-0.1.0';
/** The rosters a successor board is drawn for. */
export const ROSTERS = FOUR_ROSTERS;
/** How many slots a room has: four in the Hospital whatever the roster, five in A, B and the Jail, one in the Command Room. */
export const slotCount = (room, roster) => (room === 'command-room' ? 1 : room === 'hospital' ? FOUR_BEDS : 5);

/** The scene a room is drawn in: the four-berth ward for the Hospital, the reviewed scene elsewhere. */
export function sceneOf(room, roster) {
  if (!BOARD_ROOMS.includes(room)) throw new Error(`No room ${room}`);
  if (!ROSTERS.includes(roster)) throw new Error(`A board is drawn for 7, 8 or 9 players, not ${roster}`);
  return room === 'hospital' ? wardFourScene(roster) : SCENES[room];
}

const round = value => Number(value.toFixed(4));
const normalized = ([x, y]) => Object.freeze([round(x / SCENE_UNITS[0]), round(y / SCENE_UNITS[1])]);
const units = ([x, y]) => Object.freeze([Number(x.toFixed(1)), Number(y.toFixed(1))]);

const cache = new Map();
/**
 * A room's slots for a roster, in id order, as ./slots.mjs gives them (the same fields). The
 * Hospital's are the four berths, built from their places exactly as ./slots.mjs builds a berth's;
 * every other room's are ./slots.mjs's own.
 */
export function slotsOf(room, roster) {
  const key = `${room}/${roster}`;
  if (cache.has(key)) return cache.get(key);
  if (room !== 'hospital') {
    sceneOf(room, roster);
    const own = rosterSlotsOf(room, roster);
    cache.set(key, own);
    return own;
  }
  const scene = sceneOf(room, roster);
  const slots = Object.freeze(scene.slots.map(place => {
    const sk = skeletonOf(place.gesture);
    const pressAt = toScene(place, pressPoint(sk));
    const badgeAt = place.badge;
    return Object.freeze({
      id: place.id, room, location: LOCATION_OF[room], rosters: Object.freeze([...place.rosters]),
      feet: normalized(place.at), press: normalized(pressAt), badge: normalized(badgeAt), fx: normalized(pressAt),
      at: units(place.at), pressAt: units(pressAt), badgeAt: units(badgeAt),
      depth: place.depth, scale: place.scale, mirror: Boolean(place.mirror),
      gesture: place.gesture, down: place.down, front: place.front, about: place.about,
    });
  }));
  cache.set(key, slots);
  return slots;
}

/** Every slot of the successor board for a roster, room by room in the board's reading order. */
export const boardSlots = roster => BOARD_ROOMS.flatMap(room => slotsOf(room, roster));

/** What is wrong with the successor slot table for a roster: an empty list when every rule holds. */
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
