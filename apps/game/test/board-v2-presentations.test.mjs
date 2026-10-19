import assert from 'node:assert/strict';
import test from 'node:test';
import {HOSPITAL_FOUR_VERSION_PINS,CLONE_VERSION_PINS,FullOutcomePublicEventSchema,FullOutcomePlayerEventSchema} from '@mothership/contracts';
import {createBoardV2Presentations,clinicalDrawingChoice,outcomeWords} from '../hosted/board-v2-presentations.mjs';
const versions={...HOSPITAL_FOUR_VERSION_PINS,assetManifestVersion:'design-0.5.0'};
const anchor=(count,id='HV1')=>({kind:'CLINICAL_VIGNETTE',batchId:'clinical-batch',anchorId:id,slotCount:count});
const seat=(id,extra={})=>({seatId:`seat-${id}`,location:'Room A',slotId:`A${id}`,health:'Healthy',jailed:false,captain:false,medical:null,...extra});
function setup(count=7){
 let t=0;const director=createBoardV2Presentations({now:()=>t});
 const board={id:'board-v2-four-0.1.0',matchId:'test-match',viewRevision:1,playerCount:count,seats:Array.from({length:count},(_,i)=>seat(i+1,i>=5?{location:'Room B',slotId:`B${i-4}`}:{ })),clock:{current:true,phaseId:'turn-1',kind:'ORDINARY_TURN',nowMs:1000,startedAt:0,endsAt:60000}};
 const options={board,versions};director.update(options);
 const event=(fact,revision=board.viewRevision)=>{
  const id=`occurrence-${fact.type}-${'seatId'in fact?fact.seatId:fact.kind}`;
  const wire=FullOutcomePublicEventSchema.parse({protocolVersion:2,matchId:board.matchId,eventId:id,outcomeId:id,viewRevision:revision,versions:HOSPITAL_FOUR_VERSION_PINS,publishedAt:1000,expiresAt:31000,audience:{kind:'public'},fact:{phaseId:'checkpoint-1',round:2,...fact}});
  return {...wire,presentationAnchor:wire.fact.type==='MEDICAL_OUTCOME'?wire.fact.presentationAnchor:undefined};
 };
 return{director,board,options,event,advance:ms=>{t+=ms;},update:extra=>director.update({...options,...extra})};
}
for(const count of [7,8,9]){
 test(`${count}: strict roster anchors and canonical identity suppress held and non-bed imagery`,()=>{
  const seats=[seat(2,{location:'Hospital',slotId:'H1',health:'Eliminated'})];
  assert.deepEqual(clinicalDrawingChoice(anchor(count),count,seats,'seat-1',{four:true}),{berth:'H1',plays:false,holder:'seat-2',reason:'held-by-another-seat'});
  assert.equal(clinicalDrawingChoice(anchor(count,'HV5'),count,seats,'seat-1',{four:true}).reason,'no-physical-berth');
  assert.equal(clinicalDrawingChoice(anchor(count,'HV5'),count,[],'seat-1').berth,'H5','historical geometry is preserved');
  for(const bad of [{...anchor(count),slotCount:4},{...anchor(count),anchorId:'BAD'},{...anchor(count),unexpected:true}])assert.throws(()=>clinicalDrawingChoice(bad,count,seats,'seat-1',{four:true}),/Invalid clinical presentation anchor/);
 });
 test(`${count}: a current clinical occurrence starts once and newer placement cancels it`,()=>{
  const s=setup(count);s.board.seats[1]=seat(2,{location:'Hospital',slotId:'H1',health:'Injured'});s.update();
  s.board.viewRevision=2;s.board.seats[1]=seat(2,{location:'Room B',slotId:'B4'});
  const event=s.event({type:'MEDICAL_OUTCOME',kind:'HEALED',health:'Healthy',seatId:'seat-2',presentationAnchor:anchor(count)});
  assert.equal(s.update({events:[event]}).items.length,1);s.advance(1500);
  assert.equal(s.update({events:[event]}).items[0].frame.stage,'arrive');
  s.board.viewRevision=3;s.board.seats[2]=seat(3,{location:'Hospital',slotId:'H1',health:'Injured'});
  assert.equal(s.update({events:[event]}).items.length,0);s.advance(500);
  assert.equal(s.update({events:[event]}).items.length,0,'never replay the canceled occurrence');
 });
 test(`${count}: a valid fifth presentation keeps authorized words and never creates H5`,()=>{
  const s=setup(count);s.board.viewRevision=2;
  const event=s.event({type:'MEDICAL_OUTCOME',kind:'HEALED',health:'Healthy',seatId:'seat-2',presentationAnchor:anchor(count,'HV5')});
  assert.equal(s.update({events:[event]}).items.length,0);assert.equal(outcomeWords(event),'Player 2: Healed.');
  assert.ok(!s.board.seats.some(seat=>seat.slotId==='H5'));
 });
 test(`${count}: simultaneous overflow subjects retain original identities and snapshot removal after missed events`,()=>{
  const s=setup(count);s.board.viewRevision=2;
  for(const id of [1,2])s.board.seats[id-1]=seat(id,{location:null,slotId:null,health:'Eliminated'});
  const events=[1,2].map(id=>s.event({type:'HOSPITAL_OVERFLOW_REMOVED',seatId:`seat-${id}`}));
  const sample=s.update({events});assert.equal(sample.items.length,2);assert.ok(sample.items.every(x=>x.origin.location==='Room A'));
  assert.ok(events.every(e=>outcomeWords(e).includes('permanently eliminated')));
  s.director.settle();assert.equal(s.update({events}).items.length,0);
  assert.equal(s.board.seats.length,count);assert.equal(s.board.seats.filter(s=>s.location===null).length,2);
 });
}

