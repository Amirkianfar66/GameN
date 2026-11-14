import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {createFirestorePlanetStore} from '../dist/planet-store.js';

const hash=v=>createHash('sha256').update(v).digest('hex');
function fixture(){
  const documents=new Map(),calls=[];
  let afterHead=null;
  const head=key=>'planetDocuments/'+hash(key),part=(key,n)=>'planetChunks/'+hash(key)+'-'+n;
  function seed(key,value){
    const bytes=Buffer.from(JSON.stringify(value)),chunks=Math.ceil(bytes.length/(48*1024));
    documents.set(head(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,digest:hash(bytes)});
    for(let n=0;n<chunks;n++)documents.set(part(key,n),{data:bytes.subarray(n*48*1024,(n+1)*48*1024).toString('base64')});
  }
  const snapshot=value=>({exists:value!==undefined,data:()=>structuredClone(value),get:name=>value?.[name]});
  const db={collection:name=>({doc:id=>({path:name+'/'+id})}),
    async runTransaction(operation,options){
      const image=new Map(structuredClone([...documents])),reads=[],writes=[];
      calls.push({options,reads,writes,arity:arguments.length});
      const tx={
        get:async ref=>{reads.push(ref.path);const result=snapshot(image.get(ref.path));
          if(afterHead&&ref.path.startsWith('planetDocuments/')){const f=afterHead;afterHead=null;f();}return result;},
        getAll:async(...refs)=>refs.map(ref=>{reads.push(ref.path);return snapshot(image.get(ref.path));}),
        set:(ref,value)=>{writes.push(ref.path);image.set(ref.path,structuredClone(value));},
        delete:ref=>{writes.push(ref.path);image.delete(ref.path);},
      };
      const result=await operation(tx);
      if(options?.readOnly)assert.equal(writes.length,0);
      else for(const path of writes){if(image.has(path))documents.set(path,image.get(path));else documents.delete(path);}
      return result;
    }};
  return {store:createFirestorePlanetStore(db),documents,calls,head,part,seed,afterHead:f=>{afterHead=f;}};
}
test('read-only JSON metadata and all chunks use one SDK snapshot with no stale-time selector or write surface',async()=>{
  const h=fixture(),key='session/read-only',value={nested:[[1,2],[3]],large:'x'.repeat(70_000)};h.seed(key,value);
  h.afterHead(()=>h.seed(key,{large:'changed after snapshot'}));
  await h.store.readOnly(async tx=>{
    assert.deepEqual(Object.keys(tx),['get']);assert.equal(Object.isFrozen(tx),true);
    const first=await tx.get(key);assert.deepEqual(first,value);first.nested[0][0]=99;
    assert.deepEqual(await tx.get(key),value,'cached reads are isolated clones');
    assert.equal(await tx.get('missing'),null);
  });
  assert.deepEqual(h.calls[0].options,{readOnly:true});
  assert.equal(h.calls[0].reads.filter(path=>path===h.head(key)).length,1);
  assert.ok(h.calls[0].reads.includes(h.part(key,0))&&h.calls[0].reads.includes(h.part(key,1)));
  assert.equal(h.calls[0].writes.length,0);
});
test('read-write transaction keeps its original SDK defaults, buffered writes and JSON encoding',async()=>{
  const h=fixture(),key='session/read-write';h.seed(key,{before:true});
  await h.store.transaction(async tx=>{
    assert.deepEqual(await tx.get(key),{before:true});tx.set(key,{after:[[1],[2]]});
    assert.deepEqual(await tx.get(key),{after:[[1],[2]]});
  });
  assert.equal(h.calls[0].arity,1);assert.equal(h.calls[0].options,undefined);
  assert.deepEqual(await h.store.readOnly(tx=>tx.get(key)),{after:[[1],[2]]});
  await assert.rejects(()=>h.store.transaction(async tx=>tx.set(key,undefined)),/Undefined authority/);
});
for(const [name,damage,message]of[
  ['envelope',h=>{h.documents.get(h.head('broken')).schemaVersion=9;},/Invalid private state envelope/],
  ['fragment',h=>{h.documents.delete(h.part('broken',0));},/Missing private state fragment/],
  ['digest',h=>{h.documents.get(h.head('broken')).digest='0'.repeat(64);},/Private state digest mismatch/],
])test(`both modes retain ${name} integrity checks`,async()=>{
  const h=fixture();h.seed('broken',{value:1});damage(h);
  await assert.rejects(()=>h.store.readOnly(tx=>tx.get('broken')),message);
  await assert.rejects(()=>h.store.transaction(tx=>tx.get('broken')),message);
});
