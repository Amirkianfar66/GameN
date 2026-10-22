import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectedApi, createLifecycleRequests } from '@mothership/game';
import { createFakeHost } from './support/fakes.mjs';
import { createFakeConnectedTransport, MATCH } from './support/connected.mjs';
const base = { schemaVersion:1, protocolVersion:2, matchId:MATCH, requestId:'setup-1' };
const cases = [
  ['beginSetup','v1BeginSetup',base,{stage:'choosing',dealId:null}],
  ['confirmSetupChoice','v1ConfirmSetupChoice',{...base,bindingRevision:1,displayName:'Ada',characterId:'c8'},{seatId:'seat-1',bindingRevision:1,stage:'awaiting-ready',dealId:'deal-1'}],
  ['readyForMatch','v1ReadyForMatch',{...base,bindingRevision:1,dealId:'deal-1'},{seatId:'seat-1',bindingRevision:1,stage:'running',dealId:'deal-1'}],
];
test('each startup operation validates immutable requests and correlates strict replies', async()=>{
  for(const [method,operation,request,fields] of cases) {
    const host=createFakeHost(),fake=createFakeConnectedTransport(host),api=createConnectedApi(fake.transport,host.ports);
    const success={...base,ok:true,serverTimeMs:host.serverNow(),revision:4,...fields};
    fake.respond[operation]=async()=>success;
    assert.equal((await api[method](request)).kind,'done');
    for(const change of [{requestId:'other'},{matchId:'other'},{schemaVersion:2},{privateRole:'Alien'}, ...(method==='readyForMatch'?[{dealId:'wrong'},{bindingRevision:2}]:[])]) {
      fake.respond[operation]=async()=>({...success,...change});
      assert.equal((await api[method](request)).kind,'no-response');
    }
    const count=fake.calls.length; await assert.rejects(()=>api[method]({...request,role:'Alien'}));assert.equal(fake.calls.length,count);
    for(const code of ['SETUP_LOCKED','STALE_DEAL','STALE_BINDING','CHARACTER_TAKEN','NAME_TAKEN','ROSTER_INCOMPLETE']) {
      fake.respond[operation]=async()=>({schemaVersion:1,protocolVersion:2,ok:false,serverTimeMs:host.serverNow(),error:{code}});
      assert.equal((await api[method](request)).code,code);
    }
  }
});
test('a lost Ready reply retries the same deal/binding/request without persisting setup content',async()=>{
  const host=createFakeHost(),fake=createFakeConnectedTransport(host),api=createConnectedApi(fake.transport,host.ports),saved=[];
  const flow=createLifecycleRequests({ids:host.ports.ids,clock:host.ports.clock,store:{load:()=>null,save:value=>saved.push(value)}});
  let first=true;
  fake.respond.v1ReadyForMatch=async request=>{if(first){first=false;throw Error('lost');}return{...request,ok:true,serverTimeMs:host.serverNow(),revision:3,seatId:'seat-1',stage:'awaiting-ready'};};
  const build=requestId=>({...base,requestId,bindingRevision:1,dealId:'deal-1'});
  assert.equal((await flow.send('ready',build,request=>api.readyForMatch(request))).kind,'unsettled');
  assert.equal((await flow.send('ready',requestId=>({...build(requestId),bindingRevision:2,dealId:'deal-other'}),request=>api.readyForMatch(request))).kind,'done');
  assert.deepEqual(fake.calls[0].body,fake.calls[1].body);assert.doesNotMatch(JSON.stringify(saved),/deal-1|role|displayName/);
});

test('host control reads legacy and coherent staged setup without accepting arbitrary schema drift', async()=>{
  const {readHostSession}=await import('@mothership/game');
  const legacy={protocolVersion:2,hostUid:'host-uid',playerCount:7,status:'lobby',roomCode:'A1B2C3D4E5F6',createdAt:1000};
  assert.equal(readHostSession(legacy).kind,'accepted');
  for(const status of ['lobby','choosing','awaiting-ready','running','complete','aborted']){
    const read=readHostSession({...legacy,status,lifecycleVersion:'staged-start-1',gameStarted:['running','complete'].includes(status)});
    assert.equal(read.kind,'accepted',status);assert.equal(read.value.status,['choosing','awaiting-ready'].includes(status)?'lobby':status);
  }
  for(const change of [{gameStarted:false},{lifecycleVersion:'other',gameStarted:false},{lifecycleVersion:'staged-start-1'},
    {lifecycleVersion:'staged-start-1',gameStarted:true},{status:'choosing'},{lifecycleVersion:'staged-start-1',gameStarted:false,role:'Hacker'}]){
    assert.equal(readHostSession({...legacy,...change}).kind,'rejected');
  }
});
