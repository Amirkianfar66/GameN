// Adapter fault boundaries only. Genuine Firestore arbitration is tested
// separately; this double does not claim to reproduce emulator lock behavior.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {PlanetAtomicCreateConflict} from '../dist/planet-persistence-errors.js';

const CHUNK_BYTES=48*1024;
const hash=value=>createHash('sha256').update(value).digest('hex');
const sdkError=code=>Object.assign(new Error(`Synthetic SDK status ${code}`),{code,details:`Synthetic SDK status ${code}`});
const fail=error=>({error});

function fixture(){
  const documents=new Map(),calls=[];let active=null,handler=()=>undefined;
  const head=key=>'planetDocuments/'+hash(key),part=(key,index)=>'planetChunks/'+hash(key)+'-'+index;
  const event=(kind,path)=>handler({kind,path,attempt:active?.number,call:active?.call,trace:active});
  function seed(key,value){
    const bytes=Buffer.from(JSON.stringify(value)),chunks=Math.ceil(bytes.length/CHUNK_BYTES);
    documents.set(head(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,deadlineDueAt:null,digest:hash(bytes)});
    for(let index=0;index<chunks;index++)documents.set(part(key,index),{data:bytes.subarray(index*CHUNK_BYTES,(index+1)*CHUNK_BYTES).toString('base64')});
  }
  function bytes(key){
    const metadata=documents.get(head(key));if(!metadata)return null;
    return Buffer.concat(Array.from({length:metadata.chunks},(_,index)=>Buffer.from(documents.get(part(key,index)).data,'base64')));
  }
  function value(key){const encoded=bytes(key);return encoded===null?null:JSON.parse(encoded.toString('utf8'));}
  function snapshot(image,ref){
    const data=image.get(ref.path);
    return {exists:data!==undefined,data:()=>structuredClone(data),get:name=>data?.[name]};
  }
  const db={
    collection:name=>({doc:id=>{const path=name+'/'+id,fault=event('reference',path);if(fault)throw fault.error;return {path};}}),
    async runTransaction(operation,options){
      const call={arity:arguments.length,options,attempts:[]};calls.push(call);
      const max=options?.readOnly?1:5;
      for(let number=1;number<=max;number++){
        const image=new Map(structuredClone([...documents])),operations=[];
        const trace={number,call:calls.length,reads:[],sdkWrites:[],callbackReturned:false,commitStarted:false,commitApplied:false,error:null};
        call.attempts.push(trace);active=trace;
        const read=(kind,refs)=>{
          trace.reads.push({kind,paths:refs.map(ref=>ref.path)});
          const fault=event(kind,refs[0]?.path);
          if(fault){if(fault.sync)throw fault.error;return Promise.reject(fault.error);}
          const snapshots=refs.map(ref=>snapshot(image,ref));return Promise.resolve(kind==='get'?snapshots[0]:snapshots);
        };
        const write=(kind,ref,data)=>{
          trace.sdkWrites.push({kind,path:ref.path});
          const fault=event(kind,ref.path);if(fault)throw fault.error;
          operations.push({kind,path:ref.path,data:structuredClone(data)});
        };
        const tx={get:ref=>read('get',[ref]),getAll:(...refs)=>read('getAll',refs),
          create:(ref,data)=>write('create',ref,data),set:(ref,data)=>write('set',ref,data),delete:ref=>write('delete',ref)};
        const commit=()=>{
          // All create preconditions are checked before any durable mutation.
          // A failed chunk precondition must not leak its metadata/other rows.
          for(const op of operations)if(op.kind==='create'&&documents.has(op.path))throw sdkError(6);
          for(const op of operations){if(op.kind==='delete')documents.delete(op.path);else documents.set(op.path,structuredClone(op.data));}
          trace.commitApplied=true;
        };
        try{
          const result=await operation(tx);trace.callbackReturned=true;
          if(options?.readOnly){assert.equal(operations.length,0);return result;}
          trace.commitStarted=true;const fault=event('commit');
          if(fault){if(fault.commitBeforeError)commit();throw fault.error;}
          commit();return result;
        }catch(error){
          trace.error=error;
          if(options?.readOnly||![10,14].includes(error?.code)||number===max)throw error;
        }finally{active=null;}
      }
      assert.fail('Stock SDK attempt budget exhausted without a result');
    },
  };
  return {store:createFirestorePlanetStore(db),documents,calls,head,part,seed,bytes,value,onEvent:next=>{handler=next;}};
}

