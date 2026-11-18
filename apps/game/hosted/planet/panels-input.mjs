// The Panels tab on a player's phone is Designer's panels component (design/phone-ui/components/panels, #296): the
// owner's plan of 16 November 2026, release 3, its first step after Actions (the Lead, 18 November). These pure
// functions map this phone's presentation model to the component's frame and input, and its taps to the panels the
// game already opens. What they give is public (the seats, their rooms, health and offices; the round's order in the
// game's words) or this phone's own (its room's windows). Whether a destination opens stays the game's, as today:
// every row opens its panel, and that panel says the rest. The model carries no "can open it now" outside a
// destination's own panel (#222), so nothing here works one out.
import {PLANET_WINDOW_ENDPOINTS,planetRoundOrderText} from '@mothership/presentation';
import {panelsSheet} from '../../../../design/phone-ui/components/panels/panels.mjs';

/** The game's panels that are the component's three views (one sheet, the Lead's answer 1). */
const VIEWS=Object.freeze({panels:'list',players:'players','round-order':'round-order'});
/** What the rows open: the game's own panels, as today's buttons did. */
export const PANELS_OPENS=Object.freeze(['windows','navigation','hospital','players','round-order']);
/**
 * The round's steps, by the game's own words for them (planetRoundOrderText, the ruleset's order for this tuple), to
 * the component's kinds, for their icons. A step the game names otherwise keeps its words and takes the Round order
 * icon, the component's fallback (answer 5).
 */
export const PANELS_STEP_KINDS=Object.freeze({
 'Food Supply':'food-supply','Pre-turn':'pre-turn','Player turns':'turns','Private talk':'private-talk','Sync when applicable':'sync',
 Blackout:'blackout','Damage and Hospital placement':'hospital','Jail vote':'jail-vote',Result:'result',
 'Remaining resolution, hunger and Rescue':'resolution','Remaining resolution and Rescue':'resolution',Resolution:'resolution',Navigation:'navigation',
});
/** Every destination opens, as today; the panel it opens says who can use it. The model gives no reason here (#222). */
const OPENS_TODAY=Object.freeze({enabled:true,reason:null});

const player=model=>model.surface==='player'&&!model.concealed;
const seatNumber=seatId=>{const n=Number(String(seatId??'').slice(5));return Number.isSafeInteger(n)&&n>=1?n:null;};

/** The component's view for the model's panel ('list', 'players' or 'round-order'), or null when the Panels tab isn't open. */
export function panelsView(model){return player(model)?VIEWS[model.panel]??null:null;}

/** The shell's sheet for the Panels tab: the component's frame for the view (panelsSheet), one id for the three views. */
export function panelsFrame(model){
 const view=panelsView(model);
 return view?{sub:null,...panelsSheet({view}),kind:'panels'}:null;
}

/**
 * This phone's room's windows, as pairs of room names: the presentation's own window endpoints (PLANET_WINDOW_ENDPOINTS)
 * that name the room the public board has the viewer in. Off the board, or in a room with none, there are none, and the
 * row says "No window here". Open or closed now is the Windows panel's, which the row opens.
 */
export function panelsWindows(model){
 const own=model.board?.seats?.find(seat=>seat.seatId===model.ownSeatId)?.location??null;
 const rooms=own?Object.values(PLANET_WINDOW_ENDPOINTS).filter(pair=>pair.includes(own)).map(pair=>[...pair]):[];
 return {...OPENS_TODAY,rooms};
}

/**
 * Every seat's public facts, in seat order: the seat, the name and character the identities give, the room, health and
 * jail the public board gives, and the two offices. Nothing else: the component refuses any other key.
 */
export function panelsPlayers(model){
 const who=new Map((model.identities??[]).map(identity=>[identity.seatId,identity]));
 const offices=model.offices??{};
 return (model.board?.seats??[]).map(seat=>{
  const n=seatNumber(seat.seatId),identity=who.get(seat.seatId);
  return {seat:n,name:identity?.displayName||`Player ${n}`,character:identity?.characterId??null,location:seat.location??null,health:seat.health,
   jailed:seat.jailed===true,captain:!!offices.captainSeatId&&offices.captainSeatId===seat.seatId,officer:!!offices.officerSeatId&&offices.officerSeatId===seat.seatId};
 }).filter(p=>p.seat!==null).sort((a,b)=>a.seat-b.seat);
}

/**
 * The round's steps in the game's words and order (planetRoundOrderText for this tuple). The game has no timing in its
 * words for a step, so none is given and the row shows its name alone (#222: the round's steps as structured data).
 */
export function panelsSteps(versions){
 return planetRoundOrderText(versions??null).split(' · ').filter(Boolean).map(title=>({kind:PANELS_STEP_KINDS[title]??'step',title,timing:null}));
}

/** The component's whole input for the open view, with the shell's status ('live', 'stale' or 'concealed') and the device's Reduce motion. */
export function panelsInput(model,{status='live',reducedMotion=false}={}){
 return {view:panelsView(model)??'list',status,interactive:true,reducedMotion:!!reducedMotion,viewer:seatNumber(model.ownSeatId),versions:model.versions??null,
  windows:panelsWindows(model),navigation:{...OPENS_TODAY},hospital:{...OPENS_TODAY},players:panelsPlayers(model),steps:panelsSteps(model.versions)};
}

/**
 * The part for the shell's open sheet when it is the Panels tab's (`frame`, from panelsFrame), or null. While players
 * are away on the frozen Food release's Task, Players stays the game's own words for them ("Away on the Food Supply
 * Task"), which the component doesn't draw (panels.md, answers 4 and 7).
 */
export function panelsPart(model,{frame=null,status='live',reducedMotion=false}={}){
 if(frame?.kind!=='panels')return null;
 const view=panelsView(model);
 if(!view||view==='players'&&model.food?.step?.kind==='AWAY')return null;
 return {name:'panels',key:'panels',input:panelsInput(model,{status,reducedMotion})};
}

/** The rows' taps: each opens the game's own panel, as today's Panels buttons did. Nothing else is sent. */
export function panelsHandlers({openPanel,focusReturn=null,live=()=>true}){
 return {
  onOpen:destination=>{if(live()&&PANELS_OPENS.includes(destination))openPanel(destination);},
  onFocusReturn:detail=>{if(live())focusReturn?.(detail);},
 };
}
