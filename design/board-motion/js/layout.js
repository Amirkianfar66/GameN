// mothership:dev-only
//
// Where characters stand, from public facts only: who is in each location, by seat number.
// Pure functions, used by the prototype in the browser and by the checks in Node.

export const ROOMS = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];
export const LOCATION_OF = { 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail', 'final-zone': 'Final Zone' };
export const ROOM_OF = Object.fromEntries(Object.entries(LOCATION_OF).map(([room, location]) => [location, room]));
/** The rooms a player can move to by pressing their name tag: the protocol's MOVE destinations. */
export const MOVE_ROOMS = ['Command Room', 'Room A', 'Room B'];

/** The stations a room uses for this many occupants, in seat order. */
function formation(stations, room, count) {
  const spec = stations.rooms[room];
  if (count === 0) return [];
  if (room === 'final-zone') {
    const front = Math.ceil(count / 2);
    return Array.from({ length: count }, (_, index) => {
      const inFront = index < front;
      const row = inFront ? front : count - front;
      const i = inFront ? index : index - front;
      return { id: `F${index + 1}`, kind: 'stand', at: [(i + 1) / (row + 1), inFront ? 0 : 1], depth: inFront ? 1 : 0.88 };
    });
  }
  if (count > 5) return stations.crowd.slots.slice(0, count).map(([x, row, depth], index) => ({ id: `${room}-crowd-${index + 1}`, kind: 'stand', at: [x, row], depth, crowd: true }));
  return spec.formations[String(count)].map(id => ({ id, ...spec.stations[id] }));
}

/** Rows of characters a room needs for this many occupants: a prop station counts as the back row. */
export function rowsFor(stations, room, count) {
  const used = formation(stations, room, count);
  if (used.length === 0) return 0;
  const stands = used.filter(station => station.kind === 'stand');
  const standRows = stands.length ? Math.max(...stands.map(station => station.at[1])) + 1 : 0;
  const hasProp = used.some(station => station.kind === 'prop');
  return Math.max(standRows, hasProp ? (stands.length ? 2 : 1) : 0);
}

/** Each seat's station in its room. Returns Map seat -> placement. */
export function placements(stations, seats) {
  const result = new Map();
  const byRoom = new Map();
  for (const seat of [...seats].sort((a, b) => a.n - b.n)) {
    const room = ROOM_OF[seat.location];
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room).push(seat);
  }
  for (const [room, occupants] of byRoom) {
    const used = formation(stations, room, occupants.length);
    occupants.forEach((seat, index) => {
      const station = used[index];
      result.set(seat.n, { room, station: station.id, kind: station.kind, at: station.at ?? null, art: station.art ?? null, sink: station.sink ?? 0, depth: station.depth, order: index, crowd: Boolean(station.crowd) });
    });
  }
  return result;
}

/** How many rows each band of the board needs, from public occupancy. */
export function bandRows(stations, seats) {
  const count = room => seats.filter(seat => ROOM_OF[seat.location] === room).length;
  if (seats.some(seat => seat.location === 'Final Zone')) return { final: count('final-zone') > 0 ? 2 : 0 };
  const rows = room => rowsFor(stations, room, count(room));
  return {
    top: rows('command-room'),
    middle: Math.max(rows('room-a'), rows('room-b')),
    lower: Math.max(rows('hospital'), rows('jail')),
    room: Object.fromEntries(['command-room', 'room-a', 'room-b', 'hospital', 'jail'].map(room => [room, rows(room)])),
  };
}
