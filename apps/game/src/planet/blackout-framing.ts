import {PLANET_BLACKOUT_PINS,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import type {PlanetVersions,PlanetPublicView} from '@mothership/contracts';
import {planetSupportsAssets} from '@mothership/presentation';
import type {ClockReading} from '../clock/server-clock.js';

/** Public window context only. Revisions belong to separate audiences and are not compared. */
export interface PlanetBlackoutFramingContext {
 readonly matchId:string;readonly round:number;readonly playerCount:7|8|9;readonly versions:PlanetVersions;
 readonly phaseId:string;readonly windowId:string;readonly startedAt:number;readonly previewEndsAt:number;readonly endsAt:number;
}
/** The public down-pose flag is consumed transiently; no health or roster enters the dark cache. */
export type PlanetFramingPosition=Readonly<Pick<PlanetPublicView['board']['seats'][number],'location'|'slotId'>&{eliminated:boolean}>;
export type PlanetBlackoutFrameInput=Readonly<{kind:'lit';positions:readonly PlanetFramingPosition[]}|{kind:'all'}>;
const sameVersions=(a:PlanetVersions,b:PlanetVersions)=>Object.keys(a).every(k=>a[k as keyof PlanetVersions]===b[k as keyof PlanetVersions]);

/** Private/session authority must validate before either the public reconstruction or frameAll. */
export function readTrustedBlackoutContext(value:unknown,context:PlanetBlackoutFramingContext|null,time:ClockReading){
 if(!context||time.status!=='synced'||!Number.isFinite(time.serverNowMs)||!Number.isFinite(time.uncertaintyMs)||time.uncertaintyMs<0)return null;
 const parsed=PlanetSessionSnapshotSchema.safeParse(value);if(!parsed.success)return null;
 const s=parsed.data,p=s.playerView;
 if(s.status!=='running'||!s.selfSeatId||!p||p.self.seatId!==s.selfSeatId||!planetSupportsAssets(s.versions))return null;
 if(!sameVersions(s.versions,p.versions)||!sameVersions(s.versions,context.versions)||s.matchId!==context.matchId||p.matchId!==context.matchId||p.round!==context.round||s.playerCount!==context.playerCount||p.playerCount!==context.playerCount)return null;
 if(p.phase.kind!=='BLACKOUT'||!p.blackout||p.phase.id!==context.phaseId||p.phase.startedAt!==context.startedAt||p.phase.endsAt!==context.endsAt||p.blackout.windowId!==context.windowId||p.blackout.previewEndsAt!==context.previewEndsAt||p.blackout.endsAt!==context.endsAt)return null;
 if(context.previewEndsAt!==context.startedAt+5000||context.endsAt!==context.startedAt+15000||time.serverNowMs-time.uncertaintyMs<context.startedAt||time.serverNowMs+time.uncertaintyMs>=context.endsAt)return null;
 return s;
}

/** Transient authorized PRE_BLACKOUT positions; never a source of dark figures or identities. */
export function readPlanetBlackoutFraming(value:unknown,context:PlanetBlackoutFramingContext|null,time:ClockReading):readonly PlanetFramingPosition[]|null{
 const s=readTrustedBlackoutContext(value,context,time);if(!s||!context)return null;const u=s.publicView;
 const pins={...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'};
 if(!u||!sameVersions(s.versions,pins)||!sameVersions(s.versions,u.versions))return null;
 if(u.matchId!==context.matchId||u.round!==context.round||u.playerCount!==context.playerCount||u.phase.kind!=='BLACKOUT'||!u.blackout||u.board.kind!=='FINALIZED'||u.board.checkpoint!=='PRE_BLACKOUT'||u.board.finalizedRound!==context.round)return null;
 if(u.phase.id!==context.phaseId||u.phase.startedAt!==context.startedAt||u.phase.endsAt!==context.endsAt||u.blackout.windowId!==context.windowId||u.blackout.previewEndsAt!==context.previewEndsAt||u.blackout.endsAt!==context.endsAt)return null;
 return u.board.seats.filter(s=>s.location!==null&&s.slotId!==null).map(({location,slotId,health})=>({location,slotId,eliminated:health==='Eliminated'}));
}

/** Designer #229: missing/unrecoverable public lit input selects canonical geometry, never authority. */
export function readPlanetBlackoutFrameInput(value:unknown,context:PlanetBlackoutFramingContext|null,time:ClockReading):PlanetBlackoutFrameInput|null{
 if(!readTrustedBlackoutContext(value,context,time))return null;
 const positions=readPlanetBlackoutFraming(value,context,time);return positions?{kind:'lit',positions}:{kind:'all'};
}
