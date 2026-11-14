// The SDK double tests adapter boundaries and the single existing five-attempt
// SDK invocation; genuine Firestore validation is separate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {createFirestorePlanetStore} from '../dist/planet-store.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const closed=()=>Object.assign(new Error('3 INVALID_ARGUMENT: Transaction is invalid or closed.'),
  {code:3,details:'Transaction is invalid or closed.'});
const sdkError=code=>Object.assign(new Error(`SDK status ${code}`),{code,details:`SDK status ${code}`});
const fail=error=>({error});

function fixture(){
  const documents=new Map(),calls=[];let active=null,handler=()=>undefined;
  const head=key=>'planetDocuments/'+hash(key),part=(key,index)=>'planetChunks/'+hash(key)+'-'+index;
  const event=(kind,path)=>handler({kind,path,attempt:active?.number,call:active?.call,trace:active});
  function seed(key,value){
    const bytes=Buffer.from(JSON.stringify(value)),chunks=Math.ceil(bytes.length/(48*1024));
    documents.set(head(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,digest:hash(bytes)});
    for(let index=0;index<chunks;index++)documents.set(part(key,index),{data:bytes.subarray(index*48*1024,(index+1)*48*1024).toString('base64')});
  }
  function value(key){
    const metadata=documents.get(head(key));if(!metadata)return null;
    const bytes=Buffer.concat(Array.from({length:metadata.chunks},(_,index)=>Buffer.from(documents.get(part(key,index)).data,'base64')));
    return JSON.parse(bytes.toString('utf8'));
  }
  function snapshot(image,ref){
    const data=image.get(ref.path);
    return {exists:data!==undefined,
      data(){const fault=event('snapshot-data',ref.path);if(fault)throw fault.error;return structuredClone(data);},
      get(name){const fault=event('fragment-data',ref.path);if(fault)throw fault.error;return data?.[name];}};
  }
  const db={
    collection:name=>({doc:id=>{const path=name+'/'+id,fault=event('reference',path);if(fault)throw fault.error;return {path};}}),
    async runTransaction(operation,options){
      const call={arity:arguments.length,options,attempts:[]};calls.push(call);
      const max=options?.readOnly?1:5;
      for(let number=1;number<=max;number++){
        const image=new Map(structuredClone([...documents])),writePaths=new Set();
        const trace={number,call:calls.length,reads:[],sdkWrites:[],callbackReturned:false,commitStarted:false,committed:false,error:null};
        call.attempts.push(trace);active=trace;
        const read=(kind,refs)=>{
          trace.reads.push({kind,paths:refs.map(ref=>ref.path)});
          const fault=event(kind,refs[0]?.path);
          if(fault){if(fault.sync)throw fault.error;return Promise.reject(fault.error);}
          const results=refs.map(ref=>snapshot(image,ref));return Promise.resolve(kind==='get'?results[0]:results);
        };
        const tx={get:ref=>read('get',[ref]),getAll:(...refs)=>read('getAll',refs),
          set(ref,data){trace.sdkWrites.push({kind:'set',path:ref.path});const fault=event('set',ref.path);if(fault)throw fault.error;
            writePaths.add(ref.path);image.set(ref.path,structuredClone(data));},
          delete(ref){trace.sdkWrites.push({kind:'delete',path:ref.path});const fault=event('delete',ref.path);if(fault)throw fault.error;
            writePaths.add(ref.path);image.delete(ref.path);}};
        const commit=()=>{for(const path of writePaths){if(image.has(path))documents.set(path,image.get(path));else documents.delete(path);}trace.committed=true;};
        try{
          const result=await operation(tx);trace.callbackReturned=true;
          if(options?.readOnly){assert.equal(trace.sdkWrites.length,0);return result;}
          trace.commitStarted=true;const fault=event('commit');
          if(fault){if(fault.commitBeforeError)commit();throw fault.error;}
          commit();return result;
        }catch(error){
          trace.error=error;
          if(options?.readOnly||![10,14].includes(error?.code)||number===max)throw error;
        }finally{active=null;}
      }
      assert.fail('SDK attempt bound exhausted without a result');
    },
  };
  return {store:createFirestorePlanetStore(db),documents,calls,head,part,seed,value,onEvent:next=>{handler=next;}};
}

