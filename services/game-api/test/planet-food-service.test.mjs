import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PLANET_FOOD_TASK_PINS,PLANET_FOOD_TASK_ENGINE_PROFILE,PLANET_BLACKOUT_PINS,FOOD_TASK_VERTICAL as Y,
  PlanetSessionSnapshotSchema,FoodTaskPlayerViewSchema,FoodTaskPublicViewSchema} from '@mothership/contracts';
import {createPlanetGame,projectPlanetPublic,projectPlanetPlayer} from '@mothership/engine';
import {createPlanetService} from '../dist/planet-game.js';
import {FOOD_BOT_WORKER_LEASE_MS,FOOD_PREFIX_WORKER_LEASE_MS} from '../dist/planet-food-service.js';
import {chooseFoodBotInput} from '../dist/food-bot-policy.js';
const clone=v=>structuredClone(v),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fixture=JSON.parse(readFileSync(new URL('./fixtures/food-views.json',import.meta.url),'utf8'))['task-winch-initial'];
const versions={...PLANET_FOOD_TASK_PINS,assetManifestVersion:'food-service-fixture'};
const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'];

/** Retry/lost-ACK fake, not a claim of Firestore emulator coverage. Hooks target actual write namespaces. */
function memory(seed){
  let records=new Map(clone(seed)),tail=Promise.resolve(),retry=null,lost=null,hold=null,holdRead=null,blockedSession=false;
  const attempts=[];
  const store={attempts,export:()=>clone([...records]),setRetry:(prefix,mutate)=>{retry={prefix,mutate};},
    blockSessionWrites:value=>{blockedSession=value;},
    loseAck:prefix=>{lost=prefix;},
    pauseNext(prefix,remaining=1){
      let entered,resume;const reached=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{resume=resolve;});
      hold={prefix,entered,gate,remaining};return {reached,resume};
    },
    pauseReadNext(prefix){
      let entered,resume;const reached=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{resume=resolve;});
      holdRead={prefix,entered,gate};return {reached,resume};
    },
    listKeys:async(namespace,limit)=>[...records].filter(([k,v])=>k.startsWith(namespace+'/')&&(namespace!=='deadline'||v.status!=='complete')).slice(0,limit).map(([k])=>k),
    readOnly:operation=>store.transaction(operation,true),
    transaction(operation,readOnly=false){
      const run=async()=>{
        const attempt=async(commit)=>{
          const draft=new Map(clone([...records])),writes=[],reads=[];
          const tx={get:async key=>{reads.push(key);if(blockedSession&&!readOnly&&key.startsWith('session/'))throw new Error('Unrelated Session write lock is blocked');
            return clone(draft.get(key)??null);},set:(key,value)=>{draft.set(key,clone(value));writes.push(key);},delete:key=>{draft.delete(key);writes.push(key);}};
          const result=await operation(tx);attempts.push({commit,writes,reads,readOnly,prefixLease:clone(draft.get('foodPrefixWorker/food-match'))});
          return {result,draft,writes,reads};
        };
        const first=await attempt(false);
        let selected=first;
        if(retry&&first.writes.some(k=>k.startsWith(retry.prefix))){const r=retry;retry=null;r.mutate?.(records);selected=await attempt(true);}
        else attempts.at(-1).commit=true;
        records=selected.draft;
        if(lost&&selected.writes.some(k=>k.startsWith(lost))){lost=null;throw new Error('Synthetic committed ACK loss');}
        let gate=null;
        if(hold&&selected.writes.some(k=>k.startsWith(hold.prefix))&&--hold.remaining===0){const paused=hold;hold=null;gate=paused.gate;paused.entered();}
        if(holdRead&&selected.writes.length===0&&selected.reads.some(k=>k.startsWith(holdRead.prefix))){const paused=holdRead;holdRead=null;gate=paused.gate;paused.entered();}
        return {value:selected.result,gate};
      };
      const p=tail.then(run,run);tail=p.catch(()=>{});
      return p.then(async result=>{if(result.gate)await result.gate;return result.value;});
    }};
  return store;
}
function harness({count=7,bots=false,presence=false,asking=false,humanControl='WINCH',humanEligible=true,enginePatch={}}={}){
  let now=6000,id=0,draws=0;
  const ids=Array.from({length:count},(_,i)=>`seat-${i+1}`),pair=asking
    ?humanControl==='WINCH'?['seat-1','seat-2']:['seat-2','seat-1']:bots?['seat-2','seat-3']:['seat-1','seat-2'];
  const legacy=createPlanetGame({matchId:'food-match',playerCount:count,roleOrder:roles.slice(0,count),initialTurnOrder:ids,
    initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<4?'Room A':'Room B'])),assetManifestVersion:versions.assetManifestVersion,
    versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:versions.assetManifestVersion}},
    {now:1000,nextPhaseId:'legacy-phase',nextDeadlineToken:'legacy-token',random:Array(64).fill(.42)});
  const task=clone(fixture.participantTask);
  Object.assign(task,{round:1,participantSeatIds:pair,winchSeatId:pair[0],panelSeatId:pair[1]});
  task.people=pair.map(seatId=>({seatId,alive:true,online:true,keyTurned:false,death:null}));
  const state={matchId:'food-match',versions,round:1,phase:{id:'food-phase',kind:'FOOD_SUPPLY',startedAt:1000,endsAt:33500},
    deadlineToken:'engine-deadline',task,step:{kind:'AWAY',stepId:'food-step-2',startedAt:1000,returnsAt:33500,awaySeatIds:pair},
    stock:10,trace:[],absences:{},nextDue:31000,publicRevision:1};
  state.sessions={winch:'winch-session-2',panel:'panel-session-2'};state.invitation=null;state.closures=[];
  if(asking){state.task=null;state.phase.endsAt=31000;
    state.step={kind:'ASKING',stepId:'food-step-2',startedAt:1000,askingEndsAt:31000,someoneAsking:false};}
  const session={matchId:state.matchId,roomCode:'ABCDEF',hostUid:'host',versions,playerCount:count,journalSequence:0,
    status:'running',members:ids.map((seatId,i)=>({seatId,uid:bots&&i>0?null:`p${i+1}`,bindingRevision:1,
      displayName:`Player ${i+1}`,characterId:null,controller:bots&&i>0?'bot':'human',ready:true})),displays:['display'],admissions:[],
    setup:null,prepared:null,preparedState:null,state,
    foodService:{leases:bots||asking?{}:Object.fromEntries(pair.map(id=>[id,{taskId:'task-2',expiresAt:8000,offline:false}])),botWakes:{},scheduler:null}};
  const store=memory([['session/food-match',session]]),calls=[];
  function record(s,kind,ctx,extra={}){const next=clone(s);next.trace.push({kind,context:clone(ctx),...extra});calls.push({kind,ctx:clone(ctx),...extra});return next;}
  function foodPublic(s,at){return FoodTaskPublicViewSchema.parse({schemaVersion:1,versions:s.versions,matchId:s.matchId,round:1,phaseId:s.phase.id,
    viewRevision:s.publicRevision,serverNowMs:at,playerCount:count,rosterSeatIds:ids,turnEnds:[],audience:'public',step:s.step,
    stock:{doses:s.stock,publicationRound:1,basis:'FINALIZED'}});}
  function foodPlayer(s,seatId,at){
    const v=clone(fixture);Object.assign(v,{versions:s.versions,matchId:s.matchId,round:1,phaseId:s.phase.id,
      serverNowMs:at,playerCount:count,rosterSeatIds:ids,seatId,viewRevision:s.publicRevision,step:s.step});
    v.stock={doses:s.stock,publicationRound:1,basis:'PLAYER_CURRENT'};
    v.partnerChoices=ids.filter(id=>id!==seatId).map(id=>({seatId:id,available:false,reason:'NOT_AVAILABLE_NOW'}));
    v.ownAvailability={canAsk:false,reason:s.step?'TASK_ALREADY_STARTED':'NOT_IN_STEP'};
    v.offers=[];v.participantTask=null;
    v.requestClosures=s.closures.filter(c=>[c.volunteerSeatId,c.partnerSeatId].includes(seatId));
    if(s.step?.kind==='ASKING'){
      const eligible=humanEligible||seatId!=='seat-1';
      const pending=s.invitation!==null;
      v.ownAvailability={canAsk:eligible&&!pending,reason:pending?'REQUEST_PENDING':eligible?null:'WENT_LAST_ROUND'};
      v.partnerChoices=ids.filter(id=>id!==seatId).map(id=>({seatId:id,available:humanEligible||id!=='seat-1',
        reason:humanEligible||id!=='seat-1'?null:'WENT_LAST_ROUND'}));
      if(v.ownAvailability.canAsk)v.offers=[{type:'TASK_ASK',partnerSeatIds:v.partnerChoices.filter(p=>p.available).map(p=>p.seatId)}];
      if(pending&&[s.invitation.volunteerSeatId,s.invitation.partnerSeatId].includes(seatId)){
        v.invitation=clone(s.invitation);
        v.offers=[{type:s.invitation.partnerSeatId===seatId?'TASK_ANSWER':'TASK_ASK_WITHDRAW',
          requestId:s.invitation.requestId,requestRevision:s.invitation.revision}];
      }
    }
    if(s.task&&s.task.participantSeatIds.includes(seatId)){
      const t=clone(s.task),winch=seatId===s.task.winchSeatId;t.selfControl=winch?'WINCH':'PANEL';t.controlSessionId=winch?s.sessions.winch:s.sessions.panel;
      if(!winch)t.ownGesture=null;v.participantTask=t;
      const me=t.people.find(p=>p.seatId===seatId),inputs=[];
      if(me.alive&&t.stage!=='ENDED'&&at<t.deadlineAt){
        if(winch)inputs.push('HOLD');
        else if(t.stage==='ACTIVE')inputs.push(t.panel.locked?'PANEL_RELEASE':'PANEL_LOCK');
        if(t.crate.state==='LANDED'&&!me.keyTurned)inputs.push('KEY');
      }
      if(inputs.length)v.offers=[{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,controlRevision:t.controlRevision,inputs,crateId:t.crate.id}];
    }
    return FoodTaskPlayerViewSchema.parse(v);
  }
  const e={createPlanetGame:()=>clone(state),assertPlanetGameState:s=>{assert.equal(s.matchId,'food-match');},
    abortPlanetGame:(s,ctx)=>{const n=record(s,'abort',ctx);n.phase={id:ctx.nextPhaseId,kind:'ABORTED',startedAt:ctx.now,endsAt:null};return n;},
    projectPlanetPublic:s=>({...projectPlanetPublic(legacy),versions:s.versions,phase:s.phase,viewRevision:s.publicRevision}),
    projectPlanetPlayer:(s,id)=>({...projectPlanetPlayer(legacy,id),versions:s.versions,phase:s.phase,offers:[],events:[],viewRevision:s.publicRevision}),
    projectPlanetFoodPublic:foodPublic,projectPlanetFoodPlayer:foodPlayer,
    planetDeadlineAt:s=>{
      const moving=s.task&&['LIFTING','FALLING'].includes(s.task.crate.state)?s.task.crate.motion?.endsAt:null;
      const times=[s.nextDue,...Object.values(s.absences),moving].filter(v=>typeof v==='number');
      return times.length?Math.min(...times):null;
    },
    advancePlanetDeadline:(s,ctx)=>{
      const n=record(s,'boundary',ctx),t=n.task;
      if(t?.stage==='BRIEFING'&&ctx.now===t.runningAt){t.stage='ACTIVE';n.nextDue=t.deadlineAt;
      }else if(t?.crate.motion&&ctx.now===t.crate.motion.endsAt&&['LIFTING','FALLING'].includes(t.crate.state)){
        t.crate.state=t.crate.state==='LIFTING'?'HELD':'LANDED';t.crate.height=t.crate.state==='HELD'?Y.raised:Y.platform;t.crate.motion=null;
      }else if(t&&Object.entries(n.absences).some(([,at])=>at===ctx.now)&&t.stage!=='ENDED'){
        const [seatId]=Object.entries(n.absences).find(([,at])=>at===ctx.now);
        t.stage='ENDED';t.outcome={kind:'CANCELLED',at:ctx.now,reason:'DISCONNECT',disconnectedSeatId:seatId};n.absences={};n.nextDue=t.returnsAt;
      }else if(t&&ctx.now===t.deadlineAt){
        if(t.stage!=='ENDED'){t.stage='ENDED';t.outcome={kind:'LOST',at:ctx.now,reason:'TIME'};}
        n.nextDue=t.returnsAt;
      }else if(t&&ctx.now===t.returnsAt){
        n.task=null;n.step=null;n.nextDue=ctx.now+15000;
        n.phase={id:ctx.nextPhaseId,kind:'PRE_TURN',startedAt:ctx.now,endsAt:ctx.now+15000};n.deadlineToken=ctx.nextDeadlineToken;
      }else throw new Error(`Unexpected mock boundary ${ctx.now}`);
      return {state:n,advanced:true};
    },
    setPlanetFoodPresence:(s,actor,online,ctx)=>{
      const n=record(s,'presence',ctx,{actor,online});n.task.people.find(p=>p.seatId===actor).online=online;
      if(online)delete n.absences[actor];else if(presence)n.absences[actor]=ctx.now+8000;return n;
    },
    applyPlanetCommand:(s,actor,q,ctx)=>({state:record(s,'ordinary',ctx,{actor,request:clone(q)}),
      receipt:{protocolVersion:3,matchId:q.matchId,phaseId:q.phaseId,commandId:q.commandId,status:'accepted',code:'REGISTERED'}}),
    applyPlanetFoodCommand:(s,actor,q,ctx)=>{
      const n=record(s,'food',ctx,{actor,request:clone(q)}),t=n.task,base={schemaVersion:1,protocolVersion:3,matchId:q.matchId,
        commandId:q.commandId,phaseId:q.phaseId,foodStepId:q.foodStepId,round:q.round,receivedAt:ctx.now};
      if(q.command.type==='TASK_ASK'&&n.step?.kind==='ASKING'&&!n.invitation){
        n.invitation={foodStepId:n.step.stepId,round:1,requestId:ctx.foodIds.requestId,revision:0,
          volunteerSeatId:actor,partnerSeatId:q.command.partnerSeatId,askedAt:ctx.now,answerEndsAt:ctx.now+15000,state:'PENDING'};
        n.step.someoneAsking=true;n.nextDue=Math.min(n.step.askingEndsAt,n.invitation.answerEndsAt);
        return {state:n,receipt:{...base,status:'accepted',result:{kind:'REQUEST',requestId:n.invitation.requestId,requestRevision:0,state:'PENDING'}}};
      }
      if(q.command.type==='TASK_ANSWER'&&n.invitation?.partnerSeatId===actor&&q.command.answer==='JOIN'){
        const original=n.invitation,joined=clone(task),at=ctx.now;
        const assigned=[original.volunteerSeatId,original.partnerSeatId].includes('seat-1')?pair:[original.volunteerSeatId,original.partnerSeatId];
        Object.assign(joined,{taskId:ctx.foodIds.taskId,controlSessionId:ctx.foodIds.winchControlSessionId,
          startedAt:at,runningAt:at+4000,deadlineAt:at+30000,returnsAt:at+32500,stage:'BRIEFING',
          participantSeatIds:[original.volunteerSeatId,original.partnerSeatId],winchSeatId:assigned[0],panelSeatId:assigned[1]});
        joined.people=assigned.map(seatId=>({seatId,alive:true,online:true,keyTurned:false,death:null}));
        joined.ownGesture.controlSessionId=ctx.foodIds.winchControlSessionId;
        joined.crate.id=ctx.foodIds.taskId+'-crate';joined.crate.anchorAt=at;
        joined.panel.anchorAt=at;joined.panel.blade.changedAt=at;
        n.task=joined;n.sessions={winch:ctx.foodIds.winchControlSessionId,panel:ctx.foodIds.panelControlSessionId};
        n.step={kind:'AWAY',stepId:'food-step-2',startedAt:at,returnsAt:joined.returnsAt,
          awaySeatIds:[...assigned].sort((a,b)=>Number(a.slice(5))-Number(b.slice(5)))};
        n.phase.endsAt=joined.returnsAt;n.nextDue=joined.runningAt;n.invitation=null;
        n.closures.push({foodStepId:original.foodStepId,round:1,requestId:original.requestId,requestRevision:1,
          volunteerSeatId:original.volunteerSeatId,partnerSeatId:original.partnerSeatId,askedAt:original.askedAt,
          answerEndsAt:original.answerEndsAt,closedAt:at,state:'JOINED'});
        return {state:n,receipt:{...base,status:'accepted',result:{kind:'REQUEST',requestId:original.requestId,requestRevision:1,state:'JOINED'}}};
      }
      if(!t||t.stage==='ENDED'||q.phaseId!==n.phase.id||!t.people.find(p=>p.seatId===actor)?.alive)
        return {state:n,receipt:{...base,status:'rejected',code:'PHASE_CLOSED',requestClosure:null}};
      const input=q.command.input;
      if(input.kind==='HOLD'&&input.edge==='DOWN'){
        Object.assign(t.ownGesture,{highestSequence:input.gestureSequence,currentHolder:{sequence:input.gestureSequence,crateId:t.crate.id}});
        Object.assign(t.crate,{state:'LIFTING',holder:'WINCH',anchorAt:ctx.now,
          motion:{fromX:0,toX:0,fromHeight:0,toHeight:1,easing:'QUADRATIC_IN_OUT',startedAt:ctx.now,endsAt:ctx.now+450}});
      }else if(input.kind==='HOLD'&&input.edge==='UP'){
        t.ownGesture.currentHolder=null;Object.assign(t.crate,{state:'FALLING',holder:null,x:5,anchorAt:ctx.now,
          motion:{fromX:5,toX:5,fromHeight:1,toHeight:Y.platform,easing:'CUBIC_IN',startedAt:ctx.now,endsAt:ctx.now+300}});
      }else if(input.kind==='PANEL_RELEASE')Object.assign(t.panel,{locked:false,stop:0,anchorAt:ctx.now,direction:1});
      else if(input.kind==='PANEL_LOCK')Object.assign(t.panel,{locked:true,stop:5,anchorAt:ctx.now,swing:{startedAt:ctx.now,amplitude:.9,direction:1}});
      else if(input.kind==='KEY'){
        t.people.find(p=>p.seatId===actor).keyTurned=true;
        if(t.people.every(p=>p.keyTurned)){
          t.stage='ENDED';t.outcome={kind:'DELIVERED',at:ctx.now,dosesAdded:10};n.stock+=10;n.nextDue=t.returnsAt;
          Object.assign(t.crate,{state:'SENT',holder:null,motion:{fromX:5,toX:5,fromHeight:Y.platform,toHeight:-.12,
            easing:'QUADRATIC_IN_OUT',startedAt:ctx.now,endsAt:ctx.now+1100}});
        }
      }
      return {state:n,receipt:{...base,status:'accepted',result:{kind:'INPUT',taskId:t.taskId,controlSessionId:q.command.controlSessionId,
        effect:'APPLIED',gestureSequence:input.kind==='HOLD'?input.gestureSequence:null,crateId:input.kind==='HOLD'?input.crateId:null}}};
    },...enginePatch};
  const options={store,engine:e,clock:()=>now,newId:()=>`server-id-${++id}`,newRecoveryCode:()=>`recovery-code-${++id}-long`,
    randomSamples:()=>{draws++;return Array(64).fill(.42);},engineProfile:PLANET_FOOD_TASK_ENGINE_PROFILE};
  let api=createPlanetService(options);
  return {store,engine:e,calls,options,setNow:v=>{now=v;},getNow:()=>now,draws:()=>draws,
    current:()=>store.transaction(tx=>tx.get('session/food-match')),
    api:()=>api,restart:()=>{api=createPlanetService(options);},
    handle:(operation,fields={},uid='p1')=>api.handle(uid,{operation,...fields}),
    command:(commandId='input-1',uid='p1')=>api.handle(uid,{operation:'foodCommand',request:{schemaVersion:1,protocolVersion:3,
      matchId:'food-match',commandId,phaseId:'food-phase',foodStepId:'food-step-2',round:1,
      command:{type:'TASK_PRESS',taskId:'task-2',controlSessionId:'winch-session-2',expectedControlRevision:0,
        input:{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:'crate-0'}}}})};
}

