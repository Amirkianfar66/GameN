import assert from 'node:assert/strict';
import {test} from 'node:test';
import {admitHoldInput, admitHoldRecoveryOff, advancePendingHold, createHoldLedger, projectHoldRecovery} from '../../packages/contracts/dist/food-task-hold.js';

const start = () => createHoldLedger('task-a', 'session-winch', 'seat-1', 4000);
const context = (changes = {}) => ({taskId:'task-a',controlSessionId:'session-winch',authenticatedSeatId:'seat-1',
  control:'WINCH',alive:true,active:true,currentRevision:0,currentCrateId:'crate-1',canAcquire:true,receivedAt:4500,...changes});
const input = (edge, sequence = 1, changes = {}) => ({commandId:`${edge}-${sequence}`,taskId:'task-a',controlSessionId:'session-winch',
  expectedRevision:0,gestureSequence:sequence,edge,crateId:edge==='UP'?null:'crate-1',...changes});
const press = (ledger, edge, sequence, at, changes = {}, authority = {}) =>
  admitHoldInput(ledger,input(edge,sequence,changes),context({receivedAt:at,...authority}));
const recover = (ledger, at, changes = {}, authority = {}) => admitHoldRecoveryOff(ledger,{
  kind:'HOLD_RECOVER_OFF',commandId:'recover-off',taskId:'task-a',controlSessionId:'session-winch',expectedRevision:0,
  recoveryRevision:projectHoldRecovery(ledger).recoveryRevision,throughSequence:projectHoldRecovery(ledger).highestSequence,...changes,
},context({receivedAt:at,...authority}));

