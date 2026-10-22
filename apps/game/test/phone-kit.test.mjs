import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { hackPicture, resultComposition, voteCells } from '../hosted/phone-kit.mjs';
const sha = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');

test('the runtime loads the exact two approved Claude derivatives and no provisional drawing dependency',()=>{
  assert.equal(sha('../hosted/scene-drawing/wardrobe.mjs'),'312c4cda048585f9270b3de095e2dcf44dc0dadd4c73392b1206da303ae8ddc3');
  assert.equal(sha('../hosted/scene-drawing/phone-kit-art.mjs'),'713b860ffaaa91ba6610457d39b6c818bad9aad28fb4967f830d21c0dcf61e86');
  const proof=JSON.parse(readFileSync(new URL('../../../docs/frontend/claude-phone-kit-provenance.json',import.meta.url),'utf8'));
  assert.equal(proof.style.sourceSha256,'fd56e406b635929f438ec853fb673bc540720d661d9c625bb033dbfa464f0c6e');
  assert.equal(sha('../hosted/claude-phone-kit.css'),proof.style.runtimeSha256);
  for(const path of ['../hosted/browser-host.js','../hosted/scene-board.mjs','../hosted/comic-motion.mjs','../hosted/main.js'])
    assert.doesNotMatch(readFileSync(new URL(path,import.meta.url),'utf8'),/phone-feedback|compact-layout|scene-drawing\/icons|wardrobeSvg/);
});
test('vote illustrations follow explicit outcomes, including a tied no-Jail result',()=>{
  assert.equal(resultComposition('CAPTAIN_ELECTED').piece,'vote-captain-star');
  assert.equal(resultComposition('NO_CAPTAIN_ELECTED').piece,'vote-empty-chair');
  assert.equal(resultComposition('RUNOFF_REQUIRED').piece,'vote-tie-burst');
  assert.equal(resultComposition('NO_JAIL_SELECTION').piece,'vote-empty-cell');
  assert.equal(resultComposition('PLAYER_RELEASED').piece,'vote-cell-bars-open');
  assert.equal(resultComposition('RELEASE_DENIED').piece,'vote-cell-bars');
  assert.equal(resultComposition('UNKNOWN'),null);
});
test('vote cells represent aggregate counts and missing ballots without identifying voters or inventing No totals',()=>{
  const result={kind:'CAPTAIN_ELECTION',selectedSeatId:'seat-2',tiedSeatIds:[],eligibleVoterCount:7,yesCount:null,counts:[{seatId:'seat-2',votes:3},{seatId:'seat-4',votes:2}]};
  assert.deepEqual(voteCells(result),['subject','subject','subject','other','other','empty','empty']);
  assert.deepEqual(voteCells({...result,kind:'RELEASE_VOTE',yesCount:2}),['subject','subject','other','other','other','other','other']);
  assert.deepEqual(voteCells({...result,eligibleVoterCount:0}),[]);
});
test('private pictures describe claims independently of actual role and refuse an invalid side or stage',()=>{
  for(const stage of ['HACK_RESULT','HACK']) {
    assert.equal(hackPicture({stage,declaredSide:'Blue',role:'Undercover',actualFaction:'Red'}),'hack-side-blue');
    assert.equal(hackPicture({stage,declaredSide:null}),'hack-side-none');
    assert.equal(hackPicture({stage,declaredSide:'Purple'}),null);
  }
  assert.equal(hackPicture({stage:'HACK_DECLARE',declaredSide:null}),'hack-waiting-dots');
  assert.equal(hackPicture({stage:'ORDINARY_TURN',declaredSide:'Blue'}),null);
});
