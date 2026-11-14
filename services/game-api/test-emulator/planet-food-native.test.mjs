import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {runHumanFoodJourney,setupNativeHumanFood,sendNativeFood} from '../test/planet-food-native-service-control.mjs';
import {chooseFoodBotInput} from '../dist/food-bot-policy.js';
import {ok} from '../test/planet-service-helper.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},'native-food-'+randomUUID());db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
for(const count of [7,8,9])for(const control of ['WINCH','PANEL'])test(`${count}: genuine Firestore Food ${control}, full cadence, fixed return, restart receipt and meal`,async()=>{
  await runHumanFoodJourney({count,control,store:createFirestorePlanetStore(db)});
});

test('9: concurrent Firestore reads, private workers, deadline delivery and receipt recovery preserve causal release', {timeout:60000},async()=>{
  const {h,task}=await setupNativeHumanFood({count:9,control:'WINCH',store:createFirestorePlanetStore(db)});
  h.setTime(task.runningAt);
  let view=(await h.read(h.players[0])).foodPlayerView;
  const down=await sendNativeFood(h,view,chooseFoodBotInput(view).command);assert.equal(down.receipt.status,'accepted');
  h.setTime(task.runningAt+450);
  const s=await h.current(),scheduled=s.foodService.scheduler;
  const job={matchId:h.matchId,phaseId:scheduled.phaseId,deadlineToken:scheduled.token,kind:'game'};
  let up;
  // One in-flight snapshot plus independent worker, timer and receipt lanes.
  // Repeat the legitimate overlap; this is not a 48-request single-phone burst.
  for(let round=0;round<12;round++){
    const results=await Promise.allSettled([
      h.read(h.players[0]),h.service.runBots(h.matchId),h.service.runDeadline(job),
      h.invoke(h.players[0],'foodReceipt',{matchId:h.matchId,commandId:down.request.commandId}).then(r=>assert.deepEqual(ok(r).receipt,down.receipt)),
      ...(round===11?[sendNativeFood(h,view,{...down.request.command,input:{...down.request.command.input,edge:'UP'}}).then(r=>{up=r;})]:[]),
    ]);
    for(const result of results)if(result.status==='rejected')throw result.reason;
  }
  assert.ok(up);
  assert.equal(up.receipt.status,'accepted');assert.equal(up.receipt.result.effect,'APPLIED');
  assert.deepEqual(await h.invoke(h.players[0],'foodCommand',{request:up.request}),up.response);
  const after=await h.current();assert.equal(after.state.food.step.task.hold.holderSequence,null);
  const control=await h.store.transaction(tx=>tx.get('foodIngressControl/'+h.matchId));
  assert.equal(control.processedSequence,control.nextSequence-1,'concurrent admitted inputs drain without a lost prefix');
});