for(const count of [7,8,9]){
  test(`${count}: immutable processing time, IDs and randomness across SDK retry`,async()=>{
    const h=harness({count});h.store.setRetry('food-command/',()=>h.setNow(10000));
    const result=await h.command();assert.equal(result.ok,true);assert.equal(result.result.receipt.receivedAt,6000);
    const attempts=h.calls.filter(c=>c.kind==='food');assert.equal(attempts.length,2);assert.deepEqual(attempts[0].ctx,attempts[1].ctx);
    assert.equal((await h.current()).state.trace.filter(c=>c.kind==='food').length,1);
  });
  test(`${count}: successful admission chooses its final timestamp; exact retry recovers before new context/death`,async()=>{
    const h=harness({count});h.store.setRetry('foodIngress/',()=>h.setNow(7000));
    const first=await h.command();assert.equal(first.result.receipt.receivedAt,7000);
    await h.store.transaction(async tx=>{const s=await tx.get('session/food-match');s.state.task.people[0].alive=false;
      s.state.task.people[0].death={at:7000,mechanism:'CUT',actorSeatId:'seat-2'};tx.set('session/food-match',s);});
    const draws=h.draws();h.setNow(40000);h.restart();assert.deepEqual(await h.command(),first);assert.equal(h.draws(),draws);
    assert.equal((await h.current()).state.trace.filter(c=>c.kind==='food').length,1);
  });
  test(`${count}: committed admission ACK loss recovers the original queue entry and time`,async()=>{
    const h=harness({count});h.store.loseAck('foodIngress/');const lost=await h.command();assert.equal(lost.ok,false);
    h.setNow(8000);h.restart();const recovered=await h.command();assert.equal(recovered.result.receipt.receivedAt,6000);
    assert.equal((await h.current()).state.trace.filter(c=>c.kind==='food').length,1);
  });
}
test('processing ACK loss returns its verified original receipt and applies its effect once',async()=>{
  const h=harness();h.store.loseAck('food-command/');const first=await h.command();assert.equal(first.ok,true);
  const original=new Map(h.store.export()).get('food-command/'+hash(['food-match','seat-1','input-1']));
  assert.deepEqual(first,original.response);assert.equal(first.result.receipt.receivedAt,6000);
  const before=h.store.export();
  h.setNow(9000);const draws=h.draws();const result=await h.command();assert.equal(result.ok,true);
  assert.deepEqual(result,first);assert.equal(h.draws(),draws);assert.deepEqual(h.store.export(),before);
  assert.equal((await h.current()).state.trace.filter(c=>c.kind==='food').length,1);
});
test('deadline barrier drains committed earlier input before expiry, and equal-time input cannot revive Task',async()=>{
  const h=harness();h.store.loseAck('foodIngress/');await h.command('before-deadline');
  h.setNow(31000);const read=await h.handle('read',{matchId:'food-match'});
  assert.equal(read.ok,true,JSON.stringify(read));const trace=(await h.current()).state.trace;
  assert.ok(trace.findIndex(c=>c.kind==='food')<trace.findIndex(c=>c.kind==='boundary'&&c.context.now===31000));
  const equal=await h.command('at-deadline');assert.equal(equal.result.receipt.status,'rejected');
  assert.equal(equal.result.receipt.receivedAt,31000);
});
test('ordinary candidate commands use the same immutable queue and drain earlier boundaries',async()=>{
  const h=harness();h.setNow(31000);const result=await h.handle('command',{request:{protocolVersion:3,matchId:'food-match',
    commandId:'ordinary-1',phaseId:'food-phase',command:{type:'PASS_TURN'}}});assert.equal(result.ok,true);
  const trace=(await h.current()).state.trace;const ordinary=trace.findIndex(c=>c.kind==='ordinary');
  assert.ok(ordinary>trace.findIndex(c=>c.kind==='boundary'&&c.context.now===31000));
});
test('server lease expires, grace runs from that expiry, and heartbeat at the closed grace endpoint cannot revive',async()=>{
  const h=harness({presence:true});h.setNow(8000);await h.handle('read',{matchId:'food-match'},'p2');
  assert.equal((await h.current()).state.trace.find(c=>c.kind==='presence').context.now,8000);
  h.setNow(15000);const beat=await h.handle('foodHeartbeat',{matchId:'food-match',taskId:'task-2'});assert.equal(beat.ok,true);
  assert.equal((await h.handle('foodHeartbeat',{matchId:'food-match',taskId:'task-2'})).ok,true);
  const restored=h.store.export().filter(([key,value])=>key.startsWith('journal/')&&value.kind==='FOOD_PRESENCE'&&value.online===true&&value.actorSeatId==='seat-1');
  assert.equal(restored.length,1,'journal only the actual engine reconnect, not an already-online lease renewal');
  assert.equal(restored[0][1].context.now,15000);
  const beats=h.store.export().filter(([key,value])=>key.startsWith('journal/')&&value.kind==='FOOD_HEARTBEAT'&&value.actorSeatId==='seat-1');
  assert.equal(beats.length,2,'both reconnect and already-online heartbeats retain their ordered journal records');
  for(const [,beat] of beats){assert.equal(beat.context.now,15000);assert.equal(beat.leaseExpiresAt,17000);
    assert.ok(ingress(h).some(([,entry])=>entry.sequence===beat.ingressSequence&&entry.request?.operation==='foodHeartbeat'));}
  assert.equal((await h.handle('foodHeartbeat',{matchId:'food-match',taskId:'task-2'},'p2')).ok,true);
  h.setNow(17000);await h.handle('read',{matchId:'food-match'},'p2');
  assert.ok((await h.current()).state.trace.some(c=>c.kind==='presence'&&c.actor==='seat-1'&&!c.online&&c.context.now===17000));
  h.setNow(25000);const late=await h.handle('foodHeartbeat',{matchId:'food-match',taskId:'task-2'});
  assert.equal(late.ok,false);assert.equal(late.error.code,'NOT_ALLOWED');
  assert.equal((await h.current()).state.task.outcome.kind,'CANCELLED');
});
test('heartbeats never fabricate a Hold UP or recovery input, and bots receive no human leases',async()=>{
  const h=harness({bots:true});await h.handle('read',{matchId:'food-match'});
  const s=await h.current();assert.deepEqual(s.foodService.leases,{});
  assert.equal(s.state.trace.some(c=>c.kind==='food'),false);
});
test('same-snapshot Food sidecars bind one transport time; display gets no player subtree',async()=>{
  const h=harness();const result=await h.handle('read',{matchId:'food-match'});assert.equal(result.ok,true,JSON.stringify(result));
  const snapshot=PlanetSessionSnapshotSchema.parse(result.result);
  assert.equal(snapshot.foodPublicView.serverNowMs,result.serverTimeMs);
  assert.equal(snapshot.foodPlayerView.serverNowMs,result.serverTimeMs);
  assert.equal(snapshot.foodPlayerView.phaseId,snapshot.playerView.phase.id);
  const display=await h.handle('read',{matchId:'food-match'},'display');assert.equal(display.result.foodPlayerView,null);
});
test('request identity, command conflicts and revoked/nonmember access remain server checked',async()=>{
  const h=harness();const first=await h.command();assert.equal(first.ok,true);
  const request=(await h.current()).state.trace.find(c=>c.kind==='food').request;
  const conflict=await h.handle('foodCommand',{request:{...request,command:{...request.command,expectedControlRevision:9}}});
  assert.equal(conflict.error.code,'COMMAND_ID_CONFLICT');
  assert.equal((await h.handle('foodReceipt',{matchId:'food-match',commandId:'input-1'},'outsider')).error.code,'FORBIDDEN');
  assert.equal((await h.handle('foodReceipt',{matchId:'food-match',commandId:'input-1'},'p2')).result.receipt,null);
  assert.equal((await h.handle('foodHeartbeat',{matchId:'food-match',taskId:'task-2',online:false})).error.code,'INVALID_REQUEST');
});
test('explicit Food constructor requires all ports; default creation profile remains historical',()=>{
  const h=harness();const bad={...h.engine};delete bad.setPlanetFoodPresence;
  assert.throws(()=>createPlanetService({...h.options,engine:bad}),/Food runtime ports/);
  assert.doesNotThrow(()=>createPlanetService({...h.options,engine:bad,engineProfile:undefined}));
});
test('an idle session bot trigger makes no writes and cannot trigger itself forever',async()=>{
  for(const bots of [false,true]){
    const h=harness({bots});if(bots)await h.api().runBots('food-match');
    const before=h.store.export();const result=await h.api().runBots('food-match');
    assert.equal(result.accepted,0);assert.deepEqual(h.store.export(),before);
  }
});
test('lost bot admission ACK resumes its same intent without another DOWN',async()=>{
  const h=harness({bots:true});h.store.loseAck('foodBotIntent/');
  await assert.rejects(()=>h.api().runBots('food-match'));
  h.restart();await h.api().runBots('food-match');
  const down=(await h.current()).state.trace.filter(c=>c.kind==='food'&&c.request.command.input.kind==='HOLD'&&c.request.command.input.edge==='DOWN');
  assert.equal(down.length,1);
});
test('queued recovery revokes a later input admitted against the old pending binding',async()=>{
  const h=harness();const issued=await h.handle('issueRecovery',{matchId:'food-match',seatId:'seat-1',requestId:'issue-1'},'host');
  assert.equal(issued.ok,true);h.store.loseAck('foodIngress/');
  const recovering=await h.handle('redeemRecovery',{matchId:'food-match',requestId:'redeem-1',recoveryCode:issued.result.recoveryCode},'replacement');
  assert.equal(recovering.ok,false);
  const old=await h.command('old-binding-after-recovery');assert.equal(old.ok,false);assert.equal(old.error.code,'FORBIDDEN');
  assert.equal((await h.current()).members[0].uid,'replacement');
  assert.equal((await h.current()).state.trace.some(c=>c.kind==='food'),false);
  assert.equal((await h.handle('foodReceipt',{matchId:'food-match',commandId:'old-binding-after-recovery'},'p1')).error.code,'FORBIDDEN');
});
test('exact own receipt recovery precedes new-context rate limiting',async()=>{
  const h=harness();const original=await h.command();
  await h.store.transaction(async tx=>{tx.set('foodTransportRate/'+hash(['p1','input']),{since:6000,count:120});});
  const draws=h.draws();assert.deepEqual(await h.command(),original);assert.equal(h.draws(),draws);
  assert.equal((await h.command('fresh-after-budget')).error.code,'RATE_LIMITED');assert.equal(h.draws(),draws);
});
for(const count of [7,8,9])test(`${count}: an already joined bot pair cooperates using admitted own-view commands`,async()=>{
  const h=harness({count,bots:true});await h.api().runBots('food-match');
  for(let wake=0;wake<30;wake++){
    const s=await h.current();if(s.state.task?.stage==='ENDED')break;
    const scheduled=s.foodService.scheduler;assert.ok(scheduled);
    h.setNow(Math.max(h.getNow(),scheduled.endsAt));
    await h.api().runDeadline({matchId:s.matchId,phaseId:scheduled.phaseId,deadlineToken:scheduled.token,kind:'game'});
  }
  const s=await h.current();assert.equal(s.state.task?.outcome?.kind,'DELIVERED');assert.equal(s.state.stock,20);
  assert.ok(s.state.trace.filter(c=>c.kind==='food').every(c=>['seat-2','seat-3'].includes(c.actor)));
  assert.deepEqual(s.foodService.leases,{});
});

