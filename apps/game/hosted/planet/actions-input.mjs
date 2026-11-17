// Actions on a player's phone are Designer's Actions component (design/phone-ui/components/actions): the
// owner's plan of 16 November 2026, release 3. These pure functions map this phone's presentation model to
// the component's parts, to the shell's frames, bars, chips and toasts for Actions' steps (the component's own
// helpers), and the parts' taps to the calls the game already makes. They use only what the model gives this
// viewer, and this phone's own taps: which tile is usable comes from the model's offers, and nothing here works
// out who may act, what an action costs or whether it was accepted. The controller checks the current offer
// before it sends anything.
import {ACTION_LOOKS,actionsSheet,afterSheet,blackoutBar,checkSheet,moveBar,moveChip,movedToast,passSheet,passedToast,registeredToast,targetBar,targetChip,targetListSheet,unknownSheet} from '../../../../design/phone-ui/components/actions/actions.mjs';
import {BOARD_ROOMS,LOCATION_OF,slotsOf} from '../board-v2-drawing/slots-four.mjs';

/**
 * The commands whose steps are Actions': every tile's but the Hacker's Scan and final Code (the Hacker
 * component's, a later step of this release), and Move, which chooses a position (the Lead's Q1–Q4).
 */
export const ACTIONS_FLOWS=Object.freeze(['RESCUE','PROTECT','SUPPLY','REGISTER_SHOT','REQUEST_HACK','REQUEST_BLACKOUT','ENGINEER_SUPPRESS','ACTIVATE_CLONE','ACTIVATE_SHIP_HACK','ACTIVATE_BLACKHOLE','MOVE']);
/** And the two whose frames or bar alone are Actions': Pass (sheet 27.3) and the Disabler's position (sheet 30). */
const HELD=new Set([...ACTIONS_FLOWS,'PASS_TURN','SELECT_BLACKOUT_SLOT']);
const FLOWS=new Set(ACTIONS_FLOWS);
/**
 * The tiles, in the pack's order (sheet 28): a role's own first, then Move, Private talk and Shoot, which every
 * role has. The model gives the role only under the Card (A7), so a role's own tile is shown when the server
 * offers it; the three every role has are always shown, unavailable unless offered (T3: "Not available now").
 */
export const ROLE_TILES=Object.freeze(['SCAN','SUBMIT_CODE','ACTIVATE_SHIP_HACK','RESCUE','PROTECT','REQUEST_BLACKOUT','SUPPLY','ENGINEER_SUPPRESS','ACTIVATE_CLONE','ACTIVATE_BLACKHOLE']);
export const EVERY_ROLE_TILES=Object.freeze(['MOVE','REQUEST_HACK','REGISTER_SHOT']);
/** Accepted, these say themselves with the shell's toast and their tile: no After Register until the projection says what follows (L7). */
const TOAST_ONLY=new Set(['ACTIVATE_SHIP_HACK','ACTIVATE_BLACKHOLE']);
/** After Register's stamp for the actions that do not wait for the round's end (CLONE-01, P14), and the private talk's ACCEPTED. */
const AFTER_KINDS=Object.freeze({REQUEST_HACK:'accepted',ACTIVATE_CLONE:'active',ENGINEER_SUPPRESS:'captured'});
/** The board's own order of rooms, for the list's groups after the viewer's own room. */
const LOCATIONS=Object.freeze([...BOARD_ROOMS.map(room=>LOCATION_OF[room])]);
const OFF_BOARD='Off board';

const isSeat=value=>/^seat-[1-9]$/.test(String(value));
const player=model=>model.surface==='player'&&!model.concealed;
/** The room a position is in, as the board's geometry has it ('Room A' for A3), or null. */
export const slotLocation=slot=>{const room=BOARD_ROOMS.find(id=>slotsOf(id,9).some(s=>s.id===slot));return room?LOCATION_OF[room]:null;};
/** Where the viewer stands on the public board ("Room B"), or null off the board. */
export const ownLocation=model=>model.board?.seats?.find(seat=>seat.seatId===model.ownSeatId)?.location??null;
/** A person as the parts take them: the seat, the display name (or "Player n"), the crew character and where the public board has them. */
function person(model,seatId){
 const who=model.identities?.find(identity=>identity.seatId===seatId),seat=model.board?.seats?.find(s=>s.seatId===seatId);
 return {seat:seatId,name:who?.displayName||`Player ${String(seatId).slice(5)}`,character:who?.characterId??null,room:seat?.location??null};
}
/** live, stale (reconnecting, or the phase has run out) or concealed, as the room scene's. */
export function actionsStatus(model){
 if(model.concealed)return 'concealed';
 return model.connection==='live'&&!model.phase?.expired?'live':'stale';
}
/** A frame as the shell connection's are: every key the shell reads, the component's own over the defaults, and the body's kind. */
const withKind=(frame,kind)=>({sub:null,back:false,close:true,detent:'auto',actions:[],...frame,kind});
/** The footer's actions usable as the model says: the controller refuses the rest, so they are not offered as usable. */
const usable=(frame,enabled)=>({...frame,actions:frame.actions.map(action=>Object.hasOwn(enabled,action.id)?{...action,enabled:action.enabled!==false&&!!enabled[action.id]}:action)});

