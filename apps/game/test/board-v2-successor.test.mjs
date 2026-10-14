import assert from 'node:assert/strict';
import test from 'node:test';
import {FullCommandRequestSchema} from '@mothership/contracts';
import {createActionFlow,DEFAULT_ACTION_FLOW_TIMING} from '@mothership/game';
import {isOffered,buildConnectedPlayerShellModel,renderComicPlayerShell,buildTableShellModel,renderComicTableShell,toHtml} from '@mothership/presentation';
import {boardV2View} from '../dev/board/board-v2-scenarios.mjs';
import {createFakeHost,flush} from './support/fakes.mjs';
const environment={mode:'fixture',connection:'live',problem:null,deadline:{kind:'running',remainingMs:9000},motion:{reducedMotion:false,followsDevice:true},privacy:{revealed:true,concealed:false},action:{step:'idle'}};
const view=(role,seatId,stage='ORDINARY_TURN')=>boardV2View({role,seatId,stage,profile:'clone',startedAt:0});
function flowFor(view){const host=createFakeHost(),sent=[];const flow=createActionFlow({ports:host.ports,matchId:view.matchId,seatId:view.self.seatId,api:{command:async r=>{sent.push(r);return{kind:'no-response',reason:'transport-error'};},receipt:async()=>({kind:'no-response',reason:'transport-error'})}});const context={view,current:true,inTime:true,foreground:true,panelOpen:true,serverNowMs:6000};flow.observe(context);return{flow,host,sent,context};}
test('targetless successors require confirmation and send no invented seat payload',async()=>{
 for(const [kind,role,seatId,type]of [['captain-release','Undercover','seat-7','CAPTAIN_RELEASE'],['captain-eject','Undercover','seat-7','CAPTAIN_EJECT'],['blackout-request','Blue Disabler','seat-5','REQUEST_BLACKOUT'],['activate-clone','Alien','seat-5','ACTIVATE_CLONE']]){
  const s=flowFor(view(role,seatId));assert.equal(s.flow.open(kind),true);assert.equal(s.flow.getState().step,'confirming');assert.equal(s.flow.confirm(),false);assert.equal(s.sent.length,0);
  await s.host.advance(DEFAULT_ACTION_FLOW_TIMING.controlGuardMs);assert.equal(s.flow.confirm(),true);await flush();assert.deepEqual(s.sent[0].command,{type});assert.ok(FullCommandRequestSchema.safeParse(s.sent[0]).success);
  assert.equal(s.flow.cancel(),false,'Sent request identifiers survive');s.flow.dispose();
 }
});
test('frozen slot selection opens at the dark boundary, needs a second tap and keeps exact logical position',async()=>{
 const s=flowFor(view('Blue Disabler','seat-5','BLACKOUT'));s.context.serverNowMs=4999;s.flow.observe(s.context);assert.equal(s.flow.open('blackout-slot'),false);
 s.context.serverNowMs=5000;s.flow.observe(s.context);assert.equal(s.flow.open('blackout-slot'),true);assert.equal(s.flow.pick('B5'),true);assert.equal(s.flow.getState().step,'confirming');assert.equal(s.sent.length,0);
 await s.host.advance(DEFAULT_ACTION_FLOW_TIMING.controlGuardMs);assert.equal(s.flow.confirm(),true);await flush();assert.deepEqual(s.sent[0].command,{type:'SELECT_BLACKOUT_SLOT',snapshotId:s.context.view.phase.id,room:'Room B',slotId:'B5'});s.flow.dispose();
});
test('dark Code uses all original numeric identities including offboard with no board hints',()=>{
 const v=view('Hacker','seat-6','BLACKOUT');v.seats[8]={...v.seats[8],location:null,slotId:null,revealedFaction:null};
 const model=buildConnectedPlayerShellModel({...environment,view:v,action:{step:'choosing',kind:'code',picked:[]}});
 assert.equal(model.match.boardLayout.dark,true);const choices=model.match.privateArea.content.actions.card.body.choices;assert.equal(choices.length,9);assert.ok(choices.every(c=>c.number===null&&c.detail===null));assert.ok(choices.some(c=>c.value==='seat-9'));
 const html=toHtml(renderComicPlayerShell(model,{phoneView:'actions',identities:v.seats.map((s,i)=>({seatId:s.seatId,displayName:`SecretlyNamed${i}`,characterId:`c${i+1}`}))}));
 assert.doesNotMatch(html,/SecretlyNamed|data-character|data-slot|phone-character-target|Injured|detained|Captain/);
 const publicView=boardV2View({stage:'BLACKOUT',profile:'clone',publicOnly:true,startedAt:0});const pub=toHtml(renderComicTableShell(buildTableShellModel({...environment,view:publicView})));
 assert.doesNotMatch(pub,/data-seat=|Injured|Eliminated/);
});

test('a blackout choice is bound to its original snapshot and room even when a slot label matches',()=>{
 const v=view('Blue Disabler','seat-5','BLACKOUT'),s=flowFor(v);const choice={kind:'blackout-slot',snapshotId:v.phase.id,room:'Room B',slotId:'B5'};
 assert.equal(isOffered(v,choice),true);for(const wrong of [{...choice,snapshotId:'obsolete-snapshot'},{...choice,room:'Room A'}]){assert.equal(isOffered(v,wrong),false);assert.equal(s.flow.open('blackout-slot'),true);assert.equal(s.flow.choose(wrong),false);assert.equal(s.flow.cancel(),true);}
 assert.equal(s.sent.length,0);s.flow.dispose();
});