test('public films settle on hidden, blur, stale or Blackout ownership and do not replay',()=>{
 for(const extra of [{visible:false},{focused:false},{blackout:true}]){
  const s=setup();s.board.viewRevision=2;const event=s.event({type:'CAPTAIN_OUTCOME',kind:'RELEASE',seatIds:['seat-2']});
  assert.equal(s.update({events:[event]}).items.length,1);assert.equal(s.update({events:[event],...extra}).items.length,0);
  assert.equal(s.update({events:[event]}).items.length,0);s.director.dispose();
 }
 const s=setup();s.board.viewRevision=2;const event=s.event({type:'CAPTAIN_OUTCOME',kind:'EJECT',seatIds:['seat-2']});
 assert.equal(s.update({events:[event]}).items.length,1);s.board.clock.current=false;assert.equal(s.update({events:[event]}).items.length,0);
 s.board.clock.current=true;assert.equal(s.update({events:[event]}).items.length,0);
});

test('initial/reconnect and obsolete revisions cannot rewind a newer snapshot or animate legacy art',()=>{
 const s=setup();s.director.dispose();const event=s.event({type:'CAPTAIN_OUTCOME',kind:'RELEASE',seatIds:['seat-2']});
 assert.equal(s.update({events:[event]}).items.length,0);
 s.board.viewRevision=3;assert.equal(s.update({events:[{...event,eventId:'older-live'}]}).items.length,0);
 assert.equal(s.update({versions:{...CLONE_VERSION_PINS,assetManifestVersion:'design-0.4.0'},events:[{...event,eventId:'legacy'}]}).items.length,0);
});

test('Clone draws only in the revealed current own area; concealment suppresses replay and preserves status',()=>{
 const s=setup(),unused={status:{used:false,activatedRound:null,expiresAfterRound:null,active:false},seatId:'seat-1',eliminated:false,matchEnded:false};
 s.update({privateOpen:true,ownClone:unused});
 const active={...unused,status:{used:true,activatedRound:1,expiresAfterRound:2,active:true}};
 assert.equal(s.update({privateOpen:true,ownClone:active}).own.film,'activate');
 assert.equal(s.update({privateOpen:false,ownClone:active}).own,null);
 assert.equal(s.update({privateOpen:true,ownClone:active}).own.film,null,'reopened state is at rest');
 const ended={...active,status:{...active.status,active:false}};
 assert.equal(s.update({privateOpen:true,ownClone:ended}).own.film,'expire');
 assert.equal(s.update({privateOpen:true,ownClone:{...ended,eliminated:true}}).own,null);
});

test('Clone terminal qualification, SHOWDOWN expiry, and live reduced-motion changes do not replay',()=>{
 const s=setup(),active={status:{used:true,activatedRound:4,expiresAfterRound:5,active:true},seatId:'seat-1',eliminated:false,matchEnded:false};
 s.update({privateOpen:true,ownClone:active});
 s.board.clock.kind='SHOWDOWN';const ended={...active,status:{...active.status,active:false}};
 assert.equal(s.update({privateOpen:true,ownClone:ended}).own.film,'expire');
 assert.equal(s.update({privateOpen:true,ownClone:ended,reducedMotion:true}).own.film,null);
 assert.equal(s.update({privateOpen:true,ownClone:ended,reducedMotion:false}).own.film,null);
 s.board.clock.kind='FINISHED';assert.equal(s.update({privateOpen:true,ownClone:{...ended,matchEnded:true}}).own,null);
});

test('wire validation rejects malformed clinical and foreign overflow facts before the renderer',()=>{
 const s=setup(),event=s.event({type:'HOSPITAL_OVERFLOW_REMOVED',seatId:'seat-1'});
 assert.equal(FullOutcomePublicEventSchema.safeParse({...event,versions:CLONE_VERSION_PINS}).success,false);
 assert.equal(FullOutcomePublicEventSchema.safeParse({...event,fact:{...event.fact,presentationAnchor:anchor(7)}}).success,false);
 const medical=s.event({type:'MEDICAL_OUTCOME',kind:'DEATH',health:'Eliminated',seatId:'seat-1',presentationAnchor:anchor(7)});
 assert.equal(FullOutcomePublicEventSchema.safeParse({...medical,fact:{...medical.fact,presentationAnchor:undefined}}).success,false);
 assert.equal(FullOutcomePlayerEventSchema.safeParse({...event,audience:{kind:'player',seatId:'seat-1'},unexpected:true}).success,false);
});

