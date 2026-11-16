import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {FieldPath,FieldValue} from 'firebase-admin/firestore';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import type {PlanetPersistence,PlanetReadTransaction,PlanetTransaction} from './planet-game.js';
import {PlanetAtomicCreateConflict} from './planet-persistence-errors.js';
import {beginPlanetTiming,timePlanetStage} from './planet-request-timing.js';

const hash=(key:string)=>createHash('sha256').update(key).digest('hex');
const CHUNK_BYTES=48*1024;
const MAX_CHUNKS=80; // Below Firestore transaction/document limits; no truncation of accepted state.
const METADATA_BATCH_SIZE=64;
interface Metadata {key:string;namespace:string;chunks:number;digest:string;schemaVersion:1}
type SdkRead=<T>(read:()=>Promise<T>)=>Promise<T>;
const timedSdkRead:SdkRead=read=>timePlanetStage('sdkRead',read);

/** Server-only JSON chunks support nested stroke/round arrays without Firestore's nested-array restriction.
 * Writes are buffered until every authority read finishes. All chunks, metadata, journals and outbox
 * records commit in the same transaction. Clients cannot read these collections.
 */
export function createFirestorePlanetStore(db:Firestore):PlanetPersistence{
  const pending=(scopeKey:string)=>{
    if(!/^[0-9a-f]{64}$/.test(scopeKey))throw new Error('Invalid Food inbox scope key');
    return db.collection('planetFoodInboxes').doc(scopeKey).collection('pending');
  };
  const meta=(key:string)=>db.collection('planetDocuments').doc(hash(key));
  const chunk=(key:string,index:number)=>db.collection('planetChunks').doc(hash(key)+'-'+index);
  // Both modes use the same authenticated JSON envelope and the same SDK transaction
  // for metadata plus every chunk. Read-only mode supplies no write surface.
  const reader=(transaction:Pick<Transaction,'get'|'getAll'>,
    cached=new Map<string,unknown>(),metadata=new Map<string,Metadata|null>(),writes=new Map<string,unknown|null>(),
    readSdk:SdkRead=timedSdkRead)=>
    async<T>(key:string):Promise<T|null>=>{
      if(writes.has(key))return structuredClone(writes.get(key)) as T|null;
      if(cached.has(key))return structuredClone(cached.get(key)) as T|null;
      const headRef=meta(key);
      const head=await readSdk(()=>transaction.get(headRef));
      if(!head.exists){metadata.set(key,null);cached.set(key,null);return null;}
      const info=head.data() as Metadata;
      if(info.schemaVersion!==1||info.key!==key||!Number.isInteger(info.chunks)||info.chunks<1||info.chunks>MAX_CHUNKS)
        throw new Error('Invalid private state envelope');
      const fragmentRefs=Array.from({length:info.chunks},(_,i)=>chunk(key,i));
      const fragments=await readSdk(()=>transaction.getAll(...fragmentRefs));
      const bytes=Buffer.concat(fragments.map(part=>{
        const value=part.get('data');if(typeof value!=='string')throw new Error('Missing private state fragment');
        return Buffer.from(value,'base64');
      }));
      if(createHash('sha256').update(bytes).digest('hex')!==info.digest)throw new Error('Private state digest mismatch');
      const value:unknown=JSON.parse(bytes.toString('utf8'));metadata.set(key,info);cached.set(key,value);
      return structuredClone(value) as T;
    };
  return {
    watchPrivateKey(key,changed,failed){return meta(key).onSnapshot(()=>changed(),failed);},
    async nextFoodInboxIntent(scopeKey:string):Promise<string|null>{
      const result=await timePlanetStage('sdkRead',()=>pending(scopeKey)
        .orderBy('priorityAt').orderBy(FieldPath.documentId()).limit(1).get());
      return result.docs[0]?.id??null;
    },
    async readOnly<T>(operation:(tx:PlanetReadTransaction)=>Promise<T>):Promise<T>{
      return timePlanetStage('sdkReadOnly',()=>db.runTransaction(transaction=>
        timePlanetStage('sdkAttempt',()=>operation(Object.freeze({get:reader(transaction)}))),{readOnly:true}));
    },
    async transaction<T>(operation:(tx:PlanetTransaction)=>Promise<T>):Promise<T>{
      // Keep this boundary across SDK attempts, including empty commits. Once
      // crossed, no later read may enable an additional retry of this invocation.
      let sdkAttemptMayCommit=false;
      let createConflictEligible=false;
      const readBeforeCommit:SdkRead=read=>timedSdkRead(()=>{
        // Classify rejected reads only. A synchronous SDK throw has no retry proof.
        const pending=read();
        return pending.catch(error=>{
          if(!sdkAttemptMayCommit&&error instanceof Error
            &&'code' in error&&error.code===3&&'details' in error
            &&error.details==='Transaction is invalid or closed.'){
            // Only a rejected SDK read before any write/possible commit qualifies.
            // Preserve its cause and use the SDK's existing bounded ABORTED retry.
            throw Object.assign(new Error('Firestore transaction closed during a read before any SDK write or commit.',{cause:error}),{code:10});
          }
          throw error;
        });
      });
      const runAttempt=async (transaction:Transaction):Promise<T>=>{
        const earlierAttemptMayCommit=sdkAttemptMayCommit;
        createConflictEligible=false;
        const cached=new Map<string,unknown>(),metadata=new Map<string,Metadata|null>(),writes=new Map<string,unknown|null>();
        const creates=new Set<string>();
        const inboxWrites=new Map<string,{scopeKey:string;id:string;create:boolean}>();
        function writeInboxIndex(scopeKey:string,id:string,create:boolean){
          if(!/^[0-9a-f]{64}$/.test(id))throw new Error('Invalid Food inbox intent ID');
          const key=scopeKey+'/'+id;
          if(inboxWrites.has(key))throw new Error('Conflicting Food inbox pending index write');
          inboxWrites.set(key,{scopeKey,id,create});
        }
        const read=reader(transaction,cached,metadata,writes,readBeforeCommit);
        const tx:PlanetTransaction={get:read,foodInboxIndex:{
          create:(scopeKey,id)=>writeInboxIndex(scopeKey,id,true),
          delete:(scopeKey,id)=>writeInboxIndex(scopeKey,id,false),
        },
          set:(key,value)=>{
            if(creates.has(key))throw new Error('Conflicting buffered authority create');
            if(value===undefined)throw new Error('Undefined authority');writes.set(key,structuredClone(value));
          },
          delete:key=>{if(creates.has(key))throw new Error('Conflicting buffered authority create');writes.set(key,null);},
          create:(key,value)=>{
            if(writes.has(key))throw new Error('Conflicting buffered authority create');
            if(value===undefined)throw new Error('Undefined authority');
            writes.set(key,structuredClone(value));creates.add(key);
          }};
        const result=await operation(tx);
        // Read old chunk counts for every affected key before applying any write.
        // Creates use exists:false on every envelope document and need no old metadata.
        const unreadKeys=[...writes.keys()].filter(key=>!creates.has(key)&&!metadata.has(key));
        for(let offset=0;offset<unreadKeys.length;offset+=METADATA_BATCH_SIZE){
          const keys=unreadKeys.slice(offset,offset+METADATA_BATCH_SIZE);
          const refs=keys.map(meta);
          if(keys.length===1){
            const snapshot=await readBeforeCommit(()=>transaction.get(refs[0]!));
            metadata.set(keys[0]!,snapshot.exists?snapshot.data() as Metadata:null);
            continue;
          }
          // Map by reference, including missing documents, so each write keeps
          // its own old chunk count even if the returned snapshots are reordered.
          const keysByPath=new Map(refs.map((ref,index)=>[ref.path,keys[index]!]));
          const snapshots=await readBeforeCommit(()=>transaction.getAll(...refs));
          for(const snapshot of snapshots){
            const path=snapshot.ref.path,key=keysByPath.get(path);
            if(key===undefined)throw new Error('Unexpected private metadata snapshot');
            metadata.set(key,snapshot.exists?snapshot.data() as Metadata:null);
            keysByPath.delete(path);
          }
          if(keysByPath.size!==0)throw new Error('Missing private metadata snapshot');
        }
        let totalWrites=0,totalBytes=0;
        const prepared=[...writes].map(([key,value])=>{
          const create=creates.has(key);
          const bytes=value===null&&!create?null:Buffer.from(JSON.stringify(value),'utf8');
          const chunks=bytes===null?0:Math.ceil(bytes.length/CHUNK_BYTES);
          if(chunks>MAX_CHUNKS)throw new Error('Authority payload budget exceeded');
          totalBytes+=bytes?.length??0;totalWrites+=1+(create?chunks:Math.max(chunks,metadata.get(key)?.chunks??0));
          const deadlineDueAt=key.startsWith('deadline/')&&value!==null&&typeof value==='object'
            && 'status' in value&&value.status!=='complete'&&'nextAttemptAt' in value&&typeof value.nextAttemptAt==='number'
            ?value.nextAttemptAt:null;
          const inboxWakeMetadata=key.startsWith('foodInboxWake/')&&value!==null&&typeof value==='object'
            ?{foodInboxWakeDueAt:'status' in value&&value.status==='pending'&&'nextAttemptAt' in value&&typeof value.nextAttemptAt==='number'
              ?value.nextAttemptAt:null}:{};
          return {key,bytes,chunks,deadlineDueAt,inboxWakeMetadata,create};
        });
        if(totalWrites+inboxWrites.size>450||totalBytes>6*1024*1024)throw new Error('Transaction budget exceeded');
        for(const {key,bytes,chunks,deadlineDueAt,inboxWakeMetadata,create} of prepared){
          if(create&&bytes!==null){
            sdkAttemptMayCommit=true;
            transaction.create(meta(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,deadlineDueAt,...inboxWakeMetadata,digest:createHash('sha256').update(bytes).digest('hex')});
            for(let i=0;i<chunks;i++){
              sdkAttemptMayCommit=true;
              transaction.create(chunk(key,i),{data:bytes.subarray(i*CHUNK_BYTES,(i+1)*CHUNK_BYTES).toString('base64')});
            }
            continue;
          }
          sdkAttemptMayCommit=true;
          const previous=metadata.get(key)?.chunks??0;
          if(bytes===null)transaction.delete(meta(key));
          else{
            transaction.set(meta(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,deadlineDueAt,...inboxWakeMetadata,digest:createHash('sha256').update(bytes).digest('hex')});
            for(let i=0;i<chunks;i++)transaction.set(chunk(key,i),{data:bytes.subarray(i*CHUNK_BYTES,(i+1)*CHUNK_BYTES).toString('base64')});
          }
          for(let i=chunks;i<previous;i++)transaction.delete(chunk(key,i));
        }
        for(const {scopeKey,id,create} of inboxWrites.values()){
          const reference=pending(scopeKey).doc(id);
          sdkAttemptMayCommit=true;
          if(create)transaction.create(reference,{priorityAt:FieldValue.serverTimestamp()});
          else transaction.delete(reference);
        }
        sdkAttemptMayCommit=true;
        // Only a fully returned create-only attempt can classify a later Commit
        // rejection. Any prior possible Commit permanently excludes this outcome.
        createConflictEligible=!earlierAttemptMayCommit
          &&writes.size+inboxWrites.size>0&&creates.size===writes.size
          &&[...inboxWrites.values()].every(write=>write.create);
        return result;
      };
      const end=beginPlanetTiming('sdkReadWrite');
      let endRetryGap:(()=>void)|undefined,endCommitAck:(()=>void)|undefined,endCommitFailure:(()=>void)|undefined;
      const observeAttempt=async (transaction:Transaction):Promise<T>=>{
        endRetryGap?.();endRetryGap=undefined;endCommitAck=undefined;endCommitFailure=undefined;
        const endAttempt=beginPlanetTiming('sdkAttempt');
        let completed=false;
        try{const value=await runAttempt(transaction);completed=true;return value;}
        finally{
          endAttempt?.();
          // End the gap only if the SDK starts another callback. A successful
          // final callback's tail measures the SDK promise settlement interval.
          endRetryGap=beginPlanetTiming('sdkRetryGap');
          if(completed){
            endCommitAck=beginPlanetTiming('sdkCommitAck');
            endCommitFailure=beginPlanetTiming('sdkCommitFailure');
          }
        }
      };
      try{
        const result=await db.runTransaction(end?observeAttempt:runAttempt);
        endCommitAck?.();
        return result;
      }catch(error){
        endCommitFailure?.();
        if(createConflictEligible&&error instanceof Error&&'code' in error&&error.code===6)
          throw new PlanetAtomicCreateConflict(error);
        throw error;
      }finally{end?.();}
    },
    async listKeys(namespace:string,limit:number):Promise<string[]>{
      const collection=db.collection('planetDocuments');
      const dueField=namespace==='deadline'?'deadlineDueAt':namespace==='foodInboxWake'?'foodInboxWakeDueAt':null;
      const query=dueField?collection.where(dueField,'>=',0).orderBy(dueField):collection.where('namespace','==',namespace);
      const result=await query.limit(Math.min(100,Math.max(1,limit))).get();
      return result.docs.map(doc=>doc.get('key')).filter((key):key is string=>typeof key==='string');
    },
  };
}
