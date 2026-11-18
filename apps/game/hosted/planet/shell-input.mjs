// The match's frame on a phone is Designer's phone shell (design/phone-ui/components/phone-shell): the
// owner's plan of 16 November 2026, release 2. These pure functions map this phone's presentation model
// to the shell's input, and the shell's intents to the calls the game already makes. They use only what
// the model gives this viewer: enabled states come from the model's offers (and, for an eliminated player's
// Actions, the public board, as the presentation offers that seat nothing); where it gives none the shell
// keeps its default. Nothing here works out who may act from the rules; the controller checks the current
// offer before it sends anything.
import {LOCATION_OF} from '../board-v2-drawing/slots-four.mjs';
import {PHASE_BAR_PHASES,loadingBar,phaseBar,phaseClosedToast,reconnectingBar} from '../../../../design/phone-ui/components/phone-shell/phase-bars.mjs';
import {actionsChip,actionsFrame,actionsTarget,actionsToast} from './actions-input.mjs';
import {panelsFrame} from './panels-input.mjs';
import {PROMISES_SHEET_ID,promisesFrame,promisesOpen,promisesToast} from './promises-input.mjs';

/**
 * Today's names (render.mjs before the shell) for the phases whose bar is still the game's own: the votes, the
 * private talk, Food Supply and a turn with no one active. Every other phase's words are Designer's, in
 * phase-bars.mjs (shell 0.2.10), which shellBar() calls: Before turns, the Officer's appointment, the Blackout,
 * Ship synchronized and Setting course.
 */
export const SHELL_PHASE_NAMES=Object.freeze({FOOD_SUPPLY:'Food Supply',ORDINARY_TURN:'Turn',CAPTAIN_ELECTION:'Captain vote',JAIL_VOTE:'Jail vote',VOTE_RESULT:'Vote result',HACK:'Private talk',HACK_DECLARE:'Declare side',HACK_RESULT:'Private claim'});
/** Those bars' icons, as the pack's bars draw them (ui.mjs topBar on sheets 07, 35, 38 and 44). */
export const SHELL_PHASE_ICONS=Object.freeze({FOOD_SUPPLY:'supply',ORDINARY_TURN:'turn',CAPTAIN_ELECTION:'captain',JAIL_VOTE:'vote',VOTE_RESULT:'jail',HACK:'talk',HACK_DECLARE:'declare',HACK_RESULT:'talk',FINISHED:'flag'});
/** The target bar's icon for each action, from the phone's icon family. */
export const SHELL_ACTION_ICONS=Object.freeze({PASS_TURN:'pass',MOVE:'move',REGISTER_SHOT:'shoot',PROTECT:'protect',RESCUE:'rescue',SUPPLY:'supply',SCAN:'scan',SUBMIT_CODE:'code',ACTIVATE_SHIP_HACK:'shipHack',ENGINEER_SUPPRESS:'suppress',ACTIVATE_BLACKHOLE:'blackhole',ACTIVATE_CLONE:'clone',REQUEST_BLACKOUT:'blackout',SELECT_BLACKOUT_SLOT:'position',CAPTAIN_RELEASE:'release',CAPTAIN_EJECT:'eject',APPOINT_OFFICER:'appoint',BLOCK_MOVE:'block',CHOOSE_NAV_DIRECTION:'direction',CONFIRM_NAVIGATION:'acknowledge',VOTE:'vote',REQUEST_HACK:'talk',DECLARE_HACK_SIDE:'declare',PANEL_CODE:'panel',OFFER_PROMISE:'promise',ACCEPT_PROMISE:'check',DECLINE_PROMISE:'close',SHOW_WINDOW:'show'});
/** The two fixed presentations: a ring for the clock, and no Promises (sheet 07). */
export const SHELL_RING_PHASES=Object.freeze(['VOTE_RESULT','BLACKHOLE_PRESENTATION']);
const BALLOTS=['JAIL_VOTE','CAPTAIN_ELECTION'],TALK=['HACK_DECLARE','HACK_RESULT','HACK'];
/** The tab each panel belongs to: Panels' own pages keep the Panels tab open (sheet 27.5). */
const PANEL_TAB=Object.freeze({actions:'actions',card:'card',panels:'panels',windows:'panels',navigation:'panels',hospital:'panels',players:'panels','round-order':'panels'});
/** The pages reached from Panels, whose sheet has Back to Panels (sheet 27.5: "‹ returns to Panels"). */
const PANEL_PAGES=Object.freeze(['windows','navigation','hospital','players','round-order']);

