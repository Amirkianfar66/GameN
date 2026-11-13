import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import type {PlanetPersistence,PlanetReadTransaction,PlanetTransaction} from './planet-game.js';

const hash=(key:string)=>createHash('sha256').update(key).digest('hex');
const CHUNK_BYTES=48*1024;
const MAX_CHUNKS=80; // Below Firestore transaction/document limits; no truncation of accepted state.
interface Metadata {key:string;namespace:string;chunks:number;digest:string;schemaVersion:1}

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
    cached=new Map<string,unknown>(),metadata=new Map<string,Metadata|null>(),writes=new Map<string,unknown|null>())=>
    async<T>(key:string):Promise<T|null>=>{
      if(writes.has(key))return structuredClone(writes.get(key)) as T|null;
      if(cached.has(key))return structuredClone(cached.get(key)) as T|null;
      const head=await transaction.get(meta(key));
      if(!head.exists){metadata.set(key,null);cached.set(key,null);return null;}
      const info=head.data() as Metadata;
      if(info.schemaVersion!==1||info.key!==key||!Number.isInteger(info.chunks)||info.chunks<1||info.chunks>MAX_CHUNKS)
        throw new Error('Invalid private state envelope');
      const fragments=await transaction.getAll(...Array.from({length:info.chunks},(_,i)=>chunk(key,i)));
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
      return db.runTransaction(async transaction=>{
        const cached=new Map<string,unknown>(),metadata=new Map<string,Metadata|null>(),writes=new Map<string,unknown|null>();
        const read=reader(transaction,cached,metadata,writes);
        const tx:PlanetTransaction={get:read,set:(key,value)=>{if(value===undefined)throw new Error('Undefined authority');writes.set(key,structuredClone(value));},delete:key=>{writes.set(key,null);}};
        const result=await operation(tx);
        // Read old chunk counts for every affected key before applying any write.
        for(const key of writes.keys())if(!metadata.has(key)){
          const snapshot=await transaction.get(meta(key));metadata.set(key,snapshot.exists?snapshot.data() as Metadata:null);
        }
        let totalWrites=0,totalBytes=0;
        const prepared=[...writes].map(([key,value])=>{
          const bytes=value===null?null:Buffer.from(JSON.stringify(value),'utf8');
          const chunks=bytes===null?0:Math.ceil(bytes.length/CHUNK_BYTES);
          if(chunks>MAX_CHUNKS)throw new Error('Authority payload budget exceeded');
          totalBytes+=bytes?.length??0;totalWrites+=1+Math.max(chunks,metadata.get(key)?.chunks??0);
          const deadlineDueAt=key.startsWith('deadline/')&&value!==null&&typeof value==='object'
            && 'status' in value&&value.status!=='complete'&&'nextAttemptAt' in value&&typeof value.nextAttemptAt==='number'
            ?value.nextAttemptAt:null;
          return {key,bytes,chunks,deadlineDueAt};
        });
        if(totalWrites>450||totalBytes>6*1024*1024)throw new Error('Transaction budget exceeded');
        for(const {key,bytes,chunks,deadlineDueAt} of prepared){
          const previous=metadata.get(key)?.chunks??0;
          if(bytes===null)transaction.delete(meta(key));
          else{
            transaction.set(meta(key),{key,namespace:key.split('/')[0],schemaVersion:1,chunks,deadlineDueAt,digest:createHash('sha256').update(bytes).digest('hex')});
            for(let i=0;i<chunks;i++)transaction.set(chunk(key,i),{data:bytes.subarray(i*CHUNK_BYTES,(i+1)*CHUNK_BYTES).toString('base64')});
          }
          for(let i=chunks;i<previous;i++)transaction.delete(chunk(key,i));
        }return result;
      });
    },
    async listKeys(namespace:string,limit:number):Promise<string[]>{
      const collection=db.collection('planetDocuments');
      const query=namespace==='deadline'?collection.where('deadlineDueAt','>=',0).orderBy('deadlineDueAt'):collection.where('namespace','==',namespace);
      const result=await query.limit(Math.min(100,Math.max(1,limit))).get();
      return result.docs.map(doc=>doc.get('key')).filter((key):key is string=>typeof key==='string');
    },
  };
}
