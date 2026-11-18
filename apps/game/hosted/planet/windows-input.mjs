// Windows on a player's phone are Designer's windows component (design/phone-ui/components/windows, #299): the
// owner's plan of 16 November 2026, release 3, its third step (the Lead, 18 November). These pure functions map this
// phone's presentation model to the component's frame and input, and its taps to the calls the game already makes:
// showDrawing, then confirm, the controller's own, which check the current offer and the drawing before anything is sent.
//
// What they give is this room's or this phone's own: the windows are the controller's for the Windows panel (its
// privateArea, from ownPlanetWindows: this room's windows, this round's drawings, and whether this player stands at
// the window's station), and each drawing's author is named by the identities. A drawing outside the contract
// (PlanetDrawingSchema) is left out, never painted, as the component refuses one. Whether Show can be sent is the
// model's offer alone; a refused command says "Not available now" (T3), as the model gives no reason (A1). Nothing
// here works out a rule.
//
// The drawing being made, a Show under way and the drawing just shown are this phone's own (`flow`): the component's
// `draft`, `view` and `shown` (windows.md, decision 4). The model names no drawing just shown (W2), so the connection
// holds the ids of this player's drawings at the window when it sends, and the shown view begins with the view that
// has a new one.
import {PlanetDrawingSchema} from '@mothership/contracts';
import {PLANET_WINDOW_ENDPOINTS} from '@mothership/presentation';
import {WINDOWS_SHEET_ID,windowsSheet} from '../../../../design/phone-ui/components/windows/windows.mjs';

/** The sheet's id, the same for every view (the component's): the shell connection routes its footer by it. */
export {WINDOWS_SHEET_ID};
/**
 * The game's own words when the room gives no window: one sentence, for a room with no window and for windows closed
 * now alike (W1). The component draws it as its title, with no line, as Frontend has no second line.
 */
export const WINDOWS_NONE='No window is visible from your current location.';
/** A command the model does not offer now: T3's words, as the model carries no reason (A1). */
export const WINDOWS_NOT_AVAILABLE='Not available now';
/**
 * This phone's own: the view, the drawing being made with its key (this match, seat, round, window and place, as the
 * game's own local drawings were kept), a Show under way, and the drawing just shown.
 */
export const WINDOWS_START=Object.freeze({view:'windows',viewer:null,key:null,draft:null,sent:null,shown:null});

const player=model=>model.surface==='player'&&!model.concealed;
const seatNumber=seatId=>/^seat-[1-9]$/.test(String(seatId??''))?Number(String(seatId).slice(5)):null;
const offerOf=(model,type)=>model.privateArea?.offers?.find(offer=>offer.type===type)??null;
const ownSeat=model=>model.board?.seats?.find(seat=>seat.seatId===model.ownSeatId)??null;
/** A seat's name as the identities give it; "Player" keeps its number on one line (the Lead's polish, 18 November). */
function nameOf(model,id){
 const n=seatNumber(id),who=model.identities?.find(identity=>identity.seatId===id);
 return who?.displayName||`Player\u00a0${n}`;
}
/** This room's windows from the model (ownPlanetWindows), each one of the game's own. */
const roomWindows=model=>(model.privateArea?.windows??[]).filter(w=>Object.hasOwn(PLANET_WINDOW_ENDPOINTS,w.windowId));
/** The window at this player's station, which the model lets them draw at, if any. */
const stationWindow=model=>roomWindows(model).find(w=>w.canDraw===true)??null;
/** The round a draft's key belongs to (its first part). */
const keyRound=key=>key===null?null:String(key).split(':')[0];
/** The key a draft belongs to: a new round, another window or another place starts a blank one. */
function draftKey(model){
 const w=stationWindow(model),own=ownSeat(model);
 return w&&own?.slotId&&Number.isSafeInteger(model.round)?`${model.round}:${w.windowId}:${own.slotId}`:null;
}

/**
 * Whether the open sheet is Windows': the Windows panel with no other command drafted, or Show drafted or under way.
 * Never in the dark or once the phase has run out: those sheets stay the shell's.
 */
