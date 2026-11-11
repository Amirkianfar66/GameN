import { PlanetPlayerViewSchema, PlanetPublicViewSchema, PlanetReceiptSchema, PlanetDrawingSchema } from '@mothership/contracts';
import type { PlanetCommandRequest, PlanetPlayerView, PlanetPublicView, PlanetReceipt, SeatId } from '@mothership/contracts';
import {planetIsPlayer,planetSupportsAssets} from '@mothership/presentation';
import type { PlanetIdentity, PlanetView } from '@mothership/presentation';

export const PLANET_SUPPORTED_ASSET_MANIFEST='design-0.5.0';

/** Firebase/Auth implementation is supplied by Integration. No endpoint or credential is inferred here. */
export interface PlanetSnapshot { readonly value: unknown; readonly fresh: boolean }
export interface PlanetBinding { readonly uid: string; readonly matchId: string; readonly seatId: SeatId | null }
export type PlanetReceiptContext = Pick<PlanetCommandRequest,'protocolVersion'|'matchId'|'phaseId'|'commandId'>;
export interface PlanetTransport {
 readonly mode: 'authenticated'|'synthetic';
 currentUid(): string | null;
 authenticate(): Promise<PlanetBinding>;
 serverTime(): Promise<number>;
 listen(audience: {readonly matchId:string;readonly seatId:SeatId|null},listener:{snapshot(value:PlanetSnapshot):void;error():void}):()=>void;
 command(request:PlanetCommandRequest):Promise<{readonly receipt:unknown;readonly serverTimeMs:number}|null>;
 receipt(context:PlanetReceiptContext):Promise<{readonly receipt:unknown|null;readonly serverTimeMs:number}|null>;
 identities?():readonly PlanetIdentity[];
}
export function readPlanetView(payload:unknown,matchId:string,seatId:SeatId|null):PlanetView|null {
 const parsed=seatId===null?PlanetPublicViewSchema.safeParse(payload):PlanetPlayerViewSchema.safeParse(payload);
 if(!parsed.success||parsed.data.matchId!==matchId||!planetSupportsAssets(parsed.data.versions))return null;
 const view:PlanetView=parsed.data;
 if(seatId!==null&&(!planetIsPlayer(view)||view.self.seatId!==seatId))return null;
 const ids=new Set(view.board.seats.map(s=>s.seatId));
 if(view.board.finalizedRound>view.round||[...ids].some(id=>Number(id.slice(5))>view.playerCount))return null;
 if(view.board.seats.some(s=>s.health==='Healthy'&&s.location==='Hospital'||s.health==='Injured'&&(!s.medical||s.medical.admittedRound>view.round||s.medical.rescueDueAfterRound!==s.rescueDueAfterRound)))return null;
 const has=(id:SeatId|null)=>id===null||ids.has(id);
 if(!has(view.activeSeatId)||!has(view.offices.captainSeatId)||!has(view.offices.officerSeatId)||!has(view.offices.blockedSeatId))return null;
 if(view.hackSession&&(!has(view.hackSession.actorSeatId)||!has(view.hackSession.targetSeatId)||view.hackSession.actorSeatId===view.hackSession.targetSeatId))return null;
 if(view.phase.kind==='FINISHED'&&(view.result===null||view.endReveal===null)||view.phase.kind!=='FINISHED'&&view.endReveal!==null)return null;
 if(view.navigation.lastMovedRound>view.round||view.ballot.eligibleVoters.some(id=>!has(id))||view.ballot.eligibleTargets.some(id=>!has(id)))return null;
 if(view.endReveal&&(new Set(view.endReveal.roles.map(r=>r.seatId)).size!==view.playerCount||view.endReveal.roles.some(r=>!has(r.seatId))||view.endReveal.code.some(id=>!has(id))))return null;
 if(view.events.some(e=>e.viewRevision>view.viewRevision||e.round>view.round||e.seatIds.some(id=>!has(id))||!has(e.actorSeatId)))return null;
 if(view.blackout&&(view.phase.kind!=='BLACKOUT'||view.blackout.previewEndsAt!==view.phase.startedAt+5000||view.blackout.endsAt!==view.phase.endsAt))return null;
 if(planetIsPlayer(view)){
  if(!has(view.self.seatId))return null;
  if(view.ownBallot&&view.ownBallot.phaseId!==view.phase.id)return null;
  if(view.blackoutTargeting){const t=view.blackoutTargeting,prefix=t.boundRoom==='Room A'?'A':t.boundRoom==='Room B'?'B':'C';if(view.phase.kind!=='BLACKOUT'||t.windowId!==view.blackout?.windowId||t.slotIds.some(id=>!id.startsWith(prefix)))return null;}
  if(view.offers.some(o=>o.targetSeatIds.some(id=>!has(id))))return null;
  if(view.promises.some(p=>!has(p.giverSeatId)||!has(p.recipientSeatId)||!has(p.targetSeatId)))return null;
  if(view.promises.filter(p=>p.accepted&&p.giverSeatId===view.self.seatId).length>1||view.promises.filter(p=>p.accepted&&p.recipientSeatId===view.self.seatId).length>1)return null;
  if(view.windows.some(w=>w.drawings.some(d=>!has(d.authorSeatId)||!PlanetDrawingSchema.safeParse(d.drawing).success)))return null;
 }
 return view;
}
export function readPlanetReceipt(payload:unknown,request:PlanetReceiptContext):PlanetReceipt|null {
 const parsed=PlanetReceiptSchema.safeParse(payload);if(!parsed.success)return null;
 const r=parsed.data;return r.matchId===request.matchId&&r.phaseId===request.phaseId&&r.commandId===request.commandId?r:null;
}
export type {PlanetPlayerView,PlanetPublicView};