for(const count of [7,8,9])for(const humanControl of ['WINCH','PANEL'])test(`${count}: bot invites the lone human, who joins and operates ${humanControl} through the API`,async()=>{
  const h=harness({count,bots:true,asking:true,presence:true,humanControl});
  await h.api().runBots('food-match');
  const first=await h.current(),asks=first.state.trace.filter(c=>c.kind==='food'&&c.request.command.type==='TASK_ASK');
  assert.equal(asks.length,1);assert.equal(asks[0].actor,'seat-2');assert.equal(asks[0].request.command.partnerSeatId,'seat-1');
  assert.equal(first.state.task,null,'bots must wait for the human answer, rather than consume the Task with a bot pair');
  let sequence=0;
  const read=async()=>{const r=await h.handle('read',{matchId:'food-match'});assert.equal(r.ok,true,JSON.stringify(r));return r.result;};
  const send=async(view,command)=>{
    const r=await h.handle('foodCommand',{request:{schemaVersion:1,protocolVersion:3,matchId:view.matchId,
      phaseId:view.phaseId,foodStepId:view.step.stepId,round:view.round,commandId:`human-${++sequence}`,command}});
    assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.result.receipt.status,'accepted',JSON.stringify(r));return r.result.receipt;
  };
  const invited=(await read()).foodPlayerView;
  assert.equal(invited.invitation.partnerSeatId,'seat-1');assert.equal(invited.participantTask,null);
  const join=invited.offers.find(o=>o.type==='TASK_ANSWER');assert.ok(join);
  const joined=await send(invited,{type:'TASK_ANSWER',requestId:join.requestId,requestRevision:join.requestRevision,answer:'JOIN'});
  assert.equal(joined.result.state,'JOINED');
  assert.equal((await read()).foodPlayerView.participantTask.selfControl,humanControl);

  for(let wake=0;wake<60;wake++){
    const snapshot=await read(),view=snapshot.foodPlayerView,t=view.participantTask;
    if(t.stage==='ENDED')break;
    const beat=await h.handle('foodHeartbeat',{matchId:'food-match',taskId:t.taskId});assert.equal(beat.ok,true,JSON.stringify(beat));
    // A deterministic scripted human uses the same authorized anchors to time its presses;
    // production never invokes the bot driver for this human-controlled member.
    const decision=chooseFoodBotInput((await read()).foodPlayerView);
    if(decision.command){assert.equal(decision.command.type,'TASK_PRESS');await send(view,decision.command);}
    await h.api().runBots('food-match'); // Simulate the existing private session trigger.
    const s=await h.current();if(s.state.task.stage==='ENDED')break;
    const scheduled=s.foodService.scheduler;assert.ok(scheduled);
    const next=Math.min(h.getNow()+1000,Math.max(h.getNow()+1,scheduled.endsAt));
    h.setNow(next);
    if(next>=scheduled.endsAt)await h.api().runDeadline({matchId:s.matchId,phaseId:scheduled.phaseId,deadlineToken:scheduled.token,kind:'game'});
  }
  const completed=await h.current();assert.equal(completed.state.task.outcome?.kind,'DELIVERED');
  const human=completed.state.trace.filter(c=>c.kind==='food'&&c.actor==='seat-1'&&c.request.command.type==='TASK_PRESS');
  const kinds=human.map(c=>c.request.command.input.kind);
  assert.ok(kinds.includes('KEY'));
  if(humanControl==='WINCH'){
    assert.ok(human.some(c=>c.request.command.input.kind==='HOLD'&&c.request.command.input.edge==='DOWN'));
    assert.ok(human.some(c=>c.request.command.input.kind==='HOLD'&&c.request.command.input.edge==='UP'));
  }else{assert.ok(kinds.includes('PANEL_RELEASE'));assert.ok(kinds.includes('PANEL_LOCK'));}
  assert.ok(completed.state.trace.filter(c=>c.kind==='food'&&c.actor!=='seat-1').every(c=>c.actor==='seat-2'));
  const scheduled=completed.foodService.scheduler;h.setNow(completed.state.task.returnsAt);
  await h.api().runDeadline({matchId:completed.matchId,phaseId:scheduled.phaseId,deadlineToken:scheduled.token,kind:'game'});
  const returned=await read();assert.equal(returned.foodPlayerView.step,null);assert.equal(returned.foodPlayerView.participantTask,null);
  assert.equal(returned.foodPublicView.stock.doses,20);assert.equal(returned.playerView.phase.kind,'PRE_TURN');
});
test('a human excluded by the server offer does not block an eligible bot partner',async()=>{
  const h=harness({bots:true,asking:true,humanEligible:false});await h.api().runBots('food-match');
  const s=await h.current(),ask=s.state.trace.find(c=>c.kind==='food'&&c.request.command.type==='TASK_ASK');
  assert.equal(ask.request.command.partnerSeatId,'seat-3');
  assert.deepEqual([...s.state.task.participantSeatIds].sort(),['seat-2','seat-3']);
});