function defaultInvocation(h,attempts){
  assert.equal(h.calls.length,1,'the adapter invokes the SDK transaction runner once');
  assert.equal(h.calls[0].arity,1);assert.equal(h.calls[0].options,undefined,'stock retry defaults are unchanged');
  assert.equal(h.calls[0].attempts.length,attempts);
}
function typedConflict(error,original){
  assert.ok(error instanceof PlanetAtomicCreateConflict);assert.equal(error.name,'PlanetAtomicCreateConflict');
  assert.equal(error.message,'Atomic authority create conflict.');assert.equal(error.cause,original);
  assert.notEqual(error,original);assert.equal(error.code,undefined);return true;
}

test('create-only lease and wake flush atomically without prefix/old-metadata reads and preserve original bytes',async()=>{
  const h=fixture(),lease={owner:'first-owner',expiresAt:8000,throughSequence:7,wakeTaskId:'first-wake'},
    wake={status:'pending',nextAttemptAt:8000,nested:[[1,2],[3]]},originalLease=structuredClone(lease),originalWake=structuredClone(wake);
  const result=await h.store.transaction(async tx=>{
    assert.equal(typeof tx.create,'function');tx.create('foodPrefixWorker/probe',lease);tx.create('deadline/probe',wake);
    lease.owner='caller-mutation';wake.nested[0][0]=99;
    const own=await tx.get('foodPrefixWorker/probe');own.owner='returned-mutation';
    assert.deepEqual(await tx.get('foodPrefixWorker/probe'),originalLease);
    return await tx.get('deadline/probe');
  });
  assert.deepEqual(result,originalWake);assert.deepEqual(h.value('foodPrefixWorker/probe'),originalLease);
  assert.deepEqual(h.value('deadline/probe'),originalWake);defaultInvocation(h,1);
  const trace=h.calls[0].attempts[0];assert.equal(trace.reads.length,0);assert.equal(trace.sdkWrites.length,4);
  assert.ok(trace.sdkWrites.every(write=>write.kind==='create'));assert.equal(trace.commitApplied,true);
  assert.ok(h.bytes('foodPrefixWorker/probe').equals(Buffer.from(JSON.stringify(originalLease))));
  assert.deepEqual(h.documents.get(h.head('deadline/probe')),{key:'deadline/probe',namespace:'deadline',schemaVersion:1,chunks:1,
    deadlineDueAt:8000,digest:hash(Buffer.from(JSON.stringify(originalWake)))});
});

test('created multi-chunk authority has create preconditions on every fragment and round-trips exact JSON bytes',async()=>{
  const h=fixture(),key='create/multichunk',value={nested:[[1],[2]],large:'x'.repeat(110_000)},original=Buffer.from(JSON.stringify(value));
  await h.store.transaction(async tx=>tx.create(key,value));defaultInvocation(h,1);
  assert.equal(h.calls[0].attempts[0].reads.length,0);assert.equal(h.documents.get(h.head(key)).chunks,3);
  assert.deepEqual(h.calls[0].attempts[0].sdkWrites.map(write=>write.path),[h.head(key),h.part(key,0),h.part(key,1),h.part(key,2)]);
  assert.ok(h.calls[0].attempts[0].sdkWrites.every(write=>write.kind==='create'));
  assert.ok(h.bytes(key).equals(original));assert.deepEqual(h.value(key),value);
});

test('create null is JSON authority rather than the existing set/delete sentinel',async()=>{
  const h=fixture(),key='create/null';await h.store.transaction(async tx=>{tx.create(key,null);assert.equal(await tx.get(key),null);});
  defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].reads.length,0);
  assert.equal(h.documents.has(h.head(key)),true);assert.equal(h.documents.get(h.head(key)).chunks,1);
  assert.equal(h.bytes(key).toString('utf8'),'null');assert.equal(h.calls[0].attempts[0].sdkWrites.length,2);
});

test('first eligible create-only Commit6 becomes the fixed internal conflict with original cause',async()=>{
  const h=fixture(),original=sdkError(6);h.onEvent(e=>e.kind==='commit'?fail(original):undefined);
  await assert.rejects(h.store.transaction(async tx=>{tx.create('lease/first',{owner:'one'});tx.create('wake/first',{owner:'one'});}),
    error=>typedConflict(error,original));defaultInvocation(h,1);
  const trace=h.calls[0].attempts[0];assert.equal(trace.callbackReturned,true);assert.equal(trace.commitStarted,true);
  assert.equal(trace.commitApplied,false);assert.equal(trace.sdkWrites.length,4);assert.equal(h.documents.size,0);
});

test('an existing fragment rejects all creates atomically, leaving no new metadata or sibling wake',async()=>{
  const h=fixture(),key='create/orphan',orphan={data:Buffer.from('original-orphan').toString('base64')};h.documents.set(h.part(key,0),orphan);
  await assert.rejects(h.store.transaction(async tx=>{tx.create(key,{owner:'new'});tx.create('wake/orphan',{owner:'new'});}),error=>{
    const original=h.calls[0].attempts[0].error;assert.equal(original.code,6);return typedConflict(error,original);
  });defaultInvocation(h,1);assert.equal(h.documents.size,1);assert.deepEqual(h.documents.get(h.part(key,0)),orphan);
});

