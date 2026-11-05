import type {PlanetScreenModel} from './model.js';

export interface PlanetBlackholePresentation {
 readonly phaseId:string;
 readonly startedAt:number;
 readonly endsAt:number;
 readonly durationMs:number;
 readonly elapsedMs:number;
 readonly remainingMs:number;
 readonly progress:number;
 readonly status:'presenting'|'awaiting-view';
}

/** Presentation time is always a seek into the current authoritative phase, never a new delay. */
export function planetBlackholePresentation(model:Pick<PlanetScreenModel,'phase'|'connection'|'concealed'>):PlanetBlackholePresentation|null {
 const phase=model.phase;
 if(model.connection!=='live'||model.concealed||phase?.kind!=='BLACKHOLE_PRESENTATION'||!phase.trusted||phase.nowMs===null||phase.endsAt===null)return null;
 const {startedAt,endsAt,nowMs}=phase;
 if(![startedAt,endsAt,nowMs].every(Number.isFinite)||endsAt<=startedAt||nowMs<startedAt)return null;
 const durationMs=endsAt-startedAt,elapsedMs=Math.max(0,Math.min(durationMs,nowMs-startedAt)),remainingMs=Math.max(0,endsAt-nowMs);
 return {phaseId:phase.id,startedAt,endsAt,durationMs,elapsedMs,remainingMs,progress:elapsedMs/durationMs,status:remainingMs===0?'awaiting-view':'presenting'};
}
