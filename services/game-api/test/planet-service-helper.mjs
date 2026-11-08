import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import * as engine from '@mothership/engine';
import {PlanetSessionSnapshotSchema} from '@mothership/contracts';
import {createPlanetService} from '../dist/planet-game.js';

const clone=value=>structuredClone(value);
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const ok=response=>{assert.equal(response.ok,true,JSON.stringify(response));return response.result;};
export const denied=(response,code='FORBIDDEN')=>{assert.equal(response.ok,false,JSON.stringify(response));assert.equal(response.error.code,code);};

// Serialized copy-on-write transactions exercise the orchestration's storage port.
// Firestore tests separately exercise genuine optimistic retries and chunk encoding.
export function memoryPlanetStore(seed=[]) {
  let records=new Map(clone(seed)),tail=Promise.resolve(),retry=false,loseAck=null;
  const attempts=[];
  const transaction=operation=>{
    const execute=async()=>{
      let committedWrites=[];
      const attempt=async(commit)=>{
        const draft=new Map(clone([...records])),writes=[];
        const tx={get:async key=>clone(draft.get(key)??null),set:(key,value)=>{writes.push(key);draft.set(key,clone(value));},delete:key=>{writes.push(key);draft.delete(key);}};
        const result=await operation(tx);attempts.push({commit,writes});if(commit){records=draft;committedWrites=writes;}return result;
      };
      if(retry){retry=false;await attempt(false);}
      const result=await attempt(true);
      if(loseAck!==null&&committedWrites.some(key=>key.startsWith(loseAck))){loseAck=null;throw new Error('Synthetic lost transaction acknowledgement');}
      return result;
    };
    const result=tail.then(execute,execute);tail=result.catch(()=>{});return result;
  };
  return {transaction,attempts,listKeys:async(namespace,limit)=>[...records].filter(([key,value])=>key.startsWith(namespace+'/')&&(namespace!=='deadline'||value.status!=='complete'))
    .sort(([,a],[,b])=>(a.nextAttemptAt??0)-(b.nextAttemptAt??0)).slice(0,limit).map(([key])=>key),
    export:()=>clone([...records]),retryNext:()=>{retry=true;},loseNextAcknowledgement:(prefix='')=>{loseAck=prefix;}};
}

export async function planetServiceHarness({count=7,humans=1,store=memoryPlanetStore(),assetManifestVersion='design-0.6.0',sample=.999999,setupFlowVersion}={}) {
  const prefix='ps-'+randomUUID();let sequence=0,now=1_800_000_000_000,draws=0;
  const nextId=()=>prefix+'-'+(++sequence);
  const options={store,engine,clock:()=>now,newId:nextId,randomSamples:()=>{draws++;return Array(64).fill(sample);},
    newRecoveryCode:()=>nextId()+'-recovery',assetManifestVersion,...(setupFlowVersion===undefined?{}:{setupFlowVersion})};
  let service=createPlanetService(options);
  const host=prefix+'-host',players=Array.from({length:humans},(_,i)=>prefix+'-player-'+(i+1)),display=prefix+'-display';
  const invoke=(uid,operation,fields={})=>service.handle(uid,{operation,...fields});
  const operation=(uid,op,fields={})=>invoke(uid,op,{requestId:nextId(),...fields});
  const created=ok(await operation(host,'create',{playerCount:count}));
  const h={...created,count,host,players,display,store,options,nextId,invoke,operation,now:()=>now,setTime:value=>{now=value;},
    draws:()=>draws,get service(){return service;},reload:extra=>{service=createPlanetService({...options,...extra});return service;},
    current:()=>store.transaction(tx=>tx.get('session/'+created.matchId)),
    read:async(uid=host)=>PlanetSessionSnapshotSchema.parse(ok(await invoke(uid,'read',{matchId:created.matchId}))),
    command:async(uid,command,fields={})=>{
      const current=await h.current();const request={protocolVersion:3,matchId:created.matchId,phaseId:current.state.phase.id,commandId:nextId(),command,...fields};
      return {request,response:await invoke(uid,'command',{request})};
    },
    admission:async(uid,kind='player',displayName='Crew')=>{
      const requestId=nextId();const response=await invoke(uid,'requestAdmission',{requestId,roomCode:created.roomCode,kind,displayName});
      return {...ok(response),requestId};
    },
    approve:admission=>operation(host,'approveAdmission',{matchId:created.matchId,admissionId:admission.admissionId}),
    currentJob:async()=>{
      const s=await h.current(),setup=s.status==='choosing'||s.status==='reading'||s.status==='boarding';
      const phaseId=setup?s.setup.id:s.state.phase.id,deadlineToken=setup?s.setup.token:s.state.deadlineToken;
      return {matchId:created.matchId,phaseId,deadlineToken,kind:setup?'setup':'game',taskId:digest([created.matchId,phaseId,deadlineToken])};
    },
    deadline:async({late=0}={})=>{
      const s=await h.current(),job=await h.currentJob();
      now=(job.kind==='setup'?s.setup.endsAt:engine.planetDeadlineAt(s.state))+late;
      return service.runDeadline(job);
    },
  };
  for(const [i,uid] of players.entries()){const admission=await h.admission(uid,'player','Crew '+(i+1));ok(await h.approve(admission));}
  if(count>humans)ok(await operation(host,'setBots',{matchId:created.matchId,count:count-humans}));
  return h;
}

export async function startPlanetHarness(h) {
  ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));await h.deadline();
  for(const uid of h.players)ok(await h.operation(uid,'ready',{matchId:h.matchId}));
  await h.deadline();assert.equal((await h.current()).status,'running');return h;
}

// A native pure-engine history is adopted as an explicitly labelled service control.
// Setup/assignment service behavior is tested independently; subsequent transitions
// and audience construction are performed through the real service and engine.
export async function adoptNativePlanetState(h,state) {
  const s=await h.current();s.state=clone(state);s.state.matchId=h.matchId;s.state.versions=clone(s.versions);
  engine.assertPlanetGameState(s.state);s.status='running';s.setup=null;s.prepared=null;s.preparedState=null;
  const taskId=digest([h.matchId,s.state.phase.id,s.state.deadlineToken]),endsAt=engine.planetDeadlineAt(s.state);
  await h.store.transaction(tx=>{
    tx.set('session/'+h.matchId,s);
    if(endsAt!==null)tx.set('deadline/'+taskId,{matchId:h.matchId,phaseId:s.state.phase.id,deadlineToken:s.state.deadlineToken,
      endsAt,kind:'game',taskId,status:'pending',nextAttemptAt:s.state.phase.startedAt});
  });h.setTime(s.state.phase.startedAt+1);
}
