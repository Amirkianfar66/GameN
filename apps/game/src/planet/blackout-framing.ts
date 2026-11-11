import {PLANET_BLACKOUT_PINS,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import type {PlanetVersions,PlanetPublicView} from '@mothership/contracts';
import type {ClockReading} from '../clock/server-clock.js';

/** Public window context only. Revisions belong to separate audiences and are not compared. */
export interface PlanetBlackoutFramingContext {
 readonly matchId:string;readonly round:number;readonly playerCount:7|8|9;readonly versions:PlanetVersions;
 readonly phaseId:string;readonly windowId:string;readonly startedAt:number;readonly previewEndsAt:number;readonly endsAt:number;
}
export type PlanetFramingPosition=Readonly<Pick<PlanetPublicView['board']['seats'][number],'location'|'slotId'>>;

/** Transient authorized PRE_BLACKOUT positions; never a source of dark figures or identities. */
export function readPlanetBlackoutFraming(value:unknown,context:PlanetBlackoutFramingContext|null,time:ClockReading):readonly PlanetFramingPosition[]|null{
 if(!context||time.status!=='synced'||!Number.isFinite(time.serverNowMs)||!Number.isFinite(time.uncertaintyMs)||time.uncertaintyMs<0)return null;
 const parsed=PlanetSessionSnapshotSchema.safeParse(value);if(!parsed.success)return null;
 const s=parsed.data,p=s.playerView,u=s.publicView;
 if(s.status!=='running'||!s.selfSeatId||!p||!u||p.self.seatId!==s.selfSeatId)return null;
 const pins={...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'};
 if([s.versions,p.versions,u.versions,context.versions].some(v=>!v||Object.entries(pins).some(([k,x])=>v[k as keyof PlanetVersions]!==x)))return null;
 if([s.matchId,p.matchId,u.matchId].some(x=>x!==context.matchId)||p.round!==context.round||u.round!==context.round||[s.playerCount,p.playerCount,u.playerCount].some(x=>x!==context.playerCount))return null;
 if(p.phase.kind!=='BLACKOUT'||u.phase.kind!=='BLACKOUT'||!p.blackout||!u.blackout||u.board.kind!=='FINALIZED'||u.board.checkpoint!=='PRE_BLACKOUT'||u.board.finalizedRound!==context.round)return null;
 for(const v of [p,u]){
  if(v.phase.id!==context.phaseId||v.phase.startedAt!==context.startedAt||v.phase.endsAt!==context.endsAt||v.blackout!.windowId!==context.windowId||v.blackout!.previewEndsAt!==context.previewEndsAt||v.blackout!.endsAt!==context.endsAt)return null;
 }
 if(context.previewEndsAt!==context.startedAt+5000||context.endsAt!==context.startedAt+15000||time.serverNowMs-time.uncertaintyMs<context.startedAt||time.serverNowMs+time.uncertaintyMs>=context.endsAt)return null;
 return u.board.seats.filter(s=>s.location!==null&&s.slotId!==null).map(({location,slotId})=>({location,slotId}));
}
