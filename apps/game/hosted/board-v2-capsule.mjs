// Owned public-clock adapter over the exact Claude capsule film. No command, private claim,
// departure address or local phase transition is stored here.
import {capsuleFrame,CAPSULE_FILM} from './board-v2-drawing/capsule-film.mjs';
const stages={HACK_DECLARE:'declare',HACK_RESULT:'result',HACK:'talk'};
const pair=s=>s&&[s.actorSeatId,s.targetSeatId].sort((a,b)=>Number(a.slice(5))-Number(b.slice(5)));
const same=(a,b)=>a&&b&&a.hackId===b.hackId&&a.actorSeatId===b.actorSeatId&&a.targetSeatId===b.targetSeatId;

export function createBoardV2Capsule({now=()=>performance.now()}={}) {
 let previous=null,previousLive=false,entry=null,exit=null,current=null,clock=null,sampledAt=0,foreground=true,reduced=false;
 return {
  update(session,phaseClock,{visible=true,reducedMotion=false}={}) {
   const fresh=phaseClock?.current===true;
   const usable=fresh&&visible&&!['FINISHED','ABORTED'].includes(phaseClock.kind);
   if(!usable||reducedMotion||!same(session,previous)&&session?.hackId!==previous?.hackId){entry=null;exit=null;}
   if(usable&&previousLive&&!reducedMotion&&session?.stage==='HACK_RESULT'&&previous?.stage==='HACK_DECLARE'
     &&previous.current&&same(previous,session))entry=session.hackId;
   if(usable&&previousLive&&!reducedMotion&&!session&&previous?.stage==='HACK'&&previous.current
     &&phaseClock.phaseId!==previous.phaseId&&phaseClock.nowMs>=previous.endsAt)
    exit={session:previous,startedAt:previous.endsAt};
   if(session)exit=null;
   if(session?.stage!=='HACK_RESULT')entry=null;
   current=session;clock=phaseClock;sampledAt=now();foreground=visible;reduced=reducedMotion;
   previous=session;previousLive=usable;return this.sample();
  },
  sample() {
   const live=clock?.current===true&&foreground;
   const serverNow=clock?.nowMs===null||clock?.nowMs===undefined?null:clock.nowMs+(live?Math.max(0,now()-sampledAt):0);
   let session=current,stage=stages[current?.stage]??'idle',t=0,known='settled';
   if(session){t=serverNow===null?session.elapsedMs:Math.max(0,Math.min(session.endsAt-session.startedAt,serverNow-session.startedAt));
    known=stage==='result'&&entry===session.hackId&&live&&!reduced?'live':'settled';}
   else if(exit&&live&&!reduced){
    t=Math.max(0,serverNow-exit.startedAt);
    if(t<CAPSULE_FILM.exit.endAt){session=exit.session;stage='exit';known='live';}else exit=null;
   }
   const film=capsuleFrame(stage,t,{known:{P1:known,P2:known},reduced});
   return {session,seatIds:pair(session)??[],stage,t,film,reduced,
    animate:live&&!reduced&&(stage==='result'&&known==='live'&&t<CAPSULE_FILM.entrance.settledAt
      ||stage==='talk'&&t<60000||stage==='exit')};
  },
  settle(){entry=null;exit=null;foreground=false;previousLive=false;},
  dispose(){previous=null;previousLive=false;entry=null;exit=null;current=null;clock=null;},
 };
}
