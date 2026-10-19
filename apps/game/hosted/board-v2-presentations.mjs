// Consumer lifecycle over validated public occurrences and explicit own-private facts.
// Drawing state is disposable. It never allocates placement, advances a phase or sends a command.
import {validClinicalAnchorForPlayerCount,supportsHospitalFour,HOSPITAL_FOUR_ASSET_MANIFEST_VERSION} from '@mothership/contracts';
import {filmBerth,rescueFrame,rescueEnd,flatlineFrame,flatlineEnd,criticalFrame} from './board-v2-drawing/medical-film.mjs';
import {fourFilmBerth,fourRescueFrame} from './board-v2-drawing/medical-four.mjs';
import {releaseFrame,releaseEnd,ejectFrame,ejectEnd} from './board-v2-drawing/captain-film.mjs';
import {overflowFrame,overflowEnd} from './board-v2-drawing/overflow-film.mjs';
import {cloneFilmFor,cloneCard,cloneFrame,cloneEnd} from './board-v2-drawing/clone-film.mjs';

const clone=value=>value==null?null:structuredClone(value);
const seatKey=seat=>seat?JSON.stringify([seat.location,seat.slotId,seat.health,seat.jailed,seat.captain]):null;
const clinicalTypes=new Set(['INJURY','HEALED','DEATH']);
export const supportsCompleteDrawings=versions=>Boolean(versions&&supportsHospitalFour(versions)&&versions.assetManifestVersion===HOSPITAL_FOUR_ASSET_MANIFEST_VERSION);

/** Strict anchor validation precedes optional drawing. A valid HV5+ has no physical four-bed berth. */
export function clinicalDrawingChoice(anchor,playerCount,seats,subject,{four=false}={}){
 if(!validClinicalAnchorForPlayerCount(anchor,playerCount))throw Error('Invalid clinical presentation anchor');
 // The helper's identity is explicit, including retained bodies. Raw wire seats are never passed through.
 const normalized=seats.map(seat=>({seat:seat.seatId,slotId:seat.slotId}));
 if(four&&Number(anchor.anchorId.slice(2))>4)return {berth:null,plays:false,holder:null,reason:'no-physical-berth'};
 const result=four?fourFilmBerth(anchor,normalized,subject):filmBerth(anchor,playerCount,normalized,subject);
 return {...result,reason:result.plays?null:'held-by-another-seat'};
}

/** Only authorized facts enter here. Each occurrence's words are independent of optional imagery. */
export function outcomeWords(event){
 const f=event.fact;
 const who='seatId'in f?`Player ${f.seatId.slice(5)}`:f.seatIds.map(id=>`Player ${id.slice(5)}`).join(', ');
 switch(f.type){
  case 'MEDICAL_OUTCOME':return `${who}: ${f.kind==='INJURY'?'Injured':f.kind==='HEALED'?'Healed':'Eliminated'}.`;
  case 'CAPTAIN_OUTCOME':return `${who}: ${f.kind==='RELEASE'?'released from detention':'ejected'}.`;
  case 'BOARD_PLACEMENT_CHANGED':return `${who}: ${f.location??'off board'}.`;
  case 'HOSPITAL_OVERFLOW_REMOVED':return `${who}: Hospital full; permanently eliminated and removed from the board.`;
  case 'ATTACK_BLOCKED':return `Attack blocked on ${who}.`;
  default:throw Error('Unsupported authorized outcome fact');
 }
}