function defaultInvocation(h,attempts){
  assert.equal(h.calls.length,1,'the adapter never resubmits runTransaction');
  assert.equal(h.calls[0].arity,1);assert.equal(h.calls[0].options,undefined,'SDK retry defaults remain unconfigured');
  assert.equal(h.calls[0].attempts.length,attempts);
}
function normalized(error,original){
  assert.notEqual(error,original);assert.ok(error instanceof Error);assert.equal(error.code,10);assert.equal(error.cause,original);
  assert.equal(original.code,3);assert.equal(original.details,'Transaction is invalid or closed.');
}

for(const kind of ['get','getAll'])test(`first-attempt RW ${kind} closed rejection retries a fresh snapshot before any SDK write`,async()=>{
  const h=fixture(),key='session/read-race',original=closed(),first={version:1,large:'a'.repeat(70_000)},second={version:2,large:'b'.repeat(70_000)};
  h.seed(key,first);h.onEvent(e=>{
    if(e.attempt===1&&e.kind===kind){h.seed(key,second);return fail(original);}
  });
  let callbacks=0;const result=await h.store.transaction(async tx=>{callbacks++;const seen=await tx.get(key);tx.set('result/read-race',{version:seen.version});return seen;});
  assert.deepEqual(result,second);assert.deepEqual(h.value('result/read-race'),{version:2});defaultInvocation(h,2);assert.equal(callbacks,2);
  const [a,b]=h.calls[0].attempts;normalized(a.error,original);assert.equal(a.sdkWrites.length,0);assert.equal(a.commitStarted,false);
  assert.equal(b.committed,true);assert.equal(h.calls[0].attempts.filter(a=>a.committed).length,1);
});

test('old-metadata read after private buffered tx.set remains eligible before raw SDK flush',async()=>{
  const h=fixture(),key='created/buffered',original=closed();let callbacks=0;
  h.onEvent(e=>e.attempt===1&&e.kind==='get'&&e.path===h.head(key)?fail(original):undefined);
  await h.store.transaction(async tx=>{callbacks++;tx.set(key,{nested:[[1],[2]]});});
  defaultInvocation(h,2);assert.equal(callbacks,2);assert.deepEqual(h.value(key),{nested:[[1],[2]]});
  const first=h.calls[0].attempts[0];normalized(first.error,original);assert.equal(first.sdkWrites.length,0);assert.equal(first.commitStarted,false);
});

for(const kind of ['get','getAll'])test(`read-only ${kind} retains the original closed error and its one-attempt policy`,async()=>{
  const h=fixture(),original=closed();h.seed('read-only',{large:'x'.repeat(70_000)});h.onEvent(e=>e.kind===kind?fail(original):undefined);
  await assert.rejects(h.store.readOnly(tx=>tx.get('read-only')),error=>error===original);
  assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0].options,{readOnly:true});assert.equal(h.calls[0].attempts.length,1);
  assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.calls[0].attempts[0].commitStarted,false);
});

for(const [name,error] of [
  ['other details',Object.assign(closed(),{details:'Invalid document path.'})],
  ['message only',Object.assign(new Error('Transaction is invalid or closed.'),{code:3})],
  ['string code',Object.assign(closed(),{code:'3'})],
  ['plain status object',{code:3,details:'Transaction is invalid or closed.'}],
])test(`RW ${name} is not normalized`,async()=>{
  const h=fixture();h.onEvent(e=>e.kind==='get'?fail(error):undefined);
  await assert.rejects(h.store.transaction(tx=>tx.get('unrelated')),actual=>actual===error);defaultInvocation(h,1);
});

for(const kind of ['get','getAll'])test(`a synchronous SDK ${kind} throw is outside rejected-read normalization`,async()=>{
  const h=fixture(),original=closed();h.seed('sync',{value:1});h.onEvent(e=>e.kind===kind?{error:original,sync:true}:undefined);
  await assert.rejects(h.store.transaction(tx=>tx.get('sync')),error=>error===original);defaultInvocation(h,1);
});

test('document-reference construction errors remain outside the SDK read boundary',async()=>{
  const h=fixture(),original=closed(),key='sync-reference';h.seed(key,{value:1});
  h.onEvent(e=>e.kind==='reference'&&e.path===h.part(key,0)?fail(original):undefined);
  await assert.rejects(h.store.transaction(tx=>tx.get(key)),error=>error===original);defaultInvocation(h,1);
  assert.equal(h.calls[0].attempts[0].reads.filter(r=>r.kind==='getAll').length,0);
});

