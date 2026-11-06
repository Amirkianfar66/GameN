import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetMotion,planetOutcomeTakesPrecedence} from '../hosted/planet/motion.mjs';
import {createBoardV2Capsule} from '../hosted/board-v2-capsule.mjs';
import {planetView,rig} from './planet-support.mjs';
const anchor=n=>({kind:'CLINICAL_VIGNETTE',batchId:'clinical-batch',anchorId:`HV${n}`,slotCount:9});
const event=(v,kind,seatIds=['seat-3'],extra={})=>({id:'planet-event-1',round:v.round,phaseId:v.phase.id,viewRevision:v.viewRevision,publishedAt:1000,expiresAt:31000,audience:{kind:'public'},kind,seatIds,actorSeatId:null,location:null,slotId:null,clinicalAnchor:null,...extra});
function patient(){const v=planetView('Doctor');Object.assign(v.board.seats[2],{health:'Injured',location:'Hospital',slotId:'H1',rescueDueAfterRound:7,medical:{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}});return v;}
function healed(v,n=1){const next=structuredClone(v);next.viewRevision++;Object.assign(next.board.seats[2],{health:'Healthy',location:'Room A',slotId:'A3',rescueDueAfterRound:null,medical:null});next.events=[event(next,'RESCUED',['seat-3'],{clinicalAnchor:anchor(n)})];return next;}
const opts={visible:true,focused:true};
test('Planet drone starts only for a new authorized medical occurrence; baseline, duplicate and old events do not replay',async()=>{
 let now=0;const r=rig(patient());await r.controller.start();const director=createPlanetMotion({now:()=>now});director.update(r.read(),opts);
 const next=healed(patient());r.push(next);assert.equal(director.update(r.read(),opts).items[0].clinical,'HEALED');
 now=10000;assert.equal(director.sample().items.length,0);assert.equal(director.update(r.read(),opts).items.length,0);
 const baseline=createPlanetMotion();assert.equal(baseline.update(r.read(),opts).items.length,0);r.controller.dispose();
});
test('motion change cancels active drawings before unchanged-view handling; reconnect does not replay',async()=>{
 const r=rig(patient());await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);r.push(healed(patient()));assert.equal(d.update(r.read(),opts).items.length,1);
 assert.equal(d.update(r.read(),{...opts,reducedMotion:true}).items.length,0);assert.equal(d.update(r.read(),{...opts,reducedMotion:false}).items.length,0);
 d.update(r.read(),{visible:false,focused:false});assert.equal(d.update(r.read(),opts).items.length,0);r.controller.dispose();
});
test('clinical HV5+ remains words only with four physical beds',async()=>{
 const r=rig(patient());await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);r.push(healed(patient(),5));assert.equal(d.update(r.read(),opts).items.length,0);r.controller.dispose();
});
test('Blackhole activation flags never trigger a public cinematic; the authorized Sync occurrence does',async()=>{
 const v=planetView('Alien');const r=rig(v);await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);
 const spent=structuredClone(v);spent.viewRevision=2;spent.abilities.blackholeSpent=true;r.push(spent);assert.equal(d.update(r.read(),opts).special.length,0);
 const synced=structuredClone(spent);synced.viewRevision=3;synced.events=[event(synced,'BLACKHOLE_SYNCED',[])];r.push(synced);assert.equal(d.update(r.read(),opts).special[0].kind,'blackhole');r.controller.dispose();
});
test('TTL, checkpoint and audience guards fail closed',async()=>{
 for(const fields of [{publishedAt:0,expiresAt:30000},{phaseId:'old-phase'},{viewRevision:1}]){
  const r=rig(patient());await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);const next=healed(patient());Object.assign(next.events[0],fields);
  if(fields.publishedAt===0){await r.advance(30001);next.phase={...next.phase,startedAt:0,endsAt:60000};}
  r.push(next);assert.equal(d.update(r.read(),opts).items.length,0);r.controller.dispose();
 }
 const v=healed(patient());v.events[0].audience={kind:'player',seatId:'seat-9'};const r=rig(v);await r.controller.start();assert.equal(r.read().connection,'error');r.controller.dispose();
});
test('Clone rest state is own-card only, uses the authoritative uncapped expiry and cancels on close',async()=>{
 const v=planetView('Alien');const r=rig(v);await r.controller.start();let now=0;const d=createPlanetMotion({now:()=>now});d.update(r.read(),opts);r.controller.openPanel('card');d.update(r.read(),opts);
 const next=structuredClone(v);next.viewRevision=2;next.abilities.clone={used:true,active:true,expiresAfterRound:7};r.push(next);const sample=d.update(r.read(),opts);assert.equal(sample.own.status.expiresAfterRound,7);assert.equal(sample.own.film,'activate');
 r.controller.dismiss();assert.equal(d.update(r.read(),opts).own,null);r.controller.openPanel('card');assert.equal(d.update(r.read(),opts).own.film,null);r.controller.dispose();
});
test('terminal results cancel active optional films even when the occurrence is still within TTL',async()=>{
 const r=rig(patient());await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);const next=healed(patient());r.push(next);assert.equal(d.update(r.read(),opts).items.length,1);
 const finished=structuredClone(r.read());finished.phase={...finished.phase,kind:'FINISHED',remainingMs:null,expired:false};assert.equal(d.update(finished,opts).items.length,0);r.controller.dispose();
});
test('a continuous visible phase deadline permits a new resolved occurrence; a reconnect still suppresses history',async()=>{
 const r=rig(patient());await r.controller.start();let now=0;const d=createPlanetMotion({now:()=>now});d.update(r.read(),opts);await r.advance(60000);d.update(r.read(),opts);
 const next=healed(patient());next.phase={id:'post-deadline',kind:'JAIL_VOTE',startedAt:61000,endsAt:121000};Object.assign(next.events[0],{phaseId:next.phase.id,publishedAt:61000,expiresAt:91000});r.push(next);assert.equal(d.update(r.read(),opts).items.length,1);r.controller.dispose();
});
test('authorized room-block occurrences use one cause-free drawing and reset on motion change',async()=>{
 const v=planetView();const r=rig(v);await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);const next=structuredClone(v);next.viewRevision=2;next.events=[event(next,'ATTACK_BLOCKED',['seat-7'],{audience:{kind:'player',seatId:'seat-6'},location:'Room B',slotId:'B2'})];r.push(next);const sample=d.update(r.read(),opts);assert.equal(sample.special[0].kind,'blocked');assert.ok(sample.special[0].blockFrame);assert.equal(sample.special[0].occurrence.actorSeatId,null);assert.equal(d.update(r.read(),{...opts,reducedMotion:true}).special.length,0);r.controller.dispose();
});

