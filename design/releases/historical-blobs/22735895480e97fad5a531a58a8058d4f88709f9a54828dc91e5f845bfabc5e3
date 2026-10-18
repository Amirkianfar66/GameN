// Consumer preparation for the reviewed public capsule boundary. This module is not wired
// to a connected view until contracts, capability/art pins and Claude drawing ports are adopted.
// It accepts public facts only, creates no game command/timer, and keeps no departure address.
const stages=new Set(['HACK_DECLARE','HACK_RESULT','HACK']);
const duration={HACK_DECLARE:15000,HACK_RESULT:5000,HACK:60000};
const seat=value=>typeof value==='string'&&/^seat-[1-9]$/.test(value);
const samePair=(a,b)=>a?.hackId===b?.hackId&&a?.actorSeatId===b?.actorSeatId&&a?.targetSeatId===b?.targetSeatId;

/** `enabled` comes from the future exact shared capability reader, not an echoed version. */
export function capsuleFrame({enabled=false,session=null,phase=null,activeSeatId=null,seatIds=[],remainingMs=null,fresh=false,foreground=true}) {
 const base={enabled,fresh:enabled&&fresh&&Boolean(phase?.id),foreground,terminal:['FINISHED','ABORTED'].includes(phase?.kind),phaseId:phase?.id??null,stage:phase?.kind??null,session:null,elapsedMs:0,remainingMs:0,inTime:false};
 if(!enabled||!session)return base;
 if(!phase||!stages.has(phase.kind)||!session.hackId||!seat(session.actorSeatId)||!seat(session.targetSeatId)
  ||session.actorSeatId!==activeSeatId||session.actorSeatId===session.targetSeatId||!seatIds.includes(session.actorSeatId)||!seatIds.includes(session.targetSeatId)
  ||!Number.isFinite(phase.startedAt)||!Number.isFinite(phase.endsAt)||phase.endsAt-phase.startedAt!==duration[phase.kind]
  ||(phase.kind==='HACK_DECLARE' ? session.hackId!==phase.id : session.hackId===phase.id)
  ||!Number.isFinite(remainingMs))return {...base,fresh:false};
 const left=Math.max(0,Math.min(duration[phase.kind],remainingMs));
 return {...base,session:{hackId:session.hackId,actorSeatId:session.actorSeatId,targetSeatId:session.targetSeatId},
  remainingMs:left,elapsedMs:duration[phase.kind]-left,inTime:left>0};
}

/** Public paint decisions only. `event` requests reviewed art; it cannot advance gameplay. */
export function createCapsuleLifecycle() {
 let previous=null,liveConversation=null;
 return {
  update(frame,{reduced=false}={}) {
   let event=null;
   const active=frame.enabled&&frame.fresh&&frame.foreground&&!frame.terminal;
   const changed=previous?.session&&frame.session&&!samePair(previous.session,frame.session);
   if(!active||changed)liveConversation=null;
   if(active&&frame.session&&frame.stage==='HACK_RESULT'&&frame.inTime
    &&previous?.fresh&&previous.foreground&&previous.stage==='HACK_DECLARE'
    &&samePair(previous.session,frame.session))event={kind:reduced?'settle-entry':'enter',session:frame.session,phaseId:frame.phaseId,elapsedMs:frame.elapsedMs};
   if(active&&frame.session&&frame.stage==='HACK')liveConversation=frame.session;
   // An expired trusted deadline does not invent a new phase. Keep the current static
   // public stage until the next authoritative view; private concealment is independent.
   if(active&&!frame.session&&liveConversation&&previous?.phaseId!==frame.phaseId) {
    event={kind:reduced?'settle-exit':'exit',session:liveConversation,phaseId:frame.phaseId};liveConversation=null;
   }
   const inside=frame.session&&['HACK_RESULT','HACK'].includes(frame.stage);
   const plan={session:frame.session,placement:inside?'capsule':'world',event,
    idle:active&&frame.stage==='HACK'&&frame.inTime&&!reduced,
    cancel:!active||Boolean(changed)||previous?.phaseId!==frame.phaseId};
   previous=frame;return plan;
  },
  dispose(){previous=null;liveConversation=null;},
 };
}

/** Move the offered seat's existing control with its art; never manufacture an offer. */
export function capsuleTargetChoices(choices,session) {
 if(!session)return [];
 return choices.filter(choice=>choice.value===session.actorSeatId||choice.value===session.targetSeatId);
}

/** Call during exit/settle, including each animation tick; no departure coordinates cached. */
export function capsuleReturnTargets(session,resolveCurrentSeat) {
 return [session.actorSeatId,session.targetSeatId].map(seatId=>({seatId,current:resolveCurrentSeat(seatId)}));
}