// ── This phone's own pick ────────────────────────────────────────────────
/**
 * What this phone picked in its current action, which the model does not carry (A2: `selected` is empty for a
 * one-person action and for a sending one, and a move's position is only in the controller's draft): the
 * person or the position tapped, Supply's two from the model, a move's room. It is this viewer's own, kept only
 * while the model's action is that command, in this match, for this viewer, and through the "Outcome unknown"
 * that follows its own send (the controller keeps one unsettled command until it settles; A4: the model does not
 * say which). It is dropped once the action ends, when concealed, and for a new viewer or match.
 *   stage: choosing (targets, slots), checking (confirm), sent (sending), accepted, unknown, retry (sending again)
 */
export function actionsFlow(flow,model){
 if(!player(model)||!model.ownSeatId)return null;
 const mine=!!flow&&flow.match===model.matchId&&flow.viewer===model.ownSeatId,action=model.action;
 if(!action)return model.recovery&&mine&&['sent','retry','unknown'].includes(flow.stage)?{...flow,stage:'unknown'}:null;
 if(!HELD.has(action.type))return null;
 const phase=model.phase?.id??null,same=mine&&flow.type===action.type&&flow.phase===phase;
 const base=same?flow:{match:model.matchId,viewer:model.ownSeatId,type:action.type,phase,seats:[],slot:null,room:null,stage:'choosing'};
 const stage=action.step==='sending'?(['unknown','retry'].includes(base.stage)?'retry':'sent'):action.step==='accepted'?'accepted':action.step==='confirm'?'checking':'choosing';
 const seats=action.selected.filter(isSeat),room=action.type==='MOVE'?action.selected.find(value=>!isSeat(value))??base.room:base.room;
 return {...base,stage,seats:seats.length?seats:base.seats,room};
}
/** The flow after a tap of a person or a position, held before the controller's choose, whose redraw then shows it. */
export function holdActionsPick(flow,model,{seat=null,slot=null}={}){
 const base=actionsFlow(flow,model);
 if(!base)return flow;
 return {...base,...(seat?{seats:[seat]}:{}),...(slot?{slot}:{})};
}

// ── The tiles (sheet 28) ─────────────────────────────────────────────────
/**
 * Every tile the viewer's phone shows, from the model's offers under Actions only. A tile is available while the
 * server offers it; the action being chosen is selected, then sending, then registered while the controller
 * holds it accepted (one revision, A5); otherwise unavailable, with no reason (B1: the server gives none, so the
 * component says "Not available now"). No note, badge or spent state: the model gives none under Actions (A7).
 */
export function actionsTiles(model){
 const offered=new Set((model.privateArea?.offers??[]).map(offer=>offer.type)),action=model.action;
 const state=type=>{
  if(action?.type===type){
   if(['targets','slots','confirm'].includes(action.step))return 'selected';
   if(action.step==='sending')return 'sending';
   if(action.step==='accepted')return 'registered';
  }
  return offered.has(type)?'available':'unavailable';
 };
 return [...ROLE_TILES.filter(type=>offered.has(type)||action?.type===type),...EVERY_ROLE_TILES].map(type=>({type,state:state(type),note:null,reason:null,badge:null}));
}

// ── The shell's frames, bars, chips and toasts for Actions' steps ─────────
// Each returns `undefined` when the step is not Actions' (the shell connection keeps its own), and `null` when
// Actions' step has none of it.

/** The type "Outcome unknown" can name: this phone's own send, when it is one of the component's commands. */
function unknownType(flow){
 if(!flow||!['unknown','retry'].includes(flow.stage)||!Object.hasOwn(ACTION_LOOKS,flow.type)||flow.type==='PANEL_CODE')return null;
 return flow.type==='MOVE'&&!flow.slot?null:flow.type;
}
/** The tiles' frame: "Actions" and the viewer's room. The role is not in the model under Actions (A7). */
const tilesFrame=model=>withKind(actionsSheet({role:null,room:ownLocation(model)}),'actions');

