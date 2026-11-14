import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createOrdinaryProgress,ordinaryWaitBudget} from '../dev/phone/food-connected-progress.mjs';
const view=(kind,id,nowMs,endsAt,activeSeatId='seat-2')=>({connection:'live',round:1,ownSeatId:'seat-1',activeSeatId,canPass:false,completedReads:1,
 phase:{id,kind,startedAt:nowMs,endsAt,nowMs,trusted:true,expired:nowMs>=endsAt}});
test('ordinary observer bounds cover PRE_TURN, every preceding turn and two complete Hack sequences',()=>{
 assert.deepEqual([7,8,9].map(n=>ordinaryWaitBudget(n).ruleMs),[535000,595000,655000]);
 assert.deepEqual([7,8,9].map(n=>ordinaryWaitBudget(n).totalMs),[555000,615000,675000]);
 assert.throws(()=>ordinaryWaitBudget(6));
});
test('a normal later own offer after100s is accepted without advancing a server phase',()=>{
 const observer=createOrdinaryProgress(9,0);observer.observe(view('PRE_TURN','pre',0,15000,null),0);
 observer.observe(view('ORDINARY_TURN','other-1',15000,75000),15000);
 observer.observe(view('HACK_DECLARE','declare',75000,90000),75000);
 observer.observe(view('HACK_RESULT','result',90000,95000),90000);
 observer.observe(view('HACK','talk',95000,155000),95000);
 const next=view('ORDINARY_TURN','mine',155000,215000,'seat-1');next.canPass=true;
 const before=structuredClone(next),result=observer.observe(next,155000);assert.equal(result.state,'ready');assert.equal(result.facts.ownTurnSeen,true);assert.deepEqual(next,before);
});
test('a full ordinary turn is valid progress; only its overdue unchanged phase triggers the stall watchdog',()=>{
 const observer=createOrdinaryProgress(7,0),initial=view('ORDINARY_TURN','other',0,60000);observer.observe(initial,0);
 assert.equal(observer.observe({...initial,phase:{...initial.phase,nowMs:59000}},59000).state,'waiting');
 assert.equal(observer.observe({...initial,phase:{...initial.phase,nowMs:80001,expired:true}},80001).reason,'PUBLIC_PHASE_STALLED_PAST_DEADLINE');
});
test('an observed own turn that leaves without a usable offer is distinguished from a turn never reached',()=>{
 const observer=createOrdinaryProgress(8,0);observer.observe(view('ORDINARY_TURN','mine',0,60000,'seat-1'),0);
 const result=observer.observe(view('ORDINARY_TURN','next',60000,120000),60000);
 assert.equal(result.reason,'OWN_ORDINARY_TURN_LEFT_WITHOUT_PASS');assert.equal(result.facts.ownTurnSeen,true);
});
test('same-phase deadline rewrites, a new round and sustained lost observation fail without guessing a saved order',()=>{
 const a=createOrdinaryProgress(7,0);a.observe(view('ORDINARY_TURN','one',0,60000),0);
 assert.equal(a.observe(view('ORDINARY_TURN','one',1,70000),1).reason,'PUBLIC_PHASE_INTERVAL_CHANGED');
 const b=createOrdinaryProgress(7,0);b.observe(view('PRE_TURN','pre',0,15000,null),0);
 assert.equal(b.observe({...view('PRE_TURN','new',1,15001,null),round:2},1).reason,'ROUND_ADVANCED_BEFORE_OWN_PASS');
 const c=createOrdinaryProgress(7,0);c.observe(view('ORDINARY_TURN','one',0,60000),0);
 assert.equal(c.observe({connection:'stale',phase:null,round:1,canPass:false},20001).reason,'NO_LIVE_PUBLIC_PHASE');
});
