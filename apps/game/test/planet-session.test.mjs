import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetSession,readPlanetServiceAnswer} from '../dist/index.js';
import {sessionScenario} from '../dev/planet/scenarios.mjs';
import {rig} from './planet-support.mjs';
function sessionRig(name='reading'){
 const base=rig(),requests=[],stores={resume:memory(),requests:memory()};let snapshot=sessionScenario(name,{now:1000}),uid='session-uid',lost=false,readDenied=false;
 const connection={mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(request){requests.push(structuredClone(request));if(lost)return null;const answer=result=>({ok:true,serverTimeMs:base.ports.clock.now(),result});
  if(request.operation==='requestAdmission')snapshot.admission={requestId:request.requestId,kind:request.kind,status:'admitted'};
  if(request.operation==='read')return readDenied?{ok:false,serverTimeMs:base.ports.clock.now(),error:{code:'FORBIDDEN'}}:answer(structuredClone(snapshot));if(request.operation==='ready')snapshot.members.find(m=>m.seatId===snapshot.selfSeatId).ready=true;
  if(request.operation==='receipt')return answer({receipt:null});
  if(request.operation==='redeemRecovery')return answer({matchId:request.matchId,seatId:snapshot.selfSeatId});
  if(request.operation==='create')return answer({matchId:snapshot.matchId,roomCode:snapshot.roomCode});return answer({matchId:snapshot.matchId});}};
 const session=createPlanetSession(connection,base.ports,stores);
 return {session,connection,stores,ports:base.ports,requests,advance:base.advance,setLost:value=>{lost=value;},setReadDenied:value=>{readDenied=value;},setUid:value=>{uid=value;},get value(){return snapshot;},set value(v){snapshot=v;}};
}
function memory(){let value=null;return {load:()=>value,save:next=>{value=next;},clear:()=>{value=null;}};}

test('R17 projects admitted setup and display time only; expiry never starts the client game',async()=>{
 const r=sessionRig(),s=r.value;s.setupFlowVersion=2;s.status='boarding';s.setup={id:'synthetic-boarding',startedAt:1000,endsAt:11000};s.privateRole=null;s.publicView=null;s.playerView=null;for(const member of s.members)member.ready=true;
 await r.session.start('planet-local');const model=r.session.getModel();assert.equal(model.status,'boarding');assert.equal(model.setupFlowVersion,2);assert.deepEqual(model.setup,s.setup);assert.equal(model.setupClock.status,'synced');assert.equal(model.ownRole,null);assert.equal(model.canReady,false);
 await r.advance(11000);assert.equal(r.session.getModel().status,'boarding');assert.equal(r.session.getModel().remainingMs,0);assert.equal(r.requests.some(q=>q.operation==='advance'||q.operation==='ready'),false);
 r.session.setVisible(false);assert.equal(r.session.getModel().setup,null);assert.equal(r.session.getModel().setupFlowVersion,null);assert.deepEqual(r.session.getModel().setupClock,{status:'unsynced'});assert.deepEqual(r.session.getModel().members,[]);r.session.dispose();
});

test('unknown explicit setup flow fails closed while historical reading keeps its old behavior',async()=>{
 const bad=sessionRig();bad.value.setupFlowVersion=3;await bad.session.start('planet-local');assert.equal(bad.session.getModel().connection,'error');assert.equal(bad.session.getModel().setup,null);assert.deepEqual(bad.session.getModel().members,[]);bad.session.dispose();
 const legacy=sessionRig();await legacy.session.start('planet-local');assert.equal(legacy.session.getModel().setupFlowVersion,null);assert.equal(legacy.session.getModel().status,'reading');legacy.session.revealRole(true);assert.equal(legacy.session.getModel().ownRole.role,'Hacker');legacy.session.dispose();
});