export function windowsOpen(model){
 if(!player(model)||model.dark||model.phase?.expired)return false;
 return model.action?model.action.type==='SHOW_WINDOW':model.panel==='windows';
}

/**
 * This room's windows in the component's terms: the two rooms by name, this player's first; the station, this
 * player's place, when the model lets them draw there; and this round's drawings, each with its author's seat and name.
 * A drawing that isn't the contract's (PlanetDrawingSchema), or by a seat that isn't one, is left out: never painted.
 */
export function windowsList(model){
 const own=ownSeat(model);
 return roomWindows(model).map(w=>{
  const [a,b]=PLANET_WINDOW_ENDPOINTS[w.windowId];
  return {windowId:w.windowId,rooms:b===own?.location?[b,a]:[a,b],station:w.canDraw===true&&own?.slotId?own.slotId:null,
   drawings:w.drawings.filter(d=>seatNumber(d.authorSeatId)!==null&&PlanetDrawingSchema.safeParse(d.drawing).success).map(d=>({id:d.id,order:d.order,round:d.round,
    author:{seat:seatNumber(d.authorSeatId),name:nameOf(model,d.authorSeatId)},drawing:{strokes:d.drawing.strokes}}))};
 });
}

/**
 * This phone's view, draft and Show, kept to what the model still allows. Null on a shared display or while concealed:
 * the draft goes then, and with another viewer (decision 4). The draft belongs to this round, window and place, and
 * goes at the round's end, the sheet open or not. It waits through the dark and a phase run out (the Lead, 18
 * November), and for the sheet to open again, unless the sheet shuts while a Show of it is under way: then it goes, as today's
 * sheet's drawing went whenever it closed (accepted, the drawing is in the list; refused, the game's status line says
 * so), and can't be shown twice by mistake. A Show this phone sent (`sent`: the window, and this player's drawings there when
 * it was sent) ends in the shown view once the model has a new drawing of this player's at that window; without the
 * server's acceptance it ends with the draft kept, and the game's status line says what happened. Accepted, it waits
 * for the next view, which has the drawing (A5). The shown view lasts until Done, or until the sheet closes.
 */
export function windowsFlow(flow,model){
 if(!player(model)||!model.ownSeatId)return null;
 const viewer=`${model.matchId}:${model.ownSeatId}`;
 let f={...WINDOWS_START,...(flow??{})};
 if(f.viewer!==viewer)f={...WINDOWS_START,viewer};
 // The round's end ends the draft, the sheet open or not.
 if(f.key!==null&&keyRound(f.key)!==String(model.round))f={...f,key:null,draft:null};
 if(!windowsOpen(model))return {...f,view:'windows',shown:null,sent:null,draft:f.sent?null:f.draft};
 const key=draftKey(model);
 if(key!==null&&key!==f.key)f={...f,key,draft:null,view:'windows',shown:null,sent:null};
 if(f.sent){
  const action=model.action,mine=new Set(f.sent.mine);
  const fresh=roomWindows(model).find(w=>w.windowId===f.sent.windowId)?.drawings.filter(d=>d.authorSeatId===model.ownSeatId&&!mine.has(d.id)).at(-1);
  if(fresh)f={...f,view:'shown',shown:fresh.id,draft:null,sent:null};
  else if(action?.type==='SHOW_WINDOW'){if(action.step==='accepted'&&!f.sent.accepted)f={...f,sent:{...f.sent,accepted:true,at:model.revision??null}};}
  else if(!f.sent.accepted||(model.revision??null)!==f.sent.at)f={...f,sent:null};
 }
 if(f.view==='shown'&&!stationWindow(model)?.drawings.some(d=>d.id===f.shown&&d.authorSeatId===model.ownSeatId))f={...f,view:'windows',shown:null};
 return f;
}

/** Show's state: busy while it sends and until the view has the drawing, enabled while the model offers it at this window, else refused with T3's words. */
function showCommand(model,flow){
 if(model.action?.type==='SHOW_WINDOW'&&model.action.step==='sending'||flow?.sent?.accepted)return {enabled:true,busy:true,reason:null};
 const w=stationWindow(model),offer=offerOf(model,'SHOW_WINDOW');
 return w&&offer?.windowIds?.includes(w.windowId)?{enabled:true,busy:false,reason:null}:{enabled:false,busy:false,reason:WINDOWS_NOT_AVAILABLE};
}

