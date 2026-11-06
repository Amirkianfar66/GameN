import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetBlackholePresentation} from '../dist/index.js';
const model=nowMs=>({connection:'live',concealed:false,phase:{id:'sync-phase',kind:'BLACKHOLE_PRESENTATION',startedAt:1000,endsAt:7000,nowMs,remainingMs:Math.max(0,7000-nowMs),trusted:true,expired:nowMs>=7000}});

test('late presentation loads seek to the authoritative elapsed time without restarting six seconds',()=>{
 const current=planetBlackholePresentation(model(4500));assert.equal(current.elapsedMs,3500);assert.equal(current.remainingMs,2500);assert.equal(current.progress,3500/6000);
 const resumed=planetBlackholePresentation(model(6000));assert.equal(resumed.phaseId,current.phaseId);assert.equal(resumed.elapsedMs,5000);assert.equal(resumed.remainingMs,1000);
});
test('presentation expiry waits for a new view and never constructs a Jail-vote phase',()=>{
 const value=model(9000),stage=planetBlackholePresentation(value);assert.equal(stage.elapsedMs,6000);assert.equal(stage.remainingMs,0);assert.equal(stage.status,'awaiting-view');assert.equal(value.phase.kind,'BLACKHOLE_PRESENTATION');
 const vote={...value,phase:{...value.phase,id:'vote-phase',kind:'JAIL_VOTE',startedAt:9000,endsAt:69000,nowMs:9000,remainingMs:60000,expired:false}};assert.equal(planetBlackholePresentation(vote),null);assert.equal(vote.phase.remainingMs,60000);
});
test('ordinary rounds, hidden/stale views, unknown clocks and future phases do not manufacture a presentation',()=>{
 assert.equal(planetBlackholePresentation({...model(2000),phase:{...model(2000).phase,kind:'ORDINARY_TURN'}}),null);
 assert.equal(planetBlackholePresentation({...model(2000),concealed:true}),null);assert.equal(planetBlackholePresentation({...model(2000),connection:'stale'}),null);assert.equal(planetBlackholePresentation({...model(2000),phase:{...model(2000).phase,nowMs:null}}),null);assert.equal(planetBlackholePresentation(model(999)),null);
});