test('an exact-looking callback error after buffering a write is propagated unchanged',async()=>{
  const h=fixture(),original=closed();
  await assert.rejects(h.store.transaction(async tx=>{tx.set('buffered',{value:1});throw original;}),error=>error===original);
  defaultInvocation(h,1);assert.equal(h.value('buffered'),null);assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);
});

for(const kind of ['snapshot-data','fragment-data'])test(`${kind} decoding errors are not SDK read rejections`,async()=>{
  const h=fixture(),original=closed();h.seed('decode',{value:1});h.onEvent(e=>e.kind===kind?fail(original):undefined);
  await assert.rejects(h.store.transaction(tx=>tx.get('decode')),error=>error===original);defaultInvocation(h,1);
});

test('digest integrity failures remain terminal without a retry wrapper',async()=>{
  const h=fixture();h.seed('digest',{value:1});h.documents.get(h.head('digest')).digest='0'.repeat(64);
  await assert.rejects(h.store.transaction(tx=>tx.get('digest')),error=>{
    assert.match(error.message,/Private state digest mismatch/);assert.equal(error.code,undefined);assert.equal(error.cause,undefined);return true;
  });defaultInvocation(h,1);
});

test('a Commit code3 closed error is never reclassified or resubmitted',async()=>{
  const h=fixture(),original=closed();h.onEvent(e=>e.kind==='commit'?fail(original):undefined);
  await assert.rejects(h.store.transaction(async tx=>tx.set('commit-three',{value:1})),error=>error===original);defaultInvocation(h,1);
  assert.equal(h.calls[0].attempts[0].commitStarted,true);assert.equal(h.value('commit-three'),null);
});

for(const first of ['ambiguous writing Commit14','empty RW Commit14','known aborted Commit10','raw set10','raw delete10'])
test(`${first} permanently disables added classification in the invocation`,async()=>{
  const h=fixture(),key='counter',readError=closed(),prior=sdkError(first.includes('14')?14:10),empty=first==='empty RW Commit14';h.seed(key,{count:0});
  h.onEvent(e=>{
    if(e.attempt===2&&e.kind==='get')return fail(readError);
    if(e.attempt===1&&(first==='raw set10'?e.kind==='set':first==='raw delete10'?e.kind==='delete':e.kind==='commit'))
      return {error:prior,commitBeforeError:first==='ambiguous writing Commit14'};
  });
  let callbacks=0;
  await assert.rejects(h.store.transaction(async tx=>{
    callbacks++;const current=await tx.get(key);if(first==='raw delete10')tx.delete(key);else if(!empty)tx.set(key,{count:current.count+1});
  }),error=>error===readError);
  defaultInvocation(h,2);assert.equal(callbacks,2,'the original SDK retry runs, but no added third attempt follows read code3');
  assert.equal(h.calls[0].attempts[0].error,prior);assert.equal(h.calls[0].attempts[1].error,readError);
  assert.deepEqual(h.value(key),{count:first==='ambiguous writing Commit14'?1:0},'ambiguous committed write cannot be applied twice');
  if(empty){assert.equal(h.calls[0].attempts[0].sdkWrites.length,0);assert.equal(h.calls[0].attempts[0].commitStarted,true);}
});

test('repeated eligible closed reads exhaust exactly one unchanged SDK five-attempt budget',async()=>{
  const h=fixture(),errors=Array.from({length:5},closed);let callbacks=0;
  h.onEvent(e=>e.kind==='get'?fail(errors[e.attempt-1]):undefined);
  await assert.rejects(h.store.transaction(async tx=>{callbacks++;return tx.get('exhausted');}),error=>{normalized(error,errors[4]);return true;});
  defaultInvocation(h,5);assert.equal(callbacks,5);
  for(const [index,attempt] of h.calls[0].attempts.entries()){normalized(attempt.error,errors[index]);assert.equal(attempt.sdkWrites.length,0);assert.equal(attempt.commitStarted,false);}
});

test('the phase latch is invocation-local rather than store-global',async()=>{
  const h=fixture(),original=closed();await h.store.transaction(async tx=>tx.set('scope',{count:1}));
  h.onEvent(e=>e.call===2&&e.attempt===1&&e.kind==='get'?fail(original):undefined);
  assert.deepEqual(await h.store.transaction(tx=>tx.get('scope')),{count:1});assert.equal(h.calls.length,2);
  assert.equal(h.calls[1].attempts.length,2);normalized(h.calls[1].attempts[0].error,original);
});
