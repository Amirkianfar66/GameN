// Before the match, the Planet app draws Designer's pre-game components (release 4 of the owner's plan of
// 16 November 2026): the main menu, Display settings, host setup and the lobby, Join and waiting, Recover,
// character selection, the role stage and boarding. These pure functions decide which screen a phone shows and
// map the session's model, and this phone's own drafts, to each component's input. They decide no rule: every
// availability is the session's (`busy`, `canChoose`, `canReady`, the connection) or today's own arithmetic
// moved here unchanged (the bot range and Start's seats to fill, G2). Where the model gives nothing (a team mix,
// a refusal code, a recovery code's length, a closed flag), the input says nothing (G1, G3–G5). Where the game has
// no command (leaving a lobby, withdrawing a request), the control is drawn unavailable with NO_COMMAND's words (G6).
import {CREW_NAME_MAX_LENGTH,CrewDisplayNameSchema} from '@mothership/contracts';
import {planetRoleLook} from '@mothership/presentation';
import {CREW} from '../crew-drawing/crew.mjs';

/** The screens this connection draws; any other state keeps the app's own view. */
export const PREGAME_SCREENS=Object.freeze(['menu','display','host-setup','host-lobby','join','join-wait','recover','characters','role','boarding']);
/** The entry modes (G13): the menu is the default, and each of its choices opens its own screen. */
export const ENTRY_MODES=Object.freeze(['menu','display','host','join','recover']);
/** The player counts a room opens with, as today's create form offers them. */
export const PLAYER_COUNTS=Object.freeze([7,8,9]);
/** The connection's words for the phone's own Reduce Motion (Frontend's to review): Display settings' lock. */
export const MOTION_LOCK_REASON='On, because this phone asks for less motion';
/**
 * The connection's words for a control the game has no command for yet (G6, the Lead's decision of 17 November
 * 2026): host Leave, waiting's Cancel and Leave, and Back to menu once a request settles. Each is drawn dimmed
 * and refused, with these words as its description, rather than a button that does nothing.
 */
export const NO_COMMAND_REASON='Not available in this test';
/** The session's own word for a request it registered; it is not a refusal. */
export const REGISTERED='Request registered.';
const CODE=/^[A-Z0-9]{6}$/;
const seatNumber=seatId=>Number(String(seatId).slice(5));
const control=(enabled,busy=false,reason=null)=>({enabled:!!enabled,busy:!!busy,reason});
const noCommand=()=>control(false,false,NO_COMMAND_REASON);
const own=model=>model.members.find(member=>member.seatId===model.selfSeatId)??null;

/** The phone's local state the screens read: navigation, drafts and the command it last sent (G10). */
export function createPregameUi(){
 return {mode:'menu',lastOp:null,hostCount:7,join:{tried:false},recover:{matchId:'',codeLength:0,pending:null,recovered:null},
  lobby:{copied:false,toast:null},choosing:null};
}

/** The command a control sent, while the session is busy with it: one flag becomes one busy control (G10). */
export const busyWith=(model,ui,op)=>model.busy&&ui.lastOp===op;

/**
 * Which screen this phone shows, or null for the app's own view. The app keeps its own view for an uncertain
 * request (Retry), a session that is not live before a match (Reconnect), an authorization error, an aborted or
 * running match, a seatless host device while players choose, read and board (G15), and an admitted shared
 * display in the lobby (it shows the display's own screens).
 */
export function pregameScreen(model,ui){
 if(model.uncertain)return null;
 if(ui.recover.recovered&&model.matchId===ui.recover.recovered.matchId&&model.selfSeatId)return 'recover';
 if(model.pendingAdmission)return 'join-wait';
 if(!model.matchId){
  if(model.connection!=='live')return null;
  return ui.mode==='display'?'display':ui.mode==='host'?'host-setup':ui.mode==='join'?'join':ui.mode==='recover'?'recover':'menu';
 }
 if(model.connection==='error'||model.status===null)return null;
 const seated=!!own(model);
 if(model.status==='lobby')return model.isHost?'host-lobby':seated?'join-wait':null;
 if(model.status==='choosing')return seated?'characters':null;
 if(model.status==='reading')return seated?'role':null;
 if(model.status==='boarding')return seated||!model.isHost?'boarding':null;
 return null;
}