const isSeat=value=>/^seat-[1-9]$/.test(value);
/** A public person for the bar: the seat, the display name (or "Player n") and the crew character. */
function person(model,seatId){
 const who=model.identities?.find(identity=>identity.seatId===seatId);
 return {seat:seatId,name:who?.displayName||`Player ${String(seatId).slice(5)}`,character:who?.characterId??null};
}

/** live, stale (connecting, reconnecting or an error) or concealed. The Food surface over the chrome conceals the shell. */
export function shellStatus(model,{food=null}={}){
 if(model.concealed||food?.active||food?.exclusive)return 'concealed';
 return model.connection==='live'?'live':'stale';
}

/** This viewer's own seat is Eliminated on the public board. */
export const ownOut=model=>model.surface==='player'&&!!model.ownSeatId&&model.board?.seats?.find(seat=>seat.seatId===model.ownSeatId)?.health==='Eliminated';
/** Why Actions is unavailable to an eliminated player (sheet 44): the presentation offers them no action. */
export const OUT_ACTIONS_REASON='You’re out. You can still watch.';

/** This phone is one of the two in a private talk (the pair is public). */
export const ownTalk=model=>model.surface==='player'&&!model.dark&&TALK.includes(model.phase?.kind)&&!!model.ownSeatId&&!!model.talk&&[model.talk.actorSeatId,model.talk.targetSeatId].includes(model.ownSeatId);
/**
 * The talk's own two buttons (Promises, My card) take the tabs' place during the 60 s talk only. While the
 * target declares and the claim shows, the declaration is offered in Actions, which the tabs keep in reach:
 * the capsule that would hold it (sheet 25) is a later component.
 */
export const talkButtons=model=>ownTalk(model)&&model.phase.kind==='HACK';

/** Today's rule for choosing on the scene or the board, where the target bar replaces the sheet. */
export function shellPicking(action){
 if(!action)return false;
 return !['PANEL_CODE','SUBMIT_CODE','VOTE'].includes(action.type)&&action.choices.some(choice=>isSeat(choice.value))
  ||action.type==='MOVE'&&['targets','slots'].includes(action.step)||action.type==='SELECT_BLACKOUT_SLOT'&&action.step==='slots';
}

/**
 * The round stamp's moment (#288's "ROUND 1", which the Pre-game builder's connection mounts on the shell's cover):
 * Round 1's first Before turns, the round's first phase that shows the room. Without the Food rules the engine
 * opens a match there; with them it opens Food Supply at once (lifecycle.ts), whose surface covers the shell, and
 * Before turns follows it, so the stamp lands when the room first shows, after Food Supply. Either way Round 1 has
 * one Before turns. Public facts only: the round and the phase's kind, id and start. A phone that arrives late gets
 * the same window, and the stamp's own clock finds it past and draws nothing.
 */
export function roundStart(model){
 const p=model?.phase;
 if(model?.round!==1||p?.kind!=='PRE_TURN'||typeof p.id!=='string'||!p.id||!Number.isFinite(p.startedAt))return null;
 return {round:1,window:{id:p.id,startedAt:p.startedAt}};
}

/**
 * The match's trusted server time, for a part that keeps time with the server (the round stamp): the phase's
 * nowMs, the server's time when the model was made, plus the time since it arrived by this phone's monotonic clock.
 * `observe(model)` on each model; `current()` is the clock, `{ now() }`, only while the phone is live and the
 * phase's time trusted and not run out; otherwise null, and a part given null draws nothing. A model shown again
 * keeps its first arrival, so its time doesn't start over.
 */
