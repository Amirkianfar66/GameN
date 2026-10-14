export const BLACKOUT_VERSION_PINS = Object.freeze({protocolVersion:2 as const,engineVersion:'full-game-1.9.0',rulesetVersion:'in-person-v1-blackout-2026-10-14',
  rulesetHash:'7784630d4e6a51f7a8e6c89873dfab479b5281f10ddbcb4918503525096ed7a0'});
export const CAPTAIN_OUTCOMES_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const,
  engineVersion: 'full-game-1.8.0', rulesetVersion: 'in-person-v1-captain-outcomes-2026-10-14',
  rulesetHash: '0f84f61cf9407c45ccef7e99c28556d7ede64f06f7dd3284ca6782bbf7a5f030' });
// Reviewed immutable gameplay tuples, independent of asset versions and engine imports.
export const VOTE_RESULT_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const,
  engineVersion: 'full-game-1.4.0', rulesetVersion: 'in-person-v1-vote-results-2026-10-12',
  rulesetHash: '617173762d5a1589d0adce55d4742a3aa70f6d5af03a968b6ab9f90d5392b010' });
export const DECLARED_HACK_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const,
  engineVersion: 'full-game-1.5.0', rulesetVersion: 'in-person-v1-declared-hack-2026-10-12',
  rulesetHash: '1d8a5e509372ea816af8d6782bf1d73720532ed672ee2f77e2938805976d8d6c' });
export const BOARD_MEDICAL_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const,
  engineVersion: 'full-game-1.7.0', rulesetVersion: 'in-person-v1-board-medical-2026-10-14',
  rulesetHash: '82be55c66a9925712d4cce1e1a56ff4f7aae001c363c2ba93e3267b6e6e70275' });
export const PUBLIC_HACK_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const,
  engineVersion: 'full-game-1.6.0', rulesetVersion: 'in-person-v1-public-hack-2026-10-14',
  rulesetHash: '28bc2eb81e3687c63746018e392227ded1989f398e2667495e0b6f499f0f3969' });
export type FullGameplayPins = { protocolVersion: number; engineVersion: string; rulesetVersion: string; rulesetHash: string };
export const sameFullGameplayPins = (a: FullGameplayPins, b: FullGameplayPins): boolean =>
  a.protocolVersion === b.protocolVersion && a.engineVersion === b.engineVersion
  && a.rulesetVersion === b.rulesetVersion && a.rulesetHash === b.rulesetHash;
const HISTORICAL_PINS: readonly FullGameplayPins[] = [
  // Historical protocol-2 handoff snapshots; not an executable service tuple.
  { protocolVersion:2,engineVersion:'full-game-1.0.0',rulesetVersion:'in-person-v1-2026-10-06',rulesetHash:'6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90' },
  { protocolVersion:2,engineVersion:'full-game-1.3.0',rulesetVersion:'in-person-v1-capacity-resolution-2026-10-12',rulesetHash:'aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e' },
  { protocolVersion:2,engineVersion:'full-game-1.2.0',rulesetVersion:'in-person-v1-capacity-2026-10-11',rulesetHash:'e4f72a7990c84dddb35d5b5416e33a33ad114394da7b6db2890fcb2d0d561468' },
  { protocolVersion:2,engineVersion:'full-game-1.1.0',rulesetVersion:'in-person-v1-pass-2026-10-08',rulesetHash:'a25cec290370a3140829292b3cb8bdda3fb4402e0b529b56c6ef9692f7870183' },
  { protocolVersion:2,engineVersion:'full-game-1.0.1',rulesetVersion:'in-person-v1-2026-10-06',rulesetHash:'6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90' },
];
export const supportsBlackout = (pins:FullGameplayPins):boolean => sameFullGameplayPins(pins,BLACKOUT_VERSION_PINS);
export const supportsCaptainCommands = (pins: FullGameplayPins): boolean => supportsBlackout(pins) || sameFullGameplayPins(pins,CAPTAIN_OUTCOMES_VERSION_PINS);
export const supportsBoardMedical = (pins: FullGameplayPins): boolean => supportsCaptainCommands(pins) || sameFullGameplayPins(pins,BOARD_MEDICAL_VERSION_PINS);
export const supportsPublicHack = (pins: FullGameplayPins): boolean => supportsBoardMedical(pins) || sameFullGameplayPins(pins,PUBLIC_HACK_VERSION_PINS);
export const supportsDeclaredHack = (pins: FullGameplayPins): boolean => supportsPublicHack(pins) || sameFullGameplayPins(pins,DECLARED_HACK_VERSION_PINS);
export const supportsVoteResults = (pins: FullGameplayPins): boolean => supportsDeclaredHack(pins) || sameFullGameplayPins(pins,VOTE_RESULT_VERSION_PINS);
export const isKnownFullGameplayPins = (pins: FullGameplayPins): boolean =>
  supportsVoteResults(pins) || HISTORICAL_PINS.some(known=>sameFullGameplayPins(pins,known));
