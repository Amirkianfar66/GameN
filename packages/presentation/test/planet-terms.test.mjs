import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetPromiseTerms} from '../dist/index.js';
test('meeting terms bind the giver alone and name the authoritative voting opportunity',()=>{
 for(const [kind,room]of [['MEET_A','Room A'],['MEET_B','Room B']]){
  const text=planetPromiseTerms({kind,giverSeatId:'seat-6',recipientSeatId:'seat-1',targetSeatId:null,round:8,electionId:null});
  assert.equal(text,`Player 6 will be in ${room} when Round 8's voting begins, after Sync.`);assert.ok(!text.includes('Player 1'));
 }
});