export function createServerClock({monotonic}){
 let base=null;
 const clock=Object.freeze({now:()=>base?base.server+Math.max(0,monotonic()-base.local):Number.NaN});
 return Object.freeze({
  observe(model){
   const p=model?.phase;
   if(model?.connection!=='live'||!p?.trusted||p.expired||!Number.isFinite(p.nowMs)){base=null;return;}
   if(base?.server!==p.nowMs)base={server:p.nowMs,local:monotonic()};
  },
  current:()=>base?clock:null,
 });
}

/** A choice in progress on this phone: begun and not yet sent (the presentation model's steps before `sending`). */
export const SHELL_CHOOSING=Object.freeze(['targets','slots','faction','direction','number','promise','confirm']);
/**
 * The phases whose own surface says they closed, so phaseClosed() stays silent for them. None today. When #267's
 * ballot is connected and keeps "Voting closed" itself (sheet 35), the change that connects it names the two votes
 * here, in the same change.
 */
export const SHELL_CLOSES_ITSELF=Object.freeze([]);
/**
 * A phase that closed under this phone's open choice (sheet 45's stale frame, "That phase closed · choices
 * cleared"): the model painted just before had a choice in progress, and in this one that phase's time is up or
 * another phase is on. The controller clears the choice there without a word; this is what tells the player.
 * Both models are live and this player's, in one match. Not this: a choice the player cancelled or sent, a lost
 * connection (the banner says it), a phone put away, a sheet with no choice in it, and a choice whose offer went
 * away inside a running phase. One rule for every phase, the Blackout's too: the toast goes to the phone that
 * showed the choice, as the target bar it replaces did, so it tells no one else anything. Returns { id }, the
 * closed phase's, so the toast shows once: at 0:00, and not again when the next phase arrives.
 */
export function phaseClosed(before,model){
 const mine=m=>m?.connection==='live'&&!m.concealed&&m.surface==='player'&&!!m.ownSeatId&&typeof m.phase?.id==='string'&&!!m.phase.id;
 if(!mine(before)||!mine(model)||before.matchId!==model.matchId||before.ownSeatId!==model.ownSeatId)return null;
 if(!before.action||!SHELL_CHOOSING.includes(before.action.step)||SHELL_CLOSES_ITSELF.includes(before.phase.kind))return null;
 const over=model.phase.id!==before.phase.id||model.phase.trusted===true&&model.phase.expired===true;
 return over?{id:before.phase.id}:null;
}

/** The clock while the server time is trusted: amber in the last 10 s, a ring for the two fixed presentations. */
export function shellTimer(model){
 const phase=model.phase;
 if(!phase?.trusted||!Number.isFinite(phase.remainingMs))return null;
 const span=phase.endsAt-phase.startedAt;
 if(!SHELL_RING_PHASES.includes(phase.kind)||!(span>0))return {remainingMs:phase.remainingMs,urgentAtMs:10000,ring:null};
 // Sheet 07 draws the ring without the amber (urgentAt -1): the whole stage is shorter than 10 s.
 return {remainingMs:phase.remainingMs,urgentAtMs:-1,ring:Math.min(1,Math.max(0,1-phase.remainingMs/span))};
}

/** The deciding player's own choice in a phase: the action the controller drafts for it, which the shell shows as its target bar. */
const OWN_ACTION=Object.freeze({OFFICER_APPOINTMENT:'APPOINT_OFFICER',PRE_TURN:'BLOCK_MOVE'});
/** The Navigation sheet's two actions: the Officer's choice on a tie, and each office's acknowledgement. */
const NAVIGATION_ACTIONS=Object.freeze(['CHOOSE_NAV_DIRECTION','CONFIRM_NAVIGATION']);
/**
 * What phase-bars.mjs is told for a phase it draws. Each fact is one the model already holds; nothing is worked
 * out from the rules, and no offer is read:
 *   own                  this phone has the deciding player's own choice open: the controller's draft of the
 *                        appointment or of the block (begun from Actions), on a player's phone
 *   chooser              the Captain's public name, as the turn bar names a player
 *   hasOfficer, blocked  the public offices name an Officer; a block is shown
 *   dark, lightsOutMs    the model's dark, which also darkens the room; while lit, the Blackout's preview end less
 *                        the trusted time (the presentation holds both)
 *   office               the office this viewer holds, from the public offices, while its Navigation is open: the
 *                        Navigation page, or one of its two actions
 */