/**
 * The docked sheet's frame for Actions' steps: the tiles; the list; the check (and while it sends); After
 * Register; "Outcome unknown" (any command's: the model's recovery names none, A4); Pass's. While a move or a
 * person is chosen on the scene or the board, no sheet (the target bar). `listOpen`: the board's List is showing.
 */
export function actionsFrame(model,{listOpen=false,flow=null}={}){
 if(!player(model))return undefined;
 if(model.recovery){
  const sheet=unknownSheet({type:unknownType(flow),busy:model.recovery.status==='checking'?'check':null});
  return withKind(usable(sheet,{retry:model.recovery.canRetry,check:model.recovery.canCheck}),'action-unknown');
 }
 const action=model.action;
 if(action){
  if(action.type==='PASS_TURN'){
   if(action.step==='accepted')return null;
   const sending=action.step==='sending';
   return withKind(usable(passSheet({next:null,busy:sending}),{pass:action.canConfirm||sending}),'pass');
  }
  // Retrying "the same" from "Outcome unknown": the sheet stays, its Retry busy.
  if(action.step==='sending'&&flow?.stage==='retry'&&flow.type===action.type)return withKind(unknownSheet({type:unknownType(flow),busy:'retry'}),'action-unknown');
  // The Disabler's position: the bar alone, while choosing and while it sends (sheet 30).
  if(action.type==='SELECT_BLACKOUT_SLOT')return ['slots','sending','accepted'].includes(action.step)?null:undefined;
  if(!FLOWS.has(action.type))return undefined;
  if(['targets','slots'].includes(action.step))return listOpen&&action.type!=='MOVE'?withKind(targetListSheet({type:action.type}),'action-list'):null;
  if(['confirm','sending'].includes(action.step))return withKind(checkSheet({type:action.type,phase:action.step==='sending'?'sending':'ready',canRegister:action.canConfirm}),'action-check');
  if(action.step==='accepted'){
   // A move happens at once: no After Register, its toast says it (Q2).
   if(action.type==='MOVE')return null;
   if(TOAST_ONLY.has(action.type))return model.panel==='actions'?tilesFrame(model):null;
   return withKind(afterSheet({type:action.type}),'action-after');
  }
  return undefined;
 }
 // Once the server has the Disabler's position: the bar says it over the dark room, with no sheet (sheet 30).
 if(model.dark&&model.panel==='actions'&&model.privateArea?.blackoutTargeting?.selectedSlotId)return null;
 if(model.panel==='actions'&&!model.dark&&!model.phase?.expired)return tilesFrame(model);
 return undefined;
}

/**
 * The target bar while this viewer chooses: a person ("Rescue · Choose a player", Supply's second, on the board
 * "every room"), a move's position (moveBar: the viewer's room, whether the offer has a position here and in
 * another room, from the model's moveRooms), or the Disabler's position, then "Position A3 fixed" once the server
 * has it (blackoutBar, from the view's blackoutTargeting).
 */
export function actionsTarget(model,{view='room'}={}){
 if(!player(model))return undefined;
 const action=model.action,where=view==='board'?'board':'room',targeting=model.privateArea?.blackoutTargeting??null;
 if(action?.type==='SELECT_BLACKOUT_SLOT'){
  if(!['slots','sending','accepted'].includes(action.step)||!targeting?.boundRoom)return undefined;
  return blackoutBar({room:targeting.boundRoom});
 }
 if(!action){
  if(model.dark&&model.panel==='actions'&&targeting?.selectedSlotId&&targeting.boundRoom)return blackoutBar({room:targeting.boundRoom,fixed:targeting.selectedSlotId});
  return undefined;
 }
 if(!FLOWS.has(action.type))return undefined;
 if(action.type==='MOVE'){
  if(!['targets','slots'].includes(action.step))return null;
  const own=ownLocation(model),rooms=model.moveRooms??[];
  // Off the board there is no room of the viewer's to name: the board's words.
  return moveBar({where:own?where:'board',room:own,here:!!own&&rooms.includes(own),elsewhere:rooms.some(room=>room!==own),picked:null});
 }
 if(action.step!=='targets'||!action.choices.some(choice=>isSeat(choice.value)))return null;
 return targetBar({type:action.type,where,picked:action.selected.filter(isSeat)});
}

