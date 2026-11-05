import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetBlackholePresentation} from '@mothership/presentation';
import {createPlanetMotion} from '../hosted/planet/motion.mjs';
import {readPlanetView} from '../dist/index.js';
import {ids,planetView,rig} from './planet-support.mjs';
const opts={visible:true,focused:true};
function stageView(){
 const v=planetView();v.phase={id:'phase-sync',kind:'BLACKHOLE_PRESENTATION',startedAt:1000,endsAt:7000};v.activeSeatId=null;v.offers=[];
 v.events=[{id:'sync-1',round:v.round,phaseId:v.phase.id,viewRevision:v.viewRevision,publishedAt:1000,expiresAt:31000,audience:{kind:'public'},kind:'BLACKHOLE_SYNCED',seatIds:[],actorSeatId:null,location:null,slotId:null,clinicalAnchor:null}];return v;
}
function voteView(v,start){const next=structuredClone(v);next.viewRevision++;next.phase={id:'phase-fresh-vote',kind:'JAIL_VOTE',startedAt:start,endsAt:start+60000};next.offers=[{type:'VOTE',targetSeatIds:ids,slotIds:[],windowIds:[]}];return next;}

test('authoritative presentation hides and refuses Jail ballots, movement, panel registration and Pass',async()=>{
 const v=stageView();v.offers=['VOTE','MOVE','PANEL_CODE','PASS_TURN'].map(type=>({type,targetSeatIds:ids,slotIds:['B5'],windowIds:[]}));const r=rig(v);await r.controller.start();r.controller.openPanel('actions');assert.deepEqual(r.read().privateArea.offers,[]);assert.equal(r.read().canPass,false);assert.equal(r.read().canMove,false);
 for(const type of ['VOTE','MOVE','PANEL_CODE','PASS_TURN']){r.controller.begin(type);await r.controller.confirm();}assert.equal(r.sent.length,0);assert.equal(planetBlackholePresentation(r.read()).remainingMs,6000);r.controller.dispose();
});
test('late load, duplicate view and foreground resume use the same Sync timestamps and elapsed time',async()=>{
 const v=stageView(),r=rig(v,{now:4500});await r.controller.start();const first=planetBlackholePresentation(r.read());assert.equal(first.elapsedMs,3500);assert.equal(first.remainingMs,2500);
 r.push(structuredClone(v));assert.equal(planetBlackholePresentation(r.read()).startedAt,1000);await r.advance(500);r.controller.setVisible(false);assert.equal(planetBlackholePresentation(r.read()),null);r.controller.setVisible(true);for(let i=0;i<12;i++)await Promise.resolve();
 const resumed=planetBlackholePresentation(r.read());assert.equal(resumed.phaseId,first.phaseId);assert.equal(resumed.endsAt,first.endsAt);assert.equal(resumed.elapsedMs,4000);assert.equal(resumed.remainingMs,2000);r.controller.dispose();
});
test('expiry never opens voting locally; a delayed authoritative transition still supplies the full vote',async()=>{
 const v=stageView(),r=rig(v);await r.controller.start();const motion=createPlanetMotion();motion.update(r.read(),opts);await r.advance(6501);const waiting=planetBlackholePresentation(r.read());assert.equal(waiting.status,'awaiting-view');assert.equal(waiting.elapsedMs,6000);assert.equal(r.read().phase.kind,'BLACKHOLE_PRESENTATION');r.controller.begin('VOTE');assert.equal(r.sent.length,0);
 const vote=voteView(v,7501);r.push(vote);assert.equal(planetBlackholePresentation(r.read()),null);assert.equal(r.read().phase.remainingMs,60000);assert.equal(motion.update(r.read(),opts).special.length,0);r.controller.begin('VOTE');r.controller.choose('seat-1');await r.controller.confirm();assert.equal(r.sent[0].phaseId,'phase-fresh-vote');r.controller.dispose();
});
test('ordinary non-Blackhole rounds are never assigned a local presentation',async()=>{
 const v=planetView(),r=rig(v);await r.controller.start();assert.equal(planetBlackholePresentation(r.read()),null);await r.advance(60001);assert.equal(r.read().phase.kind,'ORDINARY_TURN');const vote=voteView(v,61001);r.push(vote);assert.equal(r.read().phase.kind,'JAIL_VOTE');assert.equal(r.read().phase.remainingMs,60000);assert.equal(planetBlackholePresentation(r.read()),null);r.controller.dispose();
});
test('meeting Promises stay Pending through presentation and change only with the actual vote snapshot',async()=>{
 const v=stageView();Object.assign(v.board.seats[2],{location:'Room B',slotId:'B5'});Object.assign(v.board.seats[5],{location:'Room A',slotId:'A3'});v.promises=[{id:'meeting',giverSeatId:'seat-6',recipientSeatId:'seat-1',kind:'MEET_A',targetSeatId:null,round:v.round,electionId:null,accepted:true,status:'Pending',offerStatus:'accepted'}];v.promiseQuota.given=true;
 const r=rig(v);await r.controller.start();r.controller.openPanel('promises');assert.equal(r.read().privateArea.promises[0].status,'Pending');await r.advance(5999);assert.equal(r.read().privateArea.promises[0].status,'Pending');await r.advance(502);assert.equal(r.read().phase.kind,'BLACKHOLE_PRESENTATION');const vote=voteView(v,7501);vote.promises[0].status='Fulfilled';r.push(vote);r.controller.openPanel('promises');assert.equal(r.read().privateArea.promises[0].status,'Fulfilled');r.controller.dispose();
});
test('a higher revision cannot silently restart an existing Sync phase interval',async()=>{
 const v=stageView(),r=rig(v,{now:4500});await r.controller.start();const changed=structuredClone(v);changed.viewRevision++;changed.phase.startedAt=4000;changed.phase.endsAt=10000;r.push(changed);assert.equal(r.read().connection,'error');assert.equal(planetBlackholePresentation(r.read()),null);assert.equal(r.read().canPass,false);r.controller.dispose();
});
test('the predecessor candidate is not silently relabeled as the P27 tuple',()=>{
 const v=stageView();v.versions={...v.versions,engineVersion:'planet-game-1.0.0',rulesetVersion:'in-person-planet-2026-11-05',rulesetHash:'32cde63d777ed93744637f911c134247272dc862524bd5aa9d0c3cd405dbe8ea'};assert.equal(readPlanetView(v,'planet-local','seat-6'),null);
});
