import type {SeatId} from '@mothership/contracts';
import type {PlanetScreenModel} from './model.js';

/** Number labels never replace the canonical identities carried by a command. */
export function planetPlayerNumberChoices(ids:readonly SeatId[]):readonly {value:SeatId;label:string}[]{
 return ids.map(value=>({value,label:value.slice(5)})).sort((a,b)=>Number(a.label)-Number(b.label));
}

/** A resource increase is a Supply receipt only across its actual finalized opportunity. */
export interface PlanetSupplyObservation {
 readonly matchId:string;readonly seatId:SeatId;readonly round:number;readonly revision:number;
 readonly phaseKind:string;readonly finalizedRound:number;readonly lastMovedRound:number;readonly ordinaryWeapons:number;
}
export function planetSupplyDelivery(previous:PlanetSupplyObservation|null,next:PlanetSupplyObservation):{round:3;count:1}|null{
 if(!previous||previous.matchId!==next.matchId||previous.seatId!==next.seatId||previous.round!==3||next.round!==3||
  previous.phaseKind!=='BLACKOUT'||!next.phaseKind.startsWith('NAV_')||previous.finalizedRound!==2||next.finalizedRound!==3||
  next.lastMovedRound!==2||next.revision<=previous.revision)return null;
 return next.ordinaryWeapons-previous.ordinaryWeapons===1?{round:3,count:1}:null;
}

/** Colored arrival artwork requires the matching authoritative terminal facts. */
export function planetTerminalArrival(model:Pick<PlanetScreenModel,'connection'|'concealed'|'phase'|'result'|'navigation'>):'Blue'|'Red'|null{
 if(model.connection!=='live'||model.concealed||model.phase?.kind!=='FINISHED'||!model.phase.trusted||model.result?.reason!=='ARRIVAL')return null;
 const side=model.navigation?.arrivedAt;
 return (side==='Blue'||side==='Red')&&model.result.winner===side?side:null;
}
