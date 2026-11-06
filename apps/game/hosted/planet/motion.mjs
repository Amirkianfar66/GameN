// Planet occurrence lifecycle over genuine protocol-3 facts. The frozen ports below only draw.
import {PlanetVersionsSchema,PlanetEventSchema,validClinicalAnchorForPlayerCount} from '@mothership/contracts';
import {blockedEnd,blockedFrame} from '../board-v2-drawing/blocked-film.mjs';
import {criticalFrame,rescueEnd,flatlineFrame,flatlineEnd} from '../board-v2-drawing/medical-film.mjs';
import {fourRescueFrame,fourFilmBerth} from '../board-v2-drawing/medical-four.mjs';
import {releaseFrame,releaseEnd,ejectFrame,ejectEnd} from '../board-v2-drawing/captain-film.mjs';
import {overflowFrame,overflowEnd} from '../board-v2-drawing/overflow-film.mjs';
import {cloneCard,cloneFrame,cloneEnd,cloneFilmFor} from '../board-v2-drawing/clone-film.mjs';

const placement=seat=>JSON.stringify([seat?.health,seat?.location,seat?.slotId,seat?.jailed]);
const clone=value=>value==null?null:structuredClone(value);
export function planetOutcomeWords(event){
 const people=event.seatIds.map(id=>`Player ${id.slice(5)}`).join(', ');
 switch(event.kind){
  case 'BLACKHOLE_SYNCED':return 'BLACKHOLE — ship synchronized.';
  case 'MOVEMENT_COMPLETED':return 'Ship movement completed.';
  case 'CAPTAIN_RELEASE':return `${people}: released from physical Jail.`;
  case 'CAPTAIN_EJECT':return `${people}: ejected.`;
  case 'INJURED':return `${people}: Injured.`;
  case 'RESCUED':return `${people}: healed.`;
  case 'ELIMINATED':return `${people}: Eliminated.`;
  case 'HOSPITAL_OVERFLOW_REMOVED':return `${people}: Hospital full; permanently Eliminated and off board.`;
  case 'ATTACK_BLOCKED':return `Attack blocked on ${people}.`;
  case 'BLACKOUT_HIT':return `${people}: Blackout impact.`;
  case 'PLACEMENT_CHANGED':return `${people}: placement updated.`;
  default:return '';
 }
}
export function createPlanetMotion({now=()=>performance.now(),transitDurationMs=0}={}){
 let previous=null,liveBefore=false,model=null,received=0,reduced=false,cloneBefore=null,cloneMoving=null,privateWasOpen=false;
 const seen=new Set(),active=new Map();
 const clear=()=>{active.clear();cloneMoving=null;liveBefore=false;};
 function update(next,{reducedMotion=false,visible=true,focused=true}={}){
  if(next?.matchId!==model?.matchId){seen.clear();previous=null;cloneBefore=null;clear();}
  const addressed=!!next&&PlanetVersionsSchema.safeParse(next.versions).success&&next.versions.assetManifestVersion==='design-0.5.0'&&next.connection==='live'&&!next.concealed&&visible&&focused;
  const current=addressed&&next.presentation!==null&&next.phase?.trusted&&!next.phase.expired&&!next.dark&&!['FINISHED','ABORTED'].includes(next.phase.kind);
  const stage=next?.phase?.kind==='BLACKHOLE_PRESENTATION';
  const leavingBlackout=model?.phase?.kind==='BLACKOUT'&&next?.phase?.kind!=='BLACKOUT';
  const motionChanged=reduced!==reducedMotion;if(motionChanged)clear();reduced=reducedMotion;
  if(!current||stage){active.clear();cloneMoving=null;}
  const seats=next?.board?.seats??[];
  if(current&&liveBefore){
   for(const [id,entry]of active){
    if(entry.expected!==JSON.stringify(seats.map(s=>[s.seatId,placement(s)])))active.delete(id);
   }
  }
  for(const event of next?.presentation?.events??[]){
   if(seen.has(event.id))continue;seen.add(event.id);
   const parsed=PlanetEventSchema.safeParse(event);
   if(!parsed.success||!current||stage||!liveBefore||motionChanged||event.phaseId!==next.phase.id||event.viewRevision!==next.revision||event.round!==next.round||event.publishedAt>next.presentation.nowMs||event.expiresAt<=next.presentation.nowMs)continue;
   if(event.audience.kind==='player'&&(next.surface!=='player'||event.audience.seatId!==next.ownSeatId))continue;
   const subject=seats.find(s=>s.seatId===event.seatIds[0]),origin=previous?.find(s=>s.seatId===event.seatIds[0]);
   const base={event:{eventId:event.id},occurrence:clone(event),expected:JSON.stringify(seats.map(s=>[s.seatId,placement(s)])),age:next.presentation.nowMs-event.publishedAt,startedAt:now()+(leavingBlackout&&event.kind==='ATTACK_BLOCKED'?(reduced?80:520):0)};
   let entry=null;
   if(['INJURED','RESCUED','ELIMINATED'].includes(event.kind)&&event.seatIds.length===1&&subject){
    const anchor=event.clinicalAnchor;
    if(!anchor||!validClinicalAnchorForPlayerCount(anchor,seats.length))continue;
    const selection=event.kind==='INJURED'?null:fourFilmBerth(anchor,seats.map(s=>({seat:s.seatId,slotId:s.slotId})),subject.seatId);
    if(selection&&!selection.plays)continue;
    const berth=event.kind==='INJURED'?subject.slotId:selection.berth;
    if(!/^H[1-4]$/.test(berth??'')||seats.some(s=>s.slotId===berth&&s.seatId!==subject.seatId))continue;
    if(event.kind==='INJURED'&&(subject.health!=='Injured'||subject.location!=='Hospital'))continue;
    if(event.kind==='RESCUED'&&(subject.health!=='Healthy'||!['Room A','Room B','Jail'].includes(subject.location))||event.kind==='ELIMINATED'&&subject.health!=='Eliminated')continue;
    entry={...base,kind:'medical',clinical:{INJURED:'INJURY',RESCUED:'HEALED',ELIMINATED:'DEATH'}[event.kind],subjectId:subject.seatId,subject:clone(subject),origin:clone(origin),berth};
   }else if(['CAPTAIN_RELEASE','CAPTAIN_EJECT'].includes(event.kind)){
    const subjects=event.seatIds.map(id=>({seatId:id,before:clone(previous?.find(s=>s.seatId===id)),after:clone(seats.find(s=>s.seatId===id)),body:previous?.find(s=>s.seatId===id)?.health==='Eliminated'}));
    if(subjects.some(s=>s.before?.location!=='Jail'))continue;
    entry={...base,kind:'captain',command:event.kind==='CAPTAIN_RELEASE'?'RELEASE':'EJECT',subjects,captain:clone(previous?.find(s=>s.seatId===event.actorSeatId))};
   }else if(event.kind==='HOSPITAL_OVERFLOW_REMOVED'&&subject?.health==='Eliminated'&&subject.location===null&&subject.slotId===null){
    entry={...base,kind:'overflow',subjectId:subject.seatId,subject:clone(subject),origin:clone(origin)};
   }else if(event.kind==='BLACKHOLE_SYNCED')entry={...base,kind:'blackhole'};
   else if(event.kind==='MOVEMENT_COMPLETED'&&event.audience.kind==='public'&&transitDurationMs>0)entry={...base,kind:'transit'};
   else if(event.kind==='ATTACK_BLOCKED'&&subject?.location===event.location&&subject?.slotId===event.slotId)entry={...base,kind:'blocked',subjectId:subject.seatId};
   if(entry)active.set(event.id,entry);
  }
  const own=current&&next.presentation?.clone&&next.board?.seats.find(s=>s.seatId===next.ownSeatId)?.health!=='Eliminated'&&!['FINISHED','ABORTED'].includes(next.phase.kind)?next.presentation.clone:null;
  const open=next?.panel==='card';
  // Card closure, concealment and motion changes cancel without deferring a historical film.
  if(!open||!current||motionChanged)cloneMoving=null;
  if(own&&open&&privateWasOpen&&liveBefore&&!motionChanged&&!stage){
   const kind=cloneFilmFor({before:cloneBefore,after:own,live:true});if(kind)cloneMoving={kind,start:now()};
  }
  cloneBefore=clone(own);privateWasOpen=open;previous=clone(seats);liveBefore=addressed&&!['FINISHED','ABORTED'].includes(next?.phase?.kind);model=next;received=now();
  return sample();
 }
 function sample(){
  const items=[],special=[],serverNow=model?.presentation?.nowMs==null?Infinity:model.presentation.nowMs+Math.max(0,now()-received);
  for(const [id,entry]of active){
   const t=entry.age+now()-entry.startedAt;let frame,end;if(t<0)continue;
   if(entry.kind==='medical'){
    end=entry.clinical==='HEALED'?rescueEnd(reduced):entry.clinical==='DEATH'?flatlineEnd(reduced):400;
    frame=entry.clinical==='HEALED'?fourRescueFrame(t,entry.berth,{reduced}):entry.clinical==='DEATH'?flatlineFrame(t,{reduced}):criticalFrame(t,{reduced,entryT:t});
   }else if(entry.kind==='captain'){
    end=entry.command==='RELEASE'?releaseEnd(reduced):ejectEnd(reduced);
    frame=entry.command==='RELEASE'?releaseFrame(t,{reduced,count:entry.subjects.length}):ejectFrame(t,{reduced,subjects:entry.subjects});
   }else if(entry.kind==='overflow'){end=overflowEnd(reduced);frame=overflowFrame(t,{reduced});}
   else end=entry.kind==='blocked'?blockedEnd(reduced):entry.kind==='transit'?(reduced?160:transitDurationMs):reduced?1000:1600;
   if(t>=end||entry.occurrence.expiresAt<=serverNow||frame?.done){active.delete(id);continue;}
   if(frame)items.push({...entry,t,frame,reduced});else special.push({...entry,t,reduced,...(entry.kind==='blocked'?{blockFrame:blockedFrame(t,{reduced})}:{})});
  }
  let own=null;const status=model?.presentation?.clone;
  if(model?.panel==='card'&&status){
   const state=cloneCard({status});if(state){let t=cloneMoving?Math.max(0,now()-cloneMoving.start):0;if(cloneMoving&&t>=cloneEnd(cloneMoving.kind,reduced))cloneMoving=null;
    own={seatId:model.ownSeatId,status,state,film:cloneMoving?.kind??null,t,frame:cloneMoving?cloneFrame(cloneMoving.kind,t,{reduced}):null,reduced};}
  }
  return {items,special,own,reduced,nowMs:serverNow,animate:active.size>0||cloneMoving!==null};
 }
 return {update,sample,cancel(){clear();cloneBefore=null;privateWasOpen=false;},dispose(){clear();seen.clear();model=null;previous=null;cloneBefore=null;}};
}

/** A newly published outcome or terminal state settles optional capsule return motion. */
export function planetOutcomeTakesPrecedence(model){
 if(model?.phase?.kind==='BLACKHOLE_PRESENTATION')return true;
 if(model?.result||['FINISHED','ABORTED'].includes(model?.phase?.kind))return true;
 if(!model?.presentation||model.connection!=='live'||model.concealed||model.phase?.expired)return false;
 return model.presentation.events.some(event=>event.phaseId===model.phase.id&&event.viewRevision===model.revision&&event.round===model.round&&event.publishedAt<=model.presentation.nowMs&&event.expiresAt>model.presentation.nowMs);
}
