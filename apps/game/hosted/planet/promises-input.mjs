// Promises on a player's phone are Designer's promises component (design/phone-ui/components/promises, #297): the
// owner's plan of 16 November 2026, release 3, its second step (the Lead, 18 November). These pure functions map this
// phone's presentation model to the component's frame and input, and its taps to the calls the game already makes:
// begin, choose and confirm, the controller's own, which check the current offer before anything is sent.
//
// What they give is the pair's or this phone's own: the quota, the Promises and the offers are the controller's for
// the Promises panel (its privateArea), and each Promise's exact terms are Frontend's words (planetPromiseTerms), as
// the controller's own check words them. Whether a Promise can be offered or answered is the model's offers alone;
// a refused command says "Not available now" (T3), as the model gives no reason (A1). Frontend gives no condition,
// `when` or `why` for a Promise yet (#222), so none is drawn. Nothing here works out a rule.
//
// The view and the offer being made (the kind, and Jail Vote's player) are this phone's own (`flow`): the
// component's `view` and `draft` (promises.md, answer 2). Next and Back are local; Offer, Accept and Decline send.
import {planetPromiseTerms} from '@mothership/presentation';
import {PROMISES_SHEET_ID,PROMISE_KINDS,promisesSheet} from '../../../../design/phone-ui/components/promises/promises.mjs';
import {refusalHeld,refusalWords} from './refusal-words.mjs';

/** The sheet's id, the same for every view (the component's): the shell connection routes its footer and Back by it. */
export {PROMISES_SHEET_ID};
/** The three commands the Promises sheet sends; while one is drafted or under way, the open sheet is Promises'. */
export const PROMISE_COMMANDS=Object.freeze(['OFFER_PROMISE','ACCEPT_PROMISE','DECLINE_PROMISE']);
const COMMANDS=new Set(PROMISE_COMMANDS);
/** A command the model does not offer now: T3's words, as the model carries no reason (A1). */
export const PROMISES_NOT_AVAILABLE='Not available now';
/** This phone's own: the list, then the offer being made, kind by kind. */
export const PROMISES_START=Object.freeze({view:'list',kind:null,target:null});
const TALKING=new Set(['kinds','target','confirm','incoming']);

const player=model=>model.surface==='player'&&!model.concealed;
const seatNumber=seatId=>/^seat-[1-9]$/.test(String(seatId??''))?Number(String(seatId).slice(5)):null;
const seatId=seat=>`seat-${seat}`;
const offerOf=(model,type)=>model.privateArea?.offers?.find(offer=>offer.type===type)??null;
/** A seat as the component names it: its number, and the name and character the identities give. */
function person(model,id){
 const n=seatNumber(id),who=model.identities?.find(identity=>identity.seatId===id);
 // "Player" keeps its number on one line, with a no-break space (the Lead's polish, the owner's approval of 18 November).
 return {seat:n,name:who?.displayName||`Player\u00a0${n}`,character:who?.characterId??null};
}

/**
 * The talk's other player while this viewer talks: the public view's talk session during the 60 s talk (HACK), the
 * only phase in which a Promise is offered or answered. Otherwise null.
 */
export function promisesPartner(model){
 const talk=model.talk,own=model.ownSeatId;
 if(!player(model)||model.dark||model.phase?.kind!=='HACK'||!talk||!own)return null;
 return talk.actorSeatId===own?talk.targetSeatId:talk.targetSeatId===own?talk.actorSeatId:null;
}

/**
 * Whether the open sheet is Promises': the Promises panel with no other command drafted, or one of its three
 * commands drafted or under way. Never in the dark or once the phase has run out: those sheets stay the shell's.
 */
export function promisesOpen(model){
 if(!player(model)||model.dark||model.phase?.expired)return false;
 return model.action?COMMANDS.has(model.action.type):model.panel==='promises';
}

/**
 * The given Promise: the accepted one (one a match), else the newest offer this player made that is still waiting.
 * Only an accepted or a waiting offer is chosen, so declined and expired offers leave (answer 5).
 */
export function promisesGiven(model){
 const mine=(model.privateArea?.promises??[]).filter(p=>p.giverSeatId===model.ownSeatId);
 return mine.find(p=>p.offerStatus==='accepted')??mine.filter(p=>p.offerStatus==='offered').at(-1)??null;
}
/** The received Promise: the accepted one (one a match), else, in a talk, the partner's newest offer, which only that talk can answer. */
export function promisesReceived(model){
 const partner=promisesPartner(model),mine=(model.privateArea?.promises??[]).filter(p=>p.recipientSeatId===model.ownSeatId);
 return mine.find(p=>p.offerStatus==='accepted')??(partner?mine.filter(p=>p.offerStatus==='offered'&&p.giverSeatId===partner).at(-1)??null:null);
}
/** The partner's offer this phone can answer now, or null. */
export function promisesIncoming(model){const received=promisesReceived(model);return received?.offerStatus==='offered'?received:null;}

