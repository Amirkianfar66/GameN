import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import type {PlanetPersistence,PlanetReadTransaction,PlanetTransaction} from './planet-game.js';
import {PlanetAtomicCreateConflict} from './planet-persistence-errors.js';

const hash=(key:string)=>createHash('sha256').update(key).digest('hex');
const CHUNK_BYTES=48*1024;
const MAX_CHUNKS=80; // Below Firestore transaction/document limits; no truncation of accepted state.
interface Metadata {key:string;namespace:string;chunks:number;digest:string;schemaVersion:1}
type SdkRead=<T>(read:Promise<T>)=>Promise<T>;
const directSdkRead:SdkRead=read=>read;

/** Server-only JSON chunks support nested stroke/round arrays without Firestore's nested-array restriction.
 * Writes are buffered until every authority read finishes. All chunks, metadata, journals and outbox
 * records commit in the same transaction. Clients cannot read these collections.
 */
export function createFirestorePlanetStore(db:Firestore):PlanetPersistence{
  const meta=(key:string)=>db.collection('planetDocuments').doc(hash(key));
  const chunk=(key:string,index:number)=>db.collection('planetChunks').doc(hash(key)+'-'+index);
  // Both modes use the same authenticated JSON envelope and the same SDK transaction
  // for metadata plus every chunk. Read-only mode supplies no write surface.
  const reader=(transaction:Pick<Transaction,'get'|'getAll'>,
    cached=new Map<string,unknown>(),metadata=new Map<string,Metadata|null>(),writes=new Map<string,unknown|null>(),
    readSdk:SdkRead=directSdkRead)=>
    async<T>(key:string):Promise<T|null>=>{
      if(writes.has(key))return structuredClone(writes.get(key)) as T|null;
      if(cached.has(key))return structuredClone(cached.get(key)) as T|null;
      const head=await readSdk(transaction.get(meta(key)));
      if(!head.exists){metadata.set(key,null);cached.set(key,null);return null;}
      const info=head.data() as Metadata;
      if(info.schemaVersion!==1||info.key!==key||!Number.isInteger(info.chunks)||info.chunks<1||info.chunks>MAX_CHUNKS)
        throw new Error('Invalid private state envelope');
      const fragments=await readSdk(transaction.getAll(...Array.from({length:info.chunks},(_,i)=>chunk(key,i))));
      const bytes=Buffer.concat(fragments.map(part=>{
        const value=part.get('data');if(typeof value!=='string')throw new Error('Missing private state fragment');
        return Buffer.from(value,'base64');
      }));
      if(createHash('sha256').update(bytes).digest('hex')!==info.digest)throw new Error('Private state digest mismatch');
      const value:unknown=JSON.parse(bytes.toString('utf8'));metadata.set(key,info);cached.set(key,value);
      return structuredClone(value) as T;
    };
  return {
    async readOnly<T>(operation:(tx:PlanetReadTransaction)=>Promise<T>):Promise<T>{
      return db.runTransaction(transaction=>operation(Object.freeze({get:reader(transaction)})),{readOnly:true});
    },
    async transaction<T>(operation:(tx:PlanetTransaction)=>Promise<T>):Promise<T>{
      // Keep this boundary across SDK attempts, including empty commits. Once
      // crossed, no later read may enable an additional retry of this invocation.
      let sdkAttemptMayCommit=false;
      let createConflictEligible=false;
      const readBeforeCommit:SdkRead=async read=>{
        try{return await read;}catch(error){
          if(!sdkAttemptMayCommit&&error instanceof Error
            &&'code' in error&&error.code===3&&'details' in error
            &&error.details==='Transaction is invalid or closed.'){
            // Only a rejected SDK read before any write/possible commit qualifies.
            // Preserve its cause and use the SDK's existing bounded ABORTED retry.
            throw Object.assign(new Error('Firestore transaction closed during a read before any SDK write or commit.',{cause:error}),{code:10});
          }
          throw error;
        }
      };
      try{return await db.runTransaction(async transaction=>{
        const earlierAttemptMayCommit=sdkAttemptMayCommit;
        createConflictEligible=false;
        const cached=new Map<string,unknown>(),metadata=new Map<string,Metadata|null>(),writes=new Map<string,unknown|null>();
        const creates=new Set<string>();
        const read=reader(transaction,cached,metadata,writes,readBeforeCommit);
        const tx:PlanetTransaction={get:read,
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
        for(const key of writes.keys())if(!creates.has(key)&&!metadata.has(key)){
          const snapshot=await readBeforeCommit(transaction.get(meta(key)));metadata.set(key,snapshot.exists?snapshot.data() as Metadata:null);
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
          return {key,bytes,chunks,deadlineDueAt,create};
        });
        if(totalWrites>450||totalBytes>6*1024*1024)throw new Error('Transaction budget exceeded');
        for(const {key,bytes,chunks,deadlineDueAt,create} of prepared){
          if(create&&bytes!==null){
            sdkAttemptMayCommit=true;
            transaction.create(meta(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,deadlineDueAt,digest:createHash('sha256').update(bytes).digest('hex')});
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
            transaction.set(meta(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,deadlineDueAt,digest:createHash('sha256').update(bytes).digest('hex')});
            for(let i=0;i<chunks;i++)transaction.set(chunk(key,i),{data:bytes.subarray(i*CHUNK_BYTES,(i+1)*CHUNK_BYTES).toString('base64')});
          }
          for(let i=chunks;i<previous;i++)transaction.delete(chunk(key,i));
        }
        sdkAttemptMayCommit=true;
        // Only a fully returned create-only attempt can classify a later Commit
        // rejection. Any prior possible Commit permanently excludes this outcome.
        createConflictEligible=!earlierAttemptMayCommit&&writes.size>0&&creates.size===writes.size;
        return result;
      });}catch(error){
        if(createConflictEligible&&error instanceof Error&&'code' in error&&error.code===6)
          throw new PlanetAtomicCreateConflict(error);
        throw error;
      }
    },
    async listKeys(namespace:string,limit:number):Promise<string[]>{
      const collection=db.collection('planetDocuments');
      const query=namespace==='deadline'?collection.where('deadlineDueAt','>=',0).orderBy('deadlineDueAt'):collection.where('namespace','==',namespace);
      const result=await query.limit(Math.min(100,Math.max(1,limit))).get();
      return result.docs.map(doc=>doc.get('key')).filter((key):key is string=>typeof key==='string');
    },
  };
}