test('the schema compatibility checkpoint never exposes an unfinished timed role flow',async()=>{
 const r=sessionRig();r.value.setupFlowVersion=3;r.value.setup={id:'timed-reading',startedAt:1000,roleFilmStartsAt:21000,endsAt:31000};
 await r.session.start('planet-local');r.session.revealRole(true);
 assert.equal(r.session.getModel().connection,'error');assert.equal(r.session.getModel().ownRole,null);assert.equal(r.session.getModel().canReady,false);assert.equal(r.session.getModel().setup,null);
 await r.advance(31000);await r.session.operate({operation:'ready',matchId:'planet-local'});assert.equal(r.requests.some(q=>q.operation==='ready'),false);r.session.dispose();
});

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
test('a registered join waits across forbidden reads and accepts only matching admitted display standing',async()=>{
 const r=sessionRig('display');r.setReadDenied(true);await r.session.start();await r.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:'display',displayName:'Screen'});
 assert.deepEqual(r.session.getModel().pendingAdmission,{kind:'display',roomCode:'PLANET',status:null});assert.equal(r.session.getModel().status,null);assert.match(r.session.getModel().message,/Waiting for the server to confirm admission/);assert.deepEqual(r.session.getModel().members,[]);
 const saved=r.stores.resume.load();assert.equal(JSON.parse(saved).ownerUid,'session-uid');assert.ok(!saved.includes('Hacker'));r.session.dispose();
 const resumed=createPlanetSession(r.connection,r.ports,r.stores);await resumed.start();assert.equal(resumed.getModel().pendingAdmission.kind,'display');
 r.setReadDenied(false);await resumed.refresh();assert.equal(resumed.getModel().status,'running');assert.equal(resumed.getModel().pendingAdmission,null);assert.equal((await resumed.gameTransport('display').authenticate()).seatId,null);assert.ok(resumed.gameTransport('display').identities().length);assert.equal(JSON.parse(r.stores.resume.load()).join.requestId,r.value.admission.requestId);
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
 const r=sessionRig('board');r.value.admission=null;await r.session.start();const recoveryCode='private-recovery-code-123';await r.session.operate({operation:'redeemRecovery',matchId:'planet-local',recoveryCode});
 assert.equal(r.session.getModel().matchId,'planet-local');assert.equal(r.session.getModel().selfSeatId,'seat-6');assert.equal(r.session.getModel().uncertain,false);assert.equal(r.stores.requests.load(),null);assert.ok(!r.stores.resume.load().includes(recoveryCode));r.session.dispose();
});
test('the draft seat-only recovery reply cannot approve a match or replace the original request',async()=>{
 const r=sessionRig('board'),original=r.connection.request,redeems=[];r.connection.request=async request=>{if(request.operation!=='redeemRecovery')return original(request);redeems.push(structuredClone(request));return {ok:true,serverTimeMs:r.ports.clock.now(),result:{seatId:'seat-6'}};};
 await r.session.start();const recoveryCode='private-recovery-code-123';await r.session.operate({operation:'redeemRecovery',matchId:'planet-local',recoveryCode});
 assert.equal(r.session.getModel().uncertain,true);assert.equal(r.session.getModel().matchId,null);assert.equal(r.session.getModel().selfSeatId,null);assert.match(r.session.getModel().message,/recovery result could not be verified/);assert.equal(r.stores.requests.load(),null);assert.equal(r.stores.resume.load(),null);
 await r.session.retry();assert.equal(redeems.length,2);assert.deepEqual(redeems[1],redeems[0]);r.session.dispose();
});

