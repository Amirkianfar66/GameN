// Runtime drawing port; Designer 49f0db4d34d2a2a418f669a13bed660fc665b1b6; source SHA256 6f137ec3aaa7cafa31f547f2246b6125a0ceb5b54cbd681a96b519631781ed3f.
//
// Where characters are, from public facts only: who is in each location, Captain, Injured,
// Jailed and Eliminated, by seat number. Pure functions, used by the prototype in the browser
// and by the checks in Node.
//
// The owner's decision of 9 October 2026: each room is a scene with five fixed places, each
// with its own gesture; the Command Room has one, the Captain's (only the Captain may enter
// it). On 11 October 2026 the owner made five a hard rule; until the engine enforces it
// (DSN-REQ-12), six or more in one room still stand in a crowd (layout stress).

import { SCENES } from './scenes.mjs';
import { INJURED } from './gestures.mjs';

export const ROOMS = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];
export const LOCATION_OF = { 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail', 'final-zone': 'Final Zone' };
export const ROOM_OF = Object.fromEntries(Object.entries(LOCATION_OF).map(([room, location]) => [location, room]));
/** The rooms a player can move to by pressing their name tag: the protocol's MOVE destinations. */
export const MOVE_ROOMS = ['Command Room', 'Room A', 'Room B'];
/**
 * The owner's decision of 11 October 2026: at most five in a room, a hard rule, the Eliminated
 * counted (the Command Room holds its one, the Captain). The engine does not enforce it yet
 * (DSN-REQ-12): the board says FULL on a full room's tag from public occupancy, and still draws
 * a view with more.
 */
export const CAPACITY = 5;
/**
 * The rooms whose tag says FULL: the two a player moves between, and the Hospital and the Jail,
 * where a full Hospital is why an Injured character waits in its room (the owner's decision).
 */
export const CAPACITY_ROOMS = ['Room A', 'Room B', 'Hospital', 'Jail'];

/**
 * Six to nine in one room: three rows of three, everyone standing, every character reachable
 * with a 44 px press area that overlaps no other: [x share of the panel, row, depth scale].
 */
export const CROWD = [[0.167, 0, 1], [0.5, 0, 1], [0.833, 0, 1], [0.167, 1, 0.9], [0.5, 1, 0.9], [0.833, 1, 0.9], [0.167, 2, 0.82], [0.5, 2, 0.82], [0.833, 2, 0.82]];
/** A standing character's stance in a crowd or the Final Zone: one of three, by seat number. */
export const STANCES = ['stand', 'standFolded', 'standBack'];

/** The places of a room: the scene's, in its own order. */
export const placesOf = room => SCENES[room]?.slots ?? [];

/** A seat's order of preference for a room's places: its own first, (n - 1) mod count, then on round. */
export function preferences(n, count) {
  const first = (n - 1) % count;
  return Array.from({ length: count }, (_, index) => (first + index) % count);
}

/**
 * Who takes which place in a room, as Map seat -> place: a function of who is in the room now and
 * of nothing else, so that every screen draws the same picture, whether it has followed the match
 * or has just loaded or reconnected. The Command Room's one place is the Captain's. Elsewhere, the
 * lowest seat first, each takes the first free place in its own order of preference, seat n
 * starting at place (n - 1) mod 5. Seats n and n + 5 prefer the same place and the lower seat gets
 * it, so when someone comes in or leaves, a character can step to another place in the room: the
 * lower seat of its pair took its place, or a place it prefers came free (layout-reflow).
 */
export function assign(room, occupants) {
  const places = placesOf(room);
  const result = new Map();
  const taken = new Set();
  const seats = [...occupants].sort((a, b) => a.n - b.n);
  if (room === 'command-room') {
    const captain = seats.find(seat => seat.captain) ?? seats[0];
    if (captain && places[0]) result.set(captain.n, places[0]);
    return result;
  }
  for (const seat of seats) {
    const order = preferences(seat.n, places.length);
    const place = order.map(index => places[index]).find(candidate => !taken.has(candidate.id));
    if (place) { result.set(seat.n, place); taken.add(place.id); }
  }
  return result;
}

/**
 * The gesture a character takes at a place: the place's own, or, Eliminated, the fall the place
 * gives (slumped over a desk or the bench) or lying on the deck. Injured, the same gesture with
 * the INJURED mark: a bandage, drawn only where the public view says Injured. Nothing else changes it.
 */
export const gestureOf = (seat, place) => {
  if (seat.health === 'Eliminated') return place.down ?? 'down';
  return seat.health === 'Injured' ? `${place.gesture}${INJURED}` : place.gesture;
};

/**
 * Each seat's placement, as Map seat -> placement. kind 'place': a scene's place (at and scale in
 * the scene's units, depth its drawing order, pressGesture the place's own gesture, whose press
 * area it keeps); 'crowd': the layout-stress crowd of six or more ([x share, row]); 'final': the
 * Final Zone's two rows. A function of the public seats alone, like assign().
 */
export function placements(seats) {
  const result = new Map();
  const byRoom = new Map();
  for (const seat of [...seats].sort((a, b) => a.n - b.n)) {
    const room = ROOM_OF[seat.location];
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room).push(seat);
  }
  for (const [room, occupants] of byRoom) {
    const capacity = room === 'command-room' ? 1 : placesOf(room).length;
    if (room === 'final-zone' || occupants.length > capacity) {
      const final = room === 'final-zone';
      const front = Math.ceil(occupants.length / 2);
      occupants.forEach((seat, index) => {
        const inFront = index < front;
        const row = inFront ? front : occupants.length - front;
        const i = inFront ? index : index - front;
        const [x, line, depth] = final ? [(i + 1) / (row + 1), inFront ? 0 : 1, inFront ? 1 : 0.88] : CROWD[index];
        result.set(seat.n, {
          room, kind: final ? 'final' : 'crowd', place: `${final ? 'F' : `${room}-crowd-`}${index + 1}`, at: [x, line], depth,
          gesture: gestureOf(seat, { gesture: STANCES[(seat.n - 1) % STANCES.length] }), mirror: x > 0.5, order: index,
        });
      });
      continue;
    }
    const assigned = assign(room, occupants);
    occupants.forEach((seat, index) => {
      const place = assigned.get(seat.n);
      if (!place) return;
      // The press area is the place's own, whatever is drawn there: it never moves when a health changes.
      result.set(seat.n, {
        room, kind: 'place', place: place.id, at: place.at, scale: place.scale, depth: place.depth ?? place.at[1],
        gesture: gestureOf(seat, place), pressGesture: place.gesture, mirror: Boolean(place.mirror), order: index,
      });
    });
  }
  return result;
}
