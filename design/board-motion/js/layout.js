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

/** A station drawn into the picture (behind the chart table or the counter, in the bed, on the bench). */
const isPicture = station => station.kind === 'prop' || station.kind === 'seat';

/**
 * Who takes a picture station, by public facts only: the Captain at the chart table if the
 * Captain is in the room, an Injured character in the bed, and otherwise the lowest seat. An
 * Eliminated character takes none. Nobody, when nobody qualifies.
 */
function takerOf(station, occupants) {
  const living = occupants.filter(seat => seat.health !== 'Eliminated');
  if (station.takes === 'injured') return living.find(seat => seat.health === 'Injured') ?? null;
  if (station.takes === 'captain') return living.find(seat => seat.captain) ?? living[0] ?? null;
  return living[0] ?? null;
}

/** The stations of a room for its occupants, in seat order, and who stands at each. */
function stationsFor(stations, room, occupants) {
  const used = formation(stations, room, occupants.length);
  const picture = used.find(isPicture);
  if (!picture) return occupants.map((seat, index) => [seat, used[index]]);
  const taker = takerOf(picture, occupants);
  if (taker) {
    const rest = used.filter(station => station !== picture);
    return occupants.map(seat => [seat, seat === taker ? picture : rest.shift()]);
  }
  // Nobody takes it: everyone stands, at the places of one more without the picture station.
  const instead = (occupants.length < 5 ? formation(stations, room, occupants.length + 1) : formation(stations, room, 6)).filter(station => !isPicture(station));
  return occupants.map((seat, index) => [seat, instead[index]]);
}

/** A standing character's stance: one of three, by seat number, so a full room is not nine clones. */
export const STANCES = ['standing', 'standingFolded', 'standingBack'];

/** The pose of a piece: its station's, Eliminated on the floor, or the seat's stance. */
export function poseOf(seat, station) {
  if (isPicture(station)) return station.pose;
  if (seat.health === 'Eliminated') return 'out';
  return STANCES[(seat.n - 1) % STANCES.length];
}

const seatsOf = occupants => (typeof occupants === 'number' ? Array.from({ length: occupants }, (_, index) => ({ n: index + 1, health: 'Healthy' })) : occupants);

/** Rows of standing characters a room has (a picture station is not one). */
export function standRowsFor(stations, room, occupants) {
  const seats = seatsOf(occupants);
  const stands = stationsFor(stations, room, seats).map(([, station]) => station).filter(station => station.kind === 'stand');
  return stands.length ? Math.max(...stands.map(station => station.at[1])) + 1 : 0;
}

/** Rows of characters a room needs: a picture station counts as the back row. */
export function rowsFor(stations, room, occupants) {
  const seats = seatsOf(occupants);
  if (seats.length === 0) return 0;
  const used = stationsFor(stations, room, seats).map(([, station]) => station);
  const stands = used.filter(station => station.kind === 'stand');
  const standRows = stands.length ? Math.max(...stands.map(station => station.at[1])) + 1 : 0;
  const hasPicture = used.some(isPicture);
  return Math.max(standRows, hasPicture ? (stands.length ? 2 : 1) : 0);
}

/** Each seat's station in its room, and the pose it takes there. Returns Map seat -> placement. */
export function placements(stations, seats) {
  const result = new Map();
  const byRoom = new Map();
  for (const seat of [...seats].sort((a, b) => a.n - b.n)) {
    const room = ROOM_OF[seat.location];
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room).push(seat);
  }
  for (const [room, occupants] of byRoom) {
    stationsFor(stations, room, occupants).forEach(([seat, station], index) => {
      const pose = poseOf(seat, station);
      // Characters at a standing place face into the room: those right of its middle are drawn mirrored.
      const mirror = station.kind === 'stand' && station.at[0] > 0.5;
      result.set(seat.n, {
        room, station: station.id, kind: station.kind, at: station.at ?? null, art: station.art ?? null, figure: station.figure ?? null, clear: Boolean(station.clear),
        depth: station.depth, order: index, crowd: Boolean(station.crowd), pose, mirror,
      });
    });
  }
  return result;
}

/** How many rows each band of the board needs, from public occupancy. */
export function bandRows(stations, seats) {
  const count = room => seats.filter(seat => ROOM_OF[seat.location] === room).length;
  if (seats.some(seat => seat.location === 'Final Zone')) return { final: count('final-zone') > 0 ? 2 : 0 };
  const inRoom = room => seats.filter(seat => ROOM_OF[seat.location] === room).sort((a, b) => a.n - b.n);
  const rows = room => rowsFor(stations, room, inRoom(room));
  const stand = room => standRowsFor(stations, room, inRoom(room));
  return {
    top: rows('command-room'),
    middle: Math.max(rows('room-a'), rows('room-b')),
    lower: Math.max(rows('hospital'), rows('jail')),
    // Rows of standing figures, the tallest part of a band; a band with none holds only picture stations.
    stand: { top: stand('command-room'), middle: Math.max(stand('room-a'), stand('room-b')), lower: Math.max(stand('hospital'), stand('jail')) },
    room: Object.fromEntries(['command-room', 'room-a', 'room-b', 'hospital', 'jail'].map(room => [room, rows(room)])),
  };
}
