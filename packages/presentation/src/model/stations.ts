import type { SeatId } from '@mothership/contracts';

// Where each character stands in its room on a phone's comic board. A comic position, worked
// out on every device from public occupancy and seat order only, so every screen that draws it
// draws the same board. It is not a game fact and implies no capacity: the rules have no room
// capacity, so six to nine in one room stand in a three-by-three crowd. Nothing here says which
// rooms connect.
//
// The formations are the Designer's proposal for issue #87 (PR #88), kept here as Frontend
// data so the release never loads the prototype. Three stations the Designer drew behind a prop
// (the Command Room's chart table, Room B's counter and the Hospital bed) stand in the back row
// instead: those prop layers are not in the reviewed asset manifest. Integration adopts them,
// or not, through a manifest revision.

export type BoardRoom = 'command-room' | 'room-a' | 'room-b' | 'hospital' | 'jail';

/** A character's place: x is a share of the panel's width, row counts back from the floor, depth scales the drawing. */
export interface Station {
  readonly station: string;
  readonly x: number;
  readonly row: number;
  readonly depth: number;
  /** The distance to the nearest neighbour in the same row, as a share of the panel's width; 1 alone. */
  readonly gap: number;
  readonly crowd: boolean;
}

/** x, row and depth of one standing place. */
type Place = readonly [x: number, row: number, depth: number];

interface RoomFormations {
  readonly stations: Readonly<Record<string, Place>>;
  /** The places used for one to five occupants, filled in seat order. */
  readonly formations: readonly (readonly string[])[];
  /** A station the Designer drew behind a prop; it stands in the back row while anyone stands in front. */
  readonly behind: string | null;
}

// The x of a former prop station is where the prop is in the room's picture at its narrowest
// crop: the Command Room's table at the middle and the Hospital bed on the left. Room B's
// counter is a little right of the middle; standing in the back row between B4 and B5 instead
// of behind it, its character keeps to the middle, so that the three press areas of that row
// never touch in a half-width panel on a 320 px phone.
const ROOMS: Readonly<Record<BoardRoom, RoomFormations>> = {
  'command-room': {
    stations: { C1: [0.5, 1, 0.9], C2: [0.1, 0, 1], C3: [0.9, 0, 1], C4: [0.26, 0, 0.94], C5: [0.74, 0, 0.94] },
    formations: [['C1'], ['C1', 'C2'], ['C1', 'C2', 'C3'], ['C1', 'C2', 'C3', 'C4'], ['C1', 'C2', 'C4', 'C5', 'C3']],
    behind: 'C1',
  },
  'room-a': {
    stations: {
      A1: [0.5, 0, 1], A2: [0.3, 0, 1], A3: [0.7, 0, 1], A4: [0.167, 0, 1], A5: [0.833, 0, 1],
      A6: [0.5, 1, 0.86], A7: [0.26, 1, 0.86], A8: [0.74, 1, 0.86],
    },
    formations: [['A1'], ['A2', 'A3'], ['A4', 'A5', 'A6'], ['A4', 'A5', 'A7', 'A8'], ['A4', 'A1', 'A5', 'A7', 'A8']],
    behind: null,
  },
  'room-b': {
    stations: { B1: [0.5, 1, 0.9], B2: [0.18, 0, 1], B3: [0.82, 0, 1], B4: [0.16, 1, 0.86], B5: [0.84, 1, 0.86] },
    formations: [['B1'], ['B1', 'B2'], ['B1', 'B2', 'B3'], ['B1', 'B2', 'B3', 'B4'], ['B1', 'B2', 'B3', 'B4', 'B5']],
    behind: 'B1',
  },
  hospital: {
    stations: { H1: [0.236, 1, 0.9], H2: [0.833, 0, 1], H3: [0.5, 0, 1], H4: [0.84, 1, 0.86], H5: [0.167, 0, 1] },
    formations: [['H1'], ['H1', 'H2'], ['H1', 'H3', 'H2'], ['H1', 'H3', 'H2', 'H4'], ['H1', 'H5', 'H3', 'H2', 'H4']],
    behind: 'H1',
  },
  jail: {
    stations: {
      J1: [0.3, 0, 1], J2: [0.72, 0, 1], J3: [0.167, 0, 1], J4: [0.833, 0, 1], J5: [0.5, 0, 1], J6: [0.26, 1, 0.86], J7: [0.74, 1, 0.86],
    },
    formations: [['J1'], ['J1', 'J2'], ['J3', 'J4', 'J6'], ['J3', 'J4', 'J6', 'J7'], ['J3', 'J5', 'J4', 'J6', 'J7']],
    behind: null,
  },
};