/**
 * While the model withholds a matched screen's data (hidden, or reconnecting), the screen already mounted stays
 * and is told only that: 'concealed' while this phone is hidden, 'stale' while the session reconnects. An
 * authorization error drops it (the app's own message screen).
 */
export function withheldStatus(model,{visible}){
 if(!model.matchId||model.connection==='error'||model.uncertain)return null;
 if(!visible)return 'concealed';
 if(model.connection!=='live'||model.status===null)return 'stale';
 return null;
}

/** Live, stale or concealed, for the three stages (the phone shell's status). */
export function stageStatus(model,{visible}){
 if(!visible)return 'concealed';
 return model.connection==='live'?'live':'stale';
}

/** A refusal the session gave for the command this screen sent: its own words (G3). */
export function refusal(model,ui,op){
 if(ui.lastOp!==op||model.busy||!model.message||model.message===REGISTERED)return null;
 return model.message;
}

// ── The menu and Display settings ────────────────────────────────────────────────────────────────────────

/** The main menu: each choice available while the session is free (it is live here); no offline note (G14). */
export function menuInput(model,ui,prefs){
 const free=control(!model.busy);
 return {notice:null,join:free,host:free,recover:free,settings:{enabled:true},reducedMotion:prefs.reduced};
}

/** Display settings: the stored choice, the phone's own Reduce Motion as the lock (G9), and the text size. */
export function displayInput(prefs){
 return {reducedMotion:prefs.reducedMotion,motionLock:prefs.deviceReduced?{reason:MOTION_LOCK_REASON}:null,textScale:prefs.textScale};
}

// ── Host setup and the lobby ─────────────────────────────────────────────────────────────────────────────

/**
 * Host setup: today's three counts, the draft count and Open room from the session's busy flag. The game gives no
 * team mix yet, so each count goes with `mix: null` and no line is drawn under 7/8/9 (G1 (a), the Lead's decision
 * of 17 November 2026; host-setup 0.1.1). The mix stays the engine's to give.
 */
export function hostSetupInput(model,ui,prefs,{mix=()=>null}={}){
 return {counts:PLAYER_COUNTS.map(value=>({value,mix:mix(value)})),count:ui.hostCount,open:control(!model.busy,busyWith(model,ui,'create')),
  error:refusal(model,ui,'create'),reducedMotion:prefs.reduced};
}

/** The bot range and Start's availability, as today's lobby works them out (G2), moved here unchanged. */
export function lobbyCounts(model){
 const humans=model.members.filter(member=>member.controller==='human').length,bots=model.members.filter(member=>member.controller==='bot').length;
 const missing=(model.playerCount??0)-model.members.length;
 return {humans,bots,max:Math.max(0,(model.playerCount??0)-humans),missing,startReason:missing>0?`${missing} more seats to fill`:null};
}

/** The host's lobby: the code, the seats, who asks to join, the bots and Start, each busy on its own (G10). */
export function hostLobbyInput(model,ui,prefs){
 const counts=lobbyCounts(model),free=!model.busy;
 const members=[...model.members].sort((a,b)=>seatNumber(a.seatId)-seatNumber(b.seatId)).map(member=>({seat:seatNumber(member.seatId),name:member.displayName,
  kind:member.seatId===model.selfSeatId?'host':member.controller==='bot'?'bot':'person'}));
 const requests=model.pendingAdmissions.map(request=>({id:request.id,name:request.displayName,device:request.kind==='display'?'display':'phone',
  admit:control(free,busyWith(model,ui,`approveAdmission:${request.id}`))}));
 return {roomCode:model.roomCode,copied:ui.lobby.copied,toast:ui.lobby.toast,seats:model.playerCount?{filled:model.members.length,total:model.playerCount}:null,members,requests,
  bots:{count:counts.bots,max:counts.max,enabled:free,busy:busyWith(model,ui,'setBots'),reason:null},
  start:control(free&&counts.missing===0,busyWith(model,ui,'beginSetup'),counts.startReason),leave:noCommand(),notice:null,reducedMotion:prefs.reduced};
}

