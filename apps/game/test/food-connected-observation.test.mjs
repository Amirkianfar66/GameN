import assert from 'node:assert/strict';
import {test} from 'node:test';
import {foodPolicyObservation} from '../dev/phone/food-connected-observation.mjs';
import {playerView} from '../../../tests/bootstrap/support/food-task-contract-fixture.mjs';

test('a valid old projection can fail if re-dated past its deadline; diagnostic retains only scalar facts',()=>{
 const view=playerView(7),before=structuredClone(view),f=foodPolicyObservation({view,fresh:false,clock:{status:'synced',serverNowMs:view.participantTask.deadlineAt+1}});
 assert.equal(f.originalValid,true);assert.equal(f.rewrittenValid,false);assert.equal(f.original.withinDeadline,true);assert.equal(f.rewritten.withinDeadline,false);
 assert.equal(f.fresh,false);assert.equal(f.observedTaskOffsetMs,30001);assert.deepEqual(view,before);
 for(const privateValue of [view.matchId,view.seatId,view.participantTask.taskId,view.participantTask.controlSessionId,view.participantTask.crate.id])assert.ok(!JSON.stringify(f).includes(privateValue));
});
test('clock-unavailable observations never invent a rewritten projection time',()=>{
 const f=foodPolicyObservation({view:playerView(7),fresh:false,clock:{status:'unsynced'}});
 assert.equal(f.originalValid,true);assert.equal(f.rewrittenValid,null);assert.equal(f.observedTaskOffsetMs,null);assert.equal(f.rewritten,null);
});