function denyAdmission(value,status){return {...value,isHost:false,selfSeatId:null,admission:{...value.admission,status},members:[],pendingAdmissions:[],setup:null,privateRole:null,publicView:null,playerView:null};}
for(const status of ['pending','declined','closed'])test(`${status} standing carries no admitted data and never authenticates a game feed`,async()=>{
 const r=sessionRig('display');r.setReadDenied(true);await r.session.start();await r.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:'display',displayName:'Table'});const original=JSON.parse(r.stores.resume.load()).join;
 r.value=denyAdmission(r.value,status);r.setReadDenied(false);await r.session.refresh();assert.equal(r.session.getModel().pendingAdmission.status,status);assert.equal(r.session.getModel().status,null);assert.equal(r.session.getModel().versions,null);assert.deepEqual(r.session.getModel().members,[]);assert.deepEqual(r.session.gameTransport('display').identities(),[]);await assert.rejects(r.session.gameTransport('display').authenticate());assert.deepEqual(JSON.parse(r.stores.resume.load()).join,original);r.session.dispose();
});
for(const patch of [{requestId:'another-request'},{kind:'player'},null])test(`pending display rejects unbound standing ${JSON.stringify(patch)}`,async()=>{
 const r=sessionRig('display');r.setReadDenied(true);await r.session.start();await r.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:'display',displayName:'Table'});r.value.admission=patch===null?null:{...r.value.admission,...patch};r.setReadDenied(false);await r.session.refresh();assert.equal(r.session.getModel().connection,'error');assert.equal(r.session.getModel().status,null);assert.equal(r.session.getModel().ownRole,null);assert.deepEqual(r.session.getModel().members,[]);await assert.rejects(r.session.gameTransport('display').authenticate());r.session.dispose();
});
test('an unavailable or revoked admitted display loses its feed without becoming a new pending requester',async()=>{
 const r=sessionRig('display');await r.session.start('planet-local');let errors=0;const stop=r.session.gameTransport('display').listen({matchId:'planet-local',seatId:null},{snapshot(){},error(){errors++;}});r.setReadDenied(true);await r.session.refresh();assert.equal(r.session.getModel().connection,'error');assert.equal(r.session.getModel().pendingAdmission,null);assert.deepEqual(r.session.getModel().members,[]);assert.ok(errors>0);await assert.rejects(r.session.gameTransport('display').authenticate());stop();r.session.dispose();
});
test('verified recovery clears the original display request and accepts only the returned member seat',async()=>{
 const r=sessionRig('display');r.setReadDenied(true);await r.session.start();await r.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:'display',displayName:'Table'});assert.ok(JSON.parse(r.stores.resume.load()).join);r.value=sessionScenario('board',{now:1000});r.value.admission=null;r.setReadDenied(false);await r.session.operate({operation:'redeemRecovery',matchId:'planet-local',recoveryCode:'private-recovery-code-123'});assert.equal(r.session.getModel().selfSeatId,'seat-6');assert.equal(r.session.getModel().pendingAdmission,null);assert.equal(JSON.parse(r.stores.resume.load()).join,null);assert.equal((await r.session.gameTransport('player').authenticate()).seatId,'seat-6');r.session.dispose();
});
test('a recovery result cannot bind a different subsequent snapshot seat',async()=>{
 const r=sessionRig('board'),request=r.connection.request;r.value.admission=null;r.connection.request=async body=>body.operation==='redeemRecovery'?{ok:true,serverTimeMs:1000,result:{matchId:'planet-local',seatId:'seat-5'}}:request(body);await r.session.start();await r.session.operate({operation:'redeemRecovery',matchId:'planet-local',recoveryCode:'private-recovery-code-123'});assert.equal(r.session.getModel().connection,'error');assert.equal(r.session.getModel().selfSeatId,null);assert.deepEqual(r.session.getModel().members,[]);r.session.dispose();
});