/** Six to nine in one room: three rows of three, everyone standing, every character reachable. */
const CROWD: readonly Place[] = [
  [0.167, 0, 1], [0.5, 0, 1], [0.833, 0, 1],
  [0.167, 1, 0.9], [0.5, 1, 0.9], [0.833, 1, 0.9],
  [0.167, 2, 0.82], [0.5, 2, 0.82], [0.833, 2, 0.82],
];

export const BOARD_ROOMS: readonly BoardRoom[] = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];

export function isBoardRoom(zone: string): zone is BoardRoom {
  return (BOARD_ROOMS as readonly string[]).includes(zone);
}

/** Each place's nearest neighbour in its own row, so two press areas in a row never overlap. */
function withGaps(places: readonly Omit<Station, 'gap'>[]): Station[] {
  return places.map(place => {
    const gaps = places.filter(other => other !== place && other.row === place.row).map(other => Math.abs(other.x - place.x));
    return { ...place, gap: gaps.length === 0 ? 1 : Math.min(...gaps) };
  });
}

/**
 * The places of a room's occupants, in the order given (seat order). An empty room has none.
 * The Final Zone stands everyone in two rows, the larger half in front.
 */
export function stationsFor(zone: string, count: number): readonly Station[] {
  if (count <= 0) return [];
  if (zone === 'final-zone') {
    const front = Math.ceil(count / 2);
    return withGaps(Array.from({ length: count }, (_, index) => {
      const inFront = index < front;
      const inRow = inFront ? front : count - front;
      const position = inFront ? index : index - front;
      return { station: `F${index + 1}`, x: (position + 1) / (inRow + 1), row: inFront ? 0 : 1, depth: inFront ? 1 : 0.88, crowd: false };
    }));
  }
  if (!isBoardRoom(zone)) return [];
  if (count > 5) return withGaps(CROWD.slice(0, count).map(([x, row, depth], index) => ({ station: `${zone}-crowd-${index + 1}`, x, row, depth, crowd: true })));
  const room = ROOMS[zone];
  const used = room.formations[count - 1]!;
  const standing = used.filter(id => id !== room.behind).length;
  return withGaps(used.map(id => {
    const [x, row, depth] = room.stations[id]!;
    // Alone, the character behind the prop stands at the front.
    return id === room.behind && standing === 0 ? { station: id, x, row: 0, depth: 1, crowd: false } : { station: id, x, row, depth, crowd: false };
  }));
}

/** Rows of characters a room needs for this many occupants: none, one, two, or three for a crowd. */
export function rowsFor(zone: string, count: number): number {
  const used = stationsFor(zone, count);
  return used.length === 0 ? 0 : Math.max(...used.map(station => station.row)) + 1;
}

const order = (seatId: SeatId): number => Number(seatId.slice(5));

/** Each seat's place, from the public occupancy of every location. */
export function placeSeats(zones: readonly { readonly id: string; readonly seats: readonly { readonly seatId: SeatId }[] }[]): ReadonlyMap<SeatId, Station> {
  const placed = new Map<SeatId, Station>();
  for (const zone of zones) {
    const ordered = [...zone.seats].sort((a, b) => order(a.seatId) - order(b.seatId));
    const stations = stationsFor(zone.id, ordered.length);
    ordered.forEach((seat, index) => { const station = stations[index]; if (station) placed.set(seat.seatId, station); });
  }
  return placed;
}
