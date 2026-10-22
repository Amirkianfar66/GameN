import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoardV2Blackout} from '../hosted/board-v2-blackout.mjs';
const clock=(nowMs,kind='BLACKOUT',phaseId='window')=>({nowMs,kind,phaseId,startedAt:0,endsAt:15000,current:true});
const snapshot={snapshotId:'window',darkStartsAt:5000};
test('native Blackout uses exact five-second cut and Claude late-update hold cap without extending selection',()=>{
 for(const reducedMotion of [false,true]){let now=0;const director=createBoardV2Blackout({now:()=>now});director.update(clock(4999),snapshot,{reducedMotion});assert.equal(director.sample().dark,false);
  director.update(clock(5000),snapshot,{reducedMotion});assert.equal(director.sample().dark,true);assert.equal(director.sample().film.selection,true);
  director.update(clock(15000),snapshot,{reducedMotion});assert.equal(director.sample().film.selection,false);
  director.update(clock(18000),snapshot,{reducedMotion});const sample=director.sample();assert.equal(sample.dark,false);assert.equal(sample.film.selection,false);assert.equal(sample.film.people,'shown');assert.equal(sample.animate,false);director.dispose();
 }
});
test('stale/background Blackout settles conservatively and phase change settles without replay',()=>{
 const director=createBoardV2Blackout({now:()=>0});director.update({...clock(3000),current:false},snapshot);assert.equal(director.sample().dark,true);assert.equal(director.sample().animate,false);
 director.settle();director.update({...clock(60000,'ORDINARY_TURN','next'),startedAt:60000,endsAt:120000},null);assert.equal(director.sample(),null);director.dispose();
});
