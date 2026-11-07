import type { SeatId } from '@mothership/contracts';

type Room = 'Room A' | 'Room B';
const MAX_OCCUPANTS = 5;
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = result * (n - i + 1) / i;
  return result;
}
function completions(remaining: number, a: number, b: number): number {
  let count = 0;
  for (let extraA = 0; extraA <= remaining; extraA++) {
    if (a + extraA <= MAX_OCCUPANTS && b + remaining - extraA <= MAX_OCCUPANTS) count += choose(remaining, extraA);
  }
  return count;
}
export function jointStartingRoomAssignmentCount(playerCount: 7 | 8 | 9): number {
  if (![7, 8, 9].includes(playerCount)) throw new Error('Invalid joint roster size');
  return completions(playerCount, 0, 0);
}
/** One uniform integer rank selects one labelled legal assignment, without enumeration.
 * A/B branch sizes count all legal suffixes; legal splits are not sampled equally.
 * Labels merely identify recipients: each labelled assignment has probability 1/N.
 */
export function jointStartingRooms(playerCount: 7 | 8 | 9, rank: number): Record<SeatId, Room> {
  const total = jointStartingRoomAssignmentCount(playerCount);
  if (!Number.isSafeInteger(rank) || rank < 0 || rank >= total) throw new Error('Invalid joint room rank');
  const rooms = {} as Record<SeatId, Room>;
  let a = 0, b = 0;
  for (let n = 1; n <= playerCount; n++) {
    const withA = completions(playerCount - n, a + 1, b);
    if (rank < withA) { rooms[`seat-${n}` as SeatId] = 'Room A'; a++; }
    else { rank -= withA; rooms[`seat-${n}` as SeatId] = 'Room B'; b++; }
  }
  return rooms;
}
