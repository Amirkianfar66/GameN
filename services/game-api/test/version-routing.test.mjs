import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameService} from '../dist/index.js';
test('retained protocol-1 outbox repair cannot read/enqueue/ack protocol-2 or future intents',async()=>{
  const docs=[2,3].map(protocolVersion=>({data:()=>({protocolVersion,status:'pending'}),ref:{update:async()=>assert.fail('newer intent acknowledged by legacy repair')}}));
  const service=createGameService({db:{collectionGroup:name=>{assert.equal(name,'outbox');return{where:(field,op,value)=>{assert.deepEqual([field,op,value],['status','==','pending']);return{get:async()=>({docs})};}};}}});
  const result=await service.repairOutbox(async()=>assert.fail('newer intent enqueued by legacy repair'));
  assert.deepEqual(result,{dispatched:0,failed:0});
});
