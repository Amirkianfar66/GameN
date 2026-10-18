// Native clock adapter for Claude S1. A phase receipt starts lights returning;
// interpolation never ends a window, extends selection or asks the server to wait.
import {blackoutFrame,BLACKOUT} from './board-v2-drawing/blackout-film.mjs';
export function createBoardV2Blackout({now=()=>performance.now()}={}) {
 let clock=null,snapshot=null,previous=null,returning=null,received=0,reduced=false,live=false,settled=true;
 function elapsed(){if(!clock||clock.nowMs===null)return BLACKOUT.previewMs;
  return clock.nowMs-(snapshot?.startedAt??returning?.startedAt??clock.startedAt)+(live&&!settled?Math.max(0,now()-received):0);}
 return {
  update(nextClock,blackout,{visible=true,reducedMotion=false}={}){
   const nextLive=Boolean(nextClock?.current&&visible),changed=previous?.phaseId!==nextClock?.phaseId;
   if(blackout&&nextClock?.kind==='BLACKOUT'){
    snapshot={...blackout,startedAt:nextClock.startedAt,endsAt:nextClock.endsAt};returning=null;
    settled=!nextLive||reducedMotion;
   }else if(changed&&snapshot&&previous?.kind==='BLACKOUT'){
    returning=nextLive&&live?{...snapshot,outcomeAt:snapshot.endsAt-snapshot.startedAt}:null;snapshot=null;
    settled=!returning||reducedMotion;
   }
   clock=nextClock;received=now();live=nextLive;reduced=reducedMotion;previous=nextClock;
  },
  sample(){
   const active=snapshot??returning;if(!active||!clock)return null;
   if(snapshot){const t=live?elapsed():Math.max(BLACKOUT.previewMs,elapsed());
    const film=blackoutFrame(t,{windowId:active.snapshotId,reduced});
    return {snapshotId:active.snapshotId,film,dark:film.people==='gone',animate:live&&!settled&&t<BLACKOUT.windowMs+BLACKOUT.holdCapMs+BLACKOUT.markersOut[1]};}
   if(settled){returning=null;return null;}
   const film=blackoutFrame(elapsed(),{windowId:active.snapshotId,outcomeAt:active.outcomeAt,reduced});
   if(elapsed()>=active.outcomeAt+BLACKOUT.markersOut[1]){returning=null;return null;}
   return {snapshotId:active.snapshotId,film,dark:film.people==='gone',animate:live&&!settled};
  },
  settle(){settled=true;returning=null;},
  dispose(){clock=null;snapshot=null;previous=null;returning=null;live=false;settled=true;},
 };
}
