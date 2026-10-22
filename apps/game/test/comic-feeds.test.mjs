import test from 'node:test';
import assert from 'node:assert/strict';
import { createComicFeeds, createConnectedApi, createLifecycleRequests, documentPath } from '@mothership/game';
import { createFakeHost } from './support/fakes.mjs';
import { createFakeConnectedTransport, MATCH } from './support/connected.mjs';

const target = kind => ({ kind, matchId: MATCH });
const ack = (bindingRevision = 1) => ({ schemaVersion:1, protocolVersion:2, matchId:MATCH, seatId:'seat-1', bindingRevision, revision:bindingRevision+1, historyAvailable:true,
  supplierResults:[{round:3,commandId:'supply-1',successfulRecipientSeatIds:[]}],receivedSupply:[] });
const session = (bindingRevision = 1) => ({ schemaVersion:1, protocolVersion:2, matchId:MATCH, seatId:'seat-1', bindingRevision });
const identity = revision => ({schemaVersion:1,protocolVersion:2,matchId:MATCH,catalogVersion:'crew-0.1.0',revision,locked:false,seats:[{seatId:'seat-1',displayName:'Ada',characterId:'c8'}]});
function setup(seatId = 'seat-1') {
  const host=createFakeHost(); const fake=createFakeConnectedTransport(host);
  fake.transport.currentUid=()=> 'test-uid-1';
  const feeds=createComicFeeds({transport:fake.transport,ports:host.ports,matchId:MATCH,...(seatId ? {seatId}: {})}); feeds.start();
  return {host,fake,feeds};
}
test('private acknowledgments require fresh matching own seat metadata; empty success is retained', async () => {
  const {fake,feeds}=setup();
  await fake.deliver(target('own-acknowledgments'),ack()); assert.equal(feeds.acknowledgments(),null);
  await fake.deliver(target('seat-session'),session()); assert.deepEqual(feeds.acknowledgments().supplierResults[0].successfulRecipientSeatIds,[]);
  await fake.deliver(target('seat-session'),session(),false); assert.equal(feeds.acknowledgments(),null);
  await fake.deliver(target('seat-session'),session(2)); assert.equal(feeds.acknowledgments(),null);
  await fake.deliver(target('own-acknowledgments'),ack(2)); assert.equal(feeds.acknowledgments().bindingRevision,2);
  await fake.fail(target('own-acknowledgments'),'authorization-uncertain'); assert.equal(feeds.acknowledgments(),null);
  feeds.dispose();
});
test('wrong audience, changed same revision and confirmed regression quarantine their stream', async () => {
  for(const change of [a=>({...a,seatId:'seat-2'}),a=>({...a,matchId:'other'}),a=>({...a,privateRole:'Officer'})]) {
    const {fake,feeds}=setup(); await fake.deliver(target('seat-session'),session());
    await fake.deliver(target('own-acknowledgments'),change(ack()));
    await fake.deliver(target('own-acknowledgments'),ack());
    assert.equal(feeds.acknowledgments(),null); feeds.dispose();
  }
  for(const next of [{...identity(3),seats:[{seatId:'seat-1',displayName:'Ben',characterId:'c8'}]},identity(2)]) {
    const {fake,feeds}=setup(); await fake.deliver(target('identities'),identity(3));
    await fake.deliver(target('identities'),next); assert.equal(feeds.identities(),null); feeds.dispose();
  }
});
test('missing legacy sidecars are supported and table devices never subscribe to private documents', async () => {
  const {fake,feeds}=setup(null);
  await fake.deliver(target('identities'),null); assert.equal(feeds.identities(),null);
  assert.equal(fake.listeners(target('own-acknowledgments')),0); assert.equal(fake.listeners(target('seat-session')),0);
  assert.deepEqual(documentPath(target('own-acknowledgments'),'own-uid'),['matches',MATCH,'ownAcknowledgments','own-uid']);
  assert.throws(()=>documentPath(target('seat-session'),'uid/other'));
  feeds.dispose(); assert.equal(fake.listeners(target('identities')),0);
});
test('identity retries retain the original choice after a lost response; private payloads are never persisted', async () => {
  const host=createFakeHost(); const fake=createFakeConnectedTransport(host); const api=createConnectedApi(fake.transport,host.ports);
  const saved=[]; const flow=createLifecycleRequests({ids:host.ports.ids,clock:host.ports.clock,store:{load:()=>null,save:value=>saved.push(value)}});
  let first=true;
  fake.respond.v1SetLobbyIdentity=async()=>{if(first){first=false;throw Error('lost');}return{schemaVersion:1,protocolVersion:2,ok:true,serverTimeMs:host.serverNow(),revision:8};};
  const request=requestId=>({schemaVersion:1,protocolVersion:2,matchId:MATCH,requestId,displayName:'Ada',characterId:'c8'});
  const send=()=>flow.send('identity',request,value=>api.setLobbyIdentity(value),{durable:true});
  assert.equal((await send()).kind,'unsettled');
  const result=await flow.send('identity',id=>({...request(id),displayName:'Changed',characterId:'c2'}),value=>api.setLobbyIdentity(value));
  assert.equal(result.kind,'done'); assert.deepEqual(fake.calls[0].body,fake.calls[1].body);
  assert.doesNotMatch(JSON.stringify(saved),/Ada|c8|displayName/);
});
test('identity API rejects unsupported versions and fields and preserves meaningful refusal codes', async () => {
  const host=createFakeHost(); const fake=createFakeConnectedTransport(host); const api=createConnectedApi(fake.transport,host.ports);
  const request={schemaVersion:1,protocolVersion:2,matchId:MATCH,requestId:'identity-1',displayName:'Hacker',characterId:'c1'};
  for(const code of ['CHARACTER_TAKEN','IDENTITY_LOCKED','RATE_LIMITED']) {
    fake.respond.v1SetLobbyIdentity=async()=>({schemaVersion:1,protocolVersion:2,ok:false,serverTimeMs:host.serverNow(),error:{code}});
    assert.equal((await api.setLobbyIdentity(request)).code,code);
  }
  fake.respond.v1SetLobbyIdentity=async()=>({schemaVersion:2,protocolVersion:2,ok:true,serverTimeMs:host.serverNow(),revision:1});
  assert.equal((await api.setLobbyIdentity(request)).kind,'no-response');
  const count=fake.calls.length;
  await assert.rejects(()=>api.setLobbyIdentity({...request,seatId:'seat-2'}));
  assert.equal(fake.calls.length,count);
});
test('quarantine clears both sides immediately and keeps revision checks when subscriptions restart', async()=>{
  const {fake,feeds}=setup();
  await fake.deliver(target('seat-session'),session()); await fake.deliver(target('own-acknowledgments'),ack());
  await fake.deliver(target('identities'),identity(4));
  assert.notEqual(feeds.acknowledgments(),null);
  feeds.quarantine(); assert.equal(feeds.acknowledgments(),null);assert.equal(feeds.identities(),null);
  assert.equal(fake.listeners(target('seat-session')),0);
  feeds.start(); await fake.deliver(target('own-acknowledgments'),ack());assert.equal(feeds.acknowledgments(),null);
  await fake.deliver(target('seat-session'),session());assert.notEqual(feeds.acknowledgments(),null);
  await fake.deliver(target('identities'),identity(3));assert.equal(feeds.identities(),null);
  await fake.deliver(target('identities'),identity(4));assert.equal(feeds.identities(),null);
  feeds.dispose();
});

test('held sidecars cannot be returned under a different Auth identity even before another callback',async()=>{
  const {fake,feeds}=setup();
  await fake.deliver(target('seat-session'),session());await fake.deliver(target('own-acknowledgments'),ack());
  await fake.deliver(target('identities'),identity(1));
  assert.notEqual(feeds.acknowledgments(),null);
  fake.transport.currentUid=()=> 'replacement-identity';
  assert.equal(feeds.acknowledgments(),null);assert.equal(feeds.identities(),null);
  feeds.dispose();
});
