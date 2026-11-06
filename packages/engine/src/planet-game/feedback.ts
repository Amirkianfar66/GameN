import type { SeatId } from '@mothership/contracts';
import { planetHasPrivateFeedback } from './model.js';
import type { PlanetGameState, PlanetWorld } from './model.js';

export const planetPanelReservationKey=(seatId:SeatId,commandId:string):string=>`${seatId}:${commandId}`;

type PanelRequest = NonNullable<NonNullable<PlanetGameState['global']['panelRequests']>[SeatId]>;
function requestBook(state:PlanetGameState):NonNullable<PlanetGameState['global']['panelRequests']> {
  if(!state.global.panelRequests)throw Error('Missing global panel feedback');return state.global.panelRequests;
}
function reservationBook(world:PlanetWorld):NonNullable<PlanetWorld['panelReservations']> {
  if(!world.panelReservations)throw Error('Missing world panel reservations');return world.panelReservations;
}

/** Accepted knowledge is global; the reserved injection and pending effect are world-owned. */
export function registerPlanetPanelRequest(state:PlanetGameState,world:PlanetWorld,seatId:SeatId,commandId:string,correct:boolean):void {
  if(!planetHasPrivateFeedback(state.versions))return;
  const requests=requestBook(state),reservations=reservationBook(world);
  const key=planetPanelReservationKey(seatId,commandId);
  if(Object.hasOwn(requests,seatId)||Object.hasOwn(reservations,key))throw Error('Panel feedback already recorded');
  requests[seatId]={commandId,round:state.round,status:correct?'QUEUED':'WRONG'};
  if(correct)reservations[key]={seatId,round:state.round,status:'QUEUED'};
}

/** Only actual Sync may distinguish a discarded accepted request from an inherited one. */
export function finalizePlanetPanelSync(state:PlanetGameState,selectedWorld:PlanetWorld):void {
  if(!planetHasPrivateFeedback(state.versions))return;
  if(state.blackholeActive||Object.keys(state.worlds).length!==1||state.worlds[state.currentWorldId]!==selectedWorld)throw Error('Panel selection requires completed Sync');
  const requests=requestBook(state),reservations=reservationBook(selectedWorld),discarded:PanelRequest[]=[];
  for(const [seatId,request] of Object.entries(requests)){
    if(request===undefined)throw Error('Missing panel request record');
    if(request.status!=='QUEUED')continue;
    const retained=reservations[planetPanelReservationKey(seatId as SeatId,request.commandId)];
    if(retained===undefined){discarded.push(request);continue;}
    if(retained.seatId!==seatId||retained.round!==request.round||retained.status!=='QUEUED')throw Error('Mismatched retained panel reservation');
  }
  for(const request of discarded)request.status='DISCARDED';
}

/** Called once at this request's actual Rescue opportunity, after attacks, before healing. */
export function resolvePlanetPanelReservation(state:PlanetGameState,world:PlanetWorld,seatId:SeatId,commandId:string,treated:boolean):void {
  if(!planetHasPrivateFeedback(state.versions))return;
  if(state.blackholeActive||state.worlds[state.currentWorldId]!==world)throw Error('Panel Rescue requires selected reality');
  const reservation=reservationBook(world)[planetPanelReservationKey(seatId,commandId)],request=requestBook(state)[seatId];
  if(!reservation||reservation.seatId!==seatId||reservation.round!==state.round||reservation.status!=='QUEUED'
    ||!request||request.commandId!==commandId||request.round!==reservation.round||request.status!=='QUEUED')throw Error('Mismatched panel Rescue opportunity');
  reservation.status=treated?'TREATED':'NO_EFFECT';request.status=reservation.status;
}
