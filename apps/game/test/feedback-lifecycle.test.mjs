import assert from 'node:assert/strict';
import test from 'node:test';
import { FullPlayerViewSchema, FullPublicViewSchema, VOTE_RESULT_VERSION_PINS } from '@mothership/contracts';
import { createConnectedPlayerScreen, createConnectedTableScreen } from '@mothership/game';
import { renderComicPlayerShell, renderComicTableShell, toHtml } from '@mothership/presentation';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView, publicView } from './support/connected.mjs';

const versions={...VOTE_RESULT_VERSION_PINS,assetManifestVersion:'design-0.2.0'};
const tally={kind:'CAPTAIN_ELECTION',counts:{'seat-1':3,'seat-2':3},eligibleVoterCount:7,yesCount:null,selectedSeatId:null,released:null};
function ordinary(at=EPOCH,revision=5,surface='player') {
  const change=v=>{v.versions=versions;v.round=2;v.voteResult=null;v.phase={id:`ordinary-${revision}`,kind:'ORDINARY_TURN',startedAt:at,endsAt:at+60000};v.viewRevision=revision;};
  return surface==='player'?playerView('seat-1',change):publicView(change);
}
function result(at=EPOCH,revision=6,surface='player',id='vote-result-one') {
  const view=structuredClone(ordinary(at,revision,surface));
  view.phase={id,kind:'VOTE_RESULT',startedAt:at,endsAt:at+5000};view.activeSeatId=null;view.lastTally=tally;
  view.voteResult={...tally,id,votePhaseId:`closed-${id}`,round:2,startedAt:at,endsAt:at+5000,outcome:'RUNOFF_REQUIRED',tiedSeatIds:['seat-1','seat-2']};
  if(surface==='player'){view.self.movementDestinations=[];view.legalTargets={};}
  return (surface==='player'?FullPlayerViewSchema:FullPublicViewSchema).parse(view);
}
function make({surface='player',now=EPOCH}={}) {
  const host=createFakeHost({serverStart:now}),fake=createFakeConnectedTransport(host);
  fake.respond.v1ServerTime=async()=>({protocolVersion:2,serverTimeMs:host.serverNow()});
  const options={transport:fake.transport,matchId:MATCH,ports:host.ports,host:{reload(){}}};
  const screen=surface==='player'?createConnectedPlayerScreen({...options,seatId:'seat-1'}):createConnectedTableScreen(options);
  const target={kind:surface==='player'?'player-view':'public-view',matchId:MATCH};
  const frame=()=>screen.getFrame();
  const html=()=>toHtml((surface==='player'?renderComicPlayerShell:renderComicTableShell)(frame().model));
  screen.start();return {host,fake,screen,target,frame,html};
}

test('late join renders remaining result time; deadline alone never starts the next phase',async()=>{
  for(const surface of ['player','table']) {
    const s=make({surface,now:EPOCH+3250});await s.fake.deliver(s.target,result(EPOCH,6,surface));
    assert.equal(s.frame().model.match.phase.timer.display,'0:02');
    assert.equal(s.frame().model.match.voteResult.id,'vote-result-one');
    await s.host.advance(1749);assert.equal(s.frame().model.match.phase.timer.display,'0:01');
    await s.host.advance(1);assert.equal(s.frame().model.match.phase.timer.state,'expired');
    assert.equal(s.frame().model.match.voteResult,null);assert.equal(s.frame().model.match.result,null);
    assert.doesNotMatch(s.html(),/data-result-id|endReveal|Winning Code|data-winner=/);
    await s.host.advance(3000);
    await s.fake.deliver(s.target,ordinary(s.host.serverNow(),7,surface));
    assert.equal(s.frame().model.match.phase.timer.display,'1:00','Late delivery cannot consume the next full turn');
    s.screen.dispose();
  }
});

test('result entry closes private content and live lines while unresolved command recovery survives',async()=>{
  const s=make();await s.fake.deliver(s.target,ordinary());s.screen.dispatch({type:'private/toggle'});
  s.screen.dispatch({type:'action/open',kind:'move'});s.screen.dispatch({type:'action/choose',value:'Room B'});
  await s.host.advance(400);s.screen.dispatch({type:'action/confirm'});await flush();
  const kept=s.host.kept;assert.notEqual(kept,null);
  await s.fake.deliver(s.target,result(s.host.serverNow()));
  assert.equal(s.frame().model.match.privateArea.content,null);assert.equal(s.frame().privateAnnouncement,null);
  assert.equal(s.host.kept,kept);assert.doesNotMatch(kept,/destination|Room B/);
  s.screen.dispatch({type:'private/toggle'});assert.equal(s.frame().model.match.privateArea.content,null);
  await s.fake.deliver(s.target,ordinary(s.host.serverNow(),7));
  assert.equal(s.frame().model.match.privateArea.content,null,'A following turn never automatically reopens the card');
  assert.equal(s.host.kept,kept);s.screen.dispose();
});

test('equal successive tallies are announced by result identity, once, with no replay on reconnect',async()=>{
  const s=make({surface:'table'});await s.fake.deliver(s.target,ordinary(EPOCH,5,'table'));
  await s.fake.deliver(s.target,result(EPOCH,6,'table'));
  const first=s.frame().announcement.seq;
  await s.fake.deliver(s.target,result(EPOCH,7,'table'));assert.equal(s.frame().announcement.seq,first);
  await s.fake.deliver(s.target,ordinary(EPOCH+5000,8,'table'));
  await s.host.advance(5000);await s.fake.deliver(s.target,result(EPOCH+5000,9,'table','vote-result-two'));
  assert.ok(s.frame().announcement.seq>first);assert.match(s.frame().announcement.text,/new runoff follows/);
  await s.host.advance(2500);await s.fake.fail(s.target);assert.equal(s.frame().model.match.voteResult,null);
  await s.fake.deliver(s.target,result(EPOCH+5000,9,'table','vote-result-two'));
  assert.equal(s.frame().model.match.phase.timer.display,'0:03');
  assert.match(s.frame().announcement.text,/Reconnected/);s.screen.dispose();
});

test('host abort during a result shows a plain end without role or Code disclosure',async()=>{
  const s=make({surface:'table'});const view=result(EPOCH,6,'table');await s.fake.deliver(s.target,view);
  const aborted=FullPublicViewSchema.parse({...view,viewRevision:7,phase:{id:'host-abort',kind:'ABORTED',startedAt:EPOCH+1000,endsAt:null},voteResult:null});
  await s.fake.deliver(s.target,aborted);assert.equal(s.frame().model.match.voteResult,null);
  assert.equal(s.frame().model.match.result.winner,null);assert.equal(s.frame().model.match.result.reveal,null);s.screen.dispose();
});

test('a reconnect after the result deadline never announces the obsolete outcome',async()=>{
  const s=make({surface:'table',now:EPOCH+6000});await s.fake.deliver(s.target,result(EPOCH,6,'table'));
  assert.equal(s.frame().model.match.voteResult,null);
  assert.doesNotMatch(s.frame().announcement.text,/new runoff follows/);s.screen.dispose();
});
