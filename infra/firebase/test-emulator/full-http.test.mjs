import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { observeSetupDeadline, setupDocument } from '../../../services/game-api/test-emulator/staged-start-helper.mjs';
import { FullPublicViewSchema, FullPlayerViewSchema, FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema, FullSetupPlayerViewSchema } from '@mothership/contracts';
import { assertLocalEmulators, projectId, createEmulatorIdentity, refreshEmulatorIdentity, firestoreRequest } from '../test/helpers.mjs';

const operations = new Set(['v1CreateMatch','v1RequestAdmission','v1ApproveAdmission','v1AdmitDisplay','v1StartMatch','v1BeginSetup','v1ConfirmSetupChoice','v1ReadyForMatch','v1Command','v1Receipt','v1Advance','v1ServerTime','v1AbortMatch']);
async function invoke(name, payload, identity, origin = 'http://localhost:5173') {
  const { functionsHost } = assertLocalEmulators();
  if (!operations.has(name)) throw new Error('Unknown local V1 smoke endpoint');
  const response = await fetch(`http://${functionsHost}/${projectId}/us-central1/${name}`, {
    signal:AbortSignal.timeout(30_000),method:'POST',headers:{'content-type':'application/json',origin,...(identity?{authorization:`Bearer ${identity.idToken}`}:{})},body:JSON.stringify(payload),
  });
  const raw=await response.text();
  let body; try {body=JSON.parse(raw);} catch {body=raw;}
  return {status:response.status,headers:response.headers,body};
}
function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values??[]).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields??{}).map(([key,item])=>[key,decode(item)]));
  throw new Error('Unsupported local Firestore projection value');
}
async function readView(path,identity,schema) {
  const response=await firestoreRequest(path,{idToken:identity.idToken});
  assert.equal(response.status,200);
  return schema.parse(decode({mapValue:{fields:response.body.fields}}));
}
const requestId=()=>randomUUID();

