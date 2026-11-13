// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Full native app on explicitly synthetic, typed candidate-engine packets.
import {mountPlanetApp} from '../../../hosted/planet/app.mjs';
import {FoodTaskCommandRequestSchema} from '@mothership/contracts';
import fixtures from './native-fixtures.json';
const q=new URL(location.href).searchParams,entry=fixtures.cases.find(c=>c.id===q.get('case'))??fixtures.cases[0],copy=v=>structuredClone(v),config=entry.native;
let record=copy(config.initial),uid='food-native-app',lost=false,holdCommands=false,readHold=false,finishRefusal=null,fixtureCommandId=null;
const sent=[],lookups=[],receipts=new Map(),clock={now:()=>record.now},ports={clock,scheduler:{setTimeout:(f,ms)=>setTimeout(f,ms),clearTimeout:h=>clearTimeout(h)},ids:{next:()=>{const id=fixtureCommandId;fixtureCommandId=null;return id??crypto.randomUUID();}},unresolved:memory()};
function memory(){let value=null;return {load:()=>value,save:v=>{value=v;},clear:()=>{value=null;}};}
const foodStore=memory(),stores={resume:memory(),requests:memory(),rolePrivacy:memory(),food:()=>foodStore};
function reply(request,status='accepted'){
 const {command,...context}=request,c=command;
 if(status==='rejected')return {...context,status,receivedAt:record.now,code:config.replyClosure?'REQUEST_CLOSED':'NOT_ALLOWED',requestClosure:config.replyClosure??null};
 const result=c.type==='TASK_PRESS'?{kind:'INPUT',taskId:c.taskId,controlSessionId:c.controlSessionId,effect:c.input.kind==='HOLD'&&c.input.edge==='UP'?'GESTURE_CLOSED':c.input.kind==='HOLD_RECOVER_OFF'?'RECOVERED_CLOSED':'APPLIED',
  gestureSequence:c.input.kind==='HOLD'?c.input.gestureSequence:null,crateId:c.input.kind==='HOLD'?c.input.crateId:null,...(c.input.kind==='HOLD_RECOVER_OFF'?{closedThroughSequence:c.input.throughSequence}:{})}
  :{kind:'REQUEST',requestId:c.type==='TASK_ASK'?'review-new-request':c.requestId,requestRevision:c.type==='TASK_ASK'?0:c.requestRevision+1,state:c.type==='TASK_ASK'?'PENDING':c.type==='TASK_ASK_WITHDRAW'?'WITHDRAWN':c.answer==='JOIN'?'JOINED':'DECLINED'};
 return {...context,status,receivedAt:record.now,result};
}
const connection={mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(request){
 sent.push(copy(request));if(request.operation==='read'){if(readHold)return new Promise(()=>{});if(lost)return null;return {ok:true,serverTimeMs:record.now,result:copy(record.value)};}
 if(request.operation==='foodCommand'){
  if(config.pendingHold){
   const expected=request.request.command.input?.edge==='DOWN'?config.pendingHold.down:config.pendingHold.release;
   if(JSON.stringify(FoodTaskCommandRequestSchema.parse(request.request))!==JSON.stringify(FoodTaskCommandRequestSchema.parse(expected.request)))throw Error('Pending Hold must use the exact engine-processed original input');
   record=copy(request.request.command.input.edge==='DOWN'?config.pendingHold.admitted:config.pendingHold.off);
   receipts.set(request.request.commandId,copy(expected.receipt));return {ok:true,serverTimeMs:record.now,result:{receipt:copy(expected.receipt)}};
  }
  const receipt=reply(request.request,config.feedback==='refused'||config.replyClosure?'rejected':'accepted');receipts.set(request.request.commandId,receipt);
  if(holdCommands||config.feedback==='sending')return new Promise(()=>{});
  if(config.feedback==='refused')return new Promise(resolve=>{finishRefusal=()=>resolve({ok:true,serverTimeMs:record.now,result:{receipt:reply(request.request,'rejected')}});});
  if(lost||['unknown','lost'].includes(config.feedback))return null;
  return {ok:true,serverTimeMs:record.now,result:{receipt}};
 }
 if(request.operation==='foodReceipt'){lookups.push(copy(request));if(lost)return null;return {ok:true,serverTimeMs:record.now,result:{receipt:receipts.get(request.commandId)??null}};}
 return {ok:true,serverTimeMs:record.now,result:{}};
}};
localStorage.setItem('mothership:planet:presentation-preferences',JSON.stringify({textScale:Number(q.get('text')??1),reduced:q.get('motion')==='reduced'}));
const seedRelease=['lower'].includes(config.act),source=record.value.foodPlayerView,task=source?.participantTask;
if(seedRelease||q.get('abort')==='1'){
 const request={schemaVersion:1,protocolVersion:3,matchId:record.value.matchId,phaseId:source.phaseId,foodStepId:task.foodStepId,round:source.round,commandId:'review-recovered-release',
  command:{type:'TASK_PRESS',taskId:task.taskId,controlSessionId:task.controlSessionId,expectedControlRevision:task.controlRevision,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null}}};
 if(config.feedback==='through'||q.get('abort')==='1')receipts.set(request.commandId,reply(request));
 foodStore.save(JSON.stringify({schemaVersion:1,ownerUid:uid,matchId:request.matchId,seatId:record.value.selfSeatId,entries:[request],contact:null}));
}
if(q.get('abort')==='1')Object.assign(record.value,{status:'aborted',publicView:null,playerView:null,foodPublicView:null,foodPlayerView:null});
if(config.recovery){
 foodStore.save(JSON.stringify({schemaVersion:1,ownerUid:uid,matchId:record.value.matchId,seatId:record.value.selfSeatId,entries:[config.recovery.request],contact:null}));
}
const app=await mountPlanetApp(document.querySelector('#app'),{connection,matchId:record.value.matchId,ports,stores,allowSynthetic:true});
for(let i=0;i<30&&!app.game?.getModel().phase;i++)await new Promise(r=>setTimeout(r,0));
const recoveryTransitions=[];
if(config.pendingHold){
 fixtureCommandId=config.pendingHold.down.request.commandId;
 if(!app.food.holdDown())throw Error('Authoritatively offered early Hold was blocked');
 for(let i=0;i<40&&app.food.getModel().pendingCount;i++)await new Promise(r=>setTimeout(r,0));
 if(app.food.getModel().pendingCount)throw Error('Early Hold receipt did not settle');
}
if(config.recovery){
 await app.food.checkReceipts();
 const before=app.food.getModel();
 if(before.feedback?.status!=='unknown'||before.canPanelLock)throw Error('Missing original receipt must remain unknown with controls closed');
 recoveryTransitions.push({status:before.feedback.status,pending:before.pendingCount,canPanelLock:before.canPanelLock});
 // Publish only the exact receipt returned by the candidate engine. A fresh
 // snapshot or a missing lookup alone must never settle the original input.
 receipts.set(config.recovery.request.commandId,copy(config.recovery.receipt));
 await app.food.checkReceipts();await app.session.refresh();
 const after=app.food.getModel();
 if(after.feedback?.status!=='rejected'||!after.feedback.recovered||!after.canPanelLock||after.pendingCount!==0)throw Error('Authoritative recovered LOCK did not settle');
 recoveryTransitions.push({status:after.feedback.status,pending:after.pendingCount,canPanelLock:after.canPanelLock});
}
const applySafe=()=>{const [top,bottom]=(q.get('safe')??'47,34').split(',').map(Number);for(const n of document.querySelectorAll('.planet-food.ph')){n.style.setProperty('--safe-t',`${top}px`);n.style.setProperty('--safe-b',`${bottom}px`);}};
applySafe();
if(config.feedback==='refused'){void app.food.press('PANEL_LOCK');for(let i=0;i<10&&!finishRefusal;i++)await Promise.resolve();}
if(config.next){record=copy(config.next);await app.session.refresh();finishRefusal?.();}
if(config.screen){const action=document.querySelector('.planet-food [data-go="food:tasks"]');if(action)action.click();else{document.querySelector('#planet-nav-actions')?.click();document.querySelector('[data-planet-action="food-tasks"]')?.click();}
 if(config.screen!=='tasks')document.querySelector(`.planet-food [data-go="${config.screen}"]`)?.click();}