/** A Promise in the component's terms: the pair by name, its state and status, and Frontend's exact terms. */
const promiseInput=(model,p)=>p?{id:p.id,kind:p.kind,giver:person(model,p.giverSeatId),recipient:person(model,p.recipientSeatId),state:p.offerStatus,
 status:p.offerStatus==='accepted'?p.status:null,terms:planetPromiseTerms(p),when:null,why:null,condition:null}:null;

/** A command's state: busy while it sends, enabled while the model offers it, else refused with T3's words. */
function command(model,type){
 if(model.action?.type===type&&model.action.step==='sending')return {enabled:true,busy:true,reason:null};
 return offerOf(model,type)?{enabled:true,busy:false,reason:null}:{enabled:false,busy:false,reason:PROMISES_NOT_AVAILABLE};
}

/**
 * This phone's view and draft, kept to what the model still allows: the list after a command's receipt (the next view
 * shows the Promise as the server has it), when the talk ends, or when the offer to answer has gone; Jail Vote's player
 * only for Jail Vote, and only while the offer still names them. Null while the sheet isn't Promises'.
 *
 * A refused command (R2 with A3): `sent` is this phone's own Offer, Accept or Decline, from the open sheet, while the
 * model has it under way. Once the model no longer has it, its message, verbatim, is `error`, unless it is one of
 * Frontend's own words (refusal-words.mjs). The words go at the next model change (the controller's message changes
 * or clears, at the next view), at the next tap (promisesHandlers), with the sheet, and while concealed; and they are
 * drawn only in the terms and the partner's offer, where the player keeps the choice and can go Back.
 */
export function promisesFlow(flow,model){
 if(!promisesOpen(model))return null;
 const action=model.action;
 if(action&&COMMANDS.has(action.type)&&action.step==='accepted')return {...PROMISES_START};
 let {view,kind,target,sent=null,error=null,errorAt=null}={...PROMISES_START,...(flow??{})};
 if(sent&&action?.type!==sent){
  const words=action?null:refusalWords(model,sent);
  if(words){error=words;errorAt=model.revision??null;}
  sent=null;
 }
 if(error&&(action||!refusalHeld(model,error,errorAt)))error=errorAt=null;
 if(TALKING.has(view)&&!promisesPartner(model)||view==='incoming'&&!promisesIncoming(model))return {...PROMISES_START};
 if(!Object.hasOwn(PROMISE_KINDS,kind??''))kind=null;
 const offer=offerOf(model,'OFFER_PROMISE');
 if(kind!=='JAIL_VOTE')target=null;
 else if(target!==null&&offer&&!offer.promiseTargetSeatIds.includes(seatId(target)))target=null;
 if(view==='target'&&kind!=='JAIL_VOTE')view='kinds';
 if(view==='confirm'&&(!kind||kind==='JAIL_VOTE'&&target===null))view=kind?'target':'kinds';
 if(error&&view!=='confirm'&&view!=='incoming')error=errorAt=null;
 // The refusal's fields only while they hold something: the flow is otherwise the view and the draft alone.
 return {view,kind,target,...(sent?{sent}:{}),...(error?{error,errorAt}:{})};
}
/** The refusal's words the open Promises sheet shows (R2), or null: the game's status line hides while they show. */
export const promisesRefusal=flow=>flow?.error??null;
/** The flow without a refusal's words: the player's next intent clears them (R2). */
export function withoutRefusal(flow){if(!flow)return flow;const {error,errorAt,...rest}=flow;return rest;}

/** The component's whole input for the open view, with the shell's status ('live', 'stale' or 'concealed') and the device's Reduce motion. */
export function promisesInput(model,{flow=null,status='live',reducedMotion=false}={}){
 const f={...PROMISES_START,...(flow??{})},partner=promisesPartner(model),quota=model.privateArea?.promiseQuota;
 const targets=(offerOf(model,'OFFER_PROMISE')?.promiseTargetSeatIds??[]).map(id=>person(model,id)).filter(p=>p.seat!==null);
 const jail=f.kind==='JAIL_VOTE',chosen=jail&&f.target!==null?f.target:null;
 // The terms of the offer being made, in Frontend's words, as the controller's own check words them.
 const terms=f.kind&&partner&&(!jail||chosen!==null)&&Number.isSafeInteger(model.round)
  ?planetPromiseTerms({kind:f.kind,giverSeatId:model.ownSeatId,recipientSeatId:partner,targetSeatId:jail?seatId(chosen):null,round:model.round,electionId:null}):null;
 return {
  view:f.view,status,interactive:true,reducedMotion:!!reducedMotion,viewer:seatNumber(model.ownSeatId),versions:model.versions??null,
  quota:{given:quota?.given===true,received:quota?.received===true},
  talk:partner?person(model,partner):null,offer:partner?command(model,'OFFER_PROMISE'):null,
  // Jail Vote's player is held while the offer sends, when the model withholds the offer: the terms still name them.
  draft:{kind:f.kind,target:targets.some(t=>t.seat===chosen)?chosen:null,terms},targets,
  given:promiseInput(model,promisesGiven(model)),received:promiseInput(model,promisesReceived(model)),
  answer:{accept:command(model,'ACCEPT_PROMISE'),decline:command(model,'DECLINE_PROMISE')},
  // A refused command's words, the model's own (R2): only in the terms and the partner's offer (promisesFlow).
  error:f.error??null,
 };
}

