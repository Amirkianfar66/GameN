import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetSession,readPlanetServiceAnswer} from '../dist/index.js';
import {sessionScenario} from '../dev/planet/scenarios.mjs';
import {rig} from './planet-support.mjs';
function sessionRig(name='reading'){
 const base=rig(),requests=[],stores={resume:memory(),requests:memory()};let snapshot=sessionScenario(name,{now:1000}),uid='session-uid',lost=false,readDenied=false;
 const connection={mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(request){requests.push(structuredClone(request));if(lost)return null;const answer=result=>({ok:true,serverTimeMs:base.ports.clock.now(),result});
  if(request.operation==='read')return readDenied?{ok:false,serverTimeMs:base.ports.clock.now(),error:{code:'FORBIDDEN'}}:answer(structuredClone(snapshot));if(request.operation==='ready')snapshot.members.find(m=>m.seatId===snapshot.selfSeatId).ready=true;
  if(request.operation==='receipt')return answer({receipt:null});
  if(request.operation==='create')return answer({matchId:snapshot.matchId,roomCode:snapshot.roomCode});return answer({matchId:snapshot.matchId});}};
 const session=createPlanetSession(connection,base.ports,stores);
 return {session,connection,stores,ports:base.ports,requests,advance:base.advance,setLost:value=>{lost=value;},setReadDenied:value=>{readDenied=value;},setUid:value=>{uid=value;},get value(){return snapshot;},set value(v){snapshot=v;}};
}
function memory(){let value=null;return {load:()=>value,save:next=>{value=next;},clear:()=>{value=null;}};}