// A durable operation commits once before its response is lost or UNAVAILABLE.
// Subsequent attempts must use the original key/body to receive the cached result.
async function unresolvedRig(operation,first='UNAVAILABLE'){
 const r=sessionRig(operation==='ready'?'reading':'host'),original=r.connection.request,attempts=[],secret='private-recovery-code-123';let durable=null,commits=0;
 if(operation==='issueRecovery'){r.value=sessionScenario('display',{now:1000});r.value.isHost=true;r.value.admission=null;}
 if(operation==='redeemRecovery')r.value.admission=null;
 const replies=[first,'RATE_LIMITED','success'];
 r.connection.request=async request=>{
  if(request.operation!==operation)return original(request);
  attempts.push(structuredClone(request));
  if(durable===null){
   commits++;durable=await original(request);
   if(operation==='issueRecovery')durable={...durable,result:{recoveryCode:secret,expiresAt:901000}};
   if(operation==='redeemRecovery'){r.value=sessionScenario('board',{now:r.ports.clock.now()});r.value.admission=null;durable={...durable,result:{matchId:request.matchId,seatId:r.value.selfSeatId}};}
  }else assert.deepEqual(request,attempts[0],'the durable result is keyed to the original request');
  const reply=replies.shift()??'success';
  return reply==='success'?durable:reply==='lost'?null:{ok:false,serverTimeMs:r.ports.clock.now(),error:{code:reply}};
 };
 await r.session.start(['ready','issueRecovery'].includes(operation)?'planet-local':undefined);
 if(operation==='ready'){await r.advance(30001);await r.session.refresh();assert.equal(r.session.getModel().canReady,true);}
 const action=operation==='create'?{operation,playerCount:9}:operation==='ready'?{operation,matchId:'planet-local'}:operation==='issueRecovery'?{operation,matchId:'planet-local',seatId:'seat-6'}:{operation,matchId:'planet-local',recoveryCode:secret};
 return {...r,action,attempts,secret,replies,commits:()=>commits};
}
function assertNoRecoverySecrets(r){for(const value of [r.stores.requests.load(),r.stores.resume.load()]){assert.ok(!value?.includes(r.secret));assert.ok(!value?.includes('recoveryCode'));assert.ok(!value?.includes('privateRole'));}}
for(const operation of ['create','ready','issueRecovery','redeemRecovery'])for(const first of ['UNAVAILABLE','lost'])test(`${operation}: committed ${first}, rate-limited retry and cached success retain the exact request`,async()=>{
 const r=await unresolvedRig(operation,first);
 try{
  await r.session.operate(r.action);assert.equal(r.commits(),1);assert.equal(r.session.getModel().uncertain,true);assert.match(r.session.getModel().message,/outcome unknown/);assert.equal(r.session.getModel().recoveryCode,null);assertNoRecoverySecrets(r);
  const saved=r.stores.requests.load();if(operation==='redeemRecovery')assert.equal(saved,null);else assert.deepEqual(JSON.parse(saved).request,r.attempts[0]);
  const count=r.requests.length;await r.session.operate({operation:'create',playerCount:7});assert.equal(r.requests.length,count,'competing lifecycle operation is blocked');
  await r.session.retry();assert.equal(r.session.getModel().uncertain,true);assert.match(r.session.getModel().message,/Please wait, then retry the same request/);assert.equal(r.stores.requests.load(),saved);assert.deepEqual(r.attempts[1],r.attempts[0]);assertNoRecoverySecrets(r);
  await r.session.operate(r.action);assert.equal(r.attempts.length,2,'a new operation cannot replace the uncertain original');
  await r.session.retry();assert.equal(r.session.getModel().uncertain,false);assert.equal(r.stores.requests.load(),null);assert.equal(r.commits(),1);assert.deepEqual(r.attempts,[r.attempts[0],r.attempts[0],r.attempts[0]]);assertNoRecoverySecrets(r);
  if(operation==='create')assert.equal(r.session.getModel().matchId,'planet-local');
  if(operation==='ready')assert.equal(r.session.getModel().members.find(m=>m.seatId==='seat-6').ready,true);
  if(operation==='issueRecovery')assert.equal(r.session.getModel().recoveryCode,r.secret);
  if(operation==='redeemRecovery')assert.equal(r.session.getModel().selfSeatId,'seat-6');
 }finally{r.session.dispose();}
});
for(const operation of ['create','ready','issueRecovery'])test(`${operation}: an unresolved public request survives reload and a later rate limit`,async()=>{
 const r=await unresolvedRig(operation);let resumed=null;
 try{
  await r.session.operate(r.action);const saved=r.stores.requests.load();assert.ok(saved);assertNoRecoverySecrets(r);r.session.dispose();
  resumed=createPlanetSession(r.connection,r.ports,r.stores);await resumed.start();assert.equal(resumed.getModel().uncertain,true);assert.equal(r.stores.requests.load(),saved);
  await resumed.operate({operation:'create',playerCount:7});assert.equal(r.attempts.length,1);
  await resumed.retry();assert.equal(resumed.getModel().uncertain,true);assert.equal(r.stores.requests.load(),saved);assertNoRecoverySecrets(r);
  await resumed.retry();assert.equal(resumed.getModel().uncertain,false);assert.equal(r.stores.requests.load(),null);assert.equal(r.commits(),1);assert.deepEqual(r.attempts,[r.attempts[0],r.attempts[0],r.attempts[0]]);assertNoRecoverySecrets(r);
  if(operation==='issueRecovery')assert.equal(resumed.getModel().recoveryCode,r.secret);
 }finally{r.session.dispose();resumed?.dispose();}
});
for(const rejection of ['NOT_ALLOWED','FORBIDDEN'])test(`a later ${rejection} cannot settle an earlier unknown operation`,async()=>{
 const r=await unresolvedRig('create');r.replies[1]=rejection;
 try{await r.session.operate(r.action);const saved=r.stores.requests.load();await r.session.retry();assert.equal(r.session.getModel().uncertain,true);assert.equal(r.stores.requests.load(),saved);await r.session.retry();assert.equal(r.session.getModel().uncertain,false);assert.equal(r.commits(),1);assert.deepEqual(r.attempts,[r.attempts[0],r.attempts[0],r.attempts[0]]);}finally{r.session.dispose();}
});
for(const rejection of ['NOT_ALLOWED','RATE_LIMITED'])test(`a definitive first ${rejection} rejection permits a later new operation`,async()=>{
 const r=sessionRig('host'),original=r.connection.request,attempts=[];let reject=true;
 r.connection.request=async request=>{if(request.operation==='create'){attempts.push(structuredClone(request));if(reject)return {ok:false,serverTimeMs:1000,error:{code:rejection}};}return original(request);};
 try{await r.session.start();await r.session.operate({operation:'create',playerCount:9});assert.equal(r.session.getModel().uncertain,false);assert.equal(r.stores.requests.load(),null);reject=false;await r.session.operate({operation:'create',playerCount:7});assert.equal(r.session.getModel().matchId,'planet-local');assert.notEqual(attempts[1].requestId,attempts[0].requestId);assert.equal(attempts[1].playerCount,7);}finally{r.session.dispose();}
});
for(const result of [{},{recoveryCode:''},{recoveryCode:'x'.repeat(15)},{recoveryCode:'x'.repeat(129)},{recoveryCode:42},null])test(`malformed issued recovery success remains retryable: ${JSON.stringify(result)}`,async()=>{
 const r=await unresolvedRig('issueRecovery'),original=r.connection.request;let malformed=true;
 r.connection.request=async request=>request.operation==='issueRecovery'&&malformed?(r.attempts.push(structuredClone(request)),{ok:true,serverTimeMs:1000,result}):original(request);
 try{
  await r.session.operate(r.action);assert.equal(r.session.getModel().uncertain,true);assert.equal(r.session.getModel().recoveryCode,null);assert.match(r.session.getModel().message,/issued recovery code could not be verified/);assertNoRecoverySecrets(r);
  const saved=r.stores.requests.load();assert.deepEqual(JSON.parse(saved).request,r.attempts[0]);malformed=false;r.replies.splice(0,r.replies.length,'RATE_LIMITED','success');
  await r.session.retry();assert.equal(r.session.getModel().uncertain,true);assert.equal(r.stores.requests.load(),saved);await r.session.retry();assert.equal(r.session.getModel().uncertain,false);assert.equal(r.session.getModel().recoveryCode,r.secret);assert.deepEqual(r.attempts,[r.attempts[0],r.attempts[0],r.attempts[0]]);assertNoRecoverySecrets(r);
 }finally{r.session.dispose();}
});