test('real V1 Functions authenticate seven players, wait both setup windows, register/retry MOVE and keep display commands forbidden', { timeout: 180_000 }, async () => {
  assertLocalEmulators();
  const app=initializeApp({projectId},'timed-http-'+randomUUID()),db=getFirestore(app);
  try {
  const [host,display,...players]=await Promise.all(Array.from({length:9},()=>createEmulatorIdentity()));
  const create={protocolVersion:2,requestId:requestId(),playerCount:7};
  assert.equal((await invoke('v1CreateMatch',create)).status,401);
  assert.equal((await invoke('v1CreateMatch',create,host,'https://unlisted.example.test')).status,403);
  const created=await invoke('v1CreateMatch',create,host);
  assert.equal(created.status,200,JSON.stringify(created.body)); assert.equal(created.body.ok,true);
  assert.equal(created.headers.get('access-control-allow-origin'),'http://localhost:5173');
  assert.equal(created.headers.get('cache-control'),'no-store, private');
  const {matchId,roomCode}=created.body.result,root=`matches/${matchId}`;
  const h={base:db.collection('matches').doc(matchId)};
  const again=await invoke('v1CreateMatch',create,host);
  assert.deepEqual(again.body.result,created.body.result);
  const admissions=await Promise.all(players.map((identity,index)=>invoke('v1RequestAdmission',{
    protocolVersion:2,requestId:requestId(),roomCode,initialRoom:index%2?'Room B':'Room A',
  },identity)));
  for (const admission of admissions) {assert.equal(admission.status,200,JSON.stringify(admission.body));assert.equal(admission.body.ok,true);}
  for (let index=0;index<players.length;index++) {
    const approved=await invoke('v1ApproveAdmission',{protocolVersion:2,matchId,requestId:requestId(),admissionId:admissions[index].body.result.admissionId,seatId:`seat-${index+1}`},host);
    assert.equal(approved.status,200,JSON.stringify(approved.body));assert.equal(approved.body.ok,true);
  }
  const admitted=await invoke('v1AdmitDisplay',{protocolVersion:2,matchId,requestId:requestId(),displayUid:display.uid},host);
  assert.equal(admitted.status,200);assert.equal(admitted.body.ok,true);
  const legacy=await invoke('v1StartMatch',{protocolVersion:2,matchId,requestId:requestId()},host);
  assert.equal(legacy.status,403); assert.equal(legacy.body.error.code,'FORBIDDEN');
  const setupRequest=fields=>({schemaVersion:1,protocolVersion:2,matchId,requestId:requestId(),...fields});
  const begun=await invoke('v1BeginSetup',setupRequest(),host);
  assert.equal(begun.status,200,JSON.stringify(begun.body));
  assert.equal(FullBeginSetupResponseSchema.parse(begun.body).stage,'choosing');
  for (let index=0;index<players.length;index++) {
    const confirmed=await invoke('v1ConfirmSetupChoice',setupRequest({bindingRevision:1,displayName:`Player ${index+1}`,characterId:`c${index+1}`}),players[index]);
    assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
    assert.equal(FullConfirmSetupChoiceResponseSchema.parse(confirmed.body).stage,'choosing');
  }
  assert.equal((await firestoreRequest(`${root}/views/public`,{idToken:display.idToken})).status,403);
  const choosing=await setupDocument(h);
  assert.equal(choosing.stage,'choosing'); assert.equal(choosing.choosingEndsAt-choosing.choosingStartedAt,30_000);
  assert.equal((await h.base.collection('engine').doc('current').get()).exists,false);
  // Observe actual local Firestore dispatch and Tasks delivery after the real
  // deadline. No direct setup worker or browser advancement supplies progress.
  const reading=await observeSetupDeadline(h,choosing);
  assert.equal(reading.readingEndsAt-reading.readingStartedAt,30_000);
  for (let index=0;index<players.length;index++) {
    const own=await readView(`${root}/setupPlayerViews/${players[index].uid}`,players[index],FullSetupPlayerViewSchema);
    assert.equal((await firestoreRequest(`${root}/setupPlayerViews/${players[index].uid}`,{idToken:host.idToken})).status,403);
    const ready=await invoke('v1ReadyForMatch',setupRequest({bindingRevision:own.bindingRevision,dealId:own.dealId}),players[index]);
    assert.equal(ready.status,200,JSON.stringify(ready.body));
    assert.equal(FullReadyForMatchResponseSchema.parse(ready.body).stage,'awaiting-ready');
    assert.equal((await firestoreRequest(`${root}/views/public`,{idToken:display.idToken})).status,403);
  }
  assert.equal((await setupDocument(h)).stage,'awaiting-ready');
  assert.equal((await h.base.collection('engine').doc('current').get()).exists,false);
  await observeSetupDeadline(h,reading);
  const publicView=await readView(`${root}/views/public`,display,FullPublicViewSchema);
  assert.equal(publicView.playerCount,7);assert.equal(publicView.phase.kind,'ORDINARY_TURN');
  assert.equal(publicView.phase.endsAt-publicView.phase.startedAt,60_000);
  assert.ok(publicView.phase.startedAt>=reading.readingEndsAt);
  const setupEvents=(await h.base.collection('events').where('kind','==','SETUP').get()).docs;
  assert.equal(setupEvents.length,1,'Automatic setup must launch once');
  assert.equal(setupEvents[0].get('phaseId'),publicView.phase.id);
  assert.equal(setupEvents[0].get('now'),publicView.phase.startedAt);
  const initialOutbox=(await h.base.collection('outbox').where('phaseId','==',publicView.phase.id).get()).docs;
  assert.equal(initialOutbox.length,1);
  assert.equal(initialOutbox[0].get('matchId'),matchId);
  assert.equal(initialOutbox[0].get('deadlineToken'),setupEvents[0].get('deadlineToken'));
  assert.equal(initialOutbox[0].get('endsAt'),publicView.phase.endsAt);
  assert.equal((await h.base.collection('engine').doc('current').get()).get('deadlineToken'),setupEvents[0].get('deadlineToken'));

  const earlyAdvance=await invoke('v1Advance',{protocolVersion:2,matchId,phaseId:publicView.phase.id},display);
  assert.equal(earlyAdvance.status,200);assert.equal(earlyAdvance.body.result,'unchanged');
  const override=await invoke('v1Advance',{protocolVersion:2,matchId,phaseId:publicView.phase.id,now:publicView.phase.endsAt},display);
  assert.equal(override.status,400);assert.equal(override.body.error.code,'INVALID_REQUEST');
  assert.equal(JSON.stringify(publicView).includes('role'),false);
  const actorIndex=Number(publicView.activeSeatId.slice(5))-1,actor=players[actorIndex];
  const privateView=await readView(`${root}/playerViews/${actor.uid}`,actor,FullPlayerViewSchema);
  assert.ok(privateView.self.movementDestinations.length>0);
  const command={protocolVersion:2,matchId,phaseId:publicView.phase.id,commandId:requestId(),command:{type:'MOVE',destination:privateView.self.movementDestinations[0]}};
  const denied=await invoke('v1Command',command,display);
  assert.equal(denied.status,403);assert.equal(denied.body.error.code,'FORBIDDEN');
  const accepted=await invoke('v1Command',command,actor);
  assert.equal(accepted.status,200,JSON.stringify(accepted.body));assert.equal(accepted.body.receipt.status,'accepted');
  const refreshed=await refreshEmulatorIdentity(actor.refreshToken);
  assert.equal(refreshed.uid,actor.uid);
  const retried=await invoke('v1Command',command,refreshed);
  assert.equal(retried.status,200);assert.deepEqual(retried.body.receipt,accepted.body.receipt);
  const receipt=await invoke('v1Receipt',{protocolVersion:2,matchId,commandId:command.commandId},refreshed);
  assert.equal(receipt.status,200);assert.equal(receipt.body.status,'found');assert.deepEqual(receipt.body.receipt,accepted.body.receipt);
  assert.equal((await invoke('v1ServerTime',{protocolVersion:2,matchId},display)).status,200);
  const updated=await readView(`${root}/views/public`,display,FullPublicViewSchema);
  assert.equal(updated.seats.find(seat=>seat.seatId===publicView.activeSeatId).location,command.command.destination);
  assert.equal((await firestoreRequest(`${root}/playerViews/${actor.uid}`,{idToken:display.idToken})).status,403);
  const aborted=await invoke('v1AbortMatch',{protocolVersion:2,matchId,requestId:requestId()},host);
  assert.equal(aborted.status,200,JSON.stringify(aborted.body));assert.equal(aborted.body.ok,true);
  const terminal=await readView(`${root}/views/public`,display,FullPublicViewSchema);
  assert.equal(terminal.phase.kind,'ABORTED');assert.equal(terminal.phase.endsAt,null);assert.equal(terminal.result,null);
  } finally { await db.terminate(); await deleteApp(app); }
});
