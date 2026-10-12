import type { FullCommand, FullPhase, FullPublicView, FullVoteResult, SeatId } from '@mothership/contracts';
import type { GameSeat, Role, Room } from './roster.js';
export const FULL_ENGINE_VERSION = 'full-game-1.4.0' as const;
export const FULL_RULESET_VERSION = 'in-person-v1-vote-results-2026-10-12' as const;
export const FULL_RULESET_HASH = '617173762d5a1589d0adce55d4742a3aa70f6d5af03a968b6ab9f90d5392b010' as const;

export type FullGameplayVersions = Pick<FullPublicView['versions'], 'protocolVersion' | 'engineVersion' | 'rulesetVersion' | 'rulesetHash'>;
export const FULL_GAME_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const, engineVersion: FULL_ENGINE_VERSION,
  rulesetVersion: FULL_RULESET_VERSION, rulesetHash: FULL_RULESET_HASH });
export const VOTE_RESULT_FULL_GAME_VERSION_PINS = FULL_GAME_VERSION_PINS;
export const RESOLUTION_FULL_GAME_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const, engineVersion: 'full-game-1.3.0',
  rulesetVersion: 'in-person-v1-capacity-resolution-2026-10-12', rulesetHash: 'aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e' });
export const CAPACITY_FULL_GAME_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const, engineVersion: 'full-game-1.2.0',
  rulesetVersion: 'in-person-v1-capacity-2026-10-11', rulesetHash: 'e4f72a7990c84dddb35d5b5416e33a33ad114394da7b6db2890fcb2d0d561468' });
export const PASS_FULL_GAME_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const, engineVersion: 'full-game-1.1.0',
  rulesetVersion: 'in-person-v1-pass-2026-10-08', rulesetHash: 'a25cec290370a3140829292b3cb8bdda3fb4402e0b529b56c6ef9692f7870183' });
export const MAX_ROOM_OCCUPANTS = 5 as const;
export const LEGACY_FULL_GAME_VERSION_PINS = Object.freeze({ protocolVersion: 2 as const, engineVersion: 'full-game-1.0.1',
  rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: '6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90' });
const sameGameplayVersions = (versions: FullGameplayVersions, pins: FullGameplayVersions): boolean =>
  versions.protocolVersion === pins.protocolVersion && versions.engineVersion === pins.engineVersion
  && versions.rulesetVersion === pins.rulesetVersion && versions.rulesetHash === pins.rulesetHash;
// Support exact reviewed tuples; mixing a new engine with an old ruleset is invalid.
export const isSupportedFullGameVersions = (versions: FullGameplayVersions): boolean =>
  sameGameplayVersions(versions, FULL_GAME_VERSION_PINS) || sameGameplayVersions(versions, RESOLUTION_FULL_GAME_VERSION_PINS) || sameGameplayVersions(versions, CAPACITY_FULL_GAME_VERSION_PINS)
    || sameGameplayVersions(versions, PASS_FULL_GAME_VERSION_PINS)
    || sameGameplayVersions(versions, LEGACY_FULL_GAME_VERSION_PINS);
export const voteResultEnabled = (versions: FullGameplayVersions): boolean => sameGameplayVersions(versions, VOTE_RESULT_FULL_GAME_VERSION_PINS);
export const resolutionPlacementEnabled = (versions: FullGameplayVersions): boolean => voteResultEnabled(versions) || sameGameplayVersions(versions, RESOLUTION_FULL_GAME_VERSION_PINS);
export const jointStartingRoomsEnabled = resolutionPlacementEnabled;
export const roomCapacityEnabled = (versions: FullGameplayVersions): boolean =>
  resolutionPlacementEnabled(versions) || sameGameplayVersions(versions, CAPACITY_FULL_GAME_VERSION_PINS);
export const passTurnEnabled = (versions: FullGameplayVersions): boolean =>
  roomCapacityEnabled(versions) || sameGameplayVersions(versions, PASS_FULL_GAME_VERSION_PINS);
export interface FullGameSetup {
  playerCount: 7 | 8 | 9;
  roleOrder: Role[];
  codeExtraSeatIds: SeatId[];
  initialRooms: Record<string, Room>;
  roundOrders: SeatId[][];
}
export interface FullGameContext { now: number; nextPhaseId: string; nextDeadlineToken: string }
// Private authoritative evidence, never a public or normal player-view field.
export interface FullSupplierGrantResult {
  round: 3;
  commandId: string;
  supplierSeatId: SeatId;
  successfulRecipientSeatIds: SeatId[];
}
export interface FullGameState {
  matchId: string; versions: FullPublicView['versions']; playerCount: 7 | 8 | 9;
  setup: FullGameSetup; round: number; seats: GameSeat[]; code: SeatId[];
  phase: FullPhase; deadlineToken: string | null; activeSeatId: SeatId | null;
  turnIndex: number; turnOrder: SeatId[]; queued: Array<{commandId:string;actorSeatId:SeatId;command:FullCommand}>;
  ballots: Array<{ voterSeatId:SeatId; targetSeatId:SeatId|null; approve:boolean|null }>;
  eligibleVoters: SeatId[]; eligibleTargets: SeatId[]; releaseTargetSeatId:SeatId|null;
  releaseUsed: boolean; releaseChoiceMade: boolean; hacksThisRound:number;
  pendingHack: {actorSeatId:SeatId;targetSeatId:SeatId}|null;
  activeHack: {actorSeatId:SeatId;targetSeatId:SeatId}|null;
  codeSubmitted:boolean; correctCode:boolean;
  lastTally: FullPublicView['lastTally']; result:FullPublicView['result'];
  voteResult?: FullVoteResult | null;
  voteResultContinuation?: { kind:'BEGIN_ROUND'|'CAPTAIN_RUNOFF'|'JAIL_VOTE'|'RESOLVE_ROUND'; candidates:SeatId[] } | null;
  electionForNextRound:boolean;
  // Absence identifies a legacy save with no recorded Supply acknowledgment history.
  supplierGrantResults?: FullSupplierGrantResult[];
  journalSequence:number; viewRevisions:{public:number;players:Partial<Record<SeatId,number>>};
}
