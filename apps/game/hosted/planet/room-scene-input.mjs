// The room view on a player's phone is drawn by Designer's room scene (design/phone-ui/components/
// room-scene): the owner, 15 November 2026, for all five rooms. These pure functions map this phone's
// presentation model to the scene's inputs. They read the public board and this viewer's own offers only;
// nothing here decides who may act. The scene's callbacks report a tap, and the controller checks the
// current offer before it sends anything.
import {BOARD_ROOMS,LOCATION_OF,slotsOf} from '../board-v2-drawing/slots-four.mjs';

/** The rooms the scene draws; the capsule and the board view stay on the board renderer. */
export const ROOM_SCENE_ROOMS=Object.freeze([...BOARD_ROOMS]);
/** The scene's bundles: the room pictures and their lights-out pictures (room-scene/room-art.mjs). */
export const ROOM_SCENE_ART=Object.freeze(['scene-art','board-v2-motion-art','board-v2-films-art']);

/**
 * The room-art release a match's bundles carry, from its pinned versions. Integration fills this when it
 * registers room-drawing-1.0.0 in the art bundles (DSN-REQ-18): the art version that selects the release
 * maps to 'room-drawing-1.0.0'. Until then every match keeps today's pictures in the pack's framing.
 */
export function roomArtFor(_versions){return null;}

/** Whether this phone's room view is drawn by the scene: a player's phone, the room view, one of the five rooms. */
export const wantsRoomScene=({surface,view,room})=>surface==='player'&&view==='room'&&ROOM_SCENE_ROOMS.includes(room);

/** A new match, seat or art version is a new mount: nothing carries over between them. */
export const roomSceneKey=model=>JSON.stringify([model.matchId??null,model.ownSeatId??null,model.versions??null]);
/**
 * Whether a scene mounted under `key` must be replaced for this model. While the model withholds the
 * room (hidden, or reconnecting) it has no versions; only the match and the seat are compared then.
 */
export function roomSceneRemount(key,model){
 if(key===null)return false;
 const [match,seat,versions]=JSON.parse(key);
 return match!==(model.matchId??null)||seat!==(model.ownSeatId??null)||(model.versions!=null&&JSON.stringify(model.versions)!==JSON.stringify(versions));
}

/**
 * What the room view does with the scene for this model:
 * - 'none': no scene; 'dispose': remove the mounted one (another view, the capsule, the display, no room);
 * - 'remount': a new match, seat or art version replaces it;
 * - 'status': keep it with its status only, while the model withholds the room (hidden, or reconnecting),
 *   so a Blackout window's held frame survives;
 * - 'paint': mount it, or update it with every input.
 */
export function roomSceneLifecycle({mounted,key},model,{view,room,fits}){
 const wanted=wantsRoomScene({surface:model.surface,view,room}),viewless=!model.playerCount;
 if(!wanted||!fits&&!(viewless&&mounted))return mounted?'dispose':'none';
 if(mounted&&roomSceneRemount(key,model))return 'remount';
 return viewless?'status':'paint';
}

/**
 * The scene's callbacks. They report intent only: choose() checks the current offer before anything is
 * sent. Room B's control opens the Windows panel; the focus goes on to the next step's control, if any.
 */
export function roomSceneHandlers({choose,openPanel,focusNext}){
 return {
  onSeat:seat=>choose(String(seat)),
  onSlot:slot=>choose(String(slot)),
  onControl:id=>{if(id==='windows')openPanel('windows');},
  onFocusReturn:()=>focusNext?.(),
 };
}

/** concealed, stale (reconnecting, or the phase has run out) or live. */
export function roomSceneStatus(model){
 if(model.concealed)return 'concealed';
 return model.connection==='live'&&!model.phase?.expired?'live':'stale';
}

/**
 * Whether the room pictures can be drawn: true while the art is still loading, false once the art has
 * settled without one of the scene's bundles (the pack's sheet 45, "Room picture unavailable").
 */
export function roomSceneArtReady(dataset){
 if(dataset?.artSettled!=='true')return true;
 const loaded=new Set(String(dataset.art??'').split(' ').filter(Boolean));
 return ROOM_SCENE_ART.every(name=>loaded.has(name));
}

/** The match's trusted server time in epoch ms, advanced locally since the model's sample; null without one. */
export function trustedClock(model,monotonic){
 if(!model.presentation||!model.phase?.trusted||model.connection!=='live'||!Number.isFinite(model.presentation.nowMs))return null;
 const base=model.presentation.nowMs,at=monotonic();
 return {now:()=>base+Math.max(0,monotonic()-at)};
}

/** Who the lit room shows: this room's board seats, without anyone away on the Food Supply Task. */
export function roomScenePeople(model,room){
 const location=LOCATION_OF[room],away=new Set(model.food?.step?.kind==='AWAY'?model.food.step.awaySeatIds:[]);
 return (model.board?.seats??[]).filter(seat=>seat.location===location&&seat.slotId&&!away.has(seat.seatId)).map(seat=>{
  const who=model.identities?.find(identity=>identity.seatId===seat.seatId);
  const office=model.offices?.captainSeatId===seat.seatId?'captain':model.offices?.officerSeatId===seat.seatId?'officer':null;
  return {seat:seat.seatId,slot:seat.slotId,character:who?.characterId??null,
   name:seat.seatId===model.ownSeatId?'You':who?.displayName??`Player ${seat.seatId.slice(5)}`,health:seat.health,office};
 });
}

