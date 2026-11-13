import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setupNativeHumanFood,sendNativeFood,runNativeFoodWorkersThrough} from './planet-food-native-service-control.mjs';
import {FOOD_BOT_WALL_BUDGET_MS} from '../dist/planet-food-service.js';
import {chooseFoodBotInput} from '../dist/food-bot-policy.js';
import {ok} from './planet-service-helper.mjs';

const journal=h=>h.store.export().filter(([key])=>key.startsWith('journal/'+h.matchId+'/')).map(([,value])=>value);
test('an injected clock has no implicit wait and leaves its future bot wake durable',async()=>{
  const {h,task}=await setupNativeHumanFood({control:'WINCH'});
  await runNativeFoodWorkersThrough(h,task.runningAt);h.setTime(task.runningAt);
  const v=(await h.read(h.players[0])).foodPlayerView;
  await sendNativeFood(h,v,chooseFoodBotInput(v).command);
  const at=h.now();await h.service.runBots(h.matchId);
  assert.equal(h.now(),at);
  assert.equal(journal(h).some(r=>r.kind==='FOOD_COMMAND'&&r.request.command.input?.kind==='PANEL_RELEASE'),false);
  assert.ok((await h.current()).foodService.scheduler.endsAt>at);
});

test('trusted waits reach the bot Panel LOCK window without punctual Tasks or backdated input',async()=>{
  const {h,task}=await setupNativeHumanFood({control:'WINCH'}),waits=[];
  await runNativeFoodWorkersThrough(h,task.runningAt);h.setTime(task.runningAt);
  const v=(await h.read(h.players[0])).foodPlayerView;
  await sendNativeFood(h,v,chooseFoodBotInput(v).command);
  h.reload({waitForBotWake:async ms=>{
    assert.ok(Number.isInteger(ms)&&ms>0&&ms<=1000);waits.push(ms);h.setTime(h.now()+ms);
    // Concurrent human polling stays on the normal API and renews only its own connection.
    await h.read(h.players[0]);
    const s=await h.current(),machine=s.state.food.step?.task;
    if(machine?.panel.locked&&machine.panel.stop===5)
      ok(await h.operation(h.host,'abort',{matchId:h.matchId}));
  }});
  await h.service.runBots(h.matchId);
  const records=journal(h).filter(r=>r.kind==='FOOD_COMMAND'&&r.controller==='bot');
  const release=records.find(r=>r.request.command.input?.kind==='PANEL_RELEASE');
  const lock=records.find(r=>r.request.command.input?.kind==='PANEL_LOCK');
  assert.ok(release&&lock,'real engine accepts bot Release and Lock without another Tasks delivery');
  assert.equal(lock.receipt.status,'accepted');assert.equal(lock.context.now,lock.receipt.receivedAt);
  assert.equal(lock.context.now-release.context.now,1000,'actual admission reaches the first platform click');
  assert.ok(waits.includes(450)&&waits.includes(1000));
  assert.equal((await h.current()).status,'aborted');
});

test('waiting is chunked, refreshes the lease, consumes no input budget and releases at its cap',async()=>{
  const {h,task}=await setupNativeHumanFood({control:'WINCH'}),waits=[];
  h.reload({waitForBotWake:async ms=>{
    assert.ok(Number.isInteger(ms)&&ms>0&&ms<=1000);waits.push(ms);h.setTime(h.now()+ms);
    await h.read(h.players[0]);
  }});
  await h.service.runBots(h.matchId);
  assert.equal(waits.reduce((a,b)=>a+b,0),FOOD_BOT_WALL_BUDGET_MS);
  assert.equal(h.now(),task.startedAt+FOOD_BOT_WALL_BUDGET_MS);
  assert.equal(journal(h).some(r=>r.kind==='FOOD_COMMAND'&&r.controller==='bot'&&r.request.command.type==='TASK_PRESS'),false);
  assert.equal(h.store.export().some(([key])=>key==='foodBotWorker/'+h.matchId),false);
  assert.ok((await h.current()).foodService.scheduler.endsAt>h.now(),'release keeps a durable continuation');
  assert.ok(h.store.attempts.filter(a=>a.commit&&a.writes.includes('foodBotWorker/'+h.matchId)).length>=3,'lease refreshes across the wait budget');
});
