// #231's participant words/instruments from an authorized Food view. Geometry
// guides describe the picture; only controller offers enable a command.
import {FOOD_TASK_PARAMETERS as P} from '@mothership/contracts';
import {foodPanelAt,foodCrateAt} from '@mothership/presentation';

const say=(tone,icon,text)=>({tone,icon,text});
export function foodDisplay(model,now,{reduced=false,names=()=>''}={}) {
 const task=model.view?.participantTask;if(!task)return null;
 const role=task.selfControl==='WINCH'?'winch':'panel',partnerRole=role==='winch'?'panel':'winch';
 const own=task.people.find(p=>p.seatId===model.view.seatId),partner=task.people.find(p=>p.seatId!==model.view.seatId);
 const p=foodPanelAt(task.panel,now,reduced),physical=foodCrateAt(task,now,reduced),c=task.crate;
 const target=c.state==='FALLING'?c.motion?.toHeight:null;
 const state=c.state==='LANDED'||target===.36?'landed':c.state==='SENT'?'sent':c.state==='INTAKE'||target===0?'intake':'hanging';
 const settled=c.motion===null||now>=c.motion.endsAt;
 const phase=task.stage==='BRIEFING'?'briefing':task.stage==='ENDED'?'ended':'running';
 const active=phase==='running'&&now<task.deadlineAt;
 const at=(t)=>({p:foodPanelAt(task.panel,t),c:foodCrateAt(task,t)});
 const zone=(sample)=>Math.abs(sample.c.x-4)<=P.consoleHalfWidth?'console':Math.abs(sample.c.x-5)<=P.platformHalfWidth?'platform':Math.abs(sample.c.x)<=P.intakeHalfWidth?'intake':'deck';
 const regions=[];
 if(active&&settled&&c.holder==='WINCH')for(let dt=0;dt<=P.warningMs;dt+=10){const sample=at(now+dt);regions.push({zone:zone(sample),locked:sample.p.locked,stop:sample.p.stop});}
 const ahead=foodPanelAt(task.panel,now+P.warningMs);
 const window=task.panel.warning,explicit=active&&window&&now>=window.startsAt&&now<window.endsAt;
 const cut=active&&task.people.find(x=>x.seatId===task.winchSeatId)?.alive&&!p.locked&&(p.stop===6||ahead.stop===6)||explicit&&window.mechanism==='CUT';
 const drop=active&&partner!==undefined&&task.people.find(x=>x.seatId===task.panelSeatId)?.alive&&regions.some(r=>r.zone==='console')||explicit&&window.mechanism==='DROP';
 const steady=regions.length>0&&regions.every(r=>r.zone==='platform'&&r.locked);
 const currentZone=regions.length?zone(at(now)):null;
 const later=regions.at(-1),fall=later?later.zone==='console'?'drop':later.zone==='intake'?'back':later.zone==='platform'&&later.locked?'land':'break':null;
 const warnings=[];
 if(cut)warnings.push(role==='panel'?'panel-at-partner-cab':'panel-at-your-cab');
 if(drop)warnings.push(role==='winch'?'crate-over-partner':'crate-over-you');
 const recent=task.events.events.filter(e=>e.at<=now&&now-e.at<1500);
 const v={task,role,partnerRole,partnerName:names(partner?.seatId),partnerSeatId:partner?.seatId,phase,
  you:own?.alive?'alive':'down',partner:!partner?.alive?'down':partner.online?'alive':'offline',offline:!model.fresh||!own?.online,
  secondsLeft:Math.max(0,Math.ceil((task.deadlineAt-now)/1000)),briefingLeft:Math.max(0,Math.ceil((task.runningAt-now)/1000)),
  panel:{...p,locked:task.panel.locked},crate:{...c,state,holder:c.holder==='WINCH'?'winch':c.holder==='BRAKE'?'brake':null,x:physical.x,settled},
  keys:{you:!!own?.keyTurned,partner:!!partner?.keyTurned},broken:task.broken.length,warnings,goal:state==='intake'?0:5,recent,
  guide:{cut:!!cut,drop:!!drop,zone:currentZone,steady,fall,leaving:!p.locked&&ahead.stop!==p.stop},buttons:[]};
 const enabled=phase==='running'&&model.fresh&&own?.alive&&own.online;
 const key=()=>({act:'key',label:own?.keyTurned?'Key turned':'Turn key',enabled:enabled&&model.canKey,next:enabled&&model.canKey,turned:!!own?.keyTurned});
 if(role==='panel'){
  const act=task.panel.locked?'release':'lock',available=act==='release'?model.canPanelRelease:model.canPanelLock;
  const next=state==='intake'?act==='release'||p.stop===0:act==='release'?p.stop!==5:p.stop===5&&!v.guide.leaving;
  const button={act,label:task.panel.locked?'RELEASE':'LOCK',enabled:enabled&&available,hazard:available&&act==='lock'&&cut,next:available&&next,stop:p.stop,leaving:act==='lock'&&v.guide.leaving};
  v.buttons=state==='landed'?[key(),button]:[button];
 }else if(state==='landed')v.buttons=[key()];
 else v.buttons=[{act:'hold',label:enabled&&c.holder==='WINCH'?'Holding':'Hold',enabled:enabled&&(model.canHold||model.physicalHolding||model.needsContactOff),
  holding:enabled&&c.holder==='WINCH',hazard:enabled&&drop,next:enabled&&(c.holder==='WINCH'?steady&&p.stop===5:state==='intake'?p.locked&&p.stop===0:true),zone:currentZone,fall}];
 v.hint=foodHint(v);return v;
}
export function foodControlSub(b,v,{sending=false}={}) {
 const partner=v.partnerName;
 if(sending)return 'Sending…';
 if(v.phase==='briefing')return 'After the briefing';
 if(v.phase==='ended')return 'The Task is over';
 if(v.you==='down')return 'You are out';
 if(!b.enabled&&v.offline)return 'Reconnecting…';
 if(b.act==='key')return b.turned?'Waiting for the other key':'Sends the crate down';
 if(b.act==='release'){
  if(b.enabled)return 'Starts the panel clicking';
  if(v.crate.state==='hanging')return 'Wait: the crate is rising';
  return v.crate.settled?`${partner} lifts it first`:'Wait: a new crate';
 }
 if(b.act==='lock'){
  if(b.hazard)return b.stop===6?`At 7: ${partner}'s cab`:`Moving on to ${partner}'s cab`;
  if(b.stop===v.goal)return b.leaving?`Leaving ${v.goal+1}`:v.goal===0?'At 1: the hatch':'At 6: the platform';
  return b.stop===4?'At 5: over you':`At ${b.stop+1}`;
 }
 if(!b.enabled)return v.crate.state==='intake'&&v.crate.settled?'Wait for the hook at 1':'Wait: a new crate';
 if(!b.holding)return v.crate.state==='hanging'?'Hold to take it back':'Press and hold to lift';
 if(!v.crate.settled)return 'Lifting: keep holding';
 if(b.hazard)return `Let go: falls on ${partner}`;
 if(b.next)return 'Let go now: it lands';
 return {land:'Let go: it lands',back:'Let go: back in the hatch',drop:`Let go: falls on ${partner}`,break:'Keep holding: it breaks'}[b.fall]??'Keep holding';
}
function foodHint(v){
 const partner=v.partnerName,c=v.crate,p=v.panel,recent=v.recent;
 if(v.phase==='briefing')return say('quiet','timer',`The controls work in ${v.briefingLeft} s.`);
 if(v.phase==='ended')return say('quiet','info','The Task is over.');
 if(v.you==='down')return say('quiet','eliminated','You are out.');
 if(v.warnings.includes('panel-at-partner-cab'))return say('hazard','warning',p.stop===6?`LOCK here cuts ${partner}.`:`Too late for 6: LOCK may cut ${partner}.`);
 if(v.warnings.includes('panel-at-your-cab'))return say('hazard','warning',p.stop===6?'The panel is over your cab.':'The panel is moving to your cab.');
 if(v.warnings.includes('crate-over-partner'))return say('hazard','warning',`Don't let go: it falls on ${partner}.`);
 if(v.warnings.includes('crate-over-you'))return say('hazard','warning','The crate is over you.');
 const stopped=recent.find(e=>e.kind==='STOPPED');
 if(stopped)return say('quiet','block',stopped.mechanism==='CUT'?"Stopped: the cab's buffer held.":'Stopped: the winch brake held.');
 if(v.partner==='offline')return say('quiet','offline',`${partner} is offline. The Task goes on.`);
 if(c.state==='landed'){
  if(v.keys.you)return say('quiet','key',`Key turned. Waiting for ${partner}.`);
  return v.partner==='down'?say('next','key',`${partner} is out. Turn your key alone.`):say('next','key','Landed. Turn your key.');
 }
 const broke=recent.some(e=>e.kind==='BROKEN'),back=recent.some(e=>e.kind==='RETURNED_TO_INTAKE'),home=p.locked&&p.stop===0;
 if(v.role==='panel'){
  if(c.state==='intake'){
   if(!c.settled)return say('quiet','hourglass',broke?'It broke. A new crate comes up.':'Wait: a new crate.');
   if(home)return say('quiet','hourglass',back?`Back in the hatch. ${partner} holds again.`:`Wait: ${partner} lifts the crate.`);
   if(!p.locked)return say('next','lock','Lock it over the hatch, at 1.');
   return say('next','release',broke?'Broken. Fetch a new one at 1.':'Release: fetch the crate at 1.');
  }
  if(c.holder!=='winch')return say('quiet','hourglass',`Wait: ${partner} takes it back.`);
  if(!c.settled)return say('quiet','hourglass','Wait: the crate is rising.');
  if(!p.locked)return say('next','lock','Lock it over the platform, at 6.');
  if(p.stop===5)return say('quiet','hourglass',`Locked. ${partner} lets go over it.`);
  if(p.stop===4)return say('caution','release','Locked over you. Release it.');
  if(p.stop===0)return say('next','release','Release the panel.');
  return say('next','release',`Locked at ${p.stop+1}. Release and try again.`);
 }
 if(c.state==='intake'){
  if(!c.settled)return say('quiet','hourglass',broke?'It broke. A new crate comes up.':'Back in the hatch.');
  if(home)return say('next','move',broke?'Hold to lift the new crate.':back?'Hold again to lift it.':'Press and hold to lift it.');
  return say('quiet','hourglass',broke?`Broken. ${partner} fetches a new one.`:`Wait: ${partner} brings the hook.`);
 }
 if(c.holder!=='winch')return say('next','move','Hold again to take it back.');
 if(!c.settled)return say('quiet','hourglass','Lifting… keep holding.');
 if(v.buttons.find(b=>b.act==='hold')?.next)return say('next','move','Let go now: over the platform.');
 if(p.locked&&p.stop===5)return say('caution','hourglass','Keep holding: wait for the swing.');
 return say('quiet','hourglass',`Keep holding. ${partner} moves it.`);
}
