import test from 'node:test';
import assert from 'node:assert/strict';
import { movedPublicSeats } from '../hosted/comic-motion.mjs';
import { ART_BUNDLES, bundlesFor } from '../hosted/art.mjs';
test('first/reconnected snapshots never cue a move; unchanged public facts stay unchanged across private redraws',()=>{
  const publicFacts=new Map([['seat-1','room-a'],['seat-2','room-b']]);
  assert.deepEqual(movedPublicSeats(null,publicFacts),[]);
  for(let i=0;i<26;i++) assert.deepEqual(movedPublicSeats(publicFacts,new Map(publicFacts)),[]);
  assert.deepEqual(movedPublicSeats(publicFacts,new Map([['seat-1','room-b'],['seat-2','room-b']])),['seat-1']);
});
test('more than four moved public seats skip the treatment as a batch',()=>{
  const a=new Map(Array.from({length:9},(_,i)=>[`seat-${i+1}`,'room-a']));
  assert.deepEqual(movedPublicSeats(a,new Map([...a].map(([seat])=>[seat,'hospital']))),[]);
});
test('all phones preload identical complete art bundles; a table requests only public artwork',()=>{
  assert.deepEqual(bundlesFor('player'),['public-board','player-ui','roles']);
  assert.deepEqual(bundlesFor('display'),['public-board']);
  assert.deepEqual(Object.keys(ART_BUNDLES).sort(),['player-ui','public-board','roles']);
});