for(const terminal of ['finished','aborted'])test(`${terminal}: returning to lobby clears only settled local session state and makes no service mutation`,async()=>{
 const r=sessionRig(terminal);let resumed=null;
 try{
  await r.session.start('planet-local');assert.equal(r.session.getModel().canReturnToLobby,true);assert.ok(r.stores.resume.load());const before=r.requests.length;
  assert.equal(r.session.returnToLobby(),true);assert.equal(r.requests.length,before);assert.equal(r.session.getModel().matchId,null);assert.equal(r.session.getModel().status,null);assert.equal(r.session.getModel().versions,null);assert.deepEqual(r.session.getModel().members,[]);assert.equal(r.session.getModel().connection,'live');assert.equal(r.session.getModel().canReturnToLobby,false);assert.equal(r.stores.resume.load(),null);assert.equal(r.stores.requests.load(),null);assert.equal(r.ports.unresolved.load(),null);
  r.session.dispose();resumed=createPlanetSession(r.connection,r.ports,r.stores);await resumed.start();assert.equal(resumed.getModel().matchId,null);assert.equal(r.requests.length,before,'reload does not read the old match');await resumed.operate({operation:'create',playerCount:7});assert.equal(r.requests.filter(x=>x.operation==='create').length,1,'a new lobby operation is available');
 }finally{r.session.dispose();resumed?.dispose();}
});
for(const reason of ['running','stale','hidden','foreign-uid','unsettled-command','unsettled-lifecycle'])test(`return to lobby is forbidden during ${reason}`,async()=>{
 const r=sessionRig(reason==='running'?'board':'finished');
 try{
  await r.session.start('planet-local');
  if(reason==='stale'){r.setReadDenied(true);await r.session.refresh();}
  if(reason==='hidden')r.session.setVisible(false);
  if(reason==='foreign-uid')r.setUid('another-uid');
  if(reason==='unsettled-command')r.ports.unresolved.save(JSON.stringify({protocolVersion:3,matchId:'planet-local',phaseId:'old-phase',commandId:'pending-command',ownerUid:'session-uid',seatId:'seat-6'}));
  if(reason==='unsettled-lifecycle'){r.setLost(true);await r.session.operate({operation:'issueRecovery',matchId:'planet-local',seatId:'seat-6'});assert.equal(r.session.getModel().uncertain,true);}
  const saved=[r.stores.resume.load(),r.stores.requests.load(),r.ports.unresolved.load()],before=r.requests.length;assert.equal(r.session.getModel().canReturnToLobby,false);assert.equal(r.session.returnToLobby(),false);assert.deepEqual([r.stores.resume.load(),r.stores.requests.load(),r.ports.unresolved.load()],saved);assert.equal(r.requests.length,before);
 }finally{r.session.dispose();}
});
test('a sending lifecycle operation blocks terminal return until its definitive response',async()=>{
 const r=sessionRig('finished'),original=r.connection.request;let release;
 r.connection.request=async request=>request.operation==='issueRecovery'?new Promise(resolve=>{release=resolve;}):original(request);
 try{await r.session.start('planet-local');const sending=r.session.operate({operation:'issueRecovery',matchId:'planet-local',seatId:'seat-6'});await Promise.resolve();assert.equal(r.session.getModel().busy,true);assert.equal(r.session.returnToLobby(),false);release({ok:false,serverTimeMs:1000,error:{code:'NOT_ALLOWED'}});await sending;assert.equal(r.session.getModel().canReturnToLobby,true);}finally{r.session.dispose();}
});