export function createBoardV2Presentations({now=()=>performance.now()}={}){
 let matchKey=null,previous=null,current=null,previousLive=false,reduced=false,receivedAt=0,privateBefore=null,privateMoving=null,privatePending=null,privateCurrent=null;
 const seen=new Set(),active=new Map(),heldBefore=new Map();
 const elapsed=entry=>Math.max(0,now()-entry.startedAt+entry.age);
 const serverNow=()=>current?.clock?.nowMs==null?null:current.clock.nowMs+Math.max(0,now()-receivedAt);
 function cancel(){active.clear();privateMoving=null;privatePending=null;privateBefore=null;privateCurrent=null;previousLive=false;}
 function add(event,before,seats){
  const f=event.fact,subject='seatId'in f?seats.find(s=>s.seatId===f.seatId):null;
  const origin=id=>clone(before?.find(s=>s.seatId===id));
  let entry=null;
  if(f.type==='MEDICAL_OUTCOME'){
   if(!clinicalTypes.has(f.kind)||!subject)return;
   for(const[id,old]of active)if(old.kind==='medical'&&old.subjectId===f.seatId)active.delete(id);
   const anchor=event.presentationAnchor??f.presentationAnchor;
   // Admission follows the current physical bed. Its separately validated clinical
   // anchor may be HV5+ or refer to a bed retained by a different subject.
   let selection=null;
   if(f.kind==='INJURY'){
    if(!validClinicalAnchorForPlayerCount(anchor,current.playerCount))throw Error('Invalid clinical presentation anchor');
    if(subject.health!=='Injured'||subject.location!=='Hospital')return;
   }else{
    selection=clinicalDrawingChoice(anchor,current.playerCount,seats,f.seatId,{four:current.four});
    if(!selection.plays)return;
   }
   if(f.kind==='HEALED'&&subject.health!=='Healthy'||f.kind==='DEATH'&&subject.health!=='Eliminated')return;
   const berth=f.kind==='INJURY'?subject.slotId:selection.berth;
   if(!berth||current.four&&!/^H[1-4]$/.test(berth))return;
   // Preserve all facts/narration, but only the latest optional subject drawing.
   entry={kind:'medical',clinical:f.kind,subjectId:f.seatId,berth,subject:clone(subject),origin:origin(f.seatId),expected:seatKey(subject)};
  }else if(f.type==='CAPTAIN_OUTCOME'){
   const subjects=f.seatIds.map(id=>({seatId:id,before:origin(id),after:clone(seats.find(s=>s.seatId===id)),body:origin(id)?.health==='Eliminated'}));
   entry={kind:'captain',command:f.kind,subjects,placements:JSON.stringify(seats.map(s=>[s.seatId,seatKey(s)])),captain:clone(before?.find(s=>s.captain&&s.location==='Command Room'))};
  }else if(f.type==='HOSPITAL_OVERFLOW_REMOVED'){
   if(!current.four||subject?.health!=='Eliminated'||subject.location!==null||subject.slotId!==null)return;
   entry={kind:'overflow',subjectId:f.seatId,subject:clone(subject),origin:origin(f.seatId),placements:JSON.stringify(seats.map(s=>[s.seatId,seatKey(s)]))};
  }
  if(entry)active.set(event.eventId,{...entry,event:clone(event),startedAt:now(),age:Math.max(0,(current.clock.nowMs??event.publishedAt)-event.publishedAt)});
 }
 return {
  update({board,versions,events=[],visible=true,focused=true,privateOpen=false,ownClone=null,blackout=false,enabled=true,reducedMotion=false}={}){
   const nextKey=board?.matchId??board?.clock?.phaseId??null;
   if(nextKey!==matchKey){cancel();seen.clear();heldBefore.clear();previous=null;matchKey=nextKey;}
   const fresh=Boolean(enabled&&supportsCompleteDrawings(versions)&&board?.clock?.current&&visible&&focused);
   const live=fresh&&!blackout&&!['FINISHED','ABORTED'].includes(board?.clock?.kind);
   const nextReduced=Boolean(reducedMotion);
   const motionChanged=nextReduced!==reduced;
   if(motionChanged){active.clear();privateMoving=null;privatePending=null;}reduced=nextReduced;
   const seats=board?.seats??[];
   if(board&&previous?.viewRevision!==board.viewRevision){heldBefore.set(board.viewRevision,clone(previous?.seats));while(heldBefore.size>4)heldBefore.delete(heldBefore.keys().next().value);}
   const before=heldBefore.get(board?.viewRevision)??null;
   current=board?{...board,four:supportsHospitalFour(versions)}:null;receivedAt=now();
   if(!live)cancel();
   if(live&&previousLive){
    for(const[id,entry]of active){
     if(entry.kind==='medical'){
      const seat=seats.find(s=>s.seatId===entry.subjectId);
      const holder=seats.find(s=>s.slotId===entry.berth&&s.seatId!==entry.subjectId);
      if(seatKey(seat)!==entry.expected||holder)active.delete(id);
     }else if(entry.placements!==JSON.stringify(seats.map(s=>[s.seatId,seatKey(s)])))active.delete(id);
    }
   }
   for(const event of events){
    if(seen.has(event.eventId))continue;seen.add(event.eventId);
    if(!live||!previousLive||event.viewRevision!==board.viewRevision||event.expiresAt<=(board.clock.nowMs??Infinity))continue;
    add(event,before,seats);
   }
   const trustedOwn=live&&ownClone&&!ownClone.eliminated&&!ownClone.matchEnded?clone(ownClone):null;
   privateCurrent=privateOpen?trustedOwn:null;
   if(!trustedOwn){privateBefore=null;privateMoving=null;privatePending=null;}
   else{
    const same=privateBefore?.seatId===trustedOwn.seatId&&JSON.stringify(privateBefore.status)===JSON.stringify(trustedOwn.status);
    if(!same){
     privateMoving=null;privatePending=null;
     const film=cloneFilmFor({before:privateBefore?.seatId===trustedOwn.seatId?privateBefore.status:null,after:trustedOwn.status,live:previousLive&&!motionChanged,eliminated:trustedOwn.eliminated,matchEnded:trustedOwn.matchEnded});
     if(film)privatePending={film};
    }
    // Closing a playing card cancels that film. A live change first observed
    // with the card closed instead waits for its first foreground, without a clock.
    if(!privateOpen)privateMoving=null;
    else if(privatePending){privateMoving={film:privatePending.film,startedAt:now()};privatePending=null;}
    privateBefore=clone(trustedOwn);
   }
   previous=board?{viewRevision:board.viewRevision,seats:clone(seats)}:null;previousLive=fresh&&!['FINISHED','ABORTED'].includes(board?.clock?.kind);
   return this.sample();
  },
  sample(){
   const items=[];
   for(const[id,entry]of active){
    const t=elapsed(entry);let frame,end;
    if(entry.kind==='medical'){
     end=entry.clinical==='HEALED'?rescueEnd(reduced):entry.clinical==='DEATH'?flatlineEnd(reduced):400;
     frame=entry.clinical==='HEALED'?(current.four?fourRescueFrame(t,entry.berth,{reduced}):rescueFrame(t,entry.berth,{reduced}))
      :entry.clinical==='DEATH'?flatlineFrame(t,{reduced}):criticalFrame(t,{reduced,entryT:t});
    }else if(entry.kind==='captain'){
     end=entry.command==='RELEASE'?releaseEnd(reduced):ejectEnd(reduced);
     frame=entry.command==='RELEASE'?releaseFrame(t,{reduced,count:entry.subjects.length}):ejectFrame(t,{reduced,subjects:entry.subjects});
    }else{end=overflowEnd(reduced);frame=overflowFrame(t,{reduced});}
    if(t>=end||frame.done||entry.event.expiresAt<=(serverNow()??Infinity)){active.delete(id);continue;}
    items.push({...entry,t,frame,reduced});
   }
   let own=null;
   if(privateCurrent){
    const state=cloneCard({status:privateCurrent.status,eliminated:privateCurrent.eliminated});
    if(state){
     const moving=privateMoving,t=moving?Math.max(0,now()-moving.startedAt):0;
     if(moving&&t>=cloneEnd(moving.film,reduced))privateMoving=null;
     own={...privateCurrent,state,film:privateMoving?.film??null,t,frame:privateMoving?cloneFrame(privateMoving.film,t,{reduced}):null,reduced};
    }
   }
   return {items,own,reduced,animate:items.length>0||Boolean(own?.film)};
  },
  settle(){cancel();privateCurrent=null;},
  dispose(){cancel();privateCurrent=null;current=null;previous=null;matchKey=null;seen.clear();heldBefore.clear();},
 };
}