test('buffered create overrides a cached missing read and returns independent clones without another SDK read',async()=>{
  const h=fixture(),key='create/after-read';
  await h.store.transaction(async tx=>{
    assert.equal(await tx.get(key),null);tx.create(key,{nested:[1]});
    const value=await tx.get(key);value.nested.push(2);assert.deepEqual(await tx.get(key),{nested:[1]});
  });defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].reads.length,1);assert.deepEqual(h.value(key),{nested:[1]});
});

for(const [label,operation] of [
  ['duplicate create',tx=>{tx.create('same',{value:1});tx.create('same',{value:2});}],
  ['create then set',tx=>{tx.create('same',{value:1});tx.set('same',{value:2});}],
  ['create then delete',tx=>{tx.create('same',{value:1});tx.delete('same');}],
  ['set then create',tx=>{tx.set('same',{value:1});tx.create('same',{value:2});}],
  ['delete then create',tx=>{tx.delete('same');tx.create('same',{value:2});}],
])test(`${label} cannot silently replace the create precondition`,async()=>{
  const h=fixture();await assert.rejects(h.store.transaction(async tx=>operation(tx)),/Conflicting buffered authority create/);
  defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.documents.size,0);
});

test('undefined create fails before reads or SDK writes',async()=>{
  const h=fixture();await assert.rejects(h.store.transaction(async tx=>tx.create('undefined',undefined)),/Undefined authority/);
  defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].reads.length,0);assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);
});

test('callback code6 after a buffered create is propagated unchanged',async()=>{
  const h=fixture(),original=sdkError(6);
  await assert.rejects(h.store.transaction(async tx=>{tx.create('callback/six',{value:1});throw original;}),error=>error===original);
  defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.documents.size,0);
});

for(const kind of ['get','getAll'])test(`SDK ${kind} code6 before create flush is propagated unchanged`,async()=>{
  const h=fixture(),original=sdkError(6);h.seed('read/six',{value:1});h.onEvent(e=>e.kind===kind?fail(original):undefined);
  await assert.rejects(h.store.transaction(async tx=>{tx.create('read/new',{value:2});await tx.get('read/six');}),error=>error===original);
  defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.value('read/new'),null);
});

for(const fragment of [false,true])test(`synchronous raw create code6 at ${fragment?'fragment':'metadata'} remains original`,async()=>{
  const h=fixture(),key='raw/six',original=sdkError(6);h.onEvent(e=>e.kind==='create'&&e.path===(fragment?h.part(key,0):h.head(key))?fail(original):undefined);
  await assert.rejects(h.store.transaction(async tx=>tx.create(key,{value:1})),error=>error===original);
  defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].callbackReturned,false);assert.equal(h.calls[0].attempts[0].commitStarted,false);assert.equal(h.documents.size,0);
});

for(const [label,original] of [['string code',Object.assign(new Error('six'),{code:'6'})],['plain object',{code:6,details:'six'}]])
test(`Commit ${label} is not an internal atomic-create conflict`,async()=>{
  const h=fixture();h.onEvent(e=>e.kind==='commit'?fail(original):undefined);
  await assert.rejects(h.store.transaction(async tx=>tx.create('strict/six',{value:1})),error=>error===original);defaultInvocation(h,1);
});

test('mixed create and ordinary set Commit6 remains original with no partial update',async()=>{
  const h=fixture(),original=sdkError(6);h.seed('mixed/existing',{value:'old'});h.onEvent(e=>e.kind==='commit'?fail(original):undefined);
  await assert.rejects(h.store.transaction(async tx=>{tx.create('mixed/new',{value:'new'});tx.set('mixed/existing',{value:'changed'});}),error=>error===original);
  defaultInvocation(h,1);assert.deepEqual(h.value('mixed/existing'),{value:'old'});assert.equal(h.value('mixed/new'),null);
});

test('applied Commit14 then create precondition6 remains raw, without duplicate application or orphan wake',async()=>{
  const h=fixture(),prior=sdkError(14);h.onEvent(e=>e.attempt===1&&e.kind==='commit'?{error:prior,commitBeforeError:true}:undefined);
  await assert.rejects(h.store.transaction(async tx=>{tx.create('ambiguous/lease',{owner:'same'});tx.create('ambiguous/wake',{owner:'same'});}),error=>{
    assert.equal(error,h.calls[0].attempts[1].error);assert.equal(error.code,6);assert.equal(error instanceof PlanetAtomicCreateConflict,false);return true;
  });defaultInvocation(h,2);assert.equal(h.calls[0].attempts[0].error,prior);
  assert.equal(h.calls[0].attempts.filter(attempt=>attempt.commitApplied).length,1);assert.equal(h.documents.size,4);
  assert.deepEqual(h.value('ambiguous/lease'),{owner:'same'});assert.deepEqual(h.value('ambiguous/wake'),{owner:'same'});
});

