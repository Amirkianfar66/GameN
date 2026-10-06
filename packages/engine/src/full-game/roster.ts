import type { PlayerView, PublicView, SeatId } from '@mothership/contracts';

export type Role = PlayerView['self']['role'];
export type Faction = 'Blue' | 'Red' | 'Alien';
export type Room = 'Room A' | 'Room B';

// Full private server state. This type is never an audience projection.
export interface GameSeat {
  seatId: SeatId;
  role: Role;
  faction: Faction;
  location: PublicView['seats'][number]['location'];
  health: PublicView['seats'][number]['health'];
  jailed: boolean;
  captain: boolean;
  lastRoom: Room;
  ordinaryWeapons: number;
  officerShotSpent: boolean;
  specialShotAvailable: boolean;
  movedInRound: boolean;
  disablerSpent: boolean;
  rescuesRemaining: number;
  scanUsedRound: number | null;
  hackUsed: boolean;
  mainActionUsedRound: number | null;
  protection: { activeFromRound: number; consumed: boolean; grantedBy: SeatId } | null;
  lifetimeProtectionReceived: boolean;
  knowledge: {
    insiderCandidates: SeatId[];
    undercoverSeatId: SeatId | null;
    code: SeatId[];
    scanResults: Array<{ round: number; targetSeatId: SeatId; guess: Faction; matched: boolean; inCode: boolean | null }>;
  };
}

const blueRoles: readonly Role[] = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier'];
const redRoles: readonly Role[] = ['Undercover', 'Hacker'];

export function buildRoster({ playerCount, roleOrder, codeExtraSeatIds, initialRooms }: {
  playerCount: 7 | 8 | 9;
  roleOrder: Role[];
  codeExtraSeatIds: SeatId[];
  // The caller supplies an explicit policy-selected or test-only room assignment.
  // This primitive does not approve a deal/room-selection rule.
  initialRooms: Record<string, Room>;
}): { seats: GameSeat[]; code: SeatId[] } {
  if (![7, 8, 9].includes(playerCount)) throw new Error('Unsupported player configuration');
  const expected: Role[] = [
    ...blueRoles, ...redRoles, 'Alien',
    ...(playerCount >= 8 ? ['Red Disabler' as const] : []),
    ...(playerCount === 9 ? ['Officer' as const] : []),
  ];
  if (roleOrder.length !== playerCount || new Set(roleOrder).size !== playerCount
    || expected.some(role => !roleOrder.includes(role))) throw new Error('Roles must be an exact canonical permutation');
  const seatIds = Array.from({ length: playerCount }, (_, index) => `seat-${index + 1}` as SeatId);
  if (Object.keys(initialRooms).length !== playerCount
    || Object.keys(initialRooms).some(seatId => !seatIds.includes(seatId as SeatId))
    || seatIds.some(seatId => initialRooms[seatId] !== 'Room A' && initialRooms[seatId] !== 'Room B')) {
    throw new Error('Every seat requires an explicit A/B room');
  }
  const seatForRole = (role: Role): SeatId => seatIds[roleOrder.indexOf(role)]!;
  const alienSeatId = seatForRole('Alien');
  const undercoverSeatId = seatForRole('Undercover');
  if (codeExtraSeatIds.length !== 3 || new Set(codeExtraSeatIds).size !== 3
    || codeExtraSeatIds.some(seatId => !seatIds.includes(seatId) || seatId === alienSeatId || seatId === undercoverSeatId)) {
    throw new Error('Code requires three distinct valid extras excluding Alien and Undercover');
  }
  const code = [alienSeatId, ...codeExtraSeatIds].sort();
  const insiderCandidates = [undercoverSeatId, alienSeatId, seatForRole('Cracker')].sort();
  const seats: GameSeat[] = seatIds.map((seatId, index) => {
    const role = roleOrder[index]!;
    const room = initialRooms[seatId]!;
    return {
      seatId, role,
      faction: role === 'Alien' ? 'Alien' : blueRoles.includes(role) || role === 'Officer' ? 'Blue' : 'Red',
      location: room, health: 'Healthy', jailed: false, captain: false, lastRoom: room,
      // Initialize only the explicit starting grants. Other roles, including Alien,
      // can receive ordinary weapons later through the Supplier grant handler.
      ordinaryWeapons: role === 'Officer' || role === 'Undercover' ? 1 : 0,
      officerShotSpent: false, specialShotAvailable: false, movedInRound: false,
      disablerSpent: false, rescuesRemaining: role === 'Cracker' ? 2 : 0,
      scanUsedRound: null, hackUsed: false, mainActionUsedRound: null,
      protection: null, lifetimeProtectionReceived: false,
      knowledge: {
        insiderCandidates: role === 'Insider' ? [...insiderCandidates] : [],
        undercoverSeatId: role === 'Hacker' ? undercoverSeatId : null,
        code: role === 'Alien' ? [...code] : [],
        scanResults: [],
      },
    };
  });
  return { seats, code };
}
