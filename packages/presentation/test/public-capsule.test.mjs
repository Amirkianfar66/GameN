import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_HACK_VERSION_PINS,DECLARED_HACK_VERSION_PINS,FullPlayerViewSchema,FullPublicViewSchema} from '@mothership/contracts';
import {buildTableShellModel,publicCapsuleProps} from '@mothership/presentation';
import {playerView,publicView,model,environment,EPOCH} from './support/protocol2-views.mjs';
const session={hackId:'exchange',actorSeatId:'seat-2',targetSeatId:'seat-1'};
function patch(v,stage='HACK_RESULT',own=true){
 v.versions={...PUBLIC_HACK_VERSION_PINS,assetManifestVersion:'0.0.0-no-assets'};v.voteResult=null;v.hackSession=session;v.activeSeatId='seat-2';
 v.phase={id:stage==='HACK_DECLARE'?'exchange':`phase-${stage}`,kind:stage,startedAt:EPOCH,endsAt:EPOCH+({HACK_DECLARE:15000,HACK_RESULT:5000,HACK:60000}[stage])};
 if(own){v.self.movementDestinations=[];v.hackPartnerSeatId='seat-2';v.hackFeedback={hackId:'exchange',phaseId:v.phase.id,round:v.round,status:stage==='HACK_DECLARE'?'AWAITING_DECLARATION':'DECLARED',declaredSide:stage==='HACK_DECLARE'?null:'Blue'};v.legalTargets=stage==='HACK_DECLARE'?{DECLARE_HACK_SIDE:['seat-1']}:{};}
}
const own=(stage='HACK_RESULT')=>playerView(v=>patch(v,stage));
const table=(stage='HACK_RESULT')=>publicView(v=>patch(v,stage,false));
test('public participant data is equal on a concealed participant and display, with no private claim/role/side',()=>{
 const clock={kind:'running',remainingMs:4800};
 const participant=model(own(),undefined,{privacy:{concealed:false,revealed:false},deadline:clock});
 const display=buildTableShellModel({...environment,view:table(),deadline:clock});
 assert.deepEqual(participant.match.capsule,display.match.capsule);assert.equal(participant.match.privateArea.content,null);
 assert.equal(participant.match.playerCount,7);assert.equal(participant.match.capsule.elapsedMs,200);assert.doesNotMatch(JSON.stringify(participant.match.capsule),/Blue|Cracker|claim|declaredSide|hackPartner/);
});
test('the actual phase clock supplies the full conversation and expiry cannot invent its next stage',()=>{
 const fresh=model(own('HACK'),undefined,{deadline:{kind:'running',remainingMs:60000}}).match.capsule;
 assert.equal(fresh.remainingMs,60000);assert.equal(fresh.elapsedMs,0);assert.equal(fresh.inTime,true);
 const expired=model(own('HACK'),undefined,{deadline:{kind:'expired'}}).match.capsule;
 assert.equal(expired.stage,'HACK');assert.equal(expired.current,true);assert.equal(expired.inTime,false);assert.equal(expired.elapsedMs,60000);
 const stale=model(own('HACK'),undefined,{connection:'stale',deadline:{kind:'running',remainingMs:31000}}).match.capsule;assert.equal(stale.current,false);assert.equal(stale.remainingMs,31000);
 const unsynced=model(own('HACK'),undefined,{deadline:{kind:'unsynced'}}).match.capsule;assert.equal(unsynced.current,false);assert.equal(unsynced.elapsedMs,0);
});
test('public session survives private blur while its actual claim/private content is concealed',()=>{
 const open=model(own('HACK'),undefined,{deadline:{kind:'running',remainingMs:45000}});
 const concealed=model(own('HACK'),undefined,{deadline:{kind:'running',remainingMs:45000},privacy:{concealed:true,revealed:false}});
 assert.deepEqual(concealed.match.capsule,open.match.capsule);assert.equal(concealed.match.privateArea.content,null);assert.match(open.match.privateArea.content.hackFeedback.message,/claims BLUE/);
});
test('new-version null clears the model; historical 1.5 keeps exact field absence and strict malformed pairs are rejected',()=>{
 const ordinary=playerView(v=>{v.versions={...PUBLIC_HACK_VERSION_PINS,assetManifestVersion:'0.0.0-no-assets'};v.voteResult=null;v.hackFeedback=null;v.hackSession=null;});
 assert.equal(model(ordinary).match.capsule,null);
 const legacy=playerView(v=>{v.versions={...DECLARED_HACK_VERSION_PINS,assetManifestVersion:'0.0.0-no-assets'};v.voteResult=null;v.hackFeedback=null;});
 assert.equal(Object.hasOwn(model(legacy).match,'capsule'),false);assert.deepEqual(publicCapsuleProps(legacy,environment),{});
 assert.equal(FullPlayerViewSchema.safeParse({...ordinary,hackSession:undefined}).success,false);
 const invalid={...table(),hackSession:{...session,actorSeatId:'seat-3'}};assert.equal(FullPublicViewSchema.safeParse(invalid).success,false);
});