export function shellPhaseFacts(model){
 const kind=model.phase?.kind??null,player=model.surface==='player',offices=model.offices??null,action=model.action?.type??null;
 const held=player&&model.ownSeatId?offices?.captainSeatId===model.ownSeatId?'captain':offices?.officerSeatId===model.ownSeatId?'officer':null:null;
 const blackout=model.presentation?.blackout??null;
 return {
  own:player&&!!OWN_ACTION[kind]&&action===OWN_ACTION[kind],
  chooser:offices?.captainSeatId?{name:person(model,offices.captainSeatId).name}:null,
  hasOfficer:!!offices?.officerSeatId,blocked:!!offices?.blockedSeatId,
  dark:!!model.dark,lightsOutMs:!model.dark&&blackout&&Number.isFinite(model.presentation.nowMs)?blackout.previewEndsAt-model.presentation.nowMs:null,
  office:held&&(model.panel==='navigation'||NAVIGATION_ACTIONS.includes(action))?held:null,
 };
}

/**
 * The top bar. A turn when not dark, in an ordinary turn with an active seat; the pair on the two talking
 * phones; otherwise the phase. Promises on a player's phone outside the fixed presentations. ⋮ on every phone,
 * a shared display's included: Settings is the one panel the controller opens on a display, for its preferences
 * and, when the display hosts, the host's controls, as today's header gave it. `lastRound` is the round this
 * phone last saw live, which the reconnecting bar names (sheet 45).
 * The words of a phase with no active player are Designer's (phase-bars.mjs): phaseBar() for the phases it draws,
 * reconnectingBar() while this phone is not live, and loadingBar() for the first connect, before it has seen a
 * round: the pack's Loading bar has no round, Promises or ⋮, and the model holds no count of pictures, so it is
 * the title alone.
 */
export function shellBar(model,{lastRound=null}={}){
 const player=model.surface==='player',kind=model.phase?.kind??null;
 const menu={open:model.panel==='settings'};
 if(model.connection!=='live'){
  if(model.connection==='connecting'&&!Number.isSafeInteger(lastRound))return loadingBar();
  return reconnectingBar({round:lastRound,promises:player?{count:model.promiseOfferCount??0,open:false}:null,menu});
 }
 const promises=player&&!SHELL_RING_PHASES.includes(kind)?{count:model.promiseOfferCount??0,open:model.panel==='promises'}:null;
 const base={round:model.round??null,timer:shellTimer(model),promises,menu};
 if(!model.dark&&kind==='ORDINARY_TURN'&&model.activeSeatId)return {kind:'turn',who:person(model,model.activeSeatId),self:player&&model.activeSeatId===model.ownSeatId,...base};
 if(ownTalk(model))return {kind:'pair',pair:[person(model,model.talk.actorSeatId),person(model,model.talk.targetSeatId)],sub:SHELL_PHASE_NAMES[kind],...base};
 if(PHASE_BAR_PHASES.includes(kind)){
  // The pack's words, the clock's amber and ring and the dark tone are the function's; Promises is given on every
  // player's phone, and the function drops it where the pack's bar has none.
  const span=model.phase.endsAt-model.phase.startedAt;
  return phaseBar({phase:kind,round:model.round??null,remainingMs:base.timer?.remainingMs??null,durationMs:span>0?span:null,...shellPhaseFacts(model),
   promises:player?{count:model.promiseOfferCount??0,open:model.panel==='promises'}:null,menu});
 }
 // The game's own bars, until their components connect: the board's label is the line under the name, as today's header said.
 const icon=kind==='VOTE_RESULT'?model.lastTally?.kind==='CAPTAIN_ELECTION'?'captain':'jail':SHELL_PHASE_ICONS[kind]??'hourglass';
 return {kind:'phase',icon,title:SHELL_PHASE_NAMES[kind]??(kind?kind.replaceAll('_',' '):'Connecting'),sub:model.boardLabel??null,tone:model.dark?'dark':null,...base};
}

/**
 * The raised round button: Vote or Voted while a ballot is open (Voted once this phone's ballot is the phase's);
 * Vote, unavailable, through the 5 s result, as the pack draws it (sheet 38; the shell's agreement case
 * `phase-result`); otherwise Pass. Usable as the model offers it; busy while its command is sending.
 */