for(const first of ['empty Commit14','known-aborted Commit10','raw set10','raw delete10','raw create10'])
test(`${first} disables later create-only Commit6 classification for the entire SDK invocation`,async()=>{
  const h=fixture(),prior=sdkError(first.includes('14')?14:10),conflict=sdkError(6);let callbacks=0;
  h.onEvent(e=>{
    if(e.attempt===2&&e.kind==='commit')return fail(conflict);
    if(e.attempt===1&&(first==='raw set10'?e.kind==='set':first==='raw delete10'?e.kind==='delete':first==='raw create10'?e.kind==='create':e.kind==='commit'))return fail(prior);
  });
  await assert.rejects(h.store.transaction(async tx=>{
    callbacks++;
    if(callbacks===1){
      if(first==='empty Commit14')return;
      if(first==='raw set10')tx.set('prior/ordinary',{value:1});
      else if(first==='raw delete10')tx.delete('prior/ordinary');
      else tx.create('prior/create',{value:1});
    }else tx.create('later/create',{value:2});
  }),error=>error===conflict);defaultInvocation(h,2);assert.equal(callbacks,2);
  assert.equal(h.calls[0].attempts[0].error,prior);assert.equal(h.documents.size,0);
  if(first==='empty Commit14'){assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.calls[0].attempts[0].commitStarted,true);}
});

test('a read-only earlier aborted callback does not falsely mark a possible Commit before first create-only conflict',async()=>{
  const h=fixture(),closed=Object.assign(new Error('closed'),{code:3,details:'Transaction is invalid or closed.'}),conflict=sdkError(6);
  h.onEvent(e=>e.attempt===1&&e.kind==='get'?fail(closed):e.attempt===2&&e.kind==='commit'?fail(conflict):undefined);
  await assert.rejects(h.store.transaction(async tx=>{await tx.get('precommit/read');tx.create('precommit/new',{value:1});}),error=>typedConflict(error,conflict));
  defaultInvocation(h,2);assert.equal(h.calls[0].attempts[0].error.code,10);assert.equal(h.calls[0].attempts[0].error.cause,closed);
  assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.calls[0].attempts[0].commitStarted,false);
});

test('create accepts the maximum 80 fragments without old metadata reads',async()=>{
  const h=fixture(),value='x'.repeat(80*CHUNK_BYTES-2);await h.store.transaction(async tx=>tx.create('bounds/eighty',value));
  defaultInvocation(h,1);assert.equal(h.documents.get(h.head('bounds/eighty')).chunks,80);
  assert.equal(h.calls[0].attempts[0].sdkWrites.length,81);assert.equal(h.calls[0].attempts[0].reads.length,0);
  assert.equal(h.value('bounds/eighty'),value);
});

for(const limit of ['per-row fragments','transaction bytes','transaction writes'])test(`create respects the existing ${limit} bound before any SDK write`,async()=>{
  const h=fixture();await assert.rejects(h.store.transaction(async tx=>{
    if(limit==='per-row fragments')tx.create('bounds/too-large','x'.repeat(80*CHUNK_BYTES));
    else if(limit==='transaction bytes'){
      tx.create('bounds/bytes-a','x'.repeat(80*CHUNK_BYTES-2));tx.create('bounds/bytes-b','x'.repeat(50*CHUNK_BYTES-2));
    }else for(let index=0;index<226;index++)tx.create('bounds/writes-'+index,{index});
  }),limit==='per-row fragments'?/Authority payload budget exceeded/:/Transaction budget exceeded/);
  defaultInvocation(h,1);assert.equal(h.calls[0].attempts[0].reads.length,0);assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.documents.size,0);
});

test('ordinary set/delete still share their historical last-buffered-operation semantics',async()=>{
  const h=fixture();h.seed('ordinary/delete',{value:'old'});
  await h.store.transaction(async tx=>{tx.set('ordinary/value',{value:1});tx.set('ordinary/value',{value:2});tx.delete('ordinary/delete');});
  defaultInvocation(h,1);assert.deepEqual(h.value('ordinary/value'),{value:2});assert.equal(h.value('ordinary/delete'),null);
  assert.equal(h.calls[0].attempts[0].sdkWrites.some(write=>write.kind==='create'),false);
});