test('UP before DOWN durably closes the gesture, including across JSON restoration',()=>{
  const up=press(start(),'UP',1,4500);
  assert.equal(up.effect.type,'NONE');assert.equal(up.receipt.code,'CLOSED');
  const late=press(JSON.parse(JSON.stringify(up.ledger)),'DOWN',1,4600);
  assert.equal(late.effect.type,'NONE');assert.equal(late.receipt.code,'ALREADY_CLOSED');
  assert.equal(late.ledger.holderSequence,null);
  assert.equal(advancePendingHold(late.ledger,context({receivedAt:4700})).effect.type,'NONE');
});
for(const nextCrate of ['crate-1','crate-2'])test(`late separate-ID UP A cannot release B on ${nextCrate}`,()=>{
  const a=press(start(),'DOWN',1,4500),released=press(a.ledger,'UP',1,4600);
  const b=press(released.ledger,'DOWN',2,4700,{crateId:nextCrate},{currentCrateId:nextCrate});
  assert.equal(b.effect.type,'ACQUIRE');
  const delayed=press(b.ledger,'UP',1,4800,{commandId:'late-cancel-a'}, {currentCrateId:nextCrate,currentRevision:99});
  assert.equal(delayed.receipt.code,'ALREADY_CLOSED');assert.equal(delayed.effect.type,'NONE');
  assert.equal(delayed.ledger.holderSequence,2);
  assert.equal(delayed.ledger.gestures['2'].boundCrateId,nextCrate);
});
test('same-ID retries recover the original receipt without replaying acquire/release',()=>{
  const d=input('DOWN'),first=admitHoldInput(start(),d,context());
  const retry=admitHoldInput(first.ledger,d,context({receivedAt:8000,currentRevision:9,active:false,alive:false}));
  assert.deepEqual(retry.receipt,first.receipt);assert.equal(retry.replayed,true);assert.equal(retry.effect.type,'NONE');
  const up=input('UP'),release=admitHoldInput(first.ledger,up,context({receivedAt:4600}));
  const b=press(release.ledger,'DOWN',2,4700);
  const replay=admitHoldInput(b.ledger,up,context({receivedAt:4800}));
  assert.deepEqual(replay.receipt,release.receipt);assert.equal(replay.effect.type,'NONE');assert.equal(replay.ledger.holderSequence,2);
});
test('same command ID with a changed fingerprint cannot rewrite its receipt or state',()=>{
  const first=press(start(),'DOWN',1,4500),saved=JSON.parse(JSON.stringify(first.ledger));
  const conflict=press(first.ledger,'UP',1,4600,{commandId:'DOWN-1'});
  assert.equal(conflict.receipt.code,'COMMAND_ID_CONFLICT');assert.equal(conflict.effect.type,'NONE');
  assert.deepEqual(conflict.ledger,saved);
});
test('release before DOWN acknowledgement uses the durable own binding despite an older revision',()=>{
  const down=press(start(),'DOWN',1,4500);
  const released=press(down.ledger,'UP',1,4550,{}, {currentRevision:4});
  assert.equal(released.receipt.code,'RELEASED');assert.equal(released.effect.type,'RELEASE');
  assert.equal(released.effect.crateId,'crate-1');assert.equal(released.effect.serverReceivedAt,4550);
});
test('overtaking DOWN B does not fabricate UP A, and the matched older UP can still release A',()=>{
  const a=press(start(),'DOWN',1,4500),b=press(a.ledger,'DOWN',2,4600);
  assert.equal(b.effect.type,'NONE');assert.equal(b.receipt.code,'DOWN_PENDING');assert.equal(b.ledger.holderSequence,1);
  const upA=press(b.ledger,'UP',1,4700);
  assert.equal(upA.effect.type,'RELEASE');assert.equal(upA.effect.gestureSequence,1);
  const after=advancePendingHold(upA.ledger,context({receivedAt:4800}));
  assert.equal(after.effect.type,'ACQUIRE');assert.equal(after.effect.gestureSequence,2);
  const repeatedA=press(after.ledger,'UP',1,4900,{commandId:'second-up-a'});
  assert.equal(repeatedA.effect.type,'NONE');assert.equal(repeatedA.ledger.holderSequence,2);
});
test('a newer closed gesture prevents a late older DOWN from resurrecting',()=>{
  const newer=press(start(),'UP',2,4500),older=press(newer.ledger,'DOWN',1,4600);
  assert.equal(older.receipt.code,'OLD_GESTURE');assert.equal(older.effect.type,'NONE');
  assert.equal(older.ledger.highestSequence,2);
});
test('pre-held contact auto-acquires once at server eligibility, and preserves original DOWN receipt',()=>{
  const pending=press(start(),'DOWN',1,4500,{}, {canAcquire:false}),receipt=pending.receipt;
  assert.equal(pending.effect.type,'NONE');assert.equal(receipt.code,'DOWN_PENDING');
  const waiting=advancePendingHold(pending.ledger,context({receivedAt:4600,canAcquire:false}));
  const ready=advancePendingHold(waiting.ledger,context({receivedAt:4700}));
  assert.equal(ready.effect.type,'ACQUIRE');assert.equal(ready.effect.serverReceivedAt,4700);
  const duplicate=advancePendingHold(ready.ledger,context({receivedAt:4800}));
  assert.equal(duplicate.effect.type,'NONE');assert.deepEqual(duplicate.ledger.receipts['DOWN-1'].receipt,receipt);
});
test('early DOWN observed before a Panel revision still records held intent and acquires once when eligible',()=>{
  const pending=press(start(),'DOWN',1,4500,{expectedRevision:0,crateId:null},{currentRevision:7,canAcquire:false});
  assert.equal(pending.receipt.code,'DOWN_PENDING');assert.equal(pending.effect.type,'NONE');
  const acquired=advancePendingHold(pending.ledger,context({receivedAt:4800,currentRevision:8}));
  assert.equal(acquired.effect.type,'ACQUIRE');assert.equal(acquired.effect.serverReceivedAt,4800);
  assert.equal(advancePendingHold(acquired.ledger,context({receivedAt:4900,currentRevision:9})).effect.type,'NONE');
  assert.equal(acquired.ledger.receipts['DOWN-1'].receipt.serverReceivedAt,4500);
});
test('a rapid successor gesture needs no earlier acknowledgement and accepts an old observed revision',()=>{
  const a=press(start(),'DOWN',1,4500);
  const released=press(a.ledger,'UP',1,4510,{}, {currentRevision:2});
  const b=press(released.ledger,'DOWN',2,4520,{expectedRevision:0},{currentRevision:3});
  assert.equal(b.effect.type,'ACQUIRE');assert.equal(b.ledger.holderSequence,2);
  const delayed=press(b.ledger,'UP',1,4530,{commandId:'late-rapid-up-a'},{currentRevision:4});
  assert.equal(delayed.effect.type,'NONE');assert.equal(delayed.ledger.holderSequence,2);
});
test('unbound early DOWN waits for authority and binds its first eligible server generation once',()=>{
  const pending=press(start(),'DOWN',1,4500,{crateId:null},{canAcquire:false});
  assert.equal(pending.receipt.code,'DOWN_PENDING');assert.equal(pending.receipt.boundCrateId,null);
  assert.equal(pending.ledger.gestures['1'].expectedCrateId,null);
  const ready=advancePendingHold(pending.ledger,context({receivedAt:4600,currentCrateId:'crate-7'}));
  assert.equal(ready.effect.type,'ACQUIRE');assert.equal(ready.effect.crateId,'crate-7');
  assert.equal(ready.ledger.gestures['1'].boundCrateId,'crate-7');
  const later=advancePendingHold(ready.ledger,context({receivedAt:4700,currentCrateId:'crate-8'}));
  assert.equal(later.effect.type,'NONE');assert.equal(later.ledger.gestures['1'].boundCrateId,'crate-7');
  assert.deepEqual(later.ledger.receipts['DOWN-1'].receipt,pending.receipt);
});
test('unknown-crate UP first closes an unbound gesture and prevents later eligible acquisition',()=>{
  const first=press(start(),'UP',1,4500,{crateId:null});
  const lateDown=press(first.ledger,'DOWN',1,4600,{crateId:null},{currentCrateId:'crate-9'});
  assert.equal(lateDown.receipt.code,'ALREADY_CLOSED');assert.equal(lateDown.effect.type,'NONE');
  assert.equal(advancePendingHold(lateDown.ledger,context({receivedAt:4700,currentCrateId:'crate-9'})).effect.type,'NONE');
});
test('replacement during unbound pending contact is allowed, but its eventual UP releases only its bound generation',()=>{
  const pending=press(start(),'DOWN',1,4500,{crateId:null},{canAcquire:false});
  const waiting=advancePendingHold(pending.ledger,context({receivedAt:4600,currentCrateId:'crate-2',canAcquire:false}));
  assert.equal(waiting.ledger.gestures['1'].state,'PENDING');
  const acquired=advancePendingHold(waiting.ledger,context({receivedAt:4700,currentCrateId:'crate-3'}));
  assert.equal(acquired.effect.type,'ACQUIRE');assert.equal(acquired.effect.crateId,'crate-3');
  const up=press(acquired.ledger,'UP',1,4800,{crateId:null},{currentCrateId:'crate-3'});
  assert.equal(up.effect.type,'RELEASE');assert.equal(up.effect.crateId,'crate-3');
});
test('UP closes a pre-held contact before eligibility and no later callback acquires it',()=>{
  const d=press(start(),'DOWN',1,4500,{}, {canAcquire:false});
  const u=press(d.ledger,'UP',1,4550);
  assert.equal(u.effect.type,'NONE');
  assert.equal(advancePendingHold(u.ledger,context({receivedAt:4600})).effect.type,'NONE');
});
test('pending contact cannot acquire a replacement generation it never named',()=>{
  const d=press(start(),'DOWN',1,4500,{}, {canAcquire:false});
  const replacement=advancePendingHold(d.ledger,context({receivedAt:4600,currentCrateId:'crate-2'}));
  assert.equal(replacement.effect.type,'NONE');assert.equal(replacement.ledger.gestures['1'].state,'CLOSED');
});
test('stopped-drop brake can pass the same crate to the next gesture; old UP remains harmless',()=>{
  const first=press(start(),'DOWN',1,4500),closed=press(first.ledger,'UP',1,4600);
  // The external physics owns the catch/brake result; this protocol only sees eligibility.
  const next=press(closed.ledger,'DOWN',2,4700);
  assert.equal(next.effect.type,'ACQUIRE');assert.equal(next.effect.crateId,'crate-1');
  const old=press(next.ledger,'UP',1,4800,{commandId:'late-pointer-cancel'});
  assert.equal(old.effect.type,'NONE');assert.equal(old.ledger.holderSequence,2);
});
test('old UP from an unbound-origin gesture cannot release a later brake takeover of the same crate',()=>{
  const a=press(start(),'DOWN',1,4500,{crateId:null});
  const upA=press(a.ledger,'UP',1,4600,{crateId:null});
  const b=press(upA.ledger,'DOWN',2,4700,{crateId:null});
  const delayed=press(b.ledger,'UP',1,4800,{commandId:'old-unbound-origin-cancel',crateId:null});
  assert.equal(delayed.effect.type,'NONE');assert.equal(delayed.ledger.holderSequence,2);
  assert.equal(delayed.ledger.gestures['2'].boundCrateId,'crate-1');
});
for(const [name,changes,code]of [
  ['unknown Task',{taskId:'task-other'},'WRONG_BINDING'],
  ['unknown control session',{controlSessionId:'session-other'},'WRONG_BINDING'],
  ['other seat',{authenticatedSeatId:'seat-2'},'WRONG_BINDING'],
  ['wrong control',{control:'PANEL'},'WRONG_CONTROL'],
  ['dead participant',{alive:false},'NOT_ALIVE'],
  ['ended Task',{active:false},'NOT_ACTIVE'],
])test(`${name} cannot acquire, release or close a gesture`,()=>{
  const first=press(start(),'DOWN',1,4500),before=JSON.parse(JSON.stringify(first.ledger));
  const invalid=press(first.ledger,'UP',1,4600,{},changes);
  assert.equal(invalid.receipt.code,code);assert.equal(invalid.effect.type,'NONE');
  assert.deepEqual(invalid.ledger.gestures,before.gestures);assert.equal(invalid.ledger.holderSequence,1);
});
test('future revision is rejected for either edge; old observations do not substitute for causal Hold guards',()=>{
  const d=press(start(),'DOWN',1,4500);
  const future=press(d.ledger,'UP',1,4600,{expectedRevision:2},{currentRevision:1});
  assert.equal(future.receipt.code,'FUTURE_REVISION');assert.equal(future.ledger.holderSequence,1);
  const futureDown=press(start(),'DOWN',1,4500,{expectedRevision:2},{currentRevision:1});
  assert.equal(futureDown.receipt.code,'FUTURE_REVISION');assert.equal(futureDown.effect.type,'NONE');
  const oldObservation=press(start(),'DOWN',1,4500,{}, {currentRevision:1});
  assert.equal(oldObservation.receipt.code,'ACQUIRED');assert.equal(oldObservation.effect.type,'ACQUIRE');
});
test('known wrong crate cannot release a bound Hold, and nullable UP cannot release another current generation',()=>{
  const d=press(start(),'DOWN',1,4500);
  const wrong=press(d.ledger,'UP',1,4600,{crateId:'crate-2'});
  assert.equal(wrong.receipt.code,'CRATE_MISMATCH');assert.equal(wrong.ledger.holderSequence,1);
  const changed=press(d.ledger,'UP',1,4600,{}, {currentCrateId:'crate-2'});
  assert.equal(changed.effect.type,'NONE');assert.equal(changed.ledger.holderSequence,null);
});
test('original server receive time is not backdated and invalid/non-finite inputs cannot enter the ledger',()=>{
  const d=press(start(),'DOWN',1,4500),late=press(d.ledger,'UP',1,4400);
  assert.equal(late.receipt.code,'STALE_TIME');assert.equal(late.effect.type,'NONE');
  for(const altered of [{gestureSequence:Infinity},{gestureSequence:NaN},{gestureSequence:0},{expectedRevision:Infinity},{shownAt:1},{crateId:17}]){
    const invalid=admitHoldInput(start(),input('DOWN',1,altered),context());
    assert.equal(invalid.receipt.code,'INVALID_INPUT');assert.equal(invalid.effect.type,'NONE');
  }
  assert.throws(()=>admitHoldInput(start(),input('DOWN'),context({receivedAt:NaN})),/Invalid server/);
});
test('admission and boundary completion are immutable, including nested receipt/gesture maps',()=>{
  const original=start(),command=input('DOWN'),authority=context();
  const snapshots=[original,command,authority].map(v=>JSON.parse(JSON.stringify(v)));
  const accepted=admitHoldInput(original,command,authority);
  assert.deepEqual([original,command,authority],snapshots);
  assert.ok(Object.isFrozen(accepted.ledger));assert.ok(Object.isFrozen(accepted.ledger.gestures));
  assert.ok(Object.isFrozen(accepted.ledger.receipts));assert.ok(Object.isFrozen(accepted.ledger.receipts['DOWN-1'].receipt));
  assert.throws(()=>{accepted.ledger.gestures['1'].boundCrateId='crate-b';},TypeError);
});
test('recovery view reports the actual older holder after a newer contact is closed',()=>{
  const d1=press(start(),'DOWN',1,4500),d2=press(d1.ledger,'DOWN',2,4600);
  const up2=press(d2.ledger,'UP',2,4700),before=JSON.parse(JSON.stringify(up2.ledger));
  assert.deepEqual(projectHoldRecovery(up2.ledger),{
    currentHolder:{sequence:1,crateId:'crate-1'},pendingIntent:null,highestSequence:2,recoveryRevision:3,
  });
  assert.deepEqual(up2.ledger,before,'Getter must write no recovery/publication state');
});
test('recovered finger-off closes pending successor before releasing holder atomically',()=>{
  const d1=press(start(),'DOWN',1,4500),d2=press(d1.ledger,'DOWN',2,4600);
  assert.deepEqual(projectHoldRecovery(d2.ledger).pendingIntent,{sequence:2,crateId:'crate-1'});
  const off=recover(d2.ledger,4700);
  assert.equal(off.receipt.code,'RECOVERED_CLOSED');assert.equal(off.receipt.closedHighwater,2);
  assert.equal(off.effect.type,'RELEASE');assert.equal(off.effect.gestureSequence,1);
  assert.equal(off.effect.serverReceivedAt,4700);
  assert.deepEqual(projectHoldRecovery(off.ledger),{
    currentHolder:null,pendingIntent:null,highestSequence:2,recoveryRevision:3,
  });
  assert.equal(advancePendingHold(off.ledger,context({receivedAt:4800})).effect.type,'NONE');
  const delayed=press(off.ledger,'DOWN',2,4900,{commandId:'late-down-two'});
  assert.equal(delayed.effect.type,'NONE');assert.equal(delayed.receipt.code,'ALREADY_CLOSED');
});
test('recovery throughSequence closes a locally ended but not-yet-seen contact',()=>{
  const d1=press(start(),'DOWN',1,4500);
  const off=recover(d1.ledger,4600,{throughSequence:2});
  assert.equal(off.receipt.closedHighwater,2);
  const late=press(off.ledger,'DOWN',2,4700);
  assert.equal(late.effect.type,'NONE');assert.equal(late.receipt.code,'ALREADY_CLOSED');
});
test('an incomplete recovery high-water is refused without closing the actual holder or pending contact',()=>{
  const a=press(start(),'DOWN',1,4500),b=press(a.ledger,'DOWN',2,4600);
  const incomplete=recover(b.ledger,4700,{throughSequence:1});
  assert.equal(incomplete.receipt.code,'STALE_RECOVERY');assert.equal(incomplete.receipt.closedHighwater,null);
  assert.equal(incomplete.effect.type,'NONE');assert.equal(incomplete.ledger.holderSequence,1);
  assert.equal(incomplete.ledger.gestures['2'].state,'PENDING');
  assert.equal(incomplete.ledger.recoveryRevision,b.ledger.recoveryRevision);
});
test('a delayed recovery cursor cannot release a newer gesture; same-ID recovery retry remains harmless',()=>{
  const a=press(start(),'DOWN',1,4500),off=recover(a.ledger,4600),oldRevision=projectHoldRecovery(off.ledger).recoveryRevision;
  const b=press(off.ledger,'DOWN',2,4700),upB=press(b.ledger,'UP',2,4800),d3=press(upB.ledger,'DOWN',3,4900);
  const stale=recover(d3.ledger,5000,{commandId:'delayed-recover',recoveryRevision:oldRevision,throughSequence:3});
  assert.equal(stale.receipt.code,'STALE_RECOVERY');assert.equal(stale.effect.type,'NONE');assert.equal(stale.ledger.holderSequence,3);
  const replay=recover(d3.ledger,5100,{recoveryRevision:1,throughSequence:1});
  assert.equal(replay.replayed,true);assert.deepEqual(replay.receipt,off.receipt);
  assert.equal(replay.effect.type,'NONE');assert.equal(replay.ledger.holderSequence,3);
});
test('recovery revision excludes clock-only boundaries and private refusals',()=>{
  const initial=start(),waiting=advancePendingHold(initial,context({receivedAt:4500,canAcquire:false}));
  assert.equal(waiting.ledger.recoveryRevision,0);
  const failed=press(waiting.ledger,'DOWN',1,4600,{crateId:'wrong-crate'});
  assert.equal(failed.receipt.code,'CRATE_MISMATCH');assert.equal(failed.ledger.recoveryRevision,0);
  assert.equal(failed.ledger.highestSequence,0);
  const held=press(failed.ledger,'DOWN',1,4700,{commandId:'valid-down'});
  const rejected=press(held.ledger,'UP',1,4800,{expectedRevision:2},{currentRevision:1});
  assert.equal(rejected.receipt.code,'FUTURE_REVISION');assert.equal(rejected.ledger.recoveryRevision,held.ledger.recoveryRevision);
});
test('a conflicting recovery fingerprint cannot overwrite its receipt or release a later holder',()=>{
  const a=press(start(),'DOWN',1,4500),off=recover(a.ledger,4600),b=press(off.ledger,'DOWN',2,4700);
  const conflict=recover(b.ledger,4800,{throughSequence:2});
  assert.equal(conflict.receipt.code,'COMMAND_ID_CONFLICT');assert.equal(conflict.effect.type,'NONE');
  assert.equal(conflict.ledger.holderSequence,2);assert.deepEqual(conflict.ledger.receipts['recover-off'].receipt,off.receipt);
  assert.equal(b.receipt.closedHighwater,null,'An acquired contact is not an all-contacts closure');
});
test('recovery validates Task/session/control/death/ended/future guards and never invents a release on time alone',()=>{
  const d=press(start(),'DOWN',1,4500);
  for(const authority of [{active:false},{alive:false},{control:'PANEL'},{authenticatedSeatId:'seat-2'},{controlSessionId:'other-session'}]){
    const refused=recover(d.ledger,4600,{},authority);
    assert.equal(refused.receipt.status,'rejected');assert.equal(refused.effect.type,'NONE');assert.equal(refused.ledger.holderSequence,1);
  }
  const future=recover(d.ledger,4600,{expectedRevision:1});
  assert.equal(future.receipt.code,'FUTURE_REVISION');assert.equal(future.effect.type,'NONE');
  const clockOnly=advancePendingHold(d.ledger,context({receivedAt:30000}));
  assert.equal(clockOnly.effect.type,'NONE');assert.equal(clockOnly.ledger.holderSequence,1);
});