/** The shell's sheet while it is Promises': the component's frame and footer for the view (promisesSheet), one id for every view. */
export function promisesFrame(model,{flow=null}={}){
 if(!promisesOpen(model))return null;
 return {sub:null,...promisesSheet(promisesInput(model,{flow})),kind:'promises'};
}

/** The part for the shell's open sheet when it is Promises' (`frame`, from promisesFrame), or null. */
export function promisesPart(model,{frame=null,flow=null,status='live',reducedMotion=false}={}){
 if(frame?.kind!=='promises'||frame.id!==PROMISES_SHEET_ID)return null;
 return {name:'promises',key:'promises',input:promisesInput(model,{flow,status,reducedMotion})};
}

/** A command's receipt in the shell's toast, in Frontend's words (the model's accepted step), once per command. */
export function promisesToast(model){
 const action=model.action;
 if(!player(model)||!action||!COMMANDS.has(action.type)||action.step!=='accepted'||!action.prompt)return null;
 return {id:`${action.type}:${model.phase?.id??''}:${model.revision??''}`,text:action.prompt,icon:'check'};
}

/**
 * The taps. The component's own (Offer a Promise, an incoming offer, a kind, Jail Vote's player) and the sheet's
 * local Next and Back change this phone's view and draft only (`setFlow`). Offer, Accept and Decline make the
 * controller's own draft in one go, as its steps would (the talk's partner, the kind, Jail Vote's player; the
 * incoming offer's id), then confirm: the controller checks the offer and sends. Back in the sheet's head goes one
 * view back. `live()` is false once the renderer is disposed: then nothing is called.
 */
export function promisesHandlers({model,flow,setFlow,begin,choose,confirm,focusReturn=null,live=()=>true}){
 const when=run=>(...args)=>{if(live())run(...args);};
 const current=()=>({...PROMISES_START,...(flow()??{})});
 // Every tap here is the player's next intent: a refusal's words go (R2).
 const go=patch=>setFlow(withoutRefusal({...current(),...patch}));
 // This phone's own command, under way in the model: a refusal it then gives is this command's (R2).
 const sending=type=>setFlow({...withoutRefusal(current()),sent:type});
 const ready=type=>{const action=model().action;return action?.type===type&&action.step==='confirm'&&action.canConfirm===true;};
 function offer(){
  const f=current(),partner=promisesPartner(model());
  if(f.view!=='confirm'||!partner||!f.kind||f.kind==='JAIL_VOTE'&&f.target===null)return;
  begin('OFFER_PROMISE');if(model().action?.type!=='OFFER_PROMISE')return;
  sending('OFFER_PROMISE');
  choose(partner);choose(f.kind);if(f.kind==='JAIL_VOTE')choose(seatId(f.target));
  if(ready('OFFER_PROMISE'))void confirm();
 }
 function answer(type){
  const incoming=promisesIncoming(model());
  if(current().view!=='incoming'||!incoming)return;
  begin(type);if(model().action?.type!==type)return;
  sending(type);
  choose(incoming.id);
  if(ready(type))void confirm();
 }
 function back(){
  const f=current();
  if(f.view==='kinds'||f.view==='incoming')go({view:'list'});
  else if(f.view==='target')go({view:'kinds'});
  else if(f.view==='confirm')go({view:f.kind==='JAIL_VOTE'?'target':'kinds'});
 }
 return {
  onOffer:when(()=>go({view:'kinds',kind:null,target:null})),
  onIncoming:when(()=>go({view:'incoming'})),
  onKind:when(kind=>{if(Object.hasOwn(PROMISE_KINDS,kind))go({kind,target:kind==='JAIL_VOTE'?current().target:null});}),
  onTarget:when(seat=>{if(seatNumber(seatId(seat))!==null)go({target:seat});}),
  onFocusReturn:when(detail=>focusReturn?.(detail)),
  // The sheet's footer and the Back in its head, which the shell connection hands here while the sheet is Promises'.
  action:when(id=>{
   const f=current();
   if(id==='next'){if(f.view==='kinds'&&f.kind)go({view:f.kind==='JAIL_VOTE'?'target':'confirm'});else if(f.view==='target'&&f.target!==null)go({view:'confirm'});}
   else if(id==='back')back();
   else if(id==='offer')offer();
   else if(id==='accept')answer('ACCEPT_PROMISE');
   else if(id==='decline')answer('DECLINE_PROMISE');
  }),
  back:when(back),
 };
}