test('detained Rescue uses the supplied Jail slot while the clinical anchor remains a separate vignette',async()=>{
 const r=rig(patient());await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);const next=healed(patient());Object.assign(next.board.seats[2],{location:'Jail',slotId:'J3',jailed:true});r.push(next);const entry=d.update(r.read(),opts).items[0];assert.equal(entry.subject.location,'Jail');assert.equal(entry.subject.slotId,'J3');assert.equal(entry.berth,'H1');r.controller.dispose();
});
test('a reused clinical berth suppresses the optional Rescue drawing without changing the current healthy seat',async()=>{
 const r=rig(patient());await r.controller.start();const d=createPlanetMotion();d.update(r.read(),opts);const next=healed(patient());Object.assign(next.board.seats[3],{health:'Injured',location:'Hospital',slotId:'H1',rescueDueAfterRound:7,medical:{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}});r.push(next);assert.equal(d.update(r.read(),opts).items.length,0);assert.equal(r.read().board.seats[2].slotId,'A3');r.controller.dispose();
});
test('current Sync and outcome checkpoints settle capsule exit; old occurrences do not cancel a new talk',async()=>{
 const r=rig();await r.controller.start();assert.equal(planetOutcomeTakesPrecedence(r.read()),false);const next=planetView();next.viewRevision=2;next.events=[event(next,'BLACKHOLE_SYNCED',[])];r.push(next);assert.equal(planetOutcomeTakesPrecedence(r.read()),true);
 const old=structuredClone(r.read());old.presentation.events[0].phaseId='previous-phase';assert.equal(planetOutcomeTakesPrecedence(old),false);old.presentation.events[0].phaseId=old.phase.id;old.presentation.events[0].viewRevision=1;assert.equal(planetOutcomeTakesPrecedence(old),false);old.result={reason:'NO_SURVIVORS',winner:null,alienCoWinner:false};assert.equal(planetOutcomeTakesPrecedence(old),true);r.controller.dispose();
});

test('ordinary capsule return remains the reviewed board-only exit, and Sync can settle it immediately',()=>{
 const capsule=createBoardV2Capsule({now:()=>0});const session={hackId:'talk',actorSeatId:'seat-1',targetSeatId:'seat-6',stage:'HACK',phaseId:'talk-phase',current:true,startedAt:40000,endsAt:100000,elapsedMs:59999};
 capsule.update(session,{current:true,kind:'HACK',phaseId:'talk-phase',nowMs:99999,startedAt:40000,endsAt:100000});capsule.update(null,{current:true,kind:'JAIL_VOTE',phaseId:'vote-phase',nowMs:100001,startedAt:100000,endsAt:160000});assert.equal(capsule.sample().stage,'exit');assert.equal(capsule.sample().animate,true);capsule.settle();assert.equal(capsule.sample().stage,'idle');assert.equal(capsule.sample().animate,false);capsule.dispose();
});
