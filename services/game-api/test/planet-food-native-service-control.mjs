import assert from 'node:assert/strict';
import {FOOD_TASK_TRANSPORT,parseFoodTaskReceipt} from '@mothership/contracts';
import {chooseFoodBotInput} from '../dist/food-bot-policy.js';
import {planetServiceHarness,ok} from './planet-service-helper.mjs';
import {enterTimedPlanetBoarding} from './planet-timed-reading-helper.mjs';

/** Normal authority setup; suitable for the memory store or the Firestore adapter. */
export async function setupNativeHumanFood({count=7,control='WINCH',store}={}) {
  const h=await planetServiceHarness({count,humans:1,setupFlowVersion:3,engineProfile:'food-task-1.4',
    sample:control==='WINCH'?.999999:.2,...(store?{store}:{})});
  // Setup traffic must not consume the running Food polling/heartbeat allowance.
  for(let i=0;i<4;i++)await h.read(h.players[0]);
  const {session:boarding}=await enterTimedPlanetBoarding(h);
  for(let i=0;i<4;i++)await h.read(h.players[0]);
  h.setTime(boarding.setup.endsAt);await h.service.runDeadline(await h.currentJob());
  assert.equal((await h.current()).status,'running');
  await h.service.runBots(h.matchId);
  const invited=await h.read(h.players[0]),v=invited.foodPlayerView;
  assert.equal(v.step.kind,'ASKING');assert.equal(v.invitation.partnerSeatId,invited.selfSeatId);
  const join=v.offers.find(o=>o.type==='TASK_ANSWER');assert.ok(join,'bot invites the eligible lone human');
  const joined=await sendNativeFood(h,v,{type:'TASK_ANSWER',requestId:join.requestId,requestRevision:join.requestRevision,answer:'JOIN'});
  assert.equal(joined.receipt.status,'accepted');assert.equal(joined.receipt.result.state,'JOINED');
  const snapshot=await h.read(h.players[0]),task=snapshot.foodPlayerView.participantTask;
  assert.equal(task.selfControl,control);assert.equal(task.returnsAt-task.startedAt,32500);
  assert.equal(snapshot.foodPublicView.step.returnsAt,task.returnsAt);
  return {h,snapshot,task,joined};
}

/** Command envelope is derived solely from this client's authorized Food snapshot. */
export async function sendNativeFood(h,view,command,{commandId=h.nextId(),request}={}) {
  const q=request??{schemaVersion:1,protocolVersion:3,matchId:view.matchId,phaseId:view.phaseId,
    foodStepId:view.step.stepId,round:view.round,commandId,command};
  const response=await h.invoke(h.players[0],'foodCommand',{request:q}),result=ok(response);
  parseFoodTaskReceipt(result.receipt,q,view.seatId);
  return {request:q,receipt:result.receipt,response};
}

/** Worker fixture reads only the durable private scheduler to deliver due jobs. */
export async function runNativeFoodWorkersThrough(h,until) {
  assert.ok(until>=h.now(),'worker driver never moves the server clock backwards');
  for(let n=0;n<128;n++){
    const s=await h.current(),job=s.foodService?.scheduler;
    if(!job||job.endsAt>until)return;
    h.setTime(Math.max(h.now(),job.endsAt));
    await h.service.runDeadline({matchId:h.matchId,phaseId:job.phaseId,deadlineToken:job.token,kind:'game'});
    const next=(await h.current()).foodService?.scheduler;
    assert.ok(!next||next.token!==job.token||next.endsAt>h.now(),'due scheduler must make progress');
  }
  assert.fail('bounded worker driver exhausted');
}

/** Human exercises the same own-view policy as a deterministic script, never a full-state bot.
 * The service worker alone controls the bot partner. Sampling continues through the common return.
 */
