import assert from 'node:assert/strict';
import test from 'node:test';
import {createOutcomeFeed} from '../dist/connected/outcome-feed.js';
import {boardV2View} from '../dev/board/board-v2-scenarios.mjs';
function setup(){let listener;const v=boardV2View({profile:'clone',startedAt:0}),transport={currentUid:()=> 'own',listenCollection:(target,l)=>{assert.equal(target.seatId,'seat-6');listener=l;return()=>{};}};const feed=createOutcomeFeed(transport,v.matchId,'seat-6');feed.observe(v,6000,true,true);const event=(id,extra={})=>({protocolVersion:2,matchId:v.matchId,eventId:id,outcomeId:id,viewRevision:1,versions:Object.fromEntries(Object.entries(v.versions).filter(([k])=>k!=='assetManifestVersion')),publishedAt:6000,expiresAt:36000,audience:{kind:'player',seatId:'seat-6'},fact:{type:'ATTACK_BLOCKED',phaseId:'phase-checkpoint',round:5,seatId:'seat-1',location:'Room A',slotId:'A4'},...extra});return{v,feed,event,publish:items=>listener.onSnapshot({fresh:true,value:items}),error:()=>listener.onError()};}
test('initial/reconnect snapshots do not replay occurrences; new events require matching audience/version and expire',()=>{
 const s=setup(),old={id:'1-0',data:s.event('baseline')};s.publish([old]);assert.deepEqual(s.feed.read(),[]);
 const good={id:'1-1',data:s.event('live')},wrongAudience={id:'1-2',data:s.event('other',{audience:{kind:'player',seatId:'seat-5'}})},wrongVersion={id:'1-3',data:s.event('wrong',{versions:{...s.event('wrong').versions,rulesetHash:'0'.repeat(64)}})};
 s.publish([old,good,wrongAudience,wrongVersion]);assert.deepEqual(s.feed.read().map(e=>e.eventId),['live']);s.publish([old,good]);assert.equal(s.feed.read().length,1);
 s.feed.observe({...s.v,viewRevision:2},37000,true,true);assert.deepEqual(s.feed.read(),[]);s.error();s.feed.observe(s.v,6000,true,true);s.publish([{id:'1-4',data:s.event('during-reconnect')}]);assert.deepEqual(s.feed.read(),[]);s.feed.dispose();
});
test('background and stale state remove private outcomes without replay; future revisions wait for their matching view',()=>{
 const s=setup();s.publish([]);s.publish([{id:'2-0',data:s.event('future',{viewRevision:2})}]);assert.equal(s.feed.read().length,0);
 s.feed.observe({...s.v,viewRevision:2},6000,true,true);assert.equal(s.feed.read().length,1);
 s.feed.observe({...s.v,viewRevision:2},6100,true,false);assert.equal(s.feed.read().length,0);s.feed.observe({...s.v,viewRevision:2},6200,true,true);s.publish([{id:'2-0',data:s.event('future',{viewRevision:2})}]);assert.equal(s.feed.read().length,0);s.feed.dispose();
});
test('a deferred occurrence published during backgrounding cannot play after foreground resumes',()=>{
 const s=setup();s.publish([]);s.feed.observe(s.v,6500,true,false);s.feed.observe(s.v,7500,true,true);
 s.publish([{id:'1-0',data:s.event('hidden',{publishedAt:7000,expiresAt:37000})}]);assert.deepEqual(s.feed.read(),[]);
 s.feed.observe(s.v,8500,true,true);s.publish([{id:'1-0',data:s.event('hidden',{publishedAt:7000,expiresAt:37000})},{id:'1-1',data:s.event('new-live',{publishedAt:8000,expiresAt:38000})}]);assert.deepEqual(s.feed.read().map(e=>e.eventId),['new-live']);s.feed.dispose();
});