export function shellHero(model){
 const action=model.action,sending=type=>action?.type===type&&action.step==='sending';
 if(model.phase?.kind==='VOTE_RESULT')return {mode:'vote',enabled:false};
 if(BALLOTS.includes(model.phase?.kind)){
  if(model.ownBallot&&model.ownBallot.phaseId===model.phase.id)return {mode:'voted',enabled:true};
  return {mode:'vote',enabled:!!model.canVote||sending('VOTE'),busy:sending('VOTE')};
 }
 return {mode:'pass',enabled:!!model.canPass||sending('PASS_TURN'),busy:sending('PASS_TURN')};
}

/**
 * This viewer's own person as last given, which the renderer keeps across a lost connection as it keeps the round
 * last seen. While the connection is live it is what the model gives now: in the dark that has no character, so
 * none is kept from before it. While it isn't live it is the one kept, for the same seat only: a new seat never
 * takes another's, and a shared display has none.
 */
export function ownPersonSeen(seen,model){
 if(model.surface!=='player'||!model.ownSeatId)return null;
 if(model.connection==='live')return person(model,model.ownSeatId);
 return seen&&seen.seat===model.ownSeatId?seen:null;
}

/**
 * A player's tabs (none on a shared display): the view, the open tab and the round button; the talk's two buttons
 * in the 60 s talk. An eliminated player keeps the Board, Card and Panels; Actions is unavailable (sheet 44), as
 * the presentation offers them nothing to act on.
 * `me` (shell 0.3.0, the owner's 18 November 2026 decision) is this viewer's own public person, as the bar's `who`:
 * the Card tab, now the last, draws their crew portrait. With no character yet the shell keeps the card icon.
 * `seen` is that person as last given (ownPersonSeen): while the connection isn't live the model has no identities,
 * so the tab keeps the one last seen for the same seat, as the bar keeps the round last seen.
 */
export function shellTabs(model,{view='room',seen=null}={}){
 if(model.surface!=='player')return null;
 if(talkButtons(model))return {variant:'talk',open:model.panel==='promises'?'promises':model.panel==='card'?'my-card':null};
 const tabs={variant:'game',view:view==='board'?'board':'room',open:PANEL_TAB[model.panel]??null,hero:shellHero(model),
  me:model.ownSeatId?(model.connection!=='live'&&seen&&seen.seat===model.ownSeatId?seen:person(model,model.ownSeatId)):null};
 return ownOut(model)?{...tabs,enabled:{actions:false},reasons:{actions:OUT_ACTIONS_REASON}}:tabs;
}

/**
 * The target bar while this viewer chooses on the scene or the board, with Cancel: Actions' own words for its
 * steps (actions-input.mjs, release 3); otherwise the action's name and its prompt.
 */
export function shellTarget(model,{view='room'}={}){
 if(model.surface!=='player'||model.concealed)return null;
 const own=actionsTarget(model,{view});
 if(own!==undefined)return own;
 // Promises choose in their own sheet (promises-input.mjs, release 3): no target bar while it is open.
 if(promisesOpen(model)||!shellPicking(model.action))return null;
 const action=model.action;
 return {icon:SHELL_ACTION_ICONS[action.type]??'actions',title:action.label,sub:action.prompt||null};
}

/**
 * The floating chip while choosing (sheet 29): in the room view, "Other rooms · n" when people this viewer's
 * action offers stand in other rooms, or the way to a move's other rooms; on the board, "List", the same choice
 * as text. It counts the offers on the public board; it decides nothing.
 */