const workerPath='foodBotWorker/food-match';
const prefixPath='foodPrefixWorker/food-match';
const ingress=h=>h.store.export().filter(([path])=>path.startsWith('foodIngress/'));
const workerJob=s=>({matchId:s.matchId,phaseId:s.foodService.scheduler.phaseId,deadlineToken:s.foodService.scheduler.token,kind:'game'});
for(const reverse of [false,true])test(`direct Lock probing preserves existing member order (${reverse?'reversed fixture':'normal fixture'})`,async()=>{
  const h=harness({bots:true});await h.store.transaction(async tx=>{
    const s=await tx.get('session/food-match'),t=s.state.task;
    Object.assign(t.crate,{state:'HELD',holder:'WINCH',height:Y.raised,motion:null});
    Object.assign(t.ownGesture,{highestSequence:2,recoveryRevision:2,currentHolder:{sequence:1,crateId:t.crate.id},pendingIntent:{sequence:2,crateId:t.crate.id}});
    Object.assign(t.panel,{locked:false,stop:0,direction:1,anchorAt:6000,swing:null});if(reverse)s.members.reverse();tx.set('session/food-match',s);
  });
  h.setNow(7000);await h.api().runBots('food-match');
  const entries=ingress(h).map(([,e])=>e),presses=entries.filter(e=>e.request?.operation==='foodCommand');
  if(reverse){assert.equal(entries[0].request.operation,'foodCommand');assert.equal(presses[0].actorSeatId,'seat-3');
    assert.equal(presses[0].request.request.command.input.kind,'PANEL_LOCK');
  }else{
    assert.equal(entries[0].request,null,'the earlier non-Lock keeps the existing CLOCK path');
    assert.equal(presses[0].actorSeatId,'seat-2');assert.equal(presses[0].request.request.command.input.kind,'HOLD');
    assert.equal(presses[0].request.request.command.input.edge,'UP');
  }
});
test('regular read, recovery and bot metadata wait outside Session behind the positive prefix owner',async()=>{
  const h=harness(),paused=h.store.pauseNext(prefixPath),first=h.command('positive-owner');await paused.reached;
  const start=h.store.attempts.length,reading=h.store.pauseReadNext(prefixPath);
  const read=h.handle('read',{matchId:'food-match'}),recovery=h.handle('issueRecovery',
    {matchId:'food-match',requestId:'writer-wait-recovery',seatId:'seat-1'},'host'),bots=h.api().runBots('food-match');
  await reading.reached;
  assert.equal(h.store.attempts.slice(start).some(a=>!a.readOnly&&a.reads.includes('session/food-match')),false);
  reading.resume();paused.resume();const results=await Promise.all([first,read,recovery,bots]);assert.ok(results.slice(0,3).every(r=>r.ok));
  const writers=h.store.attempts.filter(a=>a.commit&&!a.readOnly&&a.writes.includes('session/food-match'));
  assert.ok(writers.some(a=>a.prefixLease.throughSequence===0));
  for(const a of writers){assert.ok(a.prefixLease);assert.equal(a.reads[0],'session/food-match');
    assert.ok(a.reads.indexOf('foodIngressControl/food-match')<a.reads.indexOf(prefixPath));}
});
test('known unauthorized, invalid recovery and exhausted fresh requests create no writer lease or wake',async()=>{
  const h=harness();await h.handle('read',{matchId:'food-match'});const before=h.store.export();
  for(const [uid,operation,fields,code] of [
    ['stranger','foodHeartbeat',{matchId:'food-match',taskId:'task-2'},'FORBIDDEN'],
    ['p1','abort',{matchId:'food-match',requestId:'not-host'},'FORBIDDEN'],
    ['replacement','redeemRecovery',{matchId:'food-match',requestId:'bad-token',recoveryCode:'invalid-recovery-code'},'FORBIDDEN'],
  ]){const result=await h.handle(operation,fields,uid);assert.equal(result.ok,false);assert.equal(result.error.code,code);}
  await h.store.transaction(async tx=>tx.set('foodTransportRate/'+hash(['p1','presence']),{since:6000,count:90}));
  assert.equal((await h.handle('foodHeartbeat',{matchId:'food-match',taskId:'task-2'})).error.code,'RATE_LIMITED');
  assert.deepEqual(h.store.export().filter(([key])=>key.startsWith('deadline/')||key===prefixPath),before.filter(([key])=>key.startsWith('deadline/')||key===prefixPath));
});
test('a rate budget filled after RO preflight rejects in the fresh claim before lease or wake writes',async()=>{
  const h=harness();await h.handle('read',{matchId:'food-match'});const before=h.store.export().filter(([key])=>key.startsWith('deadline/')||key===prefixPath);
  const paused=h.store.pauseReadNext('foodTransportRate/'),request={protocolVersion:3,matchId:'food-match',commandId:'rate-after-preflight',phaseId:'food-phase',command:{type:'PASS_TURN'}};
  const pending=h.handle('command',{request});await paused.reached;
  await h.store.transaction(async tx=>tx.set('foodTransportRate/'+hash(['p1','input']),{since:6000,count:120}));
  paused.resume();const result=await pending;assert.equal(result.ok,false);assert.equal(result.error.code,'RATE_LIMITED');
  assert.deepEqual(h.store.export().filter(([key])=>key.startsWith('deadline/')||key===prefixPath),before);
});
for(const successor of ['same','different'])test(`ordinary midflight receipt recovery rechecks ownership before the successor's ${successor} fingerprint`,async()=>{
  const h=harness(),request={protocolVersion:3,matchId:'food-match',commandId:'ordinary-recovery-canary',phaseId:'food-phase',command:{type:'PASS_TURN'}};
  const paused=h.store.pauseReadNext('foodTransportRate/'),old=h.handle('command',{request});await paused.reached;
  const issued=await h.handle('issueRecovery',{matchId:'food-match',seatId:'seat-1',requestId:'ordinary-canary-issue'},'host');assert.equal(issued.ok,true);
  assert.equal((await h.handle('redeemRecovery',{matchId:'food-match',requestId:'ordinary-canary-redeem',recoveryCode:issued.result.recoveryCode},'replacement')).ok,true);
  const nextRequest=successor==='same'?request:{...request,phaseId:'successor-phase'};
  const next=await h.handle('command',{request:nextRequest},'replacement');assert.equal(next.ok,true);
  paused.resume();const denied=await old;assert.equal(denied.ok,false);assert.equal(denied.error.code,'FORBIDDEN');assert.equal(Object.hasOwn(denied,'result'),false);
  const own=await h.handle('receipt',{matchId:'food-match',commandId:request.commandId},'replacement');assert.deepEqual(own.result.receipt,next.result.receipt);
});
test('an original redeem appearing after preflight recovers before used-token and exhausted-rate checks without a new writer wake',async()=>{
  const h=harness(),issued=await h.handle('issueRecovery',{matchId:'food-match',seatId:'seat-1',requestId:'redeem-race-issue'},'host');assert.equal(issued.ok,true);
  const fields={matchId:'food-match',requestId:'redeem-race',recoveryCode:issued.result.recoveryCode};
  const paused=h.store.pauseReadNext('foodTransportRate/'),old=h.handle('redeemRecovery',fields,'replacement');await paused.reached;
  const completed=await h.handle('redeemRecovery',fields,'replacement');assert.equal(completed.ok,true);
  await h.store.transaction(async tx=>tx.set('foodTransportRate/'+hash(['replacement','control']),{since:6000,count:30}));
  const before=h.store.export().filter(([key])=>key.startsWith('deadline/')||key===prefixPath);
  paused.resume();assert.deepEqual(await old,completed);
  assert.deepEqual(h.store.export().filter(([key])=>key.startsWith('deadline/')||key===prefixPath),before);
});
test('a lost metadata admission ACK retains a recovery-only wake that drains original input before a busy bot lease',async()=>{
  const h=harness();h.store.loseAck('foodIngress/');
  assert.equal((await h.handle('issueRecovery',{matchId:'food-match',requestId:'lost-metadata-recovery',seatId:'seat-1'},'host')).ok,false);
  const original=ingress(h)[0][1],wake=h.store.export().find(([key,j])=>key.startsWith('deadline/')&&j.sessionWriterRecovery&&j.status==='pending')[1];
  assert.equal(wake.ingressSequence,undefined);assert.equal((await h.api().runDeadline(wake)).status,'too-early');
  h.setNow(wake.endsAt);await h.store.transaction(async tx=>tx.set(workerPath,{owner:'busy-bot-owner',expiresAt:wake.endsAt+8000}));
  await h.api().runDeadline(wake);
  const restored=ingress(h).find(([,e])=>e.sequence===original.sequence)[1];assert.deepEqual(restored.context,original.context);assert.equal(restored.response.ok,true);
  assert.equal(ingress(h).length,1,'busy bot ownership cannot suppress recovery or fabricate another input');
  assert.equal(restored.context.now,6000);assert.equal(h.store.export().find(([key])=>key==='deadline/'+wake.taskId)[1].status,'complete');
});
test('a lost metadata claim ACK with no Control has a recovery probe without ingress zero',async()=>{
  const h=harness({bots:true});h.store.loseAck(prefixPath);await assert.rejects(h.api().runBots('food-match'));
  assert.equal(ingress(h).length,0);assert.equal(h.store.export().some(([key])=>key==='foodIngressControl/food-match'),false);
  const wake=h.store.export().find(([key,j])=>key.startsWith('deadline/')&&j.sessionWriterRecovery&&j.status==='pending')[1];
  assert.equal(wake.ingressSequence,undefined);assert.equal((await h.api().runDeadline(wake)).status,'too-early');
  h.setNow(wake.endsAt);await h.api().runDeadline(wake);
  assert.ok(ingress(h).length>0);for(const [,entry] of ingress(h)){assert.ok(entry.sequence>0);assert.equal(entry.context.now,wake.endsAt);}
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+wake.taskId)[1].status,'complete');
});
test('an SDK metadata retry fences a superseded zero writer before Session or ingress commit',async()=>{
  const h=harness();let noticed;const replaced=new Promise(resolve=>{noticed=resolve;});
  h.store.setRetry('session/',records=>{
    const lease=records.get(prefixPath);assert.equal(lease.throughSequence,0);h.setNow(lease.expiresAt);
    records.set(prefixPath,{...lease,owner:'zero-writer-successor',expiresAt:h.getNow()+8000});noticed();
  });
  const pending=h.handle('issueRecovery',{matchId:'food-match',requestId:'metadata-writer-recovery',seatId:'seat-1'},'host');await replaced;
  await h.store.transaction(async tx=>{
    const lease=await tx.get(prefixPath),s=await tx.get('session/food-match');assert.equal(lease.owner,'zero-writer-successor');
    assert.equal(s.state.trace.length,0);assert.equal(ingress(h).length,0);tx.delete(prefixPath);
  });
  const result=await pending;assert.equal(result.ok,true);assert.equal(ingress(h)[0][1].context.now,14000);
});
for(const operation of ['abort','read','redeemRecovery'])test(`stale setup classification hands ${operation} to current Food ordering`,async()=>{
  const h=harness();let fields={matchId:'food-match'},uid=operation==='abort'?'host':'p1';
  if(operation==='abort')fields.requestId='late-setup-abort';
  if(operation==='redeemRecovery'){
    const issued=await h.handle('issueRecovery',{matchId:'food-match',seatId:'seat-1',requestId:'late-setup-issue'},'host');assert.equal(issued.ok,true);
    fields={...fields,requestId:'late-setup-redeem',recoveryCode:issued.result.recoveryCode};uid='replacement';
  }
  const live=await h.current();await h.store.transaction(async tx=>tx.set('session/food-match',{...live,state:null,status:'lobby'}));
  const paused=h.store.pauseReadNext('session/food-match'),pending=h.handle(operation,fields,uid);await paused.reached;
  await h.store.transaction(async tx=>tx.set('session/food-match',live));h.store.loseAck('foodIngress/');assert.equal((await h.command('before-handoff')).ok,false);
  const admitted=ingress(h).find(([,e])=>e.request?.request?.commandId==='before-handoff')[1];
  paused.resume();const result=await pending;assert.equal(result.ok,true,JSON.stringify(result));
  const restored=ingress(h).find(([,e])=>e.sequence===admitted.sequence)[1];assert.deepEqual(restored.context,admitted.context);assert.equal(restored.response.result.receipt.status,'accepted');
  if(operation==='abort')assert.equal((await h.current()).status,'aborted');
  if(operation==='read')assert.equal(result.result.foodPlayerView.participantTask.ownGesture.currentHolder.sequence,1);
  if(operation==='redeemRecovery'){
    assert.equal((await h.current()).members.find(m=>m.seatId==='seat-1').uid,'replacement');
    assert.deepEqual(await h.handle(operation,fields,uid),result,'already-used token retry recovers before token/rate checks');
  }
  const genericRate=h.store.export().find(([key])=>key==='rate/'+hash(uid))[1];assert.equal(genericRate.count,1,'handoff does not rerun generic rate charging');
});
test('running Food admission-only reads retain their denied snapshot without a handoff loop',async()=>{
  const h=harness();await h.store.transaction(async tx=>{
    const s=await tx.get('session/food-match');s.admissions.push({id:'admission-1',requestId:'admission-request',uid:'waiting',kind:'player',displayName:'Waiting',approved:false});
    tx.set('session/food-match',s);
  });
  const result=await h.handle('read',{matchId:'food-match'},'waiting');assert.equal(result.ok,true);
  for(const field of ['publicView','playerView','foodPublicView','foodPlayerView'])assert.equal(result.result[field],null);
  assert.equal(result.result.admission.status,'closed');assert.equal(ingress(h).length,0);
});
test('concurrent prefix followers wait read-only behind one Session processor',async()=>{
  const h=harness(),paused=h.store.pauseNext(prefixPath),first=h.command('one-prefix-owner');await paused.reached;
  const start=h.store.attempts.length,reading=h.store.pauseReadNext(prefixPath);
  const followers=Array.from({length:6},()=>h.command('one-prefix-owner'));await reading.reached;
  assert.equal(h.store.attempts.slice(start).some(a=>!a.readOnly&&a.reads.includes('session/food-match')),false);
  reading.resume();paused.resume();const results=await Promise.all([first,...followers]);
  assert.ok(results.every(r=>r.ok));for(const r of results)assert.deepEqual(r,results[0]);
  const processors=h.store.attempts.filter(a=>a.commit&&!a.readOnly&&a.reads.includes('session/food-match'));
  assert.equal(processors.length,1);assert.equal(processors[0].prefixLease.throughSequence,1);
  assert.equal((await h.current()).state.trace.filter(c=>c.kind==='food').length,1);
  assert.equal(h.store.export().some(([key])=>key===prefixPath),false);
});
test('a higher target promptly claims after a lower target owner releases before expiry',{timeout:3000},async()=>{
  const h=harness(),paused=h.store.pauseNext(prefixPath),lower=h.command('prefix-low');await paused.reached;
  const reading=h.store.pauseReadNext(prefixPath),higher=h.command('prefix-high');await reading.reached;
  reading.resume();paused.resume();const [a,b]=await Promise.all([lower,higher]);assert.ok(a.ok&&b.ok);
  assert.equal(h.getNow(),6000,'no lease-expiry clock advance is needed to process the later target');
  const processors=h.store.attempts.filter(a=>a.commit&&!a.readOnly&&a.writes.includes('session/food-match'));
  assert.deepEqual(processors.map(a=>a.prefixLease.throughSequence),[1,2]);
  assert.notEqual(processors[0].prefixLease.owner,processors[1].prefixLease.owner);
});
test('a target committed between its RO probe and new lease claim returns without an unrelated Session lock',async()=>{
  const h=harness(),reading=h.store.pauseReadNext('foodIngress/'),original=h.command('committed-target');await reading.reached;
  const completed=await h.command('committed-target');assert.equal(completed.ok,true);
  h.store.blockSessionWrites(true);reading.resume();const result=await original;
  assert.deepEqual(result,completed);assert.equal(h.store.export().some(([key])=>key===prefixPath),false);
  assert.equal(h.store.export().filter(([key,j])=>key.startsWith('deadline/')&&j.ingressSequence===1&&j.status!=='complete').length,0);
});
test('lost prefix acquisition ACK keeps an early-gated expiry wake and recovers the original admitted context',async()=>{
  const h=harness();h.store.loseAck(prefixPath);assert.equal((await h.command('lost-prefix-claim')).ok,false);
  const admitted=ingress(h)[0][1],lease=h.store.export().find(([key])=>key===prefixPath)[1];
  assert.equal(admitted.response,null);assert.equal(lease.expiresAt,6000+FOOD_PREFIX_WORKER_LEASE_MS);
  const wake=h.store.export().find(([key])=>key==='deadline/'+lease.wakeTaskId)[1];
  assert.equal(wake.ingressSequence,admitted.sequence);assert.equal((await h.api().runDeadline(wake)).status,'too-early');
  assert.equal(ingress(h)[0][1].response,null);
  h.setNow(lease.expiresAt);await h.api().runDeadline(wake);
  const restored=ingress(h).find(([,e])=>e.sequence===admitted.sequence)[1];assert.deepEqual(restored.context,admitted.context);
  assert.equal(restored.response.result.receipt.receivedAt,6000);
  assert.equal((await h.current()).state.trace.filter(c=>c.kind==='food'&&c.request.commandId==='lost-prefix-claim').length,1);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+wake.taskId)[1].status,'complete');
  assert.equal((await h.api().runDeadline(wake)).status,'unchanged');
});
test('a stale prefix owner cannot release its successor or complete the successor expiry wake',async()=>{
  const h=harness(),committed=h.store.pauseNext('food-command/'),lower=h.command('prefix-old-owner');await committed.reached;
  const old=h.store.export().find(([key])=>key===prefixPath)[1];h.setNow(old.expiresAt);
  const acquired=h.store.pauseNext(prefixPath),higher=h.command('prefix-successor');await acquired.reached;
  const successor=h.store.export().find(([key])=>key===prefixPath)[1];assert.notEqual(successor.owner,old.owner);
  committed.resume();assert.equal((await lower).ok,true);
  assert.deepEqual(h.store.export().find(([key])=>key===prefixPath)[1],successor);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+successor.wakeTaskId)[1].status,'pending');
  acquired.resume();assert.equal((await higher).ok,true);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+successor.wakeTaskId)[1].status,'complete');
});
test('an SDK processing retry fences a superseded prefix owner before any committed engine effect',async()=>{
  const h=harness();let noticed;const replaced=new Promise(resolve=>{noticed=resolve;});
  h.store.setRetry('session/',records=>{
    const old=records.get(prefixPath);h.setNow(old.expiresAt);
    records.set(prefixPath,{...old,owner:'superseding-prefix-owner',expiresAt:h.getNow()+FOOD_PREFIX_WORKER_LEASE_MS});noticed();
  });
  const pending=h.command('prefix-sdk-fence');await replaced;
  await h.store.transaction(async tx=>{
    const s=await tx.get('session/food-match'),lease=await tx.get(prefixPath);
    assert.equal(s.state.trace.some(c=>c.kind==='food'),false);assert.equal(lease.owner,'superseding-prefix-owner');
    tx.delete(prefixPath); // The simulated successor releases; the real caller may then claim again.
  });
  const result=await pending;assert.equal(result.ok,true);assert.equal(result.result.receipt.receivedAt,6000);
  assert.equal((await h.current()).state.trace.filter(c=>c.kind==='food').length,1);
});
test('a refreshed prefix lease preserves its original wake and the admitted input time',async()=>{
  const h=harness(),acquired=h.store.pauseNext(prefixPath),pending=h.command('prefix-refreshed');await acquired.reached;
  const first=h.store.export().find(([key])=>key===prefixPath)[1],wake=h.store.export().find(([key])=>key==='deadline/'+first.wakeTaskId)[1];
  h.setNow(6000+FOOD_PREFIX_WORKER_LEASE_MS/2+1);
  const refreshed=h.store.pauseNext(prefixPath);acquired.resume();await refreshed.reached;
  const current=h.store.export().find(([key])=>key===prefixPath)[1];assert.ok(current.expiresAt>first.expiresAt);
  assert.equal(current.wakeTaskId,first.wakeTaskId);assert.deepEqual(h.store.export().find(([key])=>key==='deadline/'+first.wakeTaskId)[1],wake);
  h.setNow(first.expiresAt);const reading=h.store.pauseReadNext(prefixPath),delivery=h.api().runDeadline(wake);await reading.reached;
  reading.resume();refreshed.resume();assert.equal((await pending).ok,true);await delivery;
  const restored=ingress(h).find(([,e])=>e.request?.request?.commandId==='prefix-refreshed')[1];
  assert.equal(restored.context.now,6000);assert.equal(restored.response.result.receipt.receivedAt,6000);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+first.wakeTaskId)[1].status,'complete');
});
test('refresh ACK loss yields the prefix lease while retaining a pending target recovery wake',async()=>{
  const h=harness(),acquired=h.store.pauseNext(prefixPath),pending=h.command('prefix-refresh-ack');await acquired.reached;
  const lease=h.store.export().find(([key])=>key===prefixPath)[1],wake=h.store.export().find(([key])=>key==='deadline/'+lease.wakeTaskId)[1];
  h.setNow(6000+FOOD_PREFIX_WORKER_LEASE_MS/2+1);h.store.loseAck(prefixPath);acquired.resume();
  assert.equal((await pending).ok,false);assert.equal(h.store.export().some(([key])=>key===prefixPath),false);
  assert.equal(ingress(h)[0][1].response,null);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+wake.taskId)[1].status,'pending');
  h.setNow(wake.endsAt);await h.api().runDeadline(wake);
  assert.equal(ingress(h).find(([,e])=>e.request?.request?.commandId==='prefix-refresh-ack')[1].response.result.receipt.receivedAt,6000);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+wake.taskId)[1].status,'complete');
});
test('concurrent session triggers coalesce behind one driver without busy writes',async()=>{
  const h=harness({bots:true}),paused=h.store.pauseNext('foodBotWorker/');
  const first=h.api().runBots('food-match');await paused.reached;
  const before=h.store.export();
  const followers=await Promise.all(Array.from({length:20},()=>h.api().runBots('food-match')));
  assert.ok(followers.every(r=>r.accepted===0));assert.deepEqual(h.store.export(),before);
  paused.resume();await first;
  const downs=(await h.current()).state.trace.filter(c=>c.kind==='food'&&c.request.command.input?.edge==='DOWN');
  assert.equal(downs.length,1);assert.equal(h.store.export().some(([key])=>key===workerPath),false);
});
for(const prefix of ['foodIngress/','foodBotIntent/'])test(`expired owner is fenced inside ${prefix} admission and cannot release its successor`,async()=>{
  const h=harness({bots:true});
  h.store.setRetry(prefix,records=>{
    h.setNow(6000+FOOD_BOT_WORKER_LEASE_MS);
    records.set(workerPath,{owner:'successor',expiresAt:h.getNow()+FOOD_BOT_WORKER_LEASE_MS});
  });
  await h.api().runBots('food-match');
  assert.equal((await h.current()).state.trace.some(c=>c.kind==='food'),false);
  assert.equal(h.store.export().find(([key])=>key===workerPath)[1].owner,'successor');
  assert.equal(ingress(h).length,prefix==='foodIngress/'?0:1,'only an already-admitted CLOCK may remain');
});
test('a paused owner recovers at its durable expiry and preserves a committed bot input time once',async()=>{
  const h=harness({bots:true}),paused=h.store.pauseNext('foodBotIntent/');
  const old=h.api().runBots('food-match');await paused.reached;
  const pending=ingress(h).find(([,e])=>e.botIntentPath)[1];assert.equal(pending.context.now,6000);assert.equal(pending.response,null);
  const expiry=6000+FOOD_BOT_WORKER_LEASE_MS;h.setNow(expiry);
  const s=await h.current();await h.api().runDeadline(workerJob(s));
  paused.resume();await old;
  const downs=(await h.current()).state.trace.filter(c=>c.kind==='food'&&c.request.command.input?.edge==='DOWN');
  assert.equal(downs.length,1);assert.equal(downs[0].context.now,6000);
  const admitted=ingress(h).find(([,e])=>e.sequence===pending.sequence)[1];
  assert.deepEqual(admitted.context,pending.context);assert.equal(admitted.response.result.receipt.receivedAt,6000);
});
test('lease expiry has a durable wake even when no bot input was admitted before a pause',async()=>{
  const h=harness({bots:true}),paused=h.store.pauseNext('foodBotWorker/');
  const old=h.api().runBots('food-match');await paused.reached;
  const before=await h.current();assert.equal(before.foodService.scheduler.endsAt,6000+FOOD_BOT_WORKER_LEASE_MS);
  h.setNow(before.foodService.scheduler.endsAt);await h.api().runDeadline(workerJob(before));
  paused.resume();await old;
  const down=(await h.current()).state.trace.find(c=>c.kind==='food'&&c.request.command.input?.edge==='DOWN');
  assert.equal(down.context.now,6000+FOOD_BOT_WORKER_LEASE_MS);
});
test('a racing live owner atomically coalesces a bot-only job instead of minting another CLOCK',async()=>{
  const h=harness({bots:true});assert.equal((await h.handle('read',{matchId:'food-match'})).ok,true);
  const before=await h.current(),count=ingress(h).length;assert.equal(before.foodService.scheduler.endsAt,6000);
  h.store.setRetry('foodIngress/',records=>records.set(workerPath,{owner:'racing-owner',expiresAt:6000+FOOD_BOT_WORKER_LEASE_MS}));
  await h.api().runDeadline(workerJob(before));
  assert.equal(ingress(h).length,count);
  const after=await h.current();assert.equal(after.foodService.scheduler.endsAt,6000+FOOD_BOT_WORKER_LEASE_MS);
  const oldJob='deadline/'+hash([before.matchId,before.foodService.scheduler.phaseId,before.foodService.scheduler.token]);
  assert.equal(h.store.export().find(([key])=>key===oldJob)[1].status,'complete');
  const next='deadline/'+hash([after.matchId,after.foodService.scheduler.phaseId,after.foodService.scheduler.token]);
  assert.notEqual(next,oldJob);assert.equal(h.store.export().find(([key])=>key===next)[1].status,'pending');
});
test('a live bot owner never coalesces a human presence expiry and does not lose its recovery wake',async()=>{
  const h=harness({presence:true});
  await h.store.transaction(tx=>{tx.set(workerPath,{owner:'busy-owner',expiresAt:6000+FOOD_BOT_WORKER_LEASE_MS});return Promise.resolve();});
  assert.equal((await h.handle('read',{matchId:'food-match'})).ok,true);
  const before=await h.current();assert.equal(before.foodService.scheduler.endsAt,8000);
  h.setNow(8000);await h.api().runDeadline(workerJob(before));
  assert.ok((await h.current()).state.trace.some(c=>c.kind==='presence'&&c.context.now===8000&&!c.online));
  const after=await h.current();assert.equal(after.foodService.scheduler.endsAt,6000+FOOD_BOT_WORKER_LEASE_MS);
});
test('host abort stops an active owner without scheduling a bot expiry in the aborted match',async()=>{
  const h=harness({bots:true}),paused=h.store.pauseNext(prefixPath,2);
  const old=h.api().runBots('food-match');await paused.reached;
  const aborted=await h.handle('abort',{matchId:'food-match',requestId:'abort-busy-owner'},'host');assert.equal(aborted.ok,true);
  assert.equal((await h.current()).foodService.scheduler,null);
  paused.resume();await old;
  assert.equal((await h.current()).status,'aborted');assert.equal((await h.current()).foodService.scheduler,null);
  assert.equal((await h.current()).state.trace.some(c=>c.kind==='food'),false);
  assert.equal(h.store.export().some(([key])=>key===workerPath),false);
});
test('a stop racing the initial work probe prevents a new lease claim',async()=>{
  const h=harness({bots:true});
  h.store.setRetry('foodBotWorker/',records=>{
    const s=records.get('session/food-match');s.status='aborted';
    s.state.phase={id:'abort-phase',kind:'ABORTED',startedAt:6000,endsAt:null};records.set('session/food-match',s);
  });
  assert.deepEqual(await h.api().runBots('food-match'),{accepted:0});
  assert.equal(h.store.export().some(([key])=>key===workerPath),false);assert.equal(ingress(h).length,0);
});
test('worker ownership, concurrent admission and prefix processing all read the session first',async()=>{
  const h=harness({bots:true}),paused=h.store.pauseNext(prefixPath,2);
  const owner=h.api().runBots('food-match');await paused.reached;
  await Promise.all([h.api().runBots('food-match'),h.handle('read',{matchId:'food-match'})]);
  h.setNow(10500);paused.resume();await owner;
  const multi=h.store.attempts.filter(a=>a.reads.includes('session/food-match')&&a.reads.some(key=>
    key.startsWith('foodIngressControl/')||key.startsWith('foodIngress/')||key.startsWith('foodBotWorker/')));
  assert.ok(multi.length>5);
  assert.ok(multi.some(a=>a.reads.some(key=>key.startsWith('foodIngress/'))),'actual processing is traced');
  assert.ok(multi.filter(a=>a.writes.includes(workerPath)).length>=3,'acquire, refresh and release are traced');
  for(const a of multi)assert.equal(a.reads[0],'session/food-match',JSON.stringify(a.reads));
});
test('eligible nonparticipant snapshots skip ingress and session writes with one actual clock',async()=>{
  const h=harness({bots:true});assert.equal((await h.handle('read',{matchId:'food-match'})).ok,true);
  const before=await h.current(),entries=ingress(h).length,start=h.store.attempts.length;
  const controlBefore=h.store.export().find(([key])=>key==='foodIngressControl/food-match')[1];
  h.setNow(6500);const result=await h.handle('read',{matchId:'food-match'});assert.equal(result.ok,true);
  assert.deepEqual(result.result.foodPublicView,h.engine.projectPlanetFoodPublic(before.state,6500));
  assert.deepEqual(result.result.foodPlayerView,h.engine.projectPlanetFoodPlayer(before.state,'seat-1',6500));
  assert.equal(result.serverTimeMs,6500);assert.equal(result.result.foodPublicView.serverNowMs,6500);
  assert.equal(result.result.foodPlayerView.serverNowMs,6500);
  const writes=h.store.attempts.slice(start).filter(a=>a.commit).flatMap(a=>a.writes);
  assert.ok(writes.length>0);assert.ok(writes.every(key=>key.startsWith('foodTransportRate/')||key==='foodIngressControl/food-match'));
  assert.equal(ingress(h).length,entries);assert.deepEqual(await h.current(),before);
  const after=h.store.export().find(([key])=>key==='foodIngressControl/food-match')[1];
  assert.equal(after.nextSequence,controlBefore.nextSequence);assert.equal(after.processedSequence,controlBefore.processedSequence);
  assert.equal(after.lastAdmittedAt,6500);assert.equal(after.advancedThroughAt,6500);
});
test('an eligible own snapshot renews private contact metadata without a Session lock or publication',async()=>{
  const h=harness();assert.equal((await h.handle('read',{matchId:'food-match'})).ok,true);
  const before=await h.current(),entries=ingress(h).length,start=h.store.attempts.length;
  h.setNow(6500);const result=await h.handle('read',{matchId:'food-match'});assert.equal(result.ok,true);
  const after=await h.current();assert.deepEqual(after,before);
  const contact=h.store.export().find(([key])=>key==='foodContact/food-match')[1]['seat-1'];
  assert.deepEqual(contact,{taskId:'task-2',bindingRevision:1,admittedAt:6500,expiresAt:8500});
  const stages=h.store.attempts.slice(start).filter(a=>a.commit&&a.writes.length>0);
  assert.ok(stages.length>0);for(const a of stages){assert.equal(a.reads.includes('session/food-match'),false);
    assert.equal(a.writes.includes('session/food-match'),false);assert.equal(a.reads[0],'foodIngressControl/food-match');}
  assert.equal(ingress(h).length,entries);assert.equal(result.result.foodPlayerView.serverNowMs,result.serverTimeMs);
});
test('the prior durable expiry wake hydrates contacts and rearms their later exact absence boundary',async()=>{
  const h=harness({presence:true});await h.handle('read',{matchId:'food-match'});
  const oldWake=h.store.export().find(([key,j])=>key.startsWith('deadline/')&&j.endsAt===8000&&j.status!=='complete')[1];
  h.setNow(6500);await h.handle('read',{matchId:'food-match'});
  h.setNow(6750);await h.handle('read',{matchId:'food-match'},'p2');
  h.setNow(7750);await h.handle('read',{matchId:'food-match'});
  h.setNow(8250);await h.handle('read',{matchId:'food-match'});
  assert.equal((await h.current()).foodService.leases['seat-1'].expiresAt,8000,'Session remains a cached lease baseline');
  assert.equal(h.store.export().find(([key])=>key==='foodContact/food-match')[1]['seat-1'].expiresAt,10250,
    'repeated live contacts continue beyond the original cached expiry');
  await h.api().runDeadline(oldWake);
  const renewed=await h.current();assert.equal(renewed.state.trace.some(c=>c.kind==='presence'&&!c.online),false);
  assert.equal(renewed.foodService.leases['seat-1'].expiresAt,10250);assert.equal(renewed.foodService.leases['seat-2'].expiresAt,8750);
  const next=h.store.export().find(([key,j])=>key.startsWith('deadline/')&&j.endsAt===8750&&j.status!=='complete')[1];
  h.setNow(8750);await h.api().runDeadline(next);
  assert.deepEqual((await h.current()).state.trace.filter(c=>c.kind==='presence'&&!c.online).map(c=>[c.actor,c.context.now]),[['seat-2',8750]]);
});
test('a captured fast snapshot is fenced when recovery changes its owner before renewal',async()=>{
  const h=harness();await h.handle('read',{matchId:'food-match'});h.setNow(6500);
  const paused=h.store.pauseReadNext('foodIngressControl/food-match'),old=h.handle('read',{matchId:'food-match'});await paused.reached;
  const issued=await h.handle('issueRecovery',{matchId:'food-match',seatId:'seat-1',requestId:'read-recover-issue'},'host');
  assert.equal(issued.ok,true);
  assert.equal((await h.handle('redeemRecovery',{matchId:'food-match',requestId:'read-recover-redeem',recoveryCode:issued.result.recoveryCode},'replacement')).ok,true);
  paused.resume();const denied=await old;assert.equal(denied.ok,false);assert.equal(denied.error.code,'FORBIDDEN');
  assert.equal(Object.hasOwn(denied,'result'),false);
  assert.equal((await h.handle('read',{matchId:'food-match'},'replacement')).ok,true);
});
test('coalescing the old presence wake under a live worker rearms the effective contact expiry',async()=>{
  const h=harness({presence:true});await h.handle('read',{matchId:'food-match'});
  const oldWake=h.store.export().find(([key,j])=>key.startsWith('deadline/')&&j.endsAt===8000&&j.status!=='complete')[1];
  h.setNow(6500);await h.handle('read',{matchId:'food-match'});
  h.setNow(6750);await h.handle('read',{matchId:'food-match'},'p2');
  await h.store.transaction(async tx=>tx.set(workerPath,{owner:'contact-owner',expiresAt:14000}));
  const entries=ingress(h).length;h.setNow(8000);await h.api().runDeadline(oldWake);
  assert.equal(ingress(h).length,entries,'no redundant CLOCK is minted for the now-extended expiry');
  assert.equal((await h.current()).state.trace.some(c=>c.kind==='presence'&&!c.online),false);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+oldWake.taskId)[1].status,'complete');
  assert.equal((await h.current()).foodService.scheduler.endsAt,8500);
  assert.ok(h.store.export().some(([key,j])=>key.startsWith('deadline/')&&j.status!=='complete'&&j.endsAt===8500));
});
test('invalid contact metadata fails closed without spending snapshot rate or moving Control',async()=>{
  const h=harness();await h.handle('read',{matchId:'food-match'});const before=h.store.export();
  await h.store.transaction(async tx=>tx.set('foodContact/food-match',{'seat-1':{taskId:'task-2',bindingRevision:1,admittedAt:6500,expiresAt:9000}}));
  h.setNow(6500);const result=await h.handle('read',{matchId:'food-match'});assert.equal(result.ok,false);
  for(const namespace of ['foodIngressControl/','foodTransportRate/'])assert.deepEqual(h.store.export().filter(([k])=>k.startsWith(namespace)),before.filter(([k])=>k.startsWith(namespace)));
});
test('pending and due work falls back without charging the fast probe or skipping its original input',async()=>{
  const h=harness();h.store.loseAck('foodIngress/');assert.equal((await h.command()).ok,false);
  h.setNow(6500);const result=await h.handle('read',{matchId:'food-match'});assert.equal(result.ok,true);
  const entries=ingress(h).map(([,entry])=>entry);assert.equal(entries.length,2);
  assert.equal(entries[0].response.result.receipt.receivedAt,6000);
  const trace=(await h.current()).state.trace;
  assert.ok(trace.some(c=>c.kind==='food'&&c.context.now===6000));
  assert.ok(trace.some(c=>c.kind==='boundary'&&c.context.now===6450));
  const budget=h.store.export().find(([key])=>key==='foodTransportRate/'+hash(['p1','snapshot']))[1];assert.equal(budget.count,1);
});
test('engine, presence and own reconnect boundaries keep the ordered read path',async()=>{
  const h=harness({presence:true});await h.handle('read',{matchId:'food-match'});
  h.setNow(8000);await h.handle('read',{matchId:'food-match'},'host');
  assert.ok((await h.current()).state.trace.some(c=>c.kind==='presence'&&!c.online&&c.context.now===8000));
  const before=ingress(h).length;h.setNow(9000);
  assert.equal((await h.handle('read',{matchId:'food-match'})).ok,true);assert.equal(ingress(h).length,before+1);
  assert.ok((await h.current()).state.trace.some(c=>c.kind==='presence'&&c.online&&c.context.now===9000));
  const other=harness({bots:true});await other.handle('read',{matchId:'food-match'});other.setNow(31000);
  assert.equal((await other.handle('read',{matchId:'food-match'})).ok,true);
  assert.equal(ingress(other).length,2);assert.equal((await other.current()).state.task.outcome.reason,'TIME');
});
test('historical snapshots keep their old payload and rate bucket',async()=>{
  const h=harness();await h.store.transaction(async tx=>{
    const s=await tx.get('session/food-match');s.versions={...PLANET_BLACKOUT_PINS,assetManifestVersion:versions.assetManifestVersion};
    s.state.versions=s.versions;s.state.phase={id:'historical-phase',kind:'PRE_TURN',startedAt:1000,endsAt:16000};
    tx.set('session/food-match',s);tx.set('rate/'+hash('p1'),{since:6000,count:119});
  });
  const first=await h.handle('read',{matchId:'food-match'});assert.equal(first.ok,true);
  assert.equal(Object.hasOwn(first.result,'foodPublicView'),false);assert.equal(Object.hasOwn(first.result,'foodPlayerView'),false);
  assert.equal((await h.handle('read',{matchId:'food-match'})).error.code,'RATE_LIMITED');
  assert.equal(ingress(h).length,0);assert.equal(h.store.export().some(([key])=>key.startsWith('foodTransportRate/')),false);
});
test('optional read-only port handles only pure Food lookups while fast reads and authority remain read-write',async()=>{
  const h=harness({bots:true}),modes=[],transaction=h.store.transaction.bind(h.store);
  h.store.readOnly=operation=>transaction(async tx=>{
    const reads=[];modes.push({mode:'readOnly',reads});
    return operation(Object.freeze({get:async key=>{reads.push(key);return tx.get(key);}}));
  });
  h.store.transaction=operation=>transaction(async tx=>{
    const reads=[];modes.push({mode:'readWrite',reads});
    return operation({...tx,get:async key=>{reads.push(key);return tx.get(key);}});
  });
  h.restart();assert.equal((await h.command()).ok,true);
  assert.equal((await h.handle('foodReceipt',{matchId:'food-match',commandId:'input-1'})).ok,true);
  assert.ok(modes.some(m=>m.mode==='readOnly'&&m.reads.some(key=>key.startsWith('food-command/'))));
  assert.ok(modes.some(m=>m.mode==='readOnly'&&m.reads.length===1&&m.reads[0].startsWith('foodIngress/')));
  assert.ok(modes.some(m=>m.mode==='readWrite'&&m.reads.includes('foodIngressControl/food-match')));
  const start=modes.length;h.setNow(6500);assert.equal((await h.handle('read',{matchId:'food-match'})).ok,true);
  assert.ok(modes.slice(start).some(m=>m.mode==='readWrite'&&m.reads.includes('foodIngressControl/food-match')));
  assert.ok(modes.slice(start).some(m=>m.mode==='readOnly'&&m.reads[0]==='session/food-match'));
});
test('Food setup classification stays on the candidate path without creating legacy bot context',async()=>{
  const h=harness();await h.store.transaction(async tx=>{
    const s=await tx.get('session/food-match');s.state=null;s.status='reading';tx.set('session/food-match',s);
  });
  const before=h.draws();assert.deepEqual(await h.api().runBots('food-match'),{accepted:0});assert.equal(h.draws(),before);
});
for(const kind of ['UP','PANEL_LOCK'])test(`fresh bot ${kind} is rechecked when an SDK admission retry moves beyond its policy window`,async()=>{
  const h=harness({bots:true});
  await h.store.transaction(async tx=>{
    const s=await tx.get('session/food-match'),t=s.state.task;
    Object.assign(t.crate,{state:'HELD',holder:'WINCH',height:Y.raised,motion:null});
    Object.assign(t.ownGesture,{highestSequence:1,recoveryRevision:1,currentHolder:{sequence:1,crateId:t.crate.id},pendingIntent:null});
    Object.assign(t.panel,{locked:kind==='UP',stop:kind==='UP'?5:0,anchorAt:6000,
      swing:kind==='UP'?{startedAt:6000,amplitude:.9,direction:1}:null});
    tx.set('session/food-match',s);
  });
  const seat=kind==='UP'?'seat-2':'seat-3';
  const decision=async at=>chooseFoodBotInput(h.engine.projectPlanetFoodPlayer((await h.current()).state,seat,at));
  let at=(await decision(6000)).nextWakeAt;assert.ok(at>6000);h.setNow(at);
  const planned=(await decision(at)).command;assert.equal(planned.input.kind,kind==='UP'?'HOLD':'PANEL_LOCK');
  if(kind==='UP')assert.equal(planned.input.edge,'UP');
  let late=at+(kind==='PANEL_LOCK'?250:200);
  while(late<at+1300&&(await decision(late)).command!==null)late+=10;
  assert.equal((await decision(late)).command,null);
  h.store.setRetry('foodBotIntent/',()=>h.setNow(late));
  const stale=await h.api().runBots('food-match');assert.equal(stale.accepted,0,'refresh is not an accepted input');
  const presses=()=>h.store.export().filter(([key,e])=>key.startsWith('foodIngress/')&&e.request?.operation==='foodCommand');
  assert.equal(presses().length,0,'the failed speculative attempt minted no bot input or receipt');
  assert.equal((await h.current()).state.trace.some(c=>c.kind==='food'),false);
  const later=(await decision(h.getNow())).nextWakeAt;assert.ok(later>h.getNow());h.setNow(later);
  await h.api().runBots('food-match');
  const applied=presses().find(([,e])=>e.request.request.command.input.kind===(kind==='UP'?'HOLD':'PANEL_LOCK'))?.[1];
  assert.ok(applied);assert.equal(applied.context.now,later);assert.equal(applied.response.result.receipt.receivedAt,later);
  assert.equal(applied.response.result.receipt.status,'accepted');
});
for(const count of [7,8,9])test(`${count}: a planned bot Panel Lock admitted200ms later still locks the actual safe goal`,async()=>{
  const h=harness({bots:true,count});await h.store.transaction(async tx=>{
    const s=await tx.get('session/food-match'),t=s.state.task;
    Object.assign(t.crate,{state:'HELD',holder:'WINCH',height:Y.raised,motion:null});
    Object.assign(t.ownGesture,{highestSequence:1,recoveryRevision:1,currentHolder:{sequence:1,crateId:t.crate.id},pendingIntent:null});
    Object.assign(t.panel,{locked:false,stop:0,direction:1,anchorAt:6000,swing:null});tx.set('session/food-match',s);
  });
  h.setNow(7000);h.store.setRetry('foodBotIntent/',records=>{
    h.setNow(7200);assert.equal(chooseFoodBotInput(h.engine.projectPlanetFoodPlayer(records.get('session/food-match').state,'seat-3',7200)).command,null);
  });
  await h.api().runBots('food-match');
  const entry=ingress(h).find(([,e])=>e.request?.request?.command?.input?.kind==='PANEL_LOCK')[1];
  assert.equal(entry.context.now,7200);assert.equal(entry.response.result.receipt.receivedAt,7200);assert.equal(entry.response.result.receipt.status,'accepted');
  assert.equal((await h.current()).state.task.panel.stop,5);
});
for(const successor of ['same','different'])test(`a captured old owner cannot receive a successor's ${successor} seat-scoped receipt`,async()=>{
  const h=harness({asking:true}),request={schemaVersion:1,protocolVersion:3,matchId:'food-match',commandId:'shared-recovery-canary',
    phaseId:'food-phase',foodStepId:'food-step-2',round:1,command:{type:'TASK_ASK',partnerSeatId:'seat-2'}};
  const paused=h.store.pauseReadNext('session/food-match');
  const old=h.handle('foodCommand',{request});await paused.reached;
  const issued=await h.handle('issueRecovery',{matchId:'food-match',seatId:'seat-1',requestId:'issue-canary'},'host');assert.equal(issued.ok,true);
  const recovered=await h.handle('redeemRecovery',{matchId:'food-match',requestId:'redeem-canary',recoveryCode:issued.result.recoveryCode},'replacement');assert.equal(recovered.ok,true);
  const nextRequest=successor==='same'?request:{...request,command:{type:'TASK_ASK',partnerSeatId:'seat-3'}};
  const next=await h.handle('foodCommand',{request:nextRequest},'replacement');assert.equal(next.ok,true);
  const canary=next.result.receipt.result.requestId;assert.ok(canary);
  paused.resume();const denied=await old;
  assert.equal(denied.ok,false);assert.equal(denied.error.code,'FORBIDDEN');
  assert.equal(JSON.stringify(denied).includes(canary),false);assert.equal(Object.hasOwn(denied,'result'),false);
  const own=await h.handle('foodReceipt',{matchId:'food-match',commandId:request.commandId},'replacement');
  assert.deepEqual(own.result.receipt,next.result.receipt);
});
test('detached human admission has no Session lock/publication and its lost-ACK wake survives a changed phase',async()=>{
  const h=harness(),paused=h.store.pauseReadNext('session/food-match');
  const old=h.command('late-human-ingress');await paused.reached;
  h.setNow(33500);assert.equal((await h.handle('advance',{matchId:'food-match'},'host')).ok,true);
  const before=await h.current(),start=h.store.attempts.length;assert.equal(before.state.phase.kind,'PRE_TURN');
  h.store.loseAck('foodIngress/');paused.resume();assert.equal((await old).ok,false);
  assert.deepEqual(await h.current(),before,'admission itself does not publish or modify Session');
  const admitted=ingress(h).find(([,e])=>e.request?.request?.commandId==='late-human-ingress')[1];
  assert.equal(admitted.context.now,33500);assert.equal(admitted.response,null);
  const stage=h.store.attempts.slice(start).find(a=>a.commit&&a.writes.some(k=>k.startsWith('foodIngress/')));
  assert.equal(stage.reads[0],'foodIngressControl/food-match');
  assert.equal(stage.reads.includes('session/food-match'),false);assert.equal(stage.writes.includes('session/food-match'),false);
  const wake=h.store.export().find(([key,j])=>key.startsWith('deadline/')&&j.ingressSequence===admitted.sequence)[1];
  assert.notEqual(wake.phaseId,before.state.phase.id);assert.equal(wake.status,'pending');
  assert.equal(wake.deadlineToken,admitted.job.deadlineToken);
  const result=await h.api().runDeadline({matchId:wake.matchId,phaseId:wake.phaseId,deadlineToken:wake.deadlineToken,kind:'game'});
  assert.equal(result.status,'advanced');
  const restored=ingress(h).find(([,e])=>e.sequence===admitted.sequence)[1];
  assert.deepEqual(restored.context,admitted.context);assert.equal(restored.response.result.receipt.receivedAt,33500);
  assert.equal(restored.response.result.receipt.code,'PHASE_CLOSED');
  assert.deepEqual((await h.current()).foodService.scheduler,before.foodService.scheduler);
  assert.equal(h.store.export().find(([key])=>key==='deadline/'+wake.taskId)[1].status,'complete');
  assert.equal((await h.api().runDeadline({matchId:wake.matchId,phaseId:wake.phaseId,deadlineToken:wake.deadlineToken,kind:'game'})).status,'unchanged');
});
