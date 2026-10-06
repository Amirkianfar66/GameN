import { ROLES_BY_MODE, factionOf, seatIdsFor } from './model.js';
import type { Mode, Role, Room, ScenarioSetup, SeatId } from './model.js';

// Deterministic, dependency-free generator for test inputs only. It is NOT the production
// source of randomness: a real match records server-generated facts (architecture section 4).
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(random() * (index + 1));
    const held = result[index] as T;
    result[index] = result[pick] as T;
    result[pick] = held;
  }
  return result;
}

export function pickInt(random: () => number, exclusiveMax: number): number {
  return Math.floor(random() * exclusiveMax);
}

export type RoomPlan = 'all-a' | 'split' | 'seeded';
export type RolePlan = 'canonical' | 'seeded';
export type OrderPlan = 'seat-order' | 'seeded';

export interface SetupPlan {
  roles: RolePlan;
  rooms: RoomPlan;
  orders: OrderPlan;
}

// A fixed role order that differs from the seat order used by the engine's own tests, so
// that a seat number is never accidentally a proxy for a role in these fixtures.
const CANONICAL_ORDER: readonly Role[] = [
  'Hacker', 'Supplier', 'Alien', 'Officer', 'Undercover', 'Insider', 'Red Disabler', 'Cracker', 'Blue Disabler',
];

export function canonicalRoleOrder(mode: Mode): Role[] {
  const allowed = ROLES_BY_MODE[mode];
  return CANONICAL_ORDER.filter(role => allowed.includes(role));
}

/**
 * Reproduce the recorded random facts of a fixture from its seed label. The Code extras are
 * drawn uniformly from the players other than Alien and Undercover. No rule source states the
 * selection distribution (decision D21); this is a test input, not an approved rule.
 */
export function deriveSetup(mode: Mode, seed: string, plan: SetupPlan): ScenarioSetup {
  const random = mulberry32(hashSeed(`${seed}|${mode}`));
  const seatIds = seatIdsFor(mode);
  const roleOrder = plan.roles === 'canonical' ? canonicalRoleOrder(mode) : shuffled(ROLES_BY_MODE[mode], random);
  const seatOf = (role: Role): SeatId => seatIds[roleOrder.indexOf(role)] as SeatId;
  const initialRooms: Record<SeatId, Room> = {};
  seatIds.forEach((seatId, index) => {
    const role = roleOrder[index] as Role;
    if (plan.rooms === 'all-a') initialRooms[seatId] = 'Room A';
    // 'split' keeps both factions in both rooms: Red Disabler, Insider and Alien start in B.
    else if (plan.rooms === 'split') {
      initialRooms[seatId] = role === 'Red Disabler' || role === 'Insider' || role === 'Alien' ? 'Room B' : 'Room A';
    } else initialRooms[seatId] = random() < 0.5 ? 'Room A' : 'Room B';
  });
  const excluded = [seatOf('Alien'), seatOf('Undercover')];
  const candidates = seatIds.filter(seatId => !excluded.includes(seatId));
  const codeExtraSeatIds = shuffled(candidates, random).slice(0, 3).sort();
  const roundOrders = Array.from({ length: 5 }, () =>
    plan.orders === 'seat-order' ? [...seatIds] : shuffled(seatIds, random));
  return { seed, playerCount: mode, roleOrder, initialRooms, codeExtraSeatIds, roundOrders };
}

export function expectedCode(setup: ScenarioSetup): SeatId[] {
  const seatIds = seatIdsFor(setup.playerCount);
  const alien = seatIds[setup.roleOrder.indexOf('Alien')] as SeatId;
  return [alien, ...setup.codeExtraSeatIds].sort();
}

export function setupFactions(setup: ScenarioSetup): Record<SeatId, ReturnType<typeof factionOf>> {
  const seatIds = seatIdsFor(setup.playerCount);
  const result: Record<SeatId, ReturnType<typeof factionOf>> = {};
  seatIds.forEach((seatId, index) => { result[seatId] = factionOf(setup.roleOrder[index] as Role); });
  return result;
}
