import type { PlanetVersions, PlanetRole, PlanetFaction, PlanetPhase, PlanetCommand, PlanetPromise, PlanetWindowDrawing, PlanetEvent, PlanetDirection, PlanetRoutePosition, PlanetResult, PlanetTally, PlanetSeatView, PlanetEngineerCapture, PlanetPanelRequest, SeatId } from '@mothership/contracts';
export type { SeatId } from '@mothership/contracts';
export interface PlanetGameContext { now:number; nextPhaseId:string; nextDeadlineToken:string; random:readonly number[]; phaseId?:string; deadlineToken?:string }
export interface PlanetGameSetup { matchId:string; playerCount:7|8|9; roleOrder:PlanetRole[]; initialRooms:Record<SeatId,'Room A'|'Room B'>; initialTurnOrder:SeatId[]; assetManifestVersion:string; versions?:PlanetVersions }
export interface PlanetPhysicalSeat {
  seatId:SeatId; health:'Healthy'|'Injured'|'Eliminated'; location:'Room A'|'Room B'|'Command Room'|'Hospital'|'Jail'|null;
  slotId:PlanetSeatView['slotId']; lastRoom:'Room A'|'Room B'; jailed:boolean; revealedFaction:PlanetFaction|null;
  rescueDueAfterRound:number|null; medical:PlanetSeatView['medical']; ordinaryWeapons:number; roleActionSpent:boolean; shotSpent:boolean;
  protection:{donorSeatId:SeatId;activeFromRound:number;consumed:boolean}|null; protectionEver:boolean;
  clone:{used:boolean;active:boolean;expiresAfterRound:number|null}; blackoutSpent:boolean; engineerSpent:boolean; engineerCapture?:PlanetEngineerCapture|null;
}
export interface PlanetRegisteredAction { actorSeatId:SeatId; commandId:string; command:PlanetCommand; order:number; boundRoom?:'Room A'|'Room B'|'Command Room'; selectedSlotId?:PlanetSeatView['slotId'] }
export interface PlanetStoredEvent { event:PlanetEvent; recipients:SeatId[]|null }
export interface PlanetWorld {
  seats:PlanetPhysicalSeat[]; actions:PlanetRegisteredAction[]; injectionsRemaining:number;
  captainSeatId:SeatId|null; officerSeatId:SeatId|null; releaseUsed:boolean; ejectUsed:boolean;
  shipHackSpent:boolean; shipHackOverride:boolean; suppressedSeatIds:SeatId[]; events:PlanetStoredEvent[];
  panelReservations?:Record<string,{seatId:SeatId;round:number;status:'QUEUED'|'TREATED'|'NO_EFFECT'}>;
}
export interface PlanetHack { id:string; actorSeatId:SeatId; targetSeatId:SeatId; declaredSide:PlanetFaction|null; status:'AWAITING_DECLARATION'|'DECLARED'|'NO_DECLARATION' }
export interface PlanetGlobal {
  promiseEvaluation:Record<string,{candidateBallots:number;missedRequiredBallot:boolean;captainWon:boolean|null;ballotPhaseIds:string[]}>;
  movementSpent:SeatId[]; blockedSeatId:SeatId|null; lastBlockedSeatId:SeatId|null;
  blackholeSpent:boolean; blackholeRound:number|null; panelAttempts:SeatId[];
  scanResults:Array<{round:number;targetSeatId:SeatId;guess:PlanetFaction;matched:boolean;inCode:boolean|null}>;
  scanUsedRound:number|null; scanBlockedThroughRound:number|null; codeAttempted:boolean; shipHackUnlocked:boolean;
  panelRequests?:Partial<Record<SeatId,PlanetPanelRequest>>;
  hackCounts:Record<SeatId,number>; hackSpent:SeatId[];
  promises:PlanetPromise[]; promiseGiven:SeatId[]; promiseReceived:SeatId[]; declinedPromiseIds:string[];
  drawings:PlanetWindowDrawing[]; roundOrders:Record<string,SeatId[]>;
}
export interface PlanetGameState {
  matchId:string; versions:PlanetVersions; playerCount:7|8|9; round:number; evaluatedAt:number; phase:PlanetPhase; deadlineToken:string|null;
  roles:Record<SeatId,PlanetRole>; code:SeatId[]; worlds:Record<string,PlanetWorld>; realityOf:Record<SeatId,string>; currentWorldId:string;
  blackholeActive:boolean; blackoutPreviewComplete:boolean; nextWorldNumber:number; global:PlanetGlobal;
  turnOrder:SeatId[]; turnIndex:number; activeSeatId:SeatId|null; hack:PlanetHack|null; panelOpen:boolean;
  ballot:{kind:'CAPTAIN_ELECTION'|'JAIL_VOTE';eligibleVoters:SeatId[];eligibleTargets:SeatId[];votes:Partial<Record<SeatId,SeatId|null>>; runoff:boolean; electionId:string}|null;
  lastTally:PlanetTally|null; afterVote:'RESOLVE'|'APPOINT'|'RUNOFF'|'NEXT_ROUND'|null; electionNeeded:boolean;
  navigation:{position:PlanetRoutePosition;direction:PlanetDirection|null;lastMovedRound:number;arrivedAt:PlanetDirection|null;started:boolean;settingTie?:boolean;settingDirection?:PlanetDirection|null};
  result:PlanetResult|null; finalized:{round:number;seats:PlanetSeatView[];events:PlanetStoredEvent[]};
  revisions:{public:number;players:Record<SeatId,number>};
  eventPublications:Record<string,Record<string,{viewRevision:number;publishedAt:number}>>;
}
export const copyPlanet = <T>(value:T):T => JSON.parse(JSON.stringify(value)) as T;
export const seatIds = (state:PlanetGameState):SeatId[] => Object.keys(state.roles) as SeatId[];
export const planetFaction = (role:PlanetRole):PlanetFaction => role==='Alien'?'Alien':['Undercover','Hacker','Red Disabler'].includes(role)?'Red':'Blue';
export function planetWorld(state:PlanetGameState,actor?:SeatId):PlanetWorld {
  const id=actor===undefined?state.currentWorldId:state.realityOf[actor];const world=id===undefined?undefined:state.worlds[id];
  if(!world)throw Error('Unknown planet reality');return world;
}
export function planetSeat(world:PlanetWorld,id:SeatId):PlanetPhysicalSeat { const value=world.seats.find(s=>s.seatId===id);if(!value)throw Error('Unknown planet player');return value; }
export const alive = (seat:PlanetPhysicalSeat):boolean => seat.health!=='Eliminated';
export const freeHealthy = (seat:PlanetPhysicalSeat):boolean => seat.health==='Healthy'&&!seat.jailed&&['Room A','Room B','Command Room'].includes(seat.location??'');
export const ordinaryStage = (state:PlanetGameState):boolean => ['ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','HACK'].includes(state.phase.kind);
export const ownTurn = (state:PlanetGameState,id:SeatId):boolean => state.phase.kind==='ORDINARY_TURN'&&state.activeSeatId===id;
export function canRoleAction(state:PlanetGameState,id:SeatId):boolean {const s=planetSeat(planetWorld(state,id),id);return ownTurn(state,id)&&freeHealthy(s)&&!s.roleActionSpent&&!(state.roles[id]==='Alien'&&state.global.blackholeRound===state.round)&&!(state.roles[id]==='Hacker'&&state.global.scanUsedRound===state.round);}
export function planetSeatView(world:PlanetWorld,seat:PlanetPhysicalSeat):PlanetSeatView {return {seatId:seat.seatId,health:seat.health,location:seat.location,slotId:seat.slotId,jailed:seat.jailed,captain:world.captainSeatId===seat.seatId,officer:world.officerSeatId===seat.seatId,revealedFaction:seat.revealedFaction,rescueDueAfterRound:seat.rescueDueAfterRound,medical:copyPlanet(seat.medical??null)};}
export function storePlanetEvent(state:PlanetGameState,world:PlanetWorld,kind:PlanetEvent['kind'],ids:SeatId[],location:PlanetEvent['location']=null,recipients:SeatId[]|null=null,actorSeatId:SeatId|null=null,slotId:PlanetEvent['slotId']=null,clinicalAnchor:PlanetEvent['clinicalAnchor']=null):void {
  // Storage IDs are private. Projection derives an audience-local occurrence ID to avoid count gaps.
  const worldId=Object.entries(state.worlds).find(([,w])=>w===world)?.[0]??'world';
  world.events.push({event:{id:`${worldId}-${state.phase.id.slice(0,72)}-${world.events.length}`,round:state.round,phaseId:state.phase.id,viewRevision:0,publishedAt:state.evaluatedAt,expiresAt:state.evaluatedAt+30000,audience:recipients===null?{kind:'public'}:{kind:'player',seatId:recipients[0]!},kind,seatIds:[...ids],actorSeatId,location,slotId,clinicalAnchor},recipients:recipients===null?null:[...recipients]});
}

// Immutable P27 behavior gate; never enable a timing change merely by changing defaults.
export const planetHasSyncPresentation = (versions:PlanetVersions):boolean => versions.engineVersion==='planet-game-1.0.1'||versions.engineVersion==='planet-game-1.1.0';

export const planetHasPrivateFeedback = (versions:PlanetVersions):boolean => versions.engineVersion==='planet-game-1.1.0';
