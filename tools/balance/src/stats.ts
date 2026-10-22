// Descriptive uncertainty for human playtest rates. See docs/balance/playtest/analysis-plan.md.

export interface RateEstimate {
  numerator: number;
  denominator: number;
  point: number | null;
  low: number | null;
  high: number | null;
}

/**
 * Wilson score interval for one binary rate (default 95%). It describes sampling noise for
 * independent matches only; repeated tables and players weaken independence, so the number
 * of distinct groups must always be reported beside it.
 */
export function wilson(numerator: number, denominator: number, z = 1.959963984540054): RateEstimate {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator < 0 || denominator < 0 || numerator > denominator) {
    throw new RangeError('A rate needs integer counts with 0 <= numerator <= denominator');
  }
  if (denominator === 0) return { numerator, denominator, point: null, low: null, high: null };
  const point = numerator / denominator;
  const z2 = z * z;
  const centre = point + z2 / (2 * denominator);
  const spread = z * Math.sqrt((point * (1 - point) + z2 / (4 * denominator)) / denominator);
  const scale = 1 + z2 / denominator;
  return { numerator, denominator, point, low: Math.max(0, (centre - spread) / scale), high: Math.min(1, (centre + spread) / scale) };
}

export interface OutcomeRow {
  mode: 7 | 8 | 9;
  groupId: string;
  // Blue, Red, Alien-solo and Draw are mutually exclusive; Alien co-win is a separate flag.
  outcome: 'Blue' | 'Red' | 'Alien' | 'Draw';
  alienCoWin: boolean;
  included: boolean;
}

export interface ModeSummary {
  mode: 7 | 8 | 9;
  recorded: number;
  included: number;
  excluded: number;
  distinctGroups: number;
  largestGroupShare: number | null;
  outcomes: Record<'Blue' | 'Red' | 'Alien' | 'Draw', RateEstimate>;
  alienCoWin: RateEstimate;
}

/** One summary per mode. Modes are never pooled. Excluded sessions stay counted and visible. */
export function summarizeOutcomes(rows: readonly OutcomeRow[]): ModeSummary[] {
  return ([7, 8, 9] as const).map(mode => {
    const all = rows.filter(row => row.mode === mode);
    const kept = all.filter(row => row.included);
    const groups = new Map<string, number>();
    for (const row of kept) groups.set(row.groupId, (groups.get(row.groupId) ?? 0) + 1);
    const rate = (outcome: OutcomeRow['outcome']) => wilson(kept.filter(row => row.outcome === outcome).length, kept.length);
    return {
      mode, recorded: all.length, included: kept.length, excluded: all.length - kept.length,
      distinctGroups: groups.size,
      largestGroupShare: kept.length === 0 ? null : Math.max(...groups.values()) / kept.length,
      outcomes: { Blue: rate('Blue'), Red: rate('Red'), Alien: rate('Alien'), Draw: rate('Draw') },
      alienCoWin: wilson(kept.filter(row => row.alienCoWin).length, kept.length),
    };
  });
}