/** The component's whole input for the open view, with the shell's status ('live', 'stale' or 'concealed') and the device's Reduce motion. */
export function windowsInput(model,{flow=null,status='live',reducedMotion=false}={}){
 const f={...WINDOWS_START,...(flow??{})},windows=windowsList(model),station=windows.find(w=>w.station!==null)??null;
 const viewer=seatNumber(model.ownSeatId);
 const shown=f.view==='shown'&&station?.drawings.some(d=>d.id===f.shown&&d.author.seat===viewer)?f.shown:null;
 return {
  view:shown?'shown':'windows',status,interactive:true,reducedMotion:!!reducedMotion,viewer,
  windows,none:windows.length?null:{title:WINDOWS_NONE,line:null},
  draft:f.draft&&station&&f.draft.windowId===station.windowId?f.draft:null,
  show:showCommand(model,f),shown,
 };
}

/** The shell's sheet while it is Windows': the component's frame and footer for the view (windowsSheet), one id for every view. */
export function windowsFrame(model,{flow=null}={}){
 if(!windowsOpen(model))return null;
 return {sub:null,...windowsSheet(windowsInput(model,{flow})),kind:'windows'};
}

/** The part for the shell's open sheet when it is Windows' (`frame`, from windowsFrame), or null. */
export function windowsPart(model,{frame=null,flow=null,status='live',reducedMotion=false}={}){
 if(frame?.kind!=='windows'||frame.id!==WINDOWS_SHEET_ID)return null;
 return {name:'windows',key:'windows',input:windowsInput(model,{flow,status,reducedMotion})};
}

/**
 * The taps. A stroke, Undo, Clear and an ink are the component's own, reported as the whole draft (`onDraft`), which
 * this phone keeps (`setFlow`). Show sends the draft as it is: the controller's own draft of it (showDrawing), then
 * confirm, once the controller has checked the offer and the drawing. Done returns to the view with a blank draft.
 * `live()` is false once the renderer is disposed: then nothing is called.
 */
export function windowsHandlers({model,flow,setFlow,showDrawing,confirm,focusReturn=null,live=()=>true}){
 const when=run=>(...args)=>{if(live())run(...args);};
 const current=()=>({...WINDOWS_START,...(flow()??{})});
 const ready=()=>{const action=model().action;return action?.type==='SHOW_WINDOW'&&action.step==='confirm'&&action.canConfirm===true;};
 function show(){
  const m=model(),f=current(),w=stationWindow(m);
  if(!windowsOpen(m)||f.view!=='windows'||f.sent||!w||f.draft?.windowId!==w.windowId||!f.draft.strokes.length)return;
  const mine=w.drawings.filter(d=>d.authorSeatId===m.ownSeatId).map(d=>d.id);
  showDrawing(w.windowId,{strokes:f.draft.strokes.map(s=>({color:s.color,width:s.width,points:s.points.map(([x,y])=>[x,y])}))});
  // The controller refused the draft (no offer, a drawing out of its limits): nothing is under way.
  if(!ready())return;
  setFlow({...f,sent:{windowId:w.windowId,mine,accepted:false,at:null}});
  void confirm();
 }
 return {
  onDraft:when(draft=>{
   const f=current(),w=stationWindow(model());
   if(f.view==='windows'&&!f.sent&&w&&draft?.windowId===w.windowId)setFlow({...f,draft:{windowId:draft.windowId,ink:draft.ink,strokes:draft.strokes}});
  }),
  onFocusReturn:when(detail=>focusReturn?.(detail)),
  // The sheet's footer, which the shell connection hands here while the sheet is Windows'.
  action:when(id=>{
   if(id==='show')show();
   else if(id==='done')setFlow({...current(),view:'windows',shown:null,draft:null,sent:null});
  }),
 };
}