/**
 * This viewer's own offers in this room, from its current action only: the empty positions of a move or
 * the Blackout's fixed position, or the people it may choose. A shared display and a concealed phone get none.
 * In Actions' check and while it sends (release 3), the person or position this phone picked, marked (`flow`,
 * actions-input.mjs actionsFlow: the model has no pick then, A2); and once the server has the Disabler's
 * position, the bound room's positions with it marked (sheet 30).
 */
export function roomSceneTargets(model,room,flow=null){
 const action=model.action;
 if(model.surface!=='player'||model.concealed)return null;
 const here=()=>new Set(slotsOf(room,model.playerCount).map(slot=>slot.id));
 const targeting=model.privateArea?.blackoutTargeting??null;
 if(!action&&model.dark&&targeting?.selectedSlotId){
  const slots=targeting.slotIds.filter(id=>here().has(id));
  return slots.includes(targeting.selectedSlotId)?{slots,picked:targeting.selectedSlotId,icon:'position'}:null;
 }
 if(action&&flow?.type===action.type&&(['confirm','sending'].includes(action.step)||action.type==='SELECT_BLACKOUT_SLOT'&&action.step==='accepted')){
  if(['MOVE','SELECT_BLACKOUT_SLOT'].includes(action.type)){
   if(!flow.slot||!here().has(flow.slot))return null;
   const slots=action.type==='SELECT_BLACKOUT_SLOT'?(targeting?.slotIds??[flow.slot]).filter(id=>here().has(id)):[flow.slot];
   return {slots,picked:flow.slot,icon:action.type==='MOVE'?'move':'position'};
  }
  return flow.seats.length?{seats:[...flow.seats],picked:[...flow.seats]}:null;
 }
 if(!action?.choices?.length)return null;
 const picked=[...(action.selected??[])];
 if(['MOVE','SELECT_BLACKOUT_SLOT'].includes(action.type)&&!(action.type==='MOVE'&&action.step==='targets')){
  const slots=action.choices.map(choice=>choice.value).filter(value=>here().has(value));
  return slots.length?{slots,picked,icon:action.type==='MOVE'?'move':'position'}:null;
 }
 const seats=action.choices.map(choice=>choice.value).filter(value=>/^seat-[1-9]$/.test(value));
 return seats.length?{seats,picked}:null;
}

/**
 * The room's own control. Room B's opens the Windows panel (the pack's sheet 34), in the viewer's own room
 * while it is lit and current, and not while an action is open (as the pack's targeting states). It carries
 * no number: the windows that panel lists are in the model only while it is open. No other room has one
 * here: the Jail's status pill states a rule, which the phone never works out for itself.
 */
export function roomSceneControl(model,room,{lit,status}){
 if(model.surface!=='player'||status!=='live'||!lit||room!=='room-b'||model.action)return null;
 const own=model.board?.seats.find(seat=>seat.seatId===model.ownSeatId);
 return own?.location===LOCATION_OF[room]?{id:'windows',label:'Windows',icon:'window',enabled:true,kind:'button'}:null;
}

/** The Blackout window this phone's frame is held for: its id, or true for a window the model does not name. */
export const roomSceneHold=model=>model.phase?.kind==='BLACKOUT'?model.presentation?.blackout?.windowId??true:null;

/**
 * Every input of the scene for this phone. `view` is what the renderer measures and samples:
 * `room`, `size` (the room area between the bars), `dark` (the Blackout film's own darkness),
 * `reducedMotion`, `interactive`, `artReady`, `monotonic` (a monotonic clock in ms) and `flow`
 * (this phone's own pick in its action, which Actions' check marks).
 */
export function roomSceneInput(model,{room,size,dark=false,reducedMotion=false,interactive=true,artReady=true,monotonic=()=>0,flow=null}){
 const status=roomSceneStatus(model),lighting=model.dark||dark?'dark':'lit',player=model.surface==='player';
 const active=!model.dark&&model.phase?.kind==='ORDINARY_TURN'?model.activeSeatId??null:null;
 return {
  room,roster:model.playerCount,size:{width:size.width,height:size.height},
  // The public board, also in the Blackout's own darkness, where the scene draws no one but frames from
  // it if it opens there; in the authoritative dark the model has no board, so nobody is passed.
  people:status==='concealed'?[]:roomScenePeople(model,room),
  active,self:player?model.ownSeatId??null:null,lighting,hold:roomSceneHold(model),
  targets:roomSceneTargets(model,room,flow),control:roomSceneControl(model,room,{lit:lighting==='lit',status}),
  status,artReady,clock:trustedClock(model,monotonic),reducedMotion,interactive:player&&interactive,
  versions:model.versions??null,roomArt:roomArtFor(model.versions),
 };
}

/** The parts of an input that change what the scene shows; the clock object is new on every model. */
export const roomSceneInputKey=input=>JSON.stringify({...input,clock:input.clock!==null});
