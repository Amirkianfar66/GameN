// Current drawing from accepted anchors. Cue ages use original server times:
// mounting/resuming this adapter never restarts an impact or a Task interval.
import {foodPanelAt,foodCrateAt,foodTrajectoryAt,foodClamp,foodEase} from '@mothership/presentation';
import {BLADE,BOXES,CARRIAGE,CRATE,DECK,HANG,OPERATORS,REST,stopX} from './food-geometry.mjs';
import {foodRestPose} from './food-scene.mjs';

const lerp=(a,b,u)=>a+(b-a)*u,yOf=height=>658-250*height;
export const FOOD_CUES=Object.freeze({release:90,lock:90,land:140,hookUp:300,cut:120,drop:180,stopped:320,impact:900,send:1100,warningFlash:330,dim:600});
export function foodPoseAt(task,now,{reduced=false,guide=null}={}) {
 const pose=foodRestPose(),p=foodPanelAt(task.panel,now,reduced),c=task.crate,sample=foodCrateAt(task,now,reduced);
 const px=stopX(p.at),moving=!p.locked&&!p.resting&&!reduced;
 const winch=task.people.find(x=>x.seatId===task.winchSeatId),panel=task.people.find(x=>x.seatId===task.panelSeatId);
 pose.alive={winch:winch.alive,panel:panel.alive};
 pose.panel={at:p.at,blade:task.panel.blade.state==='RAISED'?BLADE.up:task.panel.blade.state==='BUFFERED'?BLADE.caught:BLADE.locked,wheel:px/13,drum:0,lit:p.stop};
 pose.console={...pose.console,near:p.stop,locked:p.locked,key:panel.keyTurned};pose.cab.key=winch.keyTurned;pose.cab.cut=!winch.alive;
 if(task.panel.blade.state==='BUFFERED')pose.cab.buffer=1;
 if(winch.death?.mechanism==='CUT'&&p.stop===6&&p.locked)pose.panel.blade=BLADE.cut;
 const bladeAge=now-task.panel.blade.changedAt;
 if(!reduced&&bladeAge>=0&&bladeAge<FOOD_CUES.release&&task.panel.blade.state==='RAISED')pose.panel.blade=lerp(BLADE.locked,BLADE.up,foodEase('CUBIC_OUT',bladeAge/FOOD_CUES.release));
 if(!reduced&&bladeAge>=0&&bladeAge<FOOD_CUES.lock&&task.panel.blade.state==='LOWERED'&&!winch.death)pose.panel.blade=lerp(BLADE.up,BLADE.locked,foodEase('CUBIC_IN',bladeAge/FOOD_CUES.lock));
 if(p.locked&&bladeAge>=0&&bladeAge<400)pose.effects.push({kind:'clunk',at:[stopX(task.panel.blade.stop),BLADE.locked+4],dir:[0,1],t:reduced?1:foodClamp(bladeAge/180)});
 const falling=c.state==='FALLING',landTarget=falling&&c.motion?.toHeight===.36;
 const intakeHook=c.state==='INTAKE'&&p.locked&&p.stop===0;
 pose.crate={x:stopX(sample.x)-(moving&&(c.state==='HELD'||c.state==='BRAKED')?p.direction*10:0),y:yOf(sample.height),tilt:sample.tilt,
  hooked:['LIFTING','HELD','BRAKED','FALLING'].includes(c.state)||intakeHook};
 if(falling&&c.motion){pose.slack=1-sample.progress;if(!reduced)pose.crate.tilt=0;}
 else if(c.state==='INTAKE')pose.slack=.35;
 if(!pose.crate.hooked)pose.hookY=300;
 if(c.state==='BRAKED')pose.effects.push({kind:'brake',at:[px,CARRIAGE.pivot+60]});
 const landed=c.state==='LANDED'||landTarget&&(reduced||now>=c.motion.endsAt);
 if(landed){
  const at=c.state==='LANDED'?c.anchorAt:c.motion.endsAt,dt=now-at;
  pose.platform.clamp=reduced||dt>=FOOD_CUES.land;pose.platform.lamp=pose.platform.clamp;pose.crate.hooked=false;
  if(!reduced&&dt<FOOD_CUES.hookUp)pose.hookY=lerp(REST.platform-CRATE/2-6,300,foodEase('CUBIC_OUT',foodClamp(dt/FOOD_CUES.hookUp)));
 }
 if(c.state==='SENT'&&c.motion){
  const u=reduced?1:foodEase(c.motion.easing,sample.progress);pose.platform={drop:u,clamp:true,lamp:true};
  pose.crate=u<1?{x:stopX(sample.x),y:yOf(sample.height),tilt:0,hooked:false}:null;
  if(task.outcome?.kind==='DELIVERED'&&(reduced||sample.progress>.4))pose.effects.push({kind:'letters',text:'+5',at:[stopX(5),470],size:72,angle:-6,fill:'#F1B84B'});
 }
 for(const [k,b]of task.broken.entries()){
  const s=foodTrajectoryAt(b.motion,now,{reduced}),on=b.landing.toLowerCase(),floor=yOf(b.motion.toHeight)+CRATE/2;
  if(!reduced&&s.progress<1){pose.wrecks.push({whole:true,x:stopX(s.x),y:yOf(s.height),tilt:0});if(on==='console')pose.alive.panel=true;}
  else pose.wrecks.push({whole:false,x:stopX(b.motion.toX),y:floor,on,seed:300+k*17,flip:k%2===1});
 }
 for(const [role,person]of [['winch',winch],['panel',panel]])if(person.death){
  const dt=now-person.death.at,cut=person.death.mechanism==='CUT',hit=cut?FOOD_CUES.cut:FOOD_CUES.drop;
  if(dt<0)continue;
  if(cut){const u=reduced?1:foodEase('CUBIC_IN',foodClamp(dt/FOOD_CUES.cut));
   if(p.locked&&p.stop===6)pose.panel.blade=lerp(BLADE.locked,BLADE.cut,u);
   if(u<1){pose.alive.winch=true;pose.cab.cut=false;}}
  if(dt<FOOD_CUES.impact&&(reduced||dt>=hit)){
   const g=reduced?1:foodEase('CUBIC_OUT',foodClamp((dt-hit)/220));
   pose.effects.push({kind:'burst',at:cut?[stopX(6),214]:[OPERATORS.panel.feet[0],OPERATORS.panel.head+10],r:cut?80:90,t:g});
   pose.effects.push({kind:'letters',text:cut?'CHOP!':'THUD!',at:cut?[stopX(6)-150,250]:[OPERATORS.panel.feet[0]-170,OPERATORS.panel.head-40],size:cut?64:66,angle:cut?-10:-8});
  }
 }
 for(const e of task.events.events){
  const dt=now-e.at;if(dt<0)continue;
  if(e.kind==='STOPPED'){
   const cut=e.mechanism==='CUT',show=dt<(reduced?600:FOOD_CUES.stopped+500);
   if(cut&&p.locked&&p.stop===6){const u=reduced?1:foodClamp(dt/110);pose.cab.buffer=u;pose.panel.blade=lerp(BLADE.locked,BLADE.caught,u);}
   if(!cut&&!reduced&&dt<FOOD_CUES.stopped&&pose.crate?.hooked)pose.crate.y+=Math.sin(foodClamp(dt/FOOD_CUES.stopped)*Math.PI)*26;
   if(show){if(!cut)pose.effects.push({kind:'brake',at:[px,CARRIAGE.pivot+60]});pose.effects.push({kind:'letters',text:'CLANK!',at:[(cut?stopX(6):px)-160,cut?240:250],size:50,angle:-6});}
  }
  if(e.kind==='BROKEN'){
   const b=task.broken.find(x=>x.crateId===e.crateId);if(!b||b.landing==='CONSOLE'&&panel.death)continue;
   const after=reduced?0:b.motion.endsAt-b.motion.startedAt;if(dt<after||dt>=after+700)continue;
   const bx=stopX(b.motion.toX),floor=yOf(b.motion.toHeight)+CRATE/2,u=reduced?1:foodClamp((dt-after)/220);
   pose.effects.push({kind:'letters',text:'CRASH!',at:[Math.min(BOXES.cab[0]+60,Math.max(170,bx)),floor-118],size:50,angle:-8});
   pose.effects.push({kind:'clunk',at:[bx-70,floor-14],dir:[-1,0],t:u},{kind:'clunk',at:[bx+70,floor-14],dir:[1,0],t:u},{kind:'clunk',at:[bx,floor-62],dir:[0,-1],t:u});
  }
 }
 if(task.outcome&&task.outcome.kind!=='DELIVERED'){
  const lastDeath=Math.max(...task.people.map(x=>x.death?.at??-Infinity));
  const after=lastDeath===task.outcome.at?FOOD_CUES.impact:0,dt=now-task.outcome.at-after;
  pose.dim=reduced?dt>=0?1:0:foodClamp(dt/FOOD_CUES.dim);
 }
 if(guide){
  const on=reduced||Math.floor(now/FOOD_CUES.warningFlash)%2===0;
  pose.cab.lamp=guide.cut&&on;pose.console.lamp=guide.drop&&on;
  if(guide.cut)pose.effects.push({kind:'warn',at:[stopX(6)-96,196],t:1});
  if(guide.zone&&p.locked&&pose.crate){const to={platform:BOXES.platform[1]-8,console:OPERATORS.panel.head,intake:DECK-10,deck:DECK}[guide.zone];
   pose.line={from:[pose.crate.x,pose.crate.y+CRATE/2+6],to,tone:guide.zone};}
 }
 if(moving&&task.stage==='ACTIVE')pose.effects.push({kind:'speed',at:[px-p.direction*66,CARRIAGE.top+18],dir:[p.direction,0],len:34,spread:24,n:3});
 return pose;
}
