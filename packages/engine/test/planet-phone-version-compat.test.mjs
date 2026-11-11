import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  createPlanetGame,applyPlanetCommand,advancePlanetDeadline,projectPlanetPublic,projectPlanetPlayer,
  encodePlanetGameState,decodePlanetGameState,
} from '../dist/index.js';

// Native predecessor expectations captured from fb33cecb before the phone-offer
// contract or engine was changed. Never regenerate them with the successor.
const file=readFileSync(new URL('./fixtures/planet-1.1-replay.json',import.meta.url));
const bundle=JSON.parse(file),copy=value=>structuredClone(value);
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('phone-offer predecessor evidence is the fixed committed1.1 baseline and complete7/8/9 native histories',()=>{
  assert.equal(createHash('sha256').update(file).digest('hex'),'2bc5d5c9360b712b1d790e014675eed58e7c2b463c11a3defd7e89127a17d086');
  assert.equal(bundle.sourceCommit,'fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70');
  assert.equal(bundle.capturedEngineVersion,'planet-game-1.1.0');
  assert.equal(bundle.fixtures.length,9);
  for(const count of [7,8,9])assert.deepEqual(bundle.fixtures.filter(f=>f.count===count).map(f=>f.label),
    ['native-feedback-sync-code','native-neutral-tie','native-empty-panel-wrong-code']);
});

for(const f of bundle.fixtures)test(`${f.count}/${f.label}: saved1.1 state, public/player packets and receipts stay byte-identical`,()=>{
  const ids=Array.from({length:f.count},(_,i)=>`seat-${i+1}`),phases=new Set();
  let state=createPlanetGame(copy(f.setup),copy(f.initialContext));
  assert.equal(f.checkpoints.length,f.history.length+1);
  const check=index=>{
    phases.add(state.phase.kind);
    const players=ids.map(id=>projectPlanetPlayer(state,id));
    assert.deepEqual({state:sha(state),public:sha(projectPlanetPublic(state)),players:players.map(sha)},f.checkpoints[index],`checkpoint${index}`);
    for(const view of players)for(const offer of view.offers){
      assert.equal(Object.hasOwn(offer,'declaredSides'),false,'No candidate field in a historical packet');
      if(offer.type==='PANEL_CODE')assert.deepEqual(offer.targetSeatIds,[],'Historical keypad metadata is immutable');
    }
    if([0,Math.floor(f.history.length/2),f.history.length].includes(index)){
      const before=copy(state),restored=decodePlanetGameState(encodePlanetGameState(state));
      assert.deepEqual(state,before);assert.deepEqual(restored,state);assert.notEqual(restored,state);
    }
  };
  check(0);
  for(const [index,record]of f.history.entries()){
    const before=copy(state);
    if(record.kind==='COMMAND'){
      const result=applyPlanetCommand(state,record.actor,copy(record.request),copy(record.context));
      assert.deepEqual(result.receipt,record.receipt,`receipt${index}`);assert.deepEqual(state,before);state=result.state;
    }else{
      assert.equal(record.kind,'DEADLINE');
      const result=advancePlanetDeadline(state,copy(record.context));
      assert.equal(result.advanced,true);assert.deepEqual(state,before);state=result.state;
    }
    check(index+1);
  }
  assert.equal(phases.has('NAV_SETTING'),true,'Evidence includes a completed native neutral navigation window');
  if(f.label==='native-feedback-sync-code'){
    for(const kind of ['BLACKHOLE_PRESENTATION','HACK_DECLARE','HACK_RESULT','HACK'])assert.equal(phases.has(kind),true);
    assert.equal(state.global.panelRequests['seat-1'].status,'TREATED');
    assert.equal(state.global.codeAttempted,true);assert.equal(state.global.shipHackUnlocked,true);
    if(f.count===9)assert.notEqual(projectPlanetPlayer(state,'seat-9').abilities.engineerCapture,null);
  }else if(f.label==='native-neutral-tie'){
    assert.equal(f.history.some(r=>r.kind==='COMMAND'&&r.request.command.type==='CHOOSE_NAV_DIRECTION'&&r.receipt.status==='accepted'),true);
  }else{
    assert.equal(f.history.filter(r=>r.kind==='COMMAND'&&r.receipt.code==='NO_INJECTION').length,2);
    assert.equal(state.global.codeAttempted,true);assert.equal(state.global.shipHackUnlocked,false);
  }
});
