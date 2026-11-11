import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createPlanetGame,applyPlanetCommand,advancePlanetDeadline,projectPlanetPublic,projectPlanetPlayer,
  encodePlanetGameState,decodePlanetGameState} from '../dist/index.js';

// Immutable1.2 packets captured from7958c9f before any pre-vote Blackout changes.
// The legal synthetic native input histories originated in the committed1.1
// corpus and were executed again on that actual unmodified1.2 runtime.
const bytes=readFileSync(new URL('./fixtures/planet-1.2-replay.json',import.meta.url));
const bundle=JSON.parse(bytes),copy=value=>structuredClone(value);
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('pre-vote Blackout predecessor fixture has exact committed1.2 provenance and all three roster sizes',()=>{
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'79c839089ee686173e9951e9fd699eb46b4b4dc734da7e4932570d13914201b3');
  assert.equal(bundle.sourceCommit,'7958c9f590b2bf0e074cd32c67ce0bf0202b6279');
  assert.equal(bundle.capturedEngineVersion,'planet-game-1.2.0');
  assert.equal(bundle.fixtures.length,9);
  for(const n of [7,8,9])assert.equal(bundle.fixtures.filter(f=>f.count===n).length,3);
});
for(const f of bundle.fixtures)test(`${f.count}/${f.label}: saved1.2 commands, audience bytes and post-vote Blackout remain immutable`,()=>{
  const ids=Array.from({length:f.count},(_,i)=>`seat-${i+1}`),jailRounds=new Set();
  let state=createPlanetGame(copy(f.setup),copy(f.initialContext));
  const check=index=>{
    assert.equal(Object.hasOwn(state,'blackoutBatch'),false);
    assert.equal(Object.hasOwn(state.finalized,'checkpoint'),false);
    const publicView=projectPlanetPublic(state),players=ids.map(id=>projectPlanetPlayer(state,id));
    assert.deepEqual({state:sha(state),public:sha(publicView),players:players.map(sha)},f.checkpoints[index],`checkpoint${index}`);
    assert.equal(Object.hasOwn(publicView.board,'checkpoint'),false);
    for(const player of players){
      assert.equal(Object.hasOwn(player.board,'checkpoint'),false);
      for(const offer of player.offers){
        if(offer.type==='DECLARE_HACK_SIDE')assert.ok(offer.declaredSides.length);
        if(offer.type==='PANEL_CODE')assert.deepEqual(offer.targetSeatIds,ids);
      }
    }
    if(state.phase.kind==='JAIL_VOTE')jailRounds.add(state.round);
    if(state.phase.kind==='BLACKOUT')assert.equal(jailRounds.has(state.round),true,'Historical Blackout stays after its Jail vote');
    if([0,Math.floor(f.history.length/2),f.history.length].includes(index))assert.deepEqual(decodePlanetGameState(encodePlanetGameState(state)),state);
  };
  check(0);
  for(const [index,record]of f.history.entries()){
    const before=copy(state);
    if(record.kind==='COMMAND'){
      const result=applyPlanetCommand(state,record.actor,copy(record.request),copy(record.context));
      assert.deepEqual(result.receipt,record.receipt);assert.deepEqual(state,before);state=result.state;
    }else{
      assert.equal(record.kind,'DEADLINE');const result=advancePlanetDeadline(state,copy(record.context));
      assert.equal(result.advanced,true);assert.deepEqual(state,before);state=result.state;
    }
    check(index+1);
  }
});