export async function runHumanFoodJourney({count=7,control='WINCH',store,restart=true}={}) {
  const {h,task,joined}=await setupNativeHumanFood({count,control,...(store?{store}:{})});
  const history=[],stats={snapshots:0,heartbeats:0,terminalHeartbeats:0,restarted:false};
  let outcome=null,lastTask=null,firstPress=null;
  for(let offset=0;offset<=32500;offset+=FOOD_TASK_TRANSPORT.snapshotMs){
    const at=task.startedAt+offset;
    await runNativeFoodWorkersThrough(h,at);h.setTime(at);
    const snapshot=await h.read(h.players[0]);stats.snapshots++;
    assert.equal(snapshot.foodPlayerView.serverNowMs,at);assert.equal(snapshot.foodPublicView.serverNowMs,at);
    const view=snapshot.foodPlayerView,t=view.participantTask;
    if(offset<32500){
      assert.equal(view.step.kind,'AWAY');assert.equal(view.step.returnsAt,task.returnsAt);
      assert.equal(snapshot.publicView.phase.endsAt,task.returnsAt,'public phase keeps the common return');
      assert.ok(t,'participant remains in scene until fixed return');lastTask=t;
      if(t.outcome)outcome=t.outcome;
      if(offset%FOOD_TASK_TRANSPORT.heartbeatMs===0){
        const beat=await h.invoke(h.players[0],'foodHeartbeat',{matchId:h.matchId,taskId:t.taskId});
        if(t.stage==='ENDED'){assert.equal(beat.ok,false);assert.equal(beat.error.code,'NOT_ALLOWED');stats.terminalHeartbeats++;}
        else {ok(beat);stats.heartbeats++;}
      }
      const decision=chooseFoodBotInput(view);
      if(decision.command){
        assert.equal(decision.command.type,'TASK_PRESS');
        if(!firstPress&&typeof h.store.retryNext==='function')h.store.retryNext();
        const sent=await sendNativeFood(h,view,decision.command);assert.equal(sent.receipt.status,'accepted',JSON.stringify(sent.receipt));
        history.push(sent);firstPress??=sent;
      }
      if(restart&&!stats.restarted&&firstPress){
        h.setTime(at+1);
        assert.ok(h.now()>firstPress.receipt.receivedAt,'retry occurs after original durable admission');
        h.reload();
        const lookup=ok(await h.invoke(h.players[0],'foodReceipt',{matchId:h.matchId,commandId:firstPress.request.commandId}));
        assert.deepEqual(lookup.receipt,firstPress.receipt);
        const retried=await h.invoke(h.players[0],'foodCommand',{request:firstPress.request});
        assert.deepEqual(retried,firstPress.response,'restart retry keeps original receipt and server time');
        const restored=await h.read(h.players[0]);
        assert.ok(restored.foodPlayerView.participantTask.ownReturnPlacement,'runtime own return placement survives reconnect');
        assert.deepEqual(restored.foodPlayerView.participantTask.ownReturnPlacement,task.ownReturnPlacement);
        stats.restarted=true;
      }
      await h.service.runBots(h.matchId);
    }else{
      assert.equal(view.step,null);assert.equal(view.participantTask,null);
      assert.equal(snapshot.playerView.phase.kind,'PRE_TURN');assert.equal(snapshot.playerView.phase.startedAt,task.returnsAt);
    }
  }
  assert.equal(outcome?.kind,'DELIVERED','cooperative own-view clients deliver through the real engine');
  assert.equal(outcome.dosesAdded,10);assert.equal(stats.snapshots,66);assert.ok(stats.heartbeats>0);
  assert.equal(stats.heartbeats+stats.terminalHeartbeats,33);
  const returned=await h.current(),world=returned.state.worlds[returned.state.currentWorldId];
  assert.deepEqual(world.food.deliveredTaskIds,[task.taskId]);assert.equal(world.food.doses,20);
  assert.equal(returned.state.food.lastTaskRound[task.winchSeatId],1);assert.equal(returned.state.food.lastTaskRound[task.panelSeatId],1);
  assert.ok(history.some(r=>r.request.command.input.kind==='KEY'));
  if(control==='WINCH'){
    assert.ok(history.some(r=>r.request.command.input.kind==='HOLD'&&r.request.command.input.edge==='DOWN'));
    assert.ok(history.some(r=>r.request.command.input.kind==='HOLD'&&r.request.command.input.edge==='UP'));
  }else{
    assert.ok(history.some(r=>r.request.command.input.kind==='PANEL_RELEASE'));
    assert.ok(history.some(r=>r.request.command.input.kind==='PANEL_LOCK'));
  }
  // After common return, native PRE_TURN and bot turns run until the human's ordinary offer.
  let own;
  for(let n=0;n<30;n++){
    own=await h.read(h.players[0]);
    if(own.playerView.phase.kind==='ORDINARY_TURN'&&own.playerView.activeSeatId===own.selfSeatId)break;
    const s=await h.current(),scheduled=s.foodService?.scheduler;assert.ok(scheduled);
    await runNativeFoodWorkersThrough(h,Math.max(h.now(),scheduled.endsAt));
    await h.service.runBots(h.matchId);
  }
  assert.equal(own.playerView.phase.kind,'ORDINARY_TURN');assert.equal(own.playerView.activeSeatId,own.selfSeatId);
  const ordinary={protocolVersion:3,matchId:h.matchId,phaseId:own.playerView.phase.id,commandId:h.nextId(),command:{type:'PASS_TURN'}};
  const mealResult=ok(await h.invoke(h.players[0],'command',{request:ordinary}));assert.equal(mealResult.receipt.status,'accepted');
  const afterMeal=await h.read(h.players[0]),meal=afterMeal.foodPlayerView.ownMeals.at(-1);assert.ok(meal);
  assert.equal(meal.sourcePhaseId,ordinary.phaseId);assert.equal(meal.seatId,own.selfSeatId);assert.equal(meal.dosesConsumed,1);
  const mealSnapshot=JSON.stringify(meal),mealRetry=await h.invoke(h.players[0],'command',{request:ordinary});
  assert.equal(ok(mealRetry).receipt.status,'accepted');
  const afterRetry=await h.read(h.players[0]);
  assert.equal(JSON.stringify(afterRetry.foodPlayerView.ownMeals.at(-1)),mealSnapshot);
  assert.equal(afterRetry.foodPlayerView.ownMeals.length,afterMeal.foodPlayerView.ownMeals.length);
  assert.equal(afterRetry.foodPlayerView.stock.doses,afterMeal.foodPlayerView.stock.doses,'meal retry consumes no extra dose');
  return {h,task,lastTask,outcome,history,joined,stats,afterMeal,ordinary};
}
