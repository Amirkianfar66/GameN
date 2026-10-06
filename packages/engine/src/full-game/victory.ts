import type { GameSeat } from './roster.js';

export interface VictoryResult {
  winner: 'Blue' | 'Red' | 'Alien' | 'Draw';
  alienCoWinner: boolean;
}

export function healthyPower(seats: GameSeat[]): { bluePower: number; redPower: number } {
  const contributing = seats.filter(seat => seat.health === 'Healthy' && !seat.jailed);
  return {
    bluePower: contributing.filter(seat => seat.faction === 'Blue').length
      + (contributing.some(seat => seat.faction === 'Alien') ? 1 : 0),
    redPower: contributing.filter(seat => seat.faction === 'Red').length,
  };
}

export function evaluateVictory({ seats, round, correctCode, codeEligibleNow, simultaneousElimination, finalCheckpoint }: {
  seats: GameSeat[];
  round: number;
  correctCode: boolean;
  // The approved lifecycle selects the complete normal Round 5 effects checkpoint.
  // This is not selected by Code submission arrival time.
  codeEligibleNow: boolean;
  // The lifecycle supplies the approved complete-stage before/after comparison.
  // Both factions being absent is insufficient evidence of simultaneity by itself.
  simultaneousElimination: boolean;
  // True only after the complete conditional showdown, enabling terminal Draw.
  finalCheckpoint: boolean;
}): VictoryResult | null {
  if (!Number.isInteger(round) || round < 1 || round > 5) throw new Error('Victory requires a normal round number');
  if (finalCheckpoint && round !== 5) throw new Error('The terminal showdown checkpoint belongs to Round 5');
  const blue = seats.filter(seat => seat.faction === 'Blue');
  const red = seats.filter(seat => seat.faction === 'Red');
  const alienSurvives = seats.some(seat => seat.faction === 'Alien' && seat.health !== 'Eliminated');
  // Jail is a distinct overlay. A Healthy jailed actual-team member satisfies
  // the minimum health requirement but contributes zero to the power formula.
  const healthyBlue = blue.some(seat => seat.health === 'Healthy');
  const healthyRed = red.some(seat => seat.health === 'Healthy');
  const allBlueEliminated = blue.length > 0 && blue.every(seat => seat.health === 'Eliminated');
  const allRedEliminated = red.length > 0 && red.every(seat => seat.health === 'Eliminated');
  if (allBlueEliminated && allRedEliminated && simultaneousElimination && alienSurvives) {
    return { winner: 'Alien', alienCoWinner: false };
  }
  if (allRedEliminated && healthyBlue) return { winner: 'Blue', alienCoWinner: alienSurvives };
  if (allBlueEliminated && healthyRed) return { winner: 'Red', alienCoWinner: false };
  if (round === 5 && codeEligibleNow) {
    if (correctCode && healthyRed) return { winner: 'Red', alienCoWinner: false };
    const { bluePower, redPower } = healthyPower(seats);
    if (!correctCode && healthyBlue && bluePower > redPower) return { winner: 'Blue', alienCoWinner: alienSurvives };
  }
  return finalCheckpoint ? { winner: 'Draw', alienCoWinner: false } : null;
}
