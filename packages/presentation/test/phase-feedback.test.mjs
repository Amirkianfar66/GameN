import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVoteResult } from '../dist/model/phase-feedback.js';
import { renderVoteResultPanel } from '../dist/markup/phase-feedback.js';
import { toHtml } from '../dist/markup/node.js';
import { buildConnectedPlayerShellModel, renderComicPlayerShell, splitRegions } from '@mothership/presentation';
import { VOTE_RESULT_VERSION_PINS } from '@mothership/contracts';
import { playerView, input } from './support/protocol2-views.mjs';

const env = { mode:'emulator', connection:'live', problem:null, deadline:{kind:'running',remainingMs:1700}, motion:{reducedMotion:false}, };
const phase = {id:'result-2',kind:'VOTE_RESULT',startedAt:10000,endsAt:15000};
const facts = {id:'result-2',votePhaseId:'vote-1',round:2,kind:'CAPTAIN_ELECTION',startedAt:10000,endsAt:15000,
  outcome:'RUNOFF_REQUIRED',counts:{'seat-1':4,'seat-2':4},eligibleVoterCount:9,yesCount:null,selectedSeatId:null,released:null,tiedSeatIds:['seat-2','seat-1']};

test('a positive tie names a runoff from the explicit outcome and originating round', () => {
  const model=buildVoteResult(facts,phase,env);
  assert.equal(model.heading,'Runoff required');
  assert.equal(model.round,2);
  assert.deepEqual(model.tiedSeatIds,['seat-1','seat-2']);
  assert.equal(model.lines[1],'1 abstentions or missing ballots');
  const html=toHtml(renderVoteResultPanel(model,{identities:[{seatId:'seat-1',displayName:'<Ada>',characterId:'c1'}]}));
  assert.match(html,/Round 2/);
  assert.match(html,/&lt;Ada&gt;/);
  assert.doesNotMatch(html,/endReveal|data-team|data-device|winner|Code|ballot-recorded/);
});

test('only the current result identity and timestamps can render a result window', () => {
  for(const changed of [{id:'result-3'},{kind:'ORDINARY_TURN'},{startedAt:10001},{endsAt:15001}]) assert.equal(buildVoteResult(facts,{...phase,...changed},env),null);
  for(const changed of [{connection:'stale'},{problem:'unreadable-update'},{deadline:{kind:'expired'}},{deadline:{kind:'unsynced'}}]) assert.equal(buildVoteResult(facts,phase,{...env,...changed}),null);
  // Equal public counts do not stop a new server result from rendering under its own identity.
  assert.equal(buildVoteResult({...facts,id:'result-3',votePhaseId:'vote-2'},{...phase,id:'result-3'},env).id,'result-3');
});

test('all-abstain and release denial remain real results without inferred No totals', () => {
  const noSelection=buildVoteResult({...facts,outcome:'NO_CAPTAIN_ELECTED',counts:{},tiedSeatIds:[]},phase,env);
  assert.equal(noSelection.heading,'No Captain chosen');
  assert.equal(noSelection.lines[1],'9 abstentions or missing ballots');
  const denied=buildVoteResult({...facts,kind:'RELEASE_VOTE',outcome:'RELEASE_DENIED',counts:{},yesCount:4,selectedSeatId:'seat-9',released:false,tiedSeatIds:[]},phase,env);
  assert.equal(denied.heading,'Release denied');
  assert.deepEqual(denied.lines,['4 Yes · 9 eligible voters']);
  assert.deepEqual(denied.counts,[]);
});

test('Menu cannot hide the active result and contains it above the available menu controls',()=>{
  const result={...facts,counts:{'seat-1':3,'seat-2':3},eligibleVoterCount:7,tiedSeatIds:['seat-1','seat-2']};
  const view=playerView(v=>{
    v.versions={...VOTE_RESULT_VERSION_PINS,assetManifestVersion:'design-0.2.0'};
    v.round=2;v.phase=phase;v.activeSeatId=null;v.voteResult=result;
    v.lastTally={kind:result.kind,counts:result.counts,eligibleVoterCount:7,yesCount:null,selectedSeatId:null,released:null};
    v.self.movementDestinations=[];v.legalTargets={};
  });
  const model=buildConnectedPlayerShellModel(input(view,undefined,{privacy:{revealed:false,concealed:false},deadline:env.deadline}));
  assert.equal(renderVoteResultPanel(model.match.voteResult,{phoneView:'more'}).attrs.hidden,undefined);
  for(const phoneView of ['board','more']) {
    const tree=renderComicPlayerShell(model,{phoneView});
    const html=toHtml(tree);assert.equal((html.match(/data-result-id="result-2"/g)??[]).length,1);
    const regions=splitRegions(tree);
    assert.match(html,/Runoff required/);assert.match(html,/id="ms-phone-more"/);
    const find=(node,predicate)=>typeof node!=='object'||node===null?null:predicate(node)?node:node.children?.map(child=>find(child,predicate)).find(Boolean);
    const panel=find(tree,n=>n.attrs?.['data-result-id']==='result-2');assert.notEqual(panel.attrs.hidden,true);
    if(phoneView==='more') {
      const menu=find(tree,n=>n.attrs?.id==='phone-menu-panel');assert.notEqual(menu.attrs.hidden,true);
      assert.ok(find(menu,n=>n.attrs?.['data-result-id']==='result-2'));
      assert.ok(find(menu,n=>n.attrs?.id==='phone-menu-close'));
    }
    assert.ok(regions);
  }
});