if(config.screen==='partners')document.querySelector('.planet-food [data-partner="seat-3"]')?.click();
if(config.action==='JOIN'){readHold=true;void app.food.answer('JOIN');}
if(config.action==='WITHDRAW'){readHold=true;record.now=config.actionAt;void app.food.withdraw();}
if(config.feedback&&config.feedback!=='refused'&&config.act&&!seedRelease&&q.get('abort')!=='1'){const c=app.food,task=c.getModel().view.participantTask;
 if(config.act==='lock')void c.press('PANEL_LOCK');
 else if(config.act==='raise')c.holdDown();

}
if(config.feedback==='lost'){lost=true;app.food.disconnect('network');}
applySafe();
window.foodAppHarness={app,entry,sent,lookups,recoveryTransitions,scope:fixtures.scope,ready:true,
 prepareEarlyUp(){if(!config.pendingHold)throw Error('Not a pending Hold fixture');fixtureCommandId=config.pendingHold.release.request.commandId;},
 async replace(next){record=copy(next);await app.session.refresh();applySafe();},
 names(text){for(const m of record.value.members)m.displayName=text;return app.session.refresh();},
 setLost:v=>{lost=v;},setHoldCommands:v=>{holdCommands=v;},setReadHold:v=>{readHold=v;},setUid:v=>{uid=v;},
 dispose(){app.dispose();}};