test('an occurrence arriving after its matching snapshot retains the actual held-before Jail/body state',()=>{
 const s=setup();s.board.seats[1]=seat(2,{location:'Jail',slotId:'J1',jailed:true,health:'Eliminated'});s.update();
 s.board.viewRevision=2;s.board.seats[1]=seat(2,{location:null,slotId:null,health:'Eliminated'});s.update();s.update();
 const event=s.event({type:'CAPTAIN_OUTCOME',kind:'EJECT',seatIds:['seat-2']});
 const entry=s.update({events:[event]}).items[0];assert.equal(entry.subjects[0].before.slotId,'J1');assert.equal(entry.subjects[0].body,true);
});

test('fresh post-Blackout outcomes retain their committed origin while hidden-page resumption stays a baseline',()=>{
 for(const visible of[true,false]){
  const s=setup();s.board.clock.kind='BLACKOUT';s.update({blackout:true,visible});
  s.board.viewRevision=2;s.board.clock.kind='ORDINARY_TURN';s.board.seats[1]=seat(2,{location:'Hospital',slotId:'H1',health:'Injured'});
  const event=s.event({type:'MEDICAL_OUTCOME',kind:'INJURY',health:'Injured',seatId:'seat-2',presentationAnchor:anchor(7)});
  const sample=s.update({blackout:false,visible:true,events:[event]});assert.equal(sample.items.length,visible?1:0);
 }
});

for(const count of[7,8,9])test(`${count}: admission uses its current H2 despite a fifth anchor or another living/body holder at H1`,()=>{
 for(const [anchorId,health]of[['HV5','Injured'],['HV1','Injured'],['HV1','Eliminated']]){
  const s=setup(count);s.board.seats[0]=seat(1,{location:'Hospital',slotId:'H1',health});s.update();s.board.viewRevision=2;
  s.board.seats[1]=seat(2,{location:'Hospital',slotId:'H2',health:'Injured'});
  const event=s.event({type:'MEDICAL_OUTCOME',kind:'INJURY',health:'Injured',seatId:'seat-2',presentationAnchor:anchor(count,anchorId)});
  const entry=s.update({events:[event]}).items[0];assert.equal(entry.berth,'H2');assert.equal(entry.clinical,'INJURY');assert.ok(entry.frame.figure.opacity<1);
  assert.throws(()=>s.update({events:[{...event,eventId:'invalid-admission',presentationAnchor:{...anchor(count),anchorId:'HV9',slotCount:7}}]}),/Invalid clinical presentation anchor/);
 }
});

test('normal and reduced Clone changes observed with the sheet closed start once at first card foreground',()=>{
 for(const reducedMotion of[false,true])for(const film of['activate','expire']){
  const s=setup(),unused={status:{used:false,activatedRound:null,expiresAfterRound:null,active:false},seatId:'seat-1',eliminated:false,matchEnded:false};
  const active={...unused,status:{used:true,activatedRound:1,expiresAfterRound:2,active:true}},ended={...active,status:{...active.status,active:false}};
  s.update({privateOpen:false,ownClone:film==='activate'?unused:active,reducedMotion});
  const after=film==='activate'?active:ended;
  assert.equal(s.update({privateOpen:false,ownClone:after,reducedMotion}).own,null);
  s.advance(10000);assert.equal(s.update({privateOpen:true,ownClone:after,reducedMotion}).own.film,film);
  assert.equal(s.director.sample().own.t,0,'wait time is not film time');
  assert.equal(s.update({privateOpen:false,ownClone:after,reducedMotion}).own,null);
  assert.equal(s.update({privateOpen:true,ownClone:after,reducedMotion}).own.film,null,'no replay after a started card is concealed');
 }
});

test('queued own Clone changes are discarded at authorization, page, motion and terminal boundaries',()=>{
 const unused={status:{used:false,activatedRound:null,expiresAfterRound:null,active:false},seatId:'seat-1',eliminated:false,matchEnded:false},active={...unused,status:{used:true,activatedRound:1,expiresAfterRound:2,active:true}};
 for(const boundary of['hidden','blur','stale','unsupported','motion','terminal','other-seat','new-match']){
  const s=setup();s.update({ownClone:unused});s.update({ownClone:active});
  const extra=boundary==='hidden'?{visible:false}:boundary==='blur'?{focused:false}:boundary==='unsupported'?{enabled:false}:boundary==='motion'?{reducedMotion:true}:boundary==='other-seat'?{ownClone:{...active,seatId:'seat-2'}}:{};
  if(boundary==='stale')s.board.clock.current=false;
  if(boundary==='terminal')s.board.clock.kind='FINISHED';
  if(boundary==='new-match')s.board.matchId='replacement-match';
  s.update({ownClone:active,...extra});s.board.clock.current=true;s.board.clock.kind='ORDINARY_TURN';
  const sample=s.update({ownClone:active,privateOpen:true,reducedMotion:boundary==='motion'});
  assert.equal(sample.own.film,null,boundary);
 }
});
