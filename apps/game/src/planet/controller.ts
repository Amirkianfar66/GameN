import { PlanetCommandSchema, PlanetCommandRequestSchema, PlanetDrawingSchema } from '@mothership/contracts';
import type { PlanetCommand, PlanetCommandRequest, PlanetDrawing, PlanetOffer, PlanetPlayerView, SeatId } from '@mothership/contracts';
import { PLANET_ACTION_LABELS, ownPlanetWindows, planetConfirmation, planetIsPlayer, planetRolePresentation,planetPromiseTerms,planetPlayerNumberChoices,planetSupplyDelivery } from '@mothership/presentation';
import type { PlanetActionModel, PlanetCommandType, PlanetPanel, PlanetScreenModel, PlanetView } from '@mothership/presentation';
import type { PlayerPorts } from '../ports.js';
import { createServerClock } from '../clock/server-clock.js';
import { readPlanetReceipt, readPlanetView } from './transport.js';
import type { PlanetBinding, PlanetReceiptContext, PlanetSnapshot, PlanetTransport } from './transport.js';

export interface PlanetController {
 start(): Promise<void>;
 subscribe(listener: (model:PlanetScreenModel)=>void):()=>void;
 getModel():PlanetScreenModel;
 openPanel(panel:PlanetPanel):void;
 begin(type:PlanetCommandType):void;
 choose(value:string):void;
 showDrawing(windowId:string,drawing:unknown):void;
 confirm():Promise<void>;
 checkReceipt():Promise<void>;
 retry():Promise<void>;
 dismiss():void;
 setVisible(visible:boolean):void;
 dispose():void;
}
interface Draft {
 type:PlanetCommandType; phaseId:string; step:PlanetActionModel['step']; selected:string[];
 choices:{value:string;label:string}[]; prompt:string; command:PlanetCommand|null;
}
interface Unsettled {context:PlanetReceiptContext; request:PlanetCommandRequest|null; revision:number; status:'sending'|'unknown'|'checking';}
const simpleCommands = new Set<PlanetCommandType>(['PASS_TURN','ACTIVATE_SHIP_HACK','ENGINEER_SUPPRESS','ACTIVATE_BLACKHOLE','ACTIVATE_CLONE','REQUEST_BLACKOUT','CAPTAIN_RELEASE','CAPTAIN_EJECT','CONFIRM_NAVIGATION']);
const targetCommands = new Set<PlanetCommandType>(['REGISTER_SHOT','PROTECT','RESCUE','APPOINT_OFFICER','BLOCK_MOVE','REQUEST_HACK']);
const promiseLabels = Object.freeze({CAPTAIN_SUPPORT:'Captain Support',OFFICER_SELECTION:'Officer Selection',JAIL_VOTE:'Jail Vote',NO_JAIL_VOTE:'No Jail Vote',MEET_A:'Meet in Room A',MEET_B:'Meet in Room B'});
const number = (id:string)=>`Player ${id.slice(5)}`;
const roomFor = (slot:string):'Room A'|'Room B'|'Command Room'|null=>slot.startsWith('A')?'Room A':slot.startsWith('B')?'Room B':slot==='C1'?'Command Room':null;

