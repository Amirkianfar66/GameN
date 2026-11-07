// mothership:dev-only
//
// Seats in the library's state maps: canonical ids in, player numbers out. Every command a state map
// describes carries the canonical seat id (SeatIdSchema, 'seat-1' to 'seat-9',
// packages/contracts/src/protocol.ts), and every key, button or line a player reads shows the player
// number. The owner's correction of 6 November 2026: "Keypads display player numbers but preserve
// canonical player IDs for Frontend commands."
//
// The table is the reviewed Frontend's own (packages/presentation/src/model/common.ts seatNumber()):
// display order only. It implies no adjacency, route or capacity.

const SEAT_NUMBER = Object.freeze({
  'seat-1': 1, 'seat-2': 2, 'seat-3': 3, 'seat-4': 4, 'seat-5': 5, 'seat-6': 6, 'seat-7': 7, 'seat-8': 8, 'seat-9': 9,
});

/** The canonical seat ids, in display order. */
export const SEAT_IDS = Object.freeze(Object.keys(SEAT_NUMBER));

/** Whether a value is a canonical seat id. */
export const isSeatId = value => typeof value === 'string' && Object.hasOwn(SEAT_NUMBER, value);

/** The player number a seat id shows (1 to 9), or null for anything that is not a seat id. */
export const seatNumber = seatId => (isSeatId(seatId) ? SEAT_NUMBER[seatId] : null);

/** The canonical seat id of a player number, or null. */
export const seatIdOf = number => SEAT_IDS.find(id => SEAT_NUMBER[id] === number) ?? null;

/** Display order of seat ids (by player number); anything that is not a seat id goes last, in its own order. */
export const bySeat = (a, b) => (seatNumber(a) ?? 99) - (seatNumber(b) ?? 99);

/** One key or button of a seat picker: the id the command sends and the number the player reads. */
export const seatKey = seatId => Object.freeze({ seatId, number: seatNumber(seatId) });
