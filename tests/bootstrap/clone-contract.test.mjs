import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullCommandSchema,FullCloneStatusSchema,FullPlayerViewSchema,CLONE_VERSION_PINS,BLACKOUT_VERSION_PINS } from '@mothership/contracts';
import { createFullGame,advanceFullGame,executeFullGame,projectFullGame } from '@mothership/engine';
import { choosePracticeBotActions } from '../../services/game-api/dist/practice-bot-policy.js';
const roles=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Officer'];
for(const count of [7,8,9])test(`${count}: private Clone status and bot activation use the reviewed exact successor without public facts`,()=>{
  let seq=0;const ids=roles.slice(0,count).map((_,i)=>`seat-${i+1}`),context=now=>({now,nextPhaseId:`clone-p-${++seq}`,nextDeadlineToken:`clone-t-${seq}`});
  let state=createFullGame({matchId:'clone-contract',now:1000,phaseId:'initial-p',deadlineToken:'initial-t',assetManifestVersion:'synthetic-clone-assets',versions:{...CLONE_VERSION_PINS,assetManifestVersion:'synthetic-clone-assets'},
    setup:{playerCount:count,roleOrder:roles.slice(0,count),codeExtraSeatIds:['seat-1','seat-2','seat-3'],initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<5?'Room A':'Room B'])),roundOrders:Array.from({length:5},()=>ids)}});
  while(state.activeSeatId!=='seat-7')state=advanceFullGame(state,{...context(state.phase.endsAt),phaseId:state.phase.id,deadlineToken:state.deadlineToken}).state;
  const before=projectFullGame(state),own=before.players['seat-7'];assert.equal(Object.hasOwn(before.public,'cloneStatus'),false);
  assert.deepEqual(own.self.cloneStatus,{used:false,activatedRound:null,expiresAfterRound:null,active:false});
  for(const id of ids.filter(id=>id!=='seat-7'))assert.equal(before.players[id].self.cloneStatus,null);
  assert.ok(choosePracticeBotActions(own).some(command=>command.type==='ACTIVATE_CLONE'));
  const result=executeFullGame(state,'seat-7',{protocolVersion:2,matchId:state.matchId,phaseId:state.phase.id,commandId:'activate-private-clone',command:{type:'ACTIVATE_CLONE'}},context(state.phase.startedAt+1));
  assert.equal(result.receipt.status,'accepted');state=result.state;const after=projectFullGame(state);
  assert.deepEqual(after.public,before.public);for(const id of ids.filter(id=>id!=='seat-7'))assert.deepEqual(after.players[id],before.players[id]);
  assert.deepEqual(after.players['seat-7'].self.cloneStatus,{used:true,activatedRound:1,expiresAfterRound:2,active:true});
  assert.equal(choosePracticeBotActions(after.players['seat-7']).some(command=>command.type==='ACTIVATE_CLONE'),false);
  const wrongPin={...after.players['seat-7'],versions:{...BLACKOUT_VERSION_PINS,assetManifestVersion:'synthetic-clone-assets'}};
  assert.equal(FullPlayerViewSchema.safeParse(wrongPin).success,false);
  const missing=structuredClone(after.players['seat-7']);delete missing.self.cloneStatus;assert.equal(FullPlayerViewSchema.safeParse(missing).success,false);
  const non=before.players['seat-1'];assert.equal(FullPlayerViewSchema.safeParse({...non,self:{...non.self,cloneStatus:own.self.cloneStatus}}).success,false);
  for(const patch of [{expiresAfterRound:5},{activatedRound:2},{cause:'Clone'},{used:false},{expiresAfterRound:6},{active:false}])assert.equal(FullPlayerViewSchema.safeParse({...after.players['seat-7'],self:{...after.players['seat-7'].self,cloneStatus:{...after.players['seat-7'].self.cloneStatus,...patch}}}).success,false);
});
test('Clone command is targetless and private expiry metadata is strictly original',()=>{
  assert.deepEqual(FullCommandSchema.parse({type:'ACTIVATE_CLONE'}),{type:'ACTIVATE_CLONE'});
  for(const field of [{targetSeatId:'seat-7'},{duration:3},{role:'Alien'}])assert.equal(FullCommandSchema.safeParse({type:'ACTIVATE_CLONE',...field}).success,false);
  assert.equal(FullCloneStatusSchema.safeParse({used:true,activatedRound:5,expiresAfterRound:5,active:true}).success,true);
  for(const v of [{used:false,activatedRound:null,expiresAfterRound:null,active:true},{used:true,activatedRound:4,expiresAfterRound:6,active:true},{used:true,activatedRound:1,expiresAfterRound:3,active:true}])assert.equal(FullCloneStatusSchema.safeParse(v).success,false);
});
