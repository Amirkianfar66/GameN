// Neutral vocabulary shared by scenario fixtures, the runner and the invariant checks.
// It is derived from the rule sources, not from an engine: see docs/balance/game-rules.md.

export type Mode = 7 | 8 | 9;
export type SeatId = string;
export type Faction = 'Blue' | 'Red' | 'Alien';
export type Room = 'Room A' | 'Room B';
export type Health = 'Healthy' | 'Injured' | 'Eliminated';
export type Role =
  | 'Insider' | 'Cracker' | 'Blue Disabler' | 'Supplier' | 'Officer'
  | 'Undercover' | 'Hacker' | 'Red Disabler' | 'Alien';

export const MODES: readonly Mode[] = [7, 8, 9];

const BLUE_BASE: readonly Role[] = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier'];
const RED_BASE: readonly Role[] = ['Undercover', 'Hacker'];

// R-SETUP-02..04 (rules/overlays/player-modes-officer.json#/modes).
export const ROLES_BY_MODE: Readonly<Record<Mode, readonly Role[]>> = {
  7: [...BLUE_BASE, ...RED_BASE, 'Alien'],
  8: [...BLUE_BASE, ...RED_BASE, 'Red Disabler', 'Alien'],
  9: [...BLUE_BASE, 'Officer', ...RED_BASE, 'Red Disabler', 'Alien'],
};

export function isMode(value: unknown): value is Mode {
  return value === 7 || value === 8 || value === 9;
}

export function factionOf(role: Role): Faction {
  if (role === 'Alien') return 'Alien';
  return role === 'Undercover' || role === 'Hacker' || role === 'Red Disabler' ? 'Red' : 'Blue';
}

export function seatIdsFor(playerCount: number): SeatId[] {
  return Array.from({ length: playerCount }, (_, index) => `seat-${index + 1}`);
}

export function factionCounts(mode: Mode): Record<Faction, number> {
  const counts: Record<Faction, number> = { Blue: 0, Red: 0, Alien: 0 };
  for (const role of ROLES_BY_MODE[mode]) counts[factionOf(role)] += 1;
  return counts;
}

// R-VOTE-03: at least 50% of the eligible voters; exactly 50% is sufficient.
export function jailThreshold(eligibleVoters: number): number {
  return Math.ceil(eligibleVoters / 2);
}

// Recorded random facts of one match. The seed is a label that reproduces the facts
// through deriveSetup(); the explicit facts are what a run is pinned to.
export interface ScenarioSetup {
  seed: string;
  playerCount: number;
  roleOrder: Role[];
  initialRooms: Record<SeatId, Room>;
  codeExtraSeatIds: SeatId[];
  roundOrders: SeatId[][];
}

export interface EnginePins {
  adapter: string;
  engineVersion: string;
  rulesetVersion: string;
  rulesetHash: string;
  protocolVersion: number;
}

// Order-insensitive structural helpers. JSON-compatible values only.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter(key => record[key] !== undefined).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export function deepEqual(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

export function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && new Set(left).size === left.length
    && left.every(item => right.includes(item));
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
