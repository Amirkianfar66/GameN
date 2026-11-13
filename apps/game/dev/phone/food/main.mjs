// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Accepted wire examples around the actual own-seat controller/renderer. No
// design Task model, fixture outcomes, game randomness or synthetic practice bot.
import {createFoodTaskController} from '@mothership/game';
import {FoodTaskPlayerViewSchema} from '@mothership/contracts';
import {mountFoodRenderer} from '../../../hosted/planet/food-render.mjs';
import {createFoodAssets} from '../../../hosted/planet/food-assets.mjs';
import {loadArt} from '../../../hosted/art.mjs';
import examples from '../../../../../docs/backend/examples/food-task-contract-v1.json';

const q=new URL(location.href).searchParams,copy=v=>structuredClone(v),query=q.get('packet')??'task-winch-initial';
let value=copy(examples.packets.find(x=>x.label===query&&x.kind==='PLAYER')?.packet??examples.packets.find(x=>x.label==='task-winch-initial').packet);
if(q.get('brief')==='1'){value.participantTask.stage='BRIEFING';value.serverNowMs=value.participantTask.startedAt+2500;value.offers=[];}
FoodTaskPlayerViewSchema.parse(value);
let uid='food-native-review',now=value.serverNowMs,lost=false,answer=null;
const sent=[],lookups=[],receipts=new Map(),stamp=performance.now(),frozen=q.get('live')!=='1',safe=(q.get('safe')??'47,34').split(',').map(Number);
const currentNow=()=>frozen?now:now+performance.now()-stamp;
const ports={clock:{now:()=>performance.now()},scheduler:{setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:handle=>clearTimeout(handle)},ids:{next:()=>crypto.randomUUID()},
 recovery:{load:()=>sessionStorage.getItem('food-native-review'),save:v=>sessionStorage.setItem('food-native-review',v),clear:()=>sessionStorage.removeItem('food-native-review')}};
const makeReceipt=request=>{
 const {command,...context}=request,c=command;
 const result=c.type==='TASK_PRESS'?{kind:'INPUT',taskId:c.taskId,controlSessionId:c.controlSessionId,effect:c.input.kind==='HOLD_RECOVER_OFF'?'RECOVERED_CLOSED':c.input.kind==='HOLD'&&c.input.edge==='UP'?'GESTURE_CLOSED':'APPLIED',
  gestureSequence:c.input.kind==='HOLD'?c.input.gestureSequence:null,crateId:c.input.kind==='HOLD'?c.input.crateId:null,...(c.input.kind==='HOLD_RECOVER_OFF'?{closedThroughSequence:c.input.throughSequence}:{})}
  :{kind:'REQUEST',requestId:c.type==='TASK_ASK'?'native-request':c.requestId,requestRevision:c.type==='TASK_ASK'?0:c.requestRevision+1,state:c.type==='TASK_ASK'?'PENDING':c.type==='TASK_ASK_WITHDRAW'?'WITHDRAWN':c.answer==='JOIN'?'JOINED':'DECLINED'};
 return {...context,status:'accepted',receivedAt:currentNow(),result};
};
const controller=createFoodTaskController({currentUid:()=>uid,refresh(){},
 async command(request){sent.push(copy(request));const receipt=answer??makeReceipt(request);receipts.set(request.commandId,receipt);return lost?null:{receipt,serverTimeMs:currentNow()};},
 async receipt(context){lookups.push(copy(context));return {receipt:receipts.get(context.commandId)??null,serverTimeMs:currentNow()};}},ports,
 {binding:{uid,matchId:value.matchId,seatId:value.seatId},readClock:()=>({status:'synced',serverNowMs:currentNow(),uncertaintyMs:0})});
const observe=()=>controller.observe(value,{matchId:value.matchId,versions:value.versions,phaseId:value.phaseId,round:value.round,serverNowMs:value.serverNowMs});
const identities=value.rosterSeatIds.map((seatId,i)=>({seatId,displayName:i===0?'Hana':i===1?'Cleo':`Player ${i+1}`,characterId:`c${i+1}`}));
const ordinary={board:{seats:value.rosterSeatIds.map((seatId,i)=>({seatId,location:'Room B',slotId:`B${i+1}`}))},phase:{kind:'FOOD_SUPPLY',remainingMs:24000},activeSeatId:null,panel:'board'};
const assets=createFoodAssets(document);void assets.load();
document.documentElement.style.fontSize=`${Number(q.get('text')??1)*100}%`;
const renderer=mountFoodRenderer(document.querySelector('#food-root'),controller,{identities:()=>identities,ordinary:()=>ordinary,assets,preferences:()=>({reduced:q.get('motion')==='reduced'})});
const frame=document.querySelector('.planet-food');frame.style.setProperty('--safe-t',`${safe[0]}px`);frame.style.setProperty('--safe-b',`${safe[1]}px`);
observe();if(q.get('sheet'))renderer.openTasks();
const commonArt=loadArt('player',document).catch(()=>{});
window.foodHarness={controller,renderer,assets,sent,lookups,identities,ordinary,commonArt,
 scope:'Contract-only synthetic native component review. Ordinary host data is a minimal fixture; API registration, exact Food artwork dispatch and connected behavior remain separate.',
 get value(){return value;},get now(){return currentNow();},setLost:v=>{lost=v;},setAnswer:v=>{answer=v;},setUid:v=>{uid=v;},
 replace(next){value=copy(next);now=value.serverNowMs;return observe();},time(ms){now=ms;renderer.refresh();},
 names(name){for(const p of identities)p.displayName=name;renderer.refresh();},
 dispose(){renderer.dispose();controller.dispose();assets.dispose();}};
