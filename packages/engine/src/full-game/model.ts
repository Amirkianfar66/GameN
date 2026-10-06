import type { FullCommand, FullPhase, FullPublicView, SeatId } from '@mothership/contracts';
import type { GameSeat, Role, Room } from './roster.js';
export const FULL_ENGINE_VERSION = 'full-game-1.0.0' as const;
export const FULL_RULESET_VERSION = 'in-person-v1-2026-10-06' as const;
export const FULL_RULESET_HASH = '6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90' as const;
export interface FullGameSetup {
  playerCount: 7 | 8 | 9;
  roleOrder: Role[];
  codeExtraSeatIds: SeatId[];
  initialRooms: Record<string, Room>;
  roundOrders: SeatId[][];
}
export interface FullGameContext { now: number; nextPhaseId: string; nextDeadlineToken: string }
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
  electionForNextRound:boolean;
  journalSequence:number; viewRevisions:{public:number;players:Partial<Record<SeatId,number>>};
}
