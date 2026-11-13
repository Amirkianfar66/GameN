import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PLANET_FOOD_TASK_PINS,PLANET_FOOD_TASK_ENGINE_PROFILE,PLANET_BLACKOUT_PINS,FOOD_TASK_VERTICAL as Y,
  PlanetSessionSnapshotSchema,FoodTaskPlayerViewSchema,FoodTaskPublicViewSchema} from '@mothership/contracts';
import {createPlanetGame,projectPlanetPublic,projectPlanetPlayer} from '@mothership/engine';
import {createPlanetService} from '../dist/planet-game.js';
import {FOOD_BOT_WORKER_LEASE_MS} from '../dist/planet-food-service.js';
import {chooseFoodBotInput} from '../dist/food-bot-policy.js';
const clone=v=>structuredClone(v),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fixture=JSON.parse(readFileSync(new URL('./fixtures/food-views.json',import.meta.url),'utf8'))['task-winch-initial'];
const versions={...PLANET_FOOD_TASK_PINS,assetManifestVersion:'food-service-fixture'};
const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'];

/** Retry/lost-ACK fake, not a claim of Firestore emulator coverage. Hooks target actual write namespaces. */
function memory(seed){
  let records=new Map(clone(seed)),tail=Promise.resolve(),retry=null,lost=null,hold=null;
  const attempts=[];
  const store={attempts,export:()=>clone([...records]),setRetry:(prefix,mutate)=>{retry={prefix,mutate};},
    loseAck:prefix=>{lost=prefix;},
    pauseNext(prefix){
      let entered,resume;const reached=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{resume=resolve;});
      hold={prefix,entered,gate};return {reached,resume};
    },
    listKeys:async(namespace,limit)=>[...records].filter(([k,v])=>k.startsWith(namespace+'/')&&(namespace!=='deadline'||v.status!=='complete')).slice(0,limit).map(([k])=>k),
    transaction(operation){
      const run=async()=>{
        const attempt=async(commit)=>{
          const draft=new Map(clone([...records])),writes=[];
          const tx={get:async key=>clone(draft.get(key)??null),set:(key,value)=>{draft.set(key,clone(value));writes.push(key);},delete:key=>{draft.delete(key);writes.push(key);}};
          const result=await operation(tx);attempts.push({commit,writes});
          return {result,draft,writes};
        };
        const first=await attempt(false);
        let selected=first;
        if(retry&&first.writes.some(k=>k.startsWith(retry.prefix))){const r=retry;retry=null;r.mutate?.(records);selected=await attempt(true);}
        else attempts.at(-1).commit=true;
        records=selected.draft;
        if(lost&&selected.writes.some(k=>k.startsWith(lost))){lost=null;throw new Error('Synthetic committed ACK loss');}
        let gate=null;
        if(hold&&selected.writes.some(k=>k.startsWith(hold.prefix))){const paused=hold;hold=null;gate=paused.gate;paused.entered();}
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
test('processing ACK loss preserves its receipt and effect',async()=>{
  const h=harness();h.store.loseAck('food-command/');const first=await h.command();assert.equal(first.ok,false);
  h.setNow(9000);const draws=h.draws();const result=await h.command();assert.equal(result.ok,true);
  assert.equal(result.result.receipt.receivedAt,6000);assert.equal(h.draws(),draws);
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
const ingress=h=>h.store.export().filter(([path])=>path.startsWith('foodIngress/'));
const workerJob=s=>({matchId:s.matchId,phaseId:s.foodService.scheduler.phaseId,deadlineToken:s.foodService.scheduler.token,kind:'game'});
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
  const h=harness({bots:true}),paused=h.store.pauseNext('foodBotWorker/');
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
