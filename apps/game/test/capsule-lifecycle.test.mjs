import test from 'node:test';
import assert from 'node:assert/strict';
import {capsuleFrame,createCapsuleLifecycle,capsuleTargetChoices,capsuleReturnTargets} from '../hosted/capsule-lifecycle.mjs';
const session={hackId:'exchange',actorSeatId:'seat-1',targetSeatId:'seat-2'};
const make=(stage='HACK_DECLARE',change={})=>capsuleFrame({enabled:true,session,phase:{id:stage==='HACK_DECLARE'?'exchange':`phase-${stage}`,kind:stage,startedAt:1000,endsAt:1000+({HACK_DECLARE:15000,HACK_RESULT:5000,HACK:60000}[stage]??60000)},activeSeatId:'seat-1',seatIds:['seat-1','seat-2','seat-3'],remainingMs:{HACK_DECLARE:15000,HACK_RESULT:5000,HACK:60000}[stage]??60000,fresh:true,...change});
const next=change=>make('ORDINARY_TURN',{session:null,...change});
test('disabled historical capability emits no pair; the public frame copies no claim, role or private choice',()=>{
 assert.equal(make('HACK',{enabled:false}).session,null);
 const frame=make('HACK',{session:{...session,declaredSide:'Blue',role:'Hacker',privateClaim:'truth'}});
 assert.deepEqual(frame.session,session);assert.doesNotMatch(JSON.stringify(frame),/Blue|Hacker|privateClaim|truth/);
 for(const value of [{...session,targetSeatId:'seat-1'},{...session,targetSeatId:'seat-9'},{...session,hackId:'phase-HACK_RESULT'}])assert.equal(make('HACK_RESULT',{session:value}).session,null);
 assert.equal(make('HACK_RESULT',{activeSeatId:'seat-3'}).session,null);
});
test('fresh declaration-to-result enters once; first, late and recovered stages settle instead of replaying',()=>{
 const flow=createCapsuleLifecycle();flow.update(make());const result=make('HACK_RESULT',{remainingMs:4900});assert.equal(flow.update(result).event.kind,'enter');assert.equal(flow.update(result).event,null);
 const first=createCapsuleLifecycle();assert.equal(first.update(result).event,null);assert.equal(first.update(make('HACK')).placement,'capsule');
 const recovered=createCapsuleLifecycle();recovered.update(make());recovered.update(make('HACK_DECLARE',{fresh:false}));assert.equal(recovered.update(result).event,null);
 const skipped=createCapsuleLifecycle();skipped.update(make());assert.equal(skipped.update(make('HACK')).event,null);
});
test('conversation keeps its complete server-owned 60 seconds, with no animation gate or local phase advance',()=>{
 const flow=createCapsuleLifecycle();flow.update(make());flow.update(make('HACK_RESULT'));
 const talk=make('HACK');assert.equal(talk.remainingMs,60000);assert.equal(talk.elapsedMs,0);assert.equal(flow.update(talk).idle,true);
 const expired=flow.update(make('HACK',{remainingMs:0}));assert.equal(expired.placement,'capsule');assert.equal(expired.idle,false);assert.equal(expired.event,null);
 assert.equal(flow.update(next()).event.kind,'exit');assert.equal(flow.update(next()).event,null);
});
test('reduced motion settles entry/exit; superseding pair, hidden/stale state and termination cancel obsolete choreography',()=>{
 const reduced=createCapsuleLifecycle();reduced.update(make());assert.equal(reduced.update(make('HACK_RESULT'),{reduced:true}).event.kind,'settle-entry');assert.equal(reduced.update(make('HACK'),{reduced:true}).idle,false);assert.equal(reduced.update(next(),{reduced:true}).event.kind,'settle-exit');
 for(const change of [{foreground:false},{fresh:false}]){const f=createCapsuleLifecycle();f.update(make('HACK'));assert.equal(f.update(make('HACK',change)).cancel,true);assert.equal(f.update(next()).event,null);}
 const superseded=createCapsuleLifecycle();superseded.update(make('HACK'));assert.equal(superseded.update(make('HACK_DECLARE',{session:{...session,hackId:'other'},phase:{id:'other',kind:'HACK_DECLARE',startedAt:1000,endsAt:16000}})).event,null);
 const ended=createCapsuleLifecycle();ended.update(make('HACK'));const terminal=ended.update(next({phase:{id:'end',kind:'FINISHED',startedAt:1000,endsAt:null}}));assert.equal(terminal.cancel,true);assert.equal(terminal.event,null);
});
test('actual seat offers are preserved while art travels, and a changed server offer removes the capsule target',()=>{
 const choices=[{id:'choose-1',value:'seat-1'},{id:'choose-2',value:'seat-2'},{id:'choose-3',value:'seat-3'}];
 assert.deepEqual(capsuleTargetChoices(choices,session),choices.slice(0,2));assert.deepEqual(capsuleTargetChoices(choices.slice(2),session),[]);assert.deepEqual(capsuleTargetChoices(choices,null),[]);assert.equal(choices.length,3);
});
test('return resolves both current authoritative anchors again after movement during conversation and exit',()=>{
 const world=new Map([['seat-1',{location:'Room A',slotId:'A3'}],['seat-2',{location:'Jail',slotId:'J1'}]]);
 const read=()=>capsuleReturnTargets(session,id=>world.get(id));assert.equal(read()[0].current.slotId,'A3');
 world.set('seat-1',{location:'Room B',slotId:'B2'});assert.equal(read()[0].current.slotId,'B2');
 world.set('seat-2',{location:'Hospital',slotId:'H4'});assert.equal(read()[1].current.slotId,'H4');
});
