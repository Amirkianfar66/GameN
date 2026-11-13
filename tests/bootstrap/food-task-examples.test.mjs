import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {FoodTaskCommandRequestSchema, FoodTaskPublicViewSchema, FoodTaskPlayerViewSchema,
  parseFoodTaskReceipt, foodTaskHoldInput} from '../../packages/contracts/dist/planet-food-task.js';
import {createHoldLedger,admitHoldInput} from '../../packages/contracts/dist/food-task-hold.js';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const examples=JSON.parse(read('docs/backend/examples/food-task-contract-v1.json'));
for (const {label,kind,packet,originalRequest,seatId} of examples.packets) test(`Food example: ${label}`,()=>{
  if (kind==='RECEIPT') assert.deepEqual(parseFoodTaskReceipt(packet,originalRequest,seatId),packet);
  else {
    const schema={COMMAND:FoodTaskCommandRequestSchema,PUBLIC:FoodTaskPublicViewSchema,PLAYER:FoodTaskPlayerViewSchema}[kind];
    assert.ok(schema,kind);assert.deepEqual(schema.parse(packet),packet);
  }
});
for (const {label,arrivals} of examples.traces) test(`Food ordering example executes the admission ledger: ${label}`,()=>{
  let ledger=createHoldLedger('task-2','winch-session-2','seat-1',1000);
  const effects=[];
  for (const {request,serverReceivedAt} of arrivals) {
    const result=admitHoldInput(ledger,foodTaskHoldInput(request),{taskId:'task-2',controlSessionId:'winch-session-2',
      authenticatedSeatId:'seat-1',control:'WINCH',alive:true,active:true,currentRevision:5,currentCrateId:'crate-0',
      canAcquire:serverReceivedAt>=5000,receivedAt:serverReceivedAt});
    ledger=result.ledger;effects.push(result.effect.type);
  }
  assert.deepEqual(effects,label==='up-before-down' ? ['NONE','NONE'] : ['ACQUIRE','RELEASE','ACQUIRE','NONE']);
  assert.equal(ledger.holderSequence,label==='up-before-down' ? null : 2);
});
test('Food candidate keeps exact parent/source hashes and remains unregistered and inactive',()=>{
  const candidate=JSON.parse(read('rules/planet-successor-food-task-candidate-2026-11-12.json'));
  for (const {path,sha256} of [candidate.parent_authority,...candidate.sources])
    assert.equal(createHash('sha256').update(read(path)).digest('hex'),sha256,path);
  assert.equal(candidate.parent_authority.sha256,'2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556');
  assert.deepEqual(candidate.implementation_gate.remaining_rule_precision,[]);
  const flags=candidate.activation_boundary;
  assert.ok(flags && Object.values(flags).every(value=>value===false));
});