/**
 * The floating chip while choosing: in the room, "Other rooms · n" when people the offer reaches stand elsewhere
 * on the public board, or a move's "Other rooms on the Board"; on the board, the List (a move has none).
 */
export function actionsChip(model,{view='room',room=null}={}){
 if(!player(model))return undefined;
 const action=model.action;
 if(action?.type==='SELECT_BLACKOUT_SLOT')return null;
 if(!action||!FLOWS.has(action.type))return undefined;
 if(action.type==='MOVE'){
  if(!['targets','slots'].includes(action.step)||view==='board')return null;
  const own=ownLocation(model);
  return moveChip({elsewhere:(model.moveRooms??[]).some(name=>name!==own)});
 }
 if(action.step!=='targets')return null;
 const seats=action.choices.map(choice=>choice.value).filter(isSeat);
 if(!seats.length)return null;
 if(view==='board')return targetChip({kind:'list'});
 const here=LOCATION_OF[room]??null;
 const elsewhere=seats.filter(id=>{const seat=model.board?.seats?.find(s=>s.seatId===id);return !!seat?.location&&seat.location!==here;}).length;
 return elsewhere?targetChip({kind:'other-rooms',count:elsewhere}):null;
}

/**
 * The shell's toast once the server accepts: "Turn passed" (27.3), "Moved to A3" (Q2, with this phone's own
 * position) and, for Hack Ship and Blackhole, which have no After Register (L7), "Hack Spaceship registered". Its
 * id is the command type and the phase (A4: the model gives no command id), so it shows once.
 */
export function actionsToast(model,{flow=null}={}){
 if(!player(model))return undefined;
 const action=model.action;
 if(action?.step!=='accepted'||!HELD.has(action.type))return undefined;
 const phase=model.phase?.id??'';
 if(action.type==='PASS_TURN')return passedToast({id:`pass:${phase}`});
 if(action.type==='MOVE')return flow?.type==='MOVE'&&flow.slot?movedToast({slot:flow.slot,id:`MOVE:${phase}:${flow.slot}`}):null;
 if(TOAST_ONLY.has(action.type))return registeredToast({type:action.type,id:`${action.type}:${phase}`});
 return null;
}

// ── The part in the sheet's body ─────────────────────────────────────────
/** The check's facts: the game's own words after its confirmation's question (planetConfirmation), until Frontend's (B7). */
export function confirmationFacts(text){
 const at=typeof text==='string'?text.indexOf('? '):-1;
 const rest=at===-1?'':text.slice(at+2).trim();
 return rest?[rest]:[];
}
/** The list's people (sheet 29): everyone the offer reaches, by room as the public board has them, the viewer's room first. */
export function actionsListGroups(model){
 const own=ownLocation(model),groups=new Map();
 for(const value of model.action?.choices?.map(choice=>choice.value).filter(isSeat)??[]){
  const seat=model.board?.seats?.find(s=>s.seatId===value),room=seat?.location??OFF_BOARD,who=person(model,value);
  if(!groups.has(room))groups.set(room,[]);
  groups.get(room).push({seat:value,name:who.name,character:who.character,health:seat?.health??null,you:value===model.ownSeatId});
 }
 const order=room=>room===own?-1:room===OFF_BOARD?LOCATIONS.length:LOCATIONS.indexOf(room);
 return [...groups].sort(([a],[b])=>order(a)-order(b)).map(([room,people])=>({room,people}));
}
/** The check's person or people (one, or Supply's two), from this phone's pick: the model has none for one person (A2). */
function flowTargets(model,flow,type){
 if(!ACTION_LOOKS[type]?.people)return [];
 return (flow?.type===type?flow.seats:[]).slice(0,ACTION_LOOKS[type].people).map(seat=>person(model,seat));
}
const flowPosition=(flow,type)=>type==='MOVE'&&flow?.type==='MOVE'&&flow.slot?{slot:flow.slot,room:flow.room??slotLocation(flow.slot)}:null;

/**
 * The part the sheet's body holds for Actions' frame, or null: its name (tiles, list, check, after, unknown or
 * pass), its key (a new key is a new part) and its input, every key of which is the model's or this phone's own
 * pick. While its command sends, the check is given its status only: it keeps the person and the facts it showed.
 */