export function shellChip(model,{view='room',room=null}={}){
 const action=model.action;
 if(model.surface!=='player'||model.concealed)return null;
 const own=actionsChip(model,{view,room});
 if(own!==undefined)return own;
 if(promisesOpen(model)||!shellPicking(action)||action.type==='SELECT_BLACKOUT_SLOT')return null;
 if(action.type==='MOVE')return view==='room'?{id:'board',label:'Other rooms on the Board',icon:'board',tone:'paper'}:null;
 const seats=action.choices.map(choice=>choice.value).filter(isSeat);
 if(!seats.length)return null;
 if(view==='board')return {id:'list',label:'List',icon:'players',tone:'paper'};
 const here=LOCATION_OF[room]??null;
 const elsewhere=seats.filter(id=>{const seat=model.board?.seats?.find(s=>s.seatId===id);return !!seat?.location&&seat.location!==here;}).length;
 return elsewhere?{id:'board',label:`Other rooms · ${elsewhere}`,icon:'board',tone:'paper'}:null;
}

/** Reconnecting (the phone's) while the match is not current; otherwise an eliminated player's own banner (public on the board). */
export function shellBanner(model,{lastRound=null}={}){
 // The first connect, before this phone has seen a round, is the pack's Loading frame (sheet 45), which has no banner:
 // nothing was lost yet. A failed first connect is an error, and gets the banner and its Retry.
 if(model.connection==='connecting'&&!Number.isSafeInteger(lastRound))return null;
 if(model.connection!=='live')return {kind:'reconnecting',busy:model.recovery?.status==='checking'};
 if(model.surface!=='player'||model.concealed)return null;
 return ownOut(model)?{kind:'out'}:null;
}

/**
 * The shell's toast, each shown once. A phase that closed under this phone's open choice (`closed`, from
 * phaseClosed()): the pack's words and icon, from phase-bars.mjs. Otherwise a toast once the server accepts:
 * Actions' (actions-input.mjs): "Turn passed" (sheet 27.3), "Moved to A3", and Hack Ship's and Blackhole's. `flow`
 * is this phone's own pick in its action (actionsFlow). The two never meet: a closed phase has no accepted action left.
 */
export function shellToast(model,{closed=null,flow=null}={}){
 if(model.surface!=='player'||model.concealed)return null;
 if(closed)return phaseClosedToast({id:`closed:${closed.id}`});
 return actionsToast(model,{flow})??promisesToast(model)??null;
}

const frame=(id,kind,title,more={})=>({id,kind,title,sub:null,back:false,close:true,detent:'auto',actions:[],...more});
/**
 * The docked sheet's frame for what the model has open, or null: its id (a new id is a new sheet), the kind of
 * body drawn in it, its title and line, Back, Close, its height and its footer's actions. Actions' steps are the
 * Actions component's frames, its parts in the body (actions-input.mjs, release 3): the tiles, the list, the
 * check, After Register, "Outcome unknown" and "Pass your turn?". The other bodies are the game's own until their
 * components come. `listOpen`: the board's List is showing; `flow`: this phone's own pick in its action.
 */
export function shellSheet(model,{listOpen=false,flow=null,promises=null}={}){
 if(model.concealed)return null;
 // A shared display opens Settings only (the controller's rule): its preferences, and the host's controls when it hosts.
 if(model.surface!=='player')return model.panel==='settings'?frame('settings','settings','Settings'):null;
 const own=actionsFrame(model,{listOpen,flow});
 if(own!==undefined)return own;
 // Promises (the panel, or its three commands under way) are the promises component's one sheet (promises-input.mjs,
 // release 3); `promises` is this phone's own view and draft in it.
 const promise=promisesFrame(model,{flow:promises});
 if(promise)return promise;
 const action=model.action;
 if(action){
  if(shellPicking(action))return listOpen?frame('target-list','target-list',action.label,{sub:action.prompt||null}):null;
  // The ballot is titled by its vote, as the pack's (sheet 35).
  const title=action.type==='VOTE'?SHELL_PHASE_NAMES[model.phase?.kind]??action.label:action.label;
  return frame(`action:${action.type}`,'action',title,{detent:action.type==='VOTE'&&action.step==='targets'?'large':'auto',
   actions:action.canConfirm?[{id:'confirm',label:action.type==='VOTE'?'Vote':'Register',kind:'primary'}]:[]});
 }
 const panel=model.panel;
 if(panel==='settings')return frame('settings','settings','Settings');
 if(panel==='board')return null;
 if(model.dark)return frame(`dark:${panel}`,'dark','Blackout');
 if(model.phase?.expired)return frame('expired','expired','Waiting for the server');
 // The Panels tab (Panels, Players and Round order) is the panels component's one sheet (panels-input.mjs, release 3).
 const panels=panelsFrame(model);
 if(panels)return panels;
 const back=PANEL_PAGES.includes(panel);
 const titles={windows:'Windows',navigation:'Navigation',hospital:'Hospital panel',actions:'Actions'};
 if(panel==='card')return frame('card','card','Your role',{sub:'Only on this phone',detent:'large'});
 if(panel==='windows')return frame('windows','windows','Windows',{back,detent:'large',sub:model.round===null?null:`Unverified claims · Expires after Round ${model.round}`});
 return titles[panel]?frame(panel,panel,titles[panel],{back}):null;
}