// ── Join and waiting ─────────────────────────────────────────────────────────────────────────────────────

/** The draft's room code as the contract writes it: capitals and digits, at most six. */
export const roomCodeDraft=text=>String(text).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
/** The name as the contract counts it (today's count: the trimmed name's characters). */
export const nameCount=name=>[...String(name).trim()].length;
export const nameValid=name=>CrewDisplayNameSchema.safeParse(String(name).trim()).success;
export const codeValid=code=>CODE.test(code);

/**
 * The Join form: the draft echoed back, the name's count and rule. Ask is available once the draft makes a request
 * (the code's form and the name's rule, the contract's own, as `joinRequest` reads them) and the session is free; with
 * an empty or partial form it is drawn unavailable, as sheet 12's Empty state draws it.
 */
export function joinInput(model,ui,draft,prefs){
 const name=draft.displayName,showRule=name.length>0||ui.join.tried;
 return {code:draft.roomCode,codeError:null,name,nameCount:nameCount(name),nameMax:CREW_NAME_MAX_LENGTH,nameError:showRule&&!nameValid(name)?`Use 1–${CREW_NAME_MAX_LENGTH} characters.`:null,
  device:draft.kind==='display'?'display':'player',ask:control(!model.busy&&joinRequest(draft)!==null,busyWith(model,ui,'requestAdmission')),error:refusal(model,ui,'requestAdmission'),reducedMotion:prefs.reduced};
}

/** The request Ask sends, or null while the draft can't be sent (the code's form, the name's rule). */
export function joinRequest(draft){
 const roomCode=roomCodeDraft(draft.roomCode),displayName=String(draft.displayName).trim();
 if(!codeValid(roomCode)||!nameValid(displayName))return null;
 return {operation:'requestAdmission',roomCode,kind:draft.kind==='display'?'display':'player',displayName};
}

/**
 * Waiting: the request's state while it is pending, then this phone's seat and the room once admitted. An
 * authorization error is the session's own words under the line, as today's waiting view shows them.
 */
export function waitInput(model,ui,draft,prefs){
 const name=String(draft.displayName).trim()||null,base={name,check:control(!model.busy),cancel:noCommand(),leave:noCommand(),back:noCommand(),
  error:model.connection==='error'?model.message:null,reducedMotion:prefs.reduced};
 const request=model.pendingAdmission;
 if(request)return {...base,view:request.status==='closed'?'closed':request.status==='declined'?'declined':'pending',roomCode:request.roomCode};
 const members=[...model.members].sort((a,b)=>seatNumber(a.seatId)-seatNumber(b.seatId)).map(member=>({seat:seatNumber(member.seatId),name:member.displayName}));
 return {...base,view:'admitted',roomCode:model.roomCode,seat:seatNumber(model.selfSeatId),members,seats:{filled:model.members.length,total:model.playerCount}};
}

// ── Recover ──────────────────────────────────────────────────────────────────────────────────────────────

/** Recover: the Match ID draft, Recover seat once both boxes hold something; no code length (G4). */
export function recoverInput(model,ui,prefs){
 const r=ui.recover;
 if(r.recovered&&model.selfSeatId)return {view:'recovered',seat:seatNumber(model.selfSeatId),matchId:r.matchId,recover:control(false),error:null,reducedMotion:prefs.reduced};
 return {view:'form',matchId:r.matchId,codeLength:null,codeError:null,recover:control(!model.busy&&r.matchId.trim().length>0&&r.codeLength>0,busyWith(model,ui,'redeemRecovery')),
  error:refusal(model,ui,'redeemRecovery'),reducedMotion:prefs.reduced};
}

// ── The three stages ─────────────────────────────────────────────────────────────────────────────────────

/** The nine characters in the grid's order, with their names from the game's character data. */
export const CHARACTERS=Object.freeze(Array.from({length:9},(_,i)=>Object.freeze({id:`c${i+1}`,name:CREW[`c${i+1}`].sign})));