export function actionsPart(model,{frame=null,flow=null,reducedMotion=false}={}){
 if(!frame?.kind||model.surface!=='player')return null;
 const common={viewer:model.ownSeatId??null,status:actionsStatus(model),interactive:true,reducedMotion:!!reducedMotion,versions:model.versions??null};
 const action=model.action;
 switch(frame.kind){
  case 'actions':return {name:'tiles',key:'tiles',input:{...common,turn:!model.dark&&!!model.ownSeatId&&model.activeSeatId===model.ownSeatId?'own':'other',round:Number.isSafeInteger(model.round)?model.round:null,tiles:actionsTiles(model),note:null}};
  case 'action-list':return action?{name:'list',key:`list:${action.type}`,input:{...common,type:action.type,groups:actionsListGroups(model),picked:action.selected.filter(isSeat)}}:null;
  case 'action-check':{
   if(!action)return null;
   if(action.step==='sending')return {name:'check',key:`check:${action.type}`,input:common};
   const position=flowPosition(flow,action.type);
   // A move's check names its position; without this phone's own tap there is none to name, and it draws nothing.
   const type=action.type==='MOVE'&&!position?null:action.type;
   return {name:'check',key:`check:${action.type}`,input:{...common,type,targets:type?flowTargets(model,flow,type):[],position,facts:type?confirmationFacts(action.confirmation):[],error:null}};
  }
  case 'action-after':return action?{name:'after',key:`after:${action.type}`,input:{...common,type:action.type,kind:AFTER_KINDS[action.type]??'registered',title:action.prompt||null,detail:null,people:null,steps:[]}}:null;
  case 'action-unknown':{
   const type=unknownType(flow);
   return {name:'unknown',key:'unknown',input:{...common,type,targets:type?flowTargets(model,flow,type):[],position:type?flowPosition(flow,type):null}};
  }
  case 'pass':return {name:'pass',key:'pass',input:{...common,note:null}};
  default:return null;
 }
}

// ── The taps ─────────────────────────────────────────────────────────────
/**
 * The parts' callbacks and every tap that chooses, each to the call the game already makes. `model` reads the
 * current model; `hold` keeps this phone's pick before the controller's choose. The controller asks for a move's
 * room and then its position, so one tap of a position replays both (the plan's answer a); a position in a room
 * other than the one chosen starts the move again from the rooms. The Disabler's position is fixed with one tap,
 * as sheet 30 draws it: choose, then confirm, which checks the offer before it sends.
 */
export function actionsHandlers({model,begin,choose,confirm,dismiss,openPanel,hold,focusReturn=null,live=()=>true}){
 const when=run=>(...args)=>{if(live())run(...args);};
 const pick=value=>{
  const action=model().action;
  if(action?.type==='MOVE'&&slotLocation(value)){
   hold({slot:value});
   if(action.step==='slots'&&!action.choices.some(choice=>choice.value===value))begin('MOVE');
   if(model().action?.type==='MOVE'&&model().action.step==='targets')choose(slotLocation(value));
   choose(value);
   return;
  }
  if(action?.type==='SELECT_BLACKOUT_SLOT'&&action.step==='slots'){hold({slot:value});choose(value);void confirm();return;}
  if(isSeat(value))hold({seat:value});
  choose(value);
 };
 return {
  // Move opens on the viewer's own room's positions (sheet 20, Q3), and ends with no sheet (Q2): it is begun
  // from the board, not from inside Actions. Every other tile begins its action from the tiles.
  onTile:when(type=>{
   if(type!=='MOVE'){begin(type);return;}
   dismiss();begin('MOVE');
   const action=model().action,own=ownLocation(model());
   if(action?.type!=='MOVE'){openPanel('actions');return;}
   if(action.step==='targets'&&action.choices.some(choice=>choice.value===own))choose(own);
  }),
  onPick:when(seat=>pick(String(seat))),
  onFocusReturn:when(detail=>focusReturn?.(detail)),
  choose:when(value=>pick(String(value))),
 };
}

/**
 * What Cancel does. On the target bar: back to the tiles, or, once the Disabler's position is fixed, only hide
 * the bar on this phone (T2). In the check: a move returns to choosing with nothing picked (Q1); anything else to
 * the tiles. While the command sends, Cancel only closes the check (L5): it recalls nothing.
 *   'tiles': openPanel('actions'); 'restart': the move's tile again; 'dismiss': close; null: not Actions'.
 */
export function actionsCancel(model,{where='target'}={}){
 const action=model.action;
 if(!action){
  if(where==='target'&&model.dark&&model.privateArea?.blackoutTargeting?.selectedSlotId)return 'dismiss';
  return null;
 }
 if(!HELD.has(action.type)||action.type==='PASS_TURN')return null;
 if(where==='check'&&action.type==='MOVE'&&action.step==='confirm')return 'restart';
 return 'tiles';
}