/**
 * Every input of the shell for this phone. `view` is what the renderer holds: the scene mode (`view`), the room
 * view's room, the Food surface ({ active, exclusive }), Reduce motion, the round last seen live, whether the
 * board's List is open, a phase that just closed under an open choice (`closed`, from phaseClosed() on the
 * model painted before and this one), and this phone's own pick in its action (`flow`, actions-input.mjs
 * actionsFlow, which the check, "Outcome unknown" and "Moved to A3" name). Concealed, the shell drops this viewer's inputs itself; the tabs are still given so the
 * bars keep their shape and the stage its size. A shared display takes taps: it has no tabs, Promises, target bar
 * or chip, so its only controls are ⋮, the Settings sheet's Close and Retry.
 */
export function shellInput(model,{view='room',room=null,food=null,reducedMotion=false,lastRound=null,listOpen=false,closed=null,flow=null,promises=null,seen=null,seenVersions=null}={}){
 const display=model.surface!=='player',status=shellStatus(model,{food}),hidden=status==='concealed';
 return {
  // Without a current state the model has no versions either. The person kept as last seen is drawn with the versions
  // last seen with them (`seenVersions`), so their portrait stays the same picture and never falls back to older art.
  status,interactive:true,reducedMotion:!!reducedMotion,viewer:display?null:model.ownSeatId??null,versions:model.versions??(model.connection!=='live'?seenVersions:null)??null,
  bar:shellBar(model,{lastRound}),tabs:display?null:shellTabs(model,{view,seen}),
  target:hidden?null:shellTarget(model,{view}),chip:hidden?null:shellChip(model,{view,room}),banner:hidden?null:shellBanner(model,{lastRound}),
  toast:hidden?null:shellToast(model,{closed,flow}),sheet:hidden?null:shellSheet(model,{listOpen,flow,promises}),
 };
}

/**
 * A host sheet (`mountPlanetRenderer`'s `hostSheet`: the pre-game connection's Host controls, part 8) takes the
 * Settings sheet's place while it gives a frame, as Host controls opens from Settings and goes Back to it. Its frame
 * is the component's own (title, line, Back, Close, footer); `kind: 'host'` tells the renderer whose body to mount.
 */
export function shellHostSheet(sheet,hostFrame){
 return sheet?.kind==='settings'&&hostFrame?{...hostFrame,kind:'host'}:sheet;
}

/**
 * The shell's intents, each to a call the game already makes: openPanel, begin, confirm, dismiss, retry,
 * checkReceipt, its local view switch and the session's refresh. Actions' footer ids (release 3): Register and Pass
 * confirm; Done closes; "Retry the same" and "Check receipt" are the controller's retry and checkReceipt; the
 * check's Cancel and the target bar's are `cancelCheck` and `cancelTarget` (actions-input.mjs actionsCancel). Its
 * chips go to the board ("Other rooms · n", a move's "Other rooms on the Board") or open the List, whose Back closes
 * it. `opened` hears which of the shell's controls opened something, so the focus can go back to it. `live()` is
 * false once the renderer is disposed: then nothing is called. While a host sheet is open (`host.open()`), its
 * footer, Back and Close are its own. The Promises sheet's footer and Back are its own too (`promises`, release 3:
 * promises-input.mjs promisesHandlers); its Close closes it, as every sheet's.
 */