/** Independent protocol-3 consumer. Receipts register commands; views alone resolve gameplay. */
export function createPlanetController(transport:PlanetTransport,ports:PlayerPorts,expected:{matchId:string;surface:'player'|'display'}):PlanetController {
 const clock=createServerClock(ports.clock);
 const listeners=new Set<(model:PlanetScreenModel)=>void>();
 let binding:PlanetBinding|null=null, view:PlanetView|null=null;
 let visible=true, disposed=false, fresh=false, connecting=true, failed=false, message:string|null=null;
 let interactionOpen=false;
 let panel:PlanetPanel='board', draft:Draft|null=null, unsettled:Unsettled|null=null;
 let accepted:{revision:number;phaseId:string;type:PlanetCommandType}|null=null;
 let unsubscribe:(()=>void)|null=null,timer:unknown=null,generation=0,lastSync=-Infinity, syncing=false;
 let frozen:{id:string;board:PlanetView['board']}|null=null;
 let supplyDelivery:{round:3;count:1}|null=null;
 const supplyObservation=(p:PlanetPlayerView)=>({matchId:p.matchId,seatId:p.self.seatId,round:p.round,revision:p.viewRevision,phaseKind:p.phase.kind,finalizedRound:p.board.finalizedRound,lastMovedRound:p.navigation.lastMovedRound,ordinaryWeapons:p.self.ordinaryWeapons});
 let storageBlocked=false;
 const pendingTimers=new Set<unknown>();
 const bounded=<T>(run:()=>Promise<T>):Promise<T|null>=>new Promise(resolve=>{
  let done=false;const finish=(value:T|null)=>{if(done)return;done=true;ports.scheduler.clearTimeout(handle);pendingTimers.delete(handle);resolve(value);};
  const handle=ports.scheduler.setTimeout(()=>finish(null),8_000);pendingTimers.add(handle);
  Promise.resolve().then(run).then(finish,()=>finish(null));
 });
 const authValid=()=>binding!==null&&transport.currentUid()===binding.uid;
 const reading=()=>clock.read();
 const usable=()=>{
  const time=reading();
  return !disposed&&visible&&fresh&&authValid()&&view!==null&&time.status==='synced'&&
   time.serverNowMs-time.uncertaintyMs>=view.phase.startedAt&&
   (view.phase.endsAt===null||time.serverNowMs+time.uncertaintyMs<view.phase.endsAt);
 };
 const player=():PlanetPlayerView|null=>view&&planetIsPlayer(view)?view:null;
 const isDark=()=>{const time=reading();return view?.phase.kind==='BLACKOUT'&&(time.status!=='synced'||view.blackout===null||time.serverNowMs+time.uncertaintyMs>=view.blackout.previewEndsAt);};
 const canAct=()=>usable()&&player()!==null&&unsettled===null&&accepted===null&&!storageBlocked;
 const ballotOpen=()=>view?.phase.kind==='JAIL_VOTE'||view?.phase.kind==='CAPTAIN_ELECTION';
 const phaseAllows=(type:PlanetCommandType)=>!(type==='VOTE'&&!ballotOpen())&&!(view?.phase.kind==='BLACKHOLE_PRESENTATION'&&['MOVE','PANEL_CODE','PASS_TURN'].includes(type));
 const offer=(type:PlanetCommandType):PlanetOffer|null=>phaseAllows(type)?player()?.offers.find(o=>o.type===type)??null:null;
 const emit=()=>{if(disposed)return;const model=getModel();for(const listener of listeners)listener(model);};
 const clearPrivate=()=>{draft=null;panel='board';interactionOpen=false;};
 const invalidate=(text:string,error=false)=>{fresh=false;failed=error;message=text;clearPrivate();frozen=null;supplyDelivery=null;emit();};
 const allowedSlot=(slot:string,o:PlanetOffer)=>o.slotIds.includes(slot as PlanetOffer['slotIds'][number])&&roomFor(slot)!==null&&!view?.board.seats.some(s=>s.slotId===slot);
 function confirmationFor(command:PlanetCommand):string {
  const p=player();let text=planetConfirmation(command);
  if(p&&command.type==='OFFER_PROMISE')text+=` ${planetPromiseTerms({...command,giverSeatId:p.self.seatId,round:p.round,electionId:null})}`;
  if(p&&(command.type==='ACCEPT_PROMISE'||command.type==='DECLINE_PROMISE')){const promise=p.promises.find(x=>x.id===command.promiseId);if(promise)text+=` ${planetPromiseTerms(promise)}`;}
  return text;
 }
 function getModel():PlanetScreenModel {
  const time=reading(), valid=usable(), shown=visible&&fresh&&authValid()&&view!==null;
  const p=shown&&valid?player():null;
  const current=shown?view:null;
  const dark=!!current&&isDark();
  const privateArea:{-readonly [K in keyof NonNullable<PlanetScreenModel['privateArea']>]:NonNullable<PlanetScreenModel['privateArea']>[K]}={};
  if(p){
   if(panel==='card'){
    privateArea.role=planetRolePresentation(p); privateArea.abilities=p.abilities;privateArea.knowledge={...p.knowledge,insiderSeatIds:[...p.knowledge.insiderSeatIds].sort()};
    privateArea.resources={ordinaryWeapons:p.self.ordinaryWeapons,roleActionSpent:p.self.roleActionSpent,movementSpent:p.self.movementSpent};
    privateArea.supplyDelivery=supplyDelivery;
    privateArea.offers=canAct()?p.offers.filter(o=>['SUBMIT_CODE','ACTIVATE_SHIP_HACK','ENGINEER_SUPPRESS'].includes(o.type)&&phaseAllows(o.type)):[];
   }
   if(panel==='actions'){
    privateArea.offers=canAct()?p.offers.filter(o=>phaseAllows(o.type)):[];privateArea.hackFeedback=p.hackFeedback;privateArea.captainCommands=p.abilities.captainCommands;privateArea.ownBallot=p.ownBallot;
    if(p.phase.kind==='BLACKOUT')privateArea.blackoutTargeting=p.blackoutTargeting;
   }
   if(panel==='promises'){privateArea.promises=p.promises;privateArea.promiseQuota=p.promiseQuota;privateArea.offers=canAct()?p.offers.filter(o=>['OFFER_PROMISE','ACCEPT_PROMISE','DECLINE_PROMISE'].includes(o.type)):[];}
   if(panel==='windows'){privateArea.windows=ownPlanetWindows(p,{dark:isDark()});const shown=canAct()&&!isDark()?p.offers.filter(o=>o.type==='SHOW_WINDOW'):[];if(shown.length)privateArea.offers=shown;}
   if(panel==='navigation'){privateArea.navigation=p.privateNavigation;privateArea.offers=canAct()?p.offers.filter(o=>['CHOOSE_NAV_DIRECTION','CONFIRM_NAVIGATION'].includes(o.type)&&phaseAllows(o.type)):[];}
   if(panel==='hospital'){privateArea.panelAttemptSpent=p.abilities.panelAttemptSpent;privateArea.offers=canAct()?p.offers.filter(o=>o.type==='PANEL_CODE'&&phaseAllows(o.type)):[];}
  }
  let action:PlanetActionModel|null=null;
  if(valid&&interactionOpen&&draft){action={type:draft.type,label:PLANET_ACTION_LABELS[draft.type],step:draft.step,selected:[...draft.selected],choices:[...draft.choices],prompt:draft.prompt,confirmation:draft.command?confirmationFor(draft.command):null,canConfirm:canAct()&&draft.step==='confirm'&&draft.command!==null};}
  if(valid&&interactionOpen&&unsettled?.status==='sending'&&unsettled.request)action={type:unsettled.request.command.type,label:PLANET_ACTION_LABELS[unsettled.request.command.type],step:'sending',selected:[],choices:[],prompt:'Registering…',confirmation:null,canConfirm:false};
  if(valid&&interactionOpen&&accepted)action={type:accepted.type,label:PLANET_ACTION_LABELS[accepted.type],step:'accepted',selected:[],choices:[],prompt:'Registered. Waiting for the authoritative view.',confirmation:null,canConfirm:false};
  const currentBoard=dark?null:current?.board??null;
  return {
   protocolVersion:3,versions:current?.versions??null,surface:expected.surface,mode:transport.mode,connection:failed?'error':connecting?'connecting':shown?'live':'stale',message,
   matchId:expected.matchId,playerCount:current?.playerCount??null,round:current?.round??null,revision:current?.viewRevision??null,
   board:currentBoard&&frozen&&current?.blackout?.windowId===frozen.id?frozen.board:currentBoard,
   boardLabel:current&&expected.surface==='display'?`Last finalized board · Round ${current.board.finalizedRound}`:null,
   phase:current?{id:current.phase.id,kind:current.phase.kind,startedAt:current.phase.startedAt,endsAt:current.phase.endsAt,nowMs:time.status==='synced'?time.serverNowMs:null,remainingMs:time.status==='synced'&&current.phase.endsAt!==null?Math.max(0,current.phase.endsAt-time.serverNowMs):null,trusted:time.status==='synced',expired:!valid}:null,
   offices:current?.offices??null,activeSeatId:current?.activeSeatId??null,talk:current?.hackSession??null,navigation:current?.navigation??null,result:current?.result??null,endReveal:current?.endReveal??null,lastTally:current?.lastTally??null,
   identities:current?transport.identities?.().filter(i=>current.board.seats.some(s=>s.seatId===i.seatId))??[]:[],
   panel:p?panel:'board',concealed:!visible,ownSeatId:binding?.seatId??null,
   canPass:canAct()&&offer('PASS_TURN')!==null,canMove:canAct()&&offer('MOVE')!==null,moveRooms:canAct()?['Room A','Room B','Command Room'].filter(room=>offer('MOVE')?.slotIds.some(slot=>roomFor(slot)===room&&allowedSlot(slot,offer('MOVE')!))) as ('Room A'|'Room B'|'Command Room')[]:[],dark:!!dark,action,
   privateArea:p&&Object.keys(privateArea).length?privateArea:null,
   presentation:current&&valid&&time.status==='synced'?{nowMs:time.serverNowMs,startedAt:current.phase.startedAt,endsAt:current.phase.endsAt,events:dark?[]:current.events,blackout:current.blackout,clone:panel==='card'&&p?p.abilities.clone:null}:null,
   recovery:unsettled&&unsettled.status!=='sending'?{status:unsettled.status,canCheck:visible&&authValid()&&unsettled.status==='unknown',canRetry:visible&&canRetry()}:null,
  };
 }
 async function syncTime(){
  if(syncing||disposed||!visible)return;syncing=true;
  const requestedAt=ports.clock.now(), token=generation;
  try{const serverTimeMs=await bounded(()=>transport.serverTime());if(serverTimeMs===null)throw new Error('no server time');if(token!==generation||disposed||!visible)return;
   if(!authValid())return invalidate('Your signed-in identity changed. Reconnect this seat.',true);
   clock.addSample({requestedAt,receivedAt:ports.clock.now(),serverTimeMs});lastSync=ports.clock.now();scheduleTick();emit();
  }catch{if(token===generation&&!disposed){clock.invalidate();invalidate('Server time is unavailable. Reconnecting.');}}
  finally{syncing=false;}
 }
 function scheduleTick(){
  if(timer!==null)ports.scheduler.clearTimeout(timer);timer=null;if(disposed||!visible)return;
  let delay=250;const time=reading();
  if(time.status==='synced'&&view)for(const boundary of [view.phase.startedAt+time.uncertaintyMs,view.phase.endsAt===null?null:view.phase.endsAt-time.uncertaintyMs,view.blackout?view.blackout.previewEndsAt-time.uncertaintyMs:null]){
   if(boundary===null)continue;const until=boundary-time.serverNowMs;
   if(until>0)delay=Math.min(delay,Math.max(1,until));
  }
  // Arm before notifying renderers: their work can cross a boundary. This only
  // redraws the supplied view; it never advances a phase.
  timer=ports.scheduler.setTimeout(tick,delay);
 }
 function tick(){
  if(disposed||!visible)return;
  if(!authValid()){invalidate('Your signed-in identity changed. Reconnect this seat.',true);unsubscribe?.();unsubscribe=null;return;}
  if(!usable())clearPrivate();else if(draft?.command&&!commandAllowed(draft.command))draft=null;
  scheduleTick();emit();if(reading().status!=='synced'||ports.clock.now()-lastSync>15_000)void syncTime();
 }
 function receive(snapshot:PlanetSnapshot){
  if(disposed||!visible)return;
  if(!authValid())return invalidate('Your signed-in identity changed. Reconnect this seat.',true);
  if(!snapshot.fresh)return invalidate('Reconnecting. Waiting for a fresh authorized view.');
  const next=readPlanetView(snapshot.value,expected.matchId,binding!.seatId);
  if(!next)return invalidate('This view could not be verified.',true);
  if(view){
   if(planetIsPlayer(view)&&planetIsPlayer(next)){
    const oldDrawings=new Map(view.windows.flatMap(w=>w.drawings).map(d=>[d.id,JSON.stringify(d)]));
    if(next.windows.some(w=>w.drawings.some(d=>oldDrawings.has(d.id)&&oldDrawings.get(d.id)!==JSON.stringify(d))))return invalidate('A shown drawing changed unexpectedly.',true);
    if(view.blackout?.windowId===next.blackout?.windowId&&view.blackoutTargeting&&next.blackoutTargeting&&JSON.stringify([view.blackoutTargeting.boundRoom,view.blackoutTargeting.slotIds])!==JSON.stringify([next.blackoutTargeting.boundRoom,next.blackoutTargeting.slotIds]))return invalidate('Blackout positions changed unexpectedly.',true);
   }
   if(next.viewRevision<view.viewRevision)return invalidate('Waiting for the latest authorized view.');
   if(next.viewRevision===view.viewRevision&&JSON.stringify(next)!==JSON.stringify(view))return invalidate('Conflicting view revision. Reconnect this seat.',true);
   if(view.phase.kind==='BLACKHOLE_PRESENTATION'&&next.phase.id===view.phase.id&&(next.phase.kind!==view.phase.kind||next.phase.startedAt!==view.phase.startedAt||next.phase.endsAt!==view.phase.endsAt))return invalidate('The Sync interval changed unexpectedly.',true);
   if(next.versions.assetManifestVersion!==view.versions.assetManifestVersion||next.round<view.round)return invalidate('The match version changed unexpectedly.',true);
   if(planetIsPlayer(next)&&planetIsPlayer(view)&&(next.self.role!==view.self.role||next.self.faction!==view.self.faction))return invalidate('Your seat identity changed unexpectedly.',true);
  }
  if(fresh&&visible&&authValid()&&clock.read().status==='synced'&&view&&planetIsPlayer(view)&&planetIsPlayer(next))supplyDelivery=planetSupplyDelivery(supplyObservation(view),supplyObservation(next))??supplyDelivery;
  if(next.round!==3||next.phase.kind==='BLACKHOLE_PRESENTATION')supplyDelivery=null;
  if(!fresh||view?.phase.id!==next.phase.id)clearPrivate();
  if(accepted&&(next.viewRevision>accepted.revision||next.phase.id!==accepted.phaseId))accepted=null;
  if(next.blackout&&frozen?.id!==next.blackout.windowId)frozen={id:next.blackout.windowId,board:next.board};
  if(!next.blackout)frozen=null;
  view=next;fresh=true;connecting=false;failed=false;message=null;
  if(draft?.command&&!commandAllowed(draft.command))draft=null;
  scheduleTick();emit();
 }
 function listen(){
  unsubscribe?.();const token=generation;
  unsubscribe=transport.listen({matchId:expected.matchId,seatId:binding!.seatId},{snapshot:s=>{if(token===generation)receive(s);},error:()=>{if(token===generation)invalidate('Connection interrupted. Your command recovery is retained.');}});
 }
 function loadRecovery(){
  try{
   const raw=ports.unresolved.load();if(!raw)return;
   const value:unknown=JSON.parse(raw);
   if(!value||typeof value!=='object')throw new Error('invalid recovery');
   const saved=value as Record<string,unknown>;
   if(Object.keys(saved).sort().join(',')!=='commandId,matchId,ownerUid,phaseId,protocolVersion,seatId')throw new Error('invalid recovery');
   const parsed=PlanetCommandRequestSchema.safeParse({protocolVersion:saved.protocolVersion,matchId:saved.matchId,phaseId:saved.phaseId,commandId:saved.commandId,command:{type:'PASS_TURN'}});
   if(!parsed.success||saved.matchId!==expected.matchId||saved.ownerUid!==binding?.uid||saved.seatId!==binding?.seatId)throw new Error('wrong recovery audience');
   const {protocolVersion,matchId,phaseId,commandId}=parsed.data;
   unsettled={context:{protocolVersion,matchId,phaseId,commandId},request:null,revision:-1,status:'unknown'};
   message='A previous command needs its original receipt.';
  }catch{storageBlocked=true;message='Command recovery could not be verified. Reconnect the original seat before sending.';}
 }
 async function start(){
  if(disposed||binding)return;const token=++generation;connecting=true;emit();
  try{
   const next=await bounded(()=>transport.authenticate());if(next===null)throw new Error('no authentication');if(token!==generation||disposed)return;
   if(next.matchId!==expected.matchId||next.uid!==transport.currentUid()||(expected.surface==='player')!==(next.seatId!==null))return invalidate('The authenticated seat does not match this screen.',true);
   binding=next;loadRecovery();await syncTime();if(disposed||token!==generation)return;listen();tick();
  }catch{if(!disposed)invalidate('Authentication is unavailable. Reconnect this seat.',true);}
 }
 function begin(type:PlanetCommandType){
  if(!canAct()||!offer(type))return;
  const p=player()!,o=offer(type)!;interactionOpen=true;
  draft={type,phaseId:p.phase.id,step:'confirm',selected:[],choices:[],prompt:PLANET_ACTION_LABELS[type],command:null};
  if(simpleCommands.has(type))draft.command=PlanetCommandSchema.parse({type});
  else if(type==='MOVE'){
   draft.step='targets';draft.prompt='Choose a room, then an empty position. Repositioning also spends your move.';
   draft.choices=['Room A','Room B','Command Room'].filter(room=>o.slotIds.some(s=>roomFor(s)===room&&allowedSlot(s,o))).map(value=>({value,label:value}));
  }else if(type==='SELECT_BLACKOUT_SLOT'){
   const targeting=p.blackoutTargeting;if(!targeting?.selectable||!isDark()){draft=null;return;}
   draft.step='slots';draft.prompt='Choose a fixed position in your bound room.';
   draft.choices=targeting.slotIds.filter(s=>o.slotIds.includes(s)).map(value=>({value,label:value}));
  }else if(type==='CHOOSE_NAV_DIRECTION'||type==='DECLARE_HACK_SIDE'){
   draft.step=type==='CHOOSE_NAV_DIRECTION'?'direction':'faction';
   draft.choices=(type==='CHOOSE_NAV_DIRECTION'?['Blue','Red']:['Blue','Red','Alien']).map(value=>({value,label:value}));
  }else if(type==='ACCEPT_PROMISE'||type==='DECLINE_PROMISE'){
   draft.step='promise';draft.prompt='Select the exact incoming Promise.';
   draft.choices=p.promises.filter(x=>!x.accepted&&x.recipientSeatId===p.self.seatId&&x.round===p.round&&
    x.offerStatus==='offered')
    .map(x=>({value:x.id,label:`${promiseLabels[x.kind]} from ${number(x.giverSeatId)}${x.targetSeatId?` → ${number(x.targetSeatId)}`:''}, Round ${x.round}`}));
  }else if(type==='SHOW_WINDOW'){
   draft=null;panel='windows';
  }else{
   draft.step=type==='PANEL_CODE'?'number':'targets';draft.prompt=type==='SUBMIT_CODE'?'Choose four distinct original player numbers.':type==='SUPPLY'?'Choose two distinct offered players.':type==='PANEL_CODE'?'Enter the Doctor’s player number.':type==='OFFER_PROMISE'?'Choose your current private-talk partner.':'Choose an offered character on the board.';
   draft.choices=type==='PANEL_CODE'?[...planetPlayerNumberChoices(o.targetSeatIds)]:o.targetSeatIds.map(value=>({value,label:number(value)}));
   if(type==='VOTE')draft.choices.push({value:'abstain',label:'Abstain'});
  }
  emit();
 }
 function finish(command:unknown){
  const parsed=PlanetCommandSchema.safeParse(command);
  if(!draft||!parsed.success||!commandAllowed(parsed.data)){draft=null;message='That choice is no longer offered.';emit();return;}
  draft.command=parsed.data;draft.step='confirm';draft.choices=[];draft.prompt='Review before registering.';emit();
 }
 function choose(value:string){
  if(!canAct()||!draft||!draft.choices.some(c=>c.value===value))return;
  const d=draft,p=player()!,o=offer(d.type)!;
  if(d.type==='MOVE'){
   if(d.step==='targets'){d.selected=[value];d.step='slots';d.prompt=`Choose an empty position in ${value}.`;d.choices=o.slotIds.filter(s=>roomFor(s)===value&&allowedSlot(s,o)).map(v=>({value:v,label:v}));emit();return;}
   return finish({type:d.type,destination:d.selected[0],slotId:value});
  }
  if(d.type==='SELECT_BLACKOUT_SLOT')return finish({type:d.type,windowId:p.blackoutTargeting!.windowId,slotId:value});
  if(d.type==='CHOOSE_NAV_DIRECTION')return finish({type:d.type,direction:value});
  if(d.type==='DECLARE_HACK_SIDE')return finish({type:d.type,declaredSide:value});
  if(d.type==='SCAN'){
   if(d.step==='targets'){d.selected=[value];d.step='faction';d.prompt='Choose a faction guess.';d.choices=['Blue','Red','Alien'].map(v=>({value:v,label:v}));emit();return;}
   return finish({type:d.type,targetSeatId:d.selected[0],guess:value});
  }
  if(d.type==='SUPPLY'||d.type==='SUBMIT_CODE'){
   if(d.selected.includes(value))d.selected=d.selected.filter(x=>x!==value);else d.selected.push(value);
   if(d.selected.length===(d.type==='SUPPLY'?2:4))return finish(d.type==='SUPPLY'?{type:d.type,targetSeatIds:d.selected}:{type:d.type,seatIds:d.selected});
   emit();return;
  }
  if(d.type==='OFFER_PROMISE'){
   if(d.step==='targets'){d.selected=[value];d.step='promise';d.prompt='Choose the exact Promise.';d.choices=Object.entries(promiseLabels).map(([v,label])=>({value:v,label}));emit();return;}
   if(d.step==='promise'){
    d.selected.push(value);
    if(value==='JAIL_VOTE'){d.step='number';d.prompt='Choose the specific Jail-vote target.';
     const targets=o.promiseTargetSeatIds;
     d.choices=targets.map(v=>({value:v,label:number(v)}));emit();return;}
    return finish({type:d.type,recipientSeatId:d.selected[0],kind:value,targetSeatId:null});
   }
   return finish({type:d.type,recipientSeatId:d.selected[0],kind:d.selected[1],targetSeatId:value});
  }
  if(d.type==='ACCEPT_PROMISE'||d.type==='DECLINE_PROMISE')return finish({type:d.type,promiseId:value});
  if(d.type==='PANEL_CODE'){d.selected=[value];return finish({type:d.type,doctorSeatId:value});}
  if(d.type==='VOTE')return finish({type:d.type,targetSeatId:value==='abstain'?null:value});
  if(targetCommands.has(d.type))return finish({type:d.type,targetSeatId:value});
 }
 function commandAllowed(c:PlanetCommand):boolean{
  const p=player(),o=offer(c.type);if(!p||!o)return false;
  if('targetSeatId' in c&&c.targetSeatId!==null&&!o.targetSeatIds.includes(c.targetSeatId))return false;
  if(c.type==='MOVE')return allowedSlot(c.slotId,o)&&roomFor(c.slotId)===c.destination;
  if(c.type==='SUPPLY')return c.targetSeatIds.every(id=>o.targetSeatIds.includes(id));
  if(c.type==='SUBMIT_CODE')return c.seatIds.every(id=>o.targetSeatIds.includes(id));
  if(c.type==='PANEL_CODE')return o.targetSeatIds.includes(c.doctorSeatId);
  if(c.type==='SELECT_BLACKOUT_SLOT')return isDark()&&!!p.blackoutTargeting?.selectable&&c.windowId===p.blackoutTargeting.windowId&&o.slotIds.includes(c.slotId)&&p.blackoutTargeting.slotIds.includes(c.slotId);
  if(c.type==='OFFER_PROMISE'){
   const talk=p.hackSession;const pair=talk&&[talk.actorSeatId,talk.targetSeatId];
   return !p.promiseQuota.given&&!!pair?.includes(p.self.seatId)&&pair.includes(c.recipientSeatId)&&c.recipientSeatId!==p.self.seatId&&o.targetSeatIds.includes(c.recipientSeatId)&&
    (c.kind!=='JAIL_VOTE'||o.promiseTargetSeatIds.includes(c.targetSeatId!));
  }
  if(c.type==='ACCEPT_PROMISE'||c.type==='DECLINE_PROMISE')return p.promises.some(x=>x.id===c.promiseId&&!x.accepted&&x.round===p.round&&x.recipientSeatId===p.self.seatId&&
   x.offerStatus==='offered');
  if(c.type==='SHOW_WINDOW')return o.windowIds.includes(c.windowId)&&ownPlanetWindows(p,{dark:isDark()}).some(w=>w.windowId===c.windowId&&w.canDraw);
  return true;
 }
 function showDrawing(windowId:string,drawing:unknown){
  if(!canAct()||!offer('SHOW_WINDOW')||!PlanetDrawingSchema.safeParse(drawing).success)return;
  const command=PlanetCommandSchema.safeParse({type:'SHOW_WINDOW',windowId,drawing});if(!command.success||!commandAllowed(command.data))return;
  interactionOpen=true;draft={type:'SHOW_WINDOW',phaseId:view!.phase.id,step:'confirm',selected:[],choices:[],prompt:'Review the drawing before Show.',command:command.data};emit();
 }
 function settle(payload:unknown,item:Unsettled):boolean{
  const receipt=readPlanetReceipt(payload,item.context);if(!receipt)return false;
  try{ports.unresolved.clear();}catch{storageBlocked=true;}
  unsettled=null;draft=null;
  if(receipt.status==='accepted'){
   if(view?.phase.id===item.context.phaseId&&view.viewRevision<=item.revision&&item.request)accepted={revision:item.revision,phaseId:item.context.phaseId,type:item.request.command.type};
   message='Registered. The authoritative view determines the outcome.';
  }else message=receipt.code==='PHASE_CLOSED'?'The server closed that phase.':'The server did not allow that command.';
  emit();return true;
 }
 async function send(item:Unsettled){
  if(!item.request)return;
  const started=ports.clock.now();
  try{const response=await bounded(()=>transport.command(item.request!));if(disposed||unsettled!==item)return;
   if(!authValid()){item.status='unknown';invalidate('Your signed-in identity changed. Reconnect the original seat.',true);return;}
   if(response){if(settle(response.receipt,item))return;}
  }catch{/* A lost response is an uncertain registration, never a rejection. */}
  if(disposed||unsettled!==item)return;item.status='unknown';draft=null;message='Outcome unknown. Check the original receipt before any new command.';emit();
 }
 async function confirm(){
  if(!canAct()||!draft?.command||draft.phaseId!==view!.phase.id||!commandAllowed(draft.command))return;
  const request=PlanetCommandRequestSchema.parse({protocolVersion:3,matchId:expected.matchId,phaseId:view!.phase.id,commandId:ports.ids.next(),command:draft.command});
  const {protocolVersion,matchId,phaseId,commandId}=request;
  const context={protocolVersion,matchId,phaseId,commandId};
  try{ports.unresolved.save(JSON.stringify({...context,ownerUid:binding!.uid,seatId:binding!.seatId}));}catch{storageBlocked=true;message='Command recovery could not be saved. Nothing was sent.';emit();return;}
  const item:Unsettled={context,request,revision:view!.viewRevision,status:'sending'};unsettled=item;draft=null;message='Registering…';emit();await send(item);
 }
 async function checkReceipt(){
  const item=unsettled;if(!item||item.status!=='unknown'||!authValid()||!visible)return;
  item.status='checking';emit();const started=ports.clock.now();
  try{const response=await bounded(()=>transport.receipt(item.context));if(disposed||unsettled!==item)return;
   if(authValid()&&response){if(response.receipt!==null&&settle(response.receipt,item))return;}
  }catch{/* A missing receipt is not proof that a command failed. */}
  if(disposed||unsettled!==item)return;item.status='unknown';message='The original receipt is still unavailable. No replacement command is permitted.';emit();
 }
 function canRetry(){return !!unsettled?.request&&unsettled.status==='unknown'&&usable()&&view?.phase.id===unsettled.context.phaseId;}
 async function retry(){if(!canRetry())return;const item=unsettled!;item.status='sending';emit();await send(item);}
 return {
  start,getModel,subscribe(listener){listeners.add(listener);listener(getModel());return()=>listeners.delete(listener);},begin,choose,showDrawing,confirm,checkReceipt,retry,
  openPanel(next){if(!usable()||!player())return;panel=next;draft=null;interactionOpen=false;emit();},
  dismiss(){draft=null;panel='board';interactionOpen=false;emit();},
  setVisible(next){
   if(visible===next||disposed)return;visible=next;generation++;clearPrivate();clock.invalidate();fresh=false;frozen=null;supplyDelivery=null;
   unsubscribe?.();unsubscribe=null;if(timer!==null)ports.scheduler.clearTimeout(timer);timer=null;emit();
   if(next&&binding&&authValid()){void syncTime();listen();tick();}
  },
  dispose(){disposed=true;generation++;unsubscribe?.();if(timer!==null)ports.scheduler.clearTimeout(timer);listeners.clear();for(const handle of pendingTimers)ports.scheduler.clearTimeout(handle);pendingTimers.clear();draft=null;view=null;frozen=null;},
 };
}
