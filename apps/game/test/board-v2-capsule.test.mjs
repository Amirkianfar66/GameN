import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoardV2Capsule} from '../hosted/board-v2-capsule.mjs';
const session=(stage,start)=>({hackId:'x',actorSeatId:'seat-6',targetSeatId:'seat-1',phaseId:stage,stage,startedAt:start,endsAt:start+({HACK_DECLARE:15000,HACK_RESULT:5000,HACK:60000}[stage]),elapsedMs:0,current:true});
const clock=(phaseId,nowMs,kind=phaseId)=>({phaseId,kind,nowMs,current:true});
test('initial and recovered result settles; an observed entry uses the five-second clock without replay',()=>{
 let now=0;const movie=createBoardV2Capsule({now:()=>now});
 assert.equal(movie.update(session('HACK_RESULT',15000),clock('HACK_RESULT',15200)).film.people.P1.capsule.state,'seated');
 movie.dispose();movie.update(session('HACK_DECLARE',0),clock('HACK_DECLARE',100));
 const entering=movie.update(session('HACK_RESULT',15000),clock('HACK_RESULT',17000));assert.equal(entering.t,2000);assert.equal(entering.animate,true);
 now=1600;assert.equal(movie.sample().film.people.P2.capsule.state,'seated');
 movie.settle();assert.equal(movie.update(session('HACK_RESULT',15000),clock('HACK_RESULT',17400)).animate,false);
});
test('the full minute and expiry keep the authoritative phase; latest public placement belongs to the painter',()=>{
 let now=0;const movie=createBoardV2Capsule({now:()=>now});
 movie.update(session('HACK',20000),clock('HACK',20000));now=59999;assert.equal(movie.sample().stage,'talk');assert.equal(movie.sample().animate,true);
 now=60000;assert.equal(movie.sample().stage,'talk');assert.equal(movie.sample().animate,false);
 assert.equal(movie.sample().t,60000);assert.equal(Object.hasOwn(movie.sample(),'departureSlot'),false);
 const exit=movie.update(null,clock('next',80001,'ORDINARY_TURN'));assert.equal(exit.stage,'exit');assert.deepEqual(exit.seatIds,['seat-1','seat-6']);
 now+=2230;assert.equal(movie.sample().stage,'idle');
});
test('background, stale clock, reduced motion and terminal phase cannot resurrect entry or exit',()=>{
 const movie=createBoardV2Capsule({now:()=>0});movie.update(session('HACK_DECLARE',0),clock('HACK_DECLARE',10),{visible:false});
 assert.equal(movie.update(session('HACK_RESULT',15000),clock('HACK_RESULT',15100)).animate,false);
 movie.update(session('HACK',20000),clock('HACK',23000),{reducedMotion:true});assert.equal(movie.sample().animate,false);
 movie.update(null,{...clock('end',null,'FINISHED'),current:false});assert.equal(movie.sample().stage,'idle');
});