export function shellHandlers({openPanel,begin,confirm,dismiss,toggleView,showBoard,openList,closeList,retry=null,checkReceipt=null,cancelTarget=null,cancelCheck=null,reconnect=null,layout=null,focusReturn=null,opened=null,live=()=>true,host=null,promises=null}){
 const when=run=>(...args)=>{if(live())run(...args);};
 const from=(intent,value=null)=>opened?.({intent,value});
 return {
  onTab:when(key=>{from('tab',key);if(key==='switch')toggleView();else if(key==='my-card')openPanel('card');else if(['actions','card','panels','promises'].includes(key))openPanel(key);}),
  // Pass opens "Pass your turn?" (the controller's own PASS_TURN draft); Vote opens the ballot; Voted shows Actions, where the registered ballot is.
  onHero:when(mode=>{from('hero',mode);if(mode==='pass')begin('PASS_TURN');else if(mode==='vote')begin('VOTE');else if(mode==='voted')openPanel('actions');}),
  onPromises:when(()=>{from('promises');openPanel('promises');}),
  onMenu:when(()=>{from('menu');openPanel('settings');}),
  onCancelTarget:when(()=>(cancelTarget??dismiss)()),
  onChip:when(id=>{from('chip',id);if(id==='list')openList();else if(['board','other-rooms','move-board'].includes(id))showBoard();}),
  onRetry:when(()=>reconnect?.()),
  // While the host sheet is open (`host.open()`), its footer, Back and Close are its own; Close also closes Settings.
  onSheetAction:when((id,sheetId)=>{
   if(host?.open())host.action(id);
   else if(sheetId===PROMISES_SHEET_ID&&promises)promises.action(id);
   else if(['confirm','register','pass'].includes(id))confirm();
   else if(id==='cancel'){if(sheetId==='action-check'&&cancelCheck)cancelCheck();else dismiss();}
   else if(id==='done')dismiss();
   else if(id==='retry')retry?.();
   else if(id==='check')checkReceipt?.();
  }),
  onSheetBack:when(sheetId=>{if(host?.open())host.back();else if(sheetId===PROMISES_SHEET_ID&&promises)promises.back();else if(sheetId==='action-list')closeList();else openPanel('panels');}),
  onSheetClose:when(sheetId=>{if(host?.open()){host.close();dismiss();}else if(sheetId==='target-list')closeList();else dismiss();}),
  onLayout:when(next=>layout?.(next)),
  onFocusReturn:when(detail=>focusReturn?.(detail)),
 };
}

/**
 * Where the focus goes when the shell hands it back (onFocusReturn: the focused control ended, as a sheet closed):
 * Cancel while choosing on the scene; else the control that opened it, as a dialog returns the focus to its opener;
 * else the first tab, as today's Escape did. Each is a selector inside the shell, tried in order.
 */
export function shellFocusOrder(opener,{choosing=false}={}){
 const order=choosing?['[data-intent="cancel-target"]']:[];
 if(opener?.intent==='tab'&&opener.value)order.push(`[data-intent="tab"][data-value="${opener.value}"]`);
 else if(['hero','promises','menu','chip'].includes(opener?.intent))order.push(`[data-intent="${opener.intent}"]`);
 order.push('[data-intent="tab"][data-value="switch"]');
 return order;
}

/** Whether the shell's own motion runs: the page is shown and the window has the focus. */
export const shellRuns=({visible,blurred})=>!!visible&&!blurred;

/**
 * The renderer's page and window listeners, registered at once and removed together: visibility, Reduce motion,
 * art, preferences, resize, blur and focus. `on` maps each to its handler. Returns the dispose.
 */
export function connectShellLifecycle({doc,win,media,root},on){
 const pairs=[[root,'click',on.click],[root,'keydown',on.keydown],[doc,'visibilitychange',on.visibility],[doc,'mothership:art-ready',on.art],[doc,'mothership:preferences-change',on.preferences],
  [media,'change',on.motion],[win,'resize',on.resize],[win,'blur',on.blur],[win,'focus',on.focus]].filter(([target,,handler])=>target&&handler);
 for(const [target,type,handler]of pairs)target.addEventListener(type,handler);
 let done=false;
 return ()=>{if(done)return;done=true;for(const [target,type,handler]of pairs)target.removeEventListener(type,handler);};
}