test('30-second minimum role reading and Ready require server-confirmed time; role starts concealed',async()=>{
 const r=sessionRig();await r.session.start('planet-local');assert.equal(r.session.getModel().ownRole,null);assert.equal(r.session.getModel().canReady,false);
 await r.session.operate({operation:'ready',matchId:'planet-local'});assert.equal(r.requests.some(x=>x.operation==='ready'),false);
 r.session.revealRole(true);assert.equal(r.session.getModel().ownRole.role,'Hacker');await r.advance(30001);await r.session.refresh();assert.equal(r.session.getModel().canReady,true);
 await r.session.operate({operation:'ready',matchId:'planet-local'});assert.equal(r.session.getModel().ownRole,null);assert.equal(r.session.getModel().status,'reading');assert.equal(r.session.getModel().canReady,false);r.session.dispose();
});
test('30-second character choice expires without a client-side role deal or automatic Ready',async()=>{
 const r=sessionRig('choosing');await r.session.start('planet-local');assert.equal(r.session.getModel().canChoose,true);await r.session.operate({operation:'chooseCharacter',matchId:'planet-local',characterId:'c6'});
 await r.advance(30001);await r.session.refresh();assert.equal(r.session.getModel().canChoose,false);assert.equal(r.session.getModel().status,'choosing');assert.equal(r.session.getModel().ownRole,null);assert.equal(r.requests.some(x=>x.operation==='ready'),false);r.session.dispose();
});
test('hide immediately removes role, identity and recovery secret; foreground requires a fresh read',async()=>{
 const r=sessionRig();await r.session.start('planet-local');r.session.revealRole(true);assert.ok(r.session.getModel().ownRole);r.session.setVisible(false);assert.equal(r.session.getModel().ownRole,null);assert.deepEqual(r.session.getModel().members,[]);
 r.session.setVisible(true);await r.session.refresh();assert.equal(r.session.getModel().ownRole,null);r.session.dispose();
});
test('unknown public setup request survives reload with identical request ID and body, without role knowledge',async()=>{
 const r=sessionRig('host');r.setLost(true);await r.session.start();await r.session.operate({operation:'create',playerCount:9});assert.equal(r.session.getModel().uncertain,true);const original=r.requests.find(x=>x.operation==='create');
 const saved=r.stores.requests.load();assert.ok(!saved.includes('Hacker'));assert.ok(!saved.includes('knowledge'));r.session.dispose();r.setLost(false);
 const resumed=createPlanetSession(r.connection,r.ports,r.stores);await resumed.start();assert.equal(resumed.getModel().uncertain,true);await resumed.retry();assert.deepEqual(r.requests.filter(x=>x.operation==='create').at(-1),original);assert.equal(resumed.getModel().matchId,'planet-local');resumed.dispose();
});
test('public game feed receives only the public view and neutral identities',async()=>{
 const r=sessionRig('board');await r.session.start('planet-local');const transport=r.session.gameTransport('display');const binding=await transport.authenticate();assert.equal(binding.seatId,null);let delivered=null;
 const stop=transport.listen({matchId:'planet-local',seatId:null},{snapshot:s=>{delivered=s.value;},error(){}});assert.equal(delivered.board.kind,'FINALIZED');assert.equal(delivered.self,undefined);assert.equal(delivered.promises,undefined);assert.equal(delivered.windows,undefined);assert.equal(transport.identities().length,9);stop();r.session.dispose();
});
test('session audience mismatch and changed binding fail closed',async()=>{
 const r=sessionRig('board');await r.session.start('planet-local');r.value.selfSeatId='seat-1';await r.session.refresh();assert.equal(r.session.getModel().connection,'error');assert.equal(r.session.getModel().members.length,0);assert.equal(r.session.getModel().ownRole,null);r.session.dispose();
});
test('session and game views cannot activate artwork from different otherwise valid pins',async()=>{
 const r=sessionRig('board');r.value.publicView.versions.assetManifestVersion='design-0.5.0';await r.session.start('planet-local');assert.equal(r.session.getModel().connection,'error');assert.equal(r.session.getModel().versions,null);assert.equal(r.session.getModel().members.length,0);r.session.dispose();
});
test('server answer reader refuses malformed wrappers and does not surface raw diagnostics',()=>{
 assert.equal(readPlanetServiceAnswer({ok:true,serverTimeMs:1000,result:{},debug:'raw'}),null);assert.equal(readPlanetServiceAnswer({ok:false,serverTimeMs:1000,error:{code:'raw secret'}}),null);assert.equal(readPlanetServiceAnswer({ok:true,serverTimeMs:NaN,result:{}}),null);
});
test('a registered join waits across forbidden reads and reload without granting display authority',async()=>{
 const r=sessionRig('display');r.setReadDenied(true);await r.session.start();await r.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:'display',displayName:'Screen'});
 assert.deepEqual(r.session.getModel().pendingAdmission,{kind:'display',roomCode:'PLANET'});assert.equal(r.session.getModel().status,null);assert.match(r.session.getModel().message,/Waiting for the server to confirm admission/);assert.deepEqual(r.session.getModel().members,[]);
 const saved=r.stores.resume.load();assert.equal(JSON.parse(saved).ownerUid,'session-uid');assert.ok(!saved.includes('Hacker'));r.session.dispose();
 const resumed=createPlanetSession(r.connection,r.ports,r.stores);await resumed.start();assert.equal(resumed.getModel().pendingAdmission.kind,'display');
 r.setReadDenied(false);await resumed.refresh();assert.equal(resumed.getModel().status,null);assert.equal(resumed.getModel().pendingAdmission.kind,'display');assert.deepEqual(resumed.gameTransport('display').identities(),[]);await assert.rejects(resumed.gameTransport('display').authenticate());
 resumed.setVisible(false);assert.equal(resumed.getModel().pendingAdmission,null);resumed.dispose();
});
test('an assigned player seat confirms membership while a pending join never supplies a seat',async()=>{
 const r=sessionRig('board');r.setReadDenied(true);await r.session.start();await r.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:'player',displayName:'Player'});
 assert.equal(r.session.getModel().selfSeatId,null);r.setReadDenied(false);await r.session.refresh();assert.equal(r.session.getModel().pendingAdmission,null);assert.equal(r.session.getModel().selfSeatId,'seat-6');assert.equal((await r.session.gameTransport('player').authenticate()).seatId,'seat-6');r.session.dispose();
});
test('join context cannot be inherited by a different signed-in identity',async()=>{
 const r=sessionRig('display');r.setReadDenied(true);await r.session.start();await r.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:'display',displayName:'Screen'});r.session.dispose();r.setUid('other-user');
 const resumed=createPlanetSession(r.connection,r.ports,r.stores);await resumed.start();assert.equal(resumed.getModel().connection,'error');assert.equal(resumed.getModel().pendingAdmission,null);assert.deepEqual(resumed.getModel().members,[]);resumed.dispose();
});
test('join names use the shared Unicode code-point limit and give useful feedback before sending',async()=>{
 const r=sessionRig('display');r.setReadDenied(true);await r.session.start();const action={operation:'requestAdmission',roomCode:'PLANET',kind:'display'};
 for(const displayName of ['x'.repeat(13),'   ','bad\u0000name']){await r.session.operate({...action,displayName});assert.match(r.session.getModel().message,/1–12 characters/);}
 assert.equal(r.requests.length,0);const displayName='😀'.repeat(12);await r.session.operate({...action,displayName});assert.equal(r.requests.find(x=>x.operation==='requestAdmission').displayName,displayName);r.session.dispose();
});
test('seat recovery reads the server-confirmed match and never persists the recovery secret',async()=>{
 const r=sessionRig('board');await r.session.start();const recoveryCode='private-recovery-code-123';await r.session.operate({operation:'redeemRecovery',matchId:'planet-local',recoveryCode});
 assert.equal(r.session.getModel().matchId,'planet-local');assert.equal(r.session.getModel().selfSeatId,'seat-6');assert.equal(r.session.getModel().uncertain,false);assert.equal(r.stores.requests.load(),null);assert.ok(!r.stores.resume.load().includes(recoveryCode));r.session.dispose();
});
