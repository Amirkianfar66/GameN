import assert from 'node:assert/strict';
import test from 'node:test';
import { DECLARED_HACK_VERSION_PINS, FullCommandRequestSchema, FullPlayerViewSchema, FullPublicViewSchema } from '@mothership/contracts';
import { createConnectedPlayerScreen, createConnectedTableScreen, createActionFlow } from '@mothership/game';
import { renderComicPlayerShell, renderComicTableShell, toHtml } from '@mothership/presentation';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView } from './support/connected.mjs';
import { readyCompatibility } from '../hosted/ready-compatibility.mjs';
import { bundlesFor } from '../hosted/art.mjs';
const OWN={kind:'player-view',matchId:MATCH};
function view(stage='HACK_DECLARE',at=EPOCH,revision=10) {
 return playerView('seat-1',v=>{
  v.versions={...DECLARED_HACK_VERSION_PINS,assetManifestVersion:'0.0.0-no-assets'};v.voteResult=null;
  v.phase={id:stage==='HACK_DECLARE'?'hack-exchange':`phase-${stage}`,kind:stage,startedAt:at,endsAt:at+(stage==='HACK_DECLARE'?15000:stage==='HACK_RESULT'?5000:60000)};
  v.viewRevision=revision;v.activeSeatId='seat-2';v.hackPartnerSeatId='seat-2';v.legalTargets=stage==='HACK_DECLARE'?{DECLARE_HACK_SIDE:['seat-1']}:{};
  v.hackFeedback={hackId:'hack-exchange',phaseId:v.phase.id,round:1,status:stage==='HACK_DECLARE'?'AWAITING_DECLARATION':'DECLARED',declaredSide:stage==='HACK_DECLARE'?null:'Blue'};
 });
}
function setup(surface='player',now=EPOCH){
 const host=createFakeHost({serverStart:now}),fake=createFakeConnectedTransport(host);
 fake.respond.v1ServerTime=async()=>({protocolVersion:2,serverTimeMs:host.serverNow()});
 const opts={transport:fake.transport,matchId:MATCH,ports:host.ports,host:{reload(){}}};
 const screen=surface==='player'?createConnectedPlayerScreen({...opts,seatId:'seat-1'}):createConnectedTableScreen(opts);
 const html=()=>toHtml((surface==='player'?renderComicPlayerShell:renderComicTableShell)(screen.getFrame().model));screen.start();
 return {host,fake,screen,html};
}
test('the trusted server deadlines retain exact 15/5/60 windows and late delivery never restarts them',async()=>{
 const s=setup('player',EPOCH+12000);await s.fake.deliver(OWN,view());assert.equal(s.screen.getFrame().model.match.phase.timer.display,'0:03');
 await s.host.advance(3000);assert.equal(s.screen.getFrame().model.match.phaseKind,'HACK_DECLARE');assert.equal(s.screen.getFrame().model.match.phase.timer.state,'expired');
 const result=view('HACK_RESULT',s.host.serverNow(),11);await s.fake.deliver(OWN,result);assert.equal(s.screen.getFrame().model.match.phase.timer.display,'0:05');
 await s.host.advance(5000);await s.fake.deliver(OWN,view('HACK',s.host.serverNow(),12));assert.equal(s.screen.getFrame().model.match.phase.timer.display,'1:00');s.screen.dispose();
});
test('background and stale delivery withdraw claims and live lines; returning never reopens privately',async()=>{
 const s=setup();await s.fake.deliver(OWN,view('HACK_RESULT'));s.screen.dispatch({type:'private/toggle'});assert.match(s.html(),/claims BLUE/);
 s.screen.setPageVisible(false);assert.doesNotMatch(s.html(),/claims BLUE|hack-feedback/);assert.equal(s.screen.getFrame().privateAnnouncement,null);
 s.screen.setPageVisible(true);await flush();assert.doesNotMatch(s.html(),/claims BLUE/);s.screen.dispatch({type:'private/toggle'});assert.match(s.html(),/claims BLUE/);
 await s.fake.deliver(OWN,{...view('HACK_RESULT',EPOCH,11),hackFeedback:{...view('HACK_RESULT').hackFeedback,phaseId:'obsolete'}});
 assert.doesNotMatch(s.html(),/claims BLUE|hack-feedback/);s.screen.dispose();
});
test('the public display receives neither participant association nor a declared side',async()=>{
 const s=setup('table');const own=view('HACK_RESULT'),{self,knowledge,legalTargets,ownPendingCommandIds,ownBallot,hasVoted,hackPartnerSeatId,hackFeedback,...facts}=own;
 const publicView=FullPublicViewSchema.parse({...facts,audience:{kind:'public'}});await s.fake.deliver({kind:'public-view',matchId:MATCH},publicView);
 assert.match(s.html(),/Hack claim/);assert.doesNotMatch(s.html(),/claims BLUE|hack-feedback|Declarations may|Private Hack/);s.screen.dispose();
});
test('expired or obsolete feedback removes the private live line while preserving the open panel',async()=>{
 const s=setup();await s.fake.deliver(OWN,view('HACK_RESULT'));s.screen.dispatch({type:'private/toggle'});
 assert.match(s.screen.getFrame().privateAnnouncement.text,/claims BLUE/);const epoch=s.screen.getFrame().privacyEpoch;
 await s.host.advance(5000);assert.doesNotMatch(s.html(),/claims BLUE|hack-feedback/);assert.equal(s.screen.getFrame().privateAnnouncement,null);
 assert.equal(s.screen.getFrame().model.match.privateArea.open,true);assert.ok(s.screen.getFrame().privacyEpoch>epoch);
 await s.fake.deliver(OWN,view('HACK_RESULT',s.host.serverNow(),11));
 const next=structuredClone(view('HACK_RESULT',s.host.serverNow(),12));next.hackFeedback.phaseId='obsolete';await s.fake.deliver(OWN,next);
 assert.equal(s.screen.getFrame().privateAnnouncement,null);assert.doesNotMatch(s.html(),/claims BLUE|hack-feedback/);s.screen.dispose();
});
test('a declaration keeps one request ID through a lost reply, new phase, concealed panel and receipt recovery',async()=>{
 const host=createFakeHost(),sent=[],looked=[];let recover=false;
 const sample={requestedAt:0,receivedAt:0,serverTimeMs:0};
 const api={command:async request=>{sent.push(structuredClone(request));return {kind:'no-response',reason:'transport-error'};},receipt:async ids=>{looked.push(ids);return recover?{kind:'found',sample,receipt:{...ids,phaseId:sent[0].phaseId,protocolVersion:2,status:'accepted',code:'REGISTERED'}}:{kind:'no-response',reason:'transport-error'};}};
 const flow=createActionFlow({api,ports:host.ports,matchId:MATCH,seatId:'seat-1'});
 flow.observe({view:view(),current:true,inTime:true,panelOpen:true,foreground:true});assert.equal(flow.open('declare-hack-side'),true);
 assert.equal(flow.choose({kind:'declare-hack-side',declaredSide:'Blue'}),true);await host.advance(400);assert.equal(flow.confirm(),true);await flush();
 assert.equal(sent.length,1);assert.equal(FullCommandRequestSchema.safeParse(sent[0]).success,true);assert.deepEqual(sent[0].command,{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'});
 const saved=host.kept;assert.ok(saved);assert.doesNotMatch(saved,/declaredSide|Blue/);
 flow.observe({view:view('HACK_RESULT',EPOCH+1000,11),current:true,inTime:true,panelOpen:false,foreground:false});assert.equal(host.kept,saved);
 recover=true;flow.observe({view:view('HACK_RESULT',EPOCH+1000,11),current:true,inTime:true,panelOpen:true,foreground:true});await host.advance(2500);await flush();
 if(flow.getState().step==='unknown'){await host.advance(400);flow.checkAgain();await flush();}
 assert.equal(sent.length,1);assert.ok(looked.every(ids=>ids.commandId===sent[0].commandId));assert.equal(flow.getState().step,'accepted');flow.dispose();
});
test('hosted Ready does not activate Hack 1.5 with the old or an unreviewed art pin',()=>{
 for(const assetManifestVersion of ['design-0.2.0','0.0.0-no-assets','unreviewed-claude-kit']) assert.deepEqual(readyCompatibility({...DECLARED_HACK_VERSION_PINS,assetManifestVersion},{bundles:bundlesFor('player'),settled:true}),{kind:'reload',acceptedVersions:null});
});
