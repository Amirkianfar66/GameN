import test from 'node:test';
import assert from 'node:assert/strict';
import {PlanetFoodTransportRequestSchema,PlanetServiceRequestSchema,PlanetSessionSnapshotSchema,
  PlanetFoodStreamFrameSchema,PlanetFoodClockResponseSchema} from '@mothership/contracts';
import {setupNativeHumanFood} from './planet-food-native-service-control.mjs';

test('Food stream is a scoped read transport, with no caller identity, task secret, game clock or command intake',()=>{
  const scope={version:1,matchId:'match-1',phaseId:'phase-1',foodStepId:'step-1'};
  for(const operation of ['foodWatch','foodClock']){
    const request={...scope,operation};
    assert.equal(PlanetFoodTransportRequestSchema.safeParse(request).success,true);
    assert.equal(PlanetServiceRequestSchema.safeParse(request).success,false);
    for(const extra of [{uid:'user-1'},{taskId:'private-task'},{receivedAt:1000},{sequence:1}])
      assert.equal(PlanetFoodTransportRequestSchema.safeParse({...request,...extra}).success,false);
  }
  const clock={ok:true,scope,receivedAt:1000,serverTimeMs:1020};
  assert.equal(PlanetFoodClockResponseSchema.safeParse(clock).success,true);
  assert.equal(PlanetFoodClockResponseSchema.safeParse({...clock,serverTimeMs:999}).success,false);
  assert.equal(PlanetFoodClockResponseSchema.safeParse({...clock,leaseRenewed:true}).success,false);
});

test('native authorized snapshots bind stream scope, audience and clock; old snapshots still parse',async()=>{
  const {h,snapshot}=await setupNativeHumanFood();
  PlanetSessionSnapshotSchema.parse(snapshot);
  const offer={version:1,phaseId:snapshot.publicView.phase.id,foodStepId:snapshot.foodPublicView.step.stepId};
  const offered={...snapshot,foodStream:offer};
  PlanetSessionSnapshotSchema.parse(offered);
  const frame={...offer,matchId:snapshot.matchId,frameEpoch:'connection-1',frameSequence:1,
    serverTimeMs:snapshot.foodPublicView.serverNowMs,kind:'snapshot',fresh:true,snapshot:offered};
  PlanetFoodStreamFrameSchema.parse(frame);
  for(const patch of [{foodStepId:'wrong-step'},{frameSequence:0},{serverTimeMs:frame.serverTimeMs+1},
    {ownerEpoch:1},{snapshot:{...offered,matchId:'another-match'}}])
    assert.equal(PlanetFoodStreamFrameSchema.safeParse({...frame,...patch}).success,false);
  assert.equal(PlanetFoodStreamFrameSchema.safeParse({...frame,fresh:false}).success,true);
  const host=await h.read(h.host);
  const publicFrame={...frame,snapshot:{...host,foodStream:offer}};
  PlanetFoodStreamFrameSchema.parse(publicFrame);
  assert.equal(PlanetFoodStreamFrameSchema.safeParse({...publicFrame,fresh:false}).success,false);
  for(const patch of [{status:'finished'},{foodStream:{...offer,phaseId:'other-phase'}},
    {foodStream:{...offer,taskId:'private-task'}}])
    assert.equal(PlanetSessionSnapshotSchema.safeParse({...offered,...patch}).success,false);
});

test('planned return includes the fresh authorized Session; interrupted streams never authorize legacy fallback',async()=>{
  const {h,snapshot}=await setupNativeHumanFood();
  const scope={version:1,matchId:snapshot.matchId,phaseId:snapshot.publicView.phase.id,
    foodStepId:snapshot.foodPublicView.step.stepId};
  const frame={...scope,frameEpoch:'connection-1',frameSequence:2,serverTimeMs:h.now(),kind:'closed'};
  for(const reason of ['unavailable','authorization']){
    PlanetFoodStreamFrameSchema.parse({...frame,reason});
    assert.equal(PlanetFoodStreamFrameSchema.safeParse({...frame,reason,snapshot}).success,false);
  }
  await h.operation(h.host,'abort',{matchId:h.matchId});
  const ended=await h.read(h.host);
  PlanetFoodStreamFrameSchema.parse({...frame,reason:'phase-ended',snapshot:ended});
  assert.equal(PlanetFoodStreamFrameSchema.safeParse({...frame,reason:'phase-ended'}).success,false);
  assert.equal(PlanetFoodStreamFrameSchema.safeParse({...frame,reason:'phase-ended',snapshot:{...snapshot,
    foodStream:{version:1,phaseId:scope.phaseId,foodStepId:scope.foodStepId}}}).success,false);
});