/** Character selection: the public grid and clock; this phone's choice and the session's offer (G5). */
export function charactersInput(model,ui,prefs,{visible}){
 const self=own(model),holders={};
 for(const member of model.members)if(member.seatId!==model.selfSeatId&&member.characterId)holders[member.characterId]=seatNumber(member.seatId);
 const saving=busyWith(model,ui,'chooseCharacter')&&ui.choosing?{id:ui.choosing,state:'saving'}:null;
 return {status:stageStatus(model,{visible}),viewer:model.selfSeatId,versions:model.versions,characters:CHARACTERS,holders,
  timer:Number.isFinite(model.remainingMs)?{remainingMs:model.remainingMs}:null,closed:false,
  mine:saving??(self?.characterId?{id:self.characterId,state:'confirmed'}:null),choose:control(model.canChoose),reducedMotion:prefs.reduced};
}

/** The server's interval, from its synchronized clock: where it is now, and when the film and the stage end. */
export function stageClock(model){
 const setup=model.setup,clock=model.setupClock;
 if(!setup||clock?.status!=='synced'||!Number.isFinite(setup.startedAt)||!Number.isFinite(setup.endsAt))return null;
 return {elapsedMs:Math.max(0,clock.serverNowMs-setup.startedAt),startedAt:setup.startedAt,filmAtMs:Number.isFinite(setup.roleFilmStartsAt)?setup.roleFilmStartsAt-setup.startedAt:null,endsAtMs:setup.endsAt-setup.startedAt};
}

/**
 * The role stage. The film keeps playing in today's player, over the stage; the stage shows the card until the
 * film's time, then the view after it. The card has no knowledge lines and no facts until there is accepted copy
 * (G7, G16); it is face down while this phone is hidden or the role is concealed (the session's reveal flag).
 */
export function roleInput(model,ui,prefs,{visible}){
 const self=own(model),clock=stageClock(model),role=model.ownRole;
 const timed=clock&&clock.filmAtMs>0&&clock.endsAtMs>clock.filmAtMs?{elapsedMs:clock.elapsedMs,filmAtMs:clock.filmAtMs,endsAtMs:clock.endsAtMs}:null;
 const look=role?planetRoleLook(role.role,role.faction):null;
 // The session gives the role only while it is shown and this viewer isn't ready: before Show role it is the
 // card's back with Show role (concealed); once ready, the stamp and the count, with the card face down.
 const status=!visible?'concealed':model.connection!=='live'?'stale':role||self?.ready?'live':'concealed';
 return {status,viewer:model.selfSeatId,clock:timed,view:timed&&timed.elapsedMs>=timed.filmAtMs?'after':'card',film:'pending',
  card:role?{role:role.role,team:role.faction,facts:null,character:self?.characterId??null,device:look?.device??null,art:'ok'}:null,
  ready:{mode:self?.ready?'done':'ready',enabled:model.canReady,busy:busyWith(model,ui,'ready'),reason:null},
  roster:model.playerCount?{ready:model.members.filter(member=>member.ready).length,total:model.playerCount}:null,reducedMotion:prefs.reduced};
}

/** Boarding: the server's interval; the holding screen while it runs, then waiting for the round. No Skip: the film is today's. */
export function boardingInput(model,prefs,{visible}){
 const clock=stageClock(model);
 return {status:stageStatus(model,{visible}),viewer:model.selfSeatId,clock:clock?{elapsedMs:clock.elapsedMs,endsAtMs:clock.endsAtMs}:null,
  view:clock&&clock.elapsedMs>=clock.endsAtMs?'waiting':'holding',skip:null,reducedMotion:prefs.reduced};
}

// ── The round stamp (part 9) ─────────────────────────────────────────────────────────────────────────────

/**
 * The round stamp's input (#288, "ROUND 1" over the room as Round 1 begins), or null while it isn't mounted: no
 * moment (the shell connection's roundStart(model): Round 1's Before turns, public facts only), or the room view
 * isn't showing. The clock is the shell connection's trusted server time, or null (the stamp then draws nothing);
 * the status is the shell's own. The stamp keeps its own time: a late phone finds its window past and draws nothing.
 */
export function roundStampInput(moment,{clock=null,status,reducedMotion,room}){
 if(!moment||!room)return null;
 return {round:moment.round,window:{id:moment.window.id,startedAt:moment.window.startedAt},clock:clock??null,status,reducedMotion:!!reducedMotion};
}
