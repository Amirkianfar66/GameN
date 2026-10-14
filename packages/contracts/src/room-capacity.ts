import type { FullPublicView } from './full-game.js';
import { VOTE_RESULT_VERSION_PINS, DECLARED_HACK_VERSION_PINS, PUBLIC_HACK_VERSION_PINS } from './full-game-versions.js';

type GameplayVersions = Pick<FullPublicView['versions'], 'protocolVersion' | 'engineVersion' | 'rulesetVersion' | 'rulesetHash'>;
type Location = FullPublicView['seats'][number]['location'];

// Public display metadata for reviewed immutable tuples. This module deliberately
// imports no engine code and grants no movement or placement authority.
const CAPPED_TUPLES: readonly GameplayVersions[] = [
  VOTE_RESULT_VERSION_PINS, DECLARED_HACK_VERSION_PINS, PUBLIC_HACK_VERSION_PINS,
  { protocolVersion: 2, engineVersion: 'full-game-1.2.0', rulesetVersion: 'in-person-v1-capacity-2026-10-11',
    rulesetHash: 'e4f72a7990c84dddb35d5b5416e33a33ad114394da7b6db2890fcb2d0d561468' },
  { protocolVersion: 2, engineVersion: 'full-game-1.3.0', rulesetVersion: 'in-person-v1-capacity-resolution-2026-10-12',
    rulesetHash: 'aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e' },
];

/** The public capacity label, or null when no reviewed finite label applies.
 * Unknown/mixed tuples and historical uncapped matches must not acquire a FULL
 * label from the currently deployed binary. Use server offers to enable moves.
 */
export function fullRoomCapacityForVersions(versions: GameplayVersions, location: Location): number | null {
  const known = CAPPED_TUPLES.some(tuple => tuple.protocolVersion === versions.protocolVersion
    && tuple.engineVersion === versions.engineVersion && tuple.rulesetVersion === versions.rulesetVersion
    && tuple.rulesetHash === versions.rulesetHash);
  if (!known) return null;
  if (location === 'Command Room') return 1;
  if (location === 'Room A' || location === 'Room B' || location === 'Hospital' || location === 'Jail') return 5;
  return null;
}
